import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { doc, getDoc, getCountFromServer, collection, query, where } from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { userPath, POSTS_COLLECTION } from '../utils/firestorePaths';
import { useAuthContext } from '../../../contexts/AuthContext';
import { useFollow } from '../hooks/useFollow';
import { usePublicProfilePosts } from '../hooks/usePublicProfilePosts';
import type { CommunityBootstrapState } from '../hooks/useEnsureCommunityUser';
import { PostCard } from '../Feed/PostCard';
import type { CommunityUser } from '../types';
import { Avatar } from '../Avatar';

interface PublicProfileProps {
  uid: string;
  onBack: () => void;
  onOpenPost: (postId: string) => void;
  onOpenAuthor: (authorId: string) => void;
  bootstrapState: CommunityBootstrapState;
  onRetryBootstrap: () => void;
}

// Photo, name, join date, live follower/following counts (authenticated
// users only — Option B), follow/unfollow, and a paginated list of this
// user's own active posts (Phase 5). Still no saved posts, no activity
// feed, no other social surface, and no followers/following list screens —
// those remain out of scope (D2 / Phase 5 scope decision).
export const PublicProfile: React.FC<PublicProfileProps> = ({
  uid, onBack, onOpenPost, onOpenAuthor, bootstrapState, onRetryBootstrap,
}) => {
  const { currentUser, isGuest } = useAuthContext();
  const [user, setUser] = useState<CommunityUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profileRetryTick, setProfileRetryTick] = useState(0);
  const [activePostsCount, setActivePostsCount] = useState<number | null>(null);
  const [activePostsCountError, setActivePostsCountError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOwnProfile = !!currentUser && currentUser.uid === uid;
  const follow = useFollow(uid, bootstrapState);
  const profilePosts = usePublicProfilePosts(uid);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // True infinite scroll, matching FeedList.tsx's proven pattern. The
  // sentinel is only rendered (see JSX below) — and the observer callback
  // independently re-checks — while posts.length > 0 && hasMore && !loading
  // && !error && !loadMoreError. Both guards are required: rendering alone
  // would still leave a already-attached observer's callback able to fire
  // with a stale closure between a state change and the effect's cleanup;
  // checking only in the callback would still momentarily mount an
  // observer whose very first (attach-time) intersection callback could
  // fire before the next render's guard takes effect. Together they
  // guarantee that an initial-page failure (posts.length === 0, error set)
  // can never trigger an automatic load-more, and that a load-more failure
  // (loadMoreError set) always stops automatic retries dead, leaving the
  // explicit "إعادة المحاولة" button as the sole way to try again.
  const canAutoLoadMore =
    profilePosts.posts.length > 0 &&
    profilePosts.hasMore &&
    !profilePosts.loading &&
    !profilePosts.error &&
    !profilePosts.loadMoreError;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !canAutoLoadMore) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && canAutoLoadMore) profilePosts.loadMore();
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [canAutoLoadMore, profilePosts.loadMore]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setLoadError(null);
    (async () => {
      try {
        const snap = await getDoc(doc(firestoreDb, userPath(uid)));
        if (cancelled) return;
        if (snap.exists()) {
          setUser(snap.data() as CommunityUser);
        } else {
          setUser(null);
          setNotFound(true);
        }
      } catch (err) {
        if (cancelled) return;
        setUser(null);
        setLoadError('تعذّر تحميل الملف الشخصي. حاول مرة أخرى.');
        console.error('[PublicProfile:load]', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, profileRetryTick]);

  // Active-post count is a live aggregation, not the existing user.postsCount
  // field — that field is never decremented on soft-delete (D10), so it is
  // not an accurate count of currently active posts (Phase 5 finding). This
  // count is public — public posts are already public regardless of viewer.
  useEffect(() => {
    let cancelled = false;
    setActivePostsCount(null);
    setActivePostsCountError(null);
    (async () => {
      try {
        const snap = await getCountFromServer(
          query(
            collection(firestoreDb, POSTS_COLLECTION),
            where('authorId', '==', uid),
            where('status', '==', 'active'),
          ),
        );
        if (cancelled) return;
        setActivePostsCount(snap.data().count);
      } catch (err) {
        if (cancelled) return;
        setActivePostsCountError('—');
        console.error('[PublicProfile:activePostsCount]', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // Clear any pending toast timer on unmount so it can never fire into a
  // dead component, and clear/replace any previous timer before starting a
  // new one so rapid repeated taps can't accumulate multiple timers.
  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const showToast = (message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  };

  const handleFollowTap = () => {
    if (isGuest) {
      showToast('يجب تسجيل الدخول للمتابعة');
      return;
    }
    if (follow.status === 'following') {
      follow.unfollow();
    } else if (follow.status === 'not-following') {
      follow.follow();
    }
  };

  // Posts shown here are always authored by `uid` — tapping the author on
  // one of them would just reopen the profile already being viewed, so this
  // no-ops instead of pushing a redundant duplicate profile screen.
  const handleOpenAuthorFromPost = (authorId: string) => {
    if (authorId === uid) return;
    onOpenAuthor(authorId);
  };

  const followButtonLabel = (): string => {
    if (bootstrapState === 'bootstrapping') return 'جارٍ تجهيز الحساب...';
    if (follow.mutating) return 'جاري التنفيذ...';
    if (follow.status === 'following') return 'تتم المتابعة';
    return 'متابعة';
  };

  const followButtonDisabled =
    follow.mutating || follow.status === 'loading' || bootstrapState === 'bootstrapping' || bootstrapState === 'error';

  return (
    <div style={{ minHeight: '100%', background: '#f7f9fb' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
        borderBottom: '0.5px solid #e5eaf0', background: '#ffffff',
      }}>
        <button onClick={onBack} aria-label="رجوع" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a2b3c', display: 'flex' }}>
          <ArrowRight size={20} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#1a2b3c' }}>الملف الشخصي</span>
      </div>

      {loading && <p style={{ padding: 24, textAlign: 'center', color: '#94a3b3', fontSize: 13 }}>جارٍ التحميل...</p>}
      {!loading && notFound && (
        <p style={{ padding: 24, textAlign: 'center', color: '#94a3b3', fontSize: 13 }}>هذا المستخدم غير موجود.</p>
      )}
      {!loading && loadError && (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ color: '#dc2626', fontSize: 13, margin: '0 0 10px' }}>{loadError}</p>
          <button
            onClick={() => setProfileRetryTick(t => t + 1)}
            style={{ background: 'none', border: '0.5px solid #e5eaf0', borderRadius: 999, padding: '6px 18px', fontSize: 13, color: '#0e7c86', cursor: 'pointer' }}
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {!loading && user && (
        <>
          <div style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Avatar photoURL={user.photoURL} name={user.displayName} size={76} />
            </div>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#1a2b3c', marginTop: 12 }}>{user.displayName}</p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 16 }}>
              <div>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#0e7c86', margin: 0 }} dir="ltr">
                  {activePostsCountError ? '—' : (activePostsCount === null ? '···' : activePostsCount)}
                </p>
                <p style={{ fontSize: 12, color: '#5a6b7c', margin: '2px 0 0' }}>منشور</p>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1a2b3c', margin: 0 }} dir="ltr">{formatJoinDate(user.joinedAt)}</p>
                <p style={{ fontSize: 12, color: '#94a3b3', margin: '2px 0 0' }}>تاريخ الانضمام</p>
              </div>
            </div>

            {/* Option B (approved): follower/following counts are
                authenticated-only. Guests never see this row at all — not
                a loading state, not a fake zero — since useFollow never
                even queries these counts for a guest viewer. */}
            {!isGuest && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 12 }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#1a2b3c', margin: 0 }} dir="ltr">
                    {follow.countsError ? '—' : (follow.followersCount === null ? '···' : follow.followersCount)}
                  </p>
                  <p style={{ fontSize: 12, color: '#94a3b3', margin: '2px 0 0' }}>متابعون</p>
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#1a2b3c', margin: 0 }} dir="ltr">
                    {follow.countsError ? '—' : (follow.followingCount === null ? '···' : follow.followingCount)}
                  </p>
                  <p style={{ fontSize: 12, color: '#94a3b3', margin: '2px 0 0' }}>يتابع</p>
                </div>
              </div>
            )}

            {!isOwnProfile && (
              <div style={{ marginTop: 16 }}>
                <button
                  onClick={handleFollowTap}
                  disabled={followButtonDisabled}
                  style={{
                    background: follow.status === 'following' ? '#ffffff' : '#0e7c86',
                    color: follow.status === 'following' ? '#0e7c86' : '#ffffff',
                    border: follow.status === 'following' ? '1px solid #0e7c86' : 'none',
                    borderRadius: 999,
                    padding: '8px 28px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: followButtonDisabled ? 'default' : 'pointer',
                    opacity: followButtonDisabled ? 0.7 : 1,
                  }}
                >
                  {followButtonLabel()}
                </button>
                {!isGuest && bootstrapState === 'error' && (
                  <div style={{ marginTop: 6 }}>
                    <p style={{ color: '#dc2626', fontSize: 12, margin: '0 0 6px' }}>تعذّر تجهيز الحساب.</p>
                    <button
                      onClick={onRetryBootstrap}
                      style={{ background: 'none', border: '0.5px solid #e5eaf0', borderRadius: 999, padding: '4px 14px', fontSize: 12, color: '#0e7c86', cursor: 'pointer' }}
                    >
                      إعادة المحاولة
                    </button>
                  </div>
                )}
                {follow.mutationError && (
                  <p style={{ color: '#dc2626', fontSize: 12, marginTop: 6 }}>{follow.mutationError}</p>
                )}
                {!isGuest && follow.statusError && (
                  <p style={{ color: '#dc2626', fontSize: 12, marginTop: 6 }}>{follow.statusError}</p>
                )}
                {toast && (
                  <p style={{ color: '#5a6b7c', fontSize: 12, marginTop: 6 }}>{toast}</p>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 16px 24px' }}>
            {profilePosts.error && profilePosts.posts.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center' }}>
                <p style={{ color: '#dc2626', fontSize: 13, margin: '0 0 10px' }}>{profilePosts.error}</p>
                <button
                  onClick={profilePosts.refresh}
                  style={{ background: 'none', border: '0.5px solid #e5eaf0', borderRadius: 999, padding: '6px 18px', fontSize: 13, color: '#0e7c86', cursor: 'pointer' }}
                >
                  إعادة المحاولة
                </button>
              </div>
            )}
            {!profilePosts.loading && !profilePosts.error && profilePosts.posts.length === 0 && (
              <p style={{ padding: 32, textAlign: 'center', color: '#94a3b3', fontSize: 13 }}>
                لا توجد منشورات لهذا المستخدم بعد.
              </p>
            )}
            {profilePosts.posts.map(post => (
              <PostCard key={post.id} post={post} onOpen={onOpenPost} onOpenAuthor={handleOpenAuthorFromPost} />
            ))}
            {canAutoLoadMore && <div ref={sentinelRef} style={{ height: 1 }} aria-hidden />}
            {profilePosts.loading && (
              <p style={{ textAlign: 'center', color: '#94a3b3', fontSize: 12, padding: 8 }}>جارٍ التحميل...</p>
            )}
            {profilePosts.loadMoreError && (
              <div style={{ textAlign: 'center', padding: 8 }}>
                <p style={{ color: '#dc2626', fontSize: 12, margin: '0 0 6px' }}>{profilePosts.loadMoreError}</p>
                <button
                  onClick={profilePosts.loadMore}
                  style={{
                    background: 'none',
                    border: '0.5px solid #e5eaf0',
                    borderRadius: 999,
                    padding: '4px 14px',
                    fontSize: 12,
                    color: '#0e7c86',
                    cursor: 'pointer',
                  }}
                >
                  إعادة المحاولة
                </button>
              </div>
            )}
            {!profilePosts.loading && !profilePosts.hasMore && !profilePosts.loadMoreError && profilePosts.posts.length > 0 && (
              <p style={{ textAlign: 'center', color: '#94a3b3', fontSize: 12, padding: 8 }}>
                لا مزيد من المنشورات.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// Western digits everywhere (D12) — toLocaleString('ar') would produce
// Eastern Arabic numerals, so 'en-GB' formatting is used deliberately while
// the surrounding label stays Arabic.
const formatJoinDate = (joinedAt: CommunityUser['joinedAt']): string =>
  joinedAt.toDate().toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
