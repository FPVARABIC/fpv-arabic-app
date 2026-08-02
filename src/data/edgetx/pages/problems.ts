import type { EdgeTxPage } from '../types';
import {
  EDGETX_MANUAL, EDGETX_REPO, ELRS_DOCS, ELRS_LUA, ELRS_MODEL_MATCH,
  RADIO_VENDOR, BF_SERIAL_RX, PATH_CAVEAT, VERSION_NOTE_GENERIC,
} from '../sources';

/**
 * أعطال جهة الراديو.
 *
 * THE RULE THAT SHAPES EVERY PAGE HERE
 * ------------------------------------
 * Four of these six symptoms already have a full diagnostic procedure elsewhere
 * in the platform — inside the ExpressLRS centre or inside a diagnostic tree.
 * Rewriting those procedures here would give the platform two answers to one
 * question, and the second one would rot.
 *
 * So each of those four covers ONLY what is genuinely radio-side — the checks
 * that live in EdgeTX and nowhere else — and then names the owner via
 * `canonicalDiagnosis`. The remaining two (the memory card, the radio's own
 * firmware files) have no owner anywhere else, and say so via `ownsDiagnosis`
 * with the reason recorded in the data.
 */

export const edgeTxProblemModuleMissing: EdgeTxPage = {
  id: 'problem-module-missing',
  titleAr: 'الوحدة لا تظهر',
  titleEn: 'The RF module does not appear',
  kind: 'problem',
  summaryAr:
    'الجهاز لا يعرض الوحدة، أو يعرضها ولا يتعرف عليها، أو تختفي القوائم الخاصة بها. هذه الصفحة تغطي أسباب جهة الراديو فقط.',
  whenNeededAr: 'حين تركّب وحدة ولا تظهر في القوائم، أو تختفي بعد تحديث، أو تظهر متقطعة.',
  whereAr: `إعداد النموذج ثم قسم الوحدة، وقوائم النظام للتحقق من الإصدار. ${PATH_CAVEAT}`,
  level: 'beginner',
  risk: 'warning',
  prerequisitesAr: ['المراوح منزوعة', 'معرفة نوع وحدتك وموقعها'],
  groups: [],
  stepsAr: [
    { textAr: 'ابدأ بالأقل خطراً: أطفئ الجهاز وافحص استقرار الوحدة في الفتحة بعينك', risk: 'caution' },
    { textAr: 'تأكد أنك في النموذج الصحيح — تفعيل الوحدة إعداد لكل نموذج على حدة' },
    { textAr: 'تأكد أن الوحدة الخارجية مفعّلة لهذا النموذج، وأن الداخلية موقوفة إن كنت تستخدم الخارجية' },
    { textAr: 'راجع إصدار نظام تشغيل جهازك: دعم بعض الوحدات يتطلب إصداراً أحدث' },
    { textAr: 'راجع سرعة الاتصال بالوحدة إن كان جهازك يعرض تحذيراً بفقد الاتصال بها' },
    { textAr: 'إن بقيت الوحدة غير ظاهرة بعد ذلك، فالسبب على الأرجح في الوحدة نفسها لا في الراديو', noteAr: 'تابع الإجراء الكامل في مركز ExpressLRS' },
  ],
  relationAr: [
    'الوحدة لا علاقة لها بالمستقبل في هذه المرحلة: إن لم يرَ الجهاز الوحدة فلا شيء يُبثّ أصلاً.',
    'الإجراء الكامل لعدم اكتشاف وحدة ExpressLRS موجود في مركز ExpressLRS، وهذه الصفحة لا تكرره.',
    'Betaflight خارج الموضوع تماماً هنا.',
  ],
  commonMistakesAr: [
    'فحص إعداد نموذج غير النموذج المفتوح.',
    'افتراض عطل في الوحدة قبل التحقق من استقرارها في الفتحة.',
    'تجاهل إصدار نظام تشغيل الجهاز رغم أنه شرط دعم بعض الوحدات.',
    'تكرار المحاولة بلا تغيير أي متغير.',
  ],
  verifyAr: [
    'الوحدة تظهر في إعداد النموذج ويظهر نظامها.',
    'لا يظهر تحذير متكرر بفقد الاتصال بالوحدة.',
    'قائمة النظام على الجهاز تفتح وتعرض قيماً حيّة.',
  ],
  revertAr: 'أعد أي إعداد غيّرته أثناء الفحص إلى قيمته السابقة قبل الانتقال إلى الإجراء الكامل.',
  versionNotesAr: [
    VERSION_NOTE_GENERIC,
    'دعم بعض الوحدات أُضيف في إصدارات معينة من EdgeTX — الإصدار جزء من التشخيص لا تفصيل جانبي.',
  ],
  troubleshootingAr: [
    { symptomAr: 'الوحدة تظهر ثم تختفي', checkAr: 'راجع استقرارها الميكانيكي في الفتحة أولاً، ثم سرعة الاتصال بها.' },
    { symptomAr: 'الوحدة تظهر ولا تفتح قائمتها', checkAr: 'هذه مشكلة نص برمجي لا مشكلة وحدة — انتقل إلى موضوع مشكلات النصوص.' },
  ],
  manualRequiredAr: [
    'الإصدار الأدنى من نظام تشغيل الجهاز الذي تتطلبه وحدتك',
    'نوع الفتحة التي يدعمها جهازك',
    'هل تحتاج وحدتك تغذية إضافية',
  ],
  canonicalDiagnosis: {
    kind: 'elrs-issue',
    targetId: 'tx-not-detected',
    label: 'الإجراء الكامل: وحدة الإرسال غير مكتشفة',
    reason: 'الإجراء الكامل لهذه المشكلة موثّق مرة واحدة في مركز ExpressLRS، وهذه الصفحة تغطي جهة الراديو فقط.',
  },
  links: [
    { kind: 'edgetx', targetId: 'external-module', label: 'EdgeTX: إعداد الوحدة الخارجية' },
    { kind: 'edgetx', targetId: 'internal-module', label: 'EdgeTX: إعداد الوحدة الداخلية' },
    { kind: 'edgetx', targetId: 'firmware-update', label: 'EdgeTX: تحديث نظام التشغيل' },
    { kind: 'project', targetId: 'moduleKind', label: 'سجّل نوع وحدتك' },
  ],
  sources: [EDGETX_MANUAL, ELRS_DOCS, RADIO_VENDOR],
  lastReviewed: '2026-08',
  bot: {
    intents: ['diagnose', 'navigate', 'missing_data'],
    symptomsAr: ['الوحدة لا تظهر', 'الراديو لا يرى الوحدة', 'الموديول ما يطلع'],
    misspellingsAr: ['موديول', 'مديول', 'module not detected', 'الوحده ماتظهر'],
    actions: [
      { kind: 'elrs-issue', targetId: 'tx-not-detected', label: 'افتح الإجراء الكامل' },
      { kind: 'edgetx', targetId: 'external-module', label: 'افتح إعداد الوحدة الخارجية' },
      { kind: 'project', targetId: 'moduleKind', label: 'سجّل نوع وحدتك' },
    ],
    systems: ['rc-link'],
    software: ['edgetx', 'expresslrs'],
    parts: [],
    requiresBeforeVerdict: ['طراز الوحدة', 'إصدار نظام تشغيل الجهاز', 'هل الوحدة داخلية أم خارجية'],
    safetyPrerequisitesAr: ['أطفئ الجهاز قبل فحص تركيب الوحدة', 'لا تشغّل وحدة بلا هوائي'],
  },
};

