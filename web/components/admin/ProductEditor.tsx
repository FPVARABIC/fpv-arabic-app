'use client';

import { useState } from 'react';
import {
  AVAILABILITY_LABEL_AR, BUYER_LEVEL_LABEL_AR,
  LINK_PROTOCOL_LABEL_AR, VIDEO_SYSTEM_LABEL_AR,
  IMAGE_BASIS_LABEL_AR, SPEC_STATUS_LABEL_AR, SPEC_SOURCE_LABEL_AR,
} from '@core/data/store/types';
import type { StoreProduct } from '@core/data/store/types';
import { saveProduct, type SaveProductInput } from '@/app/admin/store/products/actions';

/**
 * Editing one product.
 *
 * WHY THE IMAGE ROWS ASK FOR SO MUCH
 * ----------------------------------
 * Owner, terms, source, whether it is the manufacturer's own material, and the
 * date somebody last checked. It is more than a shop usually asks, and it is
 * the difference between a catalogue that can answer «where did this photo come
 * from» and one that cannot. The «تحتاج استبدالاً» box is for the honest middle
 * state: a stand-in that works today and should not still be there in a month.
 *
 * WHY A SPEC CANNOT BE MARKED CONFIRMED WITHOUT A LINK
 * ----------------------------------------------------
 * Because that is the only mechanical defence against an invented number. The
 * server refuses the save and says which spec, so the person who ticked the box
 * has to either produce the manufacturer's page or untick it — and «I could not
 * find it» becomes a visible «بانتظار التأكيد» on the storefront rather than a
 * confident figure nobody checked.
 *
 * NOTHING HERE TOUCHES THE PRICE
 * ------------------------------
 * Deliberately. Prices are computed on the supply screen from cost and margin,
 * so there is no field in this shop where a number can be typed straight into
 * what a customer pays.
 */
