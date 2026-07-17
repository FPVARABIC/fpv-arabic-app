import React, { useMemo, useState } from 'react';
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

type CommentSortMode = 'oldest' | 'top';

export const CommentsList: React.FC<CommentsListProps> = ({ postId, comments, onOpenAuthor, onCommentDeleted }) => {
  const { currentUser, isGuest } = useAuthContext();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Feed ranking (Phase 2, Section O) — a pure client-side re-sort of the
  // comments this component was ALREADY given by usePost.ts; never a new
  // query, never a schema change. Default stays exactly the existing
  // chronological (oldest-first) order — "top comments" is strictly opt-in.
  const [sortMode, setSortMode] = useState<CommentSortMode>('oldest');
  // Date.now() must never be called during render (React purity rule), and
  // a ref must never be READ during render either — so the "now" this sort
  // uses is captured as plain STATE, set only from the toggle button's own
  // event handler below (an explicitly legitimate place for an impure
  // read), never computed inline here. null until the user opts into
  // "top" at least once; "reasonably fresh" is all Section O's tiny
  // 0.02/hour age penalty needs, not a live-updating clock.
  const [topSortComputedAt, setTopSortComputedAt] = useState<number | null>(null);

  const sortedComments = useMemo(() => {
    if (sortMode === 'oldest' || topSortComputedAt === null) return comments;
    const now = topSortComputedAt;
    // commentScore = sqrt(likesCount) - 0.02 * ageHours (Section O) — a
    // small per-hour penalty only to break near-ties between comments with
    // equal likes; deliberately tiny (0.48/day) so it essentially never
    // overrides a genuine likesCount lead within a typical comment page's
    // age spread.
    const scored = comments.map(comment => {
      const ageHours = Math.max(0, (now - comment.createdAt.toMillis()) / (60 * 60 * 1000));
      return { comment, score: Math.sqrt(comment.likesCount ?? 0) - 0.02 * ageHours };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.comment);
  }, [comments, sortMode, topSortComputedAt]);

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
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => setSortMode('oldest')}
          aria-pressed={sortMode === 'oldest'}
          style={{
            fontSize: 12, fontWeight: sortMode === 'oldest' ? 700 : 400,
            color: sortMode === 'oldest' ? '#0e7c86' : '#94a3b3',
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
          }}
        >
          الأقدم أولاً
        </button>
        <button
          type="button"
          onClick={() => {
            setTopSortComputedAt(Date.now());
            setSortMode('top');
          }}
          aria-pressed={sortMode === 'top'}
          style={{
            fontSize: 12, fontWeight: sortMode === 'top' ? 700 : 400,
            color: sortMode === 'top' ? '#0e7c86' : '#94a3b3',
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
          }}
        >
          الأعلى تقييماً
        </button>
      </div>
      {sortedComments.map(comment => {
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
