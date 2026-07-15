import type { BfPage, BfField } from '../types';
import { makeConfiguratorSourceRef } from '../sourceHelpers';
import { BF_VERSION_CONTEXT } from '../sourceHelpers';

/**
 * Phase 4 — complete page.
 *
 * Verified against the cloned Configurator source (tag 2025.12.2):
 *   - src/tabs/adjustments.html (structure/order of every group and field)
 *   - src/js/tabs/adjustments.js (behavior: slot count is read live from
 *     the connected FC via MSP_ADJUSTMENT_RANGES, not user-add/removable;
 *     the enabled/disabled sentinel; the Save→EEPROM-write-only flow with
 *     no reboot call)
 *   - locales/en/messages.json (every English label below, including all
 *     32 real "adjustmentsFunctionN" values)
 *
 * A real, verified structural fact worth stating explicitly: the official
 * UI has NO "add slot" / "remove slot" button anywhere in adjustments.html
 * or adjustments.js. The number of adjustment rows shown is always exactly
 * `FC.ADJUSTMENT_RANGES.length` — a count reported by the connected flight
 * controller (MSP_ADJUSTMENT_RANGES), not something the user can grow or
 * shrink from the Configurator. Modeling this page with an "Add/Remove"
 * action would be inventing a control that does not exist in the real
 * source; it is deliberately absent here.
 *
 * A second real, verified structural fact: the "If enabled" checkbox is
 * not stored as its own separate boolean on the firmware side — a slot is
 * considered disabled precisely when its range `start === end` (both sent
 * as 900). Unchecking the box in the Configurator sets the slot back to
 * that {start: 900, end: 900} sentinel; checking it (when previously
 * disabled) resets the range to the default 1300–1700 window.
 */

const htmlSource = makeConfiguratorSourceRef({
  title: 'Betaflight App — Adjustments tab',
  repoPath: 'src/tabs/adjustments.html',
  applicability: 'universal',
  officialId: 'adjustments',
});

const jsSource = makeConfiguratorSourceRef({
  title: 'Betaflight App — Adjustments tab behavior',
  repoPath: 'src/js/tabs/adjustments.js',
  applicability: 'universal',
  officialId: 'adjustments',
});

const ADJUSTMENT_FUNCTIONS = [
  'No changes', 'RC Rate Adjustment', 'RC Expo Adjustment', 'Throttle Expo Adjustment',
  'Pitch & Roll Rate Adjustment', 'Yaw Rate Adjustment', 'Pitch & Roll P Adjustment', 'Pitch & Roll I Adjustment',
  'Pitch & Roll D Adjustment', 'Yaw P Adjustment', 'Yaw I Adjustment', 'Yaw D Adjustment',
  'Rate Profile Selection', 'Pitch Rate', 'Roll Rate', 'Pitch P Adjustment',
  'Pitch I Adjustment', 'Pitch D Adjustment', 'Roll P Adjustment', 'Roll I Adjustment',
  'Roll D Adjustment', 'RC Rate Yaw', 'Pitch & Roll F Adjustment', 'Feedforward Transition',
  'Horizon Strength Adjustment', 'PID-Audio Selection', 'Pitch F Adjustment', 'Roll F Adjustment',
  'Yaw F Adjustment', 'OSD Profile Selection', 'LED Profile Selection', 'LED Brightness Adjust',
];

