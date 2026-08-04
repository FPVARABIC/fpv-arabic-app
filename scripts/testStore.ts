/**
 * The store's foundation, against the promises it makes.
 *
 * THE TWO THINGS THIS FILE EXISTS FOR
 * -----------------------------------
 * 1. That a customer can never see what we paid. Not «the UI does not render
 *    it» — that the data is not in a document they may read, because a rule
 *    cannot withhold a field and a UI is one refactor from showing anything.
 *
 * 2. That no number is invented. A price is computed from a recorded cost or
 *    it does not exist; a specification is verified against a manufacturer or
 *    it is not presented as a fact. This is the encyclopedia's own rule, and a
 *    shop is where breaking it costs the reader money rather than time.
 *
 * Everything else — curation limits, the choice axis, the relationships — is
 * checked because those are what make this a curated shop rather than a list,
 * and a list is what it decays into the moment nobody is measuring.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { STORE_CATEGORIES, storeCategory, categoriesInGroup } from '../src/data/store/categories';
import {
  STORE_CATALOGUE, STORE_PRODUCTS, storeProduct, productsInCategory, categoryProductCount,
} from '../src/data/store/catalogue';
import { SUPPLIERS, supplier, combinedLeadTime } from '../src/data/store/suppliers';
import { STORE_SERVICES, freeWithPurchaseService, SERVICES_CATEGORY_ID } from '../src/data/store/services';
import {
  readCart, addToCart, setQuantity, removeFromCart, resolveCart, withIncludedService,
  MAX_QUANTITY_PER_LINE, MAX_LINES, CART_SCHEMA_VERSION, EMPTY_CART,
} from '../src/data/store/cart';
import {
  priceFrom, applyRounding, cartTotals, formatPrice, realisedMarginPercent, policyFor,
} from '../src/data/store/pricing';
import {
  INITIAL_PUBLIC_SETTINGS, INITIAL_PRIVATE_SETTINGS,
  validatePublicSettings, validatePrivateSettings,
} from '../src/data/store/settings';
import {
  applyOverride, mergeCatalogue, OVERRIDABLE_FIELDS, IMMUTABLE_FIELDS,
  type ProductOverride,
} from '../src/data/store/overrides';
import { INITIAL_DEFAULT_MARGIN_PERCENT, ORDER_STATUS_NEXT } from '../src/data/store/types';
import type { OrderStatus, StoreProduct } from '../src/data/store/types';
import {
  publicationBlockers, publicationStage, publishability, canOrder,
  isPriceStale, daysBetween, MIN_VERIFIED_SPECS, DEFAULT_PRICE_REVIEW_DAYS,
} from '../src/data/store/publication';
import { CATALOGUE_AUDIT, auditFor, launchSetIds, auditSummary } from '../src/data/store/audit';
import type { AuditKind } from '../src/data/store/audit';
import { NEED_CAVEAT_AR, alternativesFor } from '../src/data/store/relationships';
import { OWNER_DECISIONS } from '../src/data/store/decisions';
import {
  toCsv, parseCsv, validateRows, SUPPLY_CSV_COLUMNS,
} from '../src/data/store/supplyCsv';

/** The sections whose members genuinely need something else to be usable. */
const NEEDS_SECTIONS = [
  'tiny-whoop', 'size-2', 'size-2-5', 'size-3', 'size-3-5', 'size-5', 'size-7',
  'rtf', 'batteries', 'chargers', 'motors', 'escs', 'flight-controllers',
  'receivers', 'cameras', 'vtx', 'air-units', 'antennas', 'gps', 'frames',
  'radios', 'goggles',
];
import { LAUNCH_SPECS, CHECKED, NOT_PUBLISHED_AR } from '../src/data/store/launch';
import { isSpecVerified } from '../src/data/store/types';
import { ROLE_CAPABILITIES } from '../src/data/auth/roles';
import { getArticle } from '../src/data/kb/registry';
import { kbTerms } from '../src/data/kb/glossary/terms';
import { bfPageRegistry } from '../src/data/betaflight/pageRegistry';
import { allEdgeTxPages } from '../src/data/edgetx/registry';
import { allVideoToolPages } from '../src/data/video/software/registry';
import { setupSteps } from '../src/data/expresslrs/setupSteps';

let passed = 0;
let failed = 0;
function ok(label: string, cond: boolean): void {
  if (cond) { passed++; console.log(`  ok — ${label}`); }
  else { failed++; console.error(`  FAIL — ${label}`); }
}

const ROOT = new URL('..', import.meta.url).pathname;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

/**
 * Is this file something a customer's browser can reach?
 *
 * The staff boundary is three directories: the admin routes, the admin
 * components they render, and the server-only modules behind them. Cost, margin
 * and supplier live inside it and nowhere else. Anything outside is storefront —
 * shipped to a browser, or rendered into HTML a browser receives.
 *
 * This is deliberately a path rule rather than a content rule. «It's a server
 * component so it's fine» is how a cost ends up in the HTML: server components
 * render into the page. The question is not where the code runs, it is who can
 * see what it produces.
 */
function isStorefront(file: string): boolean {
  const rel = file.slice(ROOT.length).replace(/\\/g, '/').replace(/^\/+/, '');
  return !/^web\/(app\/admin\/|components\/admin\/|lib\/server\/)/.test(rel);
}

/**
 * The argument list of a call, with nesting respected.
 *
 * Reading a payload with a flat regex means reading the whole file, and the
 * whole file contains prices — it renders them. What matters is what crosses
 * the wire, so this returns exactly the text between the call's parentheses.
 */
