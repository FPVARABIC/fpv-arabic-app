/**
 * BOT V2 — Single contextual-warning authority.
 *
 * This module is the ONLY place in the bot that decides:
 *   - whether a warning is shown at all,
 *   - its severity ('none' | 'caution' | 'critical'),
 *   - its exact kind (ContextualWarningKind),
 *   - its exact displayed text.
 *
 * Neither UI consumer (BotV2Overlay.tsx, BotV2AssistantView.tsx) may
 * independently decide warning visibility or severity — they only render
 * this result. Every mode branch in composer.ts spreads this SAME computed
 * result into its returned BotV2Answer, so it is architecturally impossible
 * for the two UI surfaces to disagree, and impossible for `warning` to be
 * set while `warningSeverity` is 'none' (enforced by the discriminated
 * union type below — there is no code path that can construct that
 * combination).
 *
 * Priority (highest first), computed once per query:
 *   1. immediate_hazard (critical) — reuses the EXISTING classifyV2Risk
 *      result from safety.ts verbatim; never recomputed here, so the two
 *      can never disagree. This is the only kind that can carry
 *      severity 'critical'.
 *   2. Tier 2 (caution), fixed sub-order when more than one matches:
 *        lipo_charge > first_power_up > motor_test > soldering_polarity
 *   3. Tier 3 (caution), fixed sub-order:
 *        vtx_without_antenna > lipo_storage
 *   4. none
 *
 * Multiple simultaneously-matched non-critical kinds resolve to exactly ONE
 * kind via the fixed order above — warnings for different hazards are never
 * concatenated (a deliberate simplicity/safety choice: composing multi-hazard
 * text correctly is strictly harder to get right than picking the single
 * highest-priority relevant warning, and the priority order already ensures
 * the most physically dangerous applicable action wins).
 *
 * This classifier does NOT use analysis.conceptId / matchedConceptIds at
 * all — it is intentionally independent of which broad concept the mode
 * selector chose, so a warning is never attached "because the query matched
 * a broad concept" (the exact defect being corrected). It looks only at
 * concrete phrase/word signals in the normalized query text.
 */

import { normalizeArabicQuery } from '../botQueryAnalysis';
import type { BotConceptId } from '../botConceptRegistry';
import type { V2SafetyResult } from './safety';
import { getKnowledgeForConcept } from './knowledgeResolver';

// ── Taxonomy ───────────────────────────────────────────────────────────────

export type ContextualWarningKind =
  | 'none'
  | 'immediate_hazard'
  | 'first_power_up'
  | 'motor_test'
  | 'lipo_charge'
  | 'lipo_storage'
  | 'soldering_polarity'
  | 'vtx_without_antenna';

export type WarningSeverity = 'none' | 'caution' | 'critical';

/**
 * Discriminated union — the ONLY two shapes this module (or anything
 * downstream) can ever produce. There is no constructor path for
 * { warningSeverity: 'none', warning: '<some string>' } or for
 * { warningSeverity: 'caution', warning: undefined }.
 */
export type ContextualWarningResult =
  | { warningSeverity: 'none'; warning?: undefined; warningKind?: undefined }
  | {
      warningSeverity: 'caution' | 'critical';
      warning: string;
      warningKind: Exclude<ContextualWarningKind, 'none'>;
    };

// ── Immediate-hazard warning text (critical) ──────────────────────────────
// Moved here from composer.ts so this module is the sole warning authority
// for EVERY severity, not just the caution tier. Text is resolved dynamically
// from the SAME knowledge nodes composer.ts previously read inline
// (node?.safetyNotes per hazard→concept mapping) — verbatim, zero content
// change, zero duplication/drift risk against knowledgeBase.ts.

const HAZARD_TO_SAFETY_CONCEPT: Partial<Record<string, BotConceptId>> = {
  swollen_lipo: 'lipo_safety',
  smoke_fire: 'lipo_safety',
  sparks: 'wiring_basics',
  overheating: 'wiring_basics',
  props_mounted: 'propeller_basic',
  electrical_danger: 'wiring_basics',
  // generic_critical → no concept; uses the inline fallback below, exactly
  // as composer.ts's _GENERIC_SAFETY_WARNING did previously.
};

const GENERIC_IMMEDIATE_HAZARD_WARNING =
  'لا تتجاهل تحذيرات الأمان — الكوادكابتر يمكن أن يسبب حريقاً أو إصابة.';

function _resolveImmediateHazardWarning(hazard: string): string {
  const conceptId = HAZARD_TO_SAFETY_CONCEPT[hazard];
  const node = conceptId ? getKnowledgeForConcept(conceptId) : undefined;
  return node?.safetyNotes ?? GENERIC_IMMEDIATE_HAZARD_WARNING;
}

