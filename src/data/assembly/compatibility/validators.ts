import type { Frame, Motor, Esc, Battery, Propeller } from '../types';

export interface CompatibilityResult {
  isCompatible: boolean;
  reasonAr?: string;
}

// Frame sizeInch values are real decimals (5, 5.1, 5.5, 7); motor
// frameSizeInch tags are rounded nominal-class labels (e.g. 5). A frame's
// own sourced text often calls itself "5 inch" even at sizeInch: 5.1 (see
// frame-speedybee-mario5-budget, frame-aos5-evo-mid) — a small tolerance
// resolves that precision mismatch without treating genuinely larger
// frames (5.5") as automatically the same class.
const FRAME_SIZE_TOLERANCE_INCH = 0.15;

export function validateFrameMotor(frame: Frame, motor: Motor): CompatibilityResult {
  const nominal = motor.compatibilityTags.frameSizeInch;
  if (!nominal) return { isCompatible: true };
  const withinTolerance = Math.abs(frame.specs.sizeInch - nominal) <= FRAME_SIZE_TOLERANCE_INCH;
  const withinDocumentedMax =
    motor.specs.maxFrameSizeInch !== undefined && frame.specs.sizeInch <= motor.specs.maxFrameSizeInch;
  if (withinTolerance || withinDocumentedMax) {
    return { isCompatible: true };
  }
  return { isCompatible: false, reasonAr: 'حجم المحرك غير مناسب لحجم هذا الإطار' };
}

export function validateMotorBattery(motor: Motor, battery: Battery): CompatibilityResult {
  if (!motor.specs.compatibleVoltages.includes(battery.specs.sCount)) {
    return { isCompatible: false, reasonAr: 'المحرك غير مصمم للعمل بفولتية هذه البطارية' };
  }
  return { isCompatible: true };
}

export function validateEscBattery(esc: Esc, battery: Battery): CompatibilityResult {
  if (!esc.specs.compatibleVoltages.includes(battery.specs.sCount)) {
    return { isCompatible: false, reasonAr: 'الـESC لا يتحمل فولتية هذه البطارية' };
  }
  return { isCompatible: true };
}

export function validateFramePropeller(frame: Frame, propeller: Propeller): CompatibilityResult {
  const maxSize = frame.specs.maxPropSizeInch ?? frame.specs.sizeInch;
  if (propeller.specs.sizeInch > maxSize) {
    return { isCompatible: false, reasonAr: 'مقاس المروحة أكبر من المساحة المتاحة في هذا الإطار' };
  }
  return { isCompatible: true };
}

// validateVideoSystemVideoUnit was removed with the video-stage merge: the
// separate videoSystems selection it cross-checked no longer exists (users
// now pick the concrete video unit directly at stage-3), and the validator
// was never wired into buildReport.ts anyway. The goggles-must-match-system
// guardrail it encoded lives in stage-3's descriptionAr instead.
