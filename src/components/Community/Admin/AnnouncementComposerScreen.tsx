import React, { useState } from 'react';
import { useAnnouncementCreate } from '../hooks/useAnnouncementCreate';

const TITLE_MAX = 200;
const BODY_MAX = 2000;

// Announcement creation (Admin dashboard, Phase 2) — writes directly into
// the existing announcements/{announcementId} collection built for
// Notifications Phase 1. No schema or Rules changes: firestore.rules'
// announcements create rule already validates exactly this shape
// (title 1-200 chars, body 1-2000 chars, optional ctaLink, isModerator()).
export const AnnouncementComposerScreen: React.FC = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [ctaLink, setCtaLink] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const { submitting, error, createAnnouncement } = useAnnouncementCreate();

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    const ok = await createAnnouncement({
      title: title.trim(),
      body: body.trim(),
      ctaLink: ctaLink.trim() ? ctaLink.trim() : null,
    });
    if (ok) {
      setTitle('');
      setBody('');
      setCtaLink('');
      setToast('تم نشر الإعلان لجميع الأعضاء');
      setTimeout(() => setToast(null), 2500);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      {toast && (
        <p style={{ fontSize: 13, color: '#0e7c86', fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>{toast}</p>
      )}
      {error && <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 10 }}>{error}</p>}

      <p style={{ fontSize: 12, color: '#5a6b7c', marginBottom: 6 }}>العنوان</p>
      <input
        value={title}
        onChange={e => setTitle(e.target.value.slice(0, TITLE_MAX))}
        placeholder="عنوان الإعلان"
        dir="auto"
        style={{
          width: '100%', border: '0.5px solid #e5eaf0', borderRadius: 12, padding: 12,
          fontSize: 14, color: '#1a2b3c', marginBottom: 4, boxSizing: 'border-box',
        }}
      />
      <p style={{ fontSize: 11, color: '#94a3b3', textAlign: 'left', margin: '0 0 14px' }} dir="ltr">{title.length}/{TITLE_MAX}</p>

      <p style={{ fontSize: 12, color: '#5a6b7c', marginBottom: 6 }}>النص</p>
      <textarea
        value={body}
        onChange={e => setBody(e.target.value.slice(0, BODY_MAX))}
        placeholder="نص الإعلان"
        dir="auto"
        rows={6}
        style={{
          width: '100%', border: '0.5px solid #e5eaf0', borderRadius: 12, padding: 12,
          fontSize: 14, color: '#1a2b3c', resize: 'none', marginBottom: 4, boxSizing: 'border-box',
        }}
      />
      <p style={{ fontSize: 11, color: '#94a3b3', textAlign: 'left', margin: '0 0 14px' }} dir="ltr">{body.length}/{BODY_MAX}</p>

      <p style={{ fontSize: 12, color: '#5a6b7c', marginBottom: 6 }}>رابط (اختياري)</p>
      <input
        value={ctaLink}
        onChange={e => setCtaLink(e.target.value)}
        placeholder="https://..."
        dir="ltr"
        style={{
          width: '100%', border: '0.5px solid #e5eaf0', borderRadius: 12, padding: 12,
          fontSize: 14, color: '#1a2b3c', marginBottom: 18, boxSizing: 'border-box',
        }}
      />

      <button
        onClick={submit}
        disabled={!canSubmit}
        style={{
          width: '100%', padding: '13px', borderRadius: 12, border: 'none',
          background: canSubmit ? '#0e7c86' : '#e5eaf0',
          color: canSubmit ? '#ffffff' : '#94a3b3',
          fontSize: 15, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed',
        }}
      >
        {submitting ? 'جارٍ النشر...' : 'نشر الإعلان'}
      </button>
    </div>
  );
};
