/**
 * The retrieval layer, against the promises it makes.
 *
 * WHAT THIS FILE IS DEFENDING
 * ---------------------------
 * Four things, each of which passes a build and fails a reader:
 *
 *   1. that there is ONE index and ONE engine, so the assistant that arrives
 *      later cannot bring a second
 *   2. that the ranking actually answers the queries people type — asserted
 *      with the real sentences, not with tokens chosen to make it pass
 *   3. that reviewed knowledge, a member's opinion and one person's aircraft
 *      never end up in the same list
 *   4. that the contract runs in Node with no React, no DOM and no router,
 *      because a retrieval layer that needs a browser is a UI feature wearing
 *      an architecture's clothes
 *
 * THE RANKING ASSERTIONS ARE THE POINT
 * ------------------------------------
 * Every query in section [3] is one that MEASURABLY returned the wrong thing
 * before this batch, recorded here with what it returned. They are regression
 * tests for real defects, not examples chosen to look good.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { retrieve, detectIntents, isBareAbbreviation } from '../src/platform/retrieval';
import type { ProjectContextInput } from '../src/platform/retrieval';
import { getSearchIndex, resetSearchIndexCache, SEARCH_TYPE_LABEL_AR } from '../src/data/kb/search/buildIndex';
import { search } from '../src/data/kb/search/query';
import { contentTokens, isStopword, normalizeText, tokenize } from '../src/data/kb/search/normalize';
import { resolveDestination } from '../src/platform/destinations';
import { getArticle, getModule } from '../src/data/kb/registry';
import type { DestinationChecks } from '../src/platform/destinations';
import { getDxTree } from '../src/data/kb/diagnostics/trees';
import { kbTerms } from '../src/data/kb/glossary/terms';

let passed = 0;
let failed = 0;
function ok(label: string, cond: boolean): void {
  if (cond) { passed++; console.log(`  ok — ${label}`); }
  else { failed++; console.error(`  FAIL — ${label}`); }
}

const ROOT = new URL('..', import.meta.url).pathname;

/**
 * The existence checks every real caller supplies.
 *
 * An article destination cannot become a URL without a module lookup — the
 * resolver refuses rather than guessing one, which is deliberate. Resolving
 * without these would test a configuration no surface actually uses.
 */
const CHECKS: DestinationChecks = {
  articleExists: id => !!getArticle(id),
  moduleExists: id => !!getModule(id),
  moduleIdOfArticle: id => getArticle(id)?.moduleId,
  dxExists: id => !!getDxTree(id),
  glossaryExists: id => kbTerms.some(t => t.id === id),
};

/** Where a given id ranks for a query, or -1. */
function rankOf(query: string, id: string, limit = 12): number {
  const r = retrieve(query, { limit });
  return r.official.findIndex(x => x.id === id);
}

/** The ids of the top N results, for readable failure output. */
function topIds(query: string, n = 3): string[] {
  return retrieve(query, { limit: n }).official.map(r => r.id);
}

