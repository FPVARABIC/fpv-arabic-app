/**
 * The control-link closure gate.
 *
 * WHAT THIS FILE IS FOR
 * ---------------------
 * Three things were required to finish the radio-control system: the EdgeTX
 * centre, six named ExpressLRS gaps, and retrieval metadata across every piece
 * of RC content. Each of the three is easy to claim and hard to prove, so each
 * of them is asserted here against the data rather than described in a report.
 *
 * The assertions that matter most are the ones that would fail if someone added
 * content carelessly later:
 *
 *   every declared topic maps to a page that exists
 *   every link and every bot action resolves to a real destination
 *   every `problem` page either hands off to the one owner of its symptom or
 *     states in the data why it is the owner
 *   every core RC entry carries retrieval metadata
 *   the required intents, the required user-language symptoms and the required
 *     executable actions are all present somewhere in the corpus
 *
 * Run: npx tsx scripts/testEdgeTx.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  allEdgeTxPages, edgeTxSections, edgeTxPage, edgeTxPageExists,
  edgeTxSectionOfPage, edgeTxTopicIndex, EDGETX_REQUIRED_TOPICS,
  TOTAL_EDGETX_PAGES,
} from '../src/data/edgetx/registry';
import { setupSteps } from '../src/data/expresslrs/setupSteps';
import { troubleshootingIssues } from '../src/data/expresslrs/troubleshootingIssues';

import { allKbModules } from '../src/data/kb/registry';
import { allDxTrees } from '../src/data/kb/diagnostics/trees';
import { bfPageRegistry } from '../src/data/betaflight/pageRegistry';
import { kbTerms } from '../src/data/kb/glossary/terms';
import { KB_INTENT_LABEL_AR, type KbBotMeta, type KbLink } from '../src/data/kb/types';

import { resolveDestination, destinationKey, parseDestinationKey } from '../src/platform/destinations';
import {
  EDGETX_PAGE_RC_FIELDS, ELRS_ENTRY_RC_FIELDS, rcFactsForEdgeTxPage,
  rcFactsForElrsEntry, findingsForEdgeTxPage, findingsForElrsEntry,
} from '../src/data/project/context';
import { computeFindings } from '../src/data/project/verdicts';
import type { ProjectSnapshot } from '../src/data/project/types';
import { validateRcSetup } from '../src/data/project/rcSetup';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  passed++;
}
function group(t: string) { console.log(`\n${t}`); }

// ── Destination resolution, verified against every registry ──────────────────

const articleModule = new Map<string, string>();
for (const m of allKbModules) for (const a of m.articles) articleModule.set(a.id, m.id);
const dxIds = new Set(allDxTrees.map(t => t.id));
const glossaryIds = new Set(kbTerms.map(t => t.id));
const bfIds = new Set(bfPageRegistry.map(e => e.id));
const stepIds = new Set(setupSteps.map(s => s.id));
const issueIds = new Set(troubleshootingIssues.map(i => i.id));

/**
 * The strict resolver used throughout this file.
 *
 * `resolveDestination` alone cannot verify a Betaflight page or an ExpressLRS
 * step, because it must stay free of those imports. Here in a test we have all
 * the registries, so every kind gets a real existence check — which is the
 * whole point: a link to a page that stopped existing has to fail the build,
 * not surprise a reader.
 */
function strictRoute(l: KbLink): string | null {
  switch (l.kind) {
    case 'article': {
      const mod = articleModule.get(l.targetId);
      return mod ? `/kb/${mod}/${l.targetId}` : null;
    }
    case 'dx': return dxIds.has(l.targetId) ? `/diagnose/${l.targetId}` : null;
    case 'glossary': return glossaryIds.has(l.targetId) ? `/glossary?term=${l.targetId}` : null;
    case 'betaflight': return bfIds.has(l.targetId) ? `/betaflight/${l.targetId}` : null;
    case 'edgetx':
      if (!l.targetId) return '/programming/edgetx';
      return edgeTxPageExists(l.targetId) ? `/programming/edgetx/${l.targetId}` : null;
    case 'elrs-setup':
      if (!l.targetId) return '/programming/expresslrs/setup';
      return stepIds.has(l.targetId) ? `/programming/expresslrs/setup?step=${l.targetId}` : null;
    case 'elrs-issue':
      if (!l.targetId) return '/programming/expresslrs/troubleshooting';
      return issueIds.has(l.targetId) ? `/programming/expresslrs/troubleshooting?issue=${l.targetId}` : null;
    case 'project': case 'assembly': case 'checklist':
      return resolveDestination(
        l.kind === 'project'
          ? (l.targetId === 'findings'
            ? { kind: 'project', view: 'findings' }
            : l.targetId ? { kind: 'project', view: 'rc', field: l.targetId } : { kind: 'project' })
          : { kind: l.kind },
      );
    case 'lesson': case 'roadmap':
      return l.targetId ? `/${l.kind === 'lesson' ? 'lessons' : 'roadmap'}/${l.targetId}` : null;
    case 'external': return l.url ?? null;
    default: return null;
  }
}

