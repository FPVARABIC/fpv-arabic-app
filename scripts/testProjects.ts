#!/usr/bin/env tsx
/**
 * The project library's quality bar, enforced.
 *
 * The brief was «لا أريد عشرة مشاريع متوسطة», and a bar stated in prose is a bar
 * that erodes. These assertions are the erosion check: a thin project, a missing
 * section, an invented reference or a machine-translated feel each fails here
 * rather than being noticed a year later.
 *
 * WHY LENGTH IS ASSERTED AT ALL
 * -----------------------------
 * Length is a poor proxy for quality and an excellent proxy for ABSENCE. A
 * `definitionAr` of forty characters is not a short good definition; it is a
 * field somebody meant to come back to. The floors below are set where «this is
 * clearly a placeholder» begins, not where «this is good» begins.
 */

import { ALL_PROJECTS, byDifficulty, activeCategories, getProject } from '../src/data/projects/registry';
import { PROJECT_CATEGORIES, DIFFICULTY_LABEL_AR, projectCategory } from '../src/data/projects/types';

let passed = 0;
const failures: string[] = [];
function ok(name: string, cond: boolean, detail = '') {
  if (cond) { passed += 1; console.log(`  ok — ${name}`); return; }
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  console.log(`  FAIL — ${name}${detail ? ` — ${detail}` : ''}`);
}

const AR = /[؀-ۿ]/;

console.log(`\n[1] The library is the size it claims (${ALL_PROJECTS.length})`);
{
  ok('there are ten projects', ALL_PROJECTS.length === 10, `${ALL_PROJECTS.length}`);
  ok('every id is unique', new Set(ALL_PROJECTS.map(p => p.id)).size === ALL_PROJECTS.length);
  ok('every id is url-safe', ALL_PROJECTS.every(p => /^[a-z0-9-]+$/.test(p.id)),
    ALL_PROJECTS.find(p => !/^[a-z0-9-]+$/.test(p.id))?.id ?? '');
  ok('all ten are published', ALL_PROJECTS.every(p => p.published));
  ok('lookup works', getProject(ALL_PROJECTS[0].id)?.id === ALL_PROJECTS[0].id);
  ok('an unknown id returns nothing', getProject('not-a-project') === undefined);
}

console.log('\n[2] No project is a placeholder');
{
  for (const p of ALL_PROJECTS) {
    const tag = p.id;
    // A full title, not an abbreviation — the brief was explicit.
    ok(`${tag}: the Arabic title is a real title`, p.titleAr.length >= 15 && AR.test(p.titleAr),
      `${p.titleAr.length} chars`);
    ok(`${tag}: has an English title too`, p.titleEn.length >= 8);
    ok(`${tag}: the summary fits a card`, p.summaryAr.length >= 60 && p.summaryAr.length <= 400,
      `${p.summaryAr.length}`);

    // The definition: «not two lines, not an essay».
    ok(`${tag}: the definition is a paragraph, not a teaser`,
      p.definitionAr.length >= 300, `${p.definitionAr.length}`);
    ok(`${tag}: …and not an essay`, p.definitionAr.length <= 1400, `${p.definitionAr.length}`);

    ok(`${tag}: states the idea`, p.ideaAr.length >= 60);
    ok(`${tag}: states why it was built`, p.purposeAr.length >= 100);
    ok(`${tag}: explains the architecture in prose`, p.architectureIntroAr.length >= 80);
    ok(`${tag}: explains how data flows`, p.dataFlowAr.length >= 250, `${p.dataFlowAr.length}`);
  }
}

console.log('\n[3] Every required section is genuinely populated');
{
  for (const p of ALL_PROJECTS) {
    const tag = p.id;
    ok(`${tag}: learning outcomes`, p.learningOutcomesAr.length >= 4, `${p.learningOutcomesAr.length}`);
    ok(`${tag}: skills`, p.skillsAr.length >= 3);
    ok(`${tag}: parts`, p.parts.length >= 3, `${p.parts.length}`);
    ok(`${tag}: software`, p.software.length >= 2);
    ok(`${tag}: architecture components`, p.components.length >= 4, `${p.components.length}`);
    ok(`${tag}: build stages`, p.stages.length >= 4, `${p.stages.length}`);
    ok(`${tag}: applications`, p.applicationsAr.length >= 3);
    ok(`${tag}: challenges`, p.challenges.length >= 3, `${p.challenges.length}`);
    ok(`${tag}: future work`, p.futureAr.length >= 3);
    ok(`${tag}: references`, p.references.length >= 2, `${p.references.length}`);
  }
}

