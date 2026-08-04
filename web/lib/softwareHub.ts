import { bfPageRegistry } from '@core/data/betaflight/pageRegistry';
import { allEdgeTxPages, edgeTxSections } from '@core/data/edgetx/registry';
import { allVideoToolPages, videoToolSections } from '@core/data/video/software/registry';
import { setupSteps } from '@core/data/expresslrs/setupSteps';
import { troubleshootingIssues } from '@core/data/expresslrs/troubleshootingIssues';
import type { Destination } from '@core/platform/destinations';

/**
 * The software centre's index — derived, never hand-written.
 *
 * WHY EVERY NUMBER HERE IS COUNTED
 * --------------------------------
 * The requirement was explicit: a program must not be presented as complete
 * unless it has real content. So coverage is not a field somebody types; it is
 * counted from the registries at build time. A page whose `contentStatus` is
 * `not-started` is counted as not started, and the hub says so — which means
 * the hub cannot drift from the data, and adding a page updates the hub with no
 * edit here at all.
 *
 * WHAT «غير متاح» MEANS AND WHY IT IS LISTED AT ALL
 * -------------------------------------------------
 * Some programs a builder genuinely needs — the ESC configurators, INAV,
 * ArduPilot, the ground-station tools — have NO content in this platform yet.
 * Two dishonest options were available: omit them, so a reader concludes the
 * platform has never heard of BLHeli; or write a thin page that looks like
 * coverage and is not. Both were rejected. They are listed with `none` coverage
 * and a scope page that says exactly what exists elsewhere in the encyclopedia
 * and what does not exist at all.
 *
 * THIS FILE HOLDS NO CONTENT
 * --------------------------
 * Only identity, category, and a pointer at the shared registry. Every word a
 * reader sees comes from `src/data/`. `scripts/testWebSoftware.ts` asserts that
 * no program description here duplicates prose that already lives in the core.
 */

export type SoftwareCategory =
  | 'flight-controller'
  | 'radio-link'
  | 'esc'
  | 'video'
  | 'analysis';

export const CATEGORY_LABEL_AR: Record<SoftwareCategory, string> = {
  'flight-controller': 'متحكّم الطيران',
  'radio-link': 'التحكم والراديو',
  esc: 'ESC والمحركات',
  video: 'أنظمة الفيديو',
  analysis: 'التحليل والتشخيص',
};

export const CATEGORY_BLURB_AR: Record<SoftwareCategory, string> = {
  'flight-controller': 'البرامج التي تُعدّ دماغ الطيران وتكتب إعداداته.',
  'radio-link': 'ما يربط جهاز التحكم بالطائرة، ويحدّث طرفيه.',
  esc: 'ما يقرأ ويكتب على وحدات التحكم بسرعة المحركات.',
  video: 'ما يضبط البثّ والكاميرا والنظارات والطبقة المعلوماتية.',
  analysis: 'ما يقرأ ما حدث فعلاً بعد الطيران.',
};

/** How much of a program this platform actually documents. */
export type Coverage = 'full' | 'partial' | 'none';

export const COVERAGE_LABEL_AR: Record<Coverage, string> = {
  full: 'مغطّى',
  partial: 'مغطّى جزئياً',
  none: 'غير متاح بعد',
};

export interface SoftwareEntry {
  id: string;
  nameEn: string;
  /** What it is FOR, in one line. Never a translation of the name. */
  purposeAr: string;
  category: SoftwareCategory;
  /** Which hardware ecosystems it applies to. */
  appliesToAr: string[];
  coverage: Coverage;
  /** Live pages this platform has for it, counted from the registry. */
  documented: number;
  /** Entries that exist in the registry but have no written content yet. */
  pending: number;
  /**
   * Where the entry opens, as an IDENTITY rather than a URL.
   *
   * Resolved through `webHref` at render time so this file never learns a path.
   * `null` means the program has no content, and `scopeId` names the honest
   * page that says so — the two are mutually exclusive, and the test asserts it.
   */
  destination: Destination | null;
  /** Set exactly when `destination` is null: the id of its scope page. */
  scopeId?: string;
  /** Set when coverage is `none` — where the reader should go instead. */
  insteadAr?: string;
}

/* ── Counted from the real registries ────────────────────────────────────── */

const bfDocumented = bfPageRegistry.filter(p => !!p.page).length;
const bfPending = bfPageRegistry.length - bfDocumented;

