import type { BfPage, BfField } from '../types';
import { makeConfiguratorSourceRef } from '../sourceHelpers';
import { BF_VERSION_CONTEXT } from '../sourceHelpers';

/**
 * Phase 5 — complete page.
 *
 * Verified against the cloned Configurator source (tag 2025.12.2). This
 * tab has migrated to Vue (like Configuration/Ports before it):
 *   - src/components/tabs/ServosTab.vue (355 lines — full source)
 *   - src/js/msp/MSPHelper.js (writeConfiguration(reboot, callback)
 *     signature, confirming the real Save-without-reboot semantics)
 *   - locales/en/messages.json (every English label below, verbatim)
 *
 * A real, verified structural fact: support for this page is driven
 * purely by whether the connected FC actually reports any servo
 * configurations (`FC.SERVO_CONFIG.length > 0`, populated from
 * MSP_SERVO_CONFIGURATIONS) — there is no explicit client-side
 * mixer-type/SERVO_TILT feature check anywhere in ServosTab.vue. The
 * row count is whatever the firmware reports, capped client-side at 8.
 *
 * A second real, verified structural fact: Save here calls
 * `writeConfiguration(false, ...)` — EEPROM write WITHOUT reboot —
 * genuinely different from GPS's `writeConfiguration(true, ...)`
 * (reboot). "Live mode" additionally lets every field change apply
 * instantly to RAM (no EEPROM write) via a 10ms-debounced send.
 */

const source = makeConfiguratorSourceRef({
  title: 'Betaflight App — Servos tab',
  repoPath: 'src/components/tabs/ServosTab.vue',
  applicability: 'universal',
  officialId: 'servos',
});

const unsupportedFields: BfField[] = [
  {
    id: 'servos-unsupported-notice',
    englishLabel: 'Servos requires firmware >= 1.10.0. and target support.',
    arabicMeaning: 'تنبيه عدم دعم Servos',
    arabicExplanation: 'النص الرسمي (servosFirmwareUpgradeRequired). يظهر بدلًا من الصفحة كاملة عندما لا تبلّغ الطائرة المتصلة عن أي إعدادات servo فعلية (`FC.SERVO_CONFIG` فارغة) — أي أن الهدف/الفيرموير الحالي لا يدعم مخارج servo إطلاقًا.',
    group: 'unsupported-notice',
    controlType: 'status',
    scope: 'hardware-dependent',
    conditionNote: 'يظهر فقط عندما لا يبلّغ الفيرموير المتصل عن أي servo مُهيَّأ (`FC.SERVO_CONFIG` فارغة)؛ الصفحة الفعلية تظهر بدلًا منه عند توفر servo واحد على الأقل.',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source,
  },
];

const servoTableFields: BfField[] = [
  {
    id: 'servos-table',
    englishLabel: 'Change Direction in TX To Match',
    arabicMeaning: 'جدول خرجات Servo',
    arabicExplanation: 'جدول ديناميكي — عدد صفوفه يساوي عدد إعدادات servo الفعلية التي يبلّغ عنها الفيرموير المتصل (`FC.SERVO_CONFIG`)، بحد أقصى 8 صفوف يفرضه التطبيق. كل صف يمثل خرج servo واحدًا حقيقيًا برقم تسلسلي (Servo 1 وهكذا).',
    group: 'servo-table',
    controlType: 'table',
    scope: 'hardware-dependent',
    conditionNote: 'عدد الصفوف يعتمد كليًا على عدد مخارج servo التي يبلّغ عنها الفيرموير والهدف المتصلين فعليًا.',
    safetyLevel: 'warning',
    dependsOnFieldIds: ['servo-min', 'servo-middle', 'servo-max', 'servo-channel-forward', 'servo-rate'],
    requiresSave: true,
    requiresReboot: false,
    source,
  },
  {
    id: 'servo-min',
    englishLabel: 'MIN',
    arabicMeaning: 'الحد الأدنى لخرج Servo',
    arabicExplanation: 'أدنى عرض نبضة (بالميكروثانية) يُرسَل لهذا الـ servo. يُقيَّد القيم المدخلة داخل التطبيق نفسه إلى المجال 500–2500 بغض النظر عمّا كُتب.',
    group: 'servo-table',
    controlType: 'number',
    range: { min: 500, max: 2500, unit: 'μs' },
    scope: 'universal',
    safetyLevel: 'critical',
    requiresSave: true,
    requiresReboot: false,
    source,
  },
  {
    id: 'servo-middle',
    englishLabel: 'MID',
    arabicMeaning: 'نقطة المنتصف لخرج Servo',
    arabicExplanation: 'عرض النبضة (بالميكروثانية) عند وضع المنتصف. المجال: 500–2500.',
    group: 'servo-table',
    controlType: 'number',
    range: { min: 500, max: 2500, unit: 'μs' },
    scope: 'universal',
    safetyLevel: 'critical',
    requiresSave: true,
    requiresReboot: false,
    source,
  },
  {
    id: 'servo-max',
    englishLabel: 'MAX',
    arabicMeaning: 'الحد الأقصى لخرج Servo',
    arabicExplanation: 'أقصى عرض نبضة (بالميكروثانية) يُرسَل لهذا الـ servo. المجال: 500–2500.',
    group: 'servo-table',
    controlType: 'number',
    range: { min: 500, max: 2500, unit: 'μs' },
    scope: 'universal',
    safetyLevel: 'critical',
    requiresSave: true,
    requiresReboot: false,
    source,
  },
  {
    id: 'servo-channel-forward',
    englishLabel: 'CH1–CH4 / Aux channel-forward checkboxes',
    arabicMeaning: 'تحويل قناة RC مباشرة إلى Servo',
    arabicExplanation: 'صف من مربعات اختيار (CH1–CH4 ثم كل قناة AUX الفعلية المتاحة) — تحديد أحدها يجعل قناة RC المختارة تتحكم مباشرة في هذا الـ servo (تحويل مباشر، indexOfChannelToForward)، حصريًا — لا يمكن تحديد أكثر من قناة واحدة لنفس الـ servo في آنٍ واحد.',
    group: 'servo-table',
    controlType: 'toggle',
    scope: 'hardware-dependent',
    conditionNote: 'عدد أعمدة قنوات AUX المعروضة يعتمد على عدد قنوات RC الفعلية المستقبَلة (`FC.RC.active_channels`).',
    safetyLevel: 'warning',
    requiresSave: true,
    requiresReboot: false,
    source,
  },
  {
    id: 'servo-rate',
    englishLabel: 'Rate:',
    arabicMeaning: 'معدّل واتجاه Servo',
    arabicExplanation: 'قائمة اختيار (select) تحتوي فعليًا على كل قيمة صحيحة من 100 إلى -100 (201 خيارًا)، تمثّل نسبة ومعدل حركة هذا الـ servo — القيم السالبة تعكس اتجاه الحركة. تُملأ القائمة بالكامل ديناميكيًا في الكود، وليست تقريبًا.',
    group: 'servo-table',
    controlType: 'select',
    range: { min: -100, max: 100, unit: '%' },
    scope: 'universal',
    safetyLevel: 'warning',
    requiresSave: true,
    requiresReboot: false,
    source,
  },
  {
    id: 'servos-live-mode-toggle',
    englishLabel: 'Enable Live mode',
    arabicMeaning: 'تفعيل الوضع الحي',
    arabicExplanation: 'عند التفعيل، أي تغيير في أي حقل أعلاه يُرسَل فورًا إلى الطائرة (بتأخير 10 مللي ثانية فقط) دون حفظ في الذاكرة الدائمة — تعديل حي في ذاكرة RAM فقط، ينعكس فورًا على حركة الـ servo الفعلية.',
    group: 'servo-table',
    controlType: 'toggle',
    scope: 'universal',
    safetyLevel: 'warning',
    beginnerGuidance: 'أي تعديل في الوضع الحي يُطبَّق فورًا على حركة الجهاز الفعلي المتصل بالـ servo — كن حذرًا إن كان مركّبًا على جزء ميكانيكي حساس.',
    requiresSave: false,
    requiresReboot: false,
    source,
  },
];

