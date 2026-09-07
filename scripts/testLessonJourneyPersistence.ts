/**
 * Persistence: a journey's session state survives a round trip and refuses
 * to restore anything the current definition does not know.
 */
import assert from 'node:assert/strict';
import { lessonsData } from '../src/data/lessonsData';
import { getLessonJourneyDefinition } from '../src/data/lessons/journeyRegistry';
import { enrichJourneyDefinition } from '../src/data/lessons/lessonJourneyEnrich';
import {
  createInitialSessionState, goToStageId, recordCheckpointAnswer, recordInteractionVariant,
  recordRecallRevealed, getReadinessRequirements,
} from '../src/data/lessons/lessonJourneyEngine';
import {
  serializeJourneyState, restoreJourneyState, parsePersistedJourneyMap, summarizeJourneyProgress,
  LESSON_JOURNEY_PROGRESS_VERSION,
} from '../src/data/lessons/lessonJourneyPersistence';
import type { CheckpointStage, InteractiveDiagramStage, RecallStage } from '../src/types/lessonJourney';

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

const lesson = lessonsData.find(l => l.id === 'lesson-lipo-batteries')!;
const def = enrichJourneyDefinition(getLessonJourneyDefinition(lesson.id)!, lesson);
const CP = def.stages.filter((s): s is CheckpointStage => s.type === 'checkpoint');
const DIAGRAM = def.stages.find((s): s is InteractiveDiagramStage => s.type === 'interactive_diagram')!;
const RECALL = def.stages.find((s): s is RecallStage => s.type === 'recall')!;

console.log('\n[1] Round trip: everything the learner did comes back');
{
  let s = createInitialSessionState(def);
  s = recordCheckpointAnswer(s, CP[0].checkpoint.id, CP[0].checkpoint.options.find(o => !o.correct)!.id);
  s = recordCheckpointAnswer(s, CP[0].checkpoint.id, CP[0].checkpoint.options.find(o => o.correct)!.id);
  s = recordCheckpointAnswer(s, CP[1].checkpoint.id, CP[1].checkpoint.options[0].id);
  s = recordInteractionVariant(s, DIAGRAM.id, DIAGRAM.requiredVariants[0]);
  s = recordRecallRevealed(s, RECALL.id, RECALL.prompts[0].id);
  s = goToStageId(def, s, RECALL.id);

  const saved = serializeJourneyState(def, s, 1_700_000_000_000);
  ok('stored by stage id, not index', saved.stageId === RECALL.id);
  ok('versioned', saved.v === LESSON_JOURNEY_PROGRESS_VERSION);
  ok('timestamped with the clock it was given', saved.updatedAt === 1_700_000_000_000);
  ok('survives JSON', JSON.parse(JSON.stringify(saved)).stageId === RECALL.id);

  const restored = restoreJourneyState(def, JSON.parse(JSON.stringify(saved)));
  ok('restores', restored !== null);
  ok('same stage', restored!.currentStageIndex === s.currentStageIndex);
  ok('same current answers', JSON.stringify(restored!.checkpointAnswers) === JSON.stringify(s.checkpointAnswers));
  ok('same first answers (the wrong first try is still remembered)',
    restored!.checkpointFirstAnswers[CP[0].checkpoint.id] === CP[0].checkpoint.options.find(o => !o.correct)!.id);
  ok('same explorations', JSON.stringify(restored!.interactionVariants) === JSON.stringify(s.interactionVariants));
  ok('same reveals', JSON.stringify(restored!.recallRevealed) === JSON.stringify(s.recallRevealed));
  ok('same readiness', JSON.stringify(getReadinessRequirements(def, restored!)) === JSON.stringify(getReadinessRequirements(def, s)));
}

