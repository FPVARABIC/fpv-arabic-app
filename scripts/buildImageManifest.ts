#!/usr/bin/env tsx
/**
 * Write the list of photographs the owner has to supply.
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
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STORE_PRODUCTS } from '../src/data/store/catalogue';
import { STORE_CATEGORIES } from '../src/data/store/categories';
import {
  allImageSlots, rolesFor, STORE_IMAGE_URL_PREFIX, IMAGE_ROLE_BRIEF_AR,
  type ImageSlot,
} from '../src/data/store/imageSlots';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'docs', 'store');
const UPLOAD_DIR = 'web/public/assets/store';

/** Where a photograph should be, on disk, for the site to find it. */
const diskPath = (s: ImageSlot) => `${UPLOAD_DIR}/${s.relPath}`;

const categoryById = new Map(STORE_CATEGORIES.map(c => [c.id, c]));
const slots = allImageSlots(STORE_PRODUCTS);

/* Products that need photographs at all, in catalogue order. */
const products = STORE_PRODUCTS.filter(p => rolesFor(p).length > 0);

/* ── The recommended pixel sizes ──────────────────────────────────────────── */
const SIZES = {
  ratioAr: 'مربّعة 1:1',
  fullPx: '1600 × 1600 بكسل',
  minPx: '1000 × 1000 بكسل',
  thumbPx: '600 × 600 بكسل (تُولَّد آلياً، لا ترفعها)',
  format: 'WebP',
  maxKb: 400,
};

/* ── JSON ─────────────────────────────────────────────────────────────────── */
const json = {
  generatedFrom: 'src/data/store/imageSlots.ts',
  uploadDirectory: UPLOAD_DIR,
  urlPrefix: STORE_IMAGE_URL_PREFIX,
  sizes: SIZES,
  totals: {
    products: products.length,
    variants: products.reduce((n, p) => n + p.variants.length, 0),
    images: slots.length,
    required: slots.filter(s => s.required).length,
  },
  products: products.map(p => ({
    productId: p.id,
    nameEn: p.nameEn,
    titleAr: p.titleAr,
    brandAr: p.brandAr,
    categoryId: p.categoryId,
    categoryAr: categoryById.get(p.categoryId)?.titleAr ?? p.categoryId,
    variants: p.variants.map(v => ({
      variantId: v.id,
      nameAr: v.nameAr,
      imageCount: rolesFor(p).length,
      images: slots
        .filter(s => s.variantId === v.id)
        .map(s => ({
          role: s.role,
          required: s.required,
          file: diskPath(s),
          url: s.url,
          altAr: s.altAr,
          briefAr: s.briefAr,
        })),
    })),
  })),
};

/* ── CSV ──────────────────────────────────────────────────────────────────── */
const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;
const csvRows = [
  ['product_id', 'product_name_en', 'product_title_ar', 'category_ar',
    'variant_id', 'variant_name_ar', 'role', 'required', 'file_path', 'alt_ar'].join(','),
  ...slots.map(s => {
    const p = STORE_PRODUCTS.find(x => x.id === s.productId)!;
    const v = p.variants.find(x => x.id === s.variantId)!;
    return [
      s.productId, p.nameEn, p.titleAr,
      categoryById.get(p.categoryId)?.titleAr ?? p.categoryId,
      s.variantId, v.nameAr, s.role, s.required ? 'yes' : 'no',
      diskPath(s), s.altAr,
    ].map(x => csvCell(String(x))).join(',');
  }),
];

