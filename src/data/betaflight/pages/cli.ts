import type { BfPage, BfField } from '../types';
import { makeConfiguratorSourceRef } from '../sourceHelpers';
import { BF_VERSION_CONTEXT } from '../sourceHelpers';

/**
 * Phase 5 — complete page. This page is fundamentally different from
 * every other reviewed page: it is not a settings form, it is a real
 * interactive terminal that sends raw text to the flight controller's
 * CLI parser.
 *
 * Verified against the cloned Configurator source (tag 2025.12.2):
 *   - src/tabs/cli.html (62 lines — command textarea, output window,
 *     snippet-preview dialog, support-data dialog, toolbar)
 *   - src/js/tabs/cli.js (562 lines — command sending/history/autocomplete
 *     wiring, exit-on-leave behavior, file load/save, support-data flow)
 *   - src/js/CliAutoComplete.js (629 lines — native FC autocomplete engine;
 *     not modeled field-by-field here, only its user-facing behavior)
 *   - locales/en/messages.json (every English label/warning below,
 *     verbatim)
 *
 * Deliberate scope decision, per explicit instruction: this page does
 * NOT attempt to document individual CLI commands (`diff`, `dump`,
 * `defaults`, `set`, `get`, `profile`, `save`, `exit`, etc.). The real
 * Configurator UI itself does not enumerate them either — they are just
 * text the user types into the terminal, validated by whatever CLI
 * parser the connected firmware build actually implements. Any such list
 * authored here would necessarily go stale across firmware versions and
 * targets, and would not be something a user can extract from this
 * Configurator UI/JS layer alone. Instead this is stated explicitly in
 * the terminal field's explanation: "الأوامر المتاحة تعتمد على فيرموير
 * الطائرة المتصلة فعليًا" (the available commands depend on the connected
 * firmware build).
 *
 * A real, verified structural fact: leaving this tab or disconnecting
 * automatically sends the literal command "exit" to the board — and on
 * recent firmware that command causes the flight controller to restart.
 * Any command typed but not yet followed by "save" is lost on that
 * restart. This is the verbatim official warning (cliInfo) and is
 * preserved exactly, marked `critical`.
 */

const htmlSource = makeConfiguratorSourceRef({
  title: 'Betaflight App — CLI tab',
  repoPath: 'src/tabs/cli.html',
  applicability: 'universal',
  officialId: 'cli',
});

const jsSource = makeConfiguratorSourceRef({
  title: 'Betaflight App — CLI tab behavior',
  repoPath: 'src/js/tabs/cli.js',
  applicability: 'universal',
  officialId: 'cli',
});

const autoCompleteSource = makeConfiguratorSourceRef({
  title: 'Betaflight App — CLI autocomplete engine',
  repoPath: 'src/js/CliAutoComplete.js',
  applicability: 'universal',
  officialId: 'cli',
});

