/**
 * Lesson 17 — أول تشغيل آمن.
 *
 * WHAT THIS EXISTS TO CATCH
 * -------------------------
 * This lesson is a safety gate wearing a lesson's clothes. Two properties
 * matter more than anything it teaches:
 *   1. It ends BEFORE anything spins. If a motor test ever drifts into it,
 *      the props-off gate and the motor-numbering context stop lining up.
 *   2. Its "no propellers" rule is stated where a learner cannot miss it, and
 *      its last question is the gate itself.
 * The rest of the file holds the ordinary shape down: five checkpoints, one
 * correct option each, per-option feedback, a five-step gated diagram.
 */
import assert from 'node:assert/strict';
import {
  createInitialSessionState, recordCheckpointAnswer, recordRecallRevealed,
  recordInteractionVariant, areAllCheckpointsAnswered, isRecallComplete,
  getReadinessRequirements, isReadyToComplete, stageCount, currentStage,
} from '../src/data/lessons/lessonJourneyEngine';
import { lesson17JourneyDefinition as def } from '../src/data/lessons/lesson17Journey.definition';
import type {
  CheckpointStage, RecallStage, GlossaryStage, InteractiveDiagramStage, CalloutStage,
} from '../src/types/lessonJourney';
import { lessonsData } from '../src/data/lessonsData';
import { getLessonJourneyDefinition } from '../src/data/lessons/journeyRegistry';

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
const STAGE_COUNT = stageCount(def);
const ALL_TEXT = JSON.stringify(def);

console.log('\n[1] Registration and shape');
{
  const lesson = lessonsData.find(l => l.id === 'lesson-first-power-up')!;
  ok('lesson 17 exists in lessonsData', !!lesson);
  ok('it is number 17', lesson.number === 17);
  ok('it sits on the setup track', lesson.track === 'setup');
  ok('its diagram type is pre-power-check', lesson.diagramType === 'pre-power-check');
  ok('it carries a safety warning', typeof lesson.warning === 'string' && lesson.warning.length > 40);
  ok('it carries a common mistake', lesson.commonMistake.length > 20);
  ok('definition.lessonId matches', def.lessonId === lesson.id);
  ok('registry resolves it to this definition', getLessonJourneyDefinition(lesson.id) === def);
  ok('lesson 17 has 20 stages (19 authored, plus the optional diagnostic-tool callout)', STAGE_COUNT === 20);
  ok('stage ids are unique', new Set(def.stages.map(s => s.id)).size === STAGE_COUNT);
  ok('starts on the orientation stage', currentStage(def, createInitialSessionState(def)).id === 'orientation');
}

console.log('\n[2] The pre-power protocol: five checks, all gated, in the safe order');
{
  ok('exactly one interactive_diagram stage exists', def.stages.filter(s => s.type === 'interactive_diagram').length === 1);
  ok('it renders the pre-power-check diagram', DIAGRAM.diagramType === 'pre-power-check');
  ok('it requires the five checks in the order that protects',
    JSON.stringify(DIAGRAM.requiredVariants) === JSON.stringify(['visual', 'polarity', 'no-props', 'smoke-stopper', 'resistance']));
  ok('it is listed in readinessOrder', (def.readinessOrder ?? []).includes(DIAGRAM.id));
  ok('every required check has its own hint', DIAGRAM.requiredVariants.every(v => !!DIAGRAM.hints?.partial?.[v]));
  // The order is the teaching. Connecting the battery before measuring is the
  // exact mistake the protocol exists to prevent.
  const vs = DIAGRAM.requiredVariants;
  ok('the visual check comes before every instrument check', vs.indexOf('visual') === 0);
  ok('propellers come off before anything is energised',
    vs.indexOf('no-props') < vs.indexOf('smoke-stopper') && vs.indexOf('no-props') < vs.indexOf('resistance'));
}

console.log('\n[3] SAFETY GATE — nothing spins in this lesson, and it says so');
{
  const propsCallout = CALLOUTS.find(c => c.id === 'propsOffCallout')!;
  ok('a dedicated propellers callout exists', !!propsCallout);
  ok('it is a danger callout, not a note', propsCallout.tone === 'danger');
  ok('it extends the rule to the NEXT lesson too, not just this one', /الدرس الذي يليه/.test(propsCallout.body));

  // The hard property: this lesson may REFER to motor testing as what comes
  // next — it must not TEACH it. Naming the configurator, or telling a learner
  // to spin anything, would put a props-off procedure in a lesson whose gate
  // and whose motor-numbering context both live in lesson 18.
  const noProcedure = ['betaflight', 'motor test', 'تبويب المحركات', 'ارفع الشريط', 'شغّل محركًا'];
  for (const term of noProcedure) {
    ok(`lesson 17 carries no motor-test procedure ("${term}")`, !ALL_TEXT.toLowerCase().includes(term.toLowerCase()));
  }
  // …and where it does mention them, it does so as a deferral.
  ok('motor testing appears only as something with its own later lesson', /اختبار المحركات له درسه/.test(ALL_TEXT));
  ok('it names what it has NOT proved, rather than implying the build is flight-ready',
    /لم تثبت/.test(ALL_TEXT) && /لم تتحقق/.test(ALL_TEXT));
}

