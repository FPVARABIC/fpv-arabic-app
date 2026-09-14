/**
 * FREEZE WHAT V1's `computeBom` RETURNS, BEFORE PHASE 2G-B TOUCHED IT
 * ===================================================================
 *
 * Phase 2G-B moved the price arithmetic and the three category tiers out of
 * `web/lib/build/bom.ts` into `web/lib/build/bomPricing.ts`, so that BUILD V2
 * could reuse them without importing `draft.ts` — and, behind it, the project
 * WRITER. `bom.ts` now delegates.
 *
 * That refactor is only safe if V1's answer did not move, and «I read the diff
 * and it looks equivalent» is not a proof. So this writes the answer down.
 *
 * WHY IT REFUSES TO OVERWRITE
 * ---------------------------
 * The fixture must be generated from the code as it was BEFORE the change, or
 * the comparison degenerates into «the current BOM agrees with the current
 * BOM» — a tautology that passes green while guaranteeing nothing. It was
 * produced by checking `web/lib/build/bom.ts` out of canonical
 * 50992c26c68d30365b61dc4222b7101ba10eaef0 as a sibling module and running
 * this against it.
 *
 * Regenerating it from today's code would silently destroy that. Pass
 * `--force` only to establish a NEW baseline, deliberately.
 *
 * Run: npx tsx --tsconfig web/tsconfig.json scripts/snapshotBom.ts [--force]
 *      [--from <module>]
 */
import { writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { PART_CATEGORY_MAP } from '../src/data/project/store';
import { emptyDraft, type BuildDraft } from '../web/lib/build/draft';

const OUT = 'scripts/fixtures/computeBom.pre2gb.json';
const force = process.argv.includes('--force');
const fromIdx = process.argv.indexOf('--from');
const from = fromIdx >= 0 ? process.argv[fromIdx + 1] : '../web/lib/build/bom';
/** The commit the module under `--from` was checked out of. Recorded, not guessed. */
const shaIdx = process.argv.indexOf('--source-sha');
const sourceSha = shaIdx >= 0 ? process.argv[shaIdx + 1] : 'HEAD (working tree)';

if (existsSync(OUT) && !force) {
  console.error(`${OUT} already exists.`);
  console.error('It is a BASELINE: it must keep describing the behaviour that existed');
  console.error('BEFORE the pricing seam was extracted. Regenerating it from the current');
  console.error('code would make scripts/testWebBuild.ts compare the code against itself.');
  console.error('Pass --force only if you mean to establish a new baseline.');
  process.exit(1);
}

const { computeBom } = await import(from) as
  { computeBom: (d: BuildDraft) => unknown };

/**
 * DRAFTS THAT ACTUALLY EXERCISE THE RULES, built by walking the catalogue
 * rather than by hand: every category at three depths, plus the cases where
 * the arithmetic has something to decide — an unpriced part, an external name
 * with no part behind it, and a draft that is entirely empty.
 */
const categories = Object.keys(PART_CATEGORY_MAP).sort();
const unpriced = Object.entries(PART_CATEGORY_MAP)
  .flatMap(([c, list]) => list.filter(p => !p.priceRangeUSD).map(p => [c, p.id] as const));

const CASES: [string, BuildDraft][] = [];
const draft = (label: string, build: (d: BuildDraft) => void) => {
  const d = emptyDraft();
  build(d);
  CASES.push([label, d]);
};

draft('empty', () => {});
for (let depth = 0; depth < 3; depth++) {
  draft(`all-categories-index-${depth}`, d => {
    for (const c of categories) {
      const p = PART_CATEGORY_MAP[c][depth];
      if (p) d.partIds[c] = p.id;
    }
  });
}
for (const c of categories) {
  draft(`only-${c}`, d => { d.partIds[c] = PART_CATEGORY_MAP[c][0].id; });
  draft(`external-${c}`, d => { d.externalParts[c] = `اسم كتبه القارئ — ${c}`; });
  draft(`part-and-external-${c}`, d => {
    d.partIds[c] = PART_CATEGORY_MAP[c][0].id;
    d.externalParts[c] = `اسم كتبه القارئ — ${c}`;
  });
}
for (const [c, id] of unpriced) draft(`unpriced-${c}-${id}`, d => { d.partIds[c] = id; });
draft('every-unpriced-at-once', d => { for (const [c, id] of unpriced) d.partIds[c] = id; });
draft('unknown-category-id', d => { d.partIds.notAShelf = 'not-a-part'; });
draft('known-category-unknown-id', d => { d.partIds.frames = 'frame-that-does-not-exist'; });

writeFileSync(OUT, `${JSON.stringify({
  note: 'V1 computeBom() output, frozen BEFORE the Phase 2G-B pricing extraction. '
    + 'Never regenerate from post-change code — see scripts/snapshotBom.ts.',
  /** Where the BEHAVIOUR came from. This is the field that makes it a baseline. */
  sourceCommit: sourceSha,
  generatedFrom: from,
  /** The tree that ran the generator — NOT the source of the behaviour above. */
  generatedOnHead: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  cases: CASES.map(([label, d]) => ({ label, draft: d, bom: computeBom(d) })),
}, null, 2)}\n`);
console.log(`wrote ${OUT} — ${CASES.length} cases, from ${from} @ ${sourceSha}`);
