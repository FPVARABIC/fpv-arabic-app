/**
 * Sources for the video software centre.
 *
 * Two kinds appear here and the difference matters more than usual on this
 * subject:
 *
 *   `official-docs` / `manufacturer` — a real, citable page. Carries the version
 *      it was read at and the date it was reviewed, because both go stale.
 *
 *   `generalPrinciple: true` — something true of every system regardless of
 *      version: that a half-written flash leaves a device unusable, that a
 *      backup taken after a failure is worthless, that two ends of a digital
 *      link must agree. These never carry a version because they have none.
 *
 * `VENDOR_SUPPORT` is the important one. It is deliberately a source WITHOUT a
 * URL: the platform does not publish a download link for a manufacturer's
 * firmware tool, because such links move, get mirrored by third parties, and a
 * stale one sends someone to a file that will brick their unit. The page says
 * which support page to open — the reader's own model's — and stops there.
 */

import type { KbSource } from '../../kb/types';

/** The manufacturer's own support page for the reader's exact model. */
export const VENDOR_SUPPORT: KbSource = {
  title: 'صفحة الدعم الرسمية لطراز جهازك لدى شركته المصنّعة',
  version: 'تختلف حسب الطراز والجيل — افتح صفحة طرازك أنت',
  reviewedAt: '2026-08',
  kind: 'manufacturer',
};

/** Release notes, which are the only place version compatibility is stated. */
export const VENDOR_RELEASE_NOTES: KbSource = {
  title: 'ملاحظات الإصدار من الشركة المصنّعة',
  version: 'تُقرأ لكل إصدار على حدة',
  reviewedAt: '2026-08',
  kind: 'manufacturer',
};

export const BF_OSD_TAB: KbSource = {
  title: 'Betaflight — صفحة عرض المعلومات على الشاشة',
  url: 'https://betaflight.com/docs/wiki/configurator/osd-tab',
  version: 'Betaflight 4.5',
  reviewedAt: '2026-08',
  kind: 'official-docs',
};

export const BF_VTX_TAB: KbSource = {
  title: 'Betaflight — صفحة جهاز الفيديو',
  url: 'https://betaflight.com/docs/wiki/configurator/vtx-tab',
  version: 'Betaflight 4.5',
  reviewedAt: '2026-08',
  kind: 'official-docs',
};

export const BF_PORTS_TAB: KbSource = {
  title: 'Betaflight — صفحة المنافذ',
  url: 'https://betaflight.com/docs/wiki/configurator/ports-tab',
  version: 'Betaflight 4.5',
  reviewedAt: '2026-08',
  kind: 'official-docs',
};

export const BF_CLI: KbSource = {
  title: 'Betaflight — سطر الأوامر',
  url: 'https://betaflight.com/docs/wiki/configurator/cli-tab',
  version: 'Betaflight 4.5',
  reviewedAt: '2026-08',
  kind: 'official-docs',
};

/** Truths about updating firmware that hold for every device ever made. */
export const UPDATE_PRINCIPLE: KbSource = {
  title: 'مبادئ تحديث البرامج الثابتة: النسخة قبل التحديث، والقطع أثناءه',
  version: 'عام (غير مرتبط بإصدار)',
  reviewedAt: '2026-08',
  kind: 'engineering',
  generalPrinciple: true,
};

/** Truths about the video chain that hold regardless of which system it is. */
export const VIDEO_PRINCIPLE: KbSource = {
  title: 'مبادئ أنظمة الفيديو: سلسلة واحدة من الحسّاس إلى الشاشة',
  version: 'عام (غير مرتبط بإصدار)',
  reviewedAt: '2026-08',
  kind: 'engineering',
  generalPrinciple: true,
};

/**
 * The caveat every page in this centre carries in one form or another.
 *
 * Kept as a shared constant rather than retyped per page so it cannot drift
 * into a softer version of itself on the page where it matters most.
 */
export const TOOL_NAME_CAVEAT_AR =
  'أسماء برامج الشركات ومواضع أزرارها وصفحات تنزيلها تتغير بين الأجيال والإصدارات. '
  + 'هذه الصفحة تشرح الإجراء ومنطقه، ولا تذكر اسم زر ولا مساراً داخل برنامج لم نتحقق منه '
  + 'لطرازك أنت. الاسم الفعلي وخطواته الدقيقة في صفحة الدعم الرسمية لطرازك.';
