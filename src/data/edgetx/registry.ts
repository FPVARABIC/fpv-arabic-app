/**
 * The EdgeTX centre's registry.
 *
 * WHY A REGISTRY AND NOT A FLAT ARRAY
 * -----------------------------------
 * Three consumers need three different views of the same thirty topics: the hub
 * needs them grouped into sections a human can scan, the search box needs them
 * flattened down to individual SETTINGS (a reader looking for «Subtrim» should
 * not have to know it lives inside the Outputs screen), and the destination
 * resolver needs a cheap existence check. All three are derived here from one
 * declaration so they cannot drift apart.
 *
 * WHY `EDGETX_REQUIRED_TOPICS` EXISTS
 * -----------------------------------
 * The scope of this centre was given as an explicit list of topics, not as a
 * page count. Recording that list AS DATA — each entry naming the page that
 * covers it — turns "did we cover everything?" into an assertion in
 * `scripts/testEdgeTx.ts` rather than a promise in a report. Two required
 * topics deliberately map to the same page (choosing the internal module and
 * setting it up are one screen, not two), and the list says so out loud instead
 * of padding the page count to match.
 *
 * NO REACT HERE
 * -------------
 * This module and everything it imports are plain data. The same registry runs
 * in the phone app, in the test scripts under Node, and in whatever renders the
 * web app later.
 */

import type { EdgeTxPage, EdgeTxSection } from './types';

import {
  edgeTxModelSetup, edgeTxInternalModule, edgeTxExternalModule,
  edgeTxRfSystem, edgeTxCrsf, edgeTxChannelRange,
} from './pages/model';
import {
  edgeTxInputs, edgeTxMixes, edgeTxOutputs,
  edgeTxSwitches, edgeTxLogicalSwitches, edgeTxSpecialFunctions,
} from './pages/control';
import {
  edgeTxTelemetrySensors, edgeTxDiscoverSensors, edgeTxLuaScripts,
  edgeTxModelMatch, edgeTxFailsafe, edgeTxTrainer,
} from './pages/link';
import {
  edgeTxFirmwareUpdate, edgeTxSdCard, edgeTxBackup,
  edgeTxRestore, edgeTxGimbalCalibration, edgeTxSimulator,
} from './pages/maintenance';
import {
  edgeTxProblemModuleMissing, edgeTxProblemLua, edgeTxProblemTelemetry,
  edgeTxProblemModelMatch, edgeTxProblemSdCard, edgeTxProblemFirmwareFiles,
} from './pages/problems';

export const allEdgeTxPages: EdgeTxPage[] = [
  edgeTxModelSetup, edgeTxInternalModule, edgeTxExternalModule,
  edgeTxRfSystem, edgeTxCrsf, edgeTxChannelRange,

  edgeTxInputs, edgeTxMixes, edgeTxOutputs,
  edgeTxSwitches, edgeTxLogicalSwitches, edgeTxSpecialFunctions,

  edgeTxTelemetrySensors, edgeTxDiscoverSensors, edgeTxModelMatch,
  edgeTxFailsafe, edgeTxLuaScripts, edgeTxTrainer,

  edgeTxFirmwareUpdate, edgeTxSdCard, edgeTxBackup,
  edgeTxRestore, edgeTxGimbalCalibration, edgeTxSimulator,

  edgeTxProblemModuleMissing, edgeTxProblemLua, edgeTxProblemTelemetry,
  edgeTxProblemModelMatch, edgeTxProblemSdCard, edgeTxProblemFirmwareFiles,
];

