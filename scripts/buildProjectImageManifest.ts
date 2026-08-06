#!/usr/bin/env tsx
/**
 * Generates the project image manifest, in the three shapes it gets read in.
 *
 * WHY THREE FILES AND NOT ONE
 * ---------------------------
 * They are read by three different things and each would be awkward as the
 * others. The Markdown is what the owner opens while uploading; the CSV is what
 * they open in a spreadsheet to tick off; the JSON is what a script reads. One
 * format would serve one reader and inconvenience the other two.
 *
 * ALL THREE ARE GENERATED FROM THE REGISTRY, NEVER TYPED
 * ------------------------------------------------------
 * Same rule as the store's manifest, for the same reason: a hand-written list
 * is a second catalogue, and the day it disagrees with the first is the day
 * somebody uploads a photograph into a folder no page reads.
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_PROJECTS } from '../src/data/projects/registry';
import {
  allProjectImageSlots, allProjectImageDirs, slotsForProject,
  PROJECT_IMAGE_SPEC, PROJECT_IMAGE_REPO_DIR, PROJECT_ROLE_BRIEF_AR,
  PROJECT_IMAGE_ROLES,
} from '../src/data/projects/imageSlots';
import { DIFFICULTY_LABEL_AR } from '../src/data/projects/types';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs/projects');
mkdirSync(OUT, { recursive: true });

const slots = allProjectImageSlots();
const dirs = allProjectImageDirs();

/* ── The folders themselves, so a file has somewhere to land ─────────────── */
let created = 0;
for (const dir of dirs) {
  const abs = join(ROOT, dir);
  mkdirSync(abs, { recursive: true });
  const keep = join(abs, '.gitkeep');
  if (!existsSync(keep)) {
    writeFileSync(keep, '');
    created += 1;
  }
}

/* ── JSON ────────────────────────────────────────────────────────────────── */
writeFileSync(join(OUT, 'PROJECT_IMAGE_MANIFEST.json'), `${JSON.stringify({
  spec: PROJECT_IMAGE_SPEC,
  repoDir: PROJECT_IMAGE_REPO_DIR,
  generatedFrom: 'src/data/projects/registry.ts',
  projects: ALL_PROJECTS.map(p => ({
    projectId: p.id,
    titleAr: p.titleAr,
    titleEn: p.titleEn,
    difficultyAr: DIFFICULTY_LABEL_AR[p.difficulty],
    published: p.published,
    images: slotsForProject(p).map(s => ({
      role: s.role,
      fileName: s.fileName,
      repoPath: s.repoPath,
      url: s.url,
      altAr: s.altAr,
      required: s.required,
      briefAr: s.briefAr,
    })),
  })),
}, null, 2)}\n`);

/* ── CSV ─────────────────────────────────────────────────────────────────── */
const csvCell = (v: string | boolean) => `"${String(v).replace(/"/g, '""')}"`;
const csv = [
  ['project_id', 'project_title_ar', 'role', 'file_name', 'repo_path', 'url', 'alt_ar', 'required']
    .map(csvCell).join(','),
  ...slots.map(s => [
    s.projectId, s.projectTitleAr, s.role, s.fileName, s.repoPath, s.url, s.altAr,
    s.required ? 'إلزامية' : 'اختيارية',
  ].map(csvCell).join(',')),
].join('\n');
writeFileSync(join(OUT, 'PROJECT_IMAGE_MANIFEST.csv'), `${csv}\n`);

