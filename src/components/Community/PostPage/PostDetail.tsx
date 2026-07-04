import React from 'react';
import { ArrowRight } from 'lucide-react';
import { usePost } from '../hooks/usePost';
import { CommentsList } from './CommentsList';
import { CATEGORY_LABELS, CATEGORY_TINTS } from '../utils/categories';
import { timeAgo } from '../utils/timeAgo';
import { Avatar } from '../Avatar';

interface PostDetailProps {
  postId: string;
  onBack: () => void;
  onOpenAuthor: (authorId: string) => void;
}

const NEUTRAL_TINT = { bg: '#eef2f6', text: '#5a6b7c' };

// Full-size image loads here only — feed/search show thumbnails (D5).
export const PostDetail: React.FC<PostDetailProps> = ({ postId, onBack, onOpenAuthor }) => {
  const { post, comments, loading, error } = usePost(postId);
  const tint = post && post.category in CATEGORY_TINTS
    ? CATEGORY_TINTS[post.category as keyof typeof CATEGORY_TINTS]
    : NEUTRAL_TINT;

  return (
    <div style={{ minHeight: '100%', background: '#f7f9fb' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
        borderBottom: '0.5px solid #e5eaf0', background: '#ffffff',
      }}>
        <button onClick={onBack} aria-label="رجوع" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a2b3c', display: 'flex' }}>
          <ArrowRight size={20} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#1a2b3c' }}>المنشور</span>
      </div>

      {loading && <p style={{ padding: 24, textAlign: 'center', color: '#94a3b3', fontSize: 13 }}>جارٍ التحميل...</p>}
      {error && <p style={{ padding: 24, textAlign: 'center', color: '#dc2626', fontSize: 13 }}>{error}</p>}
      {!loading && !error && !post && (
        <p style={{ padding: 24, textAlign: 'center', color: '#94a3b3', fontSize: 13 }}>هذا المنشور لم يعد متاحاً.</p>
      )}

      {post && (
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <button
              onClick={() => onOpenAuthor(post.authorId)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <Avatar photoURL={post.authorPhoto} name={post.authorName} size={34} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1a2b3c' }}>{post.authorName}</span>
            </button>
            <span style={{ fontSize: 12, color: '#94a3b3' }} dir="ltr">{timeAgo(post.createdAt)}</span>
          </div>

          <p style={{ fontSize: 15, color: '#1a2b3c', lineHeight: 1.7, marginBottom: 12, wordBreak: 'break-word' }}>
            {post.text}
          </p>

          {post.mediaType === 'image' && post.mediaURL && (
            <div style={{ width: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 12, background: '#eef2f6' }}>
              <img src={post.mediaURL} alt="" style={{ width: '100%', display: 'block' }} />
            </div>
          )}

          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
            background: tint.bg, color: tint.text,
          }}>
            {CATEGORY_LABELS[post.category]}
          </span>

          <div style={{ height: 1, background: '#e5eaf0', margin: '18px 0' }} />

          <CommentsList comments={comments} onOpenAuthor={onOpenAuthor} />

          {/* Phase 2 builds the real login-gated CommentInput; Phase 1 has no
              write path at all yet, so this note is shown unconditionally. */}
          <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b3', marginTop: 18 }}>
            التعليق يتطلب تسجيل الدخول — القراءة متاحة للجميع
          </p>
        </div>
      )}
    </div>
  );
};
