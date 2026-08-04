'use client';

import { useState } from 'react';
import type { PublicationBlocker } from '@core/data/store/publication';
import {
  setProductPublished, setProductSuspension,
} from '@/app/admin/store/products/actions';

/**
 * The decision, with everything outstanding stated on it.
 *
 * WHY THE ADVISORIES ARE ON THE BUTTON AND NOT BEHIND IT
 * ------------------------------------------------------
 * A shop's owner is allowed to publish a product with no photograph. What they
 * are not allowed to do is publish one without knowing it has no photograph —
 * and the difference between those two is entirely in whether the panel told
 * them before or after. So the list sits above the button, the checkbox says
 * what agreeing means in plain words, and the audit log records exactly which
 * advisories were outstanding when they agreed.
 *
 * WHY THE BLOCKING ONES HAVE NO CHECKBOX
 * --------------------------------------
 * Because there is nothing to agree to. A product with no price cannot take an
 * order — the basket drops the line whatever anybody decides — so an override
 * would be a button that lies about what it does. Those are shown as work to
 * do, with a link to where it is done.
 *
 * WHY SUSPENSION IS HERE AND NOT NEXT TO «UNPUBLISH»
 * --------------------------------------------------
 * They look alike and mean different things. Unpublished is «not ready yet»
 * and clears itself as the product is finished; suspended is «we pulled this on
 * purpose» and must not drift back into «ready» because somebody filled in a
 * specification. Putting them side by side with the same styling is how they
 * get confused at the moment it matters.
 */
export const PublishPanel: React.FC<{
  productId: string;
  published: boolean;
  suspendedReasonAr: string | null;
  blocking: PublicationBlocker[];
  advisory: PublicationBlocker[];
}> = ({ productId, published, suspendedReasonAr, blocking, advisory }) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suspending, setSuspending] = useState(false);
  const [reason, setReason] = useState('');

  const run = async (fn: () => Promise<{ ok: boolean; errorAr?: string }>) => {
    setPending(true);
    setError(null);
    const r = await fn();
    setPending(false);
    if (!r.ok) setError(r.errorAr ?? 'تعذّر تنفيذ الطلب.');
  };

  const canPublish = blocking.length === 0 && (advisory.length === 0 || acknowledged);

  return (
    <section className="admin-section" aria-labelledby="publish-h" data-testid="publish-panel">
      <h2 id="publish-h">النشر</h2>

      {suspendedReasonAr ? (
        <div data-testid="publish-suspended">
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 900, color: '#fca5a5' }}>
            هذا المنتج موقوف
          </p>
          <p style={{ margin: '7px 0 0', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.95 }}>
            السبب المسجَّل: {suspendedReasonAr}
          </p>
          <p style={{ margin: '13px 0 0' }}>
            <button type="button" className="btn-ghost" data-testid="publish-unsuspend"
              disabled={pending}
              onClick={() => run(() => setProductSuspension(productId, null))}
              style={{ fontSize: 12.5 }}>
              ارفع الإيقاف
            </button>
          </p>
        </div>
      ) : (
        <>
          {blocking.length > 0 && (
            <div data-testid="publish-blocking" style={{ marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 900, color: '#fca5a5' }}>
                لا يمكن النشر قبل معالجة هذه:
              </p>
              <ul style={{ margin: '8px 0 0', paddingInlineStart: 20, display: 'grid', gap: 5 }}>
                {blocking.map((b, i) => (
                  <li key={i} style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.9 }}>
                    {b.messageAr}
                    {b.fixHref && <> <a href={b.fixHref} style={{ fontSize: 11.5 }}>افتح ←</a></>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {advisory.length > 0 && (
            <div data-testid="publish-advisory" style={{ marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 900, color: '#fcd34d' }}>
                يمكنك النشر، لكن هذه ناقصة:
              </p>
              <ul style={{ margin: '8px 0 0', paddingInlineStart: 20, display: 'grid', gap: 5 }}>
                {advisory.map((b, i) => (
                  <li key={i} style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.9 }}>
                    {b.messageAr}
                    {b.fixHref && <> <a href={b.fixHref} style={{ fontSize: 11.5 }}>افتح ←</a></>}
                  </li>
                ))}
              </ul>
              {!published && (
                <label style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                  marginTop: 12, fontSize: 12.5, lineHeight: 1.9,
                }}>
                  <input type="checkbox" checked={acknowledged}
                    data-testid="publish-acknowledge"
                    onChange={e => setAcknowledged(e.target.checked)}
                    style={{ marginTop: 4 }} />
                  <span>
                    أفهم أن هذا المنتج سيُعرض للبيع بهذه النواقص، وأتحمّل هذا القرار.
                    سيُسجَّل في سجلّ التدقيق باسمي.
                  </span>
                </label>
              )}
            </div>
          )}

          {blocking.length === 0 && advisory.length === 0 && (
            <p data-testid="publish-clean" style={{ margin: '0 0 14px', fontSize: 12.5, color: '#6ee7b7' }}>
              مكتمل. لا شيء ناقص.
            </p>
          )}

          <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', alignItems: 'center' }}>
            {published ? (
              <button type="button" className="btn-ghost" data-testid="publish-unpublish"
                disabled={pending}
                onClick={() => run(() => setProductPublished(productId, false, false))}
                style={{ fontSize: 13 }}>
                أخفِ من المتجر
              </button>
            ) : (
              <button type="button" className="btn-primary" data-testid="publish-now"
                disabled={pending || !canPublish}
                onClick={() => run(() => setProductPublished(productId, true, acknowledged))}
                style={{ fontSize: 13.5, padding: '10px 20px' }}>
                {pending ? 'جارٍ…' : 'انشر المنتج'}
              </button>
            )}

            {/* Deliberately set apart from «أخفِ»: they look alike and mean
                different things, and confusing them is expensive. */}
            <span style={{ marginInlineStart: 'auto' }}>
              {suspending ? (
                <span style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input value={reason} onChange={e => setReason(e.target.value)}
                    data-testid="publish-suspend-reason"
                    placeholder="سبب الإيقاف — استدعاء، مورد توقّف…"
                    style={{
                      padding: '8px 11px', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)', background: 'var(--surface-2)',
                      color: 'var(--text)', fontSize: 12.5, fontFamily: 'inherit', minWidth: 220,
                    }} />
                  <button type="button" className="admin-danger" data-testid="publish-suspend-confirm"
                    disabled={pending || reason.trim().length < 10}
                    onClick={() => run(() => setProductSuspension(productId, reason))}
                    style={{ fontSize: 12 }}>
                    أوقف
                  </button>
                  <button type="button" className="btn-ghost"
                    onClick={() => setSuspending(false)} style={{ fontSize: 12 }}>
                    تراجع
                  </button>
                </span>
              ) : (
                <button type="button" className="btn-ghost" data-testid="publish-suspend"
                  onClick={() => setSuspending(true)} style={{ fontSize: 12 }}>
                  أوقف المنتج بقرار…
                </button>
              )}
            </span>
          </div>
        </>
      )}

      {error && (
        <p role="alert" data-testid="publish-error" className="card-sm"
          style={{ padding: '11px 13px', margin: '13px 0 0', fontSize: 12.5, color: '#fca5a5', lineHeight: 1.9 }}>
          {error}
        </p>
      )}
    </section>
  );
};
