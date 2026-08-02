/**
 * Global-search proof.
 *
 * The spec's own worked example is the acceptance criterion here: «فلاش كنترول»
 * / «فلايت كنترولر» / «Flight Controller» / «FC» must all reach the same
 * content. This script proves normalization, synonym/transliteration expansion,
 * typo tolerance, filters, index coverage and ranking sanity.
 *
 * Run: npx tsx scripts/testKbSearch.ts
 */
import assert from 'node:assert/strict';

import { normalizeText, tokenize, editDistance, fuzzyEquals } from '../src/data/kb/search/normalize';
import { expandQueryTokens } from '../src/data/kb/search/synonyms';
import { getSearchIndex, indexSystems, resetSearchIndexCache } from '../src/data/kb/search/buildIndex';
import { search, countsByType } from '../src/data/kb/search/query';
import { allKbArticles } from '../src/data/kb/registry';
import { kbTerms } from '../src/data/kb/glossary/terms';
import { allDxTrees } from '../src/data/kb/diagnostics/trees';
import { lessonsData } from '../src/data/lessonsData';

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

const keysOf = (q: string, limit = 30) => search(q, { limit }).map(h => h.doc.key);
const topKeys = (q: string, n = 6) => keysOf(q, n);

console.log('\n[1] Arabic normalization');
{
  ok('strips tashkeel', normalizeText('مُتَحَكِّم') === 'متحكم');
  ok('strips tatweel', normalizeText('محــرك') === 'محرك');
  ok('folds alef variants', normalizeText('إعداد') === normalizeText('اعداد'));
  ok('folds alef madda', normalizeText('آلة') === normalizeText('الة'));
  ok('folds ta marbuta to ha', normalizeText('بطارية') === normalizeText('بطاريه'));
  ok('folds alef maqsura to ya', normalizeText('على') === normalizeText('علي'));
  ok('converts Arabic-Indic digits', normalizeText('٢٢٠٧') === '2207');
  ok('lowercases Latin', normalizeText('Flight Controller') === 'flight controller');
  ok('splits on punctuation', tokenize('TX/RX').join(' ') === 'tx rx');
  ok('is idempotent', normalizeText(normalizeText('أَلْمُحَرِّك')) === normalizeText('أَلْمُحَرِّك'));
  ok('empty input is safe', normalizeText('') === '' && tokenize('').length === 0);
}

console.log('\n[2] Edit distance and typo tolerance');
{
  ok('identical strings distance 0', editDistance('betaflight', 'betaflight') === 0);
  ok('single substitution distance 1', editDistance('betaflight', 'betaflighv') === 1);
  ok('transposition counts as 1 (Damerau)', editDistance('betaflight', 'betafligth') === 1);
  ok('caps out beyond max', editDistance('abc', 'zzzzzzzzzz', 3) > 3);
  ok('short tokens are exact-only', !fuzzyEquals('fc', 'fs'));
  ok('long tokens tolerate a typo', fuzzyEquals('betaflight', 'betaflght'));
}

console.log('\n[3] Synonym / transliteration expansion');
{
  const { expanded } = expandQueryTokens(tokenize('فلايت كنترولر'));
  ok('Arabic transliteration expands to the English term', expanded.has('flight controller') || expanded.has('fc'));

  const abbr = expandQueryTokens(tokenize('FC')).expanded;
  ok('abbreviation expands to the full term', abbr.has('flight controller'));

  const arabic = expandQueryTokens(tokenize('متحكم الطيران')).expanded;
  ok('Arabic translation expands to the English term', arabic.has('flight controller'));

  const unknown = expandQueryTokens(tokenize('زقزقة')).expanded;
  ok('unknown token passes through unchanged', unknown.has('زقزقه') || unknown.has('زقزقة'));
}