export const edgeTxProblemLua: EdgeTxPage = {
  id: 'problem-lua',
  titleAr: 'مشكلات النصوص البرمجية',
  titleEn: 'Lua script problems',
  kind: 'problem',
  summaryAr:
    'النص لا يظهر، أو يظهر ولا يفتح، أو يفتح ويبقى فارغاً. لكل حالة سبب مختلف، والخلط بينها هو ما يطيل التشخيص.',
  whenNeededAr: 'حين لا تفتح قائمة ضبط نظامك الراديوي من الجهاز، أو لا يظهر نص نسخته.',
  whereAr: `قائمة تشغيل النصوص، وبطاقة الذاكرة على الحاسوب. ${PATH_CAVEAT}`,
  level: 'intermediate',
  risk: 'caution',
  prerequisitesAr: ['بطاقة ذاكرة قابلة للقراءة', 'معرفة إصدار برنامج وحدتك'],
  groups: [],
  stepsAr: [
    { textAr: 'افصل بين الحالات الثلاث أولاً: لا يظهر، يظهر ولا يفتح، يفتح فارغاً' },
    { textAr: 'إن كان لا يظهر: المشكلة في مكان الملف على البطاقة أو في البطاقة نفسها' },
    { textAr: 'إن كان يفتح فارغاً: المشكلة غالباً في التواصل مع الوحدة لا في الملف' },
    { textAr: 'تأكد أن الوحدة مفعّلة لهذا النموذج قبل أي شيء آخر' },
    { textAr: 'قارن إصدار النص بإصدار برنامج وحدتك — عدم التطابق أشيع سبب' },
    { textAr: 'إن بقيت المشكلة بعد تطابق الإصدارين، تابع الإجراء الكامل في مركز ExpressLRS' },
  ],
  relationAr: [
    'قائمة ضبط النظام تخاطب الوحدة، فمشكلة فيها قد تكون مشكلة في الوحدة أو في الرابط معها لا في الملف.',
    'الإجراء الكامل لعدم تحميل النص موثّق في مركز ExpressLRS، وهذه الصفحة تغطي جهة الراديو والبطاقة.',
    'لا علاقة لـBetaflight بهذه المشكلة.',
  ],
  commonMistakesAr: [
    'الخلط بين «لا يظهر» و«يفتح فارغاً» ومعالجتهما بالطريقة نفسها.',
    'استخدام إصدار نص لا يطابق برنامج الوحدة.',
    'وضع الملف في مجلد غير الذي يذكره توثيقه.',
    'محاولة فتح القائمة والوحدة موقوفة لهذا النموذج.',
  ],
  verifyAr: [
    'النص يظهر في قائمة التشغيل.',
    'يفتح ويعرض قيماً حيّة من الوحدة.',
    'القيمة التي تغيّرها تبقى مطبَّقة بعد إعادة الفتح.',
  ],
  revertAr: 'احذف ملف النص وانسخ الإصدار الصحيح مكانه. لا يترك أثراً في إعدادات النماذج.',
  versionNotesAr: [
    VERSION_NOTE_GENERIC,
    'مجلد النصوص وبنيته تغيّرا بين إصدارات EdgeTX، وإصدار النص يتبع برنامج الوحدة لا الراديو.',
  ],
  troubleshootingAr: [
    { symptomAr: 'النص لا يظهر في قائمة التشغيل', checkAr: 'المجلد الخطأ أو بطاقة لا تُقرأ — راجع موضوع محتويات بطاقة الذاكرة.' },
    { symptomAr: 'النص يفتح ويبقى فارغاً', checkAr: 'الوحدة موقوفة أو لا تستجيب — راجع إعداد الوحدة أولاً.' },
  ],
  manualRequiredAr: [
    'إصدار النص المطابق لبرنامج وحدتك',
    'المجلد الصحيح في إصدار جهازك',
  ],
  canonicalDiagnosis: {
    kind: 'elrs-issue',
    targetId: 'lua-not-loading',
    label: 'الإجراء الكامل: النص لا يُحمَّل',
    reason: 'الإجراء الكامل موثّق مرة واحدة في مركز ExpressLRS، وهذه الصفحة تغطي جهة الراديو والبطاقة فقط.',
  },
  links: [
    { kind: 'edgetx', targetId: 'lua-scripts', label: 'EdgeTX: النصوص البرمجية' },
    { kind: 'edgetx', targetId: 'sd-card', label: 'EdgeTX: محتويات البطاقة' },
    { kind: 'elrs-issue', targetId: 'lua-stuck-loading', label: 'ExpressLRS: النص عالق عند التحميل' },
  ],
  sources: [EDGETX_MANUAL, ELRS_LUA, EDGETX_REPO],
  lastReviewed: '2026-08',
  bot: {
    intents: ['diagnose', 'navigate', 'missing_data'],
    symptomsAr: ['Lua لا تعمل', 'اللوا ما تفتح', 'القائمة فاضية'],
    misspellingsAr: ['لوا', 'لووا', 'lua', 'سكربت لا يعمل'],
    actions: [
      { kind: 'elrs-issue', targetId: 'lua-not-loading', label: 'افتح الإجراء الكامل' },
      { kind: 'edgetx', targetId: 'sd-card', label: 'افتح محتويات البطاقة' },
    ],
    systems: ['rc-link'],
    software: ['edgetx', 'expresslrs'],
    parts: [],
    requiresBeforeVerdict: ['إصدار برنامج الوحدة', 'إصدار النص', 'هل الوحدة مفعّلة'],
    safetyPrerequisitesAr: ['أطفئ الجهاز قبل إخراج البطاقة'],
  },
};

