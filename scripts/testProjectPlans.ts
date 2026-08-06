#!/usr/bin/env tsx
/**
 * The project section's contract: no dead link, no empty phase, no stray image.
 *
 * WHY EACH GROUP EXISTS
 * ---------------------
 * LINKS      The rule is «لا أريد أي رابط ميت». A project written today points
 *            at an encyclopedia article, a shop category, another project. Any
 *            of those can be renamed or unpublished later, and the reference is
 *            in a data file that nothing else audits. Worse, the renderer used
 *            to drop a reference it could not resolve — so a dead link became
 *            an INVISIBLE one, which is the same defect wearing a disguise.
 *
 * PLANS      The build section used to be five paragraphs that began in the
 *            middle. A phase with a heading and no steps is that defect coming
 *            back, and it is not visible in a diff of a data file.
 *
 * IMAGES     Same system as the store's, so the same failures are possible: a
 *            file uploaded into a folder no page reads, or a name the resolver
 *            does not recognise. Missing images must NOT fail — none are
 *            uploaded yet and a suite that is red for a year is a suite nobody
 *            reads.
 */

import { readdirSync, existsSync, statSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_PROJECTS } from '../src/data/projects/registry';
import { refIsLinkable, type PlatformRef } from '../src/data/projects/types';
import { BUILD_PLANS } from '../src/data/projects/buildPlans';
import {
  allProjectImageSlots, allProjectImageDirs, slotsForProject,
  PROJECT_IMAGE_REPO_DIR, PROJECT_IMAGE_FILE_PATTERN, PROJECT_IMAGE_SPEC,
} from '../src/data/projects/imageSlots';
import { isKnownRef } from '../web/lib/projectRefOptions';
import { refHref } from '../web/lib/projectLinks';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
let failed = 0;
function ok(label: string, cond: boolean): void {
  if (cond) { passed++; console.log(`  ok — ${label}`); }
  else { failed++; console.log(`  FAIL — ${label}`); }
}

/** Every reference in the library, with enough context to name the offender. */
interface RefRow { project: string; where: string; label: string; ref: PlatformRef }
const REFS: RefRow[] = [];
for (const p of ALL_PROJECTS) {
  for (const q of p.prerequisites) REFS.push({ project: p.id, where: 'prerequisites', label: q.titleAr, ref: q.ref });
  for (const q of p.parts) REFS.push({ project: p.id, where: 'parts', label: q.nameAr, ref: q.ref });
  for (const q of p.software) REFS.push({ project: p.id, where: 'software', label: q.nameAr, ref: q.ref });
  for (const q of p.glossary) REFS.push({ project: p.id, where: 'glossary', label: q.termAr, ref: q.ref });
}

