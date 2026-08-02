import type { EdgeTxPage } from '../types';
import {
  EDGETX_MANUAL, EDGETX_REPO, ELRS_DOCS, ELRS_LUA, ELRS_MODEL_MATCH,
  BF_SERIAL_RX, BF_FAILSAFE, RADIO_VENDOR, RC_PRINCIPLE,
  PATH_CAVEAT, VERSION_NOTE_GENERIC,
} from '../sources';

/**
 * الرابط والسلامة — what comes back, what identifies the aircraft, and what
 * happens when the link stops.
 *
 * These six topics share one theme: they are the parts of the radio that are
 * only worth anything if they were TESTED. A telemetry screen with no live
 * value, a Model Match nobody verified, a failsafe never triggered on purpose —
 * all three look configured and none of them is.
 */

export const edgeTxTelemetrySensors: EdgeTxPage = {
  id: 'telemetry-sensors',
  titleAr: 'مستشعرات التليمتري',
  titleEn: 'Telemetry Sensors',
  kind: 'reference',
  summaryAr:
    'شاشة التليمتري هي المكان الذي يعرض فيه جهازك ما يعود من الطائرة: جهد البطارية، جودة الرابط، وغيرهما. القيمة الحقيقية ليست في رؤيتها بل في أن تنذرك قبل الانقطاع.',
  whenNeededAr:
    'بعد أول ربط ناجح، وبعد كل تحديث لبرنامج المستقبل أو الوحدة، وحين تريد بناء تحذير على قيمة عائدة.',
  whereAr: `قوائم النموذج ثم شاشة التليمتري (Model ← Telemetry). ${PATH_CAVEAT}`,
  level: 'intermediate',
  risk: 'warning',
  prerequisitesAr: ['مستقبل مربوط وموصول بالطاقة', 'نظام راديوي يدعم عودة البيانات'],
  groups: [
    {
      id: 'sensors',
      titleAr: 'قائمة المستشعرات',
      settings: [
        {
          id: 'sensor-list',
          labelAr: 'المستشعرات المكتشفة',
          labelEn: 'Sensors',
          whatAr: 'كل قيمة يعرفها جهازك عائدة من الطائرة، باسمها ووحدتها.',
          effectAr: 'ما ليس في هذه القائمة لا يمكن عرضه ولا بناء تحذير عليه.',
          whenAr: 'راجعها بعد كل ربط جديد وبعد كل تحديث.',
          riskAr: 'قائمة قديمة من إعداد سابق قد تحمل مستشعرات لم تعد موجودة، فتظهر قيماً ميتة.',
          risk: 'warning',
          verifyAr: 'القيم تتحرك فعلياً حين تحرّك الطائرة أو تغيّر الحمل، لا مجرد ظهور اسم.',
          revertAr: 'احذف القائمة كلها ثم أعد الاكتشاف من جديد.',
          versionNoteAr: 'أسماء المستشعرات تأتي من برنامج المستقبل ومن متحكم الطيران لا من EdgeTX، فقد يتغير الاسم نفسه بعد تحديث أيٍّ منهما.',
        },
        {
          id: 'sensor-units',
          labelAr: 'الوحدات والدقة',
          labelEn: 'Unit / Precision',
          whatAr: 'كيف تُعرض القيمة وبأي دقة.',
          effectAr: 'يغيّر العرض فقط، لا القيمة القادمة من الطائرة.',
          whenAr: 'حين تكون الوحدة المعروضة غير مألوفة لك.',
          risk: 'info',
          verifyAr: 'قارن القيمة المعروضة بقياس مستقل، مثل جهاز فحص خلايا البطارية.',
          revertAr: 'أعد الوحدة الافتراضية.',
        },
        {
          id: 'sensor-alarms',
          labelAr: 'حدود التنبيه',
          labelEn: 'Low / Critical alarm',
          whatAr: 'قيمتان يبدأ عندهما التحذير.',
          effectAr:
            'هذا هو سبب وجود التليمتري أصلاً: أن يخبرك قبل أن تسقط الطائرة لا بعدها.',
          whenAr: 'اضبطهما فور اكتشاف مستشعر الجهد.',
          riskAr: 'حد منخفض جداً يعني تحذيراً يصل بعد فوات الأوان على البطارية.',
          risk: 'warning',
          verifyAr: 'اختبر على الأرض ببطارية شبه فارغة والمراوح منزوعة، وتأكد أنك تسمع التحذير.',
          revertAr: 'أعد القيم الافتراضية ثم اضبطها من جديد.',
          manualCheckAr: 'الحدود الآمنة لبطاريتك تعتمد على نوعها وعدد خلاياها — اقرأ توثيقها.',
        },
      ],
    },
  ],
  stepsAr: [
    { textAr: 'انزع المراوح قبل أي اختبار', risk: 'critical' },
    { textAr: 'صل الطاقة إلى الطائرة واربط' },
    { textAr: 'افتح شاشة التليمتري واحذف أي قائمة قديمة' },
    { textAr: 'شغّل اكتشاف المستشعرات ودعه يعمل حتى تستقر القائمة' },
    { textAr: 'تأكد أن كل قيمة تتحرك فعلياً' },
    { textAr: 'اضبط حدود التنبيه على مستشعر الجهد', risk: 'warning' },
    { textAr: 'اختبر التحذير مسموعاً قبل أن تعتمد عليه', risk: 'warning' },
  ],
  relationAr: [
    'المستقبل هو مصدر معظم هذه القيم، ومنها ما يقيسه بنفسه ومنها ما يمرره عن متحكم الطيران.',
    'في ExpressLRS تعود البيانات على الرابط نفسه، ونسبة التليمتري تحدد كم من سعة الرابط يذهب إليها.',
    'قيم مثل جهد البطارية وارتفاعها تأتي غالباً من متحكم الطيران، ويجب تفعيل التليمتري في Betaflight ليرسلها.',
  ],
  commonMistakesAr: [
    'اعتبار ظهور اسم المستشعر دليلاً على أنه يعمل، بلا التحقق من تحرّك القيمة.',
    'الاحتفاظ بقائمة مستشعرات قديمة بعد تبديل عتاد.',
    'ضبط حد التنبيه بلا اختباره مسموعاً.',
    'توقّع قيماً من متحكم الطيران بلا تفعيل التليمتري فيه.',
  ],
  verifyAr: [
    'كل مستشعر في القائمة يعرض قيمة تتغير.',
    'القيمة تقارب قياساً مستقلاً حين يمكن قياسها.',
    'التحذير يُسمع فعلاً عند بلوغ الحد.',
  ],
  revertAr: 'احذف قائمة المستشعرات وأعد الاكتشاف. حذف القائمة لا يمسّ الطائرة ولا الإعدادات الأخرى.',
  versionNotesAr: [
    VERSION_NOTE_GENERIC,
    'أسماء المستشعرات تأتي من برنامج المستقبل ومتحكم الطيران لا من EdgeTX، فقد تتغير بعد تحديث أيٍّ منهما.',
  ],
  troubleshootingAr: [
    {
      symptomAr: 'لا تظهر أي مستشعرات إطلاقاً',
      checkAr: 'ابدأ من موضوع اكتشاف المستشعرات، ثم من مشكلة غياب التليمتري في مركز ExpressLRS إن بقي الغياب كاملاً.',
    },
  ],
  manualRequiredAr: [
    'الحدود الآمنة لبطاريتك',
    'أي القيم يرسلها متحكم طيرانك وأيها يقيسها المستقبل نفسه',
  ],
  links: [
    { kind: 'edgetx', targetId: 'discover-sensors', label: 'EdgeTX: اكتشاف المستشعرات' },
    { kind: 'edgetx', targetId: 'problem-telemetry', label: 'EdgeTX: مشكلات التليمتري' },
    { kind: 'elrs-issue', targetId: 'telemetry-missing', label: 'ExpressLRS: التليمتري مفقود' },
    { kind: 'betaflight', targetId: 'configuration', label: 'Betaflight: الإعدادات العامة' },
  ],
  sources: [EDGETX_MANUAL, ELRS_DOCS, BF_SERIAL_RX],
  lastReviewed: '2026-08',
  bot: {
    intents: ['explain', 'software_setup', 'diagnose', 'project_check'],
    symptomsAr: ['لا توجد Telemetry', 'ما في تليمتري', 'لا أرى جهد البطارية على الراديو'],
    misspellingsAr: ['تليمتري', 'تلمتري', 'telemtry', 'telemetery'],
    actions: [
      { kind: 'edgetx', targetId: 'discover-sensors', label: 'افتح اكتشاف المستشعرات' },
      { kind: 'elrs-issue', targetId: 'telemetry-missing', label: 'افتح مشكلة التليمتري المفقود' },
      { kind: 'project', targetId: 'telemetryRatio', label: 'سجّل نسبة التليمتري في مشروعك' },
    ],
    systems: ['rc-link'],
    software: ['edgetx', 'expresslrs', 'betaflight'],
    parts: ['receivers', 'flightControllers'],
    requiresBeforeVerdict: ['هل التليمتري مفعّل في متحكم الطيران', 'ما نسبة التليمتري المضبوطة'],
    safetyPrerequisitesAr: ['انزع المراوح قبل اختبار تحذيرات الجهد'],
  },
};

