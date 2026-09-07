import type { BfPage, BfField } from '../types';
import { makeConfiguratorSourceRef } from '../sourceHelpers';
import { BF_VERSION_CONTEXT } from '../sourceHelpers';

/**
 * Final authored companion page — Firmware Flasher. Verified against the
 * cloned Configurator source (tag 2025.12.2):
 *   - src/tabs/firmware_flasher.html (329 lines — options table, build
 *     configuration box, release-info box, warning box, recovery box,
 *     bottom toolbar, three dialogs)
 *   - src/js/tabs/firmware_flasher.js (1704 lines — target/version
 *     loading, cloud-build request/poll loop, local/online firmware
 *     loading, flashing dispatch to serial/DFU, backup flow, dialogs)
 *   - src/js/utils/AutoDetect.js (210 lines — "Detect" board-verification
 *     flow over a real serial MSP handshake)
 *   - src/js/protocols/webstm32.js / webusbdfu.js (serial and USB DFU
 *     flashing state machines — erase/flash/verify status text)
 *   - locales/en/messages.json (every English label/warning/status string
 *     below, verbatim)
 *
 * This is the page connected users see BEFORE connecting to a flight
 * controller — it is the only "قبل الاتصال" page with real reviewed
 * content; the other three (Welcome, Privacy Policy, Options,
 * Documentation & Support) are deliberately out of scope for this
 * companion app and stay `not-started` (and hidden from the live hub —
 * see BetaflightHubRenderer.tsx's HUB_HIDDEN_IDS).
 *
 * Deliberate scope decisions:
 *   - "Load Firmware [Local]" accepts real files up to the Configurator's
 *     own two extensions (.hex, .uf2) — verified in `getExtension`/
 *     `processFile` (firmware_flasher.js:252-275) and the file-picker
 *     filter in `firmware_flasher.js:969-972`. No other format is modeled.
 *   - The bottom progress/status label (`span.progressLabel`) is one real
 *     UI element that assumes many different text states depending on
 *     what is happening (idle / loading / flashing / erasing / verifying
 *     / success / failure). It is modeled here as ONE status field
 *     (`flash-progress-status`) whose Arabic explanation enumerates the
 *     real English strings verbatim, rather than as dozens of fabricated
 *     separate "fields" for text that is really one element in the app.
 *   - A real, non-obvious, verified behavior: in the OPTIONS table,
 *     "Full chip erase" is only a VISIBLE, user-controllable checkbox in
 *     Expert Mode (`tr.expertOptions`). In normal (non-expert) mode the
 *     checkbox is hidden, but `flashHexFirmware()` still forces
 *     `options.erase_chip = true` whenever `expertMode_e.is(":not(:checked)")`
 *     (firmware_flasher.js:834) — i.e. a full chip erase happens on EVERY
 *     flash for a non-expert user, invisibly. This is stated explicitly
 *     in the field's Arabic explanation because it directly contradicts
 *     the intuitive assumption that an unchecked/hidden box means "off."
 *   - Cloud Build (`detail.cloudBuild === true`) build-configuration
 *     controls (radio/telemetry/OSD/motor protocol, other options, custom
 *     defines, PR/commit selection) only render for targets whose loaded
 *     release actually supports Cloud Build — this is real,
 *     target-and-release-dependent, not a universal set of options for
 *     every board.
 */

const htmlSource = makeConfiguratorSourceRef({
  title: 'Betaflight App — Firmware Flasher tab',
  repoPath: 'src/tabs/firmware_flasher.html',
  applicability: 'universal',
  officialId: 'firmware_flasher',
});

const jsSource = makeConfiguratorSourceRef({
  title: 'Betaflight App — Firmware Flasher tab behavior',
  repoPath: 'src/js/tabs/firmware_flasher.js',
  applicability: 'universal',
  officialId: 'firmware_flasher',
});

const autoDetectSource = makeConfiguratorSourceRef({
  title: 'Betaflight App — board auto-detection (Detect button)',
  repoPath: 'src/js/utils/AutoDetect.js',
  applicability: 'universal',
  officialId: 'firmware_flasher',
});

const stm32Source = makeConfiguratorSourceRef({
  title: 'Betaflight App — serial (STM32) flashing protocol',
  repoPath: 'src/js/protocols/webstm32.js',
  applicability: 'hardware-dependent',
  officialId: 'firmware_flasher',
});

const dfuSource = makeConfiguratorSourceRef({
  title: 'Betaflight App — USB DFU flashing protocol',
  repoPath: 'src/js/protocols/webusbdfu.js',
  applicability: 'hardware-dependent',
  officialId: 'firmware_flasher',
});