export const edgeTxProblemTelemetry: EdgeTxPage = {
  id: 'problem-telemetry',
  titleAr: 'مشكلات التليمتري',
  titleEn: 'Telemetry problems',
  kind: 'problem',
  summaryAr:
    'لا تظهر مستشعرات، أو تظهر بلا قيم، أو تختفي بعد أن كانت تعمل. أول سؤال هو: هل المشكلة في الرابط أم في القائمة أم في المصدر؟',
  whenNeededAr: 'حين لا يعرض جهازك بيانات عائدة من الطائرة رغم وجود رابط.',
  whereAr: `شاشة التليمتري في قوائم النموذج. ${PATH_CAVEAT}`,
  level: 'intermediate',
  risk: 'warning',
  prerequisitesAr: ['رابط قائم', 'الطائرة موصولة بالطاقة', 'المراوح منزوعة'],
  groups: [],
  stepsAr: [
    { textAr: 'انزع المراوح ثم صل الطاقة إلى الطائرة', risk: 'critical' },
    { textAr: 'تأكد أولاً من وجود رابط فعلي — بلا رابط لا يوجد تليمتري' },
    { textAr: 'احذف قائمة المستشعرات القديمة وأعد الاكتشاف' },
    { textAr: 'افصل بين ثلاث حالات: لا مستشعرات إطلاقاً، مستشعرات بلا قيم، مستشعرات ناقصة' },
    { textAr: 'إن كانت القيم المفقودة من متحكم الطيران، فتحقق من تفعيل التليمتري فيه' },
    { textAr: 'إن بقي الغياب كاملاً رغم وجود رابط، تابع الإجراء الكامل في مركز ExpressLRS' },
  ],
  relationAr: [
    'بعض القيم يقيسها المستقبل بنفسه وبعضها يمرره عن متحكم الطيران — وموضع الخلل يختلف بينهما.',
    'نسبة التليمتري في نظامك تحدد كم من سعة الرابط يذهب إلى البيانات العائدة.',
    'قيم مثل الجهد والارتفاع تتطلب تفعيل التليمتري في Betaflight وإلا فلن تصل أبداً.',
  ],
  commonMistakesAr: [
    'إعادة الاكتشاف فوق قائمة قديمة.',
    'انتظار قيم من متحكم الطيران بلا تفعيل التليمتري فيه.',
    'الحكم بغياب التليمتري والطائرة غير موصولة بالطاقة.',
    'الخلط بين غياب كل المستشعرات وغياب بعضها — سببهما مختلف.',
  ],
  verifyAr: [
    'المستشعرات تظهر بعد الاكتشاف.',
    'كل مستشعر يعرض قيمة تتغير.',
    'القيم القادمة من متحكم الطيران تظهر بعد تفعيل التليمتري فيه.',
  ],
  revertAr: 'حذف قائمة المستشعرات وإعادة الاكتشاف عملية آمنة تماماً، وأثرها الوحيد فقد حدود التنبيه المضبوطة.',
  versionNotesAr: [
    VERSION_NOTE_GENERIC,
    'أسماء المستشعرات تأتي من برنامج المستقبل ومن متحكم الطيران، فقد تتغير بعد تحديث أيٍّ منهما.',
  ],
  troubleshootingAr: [
    { symptomAr: 'لا تظهر أي مستشعرات', checkAr: 'تحقق من وجود رابط ومن توصيل الطاقة قبل أي شيء آخر.' },
    { symptomAr: 'تظهر أسماء بلا قيم', checkAr: 'قائمة قديمة من عتاد سابق — احذفها وأعد الاكتشاف.' },
  ],
  manualRequiredAr: [
    'أي القيم يرسلها إعدادك فعلاً',
    'هل يتطلب متحكم طيرانك إعداداً إضافياً لإرسال التليمتري',
  ],
  canonicalDiagnosis: {
    kind: 'elrs-issue',
    targetId: 'telemetry-missing',
    label: 'الإجراء الكامل: التليمتري مفقود',
    reason: 'الإجراء الكامل موثّق مرة واحدة في مركز ExpressLRS، وهذه الصفحة تغطي جهة الراديو وقائمة المستشعرات.',
  },
  links: [
    { kind: 'edgetx', targetId: 'telemetry-sensors', label: 'EdgeTX: مستشعرات التليمتري' },
    { kind: 'edgetx', targetId: 'discover-sensors', label: 'EdgeTX: اكتشاف المستشعرات' },
    { kind: 'betaflight', targetId: 'configuration', label: 'Betaflight: الإعدادات العامة' },
    { kind: 'project', targetId: 'telemetryRatio', label: 'سجّل نسبة التليمتري' },
  ],
  sources: [EDGETX_MANUAL, ELRS_DOCS, BF_SERIAL_RX],
  lastReviewed: '2026-08',
  bot: {
    intents: ['diagnose', 'navigate', 'project_check', 'missing_data'],
    symptomsAr: ['لا توجد Telemetry', 'ما في تليمتري', 'المستشعرات تظهر بلا قيم'],
    misspellingsAr: ['تليمتري', 'تلمتري', 'telemetry', 'حساسات'],
    actions: [
      { kind: 'elrs-issue', targetId: 'telemetry-missing', label: 'افتح الإجراء الكامل' },
      { kind: 'edgetx', targetId: 'discover-sensors', label: 'افتح اكتشاف المستشعرات' },
      { kind: 'betaflight', targetId: 'configuration', label: 'افتح إعدادات Betaflight' },
    ],
    systems: ['rc-link'],
    software: ['edgetx', 'expresslrs', 'betaflight'],
    parts: ['receivers', 'flightControllers'],
    requiresBeforeVerdict: ['هل يوجد رابط', 'هل الطائرة موصولة بالطاقة', 'هل التليمتري مفعّل في متحكم الطيران'],
    safetyPrerequisitesAr: ['انزع المراوح قبل توصيل الطاقة'],
  },
};

