'use server';

import { revalidatePath } from 'next/cache';
import { getSession, sessionCan } from '@/lib/server/session';
import { adminDb, isAdminConfigured } from '@/lib/server/firebaseAdmin';
import { actorFromSession, logAudit, markAuditResult, newRequestId } from '@/lib/server/audit';
import { storeProduct } from '@core/data/store/catalogue';
import { publicationBlockers } from '@core/data/store/publication';
import { INITIAL_PRIVATE_SETTINGS } from '@core/data/store/settings';
import { resolvedProduct } from '@/lib/server/storeCatalogue';
import { supplyFor } from '@/lib/server/storeSupply';
import type { ProductOverride } from '@core/data/store/overrides';
import { IMAGE_BASIS_LABEL_AR } from '@core/data/store/types';
import type {
  Availability, BuyerLevel, ImageLicenceBasis, LinkProtocol, ProductImage,
  ProductSpec, SpecSourceKind, SpecStatus, VideoSystem,
} from '@core/data/store/types';

/**
 * Editing a product without a deployment.
 *
 * WHAT THIS CAN CHANGE AND WHAT IT CANNOT
 * ---------------------------------------
 * It writes the fields on `ProductOverride` and nothing else. It cannot change
 * a price — that is computed by the supply screen from cost and margin, so no
 * price can exist in this shop that nobody can explain. It cannot change an id,
 * a category or the relationship arrays, because routes and sections are built
 * from those and a document that renamed its own id would produce a page
 * reachable at a URL that generates a different one.
 *
 * WHY «DELETE» IS «UNPUBLISH»
 * ---------------------------
 * Orders reference product ids and freeze the name and price they were placed
 * at. Deleting the product would leave an order pointing at nothing, and a shop
 * whose history breaks when the catalogue changes has no history. Unpublishing
 * removes it from every page a customer can reach, which is what «delete» means
 * in a shop — and it is reversible, which deleting is not.
 *
 * WHY EVERY SAVE REVALIDATES THREE PATHS
 * --------------------------------------
 * The product page, its section, and the storefront count. An admin who hides
 * something and then sees it on the section page has been told a lie by their
 * own panel.
 */

const PRODUCTS = 'storeProducts';

export type ProductActionResult = { ok: true } | { ok: false; errorAr: string };

export interface SaveProductInput {
  productId: string;
  availability: string;
  level: string;
  linkProtocol: string;
  videoSystem: string;
  summaryAr: string;
  /** One per line, as typed. Split and trimmed here. */
  highlightsText: string;
  suitsText: string;
  notForText: string;
  inTheBoxText: string;
  weightGrams: string;
  dimensionsMm: { length: string; width: string; height: string };
  specs: {
    labelAr: string; valueAr: string; unitAr: string;
    status: string;
    sourceKind: string; sourceTitleAr: string; sourceUrl: string; checkedAt: string;
    disagreementAr: string;
  }[];
  images: {
    url: string; altAr: string;
    ownerAr: string; basis: string; evidenceUrl: string; sourceUrl: string;
    official: boolean; reviewedAt: string; needsReplacement: boolean;
  }[];
}

