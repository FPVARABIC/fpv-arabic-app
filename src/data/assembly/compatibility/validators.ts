import type { Frame, Motor, Esc, Battery, Propeller } from '../types';

export interface CompatibilityResult {
  isCompatible: boolean;
  reasonAr?: string;
}

// TODO: Ahmed will review specs
export function validateFrameMotor(frame: Frame, motor: Motor): CompatibilityResult {
  if (!motor.compatibilityTags.frameSizeInch) return { isCompatible: true };
  if (motor.compatibilityTags.frameSizeInch !== frame.specs.sizeInch) {
    return { isCompatible: false, reasonAr: 'حجم المحرك غير مناسب لحجم هذا الإطار' };
  }
  return { isCompatible: true };
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
  if (propeller.specs.sizeInch > frame.specs.sizeInch) {
    return { isCompatible: false, reasonAr: 'مقاس المروحة أكبر من المساحة المتاحة في هذا الإطار' };
  }
  return { isCompatible: true };
}
