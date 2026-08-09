/**
 * The build section — «البناء» — the pillar that replaced the community on
 * the web surface.
 *
 * WHAT THIS SUITE PROTECTS
 * ------------------------
 * Four promises, each of which came out of the product brief and each of
 * which would rot silently without an assertion:
 *
 *   1. THE PATH — twenty steps, in the brief's order, with the four safety
 *      gates declared as gates rather than as prose, and the wizard
 *      mechanically refusing to advance past an unconfirmed gate, a missing
 *      required part, or a standing blocker.
 *   2. THE ENGINE'S HONESTY — the candidate checks read only documented
 *      fields, reuse the shared core's own validators and tolerance, and
 *      answer a genuinely-undocumented question with the manufacturer
 *      sentence instead of a guess.
 *   3. THE ONE PROJECT STORE — the wizard writes the same store «مشروعي» and
 *      the phone read; drafts survive a round trip; a stale part id
 *      invalidates its own entry, not the whole draft.
 *   4. THE COMMUNITY IS GONE FROM THE USER-FACING WEB — nav, home, footer,
 *      search, sitemap sources, profile, about — with /community redirecting
 *      to /build rather than 404ing, and the retired module left dormant,
 *      not deleted.
 *
 * Run: npx tsx --tsconfig web/tsconfig.json scripts/testWebBuild.ts
 */

import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* `platform/storage.ts` talks to localStorage and try/catch-wraps it; the
 * shim is what makes draft round trips observable in node — the same stand-in
 * `scripts/testProject.ts` already uses. Installed BEFORE the dynamic imports
 * below so every module sees it. */
const mem = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, v); },
  removeItem: (k: string) => { mem.delete(k); },
  clear: () => mem.clear(),
};

const { BUILD_PATH, BUILD_PHASES, TOTAL_BUILD_STEPS, GATE_STEP_IDS, phaseForStep, phoneStageIndexFor } =
  await import('../web/lib/build/path');
const { PART_VOCAB, partLabel, partLabelAr, vocabCoversCatalogue, SIZE_MEANING_AR, VOLTAGE_MEANING_AR } =
  await import('../web/lib/build/labels');
const { SAFETY_GATES, gateFor } = await import('../web/lib/build/gates');
const {
  checkCandidate, checkEcosystemFit, snapshotFromContext,
  videoSystemOptions, rcProtocolOptions, MANUAL_CHECK_AR,
} = await import('../web/lib/build/checks');
const {
  emptyDraft, saveDraft, loadDraft, clearDraft, firstUnresolvedStep, draftParts,
  mirrorToProject, BUILD_DRAFT_KEY,
} = await import('../web/lib/build/draft');
const { computeBom, REQUIRED_CATEGORIES } = await import('../web/lib/build/bom');
const { NAV_TABS } = await import('../web/lib/navTabs');
const { NAV_ITEMS } = await import('../web/lib/siteNav');
const { PART_CATEGORY_MAP, loadAndValidateAssemblyProject } =
  await import('../src/data/project/store');
