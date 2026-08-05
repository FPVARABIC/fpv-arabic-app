'use client';

import { useState, useTransition } from 'react';
import { saveZone, saveRules } from '@/app/admin/store/shipping/actions';

/**
 * The shipping zone editor.
 *
 * WHY THE COST IS A TEXT FIELD AND NOT A NUMBER INPUT
 * ---------------------------------------------------
 * `type="number"` looks right and behaves badly for money: it accepts `1e3`,
 * silently drops a trailing zero on some browsers, and — the one that matters —
 * renders a spinner that a stray scroll can nudge through fifty values while
 * somebody reads the page. A text field with `inputMode="decimal"` gives the
 * same phone keyboard, and the server parses it either way.
 *
 * WHY THE BLANK IS PRESERVED
 * --------------------------
 * An empty cost means «not priced», which is not zero. If this component
 * defaulted the field to `0` for tidiness, saving an untouched form would
 * silently promise free shipping to a whole zone.
 */

const money = (minor: number | null) =>
  minor === null ? '' : (minor / 100).toFixed(2);

export const ZoneEditor: React.FC<{
  zone: {
    id: string;
    nameAr: string;
    countries: string[];
    countryNamesAr: string[];
    costMinor: number | null;
    freeOverMinor: number | null;
    etaDaysMin: number | null;
    etaDaysMax: number | null;
    enabled: boolean;
    updatedAt: string;
  };
  canEdit: boolean;
}> = ({ zone, canEdit }) => {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const priced = zone.costMinor !== null;

  return (
    <form
      className="card"
      data-testid={`shipping-zone-${zone.id}`}
      style={{ padding: '17px 19px' }}
      action={(fd: FormData) => {
        setError(null);
        setSaved(false);
        start(async () => {
          const r = await saveZone(fd);
          if (r.ok) setSaved(true); else setError(r.errorAr);
        });
      }}
    >
      <input type="hidden" name="zoneId" value={zone.id} />

      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>{zone.nameAr}</h3>
        <span
          className={`admin-badge ${priced && zone.enabled ? 'admin-badge-ok' : 'admin-badge-warn'}`}
          data-testid={`shipping-zone-${zone.id}-state`}
        >
          {!priced ? 'بلا تسعير' : zone.enabled ? 'مفعّلة' : 'معطّلة'}
        </span>
        <span style={{ fontSize: 11.5, color: 'var(--text-dimmer)' }} dir="ltr">
          {zone.countries.length} {zone.countries.length === 1 ? 'country' : 'countries'}
        </span>
      </div>

      <p style={{ fontSize: 11.5, color: 'var(--text-dimmer)', margin: '7px 0 0', lineHeight: 1.85 }}>
        {zone.countryNamesAr.join(' · ')}
      </p>

      <div
        style={{
          display: 'grid', gap: 12, marginTop: 14,
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        }}
      >
        <label style={{ display: 'block' }}>
          <span style={LABEL}>تكلفة الشحن</span>
          <input
            className="admin-field"
            name="costMinor"
            defaultValue={money(zone.costMinor)}
            inputMode="decimal"
            placeholder="اتركه فارغاً = بلا تسعير"
            data-testid={`shipping-zone-${zone.id}-cost`}
            disabled={!canEdit}
          />
        </label>

        <label style={{ display: 'block' }}>
          <span style={LABEL}>شحن مجاني فوق</span>
          <input
            className="admin-field"
            name="freeOverMinor"
            defaultValue={money(zone.freeOverMinor)}
            inputMode="decimal"
            placeholder="اختياري"
            data-testid={`shipping-zone-${zone.id}-free`}
            disabled={!canEdit}
          />
        </label>

        <label style={{ display: 'block' }}>
          <span style={LABEL}>أقل مدة (أيام)</span>
          <input
            className="admin-field"
            name="etaDaysMin"
            defaultValue={zone.etaDaysMin ?? ''}
            inputMode="numeric"
            data-testid={`shipping-zone-${zone.id}-eta-min`}
            disabled={!canEdit}
          />
        </label>

        <label style={{ display: 'block' }}>
          <span style={LABEL}>أكثر مدة (أيام)</span>
          <input
            className="admin-field"
            name="etaDaysMax"
            defaultValue={zone.etaDaysMax ?? ''}
            inputMode="numeric"
            data-testid={`shipping-zone-${zone.id}-eta-max`}
            disabled={!canEdit}
          />
        </label>
      </div>

      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14 }}>
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={zone.enabled}
          data-testid={`shipping-zone-${zone.id}-enabled`}
          disabled={!canEdit}
        />
        <span style={{ fontSize: 13 }}>مفعّلة</span>
      </label>

      {zone.updatedAt && (
        <p style={{ fontSize: 11, color: 'var(--text-dimmer)', margin: '12px 0 0' }}>
          آخر تعديل: <span dir="ltr">{zone.updatedAt.slice(0, 16).replace('T', ' ')}</span>
          {' · '}من عدّلها مسجَّل في سجلّ التدقيق
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="admin-badge admin-badge-bad"
          data-testid={`shipping-zone-${zone.id}-error`}
          style={{ display: 'block', padding: '10px 13px', marginTop: 12 }}
        >
          {error}
        </p>
      )}
      {saved && !error && (
        <p
          role="status"
          className="admin-badge admin-badge-ok"
          data-testid={`shipping-zone-${zone.id}-saved`}
          style={{ display: 'block', padding: '10px 13px', marginTop: 12 }}
        >
          حُفظ.
        </p>
      )}

      {canEdit && (
        <p style={{ margin: '14px 0 0' }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={pending}
            data-testid={`shipping-zone-${zone.id}-save`}
          >
            {pending ? 'جارٍ الحفظ…' : 'احفظ'}
          </button>
        </p>
      )}
    </form>
  );
};

