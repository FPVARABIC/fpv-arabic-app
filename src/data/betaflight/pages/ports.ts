import type { BfPage, BfField } from '../types';
import { makeConfiguratorSourceRef, BF_VERSION_CONTEXT } from '../sourceHelpers';

/**
 * Phase 2 — complete page.
 *
 * Verified against the cloned Configurator source (tag 2025.12.2):
 *   src/components/tabs/PortsTab.vue (this tab has migrated to Vue —
 *   template structure, `functionRules`, baud-rate arrays, the
 *   `portIdentifierToNameMapping`, and the mutual-exclusivity logic in
 *   `onTelemetryChange`/`onPeripheralChange`) and locales/en/messages.json
 *   (every English label below, including the `portsFunction_*` option
 *   display names).
 *
 * Real, verified facts not captured in the Phase 1 preview:
 *   - MSP toggle is unconditionally disabled for port identifier 20 (USB
 *     VCP) — `:disabled="port.identifier === 20"`.
 *   - Selecting a Telemetry function clears Peripheral, and vice versa
 *     (mutually exclusive) — `onTelemetryChange`/`onPeripheralChange`.
 *   - Selecting TBS SmartAudio or IRC Tramp as Peripheral force-disables
 *     MSP on that port; selecting an MSP-named peripheral (VTX_MSP)
 *     force-enables MSP.
 *   - Baud-rate option lists differ per column and are version-gated
 *     (extra 230400/460800 options appear at MSP API >= 1.47).
 */

const source = makeConfiguratorSourceRef({
  title: 'Betaflight App — Ports tab',
  repoPath: 'src/components/tabs/PortsTab.vue',
  applicability: 'universal',
  officialId: 'ports',
});

const TELEMETRY_OPTIONS = ['FrSky', 'HoTT', 'SmartPort', 'LTM', 'MAVLink', 'iBUS'];
const SENSOR_OPTIONS = ['GPS', 'ESC'];
const PERIPHERAL_OPTIONS = ['Blackbox logging', 'VTX (IRC Tramp)', 'VTX (TBS SmartAudio)', 'VTX (MSP + Displayport)', 'Camera (RunCam Protocol)', 'Benewake LIDAR', 'OSD (FrSky Protocol)'];

