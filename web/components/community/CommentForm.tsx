'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createComment, COMMENT_TEXT_MAX } from '@/lib/communityWrites';

/**
 * Writing a comment.
 *
 * The double-submit guard is the `busy` flag, and it is not cosmetic: without
 * it a fast double-click posts the comment twice and increments the counter
 * twice, and there is no server-side idempotency key to undo that. Disabling
 * the control for the duration of the write is the whole defence, so it wraps
 * the entire async path including the counter update.
 *
 * An empty or whitespace-only comment is refused here AND by the rules — the
 * client check exists to give a useful message rather than a permission error.
 */
export const CommentForm: React.FC<{ postId: string }> = ({ postId }) => {
  const router = useRouter();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = text.trim().length > 0 && !busy;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await createComment(postId, text);
      setText('');
      // Re-fetch the server-rendered comment list rather than appending
      // locally: the server is the source of truth, and appending a local copy
      // is how a comment ends up rendered twice once the refresh lands.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر إرسال التعليق');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} data-testid="comment-form" style={{ marginTop: 18 }}>
      <label htmlFor="comment-text" style={{ display: 'block', fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
        أضف تعليقاً
      </label>
      <textarea
        id="comment-text"
        data-testid="comment-textarea"
        value={text}
        onChange={e => setText(e.target.value)}
        rows={4}
        maxLength={COMMENT_TEXT_MAX}
        placeholder="شارك تجربتك أو اسأل عمّا لم يتضح…"
        style={{
          width: '100%', padding: '11px 14px', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)', background: 'var(--surface-2)',
          color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', lineHeight: 1.9,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
        <button type="submit" className="btn-primary" disabled={!canSubmit} data-testid="comment-submit"
          style={{ opacity: canSubmit ? 1 : 0.55 }}>
          {busy ? 'جارٍ الإرسال…' : 'علّق'}
        </button>
        <span style={{ fontSize: 11.5, color: 'var(--text-dimmer)' }} dir="ltr">
          {text.length} / {COMMENT_TEXT_MAX}
        </span>
      </div>
      {error && (
        <p role="alert" data-testid="comment-error"
          style={{ margin: '10px 0 0', fontSize: 13, color: '#fca5a5' }}>
          {error}
        </p>
      )}
    </form>
  );
};
