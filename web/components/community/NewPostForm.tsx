'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { createPost, POST_TEXT_MAX } from '@/lib/communityWrites';
import { MediaUploadCancelledError } from '@/lib/mediaUpload';
import { MediaPicker, type PickedMedia } from './MediaPicker';
import { CATEGORY_LABELS, VISIBLE_CATEGORY_IDS } from '@core/community/utils/categories';
import { toParagraphs } from '@/lib/text';

/**
 * Composing a text post.
 *
 * THE DRAFT SURVIVES A MISTAKE
 * ----------------------------
 * The text is mirrored into sessionStorage on every keystroke and restored on
 * mount. Losing a long, carefully-written post to a refresh, a dead connection
 * or a mis-click is the single most infuriating failure a composer can have,
 * and it costs one effect to prevent. sessionStorage rather than localStorage
 * so the draft dies with the tab instead of following the user around, and it
 * is cleared the moment the post is created.
 *
 * THE PREVIEW PROVES THE ESCAPING
 * -------------------------------
 * The preview renders through exactly the same text pipeline as the live post,
 * so a user who types `<b>bold</b>` sees those characters in the preview and in
 * the published post alike. It is not a Markdown or HTML renderer, and that is
 * intentional: accepting markup from strangers is how a community feed becomes
 * an XSS vector.
 */

const DRAFT_KEY = 'fpv-community-draft-v1';

/**
 * The draft as it stood when this tab last rendered the composer.
 *
 * `useSyncExternalStore` is React's primitive for a value that exists only on
 * the client: the server snapshot is the empty string (there is no
 * sessionStorage during SSR), and the client snapshot is the saved draft. That
 * is what makes the restore hydration-safe WITHOUT setting state from an
 * effect — which would cost an extra render pass on every mount and is exactly
 * the cascading-render pattern React 19 warns about.
 *
 * The snapshot is read once and cached because `getSnapshot` must be stable
 * within a render pass: the composer writes to sessionStorage on every
 * keystroke, so a live read would report a new value on each render and React
 * would re-render in a loop chasing it. Caching is correct here because nothing
 * outside this tab's own composer ever writes this key — `subscribe` therefore
 * has nothing to listen to and returns a no-op unsubscriber.
 */
let cachedDraft: string | null = null;
function readDraftOnce(): string {
  if (cachedDraft === null) {
    try { cachedDraft = sessionStorage.getItem(DRAFT_KEY) ?? ''; }
    catch { cachedDraft = ''; /* storage unavailable — the composer still works */ }
  }
  return cachedDraft;
}
function writeDraft(value: string) {
  cachedDraft = value;
  try {
    if (value) sessionStorage.setItem(DRAFT_KEY, value);
    else sessionStorage.removeItem(DRAFT_KEY);
  } catch { /* ignore */ }
}
const subscribeToDraft = () => () => {};

