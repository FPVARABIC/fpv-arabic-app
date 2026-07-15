import type { BfPage, BfField } from '../types';
import { makeConfiguratorSourceRef } from '../sourceHelpers';
import { BF_VERSION_CONTEXT } from '../sourceHelpers';

/**
 * Phase 5 — complete page. The largest and most complex page in the app.
 *
 * Verified against the cloned Configurator source (tag 2025.12.2):
 *   - src/tabs/osd.html (220 lines — full source read directly)
 *   - src/js/tabs/osd.js (4350 lines — read directly for
 *     OSD.ALL_DISPLAY_FIELDS/OSD.chooseFields()/ALL_WARNINGS/
 *     ALL_STATISTIC_FIELDS/positionConfigs/save-and-reboot semantics)
 *   - src/js/LogoManager.js (boot-logo image constraints, colormap)
 *   - locales/en/messages.json (every English label below, verbatim)
 *
 * Deliberately excluded (real DOM markup exists but is permanently
 * unreachable, confirmed by exhaustive grep — no fabricated fields,
 * no invented exclusions):
 *   - The "VTX Settings" box (`.vtx-settings`, osdSetupVtxTitle) — the
 *     surrounding `<div class="gui_box grey" style="display:none;">`
 *     is never toggled visible anywhere in osd.js, and `.vtx-settings`
 *     is never referenced/populated by any JS.
 *   - The "Aircraft Name" box (`.callsign`, osdSetupCraftNameTitle) —
 *     same permanently-hidden pattern; craft name is only ever read
 *     from `FC.CONFIG.craftName`/`FC.CONFIG.name` for the live preview
 *     text, never through this dead box.
 *   - The Zoom checkbox (`#osd-preview-zoom-selector`) — its CSS class
 *     `.osd-preview-zoom-group` is unconditionally `display: none`, and
 *     the checkbox's id is never referenced anywhere in osd.js; the
 *     "previewZoom" logic that exists is an unrelated automatic
 *     window-width-based scale applied to `.display-layout .preview`.
 *   - The "Rulers" checkbox is real and wired (`#osd-preview-rulers-selector`
 *     has a live change handler and drives `OSD.drawRulers()`).
 *
 * A critical, exhaustively-verified structural fact about save/reboot:
 * the plain "Save" button (`a.save` in the toolbar) sends ONLY
 * MSP_EEPROM_WRITE — no reboot. The ONLY action anywhere on this page
 * that triggers MSP_SET_REBOOT is "Upload Font" inside the Font
 * Manager dialog, sent once after every OSD character has been written
 * via MSP_OSD_CHAR_WRITE.
 *
 * The Elements list, Warnings list, and Post-Flight Statistics list are
 * each genuinely version-gated dictionaries built by `OSD.chooseFields()`
 * (gated on API_VERSION_1_45/1_46/1_47) — each is modeled as ONE
 * `controlType:'table'` field enumerating every real member (not a
 * fabricated subset), per this app's established convention for
 * firmware/version-dynamic lists.
 */

const htmlSource = makeConfiguratorSourceRef({
  title: 'Betaflight App — OSD tab',
  repoPath: 'src/tabs/osd.html',
  applicability: 'universal',
  officialId: 'osd',
});

const jsSource = makeConfiguratorSourceRef({
  title: 'Betaflight App — OSD tab behavior',
  repoPath: 'src/js/tabs/osd.js',
  applicability: 'universal',
  officialId: 'osd',
});

