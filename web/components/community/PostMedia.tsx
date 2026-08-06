'use client';

import { useState } from 'react';

/**
 * A post's image or video, wherever it appears.
 *
 * ONE COMPONENT FOR THE FEED AND THE POST PAGE
 * --------------------------------------------
 * The two surfaces differ only in which asset they should fetch, and that is a
 * prop (`variant`), not a second component. Duplicating this would mean two
 * places to get lazy-loading, aspect ratio, alt text and the video poster
 * behaviour right — and one of them would eventually be wrong.
 *
 * A FEED ROW NEVER DOWNLOADS A VIDEO
 * ----------------------------------
 * This is the single most important thing in this file. A video post in the
 * feed renders the captured poster frame as an ordinary `<img>` — the same
 * ~40KB JPEG an image post shows — and no `<video>` element exists at all until
 * the reader presses play. Scrolling past twenty video posts therefore costs
 * twenty thumbnails, not twenty video files. The `<video>` element is only
 * mounted on the post page, and even there it never autoplays and preloads
 * metadata only.
 *
 * THE ASPECT RATIO COMES FROM THE STORED DIMENSIONS
 * -------------------------------------------------
 * `aspectRatio` reserves exactly the right box before the asset loads, so the
 * text below it does not jump when the image arrives. Posts written before
 * dimensions were recorded have none, and fall back to `height: auto` — they
 * simply do not get the reservation, rather than getting a wrong one.
 */

export interface PostMediaProps {
  mediaType: 'none' | 'image' | 'video';
  mediaURL: string | null;
  thumbnailURL: string | null;
  mediaWidth: number | null;
  mediaHeight: number | null;
  mediaDuration: number | null;
  authorName: string;
  /** `feed` fetches the thumbnail and never mounts a player. */
  variant: 'feed' | 'detail';
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Only ever hand an http(s) URL to `src`.
 *
 * The database requires `media_url` to be a string but cannot check that it
 * is a Storage download URL — Rules has no URL type, and pinning a hostname
 * would break every non-production environment including the emulator this is
 * tested against. So the render layer refuses anything that is not plain http
 * or https.
 *
 * A `javascript:` URL in an `<img src>` does not execute in any current
 * browser, so this is defence in depth rather than a live hole being closed.
 * It matters because `src` values flow into `<video>` too, because browsers
 * change, and because the cost is one check at the only place a stored URL ever
 * becomes a request.
 */
function isRenderableUrl(url: string | null): url is string {
  if (!url) return false;
  // Control characters are how a scheme gets smuggled past a naive prefix test
  // ("java\tscript:"), so they are rejected before parsing.
  if (/[\u0000-\u001f\u007f]/.test(url)) return false;
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

export const PostMedia: React.FC<PostMediaProps> = ({
  mediaType, mediaURL, thumbnailURL, mediaWidth, mediaHeight, mediaDuration, authorName, variant,
}) => {
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  if (mediaType === 'none') return null;

  const poster = isRenderableUrl(thumbnailURL) ? thumbnailURL : null;
  const full = isRenderableUrl(mediaURL) ? mediaURL : null;

  // The feed only ever paints a poster, so a poster alone is enough for it to
  // render — which is what lets PostCard withhold a video's own URL entirely
  // (see the comment there). The detail view needs the real asset.
  if (variant === 'feed' ? !(poster ?? full) : !full) return null;

  const ratio = mediaWidth && mediaHeight ? `${mediaWidth} / ${mediaHeight}` : undefined;
  const frame: React.CSSProperties = {
    marginTop: 14,
    maxWidth: '100%',
    // A tall portrait clip must not push everything else off the screen.
    maxHeight: variant === 'feed' ? 420 : 620,
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-soft)',
    display: 'block',
    background: 'var(--surface-2)',
  };

  // A broken URL — a deleted file, an expired token — must degrade to a
  // readable explanation, never to a torn image icon in the middle of a post.
  if (failed) {
    return (
      <p data-testid="post-media-unavailable" style={{
        marginTop: 14, padding: '12px 14px', borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-soft)', background: 'var(--surface-2)',
        fontSize: 12.5, color: 'var(--text-dimmer)', lineHeight: 1.85,
      }}>
        تعذّر عرض الملف المرفق بهذا المنشور.
      </p>
    );
  }

