'use client';

import { useState } from 'react';
import { compressProductImage, blobToBase64 } from '@/lib/mediaUpload';
import { uploadProjectImage } from '@/app/admin/projects/uploadAction';
import { setProjectImage } from '@/app/admin/projects/actions';

/**
 * The project's cover photograph.
 *
 * WHY IT SAVES BY ITSELF AND NOT WITH THE FORM
 * --------------------------------------------
 * Same reason the shop's gallery does: uploading a picture and writing a
 * definition are different jobs done at different moments, and folding them
 * into one submit means a validation error in the text throws away an upload
 * that already succeeded.
 *
 * WHY THERE IS NO «paste an image URL» FIELD
 * ------------------------------------------
 * The standing instruction on this platform is that every photograph is one we
 * are entitled to publish — no generated images, no copied ones. A URL field is
 * a one-click machine for violating that, and it would be used, because it is
 * easier than finding a real photograph. Uploading a file you hold is the only
 * path, and it is deliberate friction.
 *
 * The compression is the SHARED pipeline — the same MIME allow-list, the same
 * 1600px target, the same 300KB budget, the same decode check and EXIF
 * stripping as a community post. A second set of limits would be a second
 * answer to «what may be uploaded», and Storage only enforces one.
 */
export const ProjectImageField: React.FC<{
  projectId: string;
  imageUrl: string | null;
}> = ({ projectId, imageUrl }) => {
  const [url, setUrl] = useState(imageUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const shrunk = await compressProductImage(file);
      if (!shrunk) { setError('تعذّر قراءة الصورة أو ضغطها. جرّب ملفاً آخر.'); return; }
      const up = await uploadProjectImage({
        projectId,
        fullBase64: await blobToBase64(shrunk.full),
      });
      if (!up.ok) { setError(up.errorAr); return; }
      const saved = await setProjectImage(projectId, up.url);
      if (!saved.ok) { setError(saved.errorAr); return; }
      setUrl(up.url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setError(msg === 'NOT_AN_ALLOWED_IMAGE_TYPE'
        ? 'صيغة غير مدعومة. استعمل JPG أو PNG أو WebP.'
        : `تعذّر الرفع${msg ? ` — ${msg}` : ''}.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pe-field" data-testid="project-image-field">
      <span>صورة الغلاف</span>

      {url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- a Storage
              download URL, whose host is not in the image config; and this is
              an admin screen, not a page whose LCP anybody measures. */}
          <img
            src={url}
            alt="صورة غلاف المشروع"
            style={{ maxWidth: 280, borderRadius: 10, display: 'block', marginBottom: 8 }}
          />
          <button
            type="button"
            className="admin-danger"
            data-testid="project-image-clear"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              const r = await setProjectImage(projectId, null);
              setBusy(false);
              if (r.ok) setUrl(null);
              else setError(r.errorAr);
            }}
            style={{ fontSize: 12 }}
          >
            احذف الصورة
          </button>
        </>
      ) : (
        <p style={{ fontSize: 12.5, color: 'var(--text-dimmer)', margin: '0 0 8px', lineHeight: 1.85 }}>
          لا صورة بعد. البطاقة تعرض حرف المشروع الأوّل بدل مربّع رمادي، فالقسم
          يعمل بلا صور — والصورة تحسينٌ لا شرط.
        </p>
      )}

      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        data-testid="project-image-input"
        disabled={busy}
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) void onPick(f);
          e.target.value = '';
        }}
      />
      <small>
        ارفع صورة تملك حقّ نشرها — صورة الشركة المصنّعة بإذنها، أو صورتك أنت. لا
        صوراً مولَّدة ولا منسوخة.
      </small>
      {busy && <small>يرفع…</small>}
      {error && (
        <span role="alert" style={{ fontSize: 12, color: 'var(--sev-blocker)' }}>{error}</span>
      )}
    </div>
  );
};
