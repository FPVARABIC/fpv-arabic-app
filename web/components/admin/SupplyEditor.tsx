'use client';

import { useState } from 'react';
import { SUPPLIERS } from '@core/data/store/suppliers';
import type { StoreSupply } from '@core/data/store/types';
import { saveSupply } from '@/app/admin/store/supply/actions';

/**
 * Editing what we pay.
 *
 * AMOUNTS ARE TYPED IN MAJOR UNITS AND STORED IN MINOR ONES
 * ---------------------------------------------------------
 * Nobody types 2999 when they mean $29.99. The conversion happens once, here,
 * on submit — and the server converts again from its own parse rather than
 * trusting this one, because a form is not a trusted source even when the
 * person filling it in is.
 *
 * `verified` is a deliberate checkbox rather than something set automatically
 * on save. It means «I looked at the supplier's listing just now», which is a
 * claim only a person can make, and the admin list shows its absence.
 */
export const SupplyEditor: React.FC<{ variantId: string; supply: StoreSupply | null }> = ({
  variantId, supply,
}) => {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!open) {
    return (
      <p style={{ margin: '11px 0 0' }}>
        <button type="button" className="btn-ghost" data-testid={`supply-edit-${variantId}`}
          onClick={() => { setOpen(true); setSaved(false); }} style={{ fontSize: 12 }}>
          {supply ? 'عدّل التكلفة' : 'أدخل التكلفة'}
        </button>
        {saved && <span style={{ fontSize: 11.5, color: 'var(--sev-ok)', marginInlineStart: 9 }}>حُفظ</span>}
      </p>
    );
  }

  const major = (minor: number | undefined) =>
    typeof minor === 'number' ? (minor / 100).toFixed(2) : '';

  return (
    <form
      data-testid={`supply-form-${variantId}`}
      onSubmit={async e => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const fd = new FormData(e.currentTarget);
        const r = await saveSupply({
          variantId,
          supplierId: String(fd.get('supplierId') ?? ''),
          supplierUrl: String(fd.get('supplierUrl') ?? ''),
          unitCostMajor: String(fd.get('unitCost') ?? ''),
          inboundShippingMajor: String(fd.get('shipping') ?? ''),
          marginPercentOverride: String(fd.get('margin') ?? ''),
          notesAr: String(fd.get('notes') ?? ''),
          verified: fd.get('verified') === 'on',
        });
        setPending(false);
        if (r.ok) { setOpen(false); setSaved(true); }
        else setError(r.errorAr);
      }}
      style={{ marginTop: 12, display: 'grid', gap: 9 }}
    >
      <label style={{ display: 'grid', gap: 5 }}>
        <span style={S.label}>المورد</span>
        <select name="supplierId" required defaultValue={supply?.supplierId ?? ''} style={S.input}>
          <option value="" disabled>اختر المورد</option>
          {SUPPLIERS.map(s => <option key={s.id} value={s.id}>{s.nameAr}</option>)}
        </select>
      </label>

      <label style={{ display: 'grid', gap: 5 }}>
        <span style={S.label}>رابط المنتج عند المورد</span>
        <input name="supplierUrl" type="url" defaultValue={supply?.supplierUrl ?? ''}
          placeholder="https://…" className="ltr" style={S.input} />
      </label>

      <div style={{ display: 'grid', gap: 9, gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
        <label style={{ display: 'grid', gap: 5 }}>
          <span style={S.label}>تكلفة الوحدة (دولار)</span>
          <input name="unitCost" type="number" step="0.01" min="0" required
            data-testid={`supply-unit-${variantId}`}
            defaultValue={major(supply?.unitCostMinor)} className="ltr" style={S.input} />
        </label>
        <label style={{ display: 'grid', gap: 5 }}>
          <span style={S.label}>الشحن إلينا (دولار)</span>
          <input name="shipping" type="number" step="0.01" min="0" required
            data-testid={`supply-shipping-${variantId}`}
            defaultValue={major(supply?.inboundShippingMinor) || '0.00'} className="ltr" style={S.input} />
        </label>
        <label style={{ display: 'grid', gap: 5 }}>
          <span style={S.label}>هامش خاص (%)</span>
          <input name="margin" type="number" step="0.1" min="0" placeholder="الافتراضي"
            defaultValue={supply?.marginPercentOverride ?? ''} className="ltr" style={S.input} />
        </label>
      </div>

      <label style={{ display: 'grid', gap: 5 }}>
        <span style={S.label}>ملاحظات داخلية</span>
        <input name="notes" defaultValue={supply?.notesAr ?? ''} style={S.input} />
      </label>

      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5 }}>
        <input name="verified" type="checkbox" defaultChecked={supply?.verified ?? false} />
        <span>تأكّدت من التكلفة على صفحة المورد الآن</span>
      </label>

      {error && (
        <p role="alert" style={{ margin: 0, fontSize: 12, color: 'var(--sev-blocker)' }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="btn-primary" disabled={pending}
          data-testid={`supply-save-${variantId}`} style={{ fontSize: 12.5 }}>
          {pending ? 'جارٍ الحفظ…' : 'احفظ وأعد التسعير'}
        </button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}
          style={{ fontSize: 12.5 }}>إلغاء</button>
      </div>
    </form>
  );
};

const S = {
  label: { fontSize: 11.5, fontWeight: 800, color: 'var(--text-dimmer)' } as React.CSSProperties,
  input: {
    padding: '9px 11px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)', background: 'var(--surface-2)',
    color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', width: '100%',
  } as React.CSSProperties,
};
