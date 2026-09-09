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
 * owns it:
 *
 *   · the four shared rules from Phase 1 (`compatibility/rules.ts`), which the
 *     part card and the final report both go through;
 *   · `computeFindings`, which decides what a blocker IS.
 *
 * Nothing is re-derived, no tolerance is re-declared, no validator is called
 * twice. `scripts/testCompatCompleteness.ts` fails the build if that changes.
 *
 * IT DOES NOT SOLVE EACH CATEGORY IN ISOLATION
 * --------------------------------------------
 * A part can be locally fine and globally fatal. The racing type is the
 * standing proof: every individual part passes its own card, and every one of
 * the 1008 complete combinations raises `stack-mount`, because the only racing
 * frame is 20×20 and no flight controller is. A recommender that filtered
 * category by category would propose a racing build with a straight face.
 *
 * So a proposal is only returned once a COMPLETE assignment consistent with it
 * has been run through `computeFindings` and come back with zero blockers.
 * That assignment is carried on the result as `provenPath` — the receipt.
 *
 * WHAT IT REFUSES TO DO
 * ---------------------
 * It ranks only where the catalogue gives it a documented reason: the reader's
 * budget tier, and the ecosystem their goggles and radio already speak. It
 * does not prefer lighter, or higher-amp, or newer, or more expensive, or more
 * UARTs — none of those are stated anywhere as «better», and inventing the
 * preference would be inventing the data. When nothing separates the
 * survivors, the answer is `choice-required` and the reader decides.
 */

import type { BasePart, Frame, Motor, Propeller, Esc, Battery, Receiver, VideoUnit, FlightController } from '../types';
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
  CategoryDecision, DecisionReason, ProposedBuild, RecommendationInput,
} from './types';

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
 * The ecosystem a part speaks, when it declares one.
 *
 * Receivers state it twice — `protocolOrSystem` carries the product string
 * («ELRS 2.4GHz Diversity / CRSF») while `specs.protocol` carries the
 * protocol. The product string mixes a PROTOCOL with a FEATURE: Diversity is
 * two antennas, not a different language, and a reader who answered «ELRS»
 * must not be told a diversity receiver mismatches. So matching is by
 * containment of the reader's answer, and a normalized protocol wins outright.
 */
function speaksEcosystem(category: string, part: BasePart, pref: string): boolean {
  if (category === 'videoUnits') return part.protocolOrSystem === pref;
  if (category === 'receivers') {
    const proto = (part as Receiver).specs.protocol;
    if (proto === pref || part.protocolOrSystem === pref) return true;
    return (part.protocolOrSystem ?? '').includes(pref) || proto.includes(pref);
  }
  return false;
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
  opts: { sizeInch?: number; cellCount?: number },
): boolean {
  const frame = fixed.frames as Frame | undefined;
  const violated = (o: { status: string } | null) => o?.status === 'violated';

  if (category === 'frames') return !violated(frameSizeRule(part as Frame, opts.sizeInch));
  if (category === 'motors') return !violated(frameMotorClassRule(frame, part as Motor));
  if (category === 'propellers') return !violated(propClearanceRule(frame, part as Propeller));
  if (category === 'batteries') return !violated(designVoltageRule(part as Battery, opts.cellCount));
  return true;
}

/** Deterministic: catalogue order, preferred candidates first, ties untouched. */
function rankPool(
  category: string,
  pool: readonly BasePart[],
  input: RecommendationInput,
): { ordered: readonly BasePart[]; top: readonly BasePart[]; reasons: DecisionReason[] } {
  const reasons: DecisionReason[] = [];
  // Score is a COUNT OF DOCUMENTED REASONS, not a quality metric. Each point
  // is one catalogue field that says this part suits what the reader asked
  // for. Nothing else may add a point.
  const score = (p: BasePart) => {
    let s = 0;
    if (input.budgetTier && p.tier === input.budgetTier) s++;
    if (category === 'videoUnits' && input.videoSystem && speaksEcosystem(category, p, input.videoSystem)) s++;
    if (category === 'receivers' && input.rcProtocol && speaksEcosystem(category, p, input.rcProtocol)) s++;
    return s;
  };
  const best = Math.max(0, ...pool.map(score));
  const top = pool.filter(p => score(p) === best);

  if (best > 0) {
    if (input.budgetTier && top.every(p => p.tier === input.budgetTier)) {
      reasons.push({
        kind: 'ranking', evidence: 'catalogue-tag', inputKey: 'budgetTier',
        ar: `ضمن فئة الميزانية التي اخترتها (${TIER_AR[input.budgetTier]}) حسب تصنيف الكتالوج.`,
      });
    }
    if (category === 'videoUnits' && input.videoSystem) {
      reasons.push({
        kind: 'ranking', evidence: 'catalogue-tag', inputKey: 'videoSystem',
        ar: `من منظومة ${input.videoSystem} نفسها التي تستخدمها نظارتك.`,
      });
    }
    if (category === 'receivers' && input.rcProtocol) {
      reasons.push({
        kind: 'ranking', evidence: 'catalogue-tag', inputKey: 'rcProtocol',
        ar: `يتحدث ${input.rcProtocol} — نفس بروتوكول جهاز تحكمك.`,
      });
    }
  }

  // Preferred first, and WITHIN each group the catalogue's own order. Array
  // sort is stable, so this reorders nothing it was not asked to.
  const ordered = [...pool].sort((a, b) => score(b) - score(a));
  return { ordered, top, reasons };
}

