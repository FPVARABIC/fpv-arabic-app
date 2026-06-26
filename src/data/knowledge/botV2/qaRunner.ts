/**
 * BOT V2 — QA Runner.
 *
 * Runs all 50 baseline queries from botQuerySnapshot against the V2 engine
 * and produces a structured comparison report. Phase 3 additions:
 *  - knowledgeNodeFound / usesKnowledgeNode per entry
 *  - QAValidation block: coverage, safety-node source-hints, shortAnswer length
 *
 * Usage (browser console or Node with tsx):
 *   import { runQA } from './qaRunner';
 *   console.log(runQA().summary);
 */

import { botQuerySnapshot, type BotQuerySnapshot } from '../botQuerySnapshot';
import { analyzeAndComposeBotV2Answer } from './engine';
import { botKnowledgeBase } from './knowledgeBase';
import { getKnowledgeForConcept } from './knowledgeResolver';
import type { BotConceptId } from '../botConceptRegistry';
import type { BotV2Answer, BotV2AnswerMode } from './types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type QAVerdict = 'same' | 'improved' | 'risky' | 'needs_review';

export interface QAValidation {
  violations: string[];
  allConceptsCovered: boolean;
  criticalNodesHaveNoSourceHints: boolean;
  shortAnswerLengthOk: boolean;
}

export interface QAEntry {
  id: string;
  query: string;
  /** Old NLU intent from snapshot. */
  oldIntent: string;
  /** Old expected answer mode from snapshot. */
  oldMode: string;
  v2ConceptId: string | undefined;
  v2Mode: BotV2AnswerMode;
  v2SafetyLevel: string;
  v2RiskLevel: string;
  verdict: QAVerdict;
  verdictReason: string;
  knownIssue?: string;
  /** True when a knowledge node exists for the matched concept. */
  knowledgeNodeFound: boolean;
  /** True when the answer mode actually consumed a knowledge node. */
  usesKnowledgeNode: boolean;
  /** Always false — no lesson body text is copied. */
  hasLessonTextCopy: false;
  chipsCount: number;
  stepsCount: number;
}

export interface QAReport {
  entries: QAEntry[];
  summary: {
    total: number;
    same: number;
    improved: number;
    risky: number;
    needsReview: number;
  };
  riskyEntries: QAEntry[];
  needsReviewEntries: QAEntry[];
  criticalSafetyEntries: QAEntry[];
  validation: QAValidation;
}

// ── Verdict derivation ────────────────────────────────────────────────────────

// Maps old expectedAnswerMode → acceptable V2 modes (verdict = "same")
const ACCEPTABLE_MODES: Record<string, BotV2AnswerMode[]> = {
  safety_halt:        ['safety_first'],
  out_of_domain:      ['clarification_menu'],
  clarification_menu: ['clarification_menu'],
  app_guide:          ['app_navigation'],
  beginner_guidance:  ['build_roadmap', 'app_navigation'],
  general_guidance:   ['direct_short_answer', 'definition', 'troubleshooting', 'build_roadmap', 'clarification_menu'],
  bank:               ['direct_short_answer', 'definition', 'troubleshooting'],
  betaflight_broad:   ['direct_short_answer', 'troubleshooting'],
  advanced_technical: ['direct_short_answer', 'definition', 'troubleshooting'],
  concept_explanation:['definition', 'direct_short_answer'],
  troubleshooting_core:['troubleshooting', 'direct_short_answer'],
  no_match:           ['clarification_menu', 'safety_first', 'direct_short_answer', 'troubleshooting'],
};

// Modes that clearly improve over the baseline
const IMPROVED_MODES: Record<string, BotV2AnswerMode[]> = {
  general_guidance:   ['build_roadmap'],
  no_match:           ['safety_first'],
  bank:               ['troubleshooting'],
  advanced_technical: ['definition'],
  beginner_guidance:  ['build_roadmap'],
};

function deriveVerdict(snapshot: BotQuerySnapshot, answer: BotV2Answer): [QAVerdict, string] {
  const v2Mode = answer.mode;
  const oldMode = snapshot.expectedAnswerMode;

  // Safety regression check: old said safety_halt but V2 doesn't → risky
  if (oldMode === 'safety_halt' && v2Mode !== 'safety_first') {
    return ['risky', `old=safety_halt but V2=${v2Mode}`];
  }

  // Critical query in safety category that old missed
  if (snapshot.category === 'safety' && answer.riskLevel === 'critical') {
    if (oldMode === 'no_match' || oldMode === 'bank') {
      return ['improved', `V2 correctly escalates to safety_first (old missed with ${oldMode})`];
    }
    if (oldMode === 'safety_halt') {
      return ['same', 'both handle as safety'];
    }
  }

  // V2 gives critical for non-safety category — needs review
  if (answer.riskLevel === 'critical' && snapshot.category !== 'safety') {
    return ['needs_review', `V2 riskLevel=critical for category=${snapshot.category}`];
  }

  // Check improved modes first
  const improvedList = IMPROVED_MODES[oldMode];
  if (improvedList?.includes(v2Mode)) {
    return ['improved', `V2 mode=${v2Mode} improves over old=${oldMode}${snapshot.knownIssue ? ' (known issue fixed)' : ''}`];
  }

  // Check acceptable modes
  const acceptable = ACCEPTABLE_MODES[oldMode];
  if (acceptable?.includes(v2Mode)) {
    if (snapshot.knownIssue && oldMode !== 'bank') {
      return ['improved', `V2 mode=${v2Mode} resolves known issue`];
    }
    return ['same', `V2 mode=${v2Mode} is acceptable for old=${oldMode}`];
  }

  return ['needs_review', `V2 mode=${v2Mode} vs old=${oldMode} — manual check needed`];
}

