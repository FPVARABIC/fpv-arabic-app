/**
 * The video system, as a taxonomy before it is content.
 *
 * WHY A TAXONOMY FILE AT ALL
 * --------------------------
 * Almost every wrong answer a beginner gets about FPV video comes from
 * collapsing nine independent things into one word. People say "I have DJI" and
 * mean any of: the link class, the vendor, the air-side box, the goggles, or
 * the OSD protocol. Then they buy goggles that cannot see their air unit, or
 * enable SmartAudio on a system that has no analogue of it.
 *
 * These nine axes are genuinely orthogonal, and the platform has to keep them
 * apart everywhere — in the project record, in the compatibility rules, in the
 * diagnostics, and in the prose:
 *
 *   1. link class      analog vs digital — a physical fact about the radio link
 *   2. ecosystem       who made it and what it interoperates with
 *   3. device role     what the physical box IS (camera / VTX / air unit / …)
 *   4. control protocol how the flight controller changes channel and power
 *   5. OSD protocol    how the overlay is drawn
 *   6. recording       where video is stored, if anywhere
 *   7. band + channel  where in the spectrum it sits
 *   8. antenna         polarisation, pattern, connector
 *   9. power + cooling what it draws and what it needs to survive
 *
 * WHY THE VENDOR IS NOT THE SYSTEM
 * --------------------------------
 * `ecosystem` deliberately does NOT imply compatibility. Two products carrying
 * the same brand can be mutually unusable, and the platform must never say
 * otherwise — that was an explicit requirement: «لا تقل إن جميع أجهزة DJI
 * متوافقة لمجرد أنها تحمل الاسم نفسه». Compatibility is a claim about a
 * specific pair, backed by the manufacturer's own documentation, and it lives
 * in the verdict rules with an evidence trail — never in an enum.
 *
 * NO REACT, NO ROUTES, NO PROSE HERE
 * ----------------------------------
 * This module is pure data shape. It runs under Node in the test scripts, it
 * will run unchanged in a web client, and it holds no user-facing strings
 * except the Arabic label maps, which exist so that every surface renders the
 * same closed set the same way.
 */

// ── 1. Link class ────────────────────────────────────────────────────────────

/**
 * The physical nature of the link. This is the axis that decides how the
 * picture DEGRADES, which is the single most useful thing to know about a
 * video system: analog fades continuously into noise, digital holds quality
 * then breaks up or freezes.
 */
export type VideoLinkClass = 'analog' | 'digital';

export const VIDEO_LINK_CLASS_LABEL_AR: Record<VideoLinkClass, string> = {
  analog: 'تناظري',
  digital: 'رقمي',
};

// ── 2. Ecosystem ─────────────────────────────────────────────────────────────

/**
 * Which family of hardware a device belongs to.
 *
 * `analog-58` is one ecosystem in the useful sense: any 5.8 GHz analog VTX can
 * feed any 5.8 GHz analog receiver, because the signal itself is the standard.
 * The digital families are the opposite — each is a closed system, and that
 * asymmetry is the most important practical fact in the whole domain.
 */
export type VideoEcosystem = 'analog-58' | 'dji' | 'walksnail' | 'hdzero' | 'other';

export const VIDEO_ECOSYSTEM_LABEL_AR: Record<VideoEcosystem, string> = {
  'analog-58': 'تناظري 5.8 جيجاهرتز',
  dji: 'DJI',
  walksnail: 'Walksnail',
  hdzero: 'HDZero',
  other: 'نظام آخر',
};

/** The link class each ecosystem uses. The one derivation that is always safe. */
export const VIDEO_ECOSYSTEM_CLASS: Record<VideoEcosystem, VideoLinkClass | 'unknown'> = {
  'analog-58': 'analog',
  dji: 'digital',
  walksnail: 'digital',
  hdzero: 'digital',
  other: 'unknown',
};

/**
 * Whether an ecosystem's air side and ground side interoperate ACROSS vendors.
 *
 * This is the rule that decides whether «هل نظارتي تعمل مع هذه الوحدة؟» has a
 * general answer. For analog it does: the standard is the signal. For every
 * digital family it does not, and the honest answer is always "same family,
 * and then check the two specific products".
 */
