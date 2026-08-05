#!/usr/bin/env tsx
/**
 * Write the list of photographs the owner has to supply — and the empty folders
 * to drop them into.
 *
 * WHY IT IS GENERATED
 * -------------------
 * Because it has to agree with the code that later looks for those files, and
 * the only way two things agree permanently is to have one source. Both this
 * document and the resolver read `imageSlots.ts`; a rename there rewrites the
 * manifest and moves the lookup in the same commit. A hand-written list would
 * be correct on the day it was written and wrong by the next product.
 *
 * THREE FORMATS, ONE CONTENT
 * --------------------------
 * Markdown to read and work from, JSON for tooling, CSV to open in a spreadsheet
 * and tick off while photographing. All three are produced from the same array
 * in one pass, so they cannot disagree.
 *
 * IT ALSO CREATES THE FOLDERS
 * ---------------------------
 * Every product and variant directory, each with a `.gitkeep`, so the tree is
 * visible on GitHub BEFORE any photograph exists. The owner navigates to a
 * folder that is already there and drops a file in — rather than creating a
 * path by hand and getting one character wrong, which produces a file nothing
 * will ever look for.
 *
 * WHAT IT NEVER DOES
 * ------------------
 * Touch an image. It creates directories and writes three text files. No
 * cropping, no compression, no conversion — there is nothing to convert yet,
 * and a build step that silently re-encodes somebody's photographs is a build
 * step that loses the original.
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STORE_PRODUCTS } from '../src/data/store/catalogue';
import { STORE_CATEGORIES, storeCategory } from '../src/data/store/categories';
import { SERVICES_CATEGORY_ID } from '../src/data/store/services';
import {
  allImageSlots, allImageDirs, slotsForProduct, rolesFor, imageScopeFor,
  STORE_IMAGE_URL_PREFIX, STORE_IMAGE_REPO_DIR, DEFAULT_IMAGE_SPEC,
  IMAGE_ROLE_BRIEF_AR, ROLE_INDEX,
  type ImageSlot,
} from '../src/data/store/imageSlots';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'docs', 'store');
const ASSETS = join(ROOT, STORE_IMAGE_REPO_DIR);

const slots = allImageSlots(STORE_PRODUCTS);
const goods = STORE_PRODUCTS.filter(p => p.categoryId !== SERVICES_CATEGORY_ID);
const services = STORE_PRODUCTS.filter(p => p.categoryId === SERVICES_CATEGORY_ID);

/* ── 1. The folders ───────────────────────────────────────────────────────── */

mkdirSync(ASSETS, { recursive: true });
let created = 0;
for (const dir of allImageDirs(STORE_PRODUCTS)) {
  const abs = join(ASSETS, dir);
  mkdirSync(abs, { recursive: true });
  const keep = join(abs, '.gitkeep');
  if (!existsSync(keep)) {
    // Git does not track empty directories. The file's content says why it is
    // there, so nobody deletes it wondering what it was for.
    writeFileSync(keep, '');
    created += 1;
  }
}

/* ── 2. The three manifests ───────────────────────────────────────────────── */

interface Row {
  productId: string;
  productAr: string;
  productEn: string;
  brandAr: string;
  categoryId: string;
  categoryAr: string;
  published: string;
  scope: string;
  variantId: string;
  variantAr: string;
  role: string;
  fileName: string;
  repoPath: string;
  url: string;
  requirement: 'إلزامية' | 'اختيارية';
  purposeAr: string;
  altAr: string;
  aspect: string;
  minPx: string;
  preferredPx: string;
  maxKb: string;
  /** Always this at generation time. The suite reports the live state. */
  uploadState: 'expected but not uploaded';
}

const stateOf = (p: typeof STORE_PRODUCTS[number]): string =>
  p.suspendedReasonAr ? 'موقوف' : p.published ? 'منشور' : 'مسودة';

