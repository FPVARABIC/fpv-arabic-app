import Link from 'next/link';
import type { Metadata } from 'next';
import { listPosts } from '@/lib/server/community';
import { isAdminConfigured } from '@/lib/server/firebaseAdmin';
import { getSession } from '@/lib/server/session';
import { PostCard } from '@/components/community/PostCard';
import { AccountRail } from '@/components/AccountRail';
import { CATEGORY_LABELS, VISIBLE_CATEGORY_IDS } from '@core/community/utils/categories';

export const metadata: Metadata = {
  title: 'المجتمع',
  description:
    'أسئلة الطيارين ومشاريعهم وتجاربهم — محتوى يكتبه المستخدمون، منفصل عن الموسوعة '
    + 'المراجعة بمصادرها.',
  alternates: { canonical: '/community' },
};

// The feed changes constantly and differs for a signed-in user, so it is
// rendered per request rather than cached.
export const dynamic = 'force-dynamic';

/**
 * The community feed.
 *
 * PAGINATION THAT CANNOT DUPLICATE OR LOSE A POST
 * -----------------------------------------------
 * Pages are linked by a cursor carrying the last row's `(createdAt, id)`, not
 * by an offset. This is the difference between correct and almost-correct:
 * with an offset, a post created while someone is reading page one shifts every
 * later page by one, so they see a post twice and never see another. With a
 * cursor anchored to a value, new posts appear above the window and the window
 * itself does not move.
 *
 * The composite `(createdAt, __name__)` matters for the same reason — two posts
 * sharing a millisecond have no defined order under `createdAt` alone, and an
 * undefined order is where a cursor silently skips.
 *
 * `?cursor=` lives in the URL rather than in component state so a page of
 * results is shareable and survives a refresh, and so the whole thing works
 * without JavaScript.
 */
