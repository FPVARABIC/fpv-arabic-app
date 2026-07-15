import type { BfPage, BfField } from '../types';
import { makeConfiguratorSourceRef } from '../sourceHelpers';
import { BF_VERSION_CONTEXT } from '../sourceHelpers';

/**
 * Phase 5 — complete page.
 *
 * Verified against the cloned Configurator source (tag 2025.12.2):
 *   - src/tabs/sensors.html (full source read directly)
 *   - src/js/tabs/sensors.js (full source read directly — checkbox
 *     enable/disable gating, debug-column API gating, refresh loop)
 *   - locales/en/messages.json (every English label below, verbatim)
 *
 * A critical, exhaustively-verified structural fact: this tab has NO
 * calibration action, NO board-alignment control, NO magnetic-declination
 * field, and NO Save/EEPROM-write path of any kind — confirmed by
 * grepping sensors.js for "MSP_EEPROM_WRITE"/"writeConfiguration"/
 * "reboot" (zero matches) and for "calibrat" (zero matches). Everything
 * a user changes here (which checkboxes are on, refresh rate, scale) is
 * stored via `setConfig`/`getConfig` — the app's own local browser
 * storage — and is NEVER sent to the flight controller. This is
 * therefore the one reviewed Betaflight companion page with no
 * `page-actions` group at all; that omission is deliberate, not an
 * oversight. Real calibration (accelerometer trim) and board alignment
 * live on the Setup tab (Phase 2), not here.
 *
 * A second verified fact: Optical flow support exists in the shared
 * `have_sensor()` helper but is never queried anywhere in sensors.js —
 * genuinely absent from this tab's UI, so it is not modeled here.
 *
 * A third verified fact: when the connected target is not a flight
 * controller board (`FC.CONFIG.boardType` is neither 0 nor 2, e.g. an
 * OSD-only or GPS-only board), the Gyroscope/Accelerometer/Magnetometer/
 * Altitude/Sonar checkboxes are all force-disabled AND hidden — only
 * Debug remains available in that case.
 */

const htmlSource = makeConfiguratorSourceRef({
  title: 'Betaflight App — Sensors tab',
  repoPath: 'src/tabs/sensors.html',
  applicability: 'universal',
  officialId: 'sensors',
});

const jsSource = makeConfiguratorSourceRef({
  title: 'Betaflight App — Sensors tab behavior',
  repoPath: 'src/js/tabs/sensors.js',
  applicability: 'universal',
  officialId: 'sensors',
});

