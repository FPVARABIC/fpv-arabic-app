/**
 * The platform's single terminology standard.
 *
 * WHY THIS IS DATA AND NOT JUST A DOCUMENT
 * ----------------------------------------
 * A style guide nobody can run is a style guide nobody follows. Every rule here
 * is machine-checked by `scripts/testKbLanguage.ts` over every authored string
 * in the encyclopedia, the glossary and the diagnostic trees, so terminology
 * drift fails the build instead of accumulating quietly across modules.
 *
 * THE THREE-WAY VOCABULARY PROBLEM
 * --------------------------------
 * Arabic FPV vocabulary is genuinely trilingual: the English term
 * ("Flight Controller"), an Arabic transliteration written in Arabic letters
 * ("فلايت كنترولر"), and a real Arabic translation ("متحكم الطيران") are all in
 * live use — often by the same person in the same sentence. The rules below take
 * a deliberate position on each register:
 *
 *   PROSE      → the Arabic translation, when one is genuinely established.
 *   UI LABELS  → the exact English string the user will see in the real
 *                software, because they have to find it there.
 *   SEARCH     → every spelling, handled in search/synonyms.ts, never here.
 *
 * That is why a variant being *forbidden in prose* does not make it wrong: it
 * stays fully searchable. The two files serve opposite goals — this one narrows
 * what we write, that one widens what we accept.
 *
 * USE VERSUS MENTION
 * ------------------
 * Teaching a reader that «فلايت كنترولر» is the transliteration they will hear
 * is not using the variant, it is *mentioning* it — and the encyclopedia has to
 * be able to do that. The convention: a variant enclosed in Arabic guillemets
 * («…») is a citation and is exempt. `scripts/testKbLanguage.ts` strips quoted
 * spans before checking, so quoting is the one sanctioned way to write a
 * non-canonical form.
 */

/** A concept whose Arabic rendering is fixed across the whole platform. */
export interface CanonicalTerm {
  /** Glossary term id when one exists, for cross-checking. */
  glossaryId?: string;
  /** The form that must be used in Arabic prose. */
  canonicalAr: string;
  /** The English form shown alongside it. */
  en: string;
  /**
   * Spellings that must NOT appear in authored prose. Matched as whole words on
   * normalized text. These remain valid search input — see the header note.
   */
  forbiddenInProse: string[];
  /** Why the canonical form was chosen — kept so the decision is auditable. */
  rationale: string;
}

/**
 * Latin technical terms that stay in Latin script in prose rather than being
 * translated. Translating these actively harms the reader: they must recognise
 * the string inside Betaflight, a datasheet or a pinout, and an invented Arabic
 * equivalent nobody uses would make the real thing unfindable.
 */
export const KEEP_IN_LATIN: string[] = [
  'ESC', 'UART', 'I2C', 'SPI', 'CAN', 'USB', 'DMA', 'DShot', 'PWM', 'CRSF', 'SBUS', 'IBUS',
  'Betaflight', 'INAV', 'ArduPilot', 'ExpressLRS', 'Crossfire', 'BLHeli', 'AM32', 'EdgeTX',
  'Firmware', 'Bootloader', 'DFU', 'OSD', 'VTX', 'GPS', 'GNSS', 'PID', 'LiPo', 'BEC',
  'Blackbox', 'Failsafe', 'Telemetry', 'Pinout', 'Smoke Stopper', 'Flux', 'MOSFET',
  'Whoop', 'Cinewhoop', 'Toothpick', 'Freestyle', 'Stack', 'AIO', 'PDB', 'MSP', 'RSSI', 'SNR',
  // Video. Every one of these is a string the reader will meet on a product, in
  // a configurator menu, or in a manufacturer's manual. Translating them would
  // make the real thing unfindable, which is the exact harm this list prevents.
  'VRX', 'DVR', 'DisplayPort', 'Canvas Mode', 'SmartAudio', 'Tramp', 'Raceband',
  'Pit Mode', 'RHCP', 'LHCP', 'PAL', 'NTSC', 'FOV', 'TVL', 'WDR', 'FPV',
];

