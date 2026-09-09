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
  RecommendationInput, RequiredInput,
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
  let pool = eligibleCandidates(category, all, {
    droneTypeId: input.droneTypeId, cellCount: opts.cellCount, sizeInch: opts.sizeInch,
  }).filter(p => passesSharedRules(category, p, fixed, opts));

  const owned = input.owned;
  if (category === 'videoUnits' && owned?.videoSystem) {
    pool = pool.filter(p => videoSystemOf(p) === owned.videoSystem);
  }
  if (category === 'receivers' && owned?.rcSystem) {
    pool = pool.filter(p => rcSystemOf(p) === owned.rcSystem);
  }
  return pool;
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
  const viableCombos: { sizeInch: number; cellCount: number }[] = [];
  for (const s of sizeCandidates) {
    for (const v of voltCandidates) {
      const probe = findCleanCompletion(ownedLocks, input, { sizeInch: s, cellCount: v }, prereqBlockers);
      if (probe) viableCombos.push({ sizeInch: s, cellCount: v });
    }
  }

  if (viableCombos.length === 0) {
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
  // Nothing below can be computed against an unknown size or voltage.
  // Returning the question IS the answer; guessing would make every decision
  // rest on a number nobody chose.
  if (requiredInputs.length > 0) return { ...base, requiredInputs };

  const sizeInch = viableSizes[0];
  const cellCount = viableVolts[0];
  const opts = { sizeInch, cellCount };

  // ── 2. Owned parts are hard locks, before anything else is considered ─────
  const locks: Record<string, BasePart> = { ...ownedLocks };
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
        reasons: [viable
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

    const pool = poolFor(category, locks, input, opts);

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
        reasons: [{
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
        reasons,
      });
      continue;
    }

    decisions.push({
      category, status: 'choice-required', selectionSource: 'none',
      candidateIds, compatibility: [],
      reasons: [{
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
        reasons: [{
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
      const p = ownedParts[d.category]
        ?? (PART_CATEGORY_MAP[d.category] ?? []).find(x => x.id === d.partId);
      if (p) parts[d.category] = p;
    }
  }

  const unresolved = refined.filter(d => d.partId === undefined).map(d => d.category);

  const manualChecks = path
    ? computeFindings(snapshotFromParts(
      Object.fromEntries(REQUIRED_BUILD_CATEGORIES.map(c => [
        c, ownedParts[c] ?? (PART_CATEGORY_MAP[c] ?? []).find(p => p.id === path[c])!,
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
    parts: path ? parts : Object.fromEntries(
      Object.entries(parts).filter(([c]) => ownedParts[c]),
    ),
    unresolved: path ? unresolved : [...REQUIRED_BUILD_CATEGORIES],
    manualChecks,
    complete: !!path && unresolved.length === 0,
    provenPath: path,
    blockerFindingIds: path ? [] : [...searchBlockers],
  };
}
