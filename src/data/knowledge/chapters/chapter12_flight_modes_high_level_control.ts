import type { KnowledgeEntry } from '../types';

export const chapter12FlightModesHighLevelControl: KnowledgeEntry[] = [
  {
    id: 'ch12-intro-flight-modes-high-level-control',
    title: 'مدخل إلى أنماط الطيران والتحكم عالي المستوى',
    chapter: '12',
    section: 'مقدمة الباب الثاني عشر',
    level: 'beginner',
    safetyRisk: 'high',
    category: 'flight_modes',
    tags: ['Flight Modes', 'High Level Control', 'Angle', 'Acro', 'GPS', 'Altitude Hold', 'Position Hold'],
    summary:
      'أنماط الطيران تحدد كيف يفسر الفيرموير أوامر الطيار وكيف يستخدم الحساسات لمساعدة أو تقييد حركة الكوادكابتر.',
    body:
      'أنماط الطيران ليست مجرد أسماء داخل الفيرموير، بل هي طريقة مختلفة للتحكم في الطائرة. في بعض الأنماط يكون الطيار مسؤولاً عن كل شيء تقريباً، وفي أنماط أخرى يساعد الفيرموير في تثبيت الميل أو الارتفاع أو الموقع. كل نمط يعتمد على حساسات وإعدادات مختلفة، لذلك يجب فهم ما يفعله النمط وما لا يفعله قبل استخدامه.',
    safetyNote:
      'لا تفعل نمط طيران لا تفهمه أثناء الطيران الحقيقي. اختبر المفاتيح والإعدادات أولاً بدون مراوح ثم في مكان مفتوح وآمن.',
    source: 'Chapter 12 - أنماط الطيران والتحكم عالي المستوى',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch12-acro-rate-mode',
    title: 'وضع Acro / Rate',
    chapter: '12',
    section: 'Acro Mode',
    level: 'beginner',
    safetyRisk: 'high',
    category: 'flight_modes',
    tags: ['Acro', 'Rate Mode', 'Gyro', 'FPV', 'Manual Control'],
    summary:
      'في وضع Acro يتحكم الطيار في معدل الدوران، ولا يقوم الدرون بتسوية نفسه تلقائياً.',
    body:
      'وضع Acro أو Rate يعتمد أساساً على الجايروسكوب. عندما يحرك الطيار العصا، يطلب من الدرون معدل دوران حول محور معين. عند ترك العصا، لا يعود الدرون بالضرورة إلى الوضع الأفقي، بل يحاول إيقاف الدوران فقط. هذا يعطي حرية وتحكماً كاملاً ويستخدم كثيراً في FPV، لكنه أصعب للمبتدئ لأنه لا يوفر تسوية ذاتية.',
    safetyNote:
      'لا تبدأ بأول طيران في Acro إذا لم تكن متدرباً على المحاكي أو لا تعرف كيف تعيد الدرون إلى الوضع الآمن.',
    source: 'Chapter 12 - Acro / Rate Mode',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch12-angle-mode',
    title: 'وضع Angle',
    chapter: '12',
    section: 'Angle Mode',
    level: 'beginner',
    safetyRisk: 'medium',
    category: 'flight_modes',
    tags: ['Angle Mode', 'Self Level', 'Accelerometer', 'Beginner', 'Stabilized Mode'],
    summary:
      'وضع Angle يحد الميل ويجعل الدرون يعود إلى الوضع الأفقي عند ترك العصا.',
    body:
      'في وضع Angle يستخدم الفيرموير الجايرو ومقياس التسارع للمساعدة في تثبيت الطائرة. العصا لا تطلب معدل دوران حر، بل تطلب زاوية ميل ضمن حد معين. عند ترك العصا، يحاول الدرون العودة إلى الوضع الأفقي. هذا مفيد للمبتدئين أو للاختبارات الهادئة، لكنه يعتمد على معايرة Accelerometer بشكل صحيح.',
    safetyNote:
      'إذا كان Accelerometer غير معاير أو اتجاه Flight Controller غير صحيح، قد يتصرف Angle Mode بشكل خطير.',
    source: 'Chapter 12 - Angle Mode',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch12-horizon-mode',
    title: 'وضع Horizon',
    chapter: '12',
    section: 'Horizon Mode',
    level: 'intermediate',
    safetyRisk: 'medium',
    category: 'flight_modes',
    tags: ['Horizon Mode', 'Self Level', 'Acro', 'Accelerometer', 'Beginner'],
    summary:
      'Horizon يجمع بين التسوية الذاتية قرب مركز العصا وحرية أكبر عند دفع العصا بقوة.',
    body:
      'وضع Horizon يحاول الجمع بين Angle وAcro. عند الحركات الصغيرة يعطي إحساساً قريباً من التسوية الذاتية، وعند دفع العصا أكثر يسمح بحركات أكثر حرية. قد يكون انتقالياً لبعض المستخدمين، لكنه قد يسبب لبساً لأن سلوكه يتغير حسب مقدار حركة العصا. لذلك يجب فهمه وتجربته بحذر.',
    safetyNote:
      'لا تعتبر Horizon بديلاً كاملاً عن التدريب. اختبره في مساحة آمنة قبل الاعتماد عليه.',
    source: 'Chapter 12 - Horizon Mode',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch12-air-mode',
    title: 'Air Mode',
    chapter: '12',
    section: 'Air Mode',
    level: 'intermediate',
    safetyRisk: 'medium',
    category: 'flight_modes',
    tags: ['Air Mode', 'PID', 'Low Throttle', 'Control Authority', 'Motors'],
    summary:
      'Air Mode يساعد على بقاء التحكم فعالاً حتى عند ثروتل منخفض، لكنه يحتاج فهماً وحذراً عند الهبوط.',
    body:
      'Air Mode يحافظ على فعالية التحكم وPID حتى عندما يكون الثروتل منخفضاً. هذا مفيد في FPV لأنه يسمح للدرون بالاستجابة أثناء النزول أو الحركات القوية. لكن عند الهبوط أو قرب الأرض قد يجعل المحركات تستمر في التصحيح بقوة إذا كانت الطائرة تهتز أو تلامس سطحاً.',
    safetyNote:
      'افهم سلوك Air Mode قبل الهبوط. استخدم Disarm عند الحاجة ولا تمسك الدرون وهو مسلح.',
    source: 'Chapter 12 - Air Mode',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch12-altitude-hold',
    title: 'وضع تثبيت الارتفاع Altitude Hold',
    chapter: '12',
    section: 'Altitude Hold',
    level: 'intermediate',
    safetyRisk: 'high',
    category: 'high_level_control',
    tags: ['Altitude Hold', 'Barometer', 'Rangefinder', 'Throttle', 'Vertical Control'],
    summary:
      'تثبيت الارتفاع يحاول المحافظة على ارتفاع معين، لكنه يعتمد على حساسات وإعدادات وقد لا يكون دقيقاً دائماً.',
    body:
      'Altitude Hold يضيف حلقة تحكم خارجية فوق التحكم الأساسي لتحافظ الطائرة على الارتفاع. قد يعتمد على بارومتر أو Rangefinder أو دمج حساسات حسب الفيرموير. هذا النمط لا يلغي الحاجة للتحكم، ولا يعني أن الطائرة ستتجنب العوائق. الرياح، الاهتزازات، ضغط الهواء، أو حساس غير مناسب قد تؤثر على الأداء.',
    safetyNote:
      'لا تعتمد على Altitude Hold قرب الناس أو العوائق. اختبره أولاً على ارتفاع منخفض ومساحة مفتوحة.',
    source: 'Chapter 12 - Altitude Hold',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch12-position-hold',
    title: 'وضع تثبيت الموقع Position Hold',
    chapter: '12',
    section: 'Position Hold',
    level: 'intermediate',
    safetyRisk: 'high',
    category: 'high_level_control',
    tags: ['Position Hold', 'GPS', 'Optical Flow', 'Compass', 'Navigation', 'Wind'],
    summary:
      'Position Hold يحاول تثبيت الموقع باستخدام GPS أو Optical Flow أو حساسات ملاحة أخرى حسب النظام.',
    body:
      'Position Hold هو نمط تحكم عالي المستوى يحاول إبقاء الدرون في مكانه. في الخارج قد يعتمد على GPS وربما Compass، وفي الداخل قد يعتمد على Optical Flow وRangefinder إذا كان النظام يدعم ذلك. جودة التثبيت تعتمد على جودة الحساسات، المعايرة، الإضاءة، الأرضية، الرياح، وعدد الأقمار في حالة GPS.',
    safetyNote:
      'لا تفعل Position Hold إذا كان GPS ضعيفاً أو Compass غير معاير أو Optical Flow غير موثوق.',
    source: 'Chapter 12 - Position Hold',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch12-gps-rescue-return-to-home',
    title: 'GPS Rescue وReturn to Home',
    chapter: '12',
    section: 'GPS Rescue / RTH',
    level: 'intermediate',
    safetyRisk: 'critical',
    category: 'navigation_safety',
    tags: ['GPS Rescue', 'RTH', 'Return to Home', 'Failsafe', 'GPS', 'Home Point'],
    summary:
      'أنظمة الرجوع للمنزل أو الإنقاذ قد تساعد عند فقد الاتجاه أو الإشارة، لكنها ليست ضماناً كاملاً للنجاة.',
    body:
      'GPS Rescue أو Return to Home يحاول استخدام GPS للرجوع نحو نقطة الانطلاق أو إنقاذ الطائرة حسب الفيرموير. نجاحه يعتمد على GPS جيد، Home Point صحيح، إعدادات ارتفاع مناسبة، اتجاه صحيح، طاقة كافية، وعدم وجود عوائق في المسار. بعض الأنظمة تكون إنقاذاً مبسطاً وليست ملاحة ذكية كاملة. لذلك يجب فهم حدود النظام واختباره بحذر قبل الاعتماد عليه.',
    safetyNote:
      'لا تعتمد على GPS Rescue كبديل للتخطيط أو Failsafe الصحيح. إعداد RTH بارتفاع خاطئ قد يكون خطيراً.',
    source: 'Chapter 12 - GPS Rescue and Return to Home',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch12-gps-lock-home-point-prerequisites',
    title: 'شروط GPS وHome Point قبل الإنقاذ أو الرجوع',
    chapter: '12',
    section: 'GPS Preconditions',
    level: 'intermediate',
    safetyRisk: 'critical',
    category: 'navigation_safety',
    tags: ['GPS Lock', 'Home Point', 'Satellites', 'GPS Rescue', 'RTH', 'Preflight'],
    summary:
      'GPS Rescue أو Return to Home لا يجب الاعتماد عليهما قبل التأكد من GPS جيد ونقطة Home صحيحة.',
    body:
      'قبل استخدام GPS Rescue أو Return to Home يجب التأكد من أن GPS حصل على إشارة جيدة وعدد أقمار كافٍ، وأن Home Point تم تسجيلها في المكان الصحيح. إذا أقلعت قبل ثبات GPS أو قبل تسجيل Home Point صحيح، فقد يحاول النظام الرجوع إلى نقطة خاطئة أو يتصرف بطريقة غير متوقعة. كذلك يجب ضبط ارتفاع الرجوع وسلوك الفشل حسب البيئة، لأن الرجوع بارتفاع منخفض قد يصطدم بعوائق، والرجوع بارتفاع مبالغ فيه قد يسبب مشاكل أخرى.',
    safetyNote:
      'لا تعتمد على Rescue أو RTH إذا لم تتأكد من GPS lock وHome Point وارتفاع الرجوع وخطة الطوارئ.',
    source: 'Chapter 12 - GPS Lock and Home Point Preconditions',
    sourceType: 'educational_addition',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch12-waypoints',
    title: 'المسارات والنقاط Waypoints',
    chapter: '12',
    section: 'Waypoints',
    level: 'advanced',
    safetyRisk: 'critical',
    category: 'autonomous_navigation',
    tags: ['Waypoints', 'Autonomous Flight', 'Mission', 'GPS', 'Navigation', 'iNav', 'ArduPilot'],
    summary:
      'Waypoints تسمح للطائرة باتباع نقاط محددة، لكنها تتطلب إعداداً دقيقاً ومساحة آمنة وفهماً عميقاً للملاحة.',
    body:
      'في الأنظمة التي تدعم الملاحة، يمكن للطائرة اتباع نقاط Waypoints ضمن مهمة محددة. هذا يدخل ضمن التحكم عالي المستوى أو شبه الذاتي. يجب تحديد النقاط والارتفاعات والسرعات بعناية، والتأكد من جودة GPS والحساسات وخطة الطوارئ. Waypoints ليست مناسبة كخطوة مبكرة للمبتدئ قبل إتقان الفحص والسلامة والعودة اليدوية.',
    safetyNote:
      'لا تختبر Waypoints لأول مرة في مكان مزدحم أو قرب عوائق. ضع خطة إيقاف أو استعادة سيطرة واضحة.',
    source: 'Chapter 12 - Waypoints',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch12-mode-switches',
    title: 'مفاتيح أنماط الطيران',
    chapter: '12',
    section: 'Mode Switches',
    level: 'beginner',
    safetyRisk: 'high',
    category: 'radio_setup',
    tags: ['Mode Switch', 'ARM', 'AUX', 'Receiver', 'Betaflight', 'iNav'],
    summary:
      'يجب أن تكون مفاتيح الأنماط واضحة ومختبرة حتى لا يفعّل الطيار نمطاً خاطئاً أثناء الطيران.',
    body:
      'أنماط الطيران عادة تربط بقنوات AUX من جهاز التحكم. يجب أن يعرف الطيار أي مفتاح يفعل ARM وأي مفتاح يفعل Angle أو Acro أو Beeper أو Rescue أو غيرها. يجب اختبار القيم داخل الفيرموير والتأكد من أن كل وضع يتفعل في النطاق الصحيح. لبس بسيط في المفاتيح قد يسبب تفعيل نمط غير متوقع أثناء الطيران.',
    safetyNote:
      'لا تطِر إذا كنت غير متأكد من وظيفة كل مفتاح. اختبر المفاتيح في البرنامج قبل تركيب المراوح.',
    source: 'Chapter 12 - Mode Switches',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch12-outer-control-loops',
    title: 'حلقات التحكم الخارجية',
    chapter: '12',
    section: 'High Level Control Loops',
    level: 'advanced',
    safetyRisk: 'medium',
    category: 'control_theory',
    tags: ['Control Loops', 'Outer Loop', 'Inner Loop', 'Position', 'Altitude', 'Attitude'],
    summary:
      'التحكم عالي المستوى غالباً يضيف حلقات خارجية فوق حلقات الاستقرار الأساسية.',
    body:
      'في الكوادكابتر توجد حلقات تحكم داخلية مثل التحكم في معدل الدوران والاتجاه، وقد تضاف فوقها حلقات خارجية للتحكم في الارتفاع أو الموقع أو المسار. الحلقة الخارجية لا تقود المحركات مباشرة، بل تعطي أوامر أو أهدافاً للحلقات الداخلية. مثلاً Position Hold قد يحسب زاوية أو سرعة مطلوبة، ثم ترسل هذه الأهداف إلى حلقات التحكم الأساسية.',
    safetyNote:
      'إذا كانت الحلقات الداخلية غير مستقرة، فلن يصلحها وضع عالي المستوى مثل Position Hold أو Altitude Hold.',
    source: 'Chapter 12 - Outer Control Loops',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch12-sensor-dependency',
    title: 'اعتماد الأنماط على الحساسات',
    chapter: '12',
    section: 'Sensor Dependency',
    level: 'intermediate',
    safetyRisk: 'high',
    category: 'sensors',
    tags: ['Sensors', 'Gyro', 'Accelerometer', 'Barometer', 'GPS', 'Compass', 'Optical Flow'],
    summary:
      'كل نمط طيران يعتمد على حساسات معينة، وإذا كانت هذه الحساسات غير صحيحة فالنمط قد يفشل.',
    body:
      'Acro يعتمد أساساً على الجايرو. Angle وHorizon يحتاجان Accelerometer جيداً. Altitude Hold قد يحتاج بارومتر أو Rangefinder. Position Hold وRTH يحتاجان GPS وربما Compass أو Optical Flow حسب النظام. لذلك لا يجوز تفعيل نمط يعتمد على حساس غير موجود أو غير معاير أو يعطي قراءة غير منطقية.',
    safetyNote:
      'لا تفعل GPS modes قبل التأكد من جودة الإشارة ونقطة المنزل والمعايرة المطلوبة.',
    source: 'Chapter 12 - Sensor Dependency',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch12-beginner-mode-selection',
    title: 'اختيار النمط المناسب للمبتدئ',
    chapter: '12',
    section: 'Beginner Guidance',
    level: 'beginner',
    safetyRisk: 'medium',
    category: 'learning_path',
    tags: ['Beginner', 'Angle Mode', 'Acro Training', 'Simulator', 'First Flight'],
    summary:
      'المبتدئ يحتاج نمطاً يساعده على التعلم بأمان، لكن يجب أن يعرف حدود كل نمط.',
    body:
      'للمبتدئ، قد يكون Angle Mode مفيداً في أول اختبارات هادئة لأنه يوفر تسوية ذاتية. لكن تعلم FPV الحقيقي غالباً يتطلب التدريب على Acro في المحاكي قبل الطيران الواقعي. الأفضل أن يبدأ المستخدم بفهم الفرق بين الأنماط، يختبر المفاتيح، يتدرب في المحاكي، ثم ينتقل لتجارب قصيرة وآمنة في مكان مفتوح.',
    safetyNote:
      'لا تجعل أول تجربة FPV حقيقية في Acro بدون تدريب كافٍ على المحاكي.',
    source: 'Chapter 12 - Beginner Mode Selection',
    sourceType: 'educational_addition',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch12-testing-modes-safely',
    title: 'اختبار الأنماط بأمان',
    chapter: '12',
    section: 'Safe Mode Testing',
    level: 'beginner',
    safetyRisk: 'critical',
    category: 'safety_testing',
    tags: ['Mode Testing', 'No Props', 'Safe Area', 'Failsafe', 'Disarm', 'First Hover'],
    summary:
      'اختبار الأنماط يجب أن يبدأ بدون مراوح داخل البرنامج، ثم بتجارب قصيرة في مكان مفتوح.',
    body:
      'قبل استخدام أي نمط في الهواء، يجب التأكد داخل الفيرموير أن المفتاح يفعّل النمط الصحيح. بعد ذلك يمكن اختبار النمط في طيران قصير ومنخفض وفي مساحة مفتوحة. لا تختبر أكثر من تغيير كبير في نفس الوقت. إذا تغير سلوك الدرون بشكل غير مفهوم، أوقف الاختبار وعد إلى الفحص.',
    safetyNote:
      'لا تبدل إلى نمط غير مختبر على ارتفاع أو سرعة عالية. اجعل أول اختبار قصيراً وقريباً وآمناً.',
    source: 'Chapter 12 - Testing Modes Safely',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch12-mode-limitations',
    title: 'حدود أنماط الطيران',
    chapter: '12',
    section: 'Limitations',
    level: 'intermediate',
    safetyRisk: 'high',
    category: 'limitations',
    tags: ['Limitations', 'GPS Drift', 'Wind', 'Sensor Error', 'Firmware', 'Pilot Responsibility'],
    summary:
      'أنماط الطيران تساعد الطيار لكنها لا تلغي مسؤوليته ولا تمنع كل الأخطاء أو العوائق.',
    body:
      'حتى الأنماط المتقدمة لا تجعل الدرون ذكياً بالكامل. GPS قد ينجرف، البارومتر قد يتأثر بالهواء والضغط، Compass قد يتأثر بالتشويش، Optical Flow قد يفشل على أرضية غير مناسبة، والرياح قد تتغلب على قدرة الدرون. لذلك يجب اعتبار الأنماط أدوات مساعدة لا ضمانات مطلقة.',
    safetyNote:
      'لا تعتمد على نمط طيران لتجنب الناس أو العوائق. الطيار مسؤول عن المساحة والقرار.',
    source: 'Chapter 12 - Flight Mode Limitations',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch12-switching-modes-in-flight',
    title: 'تبديل الأنماط أثناء الطيران',
    chapter: '12',
    section: 'Mode Switching',
    level: 'intermediate',
    safetyRisk: 'high',
    category: 'flight_operations',
    tags: ['Mode Switching', 'Angle', 'Acro', 'Altitude Hold', 'Position Hold', 'Pilot Control'],
    summary:
      'تبديل الأنماط أثناء الطيران قد يغير سلوك الدرون فوراً، لذلك يجب أن يكون مقصوداً ومفهوماً.',
    body:
      'عند التبديل بين الأنماط، قد تتغير طريقة تفسير العصا وقد تتدخل حساسات أو حلقات تحكم إضافية. الانتقال من Acro إلى Angle مثلاً يغير معنى العصا والسلوك عند تركها. تفعيل Position Hold أو Altitude Hold قد يجعل الفيرموير يحاول تحقيق هدف مختلف. لذلك يجب عدم تبديل الأنماط عشوائياً أو دون معرفة نتيجة التبديل.',
    safetyNote:
      'اختبر تبديل الأنماط على ارتفاع منخفض ومساحة مفتوحة، وكن مستعداً للعودة إلى نمط تعرفه أو Disarm عند الخطر.',
    source: 'Chapter 12 - Switching Modes In Flight',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch12-emergency-planning-advanced-modes',
    title: 'خطة الطوارئ للأنماط المتقدمة',
    chapter: '12',
    section: 'Emergency Planning',
    level: 'intermediate',
    safetyRisk: 'critical',
    category: 'emergency_safety',
    tags: ['Emergency', 'RTH', 'Failsafe', 'Disarm', 'Manual Recovery', 'GPS Modes'],
    summary:
      'قبل تفعيل نمط متقدم، يجب معرفة كيف ستوقفه أو تستعيد السيطرة إذا تصرف بشكل غير متوقع.',
    body:
      'الأنماط المتقدمة مثل Position Hold وRTH وWaypoints تحتاج خطة طوارئ واضحة. يجب معرفة المفتاح الذي يعيد التحكم اليدوي، ومتى تستخدم Disarm، وماذا يحدث عند فقدان الإشارة، وهل يوجد ارتفاع RTH آمن. لا يكفي أن يكون النمط مفعلًا في البرنامج؛ يجب أن يعرف الطيار كيف يتصرف إذا فشل أو أعطى نتيجة غير متوقعة.',
    safetyNote:
      'لا تفعل نمطاً متقدماً دون معرفة طريقة الخروج منه واستعادة السيطرة.',
    source: 'Chapter 12 - Emergency Planning',
    sourceType: 'educational_addition',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch12-summary',
    title: 'خلاصة الباب الثاني عشر',
    chapter: '12',
    section: 'خلاصة الباب الثاني عشر',
    level: 'beginner',
    safetyRisk: 'high',
    category: 'chapter_summary',
    tags: ['Summary', 'Flight Modes', 'Acro', 'Angle', 'GPS', 'RTH', 'Position Hold', 'Safety'],
    summary:
      'الباب الثاني عشر يوضح أن كل نمط طيران له وظيفة وحدود وحساسات يعتمد عليها، ولا يجب استخدامه دون فهم واختبار.',
    body:
      'خلاصة الباب الثاني عشر أن أنماط الطيران هي طبقات مختلفة من التحكم. Acro يعطي حرية كبيرة لكنه يحتاج مهارة. Angle يوفر تسوية ذاتية لكنه يعتمد على Accelerometer. Altitude Hold وPosition Hold وRTH وWaypoints تضيف تحكماً عالي المستوى لكنها تعتمد على حساسات وإعدادات وبيئة مناسبة. لا يوجد نمط يلغي مسؤولية الطيار أو يعوض إعداداً خاطئاً. القاعدة الآمنة هي فهم النمط، فحص الحساسات، اختبار المفاتيح، التجربة في مكان آمن، وامتلاك خطة خروج أو طوارئ.',
    safetyNote:
      'لا تستخدم أي نمط طيران متقدم قبل اختبار الحساسات والمفاتيح وFailsafe وخطة الطوارئ.',
    source: 'Chapter 12 - Summary',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
];
