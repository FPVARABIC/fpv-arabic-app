/**
 * The two hardware-killing facts the build path never said, and the words the
 * safety gates never explained.
 *
 * WHY THESE ARE NOT NEW STEPS — AND WHICH PARTS ARE NEW COPY
 * ----------------------------------------------------------
 * This file holds two kinds of text, and they carry different weight.
 *
 * The two HAZARD NOTES are sourced. The multi-expert audit found four safety
 * items missing from `/build`, and three turned out not to be missing from the
 * PLATFORM at all — they are taught, reviewed and assessed inside the lessons
 * course, and the build section simply never linked to it. So those are a short
 * pointer at the moment the reader is holding the part, plus a link to the
 * lesson that already teaches it. No new hazard claim is authored here.
 *
 * The GATE TERM NOTES are NOT sourced that way. They are new explanatory copy,
 * written locally to define a term the shared checklist leaves untranslated.
 * That is a real distinction and the earlier report blurred it by claiming
 * «no new safety copy was authored»: the hazard facts were sourced, the
 * terminology clarifications were written. Because they ARE new copy, the
 * authoring rules on `GATE_TERM_NOTES` below are strict, and three of the six
 * had to be corrected in review for exactly the failure those rules describe.
 *
 * Two hazard notes land here in Phase 0, at the places the current V1 already
 * presents the work:
 *
 *   · MOTOR SCREW LENGTH — presented when the assembly guide reaches «تركيب
 *     المحركات». Source: lesson 12 «تركيب المحركات», which teaches screw
 *     length against the arm thickness and carries the worked example of a
 *     long screw reaching the windings.
 *   · VTX ANTENNA BEFORE POWER — presented when the assembly guide reaches
 *     «تركيب نظام الفيديو VTX», and again on the pre-battery gate, which is
 *     the last screen before any current flows. Source: lesson 16 «تركيب نظام
 *     الفيديو», whose own words are that a VTX must never run without its
 *     antenna connected because transmitting without one can damage the
 *     internal transmit circuit.
 *
 * The other two — LiPo handling and the props-removed → props-installed
 * transition — need a screen of their own and belong to the V2 setup phase.
 * Nothing here weakens or pre-empts them.
 *
 * WHY THE GATE GLOSSARY MATCHES ON TERMS AND NOT ON ITEM TEXT
 * ----------------------------------------------------------
 * The pre-battery and pre-flight gates render `checklistsData` from the shared
 * core VERBATIM, and that list is also the phone's checklist screen, the
 * phone's progress denominator, the web workspace's checklist and a search
 * index. It is not this file's to edit. What the audit found was not wrong
 * items but unexplained ones: «فحصت continuity بين VBAT و GND» asks a beginner
 * to confirm a measurement whose name is untranslated and whose expected result
 * is unstated, on a screen where misunderstanding is a safety matter.
 *
 * So the shared item text is untouched and a clarification is attached BESIDE
 * it, keyed by the technical token that appears in the item. Keying on a token
 * rather than on exact text or on an index means reordering or rewording the
 * shared list cannot silently detach a clarification from its item — and
 * `scripts/testBuildPhase0.ts` asserts every declared term still matches at
 * least one live gate item, so a term that disappears from the shared data
 * fails the build instead of rotting here.
 *
 * NOTHING HERE RELAXES A GATE. Every clarification explains what the item
 * means. None of them offers a way to tick an item the reader has not actually
 * done — in particular the Smoke Stopper note says what the tool is FOR, and
 * does not offer «no protection» as a way to pass.
 */

/** A short safety fact shown at the moment the work is presented. */
export interface SafetyNote {
  /** The heading — states the hazard, not the topic. */
  titleAr: string;
  bodyAr: string;
  /** The reviewed lesson this is drawn from. */
  lessonId: string;
  lessonTitleAr: string;
}

/**
 * Keyed by `roadmapData[].id` — the shared practical roadmap the assembly step
 * renders. A stage with no entry shows no note.
 */
export const ASSEMBLY_STAGE_SAFETY: Record<string, SafetyNote> = {
  'build-motors': {
    titleAr: 'طول مسمار تثبيت المحرك — يُقاس قبل أن يُشدّ',
    bodyAr:
      'داخل كل محرك ملفات نحاسية قريبة من قاعدته. مسمار أطول من سمك ذراع '
      + 'الإطار يصل إليها ويتلف المحرك كهربائيًا عند أول دوران — وليست مسألة '
      + 'شكلية. الطول يتبع سمك ذراع إطارك أنت، ولا يوجد طول واحد يناسب كل '
      + 'الإطارات والمحركات.',
    lessonId: 'lesson-motor-install',
    lessonTitleAr: 'تركيب المحركات',
  },
  'build-vtx': {
    titleAr: 'لا تشغّل وحدة الفيديو بلا هوائي',
    bodyAr:
      'قبل تشغيل VTX يجب أن يكون هوائيه المخصص متصلًا — البث دون هوائي متصل '
      + 'قد يُتلف دائرة الإرسال الداخلية. وتحقّق كذلك من أن مصدر الطاقة يطابق '
      + 'مدى الجهد الموثق للوحدة.',
    lessonId: 'lesson-video-system',
    lessonTitleAr: 'تركيب نظام الفيديو',
  },
};

