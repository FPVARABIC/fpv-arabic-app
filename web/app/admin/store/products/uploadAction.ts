'use server';

import { getSession, sessionCan } from '@/lib/server/session';
import { uploadServiceObject, isServiceConfigured } from '@/lib/backend/supabase/adminData';
import { SUPABASE_URL } from '@/lib/backend/supabase/env';
import { storeProduct } from '@core/data/store/catalogue';
import { MAX_MEDIA_SIZE_BYTES } from '@/lib/mediaUpload';

/**
 * Writing a product photograph.
 *
 * WHY THE SERVER AND NOT THE BROWSER
 * ----------------------------------
 * The panel's authority is a verified session holding `store.editProducts`.
 * Letting the browser write directly to Storage would mean the storage
 * policies re-deriving that permission as a role lookup — a second answer to
 * «who may upload a product photograph», which drifts from the first the
 * moment anybody adds a role. Here there is one answer, and it is the capability model the
 * rest of the panel already uses.
 *
 * It also removes a whole failure mode: the admin panel authenticates by
 * server session, and a browser whose own auth state has drifted — signed
 * out, or signed in as somebody else — would fail an upload for reasons
 * nobody could see. This cannot happen if the browser never talks to
 * Storage.
 *
 * WHAT THE BROWSER STILL DOES
 * ---------------------------
 * The compression, because only the browser has the file. The MIME
 * allow-list, the 1600px/400px targets, the 300KB/40KB budgets, the decode
 * verification and the EXIF guarantee all live in the shared pipeline and are
 * unchanged. This re-checks the SIZE, because a size that arrived over the
 * wire is a claim.
 */

export type UploadResult =
  | { ok: true; url: string; thumbnailUrl: string }
  | { ok: false; errorAr: string };

export interface UploadPayload {
  productId: string;
  /** Base64, no data: prefix. Produced by `compressForUpload`. */
  fullBase64: string;
  thumbBase64: string;
}

export async function uploadProductPhoto(payload: UploadPayload): Promise<UploadResult> {
  const session = await getSession();
  if (!session || !sessionCan(session, 'store.editProducts')) {
    return { ok: false, errorAr: 'لا تملك صلاحية رفع صور المنتجات.' };
  }
  if (!isServiceConfigured()) return { ok: false, errorAr: 'التخزين غير متاح حالياً.' };
  if (!storeProduct(payload.productId)) {
    return { ok: false, errorAr: 'لا يوجد منتج بهذا المعرّف.' };
  }

  let full: Buffer;
  let thumb: Buffer;
  try {
    full = Buffer.from(payload.fullBase64, 'base64');
    thumb = Buffer.from(payload.thumbBase64, 'base64');
  } catch {
    return { ok: false, errorAr: 'تعذّرت قراءة الصورة المرسلة.' };
  }
  if (full.length === 0 || thumb.length === 0) {
    return { ok: false, errorAr: 'الصورة المرسلة فارغة.' };
  }
  // The browser compressed it to under this; the server verifies rather than
  // believes, because a size that arrived over the wire is a claim.
  if (full.length > MAX_MEDIA_SIZE_BYTES) {
    return { ok: false, errorAr: 'الصورة أكبر من الحد بعد الضغط. جرّب صورة أصغر.' };
  }
  // A JPEG starts FF D8 FF. The pipeline re-encodes everything to JPEG, so
  // anything else did not come from it.
  if (!(full[0] === 0xff && full[1] === 0xd8 && full[2] === 0xff)) {
    return { ok: false, errorAr: 'الملف المرسل ليس صورة JPEG ناتجة عن الضغط.' };
  }

  const uuid = crypto.randomUUID();
  // `{productId}/{uuid}.jpg` in the store-products bucket — the same shape the
  // committed manifest uses, minus the bucket-as-prefix that Firebase needed.
  const folder = payload.productId;

  try {
    await Promise.all([
      uploadServiceObject('store-products', `${folder}/${uuid}.jpg`, full, 'image/jpeg'),
      uploadServiceObject('store-products', `${folder}/${uuid}_thumb.jpg`, thumb, 'image/jpeg'),
    ]);
    return {
      ok: true,
      url: publicUrl('store-products', `${folder}/${uuid}.jpg`),
      thumbnailUrl: publicUrl('store-products', `${folder}/${uuid}_thumb.jpg`),
    };
  } catch {
    return { ok: false, errorAr: 'تعذّر حفظ الصورة في التخزين. حاول مرة أخرى.' };
  }
}

/** The bucket is public — the URL is a pure function of bucket and path. */
function publicUrl(bucket: string, path: string): string {
  return `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/public/${bucket}/${path
    .split('/').map(encodeURIComponent).join('/')}`;
}