console.log('\n[2] Restore trusts nothing it does not know');
{
  const fresh = createInitialSessionState(def);
  const base = serializeJourneyState(def, fresh, 1);

  const unknownStage = restoreJourneyState(def, { ...base, stageId: 'no-such-stage' });
  ok('an unknown stage id falls back to the start', unknownStage!.currentStageIndex === 0);

  const strayKeys = restoreJourneyState(def, {
    ...base,
    checkpointAnswers: { ...base.checkpointAnswers, ghostCheckpoint: 'a' },
    interactionVariants: { ...base.interactionVariants, ghostStage: { x: true }, [DIAGRAM.id]: { ghostVariant: true } },
    recallRevealed: { ...base.recallRevealed, ghost: { p: true } },
  });
  ok('an unknown checkpoint is dropped', !('ghostCheckpoint' in strayKeys!.checkpointAnswers));
  ok('an unknown stage is dropped', !('ghostStage' in strayKeys!.interactionVariants));
  ok('an unknown variant is dropped', !('ghostVariant' in strayKeys!.interactionVariants[DIAGRAM.id]));
  ok('an unknown recall stage is dropped', !('ghost' in strayKeys!.recallRevealed));

  ok('wrong version → null', restoreJourneyState(def, { ...base, v: 999 }) === null);
  ok('missing stageId → null', restoreJourneyState(def, { v: 1 }) === null);
  ok('garbage → null', restoreJourneyState(def, 'nope') === null && restoreJourneyState(def, null) === null);
  ok('a non-boolean flag is ignored, not trusted',
    restoreJourneyState(def, { ...base, interactionVariants: { [DIAGRAM.id]: { [DIAGRAM.requiredVariants[0]]: 'yes' } } })!
      .interactionVariants[DIAGRAM.id][DIAGRAM.requiredVariants[0]] === false);
}

console.log('\n[3] The whole store parses defensively');
{
  ok('null → {}', Object.keys(parsePersistedJourneyMap(null)).length === 0);
  ok('invalid JSON → {}', Object.keys(parsePersistedJourneyMap('{not json')).length === 0);
  ok('an array → {}', Object.keys(parsePersistedJourneyMap('[1,2]')).length === 0);
  const good = serializeJourneyState(def, createInitialSessionState(def), 5);
  const map = parsePersistedJourneyMap(JSON.stringify({ [lesson.id]: good, bad1: { v: 2, stageId: 'x' }, bad2: 'str', bad3: { v: 1 } }));
  ok('only records of ours survive', Object.keys(map).length === 1 && lesson.id in map);
}

console.log('\n[4] Progress summary for the index card');
{
  const none = summarizeJourneyProgress(def, undefined);
  ok('no record → not started, stage 1', !none.started && none.stageNumber === 1 && none.stageCount === def.stages.length);

  const untouched = summarizeJourneyProgress(def, serializeJourneyState(def, createInitialSessionState(def), 1));
  ok('a record with nothing done on stage 1 → not started', !untouched.started && untouched.stageNumber === 1);

  let s = createInitialSessionState(def);
  s = recordCheckpointAnswer(s, CP[0].checkpoint.id, CP[0].checkpoint.options[0].id);
  const answered = summarizeJourneyProgress(def, serializeJourneyState(def, s, 1));
  ok('an answer on stage 1 → started', answered.started);

  s = goToStageId(def, createInitialSessionState(def), RECALL.id);
  const moved = summarizeJourneyProgress(def, serializeJourneyState(def, s, 1));
  ok('moving to a later stage → started, at that stage number',
    moved.started && moved.stageNumber === def.stages.findIndex(st => st.id === RECALL.id) + 1);

  const stale = summarizeJourneyProgress(def, { ...serializeJourneyState(def, s, 1), stageId: 'gone' });
  ok('a stale stage id reads as stage 1', stale.stageNumber === 1);
}

console.log('\n[5] Every lesson round-trips through its enriched definition');
{
  for (const l of lessonsData) {
    const d = enrichJourneyDefinition(getLessonJourneyDefinition(l.id)!, l);
    let s = createInitialSessionState(d);
    const last = d.stages[d.stages.length - 2]; // the stage before completion
    s = goToStageId(d, s, last.id);
    const back = restoreJourneyState(d, JSON.parse(JSON.stringify(serializeJourneyState(d, s, 1))));
    ok(`${l.id}: stage "${last.id}" restores to itself`, back !== null && d.stages[back.currentStageIndex].id === last.id);
  }
}

console.log(`\nAll ${passed} assertions passed.`);
