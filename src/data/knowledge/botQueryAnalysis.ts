/**
 * BOT V2 — Shared query analysis module.
 *
 * Produces a single QueryAnalysis object from raw user input, using
 * botConceptRegistry as the sole source of concept/safety matching.
 * Consumed by the Bot V2 engine (botV2/engine.ts).
 *
 * Implemented fixes:
 *  - 'flight controller' added to FPV domain tokens (fix BL-FC-04)
 *  - propeller_basic negation guard: only critical when affirmative danger
 *    phrase present (fix BL-BF-05 — "Motor Test بدون مراوح" not critical)
 *  - requiredAnchors: ANY-ONE semantics implemented as concept gate
 *    (prevents lipo_safety matching fire/smoke with no battery context)
 *  - longestMatchLength tiebreaker: tx_rx_rule beats wiring_basics on
 *    relational TX/RX phrases (fixes BL-RX-05, BL-MIXED-03)
 */

import {
  botConceptRegistry,
  type BotConceptId,
  type SafetyLevel,
  type BotConcept,
} from './botConceptRegistry';

// ── QueryAnalysis type ────────────────────────────────────────────────────────

export interface QueryAnalysis {
  /** Normalized form used for all internal matching. Never show to user. */
  normalizedQuery: string;
  /** True when at least one FPV domain token is present in the query. */
  isFpvDomain: boolean;
  /**
   * Primary matched concept. Tie-breaking: effective safety level wins first;
   * then more matched synonyms; then longest matched synonym; then registry order.
   * Undefined when no concept synonyms matched.
   */
  conceptId?: BotConceptId;
  /** All concept IDs that had at least one synonym match. */
  matchedConceptIds: BotConceptId[];
  /**
   * Inferred intent string derived from the primary matched concept.
   * Values mirror BotIntent from botNlu.ts — safe to compare directly.
   * Fallbacks: 'unclear' (FPV domain, no concept match) | 'out_of_domain'.
   */
  intent: string;
  /** Highest effective SafetyLevel among all matched concepts. 'none' when no match. */
  safetyLevel: SafetyLevel;
  /** Raw synonym strings (from the registry) that triggered a concept match. */
  matchedTerms: string[];
  /**
   * 'matched'   — at least one concept matched AND the query is FPV-domain.
   * 'unmatched' — no concept hit, or query is outside the FPV domain.
   */
  confidence: 'matched' | 'unmatched';
}

// ── Arabic normalization ──────────────────────────────────────────────────────