export const edgeTxDiscoverSensors: EdgeTxPage = {
  id: 'discover-sensors',
  titleAr: 'اكتشاف مستشعرات جديدة',
  titleEn: 'Discover New Sensors',
  kind: 'task',
  summaryAr:
    'الاكتشاف هو أن يصغي الجهاز إلى ما يصله ويبني قائمة بما وجده. لا يخترع مستشعراً ولا يجلب واحداً غير موجود — يسجّل ما وصل فقط.',
  whenNeededAr:
    'بعد أول ربط، وبعد تحديث برنامج المستقبل أو متحكم الطيران، وبعد إضافة مستشعر جديد، وحين تختفي قيمة كانت تظهر.',
  whereAr: `شاشة التليمتري، أمر اكتشاف المستشعرات (Model ← Telemetry ← Discover new sensors). ${PATH_CAVEAT}`,
  level: 'beginner',
  risk: 'caution',
  prerequisitesAr: ['رابط قائم فعلاً', 'الطائرة موصولة بالطاقة', 'المراوح منزوعة'],
  groups: [
    {
      id: 'discovery',
      titleAr: 'كيف يعمل الاكتشاف',
      settings: [
        {
          id: 'discover-run',
          labelAr: 'تشغيل الاكتشاف',
          labelEn: 'Discover new sensors',
          whatAr: 'وضع إصغاء يسجّل كل مستشعر يصل خلال المدة التي يبقى فيها مشغّلاً.',
          effectAr: 'يبني قائمة المستشعرات التي تعتمد عليها الشاشات والتحذيرات.',
          whenAr: 'مع كل تغيير في العتاد أو البرنامج على أي من الطرفين.',
          riskAr: 'إيقافه مبكراً ينتج قائمة ناقصة تبدو كأن مستشعراً معطل.',
          risk: 'caution',
          verifyAr: 'اترك الاكتشاف يعمل حتى تتوقف القائمة عن النمو، ثم أوقفه.',
          revertAr: 'احذف القائمة وأعد الاكتشاف.',
        },
        {
          id: 'discover-delete',
          labelAr: 'حذف القائمة قبل إعادة الاكتشاف',
          labelEn: 'Delete all sensors',
          whatAr: 'مسح القائمة الحالية بالكامل.',
          effectAr: 'يمنع بقاء مستشعرات قديمة من عتاد لم يعد موجوداً.',
          whenAr: 'قبل إعادة الاكتشاف بعد أي تبديل عتاد أو تحديث كبير.',
          riskAr: 'الحذف يُفقد أي حدود تنبيه ضبطتها على تلك المستشعرات.',
          risk: 'caution',
          verifyAr: 'القائمة فارغة قبل بدء الاكتشاف الجديد.',
          revertAr: 'لا تراجع عن الحذف — أعد الاكتشاف ثم أعد ضبط الحدود.',
        },
      ],
    },
  ],
  stepsAr: [
    { textAr: 'انزع المراوح', risk: 'critical' },
    { textAr: 'صل الطاقة إلى الطائرة وتأكد من وجود رابط' },
    { textAr: 'احذف قائمة المستشعرات القديمة إن كنت بدّلت عتاداً' },
    { textAr: 'شغّل الاكتشاف واتركه حتى تتوقف القائمة عن النمو' },
    { textAr: 'أوقف الاكتشاف وراجع القائمة' },
    { textAr: 'أعد ضبط حدود التنبيه التي فقدتها بالحذف', risk: 'warning' },
  ],
  relationAr: [
    'ما يظهر هنا يأتي من المستقبل ومما يمرره عن متحكم الطيران — الاكتشاف لا يضيف شيئاً من عنده.',
    'إن لم يظهر شيء إطلاقاً فالمشكلة في الرابط أو في التليمتري نفسه، لا في الاكتشاف.',
    'قيم متحكم الطيران لا تصل ما لم يكن التليمتري مفعّلاً فيه.',
  ],
  commonMistakesAr: [
    'تشغيل الاكتشاف والطائرة غير موصولة بالطاقة.',
    'إيقاف الاكتشاف بعد ثوانٍ قليلة.',
    'إعادة الاكتشاف فوق قائمة قديمة بعد تبديل عتاد.',
  ],
  verifyAr: [
    'القائمة توقفت عن النمو قبل أن توقف الاكتشاف.',
    'كل مستشعر في القائمة يعرض قيمة تتغير.',
    'الحدود التي ضبطتها ما زالت موجودة بعد إعادة الضبط.',
  ],
  revertAr: 'احذف القائمة وأعد الاكتشاف من الصفر. لا شيء في هذه العملية يمسّ الطائرة.',
  versionNotesAr: [
    VERSION_NOTE_GENERIC,
    'اسم أمر الاكتشاف وموضعه داخل شاشة التليمتري اختلفا بين الإصدارات.',
  ],
  manualRequiredAr: [
    'أي القيم يرسلها إعدادك فعلاً',
    'هل يتطلب مستشعرك إعداداً إضافياً في متحكم الطيران',
  ],
  links: [
    { kind: 'edgetx', targetId: 'telemetry-sensors', label: 'EdgeTX: مستشعرات التليمتري' },
    { kind: 'edgetx', targetId: 'problem-telemetry', label: 'EdgeTX: مشكلات التليمتري' },
    { kind: 'elrs-issue', targetId: 'telemetry-missing', label: 'ExpressLRS: التليمتري مفقود' },
  ],
  sources: [EDGETX_MANUAL, ELRS_DOCS],
  lastReviewed: '2026-08',
  bot: {
    intents: ['software_setup', 'diagnose', 'navigate'],
    symptomsAr: ['لا توجد Telemetry', 'المستشعرات لا تظهر', 'اختفت قيمة كانت تظهر'],
    misspellingsAr: ['ديسكفر', 'discover sensors', 'اكتشاف حساسات'],
    actions: [
      { kind: 'edgetx', targetId: 'telemetry-sensors', label: 'افتح شاشة التليمتري' },
      { kind: 'elrs-issue', targetId: 'telemetry-missing', label: 'افتح مشكلة التليمتري المفقود' },
    ],
    systems: ['rc-link'],
    software: ['edgetx', 'expresslrs'],
    parts: ['receivers'],
    requiresBeforeVerdict: ['هل الطائرة موصولة بالطاقة أثناء الاكتشاف', 'هل يوجد رابط أصلاً'],
    safetyPrerequisitesAr: ['انزع المراوح قبل توصيل الطاقة للاكتشاف'],
  },
};

