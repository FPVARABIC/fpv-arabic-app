import React, { useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { useSavedPosts } from '../hooks/useSavedPosts';
import { PostCard } from '../Feed/PostCard';

interface SavedPostsScreenProps {
  onBack: () => void;
  onOpenPost: (postId: string) => void;
  onOpenAuthor: (authorId: string) => void;
}

export const SavedPostsScreen: React.FC<SavedPostsScreenProps> = ({ onBack, onOpenPost, onOpenAuthor }) => {
  const { entries, loading, hasMore, totalSavedCount, loadMore, removeFromSaved } = useSavedPosts();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      list => { if (list[0].isIntersecting) loadMore(); },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div style={{ minHeight: '100%', background: '#f7f9fb' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
        borderBottom: '0.5px solid #e5eaf0', background: '#ffffff',
      }}>
        <button onClick={onBack} aria-label="رجوع" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a2b3c', display: 'flex' }}>
          <ArrowRight size={20} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#1a2b3c' }}>المنشورات المحفوظة</span>
      </div>

      {/* Count derived client-side from the fetched saved-ID set length — no
          new stored field, no schema impact (D2/D6 unchanged). */}
      {totalSavedCount > 0 && (
        <p style={{ padding: '12px 16px 0', fontSize: 12, color: '#94a3b3' }} dir="ltr">
          {totalSavedCount} منشور محفوظ
        </p>
      )}

      {!loading && entries.length === 0 && (
        <p style={{ padding: 32, textAlign: 'center', color: '#94a3b3', fontSize: 13 }}>
          لم تحفظ أي منشورات بعد.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 16px 24px' }}>
        {entries.map(entry =>
          entry.post ? (
            <PostCard key={entry.postId} post={entry.post} onOpen={onOpenPost} onOpenAuthor={onOpenAuthor} />
          ) : (
            <div
              key={entry.postId}
              style={{
                background: '#ffffff', border: '0.5px solid #e5eaf0', borderRadius: 14, padding: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 13, color: '#94a3b3' }}>هذا المنشور لم يعد متاحاً</span>
              <button
                onClick={() => removeFromSaved(entry.postId)}
                style={{ fontSize: 12, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                إزالة
              </button>
            </div>
          ),
        )}
        <div ref={sentinelRef} style={{ height: 1 }} aria-hidden />
        {loading && <p style={{ textAlign: 'center', color: '#94a3b3', fontSize: 12, padding: 8 }}>جارٍ التحميل...</p>}
        {!loading && !hasMore && entries.length > 0 && (
          <p style={{ textAlign: 'center', color: '#94a3b3', fontSize: 12, padding: 8 }}>لا مزيد من المنشورات المحفوظة.</p>
        )}
      </div>
    </div>
  );
};
