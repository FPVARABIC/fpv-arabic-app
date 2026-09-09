/**
 * THE COMPATIBILITY TRUTHS BOTH SURFACES ASK ABOUT
 * ================================================
 *
 * The build section judges compatibility twice, and the two judgements are
 * different QUESTIONS:
 *
 *   · the part card, before selection — «if I add THIS candidate to what is
 *     already chosen, does anything documented object?»
 *   · the final report, after selection — «given the whole assembled build,
 *     what findings apply?»
 *
 * Those are not the same function and must not be forced into one. But where
 * they reason about the SAME physical fact, they must not reason about it
 * separately — and they did. `web/lib/build/checks.ts` refused a frame whose
 * size contradicted the declared build size; `data/project/verdicts.ts` never
 * looked at `sizeInch` at all. So the advanced mode could show «غير متوافق» on
 * a card, let the reader override it, and then print a compatibility report
 * that never mentioned the objection. The card's own file opened by promising
 * that «the card and the final report can never disagree about a rule». They
 * could, and did.
 *
 * WHAT THIS FILE IS
 * -----------------
 * The truths themselves, below both consumers. Each is a small pure function
 * over exactly the parts it needs, returning a normalized verdict and the
 * reason for it. It knows nothing about severities, about Arabic prose beyond
 * the one sentence that states the objection, about screens, or about which
 * consumer is asking. The two composers keep their own vocabularies and their
 * own scope; what they may no longer keep is their own copy of the rule.
 *
 * WHY ONLY FOUR
 * -------------
 * Every overlapping candidate was audited before anything was extracted, and
 * only four are genuinely the same question asked twice:
 *
 *   frame-size         both compare a frame against the DECLARED build size.
 *                      Only the card did. This is the defect being fixed.
 *   frame-motor-class  both call `validateFrameMotor`.
 *   prop-clearance     both call `validateFramePropeller`.
 *   design-voltage     both compare a battery's cell count against the
 *                      declared design voltage — hand-written twice.
 *
 * Two more looked like overlaps and are not:
 *
 *   voltage-motor / voltage-esc — the REPORT compares a motor or an ESC
 *   against the chosen battery's real `sCount` through the shared validators.
 *   The CARD compares a candidate's `compatibilityTags.batteryVoltages`
 *   against the declared design voltage — a curation tag, a different input,
 *   answering «is this part offered at this voltage» rather than «do these two
 *   parts agree». Merging them would mean inventing a rule neither layer has.
 *   They stay separate, and `scripts/testCompatEquivalence.ts` records why.
 *
 * Nothing here adds a rule. No thresholds, no headroom, no manufacturer
 * assumptions. `frame-size` reuses `frameMatchesSize` and its documented
 * tolerance rather than introducing a second one; the rest call the validators
 * that already existed.
 */

import type { Frame, Motor, Propeller, Battery } from '../types';
import { validateFrameMotor, validateFramePropeller } from './validators';
import { frameMatchesSize } from '../frameSizeMatch';

/** The stable identity of one physical truth. One id per rule, both surfaces. */
export type CompatRuleId =
  | 'frame-size'
  | 'frame-motor-class'
  | 'prop-clearance'
  | 'design-voltage';

/**
 * `pass` and `violated` mean the rule ran. `unknown` means the parts are
 * present but the documented data needed to judge them is not — which is a
 * different thing from the rule not applying at all, and the consumers render
 * it differently. A rule that does not apply returns null instead.
 */
export type CompatRuleStatus = 'pass' | 'violated' | 'unknown';

export interface CompatRuleOutcome {
  ruleId: CompatRuleId;
  status: CompatRuleStatus;
  /**
   * One sentence stating the objection, in the terms of the rule itself. The
   * consumers are free to wrap it, ignore it, or write their own fuller prose
   * around it — but when they state a reason it must be this fact.
   */
  reasonAr?: string;
}

/**
 * A frame against the size the build was DECLARED to be.
 *
 * The declared size is a decision the reader made at step 2; the frame is a
 * part they chose at step 3. When they contradict each other every downstream
 * assumption — propeller class, motor class, the sizes offered — was made
 * against a number the build no longer honours.
 *
 * Tolerance is `frameMatchesSize`'s and is not restated here: catalogue frames
 * carry real decimals (5.1) while the size options are nominal classes (5), and
 * that reconciliation already has one home.
 */