const statusNoticeFields: BfField[] = [
  {
    id: 'osd-no-chip-detect-warning',
    englishLabel: 'WARNING: No OSD chip was detected...',
    arabicMeaning: 'تحذير: لم يُكتشَف رقاقة OSD',
    arabicExplanation: 'النص الرسمي (osdSetupNoOsdChipDetectWarning): بعض لوحات التحكم لا تُغذّي رقاقة OSD بالطاقة بشكل صحيح إلا عند الاتصال بالبطارية — يُرجى توصيل البطارية قبل توصيل USB (مع إزالة المراوح فعليًا لضمان السلامة).',
    group: 'status-notices',
    controlType: 'status',
    scope: 'hardware-dependent',
    conditionNote: 'يظهر فقط عند تعذّر اكتشاف رقاقة OSD على الطائرة المتصلة.',
    safetyLevel: 'critical',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'osd-unsupported-notice',
    englishLabel: "Your flight controller isn't responding to OSD commands...",
    arabicMeaning: 'تنبيه عدم دعم OSD مدمج',
    arabicExplanation: 'النصان الرسميان (osdSetupUnsupportedNote1 وosdSetupUnsupportedNote2): لوحة التحكم لا تستجيب لأوامر OSD — على الأرجح لا تملك OSD من Betaflight مدمجًا. بعض اللوحات تملك MinimOSD منفصلًا يمكن برمجته وضبطه عبر أداة scarab-osd خارجية، لكن لا يمكن ضبط MinimOSD من هذا التطبيق.',
    group: 'status-notices',
    controlType: 'status',
    scope: 'hardware-dependent',
    conditionNote: 'يظهر فقط عندما لا يستجيب الفيرموير المتصل لأوامر OSD إطلاقًا.',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
];

const elementsFields: BfField[] = [
  {
    id: 'osd-profile-number-header',
    englishLabel: 'OSD Profile number',
    arabicMeaning: 'رأس أعمدة ملفات تعريف OSD',
    arabicExplanation: 'النص الرسمي (osdSetupProfilesTitle). رأس الجدول يعرض عمودًا واحدًا لكل ملف تعريف OSD فعلي متاح على الطائرة (عدد الملفات يبلّغ عنه الفيرموير)، فوق مفتاح تفعيل/تعطيل كل عنصر لكل ملف تعريف على حدة في الجدول أدناه.',
    group: 'elements',
    controlType: 'status',
    scope: 'feature-dependent',
    conditionNote: 'عدد الأعمدة يساوي عدد ملفات تعريف OSD الفعلية التي يبلّغ عنها الفيرموير المتصل.',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'osd-elements-list',
    englishLabel: 'Elements',
    arabicMeaning: 'قائمة عناصر شاشة OSD',
    arabicExplanation: `النص الرسمي (osdSetupElementsTitle + osdSectionHelpElements = "Enable or disable OSD elements."). جدول ديناميكي حقيقي (OSD.ALL_DISPLAY_FIELDS عبر OSD.chooseFields()) — لكل عنصر: مفتاح تفعيل لكل ملف تعريف، وموضع X/Y (بالسحب على المعاينة أو الإدخال اليدوي). القائمة الأساسية (62 عنصرًا حقيقيًا لكل الإصدارات): RSSI_VALUE, MAIN_BATT_VOLTAGE, CROSSHAIRS, ARTIFICIAL_HORIZON, HORIZON_SIDEBARS, TIMER_1, TIMER_2, FLYMODE, CRAFT_NAME, THROTTLE_POSITION, VTX_CHANNEL, CURRENT_DRAW, MAH_DRAWN, GPS_SPEED, GPS_SATS, ALTITUDE, PID_ROLL, PID_PITCH, PID_YAW, POWER, PID_RATE_PROFILE, WARNINGS, AVG_CELL_VOLTAGE, GPS_LON, GPS_LAT, DEBUG, PITCH_ANGLE, ROLL_ANGLE, MAIN_BATT_USAGE, DISARMED, HOME_DIR, HOME_DIST, NUMERICAL_HEADING, NUMERICAL_VARIO, COMPASS_BAR, ESC_TEMPERATURE, ESC_RPM, REMAINING_TIME_ESTIMATE, RTC_DATE_TIME, ADJUSTMENT_RANGE, CORE_TEMPERATURE, ANTI_GRAVITY, G_FORCE, MOTOR_DIAG, LOG_STATUS, FLIP_ARROW, LINK_QUALITY, FLIGHT_DIST, STICK_OVERLAY_LEFT, STICK_OVERLAY_RIGHT, PILOT_NAME (أو DISPLAY_NAME قبل API 1.45), ESC_RPM_FREQ, RATE_PROFILE_NAME, PID_PROFILE_NAME, OSD_PROFILE_NAME, RSSI_DBM_VALUE, RC_CHANNELS, CAMERA_FRAME, OSD_EFFICIENCY, TOTAL_FLIGHTS, OSD_UP_DOWN_REFERENCE, OSD_TX_UPLINK_POWER. تُضاف عند API ≥ 1.45 (15 عنصرًا): WH_DRAWN, AUX_VALUE, READY_MODE, RSNR_VALUE, SYS_GOGGLE_VOLTAGE, SYS_VTX_VOLTAGE, SYS_BITRATE, SYS_DELAY, SYS_DISTANCE, SYS_LQ, SYS_GOGGLE_DVR, SYS_VTX_DVR, SYS_WARNINGS, SYS_VTX_TEMP, SYS_FAN_SPEED. تُضاف عند API ≥ 1.46 (3 عناصر): GPS_LAP_TIME_CURRENT, GPS_LAP_TIME_PREVIOUS, GPS_LAP_TIME_BEST3. تُضاف عند API ≥ 1.47 (6 عناصر): DEBUG2, CUSTOM_MSG0, CUSTOM_MSG1, CUSTOM_MSG2, CUSTOM_MSG3, OSD_LIDAR_DIST.`,
    group: 'elements',
    controlType: 'table',
    scope: 'version-dependent',
    conditionNote: 'قائمة العناصر المتاحة فعليًا تعتمد على إصدار API للفيرموير المتصل (تُضاف عناصر إضافية تدريجيًا عند 1.45، 1.46، 1.47).',
    dependsOnFieldIds: ['osd-preset-position-grid'],
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'osd-preset-position-grid',
    englishLabel: 'Choose Position (preset-pos-btn)',
    arabicMeaning: 'شبكة المواضع الجاهزة',
    arabicExplanation: 'زر سريع لكل عنصر يفتح قائمة بـ15 موضعًا جاهزًا حقيقيًا مرتبة في شبكة 3×5: Top Left، Top Center، Top Right، Top Middle Left، Top Mid Center، Top Middle Right، Left Middle، Center، Right Middle، Bottom Middle Left، Bottom Mid Center، Bottom Middle Right، Bottom Left، Bottom Center، Bottom Right — بديل سريع عن السحب اليدوي أو إدخال الإحداثيات رقميًا.',
    group: 'elements',
    controlType: 'action',
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: false,
    source: jsSource,
  },
];

const previewFields: BfField[] = [
  {
    id: 'osd-preview-help-note',
    englishLabel: 'Note: OSD preview may not show the actual font that is installed...',
    arabicMeaning: 'ملاحظة دقة المعاينة',
    arabicExplanation: 'النص الرسمي (osdSetupPreviewHelp): قد لا تعرض المعاينة الخط الفعلي المُثبَّت على لوحة التحكم — قد يختلف تخطيط العناصر الفردية عند استخدام إصدارات أقدم من الفيرموير، لذا يُرجى التحقق من الشكل الفعلي عبر النظارات قبل الطيران.',
    group: 'preview',
    controlType: 'status',
    scope: 'universal',
    safetyLevel: 'caution',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'osd-preview-profile-selector',
    englishLabel: 'Preview for',
    arabicMeaning: 'اختيار ملف التعريف للمعاينة',
    arabicExplanation: 'النص الرسمي (osdSetupPreviewForTitle): تغيير ملف التعريف أو الخط هنا لا يغيّر شيئًا فعليًا على لوحة التحكم — يؤثر فقط على نافذة المعاينة. لتغييره فعليًا يجب استخدام خيار "ملف تعريف OSD النشط" أو زر "مدير الخطوط".',
    group: 'preview',
    controlType: 'select',
    scope: 'feature-dependent',
    conditionNote: 'عدد الخيارات يساوي عدد ملفات تعريف OSD الفعلية المُبلَّغ عنها من الفيرموير.',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'osd-preview-font-selector',
    englishLabel: 'Font',
    arabicMeaning: 'اختيار الخط للمعاينة',
    arabicExplanation: 'قائمة اختيار خط للعرض في نافذة المعاينة فقط — لا يغيّر الخط الفعلي المُثبَّت على الطائرة (ذلك يتم فقط عبر "مدير الخطوط" وزر "رفع الخط").',
    group: 'preview',
    controlType: 'select',
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'osd-preview-rulers-toggle',
    englishLabel: 'Rulers',
    arabicMeaning: 'مساطر إحداثيات المعاينة',
    arabicExplanation: 'النص الرسمي (osdSetupPreviewCheckRulers). عند التفعيل، تُرسَم مساطر إحداثيات (صفوف/أعمدة) فوق نافذة المعاينة لمساعدة تحديد موضع العناصر بدقة أثناء السحب.',
    group: 'preview',
    controlType: 'toggle',
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'osd-preview-canvas',
    englishLabel: 'Drag elements to change position',
    arabicMeaning: 'لوحة معاينة قابلة للسحب',
    arabicExplanation: 'النص الرسمي (osdSetupPreviewTitle). معاينة حية لشاشة OSD الفعلية — يمكن سحب أي عنصر مفعَّل مباشرة لتغيير موضعه X/Y، وهو نفس التعديل الذي يعكسه حقل الموضع الرقمي في جدول العناصر أعلاه.',
    group: 'preview',
    controlType: 'graph',
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: false,
    source: jsSource,
  },
];

const activeProfileFields: BfField[] = [
  {
    id: 'osd-active-profile-selector',
    englishLabel: 'Active OSD Profile',
    arabicMeaning: 'ملف تعريف OSD النشط',
    arabicExplanation: 'النص الرسمي (osdSetupSelectedProfileTitle + osdSetupSelectedProfileLabel = "Current:"). هذا هو الحقل الوحيد الذي يغيّر فعليًا ملف تعريف OSD النشط على لوحة التحكم (بعكس اختيار المعاينة أعلاه الذي هو للعرض فقط). عدد الخيارات يساوي عدد ملفات تعريف OSD المتاحة فعليًا على الفيرموير المتصل.',
    group: 'active-profile',
    controlType: 'select',
    scope: 'feature-dependent',
    conditionNote: 'عدد الخيارات يعتمد على عدد ملفات تعريف OSD الفعلية المُبلَّغ عنها من الفيرموير.',
    safetyLevel: 'warning',
    requiresSave: true,
    requiresReboot: false,
    source: htmlSource,
  },
];

const videoFormatFields: BfField[] = [
  {
    id: 'osd-video-format',
    englishLabel: 'Video Format',
    arabicMeaning: 'صيغة الفيديو',
    arabicExplanation: 'النص الرسمي (osdSetupVideoFormatTitle + osdSectionHelpVideoMode = ضبط صيغة الفيديو المتوقعة للكاميرا؛ عادة يمكن تركها على AUTO، وإن واجهت صعوبات اضبطها لتطابق خرج الكاميرا). الخيارات الحقيقية الأربعة: AUTO, PAL, NTSC, HD — خيار HD يظهر فقط إذا كان الفيرموير المبني يدعم USE_OSD_HD، وبقية الخيارات تظهر فقط إذا كان يدعم USE_OSD_SD.',
    group: 'video-format',
    controlType: 'select',
    range: { options: ['AUTO', 'PAL', 'NTSC', 'HD'] },
    scope: 'target-dependent',
    conditionNote: 'خيار HD يتطلب دعم بناء USE_OSD_HD؛ بقية الخيارات تتطلب دعم USE_OSD_SD. يظهر الحقل كاملًا فقط على لوحات MAX7456 (requires-max7456).',
    safetyLevel: 'caution',
    requiresSave: true,
    requiresReboot: false,
    source: jsSource,
  },
];

const unitsFields: BfField[] = [
  {
    id: 'osd-units',
    englishLabel: 'Units',
    arabicMeaning: 'وحدات القياس',
    arabicExplanation: 'النص الرسمي (osdSetupUnitsTitle + osdSectionHelpUnits = يحدد نظام الوحدات المستخدَم للقراءات الرقمية). الخيارات الحقيقية الثلاثة: Imperial, Metric, British.',
    group: 'units',
    controlType: 'select',
    range: { options: ['Imperial', 'Metric', 'British'] },
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: false,
    source: htmlSource,
  },
];

const timerFields: BfField[] = [
  {
    id: 'osd-timers-list',
    englishLabel: 'Timers',
    arabicMeaning: 'قائمة المؤقتات',
    arabicExplanation: 'النص الرسمي (osdSetupTimersTitle + osdSectionHelpTimers = ضبط مؤقتات الطيران). عدد المؤقتات يعتمد على ما يبلّغ عنه الفيرموير؛ كل مؤقت يملك 3 حقول فرعية حقيقية: Source (المصدر)، Precision (الدقة)، Alarm (التنبيه).',
    group: 'timers',
    controlType: 'table',
    scope: 'feature-dependent',
    conditionNote: 'عدد صفوف المؤقتات يعتمد كليًا على عدد المؤقتات التي يبلّغ عنها الفيرموير المتصل.',
    dependsOnFieldIds: ['osd-timer-source', 'osd-timer-precision', 'osd-timer-alarm'],
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'osd-timer-source',
    englishLabel: 'Source',
    arabicMeaning: 'مصدر المؤقت',
    arabicExplanation: 'قائمة اختيار حقيقية بـ4 خيارات (OSD.constants.TIMER_TYPES): ON_TIME (وقت التشغيل)، TOTAL_ARMED_TIME (إجمالي وقت التسليح)، LAST_ARMED_TIME (آخر وقت تسليح)، ON_ARM_TIME (توقيت عند التسليح).',
    group: 'timers',
    controlType: 'select',
    range: { options: ['ON_TIME', 'TOTAL_ARMED_TIME', 'LAST_ARMED_TIME', 'ON_ARM_TIME'] },
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'osd-timer-precision',
    englishLabel: 'Precision',
    arabicMeaning: 'دقة عرض المؤقت',
    arabicExplanation: 'قائمة اختيار حقيقية بـ3 خيارات: SECOND (ثانية)، HUNDREDTH (جزء من مئة)، TENTH (عُشر).',
    group: 'timers',
    controlType: 'select',
    range: { options: ['SECOND', 'HUNDREDTH', 'TENTH'] },
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'osd-timer-alarm',
    englishLabel: 'Alarm',
    arabicMeaning: 'تنبيه المؤقت',
    arabicExplanation: 'قيمة رقمية تحدد الوقت الذي يُطلَق عنده تنبيه المؤقت.',
    group: 'timers',
    controlType: 'number',
    scope: 'universal',
    safetyLevel: 'caution',
    requiresSave: true,
    requiresReboot: false,
    source: jsSource,
  },
];

const alarmFields: BfField[] = [
  {
    id: 'osd-alarm-rssi',
    englishLabel: 'RSSI',
    arabicMeaning: 'تنبيه قوة الإشارة',
    arabicExplanation: 'النص الرسمي (osdSectionHelpAlarms = ضبط العتبات المستخدَمة لعناصر OSD ذات حالات التنبيه). قيمة رقمية تحدد عتبة تنبيه RSSI — من الحقول الأساسية الثلاثة المتاحة دائمًا.',
    group: 'alarms',
    controlType: 'number',
    scope: 'universal',
    safetyLevel: 'warning',
    requiresSave: true,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'osd-alarm-cap',
    englishLabel: 'CAP',
    arabicMeaning: 'تنبيه سعة البطارية المستهلكة',
    arabicExplanation: 'قيمة رقمية تحدد عتبة تنبيه سعة البطارية المستهلكة (بالمللي أمبير/ساعة) — من الحقول الأساسية الثلاثة المتاحة دائمًا.',
    group: 'alarms',
    controlType: 'number',
    scope: 'universal',
    safetyLevel: 'warning',
    requiresSave: true,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'osd-alarm-alt',
    englishLabel: 'ALT',
    arabicMeaning: 'تنبيه الارتفاع',
    arabicExplanation: 'قيمة رقمية تحدد عتبة تنبيه الارتفاع — من الحقول الأساسية الثلاثة المتاحة دائمًا.',
    group: 'alarms',
    controlType: 'number',
    scope: 'universal',
    safetyLevel: 'caution',
    requiresSave: true,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'osd-alarm-link-quality',
    englishLabel: 'Link Quality',
    arabicMeaning: 'تنبيه جودة الرابط',
    arabicExplanation: 'قيمة رقمية تحدد عتبة تنبيه جودة الرابط (Link Quality).',
    group: 'alarms',
    controlType: 'number',
    scope: 'version-dependent',
    conditionNote: 'يظهر فقط عند إصدار API ≥ 1.46.',
    safetyLevel: 'caution',
    requiresSave: true,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'osd-alarm-rssi-dbm',
    englishLabel: 'RSSI dBm',
    arabicMeaning: 'تنبيه قوة الإشارة بالديسيبل',
    arabicExplanation: 'قيمة رقمية تحدد عتبة تنبيه قوة الإشارة بوحدة dBm.',
    group: 'alarms',
    controlType: 'number',
    scope: 'version-dependent',
    conditionNote: 'يظهر فقط عند إصدار API ≥ 1.47.',
    safetyLevel: 'caution',
    requiresSave: true,
    requiresReboot: false,
    source: jsSource,
  },
];

const warningsFields: BfField[] = [
  {
    id: 'osd-warnings-list',
    englishLabel: 'Warnings',
    arabicMeaning: 'قائمة تحذيرات OSD',
    arabicExplanation: 'النص الرسمي (osdSetupWarningsTitle). قائمة حقيقية كاملة (OSD.constants.ALL_WARNINGS) من مربعات اختيار تفعيل/تعطيل كل تحذير على الشاشة: ARMING_DISABLED (تعطيل التسليح)، BATTERY_NOT_FULL (البطارية غير ممتلئة)، BATTERY_WARNING (تحذير بطارية)، BATTERY_CRITICAL (بطارية حرجة)، VISUAL_BEEPER (منبّه بصري)، CRASH_FLIP_MODE (وضع الانقلاب)، ESC_FAIL (عطل ESC)، CORE_TEMPERATURE (حرارة المعالج)، RC_SMOOTHING_FAILURE (فشل تنعيم RC — يُزال من القائمة عند API ≥ 1.47)، FAILSAFE، LAUNCH_CONTROL، GPS_RESCUE_UNAVAILABLE (إنقاذ GPS غير متاح)، GPS_RESCUE_DISABLED (إنقاذ GPS معطَّل)، RSSI، LINK_QUALITY، RSSI_DBM، OVER_CAP (تجاوز السعة). يُضاف RSNR عند API ≥ 1.45، ويُضاف LOAD عند API ≥ 1.46.',
    group: 'warnings',
    controlType: 'table',
    scope: 'version-dependent',
    conditionNote: 'يُضاف RSNR عند API ≥ 1.45، ويُضاف LOAD عند API ≥ 1.46، ويُزال RC_SMOOTHING_FAILURE عند API ≥ 1.47.',
    safetyLevel: 'warning',
    requiresSave: true,
    requiresReboot: false,
    source: jsSource,
  },
];

const statisticsFields: BfField[] = [
  {
    id: 'osd-statistics-list',
    englishLabel: 'Post Flight Statistics',
    arabicMeaning: 'إحصائيات ما بعد الطيران',
    arabicExplanation: 'النص الرسمي (osdSetupStatsTitle). قائمة حقيقية كاملة (OSD.constants.STATISTIC_FIELDS) مرتبة بنفس ترتيب عرضها الفعلي على الشاشة: RTC_DATE_TIME، TIMER_1، TIMER_2، MAX_SPEED (أقصى سرعة)، MAX_DISTANCE (أقصى مسافة)، MIN_BATTERY (أدنى جهد بطارية)، END_BATTERY (جهد البطارية عند الانتهاء)، BATTERY_VOLTAGE، MIN_RSSI، MAX_CURRENT (أقصى تيار)، USED_MAH (سعة مستهلكة)، MAX_ALTITUDE (أقصى ارتفاع)، BLACKBOX، BLACKBOX_LOG_NUMBER، MAX_G_FORCE، MAX_ESC_TEMP، MAX_ESC_RPM، MIN_LINK_QUALITY، FLIGHT_DISTANCE، MAX_FFT، STAT_TOTAL_FLIGHTS، STAT_TOTAL_FLIGHT_TIME، STAT_TOTAL_FLIGHT_DIST، MIN_RSSI_DBM. تُضاف عند API ≥ 1.45: USED_WH (طاقة مستهلكة بالواط/ساعة)، MIN_RSNR. تُضاف عند API ≥ 1.46: STAT_BEST_3_CONSEC_LAPS (أفضل 3 لفّات متتالية)، STAT_BEST_LAP (أفضل لفّة)، STAT_FULL_THROTTLE_TIME (وقت الخنق الكامل)، STAT_FULL_THROTTLE_COUNTER (عدّاد الخنق الكامل)، STAT_AVG_THROTTLE (متوسط الخنق).',
    group: 'statistics',
    controlType: 'table',
    scope: 'version-dependent',
    conditionNote: 'حقلان إضافيان يظهران عند API ≥ 1.45، وخمسة حقول إضافية عند API ≥ 1.46.',
    safetyLevel: 'informational',
    requiresSave: true,
    requiresReboot: false,
    source: jsSource,
  },
];

const fontManagerFields: BfField[] = [
  {
    id: 'osd-font-presets-selector',
    englishLabel: 'Select Font Presets:',
    arabicMeaning: 'اختيار نمط خط جاهز',
    arabicExplanation: 'النص الرسمي (osdSetupFontPresetsSelector). قائمة اختيار حقيقية بـ10 أنماط خطوط جاهزة (OSD.constants.FONT_TYPES): Default, Bold, Large, Large Extra, Betaflight, Digital, Clarity, Vision, Impact, Impact Mini — أو "User supplied font" عند استخدام ملف خط مخصص محمَّل يدويًا.',
    group: 'font-manager',
    controlType: 'select',
    range: { options: ['Default', 'Bold', 'Large', 'Large Extra', 'Betaflight', 'Digital', 'Clarity', 'Vision', 'Impact', 'Impact Mini', 'User supplied font'] },
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'osd-font-preview',
    englishLabel: 'Font preview grid',
    arabicMeaning: 'معاينة رموز الخط',
    arabicExplanation: 'شبكة معاينة تعرض كل رموز الخط المختار قبل رفعه فعليًا إلى لوحة التحكم.',
    group: 'font-manager',
    controlType: 'graph',
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'osd-boot-logo-upload',
    englishLabel: 'Boot logo — Select custom image…',
    arabicMeaning: 'رفع شعار الإقلاع المخصص',
    arabicExplanation: `النصوص الرسمية (osdSetupCustomLogoTitle = "Boot logo:", osdSetupCustomLogoInfoImageSize، osdSetupCustomLogoInfoColorMap). يقبل ملف صورة PNG أو BMP بمقاس 288×72 بكسل بالضبط (24×4 رمزًا × 12×18 بكسل للرمز الواحد فعليًا في الكود)، ويجب أن يحتوي فقط على ثلاثة ألوان دقيقة: أخضر خلفية (0,255,0)، أسود (0,0,0)، أبيض (255,255,255) — أي لون آخر يُرفَض.`,
    group: 'font-manager',
    controlType: 'button',
    scope: 'universal',
    safetyLevel: 'caution',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
    beginnerGuidance: 'مقاس ولوحة الألوان يجب أن يطابقا الشروط بدقة تامة (288×72 بكسل، أخضر/أسود/أبيض فقط) وإلا تُرفَض الصورة.',
  },
  {
    id: 'osd-upload-font-button',
    englishLabel: 'Upload Font',
    arabicMeaning: 'رفع الخط',
    arabicExplanation: 'النص الرسمي (osdSetupUploadFont). الإجراء الوحيد في كامل صفحة OSD الذي يُرسِل أمر إعادة تشغيل حقيقي (MSP_SET_REBOOT) — بعد كتابة كل رمز من رموز الخط فعليًا إلى ذاكرة لوحة التحكم عبر MSP_OSD_CHAR_WRITE واحدًا تلو الآخر، يُعاد تشغيل الطائرة تلقائيًا لتفعيل الخط الجديد.',
    group: 'font-manager',
    controlType: 'action',
    scope: 'universal',
    safetyLevel: 'critical',
    requiresSave: true,
    requiresReboot: true,
    source: jsSource,
  },
];

const toolbarFields: BfField[] = [
  {
    id: 'osd-font-manager-button',
    englishLabel: 'Font Manager',
    arabicMeaning: 'فتح مدير الخطوط',
    arabicExplanation: 'النص الرسمي (osdSetupFontManager). يفتح نافذة "مدير الخطوط" (أنماط جاهزة + شعار إقلاع مخصص + رفع الخط).',
    group: 'toolbar',
    controlType: 'button',
    scope: 'hardware-dependent',
    conditionNote: 'يظهر فقط عند اكتشاف رقاقة خط OSD متوافقة (MAX7456) فعليًا على الطائرة.',
    dependsOnFieldIds: ['osd-font-presets-selector', 'osd-boot-logo-upload', 'osd-upload-font-button'],
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'osd-save',
    englishLabel: 'Save',
    arabicMeaning: 'حفظ',
    arabicExplanation: 'النص الرسمي (osdSetupSave). يرسل MSP_EEPROM_WRITE فقط — حفظ دائم بدون أي إعادة تشغيل أو قطع اتصال، على عكس "رفع الخط" داخل مدير الخطوط الذي يُعيد التشغيل فعليًا.',
    group: 'toolbar',
    controlType: 'action',
    scope: 'universal',
    safetyLevel: 'warning',
    requiresSave: true,
    requiresReboot: false,
    source: jsSource,
  },
];

export const osdPage: BfPage = {
  id: 'osd',
  officialId: 'osd',
  officialTitle: 'OSD',
  titleAr: 'عرض المعلومات على الشاشة',
  officialOrder: 23,
  summaryAr: 'ضبط عناصر شاشة المعلومات (OSD) المعروضة على الفيديو (موضع/تفعيل لكل ملف تعريف)، وصيغة الفيديو والوحدات والمؤقتات والتنبيهات والتحذيرات وإحصائيات ما بعد الطيران، مع معاينة حية قابلة بالسحب ومدير خطوط يتضمن رفع شعار إقلاع مخصص — الحفظ العادي لا يتطلب إعادة تشغيل، بينما رفع خط جديد يتطلبها فعليًا.',
  connectionState: 'connected',
  contentStatus: 'reviewed',
  firmwareVersionRange: BF_VERSION_CONTEXT.releaseLine,
  appVersionRange: BF_VERSION_CONTEXT.releaseLine,
  reviewedAt: BF_VERSION_CONTEXT.reviewedAt,
  source: htmlSource,
  expertRequired: false,
  scope: 'feature-dependent',
  conditionNote: 'تظهر الصفحة الكاملة فقط عند اكتشاف رقاقة OSD فعليًا تستجيب لأوامر الفيرموير؛ بعض المجموعات (مثل صيغة الفيديو ومدير الخطوط) تتطلب تحديدًا رقاقة MAX7456.',
  safetyLevel: 'caution',
  glossaryTermIds: [],
  relatedPageIds: ['vtx', 'gps', 'configuration'],
  groups: [
    { id: 'status-notices', titleAr: 'تنبيهات الحالة', level: 'basic', order: 1, fields: statusNoticeFields },
    { id: 'elements', officialTitle: 'Elements', titleAr: 'العناصر', level: 'advanced', order: 2, fields: elementsFields },
    { id: 'preview', titleAr: 'المعاينة', level: 'basic', order: 3, fields: previewFields },
    { id: 'active-profile', officialTitle: 'Active OSD Profile', titleAr: 'ملف التعريف النشط', level: 'basic', order: 4, fields: activeProfileFields },
    { id: 'video-format', officialTitle: 'Video Format', titleAr: 'صيغة الفيديو', level: 'advanced', order: 5, fields: videoFormatFields },
    { id: 'units', officialTitle: 'Units', titleAr: 'الوحدات', level: 'basic', order: 6, fields: unitsFields },
    { id: 'timers', officialTitle: 'Timers', titleAr: 'المؤقتات', level: 'basic', order: 7, fields: timerFields },
    { id: 'alarms', officialTitle: 'Alarms', titleAr: 'التنبيهات', level: 'advanced', order: 8, fields: alarmFields },
    { id: 'warnings', officialTitle: 'Warnings', titleAr: 'التحذيرات', level: 'advanced', order: 9, fields: warningsFields },
    { id: 'statistics', officialTitle: 'Post Flight Statistics', titleAr: 'إحصائيات ما بعد الطيران', level: 'basic', order: 10, fields: statisticsFields },
    { id: 'font-manager', officialTitle: 'Font Manager', titleAr: 'مدير الخطوط', level: 'advanced', order: 11, fields: fontManagerFields },
    { id: 'toolbar', titleAr: 'شريط الأدوات', level: 'basic', order: 12, fields: toolbarFields },
  ],
};
