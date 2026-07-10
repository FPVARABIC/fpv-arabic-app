import { useCallback, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, writeBatch, increment, collection } from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { useAuthContext } from '../../../contexts/AuthContext';
import { userPath } from '../utils/firestorePaths';
import { generateSearchTokens } from '../utils/searchSynonyms';
import { secondsRemaining, POST_RATE_LIMIT_SECONDS, postRateLimitMessage } from '../utils/rateLimit';
import { uploadMedia } from '../Composer/MediaUploader';
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
        // document.
        if (!userData) {
          await setDoc(userRef, {
            displayName: currentUser.displayName ?? 'مستخدم',
            photoURL: currentUser.photoURL ?? null,
            joinedAt: serverTimestamp(),
            postsCount: 0,
            role: 'user',
            status: 'active',
            lastPostAt: null,
            lastCommentAt: null,
          });
        }

        const postRef = doc(collection(firestoreDb, 'posts'));
        const postId = postRef.id;

        let media = null;
        if (imageFile) {
          media = await uploadMedia(imageFile, postId, onUploadProgress);
          if (!media) {
            setError('تعذر ضغط الصورة بما يكفي، جرب صورة أخرى.');
            return null;
          }
        }

        const authorName = userData?.displayName ?? currentUser.displayName ?? 'مستخدم';
        const authorPhoto = userData?.photoURL ?? currentUser.photoURL ?? null;

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
          commentsCount: 0,
          createdAt: serverTimestamp(),
          status: 'active',
          searchTokens: generateSearchTokens(text),
        });
        batch.update(userRef, { lastPostAt: serverTimestamp(), postsCount: increment(1) });

        await batch.commit();
        return postId;
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