export const edgeTxProblemModelMatch: EdgeTxPage = {
  id: 'problem-model-match',
  titleAr: 'مشكلات مطابقة النموذج',
  titleEn: 'Model Match problems',
  kind: 'problem',
  summaryAr:
    'العرَض المميز لهذه المشكلة أنها تبدو عطل عتاد: مستقبل كان يعمل توقف عن الاتصال فجأة بعد تغيير في الجهاز.',
  whenNeededAr: 'حين يتوقف مستقبل عن الاتصال بعد تفعيل المطابقة أو بعد نسخ نموذج أو استعادة نسخة.',
  whereAr: `إعداد النموذج ضمن إعدادات الوحدة، ومن قائمة النظام على الجهاز. ${PATH_CAVEAT}`,
  level: 'intermediate',
  risk: 'warning',
  prerequisitesAr: ['المراوح منزوعة', 'معرفة هل فعّلت المطابقة ومتى'],
  groups: [],
  stepsAr: [
    { textAr: 'انزع المراوح', risk: 'critical' },
    { textAr: 'اسأل أولاً: هل فعّلت المطابقة أو نسخت نموذجاً أو استعدت نسخة قبل ظهور المشكلة؟' },
    { textAr: 'تأكد أنك فتحت النموذج الصحيح لهذه الطائرة' },
    { textAr: 'راجع أرقام النماذج: رقمان متطابقان يلغيان فائدة المطابقة بلا رسالة خطأ' },
    { textAr: 'أعد ربط المستقبل — المطابقة لا تسري على ربط سابق', risk: 'warning' },
    { textAr: 'إن بقي المستقبل بلا اتصال، تابع الإجراء الكامل في مركز ExpressLRS' },
  ],
  relationAr: [
    'المستقبل هو من يخزّن رقم النموذج، فأي تغيير في الرقم يتطلب ربطاً جديداً.',
    'دعم المطابقة وشروطها يتبعان إصدار نظامك الراديوي.',
    'Betaflight لا يرى شيئاً من هذا: من جهته إما وصلت قنوات أو لم تصل.',
  ],
  commonMistakesAr: [
    'تشخيص العرَض كعطل عتاد وشراء مستقبل جديد.',
    'تفعيل المطابقة بلا إعادة ربط.',
    'نسخ نموذج فيرث الرقم نفسه.',
    'تغيير رقم النموذج ثم توقّع استمرار الاتصال.',
  ],
  verifyAr: [
    'الطائرة تتصل عند فتح نموذجها فقط.',
    'لا تتصل عند فتح نموذج آخر.',
    'لا يوجد رقمان متطابقان بين نماذجك.',
  ],
  revertAr: 'أوقف المطابقة ثم أعد الربط، ثم أعد تفعيلها بوعي إن كنت تريدها.',
  versionNotesAr: [
    VERSION_NOTE_GENERIC,
    'شروط المطابقة ودعمها يتبعان برنامج نظامك الراديوي لا EdgeTX وحده.',
  ],
  troubleshootingAr: [
    { symptomAr: 'المستقبل يربط بنموذج ولا يربط بآخر', checkAr: 'هذا هو السلوك المقصود للمطابقة. إن لم تكن تريده، أوقفها وأعد الربط.' },
  ],
  manualRequiredAr: [
    'هل يدعم إصدار برنامج مستقبلك المطابقة',
    'حدود ترقيم النماذج في نظامك',
  ],
  canonicalDiagnosis: {
    kind: 'elrs-issue',
    targetId: 'model-match-blocks',
    label: 'الإجراء الكامل: المطابقة تمنع الاتصال',
    reason: 'الإجراء الكامل موثّق مرة واحدة في مركز ExpressLRS، وهذه الصفحة تغطي جهة الراديو وترقيم النماذج.',
  },
  links: [
    { kind: 'edgetx', targetId: 'model-match', label: 'EdgeTX: مطابقة النموذج' },
    { kind: 'dx', targetId: 'dx-rc-bind-fail', label: 'تشخيص: الربط لا يتم' },
    { kind: 'project', targetId: 'modelMatch', label: 'سجّل حالة المطابقة' },
  ],
  sources: [EDGETX_MANUAL, ELRS_MODEL_MATCH],
  lastReviewed: '2026-08',
  bot: {
    intents: ['diagnose', 'bind_device', 'navigate'],
    symptomsAr: ['المستقبل توقف عن الاتصال فجأة', 'لا يدخل Bind', 'البايند لا يعمل'],
    misspellingsAr: ['موديل ماتش', 'model match', 'مودل ماتش'],
    actions: [
      { kind: 'elrs-issue', targetId: 'model-match-blocks', label: 'افتح الإجراء الكامل' },
      { kind: 'dx', targetId: 'dx-rc-bind-fail', label: 'ابدأ تشخيص الربط' },
      { kind: 'project', targetId: 'modelMatch', label: 'سجّل حالة المطابقة' },
    ],
    systems: ['rc-link'],
    software: ['edgetx', 'expresslrs'],
    parts: ['receivers'],
    requiresBeforeVerdict: ['هل المطابقة مفعّلة', 'هل أعدت الربط بعد التفعيل'],
    safetyPrerequisitesAr: ['انزع المراوح قبل إعادة الربط'],
  },
};

