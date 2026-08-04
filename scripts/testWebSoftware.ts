/**
 * The software centre, checked against the promises it makes.
 *
 * WHAT THIS FILE IS ACTUALLY DEFENDING
 * ------------------------------------
 * The requirement was not "build software pages". It was: do not show a program
 * as covered when it is not, do not write a second copy of content that already
 * lives in the core, do not put a general project panel on every page, and make
 * every deep link open the exact entry it names. Each of those is a thing that
 * passes a build and fails a reader, so each of them is asserted here rather
 * than trusted.
 *
 * The assertions that matter most are the ones that would fail if someone did
 * the easy thing later: hard-coded a count, pasted a definition into a
 * component, or added a route without adding it to the resolver.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { bfPageRegistry } from '../src/data/betaflight/pageRegistry';
import { allEdgeTxPages, edgeTxPage, edgeTxTopicIndex, edgeTxSections } from '../src/data/edgetx/registry';
import { allVideoToolPages, videoToolSections } from '../src/data/video/software/registry';
import { setupSteps } from '../src/data/expresslrs/setupSteps';
import { troubleshootingIssues } from '../src/data/expresslrs/troubleshootingIssues';
import { SOFTWARE_SCOPE, softwareScope } from '../src/data/software/scope';
import { resolveDestination } from '../src/platform/destinations';
import { getArticle, getModule } from '../src/data/kb/registry';
import { getDxTree } from '../src/data/kb/diagnostics/trees';
import { kbTerms } from '../src/data/kb/glossary/terms';
import { getSearchIndex } from '../src/data/kb/search/buildIndex';
import { search } from '../src/data/kb/search/query';
import {
  expectedLabelsFor, videoFieldLabels,
  BF_PAGE_RC_FIELDS, BF_PAGE_VIDEO_FIELDS,
  EDGETX_PAGE_RC_FIELDS, ELRS_ENTRY_RC_FIELDS,
} from '../src/data/project/context';

let passed = 0;
let failed = 0;
function ok(label: string, cond: boolean): void {
  if (cond) { passed++; console.log(`  ok — ${label}`); }
  else { failed++; console.error(`  FAIL — ${label}`); }
}

const ROOT = new URL('..', import.meta.url).pathname;

/** Every source file under web/, keyed by repo-relative path. */
function collect(dir: string, out = new Map<string, string>()): Map<string, string> {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) collect(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.set(full.slice(ROOT.length), readFileSync(full, 'utf8'));
  }
  return out;
}
const WEB = collect(join(ROOT, 'web'));

