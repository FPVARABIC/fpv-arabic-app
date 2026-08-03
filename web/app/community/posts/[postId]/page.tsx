import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPost, listComments } from '@/lib/server/community';
import { getSession } from '@/lib/server/session';
import { toParagraphs, formatArabicDate, formatRelativeArabic } from '@/lib/text';
import { PostActions } from '@/components/community/PostActions';
import { CommentForm } from '@/components/community/CommentForm';
import { CATEGORY_LABELS } from '@core/community/utils/categories';

export const dynamic = 'force-dynamic';

/**
 * One community post, with its comments.
 *
 * A REMOVED POST AND A MISSING POST LOOK THE SAME
 * -----------------------------------------------
 * `getPost` returns null for hidden and soft-deleted posts as well as absent
 * ones, and all three render a real 404. That is deliberate: telling someone
 * who saved a link that a SPECIFIC post was moderated is information about
 * another person's account that is not theirs to have.
 *
 * OWNERSHIP IS COMPUTED FROM THE VERIFIED SESSION
 * -----------------------------------------------
 * `isOwner` compares the post's `authorId` to the uid inside the server-verified
 * session cookie — not to anything the browser claimed. It only decides whether
 * to RENDER the owner controls; `firestore.rules` is what refuses the write.
 */

export async function generateMetadata(
  { params }: { params: Promise<{ postId: string }> },
): Promise<Metadata> {
  const { postId } = await params;
  const post = await getPost(postId);
  if (!post) return { title: 'منشور غير موجود', robots: { index: false, follow: false } };

  const snippet = post.text.replace(/\s+/g, ' ').slice(0, 155);
  return {
    title: `${post.authorName} في المجتمع`,
    description: snippet || 'منشور في مجتمع FPV بالعربي',
    alternates: { canonical: `/community/posts/${post.id}` },
    openGraph: {
      type: 'article',
      title: `${post.authorName} — مجتمع FPV بالعربي`,
      description: snippet,
    },
    // Community posts are indexable, but they are user content: a search engine
    // should not treat them as the platform's own vetted knowledge, and the page
    // says so visibly.
    robots: { index: true, follow: true },
  };
}

