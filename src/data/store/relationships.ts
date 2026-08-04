/**
 * «أو هذا بدلاً منه» and «ستحتاج أيضاً», derived rather than hand-written.
 *
 * WHY DERIVED
 * -----------
 * Sixty-nine products hand-linked is 69 lists to update every time a product is
 * added, and the ones nobody updates are the ones that quietly recommend a
 * discontinued item forever. A rule cannot go stale: add a product to a section
 * and it appears among its neighbours' alternatives the same minute.
 *
 * WHAT THE TWO RELATIONSHIPS ACTUALLY CLAIM — AND WHAT THEY DO NOT
 * ----------------------------------------------------------------
 * «بدائل» claims only «this section's other options». It is not a compatibility
 * statement and cannot be wrong: the products are in the same section because
 * somebody put them there in a reviewed commit.
 *
 * «ستحتاج أيضاً» claims a CATEGORY-level need — «a drone needs a battery», «a
 * battery needs a charger» — and never a fit. This shop does not have the data
 * to say that a particular 6S pack fits a particular airframe's bay, and a shop
 * that says so anyway sells somebody a battery that does not go in. So the
 * links point at the SECTION's own recommended option and the page says «ستحتاج
 * أيضاً», not «متوافق مع». Where a real caveat exists — voltage, connector,
 * video system — it is stated beside the link.
 *
 * That distinction is the entire reason this file is rules and not a table: a
 * table invites somebody to write «متوافق» in it.
 */

import type { StoreProduct } from './types';

/**
 * What a thing in this section needs to fly, by section.
 *
 * Ordered by how soon somebody discovers they need it. A drone with no battery
 * is unusable on day one; a spare set of propellers is a week later; a safe bag
 * is the thing nobody buys until they read why.
 */
const NEEDS: Record<string, string[]> = {
  // ── Aircraft ──────────────────────────────────────────────────────────────
  // Everything that flies needs power, a way to charge it, something to see
  // through and something to fly it with. The RTF kits are the exception and
  // are handled below.
  'tiny-whoop': ['batteries', 'chargers', 'goggles', 'radios', 'accessories'],
  'size-2': ['batteries', 'chargers', 'goggles', 'radios', 'accessories'],
  'size-2-5': ['batteries', 'chargers', 'goggles', 'radios', 'accessories'],
  'size-3': ['batteries', 'chargers', 'goggles', 'radios', 'accessories'],
  'size-3-5': ['batteries', 'chargers', 'goggles', 'radios', 'accessories'],
  'size-5': ['batteries', 'chargers', 'goggles', 'radios', 'accessories'],
  'size-7': ['batteries', 'chargers', 'goggles', 'radios', 'gps'],
  rtf: ['batteries', 'accessories'],

  // ── Components ────────────────────────────────────────────────────────────
  // A battery is the one product in the shop that is dangerous when stored
  // badly, so the bag is not an accessory suggestion — it is the first link.
  batteries: ['chargers', 'accessories'],
  chargers: ['batteries'],
  motors: ['escs', 'accessories'],
  escs: ['motors', 'flight-controllers'],
  'flight-controllers': ['escs', 'receivers'],
  receivers: ['radios', 'antennas'],
  cameras: ['vtx', 'antennas'],
  vtx: ['antennas', 'cameras'],
  'air-units': ['goggles', 'antennas'],
  antennas: ['vtx'],
  gps: ['flight-controllers'],
  frames: ['motors', 'flight-controllers', 'escs'],
  radios: ['receivers'],
  goggles: ['antennas'],
};

/**
 * The caveat a buyer needs before they click, by section.
 *
 * Absent where there is nothing to warn about. A caveat on everything is a
 * caveat nobody reads.
 */