export const edgeTxSections: EdgeTxSection[] = [
  {
    id: 'model',
    titleAr: 'النموذج والوحدة الراديوية',
    descriptionAr: 'من إنشاء النموذج إلى أول ربط ناجح. هنا يُقرَّر هل يوجد رابط أصلاً.',
    pageIds: ['model-setup', 'internal-module', 'external-module', 'rf-system', 'crsf', 'channel-range'],
  },
  {
    id: 'control',
    titleAr: 'المدخلات والمزج والمخارج',
    descriptionAr: 'الطريق من العصا إلى القناة: قراءة، ثم مزج، ثم حدود. هذا الترتيب ثابت في كل إصدار.',
    pageIds: ['inputs', 'mixes', 'outputs', 'switches', 'logical-switches', 'special-functions'],
  },
  {
    id: 'link',
    titleAr: 'الرابط والتليمتري والسلامة',
    descriptionAr: 'ما يعود من الطائرة، وما يميّزها عن غيرها، وما يحدث حين ينقطع الاتصال.',
    pageIds: ['telemetry-sensors', 'discover-sensors', 'model-match', 'failsafe', 'lua-scripts', 'trainer'],
  },
  {
    id: 'maintenance',
    titleAr: 'الصيانة والملفات',
    descriptionAr: 'التحديث والنسخ والاستعادة والمعايرة. كل ما يبقي الجهاز صالحاً بعد سنة.',
    pageIds: ['firmware-update', 'sd-card', 'backup', 'restore', 'gimbal-calibration', 'simulator'],
  },
  {
    id: 'problems',
    titleAr: 'أعطال جهة الراديو',
    descriptionAr: 'أعراض تبدأ من الجهاز. كل عطل يقول صراحة أين يكمل إجراؤه الكامل.',
    pageIds: [
      'problem-module-missing', 'problem-lua', 'problem-telemetry',
      'problem-model-match', 'problem-sd-card', 'problem-firmware-files',
    ],
  },
];

const pageById = new Map(allEdgeTxPages.map(p => [p.id, p]));

export function edgeTxPage(id: string): EdgeTxPage | undefined {
  return pageById.get(id);
}

export function edgeTxPageExists(id: string): boolean {
  return pageById.has(id);
}

export function edgeTxSection(id: string): EdgeTxSection | undefined {
  return edgeTxSections.find(s => s.id === id);
}

/** The section a page belongs to, for breadcrumbs and «التالي في القسم». */
export function edgeTxSectionOfPage(pageId: string): EdgeTxSection | undefined {
  return edgeTxSections.find(s => s.pageIds.includes(pageId));
}

export const TOTAL_EDGETX_PAGES = allEdgeTxPages.length;

// ── The declared scope ────────────────────────────────────────────────────────

export interface EdgeTxRequiredTopic {
  /** Stable id for the requirement itself, independent of which page covers it. */
  id: string;
  labelAr: string;
  /** The page that covers it. */
  pageId: string;
  /** The setting inside that page, when the topic is narrower than the page. */
  settingId?: string;
  /** Why this topic shares a page with another required topic, where it does. */
  sharedNoteAr?: string;
}

/**
 * Every topic this centre was required to cover, and where it is covered.
 *
 * The two `sharedNoteAr` entries are the honest part: «اختيار Internal RF»
 * and «إعداد الوحدة الداخلية» are the same screen, and splitting them into two
 * pages would have inflated the count while making the reader open two places
 * for one job.
 */
