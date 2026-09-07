/**
 * Lesson 20 — stick control and the first flight — proven with plain
 * assertions against the pure engine, the same way lessons 01–16 are.
 *
 * What is specific to this lesson: it is the first to use `callout` stages
 * directly, it carries the new `stick-control` diagram, and it closes the
 * beginner path — so it also checks the `flight` track and the seventeen-
 * lesson totals the rest of the platform now reports.
 */
import assert from 'node:assert/strict';
import {
  createInitialSessionState, nextStage, recordCheckpointAnswer, recordRecallRevealed,
  recordInteractionVariant, areAllCheckpointsAnswered, isRecallComplete, isInteractionComplete,
  getReadinessRequirements, isReadyToComplete, stageCount, currentStage,
  quizResult, resetCheckpoints,
} from '../src/data/lessons/lessonJourneyEngine';
import { lesson20JourneyDefinition as def } from '../src/data/lessons/lesson20Journey.definition';
import { getLessonJourneyDefinition, LESSON_JOURNEY_IDS } from '../src/data/lessons/journeyRegistry';
import { lessonsData, TOTAL_LESSONS } from '../src/data/lessonsData';
import { interactiveDiagramAdapters } from '../src/components/lessons/interactiveDiagramAdapters';
import type {
  CheckpointStage, InteractiveDiagramStage, RecallStage, GlossaryStage, CalloutStage,
  KeyPointsStage,
} from '../src/types/lessonJourney';

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

const CHECKPOINT_STAGES = def.stages.filter((s): s is CheckpointStage => s.type === 'checkpoint');
const DIAGRAM = def.stages.find((s): s is InteractiveDiagramStage => s.type === 'interactive_diagram')!;
const RECALL = def.stages.find((s): s is RecallStage => s.type === 'recall')!;
const GLOSSARY = def.stages.find((s): s is GlossaryStage => s.type === 'glossary')!;
const CALLOUTS = def.stages.filter((s): s is CalloutStage => s.type === 'callout');
const STAGE_COUNT = stageCount(def);

console.log('\n[1] Registration and shape');
{
  const lesson = lessonsData.find(l => l.id === 'lesson-stick-control-first-flight')!;
  ok('lesson 20 exists in lessonsData', !!lesson);
  ok('it is number 20 — the renumbering is the only change this lesson took', lesson.number === 20);
  ok('it sits on the flight track', lesson.track === 'flight');
  ok('its diagram type is stick-control', lesson.diagramType === 'stick-control');
  ok('it carries a safety warning', typeof lesson.warning === 'string' && lesson.warning.length > 40);
  ok('it carries a common mistake', lesson.commonMistake.length > 20);
  ok('definition.lessonId matches', def.lessonId === lesson.id);
  ok('registry resolves it to this definition', getLessonJourneyDefinition(lesson.id) === def);
  ok('registry lists twenty lessons', LESSON_JOURNEY_IDS.length === 20);
  ok('TOTAL_LESSONS agrees with lessonsData', TOTAL_LESSONS === 20 && lessonsData.length === 20);
  // 19 until the audit's P0 safety fix added the pre-flight checklist.
  ok('lesson 20 has 20 stages', STAGE_COUNT === 20);
  ok('stage ids are unique', new Set(def.stages.map(s => s.id)).size === STAGE_COUNT);
  ok('every lesson has a journey', lessonsData.every(l => !!getLessonJourneyDefinition(l.id)));
}

console.log('\n[2] The stick diagram: four axes, all required, adapter wired');
{
  ok('exactly one interactive_diagram stage', def.stages.filter(s => s.type === 'interactive_diagram').length === 1);
  ok('it renders stick-control', DIAGRAM.diagramType === 'stick-control');
  ok('it requires exactly throttle, yaw, pitch, roll',
    JSON.stringify([...DIAGRAM.requiredVariants].sort()) === JSON.stringify(['pitch', 'roll', 'throttle', 'yaw']));
  ok('a partial hint exists for every axis', DIAGRAM.requiredVariants.every(v => !!DIAGRAM.hints.partial[v]));
  ok('it is in readinessOrder', (def.readinessOrder ?? []).includes(DIAGRAM.id));
  ok('an adapter exists for stick-control', typeof interactiveDiagramAdapters['stick-control'] === 'function');
  ok('every lesson\'s interactive stages have an adapter', lessonsData.every(l =>
    getLessonJourneyDefinition(l.id)!.stages
      .filter((s): s is InteractiveDiagramStage => s.type === 'interactive_diagram')
      .every(s => typeof interactiveDiagramAdapters[s.diagramType] === 'function')));
  ok('every lesson now has at least one interactive stage', lessonsData.every(l =>
    getLessonJourneyDefinition(l.id)!.stages.some(s => s.type === 'interactive_diagram')));
}