export const NEED_CAVEAT_AR: Record<string, string> = {
  batteries: 'تأكّد من جهد البطارية وعدد خلاياها ومقاس موصلها قبل الشراء — تختلف باختلاف الطائرة.',
  chargers: 'تأكّد أن الشاحن يدعم عدد خلايا بطاريتك ونوع موصلها.',
  goggles: 'النظّارة يجب أن تطابق نظام الفيديو: التماثلي لا يظهر في نظّارة رقمية والعكس.',
  radios: 'جهاز التحكّم يجب أن يطابق بروتوكول المستقبِل — ExpressLRS لا يبِنّ مع مستقبِل من نظام آخر.',
  receivers: 'المستقبِل يجب أن يطابق بروتوكول جهاز تحكّمك.',
  antennas: 'تأكّد من نوع الموصل واستقطاب الهوائي.',
  'air-units': 'الأنظمة الرقمية مغلقة: الوحدة تعمل مع نظّارة نظامها فقط.',
  escs: 'تأكّد أن تيّار المسرّع يكفي محرّكاتك وأن مقاس تثبيته يطابق متحكّمك.',
  'flight-controllers': 'تأكّد من مقاس التثبيت — 20×20 أو 30.5×30.5 — قبل الشراء.',
  motors: 'تأكّد من مقاس المحرّك وقيمة KV المناسبة لمقاس طائرتك وجهد بطاريتك.',
};

/** Sections whose members are genuinely interchangeable choices. */
const SERVICES = 'services';

/**
 * The other options in this product's own section.
 *
 * Capped at three: a page offering six alternatives has stopped recommending
 * and started listing, which is the thing this shop exists not to do. Ordered
 * so the ones at a DIFFERENT point on the section's axis come first — the
 * useful alternative to the middle option is the cheap one or the good one, not
 * the other middle one.
 */
export function alternativesFor(
  product: StoreProduct, all: readonly StoreProduct[],
): string[] {
  if (product.categoryId === SERVICES) return [];
  const siblings = all.filter(p =>
    p.id !== product.id
    && p.categoryId === product.categoryId
    && p.categoryId !== SERVICES);

  return siblings
    .slice()
    .sort((a, b) => {
      const differs = (p: StoreProduct) => (p.choicePosition === product.choicePosition ? 1 : 0);
      return differs(a) - differs(b);
    })
    .slice(0, 3)
    .map(p => p.id);
}

/**
 * What a buyer will need alongside this, one product per need.
 *
 * ONE per section, not all of them: «you will also need a battery» is useful,
 * «here are our four batteries» is the battery section, and putting the battery
 * section on every drone page is how a product page becomes a catalogue.
 *
 * The one chosen is the section's entry-level option — the cheapest thing that
 * does the job is the right default for somebody who did not know they needed
 * it yet.
 */
export function complementsFor(
  product: StoreProduct, all: readonly StoreProduct[],
): string[] {
  if (product.categoryId === SERVICES) return [];
  const needs = NEEDS[product.categoryId];
  if (!needs) return [];

  const out: string[] = [];
  for (const section of needs) {
    const pick = all
      .filter(p => p.categoryId === section && p.id !== product.id)
      .sort((a, b) => rank(a.choicePosition) - rank(b.choicePosition))[0];
    if (pick) out.push(pick.id);
  }
  return out;
}

function rank(pos: string): number {
  return { entry: 0, middle: 1, pro: 2, variant: 3 }[pos] ?? 9;
}

/**
 * A whole catalogue with both relationships filled in.
 *
 * Applied where the seed left them empty, and NEVER over a hand-written list:
 * a product whose neighbours were chosen deliberately keeps them. That is what
 * makes this a floor rather than a replacement — the rule fills the gap, a
 * person overrides the rule.
 */
export function withRelationships(products: StoreProduct[]): StoreProduct[] {
  return products.map(p => ({
    ...p,
    alternativeProductIds: p.alternativeProductIds.length > 0
      ? p.alternativeProductIds
      : alternativesFor(p, products),
    completesProductIds: p.completesProductIds.length > 0
      ? p.completesProductIds
      : complementsFor(p, products),
  }));
}
