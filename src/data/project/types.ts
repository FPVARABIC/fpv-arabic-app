/**
 * The project layer — the platform's spine.
 *
 * WHY THIS EXISTS
 * ---------------
 * The app already had a project object: `fpv-assembly-project-v1`, written by
 * the Assembly section. It was well built (ids only, rehydrated against the
 * live catalogue) but it was *locked inside one screen*. Nothing else in the
 * app could answer "what is this user actually building?", so every other
 * surface — encyclopedia, software, diagnostics — could only ever speak in
 * generalities.
 *
 * This layer does NOT introduce a second project object. It promotes the
 * existing one to a platform-level concept that any surface may read. The
 * Assembly section remains its only writer; everything else consumes.
 *
 * WHY VERDICTS INSTEAD OF A COMPATIBILITY SCORE
 * ---------------------------------------------
 * The previous report produced `scorePercent`. A percentage is precisely the
 * wrong output for this problem: it averages away the one blocker that will
 * burn hardware, and it says nothing about *why*. Worse, it treats "we
 * checked and it is fine" and "we have no data to check with" as the same
 * thing — so silence about a missing spec reads as approval.
 *
 * A `Finding` therefore carries what the product spec demands of every
 * judgement: the claim, the reasoning, the evidence it rests on, how
 * confident we are, what data is missing, and when the manufacturer's manual
 * must be consulted instead of us.
 */

import type {
  BasePart, Frame, Motor, Esc, Battery, Propeller,
  FlightController, Receiver, VideoUnit, Gps,
} from '../assembly/types';

/** What the user is building, resolved against the live part catalogue. */
export interface ProjectSnapshot {
  /** True when the user has started a build at all. */
  exists: boolean;
  droneTypeId?: string;
  droneTypeName?: string;
  /** Frame size in inches chosen at the size stage. */
  sizeInch?: number;
  /** Battery cell count chosen at the size stage — the project's design voltage. */
  cellCount?: number;
  /** How far through the build stages the user has reached. */
  stageIndex: number;
  totalStages: number;

  frame?: Frame;
  motor?: Motor;
  esc?: Esc;
  flightController?: FlightController;
  battery?: Battery;
  propeller?: Propeller;
  receiver?: Receiver;
  videoUnit?: VideoUnit;
  gps?: Gps;
  /** Everything selected, including categories without a dedicated field. */
  parts: Record<string, BasePart>;
}

/**
 * Severity ordering matters: `blocker` is not "a worse warning", it is a
 * different kind of statement — it means proceeding damages hardware or
 * cannot work at all.
 */
export type FindingSeverity = 'blocker' | 'warning' | 'unknown' | 'ok';

export const SEVERITY_ORDER: FindingSeverity[] = ['blocker', 'warning', 'unknown', 'ok'];

export const SEVERITY_LABEL_AR: Record<FindingSeverity, string> = {
  blocker: 'مانع',
  warning: 'تحذير',
  unknown: 'بيانات ناقصة',
  ok: 'تم التحقق',
};

/**
 * How much weight the verdict carries.
 *
 * `typed-spec` means we compared two documented numbers from the catalogue and
 * the comparison is arithmetic. `derived` means we reasoned from those numbers
 * rather than compared them directly. `manual-required` means the answer
 * genuinely lives in the manufacturer's documentation and we will not guess it.
 */
export type FindingConfidence = 'typed-spec' | 'derived' | 'manual-required';

export const CONFIDENCE_LABEL_AR: Record<FindingConfidence, string> = {
  'typed-spec': 'مقارنة مباشرة بين مواصفتين موثّقتين',
  derived: 'استنتاج من المواصفات — ليس قياساً',
  'manual-required': 'يحتاج دليل الشركة — لا نخمّنه',
};

export interface Finding {
  id: string;
  severity: FindingSeverity;
  confidence: FindingConfidence;
  /** The verdict in one sentence. */
  claimAr: string;
  /** WHY — the reasoning, never just a restatement of the claim. */
  whyAr: string;
  /** Which spec fields, on which parts, this rests on. Empty when nothing was comparable. */
  evidenceAr: string[];
  /** What the user should do about it. Empty for `ok`. */
  actionsAr: string[];
  /** Data we do not have and would need. Empty when nothing is missing. */
  missingAr: string[];
  /** Set when the honest answer is "read your manufacturer's manual". */
  manualCheckAr?: string;
  /** Where to learn more — resolved through the KB registry, never a literal path. */
  links: { kind: 'article' | 'dx' | 'betaflight' | 'glossary'; targetId: string; label: string }[];
}

/** A single, unambiguous "do this now". */
export interface NextStep {
  /** Why this and not something else. */
  reasonAr: string;
  titleAr: string;
  /** Route to act on it. */
  route: string;
  ctaAr: string;
  /** True when a blocker must be cleared before building further. */
  isBlocked: boolean;
}
