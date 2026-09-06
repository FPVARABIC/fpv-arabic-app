/**
 * Lesson 19 — المراوح: التوافق والتركيب.
 *
 * WHAT THIS EXISTS TO CATCH
 * -------------------------
 *   1. KV is APPLIED here, never re-defined. The definition belongs to lesson
 *      4 and must stay there; if it reappears the spiral collapses into four
 *      copies of the same explanation.
 *   2. Propeller direction is read from the SAME shared table lesson 18's
 *      motor check renders, so a propeller can never be taught onto an arm
 *      that turns the other way.
 *   3. Manufacturer figures stay conditional. A number measured with one
 *      propeller and one pack is not a property of the motor, and no ESC
 *      margin is stated as a law.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createInitialSessionState, recordCheckpointAnswer, recordRecallRevealed,
  recordInteractionVariant, isReadyToComplete, getReadinessRequirements, stageCount,
} from '../src/data/lessons/lessonJourneyEngine';
import { lesson19JourneyDefinition as def } from '../src/data/lessons/lesson19Journey.definition';
import { lesson04JourneyDefinition } from '../src/data/lessons/lesson04Journey.definition';
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
const LESSON = lessonsData.find(l => l.id === 'lesson-propellers')!;

console.log('\n[1] Registration and shape');
{
  ok('lesson 19 exists in lessonsData', !!LESSON);
  ok('it is number 19', LESSON.number === 19);
  ok('it sits on the flight track — the propellers are the gate to flying', LESSON.track === 'flight');
  ok('it is marked متوسط', LESSON.level === 'متوسط');
  ok('its diagram type is prop-direction', LESSON.diagramType === 'prop-direction');
  ok('definition.lessonId matches', def.lessonId === LESSON.id);
  ok('registry resolves it to this definition', getLessonJourneyDefinition(LESSON.id) === def);
  ok('lesson 19 has 20 stages', STAGE_COUNT === 20);
  ok('stage ids are unique', new Set(def.stages.map(s => s.id)).size === STAGE_COUNT);
}

console.log('\n[2] KV is APPLIED, and never re-defined');
{
  ok('the lesson uses KV', /KV/.test(ALL_TEXT));
  // The definition — "theoretical RPM per volt, with no propeller" — is
  // lesson 4's. Its two qualifier phrases must not reappear here.
  ok('it does not repeat the per-volt definition', !/لكل فولت/.test(ALL_TEXT));
  ok('it does not repeat the no-load qualifier', !/بلا حِمل/.test(ALL_TEXT) && !/بلا مروحة/.test(ALL_TEXT));
  ok('lesson 4 still owns the definition', /لكل فولت واحد/.test(JSON.stringify(lesson04JourneyDefinition)));
  ok('KV appears inside a system decision instead', /ثلاثة أضلاع لنظام واحد/.test(ALL_TEXT));

  const cell = CHECKPOINTS.find(s => s.checkpoint.id === 'cellChangeReviewsTheSystem')!.checkpoint;
  const right = cell.options.find(o => o.correct)!;
  ok('a checkpoint makes the learner apply KV to a real change', /4S/.test(cell.question) && /6S/.test(cell.question));
  ok('…and its answer reviews the whole system, not one part', /المروحة وESC معًا/.test(right.text));
}

console.log('\n[3] Direction comes from the SAME shared table lesson 18 used');
{
  ok('the diagram is the prop-direction one', DIAGRAM.diagramType === 'prop-direction');
  ok('its required variants ARE the shared motor ids',
    JSON.stringify(DIAGRAM.requiredVariants) === JSON.stringify(QUAD_X_MOTORS.map(m => m.id)));

  const component = read('src/components/diagrams/PropDirection.tsx');
  ok('the diagram component imports the shared table', /from '\.\.\/\.\.\/data\/lessons\/motorLayout'/.test(component));
  ok('it renders that table rather than a literal list', /QUAD_X_MOTORS/.test(component) && /SPATIAL\.map/.test(component));
  ok('and it lays the four arms out as a top-down map, not in list order',
    /Number\(b\.front\) - Number\(a\.front\)/.test(component) && /Number\(b\.right\) - Number\(a\.right\)/.test(component));
  ok('it hard-codes no rotation of its own', !/'cw'|'ccw'/.test(component.replace(/import[^;]+;/g, '')));

  ok('the lesson makes the learner\'s OWN observed direction the reference, not the drawing',
    /رأيتَه بعينك/.test(ALL_TEXT) && /لا ما تفترضه|لا الافتراض/.test(ALL_TEXT));
  ok('props-out is framed as the learner\'s own configured choice, not a rule',
    /Props-out/.test(ALL_TEXT) && /وإن كنتَ أنت من اختار/.test(ALL_TEXT));
  ok('…and the glossary sends them to what is actually set on their aircraft',
    /ما هو مضبوط فعلًا على طائرتك/.test(ALL_TEXT));
}

console.log('\n[4] Manufacturer data stays conditional, and no margin is invented');
{
  const mfr = CHECKPOINTS.find(s => s.checkpoint.id === 'manufacturerDataIsConditional')!.checkpoint;
  const right = mfr.options.find(o => o.correct)!;
  ok('a checkpoint tests reading a manufacturer table', /ورقة محرك/.test(mfr.question));
  ok('its answer keeps the figures bound to their own combination', /لتلك المروحة وذلك العدد من الخلايا تحديدًا/.test(right.text));
  ok('a distractor offers the "property of the motor" misreading',
    mfr.options.some(o => !o.correct && /أرقام المحرك نفسه/.test(o.text)));

  const example = def.stages.find(s => s.id === 'compatibilityWorkedExample')!;
  const body = JSON.stringify(example);
  ok('the worked example labels its numbers as a catalogue example', /كتالوج المنصّة/.test(body));
  ok('…explicitly not a general rule', /لا قاعدة عامة/.test(body));
  ok('…and sends unresolved questions to the manufacturer table, not to a guess',
    /جدول المصنّع/.test(body) && /لا تُخمَّن/.test(body));

  // No ESC headroom multiplier may be stated as a law anywhere in the lesson.
  ok('no ESC margin is stated as a fixed multiplier', !/هامش [0-9]|بنسبة [0-9]+%|اضرب في/.test(ALL_TEXT));
  // Every range with a unit carries that unit on BOTH ends (the bidi rule).
  ok('no hyphenated range renders backwards', !/\d+-\d+[A-Za-z]/.test(ALL_TEXT));
}

console.log('\n[5] Five checkpoints: compatibility, application, scenario');
{
  ok('exactly 5 checkpoint stages defined', CHECKPOINTS.length === 5);
  const ids = CHECKPOINTS.map(s => s.checkpoint.id);
  ok('checkpoint ids are stable and in teaching order',
    JSON.stringify(ids) === JSON.stringify([
      'pitchRaisesLoad', 'cellChangeReviewsTheSystem', 'manufacturerDataIsConditional',
      'wrongArmFlipsTheQuad', 'crackedPropIsRetired',
    ]));
  for (const stage of CHECKPOINTS) {
    const cp = stage.checkpoint;
    ok(`checkpoint "${cp.id}" has exactly four options`, cp.options.length === 4);
    ok(`checkpoint "${cp.id}" has exactly one correct option`, cp.options.filter(o => o.correct).length === 1);
    ok(`checkpoint "${cp.id}": every option carries its own feedback`, cp.options.every(o => o.feedback.trim().length > 20));
  }
  const stems = CHECKPOINTS.map(s => s.checkpoint.question);
  ok('no question uses the over-used recognition stem',
    stems.every(q => !q.startsWith('أيّ من التالي صحيح بخصوص')));

  const pitch = CHECKPOINTS.find(s => s.checkpoint.id === 'pitchRaisesLoad')!.checkpoint;
  const pitchRight = pitch.options.find(o => o.correct)!;
  ok('the pitch answer names load then current, in that causal order',
    pitchRight.text.indexOf('حِمل') < pitchRight.text.indexOf('تيارًا'));
  ok('a distractor carries the "higher pitch spins faster" misreading',
    pitch.options.some(o => !o.correct && /يرفع سرعة دوران/.test(o.text)));
}

console.log('\n[6] SAFETY — the wrong arm, the cracked blade, and where propellers go on');
{
  const wrong = CHECKPOINTS.find(s => s.checkpoint.id === 'wrongArmFlipsTheQuad')!.checkpoint;
  const wrongRight = wrong.options.find(o => o.correct)!;
  ok('the wrong-arm answer names the real consequence: it flips', /تنقلب/.test(wrongRight.text));
  ok('…and explains it as thrust in the opposite direction', /يدفع الهواء لأعلى/.test(wrongRight.text));
  ok('a distractor offers "the flight controller will compensate"',
    wrong.options.some(o => !o.correct && /تصحّح لوحة التحكم/.test(o.text)));

  const cracked = CHECKPOINTS.find(s => s.checkpoint.id === 'crackedPropIsRetired')!.checkpoint;
  const crackedRight = cracked.options.find(o => o.correct)!;
  ok('a cracked propeller is retired, not repaired', /استبدلها/.test(crackedRight.text));
  ok('a distractor offers gluing it', cracked.options.some(o => !o.correct && /ألصق/.test(o.text)));

  const callout = CALLOUTS.find(c => c.id === 'propsLastCallout')!;
  ok('a callout puts propeller fitting at the flying site, not the workshop', !!callout && /في مكان الطيران/.test(callout.body));
  ok('…and takes them off before any bench work', /تُنزع قبل أي عمل على الطاولة/.test(callout.body));

  const kp = KEY_POINTS.find(k => k.id === 'preFlightKeyPoints')!;
  ok('a four-point pre-flight propeller check closes the lesson', !!kp && kp.points.length === 4);
  ok('it covers direction, face, nut and damage',
    /الاتجاه/.test(kp.points[0]) && /الوجه/.test(kp.points[1])
    && /الصامولة/.test(kp.points[2]) && /استبدل/.test(kp.points[3]));
}

console.log('\n[7] Completion gates, glossary and recall');
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

  ok('exactly 6 glossary terms', GLOSSARY.terms.length === 6);
  ok('the glossary defines diameter, pitch and blade count',
    ['Diameter', 'Pitch', 'Blade Count'].every(t => GLOSSARY.terms.some(g => g.term.includes(t))));
  ok('the glossary keeps manufacturer data conditional too',
    GLOSSARY.terms.some(g => g.term.includes('Manufacturer Data') && /لتلك التركيبة وحدها/.test(g.definition)));
  ok('three recall prompts with model answers', RECALL.prompts.length === 3 && RECALL.prompts.every(p => p.modelAnswer.length > 80));

  const completion = def.stages[def.stages.length - 1];
  ok('the final stage is a completion stage', completion.type === 'completion');
  if (completion.type === 'completion') {
    const next = lessonsData.find(l => l.id === 'lesson-stick-control-first-flight')!;
    const bridge = completion.nextLessonBridge(next);
    ok('the bridge is built from the real next lesson', bridge.includes(next.title) && bridge.includes(next.description));
  }
}

console.log(`\nAll ${passed} assertions passed.`);