export const canonicalTerms: CanonicalTerm[] = [
  {
    glossaryId: 'fc',
    canonicalAr: 'متحكم الطيران',
    en: 'Flight Controller',
    forbiddenInProse: ['فلايت كنترولر', 'فلايت كونترولر', 'كنترولر', 'كونترولر', 'الكنترولر'],
    rationale: 'ترجمة عربية دقيقة ومستقرة. النقحرة تبقى مدعومة في البحث لأن المستخدمين يكتبونها، لكنها لا تُكتب في الشرح. الصيغة النكرة «متحكم طيران» صحيحة ومسموحة — القاعدة تخصّ النقحرة لا التعريف.',
  },
  {
    glossaryId: 'gyro',
    canonicalAr: 'الجيروسكوب',
    en: 'Gyroscope',
    forbiddenInProse: ['الجايرو', 'جايرو', 'الچيروسكوب'],
    rationale: 'التعريب الصوتي «الجيروسكوب» مستقر في العربية العلمية؛ «الجايرو» عامية غير موحّدة.',
  },
  {
    glossaryId: 'accelerometer',
    canonicalAr: 'المسرّع',
    en: 'Accelerometer',
    forbiddenInProse: ['الأكسلروميتر', 'اكسلروميتر', 'مقياس التسارع الخطي'],
    rationale: '«المسرّع» أقصر وأوضح، ومستخدم في المراجع العربية. النقحرة تبقى في القاموس كنطق فقط.',
  },
  {
    canonicalAr: 'المحرك',
    en: 'Motor',
    forbiddenInProse: ['الموتور', 'موتور', 'الموتورات', 'موتورات'],
    rationale: '«المحرك» عربية فصيحة وشائعة. «موتور» نقحرة عامية تبقى مدعومة في البحث.',
  },
  {
    canonicalAr: 'المروحة',
    en: 'Propeller',
    forbiddenInProse: ['البروب', 'بروبلر', 'البروبلر', 'البروبات'],
    rationale: '«المروحة» هي الكلمة العربية القياسية ولا لبس فيها.',
  },
  {
    canonicalAr: 'البطارية',
    en: 'Battery',
    forbiddenInProse: ['الباتري', 'باتري'],
    rationale: 'كلمة عربية راسخة.',
  },
  {
    canonicalAr: 'المستقبل',
    en: 'Receiver',
    forbiddenInProse: ['الريسيفر', 'ريسيفر'],
    rationale: '«المستقبل» دقيقة ومفهومة. النقحرة تبقى في البحث.',
  },
  {
    canonicalAr: 'جهاز الإرسال',
    en: 'Transmitter',
    forbiddenInProse: ['الترانسميتر', 'الريموت'],
    rationale: '«جهاز الإرسال» أدق من «الريموت» التي تُستعمل للتلفاز أيضاً.',
  },
  {
    glossaryId: 'capacitor',
    canonicalAr: 'المكثف',
    en: 'Capacitor',
    forbiddenInProse: ['الكباستر', 'كباستر', 'الكابستور'],
    rationale: '«المكثف» مصطلح كهربائي عربي قياسي.',
  },
  {
    glossaryId: 'short-circuit',
    canonicalAr: 'القصر الكهربائي',
    en: 'Short Circuit',
    forbiddenInProse: ['الشورت', 'شورت'],
    rationale: 'مصطلح هندسي عربي قياسي، والدقة هنا تتعلق بالسلامة.',
  },
  {
    canonicalAr: 'الهيكل',
    en: 'Frame',
    forbiddenInProse: ['الفريم', 'فريم'],
    rationale: '«الهيكل» عربية واضحة. «فريم» نقحرة شائعة لكنها تبقى للبحث فقط.',
  },
  {
    canonicalAr: 'الهوائي',
    en: 'Antenna',
    forbiddenInProse: ['الانتينا', 'انتينا'],
    rationale: '«الهوائي» عربية قياسية.',
  },
  {
    canonicalAr: 'النظارة',
    en: 'Goggles',
    forbiddenInProse: ['القوقلز', 'قوقلز'],
    rationale: 'عربية واضحة.',
  },
  {
    canonicalAr: 'اللحام',
    en: 'Soldering',
    forbiddenInProse: ['السولدرة', 'التلحيم'],
    rationale: '«اللحام» عربية فصيحة ومستعملة.',
  },
  {
    canonicalAr: 'الاهتزاز',
    en: 'Vibration',
    forbiddenInProse: ['الفيبريشن', 'الرجة'],
    rationale: 'مصطلح فيزيائي عربي قياسي.',
  },

  // ── Video ──────────────────────────────────────────────────────────────────
  // Only concepts with a genuinely established Arabic form appear here. VTX,
  // OSD, MSP, DVR, SmartAudio and the rest stay in Latin (see KEEP_IN_LATIN):
  // they are strings the reader must recognise inside real software.
  {
    canonicalAr: 'النطاق',
    en: 'Band',
    forbiddenInProse: ['الباند', 'باند'],
    rationale: '«النطاق» عربية قياسية ومستعملة في الهندسة الراديوية، والنقحرة تبقى مدعومة في البحث لأن المستخدمين يكتبونها.',
  },
  {
    canonicalAr: 'القناة',
    en: 'Channel',
    forbiddenInProse: ['الشانل', 'شانل'],
    rationale: '«القناة» راسخة تماماً في العربية ولا لبس فيها.',
  },
  {
    canonicalAr: 'زمن التأخير',
    en: 'Latency',
    forbiddenInProse: ['اللاتنسي', 'لاتنسي'],
    rationale: 'مفهوم يجب أن يُفهم لا أن يُنطق: «زمن التأخير» يشرح نفسه، والنقحرة لا تشرح شيئاً.',
  },
  {
    canonicalAr: 'الاستقطاب',
    en: 'Polarisation',
    forbiddenInProse: ['البولاريزيشن', 'بولاريزيشن'],
    rationale: 'مصطلح فيزيائي عربي قياسي، والدقة هنا تتعلق بالمدى مباشرةً.',
  },
];

