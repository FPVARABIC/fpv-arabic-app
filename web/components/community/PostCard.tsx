import Link from 'next/link';
import type { PostSummary } from '@/lib/server/community';
import { toParagraphs, formatRelativeArabic } from '@/lib/text';
import { CATEGORY_LABELS } from '@core/community/utils/categories';
import { PostMedia } from './PostMedia';

/**
 * One post in the feed.
 *
 * USER CONTENT IS RENDERED AS TEXT, ALWAYS
 * ----------------------------------------
 * `{line}` inside JSX is a text node: React escapes it, so a post containing
 * `<script>` or `<img onerror=…>` displays those characters instead of running
 * them. There is no `dangerouslySetInnerHTML` here and there must never be —
 * `scripts/testWebCommunity.ts` fails the build if one appears in any community
 * component.
 *
 * IT IS ALSO MARKED AS USER CONTENT, VISIBLY
 * ------------------------------------------
 * The requirement was explicit that a reader must never mistake a pilot's
 * opinion for reviewed platform knowledge. Encyclopedia pages carry sources and
 * review dates; this carries an author, a timestamp and a «من المجتمع» badge.
 * The distinction is structural, not a matter of tone.
 */

export const PostCard: React.FC<{ post: PostSummary; compact?: boolean }> = ({ post, compact }) => {
  const paragraphs = toParagraphs(post.text);
  const preview = compact ? paragraphs.slice(0, 2) : paragraphs;
  const truncated = compact && paragraphs.length > 2;

  return (
    <article
      className="card"
      data-testid={`post-card-${post.id}`}
      style={{ padding: '18px 20px' }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span
          aria-hidden
          style={{
            width: 32, height: 32, borderRadius: 999, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(56,224,224,0.25), rgba(0,180,255,0.18))',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 900, color: 'var(--accent-ink)',
          }}
        >
          {post.authorName.slice(0, 1)}
        </span>
        <span style={{ fontSize: 13.5, fontWeight: 800 }}>{post.authorName}</span>
        <span
          style={{
            fontSize: 10, fontWeight: 800, color: 'var(--text-dimmer)',
            border: '1px solid var(--border-soft)', borderRadius: 999, padding: '1px 9px',
          }}
        >
          من المجتمع
        </span>
        <span style={{ flex: 1 }} />
        <time
          dateTime={post.createdAt ?? undefined}
          style={{ fontSize: 11.5, color: 'var(--text-dimmer)' }}
        >
          {formatRelativeArabic(post.createdAt)}
        </time>
      </header>

      {post.category && CATEGORY_LABELS[post.category] && (
        <p style={{ margin: '10px 0 0' }}>
          <span
            style={{
              fontSize: 11, fontWeight: 800, color: 'var(--accent-ink)',
              background: 'rgba(56,224,224,0.10)', borderRadius: 999, padding: '3px 10px',
            }}
          >
            {CATEGORY_LABELS[post.category]}
          </span>
        </p>
      )}

      <div style={{ marginTop: 12 }}>
        {preview.map((block, bi) => (
          <p
            key={bi}
            style={{
              margin: bi === 0 ? 0 : '10px 0 0', fontSize: 14.5, lineHeight: 1.95,
              color: 'var(--text-dim)', overflowWrap: 'anywhere',
            }}
          >
            {block.map((line, li) => (
              <span key={li}>
                {line}
                {li < block.length - 1 && <br />}
              </span>
            ))}
          </p>
        ))}
        {truncated && (
          <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--text-dimmer)' }}>…</p>
        )}
      </div>

      {/*
        Feed variant: the thumbnail for an image, and for a video the captured
        poster frame with no <video> element mounted at all. Scrolling the feed
        never downloads a video file.
      */}
      <PostMedia
        mediaType={post.mediaType}
        // A VIDEO'S OWN URL IS WITHHELD FROM THE FEED ON PURPOSE.
        //
        // The feed paints the poster frame and never mounts a player, so it has
        // no use for the clip's URL — and passing it would still embed that URL
        // in the serialised props Next ships inside the feed's HTML. Nothing
        // would fetch it, but every feed page would carry a link to a 40MB file
        // for every video post on it. Withholding it keeps the payload honest
        // about what the page actually needs.
        mediaURL={post.mediaType === 'video' ? null : post.mediaURL}
        thumbnailURL={post.thumbnailURL}
        mediaWidth={post.mediaWidth}
        mediaHeight={post.mediaHeight}
        mediaDuration={post.mediaDuration}
        authorName={post.authorName}
        variant="feed"
      />

      <footer
        style={{
          display: 'flex', alignItems: 'center', gap: 14, marginTop: 14,
          paddingTop: 12, borderTop: '1px solid var(--border-soft)',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-dimmer)' }}>
          <span dir="ltr">{post.commentsCount}</span> تعليقاً
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-dimmer)' }}>
          <span dir="ltr">{post.likesCount}</span> إعجاباً
        </span>
        {post.editedAt && (
          <span style={{ fontSize: 11.5, color: 'var(--text-dimmer)' }}>عُدِّل</span>
        )}
        <span style={{ flex: 1 }} />
        <Link
          href={`/community/posts/${post.id}`}
          data-testid={`post-open-${post.id}`}
          style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent-ink)' }}
        >
          افتح المنشور ←
        </Link>
      </footer>
    </article>
  );
};
