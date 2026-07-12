/**
 * Real-assertion test suite for the BOT V2 intent/context/warning upgrade.
 *
 * Not application runtime code — a one-off verification harness. Mirrors
 * the project's existing scripts/testCommunityRules.ts convention (plain
 * node:assert/strict, executed via `npx tsx`).
 *
 * Run with:
 *   npx tsx scripts/testBotV2IntentContext.ts
 */

import assert from 'node:assert/strict';
import { analyzeQuery } from '../src/data/knowledge/botQueryAnalysis';
import { classifyV2Risk } from '../src/data/knowledge/botV2/safety';
import { classifyIntent } from '../src/data/knowledge/botV2/intentClassifier';
import { resolveTurn } from '../src/data/knowledge/botV2/sessionContext';
import {
  classifyContextualWarning,
  applyWarningDeduplication,
  getWarningCardProps,
} from '../src/data/knowledge/botV2/contextualWarning';
import {
  analyzeAndComposeBotV2Answer,
  createEmptyContext,
  type AssistantSessionContext,
} from '../src/data/knowledge/botV2/engine';

let passCount = 0;
function check(label: string, fn: () => void) {
  fn();
  passCount++;
  console.log(`  ok — ${label}`);
}

// ─────────────────────────────────────────────────────────────────────────
// Group 1 — Intent classification
// ─────────────────────────────────────────────────────────────────────────
console.log('\n[1] Intent classification');

check('broad build with no specificity -> broad_planning, requiresClarification', () => {
  const q = 'كيف أبني درون FPV؟';
  const r = classifyIntent(q, analyzeQuery(q));
  assert.equal(r.intent, 'broad_planning');
  assert.equal(r.requiresClarification, true);
});

check('cinematic use case named -> broad_planning with useCase=cinematic, no clarification needed', () => {
  const q = 'أريد أبني درون تصوير سينمائي';
  const r = classifyIntent(q, analyzeQuery(q));
  assert.equal(r.intent, 'broad_planning');
  assert.equal(r.entities.useCase, 'cinematic');
  assert.equal(r.requiresClarification, false);
});

check('racing use case named -> broad_planning with useCase=racing, no clarification needed', () => {
  const q = 'أبني درون سباق';
  const r = classifyIntent(q, analyzeQuery(q));
  assert.equal(r.intent, 'broad_planning');
  assert.equal(r.entities.useCase, 'racing');
  assert.equal(r.requiresClarification, false);
});

check('component selection (motor, non-compatibility phrasing) -> component_selection', () => {
  const q = 'ما هو أفضل موتور؟';
  const r = classifyIntent(q, analyzeQuery(q));
  assert.equal(r.intent, 'component_selection');
});

check('compatibility phrasing on a component concept -> compatibility_check', () => {
  const q = 'هل هذا الموتور متوافق مع الفريم؟';
  const r = classifyIntent(q, analyzeQuery(q));
  assert.equal(r.intent, 'compatibility_check');
});

check('first power-up phrasing -> first_power_up', () => {
  const q = 'وصلت البطارية لأول مرة';
  const r = classifyIntent(q, analyzeQuery(q));
  assert.equal(r.intent, 'first_power_up');
});

check('motor testing phrasing -> motor_test', () => {
  const q = 'كيف أختبر المحركات؟';
  const r = classifyIntent(q, analyzeQuery(q));
  assert.equal(r.intent, 'motor_test');
});

check('charging phrasing -> lipo_charge', () => {
  const q = 'كيف أشحن بطارية LiPo؟';
  const r = classifyIntent(q, analyzeQuery(q));
  assert.equal(r.intent, 'lipo_charge');
});

check('soldering phrasing -> soldering', () => {
  const q = 'كيف ألحم الأسلاك؟';
  const r = classifyIntent(q, analyzeQuery(q));
  assert.equal(r.intent, 'soldering');
});

check('flight troubleshooting vocabulary ("الدرون ينقلب عند الإقلاع") -> flight_troubleshooting', () => {
  const q = 'الدرون ينقلب عند الإقلاع';
  const r = classifyIntent(q, analyzeQuery(q));
  assert.equal(r.intent, 'flight_troubleshooting');
  assert.equal(r.resolvedConceptId, 'betaflight_basics');
});

check('flight troubleshooting vocabulary ("الدرون يقلب عند الإقلاع") -> flight_troubleshooting', () => {
  const q = 'الدرون يقلب عند الإقلاع';
  const r = classifyIntent(q, analyzeQuery(q));
  assert.equal(r.intent, 'flight_troubleshooting');
});