export function frameSizeRule(
  frame: Frame | undefined,
  declaredSizeInch: number | undefined,
): CompatRuleOutcome | null {
  if (!frame || declaredSizeInch === undefined) return null;
  const matches = frameMatchesSize(frame, declaredSizeInch);
  return {
    ruleId: 'frame-size',
    status: matches ? 'pass' : 'violated',
    reasonAr: matches
      ? undefined
      : `مقاس هذا الإطار لا يطابق حجم ${declaredSizeInch} إنش الذي اخترته.`,
  };
}

/**
 * A motor's nominal frame class against the frame.
 *
 * A motor with no declared class gives nothing to compare, and the validator
 * answers «compatible» there only because it has no grounds to refuse —
 * reporting that as a verified pass would be a fabricated approval. So the
 * rule declines instead, exactly as `computeFindings` already did.
 */
export function frameMotorClassRule(
  frame: Frame | undefined,
  motor: Motor | undefined,
): CompatRuleOutcome | null {
  if (!frame || !motor) return null;
  if (motor.compatibilityTags.frameSizeInch === undefined) return null;
  const result = validateFrameMotor(frame, motor);
  return {
    ruleId: 'frame-motor-class',
    status: result.isCompatible ? 'pass' : 'violated',
    reasonAr: result.isCompatible
      ? undefined
      : result.reasonAr ?? 'المحرك غير مناسب لهذا الإطار.',
  };
}

/** A propeller's diameter against what the frame documents it can swing. */
export function propClearanceRule(
  frame: Frame | undefined,
  propeller: Propeller | undefined,
): CompatRuleOutcome | null {
  if (!frame || !propeller) return null;
  const result = validateFramePropeller(frame, propeller);
  return {
    ruleId: 'prop-clearance',
    status: result.isCompatible ? 'pass' : 'violated',
    reasonAr: result.isCompatible
      ? undefined
      : result.reasonAr ?? 'المروحة أكبر من مساحة الإطار.',
  };
}

/**
 * A battery's cell count against the voltage the build was DESIGNED around.
 *
 * Not the same question as «does this battery suit this motor» — that is
 * `validateMotorBattery`, part against part. This one is against the DECISION:
 * the motor, the KV and the propeller were all chosen on a stated voltage, and
 * a battery that departs from it invalidates the premise of those choices
 * rather than any single pairing.
 */
export function designVoltageRule(
  battery: Battery | undefined,
  declaredCellCount: number | undefined,
): CompatRuleOutcome | null {
  if (!battery || declaredCellCount === undefined) return null;
  const matches = battery.specs.sCount === declaredCellCount;
  return {
    ruleId: 'design-voltage',
    status: matches ? 'pass' : 'violated',
    reasonAr: matches
      ? undefined
      : `بطارية ${battery.specs.sCount}S بينما بناؤك مصمم على ${declaredCellCount}S.`,
  };
}

/**
 * The registry — every shared truth, and what each needs to run.
 *
 * It exists so a rule cannot be added to one consumer and forgotten in the
 * other: `scripts/testCompatCompleteness.ts` walks this list and asserts BOTH
 * composers reference every id. That is the guard against the whole class of
 * defect this file was created for, not just against the one instance of it.
 */
export const SHARED_COMPAT_RULES: readonly {
  id: CompatRuleId;
  /** What the rule decides, for a maintainer reading the registry. */
  whatAr: string;
  /** The snapshot/context fields it reads. */
  inputs: readonly string[];
}[] = [
  { id: 'frame-size', whatAr: 'الإطار مقابل حجم البناء المعلن', inputs: ['frame', 'sizeInch'] },
  { id: 'frame-motor-class', whatAr: 'فئة المحرك مقابل الإطار', inputs: ['frame', 'motor'] },
  { id: 'prop-clearance', whatAr: 'قطر المروحة مقابل خلوص الإطار', inputs: ['frame', 'propeller'] },
  { id: 'design-voltage', whatAr: 'البطارية مقابل جهد التصميم المعلن', inputs: ['battery', 'cellCount'] },
];
