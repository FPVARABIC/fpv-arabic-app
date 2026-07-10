import type { Timestamp } from 'firebase/firestore';

// D7 amendment — nine ids supported in the schema/rules from day one; only four
// are currently selectable in the composer / shown as chips. See categories.ts.
export const ALL_CATEGORY_IDS = [
  'questions',
  'parts',
  'projects',
  'flights',
  'betaflight',
  'electronics',
  'long-range',
  'cinematic',
  'freestyle',
] as const;

export type PostCategory = (typeof ALL_CATEGORY_IDS)[number];

export type MediaType = 'none' | 'image' | 'video';
export type ContentStatus = 'active' | 'hidden' | 'deleted';
export type UserRole = 'user' | 'moderator';
export type UserStatus = 'active' | 'banned';
// 'dangerous' ("معلومات خطيرة") added as a Phase 2 amendment to D9/D11's
// originally locked three-value enum.
export type ReportReason = 'spam' | 'abuse' | 'dangerous' | 'other';
export type ReportTargetType = 'post' | 'comment';

export interface CommunityUser {
  displayName: string;
  photoURL: string | null;
  joinedAt: Timestamp;
  postsCount: number;
  role: UserRole;
  status: UserStatus;
  lastPostAt: Timestamp | null;
  lastCommentAt: Timestamp | null;
}

export interface Post {
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  text: string;
  category?: PostCategory;
  mediaType: MediaType;
  mediaURL: string | null;
  thumbnailURL: string | null;
  // Self-reported by the client after compression (bytes). Capped at 500KB in
  // Firestore Rules as an "honest metadata ceiling" for the ≤300KB compression
  // target (D5) — this is NOT the real size enforcement. Storage Rules' 2MB
  // cap on the actual uploaded bytes is the real physical backstop.
  mediaSize: number | null;
  mediaDuration: number | null;
  // Storage folder path only, e.g. "community/posts/{postId}" — not a file path.
  mediaPath: string | null;
  commentsCount: number;
  createdAt: Timestamp;
  status: ContentStatus;
  searchTokens: string[];
}

export interface Comment {
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  text: string;
  createdAt: Timestamp;
  status: ContentStatus;
}

// Document data plus its own Firestore doc ID — the shape every read hook
// (useFeed/usePost/useSearch) hands to components, since components need the
// ID to navigate/link but Firestore document data itself never contains it.
export interface PostWithId extends Post {
  id: string;
}

export interface CommentWithId extends Comment {
  id: string;
}

export interface Report {
  targetType: ReportTargetType;
  targetId: string;
  postId: string;
  reporterId: string;
  reason: ReportReason;
  note: string | null;
  createdAt: Timestamp;
  resolved: boolean;
}

export interface SavedPost {
  postId: string;
  savedAt: Timestamp;
}
