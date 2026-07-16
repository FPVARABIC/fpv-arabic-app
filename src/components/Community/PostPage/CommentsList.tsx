import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Heart } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { useAuthContext } from '../../../contexts/AuthContext';
import type { CommentWithId } from '../types';
import { commentPath } from '../utils/firestorePaths';
import { timeAgo } from '../utils/timeAgo';
import { Avatar } from '../Avatar';
import { ReportButton } from '../Moderation/ReportButton';
import { useCommentLike } from '../hooks/useCommentLike';

interface CommentsListProps {
  postId: string;
  comments: CommentWithId[];
  onOpenAuthor: (authorId: string) => void;
  // Called with the deleted comment's id — the caller removes it from local
  // state directly (usePost's removeCommentLocally); this component already
  // flipped the doc's status to 'deleted' itself, so no re-fetch is needed.
  onCommentDeleted: (commentId: string) => void;
}

interface CommentLikeButtonProps {
  postId: string;
  commentId: string;
  likesCount: number;
  isGuest: boolean;
  onGuestTap: () => void;
}

// Status is never color-only: the icon itself switches between an outline
// and a filled Heart (a shape change, not just a color change), and the
// accessible name changes between "أعجبني" (like) and "إلغاء الإعجاب"
// (unlike) so a screen reader announces the current state, not just a
// generic "like button" label. A real native <button> — full keyboard
// support and a visible focus outline come from the browser for free, not
// reimplemented here.
const CommentLikeButton: React.FC<CommentLikeButtonProps> = ({ postId, commentId, likesCount, isGuest, onGuestTap }) => {
  const { liked, likedLoading, toggling, toggleError, toggleLike } = useCommentLike(postId, commentId);

  const handleClick = () => {
    if (isGuest) {
      onGuestTap();
      return;
    }
    toggleLike();
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={!isGuest && (likedLoading || toggling)}
        aria-label={liked ? 'إلغاء الإعجاب بالتعليق' : 'أعجبني هذا التعليق'}
        aria-pressed={!isGuest && liked}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
          padding: '2px 4px', cursor: (!isGuest && (likedLoading || toggling)) ? 'default' : 'pointer',
          opacity: !isGuest && toggling ? 0.7 : 1,
        }}
      >
        <Heart size={13} color={liked ? '#dc2626' : '#94a3b3'} fill={liked ? '#dc2626' : 'none'} />
        <span style={{ fontSize: 11, color: liked ? '#dc2626' : '#94a3b3', fontWeight: liked ? 700 : 400 }} dir="ltr">
          {likesCount > 0 ? likesCount : ''}
        </span>
      </button>
      {toggleError && <span style={{ fontSize: 10, color: '#dc2626' }}>{toggleError}</span>}
    </div>
  );
};

export const CommentsList: React.FC<CommentsListProps> = ({ postId, comments, onOpenAuthor, onCommentDeleted }) => {
  const { currentUser, isGuest } = useAuthContext();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handleGuestLikeTap = () => {
    setToast('يجب تسجيل الدخول للإعجاب');
    setTimeout(() => setToast(null), 2500);
  };

  if (comments.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: '#94a3b3', fontSize: 13, padding: '12px 0' }}>
        لا توجد تعليقات بعد.
      </p>
    );
  }

  const deleteComment = async (commentId: string) => {
    await updateDoc(doc(firestoreDb, commentPath(postId, commentId)), { status: 'deleted' });
    setConfirmingId(null);
    onCommentDeleted(commentId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {comments.map(comment => {
        const isOwn = !!currentUser && comment.authorId === currentUser.uid;
        return (
          <div key={comment.id} style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => onOpenAuthor(comment.authorId)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}
            >
              <Avatar photoURL={comment.authorPhoto} name={comment.authorName} size={28} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1a2b3c' }}>{comment.authorName}</span>
                <span style={{ fontSize: 11, color: '#94a3b3' }} dir="ltr">{timeAgo(comment.createdAt)}</span>
                <div style={{ flex: 1 }} />
                {isOwn && (
                  confirmingId === comment.id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => deleteComment(comment.id)} style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>تأكيد</button>
                      <button onClick={() => setConfirmingId(null)} style={{ fontSize: 11, color: '#5a6b7c', background: 'none', border: 'none', cursor: 'pointer' }}>إلغاء</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmingId(comment.id)} aria-label="حذف" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b3', display: 'flex', padding: 2 }}>
                      <Trash2 size={13} />
                    </button>
                  )
                )}
                <ReportButton targetType="comment" targetId={comment.id} postId={postId} />
              </div>
              <p style={{ fontSize: 13, color: '#1a2b3c', margin: '3px 0 0', lineHeight: 1.6, wordBreak: 'break-word' }}>
                {comment.text}
              </p>
              <CommentLikeButton
                postId={postId}
                commentId={comment.id}
                likesCount={comment.likesCount ?? 0}
                isGuest={isGuest}
                onGuestTap={handleGuestLikeTap}
              />
            </div>
          </div>
        );
      })}

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
    </div>
  );
};