const fields: BfField[] = [
  {
    id: 'identifier',
    englishLabel: 'Identifier',
    arabicMeaning: 'معرّف المنفذ',
    arabicExplanation: 'اسم الـ UART الفعلي على اللوحة (مثل UART1 أو USB VCP أو SOFTSERIAL1)، مبني على جدول تعريف داخلي في التطبيق (portIdentifierToNameMapping) وليس نصًا حرًا.',
    group: 'assignment',
    controlType: 'status',
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source,
  },
  {
    id: 'configuration-msp',
    englishLabel: 'Configuration/MSP',
    arabicMeaning: 'تفعيل MSP على هذا المنفذ',
    arabicExplanation: 'النص الرسمي (portsMSPHelp): لا تعطّل MSP على أول منفذ تسلسلي إلا إذا كنت متأكدًا؛ قد تحتاج لإعادة فلاش ومسح إعداداتك إذا فعلت. حقيقة مؤكدة من الكود: هذا المفتاح معطّل دائمًا وغير قابل للتغيير لمنفذ USB VCP تحديدًا (المعرّف الداخلي 20)، لضمان بقاء قناة اتصال واحدة مضمونة دائمًا مع التطبيق.',
    group: 'assignment',
    controlType: 'toggle',
    scope: 'universal',
    dependsOnFieldIds: ['msp-baud-rate'],
    safetyLevel: 'critical',
    requiresSave: true,
    requiresReboot: true,
    source,
  },
  {
    id: 'msp-baud-rate',
    englishLabel: 'MSP baud rate',
    arabicMeaning: 'معدل بود MSP',
    arabicExplanation: 'معدل نقل البيانات لاتصال MSP على هذا المنفذ. القيم الحقيقية المتاحة: 9600, 19200, 38400, 57600, 115200, 230400, 250000, 500000, 1000000 (لا يوجد خيار AUTO لهذا العمود).',
    group: 'assignment',
    controlType: 'select',
    range: { options: ['9600', '19200', '38400', '57600', '115200', '230400', '250000', '500000', '1000000'] },
    scope: 'universal',
    safetyLevel: 'caution',
    requiresSave: true,
    requiresReboot: true,
    source,
  },
  {
    id: 'serial-rx',
    englishLabel: 'Serial Rx',
    arabicMeaning: 'استقبال المستقبل عبر هذا المنفذ',
    arabicExplanation: 'النص الرسمي (portsSerialRxHelp): تفعيل أو تعطيل استقبال إشارة جهاز التحكم على UART محدد؛ مسموح بمنفذ واحد فقط (maxPorts: 1 في قواعد الوظائف).',
    group: 'assignment',
    controlType: 'toggle',
    scope: 'universal',
    safetyLevel: 'warning',
    beginnerGuidance: 'تفعيله على أكثر من منفذ في نفس الوقت يمنع المستقبل من العمل بشكل صحيح.',
    requiresSave: true,
    requiresReboot: true,
    source,
  },
  {
    id: 'telemetry-output',
    englishLabel: 'Telemetry Output',
    arabicMeaning: 'مخرج التليمتري',
    arabicExplanation: `اختيار بروتوكول التليمتري المرسَل على هذا المنفذ. الخيارات الحقيقية المتاحة (حسب دعمها في بناء الفيرموير): ${TELEMETRY_OPTIONS.join('، ')}. اختيار أي منها يفرغ حقل Peripherals تلقائيًا لنفس المنفذ (إقصاء متبادل مؤكد من الكود).`,
    group: 'assignment',
    controlType: 'select',
    range: { options: TELEMETRY_OPTIONS },
    scope: 'feature-dependent',
    conditionNote: 'كل بروتوكول تليمتري يظهر فقط إذا كانت الميزة المقابلة له (مثل USE_TELEMETRY_SMARTPORT) مضمّنة في بناء الفيرموير المتصل.',
    dependsOnFieldIds: ['telemetry-baud-rate', 'peripherals'],
    safetyLevel: 'caution',
    requiresSave: true,
    requiresReboot: true,
    source,
  },
  {
    id: 'telemetry-baud-rate',
    englishLabel: 'Telemetry baud rate',
    arabicMeaning: 'معدل بود التليمتري',
    arabicExplanation: 'القيم الأساسية: AUTO, 9600, 19200, 38400, 57600, 115200. يُضاف 230400 وَ460800 عند إصدار MSP API 1.47 فأعلى.',
    group: 'assignment',
    controlType: 'select',
    range: { options: ['AUTO', '9600', '19200', '38400', '57600', '115200'], default: 'AUTO' },
    scope: 'version-dependent',
    conditionNote: 'خياران إضافيان (230400، 460800) يظهران فقط بإصدار MSP API 1.47 فأعلى.',
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: true,
    source,
  },
  {
    id: 'sensor-input',
    englishLabel: 'Sensor Input',
    arabicMeaning: 'مدخل حساس خارجي',
    arabicExplanation: `اختيار نوع الحساس المتصل على هذا المنفذ. الخيارات الحقيقية: ${SENSOR_OPTIONS.join('، ')} (GPS بحد أقصى منفذ واحد، ويتطلب ميزة USE_GPS في الفيرموير؛ ESC هو حساس تليمتري ESC خارجي).`,
    group: 'assignment',
    controlType: 'select',
    range: { options: SENSOR_OPTIONS },
    scope: 'feature-dependent',
    conditionNote: 'خيار GPS يتطلب ميزة USE_GPS مضمّنة في بناء الفيرموير المتصل؛ لا يمكن تعيين أكثر من منفذ GPS واحد.',
    dependsOnFieldIds: ['sensor-baud-rate'],
    safetyLevel: 'caution',
    requiresSave: true,
    requiresReboot: true,
    source,
  },
  {
    id: 'sensor-baud-rate',
    englishLabel: 'Sensor baud rate (GPS)',
    arabicMeaning: 'معدل بود الحساس (GPS)',
    arabicExplanation: 'القيم الأساسية: AUTO, 9600, 19200, 38400, 57600, 115200. يُضاف 230400 عند إصدار MSP API 1.47 فأعلى.',
    group: 'assignment',
    controlType: 'select',
    range: { options: ['AUTO', '9600', '19200', '38400', '57600', '115200'], default: 'AUTO' },
    scope: 'version-dependent',
    conditionNote: 'خيار إضافي (230400) يظهر فقط بإصدار MSP API 1.47 فأعلى.',
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: true,
    source,
  },
  {
    id: 'peripherals',
    englishLabel: 'Peripherals',
    arabicMeaning: 'جهاز طرفي',
    arabicExplanation: `اختيار وظيفة طرفية على هذا المنفذ. الخيارات الحقيقية: ${PERIPHERAL_OPTIONS.join('، ')}. اختيار "VTX (TBS SmartAudio)" أو "VTX (IRC Tramp)" يعطّل MSP إجباريًا على نفس المنفذ؛ اختيار "VTX (MSP + Displayport)" يفعّل MSP إجباريًا؛ أي اختيار هنا يفرغ حقل Telemetry Output تلقائيًا (إقصاء متبادل).`,
    group: 'assignment',
    controlType: 'select',
    range: { options: PERIPHERAL_OPTIONS },
    scope: 'feature-dependent',
    conditionNote: 'كل وظيفة طرفية تظهر فقط إذا كانت الميزة المقابلة لها (مثل USE_VTX أو USE_CAMERA_CONTROL) مضمّنة في بناء الفيرموير المتصل. خيار "VTX (MSP + Displayport)" تحديدًا يتطلب أيضًا إصدار MSP API 1.45 فأعلى — بقية الخيارات غير مرتبطة بهذا الشرط.',
    dependsOnFieldIds: ['peripheral-baud-rate', 'configuration-msp', 'telemetry-output'],
    safetyLevel: 'caution',
    requiresSave: true,
    requiresReboot: true,
    source,
  },
  {
    id: 'peripheral-baud-rate',
    englishLabel: 'Peripheral baud rate (Blackbox)',
    arabicMeaning: 'معدل بود الجهاز الطرفي (Blackbox)',
    arabicExplanation: 'القيم الحقيقية: AUTO, 19200, 38400, 57600, 115200, 230400, 250000, 1500000, 2000000, 2470000.',
    group: 'assignment',
    controlType: 'select',
    range: { options: ['AUTO', '19200', '38400', '57600', '115200', '230400', '250000', '1500000', '2000000', '2470000'], default: 'AUTO' },
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: true,
    source,
  },
  {
    id: 'vtx-table-warning',
    englishLabel: 'VTX table not configured (warning banner)',
    arabicMeaning: 'تحذير: جدول VTX غير مُعد',
    arabicExplanation: 'النص الرسمي (portsVtxTableNotSet): تحذير — لم يُعدّ جدول VTX بشكل صحيح، وبدونه لن يكون التحكم بجهاز الفيديو ممكنًا. يظهر هذا التحذير فقط إذا فُعّل VTX table لكنه فارغ (بدون Bands أو Channels أو Power levels محددة).',
    group: 'assignment',
    controlType: 'status',
    scope: 'feature-dependent',
    conditionNote: 'يظهر فقط عند وجود جدول VTX مفعّل لكنه غير مكتمل الإعداد.',
    safetyLevel: 'warning',
    requiresSave: false,
    requiresReboot: false,
    source,
  },
];