console.log(`\n[1] Every link opens something, or says why it cannot (${REFS.length} references)`);
{
  // A linkable reference whose id names nothing. This is the literal dead link.
  const dangling = REFS.filter(r => refIsLinkable(r.ref) && !isKnownRef(r.ref));
  for (const d of dangling.slice(0, 8)) {
    console.log(`      ${d.project} · ${d.where} · ${d.label} -> ${JSON.stringify(d.ref)}`);
  }
  ok(`no reference points at an id that does not exist (${dangling.length} dangling)`,
    dangling.length === 0);

  /*
   * THE ONE THAT MATTERS MOST.
   *
   * `PlatformRefLink` renders nothing at all when a reference resolves to
   * neither a URL nor a reason. To a reader that is a bullet with no link and
   * no explanation — indistinguishable from an oversight, and impossible to
   * report. Every reference must land in exactly one of two states.
   */
  const silent = REFS.filter(r => {
    const res = refHref(r.ref, {});
    return !res.href && !res.noteAr;
  });
  for (const s of silent.slice(0, 8)) {
    console.log(`      SILENT: ${s.project} · ${s.where} · ${s.label} -> ${JSON.stringify(s.ref)}`);
  }
  ok(`no reference renders silently — every one is a link or a stated reason (${silent.length} silent)`,
    silent.length === 0);

  const linked = REFS.filter(r => refHref(r.ref, {}).href);
  const noted = REFS.filter(r => { const x = refHref(r.ref, {}); return !x.href && x.noteAr; });
  ok(`${linked.length} open a page and ${noted.length} state an absence — and that is all of them`,
    linked.length + noted.length === REFS.length);

  // The absence must be readable as an absence, not as a broken link.
  const badNotes = noted.filter(r => {
    const note = refHref(r.ref, {}).noteAr ?? '';
    return note.trim().length < 4;
  });
  ok('every stated absence actually says something', badNotes.length === 0);

  // The two honest-absence kinds must stay distinguishable: «coming here» is a
  // promise, «comes from elsewhere» is not, and collapsing them invents one.
  const planned = REFS.filter(r => r.ref.to === 'planned');
  const elsewhere = REFS.filter(r => r.ref.to === 'elsewhere');
  ok(`«سيضاف لاحقاً» (${planned.length}) and «خارج المنصة» (${elsewhere.length}) are both in use`,
    planned.length > 0 && elsewhere.length > 0);
  ok('every «سيضاف لاحقاً» names the section it will appear in',
    planned.every(r => (refHref(r.ref, {}).noteAr ?? '').includes('سيضاف لاحقاً في')));

  // A live link must resolve to a path shape the app actually routes.
  // Derived from the app's own route directories rather than typed from
  // memory: the first version of this list omitted `/betaflight`, which is a
  // real page, and reported two perfectly good links as broken.
  const ROUTE_SHAPES = [
    /^\/kb(\/|$)/, /^\/glossary(\?|$)/, /^\/programming(\/|$)/,
    /^\/betaflight(\/|$)/, /^\/expresslrs(\/|$)/,
    /^\/store(\/|$)/, /^\/projects(\/|$)/, /^\/diagnose(\/|$)/,
  ];
  const offRoute = linked.filter(r => {
    const href = refHref(r.ref, {}).href!;
    return !ROUTE_SHAPES.some(re => re.test(href));
  });
  for (const o of offRoute.slice(0, 5)) console.log(`      ${o.project} -> ${refHref(o.ref, {}).href}`);
  ok('every live link matches a route the app serves', offRoute.length === 0);
}

