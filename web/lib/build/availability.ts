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

/**
 * WHY a type cannot be finished, in a form a test can check.
 *
 * The prose reason is written for a reader and cannot be verified mechanically
 * — so on its own it rots. The first version of this file proved only that
 * SOME reason string existed, while its own comment claimed the evidence
 * «cannot drift into folklore». It could, and in the way that matters most:
 *
 *   Racing fails today on `stack-mount`. Add a 20×20 flight controller and
 *   that blocker is gone — but if some OTHER blocker still stands, the type
 *   remains unreachable, the availability check still passes, and the card
 *   goes on telling readers there is no 20×20 flight controller. Green CI,
 *   false sentence on screen.
 *
 * So the reason carries a machine-checkable identity beside the prose, and
 * `scripts/testBuildReachability.ts` verifies that IDENTITY against derived
 * truth: a `no-size` claim must correspond to a type with no size options, and
 * a `blocker` claim must name a blocker the exhaustive search actually raises.
 * When the catalogue moves and the stated reason stops being the real one, CI
 * fails even though the type is still unavailable — and somebody has to look
 * at the sentence on the card.
 *
 * Deliberately two small shapes, not a rule engine. It answers one question:
 * «is the published reason still the true reason?»
 */
export type UnavailableReasonCode =
  /** No size can be derived, so the path cannot even start. */
  | { kind: 'no-size' }
  /** Every complete combination raises this blocker id from the verdict engine. */
  | { kind: 'blocker'; blockerId: string };

/** One drone type's answer to «can this be built with what we stock?». */
export interface BuildTypeAvailability {
  available: boolean;
  /** Shown to the reader on the card. One plain sentence, no jargon. */
  reasonAr?: string;
  /**
   * The checkable identity of that reason. Required whenever `available` is
   * false — the reachability suite asserts both its presence and its truth.
   */
  reasonCode?: UnavailableReasonCode;
  /**
   * The catalogue fact the reason rests on, for a maintainer reading the file.
   * Human prose; `reasonCode` is what the suite actually verifies.
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
    reasonCode: { kind: 'no-size' },
    reasonAr:
      'القطع المتوفرة حاليًا لا تكفي لبناء كامل من هذا النوع — لا يوجد إطار '
      + 'موسوم لـCinewhoop في الكتالوج، فلا حجم يمكن اشتقاقه ولا مسار يمكن بدؤه.',
    evidenceAr: 'لا إطار في الكتالوج يحمل الوسم cinewhoop، فـgetAvailableSizeOptions تُرجع صفر مقاسات.',
  },

  racing: {
    available: false,
    reasonCode: { kind: 'blocker', blockerId: 'stack-mount' },
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