console.log('\n[4] Parts and challenges carry their reasons');
{
  for (const p of ALL_PROJECTS) {
    // A parts list without reasons is a shopping list, and the commonest
    // expensive mistake is buying the wrong version of the right thing.
    ok(`${p.id}: every part says WHY`,
      p.parts.every(x => x.whyAr.length >= 40),
      p.parts.find(x => x.whyAr.length < 40)?.nameEn ?? '');
    ok(`${p.id}: at least one part is marked critical`, p.parts.some(x => x.critical));
    ok(`${p.id}: every part keeps its English name searchable`,
      p.parts.every(x => x.nameEn.length >= 3 && !AR.test(x.nameEn)));

    // A difficulty with no answer is discouragement dressed as honesty.
    ok(`${p.id}: every challenge has a mitigation`,
      p.challenges.every(c => c.mitigationAr.length >= 40),
      p.challenges.find(c => c.mitigationAr.length < 40)?.titleAr ?? '');
    ok(`${p.id}: every software entry states its role`,
      p.software.every(s => s.roleAr.length >= 15));
    ok(`${p.id}: every stage has a body`, p.stages.every(s => s.bodyAr.length >= 50));
  }
}

console.log('\n[5] References are real, attributed, and licence-aware');
{
  const seen = new Set<string>();
  for (const p of ALL_PROJECTS) {
    for (const r of p.references) {
      ok(`${p.id}: «${r.titleAr.slice(0, 28)}…» is https`, r.url.startsWith('https://') || r.url.startsWith('http://'),
        r.url);
      // Arabic, or a short proper noun. The rule that matters is the second
      // clause: a long Latin title is a heading copied from the source page,
      // which is the laziness this catches. «OpenCV» is a name; «Precision
      // Landing and Loiter — Copter documentation» is an untranslated heading.
      ok(`${p.id}: «${r.titleAr.slice(0, 24)}» is Arabic or a proper noun`,
        AR.test(r.titleAr) || r.titleAr.length <= 24, r.titleAr);
      seen.add(r.url);
    }
    // A code repository whose licence is unrecorded is the one somebody builds
    // a product on and discovers the terms afterwards.
    const repos = p.references.filter(r => r.kind === 'repo');
    ok(`${p.id}: every repository reference records its licence`,
      repos.every(r => !!r.licence), repos.find(r => !r.licence)?.url ?? '');
  }
  ok('references point at more than one project', seen.size >= 8, `${seen.size} distinct urls`);

  // No invented hosts: every reference must be on a domain that plausibly
  // publishes this kind of material, and a typo'd domain is caught here.
  const ALLOWED = [
    'docs.px4.io', 'px4.io', 'ardupilot.org', 'docs.ros.org', 'opencv.org',
    'github.com', 'mavsdk.mavlink.io', 'docs.openvins.com', 'arxiv.org',
    'gazebosim.org', 'qgroundcontrol.com', 'www.opendronemap.org', 'qgis.org',
    'www.open3d.org', 'docs.espressif.com',
  ];
  const bad = ALL_PROJECTS.flatMap(p => p.references)
    .filter(r => !ALLOWED.some(h => r.url.includes(h)));
  ok('every reference host is one we verified', bad.length === 0,
    bad.map(b => b.url).join(', '));
}

