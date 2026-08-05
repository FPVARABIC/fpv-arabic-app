'use server';

import { getSession, sessionCan } from '@/lib/server/session';
import { adminStorage, storageBucketName, isAdminConfigured } from '@/lib/server/firebaseAdmin';
import { MAX_MEDIA_SIZE_BYTES } from '@core/community/Composer/mediaPipeline';

/**
 * Writing a project's cover photograph.
 *
 * SAME POSTURE AS THE SHOP'S UPLOAD, FOR THE SAME REASON
 * ------------------------------------------------------
 * The panel's authority is a verified session holding `content.edit`. Letting
 * the browser write to Storage directly would mean `storage.rules` re-deriving
 * that permission as a role lookup — a second answer to «who may upload», which
 * drifts from the first the moment anybody adds a role.
 *
 * The browser still does the compression, because only the browser has the
 * file. This re-checks the size and the JPEG magic bytes, because both arrived
 * over the wire and are therefore claims.
 *
 * WHAT THIS DOES NOT DO
 * ---------------------
 * It does not fetch an image from a URL somebody pastes. Every photograph on
 * this platform has to be one the owner is entitled to publish — the standing
 * instruction is «لا تستخدم صور الذكاء الاصطناعي، ولا تنسخ صوراً عشوائية» — and
 * a server-side fetcher is a machine for copying other people's pictures.
 */

export type ProjectUploadResult =
  | { ok: true; url: string }
  | { ok: false; errorAr: string };

export interface ProjectUploadPayload {
  projectId: string;
  /** Base64, no data: prefix. Produced by the shared compression pipeline. */
  fullBase64: string;
}

export async function uploadProjectImage(
  payload: ProjectUploadPayload,
): Promise<ProjectUploadResult> {
  const session = await getSession();
  if (!session || !sessionCan(session, 'content.edit')) {
    return { ok: false, errorAr: 'لا تملك صلاحية رفع صور المشاريع.' };
  }
  if (!isAdminConfigured()) return { ok: false, errorAr: 'التخزين غير متاح حالياً.' };

  const projectId = payload.projectId.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(projectId)) {
    return { ok: false, errorAr: 'معرّف المشروع غير صالح.' };
  }

  let full: Buffer;
  try {
    full = Buffer.from(payload.fullBase64, 'base64');
  } catch {
    return { ok: false, errorAr: 'تعذّرت قراءة الصورة المرسلة.' };
  }
  if (full.length === 0) return { ok: false, errorAr: 'الصورة المرسلة فارغة.' };
  if (full.length > MAX_MEDIA_SIZE_BYTES) {
    return { ok: false, errorAr: 'الصورة أكبر من الحد بعد الضغط. جرّب صورة أصغر.' };
  }
  // A JPEG starts FF D8 FF. The pipeline re-encodes everything to JPEG, so
  // anything else did not come from it.
  if (!(full[0] === 0xff && full[1] === 0xd8 && full[2] === 0xff)) {
    return { ok: false, errorAr: 'الملف المرسل ليس صورة JPEG ناتجة عن الضغط.' };
  }

  const uuid = crypto.randomUUID();
  const path = `projects/${projectId}/${uuid}.jpg`;

  try {
    const bucket = adminStorage().bucket(storageBucketName());
    const token = crypto.randomUUID();
    await bucket.file(path).save(full, {
      metadata: {
        contentType: 'image/jpeg',
        metadata: { firebaseStorageDownloadTokens: token },
      },
      resumable: false,
    });
    return { ok: true, url: downloadUrl(bucket.name, path, token) };
  } catch {
    return { ok: false, errorAr: 'تعذّر حفظ الصورة في التخزين. حاول مرة أخرى.' };
  }
}

/** Same URL shape the client SDK would have produced. See the store's uploader. */
function downloadUrl(bucket: string, path: string, token: string): string {
  const host = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  const base = host ? `http://${host}` : 'https://firebasestorage.googleapis.com';
  return `${base}/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}