// ── Important checks (spec-mandated) ─────────────────────────────────────────

interface ImportantCheck {
  id: string;
  query: string;
  expectMode?: BotV2AnswerMode;
  expectNotCritical?: boolean;
  expectCritical?: boolean;
  expectNotFpvAnswer?: boolean;
}

const IMPORTANT_CHECKS: ImportantCheck[] = [
  { id: 'SPEC-1', query: 'كيف أصنع درون؟',                   expectMode: 'build_roadmap' },
  { id: 'SPEC-2', query: 'أريد أصنع كوادكابتر',              expectMode: 'build_roadmap' },
  { id: 'SPEC-3', query: 'Motor Test بدون مراوح',             expectNotCritical: true },
  { id: 'SPEC-4', query: 'هل أختبر المحركات مع مراوح مركبة؟', expectCritical: true, expectMode: 'safety_first' },
  { id: 'SPEC-5', query: 'البطارية انتفخت',                   expectCritical: true, expectMode: 'safety_first' },
  { id: 'SPEC-6', query: 'دخان من الدرون',                    expectCritical: true, expectMode: 'safety_first' },
  { id: 'SPEC-7', query: 'ما هي عاصمة فرنسا؟',               expectNotFpvAnswer: true },
];

function runImportantChecks(): { checks: string[]; allPassed: boolean } {
  const results: string[] = [];
  let allPassed = true;

  for (const check of IMPORTANT_CHECKS) {
    const answer = analyzeAndComposeBotV2Answer(check.query);
    const fails: string[] = [];

    if (check.expectMode && answer.mode !== check.expectMode) {
      fails.push(`mode=${answer.mode} (expected ${check.expectMode})`);
    }
    if (check.expectNotCritical && answer.riskLevel === 'critical') {
      fails.push(`riskLevel=critical (expected NOT critical)`);
    }
    if (check.expectCritical && answer.riskLevel !== 'critical') {
      fails.push(`riskLevel=${answer.riskLevel} (expected critical)`);
    }
    if (check.expectNotFpvAnswer && answer.mode !== 'clarification_menu') {
      fails.push(`mode=${answer.mode} (expected clarification_menu for OOD query)`);
    }

    const status = fails.length === 0 ? '✓ PASS' : '✗ FAIL';
    if (fails.length > 0) allPassed = false;

    results.push(
      `${status} ${check.id}: "${check.query}" → mode=${answer.mode} risk=${answer.riskLevel}` +
      (fails.length ? ` | FAILURES: ${fails.join(', ')}` : ''),
    );
  }

  return { checks: results, allPassed };
}

// ── Knowledge validation ──────────────────────────────────────────────────────

const ALL_CONCEPT_IDS: BotConceptId[] = [
  'drone_build_basics', 'motor_basic', 'esc_basic', 'flight_controller_basic',
  'receiver_basic', 'vtx_basic', 'propeller_basic', 'wiring_basics',
  'power_battery', 'lipo_safety', 'tx_rx_rule', 'betaflight_basics',
  'gps_basics', 'app_navigation',
];

const CRITICAL_CONCEPT_IDS: BotConceptId[] = ['lipo_safety', 'propeller_basic'];

// Modes whose answers are backed by a knowledge node lookup
const KNOWLEDGE_BACKED_MODES = new Set<BotV2AnswerMode>([
  'safety_first', 'build_roadmap', 'app_navigation',
  'definition', 'troubleshooting', 'direct_short_answer',
]);

