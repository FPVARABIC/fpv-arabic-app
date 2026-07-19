import React, { useState } from 'react';
import { ArrowRight, Flag, Users, Megaphone } from 'lucide-react';
import { useIsModerator } from '../hooks/useIsModerator';
import { ReportsReviewScreen } from './ReportsReviewScreen';
import { UserManagementScreen } from './UserManagementScreen';
import { AnnouncementComposerScreen } from './AnnouncementComposerScreen';

interface AdminDashboardProps {
  onBack: () => void;
  onOpenPost: (postId: string) => void;
  onOpenAuthor: (authorId: string) => void;
}

type AdminTab = 'reports' | 'users' | 'announcements';

const TABS: Array<{ id: AdminTab; label: string; Icon: typeof Flag }> = [
  { id: 'reports', label: 'البلاغات', Icon: Flag },
  { id: 'users', label: 'الأعضاء', Icon: Users },
  { id: 'announcements', label: 'الإعلانات', Icon: Megaphone },
];

// Admin dashboard (Phase 2) — moderator-only. ProfileSheet's hidden entry
// point is UX only; this component independently calls useIsModerator()
// itself, a SEPARATE hook instance from the one gating that menu row, rather
// than trusting a boolean threaded through navigation state — so a
// non-moderator who somehow lands on this screen still sees nothing
// moderator-only rendered. The real enforcement is firestore.rules'
// isModerator() checks on every read/write this screen and its children
// perform (reports read/resolve, users status-only update, post/comment
// hide, announcement create) — this client-side check is defense-in-depth,
// never the security boundary itself.
export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, onOpenPost, onOpenAuthor }) => {
  const { isModerator, loading } = useIsModerator();
  const [tab, setTab] = useState<AdminTab>('reports');

  return (
    <div style={{ minHeight: '100%', background: '#f7f9fb' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
        borderBottom: '0.5px solid #e5eaf0', background: '#ffffff',
      }}>
        <button onClick={onBack} aria-label="رجوع" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a2b3c', display: 'flex' }}>
          <ArrowRight size={20} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#1a2b3c' }}>لوحة الإشراف</span>
      </div>

      {loading && (
        <p style={{ textAlign: 'center', color: '#94a3b3', fontSize: 13, padding: 32 }}>جارٍ التحقق من الصلاحية...</p>
      )}

      {!loading && !isModerator && (
        <p style={{ textAlign: 'center', color: '#dc2626', fontSize: 13, padding: 32 }}>هذه الصفحة مخصصة للمشرفين فقط.</p>
      )}

      {!loading && isModerator && (
        <>
          <div style={{ display: 'flex', borderBottom: '0.5px solid #e5eaf0', background: '#ffffff' }}>
            {TABS.map(({ id, label, Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer',
                    color: active ? '#0e7c86' : '#94a3b3',
                    borderBottom: active ? '2px solid #0e7c86' : '2px solid transparent',
                  }}
                >
                  <Icon size={17} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{label}</span>
                </button>
              );
            })}
          </div>

          {tab === 'reports' && <ReportsReviewScreen onOpenPost={onOpenPost} />}
          {tab === 'users' && <UserManagementScreen onOpenAuthor={onOpenAuthor} />}
          {tab === 'announcements' && <AnnouncementComposerScreen />}
        </>
      )}
    </div>
  );
};