const warningFields: BfField[] = [
  {
    id: 'general-warning-notice',
    englishLabel: 'Warning',
    arabicMeaning: 'تحذير عام قبل الفلاش',
    arabicExplanation: 'النص الرسمي الكامل (firmwareFlasherWarningText) بالحرف: "Please do not try to flash non-Betaflight hardware with this firmware flasher. Do not disconnect the board or turn off your computer while flashing. Note: STM32 bootloader is stored in ROM, it cannot be bricked. Note: Auto-Connect is always disabled while you are inside firmware flasher. Note: Make sure you have a backup; some upgrades/downgrades will wipe your configuration. Note: If you have problems flashing try disconnecting all cables from your FC first, try rebooting, upgrade drivers. Note: When flashing boards that have directly connected USB sockets (most newer boards) ensure you have read the USB Flashing section of the Betaflight manual and have the correct software and drivers installed." — أي: لا تحاول فلاش عتاد غير مخصص لـ Betaflight بهذه الأداة. لا تفصل الطائرة أو تُطفئ الحاسوب أثناء الفلاش. الملاحظات المهمة: bootloader شريحة STM32 مخزّن في ذاكرة ROM فلا يمكن "تكسيره" (bricking) بالكامل عادةً؛ الاتصال التلقائي (Auto-Connect) مُعطَّل دائمًا داخل هذا التبويب؛ تأكد من وجود نسخة احتياطية لأن بعض الترقيات/التنزيلات تمسح الإعدادات؛ عند وجود مشاكل جرّب فصل كل الكابلات ثم إعادة المحاولة أو تحديث التعريفات (drivers)؛ اللوحات ذات منفذ USB مباشر تحتاج قراءة قسم USB Flashing في دليل Betaflight الرسمي.',
    group: 'warnings',
    controlType: 'status',
    scope: 'universal',
    safetyLevel: 'critical',
    beginnerGuidance: 'لا تقطع الاتصال أو تُطفئ جهازك أثناء عملية الفلاش مهما حصل، وتأكد من أخذ نسخة احتياطية من إعداداتك قبل البدء.',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'target-mismatch-warning',
    englishLabel: 'IMPORTANT: target warning',
    arabicMeaning: 'تحذير: يجب اختيار الهدف (Target) الصحيح',
    arabicExplanation: 'النص الرسمي (firmwareFlasherTargetWarning) بالحرف: "IMPORTANT: Ensure you flash a file appropriate for your target. Flashing a binary for the wrong target can cause bad things to happen." — أي: يجب التأكد من فلاش ملف مناسب لهدفك (Target/لوحتك) بالتحديد؛ فلاش ملف مخصص للوحة خاطئة قد يسبب أضرارًا حقيقية (توقف الطائرة عن العمل، عدم استجابة، سلوك غير متوقع).',
    group: 'warnings',
    controlType: 'status',
    scope: 'universal',
    safetyLevel: 'critical',
    beginnerGuidance: 'تأكد من نوع لوحتك (Target) بدقة قبل اختياره — استخدم زر "Detect" إن أمكن بدلًا من التخمين.',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
];

const optionsFields: BfField[] = [
  {
    id: 'expert-mode-toggle',
    englishLabel: 'Enable Expert Mode',
    arabicMeaning: 'تفعيل وضع الخبير',
    arabicExplanation: 'النص الرسمي (expertModeDescription): "Enable Expert Mode options" — يُظهر تحكمات إضافية متقدمة في هذا التبويب (مثل التحكم الفعلي بخيار Full chip erase، وخيارات Cloud Build المتقدمة، وقائمة أنواع البناء Release Candidate/Development). بدون هذا الوضع تبقى هذه التحكمات مخفية.',
    group: 'options',
    controlType: 'toggle',
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'show-development-releases-toggle',
    englishLabel: 'Show release candidates',
    arabicMeaning: 'إظهار إصدارات تجريبية (Release Candidate)',
    arabicExplanation: 'النص الرسمي (firmwareFlasherShowDevelopmentReleasesDescription): "Show release candidates in addition to stable releases" — يُظهر إصدارات Release Candidate بجانب الإصدارات المستقرة (Stable) في قائمة نوع البناء. إصدار Development الكامل لا يظهر إلا مع تفعيل وضع الخبير أيضًا.',
    group: 'options',
    controlType: 'toggle',
    scope: 'universal',
    safetyLevel: 'informational',
    dependsOnFieldIds: ['expert-mode-toggle'],
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'build-type-select',
    englishLabel: 'Build type (Release / Release And Release Candidate / Development)',
    arabicMeaning: 'نوع البناء',
    arabicExplanation: 'النص الرسمي (firmwareFlasherOnlineSelectBuildType): "Select build type to see available boards." — ثلاثة خيارات فعلية في المصدر: "Release" (المستقر فقط، الخيار الافتراضي)، "Release And Release Candidate" (يظهر فقط عند تفعيل "إظهار إصدارات تجريبية")، و"Development" (يظهر فقط عند تفعيل وضع الخبير أيضًا). اختيار نوع بناء تجريبي (Development) يُظهر لاحقًا حوار تحذير إلزامي قبل أي فلاش فعلي.',
    group: 'options',
    controlType: 'select',
    range: { options: ['Release', 'Release And Release Candidate', 'Development'], default: 'Release' },
    scope: 'expert-only',
    conditionNote: 'خياران من الثلاثة (Release And Release Candidate، Development) لا يظهران إلا بتفعيل "إظهار إصدارات تجريبية"، وخيار Development تحديدًا يتطلب وضع الخبير أيضًا.',
    safetyLevel: 'warning',
    beginnerGuidance: 'ابقَ على "Release" ما لم تكن تعرف تحديدًا لماذا تحتاج إصدارًا تجريبيًا.',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'board-select',
    englishLabel: 'Board (Target) selection',
    arabicMeaning: 'اختيار اللوحة (Target)',
    arabicExplanation: 'النص الرسمي (firmwareFlasherOnlineSelectBoardDescription): "Select or detect your board to see available online firmware releases - Select the correct firmware appropriate for your board." — قائمة الأهداف (Targets) الرسمية، مقسّمة فعليًا في المصدر إلى ثلاث مجموعات: "Verified Partner" و"Vendor / Community" و"Legacy". هذا هو الحقل الأهم في الصفحة كاملة: اختيار هدف خاطئ يُحمَّل معه ملف فيرموير غير مخصص للوحتك.',
    group: 'options',
    controlType: 'select',
    scope: 'hardware-dependent',
    conditionNote: 'قائمة الأهداف الفعلية تُحمَّل ديناميكيًا من خادم Betaflight الرسمي حسب نوع البناء المختار؛ لا توجد قائمة أهداف ثابتة مضمَّنة في هذا التطبيق.',
    safetyLevel: 'critical',
    beginnerGuidance: 'إن لم تكن متأكدًا من اسم لوحتك بدقة، استخدم زر "Detect" أدناه بدلًا من التخمين.',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'detect-board-button',
    englishLabel: 'Detect',
    arabicMeaning: 'اكتشاف اللوحة تلقائيًا',
    arabicExplanation: 'النص الرسمي (firmwareFlasherDetectBoardQuery: "Query board information to preselect right firmware"): يفتح اتصالًا تسلسليًا (Serial) حقيقيًا مؤقتًا بالطائرة المتصلة فعليًا، ويستعلم معلومات اللوحة عبر بروتوكول MSP لتحديد اللوحة الصحيحة تلقائيًا وضبط قائمة "اختيار اللوحة" عليها. عند النجاح تظهر الرسالة الرسمية (firmwareFlasherBoardVerificationSuccess): "App has successfully detected and verified the board: {boardName}". عند الفشل تظهر (firmwareFlasherBoardVerificationFail): "The App failed to verify the board. If this persists, try switching tabs and retry, reconnect the USB, or connect first if you might have forgotten to apply custom defaults."',
    group: 'options',
    controlType: 'action',
    scope: 'hardware-dependent',
    conditionNote: 'يتطلب طائرة موصولة فعليًا عبر منفذ تسلسلي (Serial) صالح؛ لا يعمل عبر DFU.',
    safetyLevel: 'warning',
    dependsOnFieldIds: ['board-select'],
    requiresSave: false,
    requiresReboot: false,
    source: autoDetectSource,
  },
  {
    id: 'firmware-version-select',
    englishLabel: 'Firmware version selection',
    arabicMeaning: 'اختيار إصدار الفيرموير',
    arabicExplanation: 'النص الرسمي (firmwareFlasherOnlineSelectFirmwareVersionDescription): "Select firmware version for your board." — قائمة الإصدارات المتاحة فعليًا للهدف المختار، مرتّبة من الأحدث، مع تفعيل تلقائي لأحدث إصدار مستقر افتراضيًا. الإصدارات المعروضة تتغيّر حسب نوع البناء المختار (Release/RC/Development).',
    group: 'options',
    controlType: 'select',
    scope: 'hardware-dependent',
    conditionNote: 'قائمة الإصدارات فعليًا مرتبطة باللوحة المختارة تحديدًا ولا تظهر قبل اختيار لوحة صالحة.',
    safetyLevel: 'warning',
    dependsOnFieldIds: ['board-select'],
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'no-reboot-toggle',
    englishLabel: 'No reboot sequence',
    arabicMeaning: 'بدون تسلسل إعادة تشغيل',
    arabicExplanation: 'النص الرسمي (firmwareFlasherNoRebootDescription): "Enable if your FC is in boot mode. i.e. if you powered on your FC with the bootloader pins jumped or whilst holding your FC\'s BOOT button." — يُستخدم فقط عندما تكون الطائرة موصولة أصلًا وهي في وضع bootloader (bootmode) فعليًا، أي بعد تشغيلها ويدا الطرف boot موصولان أو زر BOOT مضغوط.',
    group: 'options',
    controlType: 'toggle',
    scope: 'expert-only',
    conditionNote: 'يظهر فقط في وضع الخبير، ويُستخدم فقط عندما تكون اللوحة بالفعل في وضع bootloader.',
    safetyLevel: 'warning',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'flash-on-connect-toggle',
    englishLabel: 'Flash on connect',
    arabicMeaning: 'فلاش تلقائي عند الاتصال',
    arabicExplanation: 'النص الرسمي الكامل (firmwareFlasherFlashOnConnectDescription): "Attempt to flash the board automatically (triggered by newly detected serial port). WARNING: this function disables the detect and backup features." — يبدأ الفلاش تلقائيًا فور اكتشاف منفذ تسلسلي جديد، بدون أي نافذة تأكيد يدوي، ويُعطِّل صراحةً ميزتي الاكتشاف والنسخ الاحتياطي أثناء ذلك.',
    group: 'options',
    controlType: 'toggle',
    scope: 'expert-only',
    conditionNote: 'يظهر فقط عند تفعيل "بدون تسلسل إعادة تشغيل" في وضع الخبير.',
    safetyLevel: 'critical',
    beginnerGuidance: 'لا تُفعِّل هذا الخيار إلا إذا فهمت تمامًا أنه يفلش فورًا دون تأكيد ودون نسخة احتياطية.',
    dependsOnFieldIds: ['no-reboot-toggle'],
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'full-chip-erase-toggle',
    englishLabel: 'Full chip erase',
    arabicMeaning: 'مسح كامل للشريحة',
    arabicExplanation: 'النص الرسمي (firmwareFlasherFullChipEraseDescription): "Wipes all configuration data currently stored on the board." — يمسح كل بيانات الإعداد المخزَّنة على اللوحة بالكامل. حقيقة مهمة وغير بديهية موثّقة في الكود المصدري: هذا المربع مرئي وقابل للتحكم فقط في وضع الخبير؛ في الوضع العادي (غير الخبير) يبقى المربع مخفيًا لكن المسح الكامل يُنفَّذ تلقائيًا وإجباريًا مع كل عملية فلاش، بصرف النظر عن أي شيء — أي أن عدم رؤية الخيار لا يعني أنه معطَّل.',
    group: 'options',
    controlType: 'toggle',
    scope: 'expert-only',
    conditionNote: 'المربع نفسه مرئي فقط في وضع الخبير؛ لكن في الوضع العادي يُنفَّذ المسح الكامل تلقائيًا مع كل فلاش دون أي مربع مرئي.',
    safetyLevel: 'critical',
    beginnerGuidance: 'لا تخلط بين "عدم ظهور الخيار" و"عدم حدوث المسح" — في الوضع العادي يحدث المسح الكامل دائمًا.',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'manual-baud-rate-toggle',
    englishLabel: 'Manual baud rate',
    arabicMeaning: 'معدّل نقل يدوي (Baud Rate)',
    arabicExplanation: 'النص الرسمي الكامل (firmwareFlasherManualBaudDescription): "Manual selection of baud rate for boards that don\'t support the default speed or for flashing via bluetooth. Note: Not used when flashing via USB DFU" — يتيح اختيار معدّل نقل يدوي من قائمة قيم ثابتة حقيقية من المصدر: 921600، 460800، 256000 (الافتراضي)، 230400، 115200، 57600، 38400، 28800، 19200. يُستخدم فقط عند الفلاش عبر منفذ تسلسلي (Serial/Bluetooth)، ولا يُستخدم إطلاقًا عند الفلاش عبر USB DFU.',
    group: 'options',
    controlType: 'toggle',
    range: { options: ['921600', '460800', '256000', '230400', '115200', '57600', '38400', '28800', '19200'], default: '256000' },
    scope: 'expert-only',
    conditionNote: 'يظهر فقط في وضع الخبير، ولا يُستخدم عند الفلاش عبر USB DFU.',
    safetyLevel: 'warning',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
];

const buildConfigurationFields: BfField[] = [
  {
    id: 'core-build-mode-toggle',
    englishLabel: 'Core Only',
    arabicMeaning: 'بناء أساسي فقط (Core Only)',
    arabicExplanation: 'النص الرسمي الكامل (coreBuildModeDescription): "This option builds a firmware that contains the hardware drivers (and some limited features). It is available to assist in the detection of the hardware on a flight controller, and is provided for that convenience only. Not all features will be available (only hardware) using this option." — يبني نسخة فيرموير محدودة تحتوي فقط على مشغّلات العتاد (drivers) لغرض اكتشاف العتاد، وليس للاستخدام الطبيعي إذ لا تتوفر معظم الميزات فيها.',
    group: 'build-configuration',
    controlType: 'toggle',
    scope: 'feature-dependent',
    conditionNote: 'يظهر فقط لأهداف تدعم Cloud Build.',
    safetyLevel: 'warning',
    beginnerGuidance: 'لا تستخدم هذا الخيار للطيران الفعلي — هو لغرض اكتشاف العتاد فقط.',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'radio-protocol-select',
    englishLabel: 'Radio Protocol',
    arabicMeaning: 'بروتوكول الراديو المُضمَّن في البناء',
    arabicExplanation: 'النص الرسمي (firmwareFlasherRadioProtocolDescription): "Select the radio protocol you would like included in this build. Note this is a drop down, but only one item may be selected." — يحدد بروتوكول استقبال الراديو (مثل CRSF أو غيره) الذي سيُضمَّن في هذا البناء السحابي (Cloud Build)، وهو خيار مفرد رغم شكل القائمة.',
    group: 'build-configuration',
    controlType: 'select',
    scope: 'feature-dependent',
    conditionNote: 'يظهر فقط لأهداف Cloud Build في وضع البناء الكامل (ليس Core Only).',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'telemetry-protocol-select',
    englishLabel: 'Telemetry Protocol',
    arabicMeaning: 'بروتوكول القياس عن بُعد (Telemetry)',
    arabicExplanation: 'النص الرسمي الكامل (firmwareFlasherTelemetryProtocolDescription): "Select the telemetry protocol you would like included in this build. Note this is a drop down, but only one item may be selected. There are also some telemetry protocols that will be enabled, regardless of your selection here based on the radio protocol selected, e.g. CRSF." — بعض بروتوكولات الراديو (مثل CRSF وFPORT وGHST وJETIEXBUS) تُفعِّل تلقائيًا قياسها عن بُعد بغض النظر عن هذا الاختيار، وعندها تُعطَّل هذه القائمة وتظهر القيمة "Automatically Included".',
    group: 'build-configuration',
    controlType: 'select',
    scope: 'feature-dependent',
    conditionNote: 'يُعطَّل تلقائيًا (ويظهر "Automatically Included") إذا كان بروتوكول الراديو المختار من النوع الذي يُفعِّل القياس عن بُعد افتراضيًا.',
    safetyLevel: 'informational',
    dependsOnFieldIds: ['radio-protocol-select'],
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'osd-protocol-select',
    englishLabel: 'OSD Protocol',
    arabicMeaning: 'بروتوكول عرض المعلومات على الشاشة (OSD)',
    arabicExplanation: 'النص الرسمي (firmwareFlasherOsdProtocolDescription): "Select the OSD protocol you would like included in this build. Note this is a drop down, but only one item may be selected." — يحدد بروتوكول OSD المُضمَّن في هذا البناء السحابي، مع خيار "None" كخيار أول حقيقي في القائمة.',
    group: 'build-configuration',
    controlType: 'select',
    scope: 'feature-dependent',
    conditionNote: 'يظهر فقط لأهداف Cloud Build في وضع البناء الكامل.',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'motor-protocol-select',
    englishLabel: 'Motor Protocol',
    arabicMeaning: 'بروتوكول المحركات (ESC)',
    arabicExplanation: 'النص الرسمي (firmwareFlasherMotorProtocolDescription): "Select the motor (ESC) protocol you would like included in this build. Note this is a drop down, but only one item may be selected." — يحدد بروتوكول التحكم بمشغّلات السرعة الإلكترونية (ESC) المُضمَّن في هذا البناء السحابي.',
    group: 'build-configuration',
    controlType: 'select',
    scope: 'feature-dependent',
    conditionNote: 'يظهر فقط لأهداف Cloud Build في وضع البناء الكامل.',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'other-options-select',
    englishLabel: 'Other Options',
    arabicMeaning: 'خيارات أخرى (متعددة الاختيار)',
    arabicExplanation: 'النص الرسمي (firmwareFlasherOptionsDescription): "Select the generic options you would like included in this build. Note this is a drop down, and multiple items may be selected. Such items as fixes, e.g. AKK VTX, are included here." — قائمة اختيار متعدد لخيارات بناء عامة إضافية (مثل إصلاحات عتاد معينة)، تختلف قائمتها الفعلية حسب الهدف المختار.',
    group: 'build-configuration',
    controlType: 'select',
    scope: 'feature-dependent',
    conditionNote: 'القائمة الفعلية للخيارات المتاحة تعتمد على الهدف المختار؛ لا توجد قائمة ثابتة عامة.',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'custom-defines-input',
    englishLabel: 'Custom Defines',
    arabicMeaning: 'تعريفات بناء مخصصة (للمطورين)',
    arabicExplanation: 'النص الرسمي (firmwareFlasherCustomDefinesDescription): "For developers, you can add any defines you need, separated by a space, but without the USE_ prefix, it will be added automatically for you." — حقل نصي حر لإضافة تعريفات بناء C مخصصة، مفصولة بمسافة، بدون بادئة USE_ (تُضاف تلقائيًا).',
    group: 'build-configuration',
    controlType: 'text',
    scope: 'expert-only',
    conditionNote: 'يظهر فقط في وضع الخبير مع أهداف Cloud Build.',
    safetyLevel: 'warning',
    beginnerGuidance: 'هذا الحقل مخصص للمطورين المتقدمين فقط — لا تستخدمه دون فهم واضح لتأثيره.',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'branch-commit-select',
    englishLabel: 'Select Pull Request or Commit',
    arabicMeaning: 'اختيار Pull Request أو Commit محدد',
    arabicExplanation: 'النص الرسمي الكامل (firmwareFlasherBranchDescription): "Especially useful for developers, you can select a merged PR, specify a commit sha, or specify a \'yet to be merged\' PR by typing in a # followed by the PR number e.g. #1234 (this is shorthand for the branch pull/1234/head)." — يتيح اختيار كوميت أو Pull Request محدد للبناء منه بدلًا من فرع التطوير الرئيسي.',
    group: 'build-configuration',
    controlType: 'select',
    scope: 'expert-only',
    conditionNote: 'يظهر فقط في وضع الخبير، وفقط عندما يكون نوع الإصدار المختار "Unstable" (تجريبي).',
    safetyLevel: 'warning',
    dependsOnFieldIds: ['build-type-select'],
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
];

const releaseInfoFields: BfField[] = [
  {
    id: 'release-summary-status',
    englishLabel: 'Release and Build info',
    arabicMeaning: 'ملخص الإصدار والهدف المختار',
    arabicExplanation: 'لوحة معلومات للقراءة فقط، تجمع ستة عناصر رسمية منفصلة من المصدر: "Target:" (الهدف) مع رابط "Wiki" رسمي لمزيد من المعلومات، "Manufacturer ID:" (معرّف الشركة المصنّعة إن وُجد)، "Version:" (رقم الإصدار مع رابط لصفحة الإصدار الرسمية)، "MCU:" (نوع المعالج)، "Date:" (تاريخ الإصدار)، و"Configuration Filename:" (اسم ملف الإعداد المُطبَّق تلقائيًا، أو "[default]" إن لم يُحمَّل ملف محلي).',
    group: 'release-info',
    controlType: 'status',
    scope: 'hardware-dependent',
    conditionNote: 'تظهر فقط بعد اختيار لوحة وإصدار صالحين.',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'cloud-build-status',
    englishLabel: 'Cloud Build Details',
    arabicMeaning: 'حالة البناء السحابي (Cloud Build)',
    arabicExplanation: 'النص الرسمي (firmwareFlasherCloudBuildDetails / firmwareFlasherCloudBuildStatus): يعرض رابط "Show Log" لسجل البناء السحابي الفعلي، وشريط تقدم بناء حقيقي (من 0 إلى 100)، ونص حالة حي (مثلًا "pending" أو "Processing" أثناء الاستطلاع الدوري لحالة البناء كل 5 ثوانٍ، حتى النجاح أو انتهاء المهلة أو الإلغاء)، مع زر "Cancel" لإلغاء طلب بناء قيد التنفيذ.',
    group: 'release-info',
    controlType: 'status',
    scope: 'feature-dependent',
    conditionNote: 'يظهر فقط عندما يكون البناء المطلوب فعليًا بناءً سحابيًا (Cloud Build)، وليس ملفًا جاهزًا مسبقًا.',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
];

const recoveryFields: BfField[] = [
  {
    id: 'recovery-guidance',
    englishLabel: 'Recovery / Lost communication',
    arabicMeaning: 'الاسترجاع عند فقدان الاتصال بالطائرة',
    arabicExplanation: 'النص الرسمي الكامل (firmwareFlasherRecoveryText)، خطوات مرقّمة بالحرف: "Power off. Enable \'No reboot sequence\', enable \'Full chip erase\'. Jumper the BOOT pins or hold BOOT button. Power on (activity LED will NOT flash if done correctly). Install all STM32 drivers and Zadig if required. Close the App, then restart it. Release BOOT button if your FC has one. Flash with correct firmware (using manual baud rate if specified in your FC\'s manual). Power off. Remove BOOT jumper. Power on (activity LED should flash). Connect normally." — أي: أطفئ الطائرة، فعّل "بدون تسلسل إعادة تشغيل" و"مسح كامل للشريحة"، صِل طرفي BOOT أو اضغط زر BOOT مطولًا، شغّل الطائرة (لمبة النشاط لن تومض إن نُفِّذت الخطوة بشكل صحيح)، ثبّت تعريفات STM32 (وZadig إن لزم)، أغلق التطبيق وأعد فتحه، حرّر زر BOOT إن وُجد، افلش بالفيرموير الصحيح (باستخدام معدل نقل يدوي إن حدّده دليل لوحتك)، أطفئ الطائرة، أزل وصلة BOOT، شغّلها مجددًا (يجب أن تومض لمبة النشاط الآن)، ثم اتصل بشكل طبيعي.',
    group: 'recovery',
    controlType: 'status',
    scope: 'hardware-dependent',
    conditionNote: 'خطوات BOOT pins/BOOT button الفعلية تختلف باختلاف كل لوحة على حدة — هذه هي الخطوات العامة الرسمية فقط وليست إجراءً واحدًا موحدًا لكل عتاد.',
    safetyLevel: 'critical',
    beginnerGuidance: 'هذه الخطوات لاسترجاع طائرة توقفت عن الاستجابة فقط — لا تُنفِّذها على طائرة تعمل بشكل طبيعي.',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
];

const dialogFields: BfField[] = [
  {
    id: 'backup-reminder-dialog',
    englishLabel: 'Wipe out settings (backup reminder)',
    arabicMeaning: 'حوار تذكير بالنسخ الاحتياطي',
    arabicExplanation: 'النص الرسمي (firmwareFlasherRemindBackup): "Flashing new firmware will wipe out all settings. We strongly recommend to save a backup before continuing." — يظهر عند الضغط على "Flash Firmware" وفق إعداد المستخدم لخيار backupOnFlash (نسخ احتياطي مع/بدون حوار)، بزرين: "Create Backup" أو "Ignore the risk".',
    group: 'dialogs',
    controlType: 'status',
    scope: 'universal',
    conditionNote: 'يظهر فقط عند الفلاش عبر منفذ متاح فعليًا (وليس عبر "Flash on connect" أو عند عدم توفر منفذ)، وحسب إعداد النسخ الاحتياطي المحفوظ لدى المستخدم.',
    safetyLevel: 'critical',
    beginnerGuidance: 'اختر "Create Backup" دائمًا ما لم تكن متأكدًا تمامًا من عدم حاجتك لإعداداتك الحالية.',
    dependsOnFieldIds: ['flash-firmware-button'],
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'verify-board-mismatch-dialog',
    englishLabel: 'Firmware mismatch',
    arabicMeaning: 'حوار عدم تطابق اللوحة المختارة مع اللوحة المتصلة',
    arabicExplanation: 'النص الرسمي (firmwareFlasherVerifyBoard): "Firmware mismatch — The connected board is {verified_board} while you selected {selected_board}. Do you want to continue flashing?" — يظهر عند اكتشاف أن اللوحة المتصلة فعليًا تختلف عن اللوحة المختارة يدويًا، بزرين: "Abort" أو "Continue".',
    group: 'dialogs',
    controlType: 'status',
    scope: 'hardware-dependent',
    conditionNote: 'يظهر فقط عند اختلاف حقيقي بين اللوحة المكتشَفة واللوحة المختارة.',
    safetyLevel: 'critical',
    beginnerGuidance: 'إذا ظهر هذا التحذير، اضغط "Abort" وتحقق من اختيارك ما لم تكن متأكدًا تمامًا من السبب.',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'unstable-firmware-acknowledgement-dialog',
    englishLabel: 'Unstable firmware acknowledgement',
    arabicMeaning: 'إقرار المسؤولية عند فلاش فيرموير تجريبي',
    arabicExplanation: 'النص الرسمي الكامل (unstableFirmwareAcknowledgementDialog): "You are about to flash a development build of the firmware. These builds are a work in progress, and any of the following can be the case: the firmware does not work at all; the firmware is not flyable; there are safety issues with the firmware, for example flyaways; the firmware can cause the flight controller to become unresponsive, or damaged. If you proceed with flashing this firmware, you are assuming full responsibility for the risk of any of the above happening. Furthermore you acknowledge that it is necessary to perform thorough bench tests with props off before any attempts to fly this firmware." — يتطلب تفعيل مربع إقرار صريح قبل تفعيل زر "Flash" داخل الحوار نفسه.',
    group: 'dialogs',
    controlType: 'status',
    scope: 'version-dependent',
    conditionNote: 'يظهر فقط عند فلاش فيرموير من نوع بناء "Development" (تجريبي بالكامل).',
    safetyLevel: 'critical',
    beginnerGuidance: 'لا تفلش إصدارات تجريبية (Development) على طائرة ستطيرها فعليًا دون فهم كامل للمخاطر واختبارات مكتبية بدون مراوح أولًا.',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
];

const flashActionFields: BfField[] = [
  {
    id: 'load-online-button',
    englishLabel: 'Load Firmware [Online]',
    arabicMeaning: 'تحميل الفيرموير من الإنترنت',
    arabicExplanation: 'يبدأ تحميل ملف الفيرموير الفعلي المطابق للوحة والإصدار المختارين من خوادم Betaflight الرسمية (أو طلب بناء سحابي حقيقي إن كان الهدف يدعم Cloud Build)، مع رسائل حالة رسمية حقيقية أثناء التحميل مثل "Downloading..." وعند الفشل "Failed to load remote firmware".',
    group: 'flash-actions',
    controlType: 'action',
    scope: 'hardware-dependent',
    conditionNote: 'يتطلب اتصالًا فعليًا بالإنترنت واختيار لوحة وإصدار صالحين مسبقًا.',
    safetyLevel: 'warning',
    dependsOnFieldIds: ['board-select', 'firmware-version-select'],
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'load-local-button',
    englishLabel: 'Load Firmware [Local]',
    arabicMeaning: 'تحميل ملف فيرموير محلي',
    arabicExplanation: 'يفتح منتقي ملفات حقيقي يقبل فقط امتدادَي .hex و.uf2 فعليًا (النص الرسمي fileSystemPickerFirmwareFiles: "Firmware files")، ويحلّل الملف المختار محليًا. ملف .hex تالف يُظهر الرسالة الرسمية "HEX file appears to be corrupted"، وأي امتداد آخر يُظهر "Invalid file format". هذا الملف يُستخدم كما هو تمامًا دون أي تحقق من كونه فعليًا مخصصًا للوحتك — المسؤولية الكاملة عن مطابقة الملف للوحة تقع على المستخدم.',
    group: 'flash-actions',
    controlType: 'action',
    scope: 'universal',
    safetyLevel: 'critical',
    beginnerGuidance: 'تأكد تمامًا أن الملف المحلي الذي تحمّله مخصص فعليًا للوحتك بالضبط قبل المتابعة للفلاش.',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'flash-firmware-button',
    englishLabel: 'Flash Firmware',
    arabicMeaning: 'بدء عملية الفلاش الفعلية',
    arabicExplanation: 'الزر الذي يبدأ الفلاش الفعلي على الطائرة الحقيقية. يحدد المصدر تلقائيًا طريقة الفلاش المناسبة حسب المنفذ المتصل فعليًا: عبر USB DFU مباشرة، أو عبر منفذ تسلسلي (Serial) بمعدل النقل المحدد (يدوي أو تلقائي)، أو يطلب صلاحية DFU إن لم يوجد منفذ صالح. حسب إعداد المستخدم قد يظهر أولًا حوار تذكير بالنسخ الاحتياطي.',
    group: 'flash-actions',
    controlType: 'action',
    scope: 'universal',
    safetyLevel: 'critical',
    beginnerGuidance: 'لا تضغط هذا الزر إلا بعد التأكد من صحة اللوحة والإصدار والملف المحمَّل، وبعد أخذ نسخة احتياطية.',
    dependsOnFieldIds: ['load-online-button', 'load-local-button'],
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'exit-dfu-button',
    englishLabel: 'Exit DFU Mode',
    arabicMeaning: 'الخروج من وضع DFU',
    arabicExplanation: 'يُخرج الطائرة من وضع DFU (وضع تحديث الفيرموير عبر USB) ويعيدها للعمل الطبيعي، دون فلاش أي شيء جديد. يظهر مفعَّلًا فقط عندما يكون هناك جهاز DFU متاح فعليًا (PortHandler.dfuAvailable).',
    group: 'flash-actions',
    controlType: 'action',
    scope: 'hardware-dependent',
    conditionNote: 'مفعَّل فقط عندما يكون هناك جهاز DFU متصل فعليًا، ومعطَّل أثناء أي عملية فلاش جارية.',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: dfuSource,
  },
  {
    id: 'flash-progress-status',
    englishLabel: 'Progress bar and status message',
    arabicMeaning: 'شريط التقدم ورسالة الحالة',
    arabicExplanation: 'عنصر واحد حقيقي في الواجهة (progressLabel) يفترض نصوصًا مختلفة حسب الحالة، مع تلوين حسب النوع (محايد/صحيح/خطأ/يتطلب إجراء). من الرسائل الرسمية الحقيقية بالحرف حسب المرحلة: "Please load firmware file" (لا يوجد فيرموير محمَّل)، "Loaded Online Firmware: {filename} ({bytes} bytes)" / "Loaded Local Firmware: ..." (تم التحميل)، "Firmware not loaded" (محاولة فلاش بدون تحميل)، "Initiating reboot to bootloader ..." ثم "Contacting bootloader ..." ثم "Executing global chip erase ..." ثم "Flashing ..." ثم "Verifying ..." (تسلسل الفلاش الفعلي عبر DFU/Serial)، "Programming: SUCCESSFUL" (نجاح)، "Programming: FAILED" و"STM32 - timed out, programming: FAILED" و"Communication with bootloader failed" (فشل بأنواعه)، "Failed to open serial port" (تعذر فتح المنفذ)، "Erased N kB of flash successfully" (تأكيد مسح فعلي)، "Firmware image contains addresses not found on target device" (خطأ توافق حقيقي بين الملف والهدف).',
    group: 'flash-actions',
    controlType: 'status',
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: stm32Source,
  },
];

export const firmwareFlasherPage: BfPage = {
  id: 'firmware-flasher',
  officialId: 'firmware_flasher',
  officialTitle: 'Firmware Flasher',
  titleAr: 'محدّث الفيرموير',
  officialOrder: 2,
  summaryAr: 'التبويب الذي يُستخدم قبل أي اتصال بالطائرة لتحديث فيرموير Betaflight — اختيار اللوحة (Target) والإصدار، تحميل الملف من الإنترنت أو محليًا، ضبط خيارات الفلاش، وتنفيذ الفلاش الفعلي عبر USB DFU أو منفذ تسلسلي. هذا هو أهم تبويب من ناحية السلامة قبل الاتصال: اختيار هدف خاطئ أو ملف غير مطابق قد يجعل الطائرة غير قابلة للاستخدام.',
  connectionState: 'disconnected',
  contentStatus: 'reviewed',
  firmwareVersionRange: BF_VERSION_CONTEXT.releaseLine,
  appVersionRange: BF_VERSION_CONTEXT.releaseLine,
  reviewedAt: BF_VERSION_CONTEXT.reviewedAt,
  source: htmlSource,
  expertRequired: false,
  scope: 'universal',
  safetyLevel: 'critical',
  glossaryTermIds: [],
  relatedPageIds: ['setup'],
  groups: [
    { id: 'warnings', officialTitle: 'Warning', titleAr: 'تحذيرات أساسية', level: 'basic', order: 1, fields: warningFields },
    { id: 'options', titleAr: 'الخيارات الرئيسية', level: 'basic', order: 2, fields: optionsFields },
    { id: 'build-configuration', officialTitle: 'Build Configuration', titleAr: 'إعدادات البناء السحابي (Cloud Build)', level: 'advanced', order: 3, fields: buildConfigurationFields },
    { id: 'release-info', officialTitle: 'Release and Build info', titleAr: 'ملخص الإصدار والبناء', level: 'basic', order: 4, fields: releaseInfoFields },
    { id: 'flash-actions', titleAr: 'إجراءات التحميل والفلاش', level: 'basic', order: 5, fields: flashActionFields },
    { id: 'dialogs', titleAr: 'حوارات التأكيد أثناء الفلاش', level: 'advanced', order: 6, fields: dialogFields },
    { id: 'recovery', officialTitle: 'Recovery / Lost communication', titleAr: 'الاسترجاع عند فقدان الاتصال', level: 'basic', order: 7, fields: recoveryFields },
  ],
};
