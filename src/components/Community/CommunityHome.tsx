import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Search as SearchIcon, MoreVertical, Bookmark, Image as ImageIcon, Video } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { CategoryChips, type ChipValue } from './Feed/CategoryChips';
import { FeedList } from './Feed/FeedList';
import { Avatar } from './Avatar';

interface CommunityHomeProps {
  onOpenPost: (postId: string) => void;
  onOpenAuthor: (authorId: string) => void;
  onOpenSearch: () => void;
  onOpenMenu: () => void;
  onOpenSaved: () => void;
  onOpenCompose: () => void;
}

// Header layout (locked, D1.3/D14 amendment + Phase 2 bookmark addition):
// [menu/profile icon] on the left, title centered, [search + bookmark] as a
// group on the right — that right-side group already existed as a flex
// container in Phase 1 specifically so this addition wouldn't require
// restructuring.
export const CommunityHome: React.FC<CommunityHomeProps> = ({
  onOpenPost, onOpenAuthor, onOpenSearch, onOpenMenu, onOpenSaved, onOpenCompose,
}) => {
  const [category, setCategory] = useState<ChipValue>('all');
  const { currentUser, isGuest } = useAuthContext();
  const [toast, setToast] = useState<string | null>(null);

  const handleComposeEntry = () => {
    if (isGuest) {
      setToast('يجب تسجيل الدخول للنشر');
      setTimeout(() => setToast(null), 2500);
      return;
    }
    onOpenCompose();
  };

  return (
    <div style={{ minHeight: '100%', background: '#f7f9fb' }}>
      <div style={{
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '18px 16px 10px', minHeight: 36,
      }}>
        <button
          onClick={onOpenMenu}
          aria-label="القائمة"
          style={{
            position: 'absolute', left: 16,
            width: 40, height: 40, borderRadius: '50%', border: 'none',
            background: '#0e7c86', boxShadow: '0 2px 8px rgba(14,124,134,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <MoreVertical size={20} color="#ffffff" />
        </button>

        <h1 style={{ fontSize: 18, fontWeight: 800, color: '#1a2b3c', margin: 0 }}>المجتمع</h1>

        <div style={{ position: 'absolute', right: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={onOpenSaved}
            aria-label="المحفوظات"
            style={{
              width: 36, height: 36, borderRadius: 10, border: '0.5px solid #e5eaf0',
              background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <Bookmark size={16} color="#5a6b7c" />
          </button>
          <button
            onClick={onOpenSearch}
            aria-label="بحث"
            style={{
              width: 36, height: 36, borderRadius: 10, border: '0.5px solid #e5eaf0',
              background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <SearchIcon size={16} color="#5a6b7c" />
          </button>
        </div>
      </div>

      {/* Composer entry card (D12) — tapping any part opens the full
          PostComposer screen; guests get a login prompt instead. */}
      <div style={{ margin: '0 16px 14px', background: '#ffffff', border: '0.5px solid #e5eaf0', borderRadius: 14, padding: 12 }}>
        <button
          onClick={handleComposeEntry}
          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 10 }}
        >
          <Avatar photoURL={currentUser?.photoURL ?? null} name={currentUser?.displayName ?? 'ز'} size={34} />
          <span style={{ flex: 1, textAlign: 'right', fontSize: 13, color: '#94a3b3' }}>بماذا تحتاج المساعدة اليوم؟</span>
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleComposeEntry}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 10, border: '0.5px solid #e5eaf0', background: '#ffffff', color: '#5a6b7c', fontSize: 12, cursor: 'pointer' }}
          >
            <ImageIcon size={14} /> صورة
          </button>
          <button
            disabled
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 10, border: '0.5px solid #e5eaf0', background: '#f7f9fb', color: '#94a3b3', fontSize: 12, cursor: 'not-allowed', position: 'relative' }}
          >
            <Video size={14} /> فيديو
            <span style={{ position: 'absolute', top: -8, left: -6, fontSize: 9, fontWeight: 700, background: '#fbbf24', color: '#78350f', padding: '2px 6px', borderRadius: 999 }}>قريباً</span>
          </button>
        </div>
      </div>

      {/* Portal to document.body — see ReportButton.tsx for why fixed-position
          overlays must escape AppShell's <main> stacking context. */}
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

      <CategoryChips value={category} onChange={setCategory} />
      <FeedList category={category} onOpenPost={onOpenPost} onOpenAuthor={onOpenAuthor} />
    </div>
  );
};
