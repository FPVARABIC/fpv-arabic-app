import type { BfPage, BfField } from '../types';
import { makeConfiguratorSourceRef } from '../sourceHelpers';
import { BF_VERSION_CONTEXT } from '../sourceHelpers';

/**
 * Phase 5 — complete page.
 *
 * Verified against the cloned Configurator source (tag 2025.12.2):
 *   - src/tabs/led_strip.html (243 lines — full source read directly)
 *   - src/js/tabs/led_strip.js (1221 lines — read directly for grid
 *     construction, mutual-exclusivity logic, API-version gates, save)
 *   - locales/en/messages.json (every English label below, verbatim)
 *
 * A verified structural fact: the spatial grid is always exactly 256
 * cells (`for (let i = 0; i < 256; i++)`), i.e. a fixed 16×16 layout —
 * a hard protocol limit, not a firmware-reported count. This is a
 * genuinely different, separate concept from wire ordering (below):
 * grid position is spatial only; wire order is the serial index the
 * physical LED strip actually uses, assigned independently in "Wire
 * Ordering Mode".
 *
 * A second verified fact: "Larson scanner" and "Blink always" are
 * mutually exclusive by explicit code comment/logic ("both functions
 * are not working properly at the same time") — enabling one
 * automatically disables the other.
 *
 * A third verified fact: Save calls `mspHelper.writeConfiguration(false,
 * save_completed)` — EEPROM write WITHOUT reboot, same pattern as VTX
 * and Servos. The Rainbow overlay checkbox and Brightness slider are
 * both hidden entirely below API 1.46 (`semver.gte(..., API_VERSION_1_46)`).
 * Every live color/mode/brightness change is additionally streamed to
 * the flight controller continuously as the user edits (not only on
 * Save), matching the pattern already documented for VTX Table/Servos
 * live mode.
 */

const htmlSource = makeConfiguratorSourceRef({
  title: 'Betaflight App — LED Strip tab',
  repoPath: 'src/tabs/led_strip.html',
  applicability: 'universal',
  officialId: 'led_strip',
});

const jsSource = makeConfiguratorSourceRef({
  title: 'Betaflight App — LED Strip tab behavior',
  repoPath: 'src/js/tabs/led_strip.js',
  applicability: 'universal',
  officialId: 'led_strip',
});

const gridFields: BfField[] = [
  {
    id: 'led-strip-grid',
    englishLabel: 'LED grid',
    arabicMeaning: 'شبكة تحديد مواضع LED',
    arabicExplanation: 'شبكة ثابتة العدد دائمًا (16×16 = 256 خلية) — حد بروتوكولي صارم يطابق تخطيط بتات MSP (4 بتات لإحداثي X و4 بتات لإحداثي Y)، وليس عددًا يبلّغ عنه الفيرموير. كل خلية تمثل موضعًا مكانيًا محتملًا لمصباح LED واحد على الطائرة، وتُختار الخلايا بالنقر أو بالتحديد المتعدد لتعيين وظيفة/تراكب/اتجاه/لون لها معًا.',
    group: 'grid',
    controlType: 'table',
    scope: 'universal',
    dependsOnFieldIds: ['led-strip-function', 'led-strip-overlays', 'led-strip-directions'],
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'led-strip-remaining-count',
    englishLabel: 'Remaining',
    arabicMeaning: 'عدد أرقام الترتيب السلكي المتبقية',
    arabicExplanation: 'النص الرسمي (ledStripRemainingText). عدّاد حي يعرض كم رقم ترتيب سلكي (wire order) لم يُستخدَم بعد من إجمالي عدد مصابيح LED القابلة للتهيئة (LED_MAX_STRIP_LENGTH، يعتمد على الفيرموير).',
    group: 'grid',
    controlType: 'status',
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'led-strip-clear-selected',
    englishLabel: 'Clear selected',
    arabicMeaning: 'مسح المحدد',
    arabicExplanation: 'النص الرسمي (ledStripClearSelectedButton). يمسح كل الإعدادات (وظيفة/تراكب/لون/اتجاه) عن خلايا الشبكة المحددة حاليًا فقط.',
    group: 'grid',
    controlType: 'button',
    scope: 'universal',
    safetyLevel: 'caution',
    requiresSave: true,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'led-strip-clear-all',
    englishLabel: 'Clear ALL',
    arabicMeaning: 'مسح الكل',
    arabicExplanation: 'النص الرسمي (ledStripClearAllButton). يمسح كل إعدادات جميع خلايا الشبكة الـ256 دفعة واحدة — إجراء غير قابل للتراجع محليًا قبل الحفظ.',
    group: 'grid',
    controlType: 'button',
    scope: 'universal',
    safetyLevel: 'warning',
    requiresSave: true,
    requiresReboot: false,
    source: htmlSource,
  },
];