export async function saveProduct(input: SaveProductInput): Promise<ProductActionResult> {
  const gate = await authorise();
  if ('errorAr' in gate) return { ok: false, errorAr: gate.errorAr };

  const seed = storeProduct(input.productId);
  if (!seed) return { ok: false, errorAr: 'لا يوجد منتج بهذا المعرّف.' };

  if (!isAvailability(input.availability)) return { ok: false, errorAr: 'اختر حالة توفّر صحيحة.' };
  if (!isLevel(input.level)) return { ok: false, errorAr: 'اختر مستوى صحيحاً.' };
  if (!isProtocol(input.linkProtocol)) return { ok: false, errorAr: 'اختر بروتوكولاً صحيحاً.' };
  if (!isVideoSystem(input.videoSystem)) return { ok: false, errorAr: 'اختر نظام فيديو صحيحاً.' };

  const summaryAr = input.summaryAr.trim().slice(0, 600);
  if (summaryAr.length < 20) {
    return { ok: false, errorAr: 'الوصف قصير جداً — اكتب ما يكفي ليعرف المشتري ما هذا.' };
  }

  const notForAr = lines(input.notForText, 8);
  if (notForAr.length === 0) {
    // Required on the model and required here. It is the section that earns the
    // page its credibility, and a shop that skips it when busy has skipped the
    // only part no competitor writes.
    return { ok: false, errorAr: 'اكتب سطراً واحداً على الأقل في «لا يناسبك إن كنت».' };
  }

  const images = validateImages(input.images);
  if ('errorAr' in images) return { ok: false, errorAr: images.errorAr };
  const specs = validateSpecs(input.specs);
  if ('errorAr' in specs) return { ok: false, errorAr: specs.errorAr };

  const weightGrams = input.weightGrams.trim() ? Number(input.weightGrams) : null;
  if (weightGrams !== null && (!Number.isFinite(weightGrams) || weightGrams <= 0)) {
    return { ok: false, errorAr: 'الوزن يجب أن يكون رقماً أكبر من صفر، أو فارغاً.' };
  }

  const dims = validateDimensions(input.dimensionsMm);
  if ('errorAr' in dims) return { ok: false, errorAr: dims.errorAr };

  // `published` is carried through even though this screen does not change it.
  //
  // The rule on `storeProducts` reads `resource.data.published == true`, and a
  // document without the field fails that test — so a product whose FIRST
  // document came from this action would become unreadable to any client that
  // queried Firestore directly. Nothing customer-facing does today; the
  // storefront reads through the server. Writing the field anyway means the
  // document is correct on its own terms rather than correct because of who
  // happens to be reading it.
  const existing = await readPublished(input.productId, seed.published);

  const doc: Omit<ProductOverride, 'productId'> = {
    published: existing,
    availability: input.availability,
    level: input.level,
    linkProtocol: input.linkProtocol,
    videoSystem: input.videoSystem,
    summaryAr,
    highlightsAr: lines(input.highlightsText, 8),
    suitsAr: lines(input.suitsText, 8),
    notForAr,
    inTheBoxAr: lines(input.inTheBoxText, 20),
    images: images.value,
    specs: specs.value,
    weightGrams,
    dimensionsMm: dims.value,
    updatedAt: new Date().toISOString(),
    updatedBy: gate.session.uid,
  };

  const entryId = await logAudit(actorFromSession(gate.session), newRequestId(), {
    action: 'store.product.edit',
    targetType: 'product',
    targetId: input.productId,
    after: `availability=${doc.availability} images=${doc.images?.length ?? 0} specs=${doc.specs?.length ?? 0}`,
  });

  try {
    await adminDb().collection(PRODUCTS).doc(input.productId).set(doc, { merge: true });
    await markAuditResult(entryId, 'ok');
  } catch {
    await markAuditResult(entryId, 'error', 'write failed');
    return { ok: false, errorAr: 'تعذّر الحفظ. حاول مرة أخرى.' };
  }

  refresh(input.productId, seed.categoryId);
  return { ok: true };
}

/**
 * Showing or hiding a product.
 *
 * Separate from `saveProduct` because it is a different decision made at a
 * different moment — usually in a hurry, because something is wrong — and it
 * should not require filling in a form to make it.
 */
export async function setProductPublished(
  productId: string, published: boolean,
): Promise<ProductActionResult> {
  const gate = await authorise();
  if ('errorAr' in gate) return { ok: false, errorAr: gate.errorAr };

  const seed = storeProduct(productId);
  if (!seed) return { ok: false, errorAr: 'لا يوجد منتج بهذا المعرّف.' };

  // THE GATE. Everything else in this batch exists to make this line possible.
  //
  // Checked on the SERVER against the merged product, not against whatever the
  // panel was showing. The panel disables the button when there are blockers;
  // that is a courtesy. This is the boundary, and it is the reason a product
  // cannot be published by a stale tab, a replayed request, or a colleague who
  // was sure the images were fine.
  //
  // Unpublishing is never gated. The moment you need something off the shop is
  // not the moment to be told it is incomplete.
  if (published) {
    const product = await resolvedProduct(productId);
    if (!product) return { ok: false, errorAr: 'لا يوجد منتج بهذا المعرّف.' };
    if (product.suspendedReasonAr) {
      return {
        ok: false,
        errorAr: 'هذا المنتج موقوف بقرار. ارفع الإيقاف أولاً، لأن سببه لا يزول بإكمال البيانات.',
      };
    }
    const supply = await supplyFor(productId);
    const blockers = publicationBlockers({
      product,
      supply,
      priceReviewDays: INITIAL_PRIVATE_SETTINGS.priceReviewDays,
      now: new Date().toISOString(),
    });
    if (blockers.length > 0) {
      return {
        ok: false,
        errorAr: `لا يمكن نشره بعد: ${blockers.map(b => b.messageAr).join(' ')}`,
      };
    }
  }

  const entryId = await logAudit(actorFromSession(gate.session), newRequestId(), {
    action: 'store.product.publish',
    targetType: 'product',
    targetId: productId,
    after: published ? 'published' : 'hidden',
  });

  try {
    await adminDb().collection(PRODUCTS).doc(productId).set({
      published,
      updatedAt: new Date().toISOString(),
      updatedBy: gate.session.uid,
    }, { merge: true });
    await markAuditResult(entryId, 'ok');
  } catch {
    await markAuditResult(entryId, 'error', 'write failed');
    return { ok: false, errorAr: 'تعذّر الحفظ. حاول مرة أخرى.' };
  }

  refresh(productId, seed.categoryId);
  return { ok: true };
}