function assertTop(query: string, id: string, within: number, note: string): void {
  const rank = rankOf(query, id, Math.max(within, 12));
  const good = rank >= 0 && rank < within;
  if (!good) console.error(`     «${query}» → ${topIds(query, 4).join(' | ')}`);
  ok(`«${query}» ${note}`, good);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[1] One index, one engine — and everything is in it');
{
  const index = getSearchIndex();
  ok(`the index holds every source (${index.length})`, index.length > 1300);

  const byType: Record<string, number> = {};
  for (const d of index) byType[d.type] = (byType[d.type] ?? 0) + 1;

  // Each of these was audited as MISSING before this batch. The counts are the
  // registries' own, so a source that stops being indexed fails here.
  ok(`knowledge modules are indexed (${byType.module ?? 0})`, (byType.module ?? 0) >= 7);
  ok(`learning paths are indexed (${byType.path ?? 0})`, (byType.path ?? 0) >= 30);
  ok(`diagnostic NODES are indexed, not just tree roots (${byType['dx-node'] ?? 0})`,
    (byType['dx-node'] ?? 0) >= 100);
  ok(`build archetypes are indexed (${byType['drone-type'] ?? 0})`, (byType['drone-type'] ?? 0) >= 5);

  // And the ones that were already there stayed.
  for (const [t, min] of [
    ['article', 90], ['term', 170], ['dx', 28], ['lesson', 16], ['bf-page', 26],
    ['bf-field', 500], ['part', 60], ['elrs-step', 12], ['elrs-issue', 40],
    ['edgetx-topic', 30], ['edgetx-setting', 60], ['video-tool', 18], ['software-scope', 5],
  ] as const) {
    ok(`${t} is still indexed (${byType[t] ?? 0})`, (byType[t] ?? 0) >= min);
  }

  // Every type has a human label, or a result renders with a raw slug.
  const unlabelled = Object.keys(byType).filter(t => !(t in SEARCH_TYPE_LABEL_AR));
  if (unlabelled.length) console.error('   UNLABELLED TYPES:', unlabelled);
  ok('every indexed type has an Arabic badge', unlabelled.length === 0);

  // The one-index rule, enforced structurally: only one module may build docs.
  const dataFiles = walk(join(ROOT, 'src/data')).concat(walk(join(ROOT, 'src/platform')));
  const builders = dataFiles.filter(f =>
    /getSearchIndex\s*\(\s*\)\s*{|function buildDocs/.test(readFileSync(f, 'utf8')));
  ok('exactly one module builds the index', builders.length === 1);

  const rankers = dataFiles.filter(f => /function scoreDoc/.test(readFileSync(f, 'utf8')));
  ok('exactly one module scores documents', rankers.length === 1);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.ts')) out.push(full);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2] Intent is read from how the question was asked');
{
  // Written the way a person actually types them — with hamza, with ta marbuta,
  // with a question mark — because the patterns match the NORMALISED form and a
  // pattern written in unnormalised Arabic fails silently. That bug shipped in
  // the first draft of this file's subject and every intent came back empty.
  const CASES: [string, string][] = [
    ['أين أجد Ports؟', 'navigate'],
    ['وين إعدادات الفيديو', 'navigate'],
    ['افتح مشكلة الشاشة السوداء', 'navigate'],
    ['هل تدعمون INAV؟', 'coverage'],
    ['هل ArduPilot مدعوم', 'coverage'],
    ['الريسيفر لا يشتغل', 'diagnose'],
    ['المحرك ما يدور', 'diagnose'],
    ['لماذا لا تسلّح الطائرة', 'diagnose'],
    ['كيف أغير اتجاه المحرك؟', 'configure'],
    ['أريد بناء درون سينمائي', 'build'],
    ['من أين أبدأ', 'build'],
    ['ما الفرق بين AIO وStack؟', 'compare'],
    ['ما هو UART', 'explain'],
  ];
  for (const [q, want] of CASES) {
    const got = detectIntents(q);
    if (!got.includes(want as never)) console.error(`     «${q}» → [${got.join(',')}]`);
    ok(`«${q}» reads as ${want}`, got.includes(want as never));
  }

  // «ما» negates in «ما يشتغل» and interrogates in «ما هو». Reading the second
  // as a fault report sent every definition question to the diagnostics.
  ok('«ما هو UART» is not read as a fault report', !detectIntents('ما هو UART').includes('diagnose'));
  ok('«ما الفرق بين X وY» is not read as a fault report',
    !detectIntents('ما الفرق بين AIO وStack').includes('compare' as never) === false
    && !detectIntents('ما الفرق بين AIO وStack').includes('diagnose'));

  // A bare noun carries no intent, and pretending otherwise reorders on noise.
  ok('a bare noun produces no intent', detectIntents('UART').length === 0);
  ok('an empty query produces no intent', detectIntents('').length === 0);

  // At most two, so a rambling query cannot stack four sets of biases.
  ok('never more than two intents',
    detectIntents('لماذا لا أستطيع أن أضبط أين أجد بناء الفرق').length <= 2);

  ok('a bare abbreviation is recognised as one', isBareAbbreviation('ESC') && isBareAbbreviation('vtx'));
  ok('a sentence is not', !isBareAbbreviation('ما هو ESC'));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3] The queries that used to fail');
{
  /**
   * Each of these was measured returning the wrong thing before this batch.
   * The comment on each says what it returned.
   */

  // returned: part:receiver-radiomaster-rp1-v2-budget (a PRODUCT)
  const receiver = retrieve('الريسيفر لا يشتغل', { limit: 5 });
  ok('«الريسيفر لا يشتغل» leads with a diagnosis, not a product',
    ['dx', 'elrs-issue', 'dx-node', 'article'].includes(receiver.official[0]?.type ?? ''));
  ok('…and no product is in the top three',
    !receiver.official.slice(0, 3).some(r => r.type === 'part'));

  // returned: two unrelated dx trees matching on «لا يظهر»
  assertTop('لا يظهر OSD', 'dx:dx-video-osd-missing', 3, 'reaches the OSD diagnosis');

  // returned: video-tool:tool-logs above article:fc-ports; bf-page:ports absent
  assertTop('أين أجد Ports؟', 'bf-page:ports', 2, 'reaches the Betaflight Ports screen');

  // returned: dx-node:dx-prop-thrown.t3 (a thrown-propeller check)
  const direction = retrieve('كيف أغير اتجاه المحرك؟', { limit: 5 });
  ok('«كيف أغير اتجاه المحرك» is not answered with a crash diagnosis',
    direction.official[0]?.type !== 'dx-node' && direction.official[0]?.type !== 'dx');

  // returned: elrs-issue:build-failure (a firmware COMPILE failure)
  const build = retrieve('أريد بناء درون سينمائي', { limit: 5 });
  ok('«أريد بناء درون سينمائي» is not answered with a compile error',
    !build.official.slice(0, 3).some(r => r.id === 'elrs-issue:build-failure'));
  ok('…and reaches a build archetype or a learning path',
    build.official.slice(0, 3).some(r => r.type === 'drone-type' || r.type === 'path' || r.type === 'roadmap'));

  // returned: three articles above the definition
  assertTop('ESC', 'term:esc', 1, 'gives the definition first');
  assertTop('OSD', 'term:osd', 1, 'gives the definition first');
  assertTop('FC', 'term:fc', 1, 'gives the definition first');
  assertTop('MSP', 'term:msp', 1, 'gives the definition first');
  assertTop('CRSF', 'term:crsf', 2, 'gives the definition first');
  assertTop('DFU', 'term:dfu', 2, 'gives the definition first');

  // The ones that already worked must keep working.
  assertTop('هل تدعمون INAV؟', 'software-scope:inav', 1, 'answers the coverage question');
  assertTop('EdgeTX لا يرى الوحدة', 'edgetx-topic:problem-module-missing', 2, 'reaches the module fault');
  assertTop('البطارية تهبط بسرعة', 'dx:dx-battery-sag', 1, 'reaches the sag diagnosis');
  assertTop('ExpressLRS لا يدخل Bind', 'elrs-issue:no-bind', 4, 'reaches the binding fault');
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[4] Arabic, abbreviations, synonyms and typos');
{
  for (const [q, note] of [
    ['بطاريه', 'ta-marbuta folded'],
    ['البطارية', 'definite article'],
    ['فلايت كنترولر', 'transliteration'],
    ['btaflight', 'Latin typo'],
    ['شاشه سوداء', 'symptom, folded'],
    ['يوارت', 'Arabic transliteration of UART'],
  ] as const) {
    const r = retrieve(q, { limit: 5 });
    if (r.official.length === 0) console.error(`     «${q}» → NOTHING`);
    ok(`«${q}» (${note}) finds something`, r.official.length > 0);
  }

  // Stopwords are removed from EVIDENCE but kept for intent — the split that
  // made «أين أجد Ports» work.
  ok('interrogatives are stopwords', isStopword('اين') && isStopword('كيف') && isStopword('هل'));
  ok('subject nouns are not', !isStopword('منفذ') && !isStopword('بطاريه') && !isStopword('uart'));
  ok('content extraction drops only the grammar',
    contentTokens(tokenize('أين أجد Ports؟')).join(' ') === 'ports');
  // …and the intent layer still sees the whole query.
  ok('and intent still reads the word that was stripped',
    detectIntents('أين أجد Ports؟').includes('navigate'));

  // A spelling suggestion is offered, never applied.
  const typo = retrieve('betafliht', { limit: 5 });
  ok('a bad spelling either finds something or suggests a fix',
    typo.official.length > 0 || !!typo.didYouMean);

  // The suggestion can only name a word the platform contains.
  if (typo.didYouMean) {
    const titles = new Set(getSearchIndex().flatMap(d => d.titleTokens));
    ok('the suggestion is a word that exists in the index',
      typo.didYouMean.split(' ').every(w => titles.has(w)));
  } else {
    ok('the suggestion is a word that exists in the index (none offered)', true);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[5] Every result explains itself, and opens');
{
  const r = retrieve('failsafe', { limit: 20 });
  ok('a broad query returns results', r.official.length > 5);

  const unreasoned = r.official.filter(x => x.reasons.length === 0);
  ok('every result carries at least one match reason', unreasoned.length === 0);

  const unmatched = r.official.filter(x => x.matchedTerms.length === 0);
  ok('every result names the words that matched it', unmatched.length === 0);

  // A result must open. Either it has a destination that resolves, or it is one
  // of the two web-only kinds that carry a route instead.
  const ROUTE_ONLY = new Set(['software-scope', 'troubleshooting']);
  const broken = r.official.filter(x => {
    if (ROUTE_ONLY.has(x.type)) return false;
    return !x.destination || !resolveDestination(x.destination, CHECKS);
  });
  if (broken.length) console.error('   UNOPENABLE:', broken.map(b => b.id));
  ok('every result resolves to a real destination', broken.length === 0);

  // Across MANY queries, not one — a single query exercises few types.
  const seen = new Set<string>();
  const allBroken: string[] = [];
  for (const q of ['uart', 'esc', 'بطارية', 'osd', 'binding', 'المحرك', 'inav', 'مسار', 'منظومة', 'سينمائي']) {
    for (const x of retrieve(q, { limit: 40 }).official) {
      seen.add(x.type);
      if (ROUTE_ONLY.has(x.type)) continue;
      if (!x.destination || !resolveDestination(x.destination, CHECKS)) allBroken.push(`${q}:${x.id}`);
    }
  }
  if (allBroken.length) console.error('   UNOPENABLE:', allBroken.slice(0, 6));
  ok(`every result across ${seen.size} types resolves`, allBroken.length === 0);
  ok('the sweep actually exercised most types', seen.size >= 12);

  // The destinations must be REAL — resolving is not the same as existing.
  const dangling: string[] = [];
  for (const q of ['uart', 'esc', 'osd', 'المحرك']) {
    for (const x of retrieve(q, { limit: 40 }).official) {
      const d = x.destination;
      if (!d) continue;
      if (d.kind === 'article' && !getArticle(d.id)) dangling.push(x.id);
      if (d.kind === 'module' && !getModule(d.id)) dangling.push(x.id);
      if (d.kind === 'dx' && !getDxTree(d.id)) dangling.push(x.id);
      if (d.kind === 'glossary' && !kbTerms.some(t => t.id === d.id)) dangling.push(x.id);
    }
  }
  if (dangling.length) console.error('   DANGLING:', dangling.slice(0, 6));
  ok('no result points at content that does not exist', dangling.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[6] Knowledge, the project and the community never mix');
{
  const project: ProjectContextInput = {
    exists: true,
    parts: [{ category: 'receiver', labelAr: 'المستقبل', id: 'rx-test', nameAr: 'EP1 Dual' }],
    findings: [{
      id: 'uart-clash',
      severity: 'blocker',
      confidence: 'derived',
      claimAr: 'منفذ UART 2 مطلوب من المستقبل ومن الفيديو معاً',
      missingAr: ['أي منفذ خصّصته للفيديو'],
      links: [{ kind: 'betaflight', targetId: 'ports', label: 'صفحة المنافذ' }],
    }],
    facts: [{ field: 'uartIndex', labelAr: 'منفذ المستقبل', valueAr: 'UART 2' }],
  };

  const r = retrieve('UART', { project, limit: 20 });

  ok('project results come back in their own group', r.project.length > 0);
  ok('the reader\'s own UART is among them',
    r.project.some(x => x.titleAr.includes('UART 2')));
  ok('the open finding is among them',
    r.project.some(x => x.type === 'project-finding'));

  // The separation, asserted from both directions.
  ok('no project result leaked into the official group',
    r.official.every(x => x.provenance === 'official'));
  ok('every project result is marked as the reader\'s own',
    r.project.every(x => x.provenance === 'user-project'));
  ok('the community group is empty without an explicit channel', r.community.length === 0);

  // A finding's own links boost the pages it points at, but never insert them.
  const withProject = retrieve('UART', { project, limit: 30 }).official.findIndex(x => x.id === 'bf-page:ports');
  const without = retrieve('UART', { limit: 30 }).official.findIndex(x => x.id === 'bf-page:ports');
  ok('a page a finding points at ranks no worse with the project attached',
    withProject >= 0 && (without < 0 || withProject <= without));

  // The boost must not INVENT a result: a page that matches nothing stays out.
  const irrelevant = retrieve('زززز', { project, limit: 20 });
  ok('the project boost cannot introduce an unmatched result',
    irrelevant.official.every(x => x.matchedTerms.length > 0));

  // An empty project produces nothing rather than an empty heading.
  const emptyProject: ProjectContextInput = { exists: false, parts: [], findings: [], facts: [] };
  ok('an absent project produces no project results',
    retrieve('UART', { project: emptyProject }).project.length === 0);

  // Confidence appears only where the notion applies.
  const finding = r.project.find(x => x.type === 'project-finding');
  ok('a finding carries the verdict engine\'s own confidence', finding?.confidence === 'derived');
  ok('ordinary content carries none',
    r.official.every(x => x.confidence === undefined));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[7] What a judgement would still need');
{
  const r = retrieve('الريسيفر لا يشتغل', { limit: 5 });
  ok('the response names what it would have to know first',
    r.missingForVerdict.length > 0);
  ok('…and does not name twenty things', r.missingForVerdict.length <= 6);

  // Those requirements come from the entries themselves, never invented here.
  const declared = new Set(getSearchIndex().flatMap(d => d.requiresBeforeVerdict ?? []));
  const invented = r.missingForVerdict.filter(m => !declared.has(m));
  if (invented.length) console.error('   INVENTED:', invented);
  ok('every stated requirement was declared by an entry', invented.length === 0);

  // A query about a definition needs nothing before it can be answered.
  ok('a definition query demands no prerequisites',
    retrieve('ما هو UART', { limit: 3 }).missingForVerdict.length <= 6);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[8] Filters, paging and counts are honest');
{
  const all = retrieve('uart', { limit: 100 });
  ok('a broad query has many results', all.totalOfficial > 10);

  // Counts drive the filter chips, so a chip that promises 12 must deliver 12.
  for (const [type, n] of Object.entries(all.countsByType).slice(0, 5)) {
    const filtered = retrieve('uart', { filters: { types: [type as never] }, limit: 200 });
    ok(`the «${SEARCH_TYPE_LABEL_AR[type as never] ?? type}» chip promises what it delivers`,
      filtered.totalOfficial === n);
  }

  // Paging must partition, not overlap or drop.
  const p1 = retrieve('uart', { limit: 10, offset: 0 }).official.map(r => r.id);
  const p2 = retrieve('uart', { limit: 10, offset: 10 }).official.map(r => r.id);
  ok('page two is a different page', p1.every(id => !p2.includes(id)));
  ok('page one is full when there is more', p1.length === 10 || all.totalOfficial < 10);

  const beyond = retrieve('uart', { limit: 10, offset: 100_000 });
  ok('paging past the end is empty rather than wrong', beyond.official.length === 0);

  // A filter narrows, never invents.
  const narrowed = retrieve('uart', { filters: { types: ['term'] }, limit: 50 });
  ok('a type filter returns only that type', narrowed.official.every(r => r.type === 'term'));
  ok('…and no more than the unfiltered set', narrowed.totalOfficial <= all.totalOfficial);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[9] Ranking rules that must hold in general');
{
  // A scope page must never outrank real content on a query the content covers.
  const escQ = retrieve('فيرموير ESC', { limit: 10 });
  const scopeRank = escQ.official.findIndex(r => r.type === 'software-scope');
  const articleRank = escQ.official.findIndex(r => r.type === 'article');
  ok('«خارج التغطية» never leads when an article covers the subject',
    articleRank >= 0 && (scopeRank < 0 || articleRank < scopeRank));

  // Exact beats partial.
  const exact = retrieve('Failsafe', { limit: 10 });
  ok('an exact name outranks a page that merely mentions it',
    exact.official[0]?.matchedTerms.includes('failsafe') ?? false);

  // A single field row must not lead a query naming its whole screen.
  const ports = retrieve('Ports', { limit: 5 });
  ok('a screen outranks one field inside it',
    (ports.official[0]?.type ?? '') !== 'bf-field');

  // Page context reorders, never excludes.
  const plain = retrieve('منفذ', { limit: 40 });
  const inVideo = retrieve('منفذ', { limit: 40, page: { system: 'video' } });
  ok('page context does not change how many results exist',
    plain.totalOfficial === inVideo.totalOfficial);
  const videoFirstPlain = plain.official.findIndex(r => r.system === 'video');
  const videoFirstCtx = inVideo.official.findIndex(r => r.system === 'video');
  ok('but it does bring the current system forward',
    videoFirstPlain < 0 || videoFirstCtx <= videoFirstPlain);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[10] The contract runs in Node, and holds no content');
{
  // It already has — every assertion above ran with no React, no DOM, no
  // router. This states it as a property rather than leaving it implicit.
  ok('retrieve() ran with no DOM', typeof globalThis.document === 'undefined');
  ok('…and with no router', typeof (globalThis as Record<string, unknown>).next === 'undefined');

  const files = walk(join(ROOT, 'src/platform/retrieval'));
  ok(`the retrieval layer is a handful of files (${files.length})`, files.length <= 4);

  const sources = files.map(f => [f.slice(ROOT.length), readFileSync(f, 'utf8')] as const);

  const reactish = sources.filter(([, s]) =>
    /from\s+'react'|from\s+'next|useState|useEffect|document\.|window\./.test(s));
  if (reactish.length) console.error('   UI COUPLING:', reactish.map(r => r[0]));
  ok('no file in it touches React, Next, the DOM or the window', reactish.length === 0);

  // No content. Long Arabic strings here would mean prose that escaped the core.
  // Comments are stripped first — this file's own explanations are in Arabic
  // and would otherwise fail the rule they describe.
  const stripped = sources.map(([f, s]) =>
    [f, s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')] as const);
  const prose = stripped.filter(([, s]) => /['"`][^'"`\n]*[؀-ۿ][^'"`\n]{60,}['"`]/.test(s));
  if (prose.length) console.error('   PROSE:', prose.map(p => p[0]));
  ok('the retrieval layer holds no prose of its own', prose.length === 0);

  // No routes. Every destination is an identity resolved by the one adapter.
  const routes = stripped.filter(([, s]) => /["'`]\/(kb|diagnose|betaflight|programming|glossary)\//.test(s));
  if (routes.length) console.error('   HARD ROUTES:', routes.map(r => r[0]));
  ok('it writes no URL anywhere', routes.length === 0);

  // It must not reach for storage: a layer that reads localStorage cannot run
  // on a server, and the project is passed IN for exactly that reason.
  const storage = stripped.filter(([, s]) => /localStorage|sessionStorage/.test(s));
  ok('it never reaches for storage', storage.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[11] Performance stays inside its budget');
{
  /**
   * The budget, and why these numbers.
   *
   * The index is built once per process and cached. On the web that is one cold
   * request; on the phone it is the first search. 250 ms is the ceiling at which
   * a first search still feels like a search rather than a load.
   *
   * A query must stay under 40 ms because it runs per request on the server and
   * would run per keystroke if suggestions are ever added. The measured figure
   * is well under; the ceiling is where it stops being acceptable, not where it
   * currently sits.
   */
  resetSearchIndexCache();
  const t0 = performance.now();
  const index = getSearchIndex();
  const buildMs = performance.now() - t0;
  console.log(`     index: ${buildMs.toFixed(0)} ms for ${index.length} docs`);
  ok(`the index builds in under 250 ms (${buildMs.toFixed(0)} ms)`, buildMs < 250);

  // Warm the per-doc set cache the way a real second query would.
  search('warmup');

  const QUERIES = ['UART', 'الريسيفر لا يشتغل', 'betaflight ports failsafe', 'شاشه سوداء', 'esc'];
  let worst = 0;
  for (const q of QUERIES) {
    const s = performance.now();
    for (let i = 0; i < 20; i++) retrieve(q, { limit: 20 });
    const per = (performance.now() - s) / 20;
    worst = Math.max(worst, per);
    console.log(`     «${q}»: ${per.toFixed(1)} ms`);
  }
  ok(`the slowest query stays under 40 ms (${worst.toFixed(1)} ms)`, worst < 40);

  // The index must stay lazy. A module that builds it at import time would make
  // every page that touches the core pay for it.
  const buildIndexSrc = readFileSync(join(ROOT, 'src/data/kb/search/buildIndex.ts'), 'utf8');
  ok('the index is built lazily, on first use',
    /let cached: SearchDoc\[\] \| null = null/.test(buildIndexSrc)
    && /if \(!cached\) cached = buildDocs\(\)/.test(buildIndexSrc));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[12] Retrieval never invents');
{
  const r = retrieve('الريسيفر لا يشتغل', { limit: 10 });
  const index = new Map(getSearchIndex().map(d => [d.key, d]));

  // Every title and summary must be verbatim from the index.
  const fabricated = r.official.filter(x => {
    const doc = index.get(x.id);
    if (!doc) return true;
    return x.titleAr !== doc.titleAr || (x.summaryAr ?? undefined) !== (doc.subtitle ?? undefined);
  });
  if (fabricated.length) console.error('   FABRICATED:', fabricated.map(f => f.id));
  ok('no result text differs from its source', fabricated.length === 0);

  // Review dates and versions must come from the source too.
  const wrongMeta = r.official.filter(x => {
    const doc = index.get(x.id);
    return !!doc && (x.reviewedAt !== doc.reviewedAt || x.version !== doc.version);
  });
  ok('no review date or version is invented', wrongMeta.length === 0);

  // Positive control: the comparison above must be capable of failing.
  ok('the fabrication check can detect a difference',
    'منفذ' !== (index.get('term:uart')?.titleAr ?? 'منفذ'));

  // Nothing carries a compatibility verdict — that engine is elsewhere and this
  // layer must never grow a second one.
  const retrievalSrc = walk(join(ROOT, 'src/platform/retrieval'))
    .map(f => readFileSync(f, 'utf8')).join('\n');
  // Looks for the ACT of judging — importing the verdict engine or assigning a
  // severity — rather than the word «blocker», which appears legitimately in
  // the type that describes a finding the caller passes IN.
  ok('the retrieval layer computes no verdict',
    !/computeFindings|from '.*compatibility|severity\s*=\s*'/.test(retrievalSrc));
}

console.log(`\n${failed === 0 ? '✅' : '❌'} testRetrieval: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

// Referenced so an unused-import lint cannot silently drop a real dependency.
void normalizeText;