const functionFields: BfField[] = [
  {
    id: 'led-strip-function',
    englishLabel: 'Function',
    arabicMeaning: 'وظيفة LED',
    arabicExplanation: 'قائمة اختيار حقيقية بـ11 خيارًا (تُطبَّق على الخلايا المحددة في الشبكة): None (بلا وظيفة)، Color (لون ثابت)، Modes & Orientation (يعتمد على وضع الطيران والاتجاه)، Arm State (حالة التسليح)، Battery (البطارية)، RSSI (قوة إشارة الاستقبال)، GPS، Ring (حلقة دوّارة)، GPS Bar (شريط GPS)، Battery Bar (شريط البطارية)، Altitude (الارتفاع).',
    group: 'function',
    controlType: 'select',
    range: { options: ['None', 'Color', 'Modes & Orientation', 'Arm State', 'Battery', 'RSSI', 'GPS', 'Ring', 'GPS Bar', 'Battery Bar', 'Altitude'] },
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: false,
    source: htmlSource,
  },
];

const colorModifierFields: BfField[] = [
  {
    id: 'led-strip-throttle-hue',
    englishLabel: 'Color modifier — ThrottleHue',
    arabicMeaning: 'معدّل اللون بحسب قناة تحكم',
    arabicExplanation: 'مربع اختيار مع قائمة اختيار فرعية لمحور التحكم (Roll/Pitch/Yaw/Throttle/AUX1–AUX8) — يُعدِّل تدرج اللون (Hue) حيًا بحسب قيمة المحور المختار، الافتراضي Throttle.',
    group: 'color-modifier',
    controlType: 'select',
    range: { options: ['Roll', 'Pitch', 'Yaw', 'Throttle', 'AUX1', 'AUX2', 'AUX3', 'AUX4', 'AUX5', 'AUX6', 'AUX7', 'AUX8'], default: 'Throttle' },
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'led-strip-larson-scanner',
    englishLabel: 'Larson scanner',
    arabicMeaning: 'ماسح لارسون',
    arabicExplanation: 'النص الرسمي (ledStripLarsonOverlay). تأثير مسح ضوئي متحرك ذهابًا وإيابًا. غير متوافق مع "Blink always" — تفعيل أحدهما يُعطِّل الآخر تلقائيًا (كلاهما لا يعملان بشكل صحيح في نفس الوقت وفق تعليق رسمي في الكود).',
    group: 'color-modifier',
    controlType: 'toggle',
    scope: 'universal',
    conditionNote: 'يُعطِّل "Blink always" تلقائيًا عند تفعيله، والعكس صحيح — لا يمكن تفعيل الاثنين معًا.',
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'led-strip-blink-always',
    englishLabel: 'Blink always',
    arabicMeaning: 'وميض دائم',
    arabicExplanation: 'النص الرسمي (ledStripBlinkAlwaysOverlay). وميض دائم لمصابيح LED المحددة. غير متوافق مع "Larson scanner" — تفعيل أحدهما يُعطِّل الآخر تلقائيًا.',
    group: 'color-modifier',
    controlType: 'toggle',
    scope: 'universal',
    conditionNote: 'يُعطِّل "Larson scanner" تلقائيًا عند تفعيله، والعكس صحيح — لا يمكن تفعيل الاثنين معًا.',
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'led-strip-rainbow',
    englishLabel: 'Rainbow',
    arabicMeaning: 'تأثير قوس قزح',
    arabicExplanation: 'النص الرسمي (ledStripRainbowOverlay). عند التفعيل يظهر منزلقان إضافيان: Delta (فرق تدرج اللون بين كل مصباح LED والذي يليه) وFrequency (سرعة تغيّر اللون).',
    group: 'color-modifier',
    controlType: 'toggle',
    scope: 'version-dependent',
    conditionNote: 'يظهر فقط عند إصدار API ≥ 1.46 — مخفي بالكامل قبل ذلك.',
    dependsOnFieldIds: ['led-strip-rainbow-delta', 'led-strip-rainbow-frequency'],
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'led-strip-rainbow-delta',
    englishLabel: 'Delta',
    arabicMeaning: 'فرق تدرج اللون (Rainbow)',
    arabicExplanation: 'النص الرسمي (ledStripRainbowDeltaSliderHelp): فرق تدرج اللون (Hue) بين كل مصباح LED والذي يليه. منزلق حي بالمجال 0–359.',
    group: 'color-modifier',
    controlType: 'number',
    range: { min: 0, max: 359 },
    scope: 'feature-dependent',
    conditionNote: 'يظهر فقط عند تفعيل خيار Rainbow (وبالتالي API ≥ 1.46).',
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'led-strip-rainbow-frequency',
    englishLabel: 'Frequency',
    arabicMeaning: 'سرعة تأثير قوس قزح',
    arabicExplanation: 'النص الرسمي (ledStripRainbowFreqSliderHelp): سرعة تغيّر اللون — أي معدل تكرار التأثير. منزلق حي بالمجال 1–360.',
    group: 'color-modifier',
    controlType: 'number',
    range: { min: 1, max: 360 },
    scope: 'feature-dependent',
    conditionNote: 'يظهر فقط عند تفعيل خيار Rainbow (وبالتالي API ≥ 1.46).',
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: false,
    source: htmlSource,
  },
];