function runValidation(): QAValidation {
  const violations: string[] = [];

  const coveredIds = new Set(botKnowledgeBase.map(n => n.conceptId));
  const allConceptsCovered = ALL_CONCEPT_IDS.every(id => coveredIds.has(id));
  if (!allConceptsCovered) {
    const missing = ALL_CONCEPT_IDS.filter(id => !coveredIds.has(id));
    violations.push(`Missing knowledge nodes: ${missing.join(', ')}`);
  }

  let criticalNodesHaveNoSourceHints = true;
  for (const id of CRITICAL_CONCEPT_IDS) {
    const node = getKnowledgeForConcept(id);
    if (node?.sourceSearchHints && node.sourceSearchHints.length > 0) {
      criticalNodesHaveNoSourceHints = false;
      violations.push(`Critical node '${id}' has sourceSearchHints (forbidden)`);
    }
  }

  let shortAnswerLengthOk = true;
  for (const node of botKnowledgeBase) {
    const sentences = node.shortAnswer.split(/[.!؟]/).filter(s => s.trim().length > 0);
    if (sentences.length > 2) {
      shortAnswerLengthOk = false;
      violations.push(`Node '${node.conceptId}' shortAnswer has ${sentences.length} sentences (max 2)`);
    }
    if (node.steps && node.steps.length > 6) {
      violations.push(`Node '${node.conceptId}' has ${node.steps.length} steps (max 6)`);
    }
    if (node.chips && node.chips.length > 3) {
      violations.push(`Node '${node.conceptId}' has ${node.chips.length} chips (max 3)`);
    }
  }

  return { violations, allConceptsCovered, criticalNodesHaveNoSourceHints, shortAnswerLengthOk };
}

// ── Main runner ───────────────────────────────────────────────────────────────

export function runQA(): QAReport {
  const entries: QAEntry[] = [];

  for (const snapshot of botQuerySnapshot) {
    const answer = analyzeAndComposeBotV2Answer(snapshot.query);
    const [verdict, verdictReason] = deriveVerdict(snapshot, answer);

    const rawConceptId = answer.debug.conceptId;
    const knowledgeNodeFound =
      rawConceptId !== undefined
        ? getKnowledgeForConcept(rawConceptId as BotConceptId) !== undefined
        : false;
    const usesKnowledgeNode = KNOWLEDGE_BACKED_MODES.has(answer.mode) && knowledgeNodeFound;

    entries.push({
      id: snapshot.id,
      query: snapshot.query,
      oldIntent: snapshot.nluIntent,
      oldMode: snapshot.expectedAnswerMode,
      v2ConceptId: answer.debug.conceptId,
      v2Mode: answer.mode,
      v2SafetyLevel: answer.debug.safetyLevel,
      v2RiskLevel: answer.riskLevel,
      verdict,
      verdictReason,
      knownIssue: snapshot.knownIssue,
      knowledgeNodeFound,
      usesKnowledgeNode,
      hasLessonTextCopy: false,
      chipsCount: answer.chips.length,
      stepsCount: answer.steps?.length ?? 0,
    });
  }

  const counts = { same: 0, improved: 0, risky: 0, needs_review: 0 };
  for (const e of entries) counts[e.verdict === 'needs_review' ? 'needs_review' : e.verdict]++;

  const importantChecks = runImportantChecks();
  const validation = runValidation();

  // Log to console for easy browser-console inspection
  console.group('[Bot V2 QA Report]');
  for (const e of entries) {
    const icon = e.verdict === 'risky' ? '🔴' : e.verdict === 'improved' ? '✅' : e.verdict === 'needs_review' ? '🟡' : '⚪';
    const kn = e.knowledgeNodeFound ? '📚' : '—';
    console.log(`${icon}${kn} ${e.id} | ${e.v2Mode} | risk=${e.v2RiskLevel} | chips=${e.chipsCount} steps=${e.stepsCount} | ${e.verdict} — ${e.verdictReason}`);
  }
  console.log('\n--- Important Checks ---');
  for (const line of importantChecks.checks) console.log(line);
  console.log('\n--- Knowledge Validation ---');
  console.log(`All 14 concepts covered: ${validation.allConceptsCovered ? '✓' : '✗'}`);
  console.log(`Critical nodes no source hints: ${validation.criticalNodesHaveNoSourceHints ? '✓' : '✗'}`);
  console.log(`Short answer length ok: ${validation.shortAnswerLengthOk ? '✓' : '✗'}`);
  if (validation.violations.length > 0) {
    console.log('Violations:');
    for (const v of validation.violations) console.log(`  ✗ ${v}`);
  } else {
    console.log('No violations ✓');
  }
  console.log(`\nSummary: same=${counts.same} improved=${counts.improved} risky=${counts.risky} needs_review=${counts.needs_review}`);
  console.log(`Important checks: ${importantChecks.allPassed ? 'ALL PASSED ✓' : 'SOME FAILED ✗'}`);
  console.groupEnd();

  return {
    entries,
    summary: {
      total: entries.length,
      same: counts.same,
      improved: counts.improved,
      risky: counts.risky,
      needsReview: counts.needs_review,
    },
    riskyEntries: entries.filter(e => e.verdict === 'risky'),
    needsReviewEntries: entries.filter(e => e.verdict === 'needs_review'),
    criticalSafetyEntries: entries.filter(e => e.v2RiskLevel === 'critical'),
    validation,
  };
}
