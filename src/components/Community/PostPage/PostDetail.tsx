import React, { useState } from 'react';
import { ArrowRight, Trash2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { useAuthContext } from '../../../contexts/AuthContext';
import { usePost } from '../hooks/usePost';
import { postPath } from '../utils/firestorePaths';
import { CommentsList } from './CommentsList';
import { CommentInput } from './CommentInput';
import { ReportButton } from '../Moderation/ReportButton';
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
  const { post, comments, loading, error, commentsLoading, commentsError, refresh } = usePost(postId);
  const { currentUser, isGuest } = useAuthContext();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const tint = post && post.category in CATEGORY_TINTS
    ? CATEGORY_TINTS[post.category as keyof typeof CATEGORY_TINTS]
    : NEUTRAL_TINT;

  // A single derived flag covers every CommentsList-visibility case: already
  // having comments (even mid-refresh or mid-error, so the existing list
  // never disappears), or a clean success with zero results (so the list's
  // own built-in empty-state message can render).
  const showCommentsList = comments.length > 0 || (!commentsLoading && !commentsError);

  const isOwnPost = !!currentUser && !!post && post.authorId === currentUser.uid;

  const deletePost = async () => {
    await updateDoc(doc(firestoreDb, postPath(postId)), { status: 'deleted' });
    onBack();
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
        <span style={{ fontSize: 15, fontWeight: 700, color: '#1a2b3c', flex: 1 }}>المنشور</span>
        {post && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {isOwnPost && (
              confirmingDelete ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={deletePost} style={{ fontSize: 12, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>تأكيد الحذف</button>
                  <button onClick={() => setConfirmingDelete(false)} style={{ fontSize: 12, color: '#5a6b7c', background: 'none', border: 'none', cursor: 'pointer' }}>إلغاء</button>
                </div>
              ) : (
                <button onClick={() => setConfirmingDelete(true)} aria-label="حذف" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b3', display: 'flex' }}>
                  <Trash2 size={16} />
                </button>
              )
            )}
            <ReportButton targetType="post" targetId={post.id} postId={post.id} />
          </div>
        )}
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

          {commentsLoading && comments.length === 0 && !commentsError && (
            <p style={{ textAlign: 'center', color: '#94a3b3', fontSize: 12, padding: '8px 0' }}>جارٍ تحميل التعليقات...</p>
          )}
          {commentsLoading && comments.length > 0 && (
            <p style={{ textAlign: 'center', color: '#94a3b3', fontSize: 11, padding: '4px 0' }}>جارٍ تحديث التعليقات...</p>
          )}
          {commentsError && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <p style={{ color: '#dc2626', fontSize: 12, margin: '0 0 6px' }}>{commentsError}</p>
              <button
                onClick={refresh}
                disabled={commentsLoading}
                style={{
                  background: 'none', border: '0.5px solid #e5eaf0', borderRadius: 999,
                  padding: '4px 14px', fontSize: 12, color: commentsLoading ? '#94a3b3' : '#0e7c86',
                  cursor: commentsLoading ? 'not-allowed' : 'pointer',
                }}
              >
                إعادة المحاولة
              </button>
            </div>
          )}
          {showCommentsList && (
            <CommentsList postId={postId} comments={comments} onOpenAuthor={onOpenAuthor} onCommentDeleted={refresh} />
          )}

          {isGuest ? (
            <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b3', marginTop: 18 }}>
              التعليق يتطلب تسجيل الدخول — القراءة متاحة للجميع
            </p>
          ) : (
            <CommentInput postId={postId} onCommentAdded={refresh} />
          )}
        </div>
      )}
    </div>
  );
};
