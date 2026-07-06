import type { Frame, Motor, Esc, Battery, Propeller } from '../../../data/assembly/types';
import {
  validateFrameMotor,
  validateMotorBattery,
  validateEscBattery,
  validateFramePropeller,
} from '../../../data/assembly/compatibility/validators';

export interface BuildReportItem {
  descriptionAr: string;
  isCompatible: boolean;
  reasonAr?: string;
}

export interface BuildReport {
  items: BuildReportItem[];
  scorePercent: number;
}

export interface ReportableSelections {
  frame?: Frame;
  motor?: Motor;
  esc?: Esc;
  battery?: Battery;
  propeller?: Propeller;
}

// Only checks rules whose validator exists in compatibility/validators.ts
// and whose two required parts are both present in the selection.
export function buildCompatibilityReport(selections: ReportableSelections): BuildReport {
  const items: BuildReportItem[] = [];

  if (selections.frame && selections.motor) {
    const r = validateFrameMotor(selections.frame, selections.motor);
    items.push({ descriptionAr: 'توافق حجم الإطار مع المحركات', isCompatible: r.isCompatible, reasonAr: r.reasonAr });
  }
  if (selections.motor && selections.battery) {
    const r = validateMotorBattery(selections.motor, selections.battery);
    items.push({ descriptionAr: 'توافق فولتية البطارية مع المحركات', isCompatible: r.isCompatible, reasonAr: r.reasonAr });
  }
  if (selections.esc && selections.battery) {
    const r = validateEscBattery(selections.esc, selections.battery);
    items.push({ descriptionAr: 'توافق فولتية البطارية مع الـESC', isCompatible: r.isCompatible, reasonAr: r.reasonAr });
  }
  if (selections.frame && selections.propeller) {
    const r = validateFramePropeller(selections.frame, selections.propeller);
    items.push({ descriptionAr: 'توافق مقاس المروحة مع الإطار', isCompatible: r.isCompatible, reasonAr: r.reasonAr });
  }

  const passedCount = items.filter(i => i.isCompatible).length;
  const scorePercent = items.length === 0 ? 0 : Math.round((passedCount / items.length) * 100);

  return { items, scorePercent };
}