export const edgeTxLuaScripts: EdgeTxPage = {
  id: 'lua-scripts',
  titleAr: 'النصوص البرمجية على الجهاز',
  titleEn: 'Lua Scripts',
  kind: 'reference',
  summaryAr:
    'النص البرمجي هو ملف يعمل على جهازك ويعطيك قائمة أو شاشة إضافية. أشهر استخدام له في FPV هو قائمة ضبط النظام الراديوي من الجهاز مباشرة.',
  whenNeededAr:
    'حين تريد تغيير معدل الرزم أو القدرة أو نسبة التليمتري من الجهاز، أو حين توفّر شركة عتادك أداة تعمل على الراديو.',
  whereAr: `قائمة تشغيل النصوص من الشاشة الرئيسية أو من قوائم النموذج (Model ← Scripts؛ أو زر القائمة على الشاشة الرئيسية). ${PATH_CAVEAT}`,
  level: 'intermediate',
  risk: 'caution',
  prerequisitesAr: [
    'بطاقة ذاكرة سليمة وبها مجلدات النصوص',
    'ملف النص منسوخ من مصدره الرسمي وبإصدار يطابق برنامج وحدتك',
  ],
  groups: [
    {
      id: 'lua-basics',
      titleAr: 'من أين يأتي النص وأين يوضع',
      settings: [
        {
          id: 'lua-file',
          labelAr: 'ملف النص',
          labelEn: 'Script file',
          whatAr: 'ملف يُنسخ إلى مجلد محدد على بطاقة الذاكرة.',
          effectAr: 'وجوده في المجلد الصحيح هو ما يجعله يظهر في قائمة التشغيل.',
          whenAr: 'عند أول تركيب، وبعد كل تحديث لبرنامج الوحدة أو المستقبل.',
          riskAr: 'إصدار نص لا يطابق إصدار برنامج وحدتك هو أشيع سبب لقائمة لا تفتح أو تفتح فارغة.',
          risk: 'warning',
          verifyAr: 'النص يظهر في قائمة التشغيل ويفتح ويعرض قيماً حيّة من الوحدة.',
          revertAr: 'احذف الملف وانسخ الإصدار الصحيح مكانه.',
          versionNoteAr: 'المجلد الذي توضع فيه النصوص تغيّر بين إصدارات EdgeTX — اعتمد توثيق إصدارك وتوثيق النص نفسه لا مساراً منقولاً.',
          manualCheckAr: 'الإصدار المطابق لبرنامج وحدتك مذكور في توثيق نظامك الراديوي.',
        },
        {
          id: 'lua-memory',
          labelAr: 'حدود الجهاز',
          labelEn: 'Memory / performance',
          whatAr: 'النصوص تعمل ضمن موارد محدودة على الراديو.',
          effectAr: 'نصوص كثيرة أو ثقيلة قد تبطئ الجهاز أو تُوقف تشغيل نص.',
          whenAr: 'حين تلاحظ بطئاً أو توقفاً بعد إضافة نصوص.',
          riskAr: 'الإبطاء أثناء الطيران مصدر إزعاج، وقد يؤخر وصولك إلى قائمة تحتاجها.',
          risk: 'caution',
          verifyAr: 'أزل النصوص التي لا تستعملها ولاحظ الفرق.',
          revertAr: 'احذف ما أضفته أخيراً.',
        },
      ],
    },
  ],
  stepsAr: [
    { textAr: 'أطفئ الجهاز قبل إخراج بطاقة الذاكرة' },
    { textAr: 'نزّل النص من مصدره الرسمي فقط، بإصدار يطابق برنامج وحدتك' },
    { textAr: 'انسخه إلى المجلد الذي يذكره توثيق ذلك النص' },
    { textAr: 'أعد البطاقة وشغّل الجهاز' },
    { textAr: 'شغّل النص وتأكد أنه يعرض قيماً حيّة لا شاشة فارغة' },
  ],
  relationAr: [
    'قائمة ضبط النظام الراديوي تخاطب الوحدة والمستقبل معاً، فما تغيّره فيها يصل إلى الطائرة.',
    'في ExpressLRS تحديداً، هذه القائمة هي المكان الطبيعي لتغيير معدل الرزم والقدرة ونسبة التليمتري وتشغيل وضع Wi-Fi.',
    'لا علاقة لهذه النصوص بـBetaflight؛ هي أدوات على جهاز الإرسال.',
  ],
  commonMistakesAr: [
    'نسخ إصدار نص لا يطابق إصدار برنامج الوحدة.',
    'وضع الملف في مجلد غير الذي يذكره توثيقه.',
    'تنزيل نص من مصدر غير رسمي.',
    'محاولة تغيير إعداد يتطلب عدم وجود اتصال نشط بينما الاتصال قائم.',
  ],
  verifyAr: [
    'النص يظهر في قائمة التشغيل.',
    'يفتح ويعرض قيماً حيّة من الوحدة لا شاشة فارغة.',
    'القيمة التي تغيّرها تبقى مطبَّقة بعد إعادة فتح القائمة.',
  ],
  revertAr: 'احذف ملف النص من بطاقة الذاكرة. لا يترك أثراً في إعدادات النماذج.',
  versionNotesAr: [
    VERSION_NOTE_GENERIC,
    'المجلد الذي توضع فيه النصوص وأسماء المجلدات الفرعية تغيّرت بين إصدارات EdgeTX — اعتمد توثيق إصدارك وتوثيق النص نفسه.',
  ],
  troubleshootingAr: [
    {
      symptomAr: 'النص لا يفتح أو يفتح فارغاً',
      checkAr: 'الإجراء الكامل في موضوع مشكلات النصوص البرمجية، ثم في مشكلة عدم تحميل النص في مركز ExpressLRS.',
    },
  ],
  manualRequiredAr: [
    'الإصدار المطابق لبرنامج وحدتك',
    'المجلد الصحيح على بطاقتك حسب إصدار جهازك',
  ],
  links: [
    { kind: 'edgetx', targetId: 'problem-lua', label: 'EdgeTX: مشكلات النصوص البرمجية' },
    { kind: 'edgetx', targetId: 'sd-card', label: 'EdgeTX: محتويات بطاقة الذاكرة' },
    { kind: 'elrs-setup', targetId: 'lua-webui', label: 'ExpressLRS: قائمة الجهاز وواجهة الويب' },
    { kind: 'elrs-issue', targetId: 'lua-not-loading', label: 'ExpressLRS: النص لا يُحمَّل' },
  ],
  sources: [EDGETX_MANUAL, ELRS_LUA, EDGETX_REPO],
  lastReviewed: '2026-08',
  bot: {
    intents: ['explain', 'software_setup', 'diagnose', 'navigate'],
    symptomsAr: ['Lua لا تعمل', 'اللوا لا تفتح', 'القائمة فاضية'],
    misspellingsAr: ['لوا', 'لووا', 'lua script', 'سكربت'],
    actions: [
      { kind: 'edgetx', targetId: 'problem-lua', label: 'افتح مشكلات النصوص' },
      { kind: 'elrs-issue', targetId: 'lua-not-loading', label: 'افتح مشكلة عدم تحميل النص' },
      { kind: 'elrs-setup', targetId: 'lua-webui', label: 'افتح خطوة قائمة الجهاز' },
    ],
    systems: ['rc-link'],
    software: ['edgetx', 'expresslrs'],
    parts: [],
    requiresBeforeVerdict: ['إصدار برنامج وحدتك', 'إصدار النص الذي نسخته'],
    safetyPrerequisitesAr: ['أطفئ الجهاز قبل إخراج بطاقة الذاكرة'],
  },
};

