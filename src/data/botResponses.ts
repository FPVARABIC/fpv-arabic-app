import type { BotResponse } from '../types';

export const botResponses: BotResponse[] = [
  {
    id: 'start', trigger: 'لا أعرف من أين أبدأ', label: 'لا أعرف من أين أبدأ',
    answer: 'مرحبًا! ابدأ بهذه الخطوات البسيطة وستجد طريقك بسهولة:',
    steps: ['أولاً: اقرأ الدروس الأولى (1-5) لتفهم الأساسيات', 'ثانياً: راجع خريطة البناء للحصول على صورة كاملة', 'ثالثاً: استخدم قائمة Checklist قبل الشراء', 'رابعاً: ابدأ بالبناء خطوة بخطوة حسب الخريطة'],
    actions: [{ label: 'افتح الدرس الأول', route: '/lessons/lesson-1' }, { label: 'افتح خريطة البناء', route: '/roadmap' }, { label: 'افتح Checklist', route: '/checklists' }],
  },
  {
    id: 'parts', trigger: 'أريد اختيار القطع', label: 'أريد اختيار القطع',
    answer: 'اختيار القطع الصحيح أهم خطوة. إليك الترتيب الصحيح:',
    steps: ['1. اختر حجم الفريم أولاً (ننصح بـ 5 بوصة للمبتدئين)', '2. اختر محركات تناسب الفريم', '3. اختر ESC يتحمل تيار المحركات مع هامش 20%', '4. اختر FC بعدد UARTs كافٍ', '5. اختر Receiver يناسب جهاز التحكم', '6. اختر بطارية 4S أو 6S حسب الإعداد'],
    actions: [{ label: 'درس اختيار الحجم', route: '/lessons/lesson-5' }, { label: 'درس القطع الأساسية', route: '/lessons/lesson-3' }, { label: 'Checklist قبل الشراء', route: '/checklists' }],
  },
  {
    id: 'receiver-problem', trigger: 'Receiver لا يعمل', label: 'Receiver لا يعمل',
    answer: 'ابدأ بهذه الخطوات للتحقق من Receiver:',
    steps: ['1. تأكد من توصيل 5V و GND للـ Receiver', '2. تأكد أن TX من Receiver متصل مع RX في FC', '3. تأكد أن RX من Receiver متصل مع TX في FC (ليس TX مع TX)', '4. فعّل Serial RX على UART الصحيح في Betaflight Ports', '5. اختر Protocol الصحيح (CRSF لـ ELRS)', '6. تأكد من إتمام Binding'],
    actions: [{ label: 'افتح درس TX/RX', route: '/lessons/lesson-9' }, { label: 'Betaflight Receiver', route: '/betaflight/receiver' }, { label: 'Betaflight Ports', route: '/betaflight/ports' }, { label: 'استكشاف الأعطال', route: '/troubleshooting' }],
  },
  {
    id: 'motors-problem', trigger: 'المحركات لا تدور', label: 'المحركات لا تدور',
    answer: 'تحقق من هذه النقاط للمحركات:',
    steps: ['1. تأكد من توصيل البطارية', '2. افحص أسلاك الطاقة لـ ESC', '3. في Betaflight افتح Motors وافق على التحذير', '4. تأكد أن Motor Protocol صحيح (DSHOT300/600)', '5. تأكد أن المحركات غير معطّلة في Configuration', '6. تحقق من اللحام على أسلاك الموتور'],
    actions: [{ label: 'Betaflight Motors', route: '/betaflight/motors' }, { label: 'استكشاف الأعطال', route: '/troubleshooting' }],
  },
  {
    id: 'betaflight-problem', trigger: 'مشكلة في Betaflight', label: 'مشكلة في Betaflight',
    answer: 'أكثر المشاكل شيوعًا في Betaflight وحلولها:',
    steps: ['الإعدادات لا تُحفظ: تأكد من ضغط Save بعد كل تغيير', 'FC لا يُتعرف عليه: جرب كابل USB آخر', 'Receiver لا يظهر: تحقق من Serial RX في Ports', 'المحركات لا تستجيب: تحقق من Motor Protocol', 'لا يمكن Arm: تحقق من Arming Flags في Status'],
    actions: [{ label: 'دليل Betaflight', route: '/betaflight' }, { label: 'استكشاف الأعطال', route: '/troubleshooting' }],
  },
  {
    id: 'pre-battery-checklist', trigger: 'أريد Checklist قبل البطارية', label: 'أريد Checklist قبل البطارية',
    answer: 'قبل توصيل البطارية تأكد من:',
    steps: ['لا توجد مراوح مركبة', 'فحصت القطبية بالـ Multimeter', 'فحصت continuity بين VBAT و GND', 'استعددت Smoke Stopper', 'تأكدت من عدم وجود solder bridge', 'تأكدت أن GND مشترك بين جميع الأجهزة'],
    actions: [{ label: 'افتح Checklist قبل البطارية', route: '/checklists' }, { label: 'درس السلامة', route: '/lessons/lesson-10' }],
  },
  {
    id: 'first-flight', trigger: 'أريد أول طيران آمن', label: 'أريد أول طيران آمن',
    answer: 'للطيران الأول الآمن، هذا ما تحتاجه:',
    steps: ['اختر مكانًا مفتوحًا بعيدًا عن الناس', 'تأكد من شحن البطارية وتثبيتها', 'فعّل Angle Mode', 'اختبر Failsafe: أطفئ جهاز التحكم وتأكد من الاستجابة', 'جرّب Arm/Disarm على الأرض أولاً', 'ابدأ بارتفاع نصف متر فقط'],
    actions: [{ label: 'درس أول طيران', route: '/lessons/lesson-18' }, { label: 'Checklist أول طيران', route: '/checklists' }],
  },
  {
    id: 'tx-rx', trigger: 'أريد فهم TX/RX', label: 'أريد فهم TX/RX',
    answer: 'قاعدة TX/RX بسيطة جداً إذا تذكرتها:',
    steps: ['TX = Transmitter = مُرسِل', 'RX = Receiver = مُستقبِل', 'القاعدة: TX يتصل مع RX (إرسال مع استقبال)', 'من Receiver: TX → RX في FC', 'من Receiver: RX → TX في FC', 'لا توصل TX مع TX ولا RX مع RX أبدًا'],
    actions: [{ label: 'افتح درس TX/RX', route: '/lessons/lesson-9' }],
  },
  {
    id: 'power', trigger: 'أريد فهم GND و 5V و VBAT', label: 'أريد فهم GND و 5V و VBAT',
    answer: 'ثلاثة مصادر طاقة مختلفة، كل واحد لغرض معين:',
    steps: ['VBAT: جهد البطارية الكامل (14-25V) للأجهزة القوية كـ VTX', '5V: جهد منظَّم للأجهزة الحساسة كـ Receiver', 'GND: الأرضي المشترك - يجب أن يكون مشتركًا بين الجميع', 'القاعدة الذهبية: لا توصل VBAT مباشرة للـ Receiver', 'GND مشترك ضروري لأي توصيل إشارة'],
    actions: [{ label: 'افتح درس GND و 5V و VBAT', route: '/lessons/lesson-8' }],
  },
];
