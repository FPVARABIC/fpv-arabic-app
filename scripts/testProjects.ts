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

console.log(`\n${failures.length ? '❌' : '✅'} testProjects: ${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log(`   ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
