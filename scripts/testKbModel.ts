/**
 * Model-integrity + coverage-matrix + glossary proof for the KB content spine.
 *
 * This is the mechanical half of the product spec's acceptance gate ("بوابة
 * قبول صارمة"). It is deliberately adversarial about the failure modes the spec
 * names explicitly:
 *   - "عنوان بلا محتوى"      → minimum block count per article
 *   - "بيانات وهمية / قريباً" → placeholder-text scan
 *   - coverage claimed but not delivered → every declared axis must be backed
 *     by an article that passes the substance floor
 *   - dead cross-links       → every link target must resolve
 *
 * Run: npx tsx scripts/testKbModel.ts
 */
import assert from 'node:assert/strict';

import { allKbModules, getArticle, getModule, resolveLinkRoute, allKbArticles } from '../src/data/kb/registry';
import { computeModuleCoverage, checkArticleIntegrity, articleBlockCount, MIN_BLOCKS_PER_ARTICLE } from '../src/data/kb/coverage';
import { kbTerms, getTerm } from '../src/data/kb/glossary/terms';
import { allDxTrees, getDxTree } from '../src/data/kb/diagnostics/trees';
import { getBacklinks } from '../src/data/kb/backlinks';
import { lessonsData } from '../src/data/lessonsData';
import { bfPageRegistry } from '../src/data/betaflight/pageRegistry';
import { roadmapData } from '../src/data/roadmapData';
import { KB_LAYER_ORDER } from '../src/data/kb/types';

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

const articles = allKbArticles();

console.log('\n[1] Registry shape');
{
  ok('at least one module is registered', allKbModules.length >= 1);
  ok('every module has at least one article', allKbModules.every(m => m.articles.length > 0));
  ok('every module declares at least one learning path', allKbModules.every(m => m.paths.length > 0));
  ok('every module declares requiredCoverage', allKbModules.every(m => m.requiredCoverage.length > 0));

  const ids = articles.map(a => a.id);
  ok('no duplicate article ids', new Set(ids).size === ids.length);

  const modIds = allKbModules.map(m => m.id);
  ok('no duplicate module ids', new Set(modIds).size === modIds.length);

  ok('every article.moduleId points at a real module', articles.every(a => !!getModule(a.moduleId)));

  for (const m of allKbModules) {
    const orders = m.articles.map(a => a.order);
    ok(`module ${m.id}: article orders are unique`, new Set(orders).size === orders.length);
  }
}

console.log('\n[2] Article substance — no title-without-content');
{
  const problems = articles.flatMap(a => checkArticleIntegrity(a));
  if (problems.length > 0) {
    console.error('\nIntegrity problems found:');
    for (const p of problems) console.error(`  - ${p.articleId}: ${p.problem}`);
  }
  ok('no article integrity problems', problems.length === 0);

  ok(
    `every article has >= ${MIN_BLOCKS_PER_ARTICLE} content blocks`,
    articles.every(a => articleBlockCount(a) >= MIN_BLOCKS_PER_ARTICLE),
  );

  // Layers must be real: an entry present but empty is exactly the "empty tab"
  // the UI must never render.
  ok(
    'no article declares an empty layer array',
    articles.every(a => KB_LAYER_ORDER.every(l => a.layers[l] === undefined || a.layers[l]!.length > 0)),
  );

  // Every article must be genuinely multi-layer — one layer is a paragraph,
  // not the layered depth the spec requires.
  const singleLayer = articles.filter(a => Object.keys(a.layers).length < 2);
  if (singleLayer.length) console.error('  single-layer articles:', singleLayer.map(a => a.id));
  ok('every article has at least 2 layers', singleLayer.length === 0);

  // Depth floor: the spec rejects "فقرة تعريفية قصيرة" as a finished topic.
  const thin = articles.filter(a => JSON.stringify(a.layers).length < 2500);
  if (thin.length) console.error('  thin articles:', thin.map(a => `${a.id} (${JSON.stringify(a.layers).length} chars)`));
  ok('every article carries substantial body text', thin.length === 0);
}