check('gps troubleshooting vocabulary ("GPS Rescue لا يعمل") -> gps_troubleshooting', () => {
  const q = 'GPS Rescue لا يعمل';
  const r = classifyIntent(q, analyzeQuery(q));
  assert.equal(r.intent, 'gps_troubleshooting');
  assert.equal(r.resolvedConceptId, 'gps_basics');
});

check('video troubleshooting vocabulary ("الفيديو ينقطع") -> video_troubleshooting', () => {
  const q = 'الفيديو ينقطع أثناء الطيران';
  const r = classifyIntent(q, analyzeQuery(q));
  assert.equal(r.intent, 'video_troubleshooting');
  assert.equal(r.resolvedConceptId, 'vtx_basic');
});

check('radio troubleshooting vocabulary ("فقدت الإشارة") -> radio_troubleshooting', () => {
  const q = 'فقدت الإشارة أثناء الطيران';
  const r = classifyIntent(q, analyzeQuery(q));
  assert.equal(r.intent, 'radio_troubleshooting');
  assert.equal(r.resolvedConceptId, 'receiver_basic');
});

check('radio troubleshooting vocabulary ("failsafe") -> radio_troubleshooting', () => {
  const q = 'صار عندي failsafe أثناء الطيران';
  const r = classifyIntent(q, analyzeQuery(q));
  assert.equal(r.intent, 'radio_troubleshooting');
});

check('motor fault report ("محرك يدور بالعكس") routes to flight_troubleshooting via motor_basic', () => {
  const q = 'محرك يدور بالعكس';
  const r = classifyIntent(q, analyzeQuery(q));
  assert.equal(r.intent, 'flight_troubleshooting');
  assert.equal(r.resolvedConceptId, 'motor_basic');
});

check('motor fault report ("محرك لا يدور") routes to flight_troubleshooting via motor_basic', () => {
  const q = 'محرك لا يدور';
  const r = classifyIntent(q, analyzeQuery(q));
  assert.equal(r.intent, 'flight_troubleshooting');
  assert.equal(r.resolvedConceptId, 'motor_basic');
});

// ─────────────────────────────────────────────────────────────────────────
// Group 2 — Entity extraction, including the strict budget rule
// ─────────────────────────────────────────────────────────────────────────
console.log('\n[2] Entity extraction (including strict budget rule)');

check('explicit currency-qualified budget is extracted', () => {
  const q = 'ميزانيتي 400 دولار';
  const r = classifyIntent(q, analyzeQuery(q));
  assert.equal(r.entities.budgetAmount, 400);
  assert.equal(r.entities.budgetCurrency, 'USD');
});

check('NEGATIVE: "2207" (a motor size, no currency word) is never treated as a budget', () => {
  const q = 'أريد موتور 2207';
  const r = classifyIntent(q, analyzeQuery(q));
  assert.equal(r.entities.budgetAmount, undefined);
});

check('NEGATIVE: "5 inch" (a frame size) is never treated as a budget', () => {
  const q = 'أريد فريم 5 inch';
  const r = classifyIntent(q, analyzeQuery(q));
  assert.equal(r.entities.budgetAmount, undefined);
  assert.equal(r.entities.frameSize, '5_inch');
});

check('NEGATIVE: "4S" (a battery voltage) is never treated as a budget', () => {
  const q = 'بطارية 4S';
  const r = classifyIntent(q, analyzeQuery(q));
  assert.equal(r.entities.budgetAmount, undefined);
  assert.equal(r.entities.batteryVoltage, '4S');
});

check('NEGATIVE: "2025" (a bare 4-digit number, no currency word) is never treated as a budget', () => {
  const q = 'اشتريت الدرون سنة 2025';
  const r = classifyIntent(q, analyzeQuery(q));
  assert.equal(r.entities.budgetAmount, undefined);
});

check('a bare number IS accepted as the budget answer ONLY when the pending clarification explicitly asks for it', () => {
  const q1 = 'كيف أبني درون FPV؟';
  const t1 = resolveTurn(q1, classifyIntent(q1, analyzeQuery(q1)), createEmptyContext());
  const q2 = 'سباق';
  const t2 = resolveTurn(q2, classifyIntent(q2, analyzeQuery(q2)), t1.context);
  assert.equal(t2.context.pendingClarification, 'budget');

  // "400" alone (no currency word) — but the pending clarification IS budget.
  const q3 = '400';
  const t3 = resolveTurn(q3, classifyIntent(q3, analyzeQuery(q3)), t2.context);
  assert.equal(t3.context.budgetAmount, 400, 'a bare number must be accepted here — the conversation is waiting on the budget question');
  assert.equal(t3.context.pendingClarification, 'experience_level');
});