/**
 * Taking a product off the shop for a reason, or putting the reason away.
 *
 * Distinct from unpublishing, and the difference matters operationally: an
 * unpublished product is one that is not ready, and it becomes ready when
 * somebody finishes it. A suspended product had everything and was pulled
 * anyway — a recall, a supplier that stopped answering — and it must not drift
 * back into «جاهز للنشر» because a spec got filled in.
 *
 * The reason is required. «Suspended» with no reason is a mystery for whoever
 * finds it in three months, and they will either publish it blindly or leave it
 * forever.
 */
export async function setProductSuspension(
  productId: string, reasonAr: string | null,
): Promise<ProductActionResult> {
  const gate = await authorise();
  if ('errorAr' in gate) return { ok: false, errorAr: gate.errorAr };

  const seed = storeProduct(productId);
  if (!seed) return { ok: false, errorAr: 'لا يوجد منتج بهذا المعرّف.' };

  const reason = reasonAr === null ? null : reasonAr.trim().slice(0, 300);
  if (reason !== null && reason.length < 10) {
    return { ok: false, errorAr: 'اكتب سبب الإيقاف. «موقوف» بلا سبب لغز لمن يجده لاحقاً.' };
  }

  const entryId = await logAudit(actorFromSession(gate.session), newRequestId(), {
    action: 'store.product.publish',
    targetType: 'product',
    targetId: productId,
    after: reason === null ? 'unsuspended' : `suspended: ${reason}`,
  });

  try {
    await adminDb().collection(PRODUCTS).doc(productId).set({
      suspendedReasonAr: reason,
      // Suspending takes it off the shop in the same write. Two writes means a
      // window in which it is suspended and still selling.
      ...(reason === null ? {} : { published: false }),
      updatedAt: new Date().toISOString(),
      updatedBy: gate.session.uid,
    }, { merge: true });
    await markAuditResult(entryId, 'ok');
  } catch {
    await markAuditResult(entryId, 'error', 'write failed');
    return { ok: false, errorAr: 'تعذّر الحفظ. حاول مرة أخرى.' };
  }

  refresh(productId, seed.categoryId);
  return { ok: true };
}

// ── the gate ────────────────────────────────────────────────────────────────

type Gate = { session: Awaited<ReturnType<typeof getSession>> & object } | { errorAr: string };

/**
 * One capability for both actions.
 *
 * `store.editProducts` already gates pricing. Splitting «may edit copy» from
 * «may hide» would be a distinction nobody in this shop needs, and an unused
 * capability is one that gets granted carelessly because nobody remembers what
 * it does.
 */
async function authorise(): Promise<Gate> {
  const session = await getSession();
  if (!session || !sessionCan(session, 'store.editProducts')) {
    return { errorAr: 'لا تملك صلاحية تعديل المنتجات.' };
  }
  if (!isAdminConfigured()) return { errorAr: 'الاتصال بقاعدة البيانات غير متاح.' };
  return { session };
}

/** The product's current visibility — the stored value if there is one. */
async function readPublished(productId: string, fallback: boolean): Promise<boolean> {
  try {
    const doc = await adminDb().collection(PRODUCTS).doc(productId).get();
    const v = doc.exists ? (doc.data() as { published?: unknown }).published : undefined;
    return typeof v === 'boolean' ? v : fallback;
  } catch {
    return fallback;
  }
}

