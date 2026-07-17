import { useCallback, useState } from 'react';
import { doc, getDoc, serverTimestamp, writeBatch, increment, collection } from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { useAuthContext } from '../../../contexts/AuthContext';
import { userPath } from '../utils/firestorePaths';
import { ensureCommunityUser } from '../utils/ensureCommunityUser';
import { generateSearchTokens } from '../utils/searchSynonyms';
import { secondsRemaining, POST_RATE_LIMIT_SECONDS, postRateLimitMessage } from '../utils/rateLimit';
import { uploadMedia, deleteMedia, type UploadedMedia } from '../Composer/MediaUploader';
import type { CommunityUser, PostCategory } from '../types';

interface CreatePostInput {
  text: string;
  category: PostCategory | null;
  imageFile: File | null;
  onUploadProgress?: (fullPct: number, thumbPct: number) => void;
}

interface UseComposerResult {
  createPost: (input: CreatePostInput) => Promise<string | null>;
  submitting: boolean;
  error: string | null;
}

export const useComposer = (): UseComposerResult => {
  const { currentUser } = useAuthContext();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPost = useCallback(
    async ({ text, category, imageFile, onUploadProgress }: CreatePostInput): Promise<string | null> => {
      if (!currentUser) {
        setError('يجب تسجيل الدخول للنشر.');
        return null;
      }
      setSubmitting(true);
      setError(null);

      try {
        const userRef = doc(firestoreDb, userPath(currentUser.uid));
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? (userSnap.data() as CommunityUser) : null;

        if (userData?.status === 'banned') {
          setError('حسابك موقوف عن النشر حالياً.');
          return null;
        }

        if (userData?.lastPostAt) {
          const remaining = secondsRemaining(userData.lastPostAt, POST_RATE_LIMIT_SECONDS);
          if (remaining > 0) {
            setError(postRateLimitMessage(remaining));
            return null;
          }
        }

        // Bootstrap: the create-rule requires postsCount==0 and
        // lastPostAt==null at creation time — this must be its own write,
        // separate from the rate-limit-bumping update below, since a single
        // Firestore batch cannot apply two different operations to the same
        // document. Normally already done by useEnsureCommunityUser at
        // Community-entry; this call is a safe, idempotent fallback for the
        // rare case a post is submitted before that bootstrap has finished.
        if (!userData) {
          await ensureCommunityUser(currentUser.uid, {
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
          });
        }

        const postRef = doc(collection(firestoreDb, 'posts'));
        const postId = postRef.id;

        let media: UploadedMedia | null = null;
        if (imageFile) {
          media = await uploadMedia(imageFile, currentUser.uid, postId, onUploadProgress);
          if (!media) {
            setError('تعذر ضغط الصورة بما يكفي، جرب صورة أخرى.');
            return null;
          }
        }

        const authorName = userData?.displayName ?? currentUser.displayName ?? 'مستخدم';
        const authorPhoto = userData?.photoURL ?? currentUser.photoURL ?? null;

        try {
          const batch = writeBatch(firestoreDb);
          batch.set(postRef, {
            authorId: currentUser.uid,
            authorName,
            authorPhoto,
            text,
            ...(category ? { category } : {}),
            mediaType: media ? 'image' : 'none',
            mediaURL: media?.mediaURL ?? null,
            thumbnailURL: media?.thumbnailURL ?? null,
            mediaSize: media?.mediaSize ?? null,
            mediaDuration: null,
            mediaPath: media?.mediaPath ?? null,
            mediaWidth: media?.width ?? null,
            mediaHeight: media?.height ?? null,
            commentsCount: 0,
            likesCount: 0,
            createdAt: serverTimestamp(),
            status: 'active',
            searchTokens: generateSearchTokens(text),
            // Feed ranking (Phase 2) — a fixed constant, not a client-
            // computed engagement value: exactly freshness(0) from the
            // approved ranking formula (functions/src/feedRanking.ts),
            // Rules-validated (firestore.rules requires this literal value
            // on create). feedScoreComputedAt/feedScoreFrozen are
            // deliberately omitted here — they have no legitimate value
            // yet (the scheduled recomputeFeedScores Function hasn't run),
            // and Rules only allow them to be either absent or their
            // "not yet computed" default. Kept as a literal `100`, not an
            // import from functions/src, since that module also imports
            // firebase-admin — a Node-only package that must never end up
            // in this client bundle.
            feedScore: 100,
          });
          batch.update(userRef, { lastPostAt: serverTimestamp(), postsCount: increment(1) });

          await batch.commit();
          return postId;
        } catch (batchErr) {
          // Storage upload already succeeded (if there was an image) but the
          // paired Firestore write didn't — e.g. two submissions from the
          // same user raced the 60s rate limit and this one lost. Without
          // this, the just-uploaded file(s) would be permanently orphaned:
          // nothing else ever references this postId's mediaPath, since no
          // post document was created to point at it. deleteMedia() itself
          // never throws, so no extra try/catch is needed here — but its
          // structured result IS inspected: a partial/full cleanup failure
          // is logged (dev-console only, no token-bearing URL, just the
          // internal outcome) so it's visible to whoever reads logs, without
          // ever overwriting `batchErr` — the ORIGINAL publish failure is
          // always what reaches the user, cleanup success or not. If this
          // ever logs a partial/full failure in practice, the leaked
          // object(s) are not otherwise reconciled anywhere else in this
          // codebase — a future server-side sweep (e.g. a scheduled function
          // comparing Storage objects against known mediaPaths) would be the
          // right place to close that gap, not this client-side best effort.
          if (media) {
            const cleanup = await deleteMedia(media);
            if (!cleanup.fullySucceeded) {
              console.error('[useComposer] orphaned media cleanup did not fully succeed after a failed post-create', {
                full: cleanup.full,
                thumbnail: cleanup.thumbnail,
              });
            }
          }
          throw batchErr;
        }
      } catch (err) {
        console.error('[useComposer]', err);
        setError('تعذر نشر المنشور. حاول مرة أخرى.');
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [currentUser],
  );

  return { createPost, submitting, error };
};
