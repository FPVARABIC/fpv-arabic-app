import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Search as SearchIcon, MoreVertical, Bookmark, Bell, Image as ImageIcon, Video } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { CategoryChips, type ChipValue } from './Feed/CategoryChips';
import { FeedList } from './Feed/FeedList';
import type { UseFeedResult } from './hooks/useFeed';
import { Avatar } from './Avatar';

interface CommunityHomeProps {
  category: ChipValue;
  onCategoryChange: (value: ChipValue) => void;
  feed: UseFeedResult;
  onOpenPost: (postId: string) => void;
  onOpenAuthor: (authorId: string) => void;
  onOpenSearch: () => void;
  onOpenMenu: () => void;
  onOpenSaved: () => void;
  onOpenCompose: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount: number;
}

// Header layout (locked, D1.3/D14 amendment + Phase 2 bookmark addition,
// Notifications Phase 1 bell addition, persistent-search-bar amendment):
// [menu/profile icon] on the right (RTL), title centered, [bookmark + bell]
// as a group on the left — that group already existed as a flex container
// in Phase 1 specifically so additions wouldn't require restructuring. The
// persistent search bar is a second row below this one, occupying the full
// header width — it replaces the small search-icon button that used to sit
// in the left-side group above.
export const CommunityHome: React.FC<CommunityHomeProps> = ({
  category, onCategoryChange, feed, onOpenPost, onOpenAuthor, onOpenSearch, onOpenMenu, onOpenSaved, onOpenCompose,
  onOpenNotifications, unreadNotificationsCount,
}) => {
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
            position: 'absolute', right: 16,
            width: 40, height: 40, borderRadius: '50%', border: 'none',
            background: '#0e7c86', boxShadow: '0 2px 8px rgba(14,124,134,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <MoreVertical size={20} color="#ffffff" />
        </button>

        <h1 style={{ fontSize: 19, fontWeight: 800, color: '#1a2b3c', margin: 0 }}>
          <span style={{ color: '#0e7c86', letterSpacing: 0.3 }} dir="ltr">FPV</span> بالعربي
        </h1>

        <div style={{ position: 'absolute', left: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
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
            onClick={onOpenNotifications}
            aria-label="الإشعارات"
            style={{
              position: 'relative',
              width: 36, height: 36, borderRadius: 10, border: '0.5px solid #e5eaf0',
              background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <Bell size={16} color="#5a6b7c" />
            {unreadNotificationsCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, left: -4,
                minWidth: 16, height: 16, borderRadius: 999, padding: '0 3px',
                background: '#dc2626', color: '#ffffff', fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Persistent search bar (D-search amendment) — a real, always-visible
          input rather than a small icon that opens a separate screen
          (Facebook Groups' pattern). readOnly keeps it a genuine, focusable,
          screen-reader-visible text field without duplicating useSearch.ts/
          useUserSearch.ts's debounced query state up here — tapping it just
          transitions to the existing SearchScreen exactly as the old icon
          button did (onOpenSearch is unchanged, still calls the same
          goTo({ name: 'search' }) in HomeView.tsx). onClick is added
          alongside onFocus because some browsers don't reliably fire focus
          from a tap on a readOnly field. */}
      <div style={{ padding: '0 16px 14px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#ffffff', border: '0.5px solid #e5eaf0', borderRadius: 12, padding: '10px 14px',
        }}>
          <SearchIcon size={16} color="#94a3b3" />
          <input
            readOnly
            onFocus={onOpenSearch}
            onClick={onOpenSearch}
            placeholder="ابحث في المجتمع..."
            dir="auto"
            aria-label="بحث"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: '#1a2b3c', cursor: 'pointer' }}
          />
        </div>
      </div>

      {/* Composer entry card (D12) — tapping the placeholder text opens the
          full PostComposer screen; guests get a login prompt instead. The
          avatar is its own tap target (signed-in users only) that opens the
          current user's own PublicProfile — matching modern social apps'
          "tap your own avatar to view your profile" convention. It reuses
          the exact same onOpenAuthor navigation already wired for every
          other author's avatar, just called with the current user's own
          uid, so no new route or duplicated profile logic is introduced. */}
      <div style={{ margin: '0 16px 14px', background: '#ffffff', border: '0.5px solid #e5eaf0', borderRadius: 14, padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', marginBottom: 10 }}>
          {isGuest ? (
            <Avatar photoURL={null} name="ز" size={34} />
          ) : (
            <button
              onClick={() => onOpenAuthor(currentUser!.uid)}
              aria-label="ملفك الشخصي"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', flexShrink: 0 }}
            >
              <Avatar photoURL={currentUser?.photoURL ?? null} name={currentUser?.displayName ?? 'ز'} size={34} />
            </button>
          )}
          <button
            onClick={handleComposeEntry}
            style={{ flex: 1, display: 'flex', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <span style={{ flex: 1, textAlign: 'right', fontSize: 13, color: '#94a3b3' }}>بماذا تحتاج المساعدة اليوم؟</span>
          </button>
        </div>
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

      <CategoryChips value={category} onChange={onCategoryChange} />
      <FeedList feed={feed} onOpenPost={onOpenPost} onOpenAuthor={onOpenAuthor} />
    </div>
  );
};
