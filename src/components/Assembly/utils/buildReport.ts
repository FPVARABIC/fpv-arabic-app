/**
 * The assembly section's final report — now a THIN ADAPTER over the platform's
 * one verdict engine (`data/project/verdicts.ts`), not a second engine.
 *
 * Why it changed: the same two parts were being judged in two places. The
 * assembly report ran four booleans from `compatibility/validators.ts`; the
 * «مشروعي» workspace ran ten rules with reasoning and evidence. Nothing forced
 * them to agree, and a user who reads «كل القطع متوافقة» here and a warning
 * there has no way to know which screen to believe. One engine removes the
 * question entirely.
 *
 * What is preserved: `items` and `scorePercent` keep their existing shape and
 * meaning, so `FinalReportScreen` keeps working exactly as before. The four
 * validators are still the underlying booleans for the four rules they cover —
 * the verdict engine calls them.
 *
 * What is added, and why it matters: `openQuestions` carries the findings the
 * engine deliberately refuses to decide (current headroom has no honest answer
 * without the manufacturer's thrust table). Those are NOT counted in the score,
 * because scoring them either way would be a lie: as a pass it invents an
 * approval, as a failure it invents a fault. They are surfaced separately
 * instead, which is the whole point — silence would read as approval.
 */

import type {
  Frame, Motor, Esc, Battery, Propeller,
  FlightController, Receiver, VideoUnit, Gps, BasePart,
} from '../../../data/assembly/types';
import { buildStages } from '../../../data/assembly/buildStages';
import { computeFindings } from '../../../data/project/verdicts';
import type { Finding, ProjectSnapshot } from '../../../data/project/types';

export interface BuildReportItem {
  descriptionAr: string;
  isCompatible: boolean;
  reasonAr?: string;
}

export interface BuildReport {
  items: BuildReportItem[];
  scorePercent: number;
  /** Checks the engine refuses to decide — shown, never scored. */
  openQuestions: Finding[];
  /** The full engine output, for callers that want the reasoning too. */
  findings: Finding[];
}

export interface ReportableSelections {
  frame?: Frame;
  motor?: Motor;
  esc?: Esc;
  battery?: Battery;
  propeller?: Propeller;
  flightController?: FlightController;
  receiver?: Receiver;
  videoUnit?: VideoUnit;
  gps?: Gps;
  /** The design voltage picked at the size stage, when the caller knows it. */
  cellCount?: number;
}

/**
 * Selection field → catalogue category key, so `snapshot.parts` is keyed the
 * same way `assemblyPersistence` keys it and the two snapshots stay one shape.
 */
const CATEGORY_OF: Record<string, string> = {
  frame: 'frames',
  motor: 'motors',
  esc: 'escs',
  battery: 'batteries',
  propeller: 'propellers',
  flightController: 'flightControllers',
  receiver: 'receivers',
  videoUnit: 'videoUnits',
  gps: 'gps',
};

export function buildCompatibilityReport(selections: ReportableSelections): BuildReport {
  const parts: Record<string, BasePart> = {};
  for (const [key, value] of Object.entries(selections)) {
    const category = CATEGORY_OF[key];
    if (category && value && typeof value === 'object') parts[category] = value as BasePart;
  }

  const snapshot: ProjectSnapshot = {
    exists: true,
    stageIndex: buildStages.length - 1,
    totalStages: buildStages.length,
    parts,
    ...selections,
  };

  const findings = computeFindings(snapshot);

  // A verdict we could not reach is not a verdict. Keeping unknowns out of the
  // percentage is what stops the number from quietly absorbing them.
  const decided = findings.filter(f => f.severity !== 'unknown');
  const openQuestions = findings.filter(f => f.severity === 'unknown');

  const items: BuildReportItem[] = decided.map(f => ({
    descriptionAr: f.claimAr,
    isCompatible: f.severity === 'ok',
    // A passing check needs no explanation in a summary screen; a failing one
    // is useless without it, so the engine's reasoning is carried through.
    reasonAr: f.severity === 'ok' ? undefined : f.whyAr,
  }));

  const passedCount = items.filter(i => i.isCompatible).length;
  const scorePercent = items.length === 0 ? 0 : Math.round((passedCount / items.length) * 100);

  return { items, scorePercent, openQuestions, findings };
}
