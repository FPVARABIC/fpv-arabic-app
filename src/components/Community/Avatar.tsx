import React from 'react';

interface AvatarProps {
  photoURL: string | null;
  name: string;
  size?: number;
}

// Shared avatar-with-initial-fallback, reused across PostCard, PostDetail,
// CommentsList, and PublicProfile — declared once rather than duplicated in
// each.
export const Avatar: React.FC<AvatarProps> = ({ photoURL, name, size = 30 }) => {
  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt=""
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#e8f3ec',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.42),
        fontWeight: 700,
        color: '#2e7d4f',
        flexShrink: 0,
      }}
    >
      {name[0]}
    </div>
  );
};
