import React from 'react';
import { Heart } from 'lucide-react';
import { usePostLike } from './hooks/usePostLike';

interface PostLikeButtonProps {
  postId: string;
  authorId: string;
  likesCount: number;
  isGuest: boolean;
  onGuestTap: () => void;
  size?: number;
}

// Shared by PostCard.tsx (feed, search results, public-profile posts, saved
// posts — all reuse PostCard already) and PostDetail.tsx, so the like
// control has exactly one implementation and one behavior everywhere a post
// can be liked, image posts included — an image post's like button IS the
// post's like button; there is no separate per-image like system (see
// functions/src/index.ts's togglePostLike comments for why).
//
// Status is never color-only: the icon itself switches between an outline
// and a filled Heart (a shape change, not just a color change), and the
// accessible name changes between "أعجبني" (like) and "إلغاء الإعجاب"
// (unlike) so a screen reader announces the current state. A real native
// <button> gives full keyboard support and a visible focus outline for
// free. The count span is always rendered (even as an empty string at 0)
// so toggling never shifts the button's own layout.
export const PostLikeButton: React.FC<PostLikeButtonProps> = ({ postId, authorId, likesCount, isGuest, onGuestTap, size = 15 }) => {
  const { liked, likedLoading, toggling, toggleError, toggleLike } = usePostLike(postId, authorId);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGuest) {
      onGuestTap();
      return;
    }
    toggleLike();
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={!isGuest && (likedLoading || toggling)}
        aria-label={liked ? 'إلغاء الإعجاب بهذا المنشور' : 'أعجبني هذا المنشور'}
        aria-pressed={!isGuest && liked}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
          padding: '4px 6px', cursor: (!isGuest && (likedLoading || toggling)) ? 'default' : 'pointer',
          opacity: !isGuest && toggling ? 0.7 : 1,
        }}
      >
        <Heart size={size} color={liked ? '#dc2626' : '#94a3b3'} fill={liked ? '#dc2626' : 'none'} />
        <span style={{ fontSize: 12, color: liked ? '#dc2626' : '#94a3b3', fontWeight: liked ? 700 : 400 }} dir="ltr">
          {likesCount > 0 ? likesCount : ''}
        </span>
      </button>
      {toggleError && <span style={{ fontSize: 10, color: '#dc2626' }}>{toggleError}</span>}
    </div>
  );
};
