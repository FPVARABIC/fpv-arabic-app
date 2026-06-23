import type { KnowledgeEntry } from '../types';

export const chapter11CalibrationTestingSafety: KnowledgeEntry[] = [
  {
    id: 'ch11-intro-calibration-testing-safety',
    title: 'مدخل إلى المعايرة والاختبار التدريجي والسلامة',
    chapter: '11',
    section: 'مقدمة الباب الحادي عشر',
    level: 'beginner',
    safetyRisk: 'critical',
    category: 'safety_testing',
    tags: ['Calibration', 'Testing', 'Safety', 'First Power-up', 'Preflight', 'No Props'],
    summary:
      'المعايرة والاختبار التدريجي يحولان البناء من تجميع نظري إلى نظام موثوق وآمن قبل الطيران.',
    body:
      'بعد تركيب المكونات وتوصيل الطاقة، لا يجب الانتقال مباشرة إلى الطيران. الكوادكابتر نظام قوي وسريع وخطير إذا تم تشغيله دون تحقق تدريجي. المعايرة والاختبار خطوة بخطوة تساعد على اكتشاف أخطاء التوصيل، اتجاهات المحركات، قراءات الحساسات، مشاكل الطاقة، وإعدادات الفيرموير قبل أن تتحول إلى حادث. السلامة هنا ليست مرحلة إضافية، بل جزء من عملية البناء نفسها.',
    safetyNote:
      'لا تختبر أي درون جديد بالمراوح مركبة. أول تشغيل وأول اختبارات يجب أن تكون بدون مراوح.',
    source: 'Chapter 11 - المعايرة والاختبار التدريجي والسلامة',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch11-progressive-testing-principle',
    title: 'مبدأ الاختبار التدريجي',
    chapter: '11',
    section: '11.1',
    level: 'beginner',
    safetyRisk: 'critical',
    category: 'testing_method',
    tags: ['Progressive Testing', 'Step by Step', 'Debugging', 'Safety', 'Build Process'],
    summary:
      'الاختبار التدريجي يعني فحص كل مرحلة وحدها قبل الانتقال إلى المرحلة التالية.',
    body:
      'الاختبار التدريجي يمنع تكدس الأخطاء. بدلاً من توصيل كل شيء ومحاولة الطيران مباشرة، يتم فحص الهيكل، ثم اللحام، ثم الطاقة، ثم الاتصال بالفيرموير، ثم الحساسات، ثم الريسيفر، ثم المحركات بدون مراوح، ثم Failsafe، ثم أول تحويم آمن. هذه الطريقة تجعل سبب المشكلة واضحاً عند ظهورها وتقلل احتمال تلف المكونات أو إصابة المستخدم.',
    safetyNote:
      'لا تقفز إلى اختبار المحركات أو الطيران قبل إنهاء فحص الطاقة والتوصيلات والحساسات.',
    source: 'Chapter 11 - Progressive Testing',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch11-visual-inspection-before-power',
    title: 'الفحص البصري قبل توصيل البطارية',
    chapter: '11',
    section: 'الفحص قبل الطاقة',
    level: 'beginner',
    safetyRisk: 'critical',
    category: 'pre_power_check',
    tags: ['Visual Inspection', 'Soldering', 'Short Circuit', 'Wires', 'Pads', 'Battery'],
    summary:
      'قبل البطارية يجب فحص اللحام والأسلاك والـ Pads والقطبية وأي احتمال لقصر كهربائي.',
    body:
      'قبل توصيل البطارية، يجب فحص كل نقاط اللحام والأسلاك بصرياً. ابحث عن قصر بين VBAT وGND، لحام زائد يلمس Pad آخر، سلك مكشوف، قطبية معكوسة، موصل غير مثبت، أو شعرة سلك صغيرة قد تسبب قصر. كثير من الأعطال الخطيرة تحدث في أول توصيل بسبب خطأ صغير في اللحام أو القطبية.',
    safetyNote:
      'لا توصل البطارية إذا وجدت أي شك في لحام أو قطبية أو سلك مكشوف. أصلح المشكلة أولاً.',
    source: 'Chapter 11 - Visual Inspection Before Power',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch11-multimeter-continuity-check',
    title: 'فحص القصر بالملتيميتر',
    chapter: '11',
    section: 'فحص كهربائي قبل التشغيل',
    level: 'beginner',
    safetyRisk: 'critical',
    category: 'electrical_check',
    tags: ['Multimeter', 'Continuity', 'VBAT', 'GND', 'Short Circuit', 'Resistance'],
    summary:
      'فحص الاستمرارية بين VBAT وGND يساعد على اكتشاف القصر قبل توصيل البطارية.',
    body:
      'بعد الفحص البصري، يُفضل استخدام ملتيميتر لفحص عدم وجود قصر بين VBAT وGND. وضع الاستمرارية أو المقاومة يمكن أن يعطي مؤشراً مبكراً على مشكلة خطيرة. يجب فهم أن بعض الدوائر تحتوي مكثفات قد تجعل القراءة تتغير لحظياً، لكن صفارة مستمرة أو مقاومة شبه صفرية بين الطاقة والأرضي غالباً علامة خطر.',
    safetyNote:
      'إذا ظهر قصر بين VBAT وGND، لا توصل البطارية أبداً قبل تحديد السبب.',
    source: 'Chapter 11 - Multimeter Continuity Check',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch11-smoke-stopper-first-power',
    title: 'أول تشغيل باستخدام Smoke Stopper',
    chapter: '11',
    section: 'First Power-up',
    level: 'beginner',
    safetyRisk: 'critical',
    category: 'first_power_up',
    tags: ['Smoke Stopper', 'First Power', 'Battery', 'Short Circuit', 'Current Limit'],
    summary:
      'Smoke Stopper يضيف طبقة حماية مهمة عند أول توصيل للطاقة بعد البناء أو تعديل الأسلاك.',
    body:
      'عند أول تشغيل بعد بناء جديد أو تعديل لحام، يجب استخدام Smoke Stopper بين البطارية والدرون. إذا كان هناك قصر أو خطأ توصيل، يساعد Smoke Stopper على الحد من التيار وتقليل احتمال احتراق ESC أو Flight Controller أو الأسلاك. يجب مراقبة أي رائحة احتراق أو حرارة أو ضوء غير طبيعي، وفصل البطارية فوراً عند الشك.',
    safetyNote:
      'Smoke Stopper لا يلغي الحاجة للفحص البصري والملتيميتر. لا تركب المراوح أثناء أول تشغيل.',
    source: 'Chapter 11 - Smoke Stopper First Power-up',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch11-firmware-connection-check',
    title: 'فحص الاتصال بالفيرموير',
    chapter: '11',
    section: 'Firmware Setup Check',
    level: 'beginner',
    safetyRisk: 'medium',
    category: 'firmware_check',
    tags: ['Betaflight', 'iNav', 'Configurator', 'USB', 'Flight Controller', 'Setup Tab'],
    summary:
      'بعد أول تشغيل آمن، يجب التأكد أن Flight Controller يتصل بالفيرموير وأن الحساسات تظهر بشكل منطقي.',
    body:
      'بعد التأكد من أن الطاقة آمنة، يتم الاتصال بالـ Flight Controller عبر برنامج الإعداد مثل Betaflight Configurator أو iNav Configurator حسب الفيرموير. الهدف في هذه المرحلة ليس الطيران، بل التأكد من أن اللوحة تعمل، الحساسات تُقرأ، الجهد يظهر بشكل منطقي، ولا توجد رسائل خطأ خطيرة. يجب التحقق من أن نموذج الدرون في الواجهة يتحرك بنفس اتجاه حركة الدرون الحقيقي.',
    safetyNote:
      'إذا كان نموذج الدرون في البرنامج يتحرك عكس الواقع، لا تطِر. افحص Orientation قبل أي اختبار.',
    source: 'Chapter 11 - Firmware Connection Check',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch11-accelerometer-calibration',
    title: 'معايرة مقياس التسارع',
    chapter: '11',
    section: 'Accelerometer Calibration',
    level: 'beginner',
    safetyRisk: 'medium',
    category: 'sensor_calibration',
    tags: ['Accelerometer', 'Calibration', 'Level', 'Angle Mode', 'Horizon Mode'],
    summary:
      'معايرة مقياس التسارع تساعد أوضاع الثبات على معرفة الوضع الأفقي بشكل صحيح.',
    body:
      'معايرة Accelerometer تتم عادة والطائرة ثابتة وعلى سطح مستوٍ قدر الإمكان. هذه المعايرة مهمة خصوصاً لأوضاع مثل Angle أو Horizon التي تعتمد على معرفة الميل بالنسبة للجاذبية. إذا تمت المعايرة والطائرة مائلة أو تتحرك، فقد يعتبر الفيرموير هذا الوضع هو المستوى الصحيح، ما يؤدي إلى ميلان غير مرغوب عند الطيران.',
    safetyNote:
      'لا تعاير Accelerometer والطائرة تتحرك أو فوق سطح غير ثابت.',
    source: 'Chapter 11 - Accelerometer Calibration',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch11-gyro-calibration-stillness',
    title: 'معايرة الجايروسكوب والثبات',
    chapter: '11',
    section: 'Gyro Calibration',
    level: 'beginner',
    safetyRisk: 'medium',
    category: 'sensor_calibration',
    tags: ['Gyroscope', 'Calibration', 'Bias', 'Stillness', 'Startup'],
    summary:
      'معايرة الجايرو تحتاج أن تكون الطائرة ساكنة تماماً حتى لا يُحسب جزء من الحركة كأنه انحياز.',
    body:
      'الجايروسكوب يقيس السرعات الزاوية، وأي حركة أثناء المعايرة قد تؤثر على تقدير الانحياز Bias. لذلك يجب أن تكون الطائرة ساكنة تماماً عند التشغيل أو المعايرة. بعض الفيرمويرات تعاير الجايرو تلقائياً عند الإقلاع أو الاتصال، ولهذا يجب عدم تحريك الطائرة في تلك اللحظات.',
    safetyNote:
      'لا تحرك الدرون أثناء معايرة الجايرو. قراءة منحازة قد تسبب تصحيحاً غير صحيح في الطيران.',
    source: 'Chapter 11 - Gyro Calibration',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch11-receiver-channel-check',
    title: 'فحص قنوات الريسيفر',
    chapter: '11',
    section: 'Receiver Check',
    level: 'beginner',
    safetyRisk: 'high',
    category: 'receiver_check',
    tags: ['Receiver', 'Channels', 'Roll', 'Pitch', 'Yaw', 'Throttle', 'ARM'],
    summary:
      'يجب التأكد من أن قنوات Roll وPitch وYaw وThrottle وARM تتحرك بالاتجاه والقيم الصحيحة.',
    body:
      'قبل اختبار المحركات أو الطيران، يجب فحص صفحة Receiver في الفيرموير. حرّك عصي التحكم وتأكد أن Roll وPitch وYaw وThrottle تظهر في القنوات الصحيحة وبالاتجاه الصحيح. تأكد أن مفتاح ARM يعمل كما تتوقع، وأن القيم في النطاق المناسب. خطأ في ترتيب القنوات أو اتجاهها قد يؤدي إلى استجابة خطيرة عند الطيران.',
    safetyNote:
      'لا تعتمد على أن اليد تعمل فقط؛ تأكد أن كل قناة تتحرك في المكان والاتجاه الصحيح داخل الفيرموير.',
    source: 'Chapter 11 - Receiver Channel Check',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch11-failsafe-test',
    title: 'اختبار Failsafe',
    chapter: '11',
    section: 'Failsafe',
    level: 'beginner',
    safetyRisk: 'critical',
    category: 'failsafe',
    tags: ['Failsafe', 'Receiver', 'Signal Loss', 'Disarm', 'Safety', 'No Props'],
    summary:
      'Failsafe يحدد ما يحدث عند فقدان الإشارة. يجب اختباره قبل أول طيران، ويفضل بدون مراوح.',
    body:
      'Failsafe من أهم اختبارات السلامة. عند فقدان إشارة الريسيفر، يجب أن يتصرف الدرون بطريقة آمنة حسب نوع الطائرة والفيرموير والإعدادات. في كثير من الحالات يجب أن يتوقف عن الاستمرار في تنفيذ أوامر قديمة. يجب اختبار Failsafe على الطاولة وبدون مراوح للتأكد من أن فقدان الإشارة يؤدي إلى السلوك المتوقع.',
    safetyNote:
      'لا تطِر قبل اختبار Failsafe. فقدان الإشارة بدون Failsafe صحيح قد يجعل الدرون يهرب أو يستمر في الطيران.',
    source: 'Chapter 11 - Failsafe Test',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch11-motor-test-without-props',
    title: 'اختبار المحركات بدون مراوح',
    chapter: '11',
    section: 'Motor Test',
    level: 'beginner',
    safetyRisk: 'critical',
    category: 'motor_test',
    tags: ['Motor Test', 'No Props', 'Motor Order', 'Motor Direction', 'Betaflight Motors Tab'],
    summary:
      'اختبار المحركات يجب أن يتم بدون مراوح للتأكد من ترتيب المحركات واتجاه الدوران قبل أي طيران.',
    body:
      'اختبار المحركات من أخطر مراحل الإعداد إذا كانت المراوح مركبة. يجب إزالة المراوح تماماً قبل استخدام تبويب Motors أو أي اختبار يدوي. الهدف هو التأكد من أن كل رقم محرك في الفيرموير يطابق مكانه الحقيقي على الإطار، وأن اتجاه دوران كل محرك صحيح. بعد ذلك فقط يمكن تركيب المراوح الصحيحة في الاتجاه الصحيح.',
    safetyNote:
      'لا تفتح تبويب Motors والمراوح مركبة. هذه قاعدة سلامة أساسية لا استثناء لها.',
    source: 'Chapter 11 - Motor Test Without Props',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch11-motor-order-verification',
    title: 'التحقق من ترتيب المحركات',
    chapter: '11',
    section: 'Motor Order',
    level: 'beginner',
    safetyRisk: 'critical',
    category: 'motor_test',
    tags: ['Motor Order', 'Quad X', 'Betaflight', 'iNav', 'ESC', 'Mixer'],
    summary:
      'ترتيب المحركات يجب أن يطابق خريطة الفيرموير، وإلا قد تنقلب الطائرة فوراً عند الإقلاع.',
    body:
      'كل فيرموير يتوقع ترتيباً محدداً للمحركات حسب نوع الإطار. إذا كان المحرك رقم 1 في البرنامج موصولاً فعلياً في مكان المحرك رقم 3 مثلاً، فإن التصحيحات ستذهب إلى المكان الخطأ. هذا قد يسبب انقلاباً فورياً عند الإقلاع. لذلك يجب فحص كل محرك منفرداً من البرنامج ومطابقته مع خريطة الفيرموير.',
    safetyNote:
      'إذا كان ترتيب المحركات غير مطابق، لا تحاول الطيران ولا تعالج المشكلة بـ PID. صحح الترتيب أولاً.',
    source: 'Chapter 11 - Motor Order Verification',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch11-motor-prop-direction',
    title: 'اتجاه المحركات والمراوح',
    chapter: '11',
    section: 'Motor Direction',
    level: 'beginner',
    safetyRisk: 'critical',
    category: 'motor_test',
    tags: ['Motor Direction', 'Prop Direction', 'CW', 'CCW', 'Props In', 'Props Out'],
    summary:
      'اتجاه دوران المحرك واتجاه المروحة يجب أن يتطابقا مع إعدادات الفيرموير ونوع الإطار.',
    body:
      'حتى لو كان ترتيب المحركات صحيحاً، فإن اتجاه الدوران وتركيب المراوح يجب أن يكونا صحيحين. المروحة لها اتجاه دفع محدد، وإذا رُكبت في المحرك الخطأ أو دارت عكس الاتجاه المطلوب فلن تولد الدفع الصحيح. كذلك يعتمد Yaw على توزيع محركات CW وCCW. لذلك يجب فحص اتجاه كل محرك بدون مراوح، ثم تركيب المراوح المناسبة بعد ذلك فقط.',
    safetyNote:
      'لا تختبر اتجاه المحركات بالمراوح. افحص الاتجاه بدون مراوح ثم ركب المراوح بعد التأكد.',
    source: 'Chapter 11 - Motor and Propeller Direction',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch11-propeller-installation-check',
    title: 'فحص تركيب المراوح قبل الطيران',
    chapter: '11',
    section: 'Propeller Check',
    level: 'beginner',
    safetyRisk: 'critical',
    category: 'preflight',
    tags: ['Propellers', 'Props', 'Direction', 'Tightening', 'Damage', 'Preflight'],
    summary:
      'المراوح يجب أن تكون سليمة ومركبة في الاتجاه الصحيح ومشدودة جيداً قبل أي محاولة طيران.',
    body:
      'بعد الانتهاء من اختبارات المحركات بدون مراوح، تأتي مرحلة تركيب المراوح. يجب التأكد من أن كل مروحة في المكان الصحيح، بالاتجاه الصحيح، وغير مكسورة أو مشروخة أو معوجة. يجب شد المراوح أو الصواميل جيداً حسب نوع المحرك، لأن مروحة غير مثبتة قد تطير من مكانها أو تسبب اهتزازاً كبيراً.',
    safetyNote:
      'لا تستخدم مروحة متضررة أو غير مشدودة. المراوح تدور بسرعة عالية وقد تسبب إصابة خطيرة.',
    source: 'Chapter 11 - Propeller Installation Check',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch11-first-hover-test',
    title: 'اختبار أول تحويم',
    chapter: '11',
    section: 'First Hover',
    level: 'beginner',
    safetyRisk: 'critical',
    category: 'first_flight',
    tags: ['First Hover', 'First Flight', 'Safe Area', 'Low Altitude', 'Disarm'],
    summary:
      'أول اختبار طيران يجب أن يكون تحويماً قصيراً ومنخفضاً في مكان مفتوح وآمن، وليس طيراناً كاملاً.',
    body:
      'أول تحويم ليس تجربة أداء ولا طيراناً حراً. الهدف فقط التأكد أن الدرون يرفع نفسه بشكل مستقر ويستجيب للأوامر الأساسية. يجب أن يتم في مكان مفتوح بعيد عن الناس والسيارات والحيوانات، ببطارية جيدة، ومراوح مثبتة، وإمكانية Disarm واضحة. ابدأ بارتفاع منخفض ومدة قصيرة. إذا ظهرت اهتزازات أو ميلان شديد أو سلوك غير مفهوم، توقف فوراً.',
    safetyNote:
      'لا تجعل أول طيران تجربة طويلة. أول اختبار يجب أن يكون قصيراً ومنخفضاً وفي مساحة آمنة.',
    source: 'Chapter 11 - First Hover Test',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch11-disarm-readiness',
    title: 'الاستعداد لـ Disarm',
    chapter: '11',
    section: 'Emergency Stop',
    level: 'beginner',
    safetyRisk: 'critical',
    category: 'emergency_safety',
    tags: ['Disarm', 'ARM', 'Emergency', 'Switch', 'Safety'],
    summary:
      'يجب أن يعرف الطيار مكان مفتاح Disarm وأن يكون مستعداً لاستخدامه فوراً عند السلوك الخطر.',
    body:
      'قبل أول طيران، يجب أن يكون مفتاح ARM/Disarm واضحاً ومختبراً. في حالة انقلاب، فقدان تحكم، اهتزاز عنيف، أو اقتراب من خطر، يجب استخدام Disarm فوراً. التردد في إيقاف المحركات قد يزيد الضرر أو الخطر. لذلك يتم تدريب اليد والذهن على موقع المفتاح قبل الطيران.',
    safetyNote:
      'إذا فقدت السيطرة أو انقلب الدرون، استخدم Disarm فوراً ولا تحاول إنقاذه قرب الناس أو العوائق.',
    source: 'Chapter 11 - Disarm Readiness',
    sourceType: 'educational_addition',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch11-safety-perimeter',
    title: 'منطقة الأمان حول الدرون',
    chapter: '11',
    section: 'Safety Area',
    level: 'beginner',
    safetyRisk: 'critical',
    category: 'field_safety',
    tags: ['Safety Perimeter', 'People', 'Cars', 'Animals', 'First Flight', 'Open Area'],
    summary:
      'اختبارات الطيران يجب أن تتم بعيداً عن الناس والسيارات والحيوانات والعوائق.',
    body:
      'الكوادكابتر قد يندفع أو ينقلب أو يفقد السيطرة بسبب خطأ بسيط في الإعداد. لذلك يجب اختيار مكان مفتوح وآمن لأول اختبار، بعيد عن الناس والسيارات والحيوانات والنوافذ والطرق. لا تختبر داخل غرفة أو قرب أفراد العائلة أو في مكان مزدحم. كلما كان الاختبار الأول أكثر هدوءاً وبمساحة أوسع، كان التشخيص أكثر أماناً.',
    safetyNote:
      'لا تختبر طائرة جديدة قرب الناس. اعتبر كل أول اختبار احتمالاً للفشل.',
    source: 'Chapter 11 - Safety Perimeter',
    sourceType: 'educational_addition',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch11-common-testing-mistakes',
    title: 'أخطاء شائعة في الاختبار والمعايرة',
    chapter: '11',
    section: 'أخطاء شائعة',
    level: 'beginner',
    safetyRisk: 'critical',
    category: 'common_mistakes',
    tags: ['Common Mistakes', 'Props On', 'No Smoke Stopper', 'Failsafe', 'Motor Order', 'Orientation'],
    summary:
      'أخطر الأخطاء: اختبار المحركات بالمراوح، تخطي Smoke Stopper، إهمال Failsafe، أو تجاهل Orientation الخاطئ.',
    body:
      'من الأخطاء الشائعة والخطيرة: توصيل البطارية لأول مرة دون Smoke Stopper، فتح تبويب Motors والمراوح مركبة، عدم اختبار Failsafe، تركيب Flight Controller باتجاه خاطئ، عدم التحقق من ترتيب المحركات، تركيب المراوح بالعكس، أو محاولة الطيران رغم أن نموذج الدرون في البرنامج يتحرك بعكس الواقع. هذه الأخطاء غالباً تسبب مشاكل كبيرة رغم أن حلها يكون بفحص بسيط قبل الطيران.',
    safetyNote:
      'إذا شعرت أنك غير متأكد من خطوة، توقف واسأل أو افحص مرة أخرى. لا تختبر بالقوة.',
    source: 'Chapter 11 - Common Testing Mistakes',
    sourceType: 'inferred_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch11-summary',
    title: 'خلاصة الباب الحادي عشر',
    chapter: '11',
    section: 'خلاصة الباب الحادي عشر',
    level: 'beginner',
    safetyRisk: 'critical',
    category: 'chapter_summary',
    tags: ['Summary', 'Calibration', 'Testing', 'Safety', 'No Props', 'Failsafe', 'First Hover'],
    summary:
      'الباب الحادي عشر يضع منهجاً آمناً للانتقال من البناء إلى أول تشغيل وأول طيران.',
    body:
      'خلاصة الباب الحادي عشر أن السلامة لا تبدأ عند الطيران، بل قبل توصيل البطارية. يجب فحص اللحام والأسلاك والقطبية، استخدام الملتيميتر وSmoke Stopper، التأكد من Orientation والحساسات، فحص قنوات الريسيفر، اختبار Failsafe، اختبار المحركات بدون مراوح، ثم تركيب المراوح بعد التأكد من الاتجاهات. أول تحويم يجب أن يكون قصيراً ومنخفضاً وفي مكان آمن. الاختبار التدريجي هو أفضل طريقة لحماية المستخدم والمكونات والطائرة.',
    safetyNote:
      'لا تنتقل إلى الطيران إذا لم تكن كل خطوات الاختبار السابقة واضحة وناجحة.',
    source: 'Chapter 11 - Summary',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
];