const rows: Row[] = slots.map((s: ImageSlot) => {
  const p = STORE_PRODUCTS.find(x => x.id === s.productId)!;
  const v = p.variants.find(x => x.id === s.variantId);
  return {
    productId: p.id,
    productAr: p.titleAr,
    productEn: p.nameEn,
    brandAr: p.brandAr,
    categoryId: p.categoryId,
    categoryAr: storeCategory(p.categoryId)?.titleAr ?? p.categoryId,
    published: stateOf(p),
    scope: s.scope === 'shared' ? 'صورة واحدة لكل الخيارات' : 'صورة لكل خيار',
    variantId: s.variantId,
    variantAr: v?.nameAr ?? 'كل الخيارات',
    role: s.role,
    fileName: s.fileName,
    repoPath: s.repoPath,
    url: s.url,
    requirement: s.required ? 'إلزامية' : 'اختيارية',
    purposeAr: s.briefAr,
    altAr: s.altAr,
    aspect: s.spec.aspect,
    minPx: `${s.spec.minPx}×${s.spec.minPx}`,
    preferredPx: `${s.spec.preferredPx}×${s.spec.preferredPx}`,
    maxKb: `${Math.round(s.spec.maxBytes / 1024)}KB`,
    uploadState: 'expected but not uploaded',
  };
});

mkdirSync(DOCS, { recursive: true });

/* JSON — the machine-readable form, with the totals alongside. */
writeFileSync(join(DOCS, 'PRODUCT_IMAGE_MANIFEST.json'), `${JSON.stringify({
  generatedBy: 'scripts/buildImageManifest.ts',
  note: 'مولَّد من الكتالوج. لا تحرّره يدوياً — عدّل imageSlots.ts وأعد التوليد.',
  spec: DEFAULT_IMAGE_SPEC,
  roleIndex: ROLE_INDEX,
  uploadRoot: STORE_IMAGE_REPO_DIR,
  urlPrefix: STORE_IMAGE_URL_PREFIX,
  totals: {
    products: goods.length,
    services: services.length,
    variants: goods.reduce((n, p) => n + p.variants.length, 0),
    directories: allImageDirs(STORE_PRODUCTS).length,
    imagesTotal: slots.length,
    imagesRequired: slots.filter(s => s.required).length,
    imagesOptional: slots.filter(s => !s.required).length,
  },
  images: rows,
}, null, 2)}\n`, 'utf8');

/* CSV — to open in a spreadsheet and tick off while photographing. */
const csvCols: (keyof Row)[] = [
  'productId', 'productAr', 'productEn', 'brandAr', 'categoryId', 'categoryAr',
  'published', 'scope', 'variantId', 'variantAr', 'role', 'fileName',
  'repoPath', 'url', 'requirement', 'purposeAr', 'altAr',
  'aspect', 'minPx', 'preferredPx', 'maxKb', 'uploadState',
];
const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
writeFileSync(
  join(DOCS, 'PRODUCT_IMAGE_MANIFEST.csv'),
  // A BOM, so Excel opens Arabic as Arabic rather than as mojibake.
  `﻿${[csvCols.join(','), ...rows.map(r => csvCols.map(c => esc(r[c])).join(','))].join('\n')}\n`,
  'utf8',
);

/* Markdown — the one a person actually works from. */
const md: string[] = [];
md.push('# صور المتجر — ما الذي يجب تصويره ورفعه', '');
md.push('> **مولَّد آلياً** من `scripts/buildImageManifest.ts` اعتماداً على الكتالوج الحقيقي.');
md.push('> لا تحرّر هذا الملف يدوياً — عدّل `src/data/store/imageSlots.ts` وأعد التوليد.', '');

md.push('## الخلاصة', '');
md.push('| البند | العدد |', '| --- | ---: |');
md.push(`| منتجات | ${goods.length} |`);
md.push(`| خدمات (بلا صور) | ${services.length} |`);
md.push(`| خيارات (Variants) | ${goods.reduce((n, p) => n + p.variants.length, 0)} |`);
md.push(`| مجلدات ستُرفع إليها | ${allImageDirs(STORE_PRODUCTS).length} |`);
md.push(`| صور إلزامية (\`01-main\`) | ${slots.filter(s => s.required).length} |`);
md.push(`| صور اختيارية | ${slots.filter(s => !s.required).length} |`);
md.push(`| المجموع المقترح | ${slots.length} |`, '');

