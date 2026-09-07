/**
 * Lesson → diagnostic-tree links (P2-B).
 *
 * The lessons teach a method: symptom, isolate the cause, change one thing,
 * test. The app already contains 28 diagnostic trees that walk that method on a
 * real fault. These guards protect the join between the two, and nothing else.
 *
 * WHAT COULD GO WRONG, AND WHAT EACH SECTION CATCHES
 * --------------------------------------------------
 *   a lesson points at a tree that was renamed or deleted   → [2]
 *   the link becomes something the learner must open        → [3]
 *   the link costs a reader their place in the lesson       → [4]
 *   a link sends a beginner to spin motors with props on    → [5]
 *   the lessons turn into a list of links                   → [6]
 *
 * The thresholds are deliberately shape-based, not text-based: no assertion
 * here pins a whole sentence, so rewriting the copy does not break the suite.
 */
import assert from 'node:assert/strict';
import { lessonsData } from '../src/data/lessonsData';
import { getLessonJourneyDefinition } from '../src/data/lessons/journeyRegistry';
import {
  createInitialSessionState, getReadinessRequirements, isReadyToComplete,
  recordCheckpointAnswer, recordInteractionVariant, recordRecallRevealed, nextStage,
  type JourneySessionState,
} from '../src/data/lessons/lessonJourneyEngine';
import {
  serializeJourneyState, restoreJourneyState,
} from '../src/data/lessons/lessonJourneyPersistence';
import { resolveDestination } from '../src/platform/destinations';
import { allDxTrees, getDxTree } from '../src/data/kb/diagnostics/trees';
import type {
  CalloutStage, CheckpointStage, InteractiveDiagramStage, RecallStage,
  LessonJourneyDefinition,
} from '../src/types/lessonJourney';

let passed = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  assert.ok(cond, `FAILED: ${label}${detail ? ` — ${detail}` : ''}`);
  console.log(`  ok — ${label}${detail ? ` (${detail})` : ''}`);
  passed++;
};

const CHECKS = { dxExists: (id: string) => !!getDxTree(id) };

interface ToolSite {
  lessonNumber: number;
  lessonId: string;
  definition: LessonJourneyDefinition;
  stage: CalloutStage;
}

const sites: ToolSite[] = lessonsData.flatMap(lesson => {
  const definition = getLessonJourneyDefinition(lesson.id)!;
  return definition.stages
    .filter((s): s is CalloutStage => s.type === 'callout' && !!s.tool)
    .map(stage => ({ lessonNumber: lesson.number, lessonId: lesson.id, definition, stage }));
});

console.log('\n[1] The links exist and are addressed semantically');
{
  ok('at least one lesson points at a diagnostic tool', sites.length >= 1, `${sites.length} sites`);
  for (const { lessonNumber, stage } of sites) {
    const tool = stage.tool!;
    // A destination is an identity: `{ kind, id }`. Anything path-shaped or
    // index-shaped would survive a typecheck and rot silently.
    ok(`L${lessonNumber} ${stage.id}: addresses a destination kind, not a path`,
      typeof tool.destination.kind === 'string' && !/[/]/.test(tool.destination.kind));
    ok(`L${lessonNumber} ${stage.id}: the id is a semantic tree id, not an index`,
      'id' in tool.destination && typeof tool.destination.id === 'string'
      && Number.isNaN(Number(tool.destination.id)) && tool.destination.id.startsWith('dx-'));
    ok(`L${lessonNumber} ${stage.id}: has a label and an optionality note`,
      tool.label.trim().length > 8 && tool.note.trim().length > 8);
  }
}

console.log('\n[2] Every link resolves to a tree that actually exists');
{
  const ids = new Set(allDxTrees.map(t => t.id));
  for (const { lessonNumber, stage } of sites) {
    const d = stage.tool!.destination;
    const id = 'id' in d ? d.id! : '';
    ok(`L${lessonNumber} ${stage.id}: «${id}» is in the tree registry`, ids.has(id));
    // The resolver returns null for a target that does not exist, which is the
    // mechanism a renamed or deleted tree would trip.
    ok(`L${lessonNumber} ${stage.id}: resolves to a route`, resolveDestination(d, CHECKS) !== null,
      String(resolveDestination(d, CHECKS)));
  }
  // The inverse: prove the guard above is not vacuous by resolving a tree id
  // that is deliberately not in the registry.
  ok('a link to a non-existent tree would resolve to null (the guard has teeth)',
    resolveDestination({ kind: 'dx', id: 'dx-does-not-exist' }, CHECKS) === null);
}

console.log('\n[3] Opening a tool is never required to finish a lesson');
{
  for (const { lessonNumber, definition, stage } of sites) {
    const fresh = createInitialSessionState(definition);
    ok(`L${lessonNumber}: the tool stage contributes no readiness requirement`,
      getReadinessRequirements(definition, fresh).every(r => r.id !== stage.id));

    // Satisfy everything the lesson does require, without ever visiting the tool
    // stage, and confirm the lesson completes.
    let s: JourneySessionState = fresh;
    for (const st of definition.stages) {
      if (st.type === 'checkpoint') {
        const cp = (st as CheckpointStage).checkpoint;
        s = recordCheckpointAnswer(s, cp.id, cp.options.find(o => !o.correct)!.id);
      } else if (st.type === 'interactive_diagram') {
        for (const v of (st as InteractiveDiagramStage).requiredVariants) s = recordInteractionVariant(s, st.id, v);
      } else if (st.type === 'recall') {
        for (const p of (st as RecallStage).prompts) s = recordRecallRevealed(s, st.id, p.id);
      }
    }
    ok(`L${lessonNumber}: completes with the tool never opened`, isReadyToComplete(definition, s));

    // And the requirements are identical to the same lesson without the stage:
    // the link cannot have changed what completion means.
    const without: LessonJourneyDefinition = {
      ...definition, stages: definition.stages.filter(x => x.id !== stage.id),
    };
    ok(`L${lessonNumber}: requirement set is unchanged by the tool stage`,
      JSON.stringify(getReadinessRequirements(definition, fresh).map(r => r.id))
      === JSON.stringify(getReadinessRequirements(without, createInitialSessionState(without)).map(r => r.id)));
  }
}

