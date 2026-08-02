/**
 * Diagnostic-tree proof.
 *
 * The spec rejects, by name, "شجرة تشخيص تعطي حلاً واحداً لكل مشكلة". This
 * script enforces that mechanically (every node must branch), plus the safety
 * ordering the spec requires ("اجعل إجراءات التشخيص تبدأ بالفحص الأقل خطراً"),
 * plus reachability, termination and absence of cycles.
 *
 * Run: npx tsx scripts/testKbDiagnostics.ts
 */
import assert from 'node:assert/strict';

import { allDxTrees, getDxTree } from '../src/data/kb/diagnostics/trees';
import { DX_CHECK_CLASS_ORDER } from '../src/data/kb/diagnostics/types';
import type { DxTree } from '../src/data/kb/diagnostics/types';
import { getArticle } from '../src/data/kb/registry';

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

console.log('\n[1] Registry');
{
  ok(`trees are registered (${allDxTrees.length})`, allDxTrees.length > 0);
  const ids = allDxTrees.map(t => t.id);
  ok('no duplicate tree ids', new Set(ids).size === ids.length);
  ok('getDxTree resolves every registered id', ids.every(id => !!getDxTree(id)));
  ok('unknown id resolves to undefined', getDxTree('nope-not-real') === undefined);
}

console.log('\n[2] Safety posture is declared BEFORE any step');
{
  for (const t of allDxTrees) {
    ok(`${t.id}: declares a risk level`, ['low', 'medium', 'high', 'critical'].includes(t.risk));
    ok(`${t.id}: declares whether the battery must come out`, typeof t.disconnectBattery === 'boolean');
    ok(`${t.id}: declares whether props must come off`, typeof t.removeProps === 'boolean');
    ok(`${t.id}: has quick checks to rule out first`, t.quickChecks.length >= 2);
    ok(`${t.id}: declares stop conditions`, t.stopConditions.length >= 2);
  }

  // Anything that spins a motor must require props off — this is the one rule
  // that must never depend on an author remembering it.
  const motorTrees = allDxTrees.filter(t =>
    t.nodes.some(n => /محرك|motor/i.test(n.how) || /محرك|motor/i.test(n.question)),
  );
  ok(`trees involving motors exist (${motorTrees.length})`, motorTrees.length > 0);
  for (const t of motorTrees) {
    ok(`${t.id}: motor-related tree requires props removed`, t.removeProps === true);
  }
}

console.log('\n[3] Every node branches — no single-answer diagnosis');
{
  for (const t of allDxTrees) {
    ok(`${t.id}: has nodes`, t.nodes.length > 0);
    for (const n of t.nodes) {
      ok(`${t.id}/${n.id}: has >= 2 outcomes`, n.outcomes.length >= 2);
      ok(`${t.id}/${n.id}: states how to check`, n.how.trim().length > 20);
      ok(`${t.id}/${n.id}: states the healthy expected result`, n.expected.trim().length > 10);
      ok(
        `${t.id}/${n.id}: every outcome explains what it MEANS`,
        n.outcomes.every(o => o.meaning.trim().length > 20),
      );
      ok(
        `${t.id}/${n.id}: every outcome either continues or concludes, never both, never neither`,
        n.outcomes.every(o => (!!o.next) !== (!!o.conclusion)),
      );
      ok(
        `${t.id}/${n.id}: terminal outcomes carry concrete actions`,
        n.outcomes.filter(o => o.conclusion).every(o => (o.actions?.length ?? 0) > 0),
      );
      const outcomeIds = n.outcomes.map(o => o.id);
      ok(`${t.id}/${n.id}: outcome ids are unique`, new Set(outcomeIds).size === outcomeIds.length);
    }
    const nodeIds = t.nodes.map(n => n.id);
    ok(`${t.id}: node ids are unique`, new Set(nodeIds).size === nodeIds.length);
  }
}

