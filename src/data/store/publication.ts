/**
 * What a product needs before anyone may see it, and where it currently stands.
 *
 * THE STAGE IS DERIVED, NOT STORED
 * --------------------------------
 * The brief asked for a workflow: draft → specs → images → price → ready →
 * published → suspended. The obvious implementation is a `stage` field somebody
 * sets, and it is the wrong one — because then the stage is a label a person
 * typed and the data is something else, and the day they disagree the panel
 * lies to whoever is running the shop. That has already happened once in this
 * store: the supply screen reported a price nothing read.
 *
 * So the stage is computed from the blockers. A product is at «قيد مراجعة
 * الصور» because it has no licensed image, not because somebody moved it there,
 * and adding a licensed image moves it forward without anybody remembering to.
 *
 * The two things that ARE stored are the two a computation cannot know:
 * `published` (an admin decided the world may see this) and
 * `suspendedReasonAr` (an admin decided it may not, for a reason). Publishing
 * is refused while any blocker remains; suspension is never refused, because
 * the moment you need to pull a product is not the moment to argue.
 *
 * WHY EACH BLOCKER IS A SENTENCE
 * ------------------------------
 * «incomplete» tells whoever is feeding the catalogue nothing. Every blocker
 * below says what is missing and, where it is not obvious, which screen fixes
 * it. A hundred products each with a reason is a work queue; a hundred products
 * each marked invalid is a wall.
 */

import {
  isImagePublishable, isSpecVerified, ORDERABLE_AVAILABILITY,
  type ProductVariant, type StoreProduct,
} from './types';

export type PublicationStage =
  | 'draft'
  | 'specs-review'
  | 'images-review'
  | 'price-review'
  | 'ready'
  | 'published'
  | 'suspended';

export const STAGE_LABEL_AR: Record<PublicationStage, string> = {
  draft: 'مسودة',
  'specs-review': 'قيد مراجعة المواصفات',
  'images-review': 'قيد مراجعة الصور',
  'price-review': 'قيد مراجعة السعر',
  ready: 'جاهز للنشر',
  published: 'منشور',
  suspended: 'موقوف',
};

/**
 * Which gate a blocker belongs to.
 *
 * Used to decide the stage: a product sits at the earliest gate it fails, so
 * the panel shows one thing to do next rather than a list of seven.
 */
export type BlockerGate = 'identity' | 'specs' | 'images' | 'price';

export interface PublicationBlocker {
  gate: BlockerGate;
  messageAr: string;
  /** Where to go and fix it. */
  fixHref?: string;
}

/** How old a supply record may be before its price needs looking at again. */
export const DEFAULT_PRICE_REVIEW_DAYS = 30;

export interface GateInput {
  product: StoreProduct;
  /** Whether a supply record exists at all, and when it was last checked. */
  supply?: { updatedAt: string; verified: boolean } | null;
  priceReviewDays?: number;
  /** ISO date. Passed in rather than read, so the gate is pure and testable. */
  now: string;
}

/**
 * Every reason this product may not be published, in gate order.
 *
 * Deliberately returns ALL of them rather than the first. The stage shows the
 * next thing to do; the product screen shows the whole list, because somebody
 * about to spend an hour on a product should know up front that it also needs
 * a supplier.
 */
