/**
 * One truth about the four motors, across the diagram and the lessons.
 *
 * WHAT THIS EXISTS TO CATCH
 * -------------------------
 * The audit found Lesson 1's diagram and Lesson 12's text disagreeing about
 * which way the motors turn — and both disagreeing with Betaflight about
 * which motor is M1. A learner met one layout in the diagram, the opposite in
 * the text, and a third in the configurator.
 *
 * Nothing here re-states the numbers by hand: the expectations are DERIVED
 * from Betaflight's own definitions (the QUAD X mixer's motor order, and the
 * props-in geometry), then checked against the shared table and against both
 * places that render it.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  QUAD_X_MOTORS, SPIN_LABEL_AR, DEFAULT_SPIN_SENTENCE_AR, motorPairAr, motorsWithSpin,
  FRONT_MOTOR_NUMBERS_AR, REAR_MOTOR_NUMBERS_AR, motorById,
  type MotorPosition, type MotorSpin,
} from '../src/data/lessons/motorLayout';
import { lessonsData } from '../src/data/lessonsData';
import { lesson01JourneyDefinition } from '../src/data/lessons/lesson01Journey.definition';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[1] The table is a well-formed quad');
{
  ok('four motors', QUAD_X_MOTORS.length === 4);
  ok('ids are unique', new Set(QUAD_X_MOTORS.map(m => m.id)).size === 4);
  ok('numbers are 1..4 exactly once', JSON.stringify([...QUAD_X_MOTORS].map(m => m.number).sort()) === '[1,2,3,4]');
  ok('every corner is occupied once', new Set(QUAD_X_MOTORS.map(m => m.position)).size === 4);
  ok('two turn clockwise and two counter-clockwise',
    motorsWithSpin('cw').length === 2 && motorsWithSpin('ccw').length === 2);
  ok('id and number agree (m3 is M3)', QUAD_X_MOTORS.every(m => m.id === `m${m.number}`));
  ok('front/right flags match the position name', QUAD_X_MOTORS.every(m =>
    m.front === m.position.startsWith('front') && m.right === m.position.endsWith('right')));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2] Betaflight\'s numbering, derived from its QUAD X mixer order');
{
  // Betaflight's mixerQuadX lists its four rows in this order, and row N is
  // motor N. Anything else is a number the learner will not find on the board.
  const MIXER_ORDER: readonly MotorPosition[] = ['rear-right', 'front-right', 'rear-left', 'front-left'];
  for (const [i, position] of MIXER_ORDER.entries()) {
    const expected = i + 1;
    const motor = QUAD_X_MOTORS.find(m => m.position === position)!;
    ok(`M${expected} is the ${position} motor`, motor.number === expected);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3] Props-in is the default, and the diagonals agree');
{
  // Props-in, seen from above: each front prop's leading blade sweeps toward
  // the centre line. That makes the front-left prop turn clockwise and the
  // front-right one counter-clockwise; the rear motors follow their diagonals.
  const PROPS_IN: Record<MotorPosition, MotorSpin> = {
    'front-left': 'cw',
    'front-right': 'ccw',
    'rear-right': 'cw',
    'rear-left': 'ccw',
  };
  for (const motor of QUAD_X_MOTORS) {
    ok(`${motor.position} turns ${PROPS_IN[motor.position]} by default`, motor.spin === PROPS_IN[motor.position]);
  }
  const diagonal = (a: MotorPosition, b: MotorPosition) =>
    QUAD_X_MOTORS.find(m => m.position === a)!.spin === QUAD_X_MOTORS.find(m => m.position === b)!.spin;
  ok('the two diagonals each share one direction',
    diagonal('front-left', 'rear-right') && diagonal('front-right', 'rear-left'));
  ok('every motor turns against both of its neighbours', QUAD_X_MOTORS.every(m => {
    const neighbours = QUAD_X_MOTORS.filter(o => o.id !== m.id && (o.front === m.front || o.right === m.right));
    return neighbours.length === 2 && neighbours.every(o => o.spin !== m.spin);
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[4] Lesson 1\'s diagram draws the table rather than its own copy');
{
  const src = read('src/components/diagrams/QuadXLayout.tsx');
  ok('it reads the shared table', /QUAD_X_MOTORS/.test(src) && /from '\.\.\/\.\.\/data\/lessons\/motorLayout'/.test(src));
  ok('it renders one <Motor> per table row, not four hand-placed ones',
    /QUAD_X_MOTORS\.map\(/.test(src) && !/label="M[1-4]"/.test(src));
  ok('no second direction table hides in the component', !/MOTOR_CW/.test(src));
  // The id itself is what the browser test and the phone UI tests select on;
  // it now travels through HotSpot's `testId` prop rather than a raw attribute.
  ok('the motor test ids the browser test clicks are unchanged',
    /quad-x-motor-\$\{motor\.id\}/.test(src));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[5] Lesson 12 states the default from the same table');
{
  const lesson12 = lessonsData.find(l => l.id === 'lesson-motor-install')!;
  const text = lesson12.explanation;

  ok('the explanation carries the shared sentence verbatim', text.includes(DEFAULT_SPIN_SENTENCE_AR));

  for (const spin of ['cw', 'ccw'] as const) {
    const pair = motorPairAr(spin);
    const at = text.indexOf(pair);
    ok(`it names the ${spin} pair (${pair})`, at !== -1);
    ok(`…and says ${spin} right after it, not the other direction`,
      text.slice(at + pair.length, at + pair.length + 40).includes(SPIN_LABEL_AR[spin]));
  }

  ok('it marks props-out as a choice rather than the rule',
    text.includes('Props-out') && text.includes('خيار شائع لا قاعدة'));
  ok('it says the direction is set in software',
    /يُضبَط من البرنامج/.test(text));

  // The exact claim the audit found: the front-left/rear-right diagonal called
  // counter-clockwise, which is props-out presented as the norm.
  ok('the old contradicting claim is gone',
    !/الأمامي الأيسر والخلفي الأيمن يدوران عكس عقارب الساعة/.test(text));
  ok('the lesson still tells the learner the direction is changeable in software',
    lesson12.importantPoints.some(p => /Betaflight/.test(p)));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[6] Lesson 1\'s worked example uses those same numbers');
{
  const stage = lesson01JourneyDefinition.stages.find(s => s.id === 'rearMotorScenario')!;
  assert.ok(stage.type === 'worked_example');
  const body = stage.type === 'worked_example' ? stage.body : '';

  ok('the rear pair is named by number', body.includes(`(${REAR_MOTOR_NUMBERS_AR})`));
  ok('the front pair is named by number', body.includes(`(${FRONT_MOTOR_NUMBERS_AR})`));
  ok('rear is M1 and M3 under Betaflight numbering', REAR_MOTOR_NUMBERS_AR === 'M1 وM3');
  ok('front is M2 and M4 under Betaflight numbering', FRONT_MOTOR_NUMBERS_AR === 'M2 وM4');
  ok('the numbers follow the word they describe',
    body.indexOf('الخلفيين') < body.indexOf(`(${REAR_MOTOR_NUMBERS_AR})`)
    && body.indexOf('الأماميان') < body.indexOf(`(${FRONT_MOTOR_NUMBERS_AR})`));

  const src = read('src/data/lessons/lesson01Journey.definition.ts');
  ok('the definition interpolates them rather than spelling them', /\$\{REAR_MOTOR_NUMBERS_AR\}/.test(src));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[7] The helpers read the way a sentence needs them');
{
  ok('motorById resolves every id', QUAD_X_MOTORS.every(m => motorById(m.id) === m));
  ok('a pair names the front motor first', motorsWithSpin('cw')[0].front && !motorsWithSpin('cw')[1].front);
  ok('the ccw pair reads «الأمامي الأيمن (M2) والخلفي الأيسر (M3)»',
    motorPairAr('ccw') === 'الأمامي الأيمن (M2) والخلفي الأيسر (M3)');
  ok('the cw pair reads «الأمامي الأيسر (M4) والخلفي الأيمن (M1)»',
    motorPairAr('cw') === 'الأمامي الأيسر (M4) والخلفي الأيمن (M1)');
}

console.log(`\nAll ${passed} assertions passed.`);