export const NewPostForm: React.FC = () => {
  const router = useRouter();
  const restoredDraft = useSyncExternalStore(subscribeToDraft, readDraftOnce, () => '');
  // `null` means "the user has not touched the field yet", so the restored
  // draft is still what should be shown. The first keystroke replaces it, and
  // an intentional clear-to-empty stays cleared rather than snapping back.
  const [typed, setTyped] = useState<string | null>(null);
  const text = typed ?? restoredDraft;
  const [category, setCategory] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [picked, setPicked] = useState<PickedMedia | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  // Set by the pipeline the moment a transfer starts, so «إلغاء الرفع» can
  // abort the real in-flight request rather than merely hiding the bar.
  const cancelRef = useRef<(() => void) | null>(null);
  // A failed attempt keeps the picked file, so «أعد المحاولة» resumes from the
  // same selection instead of making the person find the photo again.
  const [failedAttempt, setFailedAttempt] = useState(false);

  const setText = (value: string) => setTyped(value);

  useEffect(() => {
    // Mirror to storage AFTER paint, never during render. Skipped while the
    // user has typed nothing, so merely opening the composer does not rewrite
    // the draft it just restored.
    if (typed === null) return;
    writeDraft(typed);
  }, [typed]);

  const trimmed = text.trim();
  // A post needs SOMETHING: text, or a file. An image on its own is valid
  // content — `firestore.rules` says so explicitly — so requiring text as well
  // would be this component inventing a rule the platform does not have.
  const hasContent = trimmed.length > 0 || picked !== null;
  const canSubmit = hasContent && trimmed.length <= POST_TEXT_MAX && !busy;

  async function publish() {
    setBusy(true);
    setError(null);
    setFailedAttempt(false);
    if (picked) setProgress(0);
    try {
      const id = await createPost({
        text,
        category: category || null,
        file: picked?.file ?? null,
        onProgress: pct => setProgress(pct),
        control: { onStart: cancel => { cancelRef.current = cancel; } },
      });
      writeDraft('');
      router.refresh();
      router.push(`/community/posts/${id}`);
    } catch (err) {
      // Cancelling is a decision, not a failure. It returns the composer to
      // exactly where it was, with the file still selected.
      if (err instanceof MediaUploadCancelledError) {
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : 'تعذّر نشر المنشور');
        // Only offer a retry when there is a file worth not re-picking.
        setFailedAttempt(picked !== null);
      }
      setBusy(false);
      setProgress(null);
      cancelRef.current = null;
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Double-submit guard: `busy` disables the button AND short-circuits here,
    // because a keyboard Enter can fire while the button is already disabled.
    if (!canSubmit) return;
    await publish();
  }

  function cancelUpload() {
    cancelRef.current?.();
    cancelRef.current = null;
  }

  const FIELD: React.CSSProperties = {
    width: '100%', padding: '12px 15px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)', background: 'var(--surface-2)',
    color: 'var(--text)', fontSize: 14.5, fontFamily: 'inherit', lineHeight: 2,
  };

  return (
    <form onSubmit={onSubmit} data-testid="new-post-form">
      <label htmlFor="post-category" style={{ display: 'block', fontSize: 13, fontWeight: 800, marginBottom: 7 }}>
        التصنيف
      </label>
      <select
        id="post-category"
        data-testid="new-post-category"
        value={category}
        onChange={e => setCategory(e.target.value)}
        style={{ ...FIELD, marginBottom: 18 }}
      >
        <option value="">— بلا تصنيف —</option>
        {VISIBLE_CATEGORY_IDS.map(c => (
          <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
        ))}
      </select>

      <label htmlFor="post-text" style={{ display: 'block', fontSize: 13, fontWeight: 800, marginBottom: 7 }}>
        نصّ المنشور
      </label>
      <textarea
        id="post-text"
        data-testid="new-post-text"
        value={text}
        onChange={e => setText(e.target.value)}
        rows={10}
        maxLength={POST_TEXT_MAX}
        // NOT `required`: a post carrying only an image is valid content, and
        // firestore.rules says so explicitly (the whitespace-only text check
        // applies to mediaType 'none' alone). Marking the field required would
        // let the browser block a submission the platform would have accepted.
        aria-describedby="media-limits"
        placeholder="اشرح ما تريده بوضوح: القطع التي تستخدمها، وما جرّبته، وما حدث بالضبط."
        style={FIELD}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
        <span style={{ fontSize: 11.5, color: 'var(--text-dimmer)' }} dir="ltr">
          {text.length} / {POST_TEXT_MAX}
        </span>
        <button
          type="button"
          onClick={() => setShowPreview(p => !p)}
          data-testid="new-post-preview-toggle"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 12.5, color: 'var(--accent)', textDecoration: 'underline',
          }}
        >
          {showPreview ? 'أخفِ المعاينة' : 'معاينة'}
        </button>
      </div>

      {showPreview && (
        <section
          aria-label="معاينة المنشور"
          data-testid="new-post-preview"
          className="card-sm"
          style={{ padding: '16px 18px', marginTop: 14 }}
        >
          {trimmed ? (
            toParagraphs(text).map((block, bi) => (
              <p key={bi} style={{
                margin: bi === 0 ? 0 : '10px 0 0', fontSize: 14.5, lineHeight: 2,
                color: 'var(--text-dim)', overflowWrap: 'anywhere',
              }}>
                {block.map((line, li) => (
                  <span key={li}>{line}{li < block.length - 1 && <br />}</span>
                ))}
              </p>
            ))
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-dimmer)' }}>لا شيء لمعاينته بعد.</p>
          )}
        </section>
      )}

      <MediaPicker
        picked={picked}
        onPick={m => { setPicked(m); setFailedAttempt(false); }}
        progress={progress}
        onCancel={cancelUpload}
        disabled={busy}
      />

      {error && (
        <p role="alert" data-testid="new-post-error" style={{
          margin: '16px 0 0', padding: '11px 14px', borderRadius: 'var(--radius-sm)',
          background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.32)',
          fontSize: 13, color: '#fca5a5', lineHeight: 1.85,
        }}>
          {error}
        </p>
      )}

      <p style={{ fontSize: 12, color: 'var(--text-dimmer)', margin: '16px 0 0', lineHeight: 1.85 }}>
        يُنشر باسمك ويظهر للجميع. لا يُقبل تنسيق HTML — ما تكتبه يظهر كما هو نصّاً.
      </p>

      <div style={{ display: 'flex', gap: 9, marginTop: 18 }}>
        <button type="submit" className="btn-primary" disabled={!canSubmit} data-testid="new-post-submit"
          style={{ opacity: canSubmit ? 1 : 0.55 }}>
          {busy ? (progress !== null ? 'جارٍ الرفع…' : 'جارٍ النشر…') : 'انشر'}
        </button>
        {failedAttempt && !busy && (
          <button type="button" className="btn-ghost" data-testid="new-post-retry" onClick={() => void publish()}>
            أعد المحاولة
          </button>
        )}
      </div>
    </form>
  );
};