console.log('\n[4] Five checkpoints: safety reasoning, recognition, and the gate itself');
{
  ok('exactly 5 checkpoint stages defined', CHECKPOINTS.length === 5);
  const ids = CHECKPOINTS.map(s => s.checkpoint.id);
  ok('checkpoint ids are stable and in teaching order',
    JSON.stringify(ids) === JSON.stringify([
      'debrisBeforePower', 'polarityIsCheckedTwice', 'abnormalFirstSeconds',
      'usbPowerIsNotAFault', 'propsStayOffGate',
    ]));
  for (const stage of CHECKPOINTS) {
    const cp = stage.checkpoint;
    ok(`checkpoint "${cp.id}" has exactly four options`, cp.options.length === 4);
    ok(`checkpoint "${cp.id}" has exactly one correct option`, cp.options.filter(o => o.correct).length === 1);
    ok(`checkpoint "${cp.id}": every option carries its own feedback`, cp.options.every(o => o.feedback.trim().length > 20));
  }
  const byId = (id: string) => CHECKPOINTS.find(s => s.checkpoint.id === id)!.checkpoint;

  const debris = byId('debrisBeforePower').options.find(o => o.correct)!;
  ok('the debris answer removes the cause and re-checks, rather than testing through it', /أزلها/.test(debris.text) && /أعد الفحص/.test(debris.text));

  const abnormal = byId('abnormalFirstSeconds').options.find(o => o.correct)!;
  ok('the abnormal-behaviour answer puts disconnection FIRST and diagnosis after', /افصل/.test(abnormal.text) && abnormal.text.indexOf('افصل') < abnormal.text.indexOf('الفحص'));

  const usb = byId('usbPowerIsNotAFault').options.find(o => o.correct)!;
  ok('the USB answer names it as expected behaviour, not a fault', /لا؛/.test(usb.text) && /مسار البطارية/.test(usb.text));

  const gate = byId('propsStayOffGate').options.find(o => o.correct)!;
  ok('the gate answer defers propellers until every bench test is done', /بعد أن تنتهي اختبارات الطاولة/.test(gate.text));
  ok('the gate is the LAST checkpoint of the lesson', CHECKPOINTS[CHECKPOINTS.length - 1].checkpoint.id === 'propsStayOffGate');
}

console.log('\n[5] Readiness: every gate must be engaged with, and answers may be wrong');
{
  let s = createInitialSessionState(def);
  ok('not ready at the start', !isReadyToComplete(def, s));
  ok('readiness lists one entry per gate (5 checkpoints + diagram + recall)',
    getReadinessRequirements(def, s).length === CHECKPOINTS.length + 2);
  for (const stage of CHECKPOINTS) {
    s = recordCheckpointAnswer(s, stage.checkpoint.id, stage.checkpoint.options.find(o => !o.correct)!.id);
  }
  ok('all checkpoints answered, every one of them wrong', areAllCheckpointsAnswered(def, s));
  ok('still not ready — the diagram and recall remain', !isReadyToComplete(def, s));
  for (const v of DIAGRAM.requiredVariants) s = recordInteractionVariant(s, DIAGRAM.id, v);
  ok('still not ready — recall remains', !isReadyToComplete(def, s));
  for (const p of RECALL.prompts) s = recordRecallRevealed(s, RECALL.id, p.id);
  ok('recall complete', isRecallComplete(RECALL, s));
  ok('READY once every gate has been engaged with', isReadyToComplete(def, s));
}

console.log('\n[6] Glossary, recall and the bridge to lesson 18');
{
  ok('exactly 6 glossary terms', GLOSSARY.terms.length === 6);
  ok('every definition is substantive', GLOSSARY.terms.every(t => t.definition.length > 40));
  ok('the glossary names the safety gate itself', GLOSSARY.terms.some(t => t.term.includes('بوابة السلامة')));
  ok('the glossary explains USB power not spinning motors', GLOSSARY.terms.some(t => t.term.includes('تغذية USB')));
  ok('three recall prompts, each with a model answer', RECALL.prompts.length === 3 && RECALL.prompts.every(p => p.modelAnswer.length > 80));

  const completion = def.stages[def.stages.length - 1];
  ok('the final stage is a completion stage', completion.type === 'completion');
  if (completion.type === 'completion') {
    const next = lessonsData.find(l => l.id === 'lesson-betaflight-minimum')!;
    const bridge = completion.nextLessonBridge(next);
    ok('the bridge is built from the real next lesson, not hardcoded', bridge.includes(next.title) && bridge.includes(next.description));
    ok('the bridge names the four things still unproven', /الريسيفر/.test(bridge) && /التسليح/.test(bridge) && /Failsafe/.test(bridge));
  }
}

console.log(`\nAll ${passed} assertions passed.`);
