import React, { useEffect, useRef } from 'react';
import { useFeed, type FeedCategory } from '../hooks/useFeed';
import { PostCard } from './PostCard';

interface FeedListProps {
  category: FeedCategory;
  onOpenPost: (postId: string) => void;
  onOpenAuthor: (authorId: string) => void;
}

export const FeedList: React.FC<FeedListProps> = ({ category, onOpenPost, onOpenAuthor }) => {
  const { posts, loading, hasMore, error, loadMore } = useFeed(category);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // True infinite scroll (D2), not a "load more" button — the sentinel
  // triggers the next page as it approaches the viewport.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  if (error) {
    return <p style={{ padding: 16, color: '#dc2626', fontSize: 13, textAlign: 'center' }}>{error}</p>;
  }

  if (!loading && posts.length === 0) {
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
      {!loading && !hasMore && posts.length > 0 && (
        <p style={{ textAlign: 'center', color: '#94a3b3', fontSize: 12, padding: 8 }}>
          لا مزيد من المنشورات.
        </p>
      )}
    </div>
  );
};