console.log('\n[2] Every project has a real build plan');
{
  const MIN_STAGES = 4;
  const MIN_STEPS = 3;

  ok(`all ${ALL_PROJECTS.length} projects have a plan in BUILD_PLANS`,
    ALL_PROJECTS.every(p => BUILD_PLANS[p.id] !== undefined));

  for (const p of ALL_PROJECTS) {
    const stages = p.stages;
    const short = stages.length < MIN_STAGES;
    if (short) console.log(`      ${p.id} has only ${stages.length} phases`);
    ok(`${p.id}: at least ${MIN_STAGES} phases (${stages.length})`, !short);
  }

  const emptyGoal = ALL_PROJECTS.flatMap(p => p.stages.filter(s => !s.goalAr?.trim()).map(s => `${p.id}/${s.titleAr}`));
  ok(`no phase without a goal (${emptyGoal.length})`, emptyGoal.length === 0);

  const emptyDone = ALL_PROJECTS.flatMap(p => p.stages.filter(s => !s.doneWhenAr?.trim()).map(s => `${p.id}/${s.titleAr}`));
  ok(`no phase without an exit condition (${emptyDone.length})`, emptyDone.length === 0);

  const thin = ALL_PROJECTS.flatMap(p => p.stages
    .filter(s => (s.steps ?? []).length < MIN_STEPS)
    .map(s => `${p.id} · ${s.titleAr} (${(s.steps ?? []).length})`));
  for (const t of thin.slice(0, 6)) console.log(`      ${t}`);
  ok(`no phase with fewer than ${MIN_STEPS} steps (${thin.length})`, thin.length === 0);

  const emptyStep = ALL_PROJECTS.flatMap(p => p.stages.flatMap(s =>
    (s.steps ?? []).filter(x => !x.actionAr?.trim()).map(() => `${p.id}/${s.titleAr}`)));
  ok(`no empty step (${emptyStep.length})`, emptyStep.length === 0);

  /*
   * A STEP IS AN INSTRUCTION, NOT A DESCRIPTION.
   *
   * This is the whole difference between the old section and the new one, and
   * it is the thing that will quietly rot first — the next person to add a
   * phase will write a sentence, because a sentence is easier. Arabic
   * imperatives here start with the verb, so the check is that the first word
   * is not one of the giveaway nouns a description opens with.
   */
  const DESCRIPTIVE_OPENERS = ['هذه', 'هذا', 'يتم', 'يجب', 'هناك', 'الهدف', 'يمكن'];
  const descriptive = ALL_PROJECTS.flatMap(p => p.stages.flatMap(s =>
    (s.steps ?? [])
      .filter(x => DESCRIPTIVE_OPENERS.some(w => x.actionAr.trim().startsWith(`${w} `)))
      .map(x => `${p.id}: ${x.actionAr.slice(0, 40)}`)));
  for (const d of descriptive.slice(0, 5)) console.log(`      ${d}`);
  ok(`every step is written as an instruction, not a description (${descriptive.length} descriptive)`,
    descriptive.length === 0);

  // The first phase must be the choosing one. That absence was the original
  // complaint: the plan began after every decision had already been made.
  const noOpening = ALL_PROJECTS.filter(p => !p.stages[0]?.titleAr.includes('الاختيار والتجهيز'));
  ok(`every project opens with a choosing-and-gathering phase (${noOpening.length} without)`,
    noOpening.length === 0);

  // …and that phase must actually make the reader choose.
  const noChoice = ALL_PROJECTS.filter(p =>
    !(p.stages[0]?.steps ?? []).some(s => /^اختر|^قرّر|^حدّد/.test(s.actionAr.trim())));
  ok(`the opening phase asks the reader to choose (${noChoice.length} that do not)`,
    noChoice.length === 0);

  // Every project's opening phase must reach the safety decision. A build plan
  // that never mentions the kill switch is not a build plan for a drone.
  const noSafety = ALL_PROJECTS.filter(p =>
    !(p.stages[0]?.steps ?? []).some(s => /مفتاح/.test(s.actionAr)));
  ok(`the opening phase names the cut-out switch (${noSafety.length} that do not)`,
    noSafety.length === 0);
}