/**
 * Arabic writing rules enforced over all authored content.
 *
 * Each rule is deliberately narrow: it targets a construction that is
 * unambiguously wrong or unambiguously worse, never a matter of taste. A style
 * checker that fires on debatable preferences gets disabled, and then it checks
 * nothing at all.
 */
export interface StyleRule {
  id: string;
  /** Human-readable description shown when the rule fires. */
  problemAr: string;
  fixAr: string;
  /** Applied to the RAW authored string (not normalized) unless stated. */
  pattern: RegExp;
  /** Substrings that make a match acceptable, to avoid known false positives. */
  allowIfContains?: string[];
}

export const styleRules: StyleRule[] = [
  {
    id: 'nafs-idafa',
    problemAr: 'تركيب «نفس + اسم معرّف» (نفس الشيء)',
    fixAr: 'اكتب «الشيء نفسه» — الأصل في العربية أن تأتي «نفس» توكيداً بعد الاسم لا قبله.',
    // «نفس» followed by a definite noun. Excludes «نفسه/نفسها/نفسي…» and the
    // literal noun «النفس» (the self), which are unrelated.
    pattern: /(^|[\s(«"،؛:])نفس\s+ال[ء-ي]/u,
  },
  {
    id: 'doubled-word',
    problemAr: 'كلمة مكررة مرتين متتاليتين',
    fixAr: 'احذف التكرار.',
    pattern: /(^|\s)([ء-ي]{2,})\s+\2(\s|[.،؛:!؟]|$)/u,
  },
  {
    id: 'space-before-punct',
    problemAr: 'مسافة قبل علامة ترقيم',
    fixAr: 'ألصق علامة الترقيم بالكلمة التي قبلها.',
    pattern: /\s+[،؛؟!]/u,
  },
  {
    id: 'missing-space-after-comma',
    problemAr: 'غياب مسافة بعد فاصلة عربية',
    fixAr: 'أضف مسافة بعد الفاصلة.',
    pattern: /،(?=[ء-يA-Za-z])/u,
  },
  {
    id: 'arabic-indic-digits',
    problemAr: 'أرقام هندية في المحتوى',
    fixAr: 'استخدم الأرقام الشائعة (من 0 إلى 9) لتتسق مع أرقام البرامج والمواصفات وأوراق البيانات.',
    // Built from code points rather than written literally: an earlier bulk
    // digit-normalisation pass rewrote the literal range inside this very
    // pattern, silently turning the rule into its own opposite. Constructing it
    // this way makes the rule immune to any future text-level sweep.
    pattern: new RegExp(`[${String.fromCharCode(0x0660)}-${String.fromCharCode(0x0669)}${String.fromCharCode(0x06F0)}-${String.fromCharCode(0x06F9)}]`, 'u'),
    // No exceptions: mixing digit systems inside one article is exactly the
    // inconsistency this rule exists to prevent.
  },
  {
    id: 'common-misspelling',
    problemAr: 'خطأ إملائي شائع',
    fixAr: 'صحّح الإملاء.',
    pattern: /(^|\s)(لاكن|هاذا|هاذه|إنشاء\sالله|مسؤل|شئ|إسم|إبن|لكي\sلا|إنتباه|إستخدام|إعتماد|إختبار|إصدار\sات)(\s|[.،؛:!؟]|$)/u,
  },
  {
    id: 'latin-glued-to-arabic',
    problemAr: 'كلمة عربية ملتصقة بمصطلح لاتيني بلا فاصل صحيح',
    fixAr: 'افصل بمسافة، أو استخدم أداة متصلة صحيحة مثل «الـ» أو واو العطف.',
    // Arabic proclitics attach to the following word BY RULE, including when
    // that word is Latin: «F4 وF7» and «بـTX» and «الـESC» are all correct
    // Arabic orthography, not typos. An earlier version of this rule flagged all
    // three and would have forced authors to write incorrect Arabic to satisfy
    // it. What is genuinely wrong is an ordinary Arabic word ending glued to a
    // Latin token («منESC»), or a Latin token glued to an Arabic word
    // («ESCفي») — neither has any orthographic justification.
    pattern: /[ء-ي](?<![وفبكلـ])[A-Za-z]|[A-Za-z][ء-ي]/u,
  },
  {
    id: 'double-space',
    problemAr: 'مسافتان متتاليتان',
    fixAr: 'أبقِ مسافة واحدة.',
    pattern: /[^\S\n]{2,}/u,
  },
];

/**
 * Latin tokens that must never trigger the "explain your terms" rule, because
 * they are product names, units, or file/protocol identifiers whose meaning is
 * carried entirely by the surrounding sentence.
 */
export const TERM_EXPLANATION_EXEMPT: string[] = [
  'FPV', 'RTF', 'BNF', 'PNP', 'RC', 'CW', 'CCW', 'V', 'A', 'W', 'mAh', 'KV', 'Hz', 'kHz',
  'mm', 'g', 'S', 'C', 'GHz', 'MHz', 'dBm', 'ms', 'us', 'RPM', 'X', 'H', 'TPU', 'PC', 'ABS',
];