export function normalizeArabicQuery(input: string): string {
  let s = input.trim().toLowerCase();
  // Remove diacritics (tashkeel) and tatweel
  s = s.replace(/[ً-ٰٟـ]/g, '');
  // Alef variants → ا
  s = s.replace(/[أإآٱ]/g, 'ا');
  // alef maqsura → ya; ta marbuta → ha (for matching only)
  s = s.replace(/ى/g, 'ي');
  s = s.replace(/ة/g, 'ه');
  // waw with hamza; ya with hamza
  s = s.replace(/ؤ/g, 'و');
  s = s.replace(/ئ/g, 'ي');
  // Arabic/Latin punctuation → space
  s = s.replace(/[؟?!،؛:.،,؍]/g, ' ');
  // Collapse Arabic elongation (3+ repeated chars → 2)
  s = s.replace(/(.)\1{2,}/g, '$1$1');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// ── FPV domain detection ──────────────────────────────────────────────────────

const FPV_DOMAIN_TOKENS: readonly string[] = [
  // Arabic terms
  'درون', 'الدرون', 'كواد', 'كوادكابتر', 'كوادكوبتر',
  'طائره', 'طائره رباعيه', 'مسيره', 'مسيرات',
  'محرك', 'محركات', 'موتور', 'موتورات',
  'مروحه', 'مراوح', 'بروب', 'بروبس',
  'بطاريه', 'ليبو',
  'ريسيفر', 'رسيفر', 'ريموت',
  'فلايت', 'كنترولر',
  'سموك', 'لحام', 'لحم', 'سولدر',
  'بيتافلايت', 'بيتفلايت', 'بتافلاي',
  'اسك', 'اوصل', 'توصيل',
  'نظاره', 'نظارات',
  'فريم', 'هيكل',
  // English / mixed technical tokens
  'betaflight', 'fc', 'esc', 'vtx', 'rx', 'tx', 'lipo', 'gps', 'elrs',
  'vbat', 'gnd', '5v', 'uart', 'dshot', 'sbus', 'crsf', 'osd', 'pid',
  'blackbox', 'failsafe', 'arm', 'arming', 'motors', 'motor', 'prop',
  'props', 'propeller', 'fpv', 'quad', 'drone', 'quadcopter', 'o4', 'dji',
  'expresslrs', 'bf', 'cli', 'xt60',
  // Multi-word English phrases
  'flight controller',
];

const _normalizedFpvTokens: readonly string[] =
  FPV_DOMAIN_TOKENS.map(t => normalizeArabicQuery(t));

export function detectFpvDomain(query: string): boolean {
  const norm = normalizeArabicQuery(query);
  return _normalizedFpvTokens.some(t => t.length >= 2 && norm.includes(t));
}

// ── Concept → intent mapping ──────────────────────────────────────────────────

const CONCEPT_INTENT: Record<BotConceptId, string> = {
  drone_build_basics:       'build_help',
  motor_basic:              'motors',
  esc_basic:                'esc',
  flight_controller_basic:  'flight_controller',
  receiver_basic:           'receiver',
  vtx_basic:                'vtx_video',
  propeller_basic:          'safety_warning',
  wiring_basics:            'wiring',
  power_battery:            'power_battery',
  lipo_safety:              'lipo_safety',
  tx_rx_rule:               'tx_rx',
  betaflight_basics:        'betaflight',
  gps_basics:               'gps',
  app_navigation:           'app_guide',
};

// ── Safety level ordering ─────────────────────────────────────────────────────

const SAFETY_ORDER: Record<SafetyLevel, number> = {
  none: 0,
  informational: 1,
  critical: 2,
};

function higherSafety(a: SafetyLevel, b: SafetyLevel): SafetyLevel {
  return SAFETY_ORDER[a] >= SAFETY_ORDER[b] ? a : b;
}

// ── Propeller negation guard ──────────────────────────────────────────────────

const PROPELLER_CRITICAL_PHRASES: readonly string[] = [
  'مع مراوح', 'مع مروحه', 'مراوح مركبه', 'المراوح مركبه',
  'مراوح موجوده', 'props on', 'propellers on', 'مراوح مثبته',
];

const _normalizedPropCriticalPhrases: readonly string[] =
  PROPELLER_CRITICAL_PHRASES.map(p => normalizeArabicQuery(p));

function getEffectiveSafetyLevel(
  concept: BotConcept,
  normalizedQuery: string,
): SafetyLevel {
  if (concept.id !== 'propeller_basic') return concept.safetyLevel;
  const hasDanger = _normalizedPropCriticalPhrases.some(p => normalizedQuery.includes(p));
  return hasDanger ? 'critical' : 'informational';
}

// ── Concept matching ──────────────────────────────────────────────────────────

function _isWholeTokenMatch(text: string, token: string): boolean {
  const SEPARATORS = ' /-_';
  let idx = 0;
  while ((idx = text.indexOf(token, idx)) !== -1) {
    const before = idx === 0 || SEPARATORS.includes(text[idx - 1]);
    const afterIdx = idx + token.length;
    const after = afterIdx >= text.length || SEPARATORS.includes(text[afterIdx]);
    if (before && after) return true;
    idx += 1;
  }
  return false;
}

interface ConceptMatch {
  concept: BotConcept;
  matchedSynonyms: string[];
  longestMatchLength: number;
  effectiveSafetyLevel: SafetyLevel;
}

const _normalizedRegistry: Array<{
  concept: BotConcept;
  normalizedSynonyms: Array<{ raw: string; normalized: string }>;
  normalizedAnchors: string[] | undefined;
}> = botConceptRegistry.map(concept => ({
  concept,
  normalizedSynonyms: concept.synonyms.map(s => ({
    raw: s,
    normalized: normalizeArabicQuery(s),
  })),
  normalizedAnchors: concept.requiredAnchors?.map(a => normalizeArabicQuery(a)),
}));

function matchConceptsInQuery(normalizedQuery: string): ConceptMatch[] {
  const matches: ConceptMatch[] = [];

  for (const { concept, normalizedSynonyms, normalizedAnchors } of _normalizedRegistry) {
    if (normalizedAnchors && normalizedAnchors.length > 0) {
      const anchorHit = normalizedAnchors.some(a => {
        if (a.length < 1) return false;
        return a.length <= 3
          ? _isWholeTokenMatch(normalizedQuery, a)
          : normalizedQuery.includes(a);
      });
      if (!anchorHit) continue;
    }

    const matchedSynonyms: string[] = [];
    let longestMatchLength = 0;

    for (const { raw, normalized } of normalizedSynonyms) {
      if (normalized.length < 2) continue;
      const hit = normalized.length <= 3
        ? _isWholeTokenMatch(normalizedQuery, normalized)
        : normalizedQuery.includes(normalized);
      if (!hit) continue;
      matchedSynonyms.push(raw);
      if (normalized.length > longestMatchLength) longestMatchLength = normalized.length;
    }

    if (matchedSynonyms.length === 0) continue;

    const effectiveSafetyLevel = getEffectiveSafetyLevel(concept, normalizedQuery);
    matches.push({ concept, matchedSynonyms, longestMatchLength, effectiveSafetyLevel });
  }

  return matches;
}

// ── Primary concept selection ─────────────────────────────────────────────────

function _reduceByTiebreaker(ms: ConceptMatch[]): ConceptMatch {
  return ms.reduce((best, candidate) => {
    const bs = SAFETY_ORDER[best.effectiveSafetyLevel];
    const cs = SAFETY_ORDER[candidate.effectiveSafetyLevel];
    if (cs > bs) return candidate;
    if (bs > cs) return best;
    if (candidate.matchedSynonyms.length > best.matchedSynonyms.length) return candidate;
    if (best.matchedSynonyms.length > candidate.matchedSynonyms.length) return best;
    if (candidate.longestMatchLength > best.longestMatchLength) return candidate;
    return best;
  });
}

function selectPrimary(matches: ConceptMatch[]): ConceptMatch | undefined {
  if (matches.length === 0) return undefined;

  const result = _reduceByTiebreaker(matches);

  if (result.concept.id === 'drone_build_basics' && result.longestMatchLength <= 5) {
    const others = matches.filter(m => m.concept.id !== 'drone_build_basics');
    if (others.length > 0) return _reduceByTiebreaker(others);
  }

  return result;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function analyzeQuery(query: string): QueryAnalysis {
  const normalizedQuery = normalizeArabicQuery(query);
  const isFpvDomain = detectFpvDomain(query);

  const matches = matchConceptsInQuery(normalizedQuery);
  const primary = selectPrimary(matches);

  const matchedConceptIds: BotConceptId[] = matches.map(m => m.concept.id);
  const matchedTerms: string[] = matches.flatMap(m => m.matchedSynonyms);

  const safetyLevel: SafetyLevel = matches.reduce<SafetyLevel>(
    (acc, m) => higherSafety(acc, m.effectiveSafetyLevel),
    'none',
  );

  let intent: string;
  if (primary) {
    intent = CONCEPT_INTENT[primary.concept.id];
  } else if (isFpvDomain) {
    intent = 'unclear';
  } else {
    intent = 'out_of_domain';
  }

  const confidence: 'matched' | 'unmatched' =
    primary !== undefined && isFpvDomain ? 'matched' : 'unmatched';

  return {
    normalizedQuery,
    isFpvDomain,
    conceptId: primary?.concept.id,
    matchedConceptIds,
    intent,
    safetyLevel,
    matchedTerms,
    confidence,
  };
}
