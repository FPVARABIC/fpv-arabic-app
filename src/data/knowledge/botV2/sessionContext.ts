/**
 * BOT V2 — Minimal session-only conversation context.
 *
 * Held in React state by BOTH assistant UIs (BotV2Overlay.tsx,
 * BotV2AssistantView.tsx) — never persisted to Firestore, never written to
 * localStorage, never sent anywhere. Reset to createEmptyContext() whenever
 * the assistant thread itself is reset (see engine.ts's exported
 * createEmptyContext, re-exported for the UI's "start over" affordance).
 *
 * This is a pure, deterministic, synchronous reducer — resolveTurn() is a
 * pure function of (rawQuery, this turn's IntentResult, prior context). No
 * unbounded history scan: only the single prior-turn context object is
 * consulted, which is why every field is a scalar or small enum, not an
 * array of past messages.
 */

import { normalizeArabicQuery } from '../botQueryAnalysis';
import type { BotConceptId } from '../botConceptRegistry';
import type { ContextualWarningKind } from './contextualWarning';
import type {
  Intent, IntentResult, ExtractedEntities,
  UseCase, FrameSize, BatteryVoltage, ExperienceLevel,
} from './intentClassifier';

// ── Context type ────────────────────────────────────────────────────────────

export type PendingClarification = 'intended_use' | 'budget' | 'experience_level';

export type BuildStage = 'planning' | 'selection' | 'assembly' | 'power_up' | 'testing' | 'flying';

export interface AssistantSessionContext {
  activeIntent?: Intent;
  buildStage?: BuildStage;
  experienceLevel?: ExperienceLevel;
  intendedUse?: UseCase;
  budgetAmount?: number;
  budgetCurrency?: string;
  frameSize?: FrameSize;
  batteryVoltage?: BatteryVoltage;
  pendingClarification?: PendingClarification;
  /**
   * The kind of the last warning that was actually SHOWN (not merely
   * classified) — undefined whenever the previous turn showed no warning
   * or suppressed one via deduplication. See contextualWarning.ts's
   * applyWarningDeduplication for why "shown", not "computed", is stored.
   */
  lastWarningKind?: ContextualWarningKind;
}

export function createEmptyContext(): AssistantSessionContext {
  return {};
}

// ── Intent families (topic-switch granularity) ─────────────────────────────
// Deliberately coarse — four buckets, not seventeen special cases. A switch
// between buckets clears the planning-specific fields; movement within a
// bucket (or a weak/ambiguous message) does not.

type Family = 'planning' | 'action' | 'troubleshooting' | 'other' | 'none';

const PLANNING_FAMILY: ReadonlySet<Intent> = new Set([
  'broad_planning', 'component_selection', 'compatibility_check', 'assembly', 'soldering', 'firmware_configuration',
]);
const ACTION_FAMILY: ReadonlySet<Intent> = new Set([
  'first_power_up', 'motor_test', 'lipo_charge', 'lipo_storage',
]);
const TROUBLESHOOTING_FAMILY: ReadonlySet<Intent> = new Set([
  'flight_troubleshooting', 'video_troubleshooting', 'radio_troubleshooting', 'gps_troubleshooting',
]);

function familyOf(intent: Intent | undefined): Family {
  if (!intent) return 'none';
  if (PLANNING_FAMILY.has(intent)) return 'planning';
  if (ACTION_FAMILY.has(intent)) return 'action';
  if (TROUBLESHOOTING_FAMILY.has(intent)) return 'troubleshooting';
  return 'other';
}

// ── Reset / start-over detection ───────────────────────────────────────────

const _RESET_RAW = ['ابدأ من جديد', 'ابدا من جديد', 'من جديد', 'من البداية', 'restart', 'start over'];
const _resetPhrases = _RESET_RAW.map(normalizeArabicQuery);

function isResetRequest(norm: string): boolean {
  return _resetPhrases.some(p => p.length >= 3 && norm.includes(p));
}

// ── Progressive clarification ──────────────────────────────────────────────
// Order: intended use → budget → experience level. Frame size is never a
// forced, blocking question — if volunteered it is stored and used, but
// broad-build guidance proceeds (with a size recommendation, not a size
// question) once these three are known.

function nextPendingClarification(ctx: AssistantSessionContext): PendingClarification | undefined {
  if (!ctx.intendedUse) return 'intended_use';
  if (ctx.budgetAmount === undefined) return 'budget';
  if (!ctx.experienceLevel) return 'experience_level';
  return undefined;
}

