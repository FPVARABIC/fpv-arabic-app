'use server';

import { revalidatePath } from 'next/cache';
import { getSession, sessionCan } from '@/lib/server/session';
import { adminDb, isAdminConfigured } from '@/lib/server/firebaseAdmin';
import { actorFromSession, logAudit, markAuditResult, newRequestId } from '@/lib/server/audit';
import { storeProduct } from '@core/data/store/catalogue';
import type { ProductOverride } from '@core/data/store/overrides';
import type {
  Availability, BuyerLevel, LinkProtocol, ProductImage, ProductSpec, VideoSystem,
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
  specs: { labelAr: string; valueAr: string; verified: boolean; sourceUrl: string }[];
  images: {
    url: string; altAr: string;
    ownerAr: string; permissionAr: string; sourceUrl: string;
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
    const permissionAr = img.permissionAr.trim();
    if (!ownerAr || !permissionAr) {
      return { errorAr: `الصورة ${i + 1}: اكتب صاحب الصورة وشروط استخدامها. صورة بلا مصدر لا تُنشر.` };
    }
    const reviewedAt = img.reviewedAt.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewedAt)) {
      return { errorAr: `الصورة ${i + 1}: تاريخ المراجعة بصيغة YYYY-MM-DD.` };
    }
    out.push({
      url: url.slice(0, 500),
      altAr: altAr.slice(0, 200),
      credit: {
        ownerAr: ownerAr.slice(0, 120),
        permissionAr: permissionAr.slice(0, 200),
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
    const sourceUrl = s.sourceUrl.trim();
    if (s.verified && !sourceUrl) {
      return {
        errorAr: `المواصفة «${labelAr}»: علّمتها مؤكَّدة بلا مصدر. ضع رابط وثيقة الشركة، أو أزل التأكيد.`,
      };
    }
    out.push({
      labelAr: labelAr.slice(0, 80),
      valueAr: valueAr.slice(0, 160),
      verified: s.verified,
      ...(sourceUrl ? { sourceUrl: sourceUrl.slice(0, 500) } : {}),
    });
    if (out.length >= 24) break;
  }
  return { value: out };
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
  return ['in-stock', 'made-to-order', 'out-of-stock', 'coming-soon'].includes(v);
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
