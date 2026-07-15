import type { BfPage, BfField } from '../types';
import { makeConfiguratorSourceRef } from '../sourceHelpers';
import { BF_VERSION_CONTEXT } from '../sourceHelpers';

/**
 * Phase 3 — complete page. Official internal tab ID is 'auxiliary'; the
 * visible tab title (tabAuxiliary) is "Modes".
 *
 * Verified against the cloned Configurator source (tag 2025.12.2):
 *   - src/tabs/auxiliary.html (structure/order of every group and field)
 *   - src/js/tabs/auxiliary.js (behavior: modes are populated live from
 *     MSP_BOXNAMES/MSP_BOXIDS, not a compile-time Configurator list;
 *     AND/OR logic; addRangeToMode/addLinkedToMode; the no-reboot save)
 *   - src/js/msp/MSPHelper.js (writeConfiguration(reboot, callback)
 *     signature — confirms the auxiliary.js call `writeConfiguration(false)`
 *     means "do not reboot")
 *   - firmware src/main/msp/msp_box.c (the real, source-verified set of
 *     mode/box identifiers the firmware can report over MSP_BOXNAMES)
 *   - locales/en/messages.json (every English label below, including the
 *     verbatim official AND/OR logic and ARM-link-exception help text)
 *
 * A real, verified structural fact: unlike every other Phase 2/3 page,
 * Modes' Save button does NOT trigger a reboot — auxiliary.js calls
 * `mspHelper.writeConfiguration(false)`, and MSPHelper.js's
 * `writeConfiguration = function (reboot, callback)` confirms the first
 * argument controls reboot. This is captured honestly below as
 * `requiresReboot: false` on the save action, a genuine difference from
 * Setup/Ports/Motors/Failsafe/Power/Receiver/Configuration.
 *
 * A second real, verified structural fact: the per-mode assignment table
 * is NOT a fixed set of always-present controls — the actual list of
 * available modes is requested live from the connected flight controller
 * via MSP_BOXNAMES/MSP_BOXIDS (see auxiliary.js `get_box_ids`), and which
 * boxes the firmware can report depends on its build configuration and
 * enabled features (see msp_box.c's conditional `BME(...)` registrations).
 * It is modeled here as ONE dynamic 'table' field, per the same
 * convention used for Setup's Arming Disable Flags, Motors' propeller
 * table, and Configuration's Other Features/Beeper Configuration tables.
 */

const htmlSource = makeConfiguratorSourceRef({
  title: 'Betaflight App — Modes (auxiliary) tab',
  repoPath: 'src/tabs/auxiliary.html',
  applicability: 'universal',
  officialId: 'auxiliary',
});

const jsSource = makeConfiguratorSourceRef({
  title: 'Betaflight App — Modes (auxiliary) tab behavior',
  repoPath: 'src/js/tabs/auxiliary.js',
  applicability: 'universal',
  officialId: 'auxiliary',
});

const mspHelperSource = makeConfiguratorSourceRef({
  title: 'Betaflight App — MSP writeConfiguration helper',
  repoPath: 'src/js/msp/MSPHelper.js',
  applicability: 'universal',
  officialId: 'auxiliary',
});

const firmwareBoxSource = makeConfiguratorSourceRef({
  title: 'Betaflight firmware — MSP box/mode registration',
  repoPath: 'src/main/msp/msp_box.c',
  applicability: 'firmware-only',
  officialId: 'auxiliary',
});