const overlayFields: BfField[] = [
  {
    id: 'led-strip-overlays',
    englishLabel: 'Overlay — Warnings / Indicator / VTX',
    arabicMeaning: 'التراكبات (Overlays)',
    arabicExplanation: 'ثلاثة مربعات اختيار مستقلة قابلة للتفعيل معًا: Warnings (النص الرسمي ledStripWarningsOverlay — تحذيرات)، Indicator (النص الرسمي: يستخدم الموضع على المصفوفة — ledStripIndecatorOverlay)، VTX (النص الرسمي: يستخدم تردد VTX لتحديد اللون — ledStripVtxOverlay).',
    group: 'overlay',
    controlType: 'toggle',
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: false,
    source: htmlSource,
  },
];

const modeColorsFields: BfField[] = [
  {
    id: 'led-strip-mode-colors-mode-select',
    englishLabel: 'Mode colors — mode select',
    arabicMeaning: 'اختيار الوضع لألوان الأوضاع',
    arabicExplanation: 'قائمة اختيار حقيقية بـ6 أوضاع طيران: Orientation، Headfree، Horizon، Angle، Mag، Baro — لكل وضع تُعيَّن ألوان منفصلة لكل اتجاه من الاتجاهات الستة (شمال/شرق/جنوب/غرب/أعلى/أسفل).',
    group: 'mode-colors',
    controlType: 'select',
    range: { options: ['Orientation', 'Headfree', 'Horizon', 'Angle', 'Mag', 'Baro'] },
    scope: 'universal',
    dependsOnFieldIds: ['led-strip-mode-colors-table'],
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'led-strip-mode-colors-table',
    englishLabel: 'N / E / S / W / U / D color buttons',
    arabicMeaning: 'ألوان الاتجاهات الستة لكل وضع',
    arabicExplanation: 'جدول من 6 أزرار لون (شمال N، شرق E، جنوب S، غرب W، أعلى U، أسفل D) لكل وضع من أوضاع الطيران الستة المذكورة أعلاه — إجمالي 36 خانة لون قابلة للتعديل (6 أوضاع × 6 اتجاهات). يُختار اللون بالنقر المزدوج لفتح منزلقات H/S/V.',
    group: 'mode-colors',
    controlType: 'table',
    scope: 'universal',
    conditionNote: 'يعرض ألوان الوضع المختار حاليًا من قائمة اختيار الوضع أعلاه فقط.',
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: false,
    source: htmlSource,
  },
];

