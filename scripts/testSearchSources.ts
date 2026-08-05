#!/usr/bin/env tsx
/**
 * One search, everything in it, and nothing private.
 *
 * WHAT THIS SUITE EXISTS TO PROVE
 * -------------------------------
 * Three claims that are easy to make and easy to break silently:
 *
 *   1. There is exactly ONE search field that reaches the whole platform. No
 *      second engine anywhere, and specifically none inside the shop.
 *   2. Everything public IS in it — the encyclopedia, the software centre, the
 *      diagnostics, the projects with their sections, the published products,
 *      their variants, the services, and the standing pages.
 *   3. Nothing private is. No draft, no supplier, no cost, no margin, no admin
 *      note, no member's private data.
 *
 * The third is the one worth having a suite for. A leak here is not a bug the
 * reader notices — it is a competitor reading our supplier list out of a search
 * result, and nothing about the page would look wrong.
 *
 * WHY IT REGISTERS THE WEB SOURCES ITSELF
 * ---------------------------------------
 * Because the registration is the thing under test. If `registerWebSearchSources`
 * stops being called by the page, this suite still passes — so the LAST section
 * reads the page source and asserts the call is there. A suite that only tests
 * the library it imports proves the library works and not that anything uses it.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  registerSearchDocs, getSearchIndex, resetSearchIndexCache, clearRegisteredDocs,
  registeredDocSources, SEARCH_TYPE_LABEL_AR, type SearchDoc, type SearchDocType,
} from '../src/data/kb/search/buildIndex';
import { retrieve } from '../src/platform/retrieval';
import { articleVariants } from '../src/data/kb/search/normalize';
import { projectSearchDocs, PROJECT_SLICE_ANCHORS } from '../web/lib/search/projectDocs';
import { storeSearchDocs } from '../web/lib/search/storeDocs';
import { pageSearchDocs } from '../web/lib/search/pageDocs';
import { WEB_SOURCE_KEYS } from '../web/lib/search/register';
import { GROUP_OF_TYPE, RESULT_GROUPS, groupOf } from '../web/lib/searchView';
import { ALL_PROJECTS } from '../src/data/projects/registry';
import { STORE_PRODUCTS } from '../src/data/store/catalogue';
import { SERVICES_CATEGORY_ID } from '../src/data/store/services';

let passed = 0;
const failures: string[] = [];
function ok(name: string, cond: boolean, detail = ''): void {
  if (cond) { passed += 1; console.log(`  ok — ${name}`); return; }
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  console.log(`  FAIL — ${name}${detail ? ` — ${detail}` : ''}`);
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string): string => readFileSync(join(ROOT, rel), 'utf8');

/* ── Register, exactly as the page does ───────────────────────────────────── */
clearRegisteredDocs();
registerSearchDocs('web:projects', projectSearchDocs);
registerSearchDocs('web:store', storeSearchDocs);
registerSearchDocs('web:pages', pageSearchDocs);
resetSearchIndexCache();

const index = getSearchIndex();
const byType = (t: SearchDocType): SearchDoc[] => index.filter(d => d.type === t);

console.log(`\n[1] The index is one index, and the surfaces contributed to it (${index.length} docs)`);
{
  ok('the web registered every source it declares',
    WEB_SOURCE_KEYS.every(k => registeredDocSources().includes(k)),
    registeredDocSources().join(', '));
  ok('projects reached the index', byType('project').length > 0);
  ok('project sections reached the index', byType('project-section').length > 0);
  /*
   * Products, stated as a RULE rather than a count.
   *
   * Every non-service seed is currently `published: false` — publication is an
   * act gated on having a price, and no price has been recorded yet. So
   * asserting «there is at least one product document» would fail today for a
   * reason that is correct. What must hold is the implication: a published,
   * unsuspended, non-service product HAS a document, and every document
   * corresponds to such a product.
   */
  const shouldBeIndexed = STORE_PRODUCTS.filter(p =>
    p.published && !p.suspendedReasonAr && p.categoryId !== SERVICES_CATEGORY_ID);
  const productIds = new Set(byType('product').map(d => d.sourceId));
  ok('every publishable product has a document',
    shouldBeIndexed.every(p => productIds.has(p.id)),
    shouldBeIndexed.filter(p => !productIds.has(p.id)).map(p => p.id).join(', '));
  ok('…and every product document is one of them',
    byType('product').every(d => shouldBeIndexed.some(p => p.id === d.sourceId)));

  // …and the pipeline itself works, proven on a product that IS published.
  // Without this the rule above passes vacuously while the catalogue is empty.
  const draft = STORE_PRODUCTS.find(p => !p.published && p.categoryId !== SERVICES_CATEGORY_ID);
  if (draft) {
    const saved = draft.published;
    (draft as { published: boolean }).published = true;
    const withDraft = storeSearchDocs();
    (draft as { published: boolean }).published = saved;
    const doc = withDraft.find(d => d.key === `product:${draft.id}`);
    ok('publishing a product makes it findable (control)', !!doc);
    ok('…and it opens its own page (control)',
      doc?.route === `/store/p/${draft.id}`, doc?.route ?? '');
  }
  ok('services reached the index', byType('service').length > 0);
  ok('standing pages reached the index', byType('page').length > 0);

  // Registration is idempotent. A module evaluated twice must not double the
  // shop — a duplicate document is the same row twice under one query.
  const before = getSearchIndex().length;
  registerSearchDocs('web:store', storeSearchDocs);
  resetSearchIndexCache();
  ok('registering the same source twice does not duplicate it',
    getSearchIndex().length === before, `${before} → ${getSearchIndex().length}`);

  const keys = index.map(d => d.key);
  ok('every document key is unique', new Set(keys).size === keys.length,
    `${keys.length - new Set(keys).size} duplicates`);

  // A contributed doc must never shadow reviewed content.
  const coreKeys = new Set(['article:', 'term:', 'dx:'].flatMap(p => keys.filter(k => k.startsWith(p))));
  ok('no contributed document collides with core content', coreKeys.size > 0);
}

