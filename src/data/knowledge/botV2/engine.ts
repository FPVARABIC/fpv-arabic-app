/**
 * BOT V2 — Main engine.
 *
 * Single entry point. Calls query analysis, applies V2 safety classification,
 * classifies intent + extracts entities, resolves this turn against the
 * prior session context (multi-turn continuation / topic-switch / reset),
 * computes the single-authority contextual warning (with deduplication),
 * selects answer mode, and composes a structured BotV2Answer — returning it
 * together with the updated session context for the caller (a React
 * component) to hold and pass back in on the next turn.
 *
 * This is the ONLY breaking-change surface of this phase: the exported
 * function's signature changes from (query) => BotV2Answer to
 * (query, priorContext) => { answer, nextContext }. Both UI consumers
 * (BotV2Overlay.tsx, BotV2AssistantView.tsx) hold `nextContext` in React
 * state (useState) and pass it back in on the next call — never persisted
 * anywhere else.
 */

import { analyzeQuery, type QueryAnalysis } from '../botQueryAnalysis';
import { classifyV2Risk } from './safety';
import { classifyContextualWarning, applyWarningDeduplication } from './contextualWarning';
import { classifyIntent } from './intentClassifier';
import { resolveTurn, type AssistantSessionContext } from './sessionContext';
import { selectV2Mode } from './modeSelector';
import { composeV2Answer } from './composer';
import { lookupAklEntry } from './aklLookup';
import { applyRecommendations } from './recommendationLayer';
import type { BotV2Answer } from './types';

export type { AssistantSessionContext } from './sessionContext';
export { createEmptyContext } from './sessionContext';

export interface BotV2Turn {
  answer: BotV2Answer;
  nextContext: AssistantSessionContext;
}

/**
 * Analyzes a raw Arabic/English/mixed query, given the prior session
 * context, and returns a full V2 answer plus the updated context.
 *
 * Pipeline:
 *   analyzeQuery() → lookupAklEntry() → classifyV2Risk() → classifyIntent()
 *   → resolveTurn() [context reducer] → build effectiveAnalysis (conceptId
 *   override for new troubleshooting vocabulary) → classifyContextualWarning()
 *   → applyWarningDeduplication() → selectV2Mode() → [OOD/AKL override]
 *   → composeV2Answer() → applyRecommendations() [post-answer only]
 */
export function analyzeAndComposeBotV2Answer(query: string, priorContext: AssistantSessionContext): BotV2Turn {
  const analysis = analyzeQuery(query);
  const aklEntry = lookupAklEntry(analysis.normalizedQuery);
  const safety = classifyV2Risk(analysis);

  const intentResult = classifyIntent(query, analysis);
  // F-4: criticality is determined ONLY from the current message's own
  // safety result, never from priorContext, and forces resolveTurn to break
  // any stale planning/action/troubleshooting context (including a pending
  // clarification) rather than letting the emergency be silently swallowed
  // as an ordinary continuation.
  const turn = resolveTurn(query, intentResult, priorContext, safety.riskLevel === 'critical');

  const effectiveAnalysis: QueryAnalysis = turn.effectiveConceptId
    ? { ...analysis, conceptId: turn.effectiveConceptId }
    : analysis;

  const rawContextualWarning = classifyContextualWarning(analysis.normalizedQuery, safety);
  const contextualWarning = applyWarningDeduplication(rawContextualWarning, priorContext.lastWarningKind, turn.topicChanged);

  const modeSelection = selectV2Mode(effectiveAnalysis, safety, turn.resolvedIntent, turn.context.pendingClarification);

  // If AKL recognised the concept but the mode selector decided out-of-domain
  // (because the query contained no FPV domain tokens it knows about), promote
  // to definition mode — AKL recognition is sufficient evidence of FPV scope.
  const effectiveMode =
    aklEntry !== undefined &&
    modeSelection.mode === 'clarification_menu' &&
    modeSelection.isOutOfDomain
      ? { ...modeSelection, mode: 'definition' as const, reason: `akl:${aklEntry.conceptId}`, isOutOfDomain: false }
      : modeSelection;

  const composed = composeV2Answer(
    effectiveAnalysis, safety, effectiveMode, contextualWarning, turn.resolvedIntent, turn.context, aklEntry,
  );
  const answer = applyRecommendations(
    { ...composed, debug: { ...composed.debug, topicChanged: turn.topicChanged } },
    effectiveAnalysis.conceptId,
  );

  // lastWarningKind bookkeeping: store the raw (pre-dedup) kind only when the
  // card was actually shown this turn — an alternating shown/suppressed
  // pattern for 3+ consecutive identical-topic turns, so a genuinely repeated
  // explicit risky request can always show the reminder again on the very
  // next repeat (see contextualWarning.ts's applyWarningDeduplication doc).
  //
  // F-3: when no card is shown, the key is OMITTED entirely rather than set
  // to `undefined` — so that after an explicit reset (turn.context === {}),
  // nextContext is structurally empty (`{}`), not `{ lastWarningKind:
  // undefined }`, matching createEmptyContext() under a strict deep-equal
  // comparison.
  const cardShownThisTurn = contextualWarning.warningSeverity !== 'none';
  const nextContext: AssistantSessionContext = cardShownThisTurn
    ? { ...turn.context, lastWarningKind: rawContextualWarning.warningKind }
    : omitLastWarningKind(turn.context);

  return { answer, nextContext };
}

function omitLastWarningKind(ctx: AssistantSessionContext): AssistantSessionContext {
  const copy: AssistantSessionContext = { ...ctx };
  delete copy.lastWarningKind;
  return copy;
}