export const edgeTxProblemSdCard: EdgeTxPage = {
  id: 'problem-sd-card',
  titleAr: 'مشكلات بطاقة الذاكرة',
  titleEn: 'SD card problems',
  kind: 'problem',
  summaryAr:
    'الجهاز يشتكي من البطاقة، أو الأصوات صامتة، أو النصوص لا تظهر، أو تختفي إعدادات بلا سبب. هذه أعراض مختلفة لسبب واحد غالباً.',
  whenNeededAr: 'عند أي رسالة عن البطاقة، وعند غياب الأصوات، وعند اختفاء نصوص أو ملفات كانت موجودة.',
  whereAr: `تُفحص البطاقة على الحاسوب، وتُقرأ رسائل الجهاز عند الإقلاع. ${PATH_CAVEAT}`,
  level: 'beginner',
  risk: 'warning',
  prerequisitesAr: ['قارئ بطاقات', 'نسخة احتياطية من البطاقة إن أمكن قراءتها'],
  groups: [],
  stepsAr: [
    { textAr: 'أطفئ الجهاز قبل إخراج البطاقة' },
    { textAr: 'ابدأ بالأقل خطراً: انسخ محتوى البطاقة إلى حاسوبك قبل أي إصلاح', risk: 'warning' },
    { textAr: 'افحص هل يقرأ الحاسوب البطاقة أصلاً — إن لم يقرأها فالمشكلة في البطاقة لا في الجهاز' },
    { textAr: 'تحقق من صيغة التهيئة: صيغة لا يقبلها جهازك تنتج رسائل خطأ عند الإقلاع' },
    { textAr: 'تحقق من مطابقة مجموعة الملفات لإصدار نظام تشغيلك' },
    { textAr: 'إن تكررت المشكلة بعد إعادة التهيئة والنسخ، استبدل البطاقة — البطاقات الرديئة سبب متكرر' },
  ],
  relationAr: [
    'النصوص البرمجية والأصوات تعيش على البطاقة، فأعطالها تظهر كأعطال في قوائم النظام الراديوي.',
    'لا علاقة للبطاقة بالمستقبل ولا بـBetaflight.',
    'تحديث نظام التشغيل يتطلب مجموعة ملفات مطابقة على البطاقة.',
  ],
  commonMistakesAr: [
    'إعادة تهيئة البطاقة قبل أخذ نسخة منها.',
    'استخدام صيغة تهيئة لا يقبلها الجهاز.',
    'الاستمرار مع بطاقة رديئة لأن المشكلة متقطعة.',
    'خلط ملفات إصدارين مختلفين على البطاقة نفسها.',
  ],
  verifyAr: [
    'لا تظهر رسائل عن البطاقة عند الإقلاع.',
    'الأصوات تُسمع فعلاً.',
    'النصوص البرمجية تظهر في قائمة التشغيل.',
    'السجلات تُكتب بعد رحلة.',
  ],
  revertAr: 'أعد النسخة التي أخذتها قبل الإصلاح. إن كانت البطاقة تالفة فلا تراجع — البديل بطاقة أخرى.',
  versionNotesAr: [
    VERSION_NOTE_GENERIC,
    'الصيغ وأحجام البطاقات المدعومة تختلف بين طُرز الراديو وبين إصدارات نظام التشغيل.',
  ],
  troubleshootingAr: [
    { symptomAr: 'رسالة عن البطاقة عند كل إقلاع', checkAr: 'صيغة التهيئة أو ملفات ناقصة أو بطاقة تالفة، بهذا الترتيب.' },
    { symptomAr: 'المشكلة متقطعة', checkAr: 'التقطّع علامة على بطاقة على وشك التلف أكثر منه علامة على خطأ إعداد.' },
  ],
  manualRequiredAr: [
    'الصيغة والحجم اللذان يقبلهما جهازك',
    'بنية المجلدات في إصدارك',
  ],
  ownsDiagnosis: {
    reasonAr:
      'بطاقة ذاكرة الراديو لا يغطيها أي إجراء آخر في المنصة: مركز ExpressLRS يتعامل مع أجهزة النظام الراديوي، وأشجار التشخيص تتعامل مع الطائرة. هذا العرَض ملك EdgeTX ولا يوجد له نظير في مكان آخر.',
  },
  links: [
    { kind: 'edgetx', targetId: 'sd-card', label: 'EdgeTX: محتويات البطاقة' },
    { kind: 'edgetx', targetId: 'backup', label: 'EdgeTX: النسخ الاحتياطي' },
    { kind: 'edgetx', targetId: 'problem-lua', label: 'EdgeTX: مشكلات النصوص' },
  ],
  sources: [EDGETX_MANUAL, RADIO_VENDOR, EDGETX_REPO],
  lastReviewed: '2026-08',
  bot: {
    intents: ['diagnose', 'recover_device', 'missing_data'],
    symptomsAr: ['الجهاز لا يقرأ البطاقة', 'لا توجد أصوات', 'رسالة خطأ عند تشغيل الراديو'],
    misspellingsAr: ['اس دي', 'sd card', 'الميموري', 'كرت ذاكره'],
    actions: [
      { kind: 'edgetx', targetId: 'sd-card', label: 'افتح محتويات البطاقة' },
      { kind: 'edgetx', targetId: 'backup', label: 'افتح النسخ الاحتياطي' },
    ],
    systems: ['rc-link'],
    software: ['edgetx'],
    parts: [],
    requiresBeforeVerdict: ['صيغة تهيئة بطاقتك', 'إصدار نظام تشغيلك', 'هل يقرأ الحاسوب البطاقة'],
    safetyPrerequisitesAr: ['أطفئ الجهاز قبل إخراج البطاقة', 'خذ نسخة قبل أي إعادة تهيئة'],
  },
};

