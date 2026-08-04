'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * One administrative action: a reason, a confirmation, a request, a result.
 *
 * WHY EVERY ACTION DEMANDS A REASON BEFORE IT WILL FIRE
 * -----------------------------------------------------
 * Because the audit log's value is almost entirely in the reason column. "Who
 * banned this account" is answerable from timestamps; "why" is answerable only
 * if someone was made to say so at the moment they decided. The server enforces
 * it too — `reasonAr` is a required field on every admin endpoint — so this is
 * the prompt, not the gate.
 *
 * WHY THE DANGEROUS ONES ASK TWICE
 * --------------------------------
 * `severity="danger"` adds a second, explicit confirmation naming what is about
 * to happen. Banning someone, changing a role and removing content are not
 * recoverable by pressing back, and they sit next to harmless controls on a
 * dense screen. The extra step is deliberately annoying in proportion to the
 * damage a mis-click does.
 *
 * WHAT THIS COMPONENT IS NOT
 * --------------------------
 * It is not authorisation. It is rendered only when the viewer holds the
 * capability, but the endpoint it calls re-derives that from the session cookie
 * and refuses independently. Deleting this file would remove the UI, not the
 * protection.
 */

export interface AdminActionProps {
  endpoint: string;
  /** Fields sent verbatim. The endpoint's allow-list rejects anything else. */
  payload: Record<string, string | null>;
  labelAr: string;
  /** Shown in the confirmation step, describing exactly what will happen. */
  confirmAr: string;
  severity?: 'normal' | 'danger';
  testId: string;
  disabled?: boolean;
  disabledReasonAr?: string;
}

export const AdminAction: React.FC<AdminActionProps> = ({
  endpoint, payload, labelAr, confirmAr, severity = 'normal', testId,
  disabled, disabledReasonAr,
}) => {
  const router = useRouter();
  const [stage, setStage] = useState<'idle' | 'reason' | 'confirm'>('idle');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const dangerous = severity === 'danger';

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        // The endpoints refuse anything that is not application/json, which is
        // a large part of why a cross-site form cannot reach them.
        headers: { 'Content-Type': 'application/json' },
        // Same-origin only; the session cookie must ride along.
        credentials: 'same-origin',
        body: JSON.stringify({ ...payload, reasonAr: reason.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        setError(typeof body?.error === 'string' ? body.error : 'تعذّر تنفيذ الإجراء');
        setBusy(false);
        return;
      }
      setDone('نُفِّذ الإجراء وسُجِّل في سجل التدقيق.');
      setStage('idle');
      setReason('');
      setBusy(false);
      // Re-render the server components so the change is visible immediately
      // rather than after a manual refresh.
      router.refresh();
    } catch {
      setError('تعذّر الاتصال بالخادم');
      setBusy(false);
    }
  }

  if (disabled) {
    return (
      <span
        className="admin-badge"
        data-testid={`${testId}-disabled`}
        title={disabledReasonAr}
      >
        {labelAr} — غير متاح
      </span>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {done && (
        <p role="status" data-testid={`${testId}-done`} className="admin-badge admin-badge-ok">
          {done}
        </p>
      )}
      {error && (
        <p role="alert" data-testid={`${testId}-error`} className="admin-badge admin-badge-bad">
          {error}
        </p>
      )}

      {stage === 'idle' && (
        <button
          type="button"
          className={dangerous ? 'admin-danger' : 'btn-ghost'}
          data-testid={testId}
          onClick={() => { setStage('reason'); setDone(null); }}
        >
          {labelAr}
        </button>
      )}

      {stage !== 'idle' && (
        <div className="card-sm" style={{ padding: '13px 15px', display: 'grid', gap: 9 }}>
          <label htmlFor={`${testId}-reason`} style={{ fontSize: 12.5, fontWeight: 800 }}>
            سبب الإجراء (يُسجَّل في سجل التدقيق)
          </label>
          <textarea
            id={`${testId}-reason`}
            data-testid={`${testId}-reason`}
            className="admin-field"
            rows={2}
            maxLength={500}
            value={reason}
            onChange={e => setReason(e.target.value)}
            required
          />

          {stage === 'confirm' && (
            <p role="alert" data-testid={`${testId}-confirm-text`} style={{
              margin: 0, fontSize: 13, color: '#fca5a5', lineHeight: 1.9,
            }}>
              {confirmAr}
            </p>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className={dangerous ? 'admin-danger' : 'btn-primary'}
              data-testid={stage === 'confirm' ? `${testId}-confirm` : `${testId}-submit`}
              disabled={busy || reason.trim().length === 0}
              onClick={() => {
                // A dangerous action goes through the confirmation step once,
                // with the reason already written — so the person reads what
                // they are about to do while their justification is in view.
                if (dangerous && stage === 'reason') { setStage('confirm'); return; }
                void submit();
              }}
            >
              {busy ? 'جارٍ…' : stage === 'confirm' ? 'نعم، نفّذ' : labelAr}
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={busy}
              data-testid={`${testId}-cancel`}
              onClick={() => { setStage('idle'); setReason(''); setError(null); }}
            >
              تراجع
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