check('the SAME bare number is rejected as a budget when there is no pending budget clarification', () => {
  const r = classifyIntent('400', analyzeQuery('400'));
  assert.equal(r.entities.budgetAmount, undefined);
});

// ─────────────────────────────────────────────────────────────────────────
// Group 3 — Multi-turn context (session reducer)
// ─────────────────────────────────────────────────────────────────────────
console.log('\n[3] Multi-turn context (session reducer)');

check('clarification-answer continuation: use case answer advances to budget pending', () => {
  const q1 = 'كيف أبني درون FPV؟';
  const t1 = resolveTurn(q1, classifyIntent(q1, analyzeQuery(q1)), createEmptyContext());
  assert.equal(t1.context.pendingClarification, 'intended_use');

  const q2 = 'سباق';
  const t2 = resolveTurn(q2, classifyIntent(q2, analyzeQuery(q2)), t1.context);
  assert.equal(t2.resolvedIntent, 'broad_planning');
  assert.equal(t2.context.intendedUse, 'racing');
  assert.equal(t2.context.pendingClarification, 'budget');
  assert.equal(t2.topicChanged, false);
});

check('budget-only continuation (currency-qualified) answers pending budget and advances to experience_level', () => {
  let ctx = createEmptyContext();
  ctx = resolveTurn('كيف أبني درون FPV؟', classifyIntent('كيف أبني درون FPV؟', analyzeQuery('كيف أبني درون FPV؟')), ctx).context;
  ctx = resolveTurn('سباق', classifyIntent('سباق', analyzeQuery('سباق')), ctx).context;
  const q = '400 دولار';
  const t = resolveTurn(q, classifyIntent(q, analyzeQuery(q)), ctx);
  assert.equal(t.context.budgetAmount, 400);
  assert.equal(t.context.budgetCurrency, 'USD');
  assert.equal(t.context.pendingClarification, 'experience_level');
});

check('experience-only continuation answers final pending and clears pendingClarification', () => {
  let ctx = createEmptyContext();
  for (const q of ['كيف أبني درون FPV؟', 'سباق', '400 دولار']) {
    ctx = resolveTurn(q, classifyIntent(q, analyzeQuery(q)), ctx).context;
  }
  const q = 'أنا مبتدئ';
  const t = resolveTurn(q, classifyIntent(q, analyzeQuery(q)), ctx);
  assert.equal(t.context.experienceLevel, 'beginner');
  assert.equal(t.context.pendingClarification, undefined);
});

check('topic switch (planning -> troubleshooting) clears stale planning fields', () => {
  let ctx = createEmptyContext();
  for (const q of ['كيف أبني درون FPV؟', 'سباق', '400 دولار', 'أنا مبتدئ']) {
    ctx = resolveTurn(q, classifyIntent(q, analyzeQuery(q)), ctx).context;
  }
  assert.equal(ctx.intendedUse, 'racing');

  const q = 'الدرون ينقلب عند الإقلاع';
  const t = resolveTurn(q, classifyIntent(q, analyzeQuery(q)), ctx);
  assert.equal(t.topicChanged, true);
  assert.equal(t.resolvedIntent, 'flight_troubleshooting');
  assert.equal(t.context.intendedUse, undefined, 'stale intendedUse must be cleared after a topic switch');
  assert.equal(t.context.budgetAmount, undefined, 'stale budgetAmount must be cleared after a topic switch');
});

check('explicit correction ("لا، أقصد درون سباق") replaces, not merges, prior intended use', () => {
  const q1 = 'أبني درون تصوير سينمائي';
  const ctx = resolveTurn(q1, classifyIntent(q1, analyzeQuery(q1)), createEmptyContext()).context;
  assert.equal(ctx.intendedUse, 'cinematic');

  const q2 = 'لا، أقصد درون سباق';
  const t2 = resolveTurn(q2, classifyIntent(q2, analyzeQuery(q2)), ctx);
  assert.equal(t2.context.intendedUse, 'racing', 'the corrected value must fully replace the old one, not merge');
  assert.equal(t2.topicChanged, false, 'same-family correction is not a topic switch');
});