function refresh(productId: string, categoryId: string): void {
  revalidatePath(`/store/p/${productId}`);
  revalidatePath(`/store/${categoryId}`);
  revalidatePath('/store');
  revalidatePath('/admin/store/products');
}

// ── validation ──────────────────────────────────────────────────────────────

/** Textarea lines → a trimmed list, with blanks dropped. */
function lines(text: string, max: number): string[] {
  return text.split('\n').map(l => l.trim()).filter(Boolean).slice(0, max);
}

type Validated<T> = { value: T } | { errorAr: string };

/**
 * Images, refused rather than saved when the provenance is missing.
 *
 * The brief was specific and it is the correct instinct: real product
 * photography, not AI, not scraped. This cannot verify that an image is real —
 * no code can — so it enforces the thing that actually protects the shop, which
 * is that every image carries a named owner, the terms it is used under, and
 * the date somebody last checked both. An image nobody can account for is
 * refused at the point of saving, where there is still somebody to ask.
 */
function validateImages(raw: SaveProductInput['images']): Validated<ProductImage[]> {
  const out: ProductImage[] = [];
  for (const [i, img] of raw.entries()) {
    const url = img.url.trim();
    if (!url) continue;
    if (!/^(\/|https:\/\/)/.test(url)) {
      return { errorAr: `الصورة ${i + 1}: الرابط يجب أن يبدأ بـ https:// أو بمسار داخلي.` };
    }
    const altAr = img.altAr.trim();
    if (altAr.length < 3) {
      return { errorAr: `الصورة ${i + 1}: اكتب وصفاً بديلاً — من لا يرى الصورة يحتاجه.` };
    }
    const ownerAr = img.ownerAr.trim();
    if (!ownerAr) {
      return { errorAr: `الصورة ${i + 1}: اكتب صاحب الصورة.` };
    }
    if (!isBasis(img.basis)) {
      return {
        errorAr: `الصورة ${i + 1}: اختر أساس الاستخدام من القائمة. «وجدتها على الإنترنت» ليس أساساً.`,
      };
    }
    // The link to the grant, not to the picture. A product page proves the
    // photo exists, which was never the question.
    const evidenceUrl = img.evidenceUrl.trim();
    if (!/^https:\/\//.test(evidenceUrl)) {
      return {
        errorAr: `الصورة ${i + 1}: ضع رابط الإذن نفسه — الصفحة التي يُقرأ فيها التصريح، لا صفحة المنتج.`,
      };
    }
    const reviewedAt = img.reviewedAt.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewedAt)) {
      return { errorAr: `الصورة ${i + 1}: تاريخ المراجعة بصيغة YYYY-MM-DD.` };
    }
    out.push({
      url: url.slice(0, 500),
      altAr: altAr.slice(0, 200),
      order: out.length,
      credit: {
        ownerAr: ownerAr.slice(0, 120),
        basis: img.basis,
        evidenceUrl: evidenceUrl.slice(0, 500),
        ...(img.sourceUrl.trim() ? { sourceUrl: img.sourceUrl.trim().slice(0, 500) } : {}),
        official: img.official,
        reviewedAt,
        ...(img.needsReplacement ? { needsReplacement: true } : {}),
      },
    });
    if (out.length >= 8) break;
  }
  return { value: out };
}

/**
 * Specs, with the source required whenever «مؤكَّد» is ticked.
 *
 * The rule from the brief — «لا تخترع أي مواصفة» — is not enforceable by code
 * either. What is enforceable is that a claim marked as confirmed has to say
 * where it was confirmed, which turns an invented spec into a visible blank
 * somebody has to fill in deliberately.
 */
