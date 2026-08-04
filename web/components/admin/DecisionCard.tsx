'use client';

import { useState } from 'react';
import {
  DECISION_EFFECT_LABEL_AR, type OwnerDecision,
} from '@core/data/store/decisions';
import { recordDecision } from '@/app/admin/store/decisions/actions';
import type { RecordedDecision } from '@/lib/server/storeDecisions';

/**
 * One question, its options, and what each one costs.
 *
 * WHY THE EFFECT IS ON EVERY OPTION INCLUDING «LEAVE IT»
 * ------------------------------------------------------
 * Because doing nothing has a consequence too, and a page that lists costs for
 * the actions but not for inaction quietly argues for inaction. «A buyer thinks
 * their warranty is with you and finds out after it breaks» is what «leave it»
 * costs, and it belongs on the screen next to the button.
 *
 * WHY A RECOMMENDATION IS OFTEN ABSENT
 * ------------------------------------
 * Three of these five have no recommendation, because the evidence does not
 * point one way — it points at a commercial appetite the system cannot know. A
 * recommendation offered out of politeness is one somebody follows.
 */
export const DecisionCard: React.FC<{
  decision: OwnerDecision;
  recorded?: RecordedDecision;
}> = ({ decision, recorded }) => {
  const [chosen, setChosen] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(recorded?.optionLabelAr ?? null);

  return (
    <section className="admin-section" data-testid={`decision-${decision.id}`}
      aria-labelledby={`d-${decision.id}`}>
      <h2 id={`d-${decision.id}`}>{decision.titleAr}</h2>

      <dl className="admin-kv" style={{ marginBottom: 14 }}>
        <div><dt>المنتج</dt><dd className="ltr">{decision.productId}</dd></div>
      </dl>

      <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.95 }}>
        {decision.problemAr}
      </p>
      <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--text-dimmer)', lineHeight: 1.95 }}>
        <strong>لماذا لا يحسمه النظام:</strong> {decision.whyNotAutomaticAr}
      </p>

      {done ? (
        <p data-testid={`decision-done-${decision.id}`} className="card-sm"
          style={{ padding: '12px 14px', margin: 0, fontSize: 12.5, color: '#6ee7b7', lineHeight: 1.9 }}>
          قرارك المسجَّل: {done}
          {recorded?.decidedByName && <> — {recorded.decidedByName}</>}
          {recorded?.action === 'needs-commit' && (
            <span style={{ display: 'block', color: '#fcd34d', marginTop: 6 }}>
              هذا الخيار يحتاج تعديلاً في الكتالوج، وسيُنفَّذ في الدفعة التالية.
            </span>
          )}
        </p>
      ) : (
        <>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 9 }}>
            {decision.options.map(o => {
              const isPick = chosen === o.id;
              const isRec = decision.recommendedOptionId === o.id;
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    data-testid={`decision-option-${decision.id}-${o.id}`}
                    onClick={() => setChosen(o.id)}
                    style={{
                      width: '100%', textAlign: 'start', padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)', font: 'inherit', cursor: 'pointer',
                      border: `1px solid ${isPick ? 'var(--accent)' : 'var(--border)'}`,
                      background: isPick ? 'rgba(56,189,248,0.07)' : 'var(--surface-2)',
                      color: 'var(--text)', display: 'grid', gap: 6,
                    }}
                  >
                    <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 800 }}>{o.labelAr}</span>
                      <span className="admin-badge" style={{
                        fontSize: 10.5,
                        color: o.effect === 'risky' ? '#fca5a5'
                          : o.effect === 'costly' ? '#fcd34d' : 'var(--text-dimmer)',
                      }}>
                        {DECISION_EFFECT_LABEL_AR[o.effect]}
                      </span>
                      {isRec && (
                        <span className="admin-badge" style={{ fontSize: 10.5, color: 'var(--accent)' }}>
                          الموصى به
                        </span>
                      )}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.9 }}>
                      {o.effectAr}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {decision.recommendationBasisAr && (
            <p style={{ margin: '12px 0 0', fontSize: 11.5, color: 'var(--text-dimmer)', lineHeight: 1.9 }}>
              <strong>أساس التوصية:</strong> {decision.recommendationBasisAr}
            </p>
          )}
          {!decision.recommendedOptionId && (
            <p style={{ margin: '12px 0 0', fontSize: 11.5, color: 'var(--text-dimmer)', lineHeight: 1.9 }}>
              لا توصية هنا: الأدلّة لا ترجّح خياراً، والترجيح يعتمد على ما تقبله
              تجارياً — وهذا ما لا يعرفه النظام.
            </p>
          )}

          <p style={{ margin: '14px 0 0' }}>
            <button type="button" className="btn-primary" data-testid={`decision-apply-${decision.id}`}
              disabled={!chosen || pending}
              onClick={async () => {
                if (!chosen) return;
                setPending(true); setError(null);
                const r = await recordDecision(decision.id, chosen);
                setPending(false);
                if (r.ok) setDone(decision.options.find(o => o.id === chosen)?.labelAr ?? 'مسجَّل');
                else setError(r.errorAr);
              }}
              style={{ fontSize: 13 }}>
              {pending ? 'جارٍ…' : 'نفّذ هذا القرار'}
            </button>
          </p>
        </>
      )}

      {error && (
        <p role="alert" style={{ margin: '11px 0 0', fontSize: 12.5, color: '#fca5a5' }}>{error}</p>
      )}
    </section>
  );
};