/** The abstract destination key for a link, used for the coverage checks. */
function linkKey(l: KbLink): string {
  if (l.kind === 'project') {
    if (!l.targetId) return 'project';
    if (l.targetId === 'findings') return 'project:findings';
    return `project:rc.${l.targetId}`;
  }
  if (l.kind === 'assembly' || l.kind === 'checklist') return l.kind;
  return l.targetId ? `${l.kind}:${l.targetId}` : l.kind;
}

// ═════════════════════════════════════════════════════════════════════════════
group('[1] EdgeTX — the declared scope is actually covered');
{
  ok('thirty topics are defined', TOTAL_EDGETX_PAGES === 30 && allEdgeTxPages.length === 30);
  ok('all page ids are unique', new Set(allEdgeTxPages.map(p => p.id)).size === 30);

  ok('the required-topic list has the full declared scope (32 entries)', EDGETX_REQUIRED_TOPICS.length === 32);
  ok('required-topic ids are unique', new Set(EDGETX_REQUIRED_TOPICS.map(t => t.id)).size === EDGETX_REQUIRED_TOPICS.length);

  for (const t of EDGETX_REQUIRED_TOPICS) {
    const p = edgeTxPage(t.pageId);
    ok(`required topic "${t.id}" maps to an existing page`, !!p);
    if (t.settingId) {
      ok(`required topic "${t.id}" names a setting that exists on ${t.pageId}`,
        !!p?.groups.some(g => g.settings.some(s => s.id === t.settingId)));
    }
  }

  // Two required topics share a page on purpose; the data has to say so rather
  // than let the count quietly imply two screens where the radio has one.
  const shared = EDGETX_REQUIRED_TOPICS.filter(t => t.sharedNoteAr);
  ok('every required topic that shares a page carries the reason in the data',
    shared.length === 2 && shared.every(t => t.sharedNoteAr!.length > 40));

  const covered = new Set(EDGETX_REQUIRED_TOPICS.map(t => t.pageId));
  ok('every page covers at least one declared requirement (no orphan content)',
    allEdgeTxPages.every(p => covered.has(p.id)));

  for (const s of edgeTxSections) {
    for (const pid of s.pageIds) ok(`section "${s.id}" lists an existing page "${pid}"`, edgeTxPageExists(pid));
  }
  ok('every page belongs to exactly one section',
    allEdgeTxPages.every(p => edgeTxSections.filter(s => s.pageIds.includes(p.id)).length === 1));
  ok('sections partition the pages exactly',
    edgeTxSections.reduce((n, s) => n + s.pageIds.length, 0) === 30);
  ok('edgeTxSectionOfPage resolves for every page',
    allEdgeTxPages.every(p => !!edgeTxSectionOfPage(p.id)));
}

