/**
 * The two hardware-killing facts the build path never said, and the words the
 * safety gates never explained.
 *
 * WHY THESE ARE NOT NEW STEPS
 * ---------------------------
 * The multi-expert audit found four safety items missing from `/build`. Three
 * of them turned out not to be missing from the PLATFORM at all — they are
 * taught, reviewed and assessed inside the lessons course, and the build
 * section simply never linked to it. So the fix is not new safety copy (which
 * would fork the reviewed text and invent claims); it is a short pointer at the
 * exact moment the reader is holding the part, and a link to the lesson that
 * already teaches it.
 *
 * Two land here in Phase 0, at the places the current V1 already presents the
 * work:
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
 * means and how to satisfy it. None of them offers a way to tick an item the
 * reader has not actually done — in particular the Smoke Stopper note says
 * what the tool is FOR, and does not offer «no protection» as a way to pass.
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
  /** One sentence: what it is, and what result counts as passing. */
  explanationAr: string;
}

/**
 * Terminology clarifications for the safety gates.
 *
 * Scope is deliberately narrow — Phase 0 fixes only the terms where NOT
 * understanding the word changes what the reader physically does. The full
 * vocabulary system is a later phase and is not started here.
 */
export const GATE_TERM_NOTES: readonly GateTermNote[] = [
  {
    token: 'continuity',
    explanationAr:
      'فحص الاتصال (continuity): ضع الملتيميتر على وضع الصفير، ولامس طرفَي '
      + 'VBAT وGND. يجب ألا يصفر — الصفير يعني تماسًا يجب إصلاحه قبل أي بطارية.',
  },
  {
    token: 'solder bridge',
    explanationAr:
      'جسر لحام (solder bridge): قطرة قصدير تصل نقطتين متجاورتين لم يكن '
      + 'مقصودًا وصلهما. افحص اللوحة بعين مقرَّبة وإضاءة جيدة.',
  },
  {
    token: 'TX/RX',
    explanationAr:
      'التوصيل متقاطع: طرف الإرسال TX في قطعة يذهب إلى طرف الاستقبال RX في '
      + 'الأخرى، والعكس — لا TX إلى TX.',
  },
  {
    token: 'Smoke Stopper',
    explanationAr:
      'Smoke Stopper: وصلة تُحدّ التيار عند أول توصيل، فيظهر الخطأ كضوء خافت '
      + 'بدل أن يحرق القطع. هي حماية أول توصيل، ولا يغني عنها الفحص وحده.',
  },
  {
    token: 'Motor order',
    explanationAr:
      'ترتيب المحركات (Motor order): أي محرك يستجيب لأي رقم في برنامج '
      + 'الإعداد — يُختبر محركًا محركًا والمراوح منزوعة.',
  },
  {
    token: 'Motor direction',
    explanationAr:
      'اتجاه الدوران (Motor direction): كل محرك يدور في الاتجاه الذي يحدده '
      + 'مخطط البرنامج — يُصحَّح من البرنامج لا بإعادة اللحام.',
  },
];

/** The clarification for one shared checklist item, if it carries a known term. */
export function gateTermNoteFor(itemText: string): GateTermNote | undefined {
  const haystack = itemText.toLowerCase();
  return GATE_TERM_NOTES.find(n => haystack.includes(n.token.toLowerCase()));
}