const KNOWN_BOX_IDS = [
  'BOX3D', 'BOXACROTRAINER', 'BOXAIRMODE', 'BOXALTHOLD', 'BOXANGLE', 'BOXANTIGRAVITY', 'BOXARM',
  'BOXBEEPERMUTE', 'BOXBEEPERON', 'BOXBEEPGPSCOUNT', 'BOXBLACKBOX', 'BOXBLACKBOXERASE', 'BOXCALIB',
  'BOXCAMERA1', 'BOXCAMERA2', 'BOXCAMERA3', 'BOXCAMSTAB', 'BOXCHIRP', 'BOXCRASHFLIP', 'BOXFAILSAFE',
  'BOXFPVANGLEMIX', 'BOXGPSRESCUE', 'BOXHEADADJ', 'BOXHEADFREE', 'BOXHORIZON', 'BOXLAPTIMERRESET',
  'BOXLAUNCHCONTROL', 'BOXLEDLOW', 'BOXMAG', 'BOXMSPOVERRIDE', 'BOXOSD', 'BOXPARALYZE', 'BOXPASSTHRU',
  'BOXPIDAUDIO', 'BOXPOSHOLD', 'BOXPREARM', 'BOXREADY', 'BOXSERVO1', 'BOXSERVO2', 'BOXSERVO3',
  'BOXSTICKCOMMANDDISABLE', 'BOXTELEMETRY', 'BOXVTXCONTROLDISABLE', 'BOXVTXPITMODE',
];