// ── Contextual (non-critical) warning text, one per kind ──────────────────
// Preserves the SAFETY MEANING of the previous combined
// drone_build_basics.safetyNotes string (Smoke Stopper + propeller removal),
// but as two independently-selected warnings instead of one blanket string
// attached to every broad build query.

const CONTEXTUAL_WARNING_TEXT: Record<
  Exclude<ContextualWarningKind, 'none' | 'immediate_hazard'>,
  string
> = {
  first_power_up:
    'قبل أول توصيل للبطارية: استخدم Smoke Stopper، وتحقق من القطبية والاستمرارية بالمولتيمتر، وأزل جميع المراوح.',
  motor_test:
    'أزل جميع المراوح قبل أي اختبار للمحركات — لا تشغّل المحركات أبداً والمراوح مركبة.',
  lipo_charge:
    'لا تشحن بطارية LiPo إلا بالقرب منك وبعيداً عن المواد القابلة للاشتعال — لا تتركها بلا رقابة أثناء الشحن.',
  lipo_storage:
    'خزّن بطارية LiPo على حوالي 3.8 فولت لكل خلية عند التخزين الطويل، بعيداً عن الحرارة.',
  soldering_polarity:
    'تحقق من القطبية (+ و-) قبل التوصيل، وافصل البطارية أثناء اللحام — القطبية المعكوسة أو الشرارة تعني short circuit.',
  vtx_without_antenna: 'لا تشغّل الـ VTX بدون هوائي متصل — يتلف خلال ثوانٍ.',
};

// ── Signal groups (normalized once at module load) ────────────────────────

const _norm = (arr: readonly string[]): string[] => arr.map(normalizeArabicQuery);

const CONNECT_VERB_SIGNALS = _norm([
  'اوصل', 'أوصل', 'وصل', 'وصلت', 'توصيل', 'ربط', 'connect', 'plug',
]);
const BATTERY_NOUN_SIGNALS = _norm(['بطاريه', 'ليبو', 'lipo', 'battery']);
const FIRST_TIME_SIGNALS = _norm(['اول مره', 'الان', 'now', 'first time', 'for the first time']);
const SMOKE_STOPPER_SIGNALS = _norm(['smoke stopper', 'سموك ستوبر', 'سموك ستوبير', 'smokestopper']);

// MSA only: a colloquial imperative variant and an Arabic-English hybrid
// slang phrase for "test the motor(s)" were removed — the remaining plural
// MSA phrases already cover this concept, with singular MSA forms added
// alongside them.
const MOTOR_TEST_SIGNALS = _norm([
  'اختبار المحركات', 'اختبر المحركات', 'تجربة المحركات',
  'اختبار المحرك', 'اختبر المحرك', 'motor test', 'test motors', 'test the motors',
]);

const CHARGE_VERB_SIGNALS = _norm(['اشحن', 'شحن', 'تشحن', 'charge', 'charging']);

const STORAGE_SIGNALS = _norm([
  'تخزين البطاريه', 'تخزين ليبو', 'تخزين آمن', 'battery storage', 'storage voltage', 'store the battery',
]);

const SOLDERING_SIGNALS = _norm(['لحم', 'لحام', 'solder', 'soldering']);
const POLARITY_SIGNALS = _norm(['قطبيه', 'polarity']);
// "شرر" (sparks) is standard/classical Arabic vocabulary, not colloquial.
const SPARK_SIGNALS = _norm(['شرر']);
// A past-tense completion report ("انتهيت من اللحام" — "I already finished
// soldering") is not a live soldering action or question — only guards the
// bare soldering-verb trigger, never the polarity/spark triggers (a message
// like "انتهيت من التوصيل، هل القطبية صحيحة؟" is still a live question about
// polarity and must still warn).
const SOLDERING_COMPLETION_SIGNALS = _norm(['انتهيت', 'finished', 'done']);

const VTX_SIGNALS = _norm(['vtx', 'vrx']);
const ANTENNA_SIGNALS = _norm(['بدون هوائي', 'هوائي', 'antenna']);

function _hasAny(norm: string, signals: readonly string[]): boolean {
  return signals.some(s => s.length >= 2 && norm.includes(s));
}

