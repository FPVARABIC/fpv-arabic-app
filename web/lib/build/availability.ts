/**
 * Which build types the catalogue can actually finish.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `/build/wizard` offered all five drone types as equal choices. Two of them
 * could not be completed, and the reader only discovered it after investing
 * real work:
 *
 *   · «Cinewhoop» — no frame in the catalogue carries the `cinewhoop` tag, so
 *     `getAvailableSizeOptions` derives NO size for it. Step 2 rendered an
 *     empty container with «التالي» disabled forever and no message, under an
 *     intro promising «لا حجم يقود إلى طريق مسدود».
 *   · «سباقات» — the one racing frame declares a 20×20 stack pattern and every
 *     flight controller in the catalogue is 30.5, so the full-system engine
 *     raises a `stack-mount` blocker on EVERY valid combination. Ten steps and
 *     twelve part choices later, step 11 told the reader to «بدّل القطعة
 *     المعنيّة» — an instruction the catalogue makes impossible to follow.
 *
 * So the entry screen has to know, before the journey starts, whether a type
 * can be finished at all.
 *
 * WHY THIS IS A DECLARATION AND NOT A LIVE COMPUTATION
 * ---------------------------------------------------
 * Answering «is this type reachable?» honestly means searching part
 * combinations through the full verdict engine — thousands of runs for a
 * well-stocked type. That is a build-time question, not something to make a
 * phone do before it can paint five cards.
 *
 * So the answer is declared here and PROVEN by `scripts/testBuildReachability.ts`,
 * which derives the truth from the real catalogue and the real engine and fails
 * CI on any disagreement — in BOTH directions:
 *
 *   · a type declared available with no blocker-free path fails the build;
 *   · a type declared unavailable that has become reachable ALSO fails, with
 *     an instruction to flip it. That second direction is the one that matters
 *     over time: it is what makes adding a 30.5 racing frame turn the section
 *     back on instead of leaving «قريبًا» sitting on a type that works.
 *
 * WHAT THIS FILE IS NOT
 * ---------------------
 * It is not a feature flag and not an editorial decision. `available: false`
 * is a statement about the CATALOGUE, and the only way to change it is to make
 * the catalogue able to finish the build. Nothing here hides a type: an
 * unavailable type is still listed, still named, still described, and still
 * says exactly why it cannot start.
 */

/** One drone type's answer to «can this be built with what we stock?». */
export interface BuildTypeAvailability {
  available: boolean;
  /** Shown to the reader on the card. One plain sentence, no jargon. */
  reasonAr?: string;
  /**
   * The catalogue fact the reason rests on — the sentence a maintainer needs
   * in order to fix it. Asserted against live data by the reachability suite,
   * so it cannot drift into folklore.
   */
  evidenceAr?: string;
}

const UNAVAILABLE_LABEL_AR = 'قريبًا';

/**
 * Keyed by `droneTypes[].id`. Every type must appear — the reachability suite
 * asserts completeness so a newly-added type cannot ship unclassified.
 */
export const BUILD_TYPE_AVAILABILITY: Record<string, BuildTypeAvailability> = {
  freestyle: { available: true },
  cinematic: { available: true },
  'long-range': { available: true },

  cinewhoop: {
    available: false,
    reasonAr:
      'القطع المتوفرة حاليًا لا تكفي لبناء كامل من هذا النوع — لا يوجد إطار '
      + 'موسوم لـCinewhoop في الكتالوج، فلا حجم يمكن اشتقاقه ولا مسار يمكن بدؤه.',
    evidenceAr: 'لا إطار في الكتالوج يحمل الوسم cinewhoop، فـgetAvailableSizeOptions تُرجع صفر مقاسات.',
  },

  racing: {
    available: false,
    reasonAr:
      'القطع المتوفرة حاليًا لا تكفي لبناء كامل من هذا النوع — إطار السباق '
      + 'الوحيد لدينا بمقاس تثبيت 20×20، ولا يوجد متحكّم طيران بهذا المقاس في '
      + 'الكتالوج، فكل تركيبة ممكنة تصطدم بمانع في فحص التوافق.',
    evidenceAr: 'كل تركيبة صالحة لنوع racing تُنتج مانع stack-mount: الإطار 20x20 وكل الـFC عند 30.5.',
  },
};

export function buildTypeAvailability(droneTypeId: string): BuildTypeAvailability {
  // An unknown id is treated as unavailable rather than available: a type the
  // catalogue has never been checked against must not open a journey.
  return BUILD_TYPE_AVAILABILITY[droneTypeId] ?? {
    available: false,
    reasonAr: 'هذا النوع غير مُتحقَّق منه في الكتالوج بعد.',
  };
}

export function isBuildTypeAvailable(droneTypeId: string | undefined): boolean {
  return !!droneTypeId && buildTypeAvailability(droneTypeId).available;
}

/** The badge word an unavailable card carries. One place, so it cannot drift. */
export function unavailableLabelAr(): string {
  return UNAVAILABLE_LABEL_AR;
}
