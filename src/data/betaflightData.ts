import type { BetaflightSection } from '../types';

export const betaflightData: BetaflightSection[] = [
  {
    id: 'interface', title: 'واجهة Betaflight',
    description: 'تعرف على الأقسام والتبويبات الرئيسية في Betaflight Configurator',
    explanation: 'Betaflight Configurator هو البرنامج الذي تستخدمه للتواصل مع FC. عند فتحه ستجد قائمة جانبية بتبويبات مختلفة. أهم تبويب في البداية هو Setup حيث ترى حركة الطائرة في الفضاء الثلاثي الأبعاد. تأكد أن حركة Pitch وRoll وYaw تتطابق مع حركة يدك. قبل أي تغيير دائمًا اضغط Save في أسفل الصفحة وإلا ضاعت التغييرات.',
    importantPoints: [
      'اضغط Save بعد كل تغيير وإلا لن يُحفظ شيء',
      'لا تغير إعدادات لا تفهمها في البداية',
      'استخدم diff all في CLI لحفظ نسخة احتياطية',
    ],
    warning: 'لا تضغط Calibrate Accelerometer إلا إذا كانت الطائرة على سطح مستوٍ تمامًا',
  },
  {
    id: 'firmware', title: 'Firmware / تحديث',
    description: 'تحديث Firmware الـ FC بأمان',
    explanation: 'Firmware هو البرنامج المثبت على FC. يمكن تحديثه عبر Betaflight Configurator من تبويب Firmware Flasher. قبل التحديث احفظ إعداداتك الحالية باستخدام diff all في CLI. اختر الـ Firmware المناسب لنوع FC لديك. فعّل Full Chip Erase إذا كنت تحل مشكلة. بعد التحديث ستحتاج لإعادة الإعداد من الصفر إذا استخدمت Full Chip Erase.',
    importantPoints: [
      'احفظ إعداداتك بـ diff all قبل التحديث',
      'اختر الـ Firmware الصحيح لنوع FC',
      'لا تقطع USB أثناء Flash',
    ],
    warning: 'قطع الاتصال أثناء Flash قد يحتاج إلى DFU mode للإصلاح',
  },
  {
    id: 'ports', title: 'Ports',
    description: 'إعداد المنافذ UART للأجهزة المختلفة',
    explanation: 'تبويب Ports يتيح لك تحديد وظيفة كل UART في FC. كل UART يمكن أن يخدم جهازًا واحدًا فقط. Receiver يحتاج تفعيل Serial RX على UART الذي وصّلته فيه. VTX رقمي قد يحتاج MSP على UART محدد. GPS يحتاج GPS على UART خاص. لا تفعّل Serial RX على أكثر من UART واحد في نفس الوقت وإلا ستحدث تعارضات.',
    importantPoints: [
      'Receiver يحتاج Serial RX على UART الصحيح',
      'لا تفعّل نفس الوظيفة على أكثر من UART',
      'وثّق أي UART وصّلت فيه كل جهاز',
    ],
    warning: 'تفعيل Serial RX على UART خاطئ يمنع Receiver من العمل',
  },
  {
    id: 'receiver', title: 'Receiver',
    description: 'إعداد وفحص الـ Receiver والقنوات',
    explanation: 'تبويب Receiver يُظهر حركة القنوات عند تحريك عصا جهاز التحكم. يجب أن تتحرك القنوات بشكل صحيح: القناة 1 (Roll) عند الإمالة اليمين/يسار. القناة 2 (Pitch) عند الإمالة الأمام/خلف. القناة 3 (Throttle) عند رفع/خفض العصا. القناة 4 (Yaw) عند الدوران. إذا كانت القنوات معكوسة يمكن تغيير Channel Map.',
    importantPoints: [
      'تحقق أن جميع القنوات تتحرك بشكل صحيح',
      'Channel Map يحدد ترتيب القنوات',
      'قيمة Throttle في الوضع الطبيعي يجب أن تكون حول 1000',
    ],
  },
  {
    id: 'modes', title: 'Modes',
    description: 'إعداد أوضاع الطيران والـ ARM',
    explanation: 'تبويب Modes يحدد متى يُفعَّل كل وضع. ARM: يجب أن يكون على switch مستقل، عند تفعيله تبدأ المحركات بالدوران. ANGLE: وضع مبتدئ يحافظ على استقرار الطائرة أفقيًا. BEEPER: يشغّل صوت التنبيه للعثور على الدرون. AIR MODE: يبقي PID نشطًا حتى عند Throttle صفر للطيران المتقدم. للمبتدئين: فعّل ARM و ANGLE فقط في البداية.',
    importantPoints: [
      'ARM switch يجب أن يكون سهل الوصول وبعيد عن الصدفة',
      'ANGLE mode للمبتدئين - Acro للمتقدمين',
      'BEEPER مفيد جداً للعثور على الدرون المفقود',
    ],
    warning: 'لا تفعّل Acro mode في أول الطيران - استخدم ANGLE',
  },
  {
    id: 'motors', title: 'Motors',
    description: 'اختبار المحركات بأمان من Betaflight',
    explanation: 'تبويب Motors يتيح اختبار كل محرك منفردًا. عند الدخول ستظهر رسالة تحذير مهمة. يجب الموافقة على التحذير قبل تشغيل المحركات. استخدم زلاقات الـ 4 محركات لاختبارها واحدًا تلو الآخر. تأكد أن المحرك الصحيح يدور عند تحريك الزلاقة.',
    importantPoints: [
      'لا توافق على التحذير إلا بعد التأكد من عدم وجود مراوح',
      'اختبر محركًا واحدًا في كل مرة',
      'أوقف الاختبار فور انتهائك',
    ],
    warning: 'لا تركب المراوح أثناء اختبار المحركات - خطر جسدي حقيقي',
  },
  {
    id: 'failsafe', title: 'Failsafe',
    description: 'إعداد Failsafe لحماية الطائرة عند فقدان الإشارة',
    explanation: 'Failsafe هو ما يحدث عند انقطاع إشارة جهاز التحكم. يمكن ضبطه على Drop (توقف فوري) أو Land (هبوط تلقائي). لاختبار Failsafe: تأكد من عدم وجود مراوح، شغّل FC مع البطارية، أطفئ جهاز التحكم وراقب ما يحدث. يجب أن يتوقف كل شيء أو يهبط حسب الإعداد.',
    importantPoints: [
      'اختبر Failsafe قبل أول طيران حقيقي',
      'تأكد أن Failsafe يعمل بدون مراوح أولاً',
      'Land mode آمن أكثر من Drop في بعض الحالات',
    ],
    warning: 'لا تطر بدون إعداد Failsafe صحيح',
  },
  {
    id: 'osd', title: 'OSD',
    description: 'إعداد عرض المعلومات على شاشة الفيديو',
    explanation: 'OSD يعرض معلومات مهمة على شاشة نظارات الطيار أثناء الطيران. من أهم المعلومات: جهد البطارية (مهم جداً لتجنب Over-discharge)، RSSI لقوة الإشارة، Timer لوقت الطيران. يمكن تفعيل OSD من تبويب OSD في Betaflight. اختر العناصر التي تريد عرضها وضعها في مواضع مناسبة.',
    importantPoints: [
      'جهد البطارية في OSD يحميك من إتلاف البطارية',
      'RSSI يُحذرك من ضعف إشارة جهاز التحكم',
      'لا تحتاج OSD لأول الاختبارات البرية',
    ],
  },
  {
    id: 'blackbox', title: 'Blackbox',
    description: 'تسجيل بيانات الطيران لتحليلها لاحقاً',
    explanation: 'Blackbox يسجّل بيانات الطيران كاملة: بيانات Gyro، PID، قنوات RC، سرعة المحركات. هذه البيانات قيمة جداً لتحسين PID Tuning وفهم أسباب الحوادث. بعض FC لديها ذاكرة Flash مدمجة، والبعض الآخر يحتاج SD card. للمبتدئين، لا تحتاج Blackbox في البداية، لكنه مفيد جداً عند التقدم.',
    importantPoints: [
      'Blackbox مفيد لتحليل مشاكل الطيران',
      'بعض FC يحتاج SD card للـ Blackbox',
      'Blackbox يمكن أن يبطئ FC قليلاً عند تشغيله',
    ],
  },
  {
    id: 'cli', title: 'CLI',
    description: 'واجهة الأوامر النصية للإعدادات',
    explanation: 'CLI (Command Line Interface) هو واجهة نصية تتيح تغيير أي إعداد في FC. للمبتدئين هناك أوامر آمنة مفيدة: status يعطي معلومات FC الحالية. version يُظهر نسخة الـ Firmware. diff all يُظهر كل الإعدادات المختلفة عن الافتراضي. dump يُظهر كل الإعدادات. save يحفظ التغييرات. exit للخروج من CLI.',
    importantPoints: [
      'diff all: حفظ إعداداتك الحالية للنسخ الاحتياطي',
      'save: تحفظ التغييرات في CLI',
      'لا تستخدم أوامر لا تعرفها في البداية',
    ],
    warning: 'بعض أوامر CLI يمكن أن تعيد ضبط FC للإعدادات الافتراضية - انتبه',
  },
];