const adjustmentsFields: BfField[] = [
  {
    id: 'adjustments-table',
    englishLabel: 'Adjustments',
    arabicMeaning: 'جدول التعديلات أثناء التحكم',
    arabicExplanation: 'جدول ديناميكي — عدد صفوفه يساوي دائمًا `FC.ADJUSTMENT_RANGES.length` الذي تبلّغ عنه الطائرة المتصلة فعليًا عبر MSP_ADJUSTMENT_RANGES. لا يوجد في المصدر الرسمي أي زر لإضافة أو حذف صف — العدد ثابت بحسب فيرموير الطائرة، ويمكن فقط تحرير محتوى كل صف موجود (تفعيله، قناته، نطاقه، الوظيفة، قناة تبديلها).',
    group: 'adjustments-table',
    controlType: 'table',
    scope: 'hardware-dependent',
    conditionNote: 'عدد الصفوف وعدد قنوات AUX المتاحة (المشتقة من `FC.RC.active_channels - 4`) يعتمدان على الطائرة والمستقبل المتصلين فعليًا.',
    safetyLevel: 'caution',
    dependsOnFieldIds: ['adjustment-enable', 'adjustment-when-channel', 'adjustment-is-in-range', 'adjustment-apply-function', 'adjustment-via-channel'],
    requiresSave: true,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'adjustment-enable',
    englishLabel: 'If enabled',
    arabicMeaning: 'تفعيل هذا الصف',
    arabicExplanation: 'مربع اختيار لكل صف. لا يُخزَّن كحقل منفصل في الفيرموير — الصف يُعتبر "معطّلًا" فقط عندما يتساوى حدّا النطاق (Start = End = 900). إلغاء التفعيل يعيد النطاق إلى هذه القيمة الحارسة؛ إعادة التفعيل تضبط النطاق الافتراضي 1300–1700.',
    group: 'adjustments-table',
    controlType: 'toggle',
    scope: 'universal',
    safetyLevel: 'caution',
    requiresSave: true,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'adjustment-when-channel',
    englishLabel: 'when channel',
    arabicMeaning: 'قناة القراءة (When Channel)',
    arabicExplanation: 'قائمة اختيار لقناة AUX التي تُراقَب قيمتها لتحديد متى يُطبَّق هذا التعديل. القائمة تُبنى ديناميكيًا (AUX 1 إلى AUX N) بعدد قنوات AUX الفعلية المتاحة من المستقبل المتصل.',
    group: 'adjustments-table',
    controlType: 'select',
    scope: 'hardware-dependent',
    conditionNote: 'عدد خيارات AUX يعتمد على عدد قنوات RC الفعلية المستقبَلة (active_channels - 4).',
    safetyLevel: 'caution',
    requiresSave: true,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'adjustment-is-in-range',
    englishLabel: 'is in range',
    arabicMeaning: 'نطاق التفعيل',
    arabicExplanation: 'شريط تمرير مزدوج يحدد نطاق قيمة القناة (Min/Max) الذي يُفعِّل هذا التعديل عند دخول القناة ضمنه. المجال الحقيقي الكامل: 900–2100 بخطوة 25، بقيمة افتراضية عند التفعيل 1300–1700.',
    group: 'adjustments-table',
    controlType: 'number',
    range: { min: 900, max: 2100, default: 1300 },
    scope: 'universal',
    safetyLevel: 'caution',
    requiresSave: true,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'adjustment-apply-function',
    englishLabel: 'then apply',
    arabicMeaning: 'الوظيفة المطبَّقة (Then Apply)',
    arabicExplanation: `قائمة اختيار من 32 وظيفة تعديل حقيقية ثابتة (adjustmentsFunction0 إلى adjustmentsFunction31)، تُرتَّب أبجديًا حسب النص المترجَم في الواجهة الفعلية: ${ADJUSTMENT_FUNCTIONS.join(', ')}.`,
    group: 'adjustments-table',
    controlType: 'select',
    range: { options: ADJUSTMENT_FUNCTIONS },
    scope: 'universal',
    safetyLevel: 'warning',
    requiresSave: true,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'adjustment-via-channel',
    englishLabel: 'via channel',
    arabicMeaning: 'قناة التبديل (Via Channel)',
    arabicExplanation: 'قائمة اختيار لقناة AUX التي تتحكم عمليًا في قيمة الوظيفة المختارة (مثل اختيار ملف تعريف السرعة أو ضبط قيمة P) — منفصلة عن قناة "when channel" التي تُفعِّل هذا الصف أصلًا. تُبنى ديناميكيًا بنفس عدد قنوات AUX المتاحة.',
    group: 'adjustments-table',
    controlType: 'select',
    scope: 'hardware-dependent',
    conditionNote: 'عدد خيارات AUX يعتمد على عدد قنوات RC الفعلية المستقبَلة.',
    safetyLevel: 'caution',
    requiresSave: true,
    requiresReboot: false,
    source: jsSource,
  },
];

const pageActionFields: BfField[] = [
  {
    id: 'adjustments-save',
    englishLabel: 'Save',
    arabicMeaning: 'حفظ',
    arabicExplanation: 'يرسل كل صفوف التعديل الحالية إلى الطائرة (sendAdjustmentRanges) ثم يكتب الذاكرة الدائمة (MSP_EEPROM_WRITE) ويعرض رسالة "EEPROM saved". لا يستدعي الكود أي أمر إعادة تشغيل — هذه الصفحة تحديدًا لا تتطلب إعادة تشغيل الطائرة بعد الحفظ.',
    group: 'page-actions',
    controlType: 'action',
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: false,
    source: jsSource,
  },
];

export const adjustmentsPage: BfPage = {
  id: 'adjustments',
  officialId: 'adjustments',
  officialTitle: 'Adjustments',
  titleAr: 'التعديلات أثناء التحكم',
  officialOrder: 9,
  summaryAr: 'ربط مفاتيح/عصي جهاز الإرسال بتعديل قيم حية أثناء الطيران (نسب PID، ملفات تعريف المعدل، إلخ) — عدد الصفوف يُقرأ حيًا من الطائرة المتصلة ولا يمكن إضافته أو حذفه من التطبيق.',
  connectionState: 'connected',
  contentStatus: 'reviewed',
  firmwareVersionRange: BF_VERSION_CONTEXT.releaseLine,
  appVersionRange: BF_VERSION_CONTEXT.releaseLine,
  reviewedAt: BF_VERSION_CONTEXT.reviewedAt,
  source: htmlSource,
  expertRequired: true,
  scope: 'universal',
  safetyLevel: 'caution',
  glossaryTermIds: [],
  relatedPageIds: ['modes', 'pid-tuning', 'receiver'],
  groups: [
    { id: 'adjustments-table', officialTitle: 'Adjustments', titleAr: 'جدول التعديلات', level: 'expert', order: 1, fields: adjustmentsFields },
    { id: 'page-actions', titleAr: 'إجراءات الصفحة', level: 'basic', order: 2, fields: pageActionFields },
  ],
};