// ── Negation-aware matching (F-1 correction) ────────────────────────────────
//
// Formal MSA negation particles that can precede an action verb/gerund and
// negate it — "لا أريد اختبار المحركات" (I don't want to test the motors),
// "لن أشحن البطارية" (I will not charge the battery), "لم أختبر المحركات"
// (I have not tested the motors). Deliberately narrow: no dialect forms, no
// general sentence-level rejection. Negation is checked ONLY against the
// single word (or two-word "لا أريد" construction) immediately preceding
// the SPECIFIC matched action phrase — never as a blanket switch that
// disables a whole message merely for containing لا/لم/لن somewhere.
//
// This is the ONLY place negation is evaluated for these two signal groups
// (motor-test, charge-verb). intentClassifier.ts derives its first_power_up/
// motor_test/lipo_charge/lipo_storage/soldering intents by calling
// classifyContextualWarning() directly, so fixing negation here is also the
// single source of truth for intent classification — no separate negation
// phrase list is duplicated there.
const NEGATION_PARTICLES = _norm(['لا', 'لم', 'لن']);
const WANT_VERB = _norm(['اريد'])[0];

/**
 * True if the specific occurrence of `matchedPhrase` starting at `idx` is
 * immediately negated — i.e. the word right before it is لا/لم/لن, or the
 * word right before it is "أريد" ("want") and the word before THAT is
 * لا (the "لا أريد <gerund>" construction, e.g. "لا أريد شحن البطارية").
 */
function _isNegatedMatch(norm: string, idx: number): boolean {
  const before = norm.slice(0, idx).trim();
  if (!before) return false;
  const words = before.split(/\s+/);
  const last = words[words.length - 1];
  if (NEGATION_PARTICLES.includes(last)) return true;
  const secondLast = words[words.length - 2];
  return last === WANT_VERB && secondLast !== undefined && NEGATION_PARTICLES.includes(secondLast);
}

/**
 * Like _hasAny, but ignores a match that is immediately negated. When
 * several signals in the group match at different (or overlapping/
 * substring) positions, only the LEFTMOST occurrence across the whole
 * group is evaluated for negation — this avoids a shorter signal that
 * happens to be a substring of a longer one (e.g. "شحن" inside "اشحن")
 * being found at a later, mid-word position that would otherwise dodge
 * the negation check on the real (longer, earlier) match.
 */
function _hasUnnegatedAny(norm: string, signals: readonly string[]): boolean {
  let bestIdx = -1;
  for (const s of signals) {
    if (s.length < 2) continue;
    const idx = norm.indexOf(s);
    if (idx === -1) continue;
    if (bestIdx === -1 || idx < bestIdx) bestIdx = idx;
  }
  if (bestIdx === -1) return false;
  return !_isNegatedMatch(norm, bestIdx);
}

// ── Public classifier ──────────────────────────────────────────────────────

export function classifyContextualWarning(
  normalizedQuery: string,
  safety: V2SafetyResult,
): ContextualWarningResult {
  // 1. Immediate hazard always wins — reuses the already-computed critical
  //    classification. Never recomputed here, so mode selection (which also
  //    reads safety.riskLevel directly) and this warning result can never
  //    disagree about whether a query is critical.
  if (safety.riskLevel === 'critical') {
    const hazard = safety.hazard ?? 'generic_critical';
    return {
      warningSeverity: 'critical',
      warningKind: 'immediate_hazard',
      warning: _resolveImmediateHazardWarning(hazard),
    };
  }

  const norm = normalizedQuery;

  // 2. Tier 2 — fixed sub-order: lipo_charge > first_power_up > motor_test > soldering_polarity
  // F-1: the charge VERB (the action) must be unnegated; the battery NOUN
  // is not itself something that gets "negated" as an action, so it is
  // still checked with the plain _hasAny.
  if (_hasUnnegatedAny(norm, CHARGE_VERB_SIGNALS) && _hasAny(norm, BATTERY_NOUN_SIGNALS)) {
    return { warningSeverity: 'caution', warningKind: 'lipo_charge', warning: CONTEXTUAL_WARNING_TEXT.lipo_charge };
  }

  const hasBatteryConnect = _hasAny(norm, CONNECT_VERB_SIGNALS) && _hasAny(norm, BATTERY_NOUN_SIGNALS);
  const hasFirstTime = _hasAny(norm, FIRST_TIME_SIGNALS);
  const hasSmokeStopper = _hasAny(norm, SMOKE_STOPPER_SIGNALS);
  if (hasSmokeStopper || (hasBatteryConnect && hasFirstTime)) {
    return {
      warningSeverity: 'caution',
      warningKind: 'first_power_up',
      warning: CONTEXTUAL_WARNING_TEXT.first_power_up,
    };
  }

  // F-1: only an UNNEGATED motor-test signal triggers this — "لا أريد
  // اختبار المحركات" / "لن أختبر المحركات" / "لم أختبر المحركات" must not.
  if (_hasUnnegatedAny(norm, MOTOR_TEST_SIGNALS)) {
    // Deliberate design choice: presence of a propeller-negation phrase
    // (e.g. "بدون مراوح") only prevents ESCALATION to immediate_hazard
    // (handled entirely by safety.ts, above, unchanged) — it does not
    // suppress this caution-level reminder. Reminding a user who already
    // states props are off to keep them off is safe and non-repetitive
    // (shown once per matching query, not on every subsequent turn).
    return { warningSeverity: 'caution', warningKind: 'motor_test', warning: CONTEXTUAL_WARNING_TEXT.motor_test };
  }

  const hasSoldering = _hasAny(norm, SOLDERING_SIGNALS) && !_hasAny(norm, SOLDERING_COMPLETION_SIGNALS);
  const hasPolarity = _hasAny(norm, POLARITY_SIGNALS);
  const hasSpark = _hasAny(norm, SPARK_SIGNALS);
  if (hasSoldering || hasPolarity || hasSpark) {
    return {
      warningSeverity: 'caution',
      warningKind: 'soldering_polarity',
      warning: CONTEXTUAL_WARNING_TEXT.soldering_polarity,
    };
  }

  // 3. Tier 3 — fixed sub-order: vtx_without_antenna > lipo_storage
  if (_hasAny(norm, VTX_SIGNALS) && _hasAny(norm, ANTENNA_SIGNALS)) {
    return {
      warningSeverity: 'caution',
      warningKind: 'vtx_without_antenna',
      warning: CONTEXTUAL_WARNING_TEXT.vtx_without_antenna,
    };
  }
  if (_hasAny(norm, STORAGE_SIGNALS)) {
    return { warningSeverity: 'caution', warningKind: 'lipo_storage', warning: CONTEXTUAL_WARNING_TEXT.lipo_storage };
  }

  return { warningSeverity: 'none' };
}