/* ── Markdown ─────────────────────────────────────────────────────────────── */
const lines: string[] = [];
lines.push('# صور المتجر — ما أحتاج رفعه');
lines.push('');
lines.push('> **هذا الملف مولَّد.** لا تحرّره بيدك — عدّل `src/data/store/imageSlots.ts`');
lines.push('> ثم شغّل `npx tsx scripts/buildImageManifest.ts`.');
lines.push('');
lines.push('---');
lines.push('');
lines.push('## أين أرفع الصور');
lines.push('');
lines.push('```text');
lines.push(`${UPLOAD_DIR}/<معرّف المنتج>/<الخيار>/<الرقم>-<الدور>.webp`);
lines.push('```');
lines.push('');
lines.push('المسار كامل مذكور أمام كل صورة أدناه، فانسخه كما هو. أسماء الملفات');
lines.push('مبنيّة على **المعرّفات لا على الأسماء**، فتغيير اسم عربي لا يفصل المنتج عن صوره.');
lines.push('');
lines.push('## المقاسات');
lines.push('');
lines.push('| | |');
lines.push('|---|---|');
lines.push(`| النسبة | ${SIZES.ratioAr} |`);
lines.push(`| المقاس المفضّل | ${SIZES.fullPx} |`);
lines.push(`| الحدّ الأدنى | ${SIZES.minPx} |`);
lines.push(`| الصيغة | ${SIZES.format} |`);
lines.push(`| أقصى حجم للملف | ${SIZES.maxKb} كيلوبايت |`);
lines.push(`| المصغّرة | ${SIZES.thumbPx} |`);
lines.push('');
lines.push('## أدوار الصور');
lines.push('');
for (const [role, brief] of Object.entries(IMAGE_ROLE_BRIEF_AR)) {
  lines.push(`- **\`${role}\`** — ${brief}`);
}
lines.push('');
lines.push('**الصورة الرئيسية (`01-main`) وحدها إلزامية.** المنتج بلا صورة رئيسية');
lines.push('يبقى مسودّة ولا يُنشر — هذا مفروض باختبار، لا بالاتفاق.');
lines.push('');
lines.push('## الحقوق');
lines.push('');
lines.push('كل صورة تحتاج أساس استخدام موثّقاً قبل النشر: صورة الشركة الصانعة بإذن،');
lines.push('أو صورة المورّد المسموح بها للبائعين، أو صورتك أنت. **لا صور ذكاء اصطناعي،');
lines.push('ولا صور منسوخة بلا إذن.** صورتك الخاصة هي دائماً الخيار الأسلم.');
lines.push('');
lines.push('---');
lines.push('');
lines.push(`## الإجمالي: ${slots.length} صورة · ${json.totals.required} منها إلزامية`);
lines.push('');
lines.push(`${products.length} منتجاً · ${json.totals.variants} خياراً`);
lines.push('');

let currentCategory = '';
for (const p of products) {
  const cat = categoryById.get(p.categoryId);
  const catAr = cat?.titleAr ?? p.categoryId;
  if (catAr !== currentCategory) {
    currentCategory = catAr;
    lines.push('');
    lines.push(`## ${catAr}`);
  }
  lines.push('');
  lines.push(`### ${p.titleAr}`);
  lines.push('');
  lines.push(`- **المعرّف:** \`${p.id}\``);
  lines.push(`- **الاسم كما تكتبه الشركة:** ${p.nameEn}`);
  lines.push(`- **الشركة:** ${p.brandAr}`);
  lines.push(`- **القسم:** ${catAr} (\`${p.categoryId}\`)`);
  lines.push(`- **عدد الصور:** ${rolesFor(p).length} لكل خيار`);
  lines.push('');
  for (const v of p.variants) {
    const vs = slots.filter(s => s.variantId === v.id);
    lines.push(`#### ${v.nameAr}`);
    lines.push('');
    lines.push(`\`${v.id}\``);
    lines.push('');
    lines.push('| # | الدور | الملف | النص البديل |');
    lines.push('|---|---|---|---|');
    for (const s of vs) {
      const req = s.required ? ' **(إلزامية)**' : '';
      lines.push(`| ${s.index} | \`${s.role}\`${req} | \`${diskPath(s)}\` | ${s.altAr} |`);
    }
    lines.push('');
  }
}

mkdirSync(DOCS, { recursive: true });
writeFileSync(join(DOCS, 'PRODUCT_IMAGE_MANIFEST.md'), `${lines.join('\n')}\n`, 'utf8');
writeFileSync(join(DOCS, 'product-image-manifest.json'), `${JSON.stringify(json, null, 2)}\n`, 'utf8');
writeFileSync(join(DOCS, 'product-image-manifest.csv'), `${csvRows.join('\n')}\n`, 'utf8');

console.log(`[manifest] products  ${products.length}`);
console.log(`[manifest] variants  ${json.totals.variants}`);
console.log(`[manifest] images    ${slots.length} (${json.totals.required} required)`);
console.log(`[manifest] wrote     docs/store/PRODUCT_IMAGE_MANIFEST.md`);
console.log(`[manifest] wrote     docs/store/product-image-manifest.json`);
console.log(`[manifest] wrote     docs/store/product-image-manifest.csv`);
