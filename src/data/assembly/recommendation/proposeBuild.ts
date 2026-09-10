/**
 * THE RECOMMENDATION FOUNDATION
 * =============================
 *
 * `/build` currently asks a beginner to make twelve technical choices and only
 * then tells them whether the result flies. This module is the evidence layer
 * under a future flow that asks fewer: it decides what the catalogue can
 * honestly settle on the reader's behalf, and — just as importantly — where it
 * must stop and ask.
 *
 * IT IS NOT A SECOND COMPATIBILITY ENGINE
 * ---------------------------------------
 * Every hard compatibility judgement here comes from somewhere that already
 * owns it: the four shared rules from Phase 1 (`compatibility/rules.ts`), which
 * the part card and the final report both go through, and `computeFindings`,
 * which decides what a blocker IS. Nothing is re-derived, no tolerance is
 * re-declared, no validator is called twice, and `frameMatchesSize` is reached
 * only through `frameSizeRule`. `scripts/testCompatCompleteness.ts` fails the
 * build if that changes.
 *
 * FEASIBILITY COMES BEFORE PREFERENCE — THE ORDER IS THE ARCHITECTURE
 * ------------------------------------------------------------------
 * The first version of this engine ranked each category, locked the winner,
 * and only then went looking for a complete build. That is backwards, and it
 * fails in a specific, silent way:
 *
 *   candidate A ranks highest on documented evidence, but EVERY complete build
 *   containing A raises a blocker;
 *   candidate B ranks lower, and a clean complete build with B exists.
 *
 * Rank-then-prove locks A, fails the search, and reports the whole type
 * unavailable — having never considered B. The reader is told their build is
 * impossible because the engine preferred one frame.
 *
 * So viability is established FIRST. A candidate is only eligible for ranking
 * if it participates in at least one complete, zero-blocker assignment
 * consistent with the reader's intent and locks. Globally dead candidates are
 * removed before any preference is applied; ranking then chooses among parts
 * that are all known to work.
 *
 * PREFERENCE AND OWNERSHIP ARE DIFFERENT THINGS
 * ---------------------------------------------
 * `budgetTier` ranks. Ecosystem ownership FILTERS. A DJI goggle owner cannot
 * use a Walksnail air unit, and a cheaper incompatible unit must never outrank
 * a compatible one — which is what happens if ownership is scored as «+1
 * preference» alongside price, as it briefly was.
 *
 * AND A READER'S CHOICE IS A THIRD THING AGAIN
 * --------------------------------------------
 * `selectedParts` says «I want this part in this build». It is not ownership —
 * nobody is claiming the hardware is on their desk — and it is not a
 * recommendation, because the system did not weigh it against anything. What
 * it IS, is a hard lock for this proposal: budget is a preference, and a
 * preference does not outrank a choice.
 *
 * A selection earns that lock rather than being granted it. It must exist in
 * the category it was filed under, be eligible for this type and voltage, pass
 * the shared rules against everything else fixed, respect an owned ecosystem,
 * and appear in at least one complete zero-blocker build ALONGSIDE every other
 * lock. Individually fine and jointly impossible is a real outcome, and it is
 * reported as one — with neither identity replaced.
 */

import type {
  BasePart, Frame, Motor, Propeller, Esc, Battery, Receiver, VideoUnit, FlightController,
} from '../types';
import type { ProjectSnapshot } from '../../project/types';
import { computeFindings } from '../../project/verdicts';
import { droneTypes } from '../droneTypes';
import { buildStages } from '../buildStages';
import { batteryVoltageOptions } from '../batteryVoltageOptions';
import { getAvailableSizeOptions } from '../frameSizeMatch';
import { PART_CATEGORY_MAP } from '../../project/store';
import {
  frameSizeRule, frameMotorClassRule, propClearanceRule, designVoltageRule,
} from '../compatibility/rules';
import { eligibleCandidates, REQUIRED_BUILD_CATEGORIES } from './eligibility';
import type {
  CategoryDecision, CompatibilityEvidence, DecisionReason, ProposedBuild,
  RecommendationInput, RequiredInput, SelectionIssue,
} from './types';

const TIER_AR: Record<string, string> = { budget: 'اقتصادي', mid: 'متوازن', premium: 'Premium' };

/**
 * Assemble the snapshot the verdict engine reads.
 *
 * Field-for-field the same shape `snapshotFromContext` builds on the web and
 * `readProjectSnapshot` reads on the phone — this constructs the input, and
 * the shared core still owns every judgement made on it.
 */
export function snapshotFromParts(
  parts: Readonly<Record<string, BasePart>>,
  opts: { droneTypeId: string; sizeInch?: number; cellCount?: number },
): ProjectSnapshot {
  return {
    exists: true,
    droneTypeId: opts.droneTypeId,
    droneTypeName: droneTypes.find(t => t.id === opts.droneTypeId)?.primaryName,
    sizeInch: opts.sizeInch,
    cellCount: opts.cellCount,
    // The report step — the stage at which a build is judged whole.
    stageIndex: buildStages.length - 1,
    totalStages: buildStages.length,
    frame: parts.frames as Frame | undefined,
    motor: parts.motors as Motor | undefined,
    esc: parts.escs as Esc | undefined,
    flightController: parts.flightControllers as FlightController | undefined,
    battery: parts.batteries as Battery | undefined,
    propeller: parts.propellers as Propeller | undefined,
    receiver: parts.receivers as Receiver | undefined,
    videoUnit: parts.videoUnits as VideoUnit | undefined,
    gps: undefined,
    parts: { ...parts },
  };
}

