'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  editPostText, softDeletePost, reportContent, POST_TEXT_MAX,
  REPORT_NOTE_MAX, REPORT_REASON_WITH_NOTE,
  type ReportReason,
} from '@/lib/communityWrites';

/**
 * Owner actions (edit, delete) and the report control.
 *
 * WHY `isOwner` COMING FROM THE SERVER IS NOT THE SECURITY BOUNDARY
 * ----------------------------------------------------------------
 * The parent page computes `isOwner` from the VERIFIED session and passes it
 * down, so a visitor does not see an edit button on someone else's post. That
 * is presentation. The actual protection is that `firestore.rules` compares
 * `resource.data.authorId` to `request.auth.uid` on every write — proven by
 * emulator cases PE2 (another user cannot edit) and PE3 (an anonymous caller
 * cannot edit). Deleting this component would not open a hole.
 *
 * DESTRUCTIVE ACTIONS ASK FIRST
 * -----------------------------
 * Delete requires an explicit confirmation step rather than a single click,
 * because a soft-delete removes the post from every reader's view immediately
 * and there is no undo in this batch.
 */

const REASONS: { id: ReportReason; labelAr: string }[] = [
  { id: 'spam', labelAr: 'إزعاج أو إعلان' },
  { id: 'abuse', labelAr: 'إساءة أو تجاوز' },
  { id: 'dangerous', labelAr: 'معلومات خطيرة' },
  { id: 'other', labelAr: 'سبب آخر' },
];

export const PostActions: React.FC<{
  postId: string;
  initialText: string;
  isOwner: boolean;
  isSignedIn: boolean;
}> = ({ postId, initialText, isOwner, isSignedIn }) => {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'editing' | 'confirmDelete' | 'reporting'>('idle');
  const [text, setText] = useState(initialText);
  const [reason, setReason] = useState<ReportReason>('spam');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>, after?: () => void) => {
    // The busy flag is the double-submit guard: every action is disabled while
    // one is in flight, so a fast double-click cannot file two reports or
    // create two writes.
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
      after?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر إتمام العملية');
    } finally {
      setBusy(false);
    }
  };

  const FIELD: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)', background: 'var(--surface-2)',
    color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', lineHeight: 1.9,
  };

  return (
    <div data-testid="post-actions" style={{ marginTop: 18 }}>
      {error && (
        <p role="alert" data-testid="post-action-error"
          style={{
            margin: '0 0 12px', padding: '10px 13px', borderRadius: 'var(--radius-sm)',
            background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.32)',
            fontSize: 13, color: '#fca5a5',
          }}>
          {error}
        </p>
      )}
      {done && (
        <p role="status" data-testid="post-action-done"
          style={{
            margin: '0 0 12px', padding: '10px 13px', borderRadius: 'var(--radius-sm)',
            background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.32)',
            fontSize: 13, color: '#6ee7b7',
          }}>
          {done}
        </p>
      )}

      {mode === 'editing' && (
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="edit-text" className="sr-only">نصّ المنشور</label>
          <textarea
            id="edit-text"
            data-testid="post-edit-textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            rows={7}
            maxLength={POST_TEXT_MAX}
            style={FIELD}
          />
          <p style={{ fontSize: 11.5, color: 'var(--text-dimmer)', margin: '6px 0 0' }} dir="ltr">
            {text.length} / {POST_TEXT_MAX}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              type="button" className="btn-primary" disabled={busy}
              data-testid="post-edit-save"
              onClick={() => run(
                () => editPostText(postId, text),
                () => { setMode('idle'); setDone('حُفظ التعديل'); router.refresh(); },
              )}
            >
              {busy ? 'جارٍ…' : 'احفظ'}
            </button>
            <button
              type="button" className="btn-ghost" disabled={busy}
              onClick={() => { setMode('idle'); setText(initialText); }}
            >
              ألغِ
            </button>
          </div>
        </div>
      )}

      {mode === 'confirmDelete' && (
        <div className="card-sm" style={{ padding: '14px 16px', marginBottom: 14, borderColor: 'rgba(248,113,113,0.32)' }}>
          <p style={{ margin: 0, fontSize: 13.5, color: '#fca5a5', lineHeight: 1.9 }}>
            سيُخفى المنشور عن الجميع. التعليقات تبقى محفوظة، ولا يمكنك التراجع من هنا.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              type="button" disabled={busy}
              data-testid="post-delete-confirm"
              onClick={() => run(
                () => softDeletePost(postId),
                () => { router.refresh(); router.push('/community'); },
              )}
              style={{
                background: 'rgba(248,113,113,0.16)', border: '1px solid rgba(248,113,113,0.4)',
                color: '#fca5a5', borderRadius: 'var(--radius-sm)', padding: '9px 16px',
                fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {busy ? 'جارٍ…' : 'نعم، احذف'}
            </button>
            <button type="button" className="btn-ghost" disabled={busy} onClick={() => setMode('idle')}>
              تراجع
            </button>
          </div>
        </div>
      )}

      {mode === 'reporting' && (
        <div className="card-sm" style={{ padding: '14px 16px', marginBottom: 14 }}>
          <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
            <legend style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>سبب البلاغ</legend>
            {REASONS.map(r => (
              <label key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 7, fontSize: 13, color: 'var(--text-dim)' }}>
                <input
                  type="radio" name="reason" value={r.id}
                  checked={reason === r.id}
                  onChange={() => setReason(r.id)}
                  data-testid={`report-reason-${r.id}`}
                />
                {r.labelAr}
              </label>
            ))}
          </fieldset>
          {/*
            The note appears ONLY for «سبب آخر». That is not a design
            preference: `firestore.rules` requires `note == null` for every
            other reason and refuses the whole write otherwise, so a note box
            on «إزعاج» would be a field that silently destroys the report the
            moment someone types in it.
          */}
          {reason === REPORT_REASON_WITH_NOTE && (
            <>
              <label htmlFor="report-note" style={{ display: 'block', fontSize: 12.5, color: 'var(--text-dim)', margin: '10px 0 6px' }}>
                اشرح السبب باختصار
              </label>
              <textarea
                id="report-note" data-testid="report-note"
                value={note} onChange={e => setNote(e.target.value)}
                rows={3} maxLength={REPORT_NOTE_MAX} style={FIELD}
              />
              <p style={{ fontSize: 11.5, color: 'var(--text-dimmer)', margin: '6px 0 0' }} dir="ltr">
                {note.length} / {REPORT_NOTE_MAX}
              </p>
            </>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              type="button" className="btn-primary" disabled={busy}
              data-testid="report-submit"
              onClick={() => run(
                () => reportContent({ targetType: 'post', targetId: postId, postId, reason, note }),
                () => { setMode('idle'); setDone('وصل البلاغ. سيراجعه المشرفون.'); },
              )}
            >
              {busy ? 'جارٍ…' : 'أرسل البلاغ'}
            </button>
            <button type="button" className="btn-ghost" disabled={busy} onClick={() => setMode('idle')}>
              ألغِ
            </button>
          </div>
        </div>
      )}

      {mode === 'idle' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isOwner && (
            <>
              <button type="button" className="btn-ghost" data-testid="post-edit-start" onClick={() => setMode('editing')}>
                عدّل
              </button>
              <button type="button" className="btn-ghost" data-testid="post-delete-start" onClick={() => setMode('confirmDelete')}>
                احذف
              </button>
            </>
          )}
          {isSignedIn && !isOwner && (
            <button type="button" className="btn-ghost" data-testid="post-report-start" onClick={() => setMode('reporting')}>
              أبلغ
            </button>
          )}
        </div>
      )}
    </div>
  );
};
