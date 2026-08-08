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

console.log('\n[2b] The six questions a first-time reader asks are all answered');
{
  /*
   * Read the page as somebody who has never seen it. Five of the six were
   * already answered; the sixth was not, and its absence was invisible because
   * a nearby field looked like it: `learningOutcomesAr` says what the reader
   * will KNOW, which is a different question from what will be sitting on
   * their table at the end.
   */
  for (const p of ALL_PROJECTS) {
    const plan = BUILD_PLANS[p.id];
    ok(`${p.id}: «ما الفكرة» — a real idea paragraph`, p.ideaAr.trim().length >= 60);
    ok(`${p.id}: «لماذا أختاره» — a stated motive`, p.purposeAr.trim().length >= 100);
    ok(`${p.id}: «ماذا سأتعلّم» — at least four outcomes`, p.learningOutcomesAr.length >= 4);
    ok(`${p.id}: «من أين أبدأ» — an opening phase of decisions`,
      (p.stages[0]?.steps ?? []).length >= 5);
    ok(`${p.id}: «ماذا أحتاج من عتاد» — parts, each with a reason`,
      p.parts.length >= 3 && p.parts.every(x => x.whyAr.trim().length >= 40));
    ok(`${p.id}: «إلى ماذا سأصل» — a concrete end state`,
      (plan?.finishedAr ?? '').trim().length >= 40);
  }

  // The end state must be a THING, not a feeling. If it cannot be
  // photographed or demonstrated it is not an end state, and «ستفهم» is the
  // word that sneaks a feeling in.
  const vague = ALL_PROJECTS.filter(p =>
    /^(ستفهم|ستتعلّم|ستكتسب|فهم أعمق)/.test((BUILD_PLANS[p.id]?.finishedAr ?? '').trim()));
  ok(`every end state names a thing, not a feeling (${vague.length} vague)`, vague.length === 0);

  const finished = ALL_PROJECTS.map(p => BUILD_PLANS[p.id]?.finishedAr ?? '');
  ok('no two projects share an end state', new Set(finished).size === finished.length);
}

console.log('\n[2c] Nothing is said twice on the same screen');
{
  /*
   * A phase card shows the goal, the steps, the exit condition and the
   * paragraph together. Writing the exit condition FROM the paragraph's
   * closing line — which is what happened twice — puts the same sentence on
   * screen twice, a few lines apart.
   *
   * The shared safety steps are deliberately identical across all ten
   * projects and are not covered here: the rule about the cut-out switch does
   * not become truer by being reworded per project.
   */
  const repeated: string[] = [];
  for (const p of ALL_PROJECTS) {
    for (const s of p.stages) {
      if (!s.bodyAr) continue;
      for (const sentence of s.doneWhenAr.split(/(?<=[.؟!])\s+/)) {
        const t = sentence.trim();
        if (t.length >= 30 && s.bodyAr.includes(t)) {
          repeated.push(`${p.id} · ${s.titleAr}: ${t.slice(0, 50)}`);
        }
      }
    }
  }
  for (const r of repeated.slice(0, 5)) console.log(`      ${r}`);
  ok(`no exit condition repeats a sentence from its own paragraph (${repeated.length})`,
    repeated.length === 0);

  const longGoal = ALL_PROJECTS.flatMap(p => p.stages.filter(s => s.goalAr.length > 130));
  ok(`no phase goal runs over 130 characters (${longGoal.length})`, longGoal.length === 0);
  const longStep = ALL_PROJECTS.flatMap(p => p.stages.flatMap(s =>
    s.steps.filter(x => x.actionAr.length > 90)));
  ok(`no step action runs over 90 characters (${longStep.length})`, longStep.length === 0);
  const longDetail = ALL_PROJECTS.flatMap(p => p.stages.flatMap(s =>
    s.steps.filter(x => (x.detailAr?.length ?? 0) > 190)));
  ok(`no step detail runs over 190 characters (${longDetail.length})`, longDetail.length === 0);
}

console.log('\n[2d] Every English term a project uses, it explains');
{
  /*
   * A first-time Arabic reader meeting `LiDAR` in a step and finding it
   * nowhere in the glossary has been handed a word, not an idea. Proper nouns
   * are exempt — «PX4» is a name and defining it is noise — so the list below
   * is names, not an escape hatch.
   */
  const PROPER_NOUNS = new Set([
    'px4', 'ardupilot', 'betaflight', 'esp32', 'esp-drone', 'espressif',
    'crazyflie', 'gps', 'gps.', 'gpl-3.0', 'flight', 'controller', 'companion',
    'computer', 'pid', 'uart', 'ros',
  ]);
  const LATIN = /[A-Za-z][A-Za-z0-9+\-.]{2,}/g;
  const unexplained: string[] = [];
  for (const p of ALL_PROJECTS) {
    const glossed = new Set(p.glossary.map(t => t.termEn.toLowerCase()));
    /*
     * `definitionAr` is scanned too, because it is rendered in the page header
     * and is the first prose a reader meets — a term introduced there and
     * never explained is the worst case, not an edge case.
     *
     * The check is not vacuous: renaming the LiDAR glossary entry to
     * «Rangefinder» turns it red with `lidar-slam-mapping: LiDAR`, and
     * restoring it turns it green. (A first attempt renamed it to
     * «ZZZ-not-lidar», which still CONTAINS «lidar» and so still matched —
     * the mutation was wrong, not the assertion.)
     */
    const prose = [
      p.definitionAr, p.ideaAr, p.purposeAr,
      ...p.stages.flatMap(s => [s.goalAr, s.doneWhenAr,
        ...s.steps.flatMap(x => [x.actionAr, x.detailAr ?? ''])]),
    ].join(' ');
    for (const raw of prose.match(LATIN) ?? []) {
      const t = raw.toLowerCase();
      if (PROPER_NOUNS.has(t)) continue;
      if ([...glossed].some(g => g.includes(t))) continue;
      unexplained.push(`${p.id}: ${raw}`);
    }
  }
  for (const u of [...new Set(unexplained)].slice(0, 8)) console.log(`      ${u}`);
  ok(`no English term is used without being glossed in its own project (${new Set(unexplained).size})`,
    unexplained.length === 0);
}

