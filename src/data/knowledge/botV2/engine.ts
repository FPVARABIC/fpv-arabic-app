/**
 * BOT V2 — Main engine.
 *
 * Single entry point. Calls the existing inert query analysis, applies V2 safety,
 * selects answer mode, and composes a template-based answer.
 *
 * NOT connected to any runtime code. Safe to import in tests/QA only.
 */

import { analyzeQuery } from '../botQueryAnalysis';
import { classifyV2Risk } from './safety';
import { selectV2Mode } from './modeSelector';
import { composeV2Answer } from './composer';
import type { BotV2Answer } from './types';

/**
 * Analyzes a raw Arabic/English/mixed query and returns a full V2 answer.
 *
 * Pipeline:
 *   analyzeQuery() → classifyV2Risk() → selectV2Mode() → composeV2Answer()
 */
export function analyzeAndComposeBotV2Answer(query: string): BotV2Answer {
  const analysis = analyzeQuery(query);
  const safety = classifyV2Risk(analysis);
  const modeSelection = selectV2Mode(analysis, safety);
  return composeV2Answer(analysis, safety, modeSelection);
}