check('explicit reset ("ابدأ من جديد") wipes all accumulated context', () => {
  let ctx = createEmptyContext();
  for (const q of ['كيف أبني درون FPV؟', 'سباق', '400 دولار']) {
    ctx = resolveTurn(q, classifyIntent(q, analyzeQuery(q)), ctx).context;
  }
  assert.equal(ctx.intendedUse, 'racing');

  const q = 'ابدأ من جديد';
  const t = resolveTurn(q, classifyIntent(q, analyzeQuery(q)), ctx);
  assert.equal(t.topicChanged, true);
  assert.equal(t.context.intendedUse, undefined);
  assert.equal(t.context.budgetAmount, undefined);
  assert.equal(t.context.lastWarningKind, undefined);
});

check('stale-clarification rejection: a weak/off-topic reply while a clarification is pending keeps the SAME pending question, not a reset', () => {
  const q1 = 'كيف أبني درون FPV؟';
  const ctx1 = resolveTurn(q1, classifyIntent(q1, analyzeQuery(q1)), createEmptyContext()).context;
  assert.equal(ctx1.pendingClarification, 'intended_use');

  const q2 = 'حسناً';
  const analysis2 = analyzeQuery(q2);
  const intent2 = classifyIntent(q2, analysis2);
  assert.equal(intent2.confidence, 'low', 'a filler reply with no recognizable entity must be a low-confidence signal for this test to be meaningful');
  const t2 = resolveTurn(q2, intent2, ctx1);
  assert.equal(t2.context.pendingClarification, 'intended_use', 'an unanswered filler reply must not silently advance or clear the pending question');
  assert.equal(t2.topicChanged, false);
});

// ─────────────────────────────────────────────────────────────────────────
// Group 4 — Warning relevance
// ─────────────────────────────────────────────────────────────────────────
console.log('\n[4] Warning relevance');

function warningFor(query: string) {
  const analysis = analyzeQuery(query);
  const safety = classifyV2Risk(analysis);
  return classifyContextualWarning(analysis.normalizedQuery, safety);
}

check('broad build planning question carries NO warning (the original bug)', () => {
  const w = warningFor('أريد أبني درون FPV، من أين أبدأ؟');
  assert.equal(w.warningSeverity, 'none');
});

check('first power-up connect phrasing -> first_power_up caution warning', () => {
  const w = warningFor('وصلت البطارية لأول مرة، ماذا أفعل؟');
  assert.equal(w.warningSeverity, 'caution');
  assert.equal(w.warningKind, 'first_power_up');
});

check('motor test phrasing -> motor_test caution warning', () => {
  const w = warningFor('كيف أختبر المحركات؟');
  assert.equal(w.warningSeverity, 'caution');
  assert.equal(w.warningKind, 'motor_test');
});

check('lipo charging phrasing -> lipo_charge caution warning', () => {
  const w = warningFor('كيف أشحن بطارية LiPo؟');
  assert.equal(w.warningSeverity, 'caution');
  assert.equal(w.warningKind, 'lipo_charge');
});

check('soldering/polarity phrasing -> soldering_polarity caution warning', () => {
  const w = warningFor('هل القطبية صحيحة قبل اللحام؟');
  assert.equal(w.warningSeverity, 'caution');
  assert.equal(w.warningKind, 'soldering_polarity');
});

check('critical hazard (swollen LiPo) always outranks any simultaneous caution signal', () => {
  const w = warningFor('البطارية منتفخة وأريد أختبر المحركات الآن');
  assert.equal(w.warningSeverity, 'critical');
  assert.equal(w.warningKind, 'immediate_hazard');
});

check('an unrelated definition query carries no warning of any kind', () => {
  const w = warningFor('ما هو Flight Controller؟');
  assert.equal(w.warningSeverity, 'none');
});

check('NEGATIVE: "انتهيت من اللحام" does not trigger an active soldering warning', () => {
  const w = warningFor('انتهيت من اللحام');
  assert.equal(w.warningSeverity, 'none');
});

check('NEGATIVE: broad planning never shows a battery or motor-test warning', () => {
  const w1 = warningFor('أريد بناء درون');
  assert.equal(w1.warningSeverity, 'none');
  const w2 = warningFor('كيف أبني درون سباق بميزانية 400 دولار');
  assert.equal(w2.warningSeverity, 'none');
});