console.log('\n[3] Coverage matrix is honest');
{
  for (const m of allKbModules) {
    const cov = computeModuleCoverage(m);
    ok(`module ${m.id}: coverage computed over all required axes`, cov.axes.length === m.requiredCoverage.length);

    // The matrix must never claim an axis that no article backs.
    for (const ax of cov.axes) {
      if (!ax.covered) continue;
      ok(
        `module ${m.id}: axis "${ax.axis}" is backed by real articles`,
        ax.articleIds.length > 0 && ax.articleIds.every(id => {
          const a = getArticle(id);
          return !!a && articleBlockCount(a) >= MIN_BLOCKS_PER_ARTICLE;
        }),
      );
    }

    // And the reported percent must match the reported counts — no cosmetic number.
    const expected = Math.round((cov.coveredCount / cov.requiredCount) * 100);
    ok(`module ${m.id}: percent matches counts (${cov.percent}%)`, cov.percent === expected);
    ok(`module ${m.id}: missing list matches uncovered axes`, cov.missing.length === cov.requiredCount - cov.coveredCount);
  }

  // Articles may only claim axes their module actually requires — otherwise a
  // claim silently does nothing and looks like coverage that isn't measured.
  for (const m of allKbModules) {
    const required = new Set(m.requiredCoverage);
    for (const a of m.articles) {
      const stray = a.coverage.filter(c => !required.has(c));
      ok(`article ${a.id}: claims no axis outside its module's requiredCoverage`, stray.length === 0);
    }
  }
}

console.log('\n[4] Referential integrity — every internal link resolves');
{
  const lessonIds = new Set(lessonsData.map(l => l.id));
  const bfIds = new Set(bfPageRegistry.map(e => e.id));
  const roadmapIds = new Set(roadmapData.map(r => r.id));

  let checked = 0;
  const broken: string[] = [];

  const checkLinks = (ownerId: string, links: { kind: string; targetId: string; url?: string }[]) => {
    for (const l of links) {
      checked++;
      switch (l.kind) {
        case 'article':
          if (!getArticle(l.targetId)) broken.push(`${ownerId} → article:${l.targetId}`);
          break;
        case 'lesson':
          if (!lessonIds.has(l.targetId)) broken.push(`${ownerId} → lesson:${l.targetId}`);
          break;
        case 'betaflight':
          if (!bfIds.has(l.targetId)) broken.push(`${ownerId} → betaflight:${l.targetId}`);
          break;
        case 'roadmap':
          if (!roadmapIds.has(l.targetId)) broken.push(`${ownerId} → roadmap:${l.targetId}`);
          break;
        case 'dx':
          if (!getDxTree(l.targetId)) broken.push(`${ownerId} → dx:${l.targetId}`);
          break;
        case 'glossary':
          if (!getTerm(l.targetId)) broken.push(`${ownerId} → glossary:${l.targetId}`);
          break;
        case 'external':
          if (!l.url) broken.push(`${ownerId} → external without url`);
          break;
        // 'assembly' and 'checklist' resolve to section-level routes that always
        // exist; their targetId is a hint, not an addressable record.
        default:
          break;
      }
    }
  };

  for (const a of articles) checkLinks(a.id, a.links);
  for (const t of allDxTrees) checkLinks(t.id, t.links);

  if (broken.length) console.error('  broken links:', broken);
  ok(`all ${checked} declared links resolve`, broken.length === 0);

  ok('every prerequisiteId resolves', articles.every(a => a.prerequisiteIds.every(p => !!getArticle(p))));
  ok('every relatedArticleId resolves', articles.every(a => a.relatedArticleIds.every(p => !!getArticle(p))));
  ok('every glossaryId on an article resolves', articles.every(a => a.glossaryIds.every(g => !!getTerm(g))));
  ok('every dx relatedArticleId resolves', allDxTrees.every(t => t.relatedArticleIds.every(p => !!getArticle(p))));

  // resolveLinkRoute must produce a usable route for every non-external link.
  const unresolved = articles.flatMap(a =>
    a.links.filter(l => l.kind !== 'external' && !resolveLinkRoute(l)).map(l => `${a.id} → ${l.kind}:${l.targetId}`),
  );
  if (unresolved.length) console.error('  unresolved routes:', unresolved);
  ok('resolveLinkRoute returns a route for every internal link', unresolved.length === 0);

  // No article may be a dead end: it must be reachable from a path, and it must
  // lead somewhere.
  for (const m of allKbModules) {
    const inPaths = new Set(m.paths.flatMap(p => p.articleIds));
    const orphans = m.articles.filter(a => !inPaths.has(a.id));
    if (orphans.length) console.error(`  module ${m.id} articles not in any path:`, orphans.map(a => a.id));
    ok(`module ${m.id}: every article appears in at least one path`, orphans.length === 0);

    ok(
      `module ${m.id}: every path article id exists in this module`,
      m.paths.every(p => p.articleIds.every(id => m.articles.some(a => a.id === id))),
    );
  }
}