const orientationFields: BfField[] = [
  {
    id: 'led-strip-directions',
    englishLabel: 'N / E / S / W / U / D',
    arabicMeaning: 'اتجاه مصباح LED',
    arabicExplanation: 'النص الرسمي (ledStripModesOrientationTitle = "LED Orientation (\'Modes & Orientation\') and Color"). 6 أزرار اتجاه حقيقية (شمال، شرق، جنوب، غرب، أعلى، أسفل) تُطبَّق على خلايا الشبكة المحددة — تحدد الاتجاه الفعلي الذي يُشير إليه مصباح LED فعليًا على جسم الطائرة، وتُستخدَم مع وظيفة Modes & Orientation لتحديد أي لون يُعرَض بحسب اتجاه/وضع الطائرة الحالي.',
    group: 'orientation',
    controlType: 'toggle',
    scope: 'feature-dependent',
    conditionNote: 'ذو معنى فعلي فقط مع وظيفة Modes & Orientation.',
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: false,
    source: htmlSource,
  },
];

const colorPaletteFields: BfField[] = [
  {
    id: 'led-strip-color-hsv-sliders',
    englishLabel: 'H / S / V sliders',
    arabicMeaning: 'منزلقات تحديد اللون (H/S/V)',
    arabicExplanation: 'النص الرسمي (ledStripColorSetupTitle = "Color setup"). ثلاثة منزلقات: H (تدرج اللون Hue، المجال 0–359)، S (التشبع Saturation، المجال 0–255)، V (السطوع Value، المجال 0–255) — تُستخدَم لتحرير أي من الألوان الـ16 الثابتة أدناه عبر النقر المزدوج.',
    group: 'color-palette',
    controlType: 'number',
    range: { min: 0, max: 359 },
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'led-strip-color-slots',
    englishLabel: 'Color palette (0–15)',
    arabicMeaning: 'لوحة الألوان الثابتة (16 خانة)',
    arabicExplanation: '16 خانة لون ثابتة العدد (color-0 إلى color-15)، كل خانة قابلة للتعديل عبر منزلقات H/S/V أعلاه بالنقر المزدوج. القيم الافتراضية الحقيقية للخانات الأولى: أسود، أبيض، أحمر، برتقالي، أصفر، أخضر ليموني، أخضر، أخضر نعناعي، سماوي، أزرق فاتح، أزرق، بنفسجي داكن، أرجواني، وردي غامق، أسود، أسود.',
    group: 'color-palette',
    controlType: 'table',
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: false,
    source: htmlSource,
  },
];

const specialColorsFields: BfField[] = [
  {
    id: 'led-strip-gps-mode-select',
    englishLabel: 'GPS mode select — Default / Bar',
    arabicMeaning: 'نمط عرض GPS الخاص',
    arabicExplanation: 'قائمة اختيار بخيارين حقيقيين فقط: Default و Bar — تحدد طريقة عرض حالة GPS ضمن الألوان الخاصة أدناه.',
    group: 'special-colors',
    controlType: 'select',
    range: { options: ['Default', 'Bar'] },
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'led-strip-special-colors-buttons',
    englishLabel: 'Disarmed / Armed / Animation / Blink background / GPS: no sats / GPS: no lock / GPS: locked',
    arabicMeaning: 'الألوان الخاصة الثابتة',
    arabicExplanation: 'النص الرسمي (ledStripModesSpecialColorsTitle = "Special colors"). 7 أزرار لون ثابتة بمعانٍ خاصة: Disarmed (عدم التسليح، افتراضي أخضر)، Armed (التسليح، افتراضي أزرق)، Animation (افتراضي أبيض)، Blink background (خلفية الوميض، افتراضي أسود)، GPS: no sats (لا توجد أقمار صناعية، افتراضي أحمر)، GPS: no lock (لا يوجد قفل، افتراضي برتقالي)، GPS: locked (تم القفل، افتراضي أخضر).',
    group: 'special-colors',
    controlType: 'table',
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: false,
    source: htmlSource,
  },
];