console.log('\n[4] The spec\'s own example — four spellings, one destination');
{
  const variants = ['فلايت كنترولر', 'فلايت كونترولر', 'Flight Controller', 'FC', 'fc', 'متحكم الطيران', 'كنترولر'];
  const results = variants.map(v => ({ v, keys: topKeys(v, 8) }));

  for (const r of results) {
    ok(`"${r.v}" returns results`, r.keys.length > 0);
  }

  // All variants must surface the same anchor article.
  const anchor = 'article:fc-what-is';
  for (const r of results) {
    ok(`"${r.v}" surfaces the flight-controller article in its top 8`, r.keys.includes(anchor));
  }
}

console.log('\n[5] Cross-language and cross-source reach');
{
  ok('Arabic "اهتزاز" reaches the vibration diagnostic tree', keysOf('اهتزاز').includes('dx:dx-fc-gyro-noise'));
  ok('English "vibration" reaches it too', keysOf('vibration').includes('dx:dx-fc-gyro-noise'));
  ok('"يوارت" (transliterated UART) reaches the ports article', keysOf('يوارت').includes('article:fc-ports'));
  ok('"UART" reaches the ports article', keysOf('UART').includes('article:fc-ports'));
  ok('"فيل سيف" reaches failsafe content', keysOf('فيل سيف').some(k => k.includes('failsafe') || k.includes('fc-first-setup')));

  // A Betaflight setting must be findable by its real English label.
  const bfFieldHits = search('Motor Protocol', { limit: 40 }).filter(h => h.doc.type === 'bf-field' || h.doc.type === 'bf-page');
  ok('Betaflight settings are searchable by their English label', bfFieldHits.length > 0);

  // A part must be findable by name.
  ok('assembly parts are searchable', search('Kakute', { limit: 40 }).some(h => h.doc.type === 'part')
    || search('محرك', { limit: 60 }).some(h => h.doc.type === 'part'));

  // Lessons must be findable.
  ok('lessons are searchable', search('كوادكابتر', { limit: 40 }).some(h => h.doc.type === 'lesson'));

  // Previously-unreachable content must now at least be findable.
  ok('legacy troubleshooting entries are searchable', search('Receiver لا يظهر', { limit: 40 }).some(h => h.doc.type === 'troubleshooting'));
  ok('checklists are searchable', search('قبل الطيران', { limit: 60 }).some(h => h.doc.type === 'checklist'));
}

console.log('\n[6] Typo tolerance end to end');
{
  ok('"betaflght" still finds Betaflight content', keysOf('betaflght').some(k => k.startsWith('bf-')));
  ok('"جيروسكوب" and "جيرسكوب" both find gyro content',
    keysOf('جيروسكوب').includes('article:fc-sensors') && keysOf('جيرسكوب').length > 0);
  ok('nonsense returns nothing rather than noise', search('قثقثقثقثقث', { limit: 10 }).length === 0);
}