console.log('\n[3] Initial state — nothing satisfied');
{
  const s = createInitialSessionState(def);
  ok('starts on orientation', currentStage(def, s).id === 'orientation');
  ok('not ready', !isReadyToComplete(def, s));
  ok('six requirements: diagram + 4 checkpoints + recall', getReadinessRequirements(def, s).length === 6);
  ok('all unmet', getReadinessRequirements(def, s).every(r => !r.met));
  ok('callouts add no requirement', getReadinessRequirements(def, s).every(r => !CALLOUTS.some(c => c.id === r.id)));
}

console.log('\n[4] Reaching the end alone grants nothing');
{
  let s = createInitialSessionState(def);
  for (let i = 0; i < STAGE_COUNT; i++) s = nextStage(def, s);
  ok('on the final stage', s.currentStageIndex === STAGE_COUNT - 1);
  ok('still not ready', !isReadyToComplete(def, s));
}

console.log('\n[5] Four checkpoints, one correct option each, feedback on every option');
{
  ok('exactly 4 checkpoint stages', CHECKPOINT_STAGES.length === 4);
  for (const st of CHECKPOINT_STAGES) {
    const cp = st.checkpoint;
    ok(`"${cp.id}" has exactly one correct option`, cp.options.filter(o => o.correct).length === 1);
    ok(`"${cp.id}" has four options`, cp.options.length === 4);
    ok(`"${cp.id}" feedback on every option`, cp.options.every(o => o.feedback.length > 20));
    ok(`"${cp.id}" is in readinessOrder`, (def.readinessOrder ?? []).includes(`checkpoint-${cp.id}`));
  }
}

console.log('\n[6] Wrong first, right later — never blocked');
{
  let s = createInitialSessionState(def);
  const cp = CHECKPOINT_STAGES[0].checkpoint;
  const wrong = cp.options.find(o => !o.correct)!;
  const right = cp.options.find(o => o.correct)!;
  s = recordCheckpointAnswer(s, cp.id, wrong.id);
  ok('wrong answer is recorded', s.checkpointAnswers[cp.id] === wrong.id);
  s = recordCheckpointAnswer(s, cp.id, right.id);
  ok('can change to the right answer', s.checkpointAnswers[cp.id] === right.id);
  ok('the first attempt is remembered as the wrong one', s.checkpointFirstAnswers[cp.id] === wrong.id);
}

console.log('\n[7] Completion needs checkpoints + recall + all four axes');
{
  let s = createInitialSessionState(def);
  for (const st of CHECKPOINT_STAGES) {
    const wrong = st.checkpoint.options.find(o => !o.correct)!;
    s = recordCheckpointAnswer(s, st.checkpoint.id, wrong.id);
  }
  ok('all checkpoints answered (all wrong)', areAllCheckpointsAnswered(def, s));
  for (const p of RECALL.prompts) s = recordRecallRevealed(s, RECALL.id, p.id);
  ok('recall complete', isRecallComplete(RECALL, s));
  ok('still not ready — axes unexplored', !isReadyToComplete(def, s));
  s = recordInteractionVariant(s, DIAGRAM.id, 'throttle');
  s = recordInteractionVariant(s, DIAGRAM.id, 'yaw');
  s = recordInteractionVariant(s, DIAGRAM.id, 'pitch');
  ok('three of four axes is not enough', !isInteractionComplete(DIAGRAM, s) && !isReadyToComplete(def, s));
  s = recordInteractionVariant(s, DIAGRAM.id, 'roll');
  ok('READY with all four axes', isInteractionComplete(DIAGRAM, s) && isReadyToComplete(def, s));
}

