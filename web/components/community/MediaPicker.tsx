'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ALLOWED_IMAGE_MIME_TYPES, ALLOWED_VIDEO_MIME_TYPES,
  isAllowedImageMimeType, isAllowedVideoMimeType,
  decodeVideo,
  MAX_RAW_INPUT_BYTES, MAX_VIDEO_SIZE_BYTES, MAX_VIDEO_DURATION_SECONDS,
} from '@/lib/mediaUpload';

/**
 * Choosing one image or one video, and seeing what you chose before it goes
 * anywhere.
 *
 * ONE FILE, NOT MANY
 * ------------------
 * `firestore.rules` models a post's media as a single `mediaURL` /
 * `thumbnailURL` / `mediaPath` triple, and the phone app's composer, the feed
 * card, the post page and `cleanupPostMedia` all assume exactly one. Offering a
 * multi-select here would produce a picker whose extra selections could never
 * be stored — a control that lies about what the product does. One file is what
 * the schema supports, so one file is what is offered.
 *
 * VALIDATION HAPPENS BEFORE ANY BYTE IS SENT
 * ------------------------------------------
 * Type, size and — for video — real decoded duration are all checked here, so
 * the common refusals produce an immediate, specific Arabic message instead of
 * a permission error minutes into an upload. None of this is the security
 * control: `storage.rules` refuses a bad type or an oversized file outright,
 * and the emulator suite proves it. This is the part that makes the product
 * usable; that is the part that makes it safe.
 *
 * THE PREVIEW IS A LOCAL OBJECT URL
 * ---------------------------------
 * Created from the picked File and revoked when it changes or the component
 * unmounts. Nothing is uploaded to show a preview — a person who picks the
 * wrong photo and removes it has cost the platform no storage at all.
 */

export interface PickedMedia {
  file: File;
  kind: 'image' | 'video';
  previewUrl: string;
  /** Real decoded duration, for video only. Shown so the 60s limit is visible. */
  durationSeconds?: number;
}

const MB = 1024 * 1024;
const ACCEPT = [...ALLOWED_IMAGE_MIME_TYPES, ...ALLOWED_VIDEO_MIME_TYPES].join(',');