const TIER_AR: Record<string, string> = { budget: 'اقتصادي', mid: 'متوازن', premium: 'Premium' };

/**
 * Findings the data cannot settle. Carried onto the proposal so a caller can
 * never present a build as checked while one of these stands.
 */
function manualCheckIds(snapshot: ProjectSnapshot): string[] {
  return computeFindings(snapshot)
    .filter(f => f.severity === 'unknown')
    .map(f => f.id);
}

/**
 * Find one complete blocker-free assignment that HONOURS every selection the
 * engine made, walking each pool in preference order so the first one found is
 * the most-preferred one that actually works.
 *
 * Bounded by the same catalogue the reachability proof walks; `explored` is
 * returned so a caller can tell «found immediately» from «searched everything».
 */
function findProvenPath(
  pools: Map<string, readonly BasePart[]>,
  locked: Readonly<Record<string, BasePart>>,
  opts: { droneTypeId: string; sizeInch: number; cellCount: number },
): { path: Record<string, string> | null; blockers: string[]; explored: number } {
  const cats = [...REQUIRED_BUILD_CATEGORIES];
  const chosen: Record<string, BasePart> = {};
  let explored = 0;
  const seenBlockers = new Set<string>();

  const walk = (depth: number): Record<string, string> | null => {
    if (depth === cats.length) {
      explored++;
      const snapshot = snapshotFromParts(chosen, opts);
      const blockers = computeFindings(snapshot).filter(f => f.severity === 'blocker');
      if (blockers.length === 0) {
        return Object.fromEntries(cats.map(c => [c, chosen[c].id]));
      }
      blockers.forEach(b => seenBlockers.add(b.id));
      return null;
    }
    const cat = cats[depth];
    // A locked category has exactly one branch: the engine's own selection,
    // or a part the reader already owns. The search may not trade it away.
    const branch = locked[cat] ? [locked[cat]] : (pools.get(cat) ?? []);
    for (const part of branch) {
      chosen[cat] = part;
      const found = walk(depth + 1);
      if (found) return found;
    }
    delete chosen[cat];
    return null;
  };

  const path = walk(0);
  return { path, blockers: [...seenBlockers], explored };
}

/**
 * WHAT THE SYSTEM CAN HONESTLY PROPOSE for one reader's stated intent.
 *
 * Deterministic: identical catalogue plus identical input gives an identical
 * result, every time. Nothing is random, and no tie is broken by insertion
 * order — a tie the data cannot settle comes back as `choice-required`.
 */