const infoFields: BfField[] = [
  {
    id: 'cli-info-warning',
    englishLabel: 'CLI tab — safety note',
    arabicMeaning: 'تحذير سلامة CLI',
    arabicExplanation: 'النص الرسمي الكامل (cliInfo) بالحرف: "Note: Leaving CLI tab or pressing Disconnect will automatically send \'exit\' to the board. With the latest firmware this will make the controller restart and unsaved changes will be lost. Warning: Some commands in CLI can result in arbitrary signals being sent on the motor output pins. This can cause motors to spin up if a battery is connected. Therefore it is highly recommended to make sure that no battery is connected before entering commands in CLI." — أي: مغادرة تبويب CLI أو الضغط على "قطع الاتصال" يرسل تلقائيًا الأمر "exit" للطائرة، ما قد يعيد تشغيلها في الفيرموير الحديث ويفقد أي تغييرات غير محفوظة. تحذير: بعض أوامر CLI قد ترسل إشارات عشوائية لمخارج المحركات، مما قد يشغّلها فعليًا إذا كانت بطارية موصولة — يوصى بشدة بعدم توصيل أي بطارية قبل كتابة أوامر في CLI.',
    group: 'info',
    controlType: 'status',
    scope: 'universal',
    safetyLevel: 'critical',
    beginnerGuidance: 'لا توصل بطارية أبدًا قبل الدخول إلى CLI أو كتابة أي أمر فيه.',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
];

const terminalFields: BfField[] = [
  {
    id: 'command-output-window',
    englishLabel: 'CLI output window',
    arabicMeaning: 'نافذة مخرجات CLI',
    arabicExplanation: 'منطقة عرض حية (terminal) تعرض كل استجابات الطائرة النصية الفعلية أولًا بأول، بدءًا من رسالة الترحيب التي يرسلها الفيرموير عند الدخول لوضع CLI. هذا ليس محتوى مُعدًّا مسبقًا — كل سطر هو استجابة حقيقية من الفيرموير المتصل.',
    group: 'terminal',
    controlType: 'status',
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'command-input',
    englishLabel: 'Command input',
    arabicMeaning: 'سطر إدخال الأوامر',
    arabicExplanation: 'النص التوضيحي الرسمي (cliInputPlaceholder): "Write your command here. Press Tab for AutoComplete." — حقل نصي حر يُرسَل محتواه حرفيًا إلى محلّل أوامر CLI في الفيرموير المتصل عند الضغط على Enter. الأوامر المتاحة فعليًا تعتمد كليًا على فيرموير الطائرة المتصلة — هذا التطبيق لا يوثّق ولا يخترع قائمة أوامر CLI، لأن أي قائمة كهذه ستصبح قديمة عبر إصدارات وأهداف الفيرموير المختلفة، ولأن واجهة Configurator نفسها لا تُعدِّد الأوامر أيضًا.',
    group: 'terminal',
    controlType: 'text',
    scope: 'hardware-dependent',
    conditionNote: 'الأوامر الصالحة فعليًا تعتمد كليًا على فيرموير الطائرة المتصلة؛ لا توجد قائمة أوامر ثابتة في التطبيق.',
    safetyLevel: 'critical',
    beginnerGuidance: 'أوامر خاطئة أو غير مفهومة قد تجعل الطائرة غير قابلة للاستخدام — لا تكتب أوامر لا تفهم تأثيرها.',
    requiresSave: false,
    requiresReboot: false,
    source: htmlSource,
  },
  {
    id: 'command-history-navigation',
    englishLabel: 'Command history (Up/Down arrows)',
    arabicMeaning: 'التنقل في سجل الأوامر',
    arabicExplanation: 'مفتاحا الأسهم لأعلى/لأسفل يستدعيان الأوامر المُرسَلة سابقًا في هذه الجلسة (cli.history.prev/next)، بترتيب زمني، لإعادة استخدامها أو تعديلها دون كتابتها من جديد.',
    group: 'terminal',
    controlType: 'status',
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'command-autocomplete',
    englishLabel: 'AutoComplete (Tab key)',
    arabicMeaning: 'الإكمال التلقائي (مفتاح Tab)',
    arabicExplanation: 'الضغط على Tab يُكمِل الأمر أو اسم الإعداد تلقائيًا، بالاعتماد على محرّك إكمال تلقائي حقيقي (CliAutoComplete.js) يستمد قائمته من استجابات الفيرموير المتصل فعليًا (وليس من قائمة أوامر ثابتة مُضمَّنة في التطبيق)، مع رجوع (fallback) لآلية الإكمال التلقائي الأصلية للمتصفح إذا تعذّر ذلك.',
    group: 'terminal',
    controlType: 'status',
    scope: 'hardware-dependent',
    conditionNote: 'قائمة الإكمال التلقائي الفعلية تعتمد على استجابات الفيرموير المتصل.',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: autoCompleteSource,
  },
];

const toolbarFields: BfField[] = [
  {
    id: 'save-to-file-button',
    englishLabel: 'Save to File',
    arabicMeaning: 'حفظ إلى ملف',
    arabicExplanation: 'يحفظ محتوى نافذة المخرجات الحالية بالكامل إلى ملف نصي محلي على جهاز المستخدم — لا يُرسِل أي شيء للطائرة.',
    group: 'toolbar',
    controlType: 'action',
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'load-from-file-button',
    englishLabel: 'Load from file',
    arabicMeaning: 'تحميل من ملف',
    arabicExplanation: 'يفتح ملفًا نصيًا محليًا (.txt) ويعرض محتواه في حوار معاينة قبل أي إرسال فعلي — لا يُنفَّذ شيء تلقائيًا دون مراجعة صريحة.',
    group: 'toolbar',
    controlType: 'action',
    scope: 'universal',
    safetyLevel: 'warning',
    dependsOnFieldIds: ['snippet-preview-textarea', 'snippet-execute-button'],
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'clear-output-history-button',
    englishLabel: 'Clear output history',
    arabicMeaning: 'مسح سجل المخرجات',
    arabicExplanation: 'يفرّغ نافذة المخرجات المعروضة محليًا فقط — لا يؤثر على أي شيء في الطائرة.',
    group: 'toolbar',
    controlType: 'action',
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'copy-to-clipboard-button',
    englishLabel: 'Copy to clipboard',
    arabicMeaning: 'نسخ إلى الحافظة',
    arabicExplanation: 'ينسخ محتوى نافذة المخرجات الحالية إلى حافظة النظام.',
    group: 'toolbar',
    controlType: 'action',
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'submit-support-data-button',
    englishLabel: 'Submit Support Data',
    arabicMeaning: 'إرسال بيانات دعم فني',
    arabicExplanation: 'يفتح حوار تأكيد قبل تنفيذ مجموعة أوامر تشخيصية تلقائيًا وإرسال مخرجاتها لخادم بناء Betaflight الرسمي، للمساعدة في الدعم الفني عبر Discord أو GitHub Issues.',
    group: 'toolbar',
    controlType: 'action',
    scope: 'universal',
    safetyLevel: 'warning',
    dependsOnFieldIds: ['support-warning-input', 'support-submit-button', 'support-cancel-button'],
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
];

const snippetPreviewDialogFields: BfField[] = [
  {
    id: 'snippet-preview-textarea',
    englishLabel: 'Snippet preview',
    arabicMeaning: 'معاينة الأوامر المحمَّلة',
    arabicExplanation: 'النص الرسمي (cliConfirmSnippetNote): "Note: You can review and edit commands before execution." — منطقة نصية قابلة للتعديل تعرض الأوامر المحمَّلة من الملف، تسمح بمراجعتها أو تعديلها قبل أي إرسال فعلي للطائرة. العنوان الديناميكي للحوار (cliConfirmSnippetDialogTitle): "Loaded file {fileName}. Review the loaded commands".',
    group: 'snippet-preview-dialog',
    controlType: 'text',
    scope: 'universal',
    safetyLevel: 'warning',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'snippet-execute-button',
    englishLabel: 'Execute',
    arabicMeaning: 'تنفيذ الأوامر المحمَّلة',
    arabicExplanation: 'يرسل كل سطر من الأوامر المعروضة في المعاينة إلى الطائرة تباعًا (بفاصل زمني بين الأسطر، أطول عند الأسطر التي تبدأ بـ profile) — هذا هو الإجراء الفعلي الوحيد الذي يُرسِل الأوامر المحمَّلة من ملف إلى الطائرة الحقيقية.',
    group: 'snippet-preview-dialog',
    controlType: 'action',
    scope: 'universal',
    safetyLevel: 'critical',
    beginnerGuidance: 'راجع كل سطر في المعاينة جيدًا قبل الضغط هنا — هذا يُنفَّذ فعليًا على الطائرة الحقيقية.',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
];

const supportWarningDialogFields: BfField[] = [
  {
    id: 'support-warning-input',
    englishLabel: 'Describe the problem',
    arabicMeaning: 'وصف المشكلة',
    arabicExplanation: 'النص الرسمي (supportWarningDialogText): يوضح أن العملية ستنفّذ بعض الأوامر التشخيصية وترسل مخرجاتها إلى خادم البناء، وستحصل بعدها على معرّف فريد يجب تقديمه لفريق Betaflight عند استخدام Discord أو فتح Issue على GitHub. النص التوضيحي (supportWarningDialogInputPlaceHolder): "Describe the problem".',
    group: 'support-warning-dialog',
    controlType: 'text',
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'support-submit-button',
    englishLabel: 'Submit',
    arabicMeaning: 'تأكيد إرسال بيانات الدعم',
    arabicExplanation: 'يؤكد تنفيذ الأوامر التشخيصية وإرسال مخرجاتها فعليًا لخادم Betaflight الرسمي.',
    group: 'support-warning-dialog',
    controlType: 'action',
    scope: 'universal',
    safetyLevel: 'warning',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
  {
    id: 'support-cancel-button',
    englishLabel: 'Cancel (support dialog)',
    arabicMeaning: 'إلغاء إرسال بيانات الدعم',
    arabicExplanation: 'يغلق حوار إرسال بيانات الدعم دون تنفيذ أي شيء.',
    group: 'support-warning-dialog',
    controlType: 'action',
    scope: 'universal',
    safetyLevel: 'informational',
    requiresSave: false,
    requiresReboot: false,
    source: jsSource,
  },
];

export const cliPage: BfPage = {
  id: 'cli',
  officialId: 'cli',
  officialTitle: 'CLI',
  titleAr: 'سطر الأوامر',
  officialOrder: 12,
  summaryAr: 'طرفية تفاعلية حقيقية للتواصل المباشر مع محلّل أوامر الفيرموير عبر نص حر — وليست صفحة إعدادات. الأوامر المتاحة تعتمد كليًا على فيرموير الطائرة المتصلة فعليًا، ومغادرة الصفحة أو قطع الاتصال يرسل تلقائيًا أمر "exit" الذي قد يعيد تشغيل الطائرة ويفقد أي تغييرات غير محفوظة.',
  connectionState: 'connected',
  contentStatus: 'reviewed',
  firmwareVersionRange: BF_VERSION_CONTEXT.releaseLine,
  appVersionRange: BF_VERSION_CONTEXT.releaseLine,
  reviewedAt: BF_VERSION_CONTEXT.reviewedAt,
  source: htmlSource,
  expertRequired: true,
  scope: 'universal',
  safetyLevel: 'critical',
  glossaryTermIds: [],
  relatedPageIds: ['presets', 'configuration'],
  groups: [
    { id: 'info', titleAr: 'تنبيه السلامة', level: 'basic', order: 1, fields: infoFields },
    { id: 'terminal', titleAr: 'الطرفية التفاعلية', level: 'expert', order: 2, fields: terminalFields },
    { id: 'toolbar', titleAr: 'شريط الأدوات', level: 'basic', order: 3, fields: toolbarFields },
    { id: 'snippet-preview-dialog', titleAr: 'حوار معاينة الملف المحمَّل', level: 'advanced', order: 4, fields: snippetPreviewDialogFields },
    { id: 'support-warning-dialog', officialTitle: 'Confirm Data Submission', titleAr: 'حوار تأكيد إرسال بيانات الدعم', level: 'advanced', order: 5, fields: supportWarningDialogFields },
  ],
};