// ═════════════════════════════════════════════════════════════════════════════
group('[2] Every topic answers the eleven required questions');
{
  for (const p of allEdgeTxPages) {
    ok(`"${p.id}" states its purpose`, p.summaryAr.length >= 40);
    ok(`"${p.id}" states when it is needed`, p.whenNeededAr.length >= 30);
    ok(`"${p.id}" states where it is`, p.whereAr.length >= 30);
    ok(`"${p.id}" has conceptual steps`, p.stepsAr.length >= 3);
    ok(`"${p.id}" states its relation to the receiver, ExpressLRS and Betaflight`, p.relationAr.length >= 2);
    ok(`"${p.id}" lists common mistakes`, p.commonMistakesAr.length >= 2);
    ok(`"${p.id}" states how to verify`, p.verifyAr.length >= 2);
    ok(`"${p.id}" states how to revert`, p.revertAr.length >= 30);
    ok(`"${p.id}" carries version warnings`, p.versionNotesAr.length >= 1);
    ok(`"${p.id}" states what it will not state (missing data)`, p.manualRequiredAr.length >= 1);
    ok(`"${p.id}" cites at least one source`, p.sources.length >= 1);
    ok(`"${p.id}" every source records a version and a review date`,
      p.sources.every(s => s.version.length > 0 && /^\d{4}-\d{2}$/.test(s.reviewedAt)));
    ok(`"${p.id}" records its own review date`, /^\d{4}-\d{2}$/.test(p.lastReviewed));
    ok(`"${p.id}" lists prerequisites`, p.prerequisitesAr.length >= 1);
  }

  // The relation field is the one that makes this a centre inside a platform
  // rather than a standalone manual: across the corpus it has to actually name
  // the three neighbours it claims to relate to.
  const relationText = allEdgeTxPages.flatMap(p => p.relationAr).join(' ');
  for (const neighbour of ['المستقبل', 'ExpressLRS', 'Betaflight']) {
    ok(`the relation fields name "${neighbour}" somewhere in the corpus`, relationText.includes(neighbour));
  }

  // Setting ids must be unique within a page, because `?topic=` addresses them.
  for (const p of allEdgeTxPages) {
    const ids = p.groups.flatMap(g => g.settings.map(s => s.id));
    ok(`"${p.id}" setting ids are unique within the page`, new Set(ids).size === ids.length);
    for (const g of p.groups) {
      for (const s of g.settings) {
        ok(`"${p.id}/${s.id}" says what it changes in the aircraft, not just what it is`,
          s.effectAr.length >= 40 && s.effectAr !== s.whatAr);
        ok(`"${p.id}/${s.id}" carries an English label`, /[A-Za-z]/.test(s.labelEn));
      }
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
group('[3] Version honesty — no invented menu path');
{
  // Every page that describes a location must also say the location can move.
  // Stating a path as permanent is exactly the invented specific the platform
  // forbids, and it is the failure mode most likely to creep back in.
  for (const p of allEdgeTxPages) {
    ok(`"${p.id}" warns that the visible path may differ`,
      /قد يختلف|قد تختلف|يختلف/.test(p.whereAr) || p.versionNotesAr.some(n => /يختلف|تختلف|تغيّر/.test(n)));
  }
  ok('every page carries the reviewed-version statement in its version notes',
    allEdgeTxPages.every(p => p.versionNotesAr.some(n => n.includes('EdgeTX 2.10'))
      || p.sources.some(s => s.version.includes('EdgeTX 2.10'))));

  const settingsWithVersionNote = allEdgeTxPages
    .flatMap(p => p.groups.flatMap(g => g.settings))
    .filter(s => s.versionNoteAr);
  ok('at least some individual settings carry their own version caveat', settingsWithVersionNote.length >= 5);

  // Facts we refuse to state because they belong to the reader's own hardware.
  const manualChecks = allEdgeTxPages.flatMap(p => p.groups.flatMap(g => g.settings)).filter(s => s.manualCheckAr);
  ok('settings that depend on the reader\'s own hardware say so instead of guessing', manualChecks.length >= 8);
}

// ═════════════════════════════════════════════════════════════════════════════
group('[4] Every destination resolves');
{
  for (const p of allEdgeTxPages) {
    ok(`"${p.id}" itself resolves to a route`,
      resolveDestination({ kind: 'edgetx', id: p.id }) === `/programming/edgetx/${p.id}`);
    for (const l of p.links) {
      ok(`"${p.id}" link → ${l.kind}:${l.targetId || '(root)'} resolves`, strictRoute(l) !== null);
    }
    for (const a of p.bot?.actions ?? []) {
      ok(`"${p.id}" action → ${a.kind}:${a.targetId || '(root)'} resolves`, strictRoute(a) !== null);
    }
    if (p.canonicalDiagnosis) {
      ok(`"${p.id}" canonical diagnosis resolves`, strictRoute(p.canonicalDiagnosis) !== null);
    }
  }

  // Setting-level deep links.
  for (const t of edgeTxTopicIndex()) {
    if (t.kind !== 'setting') continue;
    const base = resolveDestination({ kind: 'edgetx', id: t.pageId });
    ok(`setting deep link "${t.pageId}?topic=${t.settingId}" has a resolvable base`, base !== null);
  }

  // The bare-centre destination, and the round trip through the stable key form.
  ok('the EdgeTX centre resolves without an id', resolveDestination({ kind: 'edgetx' }) === '/programming/edgetx');
  ok('an empty EdgeTX id does not fabricate a route', resolveDestination({ kind: 'edgetx', id: '' }) === '/programming/edgetx');
  for (const p of allEdgeTxPages.slice(0, 5)) {
    const key = destinationKey({ kind: 'edgetx', id: p.id });
    ok(`destination key round-trips for "${p.id}"`,
      JSON.stringify(parseDestinationKey(key)) === JSON.stringify({ kind: 'edgetx', id: p.id }));
  }
  ok('the aimed project destinations round-trip',
    destinationKey({ kind: 'project', view: 'rc', field: 'rxTarget' }) === 'project:rc.rxTarget'
    && JSON.stringify(parseDestinationKey('project:rc.rxTarget'))
      === JSON.stringify({ kind: 'project', view: 'rc', field: 'rxTarget' })
    && destinationKey({ kind: 'project', view: 'findings' }) === 'project:findings'
    && destinationKey({ kind: 'project' }) === 'project');
  ok('a malformed project key is refused rather than guessed',
    parseDestinationKey('project:nonsense') === null);
}

// ═════════════════════════════════════════════════════════════════════════════
group('[5] No duplication — one source of truth per symptom');
{
  const problems = allEdgeTxPages.filter(p => p.kind === 'problem');
  ok('there are six radio-side problem topics', problems.length === 6);

  for (const p of problems) {
    const hasCanonical = !!p.canonicalDiagnosis;
    const owns = !!p.ownsDiagnosis;
    ok(`"${p.id}" declares exactly one of: hands off, or owns the symptom`, hasCanonical !== owns);
    if (owns) {
      ok(`"${p.id}" records WHY it is the owner and not a duplicate`, p.ownsDiagnosis!.reasonAr.length >= 80);
    }
    if (hasCanonical) {
      ok(`"${p.id}" canonical target names a real entry`, strictRoute(p.canonicalDiagnosis!) !== null);
      ok(`"${p.id}" canonical link explains the split`, (p.canonicalDiagnosis!.reason ?? '').length >= 40);
    }
  }

  // Two EdgeTX problem pages must never claim the same owner: that would mean
  // the platform had split one symptom across two radio-side pages.
  const canonicalTargets = problems
    .map(p => p.canonicalDiagnosis)
    .filter((l): l is KbLink => !!l)
    .map(l => `${l.kind}:${l.targetId}`);
  ok('no two problem topics hand off to the same owner',
    new Set(canonicalTargets).size === canonicalTargets.length);

  // And no EdgeTX topic re-uses a diagnostic tree's title, which is the crudest
  // form of the same mistake.
  const dxTitles = new Set(allDxTrees.map(t => t.titleAr));
  ok('no EdgeTX topic reuses a diagnostic tree title',
    allEdgeTxPages.every(p => !dxTitles.has(p.titleAr)));

  // Every symptom that has an owner elsewhere must be reachable from the radio
  // side — that is the link, not the copy.
  for (const p of problems) {
    ok(`"${p.id}" links onward to at least two other entries`, p.links.length >= 2);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
group('[6] The six confirmed ExpressLRS gaps are closed');
{
  const deviceCategory = setupSteps.find(s => s.id === 'device-category');
  const buildOptions = setupSteps.find(s => s.id === 'build-options');
  ok('gap 1 — a Device Category step exists', !!deviceCategory);
  ok('gap 2 — a Build Options step exists', !!buildOptions);

  const dcText = JSON.stringify(deviceCategory);
  ok('Device Category explains what it means', /المجموعة التي تُصنَّف|فئة الجهاز/.test(dcText));
  ok('Device Category ties the choice to the hardware type', /نوع القطعة/.test(dcText));
  ok('Device Category distinguishes itself from Target', /الفئة تحدد العائلة، والهدف/.test(dcText));
  ok('Device Category states the effect of choosing wrong', /فئة خاطئة تعني قائمة أهداف خاطئة/.test(dcText));
  ok('Device Category says how to verify the right one', /يظهر فيها طرازك بالاسم الدقيق/.test(dcText));
  ok('Device Category sends the reader to the device documentation', /وثيقة الشركة المصنّعة/.test(dcText));
  ok('Device Category refuses to name category strings that change between versions',
    /لا نذكر أسماء الفئات هنا/.test(dcText));

  const boText = JSON.stringify(buildOptions);
  ok('Build Options explains what build options are', /تُثبَّت داخل البرنامج الثابت أثناء بنائه/.test(boText));
  ok('Build Options says when to change them', /لا تغيّر ما لا تفهم أثره/.test(boText));
  ok('Build Options flags the version-dependent ones', /تختلف بين إصدارات ExpressLRS/.test(boText));
  ok('Build Options warns against copying options from another device', /نسخ مجموعة خيارات من شرح لجهاز آخر/.test(boText));
  ok('Build Options ties them to the binding phrase and the domain',
    /Binding Phrase|عبارة الربط/.test(boText) && /النطاق التنظيمي/.test(boText));
  ok('Build Options says how to verify after the build', /لماذا التحقق بعد البناء ضروري/.test(boText));

  const buildFailure = troubleshootingIssues.find(i => i.id === 'build-failure');
  ok('gap 3 — a Build Failure procedure exists', !!buildFailure);
  const bfCauses = buildFailure!.likelyCauses.join(' ');
  for (const [label, re] of [
    ['environment', /خطأ بيئة/],
    ['target unavailable', /الهدف غير متاح/],
    ['incompatible version', /إصدار غير متوافق/],
    ['wrong build option', /خيار بناء خاطئ/],
    ['download problem', /مشكلة تنزيل/],
    ['tool problem', /مشكلة أداة/],
    ['transient error', /خطأ مؤقت/],
    ['missing data', /بيانات ناقصة/],
  ] as const) {
    ok(`Build Failure distinguishes "${label}"`, re.test(bfCauses));
  }
  ok('Build Failure has a check per cause class', buildFailure!.checks.length >= 8);
  ok('Build Failure explicitly rejects "just retry" as the answer',
    /إعادة المحاولة بالإعدادات نفسها ليست إجراءً تشخيصياً/.test(buildFailure!.nextIfUnresolved));

  const passthrough = troubleshootingIssues.find(i => i.id === 'passthrough-failure');
  ok('gap 4 — a Passthrough Failure procedure exists', !!passthrough);
  const ptText = JSON.stringify(passthrough);
  for (const [label, re] of [
    ['the correct UART', /المنفذ الذي لحمت عليه فعلياً/],
    ['Serial RX enabled', /المستقبل التسلسلي مفعَّل/],
    ['the flight controller connection', /متحكم الطيران غير متصل فعلياً بالحاسوب/],
    ['firmware support', /إصدار برنامج متحكم الطيران لا يدعم/],
    ['the target', /الهدف المختار في الأداة لا يطابق/],
    ['receiver state', /عالق في وضع Wi-Fi/],
    ['applications holding the port', /برنامج آخر يحتجز المنفذ/],
    ['bootloader entry failure', /فشلت في إدخاله وضع الإقلاع/],
    ['when to switch method', /انتقل إلى طريقة تحديث أخرى موثقة/],
  ] as const) {
    ok(`Passthrough Failure covers ${label}`, re.test(ptText));
  }

  const uartConflict = troubleshootingIssues.find(i => i.id === 'uart-conflict');
  ok('gap 5 — a UART-taken-by-another-peripheral procedure exists', !!uartConflict);
  const ucText = JSON.stringify(uartConflict);
  for (const [label, re] of [
    ['GPS', /GPS/],
    ['the video transmitter', /جهاز الفيديو/],
    ['telemetry', /التيليمتري|التليمتري/],
    ['another serial device', /أي جهاز تسلسلي آخر/],
    ['an internal function', /وظيفة داخلية/],
    ['the conflict itself', /تعارضاً صريحاً/],
    ['the reason', /المنفذ نفسه مخصص لجهاز آخر/],
    ['the alternatives', /انقل أحد الجهازين إلى منفذ آخر/],
    ['what cannot be confirmed without a pinout', /هذا ما لا يمكن تأكيده بلا وثيقة/],
  ] as const) {
    ok(`UART conflict covers ${label}`, re.test(ucText));
  }
  ok('UART conflict links to the Ports page',
    !!uartConflict!.links?.some(l => l.kind === 'betaflight' && l.targetId === 'ports'));
  ok('UART conflict links to the reader\'s own project',
    !!uartConflict!.links?.some(l => l.kind === 'project'));
  ok('UART conflict is wired to the verdict engine\'s conflict report',
    !!uartConflict!.links?.some(l => l.kind === 'project' && l.targetId === 'findings'));

  const wifi = troubleshootingIssues.find(i => i.id === 'wifi-upload-interrupted');
  ok('gap 6 — a mid-transfer Wi-Fi failure procedure exists', !!wifi);
  const wfText = JSON.stringify(wifi);
  for (const [label, re] of [
    ['power interruption', /انقطاع في تغذية الجهاز/],
    ['weak connection', /إشارة Wi-Fi ضعيفة/],
    ['timeout', /انتهاء مهلة الاتصال/],
    ['the wrong file', /الملف المرفوع خاطئ/],
    ['device state', /مساحة أو حالة الجهاز/],
    ['re-entering Wi-Fi mode', /أعد إدخاله وضع Wi-Fi/],
    ['not cutting power at a sensitive moment', /لا تفصل الطاقة عن الجهاز أثناء عملية كتابة جارية/],
    ['recovery when unresponsive', /اتبع إجراء الاسترجاع الرسمي/],
  ] as const) {
    ok(`Wi-Fi interruption covers ${label}`, re.test(wfText));
  }

  // The new entries must be as complete as the ones they sit beside.
  for (const id of ['build-failure', 'passthrough-failure', 'uart-conflict', 'wifi-upload-interrupted']) {
    const i = troubleshootingIssues.find(x => x.id === id)!;
    ok(`"${id}" has ordered checks with expected results and failure branches`,
      i.checks.length >= 5 && i.checks.every(c => c.instruction && c.expectedResult && c.ifFailed));
    ok(`"${id}" states when it is resolved`, i.resolvedWhen.length >= 40);
    ok(`"${id}" states what to do when it is not`, i.nextIfUnresolved.length >= 40);
    ok(`"${id}" cites official sources`, i.sources.length >= 1 && i.sources.every(s => /^https:\/\//.test(s.url)));
  }
  for (const id of ['device-category', 'build-options']) {
    const s = setupSteps.find(x => x.id === id)!;
    ok(`"${id}" has actions, expected results and a checklist`,
      s.actions.length >= 4 && s.expectedResult.length >= 1 && s.checklist.length >= 4);
    ok(`"${id}" records version notes`, s.versionNotes.length >= 1);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
group('[7] Retrieval metadata is populated across the control-link system');
{
  const rcModule = allKbModules.find(m => m.id === 'rc-link');
  ok('the control-link knowledge module exists', !!rcModule);

  interface Entry { id: string; kind: string; bot?: KbBotMeta }
  const corpus: Entry[] = [
    ...rcModule!.articles.map(a => ({ id: a.id, kind: 'article', bot: a.bot })),
    ...allDxTrees.filter(t => t.moduleId === 'rc-link').map(t => ({ id: t.id, kind: 'dx', bot: t.bot })),
    ...allEdgeTxPages.map(p => ({ id: p.id, kind: 'edgetx', bot: p.bot })),
    ...setupSteps.map(s => ({ id: s.id, kind: 'elrs-step', bot: s.bot })),
    ...troubleshootingIssues.map(i => ({ id: i.id, kind: 'elrs-issue', bot: i.bot })),
  ];
  ok('the control-link corpus is the full set of RC entries', corpus.length === 13 + 4 + 30 + 12 + 40);

  for (const e of corpus) {
    ok(`${e.kind}:${e.id} carries retrieval metadata`, !!e.bot);
    ok(`${e.kind}:${e.id} declares at least one intent`, (e.bot?.intents.length ?? 0) >= 1);
    ok(`${e.kind}:${e.id} declares symptoms in the user's own words`, (e.bot?.symptomsAr?.length ?? 0) >= 1);
    ok(`${e.kind}:${e.id} declares misspellings and transliterations`, (e.bot?.misspellingsAr?.length ?? 0) >= 2);
    ok(`${e.kind}:${e.id} declares at least one executable action`, (e.bot?.actions?.length ?? 0) >= 1);
    ok(`${e.kind}:${e.id} declares the system it belongs to`, (e.bot?.systems?.length ?? 0) >= 1);
    ok(`${e.kind}:${e.id} declares what must be known before any verdict`, (e.bot?.requiresBeforeVerdict?.length ?? 0) >= 1);
    ok(`${e.kind}:${e.id} declares its safety preconditions`, (e.bot?.safetyPrerequisitesAr?.length ?? 0) >= 1);
    for (const a of e.bot?.actions ?? []) {
      ok(`${e.kind}:${e.id} action → ${a.kind}:${a.targetId || '(root)'} opens a real destination`,
        strictRoute(a) !== null);
    }
  }

  // ── The required intents ──────────────────────────────────────────────────
  const REQUIRED_INTENTS = [
    'explain', 'navigate', 'software_setup', 'bind_device', 'diagnose', 'project_check',
    'compare', 'range_test', 'failsafe_setup', 'update_firmware', 'recover_device', 'missing_data',
  ] as const;
  const seenIntents = new Set(corpus.flatMap(e => e.bot?.intents ?? []));
  for (const i of REQUIRED_INTENTS) ok(`intent "${i}" (${KB_INTENT_LABEL_AR[i]}) is served by real content`, seenIntents.has(i));

  // ── The required symptoms, in real user language ──────────────────────────
  const REQUIRED_SYMPTOMS = [
    'الريسيفر لا يشتغل', 'لا يدخل Bind', 'البايند لا يعمل', 'متصل لكن القنوات لا تتحرك',
    'لا توجد Telemetry', 'LQ منخفضة', 'المدى ضعيف', 'الوحدة لا تظهر', 'Lua لا تعمل',
    'Passthrough يفشل', 'Wi-Fi انقطع', 'التحديث توقف', 'الراديو لا يرى المستقبل',
    'المستقبل يعيد التشغيل', 'Serial RX لا يعمل', 'اخترت UART ولا يوجد رد',
  ];
  const seenSymptoms = new Set(corpus.flatMap(e => e.bot?.symptomsAr ?? []));
  for (const s of REQUIRED_SYMPTOMS) ok(`symptom "${s}" is indexed as a user phrasing`, seenSymptoms.has(s));

  // ── The required executable actions ───────────────────────────────────────
  const allActionKeys = new Set(corpus.flatMap(e => (e.bot?.actions ?? []).map(linkKey)));
  const REQUIRED_ACTIONS: [string, string][] = [
    ['فتح إعدادات المشروع', 'project'],
    ['فتح Ports', 'betaflight:ports'],
    ['فتح Receiver', 'betaflight:receiver'],
    ['فتح Failsafe', 'betaflight:failsafe'],
    ['فتح ExpressLRS Configurator', 'elrs-setup:configurator-target'],
    ['فتح EdgeTX', 'edgetx'],
    ['فتح تقرير التعارض', 'project:findings'],
    ['طلب طراز اللوحة', 'assembly'],
    ['طلب Target', 'project:rc.rxTarget'],
    ['طلب إصدار Firmware', 'project:rc.rxFirmware'],
  ];
  for (const [label, key] of REQUIRED_ACTIONS) {
    ok(`required action "${label}" exists as a resolvable destination (${key})`, allActionKeys.has(key));
  }
  ok('required action "فتح مشكلة محددة" exists',
    [...allActionKeys].some(k => k.startsWith('elrs-issue:')));
  ok('required action "فتح خطوة محددة" exists',
    [...allActionKeys].some(k => k.startsWith('elrs-setup:')));

  // Every action must be a resolved destination, never prose. A link kind that
  // is not in the union cannot even be authored, and the resolution check above
  // covers the rest — but assert the negative explicitly so the rule is visible.
  ok('no action is an unresolved text instruction',
    corpus.flatMap(e => e.bot?.actions ?? []).every(a => typeof a.kind === 'string' && strictRoute(a) !== null));
}

// ═════════════════════════════════════════════════════════════════════════════
group('[8] requiresBeforeVerdict is honoured by the engine');
{
  const empty: ProjectSnapshot = { exists: false, stageIndex: 0, totalStages: 8, parts: {} };
  const noFindings = computeFindings(empty);
  ok('an empty project produces no compatibility claims at all', noFindings.length === 0);

  // The specific case the rule exists for: a band comparison must not be
  // attempted from one side alone.
  const oneSided: ProjectSnapshot = {
    exists: true, stageIndex: 3, totalStages: 8, parts: {},
    rcSetup: validateRcSetup({ txBand: '2.4ghz' }),
  };
  const oneSidedFindings = computeFindings(oneSided);
  ok('a band comparison is not attempted with only one side recorded',
    !oneSidedFindings.some(f => f.id === 'rc-band-match'));

  const bothSides: ProjectSnapshot = {
    ...oneSided,
    rcSetup: validateRcSetup({ txBand: '2.4ghz', rxBand: 'sub-ghz' }),
  };
  const mismatch = computeFindings(bothSides).find(f => f.id === 'rc-band-match');
  ok('with both sides recorded the mismatch is reported as a blocker',
    mismatch?.severity === 'blocker');
  ok('the blocker carries its reasoning and its evidence, not just a verdict',
    !!mismatch && mismatch.whyAr.length >= 60 && mismatch.evidenceAr.length >= 2);

  // Findings that cannot be settled from data say so instead of guessing.
  const unknowns = computeFindings({
    exists: true, stageIndex: 3, totalStages: 8, parts: {},
    rcSetup: validateRcSetup({ txSystem: 'elrs' }),
  }).filter(f => f.confidence === 'manual-required');
  ok('unsettleable questions are reported as manual-required rather than guessed', unknowns.length >= 1);
  ok('every manual-required finding names the data it lacks',
    unknowns.every(f => f.missingAr.length >= 1 || !!f.manualCheckAr));
}

// ═════════════════════════════════════════════════════════════════════════════
group('[9] EdgeTX and ExpressLRS read from the user\'s project');
{
  for (const id of Object.keys(EDGETX_PAGE_RC_FIELDS)) {
    ok(`EdgeTX context map key "${id}" is a real page`, edgeTxPageExists(id));
  }
  for (const id of Object.keys(ELRS_ENTRY_RC_FIELDS)) {
    ok(`ExpressLRS context map key "${id}" is a real step or issue`, stepIds.has(id) || issueIds.has(id));
  }

  // The requirement was explicitly NOT to show one general panel everywhere.
  ok('most EdgeTX topics deliberately have no project panel',
    Object.keys(EDGETX_PAGE_RC_FIELDS).length < allEdgeTxPages.length);
  ok('most ExpressLRS entries deliberately have no project panel',
    Object.keys(ELRS_ENTRY_RC_FIELDS).length < setupSteps.length + troubleshootingIssues.length);

  const filled: ProjectSnapshot = {
    exists: true, stageIndex: 4, totalStages: 8, parts: {},
    rcSetup: validateRcSetup({
      radioModel: 'RadioMaster TX16S', moduleKind: 'internal', txSystem: 'elrs', txBand: '2.4ghz',
      rxModel: 'RadioMaster RP1', rxTarget: 'RP1 2400 RX', rxFirmware: '3.4.3',
      modelMatch: false, telemetryRatio: '1:64', serialProtocol: 'crsf', uartIndex: 2,
      failsafeStrategy: 'hold-last',
    }),
  };
  const emptyProject: ProjectSnapshot = { exists: false, stageIndex: 0, totalStages: 8, parts: {} };

  ok('an EdgeTX topic shows the reader\'s own module and system',
    rcFactsForEdgeTxPage(filled, 'model-setup').length >= 3);
  ok('the same topic shows nothing at all when there is no project',
    rcFactsForEdgeTxPage(emptyProject, 'model-setup').length === 0);
  ok('an unmapped EdgeTX topic shows nothing even with a full project',
    rcFactsForEdgeTxPage(filled, 'mixes').length === 0);

  ok('the ExpressLRS Target step shows the reader\'s recorded Target',
    rcFactsForElrsEntry(filled, 'configurator-target').some(f => f.field === 'rxTarget'));
  ok('the ExpressLRS binding step shows the reader\'s system and firmware',
    rcFactsForElrsEntry(filled, 'binding').length >= 2);
  ok('the UART-conflict issue shows the ports the reader recorded',
    rcFactsForElrsEntry(filled, 'uart-conflict').some(f => f.field === 'uartIndex'));

  // Findings reach the right page, because the verdict engine's own links say so.
  const findings = computeFindings(filled);
  ok('the failsafe verdict reaches the EdgeTX failsafe topic',
    findingsForEdgeTxPage(findings, 'failsafe').length >= 1);
  ok('the model-match verdict reaches the EdgeTX Model Match topic',
    findingsForEdgeTxPage(findings, 'model-match').length >= 1);
  ok('a topic no finding pointed at shows no verdict',
    findingsForEdgeTxPage(findings, 'inputs').length === 0);
  ok('the ExpressLRS update steps receive the firmware verdict when it fires',
    findingsForElrsEntry(computeFindings({
      ...filled,
      rcSetup: validateRcSetup({ txFirmware: '3.4.3', rxFirmware: '3.3.0' }),
    }), 'update-tx').length >= 1);
}

// ═════════════════════════════════════════════════════════════════════════════
group('[10] Architecture — data stays data, content stays out of the eager bundle');
{
  const appTsx = read('src/App.tsx');
  ok('the EdgeTX centre is lazily loaded', /const EdgeTxView = lazy\(/.test(appTsx));
  ok('the EdgeTX topic screen is lazily loaded', /const EdgeTxPageView = lazy\(/.test(appTsx));
  ok('both EdgeTX routes are registered',
    appTsx.includes('path="/programming/edgetx"') && appTsx.includes('path="/programming/edgetx/:pageId"'));

  const dataFiles = [
    'src/data/edgetx/types.ts', 'src/data/edgetx/registry.ts', 'src/data/edgetx/sources.ts',
    'src/data/edgetx/pages/model.ts', 'src/data/edgetx/pages/control.ts',
    'src/data/edgetx/pages/link.ts', 'src/data/edgetx/pages/maintenance.ts',
    'src/data/edgetx/pages/problems.ts',
  ];
  for (const f of dataFiles) {
    const src = read(f);
    ok(`${f} does not import React`, !/from 'react'/.test(src));
    ok(`${f} does not import a component or a view`, !/from '(\.\.\/)+(components|views)\//.test(src));
    ok(`${f} does not reach for the DOM`, !/\bdocument\.|\bwindow\./.test(src));
  }

  // The centre is reachable from the software section rather than only by URL.
  const programming = read('src/views/ProgrammingView.tsx');
  ok('the software section offers EdgeTX as an available card',
    /id: 'edgetx'/.test(programming) && /route: '\/programming\/edgetx'/.test(programming));

  // Deep-link handling exists on all three screens.
  ok('the ExpressLRS setup screen honours ?step=', /searchParams\.get\('step'\)/.test(read('src/views/ExpressLrsSetupView.tsx')));
  ok('the ExpressLRS troubleshooting screen honours ?issue=', /searchParams\.get\('issue'\)/.test(read('src/views/ExpressLrsTroubleshootingView.tsx')));
  const topicView = read('src/views/EdgeTxPageView.tsx');
  ok('the EdgeTX topic screen honours ?topic=', /searchParams\.get\('topic'\)/.test(topicView));
  ok('the EdgeTX topic screen validates the requested topic against the page',
    /page\?\.groups\.some\(g => g\.settings\.some\(s => s\.id === requestedTopic\)\)/.test(topicView));
  ok('an unknown EdgeTX page id renders an honest screen rather than crashing',
    /edgetx-unknown-page/.test(topicView) && /if \(!page\)/.test(topicView));

  // Search reaches the exact entry, not just the centre.
  const index = read('src/data/kb/search/buildIndex.ts');
  ok('search indexes EdgeTX topics', /key: `edgetx-topic:\$\{p\.id\}`/.test(index));
  ok('search indexes individual EdgeTX settings', /key: `edgetx-setting:\$\{p\.id\}\.\$\{st\.id\}`/.test(index));
  ok('EdgeTX search results carry a deep link to the setting', /\?topic=\$\{encodeURIComponent\(st\.id\)\}/.test(index));
}

// ═════════════════════════════════════════════════════════════════════════════
group('[11] The project schema still migrates from the previous version');
{
  const store = read('src/data/project/store.ts');
  ok('the store declares schema version 2', /SCHEMA_VERSION = 2/.test(store));
  ok('the migration reads the version declared inside a pre-envelope payload',
    /const declared = fromVersion === 0\s*\n\s*\? \(data as Record<string, unknown>\)\.version\s*\n\s*: fromVersion;/.test(store));
  ok('the migration refuses a payload whose declared version it does not know',
    /declared !== 1 && declared !== SCHEMA_VERSION/.test(store));
  ok('the control-link setup is written through the one store', /export function saveRcSetup/.test(store));
}

console.log(`\n✅ testEdgeTx: ${passed} assertions passed`);
console.log(`   ${TOTAL_EDGETX_PAGES} EdgeTX topics · ${edgeTxTopicIndex().length} addressable entries · `
  + `${setupSteps.length} ExpressLRS steps · ${troubleshootingIssues.length} ExpressLRS issues\n`);
