/**
 * BOT V2 — Main engine.
 *
 * Single entry point. Calls query analysis, applies V2 safety classification,
 * selects answer mode, and composes a structured BotV2Answer.
 */

import { analyzeQuery } from '../botQueryAnalysis';
import { classifyV2Risk } from './safety';
import { selectV2Mode } from './modeSelector';
import { composeV2Answer } from './composer';
import { lookupAklEntry } from './aklLookup';
import { applyRecommendations } from './recommendationLayer';
import type { BotV2Answer } from './types';

/**
 * Analyzes a raw Arabic/English/mixed query and returns a full V2 answer.
 *
 * Pipeline:
 *   analyzeQuery() → lookupAklEntry() → classifyV2Risk() → selectV2Mode()
 *   → [OOD override if AKL matched] → composeV2Answer(aklEntry?)
 *   → applyRecommendations() [post-answer only — never influences reasoning]
 */
export function analyzeAndComposeBotV2Answer(query: string): BotV2Answer {
  const analysis = analyzeQuery(query);
  const aklEntry = lookupAklEntry(analysis.normalizedQuery);
  const safety = classifyV2Risk(analysis);
  const modeSelection = selectV2Mode(analysis, safety);

  // If AKL recognised the concept but the mode selector decided out-of-domain
  // (because the query contained no FPV domain tokens it knows about), promote
  // to definition mode — AKL recognition is sufficient evidence of FPV scope.
  const effectiveMode =
    aklEntry !== undefined &&
    modeSelection.mode === 'clarification_menu' &&
    modeSelection.isOutOfDomain
      ? { ...modeSelection, mode: 'definition' as const, reason: `akl:${aklEntry.conceptId}`, isOutOfDomain: false }
      : modeSelection;

  const answer = composeV2Answer(analysis, safety, effectiveMode, aklEntry);
  return applyRecommendations(answer, analysis.conceptId);
}