const pageActionFields: BfField[] = [
  {
    id: 'save-and-reboot',
    englishLabel: 'Save and Reboot',
    arabicMeaning: 'حفظ وإعادة تشغيل',
    arabicExplanation: 'يحفظ كل التغييرات المعلَّقة على تعيينات جميع المنافذ في ذاكرة الـ FC ويعيد تشغيله لتطبيقها؛ لا تُطبَّق أي تعديلات على هذه الصفحة قبل الضغط على هذا الزر.',
    group: 'page-actions',
    controlType: 'action',
    scope: 'universal',
    safetyLevel: 'warning',
    requiresSave: true,
    requiresReboot: true,
    source,
  },
];

export const portsPage: BfPage = {
  id: 'ports',
  officialId: 'ports',
  officialTitle: 'Ports',
  titleAr: 'المنافذ',
  officialOrder: 18,
  summaryAr: 'تحديد وظيفة كل UART فعلي على لوحة التحكم — مستقبل، تليمتري، حساسات، أو أجهزة طرفية، بجدول واحد لكل المنافذ المكتشفة.',
  connectionState: 'connected',
  contentStatus: 'reviewed',
  firmwareVersionRange: BF_VERSION_CONTEXT.releaseLine,
  appVersionRange: BF_VERSION_CONTEXT.releaseLine,
  reviewedAt: BF_VERSION_CONTEXT.reviewedAt,
  source,
  expertRequired: false,
  scope: 'universal',
  safetyLevel: 'warning',
  glossaryTermIds: ['ports', 'uart', 'msp', 'serial-rx', 'save-and-reboot'],
  relatedPageIds: ['setup', 'receiver', 'gps', 'vtx', 'blackbox'],
  groups: [
    { id: 'assignment', officialTitle: undefined, titleAr: 'تعيين وظيفة كل منفذ (صف واحد لكل UART)', level: 'basic', order: 1, fields },
    { id: 'page-actions', titleAr: 'حفظ التغييرات', level: 'basic', order: 2, fields: pageActionFields },
  ],
};
