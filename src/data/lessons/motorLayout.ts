/**
 * The quad's four motors: Betaflight's numbering, and the default rotation.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Two places used to state this independently, and they disagreed.
 * `QuadXLayout.tsx` — the diagram Lesson 1 is built around — numbered the
 * front-right motor M1, while Betaflight numbers the REAR-right motor M1.
 * Worse, Lesson 12's explanation said the front-left and rear-right motors
 * turn counter-clockwise: the exact opposite of the diagram the learner had
 * explored eleven lessons earlier, and the opposite of the default. A learner
 * who follows the lesson and then opens the Motors tab finds neither the
 * numbers nor the directions where the lessons put them.
 *
 * Both now read this one table, and `scripts/testMotorLayout.ts` fails the
 * build if either drifts from it again.
 *
 * THE NUMBERING
 * -------------
 * Betaflight's QUAD X mixer lists its motors in the order REAR_R, FRONT_R,
 * REAR_L, FRONT_L — so M1 is the rear right motor, not the front right. That
 * is the numbering silk-screened on flight controllers and shown in the
 * configurator's Motors tab, and it is what the learner meets the first time
 * they spin a motor up.
 *
 * THE ROTATION
 * ------------
 * `spin` is the DEFAULT, «props-in»: seen from above, the front props' leading
 * blades sweep toward the centre line, which makes front-left and rear-right
 * turn clockwise and the other diagonal turn counter-clockwise. The same
 * pairing falls out of the mixer's yaw column — the motors that speed up for a
 * right yaw are the counter-clockwise ones, because a prop's reaction torque
 * turns the frame the other way.
 *
 * «Props-out» — all four reversed — is a common choice, not the default, and
 * it is set in software rather than by how a motor is bolted down. Lesson 12
 * says exactly that, in the words this file provides.
 *
 * Pure data: no React, no imports. Rendered by `src/components/diagrams/
 * QuadXLayout.tsx` on both surfaces, and read by `src/data/lessonsData.ts`.
 */

export type MotorSpin = 'cw' | 'ccw';

export type MotorPosition = 'front-left' | 'front-right' | 'rear-left' | 'rear-right';

export interface QuadMotor {
  /** Stable id: the diagram's selection state and its test ids are keyed by it. */
  id: 'm1' | 'm2' | 'm3' | 'm4';
  /** Betaflight's motor number, as printed on the board. */
  number: 1 | 2 | 3 | 4;
  position: MotorPosition;
  /** The position in Arabic, e.g. «الخلفي الأيمن» — the lessons' own wording. */
  positionAr: string;
  /** Default (props-in) rotation, seen from above. */
  spin: MotorSpin;
  /** Toward the nose. */
  front: boolean;
  /** To the pilot's right when the nose points away. */
  right: boolean;
}

/** In Betaflight's own order: M1 … M4. */
export const QUAD_X_MOTORS: readonly QuadMotor[] = [
  { id: 'm1', number: 1, position: 'rear-right', positionAr: 'الخلفي الأيمن', spin: 'cw', front: false, right: true },
  { id: 'm2', number: 2, position: 'front-right', positionAr: 'الأمامي الأيمن', spin: 'ccw', front: true, right: true },
  { id: 'm3', number: 3, position: 'rear-left', positionAr: 'الخلفي الأيسر', spin: 'ccw', front: false, right: false },
  { id: 'm4', number: 4, position: 'front-left', positionAr: 'الأمامي الأيسر', spin: 'cw', front: true, right: false },
];

export const SPIN_LABEL_AR: Record<MotorSpin, string> = {
  cw: 'مع عقارب الساعة (CW)',
  ccw: 'عكس عقارب الساعة (CCW)',
};

/** Short form for a diagram label: «CW ↻» / «CCW ↺». */
export const SPIN_BADGE: Record<MotorSpin, string> = {
  cw: 'CW ↻',
  ccw: 'CCW ↺',
};

export function motorById(id: QuadMotor['id']): QuadMotor {
  return QUAD_X_MOTORS.find(m => m.id === id)!;
}

/** The two motors that turn this way by default, front one first. */
export function motorsWithSpin(spin: MotorSpin): QuadMotor[] {
  return QUAD_X_MOTORS.filter(m => m.spin === spin).sort((a, b) => Number(b.front) - Number(a.front));
}

/** «الأمامي الأيمن (M2) والخلفي الأيسر (M3)» — a diagonal pair, named in prose. */
export function motorPairAr(spin: MotorSpin): string {
  const [first, second] = motorsWithSpin(spin);
  return `${first.positionAr} (M${first.number}) و${second.positionAr} (M${second.number})`;
}

/** «M2 وM4» — the numbers alone, for a sentence that already says which end. */
function numbersAr(motors: readonly QuadMotor[]): string {
  const sorted = [...motors].sort((a, b) => a.number - b.number);
  return sorted.map(m => `M${m.number}`).join(' و');
}

/** «M2 وM4» — the two motors toward the nose. */
export const FRONT_MOTOR_NUMBERS_AR = numbersAr(QUAD_X_MOTORS.filter(m => m.front));

/** «M1 وM3» — the two motors toward the tail. */
export const REAR_MOTOR_NUMBERS_AR = numbersAr(QUAD_X_MOTORS.filter(m => !m.front));

/**
 * The sentence Lesson 12 uses, and the caveat that keeps it honest: a default
 * is not a law, and the direction is a software setting either way.
 */
export const DEFAULT_SPIN_SENTENCE_AR =
  `في الإعداد الافتراضي (Props-in) يدور ${motorPairAr('ccw')} ${SPIN_LABEL_AR.ccw}، `
  + `ويدور ${motorPairAr('cw')} ${SPIN_LABEL_AR.cw}. `
  + 'وهناك من يعكس الأربعة معاً (Props-out)، وهو خيار شائع لا قاعدة — '
  + 'واتجاه أي محرك يُضبَط من البرنامج، لا بطريقة تثبيته.';
