/**
 * A SHARED RULE MUST REACH BOTH SURFACES — OR THE BUILD FAILS
 * ==========================================================
 *
 * The equivalence suite proves the four rules that exist today agree on both
 * surfaces. This one is about the rules that do not exist yet.
 *
 * The original defect was not that a rule disagreed. It was that a rule was
 * PRESENT IN ONE LAYER AND ABSENT FROM THE OTHER, and nothing noticed for as
 * long as it took an audit to walk the wizard by hand. Equivalence testing
 * cannot catch that on its own: a rule the report never evaluates produces no
 * finding to compare against, so a suite that only compares outcomes will
 * happily agree that both surfaces said nothing.
 *
 * So the registry is the contract. `SHARED_COMPAT_RULES` names every truth
 * that belongs to both, and this suite asserts that both composers actually
 * consume every one of them. Add a fifth rule and forget to wire it into the
 * report, and the build stops with the name of the rule and the name of the
 * file that is missing it.
 *
 * WHY A STATIC CHECK AND NOT A RUNTIME REGISTRY
 * ---------------------------------------------
 * A runtime registry — composers looping over a list of rule objects — would
 * prove consumption by construction, and it was considered and rejected. The
 * two composers legitimately differ in shape: the report builds a rich Finding
 * per rule with its own prose, links, evidence and actions, while the card
 * accumulates a three-value verdict. Forcing both through one loop would mean
 * either flattening the report's findings into something generic, or building
 * a description language rich enough to express them — which is the framework
 * this refactor was explicitly told not to build.
 *
 * Reading the two source files for the rule's function name is cruder and
 * proves exactly what needs proving, at the cost of nothing.
 *
 * Run: npx tsx --tsconfig web/tsconfig.json scripts/testCompatCompleteness.ts
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { CompatRuleId } from '../src/data/assembly/compatibility/rules';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const { SHARED_COMPAT_RULES } = await import('../src/data/assembly/compatibility/rules');

let passed = 0;
const failures: string[] = [];
function ok(label: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ok — ${label}`); }
  else { failures.push(label); console.log(`  FAIL — ${label}`); }
}

/** The exported evaluator for each registered rule. */
const RULE_FUNCTION: Record<CompatRuleId, string> = {
  'frame-size': 'frameSizeRule',
  'frame-motor-class': 'frameMotorClassRule',
  'prop-clearance': 'propClearanceRule',
  'design-voltage': 'designVoltageRule',
};

/**
 * Every consumer that must reach the shared rules through the shared module.
 *
 * The first two are the Phase 1 composers — the part card and the final
 * report, the pair whose disagreement this file exists to prevent. The third
 * arrived with the recommendation engine, and the reason it is listed here is
 * the same reason the other two are: it decides compatibility. A recommender
 * with its own copy of «does this frame match the declared size» would be a
 * third answer to a question that is only allowed one, and it would be the
 * answer a beginner sees FIRST — before either of the surfaces that were
 * carefully made to agree.
 *
 * The order matters below: index 0 is the report and index 1 the card, and two
 * assertions read them by position. Append, never insert.
 */
const CONSUMERS = [
  { name: 'the final report', file: 'src/data/project/verdicts.ts' },
  { name: 'the part card', file: 'web/lib/build/checks.ts' },
  { name: 'the recommendation engine', file: 'src/data/assembly/recommendation/proposeBuild.ts' },
] as const;

const rulesSrc = strip(read('src/data/assembly/compatibility/rules.ts'));
const sources = CONSUMERS.map(c => ({ ...c, src: strip(read(c.file)) }));

console.log('\n[1] Every registered rule exports an evaluator\n');
for (const rule of SHARED_COMPAT_RULES) {
  const fn = RULE_FUNCTION[rule.id];
  ok(`«${rule.id}» is mapped to a function name`, !!fn);
  ok(`«${rule.id}» → ${fn} is exported from the rules module`,
    new RegExp(`export function ${fn}\\b`).test(rulesSrc));
}
ok('the function map declares nothing that is not a registered rule',
  Object.keys(RULE_FUNCTION).every(id => SHARED_COMPAT_RULES.some(r => r.id === id)));
ok('every registered rule appears in the function map',
  SHARED_COMPAT_RULES.every(r => RULE_FUNCTION[r.id] !== undefined));

console.log('\n[2] EVERY consumer consumes EVERY shared rule\n');
for (const rule of SHARED_COMPAT_RULES) {
  const fn = RULE_FUNCTION[rule.id];
  for (const consumer of sources) {
    const consumed = new RegExp(`\\b${fn}\\(`).test(consumer.src);
    if (!consumed) {
      failures.push(`${consumer.name} does not consume «${rule.id}»`);
      console.log(`  FAIL — ${consumer.name} (${consumer.file}) never calls ${fn}() —`);
      console.log(`         «${rule.id}» (${rule.whatAr}) is registered as shared but reaches`);
      console.log('         only one surface. That is the exact defect this registry exists to prevent.');
    } else {
      passed++;
      console.log(`  ok — ${consumer.name} consumes «${rule.id}» via ${fn}()`);
    }
  }
}

console.log('\n[3] No consumer keeps a private copy of a shared truth\n');
/*
 * The rules module owns the comparisons. A composer that reached past it to the
 * underlying validator would be back to two copies of one truth — passing the
 * equivalence suite today and free to drift tomorrow.
 */
const PRIVATE_COPIES = [
  { call: 'frameMatchesSize(', belongsTo: 'frame-size' },
  { call: 'validateFrameMotor(', belongsTo: 'frame-motor-class' },
  { call: 'validateFramePropeller(', belongsTo: 'prop-clearance' },
];
for (const consumer of sources) {
  for (const p of PRIVATE_COPIES) {
    ok(`${consumer.name} does not call ${p.call.slice(0, -1)} directly (owned by «${p.belongsTo}»)`,
      !consumer.src.includes(p.call));
  }
}
ok('the card no longer compares a battery cell count by hand',
  !/specs\.sCount\s*!==/.test(sources[1].src));
ok('the report no longer compares a battery cell count by hand',
  !/cellCount\s*!==\s*p\.battery\.specs\.sCount/.test(sources[0].src));

console.log('\n[4] The rules module stays a rules module\n');
ok('it imports no UI, no React, no storage',
  !/from '.*(components|views|storage|next)/.test(rulesSrc));
ok('it declares no severity vocabulary of its own',
  !/blocker|warning|incompatible/.test(rulesSrc));
ok('it names every rule it registers',
  SHARED_COMPAT_RULES.every(r => rulesSrc.includes(`'${r.id}'`)));

console.log(`\n[completeness] ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  failures.forEach(f => console.log(`  FAILED: ${f}`));
  process.exit(1);
}