export default async function CommunityPage(
  { searchParams }: { searchParams: Promise<{ cursor?: string; category?: string }> },
) {
  const { cursor, category } = await searchParams;

  // Only a known category may reach the query. An arbitrary value would simply
  // return nothing, but validating keeps the URL space honest and the filter
  // chips truthful.
  const activeCategory = category && (VISIBLE_CATEGORY_IDS as readonly string[]).includes(category)
    ? category
    : null;

  const session = await getSession();
  const configured = isAdminConfigured();

  let error: string | null = null;
  let page = { posts: [] as Awaited<ReturnType<typeof listPosts>>['posts'], nextCursor: null as string | null };
  if (configured) {
    try {
      page = await listPosts({ cursor, category: activeCategory, limit: 12 });
    } catch (e) {
      console.error('[community] list failed', e);
      error = 'تعذّر تحميل المنشورات الآن.';
    }
  }

  const qs = (params: Record<string, string | null>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    const s = sp.toString();
    return s ? `/community?${s}` : '/community';
  };

  return (
    <div className="shell" style={{ paddingTop: 36, paddingBottom: 20 }}>
      {/* `with-rail` rather than a hardcoded two-column grid. The old inline
          `minmax(0,1fr) 260px` had no breakpoint, so at 390px the feed and the
          sidebar were squeezed side by side into a phone screen. The class
          stacks them below 1000px — and puts the rail UNDER the feed, because
          on a phone the posts are what the reader came for. */}
      <div className="with-rail">
        <div style={{ minWidth: 0 }}>
          <header style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>المجتمع</h1>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: '10px 0 0', lineHeight: 1.9 }}>
              نفس المجتمع الموجود في تطبيق الهاتف — الحسابات والمنشورات والتعليقات واحدة.
              ما تقرأه هنا يكتبه مستخدمون، لا فريق تحرير، فتعامل معه على هذا الأساس.
            </p>
          </header>

          {/* ── Category filter ─────────────────────────────────────────── */}
          <nav aria-label="تصفية حسب التصنيف" style={{ marginBottom: 18 }}>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              <li>
                <Link
                  href={qs({})}
                  data-testid="community-filter-all"
                  aria-current={!activeCategory ? 'page' : undefined}
                  className="card-sm"
                  style={{
                    display: 'inline-block', padding: '6px 14px', fontSize: 12.5,
                    color: !activeCategory ? 'var(--accent)' : 'var(--text-dim)',
                    borderColor: !activeCategory ? 'var(--border)' : undefined,
                  }}
                >
                  الكل
                </Link>
              </li>
              {VISIBLE_CATEGORY_IDS.map(c => (
                <li key={c}>
                  <Link
                    href={qs({ category: c })}
                    data-testid={`community-filter-${c}`}
                    aria-current={activeCategory === c ? 'page' : undefined}
                    className="card-sm"
                    style={{
                      display: 'inline-block', padding: '6px 14px', fontSize: 12.5,
                      color: activeCategory === c ? 'var(--accent)' : 'var(--text-dim)',
                      borderColor: activeCategory === c ? 'var(--border)' : undefined,
                    }}
                  >
                    {CATEGORY_LABELS[c]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* ── The three honest states ─────────────────────────────────── */}
          {!configured && (
            <div className="card" data-testid="community-unconfigured" style={{ padding: '18px 20px' }}>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--sev-warning)', lineHeight: 1.9 }}>
                المجتمع غير مهيّأ في هذه البيئة: لا توجد بيانات اعتماد خادم لقراءة Firestore.
                راجع <span className="ltr">web/.env.example</span>.
              </p>
            </div>
          )}

          {configured && error && (
            <div className="card" data-testid="community-error" style={{ padding: '18px 20px', borderColor: 'rgba(248,113,113,0.32)' }}>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--sev-blocker)', lineHeight: 1.9 }}>{error}</p>
              <p style={{ margin: '12px 0 0' }}>
                <Link href={qs({ category: activeCategory })} className="btn-ghost" data-testid="community-retry">
                  أعد المحاولة
                </Link>
              </p>
            </div>
          )}

          {configured && !error && page.posts.length === 0 && (
            <div className="card" data-testid="community-empty" style={{ padding: '22px 24px' }}>
              <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>لا منشورات هنا بعد</h2>
              <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: '10px 0 0', lineHeight: 1.9 }}>
                {activeCategory
                  ? 'لا يوجد منشور في هذا التصنيف حتى الآن. جرّب تصنيفاً آخر، أو اكتب أول منشور فيه.'
                  : 'كن أول من يكتب. سؤال واضح عن قطعة أو عطل يفيد كل من يقرأه بعدك.'}
              </p>
              {session && (
                <p style={{ margin: '14px 0 0' }}>
                  <Link href="/community/new" className="btn-primary">اكتب منشوراً</Link>
                </p>
              )}
            </div>
          )}

          {page.posts.length > 0 && (
            <div data-testid="community-feed" style={{ display: 'grid', gap: 14 }}>
              {page.posts.map(p => <PostCard key={p.id} post={p} compact />)}
            </div>
          )}

          {/* ── Cursor pagination ───────────────────────────────────────── */}
          {page.nextCursor && (
            <nav aria-label="صفحات المنشورات" style={{ marginTop: 22, textAlign: 'center' }}>
              <Link
                href={qs({ cursor: page.nextCursor, category: activeCategory })}
                className="btn-ghost"
                data-testid="community-next-page"
              >
                منشورات أقدم ←
              </Link>
            </nav>
          )}

          {cursor && (
            <p style={{ marginTop: 14, textAlign: 'center' }}>
              <Link
                href={qs({ category: activeCategory })}
                style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}
                data-testid="community-first-page"
              >
                → العودة إلى الأحدث
              </Link>
            </p>
          )}
        </div>

        {/* ── Sidebar: what the wide screen buys ─────────────────────────── */}
        <div style={{ display: 'grid', gap: 16 }} className="community-side">
          {/* The account panel, first. The shop's owner asked for exactly this:
              the reader's own identity and progress beside the feed, with the
              settings/contact/about/sign-out rows under it, so none of those
              has to be hunted for. It is the phone app's profile sheet, opened
              flat. */}
          <AccountRail
            signedIn={!!session}
            displayName={session?.displayName ?? null}
            photoURL={session?.photoURL ?? null}
            email={session?.email ?? null}
            role={session?.role ?? 'user'}
            signInNext="/community"
          />
          <section className="card" style={{ padding: '16px 18px' }}>
            <h2 style={{ fontSize: 14, fontWeight: 900, margin: '0 0 10px' }}>اكتب منشوراً</h2>
            {session ? (
              <>
                <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 12px', lineHeight: 1.85 }}>
                  سؤال محدد يصل إلى إجابة أسرع من سؤال عام.
                </p>
                <Link href="/community/new" className="btn-primary" data-testid="community-new-post">
                  منشور جديد
                </Link>
              </>
            ) : (
              <>
                <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 12px', lineHeight: 1.85 }}>
                  سجّل الدخول لتكتب وتعلّق. حسابك هو نفسه في تطبيق الهاتف.
                </p>
                <Link href="/signin?next=%2Fcommunity" className="btn-ghost" data-testid="community-signin">
                  تسجيل الدخول
                </Link>
              </>
            )}
          </section>

          <section className="card" style={{ padding: '16px 18px' }}>
            <h2 style={{ fontSize: 14, fontWeight: 900, margin: '0 0 10px' }}>
              الفرق بين المجتمع والموسوعة
            </h2>
            <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: 0, lineHeight: 1.9 }}>
              مقالات الموسوعة مراجَعة وتذكر مصادرها وتواريخها. منشورات المجتمع تجارب شخصية
              وآراء — مفيدة، لكنها ليست مرجعاً. عند التعارض، الموسوعة ودليل الشركة أولاً.
            </p>
            <p style={{ margin: '12px 0 0' }}>
              <Link href="/kb" style={{ fontSize: 12.5, color: 'var(--accent-ink)', fontWeight: 700 }}>
                افتح الموسوعة ←
              </Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
