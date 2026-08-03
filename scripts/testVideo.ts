/**
 * The video-system closure gate.
 *
 * WHAT THIS FILE IS FOR
 * ---------------------
 * The video system was closed vertically: knowledge, the per-build record, the
 * verdict rules, the wiring and power story, the software centre, the
 * diagnostics, search, the glossary and the retrieval metadata. Every one of
 * those is easy to claim in a report and hard to prove, so each is asserted
 * here against the data instead.
 *
 * The seventeen groups below are the seventeen the requirement named. The ones
 * that matter most are the ones that would fail if someone added video content
 * carelessly later:
 *
 *   no two entries own the same diagnostic symptom
 *   every link and every bot action resolves to a real destination
 *   no video system exists in the taxonomy without a project field, an article
 *     and a diagnostic path
 *   no compatibility verdict fires when the fact it depends on was never
 *     recorded — including, specifically, generation compatibility, which is
 *     the one the platform must never guess
 *   a transmitter is never treated as ready without a confirmed antenna
 *   a UART claimed twice is never silent
 *   the video content stays out of the eager bundle
 *   every data function runs in Node with no React anywhere near it
 *
 * Run: npx tsx scripts/testVideo.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  VIDEO_CHAIN, videoChainFor, VIDEO_ECOSYSTEM_CLASS, VIDEO_ECOSYSTEM_CROSS_VENDOR,
  VIDEO_CONNECTOR_LOOKALIKES, VTX_CONTROL_FACTS, OSD_PROTOCOL_FACTS,
  VIDEO_ECOSYSTEM_LABEL_AR, type VideoEcosystem,
} from '../src/data/video/types';
import {
  allVideoToolPages, videoToolSections, getVideoToolPage, videoToolIndex,
} from '../src/data/video/software/registry';

import { allKbModules, getArticle, getModule, resolveLinkRoute, kbLinkToDestination } from '../src/data/kb/registry';
import { allDxTrees } from '../src/data/kb/diagnostics/trees';
import { kbTerms } from '../src/data/kb/glossary/terms';
import { KB_INTENT_LABEL_AR, type KbBotMeta, type KbLink } from '../src/data/kb/types';
import { domainElements } from '../src/data/kb/domainMatrix';

import { resolveDestination } from '../src/platform/destinations';
import {
  VIDEO_FIELD_INPUT_ID, validateVideoSetup, videoSetupCompleteness, hasVideoSetup,
  type VideoSetup,
} from '../src/data/project/videoSetup';
import { computeVideoFindings } from '../src/data/project/videoVerdicts';
import { computeFindings } from '../src/data/project/verdicts';
import {
  BF_PAGE_VIDEO_FIELDS, MODULE_VIDEO_FIELDS, MODULE_PART_SLOTS,
  videoFactsFor, videoFactsForBetaflightPage, factsForBetaflightPage,
} from '../src/data/project/context';
import type { ProjectSnapshot } from '../src/data/project/types';
import { getSearchIndex } from '../src/data/kb/search/buildIndex';
import { search } from '../src/data/kb/search/query';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

const videoModule = getModule('video');
assert.ok(videoModule, 'the video module must be registered before this gate can run');
const videoArticles = videoModule.articles;
const videoTrees = allDxTrees.filter(t => t.moduleId === 'video');

/** A snapshot with only what a test needs, so a rule can be isolated. */
function snap(videoSetup: VideoSetup, extra: Partial<ProjectSnapshot> = {}): ProjectSnapshot {
  return { exists: true, videoSetup, ...extra } as ProjectSnapshot;
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[1] The taxonomy is complete and internally consistent');
{
  ok(`the chain is modelled end to end (${VIDEO_CHAIN.length} stages)`, VIDEO_CHAIN.length >= 12);
  ok('the chain starts at the scene and ends at a return path',
    VIDEO_CHAIN[0].id === 'scene' && VIDEO_CHAIN.some(s => s.returnPath));
  ok('every stage says what its failure looks like',
    VIDEO_CHAIN.every(s => s.failureLooksLikeAr.length > 20));
  ok('every stage declares which link classes it belongs to',
    VIDEO_CHAIN.every(s => s.appliesTo.length > 0));

  const analog = videoChainFor('analog');
  const digital = videoChainFor('digital');
  ok('the analog and digital chains differ', analog.length !== digital.length
    || analog.some((s, i) => s.id !== digital[i]?.id));
  ok('both chains are non-empty', analog.length > 0 && digital.length > 0);

  // The distinction the whole system rests on: a closed ecosystem is not a
  // link class, and a brand name is neither.
  ok('every ecosystem declares its link class', Object.keys(VIDEO_ECOSYSTEM_LABEL_AR)
    .every(e => VIDEO_ECOSYSTEM_CLASS[e as VideoEcosystem] !== undefined));
  ok('exactly the analog ecosystem is cross-vendor',
    VIDEO_ECOSYSTEM_CROSS_VENDOR['analog-58'] === true
    && ['dji', 'walksnail', 'hdzero'].every(e => VIDEO_ECOSYSTEM_CROSS_VENDOR[e as VideoEcosystem] === false));

  ok('connector look-alike pairs are declared', VIDEO_CONNECTOR_LOOKALIKES.length >= 2);
  ok('every control protocol states whether it needs a UART',
    Object.values(VTX_CONTROL_FACTS).every(f => typeof f.needsUart === 'boolean'));
  ok('every overlay protocol states who draws it',
    Object.values(OSD_PROTOCOL_FACTS).every(f => f.drawnByAr.length > 5));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2] Every video system in the taxonomy has knowledge, a record and a diagnosis');
{
  const REAL: VideoEcosystem[] = ['analog-58', 'dji', 'walksnail', 'hdzero'];
  const articleText = videoArticles.map(a => `${a.id} ${a.titleAr} ${a.summaryAr}`).join(' ');

  for (const eco of REAL) {
    ok(`${eco}: has an article that names it`,
      videoArticles.some(a => a.id.includes(eco.replace('-58', '')) )
      || articleText.includes(VIDEO_ECOSYSTEM_LABEL_AR[eco]));
  }

  // No video system without a project entry: the record must be able to hold
  // every ecosystem the taxonomy declares, on BOTH ends.
  for (const eco of REAL) {
    const v = validateVideoSetup({ ecosystem: eco, gogglesEcosystem: eco });
    ok(`${eco}: the project record accepts it on both ends`,
      v?.ecosystem === eco && v?.gogglesEcosystem === eco);
  }

  // No video system without diagnostics: every tree must be reachable, and the
  // trees together must cover the core symptoms.
  ok(`video diagnostic trees exist (${videoTrees.length})`, videoTrees.length >= 8);
  const symptomText = videoTrees.map(t => `${t.symptomAr} ${t.aliases.join(' ')}`).join(' ');
  for (const core of ['صورة', 'تقطع', 'OSD', 'تسخن', 'الاقتران', 'التسجيل', 'القناة']) {
    ok(`core symptom covered: ${core}`, symptomText.includes(core));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3] One owner per symptom — no duplicate diagnosis');
{
  // WHAT "ONE OWNER" ACTUALLY MEANS HERE
  // ------------------------------------
  // Two trees must never claim the same SYMPTOM — the full statement of what
  // the user is seeing, and the title that names it. That is ownership.
  //
  // Aliases are deliberately excluded from the cross-module check, because
  // aliases are search keywords, not claims. «اهتزاز» legitimately appears on
  // both the gyro-noise tree and the prop-vibration tree: a reader typing it
  // genuinely could want either, and the search index is what ranks between
  // them. Forbidding that would push authors to drop real search terms, which
  // makes the content harder to find in order to satisfy a test.
  //
  // Within the video module, aliases ARE checked, because these eight trees
  // split one subject and an alias shared between two of them is a real
  // ambiguity rather than a legitimate overlap.
  const owner = new Map<string, string>();
  const clashes: string[] = [];
  for (const t of allDxTrees) {
    for (const a of [t.symptomAr, t.titleAr]) {
      const key = a.trim();
      const prev = owner.get(key);
      if (prev && prev !== t.id) clashes.push(`"${key}": ${prev} vs ${t.id}`);
      owner.set(key, t.id);
    }
  }
  if (clashes.length) console.error('  CLASHES:', clashes);
  ok('no two diagnostic trees state the same symptom or carry the same title', clashes.length === 0);

  const videoAliasOwner = new Map<string, string>();
  const aliasClashes: string[] = [];
  for (const t of videoTrees) {
    for (const a of t.aliases) {
      const key = a.trim();
      const prev = videoAliasOwner.get(key);
      if (prev && prev !== t.id) aliasClashes.push(`"${key}": ${prev} vs ${t.id}`);
      videoAliasOwner.set(key, t.id);
    }
  }
  if (aliasClashes.length) console.error('  VIDEO ALIAS CLASHES:', aliasClashes);
  ok('no two video trees share a search alias', aliasClashes.length === 0);

  // The three handoffs the video trees promised in their own file header must
  // actually resolve, or the "we do not own this" claim is a dead end.
  const handoffs = ['dx-power-noise', 'dx-prop-vibration', 'dx-rc-range'];
  for (const h of handoffs) {
    ok(`handoff target exists: ${h}`, allDxTrees.some(t => t.id === h));
  }
  ok('at least one video tree hands off rather than re-diagnosing',
    videoTrees.some(t => t.links.some(l => l.kind === 'dx' && handoffs.includes(l.targetId ?? ''))));

  // A software-centre problem page either hands off or states why it owns the
  // symptom. Never both, never neither.
  const problems = allVideoToolPages.filter(p => p.kind === 'problem');
  ok(`software-centre problem pages exist (${problems.length})`, problems.length > 0);
  for (const p of problems) {
    ok(`${p.id}: declares exactly one of canonicalDiagnosis / ownsDiagnosis`,
      (!!p.canonicalDiagnosis) !== (!!p.ownsDiagnosis));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[4] Every destination resolves — no dead links anywhere in video content');
{
  const dead: string[] = [];
  const checkLinks = (where: string, links: KbLink[]) => {
    for (const l of links) {
      if (l.kind === 'external') continue;
      if (resolveLinkRoute(l) === null) dead.push(`${where} → ${l.kind}:${l.targetId ?? ''}`);
    }
  };
  const checkBot = (where: string, bot: KbBotMeta | undefined) => {
    if (!bot) return;
    checkLinks(`${where}(bot)`, bot.actions);
  };

  for (const a of videoArticles) {
    checkLinks(`article:${a.id}`, a.links ?? []);
    checkBot(`article:${a.id}`, a.bot);
  }
  for (const t of videoTrees) {
    checkLinks(`dx:${t.id}`, t.links);
    checkBot(`dx:${t.id}`, t.bot);
  }
  for (const p of allVideoToolPages) {
    checkLinks(`tool:${p.id}`, p.links);
    checkBot(`tool:${p.id}`, p.bot);
    if (p.canonicalDiagnosis) checkLinks(`tool:${p.id}(canonical)`, [p.canonicalDiagnosis]);
  }
  if (dead.length) console.error('  DEAD LINKS:', dead.slice(0, 25));
  ok('no dead link in any video article, tree or software page', dead.length === 0);

  // Registries agree with destinations: every section id maps to a real page,
  // and every page appears in exactly one section.
  const inSections = videoToolSections.flatMap(s => s.pageIds);
  ok('every section page id resolves', inSections.every(id => !!getVideoToolPage(id)));
  ok('every software page appears in exactly one section',
    allVideoToolPages.every(p => inSections.filter(id => id === p.id).length === 1));
  ok('every software page has a resolvable route',
    allVideoToolPages.every(p => !!resolveDestination({ kind: 'video', id: p.id })));

  // Every project link names a field that exists on one of the two records.
  const projectLinks = [
    ...videoArticles.flatMap(a => [...(a.links ?? []), ...(a.bot?.actions ?? [])]),
    ...videoTrees.flatMap(t => [...t.links, ...(t.bot?.actions ?? [])]),
    ...allVideoToolPages.flatMap(p => [...p.links, ...(p.bot?.actions ?? [])]),
  ].filter(l => l.kind === 'project' && l.targetId && l.targetId !== 'findings');
  const unfielded = projectLinks.filter(l => {
    const d = kbLinkToDestination(l);
    return !(d && d.kind === 'project' && 'field' in d && d.field);
  });
  if (unfielded.length) console.error('  UNRESOLVED FIELDS:', unfielded.map(l => l.targetId));
  ok(`every project link names a real field (${projectLinks.length} checked)`, unfielded.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[5] The per-build record: optional, validating, and never guessing');
{
  // "Nothing recorded" and "no record" are deliberately the same answer: an
  // object with every field empty carries no more information than no object,
  // and collapsing them means the store never persists a shell that later reads
  // as "the user answered, and the answer was nothing".
  ok('a record with nothing in it collapses to absent', validateVideoSetup({}) === undefined);
  ok('an absent record stays absent', validateVideoSetup(undefined) === undefined);
  ok('a non-object is rejected rather than coerced',
    validateVideoSetup('dji') === undefined && validateVideoSetup(null) === undefined);
  ok('hasVideoSetup agrees with that', hasVideoSetup({}) === false && hasVideoSetup(undefined) === false);
  ok('one recorded field is enough to make a record real',
    validateVideoSetup({ ecosystem: 'dji' })?.ecosystem === 'dji' && hasVideoSetup({ ecosystem: 'dji' }) === true);

  // The rule that makes the whole thing honest: garbage is dropped, not coerced.
  const dirty = validateVideoSetup({
    ecosystem: 'not-a-system', linkClass: 'analog', band: 'nope',
    vtxControlUartIndex: 'three', powerMw: 25,
  });
  ok('an invalid enum is dropped rather than coerced', dirty?.ecosystem === undefined);
  ok('a valid field beside an invalid one survives', dirty?.linkClass === 'analog');
  ok('a non-numeric number field is dropped', dirty?.vtxControlUartIndex === undefined);
  ok('a valid number survives', dirty?.powerMw === 25);

  ok('completeness counts driving fields only',
    videoSetupCompleteness({}).filled === 0
    && videoSetupCompleteness({ mountingNote: 'x' }).filled === 0
    && videoSetupCompleteness({ ecosystem: 'dji' }).filled === 1);

  // Every field the record holds must be addressable by a deep link, or content
  // cannot ask for it.
  const fieldCount = Object.keys(VIDEO_FIELD_INPUT_ID).length;
  ok(`every recorded field has an input id (${fieldCount})`, fieldCount >= 30);
  ok('input ids are unique',
    new Set(Object.values(VIDEO_FIELD_INPUT_ID)).size === fieldCount);
  ok('the video module has a part slot (project context would be empty otherwise)',
    (MODULE_PART_SLOTS['video']?.length ?? 0) > 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[6] Verdicts: no judgement without the fact it depends on');
{
  const ids = (p: ProjectSnapshot) => computeVideoFindings(p).map(f => f.id);

  ok('an empty record produces no confident verdict',
    computeVideoFindings(snap({})).every(f => f.severity === 'unknown' || f.confidence !== 'high'));

  // THE rule for this subject: generation compatibility is never inferred.
  const sameBrandUnknownGen = snap({
    ecosystem: 'dji', gogglesEcosystem: 'dji',
    airUnitModel: 'Air Unit X', gogglesModel: 'Goggles Y',
  });
  ok('same ecosystem on both ends does not produce a compatibility PASS',
    !computeVideoFindings(sameBrandUnknownGen)
      .some(f => f.id === 'video-goggles-system' && f.severity === 'ok' && f.confidence === 'high'));

  // A genuine mismatch, however, must fire and must block.
  const mismatch = snap({ ecosystem: 'dji', gogglesEcosystem: 'hdzero' });
  const mismatchFinding = computeVideoFindings(mismatch).find(f => f.id === 'video-goggles-system');
  ok('goggles from another ecosystem is a blocker',
    mismatchFinding?.severity === 'blocker');
  ok('…and it explains why rather than only asserting',
    (mismatchFinding?.whyAr.length ?? 0) > 30);

  // A transmitter is never "ready" without an antenna.
  ok('an unconfirmed antenna is raised', ids(snap({ ecosystem: 'analog-58' })).includes('video-antenna-missing')
    || ids(snap({ ecosystem: 'analog-58', antennaFittedConfirmed: false })).includes('video-antenna-missing'));
  const noAntenna = computeVideoFindings(snap({ ecosystem: 'analog-58', antennaFittedConfirmed: false }))
    .find(f => f.id === 'video-antenna-missing');
  ok('running without an antenna is a blocker, not a warning', noAntenna?.severity === 'blocker');

  // A UART claimed twice is never silent.
  const clash = snap({ vtxControlProtocol: 'smartaudio', vtxControlUartIndex: 2, osdProtocol: 'msp-displayport', osdUartIndex: 2 });
  ok('two video functions on one UART is reported', ids(clash).includes('video-uart-conflict'));
  ok('…as a blocker',
    computeVideoFindings(clash).find(f => f.id === 'video-uart-conflict')?.severity === 'blocker');

  // Incompatible voltage is never accepted.
  ok('an out-of-range power source is reported',
    ids(snap({ ecosystem: 'analog-58', powerSource: 'fc-5v', airDeviceRole: 'vtx' })).length > 0);

  // BEC capacity is never inferred from a name.
  const becFindings = computeVideoFindings(snap({ powerSource: 'external-bec' }));
  ok('an unstated BEC rating produces a request for data, not a pass',
    becFindings.every(f => f.id !== 'video-bec-headroom' || f.severity === 'unknown'));

  // Every finding must carry the full shape — a claim with no evidence and no
  // next action is an opinion.
  const all = [
    ...computeVideoFindings(mismatch), ...computeVideoFindings(clash),
    ...computeVideoFindings(snap({ ecosystem: 'analog-58' })),
  ];
  ok(`video findings exist to check (${all.length})`, all.length > 0);
  ok('every finding states a claim and the reasoning behind it',
    all.every(f => f.claimAr.length > 5 && f.whyAr.length > 5));
  // An `ok` finding is a confirmation — "your overlay protocol is recorded and
  // this is what it implies" — and inventing a next action for it would train
  // readers to skip the action list on the findings that do need one.
  ok('every finding that is not a confirmation carries a next action',
    all.filter(f => f.severity !== 'ok').every(f => f.actionsAr.length > 0));
  ok('every finding declares its confidence and severity',
    all.every(f => !!f.confidence && !!f.severity));
  ok('every unknown finding says what is missing',
    all.filter(f => f.severity === 'unknown').every(f => (f.missingAr?.length ?? 0) > 0));
  ok('every finding links somewhere actionable',
    all.every(f => f.links.length > 0 && f.links.every(l => l.kind === 'external' || resolveLinkRoute(l) !== null)));

  // The engine is ONE engine — the video rules run inside computeFindings.
  ok('video rules run inside the single verdict engine',
    computeFindings(mismatch).some(f => f.id === 'video-goggles-system'));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[7] The software centre reads the reader\'s own build');
{
  ok('the Betaflight OSD and VTX pages declare video fields',
    (BF_PAGE_VIDEO_FIELDS['osd']?.length ?? 0) > 0 && (BF_PAGE_VIDEO_FIELDS['vtx']?.length ?? 0) > 0);
  ok('the ports page declares fields from BOTH records',
    (BF_PAGE_VIDEO_FIELDS['ports']?.length ?? 0) > 0);

  const p = snap({ ecosystem: 'dji', osdProtocol: 'msp-displayport', osdUartIndex: 4, band: '5.8ghz', channel: 'R1' });
  const osdFacts = videoFactsForBetaflightPage(p, 'osd');
  ok('the OSD page shows the reader\'s recorded overlay protocol',
    osdFacts.some(f => f.field === 'osdProtocol'));
  ok('a recorded UART renders as a readable value',
    osdFacts.some(f => f.field === 'osdUartIndex' && f.valueAr.includes('4')));
  ok('an unrecorded field produces no row',
    videoFactsFor(p, ['thermalTestedOn']).length === 0);
  ok('no project means no facts at all',
    videoFactsFor({ exists: false } as ProjectSnapshot, ['ecosystem']).length === 0);

  // The merged view is what makes a UART clash visible on the ports screen.
  const both = factsForBetaflightPage(
    snap({ vtxControlUartIndex: 2 }, { rcSetup: { uartIndex: 2 } } as Partial<ProjectSnapshot>),
    'ports',
  );
  ok('the ports page merges control-link and video facts into one list',
    both.some(f => f.record === 'rc') && both.some(f => f.record === 'video'));

  // Every software page's declared fields are real fields.
  const badFields = allVideoToolPages.flatMap(pg =>
    pg.projectFields.filter(f => !(f in VIDEO_FIELD_INPUT_ID)).map(f => `${pg.id}:${String(f)}`));
  if (badFields.length) console.error('  UNKNOWN FIELDS:', badFields);
  ok('every software page names only real record fields', badFields.length === 0);

  ok('the video KB module declares which facts to show beside its articles',
    (MODULE_VIDEO_FIELDS['video']?.length ?? 0) > 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[8] The software centre never invents a tool, a step or a path');
{
  for (const p of allVideoToolPages) {
    ok(`${p.id}: declares what it refuses to state`, p.manualRequiredAr.length > 0);
    ok(`${p.id}: carries version caveats`, p.versionNotesAr.length > 0);
    ok(`${p.id}: states how to undo it`, p.revertAr.length > 30);
    ok(`${p.id}: states how to verify it worked`, p.verifyAr.length >= 3);
    ok(`${p.id}: names its common mistakes`, p.commonMistakesAr.length >= 3);
    ok(`${p.id}: cites at least one source with a version`,
      p.sources.length > 0 && p.sources.every(s => !!s.version && !!s.reviewedAt));
    ok(`${p.id}: has real steps`, p.stepsAr.length >= 3 && p.stepsAr.every(s => s.textAr.length > 40));
    ok(`${p.id}: relates itself to the rest of the system`, p.relationAr.length >= 2);
  }

  // Retry-as-a-solution is the failure mode the requirement named by name for
  // ExpressLRS build failures; the same rule holds here.
  const failure = getVideoToolPage('tool-update-failure');
  ok('the update-failure page rejects "just try again" as the answer',
    !!failure && failure.commonMistakesAr.some(m => m.includes('إعادة المحاولة')));

  // Ecosystem pages must not claim compatibility they cannot know.
  for (const id of ['dji-tools', 'walksnail-tools', 'hdzero-tools']) {
    const pg = getVideoToolPage(id);
    ok(`${id}: sends generation compatibility to the manufacturer`,
      !!pg && pg.manualRequiredAr.some(m => m.includes('توافق')));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[9] Diagnostics start with the least dangerous check');
{
  const CLASS_ORDER = ['visual', 'electrical', 'software', 'functional'];
  for (const t of videoTrees) {
    const root = t.nodes.find(n => n.id === t.rootNodeId)!;
    // The invariant is "the entry is the safest check the tree contains", not
    // "the entry is visual". The overlay tree is entirely software checks on
    // purpose: it only applies once the picture already works, so nothing
    // physical is in question and every step is reading a setting. Demanding a
    // visual root there would mean inventing an inspection with no purpose.
    const rootRank = CLASS_ORDER.indexOf(root.checkClass);
    const minRank = Math.min(...t.nodes.map(n => CLASS_ORDER.indexOf(n.checkClass)));
    ok(`${t.id}: the entry check is the safest class the tree contains (${root.checkClass})`,
      rootRank === minRank);
    ok(`${t.id}: nothing is powered up as the first step`, root.checkClass !== 'functional');
    ok(`${t.id}: declares its risk posture before any step`,
      t.quickChecks.length >= 3 && t.stopConditions.length >= 3);
    ok(`${t.id}: requires props off`, t.removeProps === true);
    ok(`${t.id}: carries retrieval metadata`, !!t.bot && t.bot.symptomsAr.length >= 4);
  }

  // The one hazard unique to this system: powering a transmitter with no
  // antenna. At least one tree must check it before allowing power, and the
  // safety text must exist somewhere in the corpus.
  const antennaText = videoTrees
    .flatMap(t => [...t.quickChecks, ...t.stopConditions, ...t.nodes.map(n => n.safetyNote ?? '')])
    .join(' ');
  ok('the no-antenna hazard is stated before power in the trees',
    antennaText.includes('هوائي'));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[10] Retrieval metadata is filled, not stubbed');
{
  const entries: { id: string; bot?: KbBotMeta }[] = [
    ...videoArticles.map(a => ({ id: `article:${a.id}`, bot: a.bot })),
    ...videoTrees.map(t => ({ id: `dx:${t.id}`, bot: t.bot })),
    ...allVideoToolPages.map(p => ({ id: `tool:${p.id}`, bot: p.bot })),
  ];
  for (const e of entries) {
    ok(`${e.id}: has bot metadata`, !!e.bot);
    ok(`${e.id}: declares intents`, (e.bot?.intents.length ?? 0) > 0);
    ok(`${e.id}: carries user-language symptoms`, (e.bot?.symptomsAr.length ?? 0) >= 3);
    ok(`${e.id}: carries executable actions`, (e.bot?.actions.length ?? 0) >= 2);
    ok(`${e.id}: every intent is a real intent`,
      (e.bot?.intents ?? []).every(i => i in KB_INTENT_LABEL_AR));
  }

  // The required intents, present somewhere across the video corpus.
  const allIntents = new Set(entries.flatMap(e => e.bot?.intents ?? []));
  for (const i of ['explain', 'diagnose', 'software_setup', 'project_check', 'compare',
    'update_firmware', 'bind_device', 'recover_device', 'missing_data', 'safety_warning', 'navigate']) {
    ok(`intent present in the video corpus: ${i}`, allIntents.has(i as never));
  }

  // The user phrasings the requirement listed by name must actually retrieve.
  const symptomCorpus = entries.flatMap(e => [
    ...(e.bot?.symptomsAr ?? []), ...(e.bot?.misspellingsAr ?? []),
  ]).join(' | ');
  const REQUIRED_PHRASINGS = [
    'شاشة سوداء', 'الصورة تقطع', 'OSD', 'النظارة لا ترى الوحدة', 'تسخن',
    'قوة الإرسال', 'تتوافق', 'الكانفاس', 'التسجيل', 'الاقتران',
  ];
  for (const phrase of REQUIRED_PHRASINGS) {
    ok(`a user phrasing is covered: «${phrase}»`, symptomCorpus.includes(phrase));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[11] Search reaches the specific entry, not just the module');
{
  const index = getSearchIndex();
  const q = (s: string) => search(s, { limit: 10 });

  ok('the index carries video software pages',
    index.some(d => d.type === 'video-tool'));
  ok(`every software page is indexed (${allVideoToolPages.length})`,
    allVideoToolPages.every(p => index.some(d => d.key === `video-tool:${p.id}`)));
  ok('every video article is indexed',
    videoArticles.every(a => index.some(d => d.type === 'article' && d.sourceId === a.id)));
  ok('every video tree is indexed',
    videoTrees.every(t => index.some(d => d.type === 'dx' && d.sourceId === t.id)));

  const CASES: [string, (r: ReturnType<typeof q>) => boolean][] = [
    ['شاشة سوداء', r => r.some(h => h.doc.sourceId === 'dx-video-no-image')],
    ['الصورة تقطع', r => r.some(h => h.doc.sourceId === 'dx-video-breakup')],
    ['التسجيل لا يعمل', r => r.some(h => h.doc.sourceId === 'dx-video-recording')],
    ['الاقتران', r => r.length > 0],
    ['استقطاب', r => r.length > 0],
    ['كانفاس', r => r.length > 0],
    ['dji', r => r.length > 0],
    ['walksnail', r => r.length > 0],
    ['hdzero', r => r.length > 0],
  ];
  for (const [query, check] of CASES) {
    ok(`search «${query}» reaches video content`, check(q(query)));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[12] The glossary covers the vocabulary');
{
  const byId = new Map(kbTerms.map(t => [t.id, t]));
  const REQUIRED = [
    'vtx', 'vrx', 'air-unit', 'fpv-camera', 'goggles', 'dvr', 'msp-displayport',
    'canvas-mode', 'smartaudio', 'irc-tramp', 'pit-mode', 'raceband', 'video-band',
    'video-channel', 'rhcp', 'lhcp', 'antenna-gain', 'video-diversity',
    'video-latency', 'bitrate', 'multipath', 'fresnel-zone', 'pal-ntsc',
    'video-noise', 'black-screen', 'camera-control', 'video-link-class',
  ];
  for (const id of REQUIRED) {
    ok(`glossary term exists: ${id}`, byId.has(id));
  }
  const videoTerms = kbTerms.filter(t => t.domain === 'video');
  ok(`the video domain is populated (${videoTerms.length})`, videoTerms.length >= 25);
  ok('every video term carries its English form',
    videoTerms.every(t => !!t.en && t.en.length > 1));
  ok('every video term has a plain-language definition',
    videoTerms.every(t => t.short.length > 20));
  ok('every video term says where the reader actually meets it',
    videoTerms.every(t => t.appearsIn.length > 0));
  ok('every related-term reference resolves',
    videoTerms.every(t => t.relatedTermIds.every(id => byId.has(id))));
  ok('every "confused with" reference resolves',
    videoTerms.every(t => t.confusedWith.every(c => byId.has(c.termId))));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[13] The module is wired into the platform, not bolted beside it');
{
  ok('the video module is registered', allKbModules.some(m => m.id === 'video'));
  ok(`the module carries its articles (${videoArticles.length})`, videoArticles.length >= 15);
  ok('every article resolves through the registry',
    videoArticles.every(a => !!getArticle(a.id)));
  ok('the module declares learning paths', (videoModule.paths?.length ?? 0) >= 4);
  ok('every path names only real articles',
    (videoModule.paths ?? []).every(p => p.articleIds.every(id => !!getArticle(id))));

  const matrixEl = domainElements.find(e => e.id === 'video');
  ok('the domain matrix element points at the module', matrixEl?.moduleId === 'video');
  ok('…and at the glossary domain', matrixEl?.glossaryDomain === 'video');
  ok('…and at its Betaflight pages', (matrixEl?.betaflightPageIds?.length ?? 0) >= 2);

  // Diagnostics must reach the module and the module must reach diagnostics.
  ok('video trees name the video module', videoTrees.every(t => t.moduleId === 'video'));
  ok('video articles link to diagnostics',
    videoArticles.some(a => (a.links ?? []).some(l => l.kind === 'dx')));
  ok('video trees link back to articles',
    videoTrees.every(t => t.relatedArticleIds.length > 0));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[14] The content stays out of the eager bundle');
{
  const app = readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8');
  for (const view of ['VideoSoftwareView', 'VideoSoftwarePageView']) {
    ok(`${view} is lazy`,
      new RegExp(`const ${view} = lazy\\(`).test(app)
      && new RegExp(`import\\('\\./views/${view}'\\)`).test(app));
    ok(`${view} is NOT eagerly imported`,
      !new RegExp(`^import \\{[^}]*\\b${view}\\b`, 'm').test(app));
  }
  ok('both video routes are registered',
    /path="\/programming\/video"/.test(app) && /path="\/programming\/video\/:pageId"/.test(app));

  // The KB module rides the generic /kb/:moduleId route rather than adding one.
  ok('the video KB module needs no route of its own',
    !/path="\/kb\/video"/.test(app) && /path="\/kb\/:moduleId"/.test(app));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[15] The data layer runs without React');
{
  // Everything asserted above already ran in Node with no DOM, which is the
  // real proof. What this group adds is that no data file IMPORTS React or a
  // browser API, so it stays true when someone edits one.
  const files = [
    'src/data/video/types.ts',
    'src/data/video/software/types.ts',
    'src/data/video/software/registry.ts',
    'src/data/video/software/pages/betaflight.ts',
    'src/data/video/software/pages/vendorTools.ts',
    'src/data/video/software/pages/ecosystems.ts',
    'src/data/project/videoSetup.ts',
    'src/data/project/videoVerdicts.ts',
    'src/data/kb/modules/video/module.ts',
    'src/data/kb/diagnostics/trees/video.ts',
  ];
  for (const f of files) {
    const src = readFileSync(path.join(ROOT, f), 'utf8');
    ok(`${f}: imports no React`, !/from ['"]react['"]/.test(src));
    ok(`${f}: touches no browser global`, !/\b(document|window|localStorage)\s*\./.test(src));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[16] Old projects still load — the record is additive');
{
  // A v2 project (control link only, no video) must still validate, and must
  // simply report an absent video record rather than failing or inventing one.
  ok('a project with no video record is valid',
    validateVideoSetup(undefined) === undefined);
  ok('…and produces no video verdicts',
    computeVideoFindings({ exists: true } as ProjectSnapshot).length === 0);
  ok('…and no video facts', videoFactsFor({ exists: true } as ProjectSnapshot, ['ecosystem']).length === 0);

  // A project that exists but has an empty video record behaves the same way as
  // one with none: no confident claims from nothing.
  ok('an empty video record produces no blocker',
    computeVideoFindings(snap({})).every(f => f.severity !== 'blocker'));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[17] No declared gap remains inside the system');
{
  // Placeholder text is the way an unfinished page ships looking finished.
  // «قريباً» is deliberately NOT in this list. It is an ordinary Arabic adverb
  // meaning "nearby" — and it is a substring of «تقريباً» — so matching it
  // flags real prose («الصورة نظيفة قريباً وتسوء مع الابتعاد») as unfinished.
  // Only unambiguous unfinished-work markers belong here.
  const PLACEHOLDERS = ['TODO', 'TBD', 'FIXME', 'XXX', 'قيد الإنشاء', 'سنضيف لاحقاً', 'لم يُكتب بعد'];
  const blobs: [string, string][] = [
    ...videoArticles.map(a => [`article:${a.id}`, JSON.stringify(a)] as [string, string]),
    ...videoTrees.map(t => [`dx:${t.id}`, JSON.stringify(t)] as [string, string]),
    ...allVideoToolPages.map(p => [`tool:${p.id}`, JSON.stringify(p)] as [string, string]),
  ];
  const found = blobs.filter(([, body]) => PLACEHOLDERS.some(ph => body.includes(ph)));
  if (found.length) console.error('  PLACEHOLDERS:', found.map(([id]) => id));
  ok(`no placeholder text in any video entry (${blobs.length} checked)`, found.length === 0);

  // Every article carries sources with versions and a review date — the way
  // "this was true when checked" is expressed instead of implied.
  ok('every video article cites sources',
    videoArticles.every(a => (a.sources?.length ?? 0) > 0));
  ok('every cited source carries a version and a review date',
    videoArticles.every(a => (a.sources ?? []).every(s => !!s.version && !!s.reviewedAt)));
  ok('every video tree cites sources',
    videoTrees.every(t => t.sources.length > 0 && t.sources.every(s => !!s.version)));

  // The centre's own index is non-empty, so the search box is not decorative.
  ok(`the software centre index is populated (${videoToolIndex().length})`,
    videoToolIndex().length >= allVideoToolPages.length * 2);
}

console.log(`\n✅ testVideo: ${passed} assertions passed\n`);
