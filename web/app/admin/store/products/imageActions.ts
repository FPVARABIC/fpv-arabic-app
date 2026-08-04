'use server';

import { revalidatePath } from 'next/cache';
import { getSession, sessionCan } from '@/lib/server/session';
import { adminDb, isAdminConfigured } from '@/lib/server/firebaseAdmin';
import { actorFromSession, logAudit, markAuditResult, newRequestId } from '@/lib/server/audit';
import { storeProduct } from '@core/data/store/catalogue';
import {
  IMAGE_BASIS_LABEL_AR, isImagePublishable, MAX_PRODUCT_IMAGES,
} from '@core/data/store/types';
import type { ImageLicenceBasis, ProductImage } from '@core/data/store/types';

/**
 * Saving a product's gallery.
 *
 * WHY THE WHOLE LIST, EVERY TIME
 * ------------------------------
 * Upload, delete, reorder and credit-edit all arrive here as the complete
 * gallery. Order is position in the array, so a reorder is just a different
 * array — there is no separate «move» operation that could half-apply and leave
 * two images both claiming to be first.
 *
 * WHY AN INCOMPLETE IMAGE IS SAVED AND NOT REFUSED
 * ------------------------------------------------
 * Because refusing it stops the work. Somebody with fifteen photographs to
 * upload should be able to upload fifteen photographs and come back to the
 * paperwork; a form that demands a licence basis before it will accept a file
 * turns an afternoon into an argument. So the record is kept as it is, and
 * `isImagePublishable` decides separately whether the shop may SHOW it — which
 * it will not, and the product page and the queue both say so.
 *
 * The alt text is the one thing this refuses to silently drop, because an image
 * with no alt text is one a blind customer cannot know exists.
 */

const PRODUCTS = 'storeProducts';

export interface ImageInput {
  url: string;
  thumbnailUrl: string;
  altAr: string;
  ownerAr: string;
  /** Empty until somebody has answered the licensing question. */
  basis: string;
  evidenceUrl: string;
  sourceUrl: string;
  official: boolean;
  reviewedAt: string;
  needsReplacement: boolean;
}

export type ImageActionResult = { ok: true; publishable: number } | { ok: false; errorAr: string };

export async function saveProductImages(
  productId: string, input: ImageInput[],
): Promise<ImageActionResult> {
  const session = await getSession();
  if (!session || !sessionCan(session, 'store.editProducts')) {
    return { ok: false, errorAr: 'لا تملك صلاحية تعديل المنتجات.' };
  }
  if (!isAdminConfigured()) return { ok: false, errorAr: 'الاتصال بقاعدة البيانات غير متاح.' };

  const seed = storeProduct(productId);
  if (!seed) return { ok: false, errorAr: 'لا يوجد منتج بهذا المعرّف.' };
  if (!Array.isArray(input)) return { ok: false, errorAr: 'بيانات الصور غير صالحة.' };
  if (input.length > MAX_PRODUCT_IMAGES) {
    return { ok: false, errorAr: `الحد ${MAX_PRODUCT_IMAGES} صور للمنتج الواحد.` };
  }

  const images: ProductImage[] = [];
  for (const [i, raw] of input.entries()) {
    const url = String(raw.url ?? '').trim();
    if (!url) continue;
    // Only somewhere we control. A gallery that can point at any host is a
    // gallery that can point at a tracker, and the upload path never produces
    // anything but a Firebase Storage URL.
    if (!isAcceptableImageUrl(url)) {
      return {
        ok: false,
        errorAr: `الصورة ${i + 1}: الرابط ليس من التخزين الخاص بالمنصّة. ارفع الصورة بدل لصق رابط خارجي.`,
      };
    }

    const basis = String(raw.basis ?? '').trim();
    if (basis && !isBasis(basis)) {
      return { ok: false, errorAr: `الصورة ${i + 1}: أساس استخدام غير معروف.` };
    }
    const reviewedAt = String(raw.reviewedAt ?? '').trim();
    if (reviewedAt && !/^\d{4}-\d{2}-\d{2}$/.test(reviewedAt)) {
      return { ok: false, errorAr: `الصورة ${i + 1}: تاريخ المراجعة بصيغة YYYY-MM-DD.` };
    }

    const ownerAr = String(raw.ownerAr ?? '').trim().slice(0, 120);
    const evidenceUrl = String(raw.evidenceUrl ?? '').trim().slice(0, 500);

    images.push({
      url: url.slice(0, 800),
      ...(String(raw.thumbnailUrl ?? '').trim()
        ? { thumbnailUrl: String(raw.thumbnailUrl).trim().slice(0, 800) }
        : {}),
      altAr: String(raw.altAr ?? '').trim().slice(0, 200),
      // Position in the array IS the order. One source of truth, so a reorder
      // cannot disagree with itself.
      order: images.length,
      // The credit is written only when there is something in it, so an
      // incomplete image is genuinely credit-less rather than carrying a husk
      // that `isImagePublishable` then has to see through.
      ...(basis || ownerAr || evidenceUrl || reviewedAt
        ? {
          credit: {
            ownerAr,
            basis: (basis || 'written-permission') as ImageLicenceBasis,
            evidenceUrl,
            ...(String(raw.sourceUrl ?? '').trim()
              ? { sourceUrl: String(raw.sourceUrl).trim().slice(0, 500) }
              : {}),
            official: !!raw.official,
            reviewedAt,
            ...(raw.needsReplacement ? { needsReplacement: true } : {}),
          },
        }
        : {}),
    });
  }

  const publishable = images.filter(isImagePublishable).length;

  const entryId = await logAudit(actorFromSession(session), newRequestId(), {
    action: 'store.product.images',
    targetType: 'product',
    targetId: productId,
    after: `${images.length} صورة، ${publishable} صالحة للعرض`,
  });

  try {
    await adminDb().collection(PRODUCTS).doc(productId).set({
      images,
      updatedAt: new Date().toISOString(),
      updatedBy: session.uid,
    }, { merge: true });
    await markAuditResult(entryId, 'ok');
  } catch {
    await markAuditResult(entryId, 'error', 'write failed');
    return { ok: false, errorAr: 'تعذّر الحفظ. حاول مرة أخرى.' };
  }

  revalidatePath(`/store/p/${productId}`);
  revalidatePath(`/store/${seed.categoryId}`);
  revalidatePath('/store');
  revalidatePath('/admin/store/products');
  revalidatePath(`/admin/store/products/${productId}`);
  return { ok: true, publishable };
}

/**
 * Whether a URL is one this shop produced.
 *
 * Firebase Storage download URLs, and relative paths for the handful of assets
 * that ship with the build. Nothing else — a gallery that accepts an arbitrary
 * host is a gallery through which somebody can put a tracking pixel on every
 * product page, and the upload button never produces one anyway.
 */
function isAcceptableImageUrl(url: string): boolean {
  if (url.startsWith('/')) return true;
  return /^https:\/\/(firebasestorage\.googleapis\.com|storage\.googleapis\.com)\//.test(url)
    // The Storage emulator, so the end-to-end run exercises the real path.
    || /^https?:\/\/(localhost|127\.0\.0\.1):\d+\/v0\/b\//.test(url);
}

function isBasis(v: string): v is ImageLicenceBasis {
  return (IMAGE_BASIS_LABEL_AR as Record<string, string>)[v] !== undefined;
}