const brightnessFields: BfField[] = [
  {
    id: 'led-strip-brightness',
    englishLabel: 'Brightness',
    arabicMeaning: 'السطوع الأقصى',
    arabicExplanation: 'النص الرسمي (ledStripBrightnessSliderHelp): النسبة المئوية القصوى لسطوع مصابيح LED. منزلق حي بالمجال الحقيقي 5–100٪.',
    group: 'brightness',
    controlType: 'number',
    range: { min: 5, max: 100, unit: '%' },
    scope: 'version-dependent',
    conditionNote: 'يظهر فقط عند إصدار API ≥ 1.46 — مخفي بالكامل قبل ذلك.',
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: false,
    source: htmlSource,
  },
];

const wiringFields: BfField[] = [
  {
    id: 'led-strip-wiring-mode',
    englishLabel: 'Wire Ordering Mode',
    arabicMeaning: 'وضع ترتيب الأسلاك',
    arabicExplanation: 'النص الرسمي (ledStripWiringMode). زر تبديل يُدخِل الشبكة في وضع منفصل تمامًا عن التحديد المكاني — في هذا الوضع، النقر على خلايا الشبكة يُعيّن لها رقم الترتيب السلكي الفعلي (الترتيب الذي تتصل به مصابيح LED فعليًا على السلك الواحد)، وهو مفهوم مختلف تمامًا عن الموضع المكاني على الشبكة.',
    group: 'wiring',
    controlType: 'toggle',
    scope: 'universal',
    dependsOnFieldIds: ['led-strip-wiring-clear-selected', 'led-strip-wiring-clear-all'],
    safetyLevel: 'warning',
    requiresSave: true,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'led-strip-wiring-clear-selected',
    englishLabel: 'Clear selected',
    arabicMeaning: 'مسح الترتيب السلكي المحدد',
    arabicExplanation: 'النص الرسمي (ledStripWiringClearControl). يمسح رقم الترتيب السلكي عن الخلايا المحددة فقط ضمن وضع ترتيب الأسلاك.',
    group: 'wiring',
    controlType: 'button',
    scope: 'feature-dependent',
    conditionNote: 'ذو معنى فقط ضمن وضع ترتيب الأسلاك.',
    safetyLevel: 'caution',
    requiresSave: true,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'led-strip-wiring-clear-all',
    englishLabel: 'Clear ALL Wiring',
    arabicMeaning: 'مسح كل الترتيب السلكي',
    arabicExplanation: 'النص الرسمي (ledStripWiringClearAllControl). يمسح رقم الترتيب السلكي عن كل الخلايا الـ256 دفعة واحدة.',
    group: 'wiring',
    controlType: 'button',
    scope: 'universal',
    safetyLevel: 'warning',
    requiresSave: true,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'led-strip-wiring-message',
    englishLabel: 'LEDs without wire ordering number will not be saved.',
    arabicMeaning: 'تنبيه: لن تُحفَظ المصابيح بلا رقم ترتيب سلكي',
    arabicExplanation: 'النص الرسمي (ledStripWiringMessage) — تحذير ثابت: أي مصباح LED على الشبكة دون رقم ترتيب سلكي مُعيَّن لن يُحفَظ عند الضغط على "حفظ".',
    group: 'wiring',
    controlType: 'status',
    scope: 'universal',
    safetyLevel: 'warning',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
];

const pageActionFields: BfField[] = [
  {
    id: 'led-strip-save',
    englishLabel: 'Save',
    arabicMeaning: 'حفظ',
    arabicExplanation: 'يرسل تهيئة كل LED وألوان الأوضاع والألوان الخاصة (MSP2_SET_LED_STRIP_CONFIG_VALUES وما شابهها)، ثم يستدعي `writeConfiguration(false, ...)` — أي حفظ EEPROM بدون إعادة تشغيل. أي مصباح بلا رقم ترتيب سلكي لن يُحفَظ.',
    group: 'page-actions',
    controlType: 'action',
    scope: 'universal',
    safetyLevel: 'warning',
    requiresSave: true,
    requiresReboot: false,
    source: jsSource,
  },
];

export const ledStripPage: BfPage = {
  id: 'led-strip',
  officialId: 'led_strip',
  officialTitle: 'LED Strip',
  titleAr: 'شريط الإضاءة',
  officialOrder: 22,
  summaryAr: 'تخصيص وظيفة وتراكب ولون واتجاه كل مصباح LED على شبكة مكانية ثابتة (16×16)، مع محرر ترتيب سلكي منفصل، وألوان أوضاع/ألوان خاصة، وتأثيرات (قوس قزح/وميض/ماسح لارسون)، وسطوع أقصى — التعديلات المباشرة تُرسَل حيًا للطائرة، والحفظ لا يتطلب إعادة تشغيل.',
  connectionState: 'connected',
  contentStatus: 'reviewed',
  firmwareVersionRange: BF_VERSION_CONTEXT.releaseLine,
  appVersionRange: BF_VERSION_CONTEXT.releaseLine,
  reviewedAt: BF_VERSION_CONTEXT.reviewedAt,
  source: htmlSource,
  expertRequired: false,
  scope: 'feature-dependent',
  conditionNote: 'يظهر فقط إذا كانت نسخة الفيرموير المبنية تتضمن ميزة LED_STRIP.',
  safetyLevel: 'informational',
  glossaryTermIds: [],
  relatedPageIds: ['ports', 'vtx'],
  groups: [
    { id: 'grid', officialTitle: 'LED grid', titleAr: 'الشبكة المكانية', level: 'advanced', order: 1, fields: gridFields },
    { id: 'function', officialTitle: 'Function', titleAr: 'الوظيفة', level: 'basic', order: 2, fields: functionFields },
    { id: 'color-modifier', officialTitle: 'Color modifier', titleAr: 'معدّلات اللون', level: 'advanced', order: 3, fields: colorModifierFields },
    { id: 'overlay', officialTitle: 'Overlay', titleAr: 'التراكبات', level: 'advanced', order: 4, fields: overlayFields },
    { id: 'mode-colors', officialTitle: 'Mode colors', titleAr: 'ألوان الأوضاع', level: 'advanced', order: 5, fields: modeColorsFields },
    { id: 'orientation', officialTitle: "LED Orientation ('Modes & Orientation') and Color", titleAr: 'الاتجاه', level: 'advanced', order: 6, fields: orientationFields },
    { id: 'color-palette', officialTitle: 'Color setup', titleAr: 'لوحة الألوان', level: 'basic', order: 7, fields: colorPaletteFields },
    { id: 'special-colors', officialTitle: 'Special colors', titleAr: 'الألوان الخاصة', level: 'advanced', order: 8, fields: specialColorsFields },
    { id: 'brightness', officialTitle: 'Brightness', titleAr: 'السطوع', level: 'basic', order: 9, fields: brightnessFields },
    { id: 'wiring', officialTitle: 'LED Strip Wiring', titleAr: 'الترتيب السلكي', level: 'advanced', order: 10, fields: wiringFields },
    { id: 'page-actions', titleAr: 'إجراءات الصفحة', level: 'basic', order: 11, fields: pageActionFields },
  ],
};