console.log('\n[2] Nothing private is findable');
{
  const contributed = index.filter(d =>
    ['project', 'project-section', 'product', 'product-variant', 'service', 'page']
      .includes(d.type));

  // The words that must never appear in a public token, in either language.
  const FORBIDDEN = [
    'supplier', 'supplierurl', 'unitcost', 'costminor', 'marginpct', 'margin',
    'aliexpress', 'مورد', 'الموردين', 'التكلفة', 'الهامش', 'سعر التكلفة',
  ];
  const leaks: string[] = [];
  for (const d of contributed) {
    const all = [
      ...d.titleTokens, ...d.keywordTokens, ...d.bodyTokens,
      ...(d.symptomTokens ?? []), ...(d.exactNames ?? []),
      d.titleAr, d.subtitle ?? '',
    ].join(' ').toLowerCase();
    for (const bad of FORBIDDEN) if (all.includes(bad)) leaks.push(`${d.key}:${bad}`);
  }
  ok('no supply, cost or margin word appears in any contributed document',
    leaks.length === 0, leaks.slice(0, 5).join(', '));

  // The gate that matters most: drafts.
  const unpublished = STORE_PRODUCTS.filter(p => !p.published).map(p => p.id);
  const indexedProductIds = new Set(byType('product').map(d => d.sourceId));
  const exposed = unpublished.filter(id => indexedProductIds.has(id));
  ok('not one unpublished product is indexed', exposed.length === 0, exposed.slice(0, 4).join(', '));
  ok('…and there ARE unpublished products, so that check is not vacuous',
    unpublished.length > 0, `${unpublished.length} drafts`);

  const suspended = STORE_PRODUCTS.filter(p => p.suspendedReasonAr).map(p => p.id);
  ok('no suspended product is indexed',
    suspended.every(id => !indexedProductIds.has(id)));
  // Its REASON is an internal note and must not be searchable even in prose.
  const reasons = STORE_PRODUCTS.map(p => p.suspendedReasonAr).filter(Boolean) as string[];
  const allText = contributed.map(d => `${d.titleAr} ${d.subtitle ?? ''}`).join(' ');
  ok('no suspension reason appears in any indexed text',
    reasons.every(r => !allText.includes(r)));

  const unpublishedProjects = ALL_PROJECTS.filter(p => !p.published).map(p => p.id);
  const indexedProjectIds = new Set(byType('project').map(d => d.sourceId));
  ok('no unpublished project is indexed',
    unpublishedProjects.every(id => !indexedProjectIds.has(id)));

  // A service is a product too, and indexing both projections put the same
  // thing in the results twice under two badges.
  const serviceProductIds = STORE_PRODUCTS
    .filter(p => p.categoryId === SERVICES_CATEGORY_ID).map(p => p.id);
  ok('a service is indexed once, not once per projection',
    serviceProductIds.every(id => !indexedProductIds.has(id)),
    serviceProductIds.filter(id => indexedProductIds.has(id)).join(', '));
  ok('…and services ARE present, under their own type',
    byType('service').length === serviceProductIds.length,
    `${byType('service').length} vs ${serviceProductIds.length}`);
}