/**
 * THE RADIO SYSTEM A RECEIVER ACTUALLY BELONGS TO.
 *
 * `specs.protocol` carries it as a clean typed value — «ExpressLRS» or
 * «Crossfire». `protocolOrSystem` carries a DISPLAY string, and every one of
 * them ends in «/ CRSF»:
 *
 *   «ELRS 2.4GHz / CRSF»            «Crossfire / CRSF»
 *   «ELRS 2.4GHz Diversity / CRSF»  «Crossfire Diversity / CRSF»
 *
 * CRSF is the serial protocol between the receiver and the flight controller.
 * BOTH ecosystems speak it, so matching a reader's answer against these strings
 * by containment made «CRSF» match everything and made the two ecosystems
 * indistinguishable — the exact confusion the audit flagged in the
 * questionnaire, reproduced in code.
 *
 * Diversity is two antennas. It is a feature of a product, not a different
 * language, and it must never read as a mismatch.
 */
export function rcSystemOf(part: BasePart): string {
  return (part as Receiver).specs.protocol;
}

/** The canonical radio systems the catalogue actually stocks. */
export function rcSystemsInCatalogue(): string[] {
  return [...new Set((PART_CATEGORY_MAP.receivers ?? []).map(rcSystemOf))];
}

/** The goggle ecosystem a video unit belongs to — already a clean value. */
export function videoSystemOf(part: BasePart): string | undefined {
  return part.protocolOrSystem;
}

/**
 * The hard compatibility filter, applied against what is already fixed.
 *
 * Only the four rules Phase 1 put below both surfaces. Where a rule returns
 * `unknown` the candidate STAYS in the pool — «we cannot confirm» is not a
 * refusal, and dropping it here would silently narrow the reader's options on
 * missing data rather than telling them the data is missing.
 */
function passesSharedRules(
  category: string,
  part: BasePart,
  fixed: Readonly<Record<string, BasePart>>,
  opts: { sizeInch: number; cellCount: number },
): boolean {
  const frame = fixed.frames as Frame | undefined;
  const violated = (o: { status: string } | null) => o?.status === 'violated';

  if (category === 'frames') return !violated(frameSizeRule(part as Frame, opts.sizeInch));
  if (category === 'motors') return !violated(frameMotorClassRule(frame, part as Motor));
  if (category === 'propellers') return !violated(propClearanceRule(frame, part as Propeller));
  if (category === 'batteries') return !violated(designVoltageRule(part as Battery, opts.cellCount));
  return true;
}

/** The shared rules that ACTUALLY applied to this part, and what they said. */
function compatibilityEvidenceFor(
  category: string,
  part: BasePart,
  fixed: Readonly<Record<string, BasePart>>,
  opts: { sizeInch: number; cellCount: number },
): CompatibilityEvidence[] {
  const frame = (category === 'frames' ? part : fixed.frames) as Frame | undefined;
  const outcome =
    category === 'frames' ? frameSizeRule(part as Frame, opts.sizeInch)
    : category === 'motors' ? frameMotorClassRule(frame, part as Motor)
    : category === 'propellers' ? propClearanceRule(frame, part as Propeller)
    : category === 'batteries' ? designVoltageRule(part as Battery, opts.cellCount)
    : null;
  // A rule that did not apply is OMITTED, never recorded as a pass. There is
  // no such thing as passing a test that was not run.
  return outcome ? [{ ruleId: outcome.ruleId, status: outcome.status }] : [];
}

/**
 * DOES THIS PART BELONG TO THE ECOSYSTEM THE READER ALREADY OWNS?
 *
 * One owner for the question, because it has to be asked in two places that
 * are easy to think of as one. Candidates are filtered by it — and so are the
 * reader's OWN parts, which is the half that was missing: an owned part goes
 * straight into `locks`, and a locked category is never walked by the pool
 * search, so a Crossfire receiver sat happily under «I own an ExpressLRS
 * radio» and the build was declared sound. `computeFindings` cannot catch it
 * either — it judges parts against parts, and knows nothing about what is
 * already on the reader's desk.
 *
 * Returns null when there is no constraint to apply.
 */
function ecosystemConflict(
  category: string,
  part: BasePart,
  owned: RecommendationInput['owned'],
): { inputKey: 'ownedRcSystem' | 'ownedVideoSystem'; ar: string } | null {
  if (category === 'receivers' && owned?.rcSystem) {
    if (rcSystemOf(part) === owned.rcSystem) return null;
    return {
      inputKey: 'ownedRcSystem',
      ar: `هذا المستقبل يعمل بـ${rcSystemOf(part)} بينما جهاز التحكم الذي تملكه يبثّ ${owned.rcSystem} — لا يتفاهمان.`,
    };
  }
  if (category === 'videoUnits' && owned?.videoSystem) {
    if (videoSystemOf(part) === owned.videoSystem) return null;
    return {
      inputKey: 'ownedVideoSystem',
      ar: `وحدة الفيديو هذه من منظومة ${videoSystemOf(part) ?? 'غير معروفة'} بينما نظارتك من ${owned.videoSystem} — المنظومتان لا تتخاطبان.`,
    };
  }
  return null;
}

/**
 * The parts still worth considering for one category, given what is fixed.
 *
 * Ecosystem ownership filters here rather than ranking: it is hardware the
 * reader already has, not a leaning.
 */