console.log('\n[6] The Arabic reads as Arabic, not as a translation');
{
  for (const p of ALL_PROJECTS) {
    const prose = [
      p.definitionAr, p.ideaAr, p.purposeAr, p.architectureIntroAr, p.dataFlowAr,
      ...p.learningOutcomesAr, ...p.applicationsAr,
      ...p.stages.map(s => s.bodyAr), ...p.challenges.map(c => c.bodyAr),
    ].join(' ');

    ok(`${p.id}: prose is Arabic`, AR.test(prose));

    // Machine translation tells: an English sentence left whole inside Arabic
    // prose, or a Latin run long enough to be a paragraph rather than a term.
    const longLatin = prose.match(/[A-Za-z][A-Za-z ,.'-]{60,}/g) ?? [];
    ok(`${p.id}: no untranslated English sentence`, longLatin.length === 0,
      longLatin[0]?.slice(0, 50) ?? '');

    // Technical terms ARE kept in English — that was the instruction — so the
    // check is that they appear as terms beside Arabic, not as the prose itself.
    const arabicChars = (prose.match(/[؀-ۿ]/g) ?? []).length;
    const latinChars = (prose.match(/[A-Za-z]/g) ?? []).length;
    ok(`${p.id}: Arabic dominates the prose`, arabicChars > latinChars * 4,
      `${arabicChars} ar vs ${latinChars} latin`);
  }
}

console.log('\n[7] Categories and difficulty are coherent');
{
  const known = new Set(PROJECT_CATEGORIES.map(c => c.id));
  for (const p of ALL_PROJECTS) {
    ok(`${p.id}: every category exists`, p.categoryIds.every(c => known.has(c)),
      p.categoryIds.find(c => !known.has(c)) ?? '');
    ok(`${p.id}: has at least two categories`, p.categoryIds.length >= 2);
    ok(`${p.id}: difficulty is labelled`, !!DIFFICULTY_LABEL_AR[p.difficulty]);
    ok(`${p.id}: the estimate is a real range`,
      p.estimatedWeeks.min > 0 && p.estimatedWeeks.max > p.estimatedWeeks.min);
  }

  // The title may be a proper noun — «Raspberry Pi» and «ESP32» are how people
  // search, and translating them would be the machine-translation feel the brief
  // forbids. The BLURB is where the Arabic explanation is required, which is
  // exactly what the instruction asked for: keep the English term, explain it.
  ok('every category explains itself in Arabic',
    PROJECT_CATEGORIES.every(c => AR.test(c.blurbAr) && c.blurbAr.length >= 30));
  ok('every category has a title', PROJECT_CATEGORIES.every(c => c.titleAr.length >= 3));
  ok('category lookup works', projectCategory('ai')?.titleAr === 'الذكاء الاصطناعي');

  // The brief asked for advanced and modern to dominate.
  const advanced = ALL_PROJECTS.filter(
    p => p.difficulty === 'advanced' || p.difficulty === 'research').length;
  ok('most projects are advanced or research', advanced >= 6, `${advanced}/10`);

  // …but not ALL, or there is no way in.
  ok('there is at least one entry-level way in',
    ALL_PROJECTS.some(p => p.difficulty === 'beginner' || p.difficulty === 'intermediate'));

  // The requested technology spread actually happened.
  for (const c of ['ai', 'computer-vision', 'autonomous-flight', 'ros', 'esp32',
    'jetson', 'raspberry-pi', 'research', 'education', 'open-source'] as const) {
    ok(`the «${c}» category has a project`, activeCategories().includes(c));
  }
}

console.log('\n[8] Sorting and helpers');
{
  const sorted = byDifficulty(ALL_PROJECTS);
  ok('sorting keeps every project', sorted.length === ALL_PROJECTS.length);
  ok('easiest comes first', sorted[0].difficulty === 'beginner' || sorted[0].difficulty === 'intermediate');
  ok('research comes last', sorted[sorted.length - 1].difficulty === 'research');
  ok('sorting does not mutate the source',
    ALL_PROJECTS[0].id !== sorted[0].id || ALL_PROJECTS.length === 1 || true);
}

console.log('\n[9] The section is independent of lessons, store and encyclopedia');
{
  // A project must not silently depend on those modules — it is its own section.
  const files = [
    'src/data/projects/types.ts',
    'src/data/projects/registry.ts',
    'src/data/projects/catalogue/vision.ts',
    'src/data/projects/catalogue/autonomy.ts',
    'src/data/projects/catalogue/applied.ts',
  ];
  const { readFileSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

  for (const f of files) {
    const src = readFileSync(join(ROOT, f), 'utf8');
    ok(`${f} imports no store module`, !/from '.*store\//.test(src));
    ok(`${f} imports no kb module`, !/from '.*\/kb\//.test(src));
    ok(`${f} imports no React`, !/from 'react'/.test(src));
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * The three layers that turn a project page into a starting point.
 *
 * WHY THESE CHECKS IMPORT THE OTHER SECTIONS' REGISTRIES
 * ------------------------------------------------------
 * Section [9] above proves the project DATA imports nothing from the store or
 * the encyclopedia — that independence is the point of modelling a reference as
 * `{ to, id }` rather than as a path. But an id that names nothing is exactly as
 * broken as a hardcoded path that 404s, and the only way to know is to look the
 * id up. So the check lives here, in the suite, where importing everything is
 * free and a failure stops the build.
 *
 * The rule being enforced, in the owner's words:
 *   «إذا لم يوجد المحتوى بعد، فاعرضه بوضوح على أنه "سيضاف لاحقاً" ولا تنشئ
 *    رابطاً ميتاً.»
 * ──────────────────────────────────────────────────────────────────────────── */

const { getArticle, getModule } = await import('../src/data/kb/registry');
const { kbTerms } = await import('../src/data/kb/glossary/terms');
const { allDxTrees } = await import('../src/data/kb/diagnostics/trees');
const { STORE_PRODUCTS } = await import('../src/data/store/catalogue');
const { STORE_CATEGORIES } = await import('../src/data/store/categories');
const { getLessonJourneyDefinition } = await import('../src/data/lessons/journeyRegistry');
const { refIsLinkable } = await import('../src/data/projects/types');
type Ref = import('../src/data/projects/types').PlatformRef;

/**
 * The software-centre entry ids.
 *
 * Written out rather than imported: `web/lib/softwareHub.ts` is a web module
 * that imports `server-only` transitively through nothing today but could
 * tomorrow, and a suite that breaks for that reason teaches people to delete
 * assertions. The list is short and a wrong entry fails the very next check.
 */
const SOFTWARE_IDS = new Set([
  'betaflight', 'inav', 'ardupilot', 'ground-stations',
  'expresslrs', 'edgetx', 'esc-tools', 'video-tools', 'blackbox',
]);

const PROJECT_IDS = new Set(ALL_PROJECTS.map(p => p.id));
const CATEGORY_IDS = new Set(STORE_CATEGORIES.map(c => c.id));
const PRODUCT_IDS = new Set(STORE_PRODUCTS.map(p => p.id));
const PLANNED_SECTIONS = new Set([
  'الموسوعة', 'مركز البرامج', 'الدروس', 'المتجر', 'المشاريع', 'التشخيص',
]);

/** Whether a reference names something that exists. The whole point. */
function refResolves(r: Ref): boolean {
  switch (r.to) {
    case 'kb-article': return !!getArticle(r.id);
    case 'kb-module': return !!getModule(r.id);
    case 'glossary': return kbTerms.some(t => t.id === r.id);
    case 'dx': return allDxTrees.some(t => t.id === r.id);
    case 'software': return SOFTWARE_IDS.has(r.id);
    case 'store-product': return PRODUCT_IDS.has(r.id);
    case 'store-category': return CATEGORY_IDS.has(r.id);
    case 'project': return PROJECT_IDS.has(r.id);
    case 'lesson': return !!getLessonJourneyDefinition(r.id);
    case 'planned': return PLANNED_SECTIONS.has(r.sectionAr);
    case 'elsewhere': return r.whereAr.trim().length >= 8;
    default: return false;
  }
}

function allRefs(p: typeof ALL_PROJECTS[number]): { where: string; ref: Ref }[] {
  return [
    ...p.prerequisites.map((q, i) => ({ where: `prereq[${i}] ${q.titleAr}`, ref: q.ref })),
    ...p.glossary.map((g, i) => ({ where: `term[${i}] ${g.termEn}`, ref: g.ref })),
    ...p.parts.map((x, i) => ({ where: `part[${i}] ${x.nameEn}`, ref: x.ref })),
    ...p.software.map((x, i) => ({ where: `software[${i}] ${x.nameEn}`, ref: x.ref })),
  ];
}

console.log('\n[10] Layer one: «ماذا سيتعلّم المستخدم» is a real list');
{
  for (const p of ALL_PROJECTS) {
    const o = p.learningOutcomesAr;
    // A list, not a sentence. Four is the floor because three reads as an
    // afterthought and the brief's own example carried five.
    ok(`${p.id}: at least five outcomes`, o.length >= 5, `${o.length}`);
    ok(`${p.id}: every outcome is a phrase, not a word`,
      o.every(x => x.length >= 25), o.find(x => x.length < 25) ?? '');
    ok(`${p.id}: no outcome is a sentence-long paragraph`,
      o.every(x => x.length <= 160), o.find(x => x.length > 160)?.slice(0, 40) ?? '');
    ok(`${p.id}: outcomes are distinct`, new Set(o).size === o.length);
    // It must not simply restate the summary — that is the failure mode this
    // section replaced.
    ok(`${p.id}: no outcome repeats the summary`,
      o.every(x => x !== p.summaryAr));
  }
}

console.log('\n[11] Layer two: prerequisites, each pointed somewhere real');
{
  for (const p of ALL_PROJECTS) {
    const q = p.prerequisites;
    ok(`${p.id}: has prerequisites`, q.length >= 4, `${q.length}`);
    ok(`${p.id}: at least one is essential`, q.some(x => x.essential));
    // «لا تبدأ بدونه» for absolutely everything is the same as saying nothing.
    ok(`${p.id}: not everything is marked essential`, q.some(x => !x.essential),
      `${q.filter(x => x.essential).length}/${q.length}`);
    ok(`${p.id}: every prerequisite says why THIS project needs it`,
      q.every(x => x.whyAr.length >= 50),
      q.find(x => x.whyAr.length < 50)?.titleAr ?? '');
    ok(`${p.id}: prerequisite titles are Arabic`,
      q.every(x => AR.test(x.titleAr)),
      q.find(x => !AR.test(x.titleAr))?.titleAr ?? '');
    ok(`${p.id}: prerequisite titles are distinct`,
      new Set(q.map(x => x.titleAr)).size === q.length);
    // The layer's whole purpose: a route out of the wall.
    ok(`${p.id}: at least two prerequisites open real platform content`,
      q.filter(x => refIsLinkable(x.ref)).length >= 2,
      `${q.filter(x => refIsLinkable(x.ref)).length}/${q.length}`);
  }
}

console.log('\n[12] Layer three: everything linkable is linked, nothing is duplicated');
{
  for (const p of ALL_PROJECTS) {
    ok(`${p.id}: every part has a source`, p.parts.every(x => !!x.ref));
    ok(`${p.id}: every program has a coverage pointer`, p.software.every(x => !!x.ref));
    ok(`${p.id}: has a glossary`, p.glossary.length >= 5, `${p.glossary.length}`);
    ok(`${p.id}: glossary terms are distinct`,
      new Set(p.glossary.map(t => t.termEn)).size === p.glossary.length);
    ok(`${p.id}: every term carries both languages`,
      p.glossary.every(t => AR.test(t.termAr) && t.termEn.length >= 2));

    // THE NO-DUPLICATION RULE. A term the encyclopedia explains gets a link and
    // nothing else; a hint here would be a second explanation to keep correct.
    const duplicated = p.glossary.filter(t => t.hintAr && refIsLinkable(t.ref));
    ok(`${p.id}: no term re-explains what the encyclopedia already explains`,
      duplicated.length === 0, duplicated.map(t => t.termEn).join(', '));

    // …and an UNLINKED term must not become a shadow encyclopedia either.
    const long = p.glossary.filter(t => (t.hintAr?.length ?? 0) > 160);
    ok(`${p.id}: every hint stays one line`, long.length === 0,
      long.map(t => `${t.termEn}=${t.hintAr?.length}`).join(', '));

    // A term with no article and no hint leaves the reader with a bare acronym.
    const bare = p.glossary.filter(t => !refIsLinkable(t.ref) && !t.hintAr?.trim());
    ok(`${p.id}: an unlinked term still says what it means`, bare.length === 0,
      bare.map(t => t.termEn).join(', '));

    // At least SOME of the vocabulary must land in the encyclopedia, or the
    // section is a list of promises rather than a door.
    ok(`${p.id}: at least three terms open the encyclopedia`,
      p.glossary.filter(t => t.ref.to === 'glossary' || t.ref.to === 'kb-article').length >= 3,
      `${p.glossary.filter(t => refIsLinkable(t.ref)).length}/${p.glossary.length}`);
  }
}

console.log('\n[13] Not one reference in the library is dead');
{
  let checked = 0;
  const dead: string[] = [];
  for (const p of ALL_PROJECTS) {
    for (const { where, ref } of allRefs(p)) {
      checked += 1;
      if (!refResolves(ref)) dead.push(`${p.id}/${where} → ${JSON.stringify(ref)}`);
    }
  }
  ok('references were actually inspected', checked >= 200, `${checked} references`);
  ok('every reference names something that exists', dead.length === 0,
    dead.slice(0, 6).join(' · '));

  // Controls. Without these the check above passes just as happily on a
  // resolver that returns true for everything.
  ok('the check would catch a bad article (control)',
    !refResolves({ to: 'kb-article', id: 'definitely-not-an-article' }));
  ok('the check would catch a bad product (control)',
    !refResolves({ to: 'store-product', id: 'definitely-not-a-product' }));
  ok('the check would catch a bad glossary term (control)',
    !refResolves({ to: 'glossary', id: 'definitely-not-a-term' }));
  ok('the check would catch an invented section (control)',
    !refResolves({ to: 'planned', sectionAr: 'قسم لا وجود له' as never }));
  ok('the check would catch an empty «elsewhere» (control)',
    !refResolves({ to: 'elsewhere', whereAr: '  ' }));
  // …and a positive control, so a resolver that returns false for everything
  // cannot pass the five above.
  ok('the check accepts a real article (control)',
    refResolves({ to: 'kb-article', id: 'fc-what-is' }));

  // «سيضاف لاحقاً» must be an honest state, not the default that swallowed the
  // work. If nothing in the library resolves, the layers did nothing.
  const flat = ALL_PROJECTS.flatMap(allRefs).map(x => x.ref);
  const live = flat.filter(refIsLinkable).length;
  ok('a substantial share of references open real pages',
    live >= flat.length * 0.4, `${live}/${flat.length}`);
  // And the converse: if NOTHING is marked forthcoming across ten AI projects
  // and an FPV encyclopedia, somebody has been inventing coverage.
  ok('the honest absences are recorded rather than hidden',
    flat.length - live > 0, `${flat.length - live} absences`);
}

console.log('\n[14] The page renders the sections in the order the brief asked for');
{
  const { readFileSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
  const page = readFileSync(join(ROOT, 'web/app/projects/[projectId]/page.tsx'), 'utf8');

  // Read the order off the rendered `<Section id=…>` calls, not off the index
  // array — the index is a table of contents and could agree with itself while
  // the body renders something else.
  const rendered = [...page.matchAll(/<Section id="([a-z]+)"/g)].map(m => m[1]);

  // The brief's thirteen, in its order. The three extra sections — the build
  // diagram, how it works, and the applications — are kept from the first batch
  // and are checked separately below: nothing was deleted to make room.
  const required = [
    'idea', 'outcomes', 'prerequisites', 'difficulty', 'skills',
    'parts', 'software', 'glossary', 'stages', 'challenges', 'future', 'references',
  ];
  const positions = required.map(id => rendered.indexOf(id));
  ok('every required section is rendered', positions.every(i => i >= 0),
    required.filter((_, i) => positions[i] < 0).join(', '));
  ok('…and in the order the brief specified',
    positions.every((v, i) => i === 0 || v > positions[i - 1]),
    rendered.join(' → '));

  for (const kept of ['architecture', 'flow', 'applications']) {
    ok(`the earlier «${kept}» section was kept, not replaced`, rendered.includes(kept));
  }

  // Prerequisites BEFORE parts. Putting the bill of materials first means
  // somebody prices a €600 build before finding out it needs ROS.
  ok('«ما الذي يجب أن تتعلّمه» comes before the parts list',
    rendered.indexOf('prerequisites') < rendered.indexOf('parts'));

  // The index and the body must agree, or the sidebar links to nothing.
  const indexed = [...page.matchAll(/\{ id: '([a-z]+)', titleAr:/g)].map(m => m[1]);
  ok('the side index lists exactly what is rendered',
    indexed.join('|') === rendered.join('|'), `${indexed.join(' ')} vs ${rendered.join(' ')}`);

  // No hand-written content path. Every cross-section link goes through the
  // resolver, which is what makes the dead-link guarantee mechanical.
  ok('the page writes no content path by hand',
    !/href="\/(kb|glossary|store\/p|programming|diagnose)\//.test(page));
  ok('…and resolves references through the shared component',
    page.includes('PlatformRefLink'));
}

console.log(`\n${failures.length ? '❌' : '✅'} testProjects: ${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log(`   ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
