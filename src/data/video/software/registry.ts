/**
 * The video software centre's lookup surface.
 *
 * Same contract as the EdgeTX registry: views never import a page file, never
 * build a route by hand, and never guess whether a page exists. Everything goes
 * through here, so adding a page is one import and one array entry.
 */

import type { VideoToolPage, VideoToolSection } from './types';
import { BETAFLIGHT_VIDEO_PAGES } from './pages/betaflight';
import { VENDOR_TOOL_PAGES } from './pages/vendorTools';
import { ECOSYSTEM_TOOL_PAGES, MEDIA_TOOL_PAGES } from './pages/ecosystems';

export const allVideoToolPages: VideoToolPage[] = [
  ...BETAFLIGHT_VIDEO_PAGES,
  ...VENDOR_TOOL_PAGES,
  ...ECOSYSTEM_TOOL_PAGES,
  ...MEDIA_TOOL_PAGES,
];

const byId = new Map(allVideoToolPages.map(p => [p.id, p]));

export function getVideoToolPage(id: string): VideoToolPage | undefined {
  return byId.get(id);
}

export function videoToolPageExists(id: string): boolean {
  return byId.has(id);
}

/**
 * How the centre is presented.
 *
 * Ordered by when a reader needs it, not by which product it belongs to. Someone
 * arriving here is either setting up (first two sections), updating (third), or
 * broken (fourth) — and grouping by vendor would scatter each of those journeys
 * across four boxes.
 */
export const videoToolSections: VideoToolSection[] = [
  {
    id: 'betaflight',
    titleAr: 'إعداد الفيديو في متحكم الطيران',
    descriptionAr:
      'المنافذ وجدول القنوات وطبقة المعلومات والتحكم بالكاميرا — الترتيب الذي تُفعَل به، لا وصف '
      + 'كل حقل. وصف الحقول في مرجع Betaflight نفسه، وكل صفحة هنا تحيل إليه.',
    pageIds: ['bf-ports-video', 'bf-vtx-tables', 'bf-osd-analog', 'bf-osd-digital', 'bf-camera-control'],
  },
  {
    id: 'ecosystems',
    titleAr: 'المنظومات الرقمية: شكل الأدوات',
    descriptionAr:
      'ما يخصّ كل منظومة فعلاً — طريق التحديث، وحدود المنظومة المغلقة، وأي أسئلة لا يجيب عنها '
      + 'إلا صانعها. الإجراءات المشتركة ليست هنا لأنها مشتركة.',
    pageIds: ['dji-tools', 'walksnail-tools', 'hdzero-tools'],
  },
  {
    id: 'update',
    titleAr: 'الأدوات والتحديث',
    descriptionAr:
      'من التثبيت إلى النسخة إلى التحديث إلى الاقتران — الترتيب الذي يحمي جهازك. الخطوات هنا '
      + 'مشتركة بين المنظومات لأن منطقها واحد؛ ما يخصّ منظومتك في قسمها.',
    pageIds: ['tool-install', 'tool-backup', 'tool-version-compat', 'tool-firmware-update', 'tool-binding', 'tool-sd-card'],
  },
  {
    id: 'recovery',
    titleAr: 'حين يسوء شيء',
    descriptionAr:
      'الجهاز لا يظهر، أو توقف التحديث في منتصفه، أو تحتاج استرجاعاً. ابدأ من هنا ولا تعِد '
      + 'المحاولة قبل أن تقرأ.',
    pageIds: ['tool-device-detect', 'tool-update-failure', 'tool-restore', 'tool-logs'],
  },
];

/**
 * The searchable index of the centre.
 *
 * One entry per page plus its bot symptoms, so a search for «التحديث توقف» or
 * «الاداة ما تشوف الجهاز» lands on the page rather than on nothing.
 */
export interface VideoToolIndexEntry {
  pageId: string;
  titleAr: string;
  termAr: string;
}

export function videoToolIndex(): VideoToolIndexEntry[] {
  const out: VideoToolIndexEntry[] = [];
  for (const p of allVideoToolPages) {
    out.push({ pageId: p.id, titleAr: p.titleAr, termAr: p.titleAr });
    out.push({ pageId: p.id, titleAr: p.titleAr, termAr: p.titleEn });
    for (const s of p.bot?.symptomsAr ?? []) {
      out.push({ pageId: p.id, titleAr: p.titleAr, termAr: s });
    }
    for (const m of p.bot?.misspellingsAr ?? []) {
      out.push({ pageId: p.id, titleAr: p.titleAr, termAr: m });
    }
  }
  return out;
}