export const ProductEditor: React.FC<{ product: StoreProduct }> = ({ product }) => {
  const [images, setImages] = useState<SaveProductInput['images']>(
    product.images.length > 0
      ? product.images.map(i => ({
        url: i.url, altAr: i.altAr,
        ownerAr: i.credit?.ownerAr ?? '',
        basis: i.credit?.basis ?? '',
        evidenceUrl: i.credit?.evidenceUrl ?? '',
        sourceUrl: i.credit?.sourceUrl ?? '',
        official: i.credit?.official ?? false,
        reviewedAt: i.credit?.reviewedAt ?? '',
        needsReplacement: i.credit?.needsReplacement ?? false,
      }))
      : [blankImage()],
  );
  const [specs, setSpecs] = useState<SaveProductInput['specs']>(
    product.specs.length > 0
      ? product.specs.map(s => ({
        labelAr: s.labelAr, valueAr: s.valueAr, unitAr: s.unitAr ?? '',
        status: s.status,
        sourceKind: s.source?.kind ?? '',
        sourceTitleAr: s.source?.titleAr ?? '',
        sourceUrl: s.source?.url ?? '',
        checkedAt: s.source?.checkedAt ?? '',
        disagreementAr: s.disagreementAr ?? '',
      }))
      : [blankSpec()],
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  return (
    <form
      data-testid="product-editor"
      onSubmit={async e => {
        e.preventDefault();
        setPending(true);
        setError(null);
        setSaved(false);
        const fd = new FormData(e.currentTarget);
        const r = await saveProduct({
          productId: product.id,
          availability: String(fd.get('availability') ?? ''),
          level: String(fd.get('level') ?? ''),
          linkProtocol: String(fd.get('linkProtocol') ?? ''),
          videoSystem: String(fd.get('videoSystem') ?? ''),
          summaryAr: String(fd.get('summaryAr') ?? ''),
          highlightsText: String(fd.get('highlights') ?? ''),
          suitsText: String(fd.get('suits') ?? ''),
          notForText: String(fd.get('notFor') ?? ''),
          inTheBoxText: String(fd.get('inTheBox') ?? ''),
          weightGrams: String(fd.get('weightGrams') ?? ''),
          dimensionsMm: {
            length: String(fd.get('dimLength') ?? ''),
            width: String(fd.get('dimWidth') ?? ''),
            height: String(fd.get('dimHeight') ?? ''),
          },
          specs,
          images,
        });
        setPending(false);
        if (r.ok) setSaved(true);
        else setError(r.errorAr);
      }}
      style={{ display: 'grid', gap: 18 }}
    >
      <section className="admin-section" aria-labelledby="pe-state">
        <h2 id="pe-state">الحالة</h2>
        <div style={{ display: 'grid', gap: 11, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
          <Select name="availability" labelAr="التوفّر" defaultValue={product.availability}
            options={Object.entries(AVAILABILITY_LABEL_AR)} />
          <Select name="level" labelAr="المستوى" defaultValue={product.level}
            options={Object.entries(BUYER_LEVEL_LABEL_AR)} />
          <Select name="linkProtocol" labelAr="بروتوكول التحكّم" defaultValue={product.linkProtocol}
            options={Object.entries(LINK_PROTOCOL_LABEL_AR)} />
          <Select name="videoSystem" labelAr="نظام الفيديو" defaultValue={product.videoSystem}
            options={Object.entries(VIDEO_SYSTEM_LABEL_AR)} />
        </div>
        <p style={{ margin: '11px 0 0', fontSize: 11.5, color: 'var(--text-dimmer)', lineHeight: 1.9 }}>
          السعر لا يُكتب هنا. يُحسب في شاشة «التسعير والموردون» من التكلفة والهامش،
          حتى لا يوجد في هذا المتجر سعر لا أحد يستطيع تفسيره.
        </p>
      </section>

      <section className="admin-section" aria-labelledby="pe-copy">
        <h2 id="pe-copy">النصوص</h2>
        <div style={{ display: 'grid', gap: 11 }}>
          <Area name="summaryAr" labelAr="الوصف" defaultValue={product.summaryAr} rows={4} />
          <Area name="highlights" labelAr="أهم ما فيه — سطر لكل نقطة"
            defaultValue={product.highlightsAr.join('\n')} rows={4} />
          <Area name="suits" labelAr="يناسبك إن كنت — سطر لكل نقطة"
            defaultValue={product.suitsAr.join('\n')} rows={3} />
          <Area name="notFor" labelAr="لا يناسبك إن كنت — سطر لكل نقطة"
            defaultValue={product.notForAr.join('\n')} rows={3}
            hintAr="مطلوب. هذا هو القسم الذي لا يكتبه أي متجر منافس، وهو سبب تصديق بقية الصفحة." />
          <Area name="inTheBox" labelAr="ما الذي يأتي في الصندوق — سطر لكل قطعة"
            defaultValue={product.inTheBoxAr.join('\n')} rows={4} />
        </div>
      </section>

      <section className="admin-section" aria-labelledby="pe-physical">
        <h2 id="pe-physical">الوزن والأبعاد</h2>
        <div style={{ display: 'grid', gap: 11, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          <Text name="weightGrams" labelAr="الوزن (g)" defaultValue={product.weightGrams?.toString() ?? ''} />
          <Text name="dimLength" labelAr="الطول (mm)" defaultValue={product.dimensionsMm?.length.toString() ?? ''} />
          <Text name="dimWidth" labelAr="العرض (mm)" defaultValue={product.dimensionsMm?.width.toString() ?? ''} />
          <Text name="dimHeight" labelAr="الارتفاع (mm)" defaultValue={product.dimensionsMm?.height.toString() ?? ''} />
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 11.5, color: 'var(--text-dimmer)', lineHeight: 1.9 }}>
          اتركها فارغة إن لم تتأكّد. رقم مخترَع أسوأ من خانة فارغة.
        </p>
      </section>

      <section className="admin-section" aria-labelledby="pe-images">
        <h2 id="pe-images">الصور</h2>
        <p style={{ margin: '0 0 12px', fontSize: 11.5, color: 'var(--text-dimmer)', lineHeight: 1.9 }}>
          صور المنتج الحقيقية من المصنّع أو المورد. لكل صورة صاحبها وأساس
          استخدامها ورابط الإذن نفسه وتاريخ مراجعته. وجود الصورة على الإنترنت
          ليس إذناً — وصورة بلا أساس لا تُحفظ ولا يُنشر المنتج بها.
        </p>
        <div style={{ display: 'grid', gap: 12 }}>
          {images.map((img, i) => (
            <fieldset key={i} data-testid={`image-row-${i}`}
              style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', margin: 0 }}>
              <legend style={{ fontSize: 11.5, padding: '0 6px', color: 'var(--text-dimmer)' }}>
                صورة {i + 1}
              </legend>
              <div style={{ display: 'grid', gap: 9 }}>
                <Row labelAr="الرابط" value={img.url} ltr
                  testId={`image-url-${i}`}
                  onChange={v => patchImage(setImages, i, { url: v })} />
                <Row labelAr="الوصف البديل" value={img.altAr}
                  onChange={v => patchImage(setImages, i, { altAr: v })} />
                <div style={{ display: 'grid', gap: 9, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
                  <Row labelAr="صاحب الصورة" value={img.ownerAr}
                    onChange={v => patchImage(setImages, i, { ownerAr: v })} />
                  {/* A closed list, not a text box. «وجدتها على موقع الشركة»
                      describes where the file came from; it is not a permission
                      to use it, and free text is how the two get confused. */}
                  <Pick labelAr="أساس الاستخدام" value={img.basis}
                    testId={`image-basis-${i}`}
                    placeholderAr="اختر الأساس"
                    options={Object.entries(IMAGE_BASIS_LABEL_AR)}
                    onChange={v => patchImage(setImages, i, { basis: v })} />
                  <Row labelAr="رابط الإذن نفسه" value={img.evidenceUrl} ltr
                    testId={`image-evidence-${i}`}
                    onChange={v => patchImage(setImages, i, { evidenceUrl: v })} />
                  <Row labelAr="رابط الصورة الأصلي" value={img.sourceUrl} ltr
                    onChange={v => patchImage(setImages, i, { sourceUrl: v })} />
                  <Row labelAr="تاريخ المراجعة" value={img.reviewedAt} ltr placeholder="2026-08-04"
                    onChange={v => patchImage(setImages, i, { reviewedAt: v })} />
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <Check labelAr="من مادة الشركة الرسمية" checked={img.official}
                    testId={`image-official-${i}`}
                    onChange={v => patchImage(setImages, i, { official: v })} />
                  <Check labelAr="مؤقّتة — تحتاج استبدالاً" checked={img.needsReplacement}
                    testId={`image-replace-${i}`}
                    onChange={v => patchImage(setImages, i, { needsReplacement: v })} />
                  <button type="button" className="admin-danger" data-testid={`image-remove-${i}`}
                    onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                    style={{ fontSize: 11.5, marginInlineStart: 'auto' }}>
                    احذف الصورة
                  </button>
                </div>
              </div>
            </fieldset>
          ))}
        </div>
        <p style={{ margin: '12px 0 0' }}>
          <button type="button" className="btn-ghost" data-testid="image-add"
            onClick={() => setImages(prev => [...prev, blankImage()])} style={{ fontSize: 12 }}>
            أضف صورة
          </button>
        </p>
      </section>

      <section className="admin-section" aria-labelledby="pe-specs">
        <h2 id="pe-specs">المواصفات</h2>
        <p style={{ margin: '0 0 12px', fontSize: 11.5, color: 'var(--text-dimmer)', lineHeight: 1.9 }}>
          لا تكتب مواصفة لم تتأكّد منها. «مؤكَّدة» تتطلّب نوع المصدر ورابطه وتاريخ
          التحقّق. المراجعة المستقلّة تُعضِّد ولا تُثبت وحدها. وإن اختلفت المصادر
          فاختر «المصادر مختلفة» واكتب الاختلاف بدل أن تنتقي رقماً.
        </p>
        <div style={{ display: 'grid', gap: 10 }}>
          {specs.map((s, i) => (
            <div key={i} data-testid={`spec-row-${i}`} className="card-sm" style={{ padding: '11px 13px', display: 'grid', gap: 9 }}>
              <div style={{ display: 'grid', gap: 9, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                <Row labelAr="الاسم" value={s.labelAr}
                  testId={`spec-label-${i}`}
                  onChange={v => patchSpec(setSpecs, i, { labelAr: v })} />
                <Row labelAr="القيمة" value={s.valueAr} ltr
                  testId={`spec-value-${i}`}
                  onChange={v => patchSpec(setSpecs, i, { valueAr: v })} />
                {/* Separate, because «80.8» reads left to right and «مم» reads
                    right to left, and joining them is how every Arabic spec
                    table ends up scrambled. */}
                <Row labelAr="الوحدة" value={s.unitAr} placeholder="مم"
                  onChange={v => patchSpec(setSpecs, i, { unitAr: v })} />
                <Pick labelAr="الحالة" value={s.status}
                  testId={`spec-status-${i}`}
                  options={Object.entries(SPEC_STATUS_LABEL_AR)}
                  onChange={v => patchSpec(setSpecs, i, { status: v })} />
              </div>
              {s.status === 'verified' && (
                <div style={{ display: 'grid', gap: 9, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                  <Pick labelAr="نوع المصدر" value={s.sourceKind}
                    testId={`spec-source-kind-${i}`}
                    options={Object.entries(SPEC_SOURCE_LABEL_AR)}
                    onChange={v => patchSpec(setSpecs, i, { sourceKind: v })} />
                  <Row labelAr="عنوان المصدر" value={s.sourceTitleAr}
                    onChange={v => patchSpec(setSpecs, i, { sourceTitleAr: v })} />
                  <Row labelAr="رابط المصدر" value={s.sourceUrl} ltr
                    testId={`spec-source-url-${i}`}
                    onChange={v => patchSpec(setSpecs, i, { sourceUrl: v })} />
                  <Row labelAr="تاريخ التحقّق" value={s.checkedAt} ltr placeholder="2026-08-04"
                    testId={`spec-checked-${i}`}
                    onChange={v => patchSpec(setSpecs, i, { checkedAt: v })} />
                </div>
              )}
              {s.status === 'disputed' && (
                <Row labelAr="ما الذي اختلفت فيه المصادر؟" value={s.disagreementAr}
                  testId={`spec-dispute-${i}`}
                  onChange={v => patchSpec(setSpecs, i, { disagreementAr: v })} />
              )}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <button type="button" className="admin-danger" data-testid={`spec-remove-${i}`}
                  onClick={() => setSpecs(prev => prev.filter((_, j) => j !== i))}
                  style={{ fontSize: 11.5, marginInlineStart: 'auto' }}>
                  احذف السطر
                </button>
              </div>
            </div>
          ))}
        </div>
        <p style={{ margin: '12px 0 0' }}>
          <button type="button" className="btn-ghost" data-testid="spec-add"
            onClick={() => setSpecs(prev => [...prev, blankSpec()])} style={{ fontSize: 12 }}>
            أضف مواصفة
          </button>
        </p>
      </section>

      {error && (
        <p role="alert" data-testid="product-editor-error" className="card-sm"
          style={{ padding: '12px 14px', margin: 0, fontSize: 13, color: '#fca5a5', lineHeight: 1.9 }}>
          {error}
        </p>
      )}
      {saved && (
        <p role="status" data-testid="product-editor-saved" className="card-sm"
          style={{ padding: '12px 14px', margin: 0, fontSize: 13, color: '#6ee7b7' }}>
          حُفظت التعديلات، وستظهر في المتجر خلال ثوانٍ.
        </p>
      )}

      <p style={{ margin: 0 }}>
        <button type="submit" className="btn-primary" disabled={pending}
          data-testid="product-editor-save" style={{ padding: '11px 20px', fontSize: 14 }}>
          {pending ? 'جارٍ الحفظ…' : 'احفظ'}
        </button>
      </p>
    </form>
  );
};

function blankImage(): SaveProductInput['images'][number] {
  return {
    url: '', altAr: '', ownerAr: '', basis: '', evidenceUrl: '', sourceUrl: '',
    official: false, reviewedAt: '', needsReplacement: false,
  };
}
function blankSpec(): SaveProductInput['specs'][number] {
  return {
    labelAr: '', valueAr: '', unitAr: '', status: 'pending',
    sourceKind: 'manufacturer-page', sourceTitleAr: '', sourceUrl: '', checkedAt: '',
    disagreementAr: '',
  };
}

function patchImage(
  set: React.Dispatch<React.SetStateAction<SaveProductInput['images']>>,
  i: number, patch: Partial<SaveProductInput['images'][number]>,
): void {
  set(prev => prev.map((row, j) => (j === i ? { ...row, ...patch } : row)));
}
function patchSpec(
  set: React.Dispatch<React.SetStateAction<SaveProductInput['specs']>>,
  i: number, patch: Partial<SaveProductInput['specs'][number]>,
): void {
  set(prev => prev.map((row, j) => (j === i ? { ...row, ...patch } : row)));
}

// ── fields ──────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: '9px 11px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)', background: 'var(--surface-2)',
  color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', width: '100%',
};
const labelStyle: React.CSSProperties = { fontSize: 11.5, fontWeight: 800, color: 'var(--text-dim)' };

const Select: React.FC<{
  name: string; labelAr: string; defaultValue: string; options: [string, string][];
}> = ({ name, labelAr, defaultValue, options }) => (
  <label style={{ display: 'grid', gap: 5 }}>
    <span style={labelStyle}>{labelAr}</span>
    <select name={name} defaultValue={defaultValue} data-testid={`field-${name}`} style={inputStyle}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  </label>
);

const Area: React.FC<{
  name: string; labelAr: string; defaultValue: string; rows: number; hintAr?: string;
}> = ({ name, labelAr, defaultValue, rows, hintAr }) => (
  <label style={{ display: 'grid', gap: 5 }}>
    <span style={labelStyle}>{labelAr}</span>
    <textarea name={name} defaultValue={defaultValue} rows={rows}
      data-testid={`field-${name}`} style={inputStyle} />
    {hintAr && <span style={{ fontSize: 11, color: 'var(--text-dimmer)', lineHeight: 1.8 }}>{hintAr}</span>}
  </label>
);

const Text: React.FC<{ name: string; labelAr: string; defaultValue: string }> = ({
  name, labelAr, defaultValue,
}) => (
  <label style={{ display: 'grid', gap: 5 }}>
    <span style={labelStyle}>{labelAr}</span>
    <input name={name} defaultValue={defaultValue} className="ltr" inputMode="decimal"
      data-testid={`field-${name}`} style={inputStyle} />
  </label>
);

/** A controlled field, for the rows held in state rather than in the form. */
const Row: React.FC<{
  labelAr: string; value: string; onChange: (v: string) => void;
  ltr?: boolean; placeholder?: string; testId?: string;
}> = ({ labelAr, value, onChange, ltr, placeholder, testId }) => (
  <label style={{ display: 'grid', gap: 5 }}>
    <span style={labelStyle}>{labelAr}</span>
    <input value={value} onChange={e => onChange(e.target.value)}
      className={ltr ? 'ltr' : undefined} placeholder={placeholder}
      {...(testId ? { 'data-testid': testId } : {})} style={inputStyle} />
  </label>
);

/** A controlled select, for the rows held in state rather than in the form. */
const Pick: React.FC<{
  labelAr: string; value: string; options: [string, string][];
  onChange: (v: string) => void; placeholderAr?: string; testId?: string;
}> = ({ labelAr, value, options, onChange, placeholderAr, testId }) => (
  <label style={{ display: 'grid', gap: 5 }}>
    <span style={labelStyle}>{labelAr}</span>
    <select value={value} onChange={e => onChange(e.target.value)}
      {...(testId ? { 'data-testid': testId } : {})} style={inputStyle}>
      {placeholderAr && <option value="">{placeholderAr}</option>}
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  </label>
);

const Check: React.FC<{
  labelAr: string; checked: boolean; onChange: (v: boolean) => void; testId?: string;
}> = ({ labelAr, checked, onChange, testId }) => (
  <label style={{ display: 'inline-flex', gap: 7, alignItems: 'center', fontSize: 12 }}>
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
      {...(testId ? { 'data-testid': testId } : {})} />
    <span>{labelAr}</span>
  </label>
);