export default async function PostPage(
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;
  const post = await getPost(postId);
  if (!post) notFound();

  const [{ comments, nextCursor }, session] = await Promise.all([
    listComments(post.id, { limit: 30 }),
    getSession(),
  ]);

  const isOwner = !!session && session.uid === post.authorId;
  const canWrite = !!session && session.status !== 'banned';
  const paragraphs = toParagraphs(post.text);

  return (
    <div className="shell" style={{ paddingTop: 32, paddingBottom: 30, maxWidth: 820 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span>{' '}
        <Link href="/community">المجتمع</Link> <span aria-hidden>/</span> منشور
      </nav>

      <article className="card" style={{ padding: '22px 24px', marginTop: 16 }}>
        {/*
          A community post has no title — it is a piece of writing, not an
          article. But a page with no h1 leaves a screen-reader user with no
          statement of what they have landed on, and leaves a search engine
          guessing. So the h1 is visually hidden and names the thing in words
          the platform chose, rather than imposing a heading on the user's text
          or promoting a fragment of it to a title it was never written as.
        */}
        <h1 className="sr-only">
          منشور من {post.authorName} في مجتمع FPV بالعربي
        </h1>
        <header style={{ display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap' }}>
          <span
            aria-hidden
            style={{
              width: 38, height: 38, borderRadius: 999, flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(56,224,224,0.25), rgba(0,180,255,0.18))',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 900, color: 'var(--accent)',
            }}
          >
            {post.authorName.slice(0, 1)}
          </span>
          <span>
            <span style={{ display: 'block', fontSize: 14.5, fontWeight: 800 }}>{post.authorName}</span>
            <time dateTime={post.createdAt ?? undefined} style={{ fontSize: 11.5, color: 'var(--text-dimmer)' }}>
              {formatArabicDate(post.createdAt)}
              {post.editedAt && <> · عُدِّل {formatRelativeArabic(post.editedAt)}</>}
            </time>
          </span>
          <span style={{ flex: 1 }} />
          <span
            style={{
              fontSize: 10.5, fontWeight: 800, color: 'var(--text-dimmer)',
              border: '1px solid var(--border-soft)', borderRadius: 999, padding: '2px 10px',
            }}
          >
            محتوى مستخدم
          </span>
        </header>

        {post.category && CATEGORY_LABELS[post.category] && (
          <p style={{ margin: '14px 0 0' }}>
            <span style={{
              fontSize: 11.5, fontWeight: 800, color: 'var(--accent)',
              background: 'rgba(56,224,224,0.10)', borderRadius: 999, padding: '3px 11px',
            }}>
              {CATEGORY_LABELS[post.category]}
            </span>
          </p>
        )}

        {/* User text as TEXT NODES — never HTML. */}
        <div data-testid="post-body" style={{ marginTop: 16 }}>
          {paragraphs.map((block, bi) => (
            <p key={bi} style={{
              margin: bi === 0 ? 0 : '12px 0 0', fontSize: 15.5, lineHeight: 2.05,
              color: 'var(--text-dim)', overflowWrap: 'anywhere',
            }}>
              {block.map((line, li) => (
                <span key={li}>{line}{li < block.length - 1 && <br />}</span>
              ))}
            </p>
          ))}
        </div>

        {post.mediaType === 'image' && post.mediaURL && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.mediaURL}
            alt={`صورة في منشور ${post.authorName}`}
            loading="lazy"
            width={post.mediaWidth ?? undefined}
            height={post.mediaHeight ?? undefined}
            style={{
              marginTop: 18, maxWidth: '100%', height: 'auto',
              borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-soft)', display: 'block',
            }}
          />
        )}

        <footer style={{ display: 'flex', gap: 16, marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border-soft)' }}>
          <span style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
            <span dir="ltr">{post.commentsCount}</span> تعليقاً
          </span>
          <span style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
            <span dir="ltr">{post.likesCount}</span> إعجاباً
          </span>
        </footer>

        <PostActions
          postId={post.id}
          initialText={post.text}
          isOwner={isOwner}
          isSignedIn={canWrite}
        />
      </article>

      {/* ── Comments ──────────────────────────────────────────────────────── */}
      <section aria-labelledby="comments-h" style={{ marginTop: 30 }}>
        <h2 id="comments-h" style={{ fontSize: 19, fontWeight: 900, margin: '0 0 14px' }}>
          التعليقات <span dir="ltr" style={{ color: 'var(--text-dimmer)', fontWeight: 700 }}>({post.commentsCount})</span>
        </h2>

        {comments.length === 0 ? (
          <p data-testid="comments-empty" className="card-sm" style={{ padding: '16px 18px', margin: 0, fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.9 }}>
            لا تعليقات بعد. إن كانت لديك تجربة مع هذا الموضوع فشاركها.
          </p>
        ) : (
          <ol data-testid="comment-list" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 11 }}>
            {comments.map(c => (
              <li key={c.id} className="card-sm" data-testid={`comment-${c.id}`} style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{c.authorName}</span>
                  <time dateTime={c.createdAt ?? undefined} style={{ fontSize: 11, color: 'var(--text-dimmer)' }}>
                    {formatRelativeArabic(c.createdAt)}
                  </time>
                </div>
                <div style={{ marginTop: 8 }}>
                  {toParagraphs(c.text).map((block, bi) => (
                    <p key={bi} style={{
                      margin: bi === 0 ? 0 : '8px 0 0', fontSize: 14, lineHeight: 1.9,
                      color: 'var(--text-dim)', overflowWrap: 'anywhere',
                    }}>
                      {block.map((line, li) => (
                        <span key={li}>{line}{li < block.length - 1 && <br />}</span>
                      ))}
                    </p>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        )}

        {nextCursor && (
          <p style={{ marginTop: 14 }}>
            <Link
              href={`/community/posts/${post.id}?ccursor=${encodeURIComponent(nextCursor)}`}
              className="btn-ghost"
              data-testid="comments-next"
            >
              تعليقات أقدم ←
            </Link>
          </p>
        )}

        {canWrite ? (
          <CommentForm postId={post.id} />
        ) : (
          <p className="card-sm" style={{ padding: '14px 16px', marginTop: 16, fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.9 }}>
            {session
              ? 'حسابك موقوف، فلا يمكنك التعليق.'
              : <>سجّل الدخول للتعليق. <Link href={`/signin?next=${encodeURIComponent(`/community/posts/${post.id}`)}`} style={{ color: 'var(--accent)' }}>تسجيل الدخول ←</Link></>}
          </p>
        )}
      </section>

      <p style={{ marginTop: 28 }}>
        <Link href="/community" className="btn-ghost">← كل المنشورات</Link>
      </p>
    </div>
  );
}
