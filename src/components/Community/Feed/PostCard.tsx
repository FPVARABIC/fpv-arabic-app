import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Bookmark } from 'lucide-react';
import type { PostWithId } from '../types';
import { CATEGORY_LABELS, CATEGORY_TINTS } from '../utils/categories';
import { timeAgo } from '../utils/timeAgo';
import { Avatar } from '../Avatar';
import { ReportButton } from '../Moderation/ReportButton';
import { PostLikeButton } from '../PostLikeButton';
import { useSavedPostIds } from '../hooks/useSavedPostIds';
import { useAuthContext } from '../../../contexts/AuthContext';

interface PostCardProps {
  post: PostWithId;
  onOpen: (postId: string) => void;
  onOpenAuthor: (authorId: string) => void;
}

const NEUTRAL_TINT = { bg: '#eef2f6', text: '#5a6b7c' };

// Switches on mediaType, per D4: adding 'video' later is a few lines here,
// not a refactor. 'none' renders with no image slot at all — no broken-image
// box, no empty placeholder.
export const PostCard: React.FC<PostCardProps> = ({ post, onOpen, onOpenAuthor }) => {
  const tint = post.category && post.category in CATEGORY_TINTS
    ? CATEGORY_TINTS[post.category as keyof typeof CATEGORY_TINTS]
    : NEUTRAL_TINT;

  const { isGuest } = useAuthContext();
  const { isSaved, toggleSaved } = useSavedPostIds();
  const [toast, setToast] = useState<string | null>(null);
  const saved = isSaved(post.id);

  const handleToggleSaved = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGuest) {
      setToast('يجب تسجيل الدخول للحفظ');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    toggleSaved(post.id);
  };

  const handleGuestLikeTap = () => {
    setToast('يجب تسجيل الدخول للإعجاب');
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <div
      onClick={() => onOpen(post.id)}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onOpen(post.id); }}
      style={{
        background: '#ffffff',
        border: '0.5px solid #e5eaf0',
        borderRadius: 14,
        padding: 14,
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <button
          onClick={e => { e.stopPropagation(); onOpenAuthor(post.authorId); }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          <Avatar photoURL={post.authorPhoto} name={post.authorName} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1a2b3c' }}>{post.authorName}</span>
        </button>
        <span style={{ fontSize: 12, color: '#94a3b3' }} dir="ltr">{timeAgo(post.createdAt)}</span>

        <div style={{ flex: 1 }} />
        <button onClick={handleToggleSaved} aria-label="حفظ" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <Bookmark size={15} color={saved ? '#0e7c86' : '#94a3b3'} fill={saved ? '#0e7c86' : 'none'} />
        </button>
        <div onClick={e => e.stopPropagation()}>
          <ReportButton targetType="post" targetId={post.id} postId={post.id} />
        </div>
      </div>

      {/* Portal to document.body — see ReportButton.tsx for why fixed-position
          overlays must escape AppShell's <main> stacking context. */}
      {toast && createPortal(
        <div style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          background: '#1a2b3c', color: '#ffffff', fontSize: 13, padding: '10px 18px',
          borderRadius: 999, zIndex: 60, whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>,
        document.body,
      )}

      {/* Image-only posts have text: '' — an unconditional <p> would render
          a meaningless empty paragraph (extra vertical space, nothing to
          read). Only render it when there is real text to show. */}
      {post.text && (
        <p style={{ fontSize: 14, color: '#1a2b3c', margin: '0 0 10px', lineHeight: 1.6, wordBreak: 'break-word' }}>
          {post.text}
        </p>
      )}

      {post.mediaType === 'image' && post.thumbnailURL && (
        <div style={{
          width: '100%', aspectRatio: '16 / 10', borderRadius: 10, overflow: 'hidden',
          background: '#eef2f6', marginBottom: 10,
        }}>
          <img
            src={post.thumbnailURL}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: post.category ? 'space-between' : 'flex-end' }}>
        {post.category && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
            background: tint.bg, color: tint.text,
          }}>
            {CATEGORY_LABELS[post.category]}
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <PostLikeButton postId={post.id} likesCount={post.likesCount ?? 0} isGuest={isGuest} onGuestTap={handleGuestLikeTap} />
          <span style={{ fontSize: 12, color: '#5a6b7c' }} dir="ltr">{post.commentsCount} تعليق</span>
        </div>
      </div>
    </div>
  );
};