export const VIDEO_ECOSYSTEM_CROSS_VENDOR: Record<VideoEcosystem, boolean> = {
  'analog-58': true,
  dji: false,
  walksnail: false,
  hdzero: false,
  other: false,
};

// ── 3. Device role ───────────────────────────────────────────────────────────

/**
 * What a physical box actually is.
 *
 * `air-unit` and `vtx` are kept separate on purpose. A VTX transmits a video
 * signal it is GIVEN; an air unit encodes and transmits, and usually owns the
 * camera too. Telling someone to "connect the camera to the air unit's video
 * pad" when their air unit has no such pad is exactly the confusion this
 * distinction prevents.
 */
export type VideoDeviceRole =
  | 'camera'
  | 'vtx'
  | 'air-unit'
  | 'aio-camera-vtx'
  | 'goggles'
  | 'vrx-module'
  | 'ground-station';

export const VIDEO_DEVICE_ROLE_LABEL_AR: Record<VideoDeviceRole, string> = {
  camera: 'كاميرا',
  vtx: 'وحدة إرسال فيديو',
  'air-unit': 'وحدة جوية رقمية',
  'aio-camera-vtx': 'كاميرا ومرسل في وحدة واحدة',
  goggles: 'نظارة',
  'vrx-module': 'وحدة استقبال في النظارة',
  'ground-station': 'محطة استقبال أرضية',
};

// ── 4. VTX control protocol ──────────────────────────────────────────────────

/**
 * How the flight controller tells the transmitter to change channel or power.
 *
 * `none` is a real and common answer: many analog transmitters are set with a
 * physical button and know nothing about the flight controller. Treating that
 * as a fault is a mistake the diagnostics must not make.
 */
export type VtxControlProtocol = 'none' | 'smartaudio' | 'tramp' | 'msp' | 'system-native';

export const VTX_CONTROL_LABEL_AR: Record<VtxControlProtocol, string> = {
  none: 'بلا تحكم (أزرار على الوحدة)',
  smartaudio: 'SmartAudio',
  tramp: 'IRC Tramp',
  msp: 'MSP',
  'system-native': 'تحكم داخلي للنظام الرقمي',
};

/** Facts that decide how each control protocol must be wired and configured. */
export interface VtxControlFacts {
  /** Does it need a serial port assigned in the flight controller? */
  needsUart: boolean;
  /** Does it run on a single wire, transmit-only from the board's side? */
  singleWire: boolean;
  /** Is it a vendor protocol whose version differences matter? */
  versioned: boolean;
  noteAr: string;
}

export const VTX_CONTROL_FACTS: Record<VtxControlProtocol, VtxControlFacts> = {
  none: {
    needsUart: false,
    singleWire: false,
    versioned: false,
    noteAr:
      'القناة والقدرة تُضبطان على الوحدة نفسها بزر أو مفتاح. لا شيء يُضبط في متحكم الطيران، وغياب التحكم هنا ليس عطلاً.',
  },
  smartaudio: {
    needsUart: true,
    singleWire: true,
    versioned: true,
    noteAr:
      'خط واحد يكفي، ويُوصَل عادةً بطرف الإرسال في المنفذ. للبروتوكول إصدارات تختلف في ما تدعمه، وإصدار وحدتك مذكور في توثيقها لا يُستنتج من شكلها.',
  },
  tramp: {
    needsUart: true,
    singleWire: true,
    versioned: false,
    noteAr:
      'خط واحد أيضاً، لكنه بروتوكول مختلف تماماً عن SmartAudio. اختيار الخطأ منهما يعطي العرَض نفسه: لا استجابة إطلاقاً.',
  },
  msp: {
    needsUart: true,
    singleWire: false,
    versioned: false,
    noteAr:
      'يستخدم منفذاً كاملاً بخطي إرسال واستقبال، وهو المسار الذي تستخدمه بعض الأنظمة الرقمية للتحكم وللـOSD معاً.',
  },
  'system-native': {
    needsUart: false,
    singleWire: false,
    versioned: false,
    noteAr:
      'النظام الرقمي يدير قناته وقدرته داخلياً من النظارة أو من تطبيقه. لا تبحث عن إعداد SmartAudio له.',
  },
};

// ── 5. OSD protocol ──────────────────────────────────────────────────────────