  if (mediaType === 'image') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        // The feed asks for the thumbnail; only the post page fetches the full
        // image. Falling back to mediaURL keeps posts written before
        // thumbnails existed rendering rather than vanishing.
        src={(variant === 'feed' ? (poster ?? full) : full) ?? ''}
        alt={`صورة في منشور ${authorName}`}
        loading="lazy"
        decoding="async"
        data-testid="post-media-image"
        width={mediaWidth ?? undefined}
        height={mediaHeight ?? undefined}
        onError={() => setFailed(true)}
        style={{ ...frame, height: 'auto', aspectRatio: ratio, objectFit: 'contain' }}
      />
    );
  }

  // ── Video ────────────────────────────────────────────────────────────────
  const durationLabel = mediaDuration ? formatDuration(mediaDuration) : null;

  if (variant === 'feed' || !playing) {
    return (
      <div style={{ position: 'relative', marginTop: 14 }} data-testid="post-media-video-poster">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={poster ?? ''}
          alt={`لقطة من فيديو في منشور ${authorName}`}
          loading="lazy"
          decoding="async"
          width={mediaWidth ?? undefined}
          height={mediaHeight ?? undefined}
          onError={() => setFailed(true)}
          style={{ ...frame, marginTop: 0, height: 'auto', aspectRatio: ratio, objectFit: 'contain', width: '100%' }}
        />
        {/*
          On the post page this is a real button that mounts the player. In the
          feed it is a non-interactive badge — the whole card is already a link
          to the post, and a nested control inside a link is both a keyboard
          trap and ambiguous to a screen reader.
        */}
        {variant === 'detail' ? (
          <button
            type="button"
            data-testid="post-media-play"
            onClick={() => setPlaying(true)}
            aria-label={durationLabel ? `شغّل الفيديو، المدة ${durationLabel}` : 'شغّل الفيديو'}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(2,8,15,0.35)', border: 'none', cursor: 'pointer',
              borderRadius: 'var(--radius-sm)', fontFamily: 'inherit',
            }}
          >
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(2,8,15,0.82)', border: '1px solid var(--border)',
              color: 'var(--accent-ink)', borderRadius: 999, padding: '10px 18px',
              fontSize: 13.5, fontWeight: 800,
            }}>
              ▶ شغّل الفيديو
              {durationLabel && <span dir="ltr" style={{ color: 'var(--text-dimmer)' }}>{durationLabel}</span>}
            </span>
          </button>
        ) : (
          <span
            aria-hidden
            style={{
              position: 'absolute', insetInlineStart: 10, insetBlockEnd: 10,
              background: 'rgba(2,8,15,0.82)', border: '1px solid var(--border-soft)',
              color: 'var(--text)', borderRadius: 999, padding: '4px 11px',
              fontSize: 11.5, fontWeight: 800, display: 'inline-flex', gap: 6, alignItems: 'center',
            }}
          >
            ▶ فيديو
            {durationLabel && <span dir="ltr" style={{ color: 'var(--text-dimmer)' }}>{durationLabel}</span>}
          </span>
        )}
        {/* The same information in text, for anyone the badge never reaches. */}
        <span className="sr-only">
          هذا المنشور يحتوي على فيديو{durationLabel ? ` مدته ${durationLabel}` : ''}.
        </span>
      </div>
    );
  }

  return (
    <video
      src={full ?? ''}
      poster={poster ?? undefined}
      controls
      // Deliberately NOT autoplay. A video that starts by itself costs the
      // reader bandwidth they did not agree to spend, and on a phone that is
      // real money. `preload="metadata"` fetches only enough to show the
      // timeline — the body of the file arrives when they press play.
      preload="metadata"
      playsInline
      data-testid="post-media-video"
      onError={() => setFailed(true)}
      style={{ ...frame, width: '100%', height: 'auto', aspectRatio: ratio }}
    >
      عذراً، متصفحك لا يدعم تشغيل هذا الفيديو.
    </video>
  );
};
