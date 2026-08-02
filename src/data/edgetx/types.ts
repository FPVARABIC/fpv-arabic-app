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
 * THE RULE THAT SHAPES EVERY FIELD
 * --------------------------------
 * Explaining a menu is not the deliverable. Every setting has to answer: what
 * does it actually change in the aircraft, when would you touch it, what breaks
 * if you get it wrong, how do you verify it worked, and how do you undo it.
 * A reference that only translates menu labels leaves the reader exactly where
 * they started, in Arabic instead of English.
 *
 * ON VERSIONS
 * -----------
 * EdgeTX menus move between releases. Nothing here states a menu path as if it
 * were permanent: `whereAr` describes the route AND the version it was checked
 * against, and `versionNoteAr` carries what is known to differ. Where we do not
 * know, we say the official documentation for the reader's own version is the
 * authority — we never invent a path.
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

/** One screen or one coherent task in EdgeTX. */
export interface EdgeTxPage {
  id: string;
  titleAr: string;
  titleEn: string;
  /** One line: what this screen is for. */
  summaryAr: string;
  /** Menu route, with the version it was checked against. */
  whereAr: string;
  level: EdgeTxLevel;
  risk: EdgeTxRisk;
  /** What a reader should already have done. */
  prerequisitesAr: string[];
  groups: EdgeTxGroup[];
  /** Ordered procedure, when the page is a task rather than a settings list. */
  stepsAr?: { textAr: string; noteAr?: string; risk?: EdgeTxRisk }[];
  /** Symptom → what to check, for problems specific to this screen. */
  troubleshootingAr?: { symptomAr: string; checkAr: string }[];
  /** What the reader must take from official documentation, not from us. */
  manualRequiredAr: string[];
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