/**
 * How the overlay reaches the screen.
 *
 * The distinction that matters: with an analog character chip the FLIGHT
 * CONTROLLER draws the overlay onto the video signal, so the overlay survives
 * anything the picture survives. With DisplayPort the flight controller sends
 * TEXT and the goggles or air unit draw it, so the overlay can be missing while
 * the picture is perfect — which is a completely different fault, with a
 * completely different cause.
 */
export type OsdProtocol = 'none' | 'analog-chip' | 'msp-displayport' | 'canvas-mode' | 'system-native';

export const OSD_PROTOCOL_LABEL_AR: Record<OsdProtocol, string> = {
  none: 'بلا عرض معلومات',
  'analog-chip': 'شريحة رسم تناظرية على متحكم الطيران',
  'msp-displayport': 'MSP DisplayPort',
  'canvas-mode': 'Canvas Mode',
  'system-native': 'عرض معلومات داخلي للنظام',
};

export interface OsdProtocolFacts {
  /** Who actually renders the characters. */
  drawnByAr: string;
  needsUart: boolean;
  /** Can the picture be fine while the overlay is entirely missing? */
  overlayCanFailAlone: boolean;
  noteAr: string;
}

export const OSD_PROTOCOL_FACTS: Record<OsdProtocol, OsdProtocolFacts> = {
  none: {
    drawnByAr: 'لا أحد',
    needsUart: false,
    overlayCanFailAlone: false,
    noteAr: 'لا توجد طبقة معلومات فوق الصورة. تطير بلا جهد بطارية ولا مؤقت ولا تحذيرات.',
  },
  'analog-chip': {
    drawnByAr: 'متحكم الطيران، على إشارة الفيديو نفسها',
    needsUart: false,
    overlayCanFailAlone: true,
    noteAr:
      'الطبقة تُرسَم على الإشارة قبل أن تغادر الطائرة، فما تراه النظارة تراه المسجّلة. غيابها مع وجود صورة يعني عادةً مشكلة في مسار الفيديو داخل اللوحة أو في تفعيل الميزة.',
  },
  'msp-displayport': {
    drawnByAr: 'الوحدة الرقمية أو النظارة، من نص يرسله متحكم الطيران',
    needsUart: true,
    overlayCanFailAlone: true,
    noteAr:
      'متحكم الطيران يرسل نصاً لا صورة، والطرف الآخر يرسمه. لذلك تكون الصورة سليمة تماماً والطبقة غائبة كلياً حين يسقط المنفذ أو لا تُفعَّل الوظيفة.',
  },
  'canvas-mode': {
    drawnByAr: 'الوحدة الرقمية، بترتيب أحرف على شبكة تحددها هي',
    needsUart: true,
    overlayCanFailAlone: true,
    noteAr:
      'صيغة رسم يعتمدها بعض الأنظمة الرقمية بدل الطريقة التناظرية. توفّرها وشرط تفعيلها يتبعان إصدار النظام وإصدار متحكم الطيران معاً — راجع توثيق نظامك.',
  },
  'system-native': {
    drawnByAr: 'النظام الرقمي نفسه',
    needsUart: false,
    overlayCanFailAlone: true,
    noteAr:
      'بعض الأنظمة تعرض معلوماتها الخاصة (قوة الإشارة، البطارية الخاصة بها) بلا أي مشاركة من متحكم الطيران. هذه ليست بديلاً عن معلومات الطيران.',
  },
};

// ── 6. Recording ─────────────────────────────────────────────────────────────

/**
 * Where video is stored.
 *
 * The distinction people miss: goggle DVR records WHAT ARRIVED — noise,
 * breakup and all — while onboard recording stores what the camera saw before
 * transmission. When you are diagnosing a link, only the DVR is evidence.
 */
export type VideoRecording = 'none' | 'goggles-dvr' | 'onboard' | 'both';

export const VIDEO_RECORDING_LABEL_AR: Record<VideoRecording, string> = {
  none: 'لا تسجيل',
  'goggles-dvr': 'تسجيل في النظارة',
  onboard: 'تسجيل على متن الطائرة',
  both: 'تسجيل في النظارة وعلى المتن',
};

// ── 7. Band ──────────────────────────────────────────────────────────────────

