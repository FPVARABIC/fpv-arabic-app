/**
 * The video software centre — the tools, not the theory.
 *
 * WHY A THIRD PAGE SHAPE
 * ----------------------
 * A KB article explains a concept. A Betaflight page explains one configurator
 * screen. Neither covers "install the manufacturer's tool, get it to see the
 * device, back up, update both ends, and recover when it dies halfway" — which
 * is a procedure that crosses two devices, one cable, one desktop application
 * and one SD card, and which fails in ways no settings page can describe.
 *
 * The shape is deliberately parallel to `EdgeTxPage`: same eleven dimensions,
 * same refusal to ship a half-written topic, same rule that a `problem` page
 * either names the entry that owns the diagnosis or states why it owns it.
 * What differs is what a video tool page must additionally carry: which
 * ecosystem it applies to, and what the tool is — a question EdgeTX never has
 * to ask because there is only ever one radio firmware in front of the reader.
 *
 * THE RULE THAT SHAPES EVERY PAGE: NO INVENTED TOOLS, NO INVENTED STEPS
 * ---------------------------------------------------------------------
 * Manufacturers rename their desktop applications, move their download pages,
 * change which device is updated by which route, and change it per generation.
 * A page that states «افتح البرنامج الفلاني ثم اضغط الزر الفلاني» is right for
 * one reader on one generation and wrong for the next — and being wrong here
 * means a device left half-flashed.
 *
 * So `toolAr` names the tool BY FUNCTION and says where its real identity lives.
 * Where a name is genuinely stable and documented it appears with its source and
 * a version note; where it is not, `manualRequiredAr` carries it as declared
 * missing data rather than a guess. This is the same discipline the EdgeTX
 * centre applies to menu paths, applied to a harder case.
 *
 * WHY `projectFields` IS ON THE PAGE
 * ----------------------------------
 * The EdgeTX and ExpressLRS maps live in `data/project/context.ts` because those
 * page sets and that mapping were written at different times by different
 * concerns. This one is authored as a single dataset against a single record,
 * and there is no second consumer to keep in sync — so the mapping lives beside
 * the page that uses it, where an author editing the page can see it.
 */

import type { KbBotMeta, KbLink, KbSource } from '../../kb/types';
import type { VideoSetup } from '../../project/videoSetup';
import type { VideoEcosystem } from '../types';

/** How dangerous getting this wrong is. Drives the visible warning. */
export type VideoToolRisk = 'info' | 'caution' | 'warning' | 'critical';

export const VIDEO_TOOL_RISK_LABEL_AR: Record<VideoToolRisk, string> = {
  info: 'معلومة',
  caution: 'انتبه',
  warning: 'تحذير',
  critical: 'حرج',
};

export type VideoToolLevel = 'beginner' | 'intermediate' | 'advanced';

export const VIDEO_TOOL_LEVEL_LABEL_AR: Record<VideoToolLevel, string> = {
  beginner: 'مبتدئ',
  intermediate: 'متوسط',
  advanced: 'متقدم',
};

/**
 *   reference — something to understand before acting
 *   task      — an ordered procedure with a beginning and an end
 *   problem   — a symptom, covered from the software side only
 */
export type VideoToolKind = 'reference' | 'task' | 'problem';

export const VIDEO_TOOL_KIND_LABEL_AR: Record<VideoToolKind, string> = {
  reference: 'مرجع',
  task: 'إجراء',
  problem: 'عطل',
};

/**
 * Which systems a page applies to.
 *
 * `all` is a real answer, not a cop-out: backing up before an update and
 * refusing to disconnect mid-flash are true of every ecosystem, and writing
 * four near-identical pages to say so would be the duplication the platform
 * exists to avoid. Pages that ARE ecosystem-specific say so and cover only what
 * genuinely differs.
 */
export type VideoToolScope = VideoEcosystem | 'all' | 'betaflight';

export const VIDEO_TOOL_SCOPE_LABEL_AR: Record<VideoToolScope, string> = {
  all: 'كل الأنظمة',
  betaflight: 'Betaflight',
  'analog-58': 'النظام التماثلي',
  dji: 'DJI',
  walksnail: 'Walksnail',
  hdzero: 'HDZero',
  other: 'أنظمة أخرى',
};

export interface VideoToolStep {
  textAr: string;
  noteAr?: string;
  risk?: VideoToolRisk;
}

export interface VideoToolPage {
  id: string;
  titleAr: string;
  titleEn: string;
  kind: VideoToolKind;
  scope: VideoToolScope;
  /** الغرض — one line: what this page is for. */
  summaryAr: string;
  /** متى يحتاجه المستخدم. */
  whenNeededAr: string;
  /**
   * What software does this job — named by function, plus whatever is genuinely
   * documented. Never a fabricated application name or download URL.
   */
  toolAr: string;
  level: VideoToolLevel;
  risk: VideoToolRisk;
  prerequisitesAr: string[];
  /** الخطوات المفهومية — the procedure in principle, not by button label. */
  stepsAr: VideoToolStep[];
  /** علاقته بالمشروع وبمتحكم الطيران وبباقي المنظومة. */
  relationAr: string[];
  commonMistakesAr: string[];
  /** طريقة التحقق — observations, not feelings. */
  verifyAr: string[];
  /** طريقة التراجع. */
  revertAr: string;
  versionNotesAr: string[];
  /** البيانات الناقصة — what only the manufacturer's own page can answer. */
  manualRequiredAr: string[];
  /** Which recorded video facts this page is about. */
  projectFields: (keyof VideoSetup)[];
  /** For `problem` pages: the one entry that owns the full diagnosis. */
  canonicalDiagnosis?: KbLink;
  /** The other half of the rule: why this page legitimately owns the symptom. */
  ownsDiagnosis?: { reasonAr: string };
  links: KbLink[];
  sources: KbSource[];
  lastReviewed: string;
  bot?: KbBotMeta;
}

export interface VideoToolSection {
  id: string;
  titleAr: string;
  descriptionAr: string;
  pageIds: string[];
}
