import type { SupabaseClient } from '@supabase/supabase-js';

import { NOT_CONFIGURED_AR, SUPABASE_URL } from './env';
import type { BucketName, StoragePort, UploadInput } from '../ports';

/**
 * The storage adapter — four buckets, and no opinion about who owns a path.
 *
 * WHY THERE IS NO OWNERSHIP CHECK IN THIS FILE
 * ============================================
 * There is one, and it is in `supabase/migrations/0003_storage.sql`:
 * `storage_path_is_own()` compares the first path segment to `auth.uid()`, and
 * every INSERT, UPDATE and DELETE policy on a user-owned bucket calls it.
 *
 * Repeating that check here would be worse than useless. A client picks its own
 * path, so a check on the client is a suggestion — and a second copy of an
 * authorisation rule is a copy that can disagree with the first. The rule lives
 * in the database because the database is the only party that cannot be
 * bypassed. `ownedPath()` in `ports.ts` BUILDS a conforming path as a
 * convenience; this file does not verify one.
 *
 * The same goes for size and MIME: `0003` sets `file_size_limit` and
 * `allowed_mime_types` on each bucket AND re-checks both in the policies from
 * `metadata`, because the declarative limits are enforced by the Storage API
 * while the policies are enforced by PostgreSQL, and only one of those is
 * reachable by every path into the data.
 *
 * WHY FAILURES ARE ARABIC SENTENCES AND NOT PROVIDER MESSAGES
 * ===========================================================
 * A policy refusal comes back as `new row violates row-level security policy`.
 * That is the correct thing for a log and the wrong thing for a person holding
 * a phone. Each failure below is mapped to a sentence that says what to do
 * about it, and the provider's text goes to `console` where an engineer can
 * find it.
 */

export function makeStorage(sb: SupabaseClient | null): StoragePort {
  return {
    async upload(input: UploadInput) {
      if (!sb) return { ok: false, errorAr: NOT_CONFIGURED_AR };
      try {
        const { error } = await sb.storage
          .from(input.bucket)
          .upload(input.path, input.file, {
            contentType: input.contentType,
            // NEVER `upsert: true`. An upsert on a shared bucket lets a
            // correctly-authorised caller overwrite an object at a path it
            // guessed — and the policies authorise by PATH PREFIX, not by who
            // wrote the file first. Refusing the collision means a duplicate
            // path is an error somebody sees, not a photo somebody lost.
            upsert: false,
          });

        if (error) {
          console.error('[storage] upload failed', input.bucket, error.message);
          return { ok: false, errorAr: uploadErrorAr(error.message) };
        }
        return { ok: true, url: publicUrlFor(input.bucket, input.path) };
      } catch (e) {
        console.error('[storage] upload threw', input.bucket, e);
        return { ok: false, errorAr: 'تعذّر رفع الملف. تحقّق من اتصالك وحاول مرة أخرى.' };
      }
    },

    async remove(bucket: BucketName, path: string) {
      if (!sb) return { ok: false, errorAr: NOT_CONFIGURED_AR };
      try {
        const { error } = await sb.storage.from(bucket).remove([path]);
        if (error) {
          console.error('[storage] remove failed', bucket, error.message);
          return { ok: false, errorAr: 'تعذّر حذف الملف. حاول مرة أخرى.' };
        }
        return { ok: true };
      } catch (e) {
        console.error('[storage] remove threw', bucket, e);
        return { ok: false, errorAr: 'تعذّر حذف الملف. حاول مرة أخرى.' };
      }
    },

    publicUrl: publicUrlFor,
  };
}

/**
 * The public URL of an object, computed rather than fetched.
 *
 * All four buckets are `public = true` in `0003`, so the URL is a pure function
 * of bucket and path — `getPublicUrl()` in the SDK does exactly this string
 * concatenation and returns no error. Computing it here means a component can
 * render an `<img>` synchronously, during server rendering, without awaiting a
 * client it may not have.
 *
 * PUBLIC IS A DELIBERATE CHOICE, NOT AN OVERSIGHT. A signed URL expires, and an
 * expiring URL cannot be put in a static manifest, cached by a CDN, or shared.
 * What protects these buckets is that WRITING to them is policed by
 * `storage.objects` policies; reading a product photograph is not something to
 * police.
 */
function publicUrlFor(bucket: BucketName, path: string): string {
  if (!SUPABASE_URL) return '';
  const clean = path.replace(/^\/+/, '');
  return `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/public/${bucket}/${clean
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}

/**
 * A provider message → a sentence somebody can act on.
 *
 * The three cases are the three real ones: the bucket refused the size, the
 * bucket refused the type, or a policy refused the caller. Everything else gets
 * the generic sentence, because inventing a specific diagnosis for an
 * unrecognised error is how a UI tells a user to fix the wrong thing.
 */
function uploadErrorAr(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('exceeded') || m.includes('too large') || m.includes('payload')) {
    return 'الملف أكبر من الحد المسموح. اضغط الصورة أو اختر ملفاً أصغر.';
  }
  if (m.includes('mime') || m.includes('content type') || m.includes('not supported')) {
    return 'نوع الملف غير مدعوم. استخدم JPG أو PNG أو WebP.';
  }
  if (m.includes('row-level security') || m.includes('policy') || m.includes('unauthorized')) {
    return 'لا تملك صلاحية الرفع هنا. سجّل الدخول وحاول مرة أخرى.';
  }
  if (m.includes('duplicate') || m.includes('already exists')) {
    return 'يوجد ملف بنفس الاسم. أعد المحاولة — سيُعطى الملف اسماً جديداً.';
  }
  return 'تعذّر رفع الملف. حاول مرة أخرى.';
}