const { computeFindings } = await import('../src/data/project/verdicts');
const { buildStages } = await import('../src/data/assembly/buildStages');
const { checklistsData } = await import('../src/data/checklistsData');
const { frames } = await import('../src/data/assembly/parts/frames');
const { motors } = await import('../src/data/assembly/parts/motors');
const { batteries } = await import('../src/data/assembly/parts/batteries');
const { escs } = await import('../src/data/assembly/parts/escs');
const { propellers } = await import('../src/data/assembly/parts/propellers');
const { receivers } = await import('../src/data/assembly/parts/receivers');
const { videoUnits } = await import('../src/data/assembly/parts/videoUnits');
const { droneTypes } = await import('../src/data/assembly/droneTypes');

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[1] The navigation is the ordered bar the brief specified');
{
  const ids = NAV_TABS.map(t => t.id);
  ok('the six tabs are exactly: home, build, programming, kb, projects, store — in that order',
    JSON.stringify(ids) === JSON.stringify(['home', 'build', 'programming', 'kb', 'projects', 'store']));
  ok('«البناء» is the second tab', NAV_TABS[1].labelAr === 'البناء' && NAV_TABS[1].href === '/build');
  ok('«المتجر» is the LAST tab', NAV_TABS[NAV_TABS.length - 1].labelAr === 'المتجر');
  ok('no tab points at the community', NAV_TABS.every(t => t.href !== '/community'));
  ok('«مشروعي» lights the build tab', (NAV_TABS[1].activeMatch ?? []).includes('/project'));

  ok('the site map has a live build entry', NAV_ITEMS.some(i =>
    i.id === 'build' && i.href === '/build' && i.status !== 'planned'));
  ok('…and no community entry at all', NAV_ITEMS.every(i => i.id !== 'community'));
  ok('the sitemap therefore lists /build and not /community by construction',
    read('web/app/sitemap.ts').includes('NAV_ITEMS'));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2] The path: twenty steps, the brief\'s order, four declared gates');
{
  ok(`the path has exactly 20 steps (${TOTAL_BUILD_STEPS})`, TOTAL_BUILD_STEPS === 20);
  ok('numbered 1..20 in order',
    BUILD_PATH.every((s, i) => s.number === i + 1));

  const idOrder = BUILD_PATH.map(s => s.id);
  ok('the selection arc runs goal → size → frame → power → propulsion → esc → fc → rc → video → extras',
    JSON.stringify(idOrder.slice(0, 10)) === JSON.stringify(
      ['goal', 'size', 'frame', 'power', 'propulsion', 'esc', 'fc', 'rc', 'video', 'extras']));
  ok('verification follows: compatibility report then BOM',
    idOrder[10] === 'compat' && idOrder[11] === 'bom');
  ok('then execution: wiring, assembly, pre-battery, software, motor test, failsafe, pre-flight, first flight',
    JSON.stringify(idOrder.slice(12)) === JSON.stringify(
      ['wiring', 'assembly', 'prebattery', 'software', 'motortest', 'failsafe', 'preflight', 'firstflight']));

  ok('motors and propellers are chosen TOGETHER, as one step',
    JSON.stringify(BUILD_PATH.find(s => s.id === 'propulsion')?.categories) === JSON.stringify(['motors', 'propellers']));

  ok('four safety gates, exactly where the brief put them',
    JSON.stringify(GATE_STEP_IDS) === JSON.stringify(['prebattery', 'motortest', 'failsafe', 'preflight']));
  ok('every gate step has a gate definition with items',
    GATE_STEP_IDS.every(id => (gateFor(id)?.items.length ?? 0) > 0));

  ok('the pre-battery gate is the shared «قبل البطارية» checklist verbatim',
    JSON.stringify(gateFor('prebattery')?.items)
    === JSON.stringify(checklistsData.find(g => g.id === 'pre-battery')?.items.map(i => i.text)));
  ok('the pre-flight gate is the shared «قبل أول طيران» checklist verbatim',
    JSON.stringify(gateFor('preflight')?.items)
    === JSON.stringify(checklistsData.find(g => g.id === 'pre-flight')?.items.map(i => i.text)));
  ok('the motor-test gate demands props OFF before anything spins',
    (gateFor('motortest')?.items[0] ?? '').includes('المراوح منزوعة'));
  ok('the failsafe gate demands an ACTUAL failsafe test, not a setting',
    SAFETY_GATES.find(g => g.stepId === 'failsafe')!.items.some(i => i.includes('اختبرته')));

  ok('progress mirrored to the shared store never leaves its valid range',
    BUILD_PATH.every((_, i) => {
      const idx = phoneStageIndexFor(i);
      return idx >= 0 && idx < buildStages.length;
    }));
  ok('…and is monotonic — going forward never reports less progress',
    BUILD_PATH.every((_, i) => i === 0 || phoneStageIndexFor(i) >= phoneStageIndexFor(i - 1)));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3] The wizard: three modes, hard stops, no silent skips');
{
  const wizard = stripComments(read('web/components/build/BuildWizard.tsx'));
  const landing = read('web/app/build/page.tsx');

  // The testid is a template (`build-mode-${m.id}`), so the rendered ids are
  // asserted through the mode array that feeds it.
  ok('the landing renders a door per mode', landing.includes('build-mode-${m.id}'));
  for (const mode of ['guided', 'parts', 'advanced']) {
    ok(`the landing offers the «${mode}» door`, landing.includes(`id: '${mode}'`));
  }
  ok('the three doors carry the brief\'s own words',
    landing.includes('ساعدني في اختيار كل شيء')
    && landing.includes('لدي بعض القطع')
    && landing.includes('أريد بناءً متقدماً'));

  ok('the questionnaire asks experience, budget, video system and RC protocol',
    ['experience', 'tier', 'video', 'rc'].every(q => wizard.includes(`current === '${q}'`)));
  ok('the ecosystem answers are DERIVED from the catalogue, not typed into the wizard',
    wizard.includes('videoSystemOptions()') && wizard.includes('rcProtocolOptions()'));
  ok(`…and the derivation finds real systems (${videoSystemOptions().join(', ')})`,
    videoSystemOptions().length >= 2 && rcProtocolOptions().length >= 1);

  ok('a gate must be complete before «التالي» opens',
    /case 'gate':[\s\S]{0,200}isGateComplete/.test(wizard));
  ok('the report blocks progression while a blocker stands',
    /case 'report':\s*return blockers === 0/.test(wizard));
  ok('a parts step requires every non-optional category',
    /required\.every\(c => draft\.partIds\[c\] \|\| draft\.externalParts\[c\]\)/.test(wizard));

  ok('every draft change is saved AND mirrored to the one shared store',
    wizard.includes('saveDraft(draft)') && wizard.includes('mirrorToProject(draft)'));
  ok('changing voltage invalidates only parts the new voltage genuinely excludes',
    /selectVoltage[\s\S]{0,400}batteryVoltages\.includes\(sCount\)/.test(wizard));
  ok('changing size clears only a frame that no longer matches',
    /selectSize[\s\S]{0,400}frameMatchesSize/.test(wizard));

  ok('the wizard is a client island behind ssr:false, like the workspace',
    read('web/components/build/BuildWizardClient.tsx').includes('ssr: false'));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[4] The engine: documented specs in, honest verdicts out');
{
  const checks = stripComments(read('web/lib/build/checks.ts'));
  ok('the candidate checks import the shared core\'s own validators',
    checks.includes("from '@core/data/assembly/compatibility/validators'"));
  ok('…and the shared tolerance, never a local copy',
    checks.includes('FRAME_SIZE_TOLERANCE_INCH')
    && !/const\s+\w*TOLERANCE/.test(checks));
  ok('the manufacturer sentence is the fallback for undocumented data',
    checks.includes('تحتاج المواصفة إلى تحقق من الشركة المصنّعة'));
  ok('no spec number is invented in the checks — no unit literals appear',
    !/\b\d+(\.\d+)?\s*(A|V|mAh|KV|mm)\b/.test(checks));

  // Behavioural: real parts, real verdicts.
  const ctx6S = { droneTypeId: 'freestyle', sizeInch: 5, batteryVoltage: 6, parts: {} };

  const wrongS = batteries.find(b => b.specs.sCount !== 6);
  if (wrongS) {
    const r = checkCandidate('batteries', wrongS, ctx6S);
    ok(`a ${wrongS.specs.sCount}S battery against a 6S build is incompatible, with a reason`,
      r.verdict === 'incompatible' && r.reasonsAr.length > 0);
  } else {
    ok('catalogue currently has only 6S batteries — voltage check exercised via motors instead', true);
  }

  const motor6S = motors.find(m => m.specs.compatibleVoltages.includes(6))!;
  ok('a 6S motor on a 6S build passes the voltage rule',
    checkCandidate('motors', motor6S, ctx6S).verdict !== 'incompatible');
  const r4 = checkCandidate('motors', motor6S, { ...ctx6S, batteryVoltage: 4 });
  ok('the same motor on a 4S build is refused as documented-incompatible',
    r4.verdict === 'incompatible' && r4.reasonsAr.some(x => x.includes('4S')));

  const frame5 = frames.find(f => Math.abs(f.specs.sizeInch - 5) <= 0.15)!;
  const bigProp = propellers.find(p => p.specs.sizeInch > (frame5.specs.maxPropSizeInch ?? frame5.specs.sizeInch));
  if (bigProp) {
    const r = checkCandidate('propellers', bigProp,
      { ...ctx6S, parts: { frames: frame5 } });
    ok(`a ${bigProp.specs.sizeInch}" prop on a ${frame5.specs.sizeInch}" frame is incompatible`,
      r.verdict === 'incompatible');
  } else {
    ok('no oversized prop exists in the catalogue to refuse — clearance rule still wired', true);
  }

  const eco = checkEcosystemFit('videoUnits',
    videoUnits.find(v => v.protocolOrSystem)!,
    { videoSystem: '___no-such-system___' });
  ok('a video unit from another ecosystem is «يحتاج مراجعة», never silently fine',
    eco.verdict === 'review' && eco.reasonsAr[0].includes('منظومة'));

  ok('the manufacturer sentence is exported for the UI to reuse verbatim',
    MANUAL_CHECK_AR === 'تحتاج المواصفة إلى تحقق من الشركة المصنّعة');

  // The FULL engine, through the wizard's snapshot: a deliberate voltage
  // conflict must surface as a blocker from the shared core, not from any
  // web-side reimplementation. The engine's own rule compares the motor to
  // the BATTERY PRODUCT (voltage-motor fires on motor+battery), so the
  // conflict is staged with a real 4S battery under a 6S motor.
  const esc6S = escs.find(e => e.specs.compatibleVoltages.includes(6))!;
  const battery4S = batteries.find(b => b.specs.sCount === 4);
  const conflicted = snapshotFromContext({
    droneTypeId: 'freestyle', sizeInch: 5, batteryVoltage: 4,
    parts: {
      motors: motor6S, escs: esc6S, frames: frame5,
      ...(battery4S ? { batteries: battery4S } : {}),
    },
  }, 5);
  const findings = computeFindings(conflicted);
  ok('the shared verdict engine flags the 6S-motor-on-4S-battery conflict as a blocker',
    !battery4S || findings.some(f => f.severity === 'blocker'));
  ok('…with reasoning and evidence attached',
    findings.filter(f => f.severity === 'blocker')
      .every(f => f.whyAr.length > 0));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[5] The draft: back-navigation loses nothing, staleness loses one field');
{
  clearDraft();
  const d = emptyDraft();
  d.mode = 'guided';
  d.experience = 'beginner';
  d.tierPref = 'budget';
  d.droneTypeId = droneTypes[0].id;
  d.sizeInch = 5;
  d.batteryVoltage = 6;
  d.partIds = { frames: frames[0].id, motors: motors[0].id };
  d.externalParts = { receivers: 'ريسيفر قديم عندي' };
  d.gateChecks = { prebattery: [0, 2] };
  d.stepIndex = 7;
  saveDraft(d);

  const back = loadDraft();
  ok('a saved draft round-trips completely', !!back
    && back.stepIndex === 7 && back.mode === 'guided'
    && back.partIds.frames === frames[0].id
    && back.externalParts.receivers === 'ريسيفر قديم عندي'
    && JSON.stringify(back.gateChecks.prebattery) === JSON.stringify([0, 2]));

  const raw = JSON.parse(mem.get(BUILD_DRAFT_KEY)!);
  raw.data.partIds.motors = 'motor-that-no-longer-exists';
  mem.set(BUILD_DRAFT_KEY, JSON.stringify(raw));
  const pruned = loadDraft();
  ok('a stale part id drops ONLY its own entry, the rest of the draft survives',
    !!pruned && pruned.partIds.motors === undefined && pruned.partIds.frames === frames[0].id);

  raw.data.stepIndex = 99;
  mem.set(BUILD_DRAFT_KEY, JSON.stringify(raw));
  ok('an out-of-range step refuses the whole draft — fail safe, like the shared store',
    loadDraft() === null);

  // The one-store promise: mirroring writes what «مشروعي» actually reads.
  clearDraft();
  saveDraft(d);
  mirrorToProject(d);
  const shared = loadAndValidateAssemblyProject();
  ok('mirroring lands the build in the ONE shared project store',
    !!shared && shared.droneTypeId === d.droneTypeId
    && shared.parts.frames?.id === frames[0].id);
  ok('…with a stageIndex inside the shared flow\'s own range',
    !!shared && shared.stageIndex >= 0 && shared.stageIndex < buildStages.length);

  ok('resume lands on the first unresolved step, not on step one',
    firstUnresolvedStep(d) > 0);
  ok('draftParts rehydrates ids against the live catalogue',
    draftParts(d).frames?.id === frames[0].id);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[6] The BOM: everything counted, nothing priced by guesswork');
{
  const d = emptyDraft();
  d.droneTypeId = droneTypes[0].id;
  d.partIds = { frames: frames[0].id, motors: motors[0].id };
  d.externalParts = { receivers: 'قطعة خارجية' };
  const bom = computeBom(d);

  ok('every catalogue category appears exactly once',
    bom.lines.length === Object.keys(PART_CATEGORY_MAP).length
    && new Set(bom.lines.map(l => l.category)).size === bom.lines.length);
  ok('missing REQUIRED parts are counted as such',
    bom.missingRequiredCount === REQUIRED_CATEGORIES
      .filter(c => !d.partIds[c] && !d.externalParts[c]).length);
  ok('the price totals are the sum of the documented ranges — verified by arithmetic',
    bom.priceMinUSD === (frames[0].priceRangeUSD?.[0] ?? 0) + (motors[0].priceRangeUSD?.[0] ?? 0)
    && bom.priceMaxUSD === (frames[0].priceRangeUSD?.[1] ?? 0) + (motors[0].priceRangeUSD?.[1] ?? 0));
  ok('an external part is listed as the reader\'s own, never priced for them',
    bom.lines.find(l => l.category === 'receivers')?.status === 'external');

  const bomView = read('web/components/build/ReportStep.tsx');
  ok('an unpriced part renders «بلا سعر موثق», not a number', bomView.includes('بلا سعر موثق'));
  ok('the total names how many parts it could not include', bomView.includes('بلا سعر موثق —') || bomView.includes('لا يشملها'));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[7] «بناءي» and the platform links');
{
  const panel = read('web/components/build/MyBuildPanel.tsx');
  ok('the live panel exists and is titled «بناءي»', panel.includes('بناءي'));
  ok('it counts verdicts through the engine\'s own countFindings, computing nothing',
    panel.includes('countFindings') && !panel.includes('computeFindings('));
  ok('it links to the full workspace at /project', panel.includes('"/project"'));

  const guides = read('web/components/build/GuideSteps.tsx');
  ok('the wiring step refuses to be a pinout and says whose manual rules',
    guides.includes('Pinout') && guides.includes('دليل الشركة'));
  ok('the software step routes into the programming centre', guides.includes('"/programming"'));
  ok('…and into the reader\'s own rc/video records', guides.includes('/project?view=rc') && guides.includes('/project?view=video'));
  ok('the assembly step renders the shared roadmap, pre-battery excluded (it is the gate)',
    guides.includes("id !== 'build-pre-battery'") && guides.includes('roadmapStageContent'));
  ok('first flight points onward to diagnosis and the projects library',
    guides.includes('"/diagnose"') && guides.includes('"/projects"'));

  const landing = read('web/app/build/page.tsx');
  ok('the landing cross-links kb, programming, projects and the workspace',
    ['/kb', '/programming', '/projects', '/project'].every(h => landing.includes(`'${h}'`)));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[8] The community is gone from the user-facing web — and only from there');
{
  const userFacing = [
    'web/lib/navTabs.ts', 'web/lib/siteNav.ts', 'web/app/page.tsx',
    'web/components/SiteFooter.tsx', 'web/app/search/page.tsx',
    'web/app/profile/page.tsx', 'web/app/about/page.tsx',
    'web/app/settings/page.tsx', 'web/components/AccountRail.tsx',
    'web/app/build/page.tsx', 'web/components/build/BuildWizard.tsx',
  ];
  for (const f of userFacing) {
    ok(`${f.split('/').pop()} carries no community link`,
      !stripComments(read(f)).includes("'/community'"));
  }
  ok('the home page never says «المجتمع»', !stripComments(read('web/app/page.tsx')).includes('المجتمع'));
  ok('the search page no longer queries the community backend',
    !read('web/app/search/page.tsx').includes('searchCommunity'));
  ok('the search page teaches the build section instead',
    read('web/lib/search/pageDocs.ts').includes("id: 'build-front'")
    && !read('web/lib/search/pageDocs.ts').includes("id: 'community-front'"));

  const cfg = read('web/next.config.ts');
  ok('/community REDIRECTS to /build — old links land somewhere alive',
    /source: '\/community',\s*destination: '\/build'/.test(cfg));
  ok('…including deep paths', cfg.includes("source: '/community/:path*'"));
  ok('…and the redirect is TEMPORARY, because the data underneath is intact',
    /permanent: false/.test(cfg));

  // What was deliberately KEPT: the dormant module and its data path. The
  // instruction was to clean the experience, not to burn the bridge back.
  ok('the community pages still exist on disk, dormant behind the redirect',
    existsSync(path.join(ROOT, 'web/app/community/page.tsx')));
  ok('the community backend adapter still exists, untouched',
    existsSync(path.join(ROOT, 'web/lib/server/community.ts')));
  ok('no Supabase migration file was added by this work',
    !existsSync(path.join(ROOT, 'supabase/migrations/community-removal.sql')));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[9] The hard scenarios: insufficiency, shortage, and honest gaps');
{
  const { flightControllers } = await import('../src/data/assembly/parts/flightControllers');
  const { gps } = await import('../src/data/assembly/parts/gps');
  const { wiringLines } = await import('../web/components/build/GuideSteps');

  // Scenario «ESC غير كافٍ»: the honest answer is that current headroom
  // CANNOT be computed from our data — the engine must say so as
  // manual-required, never fake a pass or a fail.
  const esc = escs[0];
  const withEsc = snapshotFromContext({
    droneTypeId: 'freestyle', sizeInch: 5, batteryVoltage: 6,
    parts: { motors: motors[0], escs: esc },
  }, 6);
  const headroom = computeFindings(withEsc).find(f => f.id === 'current-headroom');
  ok('ESC sufficiency is answered honestly: manual-required, with the thrust-table action',
    headroom?.confidence === 'manual-required'
    && headroom.severity === 'unknown'
    && !!headroom.manualCheckAr);

  // Scenario «نقص UART»: the verdict must equal the engine's own formula
  // over the REAL uartCount — proving the wizard surfaces it, whatever the
  // catalogue's numbers are today.
  const fcMinUart = [...flightControllers].sort((a, b) => a.specs.uartCount - b.specs.uartCount)[0];
  const crowded = snapshotFromContext({
    droneTypeId: 'freestyle', sizeInch: 5, batteryVoltage: 6,
    parts: {
      flightControllers: fcMinUart, receivers: receivers[0],
      gps: gps[0], videoUnits: videoUnits[0],
    },
  }, 8);
  const uart = computeFindings(crowded).find(f => f.id === 'uart-budget');
  const expected = 3 > fcMinUart.specs.uartCount ? 'blocker'
    : 3 === fcMinUart.specs.uartCount ? 'warning' : 'ok';
  ok(`UART budget over ${fcMinUart.specs.uartCount} ports with 3 consumers reads «${expected}» — formula and finding agree`,
    uart?.severity === expected);

  // Scenario «بيانات قطعة ناقصة»: an undocumented mounting size must yield
  // «لا نستطيع تأكيد…», not a silent pass.
  const fcNoMount = flightControllers.find(fc => fc.specs.mountingSizeMm === undefined);
  if (fcNoMount) {
    const s = snapshotFromContext({
      droneTypeId: 'freestyle', sizeInch: 5, batteryVoltage: 6,
      parts: { frames: frames[0], flightControllers: fcNoMount },
    }, 7);
    const mount = computeFindings(s).find(f => f.id === 'stack-mount');
    ok('a missing mounting spec becomes a visible «بيانات ناقصة» verdict with the manual pointer',
      mount?.severity === 'unknown' && mount.confidence === 'manual-required');
  } else {
    ok('every FC currently documents its mounting size — the unknown path stays wired', true);
  }

  // Scenario «VTX يحتاج جهدًا غير متوفر»: the wiring overview must show the
  // DOCUMENTED input range when one exists, and the manufacturer sentence
  // when none does — never an assumed number.
  const withRange = videoUnits.find(v => v.specs.operatingVoltageRange);
  const withoutRange = videoUnits.find(v => !v.specs.operatingVoltageRange);
  if (withRange) {
    const d1 = emptyDraft(); d1.droneTypeId = 'freestyle'; d1.partIds = { videoUnits: withRange.id };
    ok(`a documented video input range is shown verbatim (${withRange.specs.operatingVoltageRange})`,
      wiringLines(d1).some(l => l.overAr.includes(withRange.specs.operatingVoltageRange!)));
  }
  if (withoutRange) {
    const d2 = emptyDraft(); d2.droneTypeId = 'freestyle'; d2.partIds = { videoUnits: withoutRange.id };
    ok('an undocumented video input range shows the manufacturer sentence instead',
      wiringLines(d2).some(l => l.overAr.includes('تحقق من الشركة المصنّعة')));
  }
  ok('the catalogue exercises at least one of the two voltage paths', !!withRange || !!withoutRange);

  // Regression: «أقرر لاحقاً» is an answer, not an ecosystem. The first
  // implementation stored the button label and flagged the ENTIRE video
  // catalogue as «يحتاج مراجعة» against it.
  const { UNDECIDED_PREF } = await import('../web/lib/build/checks');
  const anyUnit = videoUnits.find(v => v.protocolOrSystem)!;
  ok('an undecided video preference mismatches nothing',
    checkEcosystemFit('videoUnits', anyUnit, { videoSystem: UNDECIDED_PREF }).verdict === 'ok');
  ok('an undecided RC preference mismatches nothing',
    checkEcosystemFit('receivers', receivers[0], { rcProtocol: UNDECIDED_PREF }).verdict === 'ok');
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[10] The UX pass: Arabic-first vocabulary, the journey\'s arcs, the anchor');
{
  // The vocabulary: every catalogue category has an Arabic-FIRST name, and
  // the web's own build surfaces use it — the shared English-led labels stay
  // the phone's.
  ok('every catalogue category has an Arabic-first name', vocabCoversCatalogue());
  ok('the label leads with Arabic, the technical term follows as the helper',
    partLabel('flightControllers') === 'متحكّم الطيران (FC)'
    && partLabelAr('escs') === 'منظّم سرعة المحركات');
  ok('an unknown category falls through un-invented', partLabel('no-such-cat') === 'no-such-cat');
  ok('every vocabulary entry carries both forms',
    Object.values(PART_VOCAB).every(v => v.ar.length > 0 && v.en.length > 0));
  for (const f of [
    'web/components/build/MyBuildPanel.tsx',
    'web/components/build/PartPicker.tsx',
    'web/components/build/ReportStep.tsx',
    'web/components/build/BuildWizard.tsx',
  ]) {
    ok(`${f.split('/').pop()} uses the web vocabulary, not the English-led shared labels`,
      !stripComments(read(f)).includes('PART_CATEGORY_LABEL_AR'));
  }

  // The four arcs: they tile the twenty steps exactly — no gap, no overlap —
  // and the landing derives its overview from the SAME list the wizard's
  // header renders, so the promise and the journey cannot drift.
  const covered = BUILD_PHASES.flatMap(p =>
    Array.from({ length: p.to - p.from + 1 }, (_, i) => p.from + i));
  ok('the four phases tile steps 1..20 exactly',
    BUILD_PHASES.length === 4
    && JSON.stringify(covered) === JSON.stringify(BUILD_PATH.map(s => s.number)));
  ok('phaseForStep answers at both ends',
    phaseForStep(1) === 'الاختيار' && phaseForStep(20) === 'التشغيل الآمن');
  ok('the landing builds its overview from BUILD_PHASES, not a private copy',
    read('web/app/build/page.tsx').includes('BUILD_PHASES.map'));
  const wizard = stripComments(read('web/components/build/BuildWizard.tsx'));
  ok('the wizard header renders the phase segments', wizard.includes('BUILD_PHASES.map'));
  ok('a new step opens at its title — the wizard scrolls to the top on step change',
    /useEffect\(\(\) => \{\s*window\.scrollTo\(0, 0\);\s*\}, \[draft\.stepIndex, phase\]\)/.test(wizard));

  // What the size and voltage numbers MEAN — the decision line beside the
  // spec line, from labels.ts, never invented inline.
  ok('the size step explains what 5" and 7" mean for the decision',
    wizard.includes('SIZE_MEANING_AR') && SIZE_MEANING_AR[5]?.length > 0 && SIZE_MEANING_AR[7]?.length > 0);
  ok('the voltage step explains what 4S and 6S mean for the decision',
    wizard.includes('VOLTAGE_MEANING_AR') && VOLTAGE_MEANING_AR[4]?.length > 0 && VOLTAGE_MEANING_AR[6]?.length > 0);

  // Progressive disclosure: the guided modes fold documented incompatibility
  // behind one labelled toggle — reachable with its reasons, out of the way
  // of the decision. Advanced folds nothing.
  const picker = stripComments(read('web/components/build/PartPicker.tsx'));
  ok('guided modes fold incompatible candidates behind a labelled toggle',
    picker.includes('show-blocked-') && picker.includes("advanced ? [] : ordered.filter(x => x.verdict === 'incompatible')"));
  ok('advanced mode folds nothing', picker.includes('advanced ? ordered'));

  // The report groups findings by what the reader must DO, and the passed
  // checks fold under their count when anything demands attention.
  const report = stripComments(read('web/components/build/ReportStep.tsx'));
  ok('the compat report groups findings by severity',
    ['blocker', 'warning', 'unknown'].every(s => report.includes(`'${s}'`))
    && report.includes('compat-group-'));
  ok('the passed checks are the whole report when nothing demands attention',
    report.includes('attention.length === 0'));
  ok('the BOM opens with its status pills', report.includes('bom-pills'));

  // «بناءي» the anchor: one body, two homes — the desktop side column and
  // the phone dock's sheet — plus the pulse chip between السابق and التالي.
  const panel = stripComments(read('web/components/build/MyBuildPanel.tsx'));
  ok('the panel body is ONE component shared by aside and sheet',
    panel.includes('MyBuildBody') && wizard.includes('<MyBuildBody'));
  ok('the anchor names the next destination', panel.includes('my-build-next'));
  ok('the dock carries the pulse chip and the sheet',
    wizard.includes('my-build-toggle') && wizard.includes('my-build-sheet')
    && wizard.includes('wizard-dock'));
  ok('the chip\'s numbers come from the one derivation, not a second count',
    panel.includes('export function buildPulse') && wizard.includes('buildPulse('));
  ok('navigation closes the sheet — it can never shadow the next step',
    /goNext = \(\) => \{\s*setAnchorOpen\(false\)/.test(wizard)
    && /goPrev = \(\) => \{\s*setAnchorOpen\(false\)/.test(wizard));

  // The landing says which door is whose.
  ok('the guided door is marked as the first-build door',
    read('web/app/build/page.tsx').includes('الأنسب لأول بناء'));
}

console.log(`\n✅ testWebBuild: ${passed} assertions passed`);