export const RulesEditor: React.FC<{
  blockedCategoryIds: string[];
  manualReviewProductIds: string[];
  categories: { id: string; titleAr: string }[];
  canEdit: boolean;
}> = ({ blockedCategoryIds, manualReviewProductIds, categories, canEdit }) => {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      className="card"
      data-testid="shipping-rules"
      style={{ padding: '17px 19px' }}
      action={(fd: FormData) => {
        setError(null);
        setSaved(false);
        start(async () => {
          const r = await saveRules(fd);
          if (r.ok) setSaved(true); else setError(r.errorAr);
        });
      }}
    >
      <label style={{ display: 'block' }}>
        <span style={LABEL}>فئات لا تُشحن — معرّف في كل سطر</span>
        <textarea
          className="admin-field"
          name="blockedCategoryIds"
          rows={3}
          defaultValue={blockedCategoryIds.join('\n')}
          data-testid="shipping-rules-blocked"
          disabled={!canEdit}
          style={{ fontFamily: 'monospace', direction: 'ltr' }}
        />
      </label>
      <p style={{ fontSize: 11, color: 'var(--text-dimmer)', margin: '6px 0 0', lineHeight: 1.8 }}>
        المعرّفات المتاحة:{' '}
        <span className="ltr">{categories.map(c => c.id).join(' · ')}</span>
      </p>

      <label style={{ display: 'block', marginTop: 16 }}>
        <span style={LABEL}>منتجات تحتاج تسعير شحن يدوياً — معرّف في كل سطر</span>
        <textarea
          className="admin-field"
          name="manualReviewProductIds"
          rows={3}
          defaultValue={manualReviewProductIds.join('\n')}
          data-testid="shipping-rules-manual"
          disabled={!canEdit}
          style={{ fontFamily: 'monospace', direction: 'ltr' }}
        />
      </label>

      {error && (
        <p role="alert" className="admin-badge admin-badge-bad" data-testid="shipping-rules-error"
          style={{ display: 'block', padding: '10px 13px', marginTop: 12 }}>{error}</p>
      )}
      {saved && !error && (
        <p role="status" className="admin-badge admin-badge-ok" data-testid="shipping-rules-saved"
          style={{ display: 'block', padding: '10px 13px', marginTop: 12 }}>حُفظت.</p>
      )}

      {canEdit && (
        <p style={{ margin: '14px 0 0' }}>
          <button type="submit" className="btn-primary" disabled={pending}
            data-testid="shipping-rules-save">
            {pending ? 'جارٍ الحفظ…' : 'احفظ القواعد'}
          </button>
        </p>
      )}
    </form>
  );
};

const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 800,
  color: 'var(--text-dim)',
  marginBottom: 5,
};