// ── Context-aware bare-budget fallback ──────────────────────────────────────
// intentClassifier.ts's own entity extraction never treats a bare number as
// a budget (it requires an explicit currency/budget word — see that file's
// _extractBudget). The ONE exception the task requires — "the current
// pending clarification explicitly asks for the budget" — is handled here,
// where the prior turn's pendingClarification is available. This keeps
// the classifier itself free of any invented conversational assumption:
// a bare "400" is a budget answer only when the conversation is actually
// waiting on the budget question right now.

const _BARE_NUMBER_RE = /(\d{2,6})/;

function withBareBudgetFallback(
  rawQuery: string,
  entities: ExtractedEntities,
  pending: PendingClarification,
): ExtractedEntities {
  if (pending !== 'budget' || entities.budgetAmount !== undefined) return entities;
  const match = rawQuery.match(_BARE_NUMBER_RE);
  if (!match) return entities;
  return { ...entities, budgetAmount: Number(match[1]) };
}

function entityAnswersPending(entities: ExtractedEntities, pending: PendingClarification): boolean {
  switch (pending) {
    case 'intended_use': return entities.useCase !== undefined;
    case 'budget': return entities.budgetAmount !== undefined;
    case 'experience_level': return entities.experienceLevel !== undefined;
  }
}

// ── Merge ───────────────────────────────────────────────────────────────────
// A freshly-extracted entity value always overwrites the corresponding
// stored value ("last message wins") — this is also, deliberately, the
// ENTIRE mechanism behind "explicit correction": there is no separate
// correction-detection code path. A user saying "لا، أقصد درون سباق" simply
// re-supplies the useCase entity, which overwrites the old value here
// exactly like any other new answer would.

function mergeEntities(
  ctx: AssistantSessionContext,
  entities: ExtractedEntities,
): AssistantSessionContext {
  return {
    ...ctx,
    intendedUse: entities.useCase ?? ctx.intendedUse,
    frameSize: entities.frameSize ?? ctx.frameSize,
    batteryVoltage: entities.batteryVoltage ?? ctx.batteryVoltage,
    budgetAmount: entities.budgetAmount ?? ctx.budgetAmount,
    budgetCurrency: entities.budgetCurrency ?? ctx.budgetCurrency,
    experienceLevel: entities.experienceLevel ?? ctx.experienceLevel,
  };
}

function buildStageFor(intent: Intent): BuildStage | undefined {
  switch (intent) {
    case 'broad_planning': return 'planning';
    case 'component_selection':
    case 'compatibility_check': return 'selection';
    case 'assembly':
    case 'soldering':
    case 'firmware_configuration': return 'assembly';
    case 'first_power_up': return 'power_up';
    case 'motor_test': return 'testing';
    default: return undefined;
  }
}

// ── Turn resolution result ─────────────────────────────────────────────────

export interface TurnResolution {
  resolvedIntent: Intent;
  context: AssistantSessionContext;
  /** True whenever this turn wiped stale planning fields due to a family
   *  change or an explicit reset — used to reset warning-repetition
   *  deduplication too. */
  topicChanged: boolean;
  effectiveConceptId?: BotConceptId;
}

/**
 * The single reducer entry point. Pure function of the current message's
 * IntentResult and the prior context — never scans conversation history.
 *
 * `isCriticalHazard` (F-4 correction) must be the CURRENT message's own
 * `safety.riskLevel === 'critical'` result, computed by the caller
 * (engine.ts) from classifyV2Risk() on THIS message only — never derived
 * from priorContext. When true, this turn forces the same context break as
 * an explicit reset: no persistent "hazard history" field is introduced,
 * it is a one-time wipe so that no pending clarification or stale
 * planning/action/troubleshooting state can silently resume afterward.
 */