const servoBarsFields: BfField[] = [
  {
    id: 'servos-bars-preview',
    englishLabel: 'Servos',
    arabicMeaning: 'أشرطة معاينة حية لكل Servo',
    arabicExplanation: '8 أشرطة ثابتة العدد دائمًا (Servo 1 إلى Servo 8)، بغض النظر عن العدد الفعلي المُهيَّأ — كل شريط يعرض القيمة الحية الحالية (من MSP_SERVO، بمعدل استطلاع كل 50 مللي ثانية) بمدى 1000–2000.',
    group: 'servo-bars',
    controlType: 'graph',
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source,
  },
];

const pageActionFields: BfField[] = [
  {
    id: 'servos-save',
    englishLabel: 'Save',
    arabicMeaning: 'حفظ',
    arabicExplanation: 'يرسل إعدادات كل servo (MSP_SET_SERVO_CONFIGURATION) ثم يكتب الذاكرة الدائمة عبر `writeConfiguration(false, ...)` — أي حفظ EEPROM بدون إعادة تشغيل أو قطع الاتصال، على عكس صفحة GPS مثلًا التي تستدعي `writeConfiguration(true, ...)`.',
    group: 'page-actions',
    controlType: 'action',
    scope: 'universal',
    safetyLevel: 'warning',
    requiresSave: true,
    requiresReboot: false,
    source,
  },
];

export const servosPage: BfPage = {
  id: 'servos',
  officialId: 'servos',
  officialTitle: 'Servos',
  titleAr: 'المحركات الخادمة',
  officialOrder: 24,
  summaryAr: 'إعداد كل مخرج servo فعلي (Min/Mid/Max/تحويل قناة/معدل) على الطائرات التي تستخدم servos (مثل الطائرات ثابتة الجناح)، مع وضع تعديل حي فوري ومعاينة بصرية لحركة كل servo.',
  connectionState: 'connected',
  contentStatus: 'reviewed',
  firmwareVersionRange: BF_VERSION_CONTEXT.releaseLine,
  appVersionRange: BF_VERSION_CONTEXT.releaseLine,
  reviewedAt: BF_VERSION_CONTEXT.reviewedAt,
  source,
  expertRequired: false,
  scope: 'hardware-dependent',
  conditionNote: 'الصفحة كاملة تظهر فقط إذا كانت الطائرة المتصلة تبلّغ عن servo واحد على الأقل فعليًا مُهيَّأ في الفيرموير.',
  safetyLevel: 'caution',
  glossaryTermIds: [],
  relatedPageIds: ['configuration', 'modes'],
  groups: [
    { id: 'unsupported-notice', titleAr: 'تنبيه عدم الدعم', level: 'basic', order: 1, fields: unsupportedFields },
    { id: 'servo-table', officialTitle: 'Change Direction in TX To Match', titleAr: 'جدول خرجات Servo', level: 'advanced', order: 2, fields: servoTableFields },
    { id: 'servo-bars', officialTitle: 'Servos', titleAr: 'معاينة الحركة الحية', level: 'basic', order: 3, fields: servoBarsFields },
    { id: 'page-actions', titleAr: 'إجراءات الصفحة', level: 'basic', order: 4, fields: pageActionFields },
  ],
};