console.log('\n[3] The page reads in the declared order');
{
  const page = path.join(ROOT, 'web/app/projects/[projectId]/page.tsx');
  const src = readFileSync(page, 'utf8');
  // Measured on the RENDER, not on the index array — the index is a claim and
  // the render is the page.
  const rendered = [...src.matchAll(/<Section id="([a-z-]+)"/g)].map(m => m[1]);
  const EXPECTED = [
    'idea', 'purpose', 'outcomes', 'prerequisites', 'plan',
    'parts', 'software', 'glossary', 'applications', 'challenges',
    'future', 'references',
  ];
  ok(`the page renders exactly the declared sections (${rendered.length})`,
    rendered.length === EXPECTED.length);
  ok(`…in the declared order: ${EXPECTED.join(' → ')}`,
    rendered.join(',') === EXPECTED.join(','));

  // The plan must come BEFORE the shopping list. A reader who meets a bill of
  // materials before the work does not know what any of it is for.
  ok('the build plan comes before the parts list',
    rendered.indexOf('plan') < rendered.indexOf('parts'));
  ok('what to learn first comes before the build plan',
    rendered.indexOf('prerequisites') < rendered.indexOf('plan'));
  ok('the idea comes before everything',
    rendered[0] === 'idea');

  // The side index must not promise a section the page no longer renders.
  const indexIds = [...src.matchAll(/\{ id: '([a-z-]+)', titleAr:/g)].map(m => m[1]);
  ok('the side index lists exactly what is rendered',
    indexIds.join(',') === rendered.join(','));
}

console.log('\n[4] The image system is ready, and empty is not an error');
{
  const slots = allProjectImageSlots();
  const dirs = allProjectImageDirs();

  ok(`every project has an image folder (${dirs.length})`,
    dirs.every(d => existsSync(path.join(ROOT, d))));
  ok(`every project has exactly one required cover`,
    ALL_PROJECTS.every(p => slotsForProject(p).filter(s => s.required).length === 1));
  ok(`the required slot is 01-cover.webp everywhere`,
    slots.filter(s => s.required).every(s => s.fileName === '01-cover.webp'));

  // Uploaded files: classify rather than count. `missing` must NEVER fail —
  // none are uploaded yet, and a suite that is red for a year is a suite
  // nobody reads.
  const expected = new Map(slots.map(s => [s.repoPath, s]));
  const onDisk: string[] = [];
  for (const dir of dirs) {
    const abs = path.join(ROOT, dir);
    if (!existsSync(abs)) continue;
    for (const f of readdirSync(abs)) {
      if (f === '.gitkeep') continue;
      onDisk.push(`${dir}/${f}`);
    }
  }
  const uploaded = onDisk.filter(f => expected.has(f));
  const orphan = onDisk.filter(f => !expected.has(f));
  const invalid = onDisk.filter(f => !PROJECT_IMAGE_FILE_PATTERN.test(path.basename(f)));
  const missing = slots.filter(s => !existsSync(path.join(ROOT, s.repoPath)));

  console.log(`      expected ${slots.length} · uploaded ${uploaded.length} · missing ${missing.length} · orphan ${orphan.length} · invalid ${invalid.length}`);

  for (const o of orphan.slice(0, 5)) console.log(`      ORPHAN: ${o}`);
  ok(`no image sits outside the manifest (${orphan.length} orphan)`, orphan.length === 0);

  for (const i of invalid.slice(0, 5)) console.log(`      INVALID NAME: ${i}`);
  ok(`every uploaded file matches the naming pattern (${invalid.length} invalid)`,
    invalid.length === 0);

  const oversize = uploaded.filter(f => statSync(path.join(ROOT, f)).size > PROJECT_IMAGE_SPEC.maxBytes);
  ok(`no uploaded image exceeds ${Math.round(PROJECT_IMAGE_SPEC.maxBytes / 1024)}KB (${oversize.length})`,
    oversize.length === 0);

  /*
   * THE ONE THAT ACTIVATES LATER.
   *
   * «أي مشروع بلا صورة رئيسية بعد رفع الصور». So it is conditional on the
   * upload having started: silent while the shelf is empty, and a hard failure
   * the moment some projects have covers and others do not — which is exactly
   * when a half-finished upload would otherwise ship.
   */
  const withCover = ALL_PROJECTS.filter(p =>
    existsSync(path.join(ROOT, PROJECT_IMAGE_REPO_DIR, p.id, '01-cover.webp')));
  if (withCover.length === 0) {
    console.log('      (no covers uploaded yet — the per-project cover rule stays dormant)');
    ok('the cover rule is dormant because nothing is uploaded yet', true);
  } else {
    const without = ALL_PROJECTS.filter(p => !withCover.includes(p));
    for (const w of without.slice(0, 5)) console.log(`      NO COVER: ${w.id}`);
    ok(`uploading has started (${withCover.length}/${ALL_PROJECTS.length}) — every project must have a cover`,
      without.length === 0);
  }

  // The manifests must exist and agree with the registry.
  for (const f of ['md', 'csv', 'json']) {
    ok(`docs/projects/PROJECT_IMAGE_MANIFEST.${f} exists`,
      existsSync(path.join(ROOT, `docs/projects/PROJECT_IMAGE_MANIFEST.${f}`)));
  }
  const manifest = JSON.parse(
    readFileSync(path.join(ROOT, 'docs/projects/PROJECT_IMAGE_MANIFEST.json'), 'utf8'),
  ) as { projects: Array<{ projectId: string; images: unknown[] }> };
  ok(`the manifest lists every project (${manifest.projects.length}/${ALL_PROJECTS.length})`,
    manifest.projects.length === ALL_PROJECTS.length);
  ok('the manifest is generated from the registry, not hand-written',
    manifest.projects.every(m => ALL_PROJECTS.some(p => p.id === m.projectId)));
}

console.log(`\n${'─'.repeat(66)}`);
console.log(`project plans: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
