'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import { STORAGE_KEYS } from '@core/utils/storageKeys';

/**
 * The reset actions from the phone app's settings screen.
 *
 * SAME ACTIONS, SAME KEYS
 * -----------------------
 * The storage keys come from the shared `STORAGE_KEYS` map — the same constant
 * the phone app's `useProgress` writes through. Retyping the key strings here
 * would produce a settings screen that clears nothing, and it would keep
 * working for exactly as long as nobody renamed a key.
 *
 * SAME SAFETY RULE
 * ----------------
 * Nothing runs on the first click. The app asks «are you sure» with the
 * description of what will be deleted, and so does this — because these
 * actions are not undoable and a mis-click costs somebody their progress.
 * The destructive one is styled as destructive, which is the other half of it.
 */

interface ResetAction {
  id: string;
  label: string;
  description: string;
  keys: string[];
  danger?: boolean;
}

const ACTIONS: ResetAction[] = [
  {
    id: 'lessons',
    label: 'إعادة ضبط تقدّم الدروس',
    description: 'يحذف قائمة الدروس المكتملة وموضعك وإجاباتك داخل كل درس.',
    keys: [STORAGE_KEYS.PROGRESS_LESSONS, STORAGE_KEYS.LESSON_JOURNEY_PROGRESS],
  },
  {
    id: 'roadmap',
    label: 'إعادة ضبط مراحل البناء',
    description: 'يحذف مراحل البناء المكتملة.',
    keys: [STORAGE_KEYS.PROGRESS_ROADMAP],
  },
  {
    id: 'checklists',
    label: 'إعادة ضبط قوائم الفحص',
    description: 'يحذف جميع عناصر قوائم الفحص المحدَّدة.',
    keys: [STORAGE_KEYS.CHECKLISTS],
  },
  {
    id: 'all',
    label: 'مسح بيانات المنصّة في هذا المتصفّح',
    description:
      'يحذف تقدّم الدروس ومراحل البناء وقوائم الفحص معاً. لا يمسّ حسابك ولا ما نشرته.',
    keys: [
      STORAGE_KEYS.PROGRESS_LESSONS,
      STORAGE_KEYS.LESSON_JOURNEY_PROGRESS,
      STORAGE_KEYS.PROGRESS_ROADMAP,
      STORAGE_KEYS.CHECKLISTS,
    ],
    danger: true,
  },
];

export const LocalDataControls: React.FC = () => {
  const [confirming, setConfirming] = useState<ResetAction | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const run = (action: ResetAction) => {
    for (const k of action.keys) {
      try { window.localStorage.removeItem(k); } catch { /* private mode */ }
    }
    setConfirming(null);
    setDone(action.label);
    window.setTimeout(() => setDone(null), 3000);
  };

  return (
    <section className="admin-section" style={{ marginTop: 26 }}>
      <h2
        className="accent-head"
        style={{ fontSize: 18, fontWeight: 900, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <RotateCcw size={16} color="var(--accent-ink)" aria-hidden />
        إعادة الضبط
      </h2>

      {done && (
        <div
          role="status"
          className="card"
          data-testid="settings-done"
          style={{
            padding: '12px 16px', marginBottom: 14,
            display: 'flex', alignItems: 'center', gap: 9,
            borderColor: 'rgba(15,123,79,0.32)', background: 'var(--sev-ok-wash)',
          }}
        >
          <CheckCircle2 size={16} color="var(--sev-ok)" aria-hidden />
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--sev-ok)' }}>تمّ: {done}</p>
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }} data-testid="settings-actions">
        {ACTIONS.map(a => (
          <div
            key={a.id}
            className="card"
            style={{
              padding: '15px 18px',
              borderColor: a.danger ? 'rgba(185,28,28,0.28)' : undefined,
              background: a.danger ? 'var(--sev-blocker-wash)' : undefined,
            }}
          >
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                flexWrap: 'wrap', justifyContent: 'space-between',
              }}
            >
              <div style={{ minWidth: 0, flex: '1 1 320px' }}>
                <p
                  style={{
                    margin: 0, fontSize: 14.5, fontWeight: 800,
                    color: a.danger ? 'var(--sev-blocker)' : 'var(--text)',
                    display: 'flex', alignItems: 'center', gap: 7,
                  }}
                >
                  {a.danger && <AlertTriangle size={15} aria-hidden />}
                  {a.label}
                </p>
                {/* On the phone this line sits under the button because there is
                    no room beside it. Here it sits beside, so six actions can be
                    compared without scrolling. */}
                <p style={{ margin: '5px 0 0', fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.85 }}>
                  {a.description}
                </p>
              </div>

              {confirming?.id === a.id ? (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    type="button"
                    className="admin-danger"
                    onClick={() => run(a)}
                    data-testid={`settings-confirm-${a.id}`}
                  >
                    نعم، احذف
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setConfirming(null)}
                    data-testid={`settings-cancel-${a.id}`}
                  >
                    إلغاء
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={a.danger ? 'admin-danger' : 'btn-ghost'}
                  onClick={() => setConfirming(a)}
                  data-testid={`settings-action-${a.id}`}
                  style={{ flexShrink: 0 }}
                >
                  {a.danger ? 'حذف الكل' : 'إعادة الضبط'}
                </button>
              )}
            </div>

            {confirming?.id === a.id && (
              <p
                role="alert"
                style={{
                  margin: '12px 0 0', fontSize: 12.5, lineHeight: 1.85,
                  color: 'var(--sev-blocker)',
                }}
              >
                لا يمكن التراجع عن هذا. {a.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