/**
 * The band a video link occupies.
 *
 * NO CHANNEL FREQUENCY TABLE IS DECLARED ANYWHERE IN THIS PLATFORM. Band and
 * channel naming, the frequencies behind them, and above all the transmit power
 * a pilot may legally use are all jurisdiction-dependent and change; inventing
 * a table would be inventing regulation. What the platform holds is the
 * PRINCIPLE (bands hold channels, neighbouring channels interfere, pilots must
 * coordinate) and a pointer to the reader's own equipment documentation and
 * local rules.
 */
export type VideoBand = '5.8ghz' | '2.4ghz' | '1.3ghz' | 'other';

export const VIDEO_BAND_LABEL_AR: Record<VideoBand, string> = {
  '5.8ghz': '5.8 جيجاهرتز',
  '2.4ghz': '2.4 جيجاهرتز',
  '1.3ghz': '1.3 جيجاهرتز',
  other: 'نطاق آخر',
};

// ── 8. Antenna ───────────────────────────────────────────────────────────────

/** How the wave is polarised. Mixing these costs signal for no benefit. */
export type VideoPolarisation = 'linear' | 'rhcp' | 'lhcp' | 'unknown';

export const VIDEO_POLARISATION_LABEL_AR: Record<VideoPolarisation, string> = {
  linear: 'خطّي',
  rhcp: 'دائري يميني (RHCP)',
  lhcp: 'دائري يساري (LHCP)',
  unknown: 'غير معروف',
};

/** The shape of the coverage, which is what `gain` actually trades against. */
export type VideoAntennaPattern = 'omni' | 'directional-patch' | 'directional-helical' | 'unknown';

export const VIDEO_ANTENNA_PATTERN_LABEL_AR: Record<VideoAntennaPattern, string> = {
  omni: 'شامل الاتجاهات',
  'directional-patch': 'موجّه مسطّح (Patch)',
  'directional-helical': 'موجّه حلزوني (Helical)',
  unknown: 'غير معروف',
};

/** The connector, because a mismatch here is a purchase mistake, not a setting. */
export type VideoConnector = 'sma' | 'rp-sma' | 'mmcx' | 'ufl' | 'other' | 'unknown';

export const VIDEO_CONNECTOR_LABEL_AR: Record<VideoConnector, string> = {
  sma: 'SMA',
  'rp-sma': 'RP-SMA',
  mmcx: 'MMCX',
  ufl: 'U.FL',
  other: 'موصل آخر',
  unknown: 'غير معروف',
};

/**
 * Connector pairs that do NOT mate, despite looking almost identical.
 *
 * SMA and RP-SMA is the classic one: same shell, reversed gender of the centre
 * contact, so they thread together and make no connection — and running a
 * transmitter into that is running it into no antenna at all.
 */
export const VIDEO_CONNECTOR_LOOKALIKES: [VideoConnector, VideoConnector][] = [
  ['sma', 'rp-sma'],
  ['mmcx', 'ufl'],
];

// ── 9. Power and cooling ─────────────────────────────────────────────────────

/** Where the device takes its power from. */
export type VideoPowerSource = 'fc-5v' | 'fc-9v' | 'fc-10v' | 'vbat' | 'external-bec' | 'unknown';

export const VIDEO_POWER_LABEL_AR: Record<VideoPowerSource, string> = {
  'fc-5v': 'خط 5 فولت من متحكم الطيران',
  'fc-9v': 'خط 9 فولت من متحكم الطيران',
  'fc-10v': 'خط 10 فولت من متحكم الطيران',
  vbat: 'جهد البطارية مباشرةً',
  'external-bec': 'منظّم خارجي مستقل',
  unknown: 'غير معروف',
};

/** How the device is cooled — the axis that decides bench-testing safety. */
export type VideoCooling = 'airflow-only' | 'heatsink' | 'heatsink-and-airflow' | 'enclosed' | 'unknown';

export const VIDEO_COOLING_LABEL_AR: Record<VideoCooling, string> = {
  'airflow-only': 'تدفق هواء فقط',
  heatsink: 'مشتّت حراري بلا تدفق',
  'heatsink-and-airflow': 'مشتّت حراري مع تدفق هواء',
  enclosed: 'مغلق بلا تهوية',
  unknown: 'غير معروف',
};

