import type { KnowledgeEntry } from '../types';

export const chapter10EnergyBatteryElectricalLimits: KnowledgeEntry[] = [
  {
    id: 'ch10-intro-energy-battery-electrical-limits',
    title: 'مدخل إلى الطاقة والبطارية والقيود الكهربائية',
    chapter: '10',
    section: 'مقدمة الباب العاشر',
    level: 'beginner',
    safetyRisk: 'high',
    category: 'power_system',
    tags: ['LiPo', 'Battery', 'Power', 'Voltage', 'Current', 'ESC', 'VBAT', 'Safety'],
    summary:
      'نظام الطاقة هو أساس عمل الكوادكابتر، وأي خطأ فيه قد يؤدي إلى ضعف أداء أو سخونة أو احتراق أو تلف مكونات.',
    body:
      'الكوادكابتر يعتمد على منظومة طاقة قوية وسريعة الاستجابة. البطارية لا تغذي المحركات فقط، بل تؤثر على الدفع، زمن الطيران، استجابة الثروتل، سخونة المكونات، واستقرار الجهد. لذلك لا يكفي اختيار بطارية عشوائية أو النظر إلى عدد الخلايا فقط. يجب فهم الجهد، التيار، القدرة، السعة، C-rating، هبوط الجهد، مقاومة البطارية الداخلية، حدود ESC، وأسلاك التوصيل.',
    safetyNote:
      'بطاريات LiPo قد تكون خطيرة إذا أسيء استخدامها. لا تستخدم بطارية منتفخة أو تالفة، ولا تقصر أطراف البطارية أبداً.',
    source: 'Chapter 10 - الطاقة والبطارية والقيود الكهربائية',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch10-voltage-current-power',
    title: 'الجهد والتيار والقدرة',
    chapter: '10',
    section: '10.1',
    level: 'beginner',
    safetyRisk: 'medium',
    category: 'electrical_basics',
    tags: ['Voltage', 'Current', 'Power', 'V', 'A', 'W', 'P=VI'],
    summary:
      'الجهد هو فرق الطاقة الكهربائية، التيار هو تدفق الشحنة، والقدرة هي معدل استهلاك الطاقة.',
    body:
      'لفهم نظام الطاقة يجب التمييز بين الجهد والتيار والقدرة. الجهد V يمثل فرق الجهد الكهربائي، التيار A يمثل مقدار تدفق الشحنة، والقدرة W تمثل معدل استهلاك أو نقل الطاقة. العلاقة الأساسية هي P = V × I. في الكوادكابتر تعني هذه العلاقة أن ارتفاع الجهد أو التيار يرفع القدرة المتاحة، لكن أيضاً قد يزيد الضغط على المكونات إذا لم تكن مناسبة.',
    source: 'Chapter 10 - Voltage, Current, and Power',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch10-lipo-cell-voltage',
    title: 'جهد خلية LiPo وعدد الخلايا',
    chapter: '10',
    section: 'LiPo Cells',
    level: 'beginner',
    safetyRisk: 'high',
    category: 'battery_basics',
    tags: ['LiPo', 'Cell', '1S', '4S', '6S', 'Voltage', 'Fully Charged'],
    summary:
      'بطارية LiPo تتكون من خلايا، وكل خلية لها جهد اسمي وجهد كامل الشحن وحدود أمان.',
    body:
      'بطارية LiPo تتكون من خلايا متصلة على التوالي. يرمز 4S إلى أربع خلايا، و6S إلى ست خلايا. الجهد الاسمي للخلية الواحدة يقارب 3.7V، وجهد الشحن الكامل يقارب 4.2V. لذلك بطارية 4S يكون جهدها الاسمي تقريباً 14.8V والكامل تقريباً 16.8V، بينما 6S يكون جهدها الاسمي تقريباً 22.2V والكامل تقريباً 25.2V. زيادة عدد الخلايا ترفع الجهد وتغير اختيار المحركات وESC والمراوح.',
    safetyNote:
      'لا تستخدم بطارية بعدد خلايا أعلى مما تدعمه المكونات. جهد زائد قد يتلف ESC أو Flight Controller أو VTX.',
    source: 'Chapter 10 - LiPo Cell Voltage',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch10-battery-capacity-mah-wh',
    title: 'السعة mAh والطاقة Wh',
    chapter: '10',
    section: 'Battery Capacity',
    level: 'beginner',
    safetyRisk: 'medium',
    category: 'battery_basics',
    tags: ['mAh', 'Wh', 'Capacity', 'Energy', 'Flight Time'],
    summary:
      'mAh يصف كمية الشحنة، لكن Wh يعطي صورة أوضح عن الطاقة لأنه يأخذ الجهد في الحسبان.',
    body:
      'سعة البطارية غالباً تكتب بوحدة mAh، مثل 1300mAh أو 1500mAh. هذه القيمة تصف مقدار الشحنة المتاحة، لكنها لا تكفي وحدها لمقارنة الطاقة بين بطاريات مختلفة الجهد. الطاقة بوحدة Wh تساوي تقريباً الجهد الاسمي × السعة بالأمبير-ساعة. لذلك بطاريتان بنفس mAh لكن بعدد خلايا مختلف لا تملكان نفس الطاقة. زمن الطيران يعتمد على الطاقة المتاحة ومعدل الاستهلاك والوزن والكفاءة.',
    source: 'Chapter 10 - Capacity and Energy',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch10-c-rating',
    title: 'تصنيف C-rating',
    chapter: '10',
    section: 'C-rating',
    level: 'intermediate',
    safetyRisk: 'high',
    category: 'battery_limits',
    tags: ['C-rating', 'Discharge', 'Current', 'LiPo', 'Battery Limits'],
    summary:
      'C-rating يصف قدرة البطارية النظرية على تفريغ التيار، لكنه ليس دائماً رقماً مثالياً أو مضموناً عملياً.',
    body:
      'C-rating يستخدم لتقدير أقصى تيار يمكن للبطارية توفيره. التيار النظري يساوي السعة بالأمبير-ساعة × قيمة C. مثلاً بطارية 1.5Ah بتصنيف 100C تعطي نظرياً 150A. لكن في الواقع تختلف جودة البطارية وحرارتها ومقاومتها الداخلية، وقد تكون الأرقام التجارية متفائلة. لذلك يجب عدم الاعتماد الأعمى على C-rating وحده، بل مراعاة هبوط الجهد، الحرارة، وسلوك البطارية تحت الحمل.',
    safetyNote:
      'سحب تيار أعلى من قدرة البطارية قد يسبب سخونة، هبوط جهد شديد، تلف البطارية، أو خطر حريق.',
    source: 'Chapter 10 - C-rating',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch10-voltage-sag',
    title: 'هبوط الجهد Voltage Sag',
    chapter: '10',
    section: 'Voltage Sag',
    level: 'intermediate',
    safetyRisk: 'medium',
    category: 'battery_behavior',
    tags: ['Voltage Sag', 'Internal Resistance', 'Throttle Punch', 'Battery Load', 'VBAT'],
    summary:
      'Voltage Sag هو انخفاض الجهد تحت الحمل، ويظهر بوضوح عند الثروتل العالي أو البطاريات الضعيفة.',
    body:
      'عندما تسحب المحركات تياراً كبيراً من البطارية، ينخفض الجهد مؤقتاً بسبب المقاومة الداخلية للبطارية والأسلاك والموصلات. هذا يسمى Voltage Sag. كلما زاد التيار أو زادت مقاومة البطارية الداخلية، زاد الهبوط. قد يؤدي هبوط الجهد إلى ضعف استجابة، إنذارات بطارية مبكرة، أو حتى إعادة تشغيل بعض الأنظمة إذا كان التغذية غير مستقرة. البطاريات الجيدة ذات المقاومة الداخلية المنخفضة تتحمل الحمل بشكل أفضل.',
    safetyNote:
      'هبوط الجهد الشديد علامة أن البطارية أو التصميم أو الحمل غير مناسب. لا تواصل الضغط على بطارية تنهار تحت الحمل.',
    source: 'Chapter 10 - Voltage Sag',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch10-internal-resistance',
    title: 'المقاومة الداخلية للبطارية',
    chapter: '10',
    section: 'Internal Resistance',
    level: 'intermediate',
    safetyRisk: 'medium',
    category: 'battery_behavior',
    tags: ['Internal Resistance', 'IR', 'Heat', 'Voltage Sag', 'Battery Health'],
    summary:
      'المقاومة الداخلية تحدد مقدار هبوط الجهد والحرارة داخل البطارية عند سحب التيار.',
    body:
      'كل بطارية لها مقاومة داخلية. عندما يمر تيار كبير، تسبب هذه المقاومة هبوط جهد وحرارة داخل البطارية. البطارية القديمة أو المتضررة غالباً تملك مقاومة داخلية أعلى، فتظهر عليها مشاكل مثل Voltage Sag أكبر، سخونة أعلى، وضعف في الأداء. لذلك المقاومة الداخلية مؤشر مهم على صحة البطارية وقدرتها على تحمل طيران عنيف أو تيارات عالية.',
    safetyNote:
      'البطارية التي تسخن بسرعة أو تهبط كثيراً تحت الحمل قد تكون غير مناسبة أو متدهورة.',
    source: 'Chapter 10 - Internal Resistance',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch10-esc-current-limits',
    title: 'حدود تيار ESC',
    chapter: '10',
    section: 'ESC Limits',
    level: 'intermediate',
    safetyRisk: 'high',
    category: 'esc_limits',
    tags: ['ESC', 'Current Rating', 'Burst Current', 'Continuous Current', 'Motor Load'],
    summary:
      'ESC يجب أن يتحمل تيار المحرك تحت الحمل الحقيقي، وليس فقط في ظروف مثالية أو أرقام نظرية.',
    body:
      'ESC له حدود تيار مستمر وحدود تيار لحظي Burst. إذا سحب المحرك مع المروحة تياراً أعلى مما يتحمله ESC، قد يسخن أو يتلف. التيار الفعلي يعتمد على الجهد، KV، حجم المروحة، Pitch، وزن الطائرة، وأسلوب الطيران. لذلك اختيار ESC يجب أن يتم بهامش أمان، وليس على الحد الأدنى.',
    safetyNote:
      'ESC ضعيف أو محمل فوق طاقته قد يحترق أثناء الطيران. راجع توافق المحرك والمروحة والبطارية مع ESC.',
    source: 'Chapter 10 - ESC Current Limits',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch10-motor-prop-battery-matching',
    title: 'توافق المحرك والمروحة والبطارية',
    chapter: '10',
    section: 'Powertrain Matching',
    level: 'intermediate',
    safetyRisk: 'high',
    category: 'component_matching',
    tags: ['Motor', 'Propeller', 'Battery', 'KV', '4S', '6S', 'Current Draw'],
    summary:
      'اختيار البطارية لا ينفصل عن المحرك والمروحة. نفس المروحة والمحرك قد يسحبان تياراً مختلفاً جداً حسب الجهد.',
    body:
      'نظام الدفع يجب النظر إليه كوحدة واحدة: البطارية، المحرك، المروحة، وESC. محرك KV عالي مع مروحة كبيرة وجهد مرتفع قد يسحب تياراً كبيراً جداً. الانتقال من 4S إلى 6S ليس مجرد زيادة أداء؛ قد يتطلب KV مختلفاً أو مروحة مختلفة أو ESC أعلى تحملاً. لذلك لا يجب خلط المكونات عشوائياً، بل يجب التأكد من أن كل جزء ضمن الحدود المناسبة.',
    safetyNote:
      'تركيب مروحة كبيرة أو Pitch عالي على محرك وبطارية غير مناسبين قد يسبب تياراً زائداً وسخونة خطيرة.',
    source: 'Chapter 10 - Motor Prop Battery Matching',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch10-flight-time-estimate',
    title: 'تقدير زمن الطيران',
    chapter: '10',
    section: 'Flight Time',
    level: 'beginner',
    safetyRisk: 'low',
    category: 'flight_time',
    tags: ['Flight Time', 'Capacity', 'Average Current', 'Efficiency', 'Weight'],
    summary:
      'زمن الطيران يعتمد على الطاقة المتاحة ومتوسط التيار، لكنه يتأثر بشدة بالوزن والكفاءة وأسلوب الطيران.',
    body:
      'يمكن تقدير زمن الطيران تقريبياً من السعة القابلة للاستخدام ومتوسط التيار. لكن في الواقع يتأثر الزمن بعوامل كثيرة: وزن الطائرة، حجم المراوح، كفاءة المحركات، سرعة الطيران، الرياح، حالة البطارية، وطريقة استخدام الثروتل. بطارية أكبر قد لا تعني دائماً زمن طيران أطول إذا أضافت وزناً كبيراً يقلل الكفاءة. لذلك يجب التوازن بين السعة والوزن.',
    source: 'Chapter 10 - Flight Time Estimation',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch10-bec-5v-rail',
    title: 'BEC وخط 5V',
    chapter: '10',
    section: 'BEC / 5V',
    level: 'beginner',
    safetyRisk: 'high',
    category: 'power_distribution',
    tags: ['BEC', '5V', 'Voltage Regulator', 'Flight Controller', 'Receiver', 'VTX'],
    summary:
      'BEC يحول جهد البطارية إلى جهد مناسب مثل 5V لتغذية الإلكترونيات الحساسة.',
    body:
      'ليست كل مكونات الدرون تعمل مباشرة على جهد البطارية. بعض المكونات تحتاج 5V أو 9V أو جهداً منظماً. BEC أو منظم الجهد يحول VBAT إلى جهد مناسب لتغذية Flight Controller أو Receiver أو بعض الوحدات الأخرى حسب التصميم. يجب معرفة حدود كل مخرج جهد والتيار الذي يستطيع توفيره. تحميل خط 5V فوق قدرته قد يسبب هبوط جهد أو إعادة تشغيل أو تلفاً.',
    safetyNote:
      'لا توصل مكون 5V مباشرة إلى VBAT. تحقق دائماً من جهد كل Pad قبل التوصيل.',
    source: 'Chapter 10 - BEC and 5V Rail',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch10-vbat-5v-gnd-distinction',
    title: 'الفرق بين VBAT و5V وGND',
    chapter: '10',
    section: 'Power Pads',
    level: 'beginner',
    safetyRisk: 'critical',
    category: 'wiring_safety',
    tags: ['VBAT', '5V', 'GND', 'Power Pads', 'Wiring', 'Short Circuit'],
    summary:
      'VBAT هو جهد البطارية الخام، 5V جهد منظم، وGND هو المرجع المشترك. الخلط بينهم قد يحرق المكونات.',
    body:
      'VBAT يعني جهد البطارية الخام، وقد يكون 4S أو 6S أو غير ذلك حسب البطارية. 5V هو جهد منظم مخصص لمكونات تحتاج خمسة فولت. GND هو المرجع الكهربائي المشترك الذي تكتمل به الدائرة. الخلط بين هذه الأطراف من أخطر أخطاء البناء. توصيل VBAT إلى Pad مخصص لـ 5V قد يحرق المكون فوراً. قصر VBAT مع GND قد يسبب شرارة أو احتراقاً أو تلف بطارية.',
    safetyNote:
      'قبل توصيل البطارية لأول مرة، افحص التوصيلات واستخدم Smoke Stopper. لا تعتمد على لون السلك وحده.',
    source: 'Chapter 10 - VBAT, 5V, and GND',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch10-capacitors-voltage-spikes',
    title: 'المكثفات وVoltage Spikes',
    chapter: '10',
    section: 'Capacitors',
    level: 'intermediate',
    safetyRisk: 'medium',
    category: 'electrical_noise',
    tags: ['Capacitor', 'Low ESR', 'Voltage Spike', 'ESC', 'VBAT', 'Noise'],
    summary:
      'المكثف منخفض ESR يساعد على امتصاص القفزات والضجيج الكهربائي الناتج عن ESC والمحركات.',
    body:
      'عند تغيّر تيار المحركات بسرعة، يمكن أن تظهر قفزات جهد وضجيج كهربائي على خط البطارية. مكثف Low ESR قريب من ESC أو مدخل الطاقة يساعد على تقليل هذه القفزات وتهدئة خط VBAT. هذا مهم لحماية المكونات وتقليل الضجيج الذي قد يؤثر على الفيديو أو الإلكترونيات. يجب اختيار مكثف بجهد مناسب أعلى من جهد البطارية الكامل وبقطبية صحيحة.',
    safetyNote:
      'عكس قطبية المكثف أو استخدام مكثف بجهد غير مناسب قد يؤدي إلى تلف أو انفجار المكثف.',
    source: 'Chapter 10 - Capacitors and Voltage Spikes',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch10-wiring-connectors',
    title: 'الأسلاك والموصلات',
    chapter: '10',
    section: 'Wiring and Connectors',
    level: 'beginner',
    safetyRisk: 'high',
    category: 'wiring_safety',
    tags: ['Wires', 'Connectors', 'XT60', 'Soldering', 'Current', 'Resistance'],
    summary:
      'الأسلاك والموصلات يجب أن تتحمل التيار المطلوب. مقاومة أو لحام سيئ يسبب حرارة وفقد طاقة.',
    body:
      'الأسلاك والموصلات ليست مجرد وسيلة توصيل، بل جزء من نظام الطاقة. إذا كان السلك رفيعاً جداً أو الموصل ضعيفاً أو اللحام سيئاً، تزيد المقاومة ويظهر هبوط جهد وحرارة وفقد طاقة. الموصلات مثل XT30 أو XT60 تختار حسب حجم الطائرة والتيار المتوقع. اللحام الجيد والعزل الصحيح مهمان لمنع القصر الكهربائي والاهتزازات التي قد تفصل الأسلاك أثناء الطيران.',
    safetyNote:
      'أي سلك طاقة مكشوف أو لحام ضعيف قد يسبب قصر أو فقد طاقة في الهواء. افحص وشدّد العزل قبل التشغيل.',
    source: 'Chapter 10 - Wiring and Connectors',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch10-heat-efficiency',
    title: 'الحرارة والكفاءة',
    chapter: '10',
    section: 'Heat and Efficiency',
    level: 'intermediate',
    safetyRisk: 'medium',
    category: 'efficiency',
    tags: ['Heat', 'Efficiency', 'Losses', 'ESC', 'Motor', 'Battery'],
    summary:
      'الحرارة غالباً تعني فقد طاقة أو تحميل زائد، ويجب مراقبتها في المحركات وESC والبطارية.',
    body:
      'أي طاقة تتحول إلى حرارة لا تتحول إلى دفع مفيد. سخونة المحركات أو ESC أو البطارية قد تشير إلى تحميل زائد، مروحة غير مناسبة، تيار عالٍ، فلترة أو PID غير مناسب، أو مقاومة عالية في التوصيلات. الكفاءة الجيدة تعني دفعاً مناسباً مع حرارة أقل وزمن طيران أفضل. لذلك فحص الحرارة بعد اختبارات قصيرة يعطي مؤشراً مبكراً على صحة نظام الطاقة.',
    safetyNote:
      'إذا كانت المحركات أو البطارية ساخنة جداً بعد اختبار قصير، توقف ولا تواصل الطيران قبل معرفة السبب.',
    source: 'Chapter 10 - Heat and Efficiency',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch10-smoke-stopper',
    title: 'Smoke Stopper قبل أول تشغيل',
    chapter: '10',
    section: 'First Power-up Safety',
    level: 'beginner',
    safetyRisk: 'critical',
    category: 'first_power_up',
    tags: ['Smoke Stopper', 'First Power', 'Short Circuit', 'Safety', 'Battery'],
    summary:
      'Smoke Stopper أداة حماية عند أول توصيل للبطارية، تساعد على تقليل الضرر إذا كان هناك قصر أو خطأ توصيل.',
    body:
      'عند أول تشغيل بعد اللحام أو تغيير التوصيلات، يكون خطر القصر أو الخطأ الكهربائي أعلى. Smoke Stopper يوضع بين البطارية والدرون ليحد التيار في حالة وجود قصر أو مشكلة. هذا لا يجعل التوصيل آمناً بالكامل، لكنه يعطي طبقة حماية مهمة وقد يمنع احتراق ESC أو Flight Controller أو الأسلاك. يجب استخدامه خصوصاً قبل أول توصيل VBAT بعد بناء جديد أو تعديل كبير.',
    safetyNote:
      'Smoke Stopper لا يغني عن فحص التوصيلات بالعين والملتيميتر. لا تركب المراوح أثناء أول اختبار طاقة.',
    source: 'Chapter 10 - Smoke Stopper and First Power-up',
    sourceType: 'educational_addition',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch10-lipo-charging-storage',
    title: 'شحن وتخزين بطاريات LiPo',
    chapter: '10',
    section: 'LiPo Safety',
    level: 'beginner',
    safetyRisk: 'critical',
    category: 'battery_safety',
    tags: ['LiPo Charging', 'Storage Voltage', 'Balance Charging', 'Fire Safety', 'Battery Safety'],
    summary:
      'سلامة LiPo تعتمد على شحن متوازن، تخزين مناسب، وعدم استخدام بطاريات تالفة أو منتفخة.',
    body:
      'بطاريات LiPo تحتاج تعاملًا حذراً. يجب شحنها بشاحن مناسب يدعم Balance Charging حسب عدد الخلايا، وعدم تركها دون مراقبة أثناء الشحن. للتخزين الطويل تُستخدم غالباً قيمة تخزين مناسبة لكل خلية بدلاً من تركها ممتلئة أو فارغة جداً. البطارية المنتفخة أو المتضررة أو التي تعرضت لصدمة قوية يجب التعامل معها بحذر وعدم استخدامها في الطيران.',
    safetyNote:
      'لا تشحن بطارية LiPo تالفة أو منتفخة. استخدم شاحناً مناسباً ومكان شحن آمن ومقاوم للحريق قدر الإمكان.',
    source: 'Chapter 10 - LiPo Charging and Storage',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch10-electrical-failure-symptoms',
    title: 'أعراض مشاكل نظام الطاقة',
    chapter: '10',
    section: 'Troubleshooting',
    level: 'beginner',
    safetyRisk: 'high',
    category: 'troubleshooting',
    tags: ['Voltage Sag', 'Brownout', 'Desync', 'Motor Cut', 'Reset', 'Power Issue'],
    summary:
      'مشاكل الطاقة قد تظهر كهبوط مفاجئ، إعادة تشغيل، ضعف دفع، سخونة، أو تقطع في المحركات.',
    body:
      'أعراض مشاكل نظام الطاقة تشمل هبوط جهد قوي عند الثروتل، إعادة تشغيل Flight Controller أو Receiver، تقطع في المحركات، ضعف دفع غير طبيعي، سخونة ESC أو بطارية، أو إنذارات بطارية مبكرة جداً. هذه الأعراض قد تأتي من بطارية ضعيفة، موصل سيئ، لحام ضعيف، ESC غير مناسب، مكثف مفقود أو غير كافٍ، أو سحب تيار أعلى من التصميم.',
    safetyNote:
      'إذا ظهرت إعادة تشغيل أو تقطع محركات أثناء الاختبار، لا تطِر قبل تحديد السبب. فقد الطاقة في الهواء خطر مباشر.',
    source: 'Chapter 10 - Electrical Failure Symptoms',
    sourceType: 'inferred_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch10-summary',
    title: 'خلاصة الباب العاشر',
    chapter: '10',
    section: 'خلاصة الباب العاشر',
    level: 'beginner',
    safetyRisk: 'high',
    category: 'chapter_summary',
    tags: ['Summary', 'LiPo', 'Power System', 'Voltage', 'Current', 'Safety', 'Electrical Limits'],
    summary:
      'الباب العاشر يوضح أن نظام الطاقة ليس مجرد بطارية، بل منظومة مترابطة من جهد وتيار ومكونات وحدود أمان.',
    body:
      'خلاصة الباب العاشر أن نظام الطاقة في الكوادكابتر يجب فهمه كوحدة كاملة: البطارية، الجهد، التيار، القدرة، ESC، المحركات، المراوح، الأسلاك، الموصلات، BEC، والمكثفات. زيادة الأداء دون فهم الحدود الكهربائية قد تؤدي إلى هبوط جهد، سخونة، تلف مكونات، أو حريق. اختيار البطارية وعدد الخلايا والسعة وC-rating يجب أن يكون متوافقاً مع المحركات والمراوح وESC. كما أن Smoke Stopper، التحقق من VBAT/5V/GND، وشحن LiPo بأمان من أهم قواعد البناء الآمن.',
    safetyNote:
      'نظام الطاقة هو أكثر جزء قد يسبب تلفاً سريعاً أو خطراً مباشراً. افحص التوصيلات والجهود والبطارية قبل كل تشغيل.',
    source: 'Chapter 10 - Summary',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
];
