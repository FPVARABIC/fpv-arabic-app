/**
 * BOT V2 — Post-answer Recommendation Layer.
 *
 * Appends internal app resource links from the generated Manifest to an
 * already-composed BotV2Answer. Runs AFTER compose — never influences
 * query analysis, AKL lookup, safety classification, mode selection,
 * primary answer content, steps, warning text, or risk level.
 *
 * Returns the answer unchanged when:
 *  - no conceptId provided (unmatched or vague query)
 *  - riskLevel is 'critical' (safety instructions must remain dominant)
 *  - no Manifest resources match the conceptId
 *  - a resource route already exists in answer.links (deduplication)
 *  - any error occurs (safe fallback)
 */

import { appManifest } from '../../manifest/appManifest.generated';
import type { BotV2Answer, BotV2Link } from './types';

const _MAX_MANIFEST_RECS = 3;

/**
 * Adds up to 3 Manifest-sourced resource links to an already-composed answer.
 * Deduplicates against routes already present in answer.links.
 */
export function applyRecommendations(
  answer: BotV2Answer,
  conceptId: string | undefined,
): BotV2Answer {
  try {
    if (!conceptId) return answer;

    // Safety-first answers must never be diluted by recommendations.
    if (answer.riskLevel === 'critical') return answer;

    // Track routes already present to prevent duplicates.
    const seen = new Set(answer.links.map(l => l.route));

    const recs: BotV2Link[] = [];
    for (const resource of appManifest) {
      if (recs.length >= _MAX_MANIFEST_RECS) break;
      if (!resource.conceptIds.includes(conceptId)) continue;
      if (seen.has(resource.route)) continue;
      seen.add(resource.route);
      recs.push({ label: resource.title, route: resource.route });
    }

    if (recs.length === 0) return answer;

    return { ...answer, links: [...answer.links, ...recs] };
  } catch {
    // Safe fallback: never let a Manifest error break the bot answer.
    return answer;
  }
}
