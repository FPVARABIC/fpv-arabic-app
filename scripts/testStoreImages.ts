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
import {
  allImageSlots, allImageDirs, slotsForProduct, rolesFor, variantSlug,
  imageScopeFor, fileNameFor, IMAGE_ROLES, IMAGE_FILE_PATTERN, ROLE_INDEX,
  SHARED_VARIANT_SLUG,
} from '../src/data/store/imageSlots';

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
  /*
   * Exactly one required main per FOLDER, not per variant.
   *
   * This asserted per variant, which was right while every variant had its own
   * directory. Products whose variants are visually identical — two capacities
   * of one battery, three KV of one motor — now photograph once into `_shared`
   * and every variant resolves there. That is a declared decision recorded in
   * the manifest, not a silent fallback: a `per-variant` product still gets a
   * folder each, and a missing file there still shows as missing.
   *
   * The invariant that actually matters is unchanged and is what is checked:
   * every directory the owner is asked to fill expects exactly one `01-main`.
   */
  const byDir = new Map<string, number>();
  for (const s of slots.filter(x => x.required)) {
    const d = `${s.productId}/${s.variantSlug}`;
    byDir.set(d, (byDir.get(d) ?? 0) + 1);
  }
  ok('every image folder expects exactly one required main image',
    [...byDir.values()].every(n => n === 1),
    [...byDir].filter(([, n]) => n !== 1).slice(0, 3).map(([d, n]) => `${d}=${n}`).join(', '));
  ok('…and every folder the catalogue names has one',
    byDir.size === allImageDirs(STORE_PRODUCTS).length,
    `${byDir.size} vs ${allImageDirs(STORE_PRODUCTS).length}`);
  // Underscore allowed for exactly one reason: `_shared`, the folder a product
  // uses when its variants are the same object in two sizes. It leads with an
  // underscore so it sorts above the variant folders and reads as «not a
  // variant id» at a glance.
  const SAFE = /^[a-z0-9_\-/.]+$/;
  ok('no path contains a space, a capital, or a non-ASCII character',
    slots.every(s => SAFE.test(s.relPath)),
    slots.find(s => !SAFE.test(s.relPath))?.relPath ?? '');
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
  // All three formats, named consistently in capitals so the three sit together
  // in the directory listing. The generator writes them in one pass, so they
  // cannot disagree with each other — this checks they agree with the CODE.
  const dir = join(ROOT, 'docs/store');
  const manifest = join(dir, 'PRODUCT_IMAGE_MANIFEST.json');
  ok('the machine-readable manifest exists', existsSync(manifest));
  ok('the Markdown manifest exists', existsSync(join(dir, 'PRODUCT_IMAGE_MANIFEST.md')));
  ok('the CSV manifest exists', existsSync(join(dir, 'PRODUCT_IMAGE_MANIFEST.csv')));

  if (existsSync(manifest)) {
    const parsed = JSON.parse(readFileSync(manifest, 'utf8'));
    ok('its image count matches the generator', parsed.totals?.imagesTotal === slots.length,
      `${parsed.totals?.imagesTotal} vs ${slots.length}`);
    ok('its required count matches the generator',
      parsed.totals?.imagesRequired === slots.filter(s => s.required).length);
    ok('its directory count matches the generator',
      parsed.totals?.directories === allImageDirs(STORE_PRODUCTS).length);
    ok('it names the upload directory', parsed.uploadRoot === 'web/public/assets/store');

    // Every path in the document is one the code generates. This is the check
    // that catches a manifest somebody edited by hand, or one left stale after
    // a rule changed — either produces a document that sends the owner to a
    // folder nothing reads.
    const docPaths = new Set((parsed.images ?? []).map((i: { repoPath: string }) => i.repoPath));
    const drifted = slots.filter(s => !docPaths.has(s.repoPath));
    ok('every generated path is present in the manifest',
      drifted.length === 0, drifted.slice(0, 3).map(s => s.repoPath).join(', '));
    ok('…and the manifest names nothing the code does not',
      docPaths.size === slots.length, `${docPaths.size} vs ${slots.length}`);
  }
}

