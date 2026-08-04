'use client';

import { useState } from 'react';
import { IMAGE_BASIS_LABEL_AR } from '@core/data/store/types';
import type { ProductImage } from '@core/data/store/types';
import { compressProductImage, blobToBase64 } from '@/lib/mediaUpload';
import { saveProductImages, type ImageInput } from '@/app/admin/store/products/imageActions';
import { uploadProductPhoto } from '@/app/admin/store/products/uploadAction';

/**
 * The shop's photographs — uploaded, ordered, credited, replaced.
 *
 * WHY THE UPLOAD IS THE FIRST THING AND THE PAPERWORK IS THE SECOND
 * -----------------------------------------------------------------
 * Because that is the order the work actually happens in. Somebody has ten
 * photographs and a job to do; asking for a licence basis before the file will
 * even go up turns a five-minute task into an argument. So: upload, see it,
 * order it, pick the main one — and the provenance sits underneath, marked as
 * what it is, filled in when the answer is known.
 *
 * An image with no recorded basis still uploads and still shows in this panel.
 * It does NOT show in the shop, and the product carries a warning that says so
 * — see `isImagePublishable`. That is the honest arrangement: the shop refuses
 * to publish what it cannot defend, and refuses to stop you working.
 *
 * WHY ORDERING IS ARROWS AND NOT DRAG-AND-DROP
 * --------------------------------------------
 * Drag-and-drop needs pointer events, a drag layer, keyboard equivalents for
 * anybody who cannot drag, and a touch story. Two buttons are usable by
 * everyone on the first try, work under a screen reader with no extra code, and
 * do the job — which is to move one photograph to the front.
 *
 * WHY EVERY CHANGE SAVES THROUGH ONE ACTION
 * -----------------------------------------
 * Upload, delete, reorder and credit-edit all end in `saveProductImages` with
 * the whole list. Partial writes are how a gallery ends up with two images
 * claiming order 0 after a failed request.
 */
