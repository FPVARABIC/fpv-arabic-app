import React, { useState } from 'react';
import { ArrowRight, Search as SearchIcon } from 'lucide-react';
import { useSearch } from '../hooks/useSearch';
import { useUserSearch } from '../hooks/useUserSearch';
import { MIN_USER_SEARCH_QUERY_LENGTH } from '../utils/userSearch';
import { PostCard } from '../Feed/PostCard';
import { Avatar } from '../Avatar';

const SUGGESTIONS: readonly string[] = ['Motor', 'DJI O4', 'Failsafe', 'بطارية', 'ESC', 'Betaflight'];

interface SearchScreenProps {
  onBack: () => void;
  onOpenPost: (postId: string) => void;
  onOpenAuthor: (authorId: string) => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({ onBack, onOpenPost, onOpenAuthor }) => {
  const [input, setInput] = useState('');
  const { results, loading, hasSearched, error, search, clear } = useSearch();
  const userSearch = useUserSearch();

  const runSearch = (q: string) => {
    setInput(q);
    if (q.trim().length === 0) {
      clear();
      userSearch.clear();
      return;
    }
    search(q);
    userSearch.search(q);
  };

  return (
    <div style={{ minHeight: '100%', background: '#f7f9fb' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
        borderBottom: '0.5px solid #e5eaf0', background: '#ffffff',
      }}>
        <button onClick={onBack} aria-label="رجوع" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a2b3c', display: 'flex' }}>
          <ArrowRight size={20} />
        </button>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          background: '#f7f9fb', borderRadius: 10, padding: '8px 12px', border: '0.5px solid #e5eaf0',
        }}>
          <SearchIcon size={16} color="#94a3b3" />
          <input
            value={input}
            onChange={e => runSearch(e.target.value)}
            placeholder="ابحث: Motor, DJI O4, Failsafe..."
            dir="auto"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: '#1a2b3c' }}
          />
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {!hasSearched && (
          <>
            <p style={{ fontSize: 12, color: '#94a3b3', marginBottom: 10 }}>جرّب البحث عن:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => runSearch(s)}
                  dir="auto"
                  style={{
                    padding: '7px 14px', borderRadius: 999, border: '0.5px solid #e5eaf0',
                    background: '#ffffff', color: '#5a6b7c', fontSize: 13, cursor: 'pointer',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Accounts section — clearly labeled and visually distinct from post
            results below (its own heading, its own card style: a horizontal
            avatar+name row, never mistakable for a PostCard). Card content is
            an explicit safe-fields-only projection (see
            PublicUserSearchResult in useUserSearch.ts) — no email, no
            role/status/activity metadata, ever. */}
        {hasSearched && input.trim().length >= MIN_USER_SEARCH_QUERY_LENGTH && (
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#5a6b7c', margin: '0 0 8px' }}>الحسابات</p>
            {userSearch.loading && (
              <p style={{ textAlign: 'center', color: '#94a3b3', fontSize: 13, padding: '12px 0' }}>جارٍ البحث عن حسابات...</p>
            )}
            {!userSearch.loading && userSearch.error && (
              <p style={{ textAlign: 'center', color: '#dc2626', fontSize: 13, padding: '12px 0' }}>{userSearch.error}</p>
            )}
            {!userSearch.loading && !userSearch.error && userSearch.results.length === 0 && (
              <p style={{ textAlign: 'center', color: '#94a3b3', fontSize: 13, padding: '12px 0' }}>لا توجد حسابات مطابقة.</p>
            )}
            {!userSearch.loading && userSearch.results.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {userSearch.results.map(user => (
                  <button
                    key={user.uid}
                    onClick={() => onOpenAuthor(user.uid)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, background: '#ffffff',
                      border: '0.5px solid #e5eaf0', borderRadius: 12, padding: 10, cursor: 'pointer', textAlign: 'right',
                    }}
                  >
                    <Avatar photoURL={user.photoURL} name={user.displayName} size={36} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1a2b3c' }}>{user.displayName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Posts section */}
        {hasSearched && (
          <p style={{ fontSize: 12, fontWeight: 700, color: '#5a6b7c', margin: '0 0 8px' }}>المنشورات</p>
        )}
        {hasSearched && loading && (
          <p style={{ textAlign: 'center', color: '#94a3b3', fontSize: 13, padding: 24 }}>جارٍ البحث...</p>
        )}
        {hasSearched && !loading && error && (
          <p style={{ textAlign: 'center', color: '#dc2626', fontSize: 13, padding: 24 }}>{error}</p>
        )}
        {hasSearched && !loading && !error && results.length === 0 && (
          <p style={{ textAlign: 'center', color: '#94a3b3', fontSize: 13, padding: 24 }}>لا توجد نتائج مطابقة.</p>
        )}
        {hasSearched && !loading && !error && results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {results.map(post => (
              <PostCard key={post.id} post={post} onOpen={onOpenPost} onOpenAuthor={onOpenAuthor} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
