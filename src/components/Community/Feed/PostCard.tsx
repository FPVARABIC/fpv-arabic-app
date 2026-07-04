import React from 'react';
import type { PostWithId } from '../types';
import { CATEGORY_LABELS, CATEGORY_TINTS } from '../utils/categories';
import { timeAgo } from '../utils/timeAgo';
import { Avatar } from '../Avatar';

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
  const tint = post.category in CATEGORY_TINTS
    ? CATEGORY_TINTS[post.category as keyof typeof CATEGORY_TINTS]
    : NEUTRAL_TINT;

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
      </div>

      <p style={{ fontSize: 14, color: '#1a2b3c', margin: '0 0 10px', lineHeight: 1.6, wordBreak: 'break-word' }}>
        {post.text}
      </p>

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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
          background: tint.bg, color: tint.text,
        }}>
          {CATEGORY_LABELS[post.category]}
        </span>
        <span style={{ fontSize: 12, color: '#5a6b7c' }} dir="ltr">{post.commentsCount} تعليق</span>
      </div>
    </div>
  );
};
