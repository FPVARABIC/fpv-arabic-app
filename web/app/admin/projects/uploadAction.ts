'use server';

import { getSession, sessionCan } from '@/lib/server/session';
import { uploadServiceObject, isServiceConfigured } from '@/lib/backend/supabase/adminData';
import { SUPABASE_URL } from '@/lib/backend/supabase/env';
import { MAX_MEDIA_SIZE_BYTES } from '@/lib/mediaUpload';

/**
 * Writing a project's cover photograph.
 *
 * SAME POSTURE AS THE SHOP'S UPLOAD, FOR THE SAME REASON
 * ------------------------------------------------------
 * The panel's authority is a verified session holding `content.edit`. Letting
 * the browser write to Storage directly would mean the storage policies
 * re-deriving that permission as a role lookup — a second answer to «who may
 * upload», which drifts from the first the moment anybody adds a role. So the
 * `project-images` bucket accepts `is_admin()` clients only as defence in
 * depth, and the PANEL's path is this action: session first, service key
 * second.
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
  if (!isServiceConfigured()) return { ok: false, errorAr: 'التخزين غير متاح حالياً.' };

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
  const path = `${projectId}/${uuid}.jpg`;

  try {
    await uploadServiceObject('project-images', path, full, 'image/jpeg');
    return { ok: true, url: publicUrl('project-images', path) };
  } catch {
    return { ok: false, errorAr: 'تعذّر حفظ الصورة في التخزين. حاول مرة أخرى.' };
  }
}

/** The bucket is public — the URL is a pure function of bucket and path. */
function publicUrl(bucket: string, path: string): string {
  return `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/public/${bucket}/${path
    .split('/').map(encodeURIComponent).join('/')}`;
}