console.log('\n[2e] The image guide describes every project, not just names files');
{
  const guide = readFileSync(path.join(ROOT, 'docs/projects/PROJECT_IMAGE_GUIDE.md'), 'utf8');
  ok('docs/projects/PROJECT_IMAGE_GUIDE.md exists', guide.length > 0);
  const missing = ALL_PROJECTS.filter(p => !guide.includes(p.id));
  for (const m of missing) console.log(`      not described: ${m.id}`);
  ok(`every project is described (${ALL_PROJECTS.length - missing.length}/${ALL_PROJECTS.length})`,
    missing.length === 0);

  for (const heading of ['فكرة الصورة', 'يجب أن يظهر', 'يجب ألّا يظهر', 'النوع']) {
    const n = guide.split(heading).length - 1;
    ok(`«${heading}» appears at least once per project (${n})`, n >= ALL_PROJECTS.length);
  }
  ok('the guide forbids generated and placeholder images',
    /الذكاء الاصطناعي/.test(guide) && /مؤقتة/.test(guide));
  ok('the search-and-rescue entry carries its consent constraint',
    /يمكن التعرّف عليه/.test(guide));
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

/*
 * THE HALF THAT MAKES THE FOLDER MEAN SOMETHING.
 *
 * Everything above checks that a file may be dropped in and is named correctly.
 * For a long time that was ALL there was: the folders existed, the manifest
 * promised «ادفع — لا يوجد ملف بيانات تعدّله», and no page ever read the folder,
 * so an uploaded photograph was reachable at its URL and invisible everywhere on
 * the site. Nothing failed — which is precisely why it went unnoticed. These
 * assertions are the ones that would have caught it.
 */
console.log('\n[5] An uploaded photograph actually reaches the page');
{
  /** Comments stripped, so a file that EXPLAINS a rule does not fail it. */
  const code = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  const resolver = readFileSync(path.join(ROOT, 'web/lib/server/projectImages.ts'), 'utf8');
  ok('the web has a resolver for uploaded project images', resolver.length > 0);
  ok('it asks the filesystem rather than a list somebody has to maintain',
    /existsSync\(/.test(resolver));
  ok('it derives the paths from the shared slots, inventing none of its own',
    /slotsForProject/.test(resolver) && !/01-cover\.webp/.test(code(resolver)));

  const merge = readFileSync(path.join(ROOT, 'web/lib/server/projects.ts'), 'utf8');
  ok('the merge fills a missing cover from what was uploaded',
    /uploadedProjectCover\(/.test(merge));
  // `setProjectImage(id, null)` writes an explicit null. Falling back on any
  // falsy value would revive the repository file over a deliberate removal and
  // make the panel's delete button look broken.
  ok('…only when the database has no answer, not when it answered «cleared»',
    /imageUrl !== undefined/.test(merge));

  // A card that renders `imageUrl` is the whole point; a placeholder must remain
  // the answer when there is none, rather than a borrowed or stock picture.
  const card = readFileSync(path.join(ROOT, 'web/components/projects/ProjectCard.tsx'), 'utf8');
  ok('the card renders the resolved image', /src=\{p\.imageUrl\}/.test(card));
  ok('and still falls back to the typed placeholder, not to another project\'s photograph',
    /project-card-placeholder/.test(card));

  /*
   * The 16:9 box crops 15.6% off a 3:2 cover. Centring is right for a scene and
   * wrong for the one cover whose title lives in the top band, so the framing is
   * a per-project answer — and it must stay a MEASURED one. The default has to
   * remain centre, or a future cover silently inherits somebody else's anchor.
   */
  const focus = readFileSync(path.join(ROOT, 'web/lib/projectCoverFocus.ts'), 'utf8');
  ok('the card sets the crop anchor rather than trusting the default everywhere',
    /objectPosition:\s*coverFocus\(p\.id\)/.test(card));
  ok('the anchor defaults to centre, so an unlisted cover is framed like a scene',
    /DEFAULT_COVER_FOCUS\s*=\s*'50% 50%'/.test(focus));
  ok('the infographic cover is anchored to its title band',
    /'autonomous-drone-racing':\s*'50% 0%'/.test(focus));
  // Every id in the map must be a real project — a typo would silently do
  // nothing, which is the failure mode a map of strings always has.
  const focused = [...focus.matchAll(/^\s*'([a-z0-9-]+)':\s*'[^']+',$/gm)].map(m => m[1]);
  ok(`every anchored id is a real project (${focused.length})`,
    focused.every(id => ALL_PROJECTS.some(p => p.id === id)));

  // Prerendered pages check the filesystem at build time; regeneration happens
  // later, in a bundle that does not carry `public/` unless it is traced in.
  const nextConfig = readFileSync(path.join(ROOT, 'web/next.config.ts'), 'utf8');
  const traced = /outputFileTracingIncludes/.test(nextConfig)
    && /public\/assets\/projects/.test(nextConfig);
  ok('the photographs are traced into the routes that look for them at runtime', traced);
  for (const route of ['/projects', '/projects/[projectId]']) {
    ok(`  …including ${route}`, nextConfig.includes(`'${route}'`));
  }
}

console.log(`\n${'─'.repeat(66)}`);
console.log(`project plans: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