export const MediaPicker: React.FC<{
  picked: PickedMedia | null;
  onPick: (media: PickedMedia | null) => void;
  /** Progress 0-100 while uploading, or null when idle. */
  progress: number | null;
  onCancel?: () => void;
  disabled?: boolean;
}> = ({ picked, onPick, progress, onCancel, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // Revoke the previous object URL whenever the selection changes, and on
  // unmount. Without this every re-pick leaks a blob for the life of the tab.
  useEffect(() => {
    const url = picked?.previewUrl;
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [picked?.previewUrl]);

  async function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return;

    if (isAllowedImageMimeType(file.type)) {
      if (file.size > MAX_RAW_INPUT_BYTES) {
        setError(`الصورة أكبر من ${Math.round(MAX_RAW_INPUT_BYTES / MB)} ميغابايت.`);
        return;
      }
      onPick({ file, kind: 'image', previewUrl: URL.createObjectURL(file) });
      return;
    }

    if (isAllowedVideoMimeType(file.type)) {
      if (file.size > MAX_VIDEO_SIZE_BYTES) {
        setError(`الفيديو أكبر من ${Math.round(MAX_VIDEO_SIZE_BYTES / MB)} ميغابايت.`);
        return;
      }
      // Decode BEFORE accepting it. A file the browser cannot play must be
      // rejected here, while the person can still pick another one — not after
      // a long upload, and never in a way that leaves an unplayable video in
      // the feed for everyone else.
      setChecking(true);
      const decoded = await decodeVideo(file).finally(() => setChecking(false));
      if (!decoded) {
        setError('تعذّر قراءة هذا الفيديو. جرّب ملف MP4 أو WebM.');
        return;
      }
      if (decoded.durationSeconds > MAX_VIDEO_DURATION_SECONDS) {
        setError(`الفيديو ${Math.round(decoded.durationSeconds)} ثانية، والحد ${MAX_VIDEO_DURATION_SECONDS} ثانية.`);
        return;
      }
      onPick({
        file, kind: 'video',
        previewUrl: URL.createObjectURL(file),
        durationSeconds: decoded.durationSeconds,
      });
      return;
    }

    setError('نوع الملف غير مدعوم. الصور: JPEG أو PNG أو WebP. الفيديو: MP4 أو WebM.');
  }

  function clear() {
    onPick(null);
    setError(null);
    // Reset the input, or picking the SAME file again fires no change event.
    if (inputRef.current) inputRef.current.value = '';
  }

  const uploading = progress !== null;

  return (
    <div style={{ marginTop: 18 }}>
      <label htmlFor="post-media" style={{ display: 'block', fontSize: 13, fontWeight: 800, marginBottom: 7 }}>
        صورة أو فيديو (اختياري)
      </label>
      <input
        ref={inputRef}
        id="post-media"
        data-testid="media-input"
        type="file"
        accept={ACCEPT}
        disabled={disabled || uploading || checking}
        onChange={e => handleFile(e.target.files?.[0])}
        style={{
          width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)',
          border: '1px dashed var(--border)', background: 'var(--surface-2)',
          color: 'var(--text-dim)', fontSize: 13, fontFamily: 'inherit',
        }}
      />
      <p id="media-limits" style={{ fontSize: 11.5, color: 'var(--text-dimmer)', margin: '7px 0 0', lineHeight: 1.85 }}>
        صورة حتى <span dir="ltr">{Math.round(MAX_RAW_INPUT_BYTES / MB)}MB</span> (تُضغط قبل الرفع)، أو فيديو{' '}
        <span dir="ltr">MP4/WebM</span> حتى <span dir="ltr">{Math.round(MAX_VIDEO_SIZE_BYTES / MB)}MB</span> و
        <span dir="ltr">{MAX_VIDEO_DURATION_SECONDS}</span> ثانية.
      </p>

      {checking && (
        <p role="status" data-testid="media-checking" style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '10px 0 0' }}>
          جارٍ فحص الفيديو…
        </p>
      )}

      {error && (
        <p role="alert" data-testid="media-error" style={{
          margin: '10px 0 0', padding: '10px 13px', borderRadius: 'var(--radius-sm)',
          background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.32)',
          fontSize: 13, color: '#fca5a5', lineHeight: 1.85,
        }}>
          {error}
        </p>
      )}

      {picked && (
        <figure data-testid="media-preview" style={{ margin: '14px 0 0' }}>
          {picked.kind === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={picked.previewUrl}
              alt="معاينة الصورة المختارة قبل النشر"
              data-testid="media-preview-image"
              style={{
                display: 'block', maxWidth: '100%', maxHeight: 320, height: 'auto',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-soft)',
              }}
            />
          ) : (
            <video
              src={picked.previewUrl}
              data-testid="media-preview-video"
              controls
              // No autoplay and metadata-only preload: a preview must never
              // start making noise, and must never pull the whole file down
              // just to exist.
              preload="metadata"
              playsInline
              style={{
                display: 'block', maxWidth: '100%', maxHeight: 320,
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-soft)',
              }}
            />
          )}
          <figcaption style={{ fontSize: 11.5, color: 'var(--text-dimmer)', marginTop: 7 }}>
            <span dir="ltr">{(picked.file.size / MB).toFixed(1)}MB</span>
            {picked.durationSeconds != null && <> · <span dir="ltr">{Math.round(picked.durationSeconds)}s</span></>}
            {picked.kind === 'image' && ' · تُضغط قبل الرفع'}
          </figcaption>
        </figure>
      )}

      {/*
        Progress is announced, not merely drawn. `aria-live="polite"` on the
        text and a real <progress> element mean a screen-reader user learns the
        upload is running and when it finishes — a bare animated bar tells them
        nothing at all.
      */}
      {uploading && (
        <div style={{ marginTop: 12 }} data-testid="media-progress">
          <progress
            value={progress}
            max={100}
            aria-label="تقدّم رفع الملف"
            style={{ width: '100%', height: 8 }}
          />
          <p aria-live="polite" style={{ fontSize: 12, color: 'var(--text-dim)', margin: '6px 0 0' }}>
            جارٍ الرفع… <span dir="ltr">{progress}%</span>
          </p>
        </div>
      )}

      {(picked || uploading) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {uploading && onCancel && (
            <button type="button" className="btn-ghost" data-testid="media-cancel" onClick={onCancel}>
              ألغِ الرفع
            </button>
          )}
          {!uploading && picked && (
            <button type="button" className="btn-ghost" data-testid="media-remove" onClick={clear} disabled={disabled}>
              أزل الملف
            </button>
          )}
        </div>
      )}
    </div>
  );
};