/* ── Markdown ────────────────────────────────────────────────────────────── */
const requiredCount = slots.filter(s => s.required).length;
const md: string[] = [];
md.push('# صور المشاريع — قائمة الرفع');
md.push('');
md.push('> **مولَّد آلياً** من `src/data/projects/registry.ts` عبر');
md.push('> `npm run gen:project-images`. لا تحرّره بيدك — أي تعديل يُمحى عند');
md.push('> إعادة التوليد، وقيمته الوحيدة أنه لا يستطيع أن يخالف الكتالوج.');
md.push('');
md.push('## المواصفات');
md.push('');
md.push('| البند | القيمة |');
md.push('|---|---|');
md.push(`| الصيغة | \`.${PROJECT_IMAGE_SPEC.ext}\` |`);
md.push(`| النسبة | ${PROJECT_IMAGE_SPEC.aspect} |`);
md.push(`| المفضّل | ${PROJECT_IMAGE_SPEC.preferredPx}px عرضاً |`);
md.push(`| الحدّ الأدنى | ${PROJECT_IMAGE_SPEC.minPx}px عرضاً |`);
md.push(`| الحجم الأقصى | ${Math.round(PROJECT_IMAGE_SPEC.maxBytes / 1024)} كيلوبايت |`);
md.push('');
md.push('**ممنوع**: الصور المولّدة بالذكاء الاصطناعي، والصور المؤقتة، وأي صورة');
md.push('منسوخة بلا حقّ استخدام. المشروع بلا صورة يعرض حالة واضحة تقول ذلك —');
md.push('وهذا أفضل من صورة لا تخصّه.');
md.push('');
md.push('## الأدوار الأربعة');
md.push('');
md.push('| الدور | الملف | إلزامية؟ | ماذا تصوّر |');
md.push('|---|---|---|---|');
for (const role of PROJECT_IMAGE_ROLES) {
  const sample = slots.find(s => s.role === role)!;
  md.push(`| \`${role}\` | \`${sample.fileName}\` | ${sample.required ? '**نعم**' : 'لا'} | ${PROJECT_ROLE_BRIEF_AR[role]} |`);
}
md.push('');
md.push('## كيف ترفع');
md.push('');
md.push('1. صوّر أو اجمع الصورة بحقّ استخدام واضح.');
md.push(`2. حوّلها إلى \`.webp\` بنسبة ${PROJECT_IMAGE_SPEC.aspect}.`);
md.push(`3. تأكّد أن عرضها ≥ ${PROJECT_IMAGE_SPEC.minPx}px وحجمها ≤ ${Math.round(PROJECT_IMAGE_SPEC.maxBytes / 1024)}KB.`);
md.push('4. سمّها بالاسم المكتوب في الجدول أدناه بالضبط — الرقم والدور معاً.');
md.push('5. ارفعها إلى مجلد المشروع (المجلدات كلها جاهزة في المستودع).');
md.push('6. ادفع. لا يوجد ملف بيانات تعدّله — الصفحة تقرأ الملف من مكانه.');
md.push('7. شغّل `npm run test:project-images` للتأكّد.');
md.push('');
md.push('## المشاريع');
md.push('');
md.push(`${ALL_PROJECTS.length} مشروعاً · ${slots.length} صورة ممكنة · **${requiredCount} إلزامية**`);
md.push('');
for (const p of ALL_PROJECTS) {
  md.push(`### ${p.titleAr}`);
  md.push('');
  md.push(`\`${p.id}\` · ${DIFFICULTY_LABEL_AR[p.difficulty]} · ${p.published ? 'منشور' : 'مسودة'}`);
  md.push('');
  md.push('| الدور | المسار الكامل | النص البديل | إلزامية؟ |');
  md.push('|---|---|---|---|');
  for (const s of slotsForProject(p)) {
    md.push(`| \`${s.role}\` | \`${s.repoPath}\` | ${s.altAr} | ${s.required ? '**نعم**' : 'لا'} |`);
  }
  md.push('');
}
writeFileSync(join(OUT, 'PROJECT_IMAGE_MANIFEST.md'), `${md.join('\n')}\n`);

console.log(`projects              : ${ALL_PROJECTS.length}`);
console.log(`image slots           : ${slots.length}`);
console.log(`required (01-cover)   : ${requiredCount}`);
console.log(`folders               : ${dirs.length} (${created} newly created)`);
console.log(`written               : docs/projects/PROJECT_IMAGE_MANIFEST.{md,csv,json}`);
