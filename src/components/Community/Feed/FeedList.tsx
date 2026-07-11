import React, { useEffect, useRef } from 'react';
import type { UseFeedResult } from '../hooks/useFeed';
import { PostCard } from './PostCard';

interface FeedListProps {
  feed: UseFeedResult;
  onOpenPost: (postId: string) => void;
  onOpenAuthor: (authorId: string) => void;
}

export const FeedList: React.FC<FeedListProps> = ({ feed, onOpenPost, onOpenAuthor }) => {
  const { posts, loading, hasMore, error, loadMoreError, loadMore } = feed;
  const sentinelRef = useRef<HTMLDivElement>(null);

  // True infinite scroll (D2), not a "load more" button — the sentinel
  // triggers the next page as it approaches the viewport. Paused while
  // loadMoreError is visible so the explicit retry button is the sole
  // trigger until the user acts on it.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && !loadMoreError) loadMore(); },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, loadMoreError]);

  if (error && posts.length === 0) {
    return <p style={{ padding: 16, color: '#dc2626', fontSize: 13, textAlign: 'center' }}>{error}</p>;
  }

  if (!loading && !error && posts.length === 0) {
    return (
      <p style={{ padding: 32, textAlign: 'center', color: '#94a3b3', fontSize: 13 }}>
        لا توجد منشورات في هذا القسم بعد.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 16px 24px' }}>
      {posts.map(post => (
        <PostCard key={post.id} post={post} onOpen={onOpenPost} onOpenAuthor={onOpenAuthor} />
      ))}
      <div ref={sentinelRef} style={{ height: 1 }} aria-hidden />
      {loading && (
        <p style={{ textAlign: 'center', color: '#94a3b3', fontSize: 12, padding: 8 }}>جارٍ التحميل...</p>
      )}
      {loadMoreError && (
        <div style={{ textAlign: 'center', padding: 8 }}>
          <p style={{ color: '#dc2626', fontSize: 12, margin: '0 0 6px' }}>{loadMoreError}</p>
          <button
            onClick={loadMore}
            style={{
              background: 'none', border: '0.5px solid #e5eaf0', borderRadius: 999,
              padding: '4px 14px', fontSize: 12, color: '#0e7c86', cursor: 'pointer',
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      )}
      {!loading && !hasMore && !loadMoreError && posts.length > 0 && (
        <p style={{ textAlign: 'center', color: '#94a3b3', fontSize: 12, padding: 8 }}>
          لا مزيد من المنشورات.
        </p>
      )}
    </div>
  );
};
