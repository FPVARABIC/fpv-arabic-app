import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { useCommentComposer } from '../hooks/useCommentComposer';

interface CommentInputProps {
  postId: string;
  // Called with the created (or duplicate-collapsed) comment's id — the
  // caller fetches/upserts just that one document (usePost's
  // appendCreatedComment) instead of re-running the whole paginated query.
  onCommentAdded: (commentId: string) => void;
}

// Only rendered for logged-in users — PostDetail handles the logged-out
// branch (unchanged note) itself.
export const CommentInput: React.FC<CommentInputProps> = ({ postId, onCommentAdded }) => {
  const [text, setText] = useState('');
  const { createComment, submitting, error } = useCommentComposer();

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    const result = await createComment(postId, trimmed);
    if (result) {
      setText('');
      onCommentAdded(result.commentId);
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      {error && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 8 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={text}
          onChange={e => setText(e.target.value.slice(0, 500))}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          placeholder="أضف تعليقاً..."
          dir="auto"
          style={{
            flex: 1, borderRadius: 999, border: '0.5px solid #e5eaf0', padding: '10px 16px',
            fontSize: 14, color: '#1a2b3c', background: '#ffffff',
          }}
        />
        <button
          onClick={submit}
          disabled={!text.trim() || submitting}
          aria-label="إرسال"
          style={{
            width: 40, height: 40, borderRadius: '50%', border: 'none', flexShrink: 0,
            background: text.trim() ? '#0e7c86' : '#e5eaf0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: text.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          <Send size={16} color={text.trim() ? '#ffffff' : '#94a3b3'} />
        </button>
      </div>
    </div>
  );
};