console.log('\n[5] Sources and versioning');
{
  ok('every article has at least one source', articles.every(a => a.sources.length > 0));
  ok('every article has lastReviewed', articles.every(a => /^\d{4}-\d{2}$/.test(a.lastReviewed)));
  ok('every source has a version string', articles.every(a => a.sources.every(s => !!s.version)));
  ok('every source has reviewedAt', articles.every(a => a.sources.every(s => !!s.reviewedAt)));
  ok('every dx tree has sources and lastReviewed', allDxTrees.every(t => t.sources.length > 0 && !!t.lastReviewed));

  // Any source that is not an authored general principle should carry a URL, so
  // a reader can actually verify it.
  const unverifiable = articles.flatMap(a =>
    a.sources.filter(s => !s.generalPrinciple && s.kind !== 'authored' && s.kind !== 'manufacturer' && !s.url)
      .map(s => `${a.id}: ${s.title}`),
  );
  if (unverifiable.length) console.error('  sources without a URL:', unverifiable);
  ok('every citable source carries a URL', unverifiable.length === 0);
}

console.log('\n[6] Assessment — every article can be checked for understanding');
{
  const noQuiz = articles.filter(a => !a.quiz || a.quiz.length === 0);
  if (noQuiz.length) console.error('  articles without a quiz:', noQuiz.map(a => a.id));
  ok('every article has at least one comprehension question', noQuiz.length === 0);

  for (const a of articles) {
    for (const q of a.quiz ?? []) {
      ok(`${a.id}/${q.id}: has >= 2 options`, q.options.length >= 2);
      ok(`${a.id}/${q.id}: has exactly one correct option`, q.options.filter(o => o.correct).length === 1);
      ok(`${a.id}/${q.id}: every option explains itself`, q.options.every(o => o.feedback.trim().length > 12));
    }
  }
}

console.log('\n[7] Glossary');
{
  const ids = kbTerms.map(t => t.id);
  ok('no duplicate term ids', new Set(ids).size === ids.length);
  ok('every term has ar, en and a short definition', kbTerms.every(t => t.ar && t.en && t.short));
  ok('every relatedTermId resolves', kbTerms.every(t => t.relatedTermIds.every(r => !!getTerm(r))));
  ok('every confusedWith target resolves', kbTerms.every(t => t.confusedWith.every(c => !!getTerm(c.termId))));
  ok('every confusedWith note explains the confusion', kbTerms.every(t => t.confusedWith.every(c => c.note.trim().length > 20)));
  ok('every term articleId resolves', kbTerms.every(t => t.articleIds.every(a => !!getArticle(a))));
  ok('every term is linked to at least one article', kbTerms.every(t => t.articleIds.length > 0));
  ok('no term is self-related', kbTerms.every(t => !t.relatedTermIds.includes(t.id)));
}

console.log('\n[8] Backlinks — existing sections can reach the encyclopedia');
{
  // At least one lesson and one Betaflight page must actually surface a KB
  // strip; otherwise the cross-linking requirement is satisfied only on paper.
  const lessonsWithBacklinks = lessonsData.filter(l => getBacklinks('lesson', l.id).articles.length > 0);
  ok(`at least 3 lessons link back into the KB (found ${lessonsWithBacklinks.length})`, lessonsWithBacklinks.length >= 3);

  const bfWithBacklinks = bfPageRegistry.filter(e => getBacklinks('betaflight', e.id).articles.length > 0);
  ok(`at least 5 Betaflight pages link back into the KB (found ${bfWithBacklinks.length})`, bfWithBacklinks.length >= 5);

  const dxBacklinked = lessonsData.some(l => getBacklinks('lesson', l.id).trees.length > 0)
    || bfPageRegistry.some(e => getBacklinks('betaflight', e.id).trees.length > 0);
  ok('diagnostic trees surface on at least one existing section', dxBacklinked);
}

console.log(`\n✅ testKbModel: ${passed} assertions passed\n`);
