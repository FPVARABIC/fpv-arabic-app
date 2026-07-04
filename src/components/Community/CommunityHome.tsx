import React, { useState } from 'react';
import { Search as SearchIcon, MoreVertical } from 'lucide-react';
import { CategoryChips, type ChipValue } from './Feed/CategoryChips';
import { FeedList } from './Feed/FeedList';

interface CommunityHomeProps {
  onOpenPost: (postId: string) => void;
  onOpenAuthor: (authorId: string) => void;
  onOpenSearch: () => void;
  onOpenMenu: () => void;
}

// Phase 1: chips + feed only. The composer card (D12's approved header
// element) is intentionally not rendered here — it requires login and is
// Phase 2 scope. This is the Home tab's eventual rendered content (D14).
//
// Header layout (locked, D1.3/D14 amendment): [menu/profile icon] on the
// left, title centered, [search icon] on the right. The right-side group is
// a flex container so Phase 2's bookmark/saved-posts icon can sit next to
// search without restructuring — not built here, just reserved.
export const CommunityHome: React.FC<CommunityHomeProps> = ({ onOpenPost, onOpenAuthor, onOpenSearch, onOpenMenu }) => {
  const [category, setCategory] = useState<ChipValue>('all');

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

      <CategoryChips value={category} onChange={setCategory} />
      <FeedList category={category} onOpenPost={onOpenPost} onOpenAuthor={onOpenAuthor} />
    </div>
  );
};