export const edgeTxModelMatch: EdgeTxPage = {
  id: 'model-match',
  titleAr: 'مطابقة النموذج',
  titleEn: 'Model Match',
  kind: 'reference',
  summaryAr:
    'مطابقة النموذج تجعل المستقبل يقبل الربط بنموذج واحد بعينه. بدونها، أي مستقبل يحمل هوية الربط نفسها سيربط بجهازك فور تشغيله مهما كان النموذج المفتوح.',
  whenNeededAr:
    'حين تملك أكثر من طائرة تشترك في هوية الربط نفسها — وهذا هو الحال الطبيعي لمن يستعمل عبارة ربط واحدة لكل أسطوله.',
  whereAr: `إعداد النموذج، ضمن إعدادات الوحدة أو من قائمة النظام الراديوي على الجهاز. ${PATH_CAVEAT}`,
  level: 'intermediate',
  risk: 'warning',
  prerequisitesAr: ['نظام راديوي يدعم المطابقة', 'مستقبل ببرنامج يدعمها', 'نموذج منشأ لكل طائرة'],
  groups: [
    {
      id: 'mm',
      titleAr: 'كيف تعمل المطابقة',
      settings: [
        {
          id: 'mm-enable',
          labelAr: 'تفعيل المطابقة',
          labelEn: 'Model Match',
          whatAr: 'ربط المستقبل برقم النموذج داخل جهازك، لا بهوية الربط وحدها.',
          effectAr: 'يمنع تسليح الطائرة الخطأ حين تفتح النموذج الخطأ.',
          whenAr: 'فور امتلاكك أكثر من طائرة.',
          riskAr:
            'تفعيلها ثم نسيان إعادة الربط يعني مستقبلاً لن يتصل، والعرَض يشبه عطلاً في العتاد تماماً.',
          risk: 'warning',
          verifyAr: 'افتح نموذجاً آخر وتأكد أن هذه الطائرة لا تتصل به، ثم عد إلى نموذجها وتأكد من الاتصال.',
          revertAr: 'أوقف المطابقة ثم أعد الربط.',
        },
        {
          id: 'mm-id',
          labelAr: 'رقم النموذج',
          labelEn: 'Receiver / Model number',
          whatAr: 'الرقم الذي يميّز هذا النموذج داخل جهازك.',
          effectAr: 'هو ما يُخزَّن في المستقبل لحظة الربط، فيصبح المستقبل يقبل هذا النموذج وحده ويرفض غيره.',
          whenAr: 'عند إنشاء نموذج جديد، وعند نسخ نموذج قائم.',
          riskAr: 'نموذجان بالرقم نفسه يلغيان فائدة المطابقة بلا أن يظهر أي خطأ.',
          risk: 'warning',
          verifyAr: 'راجع أرقام كل نماذجك وتأكد أن لا رقمين متطابقين.',
          revertAr: 'غيّر الرقم ثم أعد الربط.',
        },
      ],
    },
  ],
  stepsAr: [
    { textAr: 'انزع المراوح', risk: 'critical' },
    { textAr: 'افتح النموذج الصحيح للطائرة التي أمامك' },
    { textAr: 'تأكد أن رقم النموذج غير مكرر عندك' },
    { textAr: 'فعّل المطابقة' },
    { textAr: 'أعد ربط المستقبل — المطابقة لا تسري على ربط سابق', risk: 'warning' },
    { textAr: 'اختبر: افتح نموذجاً آخر وتأكد أن الطائرة لا تتصل به' },
  ],
  relationAr: [
    'المستقبل هو من يخزّن رقم النموذج، ولذلك لا بد من إعادة الربط بعد التفعيل.',
    'في ExpressLRS تُفعَّل المطابقة من قائمة النظام على الجهاز، والتوثيق الرسمي يشرح شرط إعادة الربط.',
    'Betaflight لا علاقة له بالمطابقة إطلاقاً؛ من جهته إما وصلت قنوات أو لم تصل.',
  ],
  commonMistakesAr: [
    'تفعيل المطابقة بلا إعادة الربط، ثم تشخيص الأمر كعطل عتاد.',
    'نسخ نموذج فيرث الرقم نفسه فتفقد المطابقة معناها.',
    'تفعيلها على نموذج ثم توقّع سريانها على النماذج الأخرى.',
  ],
  verifyAr: [
    'الطائرة تتصل عند فتح نموذجها فقط.',
    'لا تتصل عند فتح نموذج آخر.',
    'لا يوجد رقمان متطابقان بين نماذجك.',
  ],
  revertAr: 'أوقف المطابقة ثم أعد الربط. المستقبل يعود بعدها إلى قبول أي نموذج بهوية الربط نفسها.',
  versionNotesAr: [
    VERSION_NOTE_GENERIC,
    'دعم المطابقة وشروطها يتبعان برنامج نظامك الراديوي وإصداره، لا EdgeTX وحده.',
  ],
  troubleshootingAr: [
    {
      symptomAr: 'المستقبل توقف عن الاتصال بعد تفعيل المطابقة',
      checkAr: 'هذا هو العرَض المتوقع قبل إعادة الربط. الإجراء الكامل في موضوع مشكلات مطابقة النموذج.',
    },
  ],
  manualRequiredAr: [
    'هل يدعم إصدار برنامج مستقبلك المطابقة',
    'حدود ترقيم النماذج في نظامك',
  ],
  links: [
    { kind: 'edgetx', targetId: 'problem-model-match', label: 'EdgeTX: مشكلات مطابقة النموذج' },
    { kind: 'elrs-issue', targetId: 'model-match-blocks', label: 'ExpressLRS: المطابقة تمنع الاتصال' },
    { kind: 'article', targetId: 'rc-binding', label: 'مقال: الربط' },
    { kind: 'project', targetId: 'modelMatch', label: 'سجّل حالة المطابقة في مشروعك' },
  ],
  sources: [EDGETX_MANUAL, ELRS_MODEL_MATCH],
  lastReviewed: '2026-08',
  bot: {
    intents: ['explain', 'software_setup', 'diagnose', 'bind_device'],
    symptomsAr: ['لا يدخل Bind', 'البايند لا يعمل', 'المستقبل توقف عن الاتصال فجأة'],
    misspellingsAr: ['موديل ماتش', 'model match', 'مودل ماتش'],
    actions: [
      { kind: 'elrs-issue', targetId: 'model-match-blocks', label: 'افتح مشكلة المطابقة' },
      { kind: 'dx', targetId: 'dx-rc-bind-fail', label: 'ابدأ تشخيص الربط' },
      { kind: 'project', targetId: 'modelMatch', label: 'سجّل حالة المطابقة' },
    ],
    systems: ['rc-link'],
    software: ['edgetx', 'expresslrs'],
    parts: ['receivers'],
    requiresBeforeVerdict: ['هل فعّلت المطابقة', 'هل أعدت الربط بعد التفعيل'],
    safetyPrerequisitesAr: ['انزع المراوح قبل إعادة الربط'],
  },
};

