/**
 * Lesson 18 — الحد الأدنى من Betaflight.
 *
 * WHAT THIS EXISTS TO CATCH
 * -------------------------
 * Three things, in order of how much damage they do if they break:
 *   1. PROPS OFF. This is the lesson where a real motor spins for the first
 *      time. The removal rule must be a danger callout, must carry the parts
 *      of the official warning a learner would not guess (the tab stays live
 *      after you leave it; USB may not stop the motors), and must appear
 *      BEFORE the motor-test stages, not after them.
 *   2. ONE SOURCE OF TRUTH. The lesson must not restate the motor numbering.
 *      `motorLayout.ts` exists because two places once stated it and
 *      disagreed; the diagram reads that table, so the lesson body must not
 *      hand-write a second copy of it.
 *   3. ORDER ≠ DIRECTION. Two failure modes with two different fixes, and the
 *      "reversed" switch fixes neither. This is the lesson's core diagnosis.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createInitialSessionState, recordCheckpointAnswer, recordRecallRevealed,
  recordInteractionVariant, isReadyToComplete, getReadinessRequirements, stageCount,
} from '../src/data/lessons/lessonJourneyEngine';
import { lesson18JourneyDefinition as def } from '../src/data/lessons/lesson18Journey.definition';
import type {
  CheckpointStage, RecallStage, GlossaryStage, InteractiveDiagramStage, CalloutStage, KeyPointsStage,
} from '../src/types/lessonJourney';
import { lessonsData } from '../src/data/lessonsData';
import { getLessonJourneyDefinition } from '../src/data/lessons/journeyRegistry';
import { QUAD_X_MOTORS } from '../src/data/lessons/motorLayout';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

const CHECKPOINTS = def.stages.filter((s): s is CheckpointStage => s.type === 'checkpoint');
const RECALL = def.stages.find((s): s is RecallStage => s.type === 'recall')!;
const GLOSSARY = def.stages.find((s): s is GlossaryStage => s.type === 'glossary')!;
const DIAGRAM = def.stages.find((s): s is InteractiveDiagramStage => s.type === 'interactive_diagram')!;
const CALLOUTS = def.stages.filter((s): s is CalloutStage => s.type === 'callout');
const KEY_POINTS = def.stages.filter((s): s is KeyPointsStage => s.type === 'key_points');
const STAGE_COUNT = stageCount(def);
const ALL_TEXT = JSON.stringify(def);
const LESSON = lessonsData.find(l => l.id === 'lesson-betaflight-minimum')!;

console.log('\n[1] Registration and shape');
{
  ok('lesson 18 exists in lessonsData', !!LESSON);
  ok('it is number 18', LESSON.number === 18);
  ok('it sits on the setup track', LESSON.track === 'setup');
  ok('it is the first lesson marked متوسط — the level exists and is finally used', LESSON.level === 'متوسط');
  ok('its diagram type is motor-test-check', LESSON.diagramType === 'motor-test-check');
  ok('definition.lessonId matches', def.lessonId === LESSON.id);
  ok('registry resolves it to this definition', getLessonJourneyDefinition(LESSON.id) === def);
  ok('lesson 18 has 21 stages', STAGE_COUNT === 21);
  ok('stage ids are unique', new Set(def.stages.map(s => s.id)).size === STAGE_COUNT);
}

console.log('\n[2] SAFETY GATE — props off, stated officially, and stated BEFORE anything spins');
{
  const callout = CALLOUTS.find(c => c.id === 'propsOffCallout')!;
  ok('a dedicated propellers callout exists', !!callout);
  ok('it is a danger callout', callout.tone === 'danger');
  ok('it repeats the official instruction to remove ALL propellers', /أزل جميع المراوح/.test(callout.body));
  // The two parts of the official notice a learner would never guess.
  ok('it warns the test mode stays active after leaving the tab', /يبقى نشطًا/.test(callout.body));
  ok('it warns that unplugging USB may not stop the motors', /فصل كابل USB قد لا يوقف المحركات/.test(callout.body));

  const idx = (id: string) => def.stages.findIndex(s => s.id === id);
  ok('the callout comes BEFORE the motor-test explanation', idx('propsOffCallout') < idx('motorTestExplanation'));
  ok('the callout comes BEFORE the motor diagram', idx('propsOffCallout') < idx('motorTestDiagram'));
  ok('the callout comes BEFORE any motor checkpoint', idx('propsOffCallout') < idx('orderCheckpoint'));
  ok('the lesson-level warning also carries the props-off rule', /المراوح منزوعة/.test(LESSON.warning ?? ''));
  ok('the acknowledgement checkbox is described as a real risk gate, not a formality',
    /ليس إجراءً شكليًا/.test(ALL_TEXT));
}

console.log('\n[3] ONE SOURCE OF TRUTH — the lesson reads the motor table, it does not restate it');
{
  ok('the diagram is the motor-test-check one', DIAGRAM.diagramType === 'motor-test-check');
  ok('its required variants ARE the shared motor ids',
    JSON.stringify(DIAGRAM.requiredVariants) === JSON.stringify(QUAD_X_MOTORS.map(m => m.id)));
  ok('all four motors are gated', DIAGRAM.requiredVariants.length === 4);

  const component = read('src/components/diagrams/MotorTestCheck.tsx');
  ok('the diagram component imports the shared table', /from '\.\.\/\.\.\/data\/lessons\/motorLayout'/.test(component));
  ok('it renders that table rather than a literal list', /QUAD_X_MOTORS/.test(component) && /SPATIAL\.map/.test(component));
  ok('and it lays the four cards out as a top-down map, not in list order',
    /Number\(b\.front\) - Number\(a\.front\)/.test(component) && /Number\(b\.right\) - Number\(a\.right\)/.test(component));
  ok('it hard-codes no motor position of its own', !/rear-right|front-left|الخلفي الأيمن/.test(component));

  // The definition itself must not hand-write the numbering. lessonsData
  // interpolates it from motorLayout; the journey text must not duplicate it.
  const positionsInDefinition = QUAD_X_MOTORS.filter(m => ALL_TEXT.includes(m.positionAr)).length;
  ok('the journey definition names no motor position directly (0 of 4)', positionsInDefinition === 0);
  const lessonText = `${LESSON.explanation}${LESSON.importantPoints.join('')}`;
  ok("the lesson's own text gets its numbering by interpolation from motorLayout",
    lessonText.includes('M2 وM4') && lessonText.includes('M1 وM3'));
}

console.log('\n[4] Five checkpoints: application and diagnosis, not recognition');
{
  ok('exactly 5 checkpoint stages defined', CHECKPOINTS.length === 5);
  const ids = CHECKPOINTS.map(s => s.checkpoint.id);
  ok('checkpoint ids are stable and in teaching order',
    JSON.stringify(ids) === JSON.stringify([
      'noChannelsDiagnosis', 'armRefusalIsInformation', 'orderNotDirection',
      'reversedSwitchIsNotReversal', 'failsafeUntestedIsUnready',
    ]));
  for (const stage of CHECKPOINTS) {
    const cp = stage.checkpoint;
    ok(`checkpoint "${cp.id}" has exactly four options`, cp.options.length === 4);
    ok(`checkpoint "${cp.id}" has exactly one correct option`, cp.options.filter(o => o.correct).length === 1);
    ok(`checkpoint "${cp.id}": every option carries its own feedback`, cp.options.every(o => o.feedback.trim().length > 20));
  }
  // Lessons 13-16 answered 16 of 16 questions with one stem. This lesson's
  // questions are situations.
  const stems = CHECKPOINTS.map(s => s.checkpoint.question);
  ok('no question uses the recognition stem this section over-used',
    stems.every(q => !q.startsWith('أيّ من التالي صحيح بخصوص')));
}

console.log('\n[5] ORDER ≠ DIRECTION — the lesson\'s core diagnosis, with the official caveat');
{
  const byId = (id: string) => CHECKPOINTS.find(s => s.checkpoint.id === id)!.checkpoint;

  const order = byId('orderNotDirection');
  const orderRight = order.options.find(o => o.correct)!;
  ok('the wrong-motor answer names it a ORDER problem', /ترتيب/.test(orderRight.text));
  ok('…and fixes it by remapping outputs in software, not by rewiring', /أعد تعيين المخارج/.test(orderRight.text) && /البرنامج/.test(orderRight.text));
  ok('a distractor offers the direction fix, so the two must be told apart',
    order.options.some(o => !o.correct && /اتجاه/.test(o.text)));

  const rev = byId('reversedSwitchIsNotReversal');
  const revRight = rev.options.find(o => o.correct)!;
  ok('the reversed-switch answer denies that the switch reverses anything', /لا؛/.test(revRight.text));
  ok('…and names the two real fixes: the ESC tool, or swapping two wires',
    /أداة ESC/.test(revRight.text) && /تبديل سلكين/.test(revRight.text));
  ok('the explanation attributes the caveat to the official text, not to us',
    /النص الرسمي/.test(ALL_TEXT) && /لا يعكس دوران المحرك فعليًا/.test(ALL_TEXT));

  ok('ARM is stated as unlinkable, which is an official rule not a convention',
    /لا يمكن ربطه بوضع آخر إطلاقًا/.test(ALL_TEXT));
}

console.log('\n[6] FAILSAFE — a setting, not one fixed behaviour, and tested on the ground');
{
  ok('the lesson refuses to state one universal failsafe behaviour',
    /ليس سلوكًا واحدًا ثابتًا/.test(ALL_TEXT));
  ok('it names the failsafe trigger as loss of VALID commands, not a disconnected receiver',
    /أوامر تحكم صحيحة/.test(ALL_TEXT));
  ok('it sends the learner to read their OWN configured procedure',
    /ما الإجراء المضبوط على طائرتي|أي إجراء مضبوط عندك/.test(ALL_TEXT));
  const example = def.stages.find(s => s.id === 'failsafeTestWorkedExample')!;
  const body = JSON.stringify(example);
  ok('the ground test is a worked example with ordered steps', example.type === 'worked_example');
  ok('it starts from props removed', /المراوح منزوعة/.test(body));
  ok('it turns the transmitter off as the trigger', /أطفئ جهاز الإرسال/.test(body));
  ok('it compares what happened against the learner\'s own setting, not a claim', /قارنه بما قرأتَه/.test(body));

  const fs = CHECKPOINTS.find(s => s.checkpoint.id === 'failsafeUntestedIsUnready')!.checkpoint;
  const right = fs.options.find(o => o.correct)!;
  ok('an untested failsafe means NOT ready', /لا؛/.test(right.text));
  ok('…because a setting on screen is not a proved behaviour', /يبقى افتراضًا/.test(right.text));
}

console.log('\n[7] Receiver: the binding promise lesson 15 made is finally kept');
{
  ok('the lesson names binding as the step lesson 15 deferred', /الربط \(binding\)/.test(ALL_TEXT) || /الربط/.test(ALL_TEXT));
  ok('it points back at the receiver-install lesson by name', /درس تركيب الريسيفر/.test(ALL_TEXT));
  ok('it verifies channels by watching bars move, not by trusting the bind', /شريط/.test(ALL_TEXT));
  ok('it declines to teach one binding procedure, since they differ per system', /ارجع إلى دليل جهازك/.test(ALL_TEXT));

  const rx = CHECKPOINTS.find(s => s.checkpoint.id === 'noChannelsDiagnosis')!.checkpoint;
  const right = rx.options.find(o => o.correct)!;
  ok('the no-channels answer starts at the far end of the chain', /هل تمّ الربط أصلًا/.test(right.text));
  ok('its feedback teaches one-change-at-a-time isolation', /تغيّر شيئًا واحدًا في كل مرة/.test(right.feedback));
}

console.log('\n[8] Completion gates and the four proofs');
{
  let s = createInitialSessionState(def);
  ok('not ready at the start', !isReadyToComplete(def, s));
  ok('readiness lists one entry per gate (5 checkpoints + diagram + recall)',
    getReadinessRequirements(def, s).length === CHECKPOINTS.length + 2);
  for (const stage of CHECKPOINTS) {
    s = recordCheckpointAnswer(s, stage.checkpoint.id, stage.checkpoint.options.find(o => !o.correct)!.id);
  }
  for (const v of DIAGRAM.requiredVariants) s = recordInteractionVariant(s, DIAGRAM.id, v);
  ok('still not ready with recall untouched', !isReadyToComplete(def, s));
  for (const p of RECALL.prompts) s = recordRecallRevealed(s, RECALL.id, p.id);
  ok('READY once every gate has been engaged with', isReadyToComplete(def, s));

  const kp = KEY_POINTS.find(k => k.id === 'readyKeyPoints')!;
  ok('a four-proof checklist closes the lesson before the propellers', !!kp && kp.points.length === 4);
  ok('the four proofs are receiver, arming, motors, failsafe',
    /الريسيفر/.test(kp.points[0]) && /التسليح/.test(kp.points[1])
    && /المحركات/.test(kp.points[2]) && /Failsafe/.test(kp.points[3]));

  ok('exactly 6 glossary terms', GLOSSARY.terms.length === 6);
  ok('the glossary separates order from direction', GLOSSARY.terms.some(t => t.term.includes('ترتيب المحركات'))
    && GLOSSARY.terms.some(t => t.term.includes('اتجاه الدوران')));
  ok('three recall prompts with model answers', RECALL.prompts.length === 3 && RECALL.prompts.every(p => p.modelAnswer.length > 80));
}

console.log('\n[9] Scope: the minimum set, and nothing beyond it');
{
  const outOfScope = ['pid tuning', 'blackbox', 'rpm filter', 'gps rescue', 'ضبط pid', 'المرشحات', 'cli'];
  for (const term of outOfScope) {
    ok(`lesson 18 stays out of "${term}"`, !ALL_TEXT.toLowerCase().includes(term.toLowerCase()));
  }
  ok('and it says out loud that the rest is deliberately left alone', /يُترك كما هو الآن/.test(ALL_TEXT));
}

console.log(`\nAll ${passed} assertions passed.`);
