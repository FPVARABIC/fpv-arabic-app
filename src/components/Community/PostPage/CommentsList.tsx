import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { useAuthContext } from '../../../contexts/AuthContext';
import type { CommentWithId } from '../types';
import { commentPath } from '../utils/firestorePaths';
import { timeAgo } from '../utils/timeAgo';
import { Avatar } from '../Avatar';
import { ReportButton } from '../Moderation/ReportButton';

interface CommentsListProps {
  postId: string;
  comments: CommentWithId[];
  onOpenAuthor: (authorId: string) => void;
  onCommentDeleted: () => void;
}

export const CommentsList: React.FC<CommentsListProps> = ({ postId, comments, onOpenAuthor, onCommentDeleted }) => {
  const { currentUser } = useAuthContext();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

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
    onCommentDeleted();
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
            </div>
          </div>
        );
      })}
    </div>
  );
};