export function publicationBlockers(input: GateInput): PublicationBlocker[] {
  const { product, supply, now } = input;
  const reviewDays = input.priceReviewDays ?? DEFAULT_PRICE_REVIEW_DAYS;
  const out: PublicationBlocker[] = [];
  const editHref = `/admin/store/products/${product.id}`;

  // ── identity ──────────────────────────────────────────────────────────────
  // A real manufacturer name is what a buyer cross-checks against every other
  // shop. A placeholder here means the product was never actually chosen.
  if (!product.nameEn.trim()) {
    out.push({ gate: 'identity', messageAr: 'لا اسم حقيقي للمنتج.', fixHref: editHref });
  }
  if (!product.brandAr.trim() || product.brandAr === 'عام') {
    // «عام» is legitimate for a strap and never for an aircraft — but the model
    // cannot tell those apart, so this is a warning-shaped blocker only where a
    // variant claims to be an aircraft package.
    if (product.variants.some(v => v.packageKind !== 'single')) {
      out.push({ gate: 'identity', messageAr: 'لا شركة مصنّعة محدَّدة.', fixHref: editHref });
    }
  }
  if (product.summaryAr.trim().length < 40) {
    out.push({
      gate: 'identity',
      messageAr: 'الوصف العربي قصير جداً — اكتب ما يكفي ليقرّر المشتري.',
      fixHref: editHref,
    });
  }
  if (product.notForAr.length === 0) {
    out.push({
      gate: 'identity',
      messageAr: 'لا يوجد «لا يناسبك إن كنت» — وهو القسم الذي تُصدَّق به بقية الصفحة.',
      fixHref: editHref,
    });
  }

  // ── variants ──────────────────────────────────────────────────────────────
  const variantIssues = variantBlockers(product.variants, editHref);
  out.push(...variantIssues);

  // ── specs ─────────────────────────────────────────────────────────────────
  const verified = product.specs.filter(isSpecVerified);
  if (verified.length < MIN_VERIFIED_SPECS) {
    out.push({
      gate: 'specs',
      messageAr: `مواصفات موثّقة: ${verified.length} من ${MIN_VERIFIED_SPECS} المطلوبة، ولكل واحدة مصدر وتاريخ تحقّق.`,
      fixHref: editHref,
    });
  }
  const claimedNoSource = product.specs.filter(
    sp => sp.status === 'verified' && !isSpecVerified(sp),
  );
  if (claimedNoSource.length > 0) {
    out.push({
      gate: 'specs',
      messageAr: `${claimedNoSource.length} مواصفة معلَّمة «مؤكَّدة» بلا مصدر أو تاريخ.`,
      fixHref: editHref,
    });
  }
  const disputedNoNote = product.specs.filter(sp => sp.status === 'disputed' && !sp.disagreementAr);
  if (disputedNoNote.length > 0) {
    out.push({
      gate: 'specs',
      messageAr: `${disputedNoNote.length} مواصفة مختلَف عليها بلا بيان للاختلاف.`,
      fixHref: editHref,
    });
  }

  // ── images ────────────────────────────────────────────────────────────────
  const usable = product.images.filter(isImagePublishable);
  if (usable.length === 0) {
    out.push({
      gate: 'images',
      messageAr: product.images.length === 0
        ? 'لا صورة. المتجر لا ينشر منتجاً بلا صورة مرخّصة.'
        : 'لا صورة مرخّصة — الصور الموجودة بلا أساس استخدام موثّق.',
      fixHref: editHref,
    });
  }

  // ── price and supply ──────────────────────────────────────────────────────
  if (!supply) {
    out.push({
      gate: 'price',
      messageAr: 'لا مورد ولا تكلفة. لا يمكن حساب سعر.',
      fixHref: '/admin/store/supply',
    });
  } else {
    if (!supply.verified) {
      out.push({
        gate: 'price',
        messageAr: 'التكلفة غير مُتحقَّق منها عند المورد.',
        fixHref: '/admin/store/supply',
      });
    }
    const age = daysBetween(supply.updatedAt, now);
    if (age === null) {
      out.push({
        gate: 'price',
        messageAr: 'تاريخ آخر مراجعة للتكلفة غير صالح.',
        fixHref: '/admin/store/supply',
      });
    } else if (age > reviewDays) {
      out.push({
        gate: 'price',
        messageAr: `مضى ${age} يوماً على آخر مراجعة للتكلفة (الحد ${reviewDays}). أسعار الموردين تتحرّك.`,
        fixHref: '/admin/store/supply',
      });
    }
  }
  if (product.variants.every(v => v.priceMinor === null)) {
    out.push({
      gate: 'price',
      messageAr: 'لا سعر على أي خيار.',
      fixHref: '/admin/store/supply',
    });
  }

  return out;
}