// ── The pipeline ─────────────────────────────────────────────────────────────

/**
 * One stage in the path from the scene to the pilot's eye.
 *
 * Held as data rather than written as prose because three different surfaces
 * need it — the knowledge module's map, the diagnostics' "where in the chain
 * did it break" framing, and the wiring guide — and three copies of a chain
 * would drift.
 */
export interface VideoChainStage {
  id: string;
  titleAr: string;
  titleEn: string;
  /** What happens here, in one sentence. */
  whatAr: string;
  /** What a fault at THIS stage looks like from the pilot's seat. */
  failureLooksLikeAr: string;
  /** Which link classes this stage exists in. */
  appliesTo: VideoLinkClass[];
  /** True when the stage is on the return path (commands going back up). */
  returnPath?: boolean;
}

/**
 * The full chain, in order.
 *
 * The ordering is the deliverable: a reader who knows the chain can localise
 * almost any video fault to two or three stages before touching anything, and
 * that is what turns "no image" from a panic into a procedure.
 */
export const VIDEO_CHAIN: VideoChainStage[] = [
  {
    id: 'scene',
    titleAr: 'المشهد أمام العدسة',
    titleEn: 'The scene',
    whatAr: 'الضوء المتاح والتباين بين أفتح جزء وأغمق جزء في المشهد.',
    failureLooksLikeAr: 'صورة مغسولة عند مواجهة الشمس، أو مظلمة تماماً في الظل — والعتاد سليم.',
    appliesTo: ['analog', 'digital'],
  },
  {
    id: 'lens',
    titleAr: 'العدسة',
    titleEn: 'Lens',
    whatAr: 'تجمع الضوء وتحدد اتساع المجال المرئي.',
    failureLooksLikeAr: 'صورة ضبابية أو مغبّشة، أو مجال أضيق أو أوسع مما تتوقع، أو بقعة ثابتة من غبار أو خدش.',
    appliesTo: ['analog', 'digital'],
  },
  {
    id: 'sensor',
    titleAr: 'حسّاس الكاميرا',
    titleEn: 'Image sensor',
    whatAr: 'يحوّل الضوء إلى إشارة كهربائية، وهو ما يحدد الأداء في الإضاءة المنخفضة والمدى الديناميكي.',
    failureLooksLikeAr: 'ضجيج كثيف في الإضاءة المنخفضة، أو انطفاء كامل للصورة إن تلف الحسّاس أو تغذيته.',
    appliesTo: ['analog', 'digital'],
  },
  {
    id: 'processing',
    titleAr: 'معالجة الصورة',
    titleEn: 'Image processing',
    whatAr: 'ضبط التعرض والألوان والمدى الديناميكي داخل الكاميرا قبل الإخراج.',
    failureLooksLikeAr: 'ألوان غير صحيحة، أو تعرّض يطارد المشهد ببطء، أو إعدادات مصنع غير مناسبة لطيرانك.',
    appliesTo: ['analog', 'digital'],
  },
  {
    id: 'encode',
    titleAr: 'الترميز والضغط',
    titleEn: 'Encoding and compression',
    whatAr: 'في الأنظمة الرقمية تُضغط الصورة قبل بثّها، وهنا يولد جزء كبير من زمن التأخير.',
    failureLooksLikeAr: 'تأخير محسوس، أو تكتّلات مربّعة في المشاهد المزدحمة عند انخفاض معدل البيانات.',
    appliesTo: ['digital'],
  },
  {
    id: 'signal',
    titleAr: 'الإشارة الخارجة',
    titleEn: 'Outgoing signal',
    whatAr: 'في التناظري إشارة مركّبة مستمرة، وفي الرقمي رزم بيانات مضغوطة.',
    failureLooksLikeAr: 'في التناظري تدهور تدريجي إلى ثلج، وفي الرقمي ثبات ثم تكسّر أو تجمّد مفاجئ.',
    appliesTo: ['analog', 'digital'],
  },
  {
    id: 'vtx',
    titleAr: 'وحدة الإرسال',
    titleEn: 'Video transmitter',
    whatAr: 'ترفع الإشارة إلى تردد البثّ وتخرجها بالقدرة المضبوطة.',
    failureLooksLikeAr: 'لا صورة إطلاقاً، أو صورة تختفي مع الحرارة، أو مدى أقصر بكثير من المتوقع.',
    appliesTo: ['analog', 'digital'],
  },
  {
    id: 'tx-antenna',
    titleAr: 'هوائي الإرسال',
    titleEn: 'Transmit antenna',
    whatAr: 'يحوّل القدرة إلى موجة، وشكل نمط إشعاعه يحدد أين تصل الصورة وأين لا تصل.',
    failureLooksLikeAr: 'مدى قصير جداً، أو انقطاع في اتجاهات معينة، أو تلف الوحدة إن بُثَّ بلا هوائي.',
    appliesTo: ['analog', 'digital'],
  },
  {
    id: 'medium',
    titleAr: 'الوسط اللاسلكي',
    titleEn: 'The air',
    whatAr: 'المسافة والعوائق والانعكاسات ومصادر التداخل بين الطائرة والطيار.',
    failureLooksLikeAr: 'انقطاع خلف عائق، أو تداخل مع طيار آخر على قناة قريبة، أو انعكاسات تفسد الصورة قرب الأسطح.',
    appliesTo: ['analog', 'digital'],
  },
  {
    id: 'rx-antenna',
    titleAr: 'هوائي الاستقبال',
    titleEn: 'Receive antenna',
    whatAr: 'يلتقط الموجة، واستقطابه يجب أن يوافق استقطاب الإرسال.',
    failureLooksLikeAr: 'إشارة أضعف بكثير مما تبرره المسافة، وخصوصاً عند اختلاف الاستقطاب.',
    appliesTo: ['analog', 'digital'],
  },
  {
    id: 'receiver',
    titleAr: 'المستقبل أو النظارة',
    titleEn: 'Receiver or goggles',
    whatAr: 'يفكّ الإشارة ويحوّلها إلى صورة، وقد يختار بين أكثر من هوائي.',
    failureLooksLikeAr: 'قناة خاطئة، أو نظام غير مطابق فلا يرى الوحدة أصلاً، أو وحدة استقبال غير مركّبة.',
    appliesTo: ['analog', 'digital'],
  },
  {
    id: 'display',
    titleAr: 'العرض على الشاشة',
    titleEn: 'Display',
    whatAr: 'الشاشة داخل النظارة، ودقتها ومجالها وضبطها البصري لعينيك.',
    failureLooksLikeAr: 'صورة غير حادة رغم سلامة الإشارة، أو إجهاد بصري، أو أطراف غير واضحة.',
    appliesTo: ['analog', 'digital'],
  },
  {
    id: 'osd',
    titleAr: 'طبقة المعلومات',
    titleEn: 'OSD overlay',
    whatAr: 'البيانات المرسومة فوق الصورة: الجهد والمؤقت والتحذيرات.',
    failureLooksLikeAr: 'صورة سليمة بلا أي طبقة، أو طبقة ناقصة، أو نصوص مشوّهة أو في غير موضعها.',
    appliesTo: ['analog', 'digital'],
  },
  {
    id: 'dvr',
    titleAr: 'التسجيل',
    titleEn: 'Recording',
    whatAr: 'حفظ ما وصل إلى النظارة، أو ما رأته الكاميرا قبل البثّ.',
    failureLooksLikeAr: 'لا ملف بعد الرحلة، أو بطاقة لا تُقرأ، أو تسجيل يتوقف في منتصف الرحلة.',
    appliesTo: ['analog', 'digital'],
  },
  {
    id: 'control-return',
    titleAr: 'الأوامر العائدة',
    titleEn: 'Return commands',
    whatAr: 'ما يُرسَل من متحكم الطيران أو النظارة إلى الوحدة أو الكاميرا: قناة، قدرة، قائمة الكاميرا.',
    failureLooksLikeAr: 'تعذّر تغيير القناة أو القدرة، أو عدم فتح قائمة الكاميرا رغم سلامة الصورة.',
    appliesTo: ['analog', 'digital'],
    returnPath: true,
  },
];

/** The chain stages that exist for a given link class. */
export function videoChainFor(linkClass: VideoLinkClass): VideoChainStage[] {
  return VIDEO_CHAIN.filter(s => s.appliesTo.includes(linkClass));
}
