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
 * Which gate a finding belongs to.
 *
 * Used to decide the stage: a product sits at the earliest gate it fails, so
 * the panel shows one thing to do next rather than a list of seven.
 */
export type BlockerGate = 'identity' | 'specs' | 'images' | 'price';

/**
 * How hard a finding is, and this distinction is the whole design.
 *
 * `blocking` means the shop CANNOT sell it — there is no price, or no buyable
 * configuration, or nothing on the page to read. No amount of willingness makes
 * an order for it fulfillable, so no override exists and none should.
 *
 * `advisory` means somebody has to JUDGE. A product with no photograph sells
 * badly and sells; one with two sourced specifications instead of three is
 * thinner than we would like. These are commercial decisions, and a system that
 * refuses them is a system that decides for the person running the shop —
 * which is not its job. It says so clearly, requires an explicit
 * acknowledgement, and records who overrode what.
 *
 * The line between the two is: could a competent shopkeeper reasonably choose
 * to sell this today? If yes, it is advisory.
 */
export type FindingSeverity = 'blocking' | 'advisory';

export interface PublicationBlocker {
  gate: BlockerGate;
  severity: FindingSeverity;
  messageAr: string;
  /** Where to go and fix it. */
  fixHref?: string;
}

/** Only the findings that make selling impossible. */
export function hardBlockers(findings: PublicationBlocker[]): PublicationBlocker[] {
  return findings.filter(f => f.severity === 'blocking');
}