export const edgeTxFailsafe: EdgeTxPage = {
  id: 'failsafe',
  titleAr: 'سلوك فقد الإشارة',
  titleEn: 'Failsafe',
  kind: 'reference',
  summaryAr:
    'فقد الإشارة يحدث. السؤال الوحيد هو ماذا تفعل الطائرة حينها. هذا الإعداد موجود في ثلاثة مواضع — الجهاز والمستقبل ومتحكم الطيران — والمهم هو أيها يحكم فعلاً.',
  whenNeededAr:
    'قبل أول تحليق، وبعد أي تغيير في المستقبل أو متحكم الطيران أو إعداداتهما.',
  whereAr: `إعداد النموذج ضمن إعدادات الوحدة، ومن قائمة النظام الراديوي على الجهاز. ${PATH_CAVEAT}`,
  level: 'intermediate',
  risk: 'critical',
  prerequisitesAr: ['رابط عامل', 'المراوح منزوعة', 'مكان آمن للاختبار'],
  groups: [
    {
      id: 'fs',
      titleAr: 'ثلاثة مواضع وقرار واحد',
      introAr:
        'الطبقة الأقرب إلى الطائرة هي التي تحكم عملياً. ضبط الجهاز وحده لا يكفي، وضبط متحكم الطيران وحده قد لا يُفعَّل إن لم يبلغه المستقبل أن الإشارة فُقدت.',
      settings: [
        {
          id: 'fs-radio-side',
          labelAr: 'إعداد الجهاز',
          labelEn: 'Failsafe mode (module settings)',
          whatAr: 'ما يطلبه جهاز الإرسال من المستقبل أن يفعله عند فقد الإشارة.',
          effectAr:
            'يقرر هل يستمر المستقبل في إخراج آخر قيم، أم يخرج قيماً محددة، أم يتوقف عن الإخراج تماماً.',
          whenAr: 'قبل أول تحليق.',
          riskAr:
            'الإبقاء على آخر القيم يعني طائرة تواصل ما كانت تفعله بلا أحد يتحكم بها — وهذا أخطر الخيارات.',
          risk: 'critical',
          verifyAr: 'اختبر فعلياً بإطفاء الجهاز والمراوح منزوعة، وراقب سلوك متحكم الطيران.',
          revertAr: 'أعد الخيار السابق ثم أعد الاختبار.',
        },
        {
          id: 'fs-no-pulses',
          labelAr: 'التوقف عن الإخراج',
          labelEn: 'No Pulses',
          whatAr: 'أن يتوقف المستقبل عن إرسال أي إشارة إلى متحكم الطيران.',
          effectAr:
            'هو ما يجعل متحكم الطيران يكتشف فقد الإشارة بيقين ويطبّق سياسته الخاصة به.',
          whenAr: 'حين تريد أن يكون قرار السلوك في متحكم الطيران لا في المستقبل.',
          riskAr: 'لا يغني عن اختبار فعلي؛ الإعداد وحده ليس دليلاً.',
          risk: 'critical',
          verifyAr: 'أطفئ الجهاز وراقب أن متحكم الطيران يعلن فقد الإشارة ويطبّق سياسته.',
          revertAr: 'أعد الخيار السابق ثم أعد الاختبار.',
          manualCheckAr: 'الخيارات المتاحة وأسماؤها تتبع نظامك الراديوي وإصداره.',
        },
      ],
    },
  ],
  stepsAr: [
    { textAr: 'انزع المراوح وتحقق بعينك', risk: 'critical' },
    { textAr: 'اضبط سلوك المستقبل من قائمة النظام على جهازك' },
    { textAr: 'اضبط سياسة متحكم الطيران في صفحة فقد الإشارة عنده' },
    { textAr: 'أطفئ جهاز الإرسال عمداً وراقب ما يحدث', risk: 'critical' },
    { textAr: 'كرّر الاختبار أكثر من مرة — نتيجة واحدة ليست دليلاً', risk: 'critical' },
    { textAr: 'سجّل تاريخ الاختبار في مشروعك' },
  ],
  relationAr: [
    'المستقبل هو من ينفّذ ما طلبه الجهاز، ولذلك يجب أن يُعاد الربط أو الحفظ بعد أي تغيير حسب نظامك.',
    'في ExpressLRS يُضبط السلوك من قائمة النظام على الجهاز، والتوثيق الرسمي يحدد الخيارات لكل إصدار.',
    'في Betaflight تُضبط السياسة في صفحة فقد الإشارة، وهي التي تقرر الهبوط أو إيقاف التسليح.',
  ],
  commonMistakesAr: [
    'اعتبار حركة القنوات دليلاً على أن فقد الإشارة مضبوط.',
    'ضبط طبقة واحدة فقط من الثلاث.',
    'اختبار واحد ناجح ثم الطيران بثقة.',
    'الإبقاء على آخر القيم لأنه الخيار الافتراضي.',
  ],
  verifyAr: [
    'إطفاء الجهاز ينتج السلوك الذي ضبطته، لا سلوكاً آخر.',
    'النتيجة تتكرر في أكثر من محاولة متتالية.',
    'متحكم الطيران يعلن فقد الإشارة فعلاً في واجهته.',
  ],
  revertAr:
    'أعد الخيار السابق في الطبقة التي غيّرتها، ثم أعد الاختبار. لا تعتبر أي تراجع مكتملاً قبل اختبار جديد.',
  versionNotesAr: [
    VERSION_NOTE_GENERIC,
    'أسماء خيارات فقد الإشارة وسلوكها الافتراضي تختلف بين أنظمة راديوية وبين إصداراتها — لا تنقل اسم خيار من شرح نظام آخر.',
  ],
  troubleshootingAr: [
    {
      symptomAr: 'الطائرة لا تستجيب كما ضبطت عند إطفاء الجهاز',
      checkAr: 'ابدأ من شجرة تشخيص فقد الإشارة: هي تفصل بين طبقة المستقبل وطبقة متحكم الطيران بدل تخمين أيهما يحكم.',
    },
  ],
  manualRequiredAr: [
    'الخيارات المتاحة في نظامك الراديوي',
    'هل يتطلب نظامك إعادة ربط أو حفظاً بعد تغيير السلوك',
  ],
  links: [
    { kind: 'article', targetId: 'rc-failsafe', label: 'مقال: فقد الإشارة' },
    { kind: 'dx', targetId: 'dx-rc-failsafe', label: 'تشخيص: فقد الإشارة لا يعمل' },
    { kind: 'betaflight', targetId: 'failsafe', label: 'Betaflight: صفحة فقد الإشارة' },
    { kind: 'project', targetId: 'failsafeStrategy', label: 'سجّل استراتيجيتك في مشروعك' },
  ],
  sources: [EDGETX_MANUAL, ELRS_DOCS, BF_FAILSAFE],
  lastReviewed: '2026-08',
  bot: {
    intents: ['failsafe_setup', 'explain', 'diagnose', 'safety_warning', 'project_check'],
    symptomsAr: ['الطائرة لا تهبط عند فقد الإشارة', 'ما أعرف أضبط Failsafe', 'المستقبل يعيد التشغيل'],
    misspellingsAr: ['فيل سيف', 'failsafe', 'فيلسيف', 'فقدان اشاره'],
    actions: [
      { kind: 'betaflight', targetId: 'failsafe', label: 'افتح صفحة Failsafe' },
      { kind: 'dx', targetId: 'dx-rc-failsafe', label: 'ابدأ تشخيص فقد الإشارة' },
      { kind: 'project', targetId: 'failsafeStrategy', label: 'سجّل استراتيجيتك' },
    ],
    systems: ['rc-link'],
    software: ['edgetx', 'expresslrs', 'betaflight'],
    parts: ['receivers', 'flightControllers'],
    requiresBeforeVerdict: ['ما السلوك المضبوط في المستقبل', 'ما السياسة المضبوطة في متحكم الطيران', 'هل اختبرت فعلياً'],
    safetyPrerequisitesAr: [
      'انزع المراوح قبل أي اختبار لفقد الإشارة',
      'لا تعتبر الإعداد بديلاً عن الاختبار',
    ],
  },
};