/**
 * The same antenna fact, repeated on the gate that stands immediately before
 * any current flows. Repetition is deliberate: the install screen and the
 * power screen can be days apart, and this is the one that is irreversible.
 */
export const PRE_BATTERY_SAFETY: SafetyNote = ASSEMBLY_STAGE_SAFETY['build-vtx'];

/** A term inside a shared checklist item, and what it means. */
export interface GateTermNote {
  /** Matched case-insensitively against the shared item's text. */
  token: string;
  /** What the term means — see the authoring rules below. */
  explanationAr: string;
}

/**
 * HOW THESE ARE WRITTEN, AND WHY THE RULES ARE STRICT
 * ---------------------------------------------------
 * Unlike the two hazard notes above, these are NOT drawn from a reviewed
 * lesson. They are new copy written here to define a term the shared checklist
 * uses untranslated. That makes them the most dangerous text in this file, so
 * three rules bind them:
 *
 *   1. DEFINE, DO NOT DIRECT. The shared checklist item is the procedure and
 *      it is already reviewed. A note's job is to make that item's words
 *      understandable, not to add a second set of instructions beside it.
 *   2. NO ABSOLUTES ABOUT PHYSICAL BEHAVIOUR. The first draft of the
 *      continuity note said «يجب ألا يصفر — الصفير يعني تماسًا». That is
 *      false as stated: a meter can respond briefly while input capacitors
 *      charge, and a beginner taught «any beep = short» will either chase a
 *      fault that is not there or, worse, learn to distrust the check.
 *   3. NO DEVICE-SPECIFIC CLAIMS. The first Smoke Stopper note described the
 *      fault indication as a dim light. Indication depends entirely on the
 *      device, and this screen does not know which one the reader owns.
 *
 * Where the reviewed material does not support more precision, these stay
 * vague rather than inventing it: no resistance thresholds, no meter-specific
 * readings, no lamp behaviour. Short and correct beats detailed and wrong.
 */

/**
 * Terminology clarifications for the safety gates.
 *
 * Scope is deliberately narrow — Phase 0 fixes only the terms where NOT
 * understanding the word changes what the reader physically does. The full
 * vocabulary system is a later phase and is not started here.
 */
export const GATE_TERM_NOTES: readonly GateTermNote[] = [
  {
    // The concerning condition is a PERSISTENT one. A brief response while
    // input capacitors charge is expected behaviour, not a fault — which is
    // exactly what the first draft of this note got wrong.
    token: 'continuity',
    explanationAr:
      'فحص الاتصال (continuity): قياس بالملتيميتر بين VBAT وGND بحثًا عن تماس '
      + 'دائم. قد تظهر استجابة لحظية لأن المكثفات تشحن، وهذا متوقّع؛ ما يستدعي '
      + 'التحقق هو استجابة مستمرة أو مقاومة منخفضة جدًا لا تزول. لا توصّل '
      + 'البطارية قبل حلّ أي حالة مريبة.',
  },
  {
    // Definition only. The checklist item already says to confirm none exists.
    token: 'solder bridge',
    explanationAr:
      'جسر لحام (solder bridge): قطرة قصدير تصل نقطتين متجاورتين لم يكن '
      + 'مقصودًا وصلهما — يُبحث عنه بالفحص البصري للوحة.',
  },
  {
    // The crossing convention itself, which is the platform's own documented
    // rule (lesson 9, «قاعدة TX/RX»). A definition, not an added procedure.
    token: 'TX/RX',
    explanationAr:
      'التوصيل متقاطع: طرف الإرسال TX في قطعة يقابل طرف الاستقبال RX في '
      + 'الأخرى، والعكس.',
  },
  {
    // What the device is FOR. How it signals a fault is the device's own
    // business — lamp, LED or otherwise — and this screen cannot know which
    // one is in the reader's hand.
    token: 'Smoke Stopper',
    explanationAr:
      'Smoke Stopper: وصلة تُحدّ التيار عند أول توصيل، فتقلّل الضرر إن وُجد '
      + 'خطأ. طريقة التنبيه تختلف بين الأجهزة — اتبع تعليمات جهازك. ولا يغني '
      + 'عن فحص القطبية والتماس.',
  },
  {
    // The «props removed» condition is the shared checklist's own, not an
    // addition: it is the motor-test gate's first item.
    token: 'Motor order',
    explanationAr:
      'ترتيب المحركات (Motor order): أي محرك يستجيب لأي رقم في برنامج '
      + 'الإعداد — يُختبر محركًا محركًا والمراوح منزوعة.',
  },
  {
    // Scoped: recommend the software route where the ESC setup supports it,
    // without claiming the physical route is impossible.
    token: 'Motor direction',
    explanationAr:
      'اتجاه الدوران (Motor direction): كل محرك يدور في الاتجاه الذي يحدده '
      + 'مخطط البرنامج. وحين يدعم إعداد الـESC ذلك، يمكن تصحيح الاتجاه من '
      + 'البرنامج.',
  },
];

/** The clarification for one shared checklist item, if it carries a known term. */
export function gateTermNoteFor(itemText: string): GateTermNote | undefined {
  const haystack = itemText.toLowerCase();
  return GATE_TERM_NOTES.find(n => haystack.includes(n.token.toLowerCase()));
}