export const edgeTxProblemFirmwareFiles: EdgeTxPage = {
  id: 'problem-firmware-files',
  titleAr: 'أخطاء نظام التشغيل وملفات الراديو',
  titleEn: 'Firmware and radio file errors',
  kind: 'problem',
  summaryAr:
    'الجهاز لا يقلع بعد تحديث، أو يعطي رسالة عن ملف، أو يفقد نماذجه، أو يرفض فتح نموذج. الفرق بين هذه الحالات يحدد الإجراء.',
  whenNeededAr: 'بعد تحديث فاشل أو مقاطَع، وبعد استعادة من إصدار مختلف، وعند أي رسالة خطأ عن ملف.',
  whereAr: `الأداة الرسمية على الحاسوب، وبطاقة الذاكرة، ورسائل الجهاز نفسه. ${PATH_CAVEAT}`,
  level: 'advanced',
  risk: 'critical',
  prerequisitesAr: [
    'نسخة احتياطية إن وُجدت',
    'معرفة الطراز الدقيق للجهاز والإصدار الذي كنت تحدّث إليه',
    'كابل ينقل بيانات فعلاً',
  ],
  groups: [],
  stepsAr: [
    { textAr: 'لا تكرر التحديث بالملف نفسه قبل التأكد من صحته', risk: 'critical' },
    { textAr: 'افصل بين الحالات: لا يقلع إطلاقاً، يقلع مع رسالة، يقلع بلا نماذج، يرفض فتح نموذج' },
    { textAr: 'إن كان لا يقلع إطلاقاً: تأكد من ملف الطراز الصحيح ثم اتبع إجراء الاسترجاع في دليل جهازك', risk: 'critical' },
    { textAr: 'إن كان يقلع مع رسالة عن ملف: راجع مجموعة ملفات البطاقة ومطابقتها للإصدار' },
    { textAr: 'إن كان يقلع بلا نماذج: أعد الاستعادة من نسختك الاحتياطية' },
    { textAr: 'إن كان يرفض فتح نموذج بعينه: غالباً عدم توافق صيغة بين إصدارين — راجع ملاحظات الإصدار' },
    { textAr: 'لا تفصل الطاقة أثناء أي عملية كتابة، مهما طالت', risk: 'critical' },
  ],
  relationAr: [
    'هذه المشكلة تخصّ نظام تشغيل الراديو نفسه، وهي مختلفة تماماً عن فشل تحديث وحدة أو مستقبل ExpressLRS.',
    'الاسترجاع بعد تحديث فاشل لأجهزة ExpressLRS له إجراؤه المستقل في مركز ExpressLRS.',
    'لا علاقة لـBetaflight بهذه المشكلة إطلاقاً.',
  ],
  commonMistakesAr: [
    'إعادة المحاولة بالملف الخطأ نفسه.',
    'فصل الكابل عند أول توقف ظاهري في شريط التقدم.',
    'محاولة الاستعادة من نسخة إصدار غير متوافق ثم الحكم على النماذج بالتلف.',
    'التحديث بلا نسخة احتياطية ثم البحث عن حل يعيد النماذج.',
  ],
  verifyAr: [
    'الجهاز يقلع ويعرض الإصدار المتوقع.',
    'النماذج موجودة وتفتح.',
    'لا تظهر رسائل خطأ عن ملفات.',
    'المفاتيح وفقد الإشارة أُعيد اختبارهما بعد الإصلاح.',
  ],
  revertAr:
    'التحديث بملف الإصدار السابق ممكن عادة، لكن إعدادات النماذج قد لا تكون متوافقة رجوعاً. النسخة الاحتياطية هي المسار الوحيد المضمون.',
  versionNotesAr: [
    VERSION_NOTE_GENERIC,
    'إجراء الاسترجاع يختلف بين طُرز الراديو اختلافاً كبيراً — دليل جهازك هو المرجع، لا شرح عام.',
  ],
  troubleshootingAr: [
    { symptomAr: 'الجهاز يقلع ويرفض فتح نموذج واحد فقط', checkAr: 'عدم توافق صيغة ذلك النموذج مع الإصدار الحالي — أعد استعادته من نسخة الإصدار المطابق.' },
    { symptomAr: 'شريط التقدم توقف أثناء التحديث', checkAr: 'انتظر رسالة صريحة. الفصل المبكر هو ما يحوّل تحديثاً بطيئاً إلى جهاز لا يقلع.' },
  ],
  manualRequiredAr: [
    'إجراء الاسترجاع الخاص بطراز جهازك',
    'اسم ملف الطراز الصحيح',
    'توافق صيغ النماذج بين إصدارك الحالي والسابق',
  ],
  ownsDiagnosis: {
    reasonAr:
      'أخطاء نظام تشغيل الراديو وملفاته ليست مغطاة في أي مكان آخر: إجراءات مركز ExpressLRS تخص أجهزة النظام الراديوي (الوحدة والمستقبل)، لا الراديو نفسه. تكرار الإجراء هناك كان سيخلط بين جهازين مختلفين تماماً.',
  },
  links: [
    { kind: 'edgetx', targetId: 'firmware-update', label: 'EdgeTX: تحديث نظام التشغيل' },
    { kind: 'edgetx', targetId: 'restore', label: 'EdgeTX: الاستعادة' },
    { kind: 'elrs-issue', targetId: 'recovery-after-bad-flash', label: 'ExpressLRS: الاسترجاع بعد تحديث فاشل' },
    { kind: 'external', targetId: 'edgetx-manual', label: 'الدليل الرسمي لـEdgeTX', url: 'https://manual.edgetx.org/' },
  ],
  sources: [EDGETX_MANUAL, EDGETX_REPO, RADIO_VENDOR],
  lastReviewed: '2026-08',
  bot: {
    intents: ['recover_device', 'update_firmware', 'diagnose', 'safety_warning'],
    symptomsAr: ['التحديث توقف', 'الجهاز لا يقلع بعد التحديث', 'فقدت نماذجي'],
    misspellingsAr: ['فيرموير', 'firmware', 'الراديو مات', 'بريك'],
    actions: [
      { kind: 'edgetx', targetId: 'restore', label: 'افتح الاستعادة' },
      { kind: 'edgetx', targetId: 'firmware-update', label: 'افتح تحديث نظام التشغيل' },
      { kind: 'project', targetId: 'radioModel', label: 'سجّل طراز جهازك' },
    ],
    systems: ['rc-link'],
    software: ['edgetx'],
    parts: [],
    requiresBeforeVerdict: ['طراز الجهاز', 'الإصدار المستهدف', 'هل توجد نسخة احتياطية'],
    safetyPrerequisitesAr: [
      'لا تفصل الطاقة أثناء عملية كتابة',
      'لا تكرر التحديث بملف لم تتأكد من صحته',
    ],
  },
};