function poolFor(
  category: string,
  fixed: Readonly<Record<string, BasePart>>,
  input: RecommendationInput,
  opts: { sizeInch: number; cellCount: number },
): readonly BasePart[] {
  const all = PART_CATEGORY_MAP[category] ?? [];
  return eligibleCandidates(category, all, {
    droneTypeId: input.droneTypeId, cellCount: opts.cellCount, sizeInch: opts.sizeInch,
  })
    .filter(p => passesSharedRules(category, p, fixed, opts))
    .filter(p => ecosystemConflict(category, p, input.owned) === null);
}

/**
 * Why an automatic choice was narrowed by hardware the reader already owns.
 *
 * The filter above is silent by construction, and a decision that cannot say
 * «this receiver is here because your radio speaks ExpressLRS» is a decision a
 * future screen cannot explain. This is a CONSTRAINT reason, never a ranking
 * one: the reader's radio did not make this part better, it made the others
 * impossible.
 */
function ecosystemReasons(
  category: string,
  owned: RecommendationInput['owned'],
): DecisionReason[] {
  if (category === 'receivers' && owned?.rcSystem) {
    return [{
      kind: 'filter', evidence: 'documented', inputKey: 'ownedRcSystem',
      ar: `يعمل بـ${owned.rcSystem} — وهو بروتوكول جهاز التحكم الذي تملكه.`,
    }];
  }
  if (category === 'videoUnits' && owned?.videoSystem) {
    return [{
      kind: 'filter', evidence: 'documented', inputKey: 'ownedVideoSystem',
      ar: `من منظومة ${owned.videoSystem} — وهي منظومة النظارة التي تملكها.`,
    }];
  }
  return [];
}

/**
 * Is there a COMPLETE, zero-blocker assignment that keeps everything in
 * `fixed` exactly where it is?
 *
 * Returns the first one found, or null. This is what «globally viable» means
 * for a candidate: fix it, and ask whether the rest of the build can still be
 * finished cleanly.
 */
function findCleanCompletion(
  fixed: Readonly<Record<string, BasePart>>,
  input: RecommendationInput,
  opts: { sizeInch: number; cellCount: number },
  seenBlockers?: Set<string>,
): Record<string, string> | null {
  const cats = REQUIRED_BUILD_CATEGORIES.filter(c => !fixed[c]);
  const chosen: Record<string, BasePart> = { ...fixed };

  const walk = (depth: number): Record<string, string> | null => {
    if (depth === cats.length) {
      const blockers = computeFindings(
        snapshotFromParts(chosen, { droneTypeId: input.droneTypeId, ...opts }),
      ).filter(f => f.severity === 'blocker');
      if (blockers.length === 0) {
        return Object.fromEntries(
          REQUIRED_BUILD_CATEGORIES.map(c => [c, chosen[c].id]),
        );
      }
      blockers.forEach(b => seenBlockers?.add(b.id));
      return null;
    }
    const cat = cats[depth];
    for (const part of poolFor(cat, chosen, input, opts)) {
      chosen[cat] = part;
      const found = walk(depth + 1);
      if (found) return found;
      delete chosen[cat];
    }
    return null;
  };

  return walk(0);
}

/**
 * Rank among candidates ALREADY KNOWN TO BE VIABLE.
 *
 * `budgetTier` is the only ranking input. Ecosystem ownership has already
 * filtered the pool by the time this runs, and nothing else in the catalogue
 * states that one part is better than another — not weight, not amps, not
 * price, not KV, not UART count, not recency.
 */
function rankViable(
  pool: readonly BasePart[],
  input: RecommendationInput,
): { top: readonly BasePart[]; reasons: DecisionReason[] } {
  if (!input.budgetTier) return { top: pool, reasons: [] };
  const inTier = pool.filter(p => p.tier === input.budgetTier);
  if (inTier.length === 0 || inTier.length === pool.length) return { top: pool, reasons: [] };
  return {
    top: inTier,
    reasons: [{
      kind: 'ranking', evidence: 'catalogue-tag', inputKey: 'budgetTier',
      ar: `ضمن فئة الميزانية التي اخترتها (${TIER_AR[input.budgetTier]}) حسب تصنيف الكتالوج.`,
    }],
  };
}

/**
 * WHAT THE SYSTEM CAN HONESTLY PROPOSE for one reader's stated intent.
 *
 * Deterministic: identical catalogue plus identical input gives an identical
 * result, every time. Nothing is random, and no tie is broken by insertion
 * order — a tie the data cannot settle comes back as `choice-required`, and a
 * prerequisite the data cannot settle comes back as a `requiredInput`.
 */
