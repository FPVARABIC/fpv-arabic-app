'use server';

import { getSession, sessionCan } from '@/lib/server/session';
import { adminStorage, storageBucketName, isAdminConfigured } from '@/lib/server/firebaseAdmin';
import { storeProduct } from '@core/data/store/catalogue';
import { storeImageFolderPath } from '@core/community/utils/firestorePaths';
import { MAX_MEDIA_SIZE_BYTES } from '@core/community/Composer/mediaPipeline';

/**
 * Writing a product photograph.
 *
 * WHY THE SERVER AND NOT THE BROWSER
 * ----------------------------------
 * The panel's authority is a verified session holding `store.editProducts`.
 * Letting the browser write directly to Storage would mean `storage.rules`
 * re-deriving that permission as a role lookup — a second answer to «who may
 * upload a product photograph», which drifts from the first the moment anybody
 * adds a role. Here there is one answer, and it is the capability model the
 * rest of the panel already uses.
 *
 * It also removes a whole failure mode: the admin panel authenticates by
 * server session, and a browser whose Firebase SDK is signed out — or signed in
 * as somebody else — would fail an upload for reasons nobody could see. This
 * cannot happen if the browser never talks to Storage.
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
  if (!isAdminConfigured()) return { ok: false, errorAr: 'التخزين غير متاح حالياً.' };
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
  const folder = storeImageFolderPath(payload.productId);

  try {
    const bucket = adminStorage().bucket(storageBucketName());
    const fullFile = bucket.file(`${folder}/${uuid}.jpg`);
    const thumbFile = bucket.file(`${folder}/${uuid}_thumb.jpg`);
    // A download token, so the URL works exactly like one the client SDK would
    // have produced — same shape, same public readability, no signed-URL expiry
    // to renew and nothing for the storefront to special-case.
    const token = crypto.randomUUID();
    const metadata = {
      contentType: 'image/jpeg',
      metadata: { firebaseStorageDownloadTokens: token },
    };
    await Promise.all([
      fullFile.save(full, { metadata, resumable: false }),
      thumbFile.save(thumb, { metadata, resumable: false }),
    ]);
    return {
      ok: true,
      url: downloadUrl(bucket.name, `${folder}/${uuid}.jpg`, token),
      thumbnailUrl: downloadUrl(bucket.name, `${folder}/${uuid}_thumb.jpg`, token),
    };
  } catch {
    return { ok: false, errorAr: 'تعذّر حفظ الصورة في التخزين. حاول مرة أخرى.' };
  }
}

/**
 * The public download URL for an object.
 *
 * Built rather than requested because `getDownloadURL` is a client-SDK call and
 * the Admin SDK has no equivalent. The shape is fixed and documented, and the
 * emulator serves the same one — which is what lets the end-to-end run exercise
 * the real path rather than a stub.
 */
function downloadUrl(bucket: string, path: string, token: string): string {
  const host = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  const base = host ? `http://${host}` : 'https://firebasestorage.googleapis.com';
  return `${base}/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}