/**
 * Comment-stripped source.
 *
 * Every rule below is also DESCRIBED in a comment somewhere, usually right where
 * it is obeyed. Without this, the file explaining "never hard-code a count"
 * fails the hard-coded-count check by quoting it — which is how a test starts
 * being edited to pass instead of the code.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}
const WEB_CODE = new Map([...WEB].map(([f, s]) => [f, stripComments(s)]));

const SOFTWARE_PAGES = [...WEB.keys()].filter(f =>
  f.startsWith('web/app/programming/') || f.startsWith('web/app/betaflight/'));

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[1] Every documented program has a real, reachable page');
{
  const bfDocumented = bfPageRegistry.filter(p => !!p.page);
  ok(`Betaflight pages with content exist (${bfDocumented.length})`, bfDocumented.length >= 18);

  // A page is only "documented" if it has groups with fields — a page object
  // with an empty body would satisfy `!!p.page` and teach nothing.
  const hollow = bfDocumented.filter(p => {
    const fields = (p.page?.groups ?? []).flatMap(g => g.fields);
    return fields.length === 0;
  });
  ok('no Betaflight page claims content while having no fields', hollow.length === 0);

  const edgetxHollow = allEdgeTxPages.filter(p =>
    p.groups.flatMap(g => g.settings).length === 0 && p.stepsAr.length === 0);
  ok('no EdgeTX topic is empty of both settings and steps', edgetxHollow.length === 0);

  const videoHollow = allVideoToolPages.filter(p => p.stepsAr.length === 0);
  ok('no video topic is empty of steps', videoHollow.length === 0);

  const elrsHollow = setupSteps.filter(s => s.actions.length === 0);
  ok('no ExpressLRS step is empty of actions', elrsHollow.length === 0);

  // Almost every issue is a diagnostic with ordered checks. The exception is
  // deliberate and must stay possible: «متى لا تطير ومتى تتوقف عن التشخيص» is a
  // safety criterion, not a fault to work through, and giving it a checklist
  // would turn "stop" into one more thing to try. So the rule is that an entry
  // without checks has to earn it — stated causes and explicit stop guidance —
  // rather than simply be unfinished.
  const checkless = troubleshootingIssues.filter(i => i.checks.length === 0);
  const unearned = checkless.filter(i =>
    i.likelyCauses.length === 0 || i.nextIfUnresolved.length < 40 || i.resolvedWhen.length < 40);
  if (unearned.length) console.error('   UNFINISHED ISSUES:', unearned.map(i => i.id));
  ok(`every checkless issue is a stated safety criterion (${checkless.length})`, unearned.length === 0);
  ok('the overwhelming majority of issues do carry ordered checks',
    checkless.length <= 2 && troubleshootingIssues.length - checkless.length >= 35);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2] Coverage counts are derived, never written by hand');
{
  /**
   * The failure this prevents: someone writes `documented: 18` in the hub, a
   * nineteenth page ships, and the hub quietly under-reports forever. Nobody
   * notices, because a wrong number looks exactly like a right one.
   */
  const hub = WEB_CODE.get('web/lib/softwareHub.ts');
  ok('the software hub index exists', !!hub);

  const literalCounts = /\b(documented|pending):\s*\d+/g;
  const literals = [...(hub ?? '').matchAll(literalCounts)]
    .map(m => m[0])
    .filter(t => !/:\s*0$/.test(t)); // zero is a real claim for uncovered programs
  ok('no non-zero coverage count is a literal in the hub', literals.length === 0);

  // And the zeros are only on entries that genuinely have nothing.
  const { SOFTWARE } = await import('../web/lib/softwareHub');
  const lyingZeros = SOFTWARE.filter(s => s.coverage === 'none' && s.documented > 0);
  ok('no program marked uncovered reports documented pages', lyingZeros.length === 0);

  const lyingFull = SOFTWARE.filter(s => s.coverage === 'full' && s.documented === 0);
  ok('no program marked covered reports zero pages', lyingFull.length === 0);

  const bfEntry = SOFTWARE.find(s => s.id === 'betaflight');
  ok('Betaflight coverage matches the registry exactly',
    bfEntry?.documented === bfPageRegistry.filter(p => !!p.page).length
    && bfEntry?.pending === bfPageRegistry.filter(p => !p.page).length);

  // The registry HAS undocumented tabs, so the honest state is partial. If this
  // ever flips to `full` it must be because they were written, not relabelled.
  ok('Betaflight is described as partial while tabs remain unwritten',
    bfEntry?.pending === 0 ? bfEntry.coverage === 'full' : bfEntry?.coverage === 'partial');

  const edgetxEntry = SOFTWARE.find(s => s.id === 'edgetx');
  ok('EdgeTX coverage matches the registry', edgetxEntry?.documented === allEdgeTxPages.length);

  const videoEntry = SOFTWARE.find(s => s.id === 'video-tools');
  ok('video coverage matches the registry', videoEntry?.documented === allVideoToolPages.length);

  const elrsEntry = SOFTWARE.find(s => s.id === 'expresslrs');
  ok('ExpressLRS coverage matches the registry', elrsEntry?.documented === setupSteps.length);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3] Uncovered programs are named, not hidden — and not faked');
{
  const { SOFTWARE } = await import('../web/lib/softwareHub');
  const uncovered = SOFTWARE.filter(s => s.coverage === 'none');
  ok(`programs with no coverage are still listed (${uncovered.length})`, uncovered.length >= 4);

  const noScope = uncovered.filter(s => !s.scopeId || !softwareScope(s.scopeId));
  ok('every uncovered program points at a real scope entry', noScope.length === 0);

  const noInstead = uncovered.filter(s => !s.insteadAr);
  ok('every uncovered program says where to go instead', noInstead.length === 0);

  const covered = SOFTWARE.filter(s => s.coverage !== 'none');
  const wrongTarget = covered.filter(s => !s.destination || s.scopeId);
  ok('a covered program resolves as a destination and never as a scope page',
    wrongTarget.length === 0);

  const unresolvable = covered.filter(s => !s.destination || !resolveDestination(s.destination));
  ok('every covered program resolves to a real route', unresolvable.length === 0);

  // A scope page must state a gap, not fill it. The ceiling is what stops one
  // quietly becoming the thin fake-coverage page it exists to refuse.
  const tooLong = SOFTWARE_SCOPE.filter(s => {
    const prose = [s.whatItIsAr, s.whoNeedsItAr, s.whyAr, s.goInsteadAr,
      ...s.weHaveAr, ...s.weDoNotHaveAr].join(' ');
    return prose.length > 1800;
  });
  ok('no scope entry has grown into a content page', tooLong.length === 0);

  // ...and it must not contain a procedure. A numbered instruction here means
  // somebody started documenting the program on the page that says we do not.
  const HOW_TO = /(اضغط|افتح القائمة|اختر من القائمة|ثم اضغط|الخطوة الأولى)/;
  const instructive = SOFTWARE_SCOPE.filter(s =>
    HOW_TO.test([...s.weHaveAr, ...s.weDoNotHaveAr, s.goInsteadAr, s.whyAr].join(' ')));
  ok('no scope entry has started explaining how to use the program', instructive.length === 0);

  const noSources = SOFTWARE_SCOPE.filter(s => s.sources.length === 0);
  ok('every scope entry cites the official documentation it points at', noSources.length === 0);

  const noDate = SOFTWARE_SCOPE.filter(s => !/^\d{4}-\d{2}-\d{2}$/.test(s.reviewedAt));
  ok('every scope entry carries a real review date', noDate.length === 0);

  // Every scope link resolves — a page about a gap must not contain a dead end.
  const dead: string[] = [];
  for (const s of SOFTWARE_SCOPE) {
    for (const l of s.links) {
      if (l.kind === 'external') { if (!l.url) dead.push(`${s.id}:${l.targetId}`); continue; }
      if (l.kind === 'article' && !getArticle(l.targetId)) dead.push(`${s.id}:${l.targetId}`);
      if (l.kind === 'dx' && !getDxTree(l.targetId)) dead.push(`${s.id}:${l.targetId}`);
      if (l.kind === 'betaflight' && l.targetId
        && !bfPageRegistry.some(p => p.id === l.targetId && !!p.page)) {
        dead.push(`${s.id}:${l.targetId}`);
      }
    }
  }
  if (dead.length) console.error('   DEAD SCOPE LINKS:', dead);
  ok('every scope link points at something that exists', dead.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[4] The pages hold no content of their own');
{
  /**
   * The rule: `web/` renders, `src/data/` says. A definition pasted into a page
   * is a second copy that will drift, and the reader has no way to know which
   * of the two is current.
   */
  const contentful = SOFTWARE_PAGES.map(f => [f, WEB_CODE.get(f) ?? ''] as const);

  /**
   * Two different rules, because index pages and detail pages are different jobs.
   *
   * A DETAIL page — one Betaflight tab, one EdgeTX topic — must contain no
   * subject-matter prose at all: every sentence a reader learns from comes out
   * of `src/data/`. What it may contain is FRAMING: a heading, a label, the
   * sentence that says a page hands its diagnosis over. Those are short and
   * structural, and the ceiling below is what keeps them so.
   *
   * An INDEX page has one legitimate paragraph of its own — the one that says
   * what the section is and how to choose within it. That is navigation copy,
   * not content: it teaches nothing about the software, and it has no
   * counterpart in the core to duplicate. The rule that still binds it is the
   * duplication rule, asserted separately below.
   */
  const DETAIL = contentful.filter(([f]) => /\[\w+\]|expresslrs\/(setup|troubleshooting)/.test(f));
  const INDEX = contentful.filter(([f]) => !DETAIL.some(([d]) => d === f));
  ok(`the split covers every software page (${DETAIL.length}+${INDEX.length})`,
    DETAIL.length + INDEX.length === contentful.length && DETAIL.length >= 5 && INDEX.length >= 4);

  const longest = (src: string): number => Math.max(0,
    ...[...src.matchAll(/['"`]([^'"`\n]*[؀-ۿ][^'"`\n]*)['"`]/g)].map(m => m[1].length));

  const detailOffenders = DETAIL.filter(([, src]) => longest(src) > 130).map(([f]) => f);
  if (detailOffenders.length) console.error('   PROSE IN DETAIL PAGES:', detailOffenders);
  ok('no detail page carries prose beyond its own framing', detailOffenders.length === 0);

  const indexOffenders = INDEX.filter(([, src]) => longest(src) > 320).map(([f]) => f);
  if (indexOffenders.length) console.error('   OVERLONG INDEX COPY:', indexOffenders);
  ok('no index page has grown an article of its own', indexOffenders.length === 0);

  // The rule that binds both: nothing on a web page repeats a sentence the core
  // already owns. That is duplication regardless of which kind of page it is on.
  const coreProse = [
    ...allEdgeTxPages.map(p => p.summaryAr),
    ...allVideoToolPages.map(p => p.summaryAr),
    ...edgeTxSections.map(x => x.descriptionAr),
    ...videoToolSections.map(x => x.descriptionAr),
    ...setupSteps.map(x => x.summary),
    ...bfPageRegistry.map(p => p.page?.summaryAr ?? ''),
  ].filter(t => t.length > 60);
  const duplicated = coreProse.filter(t => contentful.some(([, src]) => src.includes(t)));
  if (duplicated.length) console.error('   DUPLICATED CORE PROSE:', duplicated.slice(0, 3));
  ok('no page repeats a sentence the core already owns', duplicated.length === 0);

  // A glossary definition copied into a page is the specific case that matters
  // most, because the glossary is the thing everything else links to.
  const copied = kbTerms.filter(t =>
    t.short.length > 40 && contentful.some(([, s]) => s.includes(t.short)));
  ok('no glossary definition is copied into a software page', copied.length === 0);

  // Settings text must come from the registries, not be retyped.
  const bfFieldTexts = bfPageRegistry
    .flatMap(p => p.page?.groups ?? [])
    .flatMap(g => g.fields)
    .map(f => f.arabicExplanation)
    .filter(t => t.length > 40);
  const retyped = bfFieldTexts.filter(t => contentful.some(([, s]) => s.includes(t)));
  ok('no Betaflight field explanation is retyped in a page', retyped.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[5] No page writes a route by hand');
{
  /**
   * The same rule `testWebCore.ts` enforces, applied to the routes this batch
   * added. A second routing table is how `/programming/betaflight/x` and
   * `/betaflight/x` end up both existing, with links to each.
   */
  const ADAPTER = 'web/lib/webRoutes.ts';
  const INTERPOLATED = /["'`]\/(programming|betaflight|kb|diagnose|glossary)\/\$\{/;
  const offenders = [...WEB_CODE.entries()]
    .filter(([f]) => f !== ADAPTER)
    .filter(([, s]) => INTERPOLATED.test(s))
    .map(([f]) => f);
  if (offenders.length) console.error('   HAND-WRITTEN:', offenders);
  ok('no software page interpolates a content route', offenders.length === 0);

  // The Betaflight centre lives where the SHARED resolver says it does. This is
  // the assertion that would have caught the pages being built under
  // /programming/betaflight while every existing link pointed at /betaflight.
  const bfRoute = resolveDestination({ kind: 'betaflight', id: 'ports' });
  ok('the resolver still owns the Betaflight route', bfRoute === '/betaflight/ports');
  ok('a web page file exists at that exact path',
    WEB.has('web/app/betaflight/[pageId]/page.tsx'));

  const edgetxRoute = resolveDestination({ kind: 'edgetx', id: 'model-setup' });
  ok('the resolver owns the EdgeTX route', edgetxRoute === '/programming/edgetx/model-setup');
  ok('a web page file exists for EdgeTX topics',
    WEB.has('web/app/programming/edgetx/[pageId]/page.tsx'));

  const videoRoute = resolveDestination({ kind: 'video', id: 'tool-backup' });
  ok('the resolver owns the video route', videoRoute === '/programming/video/tool-backup');
  ok('a web page file exists for video topics',
    WEB.has('web/app/programming/video/[pageId]/page.tsx'));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[6] Deep links name entries that exist');
{
  /**
   * `?step=`, `?issue=` and `?topic=` are only worth having if the id they
   * carry resolves. Every one of these is generated somewhere — by a finding, by
   * the search index, by the bot metadata — so a stale id is a link that opens
   * the right page and does nothing.
   */
  const stepIds = new Set(setupSteps.map(s => s.id));
  const issueIds = new Set(troubleshootingIssues.map(i => i.id));
  const edgetxIds = new Set(allEdgeTxPages.map(p => p.id));
  const videoIds = new Set(allVideoToolPages.map(p => p.id));

  const badStep = setupSteps.filter(s =>
    resolveDestination({ kind: 'elrs-setup', id: s.id })
      !== `/programming/expresslrs/setup?step=${s.id}`);
  if (badStep.length) console.error('   BAD STEP ROUTES:', badStep.map(s => s.id));
  ok(`every setup step resolves to ?step= (${setupSteps.length})`,
    badStep.length === 0 && setupSteps.length >= 12);

  const badIssue = troubleshootingIssues.filter(i =>
    resolveDestination({ kind: 'elrs-issue', id: i.id })
      !== `/programming/expresslrs/troubleshooting?issue=${i.id}`);
  ok(`every issue resolves to ?issue= (${troubleshootingIssues.length})`, badIssue.length === 0);

  // Cross-references inside the content must name real entries, or the
  // «راجع فئة كذا» hand-offs are dead.
  const badLinks: string[] = [];
  for (const i of troubleshootingIssues) {
    for (const l of i.links ?? []) {
      if (l.kind === 'elrs-issue' && l.targetId && !issueIds.has(l.targetId)) badLinks.push(`${i.id}→${l.targetId}`);
      if (l.kind === 'elrs-setup' && l.targetId && !stepIds.has(l.targetId)) badLinks.push(`${i.id}→${l.targetId}`);
      if (l.kind === 'edgetx' && l.targetId && !edgetxIds.has(l.targetId)) badLinks.push(`${i.id}→${l.targetId}`);
      if (l.kind === 'video' && l.targetId && !videoIds.has(l.targetId)) badLinks.push(`${i.id}→${l.targetId}`);
      if (l.kind === 'betaflight' && l.targetId
        && !bfPageRegistry.some(p => p.id === l.targetId && !!p.page)) badLinks.push(`${i.id}→${l.targetId}`);
    }
  }
  if (badLinks.length) console.error('   DEAD ELRS LINKS:', badLinks);
  ok('every ExpressLRS cross-reference names a real entry', badLinks.length === 0);

  // The EdgeTX topic index is what makes ?topic= able to name a SETTING.
  const topics = edgeTxTopicIndex();
  const settingTopics = topics.filter(t => t.kind === 'setting');
  ok(`the topic index reaches individual settings (${settingTopics.length})`,
    settingTopics.length > 50);

  const orphanTopics = topics.filter(t => !edgeTxPage(t.pageId));
  ok('every indexed topic belongs to a real page', orphanTopics.length === 0);

  const dupTopicIds = (() => {
    const seen = new Map<string, number>();
    for (const t of topics) {
      const id = t.settingId ?? t.pageId;
      seen.set(id, (seen.get(id) ?? 0) + 1);
    }
    return [...seen].filter(([, n]) => n > 1).map(([id]) => id);
  })();
  if (dupTopicIds.length) console.error('   AMBIGUOUS ?topic= IDS:', dupTopicIds);
  ok('no ?topic= id is ambiguous between two entries', dupTopicIds.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[7] Search reaches every centre, and says what it found');
{
  const index = getSearchIndex();
  const byType = (t: string) => index.filter(d => d.type === t).length;

  ok(`Betaflight pages are indexed (${byType('bf-page')})`, byType('bf-page') === bfPageRegistry.length);
  ok(`Betaflight fields are indexed (${byType('bf-field')})`, byType('bf-field') > 100);
  ok(`EdgeTX topics are indexed (${byType('edgetx-topic')})`, byType('edgetx-topic') === allEdgeTxPages.length);
  ok(`EdgeTX settings are indexed (${byType('edgetx-setting')})`, byType('edgetx-setting') > 50);
  ok(`video topics are indexed (${byType('video-tool')})`, byType('video-tool') === allVideoToolPages.length);
  ok(`ExpressLRS steps are indexed (${byType('elrs-step')})`, byType('elrs-step') === setupSteps.length);
  ok(`ExpressLRS issues are indexed (${byType('elrs-issue')})`, byType('elrs-issue') === troubleshootingIssues.length);
  ok(`scope pages are indexed (${byType('software-scope')})`, byType('software-scope') === SOFTWARE_SCOPE.length);

  // The point of indexing a gap: asking about an uncovered program must return
  // the honest answer, not three articles that merely mention the word.
  const inavHits = search('INAV', { limit: 5 });
  ok('searching an uncovered program surfaces its scope page',
    inavHits.some(h => h.doc.type === 'software-scope' && h.doc.sourceId === 'inav'));

  const blheliHits = search('BLHeli', { limit: 6 });
  ok('searching BLHeli surfaces both the ESC firmware article and the gap notice',
    blheliHits.some(h => h.doc.sourceId === 'esc-firmware')
    && blheliHits.some(h => h.doc.type === 'software-scope'));

  // Every indexed software route must be one the web actually serves.
  const softwareDocs = index.filter(d =>
    ['bf-page', 'bf-field', 'edgetx-topic', 'edgetx-setting', 'video-tool',
      'elrs-step', 'elrs-issue', 'software-scope'].includes(d.type));
  const badRoutes = softwareDocs.filter(d =>
    !/^\/(betaflight|programming)\//.test(d.route));
  if (badRoutes.length) console.error('   BAD ROUTES:', badRoutes.slice(0, 5).map(d => d.route));
  ok('every software search result routes into a software page', badRoutes.length === 0);

  // A positive control: prove the route check above can fail. If the pattern
  // matched everything, the assertion would pass while proving nothing.
  ok('the route assertion is capable of failing',
    !/^\/(betaflight|programming)\//.test('/kb/esc/esc-firmware'));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[8] The project panel is per-page, never general');
{
  /**
   * "Do not show a general project panel on every page." The mechanism is that
   * a page with no mapped fields produces an empty expected-label set, and the
   * panel renders nothing. So the thing to assert is that the maps are SELECTIVE
   * — if every page were mapped, the rule would be violated while every
   * individual page still looked correct.
   */
  const bfMapped = new Set([...Object.keys(BF_PAGE_RC_FIELDS), ...Object.keys(BF_PAGE_VIDEO_FIELDS)]);
  const bfDocumented = bfPageRegistry.filter(p => !!p.page);
  ok(`only some Betaflight pages have project fields (${bfMapped.size}/${bfDocumented.length})`,
    bfMapped.size > 0 && bfMapped.size < bfDocumented.length);

  const edgetxMapped = Object.keys(EDGETX_PAGE_RC_FIELDS);
  ok(`only some EdgeTX topics have project fields (${edgetxMapped.length}/${allEdgeTxPages.length})`,
    edgetxMapped.length > 0 && edgetxMapped.length < allEdgeTxPages.length);

  const elrsMapped = Object.keys(ELRS_ENTRY_RC_FIELDS);
  const elrsTotal = setupSteps.length + troubleshootingIssues.length;
  ok(`only some ExpressLRS entries have project fields (${elrsMapped.length}/${elrsTotal})`,
    elrsMapped.length > 0 && elrsMapped.length < elrsTotal);

  /**
   * The video centre is the one where every page does have mapped fields, and
   * that is correct rather than a lapse: all eighteen are about the reader's
   * video chain, so all eighteen have something of theirs to say. The rule the
   * requirement actually protects is that the panel is not the SAME panel
   * everywhere — so what is asserted here is that the field sets differ, which
   * is what makes it per-page rather than general.
   */
  const videoMapped = allVideoToolPages.filter(p => p.projectFields.length > 0);
  const setCounts = new Map<string, number>();
  for (const p of allVideoToolPages) {
    const key = [...p.projectFields].sort().join(',');
    setCounts.set(key, (setCounts.get(key) ?? 0) + 1);
  }
  const commonest = Math.max(...setCounts.values());
  // Sharing a field set is legitimate where the pages genuinely need the same
  // facts — «الأداة لا ترى الجهاز», «توقف التحديث» and «اقرأ السجلّات» all turn
  // on the same five. What would prove the panel general is ONE set covering
  // most of the centre, so that is what is bounded.
  ok(`no single field set dominates the video centre (${setCounts.size} sets, commonest covers ${commonest})`,
    setCounts.size >= 12 && commonest <= 3);
  ok('no video topic declares an empty field set while claiming a panel',
    videoMapped.length === allVideoToolPages.length);

  // And no set is the whole record — that would be a general panel wearing a
  // per-page label.
  const oversized = allVideoToolPages.filter(p => p.projectFields.length > 10);
  ok('no video topic pulls in the reader\'s whole video record', oversized.length === 0);

  // Every mapped id must be a real entry, or the panel maps a page nobody opens.
  const strayBf = [...bfMapped].filter(id => !bfPageRegistry.some(p => p.id === id));
  ok('every Betaflight page with mapped fields exists', strayBf.length === 0);

  const strayEdge = edgetxMapped.filter(id => !edgeTxPage(id));
  ok('every EdgeTX topic with mapped fields exists', strayEdge.length === 0);

  const elrsIds = new Set([...setupSteps.map(s => s.id), ...troubleshootingIssues.map(i => i.id)]);
  const strayElrs = elrsMapped.filter(id => !elrsIds.has(id));
  ok('every ExpressLRS entry with mapped fields exists', strayElrs.length === 0);

  // The missing-list is a subtraction, so its labels must be the SAME strings
  // the fact reader returns. A page hand-writing its own labels would show a
  // recorded field as missing — the bug this consolidation removed.
  const labelsSource = readFileSync(join(ROOT, 'src/data/project/context.ts'), 'utf8');
  ok('the expected-label helper lives in the shared core',
    labelsSource.includes('export function expectedLabelsFor'));

  const panelSource = WEB_CODE.get('web/components/software/ProjectContextPanel.tsx') ?? '';
  ok('the panel derives its labels rather than receiving hand-written ones',
    panelSource.includes('expectedLabelsFor(') && !/expectedLabelsAr=\{\[/.test(panelSource));

  // No page passes a label list of its own.
  const handLabels = SOFTWARE_PAGES.filter(f => /PROJECT_LABELS|expectedLabelsAr=/.test(WEB_CODE.get(f) ?? ''));
  if (handLabels.length) console.error('   HAND-WRITTEN LABELS:', handLabels);
  ok('no software page carries its own copy of the field labels', handLabels.length === 0);

  // And the labels the core produces are non-empty for mapped entries, which is
  // what makes «لم تسجّله بعد» able to name anything at all.
  const emptyExpectations = [...bfMapped].filter(id => expectedLabelsFor('betaflight', id).length === 0);
  ok('every mapped Betaflight page produces named expectations', emptyExpectations.length === 0);

  const emptyVideo = videoMapped.filter(p => videoFieldLabels(p.projectFields).length === 0);
  ok('every mapped video topic produces named expectations', emptyVideo.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[9] Safety and provenance survive the move to the web');
{
  // Every centre's renderer must actually render the safety fields. Checking
  // the data has them is not enough — a page that drops them ships silently.
  const elrsSetupPage = WEB_CODE.get('web/app/programming/expresslrs/setup/page.tsx') ?? '';
  ok('the setup page renders per-step warnings', elrsSetupPage.includes('step.warnings'));
  // Before the STEPS, not merely before some use of `ordered` — the entries
  // list is built at the top of the component and would make this pass for free.
  ok('the setup page renders the prop warning above the steps themselves',
    elrsSetupPage.includes('المراوح')
    && elrsSetupPage.indexOf('المراوح') < elrsSetupPage.indexOf('elrs-step-'));

  const tshootPage = WEB_CODE.get('web/app/programming/expresslrs/troubleshooting/page.tsx') ?? '';
  ok('the troubleshooting page renders per-issue safety warnings',
    tshootPage.includes('issue.safetyWarning'));
  ok('the troubleshooting page renders each check\'s own failure branch',
    tshootPage.includes('check.ifFailed'));

  const bfPage = WEB_CODE.get('web/app/betaflight/[pageId]/page.tsx') ?? '';
  ok('the Betaflight page renders firmware and app version ranges',
    bfPage.includes('firmwareVersionRange') && bfPage.includes('appVersionRange'));
  ok('the Betaflight page renders its source and review date',
    bfPage.includes('page.source') && bfPage.includes('reviewedAt'));
  ok('the Betaflight page keeps the official English label',
    bfPage.includes('field.englishLabel'));

  const edgetxPageSrc = WEB_CODE.get('web/app/programming/edgetx/[pageId]/page.tsx') ?? '';
  ok('the EdgeTX page renders the menu path with its version',
    edgetxPageSrc.includes('page.whereAr'));
  ok('the EdgeTX page renders what must come from the reader\'s own manual',
    edgetxPageSrc.includes('manualRequiredAr'));
  ok('the EdgeTX page renders the hand-off for problem topics',
    edgetxPageSrc.includes('canonicalDiagnosis'));

  const videoPageSrc = WEB_CODE.get('web/app/programming/video/[pageId]/page.tsx') ?? '';
  ok('the video page states which ecosystem it applies to',
    videoPageSrc.includes('VIDEO_TOOL_SCOPE_LABEL_AR'));
  ok('the video page renders what must come from the manual',
    videoPageSrc.includes('manualRequiredAr'));

  // Every centre shows a review date somewhere.
  for (const [name, src] of [
    ['Betaflight', bfPage], ['EdgeTX', edgetxPageSrc], ['video', videoPageSrc],
    ['ExpressLRS setup', elrsSetupPage], ['ExpressLRS issues', tshootPage],
  ] as const) {
    ok(`${name} pages render a review date`,
      /reviewedAt|lastReviewed/.test(src));
  }

  // No page states a version-variable fact as a constant. A literal firmware
  // number in a renderer is a claim that outlives the data it came from.
  const literalVersions = SOFTWARE_PAGES.filter(f =>
    /['"`](4\.\d|2025\.\d|3\.\d\.\d)['"`]/.test(WEB_CODE.get(f) ?? ''));
  if (literalVersions.length) console.error('   LITERAL VERSIONS:', literalVersions);
  ok('no page hard-codes a firmware version', literalVersions.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[10] The hub and the centres agree on what exists');
{
  const { SOFTWARE, HUB_TOTALS, CATEGORY_ORDER, softwareByCategory } = await import('../web/lib/softwareHub');

  ok('every category in the order has at least one program',
    CATEGORY_ORDER.every(c => softwareByCategory(c).length > 0));

  ok('every program belongs to a category in the order',
    SOFTWARE.every(s => CATEGORY_ORDER.includes(s.category)));

  const dupIds = SOFTWARE.map(s => s.id).filter((id, i, a) => a.indexOf(id) !== i);
  ok('no program is listed twice', dupIds.length === 0);

  ok('the hub totals are the registries\' own numbers',
    HUB_TOTALS.betaflightPages === bfPageRegistry.length
    && HUB_TOTALS.edgetxPages === allEdgeTxPages.length
    && HUB_TOTALS.edgetxSections === edgeTxSections.length
    && HUB_TOTALS.videoPages === allVideoToolPages.length
    && HUB_TOTALS.videoSections === videoToolSections.length
    && HUB_TOTALS.elrsSteps === setupSteps.length
    && HUB_TOTALS.elrsIssues === troubleshootingIssues.length);

  // The nav must not advertise a route that does not exist — and must not keep
  // calling a shipped one "planned".
  const nav = readFileSync(join(ROOT, 'web/lib/siteNav.ts'), 'utf8');
  const programmingEntry = nav.slice(nav.indexOf("id: 'programming'"), nav.indexOf("id: 'programming'") + 320);
  ok('the software section is no longer marked as planned',
    !programmingEntry.includes("status: 'planned'"));
  ok('the software hub page exists to back that claim',
    WEB.has('web/app/programming/page.tsx'));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[11] The centres link outward, and nothing links into a void');
{
  // Glossary references from Betaflight pages must resolve.
  const badTerms: string[] = [];
  for (const entry of bfPageRegistry) {
    for (const id of entry.page?.glossaryTermIds ?? []) {
      if (!kbTerms.some(t => t.id === id)) badTerms.push(`${entry.id}→${id}`);
    }
  }
  ok('every Betaflight glossary reference resolves', badTerms.length === 0);

  // Related-page references must point at pages that HAVE content, or the card
  // links to an empty screen.
  const badRelated: string[] = [];
  for (const entry of bfPageRegistry) {
    for (const id of entry.page?.relatedPageIds ?? []) {
      if (!bfPageRegistry.some(p => p.id === id)) badRelated.push(`${entry.id}→${id}`);
    }
  }
  ok('every Betaflight related-page reference exists', badRelated.length === 0);

  // EdgeTX and video links.
  const badOut: string[] = [];
  const check = (owner: string, kind: string, targetId: string) => {
    if (!targetId) return;
    if (kind === 'article' && !getArticle(targetId)) badOut.push(`${owner}→article:${targetId}`);
    if (kind === 'module' && !getModule(targetId)) badOut.push(`${owner}→module:${targetId}`);
    if (kind === 'dx' && !getDxTree(targetId)) badOut.push(`${owner}→dx:${targetId}`);
    if (kind === 'glossary' && !kbTerms.some(t => t.id === targetId)) badOut.push(`${owner}→glossary:${targetId}`);
    if (kind === 'edgetx' && !edgeTxPage(targetId)) badOut.push(`${owner}→edgetx:${targetId}`);
    if (kind === 'video' && !allVideoToolPages.some(p => p.id === targetId)) badOut.push(`${owner}→video:${targetId}`);
    if (kind === 'betaflight' && !bfPageRegistry.some(p => p.id === targetId && !!p.page)) {
      badOut.push(`${owner}→betaflight:${targetId}`);
    }
  };
  for (const p of allEdgeTxPages) {
    for (const l of p.links) check(`edgetx:${p.id}`, l.kind, l.targetId);
    if (p.canonicalDiagnosis) check(`edgetx:${p.id}`, p.canonicalDiagnosis.kind, p.canonicalDiagnosis.targetId);
  }
  for (const p of allVideoToolPages) {
    for (const l of p.links) check(`video:${p.id}`, l.kind, l.targetId);
    if (p.canonicalDiagnosis) check(`video:${p.id}`, p.canonicalDiagnosis.kind, p.canonicalDiagnosis.targetId);
  }
  if (badOut.length) console.error('   DEAD OUTBOUND:', badOut);
  ok('every EdgeTX and video outbound link resolves', badOut.length === 0);

  // Positive control: the checker must be able to detect a break.
  const control: string[] = [];
  const controlCheck = (id: string) => { if (!getArticle(id)) control.push(id); };
  controlCheck('this-article-does-not-exist');
  ok('the link checker detects a broken reference', control.length === 1);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[12] The bot architecture is intact and now reaches the new pages');
{
  /**
   * The bot is deliberately not built yet. What must be true is that everything
   * added here is reachable BY it later without rewriting: retrieval metadata,
   * abstract destinations, the facts required before a verdict, and the safety
   * preconditions.
   */
  const withBot = [
    ...setupSteps.map(s => ({ id: `elrs-setup:${s.id}`, bot: s.bot })),
    ...troubleshootingIssues.map(i => ({ id: `elrs-issue:${i.id}`, bot: i.bot })),
    ...allEdgeTxPages.map(p => ({ id: `edgetx:${p.id}`, bot: p.bot })),
    ...allVideoToolPages.map(p => ({ id: `video:${p.id}`, bot: p.bot })),
    ...SOFTWARE_SCOPE.map(s => ({ id: `scope:${s.id}`, bot: s.bot })),
  ];
  const missingBot = withBot.filter(e => !e.bot);
  ok(`every software entry carries retrieval metadata (${withBot.length - missingBot.length}/${withBot.length})`,
    missingBot.length === 0);

  const noIntents = withBot.filter(e => (e.bot?.intents ?? []).length === 0);
  ok('every entry declares which intents it can serve', noIntents.length === 0);

  // Actions must be real destinations, not prose.
  const badActions: string[] = [];
  for (const e of withBot) {
    for (const a of e.bot?.actions ?? []) {
      if (a.kind === 'external') continue;
      const needsId = !['elrs-setup', 'elrs-issue', 'edgetx', 'video', 'project',
        'assembly', 'checklist', 'betaflight'].includes(a.kind);
      if (needsId && !a.targetId) badActions.push(`${e.id}:${a.kind}`);
    }
  }
  ok('every bot action names a resolvable destination', badActions.length === 0);

  // The new scope entries participate in the same vocabulary.
  const scopeNoSymptoms = SOFTWARE_SCOPE.filter(s => (s.bot?.symptomsAr ?? []).length === 0);
  ok('every scope entry carries the phrasings people actually type', scopeNoSymptoms.length === 0);

  // Safety preconditions survive: entries that touch motors or power must say so.
  const motorTouching = troubleshootingIssues.filter(i =>
    /محرك|تسليح|مراوح/.test(`${i.title} ${i.symptom}`));
  const unsafe = motorTouching.filter(i => (i.bot?.safetyPrerequisitesAr ?? []).length === 0 && !i.safetyWarning);
  ok('every motor-touching issue carries a safety precondition', unsafe.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[13] The phone app is untouched by this batch');
{
  /**
   * Every route this batch added is a web route. The shared core gained data and
   * three helper functions; nothing was removed, and the phone's own screens
   * still resolve. The check that matters: the destination resolver still
   * answers every kind the phone asks it, including the ones this batch changed.
   */
  const phoneRoutes = readFileSync(join(ROOT, 'src/App.tsx'), 'utf8');
  for (const path of [
    '/programming', '/programming/expresslrs', '/programming/expresslrs/setup',
    '/programming/expresslrs/troubleshooting', '/programming/edgetx',
    '/programming/edgetx/:pageId', '/programming/video', '/programming/video/:pageId',
    '/betaflight', '/betaflight/:sectionId',
  ]) {
    ok(`the phone still routes ${path}`, phoneRoutes.includes(`path="${path}"`));
  }

  // The one core change with reach: betaflight's id became optional. An id'd
  // destination must resolve exactly as before, or every existing link moved.
  ok('an id\'d Betaflight destination is unchanged',
    resolveDestination({ kind: 'betaflight', id: 'receiver' }) === '/betaflight/receiver');
  ok('the bare Betaflight destination now opens the centre instead of failing',
    resolveDestination({ kind: 'betaflight' }) === '/betaflight');
}

console.log(`\n${failed === 0 ? '✅' : '❌'} testWebSoftware: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