const selectFields: BfField[] = [
  {
    id: 'sensors-gyro-enable',
    englishLabel: 'Gyroscope',
    arabicMeaning: 'تفعيل رسم بيانات الجيروسكوب',
    arabicExplanation: 'مربع اختيار (graphs_enabled[0]) — يُظهر/يُخفي رسمًا بيانيًا حيًا لقراءات الجيروسكوب. متاح دائمًا على لوحات التحكم الحقيقية (لا يوجد شرط اكتشاف حساس له، بخلاف بقية المربعات).',
    group: 'sensor-selection',
    controlType: 'toggle',
    scope: 'universal',
    dependsOnFieldIds: ['gyro-refresh-rate', 'gyro-scale', 'gyro-live-xyz'],
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'sensors-accel-enable',
    englishLabel: 'Accelerometer',
    arabicMeaning: 'تفعيل رسم بيانات مقياس التسارع',
    arabicExplanation: 'مربع اختيار (graphs_enabled[1]) — يُعطَّل تلقائيًا عندما لا يبلّغ الفيرموير عن وجود مقياس تسارع فعليًا (have_sensor(activeSensors, "acc")).',
    group: 'sensor-selection',
    controlType: 'toggle',
    scope: 'sensor-dependent',
    conditionNote: 'يُعطَّل عندما لا يُبلِّغ الفيرموير المتصل عن وجود مقياس تسارع فعليًا.',
    dependsOnFieldIds: ['accel-refresh-rate', 'accel-scale', 'accel-live-xyz'],
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'sensors-mag-enable',
    englishLabel: 'Magnetometer',
    arabicMeaning: 'تفعيل رسم بيانات المقياس المغناطيسي',
    arabicExplanation: 'مربع اختيار (graphs_enabled[2]) — يُعطَّل تلقائيًا عندما لا يبلّغ الفيرموير عن وجود مقياس مغناطيسي فعليًا (have_sensor(activeSensors, "mag")).',
    group: 'sensor-selection',
    controlType: 'toggle',
    scope: 'sensor-dependent',
    conditionNote: 'يُعطَّل عندما لا يُبلِّغ الفيرموير المتصل عن وجود مقياس مغناطيسي فعليًا.',
    dependsOnFieldIds: ['mag-refresh-rate', 'mag-scale', 'mag-live-xyz'],
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'sensors-altitude-enable',
    englishLabel: 'Altitude',
    arabicMeaning: 'تفعيل رسم بيانات الارتفاع',
    arabicExplanation: 'مربع اختيار (graphs_enabled[3]) — يُعطَّل تلقائيًا عندما لا يبلّغ الفيرموير عن وجود مقياس ضغط جوي (باروميتر) ولا GPS معًا.',
    group: 'sensor-selection',
    controlType: 'toggle',
    scope: 'sensor-dependent',
    conditionNote: 'يُعطَّل عندما لا يُبلِّغ الفيرموير المتصل عن وجود باروميتر أو GPS.',
    dependsOnFieldIds: ['altitude-refresh-rate', 'altitude-live-value'],
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'sensors-sonar-enable',
    englishLabel: 'Sonar',
    arabicMeaning: 'تفعيل رسم بيانات السونار',
    arabicExplanation: 'مربع اختيار (graphs_enabled[4]) — يُعطَّل تلقائيًا عندما لا يبلّغ الفيرموير عن وجود حساس سونار فعليًا (have_sensor(activeSensors, "sonar")).',
    group: 'sensor-selection',
    controlType: 'toggle',
    scope: 'sensor-dependent',
    conditionNote: 'يُعطَّل عندما لا يُبلِّغ الفيرموير المتصل عن وجود حساس سونار فعليًا.',
    dependsOnFieldIds: ['sonar-refresh-rate', 'sonar-live-value'],
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'sensors-debug-enable',
    englishLabel: 'Debug',
    arabicMeaning: 'تفعيل رسم قنوات التصحيح (Debug)',
    arabicExplanation: 'مربع اختيار (graphs_enabled[5]) — متاح دائمًا بلا شرط اكتشاف حساس (على عكس بقية المربعات)؛ يبقى متاحًا حتى على اللوحات غير الخاصة بالتحكم في الطيران عندما تُعطَّل بقية المربعات كلها.',
    group: 'sensor-selection',
    controlType: 'toggle',
    scope: 'universal',
    dependsOnFieldIds: ['debug-graphs'],
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
];

const gyroFields: BfField[] = [
  {
    id: 'gyro-refresh-rate',
    englishLabel: 'Refresh:',
    arabicMeaning: 'معدل تحديث رسم الجيروسكوب',
    arabicExplanation: 'قائمة اختيار (10 – 1000 مللي ثانية، القيمة الافتراضية 50). كل قيمة موجودة فعليًا في الكود: 10, 20, 30, 40, 50, 100, 250, 500, 1000.',
    group: 'gyro',
    controlType: 'select',
    range: { options: ['10', '20', '30', '40', '50', '100', '250', '500', '1000'], unit: 'ms', default: '50' },
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'gyro-scale',
    englishLabel: 'Scale:',
    arabicMeaning: 'مقياس رسم الجيروسكوب',
    arabicExplanation: 'قائمة اختيار لعامل تكبير الرسم البياني فقط (لا يؤثر على القيم الفعلية المُرسَلة من الطائرة)، القيمة الافتراضية 2000. الخيارات الحقيقية: 1, 2, 3, 4, 5, 10, 25, 50, 100, 200, 300, 400, 500, 1000, 2000.',
    group: 'gyro',
    controlType: 'select',
    range: { options: ['1', '2', '3', '4', '5', '10', '25', '50', '100', '200', '300', '400', '500', '1000', '2000'], default: '2000' },
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'gyro-live-xyz',
    englishLabel: 'X: / Y: / Z:',
    arabicMeaning: 'قراءات الجيروسكوب الحية (درجة/ثانية)',
    arabicExplanation: 'ثلاث قيم حية للقراءة فقط (X وY وZ) بوحدة درجة/ثانية، مع رسم بياني مباشر (Gyroscope - deg/s) يُحدَّث وفق معدل التحديث المختار.',
    group: 'gyro',
    controlType: 'graph',
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
];

const accelFields: BfField[] = [
  {
    id: 'accel-refresh-rate',
    englishLabel: 'Refresh:',
    arabicMeaning: 'معدل تحديث رسم مقياس التسارع',
    arabicExplanation: 'قائمة اختيار (10 – 1000 مللي ثانية، القيمة الافتراضية 50) — نفس الخيارات المتاحة لرسم الجيروسكوب.',
    group: 'accel',
    controlType: 'select',
    range: { options: ['10', '20', '30', '40', '50', '100', '250', '500', '1000'], unit: 'ms', default: '50' },
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'accel-scale',
    englishLabel: 'Scale:',
    arabicMeaning: 'مقياس رسم مقياس التسارع',
    arabicExplanation: 'قائمة اختيار لعامل تكبير الرسم البياني فقط، القيمة الافتراضية 2. الخيارات الحقيقية: 0.5, 1, 2.',
    group: 'accel',
    controlType: 'select',
    range: { options: ['0.5', '1', '2'], default: '2' },
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'accel-live-xyz',
    englishLabel: 'X: / Y: / Z:',
    arabicMeaning: 'قراءات مقياس التسارع الحية (g)',
    arabicExplanation: 'ثلاث قيم حية للقراءة فقط بوحدة الجاذبية الأرضية (g)، مع رسم بياني مباشر (Accelerometer - g). هذه قراءات عرض فقط — لا يوجد هنا أي إجراء معايرة (calibration)؛ المعايرة الفعلية موجودة في صفحة Setup.',
    group: 'accel',
    controlType: 'graph',
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
];

const magFields: BfField[] = [
  {
    id: 'mag-refresh-rate',
    englishLabel: 'Refresh:',
    arabicMeaning: 'معدل تحديث رسم المقياس المغناطيسي',
    arabicExplanation: 'قائمة اختيار (10 – 1000 مللي ثانية، القيمة الافتراضية 50) — نفس الخيارات المتاحة لرسم الجيروسكوب.',
    group: 'mag',
    controlType: 'select',
    range: { options: ['10', '20', '30', '40', '50', '100', '250', '500', '1000'], unit: 'ms', default: '50' },
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'mag-scale',
    englishLabel: 'Scale:',
    arabicMeaning: 'مقياس رسم المقياس المغناطيسي',
    arabicExplanation: 'قائمة اختيار لعامل تكبير الرسم البياني فقط، القيمة الافتراضية 2000. الخيارات الحقيقية: 100, 200, 500, 1000, 2000, 5000, 10000.',
    group: 'mag',
    controlType: 'select',
    range: { options: ['100', '200', '500', '1000', '2000', '5000', '10000'], default: '2000' },
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'mag-live-xyz',
    englishLabel: 'X: / Y: / Z:',
    arabicMeaning: 'قراءات المقياس المغناطيسي الحية',
    arabicExplanation: 'ثلاث قيم حية للقراءة فقط، مع رسم بياني مباشر (Magnetometer). لا يوجد هنا أي حقل انحراف مغناطيسي (Magnetic Declination) أو معايرة — الانحراف المغناطيسي القابل للتعديل موجود في صفحة Configuration، وعرضه للقراءة فقط موجود في صفحة GPS.',
    group: 'mag',
    controlType: 'graph',
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
];

const altitudeFields: BfField[] = [
  {
    id: 'altitude-refresh-rate',
    englishLabel: 'Refresh:',
    arabicMeaning: 'معدل تحديث رسم الارتفاع',
    arabicExplanation: 'قائمة اختيار (10 – 1000 مللي ثانية، القيمة الافتراضية 100 — تختلف عن باقي الحساسات). نفس مجموعة القيم: 10, 20, 30, 40, 50, 100, 250, 500, 1000.',
    group: 'altitude',
    controlType: 'select',
    range: { options: ['10', '20', '30', '40', '50', '100', '250', '500', '1000'], unit: 'ms', default: '100' },
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'altitude-live-value',
    englishLabel: 'X:',
    arabicMeaning: 'قراءة الارتفاع الحية (متر)',
    arabicExplanation: 'النص الرسمي (sensorsAltitudeHint): يُحسَب الارتفاع بدمج قراءة الباروميتر (إن وُجد) مع قراءة الارتفاع من GPS (إن وُجد). عند اتصال GPS وتوفر قفل موقع، يُعرَض الارتفاع المطلق فوق سطح البحر في وضع عدم التسليح، بينما يُعرَض الارتفاع النسبي إلى موضع لحظة التسليح عند التسليح.',
    group: 'altitude',
    controlType: 'graph',
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
];

const sonarFields: BfField[] = [
  {
    id: 'sonar-refresh-rate',
    englishLabel: 'Refresh:',
    arabicMeaning: 'معدل تحديث رسم السونار',
    arabicExplanation: 'قائمة اختيار (10 – 1000 مللي ثانية، القيمة الافتراضية 100). نفس مجموعة القيم المتاحة لبقية الحساسات.',
    group: 'sonar',
    controlType: 'select',
    range: { options: ['10', '20', '30', '40', '50', '100', '250', '500', '1000'], unit: 'ms', default: '100' },
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'sonar-live-value',
    englishLabel: 'X:',
    arabicMeaning: 'قراءة السونار الحية (سم)',
    arabicExplanation: 'قيمة حية للقراءة فقط بوحدة السنتيمتر، مع رسم بياني مباشر (Sonar - cm).',
    group: 'sonar',
    controlType: 'graph',
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
];

const debugFields: BfField[] = [
  {
    id: 'debug-refresh-rate',
    englishLabel: 'Refresh:',
    arabicMeaning: 'معدل تحديث رسوم التصحيح',
    arabicExplanation: 'قائمة اختيار (10 – 1000 مللي ثانية، القيمة الافتراضية 500) تتحكم بمعدل تحديث رسم قناة التصحيح الأولى (Debug 0) فقط.',
    group: 'debug',
    controlType: 'select',
    range: { options: ['10', '20', '30', '40', '50', '100', '250', '500', '1000'], unit: 'ms', default: '500' },
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'debug-graphs',
    englishLabel: 'Debug 0–7',
    arabicMeaning: 'رسوم قنوات التصحيح (Debug)',
    arabicExplanation: 'عدد قنوات التصحيح المعروضة فعليًا يعتمد على إصدار API: 4 قنوات (Debug 0–3) عند إصدار API أقل من 1.46، أو 8 قنوات (Debug 0–7) عند 1.46 فأعلى — وعندها تُطلَب أسماء الأعمدة فعليًا من الطائرة عبر MSP_ADVANCED_CONFIG. هذه القنوات مخصصة لأغراض تشخيصية متقدمة من قِبل مطوري الفيرموير، وقيمها ومعناها يعتمدان كليًا على وضع debug_mode المُفعَّل حاليًا.',
    group: 'debug',
    controlType: 'graph',
    scope: 'version-dependent',
    conditionNote: 'يُعرَض 4 رسوم بيانية فقط عند إصدار API أقل من 1.46، و8 رسوم بيانية عند 1.46 فأعلى.',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
];

export const sensorsPage: BfPage = {
  id: 'sensors',
  officialId: 'sensors',
  officialTitle: 'Sensors',
  titleAr: 'الحساسات',
  officialOrder: 20,
  summaryAr: 'عرض حي (بدون حفظ) لقراءات الجيروسكوب ومقياس التسارع والمقياس المغناطيسي والارتفاع والسونار وقنوات التصحيح، مع تحكم في معدل التحديث ومقياس الرسم البياني فقط — لا توجد هنا أي معايرة أو حفظ فعلي.',
  connectionState: 'connected',
  contentStatus: 'reviewed',
  firmwareVersionRange: BF_VERSION_CONTEXT.releaseLine,
  appVersionRange: BF_VERSION_CONTEXT.releaseLine,
  reviewedAt: BF_VERSION_CONTEXT.reviewedAt,
  source: htmlSource,
  expertRequired: false,
  scope: 'sensor-dependent',
  conditionNote: 'كل مربع اختيار (باستثناء Gyroscope وDebug) يُعطَّل تلقائيًا إن لم يُبلِّغ الفيرموير المتصل عن وجود الحساس المقابل فعليًا؛ وعلى اللوحات غير الخاصة بالتحكم بالطيران تُعطَّل وتُخفى كل الحساسات ما عدا Debug.',
  safetyLevel: 'caution',
  glossaryTermIds: [],
  relatedPageIds: ['setup', 'configuration', 'gps'],
  groups: [
    { id: 'sensor-selection', officialTitle: 'Sensors', titleAr: 'اختيار الحساسات المعروضة', level: 'basic', order: 1, fields: selectFields },
    { id: 'gyro', officialTitle: 'Gyroscope - deg/s', titleAr: 'الجيروسكوب', level: 'basic', order: 2, fields: gyroFields },
    { id: 'accel', officialTitle: 'Accelerometer - g', titleAr: 'مقياس التسارع', level: 'basic', order: 3, fields: accelFields },
    { id: 'mag', officialTitle: 'Magnetometer', titleAr: 'المقياس المغناطيسي', level: 'basic', order: 4, fields: magFields },
    { id: 'altitude', officialTitle: 'Altitude - meters', titleAr: 'الارتفاع', level: 'basic', order: 5, fields: altitudeFields },
    { id: 'sonar', officialTitle: 'Sonar - cm', titleAr: 'السونار', level: 'basic', order: 6, fields: sonarFields },
    { id: 'debug', officialTitle: 'Debug', titleAr: 'قنوات التصحيح', level: 'expert', order: 7, fields: debugFields },
  ],
};
