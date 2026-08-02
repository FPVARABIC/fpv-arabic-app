/**
 * EdgeTX — the radio's own firmware, as an applied reference.
 *
 * WHY A NEW SHAPE RATHER THAN A KB MODULE OR A COPY OF THE BETAFLIGHT MODEL
 * -------------------------------------------------------------------------
 * A KB article explains a concept; this has to explain a SCREEN — a place with
 * named menus, named fields, and a specific thing that happens when you change
 * one. That is the same job the Betaflight page model does, and the shape below
 * is deliberately parallel to it (a page holds groups, a group holds settings,
 * a setting states what it does and what changing it costs).
 *
 * It is not the Betaflight model itself because that model carries
 * Betaflight-specific concerns — connection state, firmware-version overlays
 * keyed to Betaflight releases, board-feature scoping — that would be dead
 * weight and misleading names here. Two products, one idea, two honest shapes.
 *
 * THE ELEVEN DIMENSIONS
 * ---------------------
 * Every page must answer the same eleven questions, and the type makes almost
 * all of them non-optional so a half-written topic cannot ship looking finished:
 *
 *   الغرض                summaryAr
 *   متى يحتاجه المستخدم   whenNeededAr
 *   الخطوات المفهومية      stepsAr
 *   علاقته بالمستقبل/ELRS/BF relationAr
 *   بيانات من المشروع      EDGETX_PAGE_RC_FIELDS (data/project/context.ts)
 *   البيانات الناقصة       manualRequiredAr
 *   الأخطاء الشائعة        commonMistakesAr
 *   طريقة التحقق          verifyAr
 *   طريقة التراجع          revertAr
 *   تحذيرات الإصدار        versionNotesAr
 *   مصدر رسمي             sources
 *
 * Explaining a menu is not the deliverable. A reference that only translates
 * menu labels leaves the reader exactly where they started, in Arabic instead
 * of English.
 *
 * ON VERSIONS
 * -----------
 * EdgeTX menus move between releases and between radio hardware. Nothing here
 * states a menu path as if it were permanent: `whereAr` describes the route AND
 * the version it was checked against, and `versionNotesAr` carries what is known
 * to differ. Where we do not know, the official documentation for the reader's
 * own version is the authority — we never invent a path.
 *
 * ON DUPLICATION
 * --------------
 * A `problem` page never re-diagnoses a symptom that already has a diagnostic
 * tree or an ExpressLRS issue. It covers the RADIO-side checks and then hands
 * over: `canonicalDiagnosis` names the one place that owns the full procedure,
 * and `scripts/testEdgeTx.ts` fails the build if a problem page lacks it.
 */

import type { KbBotMeta, KbLink, KbSource } from '../kb/types';

/** How dangerous getting this wrong is. Drives the visible warning. */
export type EdgeTxRisk = 'info' | 'caution' | 'warning' | 'critical';

export const EDGETX_RISK_LABEL_AR: Record<EdgeTxRisk, string> = {
  info: 'معلومة',
  caution: 'انتبه',
  warning: 'تحذير',
  critical: 'حرج',
};

/** Who the topic is for, so a beginner is not handed a mixer script. */
export type EdgeTxLevel = 'beginner' | 'intermediate' | 'advanced';

export const EDGETX_LEVEL_LABEL_AR: Record<EdgeTxLevel, string> = {
  beginner: 'مبتدئ',
  intermediate: 'متوسط',
  advanced: 'متقدم',
};

/**
 * What kind of topic this is.
 *
 *   reference — a screen with settings to understand
 *   task      — an ordered procedure with a beginning and an end
 *   problem   — a symptom, covered from the radio side only
 */
export type EdgeTxPageKind = 'reference' | 'task' | 'problem';

export const EDGETX_KIND_LABEL_AR: Record<EdgeTxPageKind, string> = {
  reference: 'مرجع',
  task: 'إجراء',
  problem: 'عطل',
};

/**
 * One configurable thing on a screen.
 *
 * `effectAr` is the field this model exists for: it says what the setting does
 * to the AIRCRAFT, not what it does to the menu.
 */
export interface EdgeTxSetting {
  id: string;
  labelAr: string;
  /** The label as it appears on the radio, in English. */
  labelEn: string;
  /** What it is, in one or two sentences. */
  whatAr: string;
  /** What it actually changes in the aircraft or the link. */
  effectAr: string;
  /** When a reader would genuinely need to touch it. */
  whenAr: string;
  /** What goes wrong if it is set wrong. */
  riskAr?: string;
  risk: EdgeTxRisk;
  /** How to confirm the change worked — an observation, not a feeling. */
  verifyAr?: string;
  /** How to undo it. */
  revertAr?: string;
  /** What differs between EdgeTX versions, when known. */
  versionNoteAr?: string;
  /** Facts we refuse to state because they belong to the reader's own radio. */
  manualCheckAr?: string;
}

/** A related run of settings inside one screen. */
export interface EdgeTxGroup {
  id: string;
  titleAr: string;
  introAr?: string;
  settings: EdgeTxSetting[];
}

/** One ordered move in a procedure. */
export interface EdgeTxStep {
  textAr: string;
  noteAr?: string;
  risk?: EdgeTxRisk;
}

/** One screen or one coherent task in EdgeTX. */
export interface EdgeTxPage {
  id: string;
  titleAr: string;
  titleEn: string;
  kind: EdgeTxPageKind;
  /** الغرض — one line: what this screen is for. */
  summaryAr: string;
  /** متى يحتاجه المستخدم. */
  whenNeededAr: string;
  /** Menu route, with the version it was checked against. */
  whereAr: string;
  level: EdgeTxLevel;
  risk: EdgeTxRisk;
  /** What a reader should already have done. */
  prerequisitesAr: string[];
  groups: EdgeTxGroup[];
  /** الخطوات المفهومية — the procedure, in principle rather than by menu label. */
  stepsAr: EdgeTxStep[];
  /** علاقته بالمستقبل وExpressLRS وBetaflight. */
  relationAr: string[];
  /** الأخطاء الشائعة. */
  commonMistakesAr: string[];
  /** طريقة التحقق — observations, not feelings. */
  verifyAr: string[];
  /** طريقة التراجع. */
  revertAr: string;
  /** تحذيرات الإصدار. */
  versionNotesAr: string[];
  /** Symptom → what to check, for problems specific to this screen. */
  troubleshootingAr?: { symptomAr: string; checkAr: string }[];
  /** البيانات الناقصة — what the reader must take from their own documentation. */
  manualRequiredAr: string[];
  /**
   * For `problem` pages: the one entry that owns the full diagnosis. This page
   * stops at the radio-side checks and hands over, so the platform never grows
   * two procedures for one symptom.
   */
  canonicalDiagnosis?: KbLink;
  /**
   * The other half of the same rule: set when NO other entry covers this
   * symptom and EdgeTX is legitimately its owner. Carrying the reason in the
   * data means a future author has to state why a new procedure is not a
   * duplicate, instead of quietly adding a second one.
   *
   * `scripts/testEdgeTx.ts` requires every `problem` page to declare exactly
   * one of the two.
   */
  ownsDiagnosis?: { reasonAr: string };
  links: KbLink[];
  sources: KbSource[];
  lastReviewed: string;
  /** Retrieval metadata, so this is reachable without editing anything else. */
  bot?: KbBotMeta;
}

export interface EdgeTxSection {
  id: string;
  titleAr: string;
  descriptionAr: string;
  pageIds: string[];
}