export function proposeBuild(input: RecommendationInput): ProposedBuild {
  const { droneTypeId } = input;
  const droneType = droneTypes.find(t => t.id === droneTypeId);

  const base = {
    droneTypeId,
    sizeInch: input.sizeInch,
    cellCount: input.cellCount,
    requiredInputs: [] as RequiredInput[],
    decisions: [] as CategoryDecision[],
    parts: {} as Record<string, BasePart>,
    unresolved: [...REQUIRED_BUILD_CATEGORIES] as string[],
    manualChecks: [] as string[],
    complete: false,
    provenPath: null,
    blockerFindingIds: [] as string[],
    selectionIssues: [] as SelectionIssue[],
  };

  /*
   * Nothing can be built. Every category says so — but a part the READER owns
   * keeps its identity even here, because when a build is impossible the one
   * thing they most need to know is which of their own parts is involved.
   * Withdrawing it would erase exactly that.
   */
  const deadEnd = (ar: string): ProposedBuild => {
    const owned = input.owned?.parts ?? {};
    return {
      ...base,
      parts: { ...owned },
      decisions: REQUIRED_BUILD_CATEGORIES.map(category => ({
        category,
        status: 'unavailable' as const,
        selectionSource: owned[category] ? ('user-owned' as const) : ('none' as const),
        partId: owned[category]?.id,
        candidateIds: owned[category] ? [owned[category].id] : [],
        compatibility: [],
        reasons: [{ kind: 'no-candidate' as const, evidence: 'documented' as const, ar }],
      })),
    };
  };

  /*
   * ── 0. THE READER'S SELECTIONS, VALIDATED AS INPUT BEFORE ANYTHING ELSE ──
   *
   * This runs before the catalogue is even asked for sizes, because a
   * malformed selection is a fact about the INPUT, not about the build. If a
   * type with no frames returned its dead end first, a bad selection would be
   * silently swallowed by an unrelated failure — and «silently» is the whole
   * thing this channel exists to prevent.
   *
   * Only shape is decided here: does this shelf exist, is it a shelf a build
   * must fill, and does this id resolve ON that shelf. Whether the part is any
   * GOOD is a question about the build, and it is asked later, where a category
   * decision can carry the answer.
   */
  const selectedInput = input.selectedParts ?? {};
  const selectionIssues: SelectionIssue[] = [];
  const selectedParts: Record<string, BasePart> = {};

  /*
   * A CANONICAL ORDER, so that `{frames, motors}` and `{motors, frames}` are
   * the same input. `Object.entries` follows insertion order, and an output
   * array built from it would otherwise carry the reader's typing order into
   * the engine's answer.
   */
  const selectedCategories = Object.keys(selectedInput).sort((a, b) => {
    const ia = (REQUIRED_BUILD_CATEGORIES as readonly string[]).indexOf(a);
    const ib = (REQUIRED_BUILD_CATEGORIES as readonly string[]).indexOf(b);
    if (ia !== ib) return (ia < 0 ? Infinity : ia) - (ib < 0 ? Infinity : ib);
    return a < b ? -1 : a > b ? 1 : 0;
  });

  for (const category of selectedCategories) {
    const id = selectedInput[category];
    const issue = (kind: SelectionIssue['kind'], ar: string) =>
      selectionIssues.push({ category, partId: id, kind, ar });

    if (!(category in PART_CATEGORY_MAP)) {
      issue('unknown-category', 'اخترت قطعة لفئة لا وجود لها في الكتالوج الحالي.');
      continue;
    }
    if (!(REQUIRED_BUILD_CATEGORIES as readonly string[]).includes(category)) {
      issue('not-a-build-category', 'اخترت قطعة لفئة ليست من فئات البناء الأساسية.');
      continue;
    }
    const onShelf = (PART_CATEGORY_MAP[category] ?? []).find(p => p.id === id);
    if (onShelf) { selectedParts[category] = onShelf; continue; }
    /*
     * «EXISTS, WRONG SHELF» IS NOT «DOES NOT EXIST».
     *
     * The dangerous one is the first: a frame's id filed under motors resolves
     * against a flat catalogue and renders a frame under «المحركات» with no
     * spec rows — Phase 2C spent a round removing exactly that. The category
     * is the truth here, and it is never inferred from the id string.
     */
    const elsewhere = Object.entries(PART_CATEGORY_MAP)
      .find(([c, list]) => c !== category && list.some(pp => pp.id === id));
    if (elsewhere) {
      issue('foreign-category', 'القطعة التي اخترتها موجودة في الكتالوج لكنها من فئة أخرى.');
    } else {
      issue('unknown-part', 'القطعة التي اخترتها غير موجودة في الكتالوج الحالي.');
    }
  }

  /*
   * FAIL CLOSED. Honouring the rest while dropping the bad entry would leave
   * the reader reading a recommendation for a category they believe they chose.
   */
  if (selectionIssues.length > 0) {
    return {
      ...deadEnd('اختيارٌ من اختياراتك لا يمكن قراءته على هذا الكتالوج، فلا يمكن حساب اقتراح صادق قبل تصحيحه.'),
      selectionIssues,
    };
  }

  // ── 1. Prerequisites: derive only what the catalogue derives UNIQUELY ─────
  //
  // Where several values are equally valid the engine ASKS. `[4, 6]` says both
  // work; it does not say 4 is preferable, and taking the first would be the
  // array-position tiebreak this engine exists to refuse.
  const sizes = getAvailableSizeOptions(droneTypeId).map(o => o.sizeInch);
  if (sizes.length === 0) {
    return deadEnd('لا يوجد إطار في الكتالوج موسوم لهذا النوع، فلا مقاس يمكن اشتقاقه ولا بناء يمكن بدؤه.');
  }

  const stockedVoltages = new Set(batteryVoltageOptions.map(o => o.sCount));
  const voltages = (droneType?.recommendedBatteryVoltages ?? [])
    .filter(v => stockedVoltages.has(v));

  if (voltages.length === 0 && input.cellCount === undefined) {
    return deadEnd('لا يوجد جهد بطارية مدعوم لهذا النوع ضمن الجهود المتوفرة في الكتالوج.');
  }

  const ownedParts = input.owned?.parts ?? {};
  const ownedLocks: Record<string, BasePart> = { ...ownedParts };

  /*
   * ── OWNED AND SELECTED IN THE SAME CATEGORY ──────────────────────────────
   *
   * Two hard locks on one shelf. The engine does not get to decide which of
   * them is true.
   *
   * SAME PART — ownership wins, deliberately. «I have it» and «I want it» are
   * both true, and the first is a fact about the world while the second is an
   * intention about a proposal; reporting the weaker one would lose
   * information. The decision comes back `user-owned`, exactly as it would
   * have without the selection.
   *
   * DIFFERENT PARTS — a contradiction that is the reader's to resolve. Picking
   * ownership would discard their choice; picking the choice would tell them
   * hardware they own is not in the build. Neither is silently dropped: both
   * ids ride on `candidateIds`, `partId` stays undefined because nothing has
   * been decided, and `selectionSource` is `none` because that is precisely
   * what it means — nobody has decided, and the reader still must.
   */
  const ownedSelectedConflicts = Object.keys(selectedParts)
    .filter(c => ownedParts[c] !== undefined && ownedParts[c].id !== selectedParts[c].id);

  for (const c of Object.keys(selectedParts)) {
    if (ownedParts[c] !== undefined && ownedParts[c].id === selectedParts[c].id) {
      delete selectedParts[c];
    }
  }

  if (ownedSelectedConflicts.length > 0) {
    const conflicted = new Set(ownedSelectedConflicts);
    return {
      ...base,
      parts: { ...ownedParts },
      decisions: REQUIRED_BUILD_CATEGORIES.map(category => {
        const owned = ownedParts[category];
        const chosen = selectedParts[category];
        if (conflicted.has(category)) {
          return {
            category,
            status: 'unavailable' as const,
            selectionSource: 'none' as const,
            candidateIds: [owned.id, chosen.id],
            compatibility: [],
            reasons: [{
              kind: 'no-candidate' as const, evidence: 'user-input' as const,
              inputKey: 'selectedParts' as const,
              ar: `قلت إنك تملك «${owned.nameAr}» واخترت «${chosen.nameAr}» لنفس الفئة — لا نُسقط أيًّا منهما، والحسم لك.`,
            }],
          };
        }
        return {
          category,
          status: 'unavailable' as const,
          selectionSource: owned ? ('user-owned' as const) : ('none' as const),
          partId: owned?.id,
          candidateIds: owned ? [owned.id] : [],
          compatibility: [],
          reasons: [{
            kind: 'no-candidate' as const, evidence: 'documented' as const,
            ar: 'قطعة تملكها وأخرى اخترتها تتنازعان الفئة نفسها، فلا يمكن إتمام هذا البناء قبل حسم ذلك.',
          }],
        };
      }),
    };
  }

  /*
   * A part the reader owns must satisfy the ECOSYSTEM they also own, before it
   * is trusted as a lock. Nothing downstream can catch this: the pool filter
   * never walks a locked category, and `computeFindings` judges parts against
   * parts — it has no idea which radio is on the reader's desk. So «I own an
   * ExpressLRS radio» plus «I own a Crossfire receiver» produced a build the
   * engine called sound.
   *
   * The contradiction is the reader's to resolve, so their part is never
   * deleted or swapped: it keeps its identity, and the reason names the
   * mismatch.
   */
  const ecoConflicts = [
    ...Object.entries(ownedParts).map(([cat, part]) => ({ cat, part, from: 'owned' as const })),
    ...Object.entries(selectedParts).map(([cat, part]) => ({ cat, part, from: 'selected' as const })),
  ]
    .map(e => ({ ...e, conflict: ecosystemConflict(e.cat, e.part, input.owned) }))
    .filter((e): e is typeof e & { conflict: NonNullable<ReturnType<typeof ecosystemConflict>> } =>
      e.conflict !== null);

  if (ecoConflicts.length > 0) {
    const byCat = new Map(ecoConflicts.map(e => [e.cat, e]));
    const anySelected = ecoConflicts.some(e => e.from === 'selected');
    return {
      ...base,
      /*
       * A SELECTED part that lost is still named. `parts` in a dead end exists
       * so the reader can see which of THEIR pieces is involved, and a piece
       * they chose is theirs in every sense that matters here.
       */
      parts: { ...ownedParts, ...selectedParts },
      decisions: REQUIRED_BUILD_CATEGORIES.map(category => {
        const hit = byCat.get(category);
        const owned = ownedParts[category];
        const chosen = selectedParts[category];
        const mine = owned ?? chosen;
        return {
          category,
          status: 'unavailable' as const,
          // The reader's part is never re-attributed on its way out: a
          // selection that conflicts stays `user-selected`, so nothing
          // downstream can read it as hardware they own.
          selectionSource: owned ? ('user-owned' as const)
            : chosen ? ('user-selected' as const) : ('none' as const),
          partId: mine?.id,
          candidateIds: mine ? [mine.id] : [],
          compatibility: [],
          reasons: [hit
            ? {
              kind: 'no-candidate' as const,
              evidence: hit.from === 'selected' ? ('user-input' as const) : ('documented' as const),
              inputKey: hit.conflict.inputKey, ar: hit.conflict.ar,
            }
            : {
              kind: 'no-candidate' as const, evidence: 'documented' as const,
              ar: anySelected
                ? 'قطعة اخترتها تخالف المنظومة التي تملكها، فلا يمكن إتمام هذا البناء قبل حسم ذلك.'
                : 'قطعة تملكها تخالف المنظومة التي تملكها، فلا يمكن إتمام هذا البناء قبل حسم ذلك.',
            }],
        };
      }),
    };
  }

  /*
   * A PREREQUISITE IS ONLY A QUESTION IF MORE THAN ONE ANSWER WORKS.
   *
   * Counting the catalogue's options is not enough. Racing declares
   * `recommendedBatteryVoltages: [4, 6]`, so counting would ask the reader to
   * pick a voltage — and then tell them, after they answered, that no racing
   * build is possible at either. The question was never real.
   *
   * So each candidate combination is tested for viability first. What comes
   * back is one of three honest answers: nothing works (unavailable, and say
   * why now), exactly one works (resolve it — a choice with one live option is
   * not a choice), or several work (ask, because now the question is real).
   */
  const prereqBlockers = new Set<string>();
  const sizeCandidates = input.sizeInch !== undefined ? [input.sizeInch] : sizes;
  const voltCandidates = input.cellCount !== undefined ? [input.cellCount] : voltages;
  const allLocks: Record<string, BasePart> = { ...ownedLocks, ...selectedParts };
  const selectedCats = Object.keys(selectedParts);

  /*
   * A LOCK IS NEVER TRUSTED BY BEING A LOCK.
   *
   * `findCleanCompletion` walks the UNFIXED categories and filters those
   * through eligibility, the shared rules and the ecosystem. It applies none of
   * that to what is already fixed — it assembles the build and asks
   * `computeFindings`, which judges parts against parts. So a 5-inch frame
   * selected for a 7-inch build, or a 6S battery selected for a 4S one, could
   * sit in `fixed` and be declared sound. That is the same hole the owned path
   * plugs with `ownedVerdict`; a selection needs it too, and needs it HERE,
   * because size and voltage are what eligibility is asked about and they are
   * only settled per candidate combination.
   */
  const selectionsHoldAt = (o: { sizeInch: number; cellCount: number }): boolean =>
    selectedCats.every(cat => {
      const part = selectedParts[cat];
      const others = Object.fromEntries(
        Object.entries(allLocks).filter(([c]) => c !== cat),
      );
      return eligibleCandidates(cat, PART_CATEGORY_MAP[cat] ?? [], {
        droneTypeId, cellCount: o.cellCount, sizeInch: o.sizeInch,
      }).some(p => p.id === part.id)
        && passesSharedRules(cat, part, others, o);
    });

  const combosFor = (fixed: Record<string, BasePart>, hold: (o: { sizeInch: number; cellCount: number }) => boolean,
    seen?: Set<string>) => {
    const out: { sizeInch: number; cellCount: number }[] = [];
    for (const s of sizeCandidates) {
      for (const v of voltCandidates) {
        const o = { sizeInch: s, cellCount: v };
        if (hold(o) && findCleanCompletion(fixed, input, o, seen)) out.push(o);
      }
    }
    return out;
  };

  const viableCombos = combosFor(allLocks, selectionsHoldAt, prereqBlockers);

  if (viableCombos.length === 0) {
    /*
     * WHOSE FAULT IS THIS? A build can be impossible on its own, or impossible
     * only because of what the reader chose, and telling a reader «no build
     * exists» when their own pick is the reason would send them looking in the
     * wrong place. So the question is asked again without the selections.
     */
    const withoutSelections = selectedCats.length > 0
      ? combosFor(ownedLocks, () => true) : [];

    if (withoutSelections.length > 0) {
      /*
       * INDIVIDUALLY FINE, JOINTLY IMPOSSIBLE is a different sentence from
       * «this one does not work», and the reader needs the right one: the first
       * says «change one of these», the second names the piece.
       */
      const soloOk = new Set(selectedCats.filter(cat =>
        combosFor({ ...ownedLocks, [cat]: selectedParts[cat] }, o => {
          const others = Object.fromEntries(
            Object.entries(ownedLocks).filter(([c]) => c !== cat),
          );
          return eligibleCandidates(cat, PART_CATEGORY_MAP[cat] ?? [], {
            droneTypeId, cellCount: o.cellCount, sizeInch: o.sizeInch,
          }).some(p => p.id === selectedParts[cat].id)
            && passesSharedRules(cat, selectedParts[cat], others, o);
        }).length > 0));
      const jointly = soloOk.size === selectedCats.length;

      return {
        ...base,
        sizeInch: input.sizeInch,
        cellCount: input.cellCount,
        parts: { ...ownedParts, ...selectedParts },
        decisions: REQUIRED_BUILD_CATEGORIES.map(category => {
          const chosen = selectedParts[category];
          const owned = ownedParts[category];
          const mine = chosen ?? owned;
          return {
            category,
            status: 'unavailable' as const,
            // The identity survives the refusal. Nothing here is replaced,
            // and a selection that failed is still reported as a selection.
            selectionSource: chosen ? ('user-selected' as const)
              : owned ? ('user-owned' as const) : ('none' as const),
            partId: mine?.id,
            candidateIds: mine ? [mine.id] : [],
            compatibility: [],
            reasons: [{
              kind: 'no-candidate' as const, evidence: 'user-input' as const,
              inputKey: 'selectedParts' as const,
              ar: chosen
                ? (jointly
                  ? 'القطع التي اخترتها سليمة كلٌّ على حدة، لكنها معًا لا تسمح بإتمام بناء خالٍ من الموانع — لم يُستبدل أيٌّ منها.'
                  : soloOk.has(category)
                    ? 'هذه القطعة التي اخترتها تصلح وحدها، لكن اختيارًا آخر من اختياراتك يمنع إتمام البناء — لم يُستبدل أيٌّ منها.'
                    : 'القطعة التي اخترتها لا تسمح بإتمام بناء كامل خالٍ من الموانع — لم تُستبدل، والقرار لك.')
                : 'لا يمكن إتمام هذا البناء مع القطع التي اخترتها — ولم نستبدل أيًّا منها.',
            }],
          };
        }),
        blockerFindingIds: [...prereqBlockers],
      };
    }

    return {
      ...deadEnd('لا توجد تركيبة كاملة خالية من الموانع لهذا النوع في الكتالوج الحالي.'),
      sizeInch: input.sizeInch,
      cellCount: input.cellCount,
      blockerFindingIds: [...prereqBlockers],
    };
  }

  const requiredInputs: RequiredInput[] = [];
  const viableSizes = [...new Set(viableCombos.map(c => c.sizeInch))];
  const viableVolts = [...new Set(viableCombos.map(c => c.cellCount))];
  if (viableSizes.length > 1) {
    requiredInputs.push({
      key: 'sizeInch', options: viableSizes,
      ar: 'أكثر من مقاس يؤدي إلى بناء سليم، ولا شيء في بياناتنا يرجّح أحدها — اختر المقاس.',
    });
  }
  if (viableVolts.length > 1) {
    requiredInputs.push({
      key: 'cellCount', options: viableVolts,
      ar: 'أكثر من جهد يؤدي إلى بناء سليم، والكتالوج لا يقول إن أحدها أفضل — اختر الجهد.',
    });
  }
  /*
   * Nothing below can be computed against an unknown size or voltage, so the
   * question IS the answer here. But an answer the engine ALREADY has is not
   * withdrawn along with it: if exactly one size is viable and two voltages
   * are, the size is resolved and only the voltage is asked. Returning both as
   * unknown would contradict this type's own contract — «resolved only when
   * the catalogue derived exactly one, or the reader said» — and would make a
   * caller re-ask a question that has one answer.
   */
  if (requiredInputs.length > 0) {
    return {
      ...base,
      sizeInch: viableSizes.length === 1 ? viableSizes[0] : input.sizeInch,
      cellCount: viableVolts.length === 1 ? viableVolts[0] : input.cellCount,
      requiredInputs,
    };
  }

  const sizeInch = viableSizes[0];
  const cellCount = viableVolts[0];
  const opts = { sizeInch, cellCount };

  // ── 2. Owned AND selected parts are hard locks, before anything else ──────
  //
  // Both are the reader's. `budgetTier` never sees a locked category, which is
  // the whole of «choice outranks preference»: there is no ranking step to
  // override, because ranking only ever runs on an open one.
  const locks: Record<string, BasePart> = { ...allLocks };
  const ownedVerdict = new Map<string, boolean>();
  for (const [cat, part] of Object.entries(ownedParts)) {
    const others = Object.fromEntries(
      Object.entries(locks).filter(([c]) => c !== cat),
    );
    ownedVerdict.set(cat, passesSharedRules(cat, part, others, opts));
  }

  // ── 3. Decide category by category: viability first, preference second ───
  const decisions: CategoryDecision[] = [];
  const searchBlockers = new Set<string>();

  for (const category of REQUIRED_BUILD_CATEGORIES) {
    const owned = ownedParts[category];

    if (owned) {
      const compatible = ownedVerdict.get(category) === true;
      const viable = compatible
        && findCleanCompletion(locks, input, opts, searchBlockers) !== null;
      decisions.push({
        category,
        status: viable ? 'user-locked' : 'unavailable',
        // Never `system`: the reader chose this, and calling it a
        // recommendation would claim the engine weighed it against others.
        selectionSource: 'user-owned',
        partId: owned.id,
        candidateIds: [owned.id],
        compatibility: compatibilityEvidenceFor(category, owned, locks, opts),
        reasons: [...ecosystemReasons(category, input.owned), viable
          ? {
            kind: 'filter', evidence: 'documented', inputKey: 'ownedParts',
            ar: 'قطعة تملكها بالفعل، ويمكن إتمام بناء كامل خالٍ من الموانع بها — أُبقيت كما هي.',
          }
          : {
            kind: 'no-candidate', evidence: 'documented', inputKey: 'ownedParts',
            ar: 'قطعة تملكها بالفعل لكنها لا تسمح بإتمام بناء خالٍ من الموانع — لم تُستبدل، والقرار لك.',
          }],
      });
      continue;
    }

    /*
     * A PART THE READER CHOSE.
     *
     * Everything unusable was already refused above — shape, ecosystem,
     * eligibility, the shared rules and global viability alongside every other
     * lock — so by the time this runs the selection is known to work, and
     * `viable` is a guard rather than a question. It is computed anyway: if
     * some later change ever breaks that invariant, the reader gets an honest
     * «unavailable» instead of a `user-selected` that is not true.
     */
    const chosen = selectedParts[category];
    if (chosen) {
      const viable = findCleanCompletion(locks, input, opts, searchBlockers) !== null;
      decisions.push({
        category,
        status: viable ? 'user-selected' : 'unavailable',
        // Never `user-owned`: they chose it, they did not say they have it.
        // Never `system`: nothing was weighed against anything.
        selectionSource: 'user-selected',
        partId: chosen.id,
        candidateIds: [chosen.id],
        compatibility: compatibilityEvidenceFor(category, chosen, locks, opts),
        reasons: [...ecosystemReasons(category, input.owned), viable
          ? {
            kind: 'selection', evidence: 'user-input', inputKey: 'selectedParts',
            ar: 'اخترت هذه القطعة لهذا البناء.',
          }
          : {
            kind: 'no-candidate', evidence: 'user-input', inputKey: 'selectedParts',
            ar: 'القطعة التي اخترتها لا تسمح بإتمام بناء خالٍ من الموانع — لم تُستبدل، والقرار لك.',
          }],
      });
      continue;
    }

    const pool = poolFor(category, locks, input, opts);
    // Why this category's field was narrowed at all. Carried on EVERY outcome
    // in a constrained category — including a tie — because «these are the
    // ExpressLRS ones, and nothing separates them» is a different sentence
    // from «nothing separates them».
    const ecoReasons = ecosystemReasons(category, input.owned);

    // GLOBAL VIABILITY BEFORE PREFERENCE. A candidate that cannot appear in
    // any clean complete build is removed here — before ranking ever sees it —
    // so a well-rated dead end can never crowd out a workable alternative.
    const viable = pool.filter(p =>
      findCleanCompletion({ ...locks, [category]: p }, input, opts, searchBlockers) !== null);

    if (viable.length === 0) {
      decisions.push({
        category, status: 'unavailable', selectionSource: 'none',
        candidateIds: [], compatibility: [],
        reasons: [{
          kind: 'no-candidate', evidence: 'documented',
          ar: pool.length === 0
            ? 'لا توجد قطعة في الكتالوج تجتاز شروط هذا البناء في هذه الفئة.'
            : 'كل القطع المتوافقة في هذه الفئة تؤدي إلى بناء يصطدم بمانع — لا خيار سليم منها.',
        }],
      });
      continue;
    }

    const candidateIds = viable.map(p => p.id);

    if (viable.length === 1) {
      // Locked owner decision: one survivor is «the only compatible one in the
      // catalogue», never «the best». There is nothing to be best against.
      locks[category] = viable[0];
      decisions.push({
        category, status: 'only-compatible', selectionSource: 'system',
        partId: viable[0].id, candidateIds,
        compatibility: compatibilityEvidenceFor(category, viable[0], locks, opts),
        reasons: [...ecoReasons, {
          kind: 'filter', evidence: 'documented',
          ar: 'الخيار الوحيد المتوافق في الكتالوج بعد تطبيق شروط بنائك — وليس ترشيحًا بين بدائل.',
        }],
      });
      continue;
    }

    const { top, reasons } = rankViable(viable, input);
    if (top.length === 1 && reasons.length > 0) {
      locks[category] = top[0];
      decisions.push({
        category, status: 'recommended', selectionSource: 'system',
        partId: top[0].id, candidateIds,
        compatibility: compatibilityEvidenceFor(category, top[0], locks, opts),
        reasons: [...ecoReasons, ...reasons],
      });
      continue;
    }

    decisions.push({
      category, status: 'choice-required', selectionSource: 'none',
      candidateIds, compatibility: [],
      reasons: [...ecoReasons, {
        kind: 'tie', evidence: 'catalogue-tag',
        ar: `بقيت ${top.length} قطع متساوية في كل ما نعرفه عنها — الاختيار لك.`,
      }],
    });
  }

  // ── 4. The receipt, and a last honest narrowing ───────────────────────────
  const path = findCleanCompletion(locks, input, opts, searchBlockers);

  // A candidate that was viable when its own category was decided may have
  // stopped being viable once later categories locked. Re-checking is the
  // difference between offering a real choice and offering a list.
  const refined = path ? decisions.map(d => {
    if (d.status !== 'choice-required') return d;
    const pool = (PART_CATEGORY_MAP[d.category] ?? [])
      .filter(p => d.candidateIds.includes(p.id))
      .filter(p => findCleanCompletion({ ...locks, [d.category]: p }, input, opts) !== null);
    if (pool.length === d.candidateIds.length) return d;
    if (pool.length === 1) {
      return {
        ...d, status: 'only-compatible' as const, selectionSource: 'system' as const,
        partId: pool[0].id, candidateIds: pool.map(p => p.id),
        compatibility: compatibilityEvidenceFor(d.category, pool[0], locks, opts),
        reasons: [...ecosystemReasons(d.category, input.owned), {
          kind: 'filter' as const, evidence: 'documented' as const,
          ar: 'الخيار الوحيد المتوافق في الكتالوج بعد تطبيق شروط بنائك — وليس ترشيحًا بين بدائل.',
        }],
      };
    }
    return { ...d, candidateIds: pool.map(p => p.id) };
  }) : decisions;

  const parts: Record<string, BasePart> = {};
  for (const d of refined) {
    if (d.partId && d.status !== 'unavailable') {
      // Owned first, then chosen, then the catalogue — and the catalogue
      // lookup stays scoped to THIS category, never flattened.
      const p = ownedParts[d.category] ?? selectedParts[d.category]
        ?? (PART_CATEGORY_MAP[d.category] ?? []).find(x => x.id === d.partId);
      if (p) parts[d.category] = p;
    }
  }

  const unresolved = refined.filter(d => d.partId === undefined).map(d => d.category);

  const manualChecks = path
    ? computeFindings(snapshotFromParts(
      Object.fromEntries(REQUIRED_BUILD_CATEGORIES.map(c => [
        c, ownedParts[c] ?? selectedParts[c]
          ?? (PART_CATEGORY_MAP[c] ?? []).find(p => p.id === path[c])!,
      ])) as Record<string, BasePart>,
      { droneTypeId, ...opts },
    )).filter(f => f.severity === 'unknown').map(f => f.id)
    : [];

  return {
    droneTypeId,
    sizeInch,
    cellCount,
    requiredInputs: [],
    decisions: refined,
    // Without a receipt, only what the READER put in survives — theirs to see,
    // whether they own it or chose it. Nothing the system picked is presented
    // as fixed when nothing was proven.
    parts: path ? parts : Object.fromEntries(
      Object.entries(parts).filter(([c]) => ownedParts[c] || selectedParts[c]),
    ),
    unresolved: path ? unresolved : [...REQUIRED_BUILD_CATEGORIES],
    manualChecks,
    complete: !!path && unresolved.length === 0,
    provenPath: path,
    blockerFindingIds: path ? [] : [...searchBlockers],
    // Empty by construction: a malformed selection returned long before here.
    selectionIssues: [],
  };
}
