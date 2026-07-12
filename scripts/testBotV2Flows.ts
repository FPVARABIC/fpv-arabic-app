/**
 * Real-assertion trace of the 5 required multi-turn flows for the Bot V2
 * intent/context/warning upgrade. Runs the actual full engine
 * (analyzeAndComposeBotV2Answer) turn-by-turn, exactly as either UI would
 * call it, and asserts each flow's required end-to-end behavior. Not
 * application runtime code — validation harness only.
 *
 * Run with:
 *   npx tsx scripts/testBotV2Flows.ts
 */

import assert from 'node:assert/strict';
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
// Flow 1 — broad build: one question at a time, then begin build guidance
// ─────────────────────────────────────────────────────────────────────────
console.log('\n[Flow 1] Broad build: accumulate use/budget/experience, then recommend');

{
  let ctx: AssistantSessionContext = createEmptyContext();

  const t1 = analyzeAndComposeBotV2Answer('أريد بناء درون', ctx);
  check('turn 1 ("أريد بناء درون"): asks intended use only', () => {
    assert.equal(t1.answer.mode, 'clarification_menu');
    assert.match(t1.answer.shortAnswer, /الاستخدام/);
    assert.doesNotMatch(t1.answer.shortAnswer, /الميزانية/, 'must not ask budget in the same message');
    assert.doesNotMatch(t1.answer.shortAnswer, /خبرة/, 'must not ask experience in the same message');
  });
  ctx = t1.nextContext;

  const t2 = analyzeAndComposeBotV2Answer('للتصوير السينمائي', ctx);
  check('turn 2 ("للتصوير السينمائي"): use case answered -> asks budget only', () => {
    assert.equal(t2.answer.mode, 'clarification_menu');
    assert.match(t2.answer.shortAnswer, /الميزانية/);
    assert.equal(t2.nextContext.intendedUse, 'cinematic');
  });
  ctx = t2.nextContext;

  const t3 = analyzeAndComposeBotV2Answer('ميزانيتي 400 دولار', ctx);
  check('turn 3 ("ميزانيتي 400 دولار"): budget answered -> asks experience only', () => {
    assert.equal(t3.answer.mode, 'clarification_menu');
    assert.match(t3.answer.shortAnswer, /خبرة/);
    assert.equal(t3.nextContext.budgetAmount, 400);
    assert.equal(t3.nextContext.budgetCurrency, 'USD');
  });
  ctx = t3.nextContext;

  const t4 = analyzeAndComposeBotV2Answer('أنا مبتدئ', ctx);
  check('turn 4 ("أنا مبتدئ"): all three known -> build_roadmap begins, no more questions', () => {
    assert.equal(t4.answer.mode, 'build_roadmap');
    assert.ok(t4.answer.steps && t4.answer.steps.length > 0);
    assert.equal(t4.nextContext.pendingClarification, undefined);
  });
  check('turn 4: no safety warning is shown for broad planning', () => {
    assert.equal(t4.answer.warningSeverity, 'none');
  });
  check('turn 4: recommendation intro reflects all 3 accumulated answers', () => {
    assert.match(t4.answer.shortAnswer, /سينمائي/);
    assert.match(t4.answer.shortAnswer, /400/);
    assert.match(t4.answer.shortAnswer, /مبتدئ/);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Flow 2 — first power-up
// ─────────────────────────────────────────────────────────────────────────
console.log('\n[Flow 2] First-power-up warning timing');

{
  let ctx: AssistantSessionContext = createEmptyContext();

  const t1 = analyzeAndComposeBotV2Answer('انتهيت من اللحام', ctx);
  check('turn 1 ("انتهيت من اللحام"): no warning', () => {
    assert.equal(t1.answer.warningSeverity, 'none');
  });
  ctx = t1.nextContext;

  const t2 = analyzeAndComposeBotV2Answer('هل أوصل البطارية الآن لأول مرة؟', ctx);
  check('turn 2 ("هل أوصل البطارية الآن لأول مرة؟"): shows first-power-up warning', () => {
    assert.equal(t2.answer.warningSeverity, 'caution');
    assert.equal(t2.answer.warningKind, 'first_power_up');
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Flow 3 — motor test
// ─────────────────────────────────────────────────────────────────────────
console.log('\n[Flow 3] Motor-test caution: shown, may be suppressed on an immediate repeat, never permanently lost');

{
  let ctx: AssistantSessionContext = createEmptyContext();

  const t1 = analyzeAndComposeBotV2Answer('أريد اختبار المحركات', ctx);
  check('turn 1 ("أريد اختبار المحركات"): shows motor-test caution', () => {
    assert.equal(t1.answer.warningSeverity, 'caution');
    assert.equal(t1.answer.warningKind, 'motor_test');
  });
  ctx = t1.nextContext;

  const t2 = analyzeAndComposeBotV2Answer('أريد اختبار المحركات', ctx);
  check('turn 2 (identical consecutive request): the duplicate caution is suppressed', () => {
    assert.equal(t2.answer.warningSeverity, 'none');
  });
  ctx = t2.nextContext;

  const t3 = analyzeAndComposeBotV2Answer('أريد اختبار المحركات', ctx);
  check('turn 3: the reminder is not permanently lost — shown again on the next repeat', () => {
    assert.equal(t3.answer.warningSeverity, 'caution');
    assert.equal(t3.answer.warningKind, 'motor_test');
  });

  const t4 = analyzeAndComposeBotV2Answer('البطارية منتفخة وأريد اختبار المحركات', createEmptyContext());
  check('critical danger is never suppressed, even alongside a motor-test signal', () => {
    assert.equal(t4.answer.warningSeverity, 'critical');
    assert.equal(t4.answer.warningKind, 'immediate_hazard');
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Flow 4 — topic switch
// ─────────────────────────────────────────────────────────────────────────
console.log('\n[Flow 4] Topic switch clears incompatible stale planning context');

{
  let ctx: AssistantSessionContext = createEmptyContext();

  const t1 = analyzeAndComposeBotV2Answer('أريد بناء درون سباق', ctx);
  check('turn 1 ("أريد بناء درون سباق"): racing build intent recorded', () => {
    assert.equal(t1.nextContext.intendedUse, 'racing');
    assert.equal(t1.nextContext.activeIntent, 'broad_planning');
  });
  ctx = t1.nextContext;

  const t2 = analyzeAndComposeBotV2Answer('الدرون الحالي ينقلب عند الإقلاع', ctx);
  check('turn 2 ("الدرون الحالي ينقلب عند الإقلاع"): switches to troubleshooting and clears stale planning context', () => {
    assert.equal(t2.answer.debug.topicChanged, true);
    assert.equal(t2.nextContext.intendedUse, undefined);
    assert.equal(t2.nextContext.activeIntent, 'flight_troubleshooting');
    assert.equal(t2.answer.mode, 'troubleshooting');
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Flow 5 — correction
// ─────────────────────────────────────────────────────────────────────────
console.log('\n[Flow 5] Explicit correction replaces prior intended use');

{
  let ctx: AssistantSessionContext = createEmptyContext();

  const t1 = analyzeAndComposeBotV2Answer('أريد درون تصوير سينمائي', ctx);
  check('turn 1 ("أريد درون تصوير سينمائي"): cinematic intended use recorded', () => {
    assert.equal(t1.nextContext.intendedUse, 'cinematic');
  });
  ctx = t1.nextContext;

  const t2 = analyzeAndComposeBotV2Answer('لا، أقصد درون سباق', ctx);
  check('turn 2 ("لا، أقصد درون سباق"): fully replaces cinematic with racing (never both/merged)', () => {
    assert.equal(t2.nextContext.intendedUse, 'racing');
    assert.notEqual(t2.nextContext.intendedUse, 'cinematic');
  });
  check('turn 2: correction is a continuation, not a topic switch (same planning family)', () => {
    assert.equal(t2.answer.debug.topicChanged, false);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Flow 6 (F-4 correction) — critical hazard breaks a stale planning
// clarification instead of silently resuming it
// ─────────────────────────────────────────────────────────────────────────
console.log('\n[Flow 6] Critical hazard during broad-build clarification');

{
  let ctx: AssistantSessionContext = createEmptyContext();

  const t1 = analyzeAndComposeBotV2Answer('أريد بناء درون', ctx);
  check('turn 1 ("أريد بناء درون"): pending clarification is intended_use', () => {
    assert.equal(t1.nextContext.pendingClarification, 'intended_use');
  });
  ctx = t1.nextContext;

  const t2 = analyzeAndComposeBotV2Answer('البطارية منتفخة', ctx);
  check('turn 2 ("البطارية منتفخة"): safety_first, critical, and the stale clarification is cleared', () => {
    assert.equal(t2.answer.mode, 'safety_first');
    assert.equal(t2.answer.warningSeverity, 'critical');
    assert.equal(t2.nextContext.pendingClarification, undefined);
    assert.equal(t2.nextContext.activeIntent, undefined);
    assert.equal(t2.nextContext.intendedUse, undefined);
  });
  ctx = t2.nextContext;

  const t3 = analyzeAndComposeBotV2Answer('حسنًا', ctx);
  check('turn 3 ("حسنًا"): does not automatically resume "ما الاستخدام المقصود للدرون؟"', () => {
    assert.doesNotMatch(t3.answer.shortAnswer, /الاستخدام المقصود/);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Flow 7 (F-3 correction) — explicit reset produces a truly empty session
// ─────────────────────────────────────────────────────────────────────────
console.log('\n[Flow 7] Explicit reset produces a truly empty session');

{
  let ctx: AssistantSessionContext = createEmptyContext();
  let t = analyzeAndComposeBotV2Answer('أريد بناء درون سباق', ctx); ctx = t.nextContext;
  t = analyzeAndComposeBotV2Answer('400 دولار', ctx); ctx = t.nextContext;

  check('rich context accumulated before reset', () => {
    assert.equal(ctx.intendedUse, 'racing');
    assert.equal(ctx.budgetAmount, 400);
  });

  const reset = analyzeAndComposeBotV2Answer('ابدأ من جديد', ctx);
  check('"ابدأ من جديد" produces nextContext deep-equal to createEmptyContext()', () => {
    assert.deepEqual(reset.nextContext, createEmptyContext());
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Flow 8 (F-1 correction) — negated action statements are never
// misclassified as the affirmative action
// ─────────────────────────────────────────────────────────────────────────
console.log('\n[Flow 8] Negated action statements');

{
  const negatedMotorTest = analyzeAndComposeBotV2Answer('لا أريد اختبار المحركات', createEmptyContext());
  check('"لا أريد اختبار المحركات" shows no motor-test warning', () => {
    assert.notEqual(negatedMotorTest.answer.warningKind, 'motor_test');
  });

  const negatedCharge = analyzeAndComposeBotV2Answer('لم أشحن البطارية', createEmptyContext());
  check('"لم أشحن البطارية" shows no charging warning', () => {
    assert.notEqual(negatedCharge.answer.warningKind, 'lipo_charge');
  });

  const positiveMotorTest = analyzeAndComposeBotV2Answer('أريد اختبار المحركات', createEmptyContext());
  check('positive control "أريد اختبار المحركات" still shows the motor-test warning', () => {
    assert.equal(positiveMotorTest.answer.warningKind, 'motor_test');
  });

  const criticalOverride = analyzeAndComposeBotV2Answer('البطارية منتفخة ولم أشحنها', createEmptyContext());
  check('critical hazard is never suppressed by the negation guard', () => {
    assert.equal(criticalOverride.answer.mode, 'safety_first');
    assert.equal(criticalOverride.answer.warningSeverity, 'critical');
  });
}

console.log(`\nAll ${passCount} flow assertions passed.`);