export const edgeTxTrainer: EdgeTxPage = {
  id: 'trainer',
  titleAr: 'وضع المدرّب',
  titleEn: 'Trainer',
  kind: 'reference',
  summaryAr:
    'وضع المدرّب يربط جهازين معاً بحيث يستطيع المدرّب انتزاع التحكم فوراً. هو أرخص تأمين على طائرة وعلى متعلّم في آن واحد.',
  whenNeededAr:
    'حين تعلّم شخصاً الطيران، أو حين تتعلم بإشراف، أو حين تريد استخدام جهازك كوحدة تحكم لمحاكي على الحاسوب.',
  whereAr: `إعداد النموذج ضمن قسم المدرّب، وإعدادات عامة في قوائم النظام (Model ← Trainer؛ Radio ← Trainer). ${PATH_CAVEAT}`,
  level: 'intermediate',
  risk: 'warning',
  prerequisitesAr: [
    'جهازان أو كابل مدرّب أو وصلة لاسلكية يدعمها جهازك',
    'اتفاق واضح على مفتاح انتزاع التحكم قبل التحليق',
  ],
  groups: [
    {
      id: 'trainer-basics',
      titleAr: 'من يتحكم ومتى',
      settings: [
        {
          id: 'trainer-mode',
          labelAr: 'دور الجهاز',
          labelEn: 'Master / Slave',
          whatAr: 'أي الجهازين يبثّ إلى الطائرة، وأيهما يرسل مدخلاته إلى الآخر.',
          effectAr: 'الجهاز المدرّب هو الذي يبثّ فعلاً، والمتعلّم يمرر مدخلاته عبره.',
          whenAr: 'قبل أي جلسة تدريب.',
          riskAr: 'خطأ في تحديد الدور يعني طائرة بلا من يتحكم بها فعلياً.',
          risk: 'critical',
          verifyAr: 'اختبر على الأرض والمراوح منزوعة: حرّك عصي المتعلّم وراقب القنوات على جهاز المدرّب.',
          revertAr: 'أعد الدور السابق وأعد الاختبار قبل أي تحليق.',
        },
        {
          id: 'trainer-switch',
          labelAr: 'مفتاح تسليم التحكم',
          labelEn: 'Trainer switch',
          whatAr: 'المفتاح الذي يسلّم التحكم للمتعلّم ويسترده.',
          effectAr: 'هو الحاجز الوحيد بين خطأ المتعلّم وحادث.',
          whenAr: 'قبل كل جلسة.',
          riskAr: 'مفتاح ثابت بدل لحظي يعني استرداداً بطيئاً للتحكم.',
          risk: 'critical',
          verifyAr: 'اختبر التسليم والاسترداد عدة مرات على الأرض قبل التحليق.',
          revertAr: 'غيّر المفتاح وأعد الاختبار.',
        },
        {
          id: 'trainer-weight',
          labelAr: 'نسبة مدخلات المتعلّم',
          labelEn: 'Trainer weight',
          whatAr: 'كم من حركة المتعلّم يصل فعلاً إلى الطائرة.',
          effectAr: 'يسمح بالبدء بنسبة صغيرة ثم زيادتها مع التقدم.',
          whenAr: 'مع المبتدئين تماماً.',
          risk: 'caution',
          verifyAr: 'راقب القنوات على جهاز المدرّب وأنت تحرّك عصي المتعلّم.',
          revertAr: 'أعد النسبة الكاملة أو الصفر حسب ما تريد.',
        },
      ],
    },
  ],
  stepsAr: [
    { textAr: 'انزع المراوح قبل أي اختبار للربط بين الجهازين', risk: 'critical' },
    { textAr: 'حدد الدور على كل جهاز' },
    { textAr: 'وصّل الجهازين بالكابل أو بالوصلة التي يدعمها جهازك' },
    { textAr: 'عيّن مفتاح التسليم على مفتاح لحظي يسهل الوصول إليه' },
    { textAr: 'اختبر التسليم والاسترداد عدة مرات على الأرض', risk: 'critical' },
    { textAr: 'ابدأ بنسبة صغيرة لمدخلات المتعلّم' },
  ],
  relationAr: [
    'الطائرة لا تعرف شيئاً عن وضع المدرّب؛ ترى قنوات من جهاز واحد فقط.',
    'النظام الراديوي غير معني بهذا الوضع، فهو يعمل بين جهازين لا بين جهاز ومستقبل.',
    'الاستخدام الآخر الشائع هو توصيل الجهاز بحاسوب لتشغيل محاكي، وهذا موضوع منفصل.',
  ],
  commonMistakesAr: [
    'الطيران قبل اختبار الاسترداد على الأرض.',
    'تعيين التسليم على مفتاح ثابت.',
    'إعطاء المتعلّم النسبة الكاملة من أول جلسة.',
  ],
  verifyAr: [
    'حركة عصي المتعلّم تظهر على قنوات المدرّب حين يكون التسليم مفعّلاً فقط.',
    'الاسترداد فوري عند ترك المفتاح.',
    'لا تتحرك أي قناة من المتعلّم والتسليم مغلق.',
  ],
  revertAr: 'أوقف وضع المدرّب من إعداد النموذج وافصل الكابل. لا يترك أثراً على بقية الإعدادات.',
  versionNotesAr: [
    VERSION_NOTE_GENERIC,
    'أساليب الوصل المدعومة بين الجهازين تختلف بين طُرز الراديو أكثر من اختلافها بين إصدارات EdgeTX.',
  ],
  manualRequiredAr: [
    'أساليب الوصل التي يدعمها جهازك',
    'نوع كابل المدرّب المناسب لجهازيك',
  ],
  links: [
    { kind: 'edgetx', targetId: 'simulator', label: 'EdgeTX: الوصل بالمحاكي' },
    { kind: 'edgetx', targetId: 'switches', label: 'EdgeTX: المفاتيح' },
    { kind: 'article', targetId: 'rc-radio', label: 'مقال: جهاز الإرسال' },
  ],
  sources: [EDGETX_MANUAL, RADIO_VENDOR, RC_PRINCIPLE],
  lastReviewed: '2026-08',
  bot: {
    intents: ['explain', 'software_setup', 'safety_warning', 'learn_next'],
    symptomsAr: ['كيف أعلّم شخصاً الطيران', 'وضع المدرب لا يعمل'],
    misspellingsAr: ['ترينر', 'trainer', 'وضع المدرب'],
    actions: [
      { kind: 'edgetx', targetId: 'simulator', label: 'افتح الوصل بالمحاكي' },
      { kind: 'edgetx', targetId: 'switches', label: 'افتح المفاتيح' },
    ],
    systems: ['rc-link'],
    software: ['edgetx'],
    parts: [],
    requiresBeforeVerdict: ['طرازا الجهازين', 'أسلوب الوصل بينهما'],
    safetyPrerequisitesAr: ['انزع المراوح قبل اختبار التسليم والاسترداد'],
  },
};
