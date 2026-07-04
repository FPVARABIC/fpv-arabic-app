import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Flag } from 'lucide-react';
import { useAuthContext } from '../../../contexts/AuthContext';
import { useReport } from '../hooks/useReport';
import type { ReportReason, ReportTargetType } from '../types';

interface ReportButtonProps {
  targetType: ReportTargetType;
  targetId: string;
  postId: string;
}

const REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: 'spam', label: 'spam' },
  { value: 'abuse', label: 'مسيء' },
  { value: 'dangerous', label: 'معلومات خطيرة' },
  { value: 'other', label: 'آخر' },
];

// One component reused identically on posts and comments (D9). Muted flag
// icon; tapping opens a minimal choice sheet matching Community's own light
// D12 identity (not ProfileSheet's dark styling).
export const ReportButton: React.FC<ReportButtonProps> = ({ targetType, targetId, postId }) => {
  const { isGuest } = useAuthContext();
  const { submitReport, submitting } = useReport();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const open = () => {
    if (isGuest) {
      setToast('تسجيل الدخول مطلوب للإبلاغ');
      setTimeout(() => setToast(null), 2500);
      return;
    }
    setSheetOpen(true);
  };

  const close = () => {
    setSheetOpen(false);
    setSelectedReason(null);
    setNote('');
  };

  const confirm = async () => {
    if (!selectedReason) return;
    const ok = await submitReport({
      targetType,
      targetId,
      postId,
      reason: selectedReason,
      note: selectedReason === 'other' && note.trim() ? note.trim().slice(0, 200) : null,
    });
    close();
    if (ok) {
      setToast('تم استلام البلاغ — ستراجعه الإدارة');
      setTimeout(() => setToast(null), 2500);
    }
  };

  return (
    <>
      <button
        onClick={open}
        aria-label="إبلاغ"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b3', display: 'flex', padding: 4 }}
      >
        <Flag size={14} />
      </button>

      {/* Rendered via portal to document.body — position:fixed here would
          otherwise be scoped inside AppShell's <main> stacking context
          (z-index:1), which can never outrank BottomNavigation (a sibling
          at z-index:30) no matter how high a z-index is set locally. */}
      {toast && createPortal(
        <div style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          background: '#1a2b3c', color: '#ffffff', fontSize: 13, padding: '10px 18px',
          borderRadius: 999, zIndex: 60, whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>,
        document.body,
      )}

      {sheetOpen && createPortal(
        <div
          onClick={close}
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,43,60,0.45)', zIndex: 55, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 390, background: '#ffffff', borderRadius: '18px 18px 0 0',
              padding: '18px 20px 28px',
            }}
          >
            <div style={{ width: 36, height: 4, background: '#e5eaf0', borderRadius: 99, margin: '0 auto 16px' }} />
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1a2b3c', margin: '0 0 12px' }}>سبب الإبلاغ</p>

            {REASONS.map(r => (
              <button
                key={r.value}
                onClick={() => setSelectedReason(r.value)}
                style={{
                  width: '100%', textAlign: 'right', padding: '10px 12px', borderRadius: 10,
                  border: selectedReason === r.value ? '1px solid #0e7c86' : '0.5px solid #e5eaf0',
                  background: selectedReason === r.value ? 'rgba(14,124,134,0.06)' : '#ffffff',
                  color: '#1a2b3c', fontSize: 14, marginBottom: 8, cursor: 'pointer',
                }}
              >
                {r.label}
              </button>
            ))}

            {selectedReason === 'other' && (
              <textarea
                value={note}
                onChange={e => setNote(e.target.value.slice(0, 200))}
                placeholder="اكتب سبباً مختصراً (اختياري)"
                dir="auto"
                rows={3}
                style={{
                  width: '100%', borderRadius: 10, border: '0.5px solid #e5eaf0', padding: 10,
                  fontSize: 13, color: '#1a2b3c', resize: 'none', marginTop: 4, marginBottom: 4,
                }}
              />
            )}

            <button
              onClick={confirm}
              disabled={!selectedReason || submitting}
              style={{
                width: '100%', marginTop: 12, padding: '12px', borderRadius: 12, border: 'none',
                background: selectedReason ? '#0e7c86' : '#e5eaf0',
                color: selectedReason ? '#ffffff' : '#94a3b3',
                fontSize: 14, fontWeight: 700, cursor: selectedReason ? 'pointer' : 'not-allowed',
              }}
            >
              إرسال البلاغ
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};