console.log('\n[4] Graph integrity — reachable, terminating, acyclic');
{
  for (const t of allDxTrees) {
    const byId = new Map(t.nodes.map(n => [n.id, n]));
    ok(`${t.id}: rootNodeId exists`, byId.has(t.rootNodeId));

    // Every `next` points at a real node.
    const dangling = t.nodes.flatMap(n =>
      n.outcomes.filter(o => o.next && !byId.has(o.next)).map(o => `${n.id}→${o.next}`),
    );
    if (dangling.length) console.error(`  ${t.id} dangling:`, dangling);
    ok(`${t.id}: every "next" points at a real node`, dangling.length === 0);

    // Every node reachable from the root.
    const seen = new Set<string>();
    const stack = [t.rootNodeId];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const o of byId.get(id)?.outcomes ?? []) if (o.next) stack.push(o.next);
    }
    const unreachable = t.nodes.filter(n => !seen.has(n.id)).map(n => n.id);
    if (unreachable.length) console.error(`  ${t.id} unreachable nodes:`, unreachable);
    ok(`${t.id}: every node is reachable from the root`, unreachable.length === 0);

    // No cycles: a user must never be routed in a loop forever.
    ok(`${t.id}: contains no cycle`, !hasCycle(t));

    // Every path from the root must terminate in a conclusion.
    ok(`${t.id}: every path terminates in a conclusion`, everyPathTerminates(t));

    // At least one branch must be able to conclude "likely damaged" OR the tree
    // must have a stop condition covering it — the spec asks "متى يحتمل أن تكون
    // القطعة تالفة؟" to be answerable.
    const answersDamage = t.nodes.some(n => n.outcomes.some(o => o.likelyDamaged))
      || t.stopConditions.some(s => /تالف|عتاد/i.test(s));
    ok(`${t.id}: answers "when is the part likely dead?"`, answersDamage);
  }
}

console.log('\n[5] Safety ordering — the first check is the least dangerous one available');
{
  // The invariant that actually matters is about the ENTRY point, not about
  // monotonic ordering along a path. Dropping back to a visual inspection after
  // a riskier check is normal and safe (visual is the safest class there is) —
  // e.g. "the motor spun from another output, now LOOK at its solder joint".
  // What must never happen is a tree that powers something up before a safer
  // check that could have answered the same question was offered first.
  for (const t of allDxTrees) {
    const byId = new Map(t.nodes.map(n => [n.id, n]));
    const rank = (id: string) => DX_CHECK_CLASS_ORDER.indexOf(byId.get(id)!.checkClass);

    const rootRank = rank(t.rootNodeId);
    const minRankInTree = Math.min(...t.nodes.map(n => DX_CHECK_CLASS_ORDER.indexOf(n.checkClass)));
    ok(
      `${t.id}: the entry check is the safest class present (${byId.get(t.rootNodeId)!.checkClass})`,
      rootRank === minRankInTree,
    );

    // No path may reach a functional (powered) check without passing through at
    // least one non-functional check first.
    const bad: string[] = [];
    const walk = (id: string, sawSafeCheck: boolean, path: string[]) => {
      const node = byId.get(id);
      if (!node) return;
      const isFunctional = node.checkClass === 'functional';
      if (isFunctional && !sawSafeCheck) bad.push(`${[...path, id].join('→')}`);
      for (const o of node.outcomes) {
        if (o.next && !path.includes(o.next)) walk(o.next, sawSafeCheck || !isFunctional, [...path, id]);
      }
    };
    walk(t.rootNodeId, false, []);
    if (bad.length) console.error(`  ${t.id} powered-check-first paths:`, bad);
    ok(`${t.id}: no path powers anything up before a safer check`, bad.length === 0);
  }
}

console.log('\n[6] Links and searchability');
{
  for (const t of allDxTrees) {
    ok(`${t.id}: has search aliases`, t.aliases.length >= 3);
    ok(`${t.id}: is linked to at least one article`, t.relatedArticleIds.length > 0);
    ok(`${t.id}: every related article resolves`, t.relatedArticleIds.every(a => !!getArticle(a)));
    ok(`${t.id}: has outbound links`, t.links.length > 0);
    ok(`${t.id}: symptom text is user-phrased, not jargon-only`, t.symptomAr.length > 25);
  }
}

// ── helpers ────────────────────────────────────────────────────────────────

function hasCycle(t: DxTree): boolean {
  const byId = new Map(t.nodes.map(n => [n.id, n]));
  const visiting = new Set<string>();
  const done = new Set<string>();

  const dfs = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (done.has(id)) return false;
    visiting.add(id);
    for (const o of byId.get(id)?.outcomes ?? []) {
      if (o.next && dfs(o.next)) return true;
    }
    visiting.delete(id);
    done.add(id);
    return false;
  };

  return dfs(t.rootNodeId);
}

function everyPathTerminates(t: DxTree): boolean {
  const byId = new Map(t.nodes.map(n => [n.id, n]));
  // Since the graph is acyclic and every outcome either continues to a real
  // node or concludes, every walk is finite and ends in a conclusion. Verify
  // the "either/or" property holds for every reachable node.
  const seen = new Set<string>();
  const stack = [t.rootNodeId];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const node = byId.get(id);
    if (!node) return false;
    for (const o of node.outcomes) {
      if (o.next) stack.push(o.next);
      else if (!o.conclusion) return false;
    }
  }
  return true;
}

console.log(`\n✅ testKbDiagnostics: ${passed} assertions passed\n`);