check('discriminated union invariant: warning text is present iff severity is not none (checked across all 8 kinds)', () => {
  const probes = [
    'أريد أبني درون FPV', // none
    'وصلت البطارية لأول مرة', // first_power_up
    'كيف أختبر المحركات', // motor_test
    'كيف أشحن بطارية LiPo', // lipo_charge
    'تخزين البطارية لفترة طويلة', // lipo_storage
    'هل القطبية صحيحة', // soldering_polarity
    'شغلت VTX بدون هوائي', // vtx_without_antenna
    'البطارية منتفخة', // immediate_hazard
  ];
  for (const q of probes) {
    const w = warningFor(q);
    if (w.warningSeverity === 'none') {
      assert.equal(w.warning, undefined);
      assert.equal(w.warningKind, undefined);
    } else {
      assert.equal(typeof w.warning, 'string');
      assert.ok(w.warning.length > 0);
      assert.notEqual(w.warningKind, undefined);
      assert.notEqual(w.warningKind, 'none');
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Group 5 — Warning-repetition deduplication
// ─────────────────────────────────────────────────────────────────────────
console.log('\n[5] Warning-repetition deduplication');

check('identical consecutive caution warning is suppressed on the second turn', () => {
  const raw1 = warningFor('كيف أختبر المحركات؟');
  const shown1 = applyWarningDeduplication(raw1, undefined, false);
  assert.equal(shown1.warningSeverity, 'caution');

  const raw2 = warningFor('كيف أختبر المحركات؟');
  const shown2 = applyWarningDeduplication(raw2, raw1.warningKind, false);
  assert.equal(shown2.warningSeverity, 'none', 'an immediately-repeated identical-topic caution must be suppressed');
});

check('critical warnings are never suppressed regardless of lastShownWarningKind', () => {
  const raw = warningFor('دخان يخرج من الكواد');
  const shown = applyWarningDeduplication(raw, 'immediate_hazard', false);
  assert.equal(shown.warningSeverity, 'critical', 'critical must never be suppressed');
});

check('a changed hazard kind shows the new warning even with no topic change flagged', () => {
  const raw = warningFor('كيف أشحن بطارية LiPo؟'); // lipo_charge
  const shown = applyWarningDeduplication(raw, 'motor_test', false);
  assert.equal(shown.warningSeverity, 'caution');
  assert.equal(shown.warningKind, 'lipo_charge');
});

check('a topic switch resets suppression even for an identical warning kind', () => {
  const raw = warningFor('كيف أختبر المحركات؟');
  const shown = applyWarningDeduplication(raw, 'motor_test', true);
  assert.equal(shown.warningSeverity, 'caution');
});

check('explicit repeated risky request shows the warning again on the very next repeat (alternating shown/suppressed/shown)', () => {
  const raw1 = warningFor('كيف أختبر المحركات؟');
  const shown1 = applyWarningDeduplication(raw1, undefined, false);
  assert.equal(shown1.warningSeverity, 'caution');
  const storedAfterShow1 = shown1.warningSeverity !== 'none' ? raw1.warningKind : undefined;

  const raw2 = warningFor('كيف أختبر المحركات؟');
  const shown2 = applyWarningDeduplication(raw2, storedAfterShow1, false);
  assert.equal(shown2.warningSeverity, 'none');
  const storedAfterShow2 = shown2.warningSeverity !== 'none' ? raw2.warningKind : undefined;
  assert.equal(storedAfterShow2, undefined);

  const raw3 = warningFor('كيف أختبر المحركات؟');
  const shown3 = applyWarningDeduplication(raw3, storedAfterShow2, false);
  assert.equal(shown3.warningSeverity, 'caution', 'the third identical repeat must show the warning again');
});

// ─────────────────────────────────────────────────────────────────────────
// Group 6 — Rendering parity (single shared render-decision function)
// ─────────────────────────────────────────────────────────────────────────
console.log('\n[6] Rendering parity (single shared render-decision function)');

check('getWarningCardProps returns null for severity none', () => {
  const props = getWarningCardProps({ warningSeverity: 'none' });
  assert.equal(props, null);
});

check('getWarningCardProps maps caution -> type "warning" and critical -> type "danger"', () => {
  const caution = getWarningCardProps({ warningSeverity: 'caution', warning: 'x' });
  assert.deepEqual(caution, { message: 'x', type: 'warning' });
  const critical = getWarningCardProps({ warningSeverity: 'critical', warning: 'y' });
  assert.deepEqual(critical, { message: 'y', type: 'danger' });
});

check('both UI source files call getWarningCardProps and neither duplicates an independent severity/type decision', async () => {
  const fs = await import('node:fs');
  const overlaySrc = fs.readFileSync(new URL('../src/components/BotV2Overlay.tsx', import.meta.url), 'utf8');
  const viewSrc = fs.readFileSync(new URL('../src/views/BotV2AssistantView.tsx', import.meta.url), 'utf8');
  for (const src of [overlaySrc, viewSrc]) {
    assert.ok(src.includes('getWarningCardProps'), 'each UI file must call the shared helper');
    assert.ok(!src.includes("riskLevel === 'critical' ? 'danger'"), 'no UI file may independently re-derive the severity->type mapping');
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Group 7 — Regression (full-engine integration + untouched-files check)
// ─────────────────────────────────────────────────────────────────────────
console.log('\n[7] Regression (full-engine integration + untouched-files check)');

check('full engine call still returns a well-formed BotV2Answer for a plain definition query', () => {
  const turn = analyzeAndComposeBotV2Answer('ما هو Flight Controller؟', createEmptyContext());
  assert.equal(turn.answer.mode, 'definition');
  assert.equal(typeof turn.answer.shortAnswer, 'string');
  assert.ok(turn.answer.shortAnswer.length > 0);
  assert.ok(Array.isArray(turn.answer.chips));
  assert.ok(Array.isArray(turn.answer.links));
});

check('app_navigation intent/mode still resolves for an app-navigation query', () => {
  const turn = analyzeAndComposeBotV2Answer('افتح قسم البناء', createEmptyContext());
  assert.equal(turn.answer.mode, 'app_navigation');
});

check('starter suggestion chips (as shown in both UIs) all still produce a non-crashing, non-empty answer', () => {
  const SUGGESTIONS = ['كيف أبني درون FPV؟', 'ما هو Flight Controller؟', 'كيف أوصّل الـ ESC؟', 'مشكلة في Betaflight'];
  let ctx: AssistantSessionContext = createEmptyContext();
  for (const q of SUGGESTIONS) {
    const turn = analyzeAndComposeBotV2Answer(q, ctx);
    assert.ok(turn.answer.shortAnswer.length > 0);
    ctx = turn.nextContext;
  }
});

check('critical safety_first mode still overrides everything end-to-end', () => {
  const turn = analyzeAndComposeBotV2Answer('البطارية منتفخة وفيها دخان', createEmptyContext());
  assert.equal(turn.answer.mode, 'safety_first');
  assert.equal(turn.answer.riskLevel, 'critical');
  assert.equal(turn.answer.warningSeverity, 'critical');
});

check('both UI files still declare dir="auto" on the query input (Arabic/English directionality preserved)', async () => {
  const fs = await import('node:fs');
  const overlaySrc = fs.readFileSync(new URL('../src/components/BotV2Overlay.tsx', import.meta.url), 'utf8');
  const viewSrc = fs.readFileSync(new URL('../src/views/BotV2AssistantView.tsx', import.meta.url), 'utf8');
  assert.ok(overlaySrc.includes('dir="auto"'));
  assert.ok(viewSrc.includes('dir="auto"'));
});

check('Community/PublicProfile source files are untouched by this proposal (no reference to botV2 in either)', async () => {
  // firestore.rules lives at the real repo root, outside this scripts-relative
  // check — its untouched status is verified separately via git status.
  const fs = await import('node:fs');
  const candidates = [
    '../src/components/Community/CommunityHome.tsx',
    '../src/components/ProfileSheet.tsx',
  ];
  for (const rel of candidates) {
    const p = new URL(rel, import.meta.url);
    const src = fs.readFileSync(p, 'utf8');
    assert.ok(!src.includes('botV2'), `${rel} must not reference the bot feature`);
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Group 8 — Modern Standard Arabic compliance
// ─────────────────────────────────────────────────────────────────────────
console.log('\n[8] Modern Standard Arabic compliance');

check('none of the Bot V2 source files contain a known Gulf/Egyptian/Levantine colloquial term', async () => {
  const fs = await import('node:fs');
  const BANNED_DIALECT_TERMS = [
    'أبي', 'مو شغال', 'مايشتغل', 'يخبّص', 'يخبص', 'يتشقلب',
    'شو هو', 'شو هي', 'يعني ايش', 'يعني شو',
    'بالغلط', 'غلط فيه', 'خلصت', 'يشتغل مع',
    'جرب المحركات', 'اجرب المحركات', 'موتور تست',
    'ريسينج', 'فيديوجرافي', 'فيل سيف',
  ];
  const files = [
    '../src/data/knowledge/botV2/contextualWarning.ts',
    '../src/data/knowledge/botV2/intentClassifier.ts',
    '../src/data/knowledge/botV2/sessionContext.ts',
    '../src/data/knowledge/botV2/modeSelector.ts',
    '../src/data/knowledge/botV2/composer.ts',
  ];
  for (const rel of files) {
    const src = fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
    for (const term of BANNED_DIALECT_TERMS) {
      assert.ok(!src.includes(term), `${rel} must not contain the colloquial term "${term}"`);
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Group 9 — F-1: negation-aware action classification
// ─────────────────────────────────────────────────────────────────────────
console.log('\n[9] F-1: negation-aware action classification');

check('"لا أريد اختبار المحركات" is not motor_test and shows no motor-test warning', () => {
  const q = 'لا أريد اختبار المحركات';
  const intent = classifyIntent(q, analyzeQuery(q));
  assert.notEqual(intent.intent, 'motor_test');
  const w = warningFor(q);
  assert.notEqual(w.warningKind, 'motor_test');
  assert.equal(w.warningSeverity, 'none');
});

check('"لم أختبر المحركات" is not motor_test and shows no motor-test warning', () => {
  const q = 'لم أختبر المحركات';
  const intent = classifyIntent(q, analyzeQuery(q));
  assert.notEqual(intent.intent, 'motor_test');
  const w = warningFor(q);
  assert.equal(w.warningSeverity, 'none');
});

check('"لن أختبر المحركات الآن" is not motor_test and shows no motor-test warning', () => {
  const q = 'لن أختبر المحركات الآن';
  const intent = classifyIntent(q, analyzeQuery(q));
  assert.notEqual(intent.intent, 'motor_test');
  const w = warningFor(q);
  assert.equal(w.warningSeverity, 'none');
});

check('"لم أشحن البطارية" is not lipo_charge and shows no charging warning', () => {
  const q = 'لم أشحن البطارية';
  const intent = classifyIntent(q, analyzeQuery(q));
  assert.notEqual(intent.intent, 'lipo_charge');
  const w = warningFor(q);
  assert.equal(w.warningSeverity, 'none');
});

check('"لن أشحن البطارية" is not lipo_charge and shows no charging warning', () => {
  const q = 'لن أشحن البطارية';
  const intent = classifyIntent(q, analyzeQuery(q));
  assert.notEqual(intent.intent, 'lipo_charge');
  const w = warningFor(q);
  assert.equal(w.warningSeverity, 'none');
});

check('"لا أريد شحن البطارية" is not lipo_charge and shows no charging warning', () => {
  const q = 'لا أريد شحن البطارية';
  const intent = classifyIntent(q, analyzeQuery(q));
  assert.notEqual(intent.intent, 'lipo_charge');
  const w = warningFor(q);
  assert.equal(w.warningSeverity, 'none');
});

check('positive control: "أريد اختبار المحركات" -> motor_test with caution warning', () => {
  const q = 'أريد اختبار المحركات';
  const intent = classifyIntent(q, analyzeQuery(q));
  assert.equal(intent.intent, 'motor_test');
  const w = warningFor(q);
  assert.equal(w.warningSeverity, 'caution');
  assert.equal(w.warningKind, 'motor_test');
});

check('positive control: "كيف أشحن بطارية LiPo؟" -> lipo_charge with caution warning', () => {
  const q = 'كيف أشحن بطارية LiPo؟';
  const intent = classifyIntent(q, analyzeQuery(q));
  assert.equal(intent.intent, 'lipo_charge');
  const w = warningFor(q);
  assert.equal(w.warningSeverity, 'caution');
  assert.equal(w.warningKind, 'lipo_charge');
});

check('critical override: "البطارية منتفخة ولم أشحنها" still shows a critical, never-suppressed warning', () => {
  const turn = analyzeAndComposeBotV2Answer('البطارية منتفخة ولم أشحنها', createEmptyContext());
  assert.equal(turn.answer.mode, 'safety_first');
  assert.equal(turn.answer.warningSeverity, 'critical');
  assert.equal(turn.answer.warningKind, 'immediate_hazard');
});

// ─────────────────────────────────────────────────────────────────────────
// Group 10 — F-3: explicit reset produces a truly empty session
// ─────────────────────────────────────────────────────────────────────────
console.log('\n[10] F-3: explicit reset produces a truly empty session');

function buildRichContext(): AssistantSessionContext {
  let ctx = createEmptyContext();
  let t = analyzeAndComposeBotV2Answer('أريد بناء درون سباق', ctx); ctx = t.nextContext;
  t = analyzeAndComposeBotV2Answer('400 دولار', ctx); ctx = t.nextContext;
  return ctx;
}

for (const resetPhrase of ['ابدأ من جديد', 'ابدأ من البداية', 'restart', 'start over']) {
  check(`reset phrase "${resetPhrase}" produces a context deep-equal to createEmptyContext()`, () => {
    const rich = buildRichContext();
    assert.notEqual(rich.intendedUse, undefined, 'the pre-reset context must actually be non-empty for this test to be meaningful');
    const turn = analyzeAndComposeBotV2Answer(resetPhrase, rich);
    assert.deepEqual(turn.nextContext, createEmptyContext());
  });
}

check('reset does not invent an experienceLevel or an app_navigation activeIntent from the reset phrase itself', () => {
  const rich = buildRichContext();
  const turn = analyzeAndComposeBotV2Answer('ابدأ من جديد', rich);
  assert.equal(turn.nextContext.experienceLevel, undefined);
  assert.equal(turn.nextContext.activeIntent, undefined);
  assert.equal(Object.keys(turn.nextContext).length, 0);
});

check('NEGATIVE: an unrelated formal message does not accidentally trigger a reset', () => {
  const rich = buildRichContext();
  const turn = analyzeAndComposeBotV2Answer('ما هو أفضل نظام تحديد المواقع؟', rich);
  assert.equal(turn.nextContext.intendedUse, 'racing', 'unrelated formal question must not wipe the session');
});

// ─────────────────────────────────────────────────────────────────────────
// Group 11 — F-4: critical hazard breaks stale planning context
// ─────────────────────────────────────────────────────────────────────────
console.log('\n[11] F-4: critical hazard breaks stale planning context');

check('critical hazard while intended_use is pending: safety_first, critical, clears pendingClarification and stale fields', () => {
  let ctx = createEmptyContext();
  let t = analyzeAndComposeBotV2Answer('أريد بناء درون', ctx); ctx = t.nextContext;
  assert.equal(ctx.pendingClarification, 'intended_use');
  t = analyzeAndComposeBotV2Answer('البطارية منتفخة', ctx); ctx = t.nextContext;
  assert.equal(t.answer.mode, 'safety_first');
  assert.equal(t.answer.warningSeverity, 'critical');
  assert.equal(ctx.pendingClarification, undefined);
  assert.equal(ctx.activeIntent, undefined);
  assert.equal(ctx.intendedUse, undefined);
});

check('the next ordinary message does not automatically resume the interrupted build clarification', () => {
  let ctx = createEmptyContext();
  let t = analyzeAndComposeBotV2Answer('أريد بناء درون', ctx); ctx = t.nextContext;
  t = analyzeAndComposeBotV2Answer('البطارية منتفخة', ctx); ctx = t.nextContext;
  t = analyzeAndComposeBotV2Answer('حسنًا', ctx);
  assert.doesNotMatch(t.answer.shortAnswer, /الاستخدام المقصود/, 'must not silently resume asking for intended use');
});

check('critical hazard while budget is pending clears the stale planning context', () => {
  let ctx = createEmptyContext();
  let t = analyzeAndComposeBotV2Answer('أريد بناء درون سباق', ctx); ctx = t.nextContext;
  assert.equal(ctx.pendingClarification, 'budget');
  t = analyzeAndComposeBotV2Answer('البطارية منتفخة', ctx); ctx = t.nextContext;
  assert.equal(t.answer.mode, 'safety_first');
  assert.equal(t.answer.warningSeverity, 'critical');
  assert.equal(ctx.pendingClarification, undefined);
  assert.equal(ctx.intendedUse, undefined);
});

check('critical hazard while experience_level is pending clears the stale planning context', () => {
  let ctx = createEmptyContext();
  let t = analyzeAndComposeBotV2Answer('أريد بناء درون سباق', ctx); ctx = t.nextContext;
  t = analyzeAndComposeBotV2Answer('400 دولار', ctx); ctx = t.nextContext;
  assert.equal(ctx.pendingClarification, 'experience_level');
  t = analyzeAndComposeBotV2Answer('البطارية منتفخة', ctx); ctx = t.nextContext;
  assert.equal(t.answer.mode, 'safety_first');
  assert.equal(t.answer.warningSeverity, 'critical');
  assert.equal(ctx.pendingClarification, undefined);
  assert.equal(ctx.budgetAmount, undefined);
});

check('critical warnings are never deduplicated even on an identical consecutive critical message', () => {
  const ctx = createEmptyContext();
  let t = analyzeAndComposeBotV2Answer('البطارية منتفخة', ctx);
  assert.equal(t.answer.warningSeverity, 'critical');
  t = analyzeAndComposeBotV2Answer('البطارية منتفخة', t.nextContext);
  assert.equal(t.answer.warningSeverity, 'critical', 'critical must show again, never suppressed');
});

// ─────────────────────────────────────────────────────────────────────────
console.log(`\nAll ${passCount} assertions passed.`);