// ── Shared render-decision helper ──────────────────────────────────────────
//
// The ONLY function either UI consumer (BotV2Overlay.tsx,
// BotV2AssistantView.tsx) is allowed to use to decide whether to render the
// SafetyWarning card and which color/icon variant to use. Typed
// structurally (not importing BotV2Answer) to avoid a circular import with
// types.ts, which imports ContextualWarningKind/WarningSeverity from this
// same module.
//
// Returning `null` vs. a populated object is the ONLY branching point in
// either UI file — there is no `riskLevel` check, no `answer.warning &&`
// check, and no independent severity→color mapping duplicated in the two
// UI files. Both call this one function and render exactly what it returns.
export function getWarningCardProps(
  answer: { warning?: string; warningSeverity: WarningSeverity },
): { message: string; type: 'warning' | 'danger' } | null {
  if (answer.warningSeverity === 'none') return null;
  return {
    message: answer.warning as string,
    type: answer.warningSeverity === 'critical' ? 'danger' : 'warning',
  };
}

// ── Minimal warning-repetition deduplication ───────────────────────────────
//
// Called exactly once per turn, in engine.ts, immediately after
// classifyContextualWarning() and BEFORE the result is threaded into
// composeV2Answer() — so this is still a single, centrally-applied decision,
// not something either UI (or the composer) decides independently.
//
// Rule (deliberately minimal): a 'caution' warning is suppressed ONLY when
// its kind is identical to the kind actually SHOWN in the immediately
// previous answer AND the topic has not switched this turn. 'critical' is
// NEVER suppressed. 'none' has nothing to suppress.
//
// "Shown in the immediately previous answer" (not "computed"): the caller
// must pass lastShownWarningKind — the kind from the previous turn's
// PRE-dedup classification, but ONLY if that previous warning was actually
// displayed (i.e., not itself suppressed). Concretely: the caller stores
// undefined instead of the kind whenever a turn suppresses its warning, so
// three consecutive identical-topic turns alternate shown → suppressed →
// shown, rather than going silent forever after the first occurrence. This
// keeps a repeated explicit risky request ("كيف أختبر المحركات؟" asked twice
// in a row) able to show the reminder again on the very next repeat, per the
// requirement that an explicit repeated risky request may show the warning
// again.
export function applyWarningDeduplication(
  raw: ContextualWarningResult,
  lastShownWarningKind: ContextualWarningKind | undefined,
  topicChanged: boolean,
): ContextualWarningResult {
  if (raw.warningSeverity !== 'caution') return raw;
  if (!topicChanged && raw.warningKind === lastShownWarningKind) {
    return { warningSeverity: 'none' };
  }
  return raw;
}
