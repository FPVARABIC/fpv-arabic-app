import type { TroubleshootingItem } from '../types';

export const troubleshootingData: TroubleshootingItem[] = [
  {
    id: 'ts-1',
    problem: 'Betaflight لا يحفظ الإعدادات',
    symptoms: ['التغييرات تختفي بعد إعادة التشغيل', 'الإعدادات تعود للقديمة'],
    causes: ['لم تضغط زر Save', 'الكابل USB غير مستقر', 'المتصفح لا يملك صلاحيات', 'FC في وضع Boot Loader', 'مشكلة في Firmware'],
    steps: ['تأكد من الضغط على Save في أسفل كل تبويب', 'جرب كابل USB آخر', 'جرب تطبيق Betaflight المستقل', 'تأكد أن FC في وضع عادي وليس Bootloader', 'جرب حفظ الأوامر عبر CLI باستخدام save'],
    safetyNote: 'تأكد دائمًا من حفظ الإعدادات قبل فصل USB',
  },
  {
    id: 'ts-2',
    problem: 'Receiver لا يظهر في Betaflight',
    symptoms: ['لا تتحرك القنوات في تبويب Receiver', 'رسالة No Receiver', 'لا RSSI'],
    causes: ['5V أو GND غير متصل', 'TX/RX معكوس', 'UART خاطئ', 'بروتوكول خاطئ', 'Binding غير مكتمل', 'Serial RX غير مفعّل'],
    steps: ['تحقق من 5V و GND بالـ Multimeter', 'تأكد أن TX(RX) → RX(FC) وRX(RX) → TX(FC)', 'تحقق من UART المستخدم في Ports', 'فعّل Serial RX على UART الصحيح', 'اختر بروتوكول الصحيح (CRSF لـ ELRS)', 'أعد Binding'],
    safetyNote: 'لا تطر بدون التأكد من عمل Receiver',
  },
  {
    id: 'ts-3',
    problem: 'المحركات لا تدور',
    symptoms: ['لا يوجد صوت من المحركات', 'المحركات لا تستجيب للأوامر'],
    causes: ['ESC لا يتلقى طاقة', 'أسلاك إشارة ESC خاطئة', 'Motor protocol خاطئ', 'البطارية غير متصلة', 'لم توافق على تحذير Motors'],
    steps: ['تأكد من توصيل البطارية', 'افحص أسلاك الطاقة للـ ESC', 'تأكد من Motor protocol في Betaflight (DSHOT 300/600)', 'في تبويب Motors وافق على التحذير أولاً', 'تأكد أن المحركات غير متعطلة في Configuration'],
    safetyNote: 'لا تركب المراوح عند اختبار المحركات',
  },
  {
    id: 'ts-4',
    problem: 'الدرون لا يعمل Arm',
    symptoms: ['لا تدور المحركات عند تفعيل Arm switch', 'لا يستجيب للـ Arm'],
    causes: ['Throttle مرفوع فوق الصفر', 'Failsafe يمنع Arm', 'Accelerometer غير مُعايَر', 'لا يوجد Receiver', 'Arming disabled flags', 'Arm switch غير محدد في Modes'],
    steps: ['أخفض Throttle إلى أدنى قيمة', 'تحقق من Arming flags في تبويب Status', 'تأكد أن Arm switch محدد في تبويب Modes', 'تأكد من عمل Receiver', 'راجع Prearm checklist في Status', 'افحص أن Calibrate Accelerometer تم بشكل صحيح'],
    safetyNote: 'Arming flags تحميك من الطيران في حالات خاطئة',
  },
  {
    id: 'ts-5',
    problem: 'اتجاه المحركات خاطئ',
    symptoms: ['الدرون يدور على نفسه', 'يميل في اتجاه عكسي', 'لا يستقر'],
    causes: ['أسلاك الموتور مربوطة بترتيب خاطئ', 'إعداد Motor direction خاطئ'],
    steps: ['استخدم Betaflight Motor direction لتغيير الاتجاه', 'يمكن تبديل أي سلكين من أسلاك الموتور الثلاثة', 'استخدم ESC configurator إذا كان متاحًا', 'تأكد من Betaflight Motor Mixer'],
    safetyNote: 'لا تغير أسلاك الموتور والبطارية متصلة',
  },
  {
    id: 'ts-6',
    problem: 'GPS لا يأخذ Fix',
    symptoms: ['لا يوجد GPS indicator في OSD', 'عدد الأقمار صفر أو واحد'],
    causes: ['الطائرة في الداخل أو بجانب مبانٍ', 'GPS قريب من ESC أو أسلاك الطاقة', 'UART خاطئ أو baud rate خاطئ', 'لم تنتظر كافيًا'],
    steps: ['اخرج إلى مكان مفتوح بعيد عن المباني', 'ابعد GPS عن ESC وأسلاك الطاقة', 'تحقق من UART و baud rate', 'انتظر من 2 إلى 5 دقائق للـ Cold Start', 'تأكد من تفعيل GPS في Betaflight Configuration'],
    safetyNote: 'لا تعتمد على GPS وحده للـ Failsafe في المناطق المزدحمة',
  },
];
