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
  // Client-computed (normalizeDisplayName), same trust model already
  // accepted for Post.searchTokens — Rules validate shape/type only, never
  // cryptographically re-derive it from displayName. Absent on any
  // users/{uid} document bootstrapped before this field existed; every read
  // site must treat it as optional (see utils/userSearch.ts) rather than
  // assume every document has it. See scripts/migrateDisplayNameNormalized.ts
  // for the (untouched-in-production) backfill utility.
  displayNameNormalized?: string;
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
  // Storage folder path only, e.g. "community/posts/{uid}/{postId}" — not a
  // file path (Phase 9: uid segment added so storage.rules can enforce
  // per-user write scoping via a path-segment check, see firestorePaths.ts).
  mediaPath: string | null;
  // Real pixel dimensions of the uploaded (post-compression) image (Phase
  // 9) — derived from the actual decoded file, never fabricated. Lets
  // rendering reserve correct aspect-ratio space before the image loads
  // (no layout shift) and bound its maximum on-screen height. null for
  // text-only posts, same convention as the other media fields.
  mediaWidth: number | null;
  mediaHeight: number | null;
  commentsCount: number;
  createdAt: Timestamp;
  status: ContentStatus;
  searchTokens: string[];
  // Server-aggregated via increment() inside the same Admin-SDK transaction
  // that creates/deletes the paired likes/{uid} document (see
  // functions/src/index.ts's togglePostLike) — same trust model as
  // Comment.likesCount above. Written as 0 at creation time (client write,
  // validated by firestore.rules) since post creation itself remains a
  // direct client write, unlike comment creation. Absent on any post
  // created before this field existed; every read site must coalesce with
  // `?? 0` rather than assume every document has it.
  likesCount?: number;
  // Feed ranking (Phase 2). Written as exactly 100 by the client at creation
  // (firestore.rules validates this literal constant — the same
  // shape-trust model already used for searchTokens/likesCount, never a
  // client-computed value), then owned exclusively by the scheduled
  // recomputeFeedScores Cloud Function (functions/src/index.ts) via the
  // Admin SDK from that point on, the same trust boundary already
  // established for Post.likesCount. Absent on any post created before this
  // field existed — every read site must coalesce with `?? 0` rather than
  // assume every document has it (a missing feedScore must never be
  // treated as ranking above a genuinely fresh post's real 100).
  feedScore?: number;
  // Null until the scheduled recomputeFeedScores function's first pass
  // touches this post; Admin-SDK-written only, never client-writable.
  feedScoreComputedAt?: Timestamp | null;
  // Set true once a post ages past the scheduled function's recompute
  // horizon (40h momentum window + 168h decay tail + buffer) and its score
  // has settled at the permanent decay floor — lets that function's own
  // candidate query shrink over time instead of re-touching every post ever
  // created on every run. false at creation; Admin-SDK-written only.
  feedScoreFrozen?: boolean;
}

export interface Comment {
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  text: string;
  createdAt: Timestamp;
  status: ContentStatus;
  // Server-aggregated via increment() inside the same Admin-SDK transaction
  // that creates/deletes the paired likes/{uid} document (see
  // functions/src/index.ts's toggleCommentLike) — a real atomic guarantee,
  // not shape-validation trust, since the client SDK is denied any direct
  // write to this field. Absent on any comment created before this field
  // existed; every read site must coalesce with `?? 0` rather than assume
  // every document has it.
  likesCount?: number;
}

// A single user's like on a single comment — deterministic document ID
// (the liker's own uid) under comments/{commentId}/likes/{uid}, so "one
// like per user per comment" is structurally guaranteed by document
// existence, not by application-level dedup logic. Written exclusively by
// the toggleCommentLike Cloud Function (functions/src/index.ts) — the
// client SDK is denied create/update/delete on this path in firestore.rules.
export interface CommentLike {
  createdAt: Timestamp;
}

// A single user's like on a single post — same deterministic-document-ID
// model as CommentLike above (posts/{postId}/likes/{uid}), written
// exclusively by the togglePostLike Cloud Function (functions/src/index.ts).
export interface PostLike {
  createdAt: Timestamp;
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

export type FollowStatus = 'loading' | 'not-following' | 'following';

// Notifications (Phase 1, in-app only — push send is blocked until Firebase
// Blaze billing is restored, see docs/KNOWN_ISSUES.md). Every notification
// is a direct client write, issued as a SEPARATE write after the primary
// action (follow/like/comment) has already committed — see the matching
// comment in each of useFollow.ts/usePostLike.ts/useCommentLike.ts/
// useCommentComposer.ts and firestore.rules' notifications/{notificationId}
// block for the full anti-forgery design (exists()/get() checks against the
// already-committed primary artifact, not shape-only trust).
export type NotificationType = 'follow' | 'like_post' | 'like_comment' | 'comment' | 'announcement';
export type NotificationTargetType = 'profile' | 'post' | 'comment' | 'announcement';

export interface CommunityNotification {
  type: NotificationType;
  // null only for 'announcement' — an announcement has no acting user.
  actorId: string | null;
  actorName: string | null;
  actorPhoto: string | null;
  targetType: NotificationTargetType | null;
  targetId: string | null;
  // Parent post id, present for like_comment/comment (navigation needs it
  // to open the right post); null for follow/like_post/announcement.
  postId: string | null;
  read: boolean;
  createdAt: Timestamp;
}

export interface CommunityNotificationWithId extends CommunityNotification {
  id: string;
}

// Push device tokens (Phase 1 infra — sending stays blocked until Blaze).
// Never publicly readable, unlike almost every other document in this app —
// see firestore.rules' deviceTokens/{tokenId} block.
export interface DeviceToken {
  token: string;
  platform: 'web';
  userAgent: string | null;
  createdAt: Timestamp;
}

// Simple admin/broadcast mechanism (Phase 1) — created only by a moderator
// (reuses the existing isModerator() Rules function, no new auth
// infrastructure), read by every signed-in user, mirrored client-side into
// a signed-in user's own notifications inbox the first time they see it
// (see firestore.rules' notifications 'announcement' create branch).
export interface Announcement {
  title: string;
  body: string;
  createdAt: Timestamp;
  ctaLink: string | null;
}

export interface AnnouncementWithId extends Announcement {
  id: string;
}
