#!/usr/bin/env tsx
/**
 * The four ways a store's photographs go wrong, each made into a failure.
 *
 * These are not stylistic checks. Every one of them describes a shop that looks
 * finished and is not:
 *
 *   1. a file whose name nobody recognises — uploaded, invisible, and silent
 *   2. a file under a product id that does not exist — a typo that costs an
 *      afternoon of photography
 *   3. a PUBLISHED product with no main image — a card with a grey box in it
 *   4. an orphan file — disk and bandwidth spent on something no page shows
 *
 * The manifest and the resolver both read `imageSlots.ts`, so this suite is what
 * proves the third thing — the files on disk — agrees with them too.
 */

import { readdirSync, statSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { STORE_PRODUCTS } from '../src/data/store/catalogue';
import { allImageSlots, rolesFor, variantSlug } from '../src/data/store/imageSlots';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STORE_IMAGES = join(ROOT, 'web/public/assets/store');

let passed = 0;
const failures: string[] = [];
function ok(name: string, cond: boolean, detail = '') {
  if (cond) { passed += 1; console.log(`  ok — ${name}`); return; }
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  console.log(`  FAIL — ${name}${detail ? ` — ${detail}` : ''}`);
}

/** Every image file actually on disk, as a path relative to the store root. */
function filesOnDisk(root: string): string[] {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      // Documentation is not a photograph.
      if (/\.(md|txt)$/i.test(name)) continue;
      if (name === '.gitkeep') continue;
      out.push(relative(root, p).split('\\').join('/'));
    }
  };
  walk(root);
  return out;
}

const slots = allImageSlots(STORE_PRODUCTS);
const expected = new Map(slots.map(s => [s.relPath, s]));
const productIds = new Set(STORE_PRODUCTS.map(p => p.id));
const variantSlugsByProduct = new Map(
  STORE_PRODUCTS.map(p => [p.id, new Set(p.variants.map(v => variantSlug(v.id)))]),
);

console.log('\n[1] The expected set is coherent');
{
  ok('slots were generated', slots.length > 0, `${slots.length}`);
  ok('every expected path is unique',
    new Set(slots.map(s => s.relPath)).size === slots.length);
  ok('every variant that needs images has exactly one required main',
    STORE_PRODUCTS.filter(p => rolesFor(p).length > 0).every(p =>
      p.variants.every(v =>
        slots.filter(s => s.variantId === v.id && s.required).length === 1)));
  ok('no path contains a space, a capital, or a non-ASCII character',
    slots.every(s => /^[a-z0-9\-/.]+$/.test(s.relPath)),
    slots.find(s => !/^[a-z0-9\-/.]+$/.test(s.relPath))?.relPath ?? '');
  ok('every expected file is .webp', slots.every(s => s.relPath.endsWith('.webp')));
  ok('services are excluded — a service has nothing to photograph',
    STORE_PRODUCTS.filter(p => p.categoryId === 'services')
      .every(p => rolesFor(p).length === 0));
  ok('every alt text is Arabic and non-empty',
    slots.every(s => s.altAr.trim().length > 5 && /[\u0600-\u06FF]/.test(s.altAr)));
}

console.log('\n[2] Nothing on disk is unaccounted for');
{
  const onDisk = filesOnDisk(STORE_IMAGES);
  console.log(`  (${onDisk.length} image file${onDisk.length === 1 ? '' : 's'} present)`);

  // 1 + 4 — a file the catalogue never asked for.
  const unknown = onDisk.filter(f => !expected.has(f));
  ok('every file on disk is one the catalogue asked for',
    unknown.length === 0, unknown.slice(0, 6).join(', '));

  // 2 — a file under a product or variant directory that does not exist.
  const badOwner = onDisk.filter(f => {
    const [pid, vslug] = f.split('/');
    if (!productIds.has(pid)) return true;
    return !variantSlugsByProduct.get(pid)?.has(vslug);
  });
  ok('every file sits under a real product and a real variant',
    badOwner.length === 0, badOwner.slice(0, 6).join(', '));

  // 3 — a published product with no main image on disk.
  //
  // Publication is DERIVED, so this asks the question the shop actually asks:
  // of the products that would otherwise be sellable, which would render a grey
  // box? While no images exist at all this is vacuously true, so it is reported
  // rather than silently passed.
  const missingMain = STORE_PRODUCTS
    .filter(p => rolesFor(p).length > 0)
    .flatMap(p => p.variants.map(v => ({ p, v })))
    .filter(({ p, v }) => {
      const main = slots.find(s => s.variantId === v.id && s.required);
      return !!main && !onDisk.includes(main.relPath) && hasAnyImage(onDisk, p.id, v.id);
    });
  ok('no variant has secondary images but no main image',
    missingMain.length === 0,
    missingMain.slice(0, 6).map(x => x.v.id).join(', '));

  const withMain = slots.filter(s => s.required && onDisk.includes(s.relPath)).length;
  console.log(`  (${withMain}/${slots.filter(s => s.required).length} variants have a main image)`);
}

console.log('\n[3] The checks can actually fail (controls)');
{
  // A suite that only ever runs against an empty directory proves nothing. So
  // build a directory that IS wrong and confirm each rule catches it.
  const tmp = mkdtempSync(join(tmpdir(), 'fpv-img-'));
  try {
    const write = (rel: string) => {
      const abs = join(tmp, rel);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, 'x');
    };

    const realSlot = slots[0];
    write(realSlot.relPath);                                  // legitimate
    write('geprc-cinelog35/o4-pro/01-mian.webp');             // typo
    write('not-a-product/standard/01-main.webp');             // unknown product
    write(`${realSlot.productId}/not-a-variant/01-main.webp`); // unknown variant

    const files = filesOnDisk(tmp);
    ok('the control directory was built', files.length === 4, `${files.length} files`);

    const unknown = files.filter(f => !expected.has(f));
    ok('a misspelt filename is rejected',
      unknown.includes('geprc-cinelog35/o4-pro/01-mian.webp'));

    const badOwner = files.filter(f => {
      const [pid, vslug] = f.split('/');
      if (!productIds.has(pid)) return true;
      return !variantSlugsByProduct.get(pid)?.has(vslug);
    });
    ok('a file under an unknown product is rejected',
      badOwner.includes('not-a-product/standard/01-main.webp'));
    ok('a file under an unknown variant is rejected',
      badOwner.includes(`${realSlot.productId}/not-a-variant/01-main.webp`));
    ok('…and the legitimate file is NOT rejected',
      !unknown.includes(realSlot.relPath) && !badOwner.includes(realSlot.relPath));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

console.log('\n[4] The manifest on disk matches what the code would generate now');
{
  const manifest = join(ROOT, 'docs/store/product-image-manifest.json');
  ok('the machine-readable manifest exists', existsSync(manifest));
  if (existsSync(manifest)) {
    const parsed = JSON.parse(readFileSync(manifest, 'utf8'));
    ok('its image count matches the generator', parsed.totals?.images === slots.length,
      `${parsed.totals?.images} vs ${slots.length}`);
    ok('its required count matches the generator',
      parsed.totals?.required === slots.filter(s => s.required).length);
    ok('it names the upload directory', parsed.uploadDirectory === 'web/public/assets/store');
  }
}

function hasAnyImage(onDisk: string[], productId: string, variantId: string): boolean {
  const prefix = `${productId}/${variantSlug(variantId)}/`;
  return onDisk.some(f => f.startsWith(prefix));
}


console.log(`\n${failures.length ? '❌' : '✅'} testStoreImages: ${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log(`   ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