export const ProductImages: React.FC<{
  productId: string;
  initial: ProductImage[];
}> = ({ productId, initial }) => {
  const [images, setImages] = useState<ImageInput[]>(initial.map(toInput));
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const commit = async (next: ImageInput[]) => {
    setImages(next);
    setPending(true);
    setError(null);
    setSaved(false);
    const r = await saveProductImages(productId, next);
    setPending(false);
    if (r.ok) setSaved(true);
    else setError(r.errorAr);
  };

  const onPick = async (file: File) => {
    setError(null);
    setSaved(false);
    setUploading(0);
    try {
      // Compressed here, because only the browser has the file. Written by the
      // server, because that is where the permission lives.
      const shrunk = await compressProductImage(file);
      if (!shrunk) { setError('تعذّر قراءة الصورة أو ضغطها. جرّب ملفاً آخر.'); return; }
      setUploading(50);
      const up = await uploadProductPhoto({
        productId,
        fullBase64: await blobToBase64(shrunk.full),
        thumbBase64: await blobToBase64(shrunk.thumb),
      });
      if (!up.ok) { setError(up.errorAr); return; }
      await commit([...images, {
        // The full image and its thumbnail both come back; the gallery shows
        // the full one and the card shows the thumbnail, which is what keeps a
        // section page from downloading eight full-size photographs.
        url: up.url,
        thumbnailUrl: up.thumbnailUrl,
        altAr: '',
        ownerAr: '',
        basis: '',
        evidenceUrl: '',
        sourceUrl: '',
        official: false,
        reviewedAt: '',
        needsReplacement: false,
      }]);
    } catch (e) {
      // The reason, not «something went wrong»: a rejected format and a lost
      // connection need different actions from whoever is looking at this.
      const msg = e instanceof Error ? e.message : '';
      setError(msg === 'NOT_AN_ALLOWED_IMAGE_TYPE'
        ? 'صيغة غير مدعومة. استعمل JPG أو PNG أو WebP.'
        : `تعذّر الرفع${msg ? ` — ${msg}` : ''}.`);
    } finally {
      setUploading(null);
    }
  };

  const move = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= images.length) return;
    const next = images.slice();
    [next[i], next[j]] = [next[j], next[i]];
    void commit(next);
  };

  const patch = (i: number, p: Partial<ImageInput>) =>
    setImages(prev => prev.map((row, j) => (j === i ? { ...row, ...p } : row)));

  return (
    <section className="admin-section" aria-labelledby="images-h" data-testid="product-images">
      <h2 id="images-h">الصور</h2>
      <p style={{ margin: '0 0 14px', fontSize: 11.5, color: 'var(--text-dimmer)', lineHeight: 1.95 }}>
        ارفع الصور أولاً ورتّبها، ثم سجّل مصدر كل واحدة وأساس استخدامها. الصورة
        بلا أساس مسجَّل تُحفظ هنا ولا تظهر في المتجر — والمنتج يحمل تنبيهاً يقول
        ذلك، لكنه لا يمنعك من النشر. القرار لك.
      </p>

      <p style={{ margin: '0 0 16px' }}>
        <label className="btn-primary" data-testid="image-upload-label"
          style={{ fontSize: 13, cursor: 'pointer', display: 'inline-block' }}>
          {uploading !== null ? `جارٍ الرفع… ${uploading}%` : 'ارفع صورة'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            data-testid="image-upload"
            disabled={uploading !== null || pending}
            onChange={e => {
              const f = e.target.files?.[0];
              // Reset the input, or picking the same file twice does nothing.
              e.target.value = '';
              if (f) void onPick(f);
            }}
            style={{ display: 'none' }}
          />
        </label>
        {pending && <span style={{ fontSize: 11.5, marginInlineStart: 10, color: 'var(--text-dimmer)' }}>جارٍ الحفظ…</span>}
        {saved && !pending && <span style={{ fontSize: 11.5, marginInlineStart: 10, color: 'var(--sev-ok)' }}>حُفظ</span>}
      </p>

      {error && (
        <p role="alert" data-testid="product-images-error" className="card-sm"
          style={{ padding: '11px 13px', margin: '0 0 14px', fontSize: 12.5, color: 'var(--sev-blocker)' }}>
          {error}
        </p>
      )}

      {images.length === 0 ? (
        <p className="card-sm" data-testid="product-images-empty"
          style={{ padding: '14px 16px', fontSize: 12.5, color: 'var(--text-dimmer)', lineHeight: 1.9 }}>
          لا صور بعد. المنتج سيظهر بمربّع بديل مكتوب فيه أن الصورة تُضاف لاحقاً.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
          {images.map((img, i) => (
            <li key={img.url} className="card-sm" data-testid={`image-row-${i}`}
              style={{ padding: '12px 14px', display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.thumbnailUrl || img.url} alt="" width={96} height={72}
                  style={{
                    width: 96, height: 72, objectFit: 'cover', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--surface-2)',
                  }} />
                <div style={{ flex: 1, minWidth: 180, display: 'grid', gap: 7 }}>
                  <span style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                    {i === 0
                      ? <span className="admin-badge" data-testid={`image-primary-${i}`}
                        style={{ color: 'var(--accent-ink)' }}>الصورة الرئيسية</span>
                      : <span className="admin-badge">صورة {i + 1}</span>}
                    {!isComplete(img) && (
                      <span className="admin-badge" data-testid={`image-incomplete-${i}`}
                        style={{ color: 'var(--sev-warning)' }}>لن تظهر في المتجر — ينقصها مصدرها</span>
                    )}
                    {img.needsReplacement && (
                      <span className="admin-badge" style={{ color: 'var(--sev-warning)' }}>مؤقّتة</span>
                    )}
                  </span>
                  <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button type="button" className="btn-ghost" data-testid={`image-up-${i}`}
                      disabled={i === 0 || pending} onClick={() => move(i, -1)}
                      aria-label="قدّم الصورة" style={{ fontSize: 12 }}>↑</button>
                    <button type="button" className="btn-ghost" data-testid={`image-down-${i}`}
                      disabled={i === images.length - 1 || pending} onClick={() => move(i, 1)}
                      aria-label="أخّر الصورة" style={{ fontSize: 12 }}>↓</button>
                    {i !== 0 && (
                      <button type="button" className="btn-ghost" data-testid={`image-make-primary-${i}`}
                        disabled={pending}
                        onClick={() => commit([images[i], ...images.filter((_, j) => j !== i)])}
                        style={{ fontSize: 12 }}>
                        اجعلها الرئيسية
                      </button>
                    )}
                    <button type="button" className="admin-danger" data-testid={`image-delete-${i}`}
                      disabled={pending}
                      onClick={() => commit(images.filter((_, j) => j !== i))}
                      style={{ fontSize: 12, marginInlineStart: 'auto' }}>
                      احذف
                    </button>
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                <Field labelAr="الوصف البديل" value={img.altAr} testId={`image-alt-${i}`}
                  onChange={v => patch(i, { altAr: v })} />
                <Field labelAr="صاحب الصورة" value={img.ownerAr} testId={`image-owner-${i}`}
                  onChange={v => patch(i, { ownerAr: v })} />
                <label style={{ display: 'grid', gap: 5 }}>
                  <span style={labelStyle}>أساس الاستخدام</span>
                  <select value={img.basis} data-testid={`image-basis-${i}`}
                    onChange={e => patch(i, { basis: e.target.value })} style={inputStyle}>
                    <option value="">لم يُحدَّد بعد</option>
                    {Object.entries(IMAGE_BASIS_LABEL_AR).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </label>
                <Field labelAr="رابط الإذن" value={img.evidenceUrl} ltr
                  testId={`image-evidence-${i}`}
                  onChange={v => patch(i, { evidenceUrl: v })} />
                <Field labelAr="تاريخ المراجعة" value={img.reviewedAt} ltr placeholder="2026-08-04"
                  testId={`image-reviewed-${i}`}
                  onChange={v => patch(i, { reviewedAt: v })} />
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <Check labelAr="من مادة الشركة الرسمية" checked={img.official}
                  onChange={v => patch(i, { official: v })} />
                <Check labelAr="مؤقّتة — تحتاج استبدالاً" checked={img.needsReplacement}
                  onChange={v => patch(i, { needsReplacement: v })} />
                <button type="button" className="btn-ghost" data-testid={`image-save-${i}`}
                  disabled={pending} onClick={() => commit(images)}
                  style={{ fontSize: 12, marginInlineStart: 'auto' }}>
                  احفظ بيانات هذه الصورة
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

/** Everything `isImagePublishable` needs, asked in the panel's own terms. */
function isComplete(img: ImageInput): boolean {
  return !!img.altAr.trim() && !!img.ownerAr.trim() && !!img.basis
    && !!img.evidenceUrl.trim() && !!img.reviewedAt.trim();
}

function toInput(img: ProductImage): ImageInput {
  return {
    url: img.url,
    thumbnailUrl: img.thumbnailUrl ?? '',
    altAr: img.altAr,
    ownerAr: img.credit?.ownerAr ?? '',
    basis: img.credit?.basis ?? '',
    evidenceUrl: img.credit?.evidenceUrl ?? '',
    sourceUrl: img.credit?.sourceUrl ?? '',
    official: img.credit?.official ?? false,
    reviewedAt: img.credit?.reviewedAt ?? '',
    needsReplacement: img.credit?.needsReplacement ?? false,
  };
}

const inputStyle: React.CSSProperties = {
  padding: '9px 11px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)', background: 'var(--surface-2)',
  color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', width: '100%',
};
const labelStyle: React.CSSProperties = { fontSize: 11.5, fontWeight: 800, color: 'var(--text-dim)' };

const Field: React.FC<{
  labelAr: string; value: string; onChange: (v: string) => void;
  ltr?: boolean; placeholder?: string; testId: string;
}> = ({ labelAr, value, onChange, ltr, placeholder, testId }) => (
  <label style={{ display: 'grid', gap: 5 }}>
    <span style={labelStyle}>{labelAr}</span>
    <input value={value} onChange={e => onChange(e.target.value)}
      className={ltr ? 'ltr' : undefined} placeholder={placeholder}
      data-testid={testId} style={inputStyle} />
  </label>
);

const Check: React.FC<{
  labelAr: string; checked: boolean; onChange: (v: boolean) => void;
}> = ({ labelAr, checked, onChange }) => (
  <label style={{ display: 'inline-flex', gap: 7, alignItems: 'center', fontSize: 12 }}>
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
    <span>{labelAr}</span>
  </label>
);