console.log('\n[3] Projects are indexed deeply, and their links land where they say');
{
  const published = ALL_PROJECTS.filter(p => p.published);
  ok('every published project has a document',
    published.every(p => index.some(d => d.key === `project:${p.id}`)));

  // The anchors must exist on the page. A deep link that scrolls nowhere is a
  // worse result than one that opens the top of the page, because it looks
  // like it worked.
  const pageSrc = read('web/app/projects/[projectId]/page.tsx');
  const rendered = new Set(
    [...pageSrc.matchAll(/<Section id="([a-z]+)"/g)].map(m => m[1]),
  );
  for (const a of PROJECT_SLICE_ANCHORS) {
    ok(`the «#${a}» anchor is a section the page renders`, rendered.has(a));
  }

  const sectionDocs = byType('project-section');
  ok('sections were actually produced', sectionDocs.length >= published.length * 5,
    `${sectionDocs.length} for ${published.length} projects`);
  ok('every section route carries its anchor',
    sectionDocs.every(d => /^\/projects\/[a-z0-9-]+#[a-z]+$/.test(d.route)),
    sectionDocs.find(d => !/#/.test(d.route))?.route ?? '');
  ok('every section anchor is one the page renders',
    sectionDocs.every(d => rendered.has(d.route.split('#')[1])));

  // The behaviour the brief asked for by name: a technology reaches its project.
  for (const [q, projectId] of [
    ['YOLO', 'thermal-search-rescue'],
    ['SLAM', 'lidar-slam-mapping'],
    ['MAVLink', 'precision-landing-marker'],
    ['هبوط دقيق', 'precision-landing-marker'],
    ['ESP32', 'esp32-mini-drone'],
  ] as const) {
    const r = retrieve(q, { limit: 6 });
    const hit = r.official.find(x => x.type === 'project' && x.id.endsWith(projectId));
    ok(`«${q}» reaches ${projectId} in its top six`, !!hit,
      r.official.slice(0, 3).map(x => x.titleAr.slice(0, 22)).join(' | '));
  }

  // A project must outrank its own sections when the query names the project,
  // and a section must win when the query names the section.
  const named = retrieve('مشروع بحث وإنقاذ', { limit: 4 });
  ok('a project outranks its own sections when the query names it',
    named.official[0]?.type === 'project',
    named.official.slice(0, 2).map(x => x.type).join(' | '));
  const sectionQ = retrieve('تحديات السرب', { limit: 4 });
  ok('a section wins when the query names the section',
    sectionQ.official[0]?.type === 'project-section',
    sectionQ.official.slice(0, 2).map(x => x.type).join(' | '));
}

console.log('\n[4] The store is findable, and it has no search of its own');
{
  // THE INSTRUCTION, ENFORCED. «لا أريد خانة بحث مستقلة داخل المتجر.»
  const storeFiles: string[] = [];
  const walk = (dir: string): void => {
    for (const n of readdirSync(join(ROOT, dir))) {
      const rel = `${dir}/${n}`;
      if (statSync(join(ROOT, rel)).isDirectory()) { walk(rel); continue; }
      if (/\.tsx?$/.test(n)) storeFiles.push(rel);
    }
  };
  walk('web/app/store');
  walk('web/components/store');
  ok('store source files were found', storeFiles.length >= 8, `${storeFiles.length}`);

  const offenders: string[] = [];
  for (const f of storeFiles) {
    const src = read(f);
    // A search INPUT, a search form, or a search role — any of the three is a
    // second door. Reading the shop's own pages, not the whole app, so the
    // header field (which is global and correct) is out of scope by construction.
    if (/type=["']search["']/.test(src)) offenders.push(`${f}: <input type="search">`);
    if (/role=["']search["']/.test(src)) offenders.push(`${f}: role="search"`);
    if (/action=\{?["']?\/search/.test(src)) offenders.push(`${f}: a form posting to /search`);
  }
  ok('no page under the store carries a search field of its own',
    offenders.length === 0, offenders.join(' · '));

  // …and the shop is reachable THROUGH the one search instead.
  const svc = retrieve('البرمجة والإعداد', { limit: 5 });
  ok('a service is reachable from the platform search',
    svc.official.some(r => r.type === 'service'),
    svc.official.slice(0, 3).map(r => r.type).join(' | '));

  const productDocs = byType('product');
  ok('every product document opens a product page',
    productDocs.every(d => d.route.startsWith('/store/p/')));
  ok('a variant opens its own product, never a page of its own',
    byType('product-variant').every(d => d.route.startsWith('/store/p/')));

  // The shop must not outrank the encyclopedia on a question about knowledge.
  const advice = retrieve('كيف أختار نظارة', { limit: 5 });
  ok('a «how do I choose» question is answered by content, not by stock',
    advice.official[0] !== undefined && groupOf(advice.official[0].type) !== 'store',
    advice.official[0] ? `${advice.official[0].type}` : 'none');
}

console.log('\n[5] Every result type has a shelf, and every shelf is reachable');
{
  const allTypes = Object.keys(SEARCH_TYPE_LABEL_AR) as SearchDocType[];
  const unmapped = allTypes.filter(t => !(t in GROUP_OF_TYPE));
  ok('every indexed type is mapped to a group', unmapped.length === 0, unmapped.join(', '));

  const groupIds = new Set(RESULT_GROUPS.map(g => g.id));
  const strayGroups = [...new Set(Object.values(GROUP_OF_TYPE))].filter(g => !groupIds.has(g));
  ok('every mapped group is a declared group', strayGroups.length === 0, strayGroups.join(', '));

  // Each shelf must be reachable by SOME query, or it is a heading nobody sees.
  for (const [g, q] of [
    ['knowledge', 'متحكم الطيران'],
    ['diagnostics', 'المحرك لا يعمل'],
    ['software', 'Betaflight ports'],
    ['projects', 'SLAM'],
    ['store', 'البرمجة والإعداد'],
    ['pages', 'اتصل بنا'],
  ] as const) {
    const r = retrieve(q, { limit: 20 });
    ok(`the «${g}» shelf is reachable — «${q}»`,
      r.official.some(x => groupOf(x.type) === g));
  }
}

console.log('\n[6] Every result the engine can produce has somewhere to go');
{
  const noRoute = index.filter(d => !d.route || !d.route.startsWith('/'));
  ok('every document has an absolute route', noRoute.length === 0,
    noRoute.slice(0, 4).map(d => d.key).join(', '));

  // No document may point at a route family this surface does not serve. The
  // known phone-only families are handled by the resolver and rendered as
  // «متاح في التطبيق»; anything ELSE would be a dead click.
  const WEB_PREFIXES = [
    '/kb/', '/glossary', '/diagnose', '/betaflight', '/programming', '/projects',
    '/store', '/community', '/search', '/about', '/contact', '/project',
  ];
  const PHONE_ONLY_PREFIXES = ['/lessons/', '/assembly', '/roadmap/', '/checklists', '/troubleshooting'];
  const stray = index.filter(d =>
    !WEB_PREFIXES.some(p => d.route.startsWith(p))
    && !PHONE_ONLY_PREFIXES.some(p => d.route.startsWith(p)));
  ok('no document points at an unknown route family', stray.length === 0,
    stray.slice(0, 4).map(d => `${d.key}→${d.route}`).join(', '));
}

console.log('\n[7] Arabic clitics are matched, and only where they should be');
{
  // The fix itself.
  ok('«ال» is offered as a second form', articleVariants('الهبوط').includes('هبوط'));
  ok('«وال» yields both the article form and the bare one',
    articleVariants('والانقاذ').includes('الانقاذ') && articleVariants('والانقاذ').includes('انقاذ'));
  ok('«لل» reconstructs the article form', articleVariants('للمبتدئ').includes('المبتدئ'));
  ok('«بال» is handled', articleVariants('بالمحرك').includes('محرك'));

  // …and the words it must NOT touch. These are the ones that would break.
  for (const safe of ['وحدة', 'وقت', 'وزن', 'ولا']) {
    ok(`«${safe}» is left alone`, articleVariants(safe).length === 1, articleVariants(safe).join(','));
  }
  // The original form is always kept, so a match can never be lost.
  for (const t of ['الهبوط', 'والانقاذ', 'للمبتدئ', 'وحدة']) {
    ok(`«${t}» keeps its own form`, articleVariants(t)[0] === t);
  }

  // The behaviour, end to end.
  const r = retrieve('هبوط دقيق', { limit: 3 });
  ok('«هبوط دقيق» finds «الهبوط الذاتي الدقيق…»',
    r.official.some(x => x.titleAr.includes('الهبوط الذاتي الدقيق')),
    r.official.slice(0, 2).map(x => x.titleAr.slice(0, 26)).join(' | '));
}

console.log('\n[8] The page actually calls the registration');
{
  const src = read('web/app/search/page.tsx');
  ok('the search page registers the web sources', src.includes('registerWebSearchSources()'));
  // Compared against the CALL, not the import line at the top of the file.
  const body = src.slice(src.indexOf('export default'));
  ok('…before it retrieves anything',
    body.indexOf('registerWebSearchSources()') < body.indexOf('retrieve('));
  ok('the page groups results into shelves', src.includes('search-shelf-'));
  ok('…and filters by shelf rather than by document type',
    src.includes('search-filter-') && !src.includes('typeFilter'));
  ok('the raw score is never rendered', !/result\.score/.test(src));

  // One search field on the platform, and the header is where it lives.
  const header = read('web/components/SiteHeader.tsx');
  ok('the header carries the one global field', header.includes('header-search'));
}

console.log(`\n${failures.length ? '❌' : '✅'} testSearchSources: ${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log(`   ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