md.push('## المواصفات', '');
md.push(`- الصيغة: \`${DEFAULT_IMAGE_SPEC.ext}\``);
md.push(`- النسبة: \`${DEFAULT_IMAGE_SPEC.aspect}\``);
md.push(`- المقاس المفضّل: \`${DEFAULT_IMAGE_SPEC.preferredPx}×${DEFAULT_IMAGE_SPEC.preferredPx}\``);
md.push(`- الحد الأدنى: \`${DEFAULT_IMAGE_SPEC.minPx}×${DEFAULT_IMAGE_SPEC.minPx}\``);
md.push(`- الحجم الأقصى: \`${Math.round(DEFAULT_IMAGE_SPEC.maxBytes / 1024)}KB\``);
md.push(`- مكان الرفع: \`${STORE_IMAGE_REPO_DIR}/<product-id>/<variant-id>/\``, '');

md.push('### أسماء الملفات — ثابتة على كل المنتجات', '');
md.push('| الملف | الوظيفة |', '| --- | --- |');
for (const [role, i] of Object.entries(ROLE_INDEX)) {
  md.push(`| \`${String(i).padStart(2, '0')}-${role}.webp\` | ${IMAGE_ROLE_BRIEF_AR[role as keyof typeof IMAGE_ROLE_BRIEF_AR]} |`);
}
md.push('');
md.push('الرقم مرتبط بالوظيفة لا بالترتيب: صورة الصندوق اسمها `06-box.webp` على كل');
md.push('منتج، سواء طلب ثلاث صور أو سبعاً. تتعلّم سبعة أسماء مرّة واحدة.', '');

md.push('## المنتجات، حسب القسم', '');
for (const cat of STORE_CATEGORIES) {
  const inCat = goods.filter(p => p.categoryId === cat.id);
  if (inCat.length === 0) continue;
  md.push(`### ${cat.titleAr} — \`${cat.id}\``, '');
  for (const p of inCat) {
    const ps = slotsForProduct(p);
    const scope = imageScopeFor(p);
    md.push(`#### ${p.titleAr}`, '');
    md.push(`- \`productId\`: \`${p.id}\``);
    md.push(`- الاسم الأصلي: \`${p.nameEn}\` — ${p.brandAr}`);
    md.push(`- الحالة: **${stateOf(p)}**`);
    md.push(`- النطاق: **${scope === 'shared' ? 'صورة واحدة تكفي كل الخيارات' : 'صورة مستقلة لكل خيار'}**`);
    md.push(`- الخيارات (${p.variants.length}): ${p.variants.map(v => `\`${v.id}\` (${v.nameAr})`).join('، ')}`);
    md.push(`- الصور المطلوبة: ${rolesFor(p).length} لكل مجلد · المجموع ${ps.length}`, '');
    const dirs = [...new Set(ps.map(s => `${s.productId}/${s.variantSlug}`))];
    for (const d of dirs) {
      md.push(`\`\`\`text`);
      md.push(`${STORE_IMAGE_REPO_DIR}/${d}/`);
      for (const s of ps.filter(x => `${x.productId}/${x.variantSlug}` === d)) {
        md.push(`  ${s.fileName}${s.required ? '   ← إلزامية' : ''}`);
      }
      md.push('```', '');
    }
  }
}

md.push('## الخدمات — لا تحتاج صور منتجات', '');
md.push('الخدمة عمل لا شيء مادي. طلب صورة لها إمّا يمنع نشرها إلى الأبد أو يدعو');
md.push('إلى صورة تزيينية، وكلاهما مرفوض.', '');
md.push('| الخدمة | `productId` | الحالة |', '| --- | --- | --- |');
for (const s of services) {
  md.push(`| ${s.titleAr} | \`${s.id}\` | ${stateOf(s)} |`);
}
md.push('');

writeFileSync(join(DOCS, 'PRODUCT_IMAGE_MANIFEST.md'), `${md.join('\n')}\n`, 'utf8');

console.log(`[manifest] ${goods.length} products · ${services.length} services`);
console.log(`[manifest] ${allImageDirs(STORE_PRODUCTS).length} directories (${created} new .gitkeep)`);
console.log(`[manifest] ${slots.length} images (${slots.filter(s => s.required).length} required)`);
console.log('[manifest] wrote docs/store/PRODUCT_IMAGE_MANIFEST.{md,csv,json}');