console.log('\n[4] Leaving for a tool and coming back keeps the place and the answers');
{
  for (const { lessonNumber, definition, stage } of sites) {
    // Walk to the tool stage, answer a checkpoint on the way, save — this is
    // exactly what the browser holds when the reader clicks out to the tree.
    let s = createInitialSessionState(definition);
    const firstCp = definition.stages.find((x): x is CheckpointStage => x.type === 'checkpoint')!;
    const chosen = firstCp.checkpoint.options[1].id;
    s = recordCheckpointAnswer(s, firstCp.checkpoint.id, chosen);
    const toolIndex = definition.stages.findIndex(x => x.id === stage.id);
    while (s.currentStageIndex < toolIndex) s = nextStage(definition, s);

    const saved = serializeJourneyState(definition, s, 1_700_000_000_000);
    ok(`L${lessonNumber}: the saved record names the stage by id`, saved.stageId === stage.id);

    const restored = restoreJourneyState(definition, saved)!;
    ok(`L${lessonNumber}: returns to the very same stage`,
      !!restored && definition.stages[restored.currentStageIndex].id === stage.id);
    ok(`L${lessonNumber}: the answer given before leaving survives`,
      restored.checkpointAnswers[firstCp.checkpoint.id] === chosen);
  }

  // A record written BEFORE the tool stage existed must still restore: the
  // stage is addressed by id, so inserting a stage cannot shift a reader.
  for (const { lessonNumber, definition, stage } of sites) {
    const older: LessonJourneyDefinition = {
      ...definition, stages: definition.stages.filter(x => x.id !== stage.id),
    };
    let s = createInitialSessionState(older);
    for (let i = 0; i < older.stages.length - 1; i++) s = nextStage(older, s);
    const legacy = serializeJourneyState(older, s, 1_700_000_000_000);
    const restored = restoreJourneyState(definition, legacy);
    ok(`L${lessonNumber}: progress saved before the link existed still restores`,
      !!restored && definition.stages[restored.currentStageIndex].id === legacy.stageId);
  }
}

console.log('\n[5] Safety: a link may not bypass the order the curriculum closed');
{
  for (const { lessonNumber, stage } of sites) {
    const d = stage.tool!.destination;
    const tree = getDxTree('id' in d ? d.id! : '')!;

    // Every tree in the registry demands props off; a link must never reach one
    // that does not, whatever else changes about the trees.
    ok(`L${lessonNumber} → ${tree.id}: the tree requires the propellers off`, tree.removeProps === true);

    // A tree whose own posture is battery-out must say so where the reader is
    // standing, not only after they arrive.
    if (tree.disconnectBattery) {
      ok(`L${lessonNumber} → ${tree.id}: the callout states the battery-out posture`,
        /مفصول|افصل|منزوع/.test(stage.tool!.note + stage.body));
    }
    ok(`L${lessonNumber} → ${tree.id}: the callout states the props-off posture`,
      /مراوح|منزوع/.test(stage.tool!.note + stage.body));

    // The safety order the curriculum locked: nothing may hand a reader a
    // motor-spinning procedure before lesson 17 (first power-up) has happened.
    const spinsMotors = tree.nodes.some(n => n.checkClass === 'functional' && /محرك/.test(n.how + n.question));
    if (spinsMotors) {
      ok(`L${lessonNumber} → ${tree.id}: a motor-spinning tree is not offered before lesson 17`,
        lessonNumber >= 17, `lesson ${lessonNumber}`);
      ok(`L${lessonNumber} → ${tree.id}: every motor-spinning node carries its own safety note`,
        tree.nodes.filter(n => n.checkClass === 'functional' && /محرك/.test(n.how + n.question))
          .every(n => !!n.safetyNote && n.safetyNote.length > 20));
    }
  }
}

console.log('\n[6] The lessons did not become a list of links');
{
  const perLesson = new Map<number, number>();
  for (const s of sites) perLesson.set(s.lessonNumber, (perLesson.get(s.lessonNumber) ?? 0) + 1);
  ok('no lesson carries more than one diagnostic tool', [...perLesson.values()].every(n => n === 1),
    [...perLesson.entries()].map(([l, n]) => `L${l}:${n}`).join(' '));
  // A ceiling with headroom: the point is that a tool appears where the method
  // was just taught, not on every lesson that touches a component.
  ok('at most a quarter of the lessons carry one', perLesson.size <= Math.floor(lessonsData.length / 4),
    `${perLesson.size}/${lessonsData.length}`);
  ok('only callout stages carry a tool — the type that can never gate completion',
    lessonsData.every(l => getLessonJourneyDefinition(l.id)!.stages
      .every(s => !('tool' in s) || s.type === 'callout')));
}

console.log(`\nAll ${passed} assertions passed.`);
