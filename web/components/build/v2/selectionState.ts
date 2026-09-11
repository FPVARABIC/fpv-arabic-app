/**
 * WHAT A READER'S CHOICE SURVIVES, AND WHAT ERASES IT
 * ===================================================
 *
 * Phase 2E lets the reader close a `choice-required` category themselves. That
 * creates a question the journey did not have before: when they go back and
 * change an ANSWER, which of their choices are still about the same build?
 *
 * Getting it wrong fails in two opposite directions, and both are bad:
 *
 *   TOO EAGER   Clearing on every answer change throws away work the reader
 *               did. Phase 2D spent a whole round removing exactly this — an
 *               unrelated exit erasing a valid selection two categories away.
 *   TOO LAZY    Keeping a 5-inch frame after the reader switches to a 7-inch
 *               build leaves a choice they never made for the build they are
 *               now looking at. The engine would refuse it honestly, but the
 *               refusal would be about a decision nobody took.
 *
 * So the rule is written here, once, as plain functions over plain data — no
 * React, no component, no hook. A test can call them directly, which is the
 * point: «the reader's frame survives a budget change» should be a sentence a
 * test can evaluate, not something inferred from a rendered screen.
 *
 * THE CONTEXT IS WHAT THE ENGINE SEES — NOT WHAT THE READER CLICKED
 * ----------------------------------------------------------------
 * `SelectionContext` is derived from `toEngineInput`, so «did this change?»
 * asks about the value that actually constrains the build. Two answers that
 * reach the engine identically cannot invalidate anything, because nothing
 * about the build changed. Concretely: a reader who had not answered the radio
 * question and now says «لست متأكدًا» has changed their answer and changed
 * NOTHING about what can be proposed — `rcSystem` was absent and is still
 * absent — so a receiver they chose is exactly as valid as it was, and
 * clearing it would be erasing a valid selection for no reason at all.
 *
 * AND NOTE WHAT IS NOT IN IT: BUDGET
 * ----------------------------------
 * A budget answer can never invalidate a choice, because a choice outranks a
 * preference — that is the domain's rule, not this file's. Expressing it as a
 * FIELD THAT DOES NOT EXIST rather than as an `if` that does nothing means a
 * later edit cannot accidentally make budget invalidating: there is no budget
 * here to compare.
 */

/**
 * The reader's choices: category → catalogue part id.
 *
 * IDS, NOT PARTS — the same shape `RecommendationInput.selectedParts` takes,
 * for the same reason. A `BasePart` object held in React state is a second
 * copy of the catalogue that can drift from it, and it would let this layer
 * invent a part the shelf does not have.
 */
export type ReaderSelections = Readonly<Record<string, string>>;

/** Shared so «nothing chosen» is one value rather than a new `{}` per call. */
export const NO_SELECTIONS: ReaderSelections = Object.freeze({});

/**
 * WHICH CATEGORY AN ECOSYSTEM ANSWER CAN INVALIDATE A CHOICE IN.
 *
 * The engine gates `receivers` on the owned radio system and `videoUnits` on
 * the owned goggle system, and nothing else on either — `ecosystemConflict`
 * in `proposeBuild.ts` is where that is decided.
 *
 * This is a MIRROR of a domain fact, so it is only as good as its proof.
 * `scripts/testReaderSelection.ts` derives the same map from the engine's own
 * output — every category whose decision carries a reason tagged
 * `ownedRcSystem` or `ownedVideoSystem` — and fails if the two disagree. If a
 * third category ever starts depending on an ecosystem answer, that test goes
 * red rather than this constant going quietly stale.
 */
export const ECOSYSTEM_SELECTION_CATEGORY = {
  rc: 'receivers',
  video: 'videoUnits',
} as const;

/**
 * Everything about the reader's answers that can make a choice stale.
 *
 * Deliberately not `Answers`: a narrow record is what makes «budget is absent»
 * a checkable property of the type rather than a claim in a comment.
 */
export interface SelectionContext {
  droneTypeId?: string;
  sizeInch?: number;
  cellCount?: number;
  /** What reaches `owned.rcSystem` — «لست متأكدًا» arrives here as absence. */
  rcSystem?: string;
  /** What reaches `owned.videoSystem` — same. */
  videoSystem?: string;
}

/** Drop one category, without disturbing — or re-creating — the others. */
export function withoutCategory(
  selections: ReaderSelections, category: string,
): ReaderSelections {
  if (!(category in selections)) return selections;
  const next = { ...selections };
  delete next[category];
  return next;
}

/** Add or replace one category's choice. Immutable, and local to its key. */
export function withCategory(
  selections: ReaderSelections, category: string, partId: string,
): ReaderSelections {
  return { ...selections, [category]: partId };
}

/**
 * WHICH CHOICES ARE STILL ABOUT THIS BUILD.
 *
 * Three rules, in order of how much they invalidate:
 *
 *   THE BUILD ITSELF CHANGED — a different type, size or voltage is a
 *     different build, and NOTHING chosen for the old one carries over. Not
 *     «probably wrong»: a frame is chosen for a size, an ESC for a voltage,
 *     and a choice the reader made under one is not an answer about the other.
 *
 *   AN ECOSYSTEM ANSWER CHANGED — that narrows exactly one shelf, so it clears
 *     exactly one choice. A reader who names their goggles has said nothing
 *     about the frame they picked, and taking it away would be the eager
 *     failure above.
 *
 *   ANYTHING ELSE — nothing is cleared. Budget cannot reach this function at
 *     all, and an answer that reaches the engine unchanged is not a change.
 *
 * Returns the SAME object when nothing is invalidated, so a no-op answer
 * cannot make `answers` a new identity and re-run the engine for nothing.
 */
export function selectionsSurviving(
  prev: SelectionContext, next: SelectionContext, selections: ReaderSelections,
): ReaderSelections {
  if (Object.keys(selections).length === 0) return selections;

  if (prev.droneTypeId !== next.droneTypeId
    || prev.sizeInch !== next.sizeInch
    || prev.cellCount !== next.cellCount) {
    return NO_SELECTIONS;
  }

  let out = selections;
  if (prev.rcSystem !== next.rcSystem) {
    out = withoutCategory(out, ECOSYSTEM_SELECTION_CATEGORY.rc);
  }
  if (prev.videoSystem !== next.videoSystem) {
    out = withoutCategory(out, ECOSYSTEM_SELECTION_CATEGORY.video);
  }
  return out;
}