const toolboxFields: BfField[] = [
  {
    id: 'auxiliary-help-note',
    englishLabel: 'Modes tab — help note',
    arabicMeaning: 'شرح منطق الأوضاع (AND/OR)',
    arabicExplanation: 'النص الرسمي الكامل (auxiliaryHelp): اضبط الأوضاع هنا باستخدام مزيج من النطاقات (ranges) و/أو الروابط (links) لأوضاع أخرى (الروابط مدعومة من Betaflight 4.0 فصاعدًا). استخدم "النطاقات" لتحديد المفاتيح في جهاز الإرسال وتعيينات الأوضاع المقابلة لها — أي قناة استقبال تعطي قراءة بين حدّي النطاق الأدنى/الأقصى تُفعِّل الوضع. استخدم "الرابط" لتفعيل وضع عند تفعيل وضع آخر. النص الرسمي للاستثناءات بالحرف: "Exceptions: ARM cannot be linked to or from another mode, modes cannot be linked to other modes that are configured with a link (chained links)." — أي: لا يمكن ربط ARM من أو إلى وضع آخر، ولا يمكن ربط الأوضاع بأوضاع أخرى مُهيّأة برابط (سلاسل روابط). يمكن استخدام عدة نطاقات/روابط لتفعيل أي وضع، وإذا وُجد أكثر من نطاق/رابط واحد لوضع ما، يمكن ضبط كل منها على AND أو OR. يُفعَّل الوضع عندما: تكون كل نطاقات/روابط AND نشطة؛ أو يكون نطاق/رابط واحد على الأقل من OR نشطًا. تذكّر حفظ إعداداتك بزر Save.',
    group: 'toolbox',
    controlType: 'status',
    scope: 'universal',
    safetyLevel: 'warning',
    beginnerGuidance: 'لا يمكن ربط وضع التسليح (ARM) بوضع آخر إطلاقًا — يجب أن يكون له مفتاح/نطاق مباشر خاص به دائمًا.',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'toggle-unused-modes',
    englishLabel: 'Hide unused modes',
    arabicMeaning: 'إخفاء الأوضاع غير المستخدَمة',
    arabicExplanation: 'مفتاح واجهة محلي فقط (لا يُحفظ في الطائرة) يخفي أي وضع لا يملك حاليًا أي نطاق أو رابط مُعرَّف له، لتسهيل مراجعة الأوضاع المفعّلة فقط.',
    group: 'toolbox',
    controlType: 'toggle',
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
];

const modesTableFields: BfField[] = [
  {
    id: 'modes-assignment-table',
    englishLabel: 'Modes',
    arabicMeaning: 'جدول تعيين الأوضاع',
    arabicExplanation: `جدول ديناميكي — يُطلب من الطائرة فعليًا عبر MSP_BOXNAMES/MSP_BOXIDS عند فتح الصفحة (auxiliary.js: get_box_ids)؛ عدد الصفوف وأسماؤها تعتمد كليًا على فيرموير الطائرة المتصلة وخيارات بنائه. أسماء الأوضاع المعروفة والموثّقة فعليًا في كود الفيرموير (firmware src/main/msp/msp_box.c، ${KNOWN_BOX_IDS.length} معرّفًا مؤكدًا، بعضها مشروط بميزات أو عتاد محدد): ${KNOWN_BOX_IDS.join(', ')}. كل صف يحتوي على اسم الوضع، وأيقونة مساعدة، وزري "Add Link"/"Add Range"، ومنطقة نطاقات/روابط قابلة للتوسيع أسفله.`,
    group: 'modes-table',
    controlType: 'table',
    scope: 'hardware-dependent',
    conditionNote: 'قائمة الأوضاع الفعلية ومعرّفاتها تُقرأ حيًا من الطائرة المتصلة (MSP_BOXNAMES)، وتعتمد على فيرموير الطائرة وإعدادات بنائه؛ القائمة أعلاه هي كل المعرّفات الموثّقة فعليًا في كود الفيرموير المُدقَّق، وليست قائمة ثابتة تظهر بالضرورة كاملة على كل طائرة.',
    safetyLevel: 'critical',
    beginnerGuidance: 'وضع ARM يجب أن يكون له نطاق (Range) مباشر مرتبط بمفتاح فعلي دائمًا — لا يمكن ربطه (Link) بوضع آخر إطلاقًا.',
    dependsOnFieldIds: ['mode-add-link', 'mode-add-range'],
    requiresSave: true,
    requiresReboot: false,
    source: firmwareBoxSource,
  },
  {
    id: 'mode-add-range',
    englishLabel: 'Add Range',
    arabicMeaning: 'إضافة نطاق',
    arabicExplanation: 'النص الرسمي (auxiliaryAddRange): "Add Range" — يضيف سطر نطاق جديد لوضع معيّن (addRangeToMode في auxiliary.js): اختيار قناة AUX، ومنطق AND/OR، وشريط تمرير لتحديد حدّي الحد الأدنى والأقصى اللذين يُفعّلان الوضع.',
    group: 'modes-table',
    controlType: 'action',
    scope: 'universal',
    safetyLevel: 'warning',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'mode-add-link',
    englishLabel: 'Add Link',
    arabicMeaning: 'إضافة رابط',
    arabicExplanation: 'النص الرسمي (auxiliaryAddLink): "Add Link" — يضيف سطر ربط جديد لوضع معيّن (addLinkedToMode في auxiliary.js): اختيار وضع آخر (linkedTo) ومنطق AND/OR، بحيث يُفعَّل هذا الوضع تلقائيًا عند تفعيل الوضع المرتبط به.',
    group: 'modes-table',
    controlType: 'action',
    scope: 'version-dependent',
    conditionNote: 'الروابط مدعومة من Betaflight 4.0 فصاعدًا فقط؛ ولا يمكن استخدامها مع وضع ARM أو مع أوضاع أخرى مُهيّأة أصلًا برابط (لا سلاسل روابط).',
    safetyLevel: 'warning',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'range-channel-select',
    englishLabel: 'Channel select (range row)',
    arabicMeaning: 'اختيار قناة النطاق',
    arabicExplanation: 'قائمة اختيار تحدد أي قناة AUX يُراقَب مستواها لتفعيل هذا النطاق.',
    group: 'modes-table',
    controlType: 'select',
    scope: 'universal',
    safetyLevel: 'warning',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'range-logic-select',
    englishLabel: 'Logic select (AND/OR)',
    arabicMeaning: 'منطق النطاق/الرابط (AND/OR)',
    arabicExplanation: 'قائمة اختيار تحدد ما إذا كان هذا النطاق أو الرابط يجب أن يكون ضمن شرط AND (كل شروط AND يجب أن تتحقق معًا) أو OR (يكفي تحقق أحد شروط OR).',
    group: 'modes-table',
    controlType: 'select',
    range: { options: ['AND', 'OR'] },
    scope: 'universal',
    safetyLevel: 'warning',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'range-min-max-slider',
    englishLabel: 'Min / Max (range slider)',
    arabicMeaning: 'الحد الأدنى / الأقصى للنطاق',
    arabicExplanation: 'شريط تمرير على مقياس قناة AUX الكامل يحدد بصريًا حدّي التفعيل الأدنى (Min) والأقصى (Max) لهذا النطاق.',
    group: 'modes-table',
    controlType: 'number',
    scope: 'universal',
    safetyLevel: 'warning',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'link-linked-to-select',
    englishLabel: 'Linked to select',
    arabicMeaning: 'اختيار الوضع المرتبط',
    arabicExplanation: 'قائمة اختيار تحدد الوضع الآخر الذي عند تفعيله يُفعَّل هذا الوضع تلقائيًا (رابط، متاح من Betaflight 4.0 فصاعدًا).',
    group: 'modes-table',
    controlType: 'select',
    scope: 'version-dependent',
    conditionNote: 'متاح فقط من Betaflight 4.0 فصاعدًا؛ لا يمكن اختيار ARM أو أي وضع مُهيّأ أصلًا برابط.',
    safetyLevel: 'warning',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'delete-range-or-link',
    englishLabel: 'Delete range/link',
    arabicMeaning: 'حذف نطاق/رابط',
    arabicExplanation: 'يحذف سطر النطاق أو الرابط هذا من تعيينات الوضع.',
    group: 'modes-table',
    controlType: 'action',
    scope: 'universal',
    safetyLevel: 'caution',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
];

const pageActionFields: BfField[] = [
  {
    id: 'modes-save',
    englishLabel: 'Save',
    arabicMeaning: 'حفظ',
    arabicExplanation: 'يحفظ كل تعيينات النطاقات والروابط في ذاكرة الـ FC عبر `mspHelper.writeConfiguration(false)`. الوسيط `false` مؤكَّد من توقيع الدالة في MSPHelper.js (`writeConfiguration(reboot, callback)`) بأنه يعني "بدون إعادة تشغيل" — أي أن حفظ هذه الصفحة تحديدًا لا يُعيد تشغيل الطائرة، خلافًا لمعظم صفحات Betaflight الأخرى.',
    group: 'page-actions',
    controlType: 'action',
    scope: 'universal',
    safetyLevel: 'warning',
    requiresSave: true,
    requiresReboot: false,
    source: mspHelperSource,
  },
];

export const modesPage: BfPage = {
  id: 'modes',
  officialId: 'auxiliary',
  officialTitle: 'Modes',
  titleAr: 'أوضاع التشغيل',
  officialOrder: 10,
  summaryAr: 'تعيين مفاتيح جهاز الإرسال (نطاقات) أو ربط أوضاع ببعضها (روابط) لتفعيل كل وظائف الطائرة — بما فيها التسليح (ARM) — مع منطق AND/OR حقيقي وقائمة أوضاع تُقرأ حيًا من الطائرة المتصلة.',
  connectionState: 'connected',
  contentStatus: 'reviewed',
  firmwareVersionRange: BF_VERSION_CONTEXT.releaseLine,
  appVersionRange: BF_VERSION_CONTEXT.releaseLine,
  reviewedAt: BF_VERSION_CONTEXT.reviewedAt,
  source: htmlSource,
  expertRequired: false,
  scope: 'universal',
  safetyLevel: 'critical',
  glossaryTermIds: [],
  relatedPageIds: ['setup', 'receiver', 'failsafe'],
  groups: [
    { id: 'toolbox', titleAr: 'أدوات الصفحة', level: 'basic', order: 1, fields: toolboxFields },
    { id: 'modes-table', officialTitle: 'Modes', titleAr: 'جدول الأوضاع', level: 'basic', order: 2, fields: modesTableFields },
    { id: 'page-actions', titleAr: 'إجراءات الصفحة', level: 'basic', order: 3, fields: pageActionFields },
  ],
};