export function resolveTurn(
  rawQuery: string,
  intentResult: IntentResult,
  priorContext: AssistantSessionContext,
  isCriticalHazard = false,
): TurnResolution {
  const norm = normalizeArabicQuery(rawQuery);

  // 0. An immediate critical hazard in the CURRENT message always forces a
  //    context break (F-4) — stale planning/action/troubleshooting state,
  //    including any pending clarification, must never silently survive a
  //    safety-critical turn, at any clarification stage. The persisted
  //    context is wiped exactly like an explicit reset; only the resolved
  //    intent/concept for THIS turn's own answer are taken from
  //    intentResult, never stored.
  if (isCriticalHazard) {
    return {
      resolvedIntent: intentResult.intent,
      context: {},
      topicChanged: true,
      effectiveConceptId: intentResult.resolvedConceptId,
    };
  }

  // 1. Explicit reset — wipe everything (F-3): the persisted context must
  //    be structurally empty, exactly like createEmptyContext(). Do NOT
  //    merge entities extracted from the reset phrase itself and do NOT
  //    store the intent/concept the reset phrase happens to match (e.g.
  //    "ابدأ من جديد" collides with the pre-existing app_navigation
  //    concept synonym "أبدأ من" and with the beginner experience-level
  //    signal "جديد" — neither must leak into session state). intentResult
  //    is used only for THIS turn's own resolvedIntent/effectiveConceptId,
  //    which drive the answer that is rendered right now, not what is
  //    remembered afterward.
  if (isResetRequest(norm)) {
    return {
      resolvedIntent: intentResult.intent,
      context: {},
      topicChanged: true,
      effectiveConceptId: intentResult.resolvedConceptId,
    };
  }

  // 2. This message answers an active pending clarification — continue the
  //    SAME activeIntent (do not re-classify from scratch), merge the new
  //    entity, and advance to the next pending question (or none, once all
  //    three are known).
  if (priorContext.pendingClarification) {
    const effectiveEntities = withBareBudgetFallback(rawQuery, intentResult.entities, priorContext.pendingClarification);
    if (entityAnswersPending(effectiveEntities, priorContext.pendingClarification)) {
      const merged = mergeEntities(priorContext, effectiveEntities);
      const resolvedIntent = priorContext.activeIntent ?? intentResult.intent;
      return {
        resolvedIntent,
        context: {
          ...merged,
          activeIntent: resolvedIntent,
          buildStage: buildStageFor(resolvedIntent),
          pendingClarification: resolvedIntent === 'broad_planning' ? nextPendingClarification(merged) : undefined,
          lastWarningKind: priorContext.lastWarningKind,
        },
        topicChanged: false,
        effectiveConceptId: intentResult.resolvedConceptId,
      };
    }
  }

  // 3. A weak/ambiguous message with an existing active topic never
  //    downgrades that topic to unknown_or_ambiguous — it is treated as a
  //    continuation. Any entity it happens to carry is still merged in
  //    (e.g. a bare use-case word with no other recognizable structure).
  const priorFamily = familyOf(priorContext.activeIntent);
  const isWeakSignal = intentResult.confidence === 'low' || intentResult.intent === 'unknown_or_ambiguous';
  if (isWeakSignal && priorFamily !== 'none') {
    const merged = mergeEntities(priorContext, intentResult.entities);
    const resolvedIntent = priorContext.activeIntent as Intent;
    const stillPending =
      priorContext.pendingClarification && !entityAnswersPending(intentResult.entities, priorContext.pendingClarification)
        ? priorContext.pendingClarification
        : (resolvedIntent === 'broad_planning' ? nextPendingClarification(merged) : undefined);
    return {
      resolvedIntent,
      context: {
        ...merged,
        activeIntent: resolvedIntent,
        buildStage: buildStageFor(resolvedIntent),
        pendingClarification: stillPending,
        lastWarningKind: priorContext.lastWarningKind,
      },
      topicChanged: false,
      effectiveConceptId: intentResult.resolvedConceptId,
    };
  }

  // 4. A strong, clearly-classified intent in a DIFFERENT family than the
  //    active one is a genuine topic switch — clear the stale
  //    planning-specific fields entirely rather than letting them leak into
  //    an unrelated new topic.
  const newFamily = familyOf(intentResult.intent);
  const familyChanged = priorFamily !== 'none' && newFamily !== priorFamily;
  if (familyChanged) {
    const fresh = mergeEntities({}, intentResult.entities);
    const resolvedIntent = intentResult.intent;
    return {
      resolvedIntent,
      context: {
        ...fresh,
        activeIntent: resolvedIntent,
        buildStage: buildStageFor(resolvedIntent),
        pendingClarification: resolvedIntent === 'broad_planning' ? nextPendingClarification(fresh) : undefined,
        lastWarningKind: undefined,
      },
      topicChanged: true,
      effectiveConceptId: intentResult.resolvedConceptId,
    };
  }

  // 5. Same family as before (or no prior topic at all) — merge normally.
  const merged = mergeEntities(priorContext, intentResult.entities);
  const resolvedIntent = intentResult.intent;
  return {
    resolvedIntent,
    context: {
      ...merged,
      activeIntent: resolvedIntent,
      buildStage: buildStageFor(resolvedIntent),
      pendingClarification: resolvedIntent === 'broad_planning' ? nextPendingClarification(merged) : undefined,
      lastWarningKind: priorContext.lastWarningKind,
    },
    topicChanged: false,
    effectiveConceptId: intentResult.resolvedConceptId,
  };
}