/**
 * The minimum number of sourced specifications.
 *
 * Three, not one: one figure is a label, and three is enough that somebody had
 * to actually open the manufacturer's page. It is deliberately not «all the
 * fields», because the fields that apply differ per product and a rule that
 * demands a KV rating from a battery would be met by inventing one.
 */
export const MIN_VERIFIED_SPECS = 3;

function variantBlockers(variants: ProductVariant[], editHref: string): PublicationBlocker[] {
  const out: PublicationBlocker[] = [];
  if (variants.length === 0) {
    out.push({ gate: 'identity', messageAr: 'لا خيار شراء واحد معرَّف.', fixHref: editHref });
    return out;
  }
  const defaults = variants.filter(v => v.isDefault);
  if (defaults.length !== 1) {
    out.push({
      gate: 'identity',
      messageAr: defaults.length === 0
        ? 'لا خيار افتراضي — الصفحة لن تعرف أيّها تعرض.'
        : `${defaults.length} خيارات معلَّمة افتراضية. واحد فقط.`,
      fixHref: editHref,
    });
  }
  const ids = new Set<string>();
  for (const v of variants) {
    if (ids.has(v.id)) {
      out.push({ gate: 'identity', messageAr: `معرّف الخيار «${v.id}» مكرَّر.`, fixHref: editHref });
    }
    ids.add(v.id);
    if (v.inTheBoxAr.length === 0) {
      out.push({
        gate: 'identity',
        messageAr: `الخيار «${v.nameAr}» لا يقول ما يأتي في صندوقه.`,
        fixHref: editHref,
      });
    }
  }
  return out;
}

/**
 * Where this product stands, in one word.
 *
 * Suspension wins over everything — a suspended product with no blockers left
 * is still suspended, because somebody pulled it on purpose and the reason has
 * not been withdrawn. After that, the earliest failing gate names the stage, so
 * the panel shows one next action rather than a list.
 */
export function publicationStage(input: GateInput): PublicationStage {
  if (input.product.suspendedReasonAr) return 'suspended';
  const blockers = publicationBlockers(input);
  if (blockers.length === 0) return input.product.published ? 'published' : 'ready';
  if (blockers.some(b => b.gate === 'identity')) return 'draft';
  if (blockers.some(b => b.gate === 'specs')) return 'specs-review';
  if (blockers.some(b => b.gate === 'images')) return 'images-review';
  return 'price-review';
}

/**
 * Whether a variant can be put in a basket right now.
 *
 * Availability and price are necessary and not sufficient: a product that is
 * not published cannot be ordered whatever its stock says, which is what stops
 * a guessed URL from selling a draft. The server checks this again before an
 * order is written — this is what the page SHOWS, that is what is true.
 */
export function canOrder(product: StoreProduct, variant: ProductVariant): boolean {
  return product.published
    && !product.suspendedReasonAr
    && variant.priceMinor !== null
    && variant.priceMinor > 0
    && ORDERABLE_AVAILABILITY.includes(variant.availability);
}

/**
 * Whole days between two ISO dates, or null if either is unreadable.
 *
 * Returns null rather than 0 for a bad date. Zero means «checked today», and a
 * malformed timestamp reading as «checked today» is exactly the failure this
 * function exists to catch.
 */
export function daysBetween(fromIso: string, toIso: string): number | null {
  const a = Date.parse(fromIso);
  const b = Date.parse(toIso);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.floor((b - a) / 86_400_000);
}

/**
 * Whether a supply record's price is too old to sell from.
 *
 * Separate from the blocker so the storefront can ask it too: a published
 * product whose supply record went stale yesterday must stop accepting orders
 * without waiting for somebody to unpublish it.
 */
export function isPriceStale(
  supply: { updatedAt: string } | null | undefined,
  now: string,
  reviewDays = DEFAULT_PRICE_REVIEW_DAYS,
): boolean {
  if (!supply) return true;
  const age = daysBetween(supply.updatedAt, now);
  return age === null || age > reviewDays;
}
