'use client';

import { useState } from 'react';
import type { StorePrivateSettings, StorePublicSettings } from '@core/data/store/types';
import { saveStoreSettings } from '@/app/admin/store/settings/actions';

/**
 * The shop's own settings, in one form.
 *
 * The margin and the review window are commercially sensitive and the banner is
 * the most public text in the shop; they live in two documents for that reason
 * and are edited together here, because to whoever runs the shop they are one
 * set of decisions. The split is a storage fact, not a workflow.
 *
 * The margin shows what it MEANS underneath it, live, on a worked example.
 * «10%» is abstract; «تشتري بـ100 وتبيع بـ110» is the decision being made, and
 * a shop owner who sees the second will not accidentally type 110.
 */
export const SettingsForm: React.FC<{
  privateSettings: StorePrivateSettings;
  publicSettings: StorePublicSettings;
}> = ({ privateSettings, publicSettings }) => {
  const [margin, setMargin] = useState(String(privateSettings.defaultMarginPercent));
  const [days, setDays] = useState(String(privateSettings.priceReviewDays));
  const [bannerEnabled, setBannerEnabled] = useState(publicSettings.banner.enabled);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const m = Number(margin);
  const worked = Number.isFinite(m) && m >= 0
    ? `تكلفة واصلة 100 دولار تُباع بـ${(100 * (1 + m / 100)).toFixed(2)} دولاراً قبل التقريب.`
    : '';

  return (
    <form
      data-testid="settings-form"
      onSubmit={async e => {
        e.preventDefault();
        setPending(true); setError(null); setSaved(false);
        const fd = new FormData(e.currentTarget);
        const r = await saveStoreSettings({
          defaultMarginPercent: margin,
          priceReviewDays: days,
          bannerEnabled,
          bannerHeadlineAr: String(fd.get('headline') ?? ''),
          bannerBodyAr: String(fd.get('body') ?? ''),
          shippingNoteAr: String(fd.get('shipping') ?? ''),
          regulatoryNoteAr: String(fd.get('regulatory') ?? ''),
        });
        setPending(false);
        if (r.ok) setSaved(true); else setError(r.errorAr);
      }}
      style={{ display: 'grid', gap: 18 }}
    >
      <section className="admin-section" aria-labelledby="s-money">
        <h2 id="s-money">التسعير</h2>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={labelStyle}>هامش الربح الافتراضي (%)</span>
            <input value={margin} onChange={e => setMargin(e.target.value)}
              className="ltr" inputMode="decimal" data-testid="settings-margin" style={inputStyle} />
          </label>
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={labelStyle}>مدة صلاحية التكلفة (أيام)</span>
            <input value={days} onChange={e => setDays(e.target.value)}
              className="ltr" inputMode="numeric" data-testid="settings-review-days" style={inputStyle} />
          </label>
        </div>
        <p data-testid="settings-worked-example"
          style={{ margin: '11px 0 0', fontSize: 12, color: 'var(--text-dimmer)', lineHeight: 1.9 }}>
          {worked} يُطبَّق على التكلفة الواصلة — سعر الوحدة زائد شحن المورد — لا على
          سعر الوحدة وحده. وبعد المدة أعلاه يتوقّف المنتج عن قبول الطلبات حتى
          تراجع تكلفته.
        </p>
      </section>

      <section className="admin-section" aria-labelledby="s-banner">
        <h2 id="s-banner">شريط العرض المجاني</h2>
        <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 12.5, marginBottom: 12 }}>
          <input type="checkbox" checked={bannerEnabled} data-testid="settings-banner-enabled"
            onChange={e => setBannerEnabled(e.target.checked)} />
          <span>اعرض الشريط في المتجر</span>
        </label>
        <div style={{ display: 'grid', gap: 11 }}>
          <Field name="headline" labelAr="العنوان" defaultValue={publicSettings.banner.headlineAr} />
          <Area name="body" labelAr="النصّ" defaultValue={publicSettings.banner.bodyAr} rows={3} />
        </div>
      </section>

      <section className="admin-section" aria-labelledby="s-notices">
        <h2 id="s-notices">ملاحظات دائمة</h2>
        <div style={{ display: 'grid', gap: 11 }}>
          <Area name="shipping" labelAr="ملاحظة الشحن — تظهر عند كل سعر"
            defaultValue={publicSettings.shippingNoteAr} rows={2} />
          <Area name="regulatory" labelAr="ملاحظة التسجيل والتراخيص"
            defaultValue={publicSettings.regulatoryNoteAr ?? ''} rows={3} />
        </div>
      </section>

      {error && (
        <p role="alert" data-testid="settings-error" className="card-sm"
          style={{ padding: '12px 14px', margin: 0, fontSize: 13, color: '#fca5a5', lineHeight: 1.9 }}>
          {error}
        </p>
      )}
      {saved && (
        <p role="status" data-testid="settings-saved" className="card-sm"
          style={{ padding: '12px 14px', margin: 0, fontSize: 13, color: '#6ee7b7' }}>
          حُفظت الإعدادات. الأسعار المحسوبة سابقاً لا تتغيّر بأثر رجعي — أعد حفظ
          تكلفة المنتج ليُعاد حساب سعره بالهامش الجديد.
        </p>
      )}

      <p style={{ margin: 0 }}>
        <button type="submit" className="btn-primary" disabled={pending}
          data-testid="settings-save" style={{ padding: '11px 20px', fontSize: 14 }}>
          {pending ? 'جارٍ الحفظ…' : 'احفظ'}
        </button>
      </p>
    </form>
  );
};

const inputStyle: React.CSSProperties = {
  padding: '9px 11px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)', background: 'var(--surface-2)',
  color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', width: '100%',
};
const labelStyle: React.CSSProperties = { fontSize: 11.5, fontWeight: 800, color: 'var(--text-dim)' };

const Field: React.FC<{ name: string; labelAr: string; defaultValue: string }> = ({
  name, labelAr, defaultValue,
}) => (
  <label style={{ display: 'grid', gap: 5 }}>
    <span style={labelStyle}>{labelAr}</span>
    <input name={name} defaultValue={defaultValue} data-testid={`settings-${name}`} style={inputStyle} />
  </label>
);

const Area: React.FC<{ name: string; labelAr: string; defaultValue: string; rows: number }> = ({
  name, labelAr, defaultValue, rows,
}) => (
  <label style={{ display: 'grid', gap: 5 }}>
    <span style={labelStyle}>{labelAr}</span>
    <textarea name={name} defaultValue={defaultValue} rows={rows}
      data-testid={`settings-${name}`} style={inputStyle} />
  </label>
);