export function proposeBuild(input: RecommendationInput): ProposedBuild {
  const { droneTypeId } = input;

  const sizes = getAvailableSizeOptions(droneTypeId).map(o => o.sizeInch);
  const sizeInch = input.sizeInch ?? sizes[0];
  const cellCount = input.cellCount
    ?? droneTypes.find(t => t.id === droneTypeId)?.recommendedBatteryVoltages?.[0]
    ?? batteryVoltageOptions[0]?.sCount;

  const emptyResult = (ar: string): ProposedBuild => ({
    droneTypeId,
    sizeInch: input.sizeInch,
    cellCount: input.cellCount,
    decisions: REQUIRED_BUILD_CATEGORIES.map(category => ({
      category,
      status: 'unavailable' as const,
      candidateIds: [],
      reasons: [{ kind: 'no-candidate' as const, evidence: 'documented' as const, ar }],
    })),
    parts: {},
    unresolved: [...REQUIRED_BUILD_CATEGORIES],
    manualChecks: [],
    complete: false,
    provenPath: null,
    blockerFindingIds: [],
  });

  // No size derivable means no build can even start — the Cinewhoop case, and
  // exactly the reason `BUILD_TYPE_AVAILABILITY` gives for it.
  if (sizeInch === undefined || sizes.length === 0) {
    return emptyResult('لا يوجد إطار في الكتالوج موسوم لهذا النوع، فلا مقاس يمكن اشتقاقه ولا بناء يمكن بدؤه.');
  }

  // ── 1. Eligible pools, then the shared hard rules against what is fixed ──
  const locked: Record<string, BasePart> = {};
  const pools = new Map<string, readonly BasePart[]>();
  const decisions: CategoryDecision[] = [];

  // Existing parts are locked before anything is chosen: every later pool is
  // filtered against them, which is what «may constrain every later
  // recommendation» has to mean in practice.
  for (const [cat, part] of Object.entries(input.existingParts ?? {})) {
    locked[cat] = part;
  }

  for (const category of REQUIRED_BUILD_CATEGORIES) {
    const all = PART_CATEGORY_MAP[category] ?? [];
    const eligible = eligibleCandidates(category, all, { droneTypeId, cellCount, sizeInch });
    const pool = eligible.filter(p => passesSharedRules(category, p, locked, { sizeInch, cellCount }));
    pools.set(category, pool);

    const owned = locked[category];
    if (owned) {
      // A part the reader already owns is never silently replaced. It either
      // survives the same rules every candidate faces, or the build says so.
      const compatible = pool.some(p => p.id === owned.id)
        || (eligible.some(p => p.id === owned.id)
          && passesSharedRules(category, owned, locked, { sizeInch, cellCount }));
      decisions.push({
        category,
        status: compatible ? 'recommended' : 'unavailable',
        partId: owned.id,
        candidateIds: [owned.id],
        reasons: [compatible
          ? {
            kind: 'filter', evidence: 'documented', inputKey: 'existingParts',
            ar: `قطعة تملكها بالفعل، وهي متوافقة مع بقية اختياراتك — أُبقيت كما هي.`,
          }
          : {
            kind: 'no-candidate', evidence: 'documented', inputKey: 'existingParts',
            ar: `قطعة تملكها بالفعل لكنها لا تتوافق مع هذا البناء — لم تُستبدل، والقرار لك.`,
          }],
      });
      continue;
    }

    if (pool.length === 0) {
      decisions.push({
        category, status: 'unavailable', candidateIds: [],
        reasons: [{
          kind: 'no-candidate', evidence: 'documented',
          ar: 'لا توجد قطعة في الكتالوج تجتاز شروط هذا البناء في هذه الفئة.',
        }],
      });
      continue;
    }

    const { ordered, top, reasons } = rankPool(category, pool, input);
    pools.set(category, ordered);
    const candidateIds = ordered.map(p => p.id);

    if (pool.length === 1) {
      // Locked owner decision: one survivor is «the only compatible one in the
      // catalogue», never «the best». There is nothing to be best against.
      locked[category] = pool[0];
      decisions.push({
        category, status: 'only-compatible', partId: pool[0].id, candidateIds,
        reasons: [{
          kind: 'filter', evidence: 'documented',
          ar: 'الخيار الوحيد المتوافق في الكتالوج بعد تطبيق شروط بنائك — وليس ترشيحًا بين بدائل.',
        }],
      });
      continue;
    }

    if (top.length === 1 && reasons.length > 0) {
      locked[category] = top[0];
      decisions.push({
        category, status: 'recommended', partId: top[0].id, candidateIds, reasons,
      });
      continue;
    }

    decisions.push({
      category, status: 'choice-required', candidateIds,
      reasons: [{
        kind: 'tie', evidence: 'catalogue-tag',
        ar: top.length === pool.length
          ? `بقيت ${pool.length} قطع متوافقة ولا يوجد في بياناتنا ما يفضّل إحداها على الأخرى — الاختيار لك.`
          : `بقيت ${top.length} قطع متساوية في كل ما نعرفه عنها — الاختيار لك.`,
      }],
    });
  }

  // ── 2. Prove the proposal actually reaches a complete build ──────────────
  const { path, blockers } = findProvenPath(pools, locked, { droneTypeId, sizeInch, cellCount });

  const unresolved = decisions
    .filter(d => d.partId === undefined)
    .map(d => d.category);

  const parts: Record<string, BasePart> = {};
  for (const d of decisions) {
    if (d.partId && d.status !== 'unavailable') {
      const p = (pools.get(d.category) ?? []).find(x => x.id === d.partId) ?? locked[d.category];
      if (p) parts[d.category] = p;
    }
  }

  const manual = path
    ? manualCheckIds(snapshotFromParts(
      Object.fromEntries(REQUIRED_BUILD_CATEGORIES.map(c => [
        c, (pools.get(c) ?? []).find(p => p.id === path[c]) ?? locked[c],
      ]).filter(([, p]) => p)) as Record<string, BasePart>,
      { droneTypeId, sizeInch, cellCount },
    ))
    : [];

  return {
    droneTypeId,
    sizeInch,
    cellCount,
    // No complete blocker-free assignment exists — the racing case, and the
    // case of a reader whose own part rules the build out. Every decision is
    // still reported, because «why» is the point.
    //
    // A part the READER owns keeps its identity here. Withdrawing it would
    // erase the one fact they most need: which of their own parts is the
    // reason. Only the engine's own selections are withdrawn, because those
    // it can no longer justify.
    decisions: path ? decisions : decisions.map(d => {
      const isOwned = d.reasons.some(r => r.inputKey === 'existingParts');
      return {
        ...d,
        status: 'unavailable' as const,
        partId: isOwned ? d.partId : undefined,
        reasons: [...d.reasons, {
          kind: 'no-candidate' as const, evidence: 'documented' as const,
          ar: 'لا توجد تركيبة كاملة خالية من الموانع بهذه الاختيارات في الكتالوج الحالي.',
        }],
      };
    }),
    parts: path ? parts : {},
    unresolved: path ? unresolved : [...REQUIRED_BUILD_CATEGORIES],
    manualChecks: manual,
    complete: !!path && unresolved.length === 0,
    provenPath: path,
    blockerFindingIds: path ? [] : blockers,
  };
}