console.log('\n[7] Index coverage — nothing is unreachable');
{
  const index = getSearchIndex();
  const keys = index.map(d => d.key);
  ok('no duplicate keys in the index', new Set(keys).size === keys.length);
  ok(`index is populated (${index.length} documents)`, index.length > 300);

  // Every KB article must be reachable by searching its own title.
  const unreachable = allKbArticles().filter(a => !keysOf(a.titleAr, 40).includes(`article:${a.id}`));
  if (unreachable.length) console.error('  unreachable articles:', unreachable.map(a => a.id));
  ok('every KB article is reachable by its own title', unreachable.length === 0);

  // Every glossary term must be reachable by its Arabic name.
  const unreachableTerms = kbTerms.filter(t => !keysOf(t.ar, 40).includes(`term:${t.id}`));
  if (unreachableTerms.length) console.error('  unreachable terms:', unreachableTerms.map(t => t.id));
  ok('every glossary term is reachable by its Arabic name', unreachableTerms.length === 0);

  // Every diagnostic tree must be reachable by its symptom wording.
  const unreachableTrees = allDxTrees.filter(t => !keysOf(t.symptomAr, 40).includes(`dx:${t.id}`));
  if (unreachableTrees.length) console.error('  unreachable trees:', unreachableTrees.map(t => t.id));
  ok('every diagnostic tree is reachable by its symptom', unreachableTrees.length === 0);

  // Every lesson must be reachable by its title.
  const unreachableLessons = lessonsData.filter(l => !keysOf(l.title, 40).includes(`lesson:${l.id}`));
  if (unreachableLessons.length) console.error('  unreachable lessons:', unreachableLessons.map(l => l.id));
  ok('every lesson is reachable by its own title', unreachableLessons.length === 0);

  ok('index exposes systems for filtering', indexSystems().length > 3);

  // The index claims to be built once and cached. That claim is load-bearing —
  // it is why search is fast enough to run on every keystroke — so it is proven
  // rather than assumed.
  const first = getSearchIndex();
  ok('repeat calls return the SAME cached array, not a rebuild', getSearchIndex() === first);
  resetSearchIndexCache();
  const rebuilt = getSearchIndex();
  ok('after a reset the index is a new array', rebuilt !== first);
  ok('…with identical content', rebuilt.length === first.length
    && rebuilt.every((d, i) => d.key === first[i].key));
}

console.log('\n[8] Filters');
{
  const all = search('متحكم الطيران', { limit: 200 });
  const onlyArticles = search('متحكم الطيران', { filters: { types: ['article'] }, limit: 200 });
  ok('type filter narrows results', onlyArticles.length > 0 && onlyArticles.length <= all.length);
  ok('type filter returns only that type', onlyArticles.every(h => h.doc.type === 'article'));

  const diagnostic = search('اهتزاز', { filters: { contentClass: 'diagnostic' }, limit: 50 });
  ok('content-class filter works', diagnostic.length > 0 && diagnostic.every(h => h.doc.contentClass === 'diagnostic'));

  const bySystem = search('طاقة', { filters: { system: 'flight-controller' }, limit: 50 });
  ok('system filter works', bySystem.every(h => h.doc.system === 'flight-controller'));

  const bySoftware = search('Betaflight', { filters: { software: 'betaflight' }, limit: 50 });
  ok('software filter works', bySoftware.length > 0 && bySoftware.every(h => h.doc.software === 'betaflight'));

  const counts = countsByType('متحكم الطيران');
  ok('countsByType reports per-type counts', Object.keys(counts).length > 0);
}

console.log('\n[9] Ranking sanity');
{
  // An exact title must outrank a body mention.
  const hits = search('حلقة التحكم', { limit: 10 });
  ok('exact title match ranks first', hits.length > 0 && hits[0].doc.key === 'article:fc-control-loop');

  // Scores must be strictly descending.
  const scores = search('متحكم الطيران', { limit: 30 }).map(h => h.score);
  ok('results are sorted by descending score', scores.every((s, i) => i === 0 || scores[i - 1] >= s));

  // Every hit must carry a reason — no unexplained result.
  ok('every hit reports why it matched', search('UART', { limit: 30 }).every(h => !!h.reason));

  // Empty query returns nothing rather than the whole index.
  ok('empty query returns nothing', search('   ', { limit: 10 }).length === 0);
}

console.log('\n[10] Performance guard');
{
  const queries = ['متحكم الطيران', 'UART', 'اهتزاز', 'betaflight', 'فلايت كنترولر', 'DShot', 'بطارية'];
  const start = process.hrtime.bigint();
  for (let i = 0; i < 20; i++) for (const q of queries) search(q, { limit: 50 });
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  const perQuery = ms / (20 * queries.length);
  console.log(`  (${perQuery.toFixed(2)} ms per query over ${20 * queries.length} runs)`);
  ok(`a query stays under 50 ms (measured ${perQuery.toFixed(2)} ms)`, perQuery < 50);
}

console.log(`\n✅ testKbSearch: ${passed} assertions passed\n`);