console.log('\n[5] The naming scheme is fixed, so seven names are learned once');
{
  // The number belongs to the ROLE, on every product in the shop. Numbering
  // sequentially per product would make the box shot `03-box` on a camera and
  // `06-box` on a drone — a table to consult for every single file, and a
  // silent renumber of files already uploaded the day a role is added.
  for (const role of IMAGE_ROLES) {
    const forRole = slots.filter(s => s.role === role);
    if (forRole.length === 0) continue;
    const names = new Set(forRole.map(s => s.fileName));
    ok(`«${role}» is ${fileNameFor(role)} everywhere`,
      names.size === 1 && [...names][0] === fileNameFor(role), [...names].join(', '));
  }
  const idx = Object.values(ROLE_INDEX);
  ok('every role has a distinct number', new Set(idx).size === idx.length);

  // The generator and the validator must agree, or every uploaded file reads
  // as «invalid» and the owner is told their correct work is wrong.
  const unmatched = slots.filter(s => !IMAGE_FILE_PATTERN.test(s.fileName));
  ok('every expected filename matches the validation pattern',
    unmatched.length === 0, unmatched.slice(0, 3).map(s => s.fileName).join(', '));
  for (const bad of ['01-mian.webp', '1-main.webp', '01-main.jpg', '01 main.webp', 'main.webp']) {
    ok(`the pattern rejects «${bad}» (control)`, !IMAGE_FILE_PATTERN.test(bad));
  }
  ok('…and accepts a correct one (control)', IMAGE_FILE_PATTERN.test('06-box.webp'));
}

console.log('\n[6] The folders are already there, so nobody creates one by hand');
{
  const dirs = allImageDirs(STORE_PRODUCTS);
  const absent = dirs.filter(d => !existsSync(join(STORE_IMAGES, d)));
  ok('every expected directory exists', absent.length === 0, absent.slice(0, 5).join(', '));
  const noKeep = dirs.filter(d => !existsSync(join(STORE_IMAGES, d, '.gitkeep')));
  ok('…each with a .gitkeep so GitHub shows it before any upload',
    noKeep.length === 0, noKeep.slice(0, 5).join(', '));
  ok('the upload README is present', existsSync(join(STORE_IMAGES, 'README.md')));
}

/* ── The four states, reported rather than failed ─────────────────────────── */
{
  const disk = filesOnDisk(STORE_IMAGES);
  const expectedPaths = new Set(slots.map(s => s.relPath));
  const dirs = new Set(allImageDirs(STORE_PRODUCTS));
  let valid = 0; let orphan = 0; let bad = 0;
  for (const f of disk) {
    const name = f.split('/').pop() ?? '';
    const d = f.split('/').slice(0, -1).join('/');
    if (!IMAGE_FILE_PATTERN.test(name)) { bad += 1; continue; }
    if (!dirs.has(d) || !expectedPaths.has(f)) { orphan += 1; continue; }
    valid += 1;
  }
  const goods = STORE_PRODUCTS.filter(p => rolesFor(p).length > 0);
  console.log('\n── الحالة الآن ─────────────────────────────────────────────');
  console.log(`  expected but not uploaded : ${slots.length - valid}`);
  console.log(`  uploaded and valid        : ${valid}`);
  console.log(`  orphan                    : ${orphan}`);
  console.log(`  invalid                   : ${bad}`);
  console.log(`  ─ directories prepared    : ${dirs.size}`);
  console.log(`  ─ required (01-main)      : ${slots.filter(s => s.required).length}`);
  console.log(`  ─ per-variant products    : ${goods.filter(p => imageScopeFor(p) === 'per-variant').length}`);
  console.log(`  ─ shared-image products   : ${goods.filter(p => imageScopeFor(p) === 'shared').length}`);
  console.log(`  ─ shared folder name      : ${SHARED_VARIANT_SLUG}`);
}

function hasAnyImage(onDisk: string[], productId: string, variantId: string): boolean {
  const prefix = `${productId}/${variantSlug(variantId)}/`;
  return onDisk.some(f => f.startsWith(prefix));
}


console.log(`\n${failures.length ? '❌' : '✅'} testStoreImages: ${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log(`   ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