/** Findings an admin may publish over, having been told. */
export function advisories(findings: PublicationBlocker[]): PublicationBlocker[] {
  return findings.filter(f => f.severity === 'advisory');
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
    out.push({
      gate: 'identity', severity: 'blocking',
      messageAr: 'لا اسم حقيقي للمنتج.', fixHref: editHref,
    });
  }
  if (!product.brandAr.trim() || product.brandAr === 'عام') {
    // «عام» is legitimate for a strap and never for an aircraft — but the model
    // cannot tell those apart, so this is a warning-shaped blocker only where a
    // variant claims to be an aircraft package.
    if (product.variants.some(v => v.packageKind !== 'single')) {
      out.push({
        gate: 'identity', severity: 'advisory',
        messageAr: 'لا شركة مصنّعة محدَّدة.', fixHref: editHref,
      });
    }
  }
  // A product page with nothing on it is broken, not thin. Blocking.
  if (product.summaryAr.trim().length < 40) {
    out.push({
      gate: 'identity', severity: 'blocking',
      messageAr: 'الوصف العربي قصير جداً — اكتب ما يكفي ليقرّر المشتري.',
      fixHref: editHref,
    });
  }
  if (product.notForAr.length === 0) {
    out.push({
      gate: 'identity', severity: 'advisory',
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
    // Thin, not broken. A shop may sell a battery strap on its description
    // alone, and refusing to would be this system deciding the catalogue.
    out.push({
      gate: 'specs', severity: 'advisory',
      messageAr: `مواصفات موثّقة: ${verified.length} من ${MIN_VERIFIED_SPECS} الموصى بها، ولكل واحدة مصدر وتاريخ تحقّق.`,
      fixHref: editHref,
    });
  }
  // A claim of «مؤكَّدة» with nothing behind it is a lie on the page, and no
  // commercial judgement makes it acceptable. Blocking — and note that the
  // editor refuses to save it in the first place, so this catches documents
  // written before that rule existed.
  const claimedNoSource = product.specs.filter(
    sp => sp.status === 'verified' && !isSpecVerified(sp),
  );
  if (claimedNoSource.length > 0) {
    out.push({
      gate: 'specs', severity: 'blocking',
      messageAr: `${claimedNoSource.length} مواصفة معلَّمة «مؤكَّدة» بلا مصدر أو تاريخ.`,
      fixHref: editHref,
    });
  }
  const disputedNoNote = product.specs.filter(sp => sp.status === 'disputed' && !sp.disagreementAr);
  if (disputedNoNote.length > 0) {
    out.push({
      gate: 'specs', severity: 'blocking',
      messageAr: `${disputedNoNote.length} مواصفة مختلَف عليها بلا بيان للاختلاف.`,
      fixHref: editHref,
    });
  }

  // ── images ────────────────────────────────────────────────────────────────
  const usable = product.images.filter(isImagePublishable);
  if (usable.length === 0) {
    // ADVISORY, deliberately.
    //
    // It was blocking, and blocking was wrong — it made a legal question the
    // code cannot answer into a wall the shop's owner could not pass. Whether a
    // photograph may be used is their call and their risk, and a product listed
    // with a drawn placeholder is a product that sells badly rather than one
    // that cannot be sold. The check stays, the warning is loud, publishing
    // over it takes a deliberate acknowledgement, and the audit log records it.
    out.push({
      gate: 'images', severity: 'advisory',
      messageAr: product.images.length === 0
        ? 'لا صورة. سيظهر المنتج بمربّع بديل بدل الصورة.'
        : 'لا صورة مرخّصة — الصور الموجودة بلا أساس استخدام موثّق، ولن تُعرض.',
      fixHref: `${editHref}/images`,
    });
  }

  // ── price and supply ──────────────────────────────────────────────────────
  if (!supply) {
    // Advisory: a shop owner may know what a thing costs without having typed
    // it in. What they cannot do is sell at no price — that is the next check.
    out.push({
      gate: 'price', severity: 'advisory',
      messageAr: 'لا سجلّ توريد — لا مورد ولا تكلفة مسجَّلة، فلا يمكن تتبّع الربح على هذا المنتج.',
      fixHref: '/admin/store/supply',
    });
  } else {
    if (!supply.verified) {
      out.push({
        gate: 'price', severity: 'advisory',
        messageAr: 'التكلفة غير مُتحقَّق منها عند المورد.',
        fixHref: '/admin/store/supply',
      });
    }
    const age = daysBetween(supply.updatedAt, now);
    if (age === null) {
      out.push({
        gate: 'price', severity: 'advisory',
        messageAr: 'تاريخ آخر مراجعة للتكلفة غير صالح.',
        fixHref: '/admin/store/supply',
      });
    } else if (age > reviewDays) {
      out.push({
        gate: 'price', severity: 'advisory',
        messageAr: `مضى ${age} يوماً على آخر مراجعة للتكلفة (الحد ${reviewDays}). أسعار الموردين تتحرّك.`,
        fixHref: '/admin/store/supply',
      });
    }
  }
  // BLOCKING, and the only price rule that is.
  //
  // A shop with no price is not a shop with a thin listing; it is a shop that
  // cannot take the order. There is nothing to acknowledge and nothing to
  // override — the basket would drop the line anyway.
  if (product.variants.every(v => v.priceMinor === null)) {
    out.push({
      gate: 'price', severity: 'blocking',
      messageAr: 'لا سعر على أي خيار — لا يمكن طلب المنتج بلا سعر.',
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

/**
 * Whether an admin may publish this, and what they are agreeing to if they do.
 *
 * One function, called by the button and by the server action, so the panel
 * cannot offer something the server refuses — and, just as importantly, cannot
 * refuse something the server would allow.
 */
export function publishability(input: GateInput): {
  allowed: boolean;
  blocking: PublicationBlocker[];
  advisory: PublicationBlocker[];
} {
  const findings = publicationBlockers(input);
  const blocking = hardBlockers(findings);
  return { allowed: blocking.length === 0, blocking, advisory: advisories(findings) };
}

function variantBlockers(variants: ProductVariant[], editHref: string): PublicationBlocker[] {
  const out: PublicationBlocker[] = [];
  // All of these are structural: the page cannot render, or the basket cannot
  // name a line. None of them is a judgement anybody could make differently.
  if (variants.length === 0) {
    out.push({
      gate: 'identity', severity: 'blocking',
      messageAr: 'لا خيار شراء واحد معرَّف.', fixHref: editHref,
    });
    return out;
  }
  const defaults = variants.filter(v => v.isDefault);
  if (defaults.length !== 1) {
    out.push({
      gate: 'identity', severity: 'blocking',
      messageAr: defaults.length === 0
        ? 'لا خيار افتراضي — الصفحة لن تعرف أيّها تعرض.'
        : `${defaults.length} خيارات معلَّمة افتراضية. واحد فقط.`,
      fixHref: editHref,
    });
  }
  const ids = new Set<string>();
  for (const v of variants) {
    if (ids.has(v.id)) {
      out.push({
        gate: 'identity', severity: 'blocking',
        messageAr: `معرّف الخيار «${v.id}» مكرَّر.`, fixHref: editHref,
      });
    }
    ids.add(v.id);
    if (v.inTheBoxAr.length === 0) {
      out.push({
        gate: 'identity', severity: 'advisory',
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
  if (input.product.published) return 'published';

  const findings = publicationBlockers(input);
  const hard = hardBlockers(findings);
  // Ready means «an admin may press publish», which is true the moment nothing
  // blocking remains. Outstanding advisories are shown on the button, not
  // hidden behind it.
  if (hard.length === 0) return 'ready';
  if (hard.some(b => b.gate === 'identity')) return 'draft';
  if (hard.some(b => b.gate === 'specs')) return 'specs-review';
  if (hard.some(b => b.gate === 'images')) return 'images-review';
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