console.log('\n[8] Callouts: arming is a danger, the simulator is a warning');
{
  ok('exactly two authored callouts', CALLOUTS.length === 2);
  const danger = CALLOUTS.find(c => c.tone === 'danger');
  const warn = CALLOUTS.find(c => c.tone === 'warn');
  ok('one danger callout about arming', !!danger && /تسليح/.test(danger.body));
  ok('one warn callout about the simulator', !!warn && /محاك/.test(warn.body));
  const armIdx = def.stages.findIndex(s => s.id === 'armingExplanation');
  const dangerIdx = def.stages.findIndex(s => s.id === danger!.id);
  ok('the arming danger callout follows the arming explanation directly', dangerIdx === armIdx + 1);
}

console.log('\n[9] The glossary names the four channels, arming, and both flight modes');
{
  const terms = GLOSSARY.terms.map(t => t.term).join(' | ');
  for (const needle of ['Throttle', 'Yaw', 'Pitch', 'Roll', 'Mode 2', 'Arm', 'Angle', 'Acro', 'Failsafe']) {
    ok(`glossary defines ${needle}`, terms.includes(needle));
  }
  ok('every term has a definition', GLOSSARY.terms.every(t => t.definition.length > 30));
}

console.log('\n[10] Quiz result and retry');
{
  let s = createInitialSessionState(def);
  const [a, b, c, d] = CHECKPOINT_STAGES.map(st => st.checkpoint);
  const right = (cp: typeof a) => cp.options.find(o => o.correct)!.id;
  const wrong = (cp: typeof a) => cp.options.find(o => !o.correct)!.id;
  s = recordCheckpointAnswer(s, a.id, right(a));
  s = recordCheckpointAnswer(s, b.id, right(b));
  s = recordCheckpointAnswer(s, c.id, wrong(c));
  s = recordCheckpointAnswer(s, d.id, wrong(d));
  s = recordCheckpointAnswer(s, c.id, right(c));
  s = recordCheckpointAnswer(s, d.id, right(d));
  s = recordInteractionVariant(s, DIAGRAM.id, 'throttle');
  const r = quizResult(def, s);
  ok('total is 4', r.total === 4);
  ok('answered is 4', r.answered === 4);
  ok('correct now is 4 (both mistakes corrected)', r.correctNow === 4);
  ok('correct on first try is 2', r.correctFirstTry === 2);
  ok('the two missed questions are named, with their stage ids', r.missedFirstTry.length === 2
    && r.missedFirstTry.every(m => def.stages.some(st => st.id === m.stageId) && m.question.length > 10));

  const reset = resetCheckpoints(def, s);
  ok('reset clears every current answer', Object.values(reset.checkpointAnswers).every(v => v === null));
  ok('reset clears every first answer', Object.values(reset.checkpointFirstAnswers).every(v => v === null));
  ok('reset keeps the diagram exploration', reset.interactionVariants[DIAGRAM.id].throttle === true);
  ok('reset lands on the first checkpoint stage', currentStage(def, reset).type === 'checkpoint'
    && reset.currentStageIndex === def.stages.findIndex(st => st.type === 'checkpoint'));
  ok('a fresh quiz result is empty', quizResult(def, reset).answered === 0 && quizResult(def, reset).correctFirstTry === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[11] The pre-flight checklist — the three checks a first flight cannot skip');
{
  const CHECKLIST = def.stages.find((s): s is KeyPointsStage => s.id === 'preFlightChecklist');
  ok('the checklist stage exists', !!CHECKLIST && CHECKLIST.type === 'key_points');
  if (!CHECKLIST) throw new Error('no checklist stage');

  const at = def.stages.findIndex(s => s.id === CHECKLIST.id);
  const hover = def.stages.findIndex(s => s.id === 'firstHoverWorkedExample');
  ok('it comes before the first hover, not after it', at !== -1 && hover !== -1 && at < hover);

  const text = CHECKLIST.points.join(' ');
  ok('it makes the learner TEST failsafe, not just know the word',
    /Failsafe/.test(text) && /أطفئ جهاز التحكم/.test(text) && /يجب أن تتوقف المحركات/.test(text));
  ok('…with the props off and the quad on the ground',
    /المراوح منزوعة/.test(text) && /على الأرض/.test(text));
  ok('it checks each prop against its motor\'s direction and the nut',
    /يوافق اتجاهها/.test(text) && /الصامولة مشدودة/.test(text));
  ok('it says what a reversed prop does, so the check has a reason',
    /تنقلب الطائرة/.test(text));
  ok('it sends the learner to their own country\'s law before the first flight',
    /قانون بلدك/.test(text) && /(تسجيل|ترخيص)/.test(text));
  ok('it keeps the props last', /المراوح آخر شيء/.test(text));

  // The gate is unchanged: a checklist is read, not answered.
  const fresh = createInitialSessionState(def);
  ok('the checklist adds no readiness requirement',
    getReadinessRequirements(def, fresh).every(r => r.id !== CHECKLIST.id));
  ok('the readiness gate is still the same six', getReadinessRequirements(def, fresh).length === 6);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[R] The renumbering left nothing behind, and the failsafe line agrees with lesson 18');
{
  const ALL = JSON.stringify(def);

  // P1-1. This lesson was written as the seventeenth and became the twentieth.
  // The number lives in exactly one learner-visible place — the orientation
  // title — and it said «السابع عشر» while the page header said «20 من 20».
  const orientation = def.stages.find(s => s.type === 'orientation')!;
  ok('the orientation title names the twentieth lesson', orientation.title.includes('العشرين'));
  ok('…and no longer names the seventeenth', !orientation.title.includes('السابع عشر'));
  ok('no stage anywhere in the lesson still says «الدرس السابع عشر»', !ALL.includes('الدرس السابع عشر'));
  // Whatever ordinal the title carries must be the lesson's real number. This
  // catches the next renumbering too, not just this one.
  const ORDINALS = ['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن',
    'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر',
    'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرين'];
  const lessonNow = lessonsData.find(l => l.id === def.lessonId)!;
  const wrong = ORDINALS.filter((word, i) => i > 0 && i !== lessonNow.number && orientation.title.includes(word));
  ok(`the orientation title carries no other lesson's ordinal (${wrong.join(', ') || 'none'})`, wrong.length === 0);

  // P1-2. Lesson 18 teaches that the failsafe PROCEDURE is a setting with
  // several possible behaviours. This lesson's pre-flight checklist used to
  // assert that the motors must always stop instantly, which contradicted it.
  const checklist = def.stages.find((s): s is KeyPointsStage => s.type === 'key_points' && s.id === 'preFlightChecklist')!;
  const failsafePoint = checklist.points.find(p => p.includes('Failsafe'))!;
  ok('the pre-flight checklist still tests failsafe on the ground, props off',
    /المراوح منزوعة/.test(failsafePoint) && /أطفئ جهاز التحكم/.test(failsafePoint));
  ok('it compares the result against the procedure the learner actually configured',
    /الإجراء المضبوط عندك/.test(failsafePoint));
  ok('…and names where that was configured', /الدرس الثامن عشر/.test(failsafePoint));
  ok('immediate cut-off is stated as one CASE, not as the rule',
    /إن كان الإيقاف الفوري/.test(failsafePoint) && /وإن كان إجراءً آخر/.test(failsafePoint));
  ok('the unsafe outcome is «something you did not expect», not «motors kept spinning»',
    /حدث شيء لم تتوقّعه/.test(failsafePoint));
  // The absolute claim must not come back in any form.
  ok('no unconditional «the motors must stop» claim survives anywhere in the lesson',
    !/يجب أن تتوقف المحركات في اللحظة نفسها\. إن استمرّت/.test(ALL));
  const absolute = /(?<!إن كان الإيقاف الفوري ف)يجب أن تتوقف المحركات/;
  ok('every «motors must stop» sentence is conditioned on the configured procedure',
    checklist.points.filter(p => /يجب أن تتوقف المحركات/.test(p))
      .every(p => /إن كان الإيقاف الفوري/.test(p)));
  void absolute;
}

console.log(`\nAll ${passed} assertions passed.`);
