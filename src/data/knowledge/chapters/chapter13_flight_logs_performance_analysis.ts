import type { KnowledgeEntry } from '../types';

export const chapter13FlightLogsPerformanceAnalysis: KnowledgeEntry[] = [
  {
    id: 'ch13-intro-flight-logs-performance-analysis',
    title: 'مدخل إلى سجلات الطيران وتحليل الأداء',
    chapter: '13',
    section: 'مقدمة الباب الثالث عشر',
    level: 'beginner',
    safetyRisk: 'medium',
    category: 'flight_logs',
    tags: ['Flight Logs', 'Blackbox', 'Performance', 'Debugging', 'Telemetry', 'Analysis'],
    summary:
      'سجلات الطيران تساعد على فهم ما حدث فعلاً داخل الدرون بدلاً من الاعتماد على التخمين.',
    body:
      'عند حدوث اهتزاز، سخونة، فقد تحكم، هبوط جهد، أو سلوك غير مفهوم، لا يكفي الاعتماد على الإحساس فقط. سجلات الطيران مثل Blackbox أو Telemetry تحفظ بيانات مهمة عن الحساسات، أوامر التحكم، خرج المحركات، الجهد، وربما التيار والحالة العامة. تحليل هذه البيانات يساعد على معرفة السبب الحقيقي للمشكلة واتخاذ قرار إصلاح مبني على دليل.',
    safetyNote:
      'لا تستخدم السجلات كبديل عن السلامة الأساسية. إذا كان السلوك خطيراً، أوقف الطيران أولاً ثم حلل السبب.',
    source: 'Chapter 13 - سجلات الطيران وتحليل الأداء',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch13-why-flight-logs-matter',
    title: 'لماذا نحتاج سجلات الطيران؟',
    chapter: '13',
    section: '13.1',
    level: 'beginner',
    safetyRisk: 'low',
    category: 'flight_logs',
    tags: ['Logs', 'Troubleshooting', 'Evidence', 'Debugging', 'Performance'],
    summary:
      'السجل يعطي صورة دقيقة عن الأحداث التي لا يستطيع الطيار رؤيتها أثناء الطيران.',
    body:
      'بعض المشاكل تحدث بسرعة كبيرة ولا يستطيع الطيار ملاحظتها بدقة. قد يسمع صوتاً غريباً أو يرى اهتزازاً، لكن لا يعرف هل السبب PID أو فلترة أو محرك أو مروحة أو جهد البطارية. السجل يحول المشكلة من تخمين إلى بيانات. يمكن مقارنة أوامر الطيار باستجابة الجايرو، ومراقبة خرج المحركات، وفحص الجهد، ومعرفة متى بدأت المشكلة.',
    source: 'Chapter 13 - Why Logs Matter',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch13-blackbox-basics',
    title: 'أساسيات Blackbox',
    chapter: '13',
    section: 'Blackbox',
    level: 'beginner',
    safetyRisk: 'low',
    category: 'blackbox',
    tags: ['Blackbox', 'Betaflight', 'Gyro', 'PID', 'Motor Output', 'Logs'],
    summary:
      'Blackbox يسجل بيانات داخلية من الفيرموير تساعد على تحليل التحكم والاهتزازات والأداء.',
    body:
      'Blackbox في Betaflight وأدوات مشابهة في أنظمة أخرى تسجل بيانات مثل gyro، setpoint، PID terms، أوامر المحركات، وأحياناً الجهد والتيار حسب الإعدادات. هذه البيانات تسمح بفهم كيف كان الفيرموير يحاول تصحيح الحركة، وهل كان الدرون يتبع أوامر الطيار بشكل جيد أم كان يعاني من ضجيج أو تذبذب أو تشبع في المحركات.',
    source: 'Chapter 13 - Blackbox Basics',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch13-telemetry-basics',
    title: 'أساسيات Telemetry',
    chapter: '13',
    section: 'Telemetry',
    level: 'beginner',
    safetyRisk: 'medium',
    category: 'telemetry',
    tags: ['Telemetry', 'Battery Voltage', 'RSSI', 'Link Quality', 'Current', 'Warnings'],
    summary:
      'Telemetry تعرض أو تسجل معلومات مهمة أثناء الطيران مثل الجهد وجودة الإشارة والتنبيهات.',
    body:
      'Telemetry تنقل بيانات من الدرون إلى جهاز التحكم أو النظارة أو نظام التسجيل. قد تشمل جهد البطارية، التيار، RSSI أو Link Quality، حالة GPS، الإنذارات، أو بيانات أخرى. فائدتها أنها تساعد الطيار على اتخاذ قرار أثناء الطيران، مثل الرجوع قبل انخفاض البطارية أو الانتباه إلى ضعف الإشارة.',
    safetyNote:
      'لا تعتمد على Telemetry إذا لم تختبرها. إنذار بطارية أو إشارة غير مضبوط قد يعطي إحساساً زائفاً بالأمان.',
    source: 'Chapter 13 - Telemetry Basics',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch13-what-to-record',
    title: 'ما البيانات التي نحتاج تسجيلها؟',
    chapter: '13',
    section: 'Log Fields',
    level: 'intermediate',
    safetyRisk: 'low',
    category: 'log_setup',
    tags: ['Gyro', 'Setpoint', 'PID', 'Motor Output', 'Voltage', 'Current', 'RSSI'],
    summary:
      'اختيار البيانات المسجلة يعتمد على المشكلة المراد تحليلها، لكن بعض القيم أساسية في أغلب الحالات.',
    body:
      'لتحليل التحكم والاهتزازات، تكون بيانات gyro وsetpoint وPID terms وmotor output مهمة جداً. لتحليل الطاقة، نحتاج جهد البطارية وربما التيار إذا كان متاحاً. لتحليل فقد الإشارة، نحتاج Link Quality أو RSSI وFailsafe events. لا يلزم تسجيل كل شيء دائماً، لكن يجب تسجيل ما يكفي للإجابة عن السؤال التشخيصي.',
    source: 'Chapter 13 - What to Record',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch13-gyro-trace-interpretation',
    title: 'قراءة أثر الجايرو Gyro Trace',
    chapter: '13',
    section: 'Gyro Analysis',
    level: 'intermediate',
    safetyRisk: 'medium',
    category: 'log_analysis',
    tags: ['Gyro', 'Trace', 'Noise', 'Vibration', 'Oscillation', 'Filtering'],
    summary:
      'أثر الجايرو يكشف الحركة الحقيقية والضجيج والاهتزازات التي يراها Flight Controller.',
    body:
      'Gyro Trace يوضح ما يقيسه الجايرو فعلياً. إذا كانت القراءة مليئة بضجيج عالٍ أو اهتزازات متكررة، فقد يكون هناك مشكلة في المراوح، المحركات، تركيب Flight Controller، الفلترة، أو الإطار. إذا كان الجايرو لا يتبع setpoint بشكل جيد، فقد تكون المشكلة في PID أو تشبع المحركات أو ضعف ميكانيكي.',
    safetyNote:
      'اهتزازات قوية في الجايرو قد تؤدي إلى سخونة محركات أو فقد استقرار. لا تواصل الطيران قبل الفحص.',
    source: 'Chapter 13 - Gyro Trace Interpretation',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch13-setpoint-versus-gyro',
    title: 'مقارنة Setpoint مع Gyro',
    chapter: '13',
    section: 'Control Tracking',
    level: 'intermediate',
    safetyRisk: 'low',
    category: 'control_analysis',
    tags: ['Setpoint', 'Gyro', 'Tracking', 'PID', 'Control Response'],
    summary:
      'مقارنة أمر الطيار باستجابة الجايرو توضح جودة تتبع الدرون للأوامر.',
    body:
      'Setpoint يمثل ما يطلبه الطيار أو الحلقة الخارجية، بينما gyro يمثل الحركة المقاسة فعلياً. إذا كان gyro يتبع setpoint بسلاسة وبدون تأخير كبير أو تذبذب زائد، فغالباً التحكم جيد. إذا ظهرت overshoot أو oscillation أو تأخير واضح، فقد يحتاج النظام إلى ضبط PID أو فلترة أو فحص ميكانيكي.',
    source: 'Chapter 13 - Setpoint versus Gyro',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch13-motor-output-analysis',
    title: 'تحليل خرج المحركات',
    chapter: '13',
    section: 'Motor Output',
    level: 'intermediate',
    safetyRisk: 'medium',
    category: 'motor_analysis',
    tags: ['Motor Output', 'Saturation', 'Mixer', 'ESC', 'Thrust', 'Control Authority'],
    summary:
      'خرج المحركات يوضح كيف يحاول الفيرموير تصحيح الحركة وهل وصل إلى حدود التحكم.',
    body:
      'عند تحليل Motor Output يمكن معرفة ما إذا كان الفيرموير يطلب من محرك معين جهداً عالياً باستمرار، أو إذا كانت المحركات تصل إلى الحد الأعلى أو الأدنى. تشبع المحركات يعني أن النظام لم يعد يملك هامشاً كافياً للتصحيح. قد يحدث ذلك بسبب وزن زائد، بطارية ضعيفة، مروحة غير مناسبة، خلل في محرك، أو تصميم غير متوازن.',
    safetyNote:
      'إذا ظهر تشبع متكرر في المحركات، لا تعالج المشكلة برفع PID عشوائياً. افحص السبب الحقيقي.',
    source: 'Chapter 13 - Motor Output Analysis',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch13-pid-term-analysis',
    title: 'تحليل مصطلحات PID',
    chapter: '13',
    section: 'PID Terms',
    level: 'advanced',
    safetyRisk: 'medium',
    category: 'pid_analysis',
    tags: ['PID', 'P Term', 'I Term', 'D Term', 'Oscillation', 'Tuning'],
    summary:
      'مصطلحات PID تساعد على فهم هل المشكلة من التصحيح اللحظي أو التراكم أو التخميد.',
    body:
      'في السجلات يمكن أحياناً رؤية مساهمة P وI وD. مصطلح P يعكس التصحيح المباشر للخطأ، I يعالج الانحياز أو الخطأ المستمر، وD يساعد على التخميد ومقاومة التغير السريع. قراءة هذه المصطلحات تساعد على فهم سبب التذبذب أو البطء أو مقاومة الرياح، لكن تعديل PID يجب أن يكون تدريجياً ومع اختبار آمن.',
    safetyNote:
      'لا تغيّر PID بقيم كبيرة بناءً على سجل واحد فقط. اختبر تدريجياً وراقب حرارة المحركات.',
    source: 'Chapter 13 - PID Term Analysis',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch13-vibration-diagnosis',
    title: 'تشخيص الاهتزازات من السجلات',
    chapter: '13',
    section: 'Vibration Diagnosis',
    level: 'intermediate',
    safetyRisk: 'medium',
    category: 'vibration_analysis',
    tags: ['Vibration', 'Props', 'Motors', 'Frame', 'Gyro Noise', 'Filtering'],
    summary:
      'الاهتزازات قد تظهر في السجلات كضجيج أو ترددات واضحة في بيانات الجايرو.',
    body:
      'إذا ظهرت اهتزازات عالية في السجل، يجب فحص المراوح أولاً لأنها من أكثر الأسباب شيوعاً. ثم فحص المحركات، البراغي، الإطار، تركيب Flight Controller، والعزل الميكانيكي. الفلترة يمكن أن تساعد، لكنها لا يجب أن تكون الحل الوحيد لمشكلة ميكانيكية واضحة.',
    safetyNote:
      'مروحة مكسورة أو محرك متضرر قد يسببان اهتزازاً خطيراً. افحص ميكانيكياً قبل الاستمرار في الطيران.',
    source: 'Chapter 13 - Vibration Diagnosis',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch13-voltage-current-analysis',
    title: 'تحليل الجهد والتيار',
    chapter: '13',
    section: 'Power Analysis',
    level: 'intermediate',
    safetyRisk: 'high',
    category: 'power_analysis',
    tags: ['Voltage', 'Current', 'Voltage Sag', 'Battery', 'ESC', 'Power System'],
    summary:
      'سجلات الجهد والتيار تساعد على تشخيص البطارية الضعيفة أو الحمل الزائد أو مشاكل الطاقة.',
    body:
      'هبوط الجهد أثناء الثروتل العالي قد يكشف بطارية ضعيفة أو مقاومة داخلية عالية أو سحب تيار كبير. التيار المرتفع جداً قد يدل على مروحة كبيرة، KV غير مناسب، احتكاك في المحرك، أو وزن زائد. مقارنة الجهد والتيار مع أوامر الثروتل وسلوك المحركات تساعد على فهم هل المشكلة كهربائية أم تحكمية.',
    safetyNote:
      'هبوط جهد شديد أو تيار مفرط قد يؤدي إلى فقد طاقة أو تلف مكونات. لا تتجاهل هذه العلامات.',
    source: 'Chapter 13 - Voltage and Current Analysis',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch13-radio-link-analysis',
    title: 'تحليل جودة رابط التحكم',
    chapter: '13',
    section: 'Radio Link',
    level: 'intermediate',
    safetyRisk: 'high',
    category: 'radio_analysis',
    tags: ['Radio Link', 'RSSI', 'LQ', 'Failsafe', 'ExpressLRS', 'Receiver'],
    summary:
      'بيانات الرابط تساعد على فهم مشاكل فقد الإشارة أو التحذيرات أو Failsafe.',
    body:
      'عند حدوث Failsafe أو تقطع في التحكم، يجب فحص بيانات الرابط مثل RSSI أو Link Quality أو Telemetry warnings حسب النظام. انخفاض جودة الرابط قد يكون بسبب هوائي غير صحيح، اتجاه هوائي سيئ، قدرة إرسال غير مناسبة، مسافة كبيرة، تشويش، أو إعدادات Receiver غير صحيحة.',
    safetyNote:
      'لا تطِر بعيداً إذا كانت جودة الرابط ضعيفة في اختبارات قريبة. أصلح الهوائيات والإعدادات أولاً.',
    source: 'Chapter 13 - Radio Link Analysis',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch13-gps-navigation-log-analysis',
    title: 'تحليل GPS والملاحة من السجلات',
    chapter: '13',
    section: 'GPS Logs',
    level: 'advanced',
    safetyRisk: 'high',
    category: 'navigation_analysis',
    tags: ['GPS', 'Satellites', 'Home Point', 'RTH', 'Position Hold', 'Navigation'],
    summary:
      'سجلات GPS تساعد على تقييم جودة الموقع ونقطة Home وسلوك الأنماط الملاحية.',
    body:
      'عند استخدام Position Hold أو RTH أو Waypoints، تصبح بيانات GPS مهمة جداً. يجب فحص عدد الأقمار، جودة الموقع، تسجيل Home Point، والسرعة أو الانحراف أثناء التثبيت. إذا كان GPS غير مستقر أو Home Point خاطئاً، فقد تتصرف الأنماط الملاحية بشكل غير آمن.',
    safetyNote:
      'لا تعتمد على أنماط GPS إذا أظهرت السجلات إشارة غير مستقرة أو Home Point غير واضح.',
    source: 'Chapter 13 - GPS and Navigation Log Analysis',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch13-crash-analysis',
    title: 'تحليل السقوط أو الحادث',
    chapter: '13',
    section: 'Crash Analysis',
    level: 'intermediate',
    safetyRisk: 'high',
    category: 'incident_analysis',
    tags: ['Crash', 'Incident', 'Disarm', 'Failsafe', 'Motor Failure', 'Log Review'],
    summary:
      'تحليل الحادث يبدأ بتحديد آخر لحظات قبل السقوط: أوامر الطيار، الجهد، المحركات، الإشارة، والحساسات.',
    body:
      'عند سقوط الدرون، يجب عدم افتراض السبب مباشرة. ابدأ من آخر ثوانٍ في السجل: هل فقدت الإشارة؟ هل هبط الجهد؟ هل توقف محرك؟ هل ظهر أمر Disarm؟ هل حدث تشبع في المحركات؟ هل كان هناك اهتزاز مفاجئ؟ بهذه الطريقة يمكن التفريق بين خطأ طيار، مشكلة طاقة، مشكلة ريسيفر، خلل محرك، أو إعداد غير صحيح.',
    safetyNote:
      'بعد حادث قوي، لا تطِر مباشرة حتى لو بدا الدرون سليماً. افحص الإطار، المحركات، البطارية، واللحام.',
    source: 'Chapter 13 - Crash Analysis',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch13-post-flight-notes',
    title: 'ملاحظات ما بعد الطيران',
    chapter: '13',
    section: 'Post-flight Review',
    level: 'beginner',
    safetyRisk: 'low',
    category: 'flight_review',
    tags: ['Post Flight', 'Notes', 'Battery', 'Heat', 'Vibration', 'Maintenance'],
    summary:
      'الملاحظات بعد الطيران تكمل السجلات لأنها تضيف ما رآه وسمعه وشعر به الطيار.',
    body:
      'السجل لا يحتوي كل شيء. لذلك من المفيد تدوين ملاحظات بعد كل اختبار: هل كانت المحركات ساخنة؟ هل البطارية هبطت بسرعة؟ هل كان هناك صوت غير طبيعي؟ هل تغير السلوك بعد تركيب مروحة معينة؟ جمع الملاحظات مع السجلات يعطي صورة أوضح ويجعل التطوير أكثر دقة.',
    source: 'Chapter 13 - Post-flight Notes',
    sourceType: 'educational_addition',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch13-baseline-comparison',
    title: 'المقارنة مع خط أساس',
    chapter: '13',
    section: 'Baseline',
    level: 'intermediate',
    safetyRisk: 'low',
    category: 'performance_analysis',
    tags: ['Baseline', 'Comparison', 'Tuning', 'Before After', 'Performance'],
    summary:
      'وجود سجل جيد معروف كمرجع يساعد على معرفة هل التعديل حسّن الأداء أم زاده سوءاً.',
    body:
      'عند تعديل PID أو فلترة أو مروحة أو بطارية، من المفيد مقارنة السجل الجديد بسجل سابق جيد. بدون خط أساس قد يصعب معرفة هل التغيير مفيد فعلاً. المقارنة يجب أن تكون عادلة قدر الإمكان: نفس الدرون، نفس البطارية تقريباً، نفس نوع الطيران، ونفس الظروف قدر الإمكان.',
    source: 'Chapter 13 - Baseline Comparison',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch13-do-not-overinterpret-logs',
    title: 'لا تفرط في تفسير السجلات',
    chapter: '13',
    section: 'Analysis Discipline',
    level: 'intermediate',
    safetyRisk: 'medium',
    category: 'analysis_method',
    tags: ['Log Analysis', 'Tuning', 'False Conclusions', 'Testing', 'Debugging'],
    summary:
      'السجلات مهمة، لكنها تحتاج سياقاً واختباراً تدريجياً حتى لا تقود إلى استنتاجات خاطئة.',
    body:
      'ليس كل spike في السجل يعني مشكلة خطيرة، وليس كل اهتزاز بسيط يحتاج تغييراً كبيراً في PID. يجب قراءة السجلات مع معرفة ظروف الطيران، حالة البطارية، الرياح، المراوح، وسلوك الطيار. الأفضل تغيير عامل واحد في كل مرة ثم إعادة الاختبار. الإفراط في التفسير قد يؤدي إلى تعديلات عشوائية تجعل الدرون أسوأ.',
    safetyNote:
      'لا تعدّل إعدادات حساسة بقفزات كبيرة بناءً على قراءة واحدة غير مؤكدة.',
    source: 'Chapter 13 - Do Not Over-interpret Logs',
    sourceType: 'educational_addition',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch13-safe-logging-workflow',
    title: 'منهج آمن لاستخدام السجلات',
    chapter: '13',
    section: 'Safe Workflow',
    level: 'beginner',
    safetyRisk: 'medium',
    category: 'workflow',
    tags: ['Workflow', 'Test Flight', 'Safety', 'Logs', 'Incremental Testing'],
    summary:
      'أفضل تحليل يبدأ بسؤال واضح، اختبار قصير آمن، سجل نظيف، ثم تعديل محدود وإعادة اختبار.',
    body:
      'المنهج العملي هو تحديد سؤال واحد: هل المشكلة اهتزاز؟ هل الجهد يهبط؟ هل PID يسبب تذبذباً؟ بعد ذلك يتم إجراء اختبار قصير وآمن، حفظ السجل، تحليل البيانات، تعديل عامل واحد فقط، ثم إعادة الاختبار. هذا يحافظ على السلامة ويجعل النتيجة مفهومة.',
    safetyNote:
      'لا تختبر مشكلة خطيرة بطيران طويل أو قرب الناس. اجعل الاختبار قصيراً وفي مكان آمن.',
    source: 'Chapter 13 - Safe Logging Workflow',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
  {
    id: 'ch13-summary',
    title: 'خلاصة الباب الثالث عشر',
    chapter: '13',
    section: 'خلاصة الباب الثالث عشر',
    level: 'beginner',
    safetyRisk: 'medium',
    category: 'chapter_summary',
    tags: ['Summary', 'Flight Logs', 'Blackbox', 'Telemetry', 'Performance', 'Debugging'],
    summary:
      'الباب الثالث عشر يوضح كيف تساعد السجلات على تحويل مشاكل الطيران إلى بيانات قابلة للفهم والتحليل.',
    body:
      'خلاصة الباب الثالث عشر أن سجلات الطيران أداة قوية لفهم الأداء والمشاكل. Blackbox يساعد على تحليل الجايرو وPID والمحركات والاهتزازات، وTelemetry يساعد على مراقبة البطارية والإشارة والإنذارات. تحليل السجلات يجب أن يكون منظماً: سؤال واضح، اختبار قصير، قراءة البيانات، تعديل محدود، ثم اختبار جديد. السجلات لا تعوض السلامة أو الفحص الميكانيكي، لكنها تقلل التخمين وتساعد على بناء درون أكثر موثوقية.',
    safetyNote:
      'إذا كشف السجل مشكلة طاقة أو اهتزاز أو فقد إشارة، أوقف الطيران حتى يتم إصلاح السبب.',
    source: 'Chapter 13 - Summary',
    sourceType: 'explicit_from_book',
    relatedLessonIds: [],
    relatedChecklistIds: [],
  },
];