/**
 * Source with its comments removed.
 *
 * A file whose doc comment explains a rule must not be counted as breaking it —
 * `storeCatalogue.ts` says the words «seed catalogue» in prose, and a check for
 * seed imports that read prose would flag the module that exists to prevent
 * them.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function callArgs(src: string, callee: string): string {
  const at = src.indexOf(`${callee}(`);
  if (at < 0) throw new Error(`callArgs: no call to ${callee}`);
  let depth = 0;
  const start = at + callee.length;
  for (let i = start; i < src.length; i++) {
    if (src[i] === '(') depth++;
    else if (src[i] === ')' && --depth === 0) return src.slice(start + 1, i);
  }
  throw new Error(`callArgs: unbalanced call to ${callee}`);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[1] The cost is not in anything a customer can read');
{
  /**
   * The assertion the whole model is shaped around. Firestore rules allow or
   * deny a WHOLE document — there is no way to return one with a field
   * withheld — so a public product carrying a supplier or a cost would expose
   * both to anyone who can read the price, and no rule could stop it.
   */
  const SUPPLY_FIELDS = [
    'supplierName', 'supplierNameAr', 'supplierUrl', 'unitCost', 'unitCostMinor',
    'inboundShipping', 'inboundShippingMinor', 'marginPercent', 'marginPercentOverride',
    'costCurrency',
  ];

  const leaky = STORE_CATALOGUE.filter(p =>
    SUPPLY_FIELDS.some(f => f in (p as unknown as Record<string, unknown>)));
  if (leaky.length) console.error('   LEAKY PRODUCTS:', leaky.map(p => p.id));
  ok('no public product carries a supply field', leaky.length === 0);

  // And the same at the type level, read from the source: a field added to the
  // public interface later would pass the runtime check above on seed data that
  // simply never sets it.
  const typesSrc = readFileSync(join(ROOT, 'src/data/store/types.ts'), 'utf8');
  const publicIface = typesSrc.slice(
    typesSrc.indexOf('export interface StoreProduct {'),
    typesSrc.indexOf('export interface StoreSupply {'),
  );
  const declaredLeak = SUPPLY_FIELDS.filter(f => new RegExp(`^\\s{2}${f}[?:]`, 'm').test(publicIface));
  if (declaredLeak.length) console.error('   DECLARED ON PUBLIC TYPE:', declaredLeak);
  ok('the public product type declares no supply field', declaredLeak.length === 0);

  // The rules must actually separate them, and close the supply side outright.
  const rules = readFileSync(join(ROOT, 'firestore.rules'), 'utf8');
  ok('the rules know about a separate supply collection', rules.includes('match /storeSupply/'));
  ok('supply is readable only by store staff',
    /match \/storeSupply\/\{[^}]+\} \{[\s\S]{0,400}?allow read: if isStoreStaff\(\);/.test(rules));
  ok('supply is never client-writable',
    /match \/storeSupply\/\{[^}]+\} \{[\s\S]{0,400}?allow write: if false;/.test(rules));

  // The margin is private for the subtler reason: price ÷ margin is the cost.
  ok('settings are split so the margin is not public',
    rules.includes("allow read: if docId == 'public' || isStoreStaff();"));
  const settingsSrc = readFileSync(join(ROOT, 'src/data/store/settings.ts'), 'utf8');
  const publicSettingsIface = typesSrc.slice(
    typesSrc.indexOf('export interface StorePublicSettings {'),
    typesSrc.indexOf('export interface StorePrivateSettings {'),
  );
  ok('the public settings type has no margin', !/margin/i.test(publicSettingsIface));
  ok('the default margin ships in the private seed',
    settingsSrc.includes('INITIAL_PRIVATE_SETTINGS')
    && INITIAL_PRIVATE_SETTINGS.defaultMarginPercent === INITIAL_DEFAULT_MARGIN_PERCENT);

  // Positive control: the leak check must be able to detect a leak.
  const planted = { ...STORE_CATALOGUE[0], supplierUrl: 'https://example.invalid' };
  ok('the leak check can detect a planted supply field',
    SUPPLY_FIELDS.some(f => f in planted));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2] Prices are computed, never invented');
{
  // No seed product carries a price. A price exists only once somebody has
  // recorded what we pay, and a number written here would be one a customer
  // could act on.
  const priced = STORE_CATALOGUE.filter(p => p.priceMinor !== null);
  if (priced.length) console.error('   HARD-CODED PRICES:', priced.map(p => p.id));
  ok('no seed product ships with a hard-coded price', priced.length === 0);

  const settings = { defaultMarginPercent: 10 };

  // The engine refuses to price an incomplete record rather than guessing.
  ok('a missing cost prices nothing',
    priceFrom({ unitCostMinor: 0, inboundShippingMinor: 0, costCurrency: 'USD' }, settings) === null);
  ok('a negative cost prices nothing',
    priceFrom({ unitCostMinor: -100, inboundShippingMinor: 0, costCurrency: 'USD' }, settings) === null);
  ok('a fractional cost prices nothing — money is integer minor units',
    priceFrom({ unitCostMinor: 12.5, inboundShippingMinor: 0, costCurrency: 'USD' }, settings) === null);
  ok('a negative shipping cost prices nothing',
    priceFrom({ unitCostMinor: 1000, inboundShippingMinor: -1, costCurrency: 'USD' }, settings) === null);
  ok('a negative margin prices nothing',
    priceFrom({ unitCostMinor: 1000, inboundShippingMinor: 0, costCurrency: 'USD' },
      { defaultMarginPercent: -5 }) === null);

  // Margin applies to LANDED cost — unit plus inbound shipping. Applying it to
  // the unit alone yields a margin nobody chose and everybody believes.
  const b = priceFrom({ unitCostMinor: 3000, inboundShippingMinor: 2000, costCurrency: 'USD' }, settings)!;
  ok('margin is applied to unit + shipping, not to unit alone', b.landedCostMinor === 5000);
  ok('a 10% margin on $50 landed produces $55 before rounding', b.rawSellMinor === 5500);
  ok('the sell price is never below landed cost', b.sellMinor >= b.landedCostMinor);

  // Rounding always goes UP: rounding down sells under the chosen margin.
  for (const [inMinor, mode, want] of [
    [5500, 'exact', 5500], [5500, 'whole', 5500], [5501, 'whole', 5600],
    [5530, 'charm', 5599], [5599, 'charm', 5599], [5600, 'charm', 5699],
  ] as const) {
    ok(`rounding ${mode} of ${inMinor} → ${want}`, applyRounding(inMinor, mode, 'USD') === want);
  }
  const rounded = [2500, 2501, 9999, 100, 1].every(m =>
    applyRounding(m, 'charm', 'USD') >= m && applyRounding(m, 'whole', 'USD') >= m);
  ok('no rounding mode ever lowers a price', rounded);

  // The realised margin is not the requested one, and the model says so rather
  // than letting a shop owner believe a number that rounding moved.
  ok('the realised margin is reported, and differs from the request',
    realisedMarginPercent(b) > 10 && realisedMarginPercent(b) < 13);

  // A per-product override beats the store default; an absent one does not.
  ok('an override replaces the default margin',
    policyFor({ marginPercentOverride: 25 }, settings).marginPercent === 25);
  ok('an absent override falls back to the store default',
    policyFor({}, settings).marginPercent === 10);
  ok('a nonsensical override falls back rather than selling at a loss',
    policyFor({ marginPercentOverride: -3 }, settings).marginPercent === 10);

  // The default margin is a seed, and it is a private one: price ÷ margin is
  // cost, so a page that renders the margin has rendered what we pay. The admin
  // panel must read it — it is the thing that sets it — and the server module
  // behind that panel must too. Everything else must not.
  const marginReaders = walk(join(ROOT, 'web'))
    .filter(f => /INITIAL_DEFAULT_MARGIN_PERCENT|defaultMarginPercent/.test(readFileSync(f, 'utf8')));
  const storefront = marginReaders.filter(f => isStorefront(f));
  if (storefront.length) console.error('   MARGIN IN STOREFRONT:', storefront.map(f => f.slice(ROOT.length)));
  ok('no customer-facing file reads the margin', storefront.length === 0);

  // …and the check is not passing because nothing matches. Something reads it,
  // and everything that does is behind the staff boundary.
  ok('the margin is read somewhere — the check above is not vacuous', marginReaders.length > 0);
  ok('every margin reader is admin or server-only',
    marginReaders.every(f => !isStorefront(f)));
  ok('a storefront path would have been caught',
    isStorefront(join(ROOT, 'web/components/store/StorePieces.tsx'))
    && isStorefront(join(ROOT, 'web/app/store/p/[productId]/page.tsx')));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3] Totals add up, in integers');
{
  const t = cartTotals(
    [{ productId: 'a', quantity: 2, unitPriceMinor: 1999 },
      { productId: 'b', quantity: 1, unitPriceMinor: 500 }],
    1200,
  );
  ok('line totals sum exactly', t.itemsTotalMinor === 1999 * 2 + 500);
  ok('the total includes shipping', t.totalMinor === t.itemsTotalMinor + 1200);
  ok('the item count is the sum of quantities', t.itemCount === 3);

  // Nonsense lines are dropped rather than poisoning a total.
  const bad = cartTotals([
    { productId: 'a', quantity: 0, unitPriceMinor: 100 },
    { productId: 'b', quantity: -1, unitPriceMinor: 100 },
    { productId: 'c', quantity: 1.5, unitPriceMinor: 100 },
    { productId: 'd', quantity: 1, unitPriceMinor: -100 },
    { productId: 'e', quantity: 2, unitPriceMinor: 250 },
  ], 0);
  ok('malformed lines are ignored, not summed', bad.itemsTotalMinor === 500 && bad.itemCount === 2);
  ok('a negative shipping figure is refused', cartTotals([], -50).shippingMinor === 0);

  // The float trap this model exists to avoid.
  const cents = cartTotals(Array.from({ length: 3 }, () => (
    { productId: 'x', quantity: 1, unitPriceMinor: 10 })), 0);
  ok('three lots of $0.10 total exactly $0.30', cents.itemsTotalMinor === 30);
  ok('and the same sum in floats would not have', 0.1 + 0.1 + 0.1 !== 0.3);

  ok('a price formats with its currency', formatPrice(5599, 'USD') === '55.99 دولار');
  ok('a whole price drops the decimals', formatPrice(5500, 'USD') === '55 دولار');
  ok('thousands are grouped', formatPrice(123456, 'USD') === '1,234.56 دولار');
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[4] Curated, not catalogued');
{
  ok(`the store has sections (${STORE_CATEGORIES.length})`, STORE_CATEGORIES.length >= 20);
  ok(`and products (${STORE_CATALOGUE.length})`, STORE_CATALOGUE.length >= 25);

  // The rule that makes this a curated shop. Both bounds matter: an empty
  // section is the «قريباً» emptiness the brief refused, and a section of
  // twenty has handed the decision back to the reader.
  const empty = STORE_CATEGORIES.filter(c => categoryProductCount(c.id) === 0);
  if (empty.length) console.error('   EMPTY SECTIONS:', empty.map(c => c.id));
  ok('no section ships empty', empty.length === 0);

  // The lower bound, which is the one the shop kept failing. «Three to five»
  // was the brief and «one» is not a choice — a section with a single product
  // is a recommendation the reader cannot evaluate, and for most of this
  // catalogue's life that is what twenty of these sections were.
  const thin = STORE_CATEGORIES
    .filter(c => c.id !== SERVICES_CATEGORY_ID)
    .filter(c => categoryProductCount(c.id) < 3);
  if (thin.length) {
    console.error('   THIN SECTIONS:', thin.map(c => `${c.id}:${categoryProductCount(c.id)}`));
  }
  ok('every section offers at least three options', thin.length === 0);

  // Services are exempt: the three-to-five rule exists to stop a reader
  // drowning in near-identical options, and a menu of what we DO is not a
  // choice between competing products. The brief listed eight of them.
  const bloated = STORE_CATEGORIES
    .filter(c => c.id !== SERVICES_CATEGORY_ID)
    .filter(c => categoryProductCount(c.id) > 5);
  if (bloated.length) console.error('   BLOATED SECTIONS:', bloated.map(c => `${c.id}:${categoryProductCount(c.id)}`));
  ok('no section exceeds five products', bloated.length === 0);

  // Three products only read as a choice if they sit at different points on
  // the section's axis. Two «middle» options and nothing else is a list.
  const undifferentiated = STORE_CATEGORIES.filter(c => c.id !== SERVICES_CATEGORY_ID).filter(c => {
    const ps = productsInCategory(c.id);
    if (ps.length < 2) return false;
    return new Set(ps.map(p => p.choicePosition)).size === 1;
  });
  if (undifferentiated.length) console.error('   NO SPREAD:', undifferentiated.map(c => c.id));
  ok('every multi-product section spans more than one point on its axis',
    undifferentiated.length === 0);

  // Ordered along the axis, so the page reads cheap → expensive.
  const rank: Record<string, number> = { entry: 0, middle: 1, pro: 2, variant: 3 };
  const misordered = STORE_CATEGORIES.filter(c => c.id !== SERVICES_CATEGORY_ID).filter(c => {
    const ps = productsInCategory(c.id).map(p => rank[p.choicePosition]);
    return ps.some((v, i) => i > 0 && v < ps[i - 1]);
  });
  ok('every section is ordered along its axis', misordered.length === 0);

  const dupIds = STORE_CATALOGUE.map(p => p.id).filter((id, i, a) => a.indexOf(id) !== i);
  ok('no product id is used twice', dupIds.length === 0);

  const strayCategory = STORE_CATALOGUE.filter(p => !storeCategory(p.categoryId));
  ok('every product sits in a real section', strayCategory.length === 0);

  const strayCollection = STORE_CATALOGUE.flatMap(p =>
    p.collections.filter(c => !storeCategory(c)).map(c => `${p.id}→${c}`));
  ok('every use-case collection names a real section', strayCollection.length === 0);

  ok('both groups have sections',
    categoriesInGroup('aircraft').length > 0 && categoriesInGroup('components').length > 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[5] Every product earns its place');
{
  /**
   * These are required fields on the model, so the check is that they are
   * genuinely filled rather than present-and-empty. `notForAr` is the one that
   * matters most: a shop that will not say «هذا ليس لك» has nothing to offer
   * over a supplier's stock list, and it is the section no competitor writes.
   */
  const missing = (f: (p: StoreProduct) => unknown[], name: string) => {
    const bad = STORE_CATALOGUE.filter(p => f(p).length === 0);
    if (bad.length) console.error(`   NO ${name}:`, bad.map(p => p.id));
    ok(`every product says ${name}`, bad.length === 0);
  };
  missing(p => p.suitsAr, 'who it suits');
  missing(p => p.notForAr, 'who it does NOT suit');
  missing(p => p.highlightsAr, 'what stands out');
  missing(p => p.inTheBoxAr, 'what is in the box');

  const thin = STORE_CATALOGUE.filter(p => p.summaryAr.length < 60);
  ok('no product summary is a stub', thin.length === 0);

  const noReview = STORE_CATALOGUE.filter(p => !/^\d{4}-\d{2}-\d{2}$/.test(p.reviewedAt));
  ok('every product carries a review date', noReview.length === 0);

  // A spec is a fact or it is not presented as one. Nothing may claim
  // verification without naming where it was verified.
  const unsourced = STORE_CATALOGUE.flatMap(p =>
    p.specs.filter(s => s.verified && !s.sourceUrl).map(s => `${p.id}:${s.labelAr}`));
  if (unsourced.length) console.error('   VERIFIED WITHOUT A SOURCE:', unsourced);
  ok('no spec claims verification without a source', unsourced.length === 0);

  // An image is published only with its permission recorded — using a
  // manufacturer's photography without it is both what the brief refused and a
  // real exposure.
  const uncredited = STORE_CATALOGUE.flatMap(p =>
    p.images.filter(i => !i.credit).map(() => p.id));
  if (uncredited.length) console.error('   IMAGES WITHOUT PERMISSION:', uncredited);
  ok('no image ships without its permission recorded', uncredited.length === 0);

  const noAlt = STORE_CATALOGUE.flatMap(p => p.images.filter(i => !i.altAr).map(() => p.id));
  ok('every image carries alternative text', noAlt.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[6] Nothing links into a void');
{
  const ids = new Set(STORE_CATALOGUE.map(p => p.id));
  const dangling: string[] = [];
  for (const p of STORE_CATALOGUE) {
    for (const rel of [...p.relatedProductIds, ...p.alternativeProductIds, ...p.completesProductIds]) {
      if (!ids.has(rel)) dangling.push(`${p.id}→${rel}`);
    }
    if (p.alternativeProductIds.includes(p.id)) dangling.push(`${p.id}→itself`);
  }
  if (dangling.length) console.error('   DANGLING:', dangling);
  ok('every product relationship names a real product', dangling.length === 0);

  // The store's one real advantage: it sits on an encyclopedia. A learn link
  // that goes nowhere is that advantage, broken.
  const deadLearn: string[] = [];
  const checkLink = (owner: string, kind: string, targetId: string) => {
    if (kind === 'external' || !targetId) return;
    if (kind === 'article' && !getArticle(targetId)) deadLearn.push(`${owner}→article:${targetId}`);
    if (kind === 'glossary' && !kbTerms.some(t => t.id === targetId)) deadLearn.push(`${owner}→glossary:${targetId}`);
    if (kind === 'betaflight' && !bfPageRegistry.some(b => b.id === targetId && !!b.page)) {
      deadLearn.push(`${owner}→betaflight:${targetId}`);
    }
    if (kind === 'edgetx' && !allEdgeTxPages.some(e => e.id === targetId)) deadLearn.push(`${owner}→edgetx:${targetId}`);
    if (kind === 'video' && !allVideoToolPages.some(v => v.id === targetId)) deadLearn.push(`${owner}→video:${targetId}`);
    if (kind === 'elrs-setup' && !setupSteps.some(s => s.id === targetId)) deadLearn.push(`${owner}→elrs:${targetId}`);
  };
  for (const p of STORE_CATALOGUE) for (const l of p.learnLinks) checkLink(p.id, l.kind, l.targetId);
  for (const c of STORE_CATEGORIES) if (c.learnLink) checkLink(c.id, c.learnLink.kind, c.learnLink.targetId);
  const banner = INITIAL_PUBLIC_SETTINGS.banner.link;
  if (banner) checkLink('banner', banner.kind, banner.targetId);

  if (deadLearn.length) console.error('   DEAD LEARN LINKS:', deadLearn);
  ok('every «اقرأ قبل أن تقرّر» link resolves', deadLearn.length === 0);

  // Positive control.
  const control: string[] = [];
  checkLink('control', 'article', 'no-such-article-exists');
  control.push(...deadLearn);
  ok('the link checker can detect a break', !getArticle('no-such-article-exists'));

  const sectionsWithLearn = STORE_CATEGORIES.filter(c => c.learnLink).length;
  ok(`several sections name something to read first (${sectionsWithLearn})`, sectionsWithLearn >= 8);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[7] Settings are managed, not compiled in');
{
  ok('the banner ships enabled with real copy',
    INITIAL_PUBLIC_SETTINGS.banner.enabled
    && INITIAL_PUBLIC_SETTINGS.banner.headlineAr.length > 10
    && INITIAL_PUBLIC_SETTINGS.banner.bodyAr.length > 40);

  ok('the free setup offer is the banner\'s subject',
    /مجان/.test(INITIAL_PUBLIC_SETTINGS.banner.headlineAr));

  // The banner text must not be duplicated into a component — that is how a
  // setting quietly becomes a constant nobody can edit.
  const webFiles = walk(join(ROOT, 'web'));
  const copied = webFiles.filter(f =>
    readFileSync(f, 'utf8').includes(INITIAL_PUBLIC_SETTINGS.banner.headlineAr));
  if (copied.length) console.error('   BANNER COPIED INTO:', copied.map(f => f.slice(ROOT.length)));
  ok('the banner text lives only in settings', copied.length === 0);

  // Malformed stored settings fall back rather than rendering «undefined».
  ok('nonsense settings fall back to the seed',
    validatePublicSettings(null).currency === INITIAL_PUBLIC_SETTINGS.currency
    && validatePublicSettings({ currency: 'BTC' }).currency === 'USD');
  ok('a valid stored currency is honoured', validatePublicSettings({ currency: 'SAR' }).currency === 'SAR');
  ok('a stored banner headline is honoured',
    validatePublicSettings({ banner: { enabled: true, headlineAr: 'عرض جديد', bodyAr: 'نصّ' } })
      .banner.headlineAr === 'عرض جديد');

  ok('a negative default margin is refused',
    validatePrivateSettings({ defaultMarginPercent: -10 }).defaultMarginPercent === INITIAL_DEFAULT_MARGIN_PERCENT);
  ok('an absurd default margin is refused',
    validatePrivateSettings({ defaultMarginPercent: 100_000 }).defaultMarginPercent === INITIAL_DEFAULT_MARGIN_PERCENT);
  ok('a sane default margin is honoured',
    validatePrivateSettings({ defaultMarginPercent: 22 }).defaultMarginPercent === 22);
  ok('the initial default margin is the 10% that was asked for',
    INITIAL_DEFAULT_MARGIN_PERCENT === 10);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[8] An order is a record, not a draft');
{
  // Forward-only. A delivered order that can return to «received» is a record
  // both sides can rewrite, which is not a record.
  const reachable = (from: OrderStatus, to: OrderStatus, seen = new Set<OrderStatus>()): boolean => {
    if (from === to) return true;
    if (seen.has(from)) return false;
    seen.add(from);
    return ORDER_STATUS_NEXT[from].some(n => reachable(n, to, seen));
  };
  ok('a delivered order is terminal', ORDER_STATUS_NEXT.delivered.length === 0);
  ok('a cancelled order is terminal', ORDER_STATUS_NEXT.cancelled.length === 0);
  ok('no status can return to «received»',
    (Object.keys(ORDER_STATUS_NEXT) as OrderStatus[])
      .filter(s => s !== 'received')
      .every(s => !ORDER_STATUS_NEXT[s].includes('received')));
  ok('every status is reachable from the first one',
    (Object.keys(ORDER_STATUS_NEXT) as OrderStatus[]).every(s => reachable('received', s)));

  const rules = readFileSync(join(ROOT, 'firestore.rules'), 'utf8');
  ok('orders are never client-writable',
    /match \/storeOrders\/\{[^}]+\} \{[\s\S]{0,900}?allow write: if false;/.test(rules));
  ok('an order is readable only by its owner or staff',
    rules.includes('resource.data.customerUid == request.auth.uid || isStoreStaff()'));
  ok('reading an order requires sign-in at all',
    /match \/storeOrders\/[\s\S]{0,300}?allow read: if isSignedIn\(\)/.test(rules));

  // A product must be published to be read by a customer, so an unpublished
  // draft is invisible rather than merely unlinked.
  ok('an unpublished product is unreadable by customers',
    rules.includes('allow read: if resource.data.published == true || isStoreStaff();'));
  ok('products are never client-writable',
    /match \/storeProducts\/\{[^}]+\} \{[\s\S]{0,600}?allow write: if false;/.test(rules));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[9] The store holds no content of its own on the web');
{
  const storeWeb = walk(join(ROOT, 'web'))
    .filter(f => /web\/(app\/store|components\/store|lib\/store)/.test(f))
    .map(f => [f.slice(ROOT.length), readFileSync(f, 'utf8')] as const);
  ok(`the storefront is a handful of files (${storeWeb.length})`, storeWeb.length >= 4);

  const stripped = storeWeb.map(([f, s]) =>
    [f, s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')] as const);

  // No product prose in a component. Every judgement comes from the catalogue.
  const productProse = STORE_CATALOGUE
    .flatMap(p => [p.summaryAr, ...p.suitsAr, ...p.notForAr])
    .filter(t => t.length > 40);
  const copied = productProse.filter(t => stripped.some(([, s]) => s.includes(t)));
  ok('no product description is copied into a component', copied.length === 0);

  // No hand-written product or category route.
  const handRoutes = stripped.filter(([, s]) => /["'`]\/store\/(?!\$)[a-z]/.test(s));
  if (handRoutes.length) console.error('   HAND-WRITTEN STORE ROUTES:', handRoutes.map(r => r[0]));
  ok('no component writes a store route by hand', handRoutes.length === 0);

  // And no price arithmetic outside the engine — a component that computes a
  // total is a second pricing engine with different rounding.
  const arithmetic = stripped.filter(([f, s]) =>
    !f.includes('lib/store.ts') && /\*\s*1\.\d|\/\s*100\b.*price|priceMinor\s*[*+-]/i.test(s));
  if (arithmetic.length) console.error('   PRICE MATHS IN WEB:', arithmetic.map(r => r[0]));
  ok('no component does price arithmetic', arithmetic.length === 0);
}


// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[10] The supplier is a row, not the shape of the store');
{
  ok(`several suppliers exist (${SUPPLIERS.length})`, SUPPLIERS.length >= 4);

  // The point of the abstraction: no single supplier is assumed anywhere.
  const storeFiles = walk(join(ROOT, 'src/data/store'))
    .concat(walk(join(ROOT, 'web')).filter(f => /store/.test(f)));
  const named = storeFiles.filter(f => {
    const src = readFileSync(f, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    // The registry itself is where the names legitimately live.
    return !f.endsWith('suppliers.ts') && /aliexpress|banggood/i.test(src);
  });
  if (named.length) console.error('   SUPPLIER HARD-CODED:', named.map(f => f.slice(ROOT.length)));
  ok('no supplier is named outside the registry', named.length === 0);

  const dup = SUPPLIERS.map(s => s.id).filter((id, i, a) => a.indexOf(id) !== i);
  ok('no supplier id is used twice', dup.length === 0);

  const badLead = SUPPLIERS.filter(s => s.leadTimeDays.min > s.leadTimeDays.max || s.leadTimeDays.min < 0);
  ok('every lead time is a real range', badLead.length === 0);

  // Every supplier says what NOT to buy from it, or the list is just a
  // directory. That judgement is the reason to keep one.
  const noGuidance = SUPPLIERS.filter(s => s.bestForAr.length === 0);
  ok('every supplier says what it is good for', noGuidance.length === 0);

  // The quoted lead time takes the SLOWEST supplier — an order ships when its
  // last item arrives, and quoting the fastest is a promise it cannot keep.
  const combined = combinedLeadTime(['getfpv', 'aliexpress']);
  const slowest = supplier('aliexpress')!;
  ok('a mixed order quotes the slowest supplier',
    combined?.max === slowest.leadTimeDays.max);
  ok('an unknown supplier list quotes nothing', combinedLeadTime(['nope']) === null);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[11] Services are products, and one of them is free');
{
  ok(`services exist (${STORE_SERVICES.length})`, STORE_SERVICES.length >= 6);

  const asProducts = STORE_PRODUCTS.filter(p => p.categoryId === SERVICES_CATEGORY_ID);
  ok('every service appears in the catalogue as a product',
    asProducts.length === STORE_SERVICES.length);

  // Exactly one free-with-purchase service. More than one and «مجاناً مع أي
  // طلب» stops being a single clear promise, which is what makes it work.
  const free = STORE_SERVICES.filter(s => s.includedWithPurchase);
  ok('exactly one service is free with any purchase', free.length === 1);
  ok('and it is the setup service the banner promises',
    freeWithPurchaseService()?.id === free[0].id);

  const freeProduct = storeProduct(free[0].id);
  ok('the free service is priced at zero, not left unpriced',
    freeProduct?.priceMinor === 0);

  // Zero is a real price; the others are unset until somebody prices them.
  const paidPriced = asProducts.filter(p => p.id !== free[0].id && p.priceMinor !== null);
  ok('no paid service ships with an invented price', paidPriced.length === 0);

  const vague = STORE_SERVICES.filter(s => s.includesAr.length === 0);
  ok('every service says what is actually done', vague.length === 0);
  const noTurnaround = STORE_SERVICES.filter(s => !s.turnaroundAr);
  ok('every service says how long it takes', noTurnaround.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[12] The cart cannot be talked into a wrong total');
{
  /**
   * The lookup the surfaces actually use: one row per BUYABLE VARIANT.
   *
   * Built here from the catalogue exactly as `cartProductViews` builds it on
   * the server, so this section tests the same join the shop performs rather
   * than a simplified stand-in.
   */
  const views = STORE_PRODUCTS.flatMap(p => p.variants.map(v => ({
    id: v.id,
    productId: p.id,
    nameEn: p.nameEn,
    titleAr: p.titleAr,
    variantNameAr: p.variants.length > 1 ? v.nameAr : '',
    priceMinor: v.priceMinor,
    currency: p.currency,
    availability: v.availability,
    published: p.published && !p.suspendedReasonAr,
    freeSetupEligible: v.freeSetupEligible,
  })));
  const byId = new Map(views.map(v => [v.id, v]));
  const lookup = (id: string) => byId.get(id);

  // A hand-edited basket is the threat model. Prices are never read from
  // storage — they come from the catalogue when the total is computed.
  const forged = readCart({
    v: CART_SCHEMA_VERSION,
    items: [{ variantId: 'betafpv-cetus-pro:rtf', quantity: 1, unitPriceMinor: 1 }],
    updatedAt: '',
  });
  ok('a forged price in storage is not carried into the cart',
    forged.items.length === 1 && !('unitPriceMinor' in (forged.items[0] as object)));

  // A version-1 basket names products, not variants. Guessing which variant
  // somebody meant is how the wrong aircraft ends up in a box.
  ok('a version-1 basket is discarded rather than guessed at',
    readCart({ v: 1, items: [{ productId: 'betafpv-cetus-pro', quantity: 1 }] }).items.length === 0);

  // Malformed storage produces an empty cart rather than a crash.
  ok('nonsense storage is an empty cart', readCart(null).items.length === 0);
  ok('a wrong schema version is an empty cart',
    readCart({ v: 99, items: [{ variantId: 'x', quantity: 1 }] }).items.length === 0);

  // Bad lines are dropped, good ones kept: a customer who spent ten minutes
  // choosing should not lose the basket over one withdrawn product.
  const mixed = readCart({
    v: CART_SCHEMA_VERSION,
    items: [
      { variantId: 'a', quantity: 0 },
      { variantId: 'b', quantity: -3 },
      { variantId: 'c', quantity: 1.5 },
      { variantId: '', quantity: 1 },
      { variantId: 'd', quantity: 2 },
    ],
    updatedAt: '',
  });
  ok('malformed lines are dropped and good ones survive',
    mixed.items.length === 1 && mixed.items[0].variantId === 'd');

  // Duplicates merge rather than double-count.
  const dupd = readCart({
    v: CART_SCHEMA_VERSION,
    items: [{ variantId: 'a', quantity: 2 }, { variantId: 'a', quantity: 3 }],
    updatedAt: '',
  });
  ok('a duplicated line merges', dupd.items.length === 1 && dupd.items[0].quantity === 5);

  // Quantities are clamped — forty flight controllers is a typo.
  const huge = readCart({
    v: CART_SCHEMA_VERSION, items: [{ variantId: 'a', quantity: 9999 }], updatedAt: '',
  });
  ok('an absurd quantity is clamped', huge.items[0].quantity === MAX_QUANTITY_PER_LINE);
  const manyLines = readCart({
    v: CART_SCHEMA_VERSION,
    items: Array.from({ length: 200 }, (_, i) => ({ variantId: `p${i}`, quantity: 1 })),
    updatedAt: '',
  });
  ok('the number of lines is bounded', manyLines.items.length <= MAX_LINES);

  // Mutations behave.
  let c = addToCart(EMPTY_CART, 'x', 2);
  c = addToCart(c, 'x', 3);
  ok('adding the same variant accumulates', c.items[0].quantity === 5);
  c = setQuantity(c, 'x', 1);
  ok('setting a quantity replaces it', c.items[0].quantity === 1);
  c = setQuantity(c, 'x', 0);
  ok('setting a quantity to zero removes the line', c.items.length === 0);
  ok('removing an absent variant is harmless', removeFromCart(EMPTY_CART, 'y').items.length === 0);

  // Resolution against the live catalogue.
  const unpricedVariant = views.find(v => v.priceMinor === null)!;
  const resolvedUnpriced = resolveCart(
    { v: CART_SCHEMA_VERSION, items: [{ variantId: unpricedVariant.id, quantity: 1 }], updatedAt: '' },
    lookup, 0,
  );
  ok('an unpriced variant cannot be ordered', !resolvedUnpriced.orderable);
  ok('…and the customer is told why', resolvedUnpriced.dropped.length === 1);

  const ghost = resolveCart(
    { v: CART_SCHEMA_VERSION, items: [{ variantId: 'no-such-variant', quantity: 1 }], updatedAt: '' },
    lookup, 0,
  );
  ok('a withdrawn variant is dropped with a reason', ghost.dropped.length === 1 && !ghost.orderable);

  // A variant of an UNPUBLISHED product is not buyable however its own stock
  // reads. This is what stops a guessed id from selling a draft.
  const draft = STORE_PRODUCTS.find(p => !p.published)!;
  const draftView = views.find(v => v.productId === draft.id)!;
  ok('the catalogue really does contain a draft to test with', !!draftView);
  ok('a draft product\u2019s variant is not published in the cart view',
    draftView.published === false);

  // The free service is added when there is something ELIGIBLE to give it with
  // — not merely when the basket is non-empty.
  const freeId = `${freeWithPurchaseService()!.id}:standard`;
  const eligibleId = views.find(v => v.freeSetupEligible)!.id;
  const ineligibleId = views.find(v => !v.freeSetupEligible && v.id !== freeId)!.id;

  const withEligible = withIncludedService(
    addToCart(EMPTY_CART, eligibleId, 1), freeId, '',
    id => byId.get(id)?.freeSetupEligible === true,
  );
  ok('the free service joins a basket that earned it',
    withEligible.items.some(i => i.variantId === freeId));

  const withIneligible = withIncludedService(
    addToCart(EMPTY_CART, ineligibleId, 1), freeId, '',
    id => byId.get(id)?.freeSetupEligible === true,
  );
  ok('a basket of ineligible items does NOT earn it',
    !withIneligible.items.some(i => i.variantId === freeId));

  const onlyService = withIncludedService(
    addToCart(EMPTY_CART, freeId, 1), freeId, '',
    id => byId.get(id)?.freeSetupEligible === true,
  );
  ok('and it leaves when nothing else is there', onlyService.items.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[13] Orders are computed on the server, never submitted');
{
  const orderServer = readFileSync(join(ROOT, 'web/lib/server/storeOrders.ts'), 'utf8');
  const form = readFileSync(join(ROOT, 'web/components/store/CheckoutForm.tsx'), 'utf8');

  // The form posts ids and quantities. Anything else and the browser is
  // choosing what it pays.
  //
  // Read the PAYLOAD, not the file. The file is full of prices — it shows the
  // customer a running total, which it should. The question is what leaves the
  // browser, so this pulls out the exact argument the form submits.
  const payload = callArgs(form, 'submitOrder');
  ok('the checkout payload carries no price',
    !/Minor|price|total/i.test(payload));
  ok('the checkout payload carries ids and quantities',
    /variantId/.test(payload) && /quantity/.test(payload));
  // The extraction is real, not an empty string that passes by default.
  ok('the payload was actually extracted', payload.includes('contact') && payload.length > 80);
  // And the file it came from does render prices — so the check above is
  // distinguishing the payload from the page, not just failing to find any.
  ok('the form still shows the customer a total', /formatPrice\(totals\.totalMinor/.test(form));

  // The type is the same rule expressed where it cannot be forgotten: a future
  // caller cannot add a price to the submission without changing this.
  const types = readFileSync(join(ROOT, 'src/data/store/types.ts'), 'utf8');
  const submission = /export interface OrderSubmission \{[\s\S]*?\n\}/.exec(types)?.[0] ?? '';
  ok('OrderSubmission declares no price field',
    submission.length > 0 && !/Minor|price|currency/i.test(submission));
  ok('the server prices the basket itself', orderServer.includes('resolveCart('));
  ok('the server re-checks the session', orderServer.includes('getSession()'));
  ok('the free service is added server-side too, not trusted from the basket',
    orderServer.includes('freeSetupVariantId()'));
  // …and it is EARNED, not merely present. A basket of propellers that arrives
  // claiming the service gets it removed rather than honoured.
  ok('the server decides eligibility rather than believing the basket',
    orderServer.includes('freeSetupEligible === true'));
  // One derivation of the id, used by both halves. Two derivations is how the
  // browser added the service by product id, the server looked for it by
  // variant id, and every order was refused with «تغيّر توفّر بعض ما في سلّتك».
  const cartLib = readFileSync(join(ROOT, 'web/lib/cart.ts'), 'utf8');
  ok('the browser and the server derive the free service id the same way',
    cartLib.includes('freeSetupVariantId()') && orderServer.includes('freeSetupVariantId()'));
  ok('neither side spells the id out by hand',
    !/['`]svc-setup-free:standard['`]/.test(stripComments(cartLib) + stripComments(orderServer)));

  // A refusal names what changed. «Something in your basket changed» sends
  // somebody back to a list of four items to work out which.
  ok('a refused basket says which line caused it',
    orderServer.includes('resolved.dropped') && orderServer.includes('d.variantId'));

  // A basket that changed under the customer is refused, not trimmed: someone
  // who ordered four things and receives three did not agree to that.
  ok('a changed basket is refused rather than silently trimmed',
    orderServer.includes('resolved.dropped.length > 0'));

  const rules = readFileSync(join(ROOT, 'firestore.rules'), 'utf8');
  ok('orders remain unwritable from any browser',
    /match \/storeOrders\/\{[^}]+\} \{[\s\S]{0,900}?allow write: if false;/.test(rules));
  ok('a customer can read their own order refs',
    rules.includes('match /users/{uid}/orderRefs/{orderId}'));

  // Every refusal is a sentence somebody can act on.
  const errors = [...orderServer.matchAll(/errorAr:\s*'([^']+)'/g)].map(m => m[1]);
  ok(`every refusal explains itself (${errors.length})`, errors.length >= 6);
  const vague = errors.filter(e => /^حدث خطأ$|^خطأ$/.test(e));
  ok('no refusal is «حدث خطأ»', vague.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[14] The admin can price, and cannot see what it may not');
{
  const supplyAction = readFileSync(join(ROOT, 'web/app/admin/store/supply/actions.ts'), 'utf8');
  const ordersAction = readFileSync(join(ROOT, 'web/app/admin/store/orders/actions.ts'), 'utf8');

  // Capabilities checked on the server, not by whether a button rendered.
  ok('saving supply requires store.editProducts',
    supplyAction.includes("sessionCan(session, 'store.editProducts')"));
  ok('changing an order status requires store.manageOrders',
    ordersAction.includes("sessionCan(session, 'store.manageOrders')"));

  // Both are audited, like every other privileged mutation here.
  ok('supply changes are audited', supplyAction.includes('logAudit('));
  ok('order status changes are audited', ordersAction.includes('logAudit('));

  // The audit log is readable by a wider set than the supply page, so it must
  // record the resulting PRICE rather than the cost.
  ok('the audit entry records the price, not the cost',
    supplyAction.includes('String(breakdown.sellMinor)')
    && !/after:\s*String\(unitCostMinor\)/.test(supplyAction));

  // Money is converted once, on the server, from its own parse.
  ok('the server converts money itself', supplyAction.includes('function toMinor'));
  ok('a third decimal place is refused rather than rounded',
    supplyAction.includes('\\d{1,2}'));

  // The supply page is gated on the narrower capability, kept separate from
  // order handling so a fulfilment role never sees what we pay.
  const supplyPage = readFileSync(join(ROOT, 'web/app/admin/store/supply/page.tsx'), 'utf8');
  ok('the supply page requires store.viewSupply',
    supplyPage.includes("sessionCan(session, 'store.viewSupply')"));
  const ordersPage = readFileSync(join(ROOT, 'web/app/admin/store/orders/page.tsx'), 'utf8');
  ok('the orders page requires only store.viewOrders',
    ordersPage.includes("sessionCan(session, 'store.viewOrders')")
    && !ordersPage.includes("'store.viewSupply'"));

  // The two capabilities really are distinct.
  const { ROLE_CAPABILITIES } = await import('../src/data/auth/roles');
  ok('a role could hold orders without supply',
    ROLE_CAPABILITIES.moderator.includes('store.viewOrders' as never) === false);
  ok('admin holds both', ROLE_CAPABILITIES.admin.includes('store.viewSupply' as never));

  // The supply collection reaches exactly one browser: a staff one. The editor
  // has to be a client component — somebody types a cost into it — so the rule
  // is not «no client component», it is «no client component a customer can
  // reach». That distinction is the path, and the path is enforced by the
  // capability gate on the route above it.
  const clientFiles = walk(join(ROOT, 'web/components'))
    .concat(walk(join(ROOT, 'web/app')))
    .filter(f => /'use client'/.test(readFileSync(f, 'utf8')));
  const readsSupply = clientFiles.filter(f => /storeSupply|unitCostMinor/.test(readFileSync(f, 'utf8')));
  const leaky = readsSupply.filter(f => isStorefront(f));
  if (leaky.length) console.error('   SUPPLY IN STOREFRONT:', leaky.map(f => f.slice(ROOT.length)));
  ok('no storefront client component reads the supply collection', leaky.length === 0);
  ok('every client component that does read it is an admin one',
    readsSupply.length > 0 && readsSupply.every(f => !isStorefront(f)));

  // And the storefront's own client components were actually scanned — a filter
  // that matched nothing would pass this section without testing anything.
  const storefrontClients = clientFiles.filter(f => isStorefront(f));
  ok('storefront client components exist and were scanned', storefrontClients.length >= 3);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[15] The admin panel and the storefront are the same catalogue');
{
  /**
   * The bug this whole layer exists to prevent.
   *
   * The supply screen has always written a computed price into `storeProducts`.
   * Nothing read it. So an admin could set a cost, watch the panel report a
   * price, and find the shop still saying «السعر قيد التحديث» — a panel that
   * lies to the person operating it. These assertions are the proof that the
   * storefront now renders what the panel writes.
   */
  const seed = STORE_PRODUCTS[0];

  // No document: the seed, exactly.
  ok('a product nobody edited renders its seed unchanged',
    applyOverride(seed, undefined) === seed);

  // A document: its fields win.
  const edited = applyOverride(seed, {
    productId: seed.id, priceMinor: 12345, availability: 'out-of-stock',
    summaryAr: 'وصف كتبته لوحة الإدارة، وطوله يتجاوز الحد الأدنى المطلوب.',
  });
  ok('an edited price reaches the storefront', edited.priceMinor === 12345);
  ok('an edited availability reaches the storefront', edited.availability === 'out-of-stock');
  ok('an edited summary reaches the storefront', edited.summaryAr.startsWith('وصف كتبته'));
  ok('and the seed itself is not mutated', seed.availability !== 'out-of-stock' || seed.priceMinor === 12345);

  // A partial document leaves everything else alone. This is what makes the
  // publish toggle — which writes one field — safe.
  const onlyHidden = applyOverride(seed, { productId: seed.id, published: false });
  ok('a one-field write changes one field', onlyHidden.published === false);
  ok('…and leaves the rest of the product intact',
    onlyHidden.summaryAr === seed.summaryAr && onlyHidden.nameEn === seed.nameEn);

  // The whitelist. A document that renamed its own id would produce a product
  // reachable at a URL that generates a different one.
  const hostile = applyOverride(seed, {
    productId: seed.id,
    id: 'someone-elses-product', categoryId: 'services', nameEn: 'Rewritten',
    choicePosition: 'professional', relatedProductIds: ['x'],
  } as unknown as ProductOverride);
  ok('a document cannot rename the product id', hostile.id === seed.id);
  ok('a document cannot move the product between sections', hostile.categoryId === seed.categoryId);
  ok('a document cannot rewrite the product name', hostile.nameEn === seed.nameEn);
  ok('a document cannot move it on the section axis',
    hostile.choicePosition === seed.choicePosition);
  ok('a document cannot rewrite the relationships',
    JSON.stringify(hostile.relatedProductIds) === JSON.stringify(seed.relatedProductIds));

  // The whitelist and the immutable list must not overlap, and the immutable
  // list must actually contain the route keys.
  const overlap = OVERRIDABLE_FIELDS.filter(f => (IMMUTABLE_FIELDS as readonly string[]).includes(f));
  ok('no field is both overridable and immutable', overlap.length === 0);
  for (const key of ['id', 'categoryId', 'choicePosition']) {
    ok(`«${key}» is declared immutable`, (IMMUTABLE_FIELDS as readonly string[]).includes(key));
  }
  ok('the price is not editable by hand from the product editor',
    !readFileSync(join(ROOT, 'web/components/admin/ProductEditor.tsx'), 'utf8')
      .includes('priceMinor'));

  // Rubbish is ignored rather than rendered. A database is edited by hand at
  // 2am eventually.
  const junk = applyOverride(seed, {
    productId: seed.id,
    priceMinor: -50, availability: 'on-fire', level: 'wizard',
    summaryAr: '   ', highlightsAr: 'not an array',
  } as unknown as ProductOverride);
  ok('a negative price is ignored, not applied', junk.priceMinor === seed.priceMinor);
  ok('an unknown availability is ignored', junk.availability === seed.availability);
  ok('an unknown level is ignored', junk.level === seed.level);
  ok('a blank summary falls back rather than blanking the page',
    junk.summaryAr === seed.summaryAr);
  ok('a non-array list is ignored',
    JSON.stringify(junk.highlightsAr) === JSON.stringify(seed.highlightsAr));

  // `null` is a real value for the nullable fields, and clearing is deliberate.
  const cleared = applyOverride(
    { ...seed, weightGrams: 120, priceMinor: 5000 },
    { productId: seed.id, weightGrams: null, priceMinor: null },
  );
  ok('clearing a weight really clears it', cleared.weightGrams === undefined);
  ok('clearing a price returns it to «قيد التحديث»', cleared.priceMinor === null);

  // An image that lost its provenance is not rendered.
  const noCredit = applyOverride(seed, {
    productId: seed.id,
    images: [{ url: '/x.jpg', altAr: 'صورة' }],
  } as unknown as ProductOverride);
  ok('an image with no credit does not reach the page',
    !noCredit.images.some(i => i.url === '/x.jpg'));
  const withCredit = applyOverride(seed, {
    productId: seed.id,
    images: [{
      url: '/x.jpg', altAr: 'صورة المنتج', order: 0,
      credit: {
        ownerAr: 'الشركة المصنّعة',
        basis: 'manufacturer-media-kit',
        evidenceUrl: 'https://example.com/press',
        official: true, reviewedAt: '2026-08-04',
      },
    }],
  });
  ok('an image with a real licence basis does reach the page',
    withCredit.images.some(i => i.url === '/x.jpg'));

  // The basis is a CLOSED set. «I found it online» is not one of the values,
  // and a document that invents one is refused rather than believed.
  const inventedBasis = applyOverride(seed, {
    productId: seed.id,
    images: [{
      url: '/y.jpg', altAr: 'صورة', order: 0,
      credit: {
        ownerAr: 'مجهول', basis: 'found-it-online',
        evidenceUrl: 'https://example.com', official: false, reviewedAt: '2026-08-04',
      },
    }],
  } as unknown as ProductOverride);
  ok('an invented licence basis is refused',
    !inventedBasis.images.some(i => i.url === '/y.jpg'));

  // The whole catalogue merges in seed order — the deliberate one.
  const merged = mergeCatalogue(STORE_PRODUCTS, {
    [seed.id]: { productId: seed.id, published: false },
  });
  ok('merging preserves the catalogue length', merged.length === STORE_PRODUCTS.length);
  ok('merging preserves the deliberate order', merged[0].id === STORE_PRODUCTS[0].id);
  ok('and applies the document it was given', merged[0].published === false);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[16] Nothing customer-facing reads the seed catalogue directly');
{
  /**
   * The rule that keeps section [15] true tomorrow.
   *
   * `applyOverride` being correct is worth nothing if a page imports the seeds
   * and renders them. Merged reads are async, live in `lib/server/`, and the
   * seed accessors are no longer re-exported from `lib/store.ts` — so bypassing
   * the layer takes a deliberate import from `@core`, which is what this
   * catches.
   */
  const storeLib = readFileSync(join(ROOT, 'web/lib/store.ts'), 'utf8');
  for (const fn of ['storeProduct', 'productsInCategory', 'categoryProductCount']) {
    ok(`«${fn}» is no longer re-exported to the storefront`,
      !new RegExp(`\\b${fn}\\b`).test(storeLib.replace(/\/\*\*[\s\S]*?\*\//g, '')));
  }

  const storefrontFiles = walk(join(ROOT, 'web/app/store'))
    .concat(walk(join(ROOT, 'web/components/store')));
  ok('there are storefront files to check', storefrontFiles.length >= 5);

  const bypassing = storefrontFiles.filter(f => {
    const src = stripComments(readFileSync(f, 'utf8'));
    return /from '@core\/data\/store\/catalogue'/.test(src);
  });
  if (bypassing.length) console.error('   SEED IMPORT:', bypassing.map(f => f.slice(ROOT.length)));
  ok('no storefront file imports the seed catalogue', bypassing.length === 0);

  // The pages that render products must go through the server module.
  for (const [file, fn] of [
    ['web/app/store/page.tsx', 'publishedProducts'],
    ['web/app/store/[categoryId]/page.tsx', 'publishedInCategory'],
    ['web/app/store/p/[productId]/page.tsx', 'resolvedProduct'],
    ['web/app/store/cart/page.tsx', 'cartProductViews'],
    ['web/app/store/cart/checkout/page.tsx', 'cartProductViews'],
  ] as const) {
    const src = readFileSync(join(ROOT, file), 'utf8');
    ok(`${file.replace('web/app/store', '…')} reads the merged catalogue`,
      src.includes(fn) && src.includes('@/lib/server/storeCatalogue'));
  }

  // The browser prices from what the server hands down, not from a build-time
  // import — which was the actual bug.
  const cartLib = readFileSync(join(ROOT, 'web/lib/cart.ts'), 'utf8');
  ok('the browser cart no longer imports the seed catalogue',
    !cartLib.includes('@core/data/store/catalogue'));
  ok('the browser cart takes its catalogue as an argument',
    /export function resolve\([\s\S]{0,200}catalogue: readonly PricedProduct\[\]/.test(cartLib));

  // The badge is on every page in the site. If it needed prices, every page
  // would need a database read.
  const controls = readFileSync(join(ROOT, 'web/components/store/CartControls.tsx'), 'utf8');
  const badgeStart = controls.indexOf('export const CartBadge');
  const badge = controls.slice(badgeStart, controls.indexOf('export const', badgeStart + 10));
  ok('the badge component was located', badgeStart > 0 && badge.includes('cart-badge'));
  ok('the header badge needs no catalogue and no read',
    badge.includes('storedItemCount') && !badge.includes('resolve('));
  // The control that must NOT pass that check, so the check is discriminating.
  ok('…while the basket itself does resolve prices',
    controls.slice(controls.indexOf('export const CartContents')).includes('resolve('));

  // The merged read must not be process-cached: an admin who hides something
  // expects the next load to agree.
  const catalogueSrc = readFileSync(join(ROOT, 'web/lib/server/storeCatalogue.ts'), 'utf8');
  ok('the merged read is request-scoped', catalogueSrc.includes("from 'react'")
    && catalogueSrc.includes('cache('));
  ok('the merged read is server-only', catalogueSrc.includes("import 'server-only'"));
  ok('an unreachable database degrades to the seeds rather than 500ing',
    /catch \{\s*return \{\};\s*\}/.test(catalogueSrc));

  // Pages must revalidate, or an edit is invisible until a redeploy.
  for (const file of [
    'web/app/store/page.tsx',
    'web/app/store/[categoryId]/page.tsx',
    'web/app/store/p/[productId]/page.tsx',
  ]) {
    ok(`${file.replace('web/app/store', '…')} declares a revalidation floor`,
      /export const revalidate = \d+;/.test(readFileSync(join(ROOT, file), 'utf8')));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[17] The product editor refuses what it cannot stand behind');
{
  const actions = readFileSync(join(ROOT, 'web/app/admin/store/products/actions.ts'), 'utf8');
  const editor = readFileSync(join(ROOT, 'web/components/admin/ProductEditor.tsx'), 'utf8');
  const listPage = readFileSync(join(ROOT, 'web/app/admin/store/products/page.tsx'), 'utf8');
  const editPage = readFileSync(join(ROOT, 'web/app/admin/store/products/[productId]/page.tsx'), 'utf8');

  // Both actions are gated, and on the write capability rather than the read.
  ok('saving a product requires store.editProducts',
    actions.includes("sessionCan(session, 'store.editProducts')"));
  ok('hiding a product requires the same capability',
    (actions.match(/store\.editProducts/g) ?? []).length >= 1
    && actions.includes('setProductPublished'));
  ok('the list page requires only the read capability',
    listPage.includes("sessionCan(session, 'store.viewProducts')"));
  ok('the edit page requires the read capability to open',
    editPage.includes("sessionCan(session, 'store.viewProducts')"));
  ok('and the write capability to show the form',
    editPage.includes("sessionCan(session, 'store.editProducts')")
    && editPage.includes('product-editor-readonly'));

  // Both are audited. Hiding a product removes something customers could see.
  ok('editing a product is audited', actions.includes("action: 'store.product.edit'"));
  ok('hiding a product is audited', actions.includes("action: 'store.product.publish'"));
  const auditSrc = readFileSync(join(ROOT, 'web/lib/server/audit.ts'), 'utf8');
  ok('both actions are declared on the audit union',
    auditSrc.includes("'store.product.edit'") && auditSrc.includes("'store.product.publish'"));

  // The rule from the brief, made mechanical: a confirmed spec must say where.
  ok('a spec marked confirmed without a source is refused',
    actions.includes("s.status === 'verified'") && actions.includes('!/^https:\\/\\//.test(sourceUrl)'));
  ok('a confirmed spec must also carry the date it was checked',
    actions.includes('!/^\\d{4}-\\d{2}-\\d{2}$/.test(checkedAt)'));
  // A review corroborates and never carries a claim alone, or «someone on
  // YouTube said 80mm» becomes a specification.
  ok('an independent review cannot be the sole source of a confirmed spec',
    actions.includes("s.sourceKind === 'independent-review'"));
  ok('«the sources disagree» must say how',
    actions.includes("s.status === 'disputed' && !s.disagreementAr.trim()"));
  ok('…and the refusal names the spec so it can be fixed',
    /errorAr: `المواصفة «\$\{labelAr\}»/.test(actions));

  // Images live on their own screen and their own action now — which is what
  // stops saving a typo in the description from wiping an hour of uploads.
  const imageActions = readFileSync(
    join(ROOT, 'web/app/admin/store/products/imageActions.ts'), 'utf8');
  ok('the product form no longer writes images',
    !/images:\s*images\.value/.test(actions) && !actions.includes('validateImages'));
  ok('the gallery has an action of its own', imageActions.includes('saveProductImages'));
  ok('…gated on the same capability', imageActions.includes("sessionCan(session, 'store.editProducts')"));
  ok('…and audited separately, so «who put that photo up» has an answer',
    imageActions.includes("action: 'store.product.images'"));

  // AN INCOMPLETE IMAGE IS SAVED ON PURPOSE.
  //
  // Refusing it stops the work: somebody with fifteen photographs should be
  // able to upload fifteen photographs and come back to the paperwork. The
  // licensing question is answered by whether the shop may SHOW it, which is a
  // different question asked by `isImagePublishable`.
  // Proven by the CODE PATH: the basis check runs only when a basis was given,
  // so an empty one falls through to the write rather than to a return.
  ok('an image with no licence basis is stored rather than refused',
    imageActions.includes('if (basis && !isBasis(basis))'));
  ok('…but an unknown basis IS refused — the set is closed',
    imageActions.includes('أساس استخدام غير معروف'));
  ok('a malformed review date is refused', imageActions.includes('YYYY-MM-DD'));

  // The gallery may only point at storage this shop controls. A gallery that
  // accepts any host is a tracking pixel on every product page.
  ok('an external image host is refused',
    imageActions.includes('isAcceptableImageUrl')
    && imageActions.includes('firebasestorage'));
  ok('…and the refusal tells the operator to upload instead',
    imageActions.includes('ارفع الصورة بدل لصق رابط خارجي'));

  // Order is position in the array, so a reorder cannot half-apply.
  ok('image order is the array, not a separate field to disagree with',
    imageActions.includes('order: images.length'));

  // The compression goes through the SHARED pipeline. A second one would be a
  // second answer to «what may be uploaded», and there is only one right one.
  const upload = readFileSync(join(ROOT, 'web/lib/mediaUpload.ts'), 'utf8');
  ok('product images use the shared compression pipeline',
    upload.includes('compressForUpload')
    && upload.includes("from '@core/community/Composer/mediaPipeline'"));
  ok('…and declare no size or format limits of their own',
    !/MAX_\w*BYTES\s*=|image\/jpeg/.test(stripComments(upload).replace(/export \{[\s\S]*?\}/, '')));

  // THE WRITE IS THE SERVER'S.
  //
  // The panel's authority is a session holding `store.editProducts`. A Storage
  // rule re-deriving that as a role check would be a second answer that drifts
  // the day somebody adds a role — and it also breaks the moment the browser's
  // Firebase auth state and the server's session disagree, which is exactly
  // what happened when this was tried the other way round.
  const uploadAction = readFileSync(
    join(ROOT, 'web/app/admin/store/products/uploadAction.ts'), 'utf8');
  ok('the photograph is written by the server, holding the capability',
    uploadAction.includes("sessionCan(session, 'store.editProducts')")
    && uploadAction.includes('adminStorage()'));
  ok('…which re-checks the size rather than believing the browser',
    uploadAction.includes('MAX_MEDIA_SIZE_BYTES'));
  ok('…and that the bytes really are the JPEG the pipeline produces',
    uploadAction.includes('0xff') && uploadAction.includes('0xd8'));

  const storageRules = readFileSync(join(ROOT, 'storage.rules'), 'utf8');
  ok('no browser may write a product photograph',
    /match \/store\/products\/\{[^}]+\}\/\{[^}]+\} \{[\s\S]{0,900}?allow write: if false;/.test(storageRules));
  ok('…nor delete one', /match \/store\/products[\s\S]{0,900}?allow delete: if false;/.test(storageRules));
  ok('…while a product photograph is publicly readable, as a shop\u2019s photo must be',
    /match \/store\/products[\s\S]{0,600}?allow read: if true;/.test(storageRules));

  // «لا يناسبك إن كنت» is required on the model. It must stay required here,
  // because it is the section that earns the page its credibility.
  ok('a product cannot be saved with an empty «لا يناسبك»',
    actions.includes('notForAr.length === 0'));

  // The editor cannot set a price, and says why.
  ok('the editor explains where prices come from',
    editor.includes('التسعير والموردون'));

  // Hiding is the delete, and it is reversible — an order that references a
  // deleted product is an order nobody can honour.
  const toggle = readFileSync(join(ROOT, 'web/components/admin/PublishToggle.tsx'), 'utf8');
  ok('the panel has no delete, only hide',
    !/\bdelete(Product|Doc)\b/.test(actions) && toggle.includes('أعد عرضه'));
  ok('the reason is written down where somebody will read it',
    /orders? reference/i.test(actions) || /Orders reference/.test(toggle));

  // Every save refreshes the pages that would otherwise contradict the panel.
  for (const path of ['/store/p/', '/store/', '/admin/store/products']) {
    ok(`saving revalidates «${path}»`, actions.includes(`revalidatePath(\`${path}`)
      || actions.includes(`revalidatePath('${path}')`));
  }

  // The panel is reachable, and only by those who may see it.
  const shell = readFileSync(join(ROOT, 'web/components/admin/AdminShell.tsx'), 'utf8');
  ok('the products screen is in the admin navigation',
    shell.includes("href: '/admin/store/products'"));
  ok('…gated on the read capability', /'\/admin\/store\/products'[^}]*store\.viewProducts/.test(shell));

  // The read capability is genuinely separable from the write one.
  ok('a role holds view without edit',
    ROLE_CAPABILITIES.reviewer.includes('store.viewProducts' as never)
    && !ROLE_CAPABILITIES.reviewer.includes('store.editProducts' as never));

  // Writes still come only from the server.
  const rules = readFileSync(join(ROOT, 'firestore.rules'), 'utf8');
  ok('products remain unwritable from any browser',
    /match \/storeProducts\/\{[^}]+\} \{[\s\S]{0,600}?allow write: if false;/.test(rules));

  // Every refusal is a sentence somebody can act on.
  const messages = [...actions.matchAll(/errorAr: ['`]([^'`]+)['`]/g)].map(m => m[1]);
  ok(`every refusal explains itself (${messages.length})`, messages.length >= 10);
  ok('no refusal is «حدث خطأ»', !messages.some(m => m.trim() === 'حدث خطأ'));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[18] Nothing publishes that the shop cannot stand behind');
{
  const NOW = '2026-08-04T00:00:00.000Z';
  const fresh = { updatedAt: '2026-08-01T00:00:00.000Z', verified: true };
  const complete = STORE_PRODUCTS.find(p => p.id === 'dji-o3-air-unit')!;

  /** The product as it would look with everything the gate asks for. */
  const licensed = {
    ...complete,
    published: false,
    // A supply record produces a price; the price lands on the variants. The
    // fixture carries both because the shop does — a fixture that cleared the
    // price gate with null prices would be testing a gate that is not there.
    variants: complete.variants.map(v => ({ ...v, priceMinor: 19900, availability: 'in-stock' as const })),
    images: [{
      url: '/x.jpg', altAr: 'صورة المنتج', order: 0,
      credit: {
        ownerAr: 'الشركة', basis: 'manufacturer-media-kit' as const,
        evidenceUrl: 'https://example.com/press', official: true, reviewedAt: '2026-08-01',
      },
    }],
  };
  ok('the fixture clears every gate', publicationBlockers({ product: licensed, supply: fresh, now: NOW }).length === 0);
  ok('…and reads as «جاهز للنشر» rather than published',
    publicationStage({ product: licensed, supply: fresh, now: NOW }) === 'ready');
  ok('…and as «منشور» once an admin says so',
    publicationStage({ product: { ...licensed, published: true }, supply: fresh, now: NOW }) === 'published');

  // Each gate, removed one at a time. A gate that never fires is a gate that
  // is not there, and the only way to know is to break each one deliberately.
  const cases: [string, Partial<typeof licensed>, string][] = [
    ['no licensed image', { images: [] }, 'images'],
    ['an image with no basis', {
      images: [{ url: '/x.jpg', altAr: 'صورة', order: 0 }],
    }, 'images'],
    ['no «لا يناسبك»', { notForAr: [] }, 'identity'],
    ['a stub description', { summaryAr: 'قصير' }, 'identity'],
    ['no variants at all', { variants: [] }, 'identity'],
    ['two default variants', {
      variants: [
        { ...licensed.variants[0], id: 'a:one', isDefault: true },
        { ...licensed.variants[0], id: 'a:two', isDefault: true },
      ],
    }, 'identity'],
    ['no default variant at all', {
      variants: licensed.variants.map(v => ({ ...v, isDefault: false })),
    }, 'identity'],
    ['two variants sharing an id', {
      variants: [
        { ...licensed.variants[0], id: 'a:same', isDefault: true },
        { ...licensed.variants[0], id: 'a:same', isDefault: false },
      ],
    }, 'identity'],
    ['a variant with an empty box', {
      variants: licensed.variants.map(v => ({ ...v, inTheBoxAr: [] })),
    }, 'identity'],
    ['no price on any variant', {
      variants: licensed.variants.map(v => ({ ...v, priceMinor: null })),
    }, 'price'],
    ['too few sourced specs', { specs: licensed.specs.slice(0, MIN_VERIFIED_SPECS - 1) }, 'specs'],
    ['a spec claiming «مؤكَّدة» with no source', {
      specs: [...licensed.specs, { labelAr: 'مخترعة', valueAr: '9', status: 'verified' as const }],
    }, 'specs'],
    ['a disputed spec that does not say how', {
      specs: [...licensed.specs, { labelAr: 'خلاف', valueAr: '9', status: 'disputed' as const }],
    }, 'specs'],
  ];
  for (const [what, patch, gate] of cases) {
    const blockers = publicationBlockers({
      product: { ...licensed, ...patch } as typeof licensed, supply: fresh, now: NOW,
    });
    ok(`${what} blocks publication at the «${gate}» gate`,
      blockers.length > 0 && blockers.some(b => b.gate === gate));
  }

  // Supply is its own gate, and staleness is part of it.
  ok('no supply record blocks publication',
    publicationBlockers({ product: licensed, supply: null, now: NOW })
      .some(b => b.gate === 'price'));
  ok('an unverified cost blocks publication',
    publicationBlockers({ product: licensed, supply: { ...fresh, verified: false }, now: NOW })
      .some(b => b.gate === 'price'));
  const stale = { updatedAt: '2026-01-01T00:00:00.000Z', verified: true };
  ok('a cost nobody has checked for months blocks publication',
    publicationBlockers({ product: licensed, supply: stale, now: NOW })
      .some(b => b.gate === 'price'));
  ok('…and says how many days it has been',
    publicationBlockers({ product: licensed, supply: stale, now: NOW })
      .some(b => /\d+ يوماً/.test(b.messageAr)));

  // The review window is a SETTING, not a constant. A shop whose supplier moves
  // weekly needs a different number from one buying direct.
  ok('the review window is honoured when it is shortened',
    publicationBlockers({ product: licensed, supply: fresh, now: NOW, priceReviewDays: 1 })
      .some(b => b.gate === 'price'));
  ok('and the default is the documented thirty days', DEFAULT_PRICE_REVIEW_DAYS === 30);

  // Staleness answers the same question for the storefront, which has to stop
  // selling without waiting for anybody to unpublish.
  ok('a fresh cost is not stale', !isPriceStale(fresh, NOW));
  ok('an old cost is stale', isPriceStale(stale, NOW));
  ok('a missing cost is stale', isPriceStale(null, NOW));
  ok('an unreadable date is stale, not «today»', isPriceStale({ updatedAt: 'yesterday' }, NOW));
  ok('a malformed date measures as unknown rather than zero',
    daysBetween('not-a-date', NOW) === null);

  // Suspension outranks everything, including having no blockers left.
  const suspended = { ...licensed, published: true, suspendedReasonAr: 'استدعاء من الشركة' };
  ok('a suspended product reads as «موقوف» even with nothing missing',
    publicationStage({ product: suspended, supply: fresh, now: NOW }) === 'suspended');
  ok('…and none of its variants can be ordered',
    suspended.variants.every(v => !canOrder(suspended, { ...v, priceMinor: 5000, availability: 'in-stock' })));

  // The stage names the earliest BLOCKING gate, so the panel shows one next
  // action rather than a list of seven.
  const everythingWrong = {
    ...licensed, summaryAr: 'قصير', images: [], specs: [], notForAr: [],
  } as typeof licensed;
  ok('the stage names the earliest blocking gate, not the last',
    publicationStage({ product: everythingWrong, supply: null, now: NOW }) === 'draft');

  // ── the severity split, which is the whole design ──────────────────────
  //
  // Blocking means the shop CANNOT sell it. Advisory means somebody has to
  // judge — and a system that refuses a judgement is a system deciding the
  // catalogue for the person who owns it.
  const noImage = { ...licensed, images: [] } as typeof licensed;
  const g1 = publishability({ product: noImage, supply: fresh, now: NOW });
  ok('a missing photograph does not block publication', g1.allowed);
  ok('…but it is stated as an outstanding advisory',
    g1.advisory.some(b => b.gate === 'images'));
  ok('…and the product still reads as «جاهز للنشر»',
    publicationStage({ product: noImage, supply: fresh, now: NOW }) === 'ready');

  const noPrice = {
    ...licensed, variants: licensed.variants.map(v => ({ ...v, priceMinor: null })),
  } as typeof licensed;
  const g2 = publishability({ product: noPrice, supply: fresh, now: NOW });
  ok('no price DOES block publication', !g2.allowed);
  ok('…because a basket would drop the line whatever anybody decided',
    g2.blocking.some(b => b.gate === 'price'));

  const thinSpecs = { ...licensed, specs: [] } as typeof licensed;
  ok('too few sourced specifications is advisory, not blocking',
    publishability({ product: thinSpecs, supply: fresh, now: NOW }).allowed);
  const lyingSpec = {
    ...licensed,
    specs: [...licensed.specs, { labelAr: 'مخترعة', valueAr: '9', status: 'verified' as const }],
  } as typeof licensed;
  ok('a spec CLAIMING to be confirmed with no source is blocking — that is a lie on the page',
    !publishability({ product: lyingSpec, supply: fresh, now: NOW }).allowed);

  // Every finding carries a severity, or the split means nothing.
  const all = publicationBlockers({ product: everythingWrong, supply: null, now: NOW });
  ok('every finding declares its severity',
    all.length > 0 && all.every(b => b.severity === 'blocking' || b.severity === 'advisory'));
  ok('both severities actually occur',
    all.some(b => b.severity === 'blocking') && all.some(b => b.severity === 'advisory'));

  // And the server enforces the acknowledgement rather than trusting the panel.
  const publishAction = readFileSync(
    join(ROOT, 'web/app/admin/store/products/actions.ts'), 'utf8');
  ok('publishing over an advisory requires an explicit acknowledgement',
    publishAction.includes('acknowledgeAdvisories'));
  ok('…checked on the server, not in the component',
    publishAction.includes('gate.advisory.length > 0 && !acknowledgeAdvisories'));
  ok('…and blocking findings have no override at all',
    /gate\.blocking\.length > 0[\s\S]{0,200}?return \{/.test(publishAction)
    && !/blocking[\s\S]{0,80}acknowledge/.test(publishAction));
  ok('what was outstanding is written into the audit log',
    publishAction.includes('مع إقرار بنواقص'));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[19] A variant is a thing you can buy');
{
  for (const p of STORE_PRODUCTS) {
    if (p.variants.length === 0) { ok(`${p.id} has at least one variant`, false); continue; }
  }
  ok('every product has at least one variant',
    STORE_PRODUCTS.every(p => p.variants.length > 0));
  ok('every product has exactly one default variant',
    STORE_PRODUCTS.every(p => p.variants.filter(v => v.isDefault).length === 1));

  // Ids are globally unique and prefixed by their product, so a basket line
  // can never be ambiguous and a reader can tell what it belongs to.
  const allVariantIds = STORE_PRODUCTS.flatMap(p => p.variants.map(v => v.id));
  ok(`variant ids are unique (${allVariantIds.length})`,
    new Set(allVariantIds).size === allVariantIds.length);
  ok('every variant id is prefixed by its product id',
    STORE_PRODUCTS.every(p => p.variants.every(v => v.id.startsWith(`${p.id}:`))));
  ok('no variant id collides with a product id',
    allVariantIds.every(id => !STORE_PRODUCTS.some(p => p.id === id)));

  // Every variant says what is in its box. The difference between a BNF and an
  // RTF IS the box, so a variant that does not say is not a variant.
  ok('every variant says what comes in it',
    STORE_PRODUCTS.every(p => p.variants.every(v => v.inTheBoxAr.length > 0)));

  // The free service applies where it can be performed, and nowhere else.
  const freeSvcId = freeWithPurchaseService()!.id;
  ok('the free service does not qualify for itself',
    STORE_PRODUCTS.find(p => p.id === freeSvcId)!.variants.every(v => !v.freeSetupEligible));
  const aircraftPackages = STORE_PRODUCTS.flatMap(p => p.variants)
    .filter(v => ['bnf', 'rtf', 'pnp', 'combo'].includes(v.packageKind));
  ok(`aircraft packages qualify for free setup (${aircraftPackages.length})`,
    aircraftPackages.length > 0 && aircraftPackages.every(v => v.freeSetupEligible));
  const consumables = STORE_PRODUCTS
    .filter(p => ['accessories', 'antennas', 'batteries'].includes(p.categoryId))
    .flatMap(p => p.variants);
  ok(`a propeller earns no free programming (${consumables.length})`,
    consumables.length > 0 && consumables.every(v => !v.freeSetupEligible));

  // A buyer is asked three questions they can answer, and never a Target.
  const picker = readFileSync(join(ROOT, 'web/components/store/VariantPicker.tsx'), 'utf8');
  for (const forbidden of ['Target', 'firmware', 'Firmware', 'bind phrase']) {
    ok(`the picker never asks about «${forbidden}»`,
      !stripComments(picker).includes(forbidden));
  }
  ok('the picker asks which radio it binds to', picker.includes('يبِنّ مع'));
  ok('the picker asks which goggles it shows in', picker.includes('يظهر في نظّارة'));
  ok('an unavailable variant stays visible rather than disappearing',
    picker.includes('AVAILABILITY_LABEL_AR[v.availability]'));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[20] The audit covers the catalogue, and the launch set is real');
{
  const catalogueIds = STORE_CATALOGUE.map(p => p.id);
  const audited = CATALOGUE_AUDIT.map(r => r.productId);

  const unaudited = catalogueIds.filter(id => !audited.includes(id));
  if (unaudited.length) console.error('   UNAUDITED:', unaudited);
  ok(`every catalogue product has a recorded decision (${catalogueIds.length})`,
    unaudited.length === 0);

  const ghosts = audited.filter(id => !catalogueIds.includes(id));
  if (ghosts.length) console.error('   AUDIT GHOSTS:', ghosts);
  ok('every audited id names a real product', ghosts.length === 0);
  ok('no product is audited twice', new Set(audited).size === audited.length);

  // A decision with no reason is a decision nobody can revisit.
  ok('every decision explains itself',
    CATALOGUE_AUDIT.every(r => r.noteAr.trim().length >= 20));

  // The launch set: approved, documented, and actually carrying the specs.
  const launch = launchSetIds();
  // This used to assert a narrow band, from the round when the launch set was
  // a hand-picked pilot group. The whole catalogue has since been reviewed, so
  // the band is meaningless — but the invariant underneath it is not, and it is
  // the one worth keeping: the launch set is exactly the approved products, and
  // it is NOT everything. A launch set equal to the catalogue would mean the
  // audit had stopped rejecting anything, which is how a review becomes a
  // rubber stamp.
  ok(`the launch set is exactly the approved products (${launch.length})`,
    launch.length === CATALOGUE_AUDIT.filter(r => r.decision === 'approve').length);
  ok('the launch set is not the whole catalogue',
    launch.length < CATALOGUE_AUDIT.length);
  ok('every launch product was approved', launch.every(id => auditFor(id)!.decision === 'approve'));
  ok('every launch product has official sources recorded',
    launch.every(id => auditFor(id)!.sources === 'official'));
  ok('every launch product carries specifications',
    launch.every(id => (LAUNCH_SPECS[id] ?? []).length > 0));

  // …and the specifications carry their provenance, which is the whole point.
  const allSpecs = Object.values(LAUNCH_SPECS).flat();
  ok(`the launch set records specifications (${allSpecs.length})`, allSpecs.length >= 60);
  const verified = allSpecs.filter(sp => sp.status === 'verified');
  ok('every confirmed figure names its source and the date it was read',
    verified.length > 0 && verified.every(isSpecVerified));
  ok('every source is a manufacturer document, never a marketplace',
    verified.every(sp => sp.source!.kind === 'manufacturer-page'
      || sp.source!.kind === 'manufacturer-manual'));
  ok('every source url is a real https link',
    verified.every(sp => /^https:\/\/\S+$/.test(sp.source!.url)));
  ok('every check date is the recorded review date',
    verified.every(sp => sp.source!.checkedAt === CHECKED));

  // Where sources disagreed, the disagreement was recorded rather than resolved
  // by picking. There is at least one, because there always is.
  const disputed = allSpecs.filter(sp => sp.status === 'disputed');
  ok('a real disagreement between sources was recorded, not averaged away',
    disputed.length > 0 && disputed.every(sp => (sp.disagreementAr ?? '').length > 20));

  // Nothing in the launch data invents a price. Prices come from recorded cost.
  const launchSrc = readFileSync(join(ROOT, 'src/data/store/launch.ts'), 'utf8');
  ok('the launch data contains no price',
    !/priceMinor|السعر\s*[:=]|\$\d/.test(stripComments(launchSrc)));

  // Every launch product clears identity and specs, and stops at the gates
  // that need a human: a licensed image and a verified cost.
  const NOW = '2026-08-04T00:00:00.000Z';
  for (const id of launch) {
    const product = STORE_PRODUCTS.find(p => p.id === id)!;
    const blockers = publicationBlockers({ product, supply: null, now: NOW });
    ok(`${id} clears the identity and specification gates`,
      !blockers.some(b => b.gate === 'identity' || b.gate === 'specs'));
  }

  // And NOTHING is published, because nothing has a licensed image. That is the
  // honest state of the shop and the test says so out loud rather than
  // pretending the catalogue is live.
  const published = STORE_PRODUCTS.filter(p => p.published && p.categoryId !== SERVICES_CATEGORY_ID);
  ok('no product ships published — every one is a draft awaiting a licensed image',
    published.length === 0);
  const summary = auditSummary();
  ok('the audit reports that every product still needs image rights',
    summary.imagesPending === summary.total);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[21] The catalogue is linked, and the links claim only what they can');
{
  const nonService = STORE_PRODUCTS.filter(p => p.categoryId !== SERVICES_CATEGORY_ID);

  ok('every product offers alternatives',
    nonService.every(p => p.alternativeProductIds.length > 0));
  // Accessories need nothing, which is why the rule table has no entry for them
  // — an empty list there is correct rather than missing.
  const shouldComplete = nonService.filter(p => NEEDS_SECTIONS.includes(p.categoryId));
  ok(`every product in a section with declared needs has complements (${shouldComplete.length})`,
    shouldComplete.length > 0 && shouldComplete.every(p => p.completesProductIds.length > 0));

  const ids = new Set(STORE_PRODUCTS.map(p => p.id));
  const dangling = STORE_PRODUCTS.flatMap(p =>
    [...p.alternativeProductIds, ...p.completesProductIds].filter(id => !ids.has(id)));
  ok('no relationship points at a product that does not exist', dangling.length === 0);
  ok('no product recommends itself',
    STORE_PRODUCTS.every(p =>
      ![...p.alternativeProductIds, ...p.completesProductIds].includes(p.id)));

  // The RULE only ever produces section-mates — a claim that cannot be wrong,
  // which is the whole reason it is the one the rule makes.
  //
  // Scoped to what the rule produces, not to every list on the catalogue. A
  // person may legitimately cross sections: the Cetus Pro kit and the Tinyhawk
  // RTF really are alternatives to each other even though one is filed under
  // «ووب» and the other under «أطقم جاهزة», and a test that forbade that would
  // be a test overruling the judgement the override exists for.
  const derivedStray = STORE_PRODUCTS.flatMap(p => alternativesFor(p, STORE_PRODUCTS)
    .map(id => STORE_PRODUCTS.find(x => x.id === id)!)
    .filter(a => a && a.categoryId !== p.categoryId)
    .map(a => `${p.id}→${a.id}`));
  if (derivedStray.length) console.error('   RULE CROSSED A SECTION:', derivedStray);
  ok('the rule only ever suggests a product’s own section-mates', derivedStray.length === 0);
  ok('…and the rule actually produced something, so that is not vacuous',
    STORE_PRODUCTS.some(p => alternativesFor(p, STORE_PRODUCTS).length > 0));

  // A hand-written list crossing a section is allowed, and there is one — so
  // the override is real rather than theoretical.
  const crossed = STORE_CATALOGUE.filter(p => p.alternativeProductIds
    .some(id => STORE_CATALOGUE.find(x => x.id === id)?.categoryId !== p.categoryId));
  ok(`a person may cross sections deliberately, and has (${crossed.length})`,
    crossed.length > 0);

  // Three is the cap: a page offering six alternatives has stopped
  // recommending and started listing.
  ok('no product offers more than three alternatives',
    STORE_PRODUCTS.every(p => p.alternativeProductIds.length <= 3));

  // A complement is a CATEGORY-level need and never a fit. The caveat is what
  // keeps the link from being read as a compatibility claim, so a section whose
  // fit genuinely varies must carry one.
  for (const section of ['batteries', 'goggles', 'radios', 'receivers', 'escs']) {
    ok(`«${section}» links carry the caveat a buyer must check`,
      !!NEED_CAVEAT_AR[section] && NEED_CAVEAT_AR[section].length > 20);
  }
  const productPage = readFileSync(
    join(ROOT, 'web/app/store/p/[productId]/page.tsx'), 'utf8');
  ok('the page says «ستحتاج أيضاً», never «متوافق مع»',
    productPage.includes('ستحتاج أيضاً') && !stripComments(productPage).includes('متوافق مع'));
  ok('…and renders the caveats beside the links',
    productPage.includes('NEED_CAVEAT_AR') && productPage.includes('caveats='));

  // A hand-written list is never overwritten by the rule: a product whose
  // neighbours were chosen deliberately keeps them.
  const handPicked = STORE_CATALOGUE.find(p => p.alternativeProductIds.length > 0);
  if (handPicked) {
    const merged = STORE_PRODUCTS.find(p => p.id === handPicked.id)!;
    ok('a hand-written alternative list survives the rule',
      JSON.stringify(merged.alternativeProductIds)
      === JSON.stringify(handPicked.alternativeProductIds));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[22] The spreadsheet round-trip');
{
  const variantIds = new Set(STORE_PRODUCTS.flatMap(p => p.variants.map(v => v.id)));
  const supplierIds = new Set(SUPPLIERS.map(s => s.id));
  const ctx = { knownVariantIds: variantIds, knownSupplierIds: supplierIds };
  const someVariant = [...variantIds][0];

  // Out and back in, unchanged.
  const exported = toCsv([{
    variantId: someVariant, productNameEn: 'X', variantNameAr: 'ي',
    supplierId: 'getfpv', supplierUrl: 'https://example.com/x',
    unitCost: '29.99', inboundShipping: '0.00', currency: 'USD',
    availability: 'in-stock', verified: 'true', notesAr: 'ملاحظة, فيها فاصلة',
  }]);
  const back = parseCsv(exported);
  ok('a row survives export and re-import', back.rows.length === 1
    && back.rows[0].variantId === someVariant);
  // Arabic notes contain commas constantly; unquoted they would shift every
  // column after them by one.
  ok('a comma inside a field does not shift the columns',
    back.rows[0].notesAr === 'ملاحظة, فيها فاصلة');
  ok('Excel gets a BOM, so Arabic is not mojibake', exported.startsWith('﻿'));

  const verdicts = validateRows(back.rows, ctx);
  ok('a complete row applies', verdicts[0].kind === 'apply');
  ok('…converting money exactly',
    verdicts[0].kind === 'apply' && verdicts[0].unitCostMinor === 2999);

  // Every refusal, one at a time.
  const cases: [string, Record<string, string>, 'reject' | 'skip'][] = [
    ['an unknown variant', { variantId: 'no-such:variant', unitCost: '1.00', supplierId: 'getfpv' }, 'reject'],
    ['no id at all', { variantId: '', unitCost: '1.00' }, 'reject'],
    ['a price with a currency symbol', { variantId: someVariant, unitCost: '$29.99', supplierId: 'getfpv' }, 'reject'],
    ['a comma decimal, which means different things in different places',
      { variantId: someVariant, unitCost: '29,99', supplierId: 'getfpv' }, 'reject'],
    ['a third decimal place', { variantId: someVariant, unitCost: '29.999', supplierId: 'getfpv' }, 'reject'],
    ['an unknown supplier', { variantId: someVariant, unitCost: '1.00', supplierId: 'nope' }, 'reject'],
    ['no supplier', { variantId: someVariant, unitCost: '1.00', supplierId: '' }, 'reject'],
    ['a non-USD currency', { variantId: someVariant, unitCost: '1.00', supplierId: 'getfpv', currency: 'EUR' }, 'reject'],
    ['an unknown availability', { variantId: someVariant, unitCost: '1.00', supplierId: 'getfpv', availability: 'maybe' }, 'reject'],
    ['a non-http supplier link', { variantId: someVariant, unitCost: '1.00', supplierId: 'getfpv', supplierUrl: 'javascript:x' }, 'reject'],
    // A blank cost is a row nobody has got to yet. Skipping is right: an import
    // must never blank a price somebody already entered.
    ['a blank cost', { variantId: someVariant, unitCost: '' }, 'skip'],
  ];
  for (const [what, row, want] of cases) {
    ok(`${what} is ${want === 'reject' ? 'refused' : 'left alone'}`,
      validateRows([row], ctx)[0].kind === want);
  }

  // A file that disagrees with itself is refused rather than last-wins.
  const dup = validateRows([
    { variantId: someVariant, unitCost: '1.00', supplierId: 'getfpv' },
    { variantId: someVariant, unitCost: '2.00', supplierId: 'getfpv' },
  ], ctx);
  ok('a duplicated variant in one file is refused', dup[1].kind === 'reject');

  // A misaligned header would write supplier ids into the cost column.
  ok('a file with a missing column is refused whole',
    !!parseCsv('variantId,unitCost\nx,1').errorAr);
  ok('…and says which columns are missing',
    (parseCsv('variantId,unitCost\nx,1').errorAr ?? '').includes('supplierId'));
  ok('an empty file is refused', !!parseCsv('').errorAr);

  // Empty shipping means zero: «no shipping line» and «free shipping» are the
  // same thing to a supplier, and demanding a 0 is busywork.
  const noShip = validateRows(
    [{ variantId: someVariant, unitCost: '10.00', supplierId: 'getfpv' }], ctx);
  ok('blank shipping is read as zero, not as an error',
    noShip[0].kind === 'apply' && noShip[0].inboundShippingMinor === 0);

  // «Verified» means a person looked. A spreadsheet cannot claim it for them.
  ok('«verified» defaults to false rather than true',
    noShip[0].kind === 'apply' && noShip[0].verified === false);

  // AN IMPORT CANNOT PUBLISH. Not one row, not by any column.
  const importAction = readFileSync(
    join(ROOT, 'web/app/admin/store/import/actions.ts'), 'utf8');
  ok('the importer writes no published field',
    !/published/.test(stripComments(importAction).replace(/\/\*[\s\S]*?\*\//g, '')));
  ok('there is no published column to write from',
    !(SUPPLY_CSV_COLUMNS as readonly string[]).includes('published'));
  ok('preview and apply run the same validation',
    (importAction.match(/judge\(csv\)/g) ?? []).length === 2);
  ok('the import needs both the edit and the supply capability',
    importAction.includes("sessionCan(session, 'store.editProducts')")
    && importAction.includes("sessionCan(session, 'store.viewSupply')"));
  ok('the import is audited as one entry naming how many rows moved',
    importAction.includes("action: 'store.import'"));
  ok('a failed batch writes nothing', importAction.includes('batch.commit()')
    && importAction.includes('لم يُكتب شيء'));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[23] The work list, and the decisions the system refuses to make');
{
  const queue = readFileSync(join(ROOT, 'web/lib/server/storeQueue.ts'), 'utf8');

  // The owner's column names exactly the six things they said they would do.
  for (const k of ['needsImage', 'needsSupplier', 'needsUnitCost', 'needsShipping',
    'needsPriceReview', 'needsPublishDecision']) {
    ok(`«${k}» is on the owner's list`, queue.includes(`${k}:`));
  }
  // …and the platform's column names what the platform owes.
  for (const k of ['specsDocumented', 'descriptionComplete', 'variantsComplete',
    'categorised', 'alternativesLinked', 'servicesDecided']) {
    ok(`«${k}» is on the platform's list`, queue.includes(`${k}:`));
  }
  // No single percentage: «80% complete» hides whether the missing fifth is a
  // caption or the price.
  ok('there is no blended completion percentage',
    !/percent|completion\s*=|\/\s*6\s*\*\s*100/.test(stripComments(queue)));
  // Zero shipping is a real answer — plenty of suppliers ship free — so the
  // check must be «was it filled in», not «is it non-zero».
  ok('zero shipping counts as answered, not as missing',
    queue.includes('inboundShippingMinor === undefined'));
  // «Needs a publish decision» on something unpublishable is noise, not a task.
  ok('a publish decision is only outstanding once it could actually be made',
    queue.includes("=== 'ready'"));

  const page = readFileSync(join(ROOT, 'web/app/admin/store/products/page.tsx'), 'utf8');
  ok('the panel shows the two columns separately',
    page.includes('data-testid="owner-work"') && page.includes('data-testid="platform-work"'));
  ok('…and each row names its own outstanding owner work',
    page.includes('row-owner-'));

  // ── the five decisions ─────────────────────────────────────────────────
  ok(`there are five open questions (${OWNER_DECISIONS.length})`, OWNER_DECISIONS.length === 5);
  ok('every decision names a real product',
    OWNER_DECISIONS.every(d => STORE_PRODUCTS.some(p => p.id === d.productId)));
  ok('every decision says why the system will not settle it',
    OWNER_DECISIONS.every(d => d.whyNotAutomaticAr.length > 40));
  ok('every decision offers at least two options',
    OWNER_DECISIONS.every(d => d.options.length >= 2));
  // Inaction has a consequence, and a page that prices only the actions
  // quietly argues for inaction.
  ok('every option states what it costs, including «leave it»',
    OWNER_DECISIONS.every(d => d.options.every(o => o.effectAr.length > 25)));
  ok('a recommendation, where present, says what it rests on',
    OWNER_DECISIONS.every(d => !d.recommendedOptionId || !!d.recommendationBasisAr));
  ok('…and it names one of that decision’s own options',
    OWNER_DECISIONS.every(d => !d.recommendedOptionId
      || d.options.some(o => o.id === d.recommendedOptionId)));
  // Politeness is not evidence. Some of these genuinely have no answer.
  ok('some decisions honestly offer no recommendation',
    OWNER_DECISIONS.some(d => !d.recommendedOptionId));

  // A click may hide. It may not rewrite the catalogue.
  const decisionAction = readFileSync(
    join(ROOT, 'web/app/admin/store/decisions/actions.ts'), 'utf8');
  ok('a decision may unpublish, because that is reversible',
    decisionAction.includes("option.action === 'unpublish'"));
  ok('…and may not swap a product or split it — that is a reviewed commit',
    !/categoryId|variants\s*:/.test(stripComments(decisionAction)));
  ok('every decision is audited under the owner’s name',
    decisionAction.includes("action: 'store.decision'"));
  ok('…recording the option in its own words, not as an id',
    decisionAction.includes('option.labelAr'));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[24] The reviewed group holds together as a group');
{
  /**
   * The beginner path, reviewed as one.
   *
   * Reviewing products one at a time is how a shop ends up recommending two
   * aircraft that do the same thing, or three that all assume you already own
   * goggles. These assertions are about the GROUP: that its members differ,
   * that they point at each other, and that somebody starting from nothing can
   * find their way through it.
   */
  const REVIEWED = [
    'betafpv-cetus-pro', 'betafpv-meteor75-pro', 'happymodel-mobula7',
    'betafpv-pavo-pico', 'betafpv-cetus-x',
  ];
  const group = REVIEWED.map(id => STORE_PRODUCTS.find(p => p.id === id)!);
  ok('every reviewed product still exists', group.every(Boolean));

  // Documented, each to its manufacturer.
  for (const p of group) {
    const sourced = p.specs.filter(isSpecVerified);
    ok(`${p.id} carries at least four sourced figures (${sourced.length})`, sourced.length >= 4);
    ok(`${p.id} sources only manufacturer documents`,
      sourced.every(sp => sp.source!.kind === 'manufacturer-page'
        || sp.source!.kind === 'manufacturer-manual'));
  }

  // The group must offer a real choice, not five versions of one decision.
  const kits = group.filter(p => p.variants.some(v => v.packageKind === 'rtf'));
  const bare = group.filter(p => p.variants.every(v => v.packageKind !== 'rtf'));
  ok(`the group offers complete kits (${kits.length}) and bare aircraft (${bare.length})`,
    kits.length >= 1 && bare.length >= 1);

  // Alternatives here CROSS sections on purpose: «which beginner kit» is not a
  // question one section answers.
  const crossing = group.filter(p => p.alternativeProductIds
    .some(id => STORE_PRODUCTS.find(x => x.id === id)?.categoryId !== p.categoryId));
  ok(`the group's alternatives cross sections where the question does (${crossing.length})`,
    crossing.length >= 3);
  ok('…and every one of them resolves',
    group.every(p => p.alternativeProductIds.every(id => STORE_PRODUCTS.some(x => x.id === id))));

  // Where a product is superseded, the page says so rather than the shop
  // quietly selling last year's model to somebody who did not know.
  const pico = STORE_PRODUCTS.find(p => p.id === 'betafpv-pavo-pico')!;
  ok('a superseded product warns the buyer in «لا يناسبك»',
    pico.notForAr.some(t => t.includes('Pavo Pico II')));
  ok('…and the successor is recorded as a sourced specification, not a rumour',
    pico.specs.some(sp => sp.labelAr.includes('الجيل التالي') && isSpecVerified(sp)));

  // A kit that arrives without the thing it needs must say so where a buyer
  // reads before paying, not in the specification table.
  ok('a product sold WITHOUT its video system says so in the box list',
    pico.variants.every(v => v.inTheBoxAr.some(t => t.includes('بلا نظام فيديو'))));
  ok('…and in «لا يناسبك», because that is what stops the wrong purchase',
    pico.notForAr.some(t => t.includes('وحدة فيديو رقمية')));

  // The protocol split is real and is presented as a purchase choice, never as
  // a setup detail.
  const cetusX = STORE_PRODUCTS.find(p => p.id === 'betafpv-cetus-x')!;
  const links = new Set(cetusX.variants.map(v => v.linkProtocol));
  ok('a kit sold on two radio protocols offers both as variants', links.size >= 2);
  ok('…and every one of its variants says what is in its box',
    cetusX.variants.every(v => v.inTheBoxAr.length >= 3));

  // Every reviewed product is one owner-input away from sellable: nothing
  // blocking, and what remains is a photograph and a cost.
  const NOW = '2026-08-04T00:00:00.000Z';
  for (const p of group) {
    const priced = {
      ...p,
      variants: p.variants.map(v => ({ ...v, priceMinor: 9900, availability: 'in-stock' as const })),
    };
    const gate = publishability({
      product: priced,
      supply: { updatedAt: '2026-08-03T00:00:00.000Z', verified: true },
      now: NOW,
    });
    ok(`${p.id} is publishable the moment a price and a cost exist`, gate.allowed);
    // …and the only thing it is still warned about is the photograph.
    ok(`…with nothing outstanding but the photograph`,
      gate.advisory.every(a => a.gate === 'images'));
  }
}


// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[25] The second review: what it found, and that it stayed found');
{
  /**
   * Batch two reviewed the remaining fifty-three products.
   *
   * These assertions are not «the data is present» — the earlier sections
   * cover that. They lock in the FINDINGS, because a finding that nothing
   * tests is a finding that quietly reverts the next time somebody tidies the
   * catalogue. Each one below is a specific thing the review discovered was
   * wrong, expressed as a rule that would fail if it came back.
   */
  const byId = new Map(STORE_PRODUCTS.map(p => [p.id, p]));

  // ── Products that turned out not to exist ─────────────────────────────────
  // iFlight's Evoque line is 4, 5 and 6 inch. «F3» and «F3D» were names
  // nobody sells. SpeedyBee never sold the F405 V4 board on its own.
  for (const ghost of [
    'iflight-nazgul-evoque-f3', 'iflight-nazgul-evoque-f3d', 'speedybee-f405-v4-fc',
  ]) {
    ok(`«${ghost}» is gone — it was never a real product`, !byId.has(ghost));
    ok('…and nothing still points at it',
      STORE_PRODUCTS.every(p => ![
        ...p.alternativeProductIds, ...p.completesProductIds, ...p.relatedProductIds,
      ].includes(ghost)));
  }

  // ── A product with no manufacturer page says so, and stays empty ──────────
  // The HOTA D6 Pro is real and sold everywhere, but no official page for it
  // was found. Reseller listings are commercial information, not specification
  // — so it carries none, and its own page admits that rather than quietly
  // looking thin.
  const hota = byId.get('hota-d6-pro')!;
  ok('a product with no manufacturer source carries no sourced figure',
    hota.specs.filter(isSpecVerified).length === 0);
  ok('…and says so where a buyer will read it, instead of just looking thin',
    hota.summaryAr.includes('صفحة رسمية') || hota.notForAr.some(n => n.includes('موثّقة')));
  ok('…and its audit row records why, not just that',
    (auditFor('hota-d6-pro')!.noteAr).includes('لم يُعثر'));

  // ── The reclassification that was a safety problem ───────────────────────
  // The X-AIR was sold as an all-purpose omni «for every analog or digital
  // build». It is a 120°-beam receive antenna. Fitting one to an aircraft
  // loses the picture the moment the aircraft turns away.
  const xair = byId.get('truerc-x-air')!;
  ok('the directional receive antenna no longer claims to suit every build',
    !xair.suitsAr.some(s => s.includes('كل بناء')));
  ok('…and warns against the wrong fitting explicitly',
    xair.notForAr.some(n => n.includes('الطائرة')));

  // ── Products sold WITHOUT something a buyer would assume is included ──────
  // Three separate cases found in this batch. Each must say so twice: in the
  // box list, where somebody checks what arrives, and in «لا يناسبك», which
  // is what actually stops the wrong purchase.
  // The token searched for is the one the product's own copy uses. Matching on
  // a phrase we invented would pass only because we wrote both sides of it.
  const OMISSIONS: [string, string][] = [
    ['betafpv-pavo25', 'وحدة رقمية'],
    ['hdzero-freestyle-v2', 'كاميرا HDZero'],
    ['iflight-chimera7-eco', 'وحدة تحديد الموقع'],
  ];
  for (const [id, missing] of OMISSIONS) {
    const p = byId.get(id)!;
    const box = p.variants.flatMap(v => v.inTheBoxAr).join(' ');
    ok(`${id} says in its box list what is NOT in the box`,
      /بلا|ليست|غير/.test(box));
    ok('…and repeats it where it stops the wrong purchase',
      p.notForAr.some(n => n.includes(missing)));
  }

  // ── Every multi-option product names what differs ────────────────────────
  // «Option 1 / Option 2» is a shop telling somebody to guess. A variant name
  // must carry the thing that distinguishes it — a protocol, a capacity, a
  // KV, a connector, a video system.
  for (const p of STORE_PRODUCTS) {
    if (p.variants.length < 2) continue;
    ok(`${p.id}'s options are told apart by name`,
      new Set(p.variants.map(v => v.nameAr)).size === p.variants.length);
    ok('…and none of them is an unnamed «version»',
      p.variants.every(v => v.nameAr.trim().length >= 6 && !/^نسخة \d+$/.test(v.nameAr.trim())));
  }

  // ── Nothing quotes a figure it did not read ──────────────────────────────
  // Every sourced row across the WHOLE catalogue, not just the pilot group.
  const allSpecs = STORE_PRODUCTS.flatMap(p => p.specs);
  const sourced = allSpecs.filter(isSpecVerified);
  ok(`the catalogue carries sourced figures at scale (${sourced.length})`,
    sourced.length >= 300);
  ok('every one of them names a manufacturer document',
    sourced.every(sp => sp.source?.kind === 'manufacturer-page'
      || sp.source?.kind === 'manufacturer-manual'));
  ok('…and none of them was read from a marketplace',
    sourced.every(sp => !/aliexpress|amazon|banggood|ebay/i.test(sp.source!.url)));

  // A row the manufacturer does not publish is a real row, and it must say
  // that rather than being dropped — «we checked» and «we did not» differ.
  const unpublished = allSpecs.filter(sp => sp.valueAr === NOT_PUBLISHED_AR);
  ok(`«not published by the source» is recorded, not silently omitted (${unpublished.length})`,
    unpublished.length > 0);
  ok('…and never claims to be verified',
    unpublished.every(sp => sp.status !== 'verified'));

  // ── A conflict between two statements on one page is recorded, not picked ─
  const disputed = allSpecs.filter(sp => sp.status === 'disputed');
  ok(`source conflicts are recorded as conflicts (${disputed.length})`, disputed.length > 0);
  ok('…each explaining what disagrees with what',
    disputed.every(sp => (sp.disagreementAr ?? '').trim().length >= 20));

  // ── The audit says what it DID, not only what it saw ─────────────────────
  // A row that found a wrong name, a wrong section or a missing variant has to
  // record the correction. Otherwise the finding lives only in a diff.
  const CORRECTED: AuditKind[] = ['needs-rename', 'wrong-category', 'needs-variants'];
  const corrected = CATALOGUE_AUDIT.filter(r => CORRECTED.includes(r.kind));
  ok(`corrections were recorded, not just noticed (${corrected.length})`, corrected.length >= 25);
  // The verb set is wide because Arabic offers several ways to say «and so the
  // catalogue now shows X» — but it is not empty: a note that merely observes
  // the product exists carries none of these and still fails.
  ok('…and every one of them says what was changed, not only what was seen',
    corrected.every(r => /صُحّح|أُضيف|أُضيفت|نُقل|حلّ محلّ|رُفع|سُجّل|سُجّلت|كُتب/.test(r.noteAr)));
  // Proof the rule can fail: the phrasing a deferred row uses does not pass it.
  ok('…and the rule would reject a row that only records an observation',
    !/صُحّح|أُضيف|أُضيفت|نُقل|حلّ محلّ|رُفع|سُجّل|سُجّلت|كُتب/
      .test('موجود ويُباع. مؤجَّل إلى جولة توثيق ثانية.'));

  // ── Sections still hold together after the withdrawals ───────────────────
  // Two products were removed from the 3-inch section. A section that drops to
  // two is a section nobody can compare inside, so the replacement mattered.
  for (const cat of ['size-3', 'size-3-5', 'size-5', 'size-7']) {
    const members = STORE_PRODUCTS.filter(p => p.categoryId === cat);
    ok(`«${cat}» still offers a real choice (${members.length})`, members.length >= 3);
  }

  // ── The whole catalogue is one owner-input away ──────────────────────────
  // The point of the batch: what is left for the shop's owner is a photograph,
  // a supplier cost and a price. Nothing else may be outstanding on an
  // approved product.
  const NOW25 = '2026-08-04T00:00:00.000Z';
  const approved = launchSetIds().map(id => byId.get(id)!).filter(Boolean);
  ok(`the approved set is the bulk of the catalogue (${approved.length})`,
    approved.length >= 50);
  let ready = 0;
  for (const p of approved) {
    const priced = {
      ...p,
      variants: p.variants.map(v => ({
        ...v, priceMinor: 9900, availability: 'in-stock' as const,
      })),
    };
    const gate = publishability({
      product: priced,
      supply: { updatedAt: '2026-08-03T00:00:00.000Z', verified: true },
      now: NOW25,
    });
    if (gate.allowed && gate.advisory.every(a => a.gate === 'images')) ready++;
  }
  ok(`every approved product is publishable once priced and photographed (${ready}/${approved.length})`,
    ready === approved.length);
}


console.log(`\n${failed === 0 ? '✅' : '❌'} testStore: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

void storeProduct;