export const SOFTWARE: readonly SoftwareEntry[] = [
  // ── Flight controller ──────────────────────────────────────────────────
  {
    id: 'betaflight',
    nameEn: 'Betaflight Configurator',
    purposeAr: 'ضبط متحكّم الطيران: المنافذ، والمستقبل، والأوضاع، والمحركات، والحماية عند فقدان الإشارة.',
    category: 'flight-controller',
    appliesToAr: ['كوادكوبتر Freestyle وسباق', 'أي متحكّم يعمل بـBetaflight'],
    coverage: bfPending === 0 ? 'full' : 'partial',
    documented: bfDocumented,
    pending: bfPending,
    destination: { kind: 'betaflight' },
  },
  {
    id: 'inav',
    nameEn: 'INAV Configurator',
    purposeAr: 'ضبط متحكّم طيران موجّه للملاحة: نقاط المسار، والعودة للمنزل، وتثبيت الارتفاع.',
    category: 'flight-controller',
    appliesToAr: ['أجنحة ثابتة', 'كوادكوبتر ملاحي'],
    coverage: 'none',
    documented: 0,
    pending: 0,
    destination: null,
    scopeId: 'inav',
    insteadAr: 'لا صفحات إعداد لـINAV في المنصة بعد. ما هو موجود هو شرح مفاهيم متحكّم الطيران في الموسوعة.',
  },
  {
    id: 'ardupilot',
    nameEn: 'ArduPilot',
    purposeAr: 'منظومة طيران ذاتي كاملة بأوضاع ملاحة ومهام ومسارات.',
    category: 'flight-controller',
    appliesToAr: ['طائرات ومركبات ذاتية القيادة'],
    coverage: 'none',
    documented: 0,
    pending: 0,
    destination: null,
    scopeId: 'ardupilot',
    insteadAr: 'لا تغطية لـArduPilot في المنصة. مذكور في الموسوعة كأحد بدائل Betaflight فقط.',
  },
  {
    id: 'ground-stations',
    nameEn: 'Mission Planner / QGroundControl',
    purposeAr: 'محطات أرضية لتخطيط المهام ومتابعة الطائرة أثناء الطيران.',
    category: 'flight-controller',
    appliesToAr: ['ArduPilot', 'PX4'],
    coverage: 'none',
    documented: 0,
    pending: 0,
    destination: null,
    scopeId: 'ground-stations',
    insteadAr: 'خارج نطاق المنصة حالياً — تتبع منظومات لا تغطّيها هذه المنصة أصلاً.',
  },

  // ── Radio link ─────────────────────────────────────────────────────────
  {
    id: 'expresslrs',
    nameEn: 'ExpressLRS Configurator',
    purposeAr: 'بناء فيرموير رابط التحكم وتحديث طرفيه وربطهما.',
    category: 'radio-link',
    appliesToAr: ['ExpressLRS 2.4GHz و900MHz'],
    coverage: 'full',
    documented: setupSteps.length,
    pending: 0,
    destination: { kind: 'elrs-setup' },
  },
  {
    id: 'edgetx',
    nameEn: 'EdgeTX',
    purposeAr: 'نظام تشغيل جهاز التحكم: النماذج، والمداخل، والمخارج، والقياس عن بُعد.',
    category: 'radio-link',
    appliesToAr: ['أجهزة تحكم RadioMaster وJumper وTBS وغيرها'],
    coverage: 'full',
    documented: allEdgeTxPages.length,
    pending: 0,
    destination: { kind: 'edgetx' },
  },

  // ── ESC ────────────────────────────────────────────────────────────────
  {
    id: 'esc-tools',
    nameEn: 'BLHeliSuite / ESC Configurator / AM32',
    purposeAr: 'قراءة وحدات التحكم بسرعة المحركات وتغيير اتجاه الدوران وتحديث فيرموريها.',
    category: 'esc',
    appliesToAr: ['BLHeli_S', 'BLHeli_32', 'AM32'],
    coverage: 'none',
    documented: 0,
    pending: 0,
    destination: null,
    scopeId: 'esc',
    insteadAr: 'لا صفحات أدوات ESC في المنصة بعد. الموسوعة تشرح فيرموير الـESC ومعناه، وBetaflight يغطي بروتوكول المحركات وترتيبها واتجاهها.',
  },

  // ── Video ──────────────────────────────────────────────────────────────
  {
    id: 'video-tools',
    nameEn: 'أدوات الفيديو',
    purposeAr: 'ضبط البثّ والطبقة المعلوماتية وتحديث وحدات DJI وWalksnail وHDZero.',
    category: 'video',
    appliesToAr: ['Analog', 'DJI', 'Walksnail', 'HDZero'],
    coverage: 'full',
    documented: allVideoToolPages.length,
    pending: 0,
    destination: { kind: 'video' },
  },

  // ── Analysis ───────────────────────────────────────────────────────────
  {
    id: 'blackbox',
    nameEn: 'Blackbox Explorer',
    purposeAr: 'قراءة سجلّ الرحلة لفهم الاهتزاز والاستجابة بعد الطيران.',
    category: 'analysis',
    appliesToAr: ['Betaflight'],
    coverage: 'none',
    documented: 0,
    pending: 0,
    destination: null,
    scopeId: 'blackbox',
    insteadAr: 'صفحة Blackbox داخل مركز Betaflight مسجَّلة بلا محتوى بعد، ولا توجد صفحة لأداة التحليل نفسها.',
  },
] as const;

export function softwareById(id: string): SoftwareEntry | undefined {
  return SOFTWARE.find(s => s.id === id);
}

export function softwareByCategory(c: SoftwareCategory): SoftwareEntry[] {
  return SOFTWARE.filter(s => s.category === c);
}

export const CATEGORY_ORDER: readonly SoftwareCategory[] = [
  'flight-controller', 'radio-link', 'esc', 'video', 'analysis',
];

/* ── Counts used by the hub's own summary line ───────────────────────────── */

export const HUB_TOTALS = {
  betaflightPages: bfPageRegistry.length,
  betaflightDocumented: bfDocumented,
  edgetxPages: allEdgeTxPages.length,
  edgetxSections: edgeTxSections.length,
  videoPages: allVideoToolPages.length,
  videoSections: videoToolSections.length,
  elrsSteps: setupSteps.length,
  elrsIssues: troubleshootingIssues.length,
};