export const EDGETX_REQUIRED_TOPICS: EdgeTxRequiredTopic[] = [
  { id: 'create-model', labelAr: 'إنشاء نموذج جديد', pageId: 'model-setup' },
  { id: 'internal-rf', labelAr: 'اختيار الوحدة الداخلية', pageId: 'internal-module', settingId: 'internal-state' },
  {
    id: 'internal-module-setup',
    labelAr: 'إعداد الوحدة الداخلية',
    pageId: 'internal-module',
    sharedNoteAr: 'اختيار الوحدة الداخلية وإعدادها شاشة واحدة على الجهاز، فوُثِّقا معاً بدل تفريق الإجراء على صفحتين.',
  },
  { id: 'external-rf', labelAr: 'اختيار الوحدة الخارجية', pageId: 'external-module', settingId: 'external-state' },
  {
    id: 'external-module-setup',
    labelAr: 'إعداد الوحدة الخارجية',
    pageId: 'external-module',
    sharedNoteAr: 'اختيار الوحدة الخارجية وإعدادها شاشة واحدة على الجهاز.',
  },
  { id: 'rf-system', labelAr: 'اختيار النظام الراديوي', pageId: 'rf-system' },
  { id: 'crsf', labelAr: 'CRSF', pageId: 'crsf' },
  { id: 'channel-range', labelAr: 'إعداد مدى القنوات', pageId: 'channel-range' },
  { id: 'inputs', labelAr: 'المدخلات', pageId: 'inputs' },
  { id: 'mixes', labelAr: 'المزج', pageId: 'mixes' },
  { id: 'outputs', labelAr: 'المخارج', pageId: 'outputs' },
  { id: 'switches', labelAr: 'المفاتيح', pageId: 'switches' },
  { id: 'logical-switches', labelAr: 'المفاتيح المنطقية', pageId: 'logical-switches' },
  { id: 'special-functions', labelAr: 'الوظائف الخاصة', pageId: 'special-functions' },
  { id: 'telemetry-sensors', labelAr: 'مستشعرات التليمتري', pageId: 'telemetry-sensors' },
  { id: 'discover-sensors', labelAr: 'اكتشاف مستشعرات جديدة', pageId: 'discover-sensors' },
  { id: 'lua-scripts', labelAr: 'النصوص البرمجية', pageId: 'lua-scripts' },
  { id: 'model-match', labelAr: 'مطابقة النموذج', pageId: 'model-match' },
  { id: 'failsafe', labelAr: 'سلوك فقد الإشارة', pageId: 'failsafe' },
  { id: 'firmware-update', labelAr: 'تحديث نظام التشغيل', pageId: 'firmware-update' },
  { id: 'sd-card', labelAr: 'محتويات بطاقة الذاكرة', pageId: 'sd-card' },
  { id: 'backup', labelAr: 'النسخ الاحتياطي', pageId: 'backup' },
  { id: 'restore', labelAr: 'الاستعادة', pageId: 'restore' },
  { id: 'gimbal-calibration', labelAr: 'معايرة العصي', pageId: 'gimbal-calibration' },
  { id: 'trainer', labelAr: 'وضع المدرّب', pageId: 'trainer' },
  { id: 'simulator', labelAr: 'الوصل بالمحاكي', pageId: 'simulator' },
  { id: 'problem-module-missing', labelAr: 'مشكلات عدم ظهور الوحدة', pageId: 'problem-module-missing' },
  { id: 'problem-lua', labelAr: 'مشكلات النصوص البرمجية', pageId: 'problem-lua' },
  { id: 'problem-telemetry', labelAr: 'مشكلات التليمتري', pageId: 'problem-telemetry' },
  { id: 'problem-model-match', labelAr: 'مشكلات مطابقة النموذج', pageId: 'problem-model-match' },
  { id: 'problem-sd-card', labelAr: 'مشكلات بطاقة الذاكرة', pageId: 'problem-sd-card' },
  { id: 'problem-firmware-files', labelAr: 'أخطاء نظام التشغيل وملفات الراديو', pageId: 'problem-firmware-files' },
];

// ── The flattened topic index, for search and for deep links ─────────────────

export interface EdgeTxTopicRef {
  /** `page` for the screen itself, `setting` for one row inside it. */
  kind: 'page' | 'setting';
  pageId: string;
  settingId?: string;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  /** Text a search should match against, already joined. */
  searchText: string;
}

/**
 * Every addressable topic, page-level and setting-level.
 *
 * Setting-level entries are what make `?topic=subtrim` a real destination: a
 * reader who searched for a field name lands on that field, not on a screen of
 * fourteen rows with no indication which one they wanted.
 */
export function edgeTxTopicIndex(): EdgeTxTopicRef[] {
  const out: EdgeTxTopicRef[] = [];
  for (const p of allEdgeTxPages) {
    out.push({
      kind: 'page',
      pageId: p.id,
      titleAr: p.titleAr,
      titleEn: p.titleEn,
      subtitleAr: p.summaryAr,
      searchText: [
        p.titleAr, p.titleEn, p.summaryAr, p.whenNeededAr,
        ...p.relationAr, ...p.commonMistakesAr, ...p.manualRequiredAr,
        ...(p.bot?.symptomsAr ?? []), ...(p.bot?.misspellingsAr ?? []),
        ...p.groups.flatMap(g => [g.titleAr, ...g.settings.map(s => `${s.labelAr} ${s.labelEn}`)]),
      ].join(' '),
    });
    for (const g of p.groups) {
      for (const s of g.settings) {
        out.push({
          kind: 'setting',
          pageId: p.id,
          settingId: s.id,
          titleAr: s.labelAr,
          titleEn: s.labelEn,
          subtitleAr: `${p.titleAr} › ${g.titleAr}`,
          searchText: [s.labelAr, s.labelEn, s.whatAr, s.effectAr, s.whenAr, s.riskAr ?? ''].join(' '),
        });
      }
    }
  }
  return out;
}

export const TOTAL_EDGETX_TOPICS = edgeTxTopicIndex().length;