function validateSpecs(raw: SaveProductInput['specs']): Validated<ProductSpec[]> {
  const out: ProductSpec[] = [];
  for (const [i, s] of raw.entries()) {
    const labelAr = s.labelAr.trim();
    const valueAr = s.valueAr.trim();
    if (!labelAr && !valueAr) continue;
    if (!labelAr || !valueAr) {
      return { errorAr: `المواصفة ${i + 1}: اكتب الاسم والقيمة معاً، أو اترك السطر فارغاً.` };
    }
    if (!isSpecStatus(s.status)) {
      return { errorAr: `المواصفة «${labelAr}»: اختر حالة تحقّق صحيحة.` };
    }

    const sourceUrl = s.sourceUrl.trim();
    const checkedAt = s.checkedAt.trim();
    if (s.status === 'verified') {
      if (!isSourceKind(s.sourceKind)) {
        return { errorAr: `المواصفة «${labelAr}»: اختر نوع المصدر.` };
      }
      if (!/^https:\/\//.test(sourceUrl)) {
        return {
          errorAr: `المواصفة «${labelAr}»: علّمتها مؤكَّدة بلا مصدر. ضع رابط وثيقة الشركة، أو غيّر الحالة إلى «بانتظار التأكيد».`,
        };
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(checkedAt)) {
        return { errorAr: `المواصفة «${labelAr}»: اكتب تاريخ التحقّق بصيغة YYYY-MM-DD.` };
      }
      // A review corroborates; it never carries a claim on its own. Otherwise
      // «someone on YouTube said 80mm» becomes a specification.
      if (s.sourceKind === 'independent-review') {
        return {
          errorAr: `المواصفة «${labelAr}»: المراجعة المستقلّة تُعضِّد ولا تُثبت وحدها. استعمل صفحة الشركة أو دليلها.`,
        };
      }
    }
    // «The sources disagree» is only useful if it says how.
    if (s.status === 'disputed' && !s.disagreementAr.trim()) {
      return {
        errorAr: `المواصفة «${labelAr}»: اكتب ما قالته المصادر المختلفة. «مختلف عليها» وحدها لا تفيد القارئ.`,
      };
    }

    out.push({
      labelAr: labelAr.slice(0, 80),
      valueAr: valueAr.slice(0, 160),
      ...(s.unitAr.trim() ? { unitAr: s.unitAr.trim().slice(0, 24) } : {}),
      status: s.status,
      ...(s.status === 'verified' && isSourceKind(s.sourceKind)
        ? {
          source: {
            kind: s.sourceKind,
            titleAr: (s.sourceTitleAr.trim() || 'صفحة المصدر').slice(0, 160),
            url: sourceUrl.slice(0, 500),
            checkedAt,
          },
        }
        : {}),
      ...(s.disagreementAr.trim() ? { disagreementAr: s.disagreementAr.trim().slice(0, 300) } : {}),
    });
    if (out.length >= 24) break;
  }
  return { value: out };
}

function isBasis(v: string): v is ImageLicenceBasis {
  return (IMAGE_BASIS_LABEL_AR as Record<string, string>)[v] !== undefined;
}
function isSpecStatus(v: string): v is SpecStatus {
  return v === 'verified' || v === 'pending' || v === 'disputed';
}
function isSourceKind(v: string): v is SpecSourceKind {
  return ['manufacturer-page', 'manufacturer-manual', 'reseller', 'independent-review'].includes(v);
}

function validateDimensions(
  d: SaveProductInput['dimensionsMm'],
): Validated<{ length: number; width: number; height: number } | null> {
  const parts = [d.length, d.width, d.height].map(v => v.trim());
  if (parts.every(v => !v)) return { value: null };
  if (parts.some(v => !v)) {
    return { errorAr: 'الأبعاد: اكتب الأضلاع الثلاثة، أو اتركها كلها فارغة.' };
  }
  const [length, width, height] = parts.map(Number);
  if (![length, width, height].every(n => Number.isFinite(n) && n > 0)) {
    return { errorAr: 'الأبعاد: أرقام أكبر من صفر بالمليمتر.' };
  }
  return { value: { length, width, height } };
}

function isAvailability(v: string): v is Availability {
  return ['in-stock', 'limited', 'made-to-order', 'needs-confirmation',
    'out-of-stock', 'discontinued', 'coming-soon'].includes(v);
}
function isLevel(v: string): v is BuyerLevel {
  return ['beginner', 'intermediate', 'advanced'].includes(v);
}
function isProtocol(v: string): v is LinkProtocol {
  return ['elrs', 'crossfire', 'tracer', 'ghost', 'frsky', 'dji', 'none'].includes(v);
}
function isVideoSystem(v: string): v is VideoSystem {
  return ['analog', 'dji', 'walksnail', 'hdzero', 'none'].includes(v);
}
