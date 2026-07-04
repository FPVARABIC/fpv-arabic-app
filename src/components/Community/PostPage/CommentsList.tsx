import React from 'react';
import type { CommentWithId } from '../types';
import { timeAgo } from '../utils/timeAgo';
import { Avatar } from '../Avatar';

interface CommentsListProps {
  comments: CommentWithId[];
  onOpenAuthor: (authorId: string) => void;
}

// Read-only in Phase 1 — no CommentInput, no report flag (both Phase 2).
export const CommentsList: React.FC<CommentsListProps> = ({ comments, onOpenAuthor }) => {
  if (comments.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: '#94a3b3', fontSize: 13, padding: '12px 0' }}>
        لا توجد تعليقات بعد.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {comments.map(comment => (
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
            </div>
            <p style={{ fontSize: 13, color: '#1a2b3c', margin: '3px 0 0', lineHeight: 1.6, wordBreak: 'break-word' }}>
              {comment.text}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
