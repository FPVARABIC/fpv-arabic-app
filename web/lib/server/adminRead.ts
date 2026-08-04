import 'server-only';

import { adminAuth, adminDb } from './firebaseAdmin';
import { toRole, ROLE_LABEL_AR, type PlatformRole } from '@core/data/auth/roles';
import { effectiveReportStatus, type ReportStatus } from './admin';

/**
 * Everything the admin surface READS.
 *
 * Separate from `admin.ts` (which mutates) because the two have different
 * failure modes and different review burdens: a read that returns too much is a
 * privacy problem, a write that permits too much is a security one, and mixing
 * them makes it harder to see either.
 *
 * WHAT IS DELIBERATELY NOT RETURNED
 * ---------------------------------
 * Every function here returns the narrowest projection its screen needs. Not
 * the whole user document, not the reporter's own history, not a user's saved
 * posts, notifications, device tokens or project. An admin list is a tool for a
 * specific job, not a licence to read everything about a person — and each
 * field returned here is a field that will end up in a screenshot someday.
 *
 * Emails are the one thing fetched from outside Firestore, because they live in
 * the Auth record rather than the profile document. They are included ONLY on
 * the single-user detail screen, where identifying the right account is the
 * task; the list view deliberately does without them.
 */

export interface AdminUserRow {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  role: PlatformRole;
  roleLabelAr: string;
  status: 'active' | 'banned';
  postsCount: number;
  joinedAt: string | null;
  lastPostAt: string | null;
}

const toIso = (v: unknown): string | null =>
  (v as { toDate?: () => Date })?.toDate?.().toISOString() ?? null;

function rowFrom(id: string, d: Record<string, unknown>): AdminUserRow {
  const role = toRole(d.role);
  return {
    uid: id,
    displayName: typeof d.displayName === 'string' ? d.displayName : null,
    photoURL: typeof d.photoURL === 'string' ? d.photoURL : null,
    role,
    roleLabelAr: ROLE_LABEL_AR[role],
    status: d.status === 'banned' ? 'banned' : 'active',
    postsCount: typeof d.postsCount === 'number' ? d.postsCount : 0,
    joinedAt: toIso(d.joinedAt),
    lastPostAt: toIso(d.lastPostAt),
  };
}

/**
 * Find users.
 *
 * Three lookups, tried in the order that gives an administrator the fastest
 * answer for what they actually typed:
 *
 *   1. An exact uid — because that is what an audit entry or a report gives you,
 *      and it is the only identifier guaranteed to be unique.
 *   2. An email, resolved through the Auth record — because that is what a
 *      support request gives you. Firestore never stores emails, so this cannot
 *      be a query; it is a direct Auth lookup that either finds the one account
 *      or finds nothing.
 *   3. A display-name prefix, over the SAME `displayNameNormalized` field the
 *      community's own user search already maintains — reusing it rather than
 *      adding a second index that could disagree with the first.
 */
export async function findUsers(rawQuery: string, limit = 25): Promise<AdminUserRow[]> {
  const q = rawQuery.trim().slice(0, 120);
  const capped = Math.min(Math.max(limit, 1), 100);

  if (!q) {
    const snap = await adminDb().collection('users')
      .orderBy('joinedAt', 'desc').limit(capped).get();
    return snap.docs.map(d => rowFrom(d.id, d.data()));
  }

  // 1. Exact uid.
  const byId = await adminDb().collection('users').doc(q).get();
  if (byId.exists) return [rowFrom(byId.id, byId.data() ?? {})];

  // 2. Email, via Auth.
  if (q.includes('@')) {
    try {
      const user = await adminAuth().getUserByEmail(q);
      const snap = await adminDb().collection('users').doc(user.uid).get();
      if (snap.exists) return [rowFrom(snap.id, snap.data() ?? {})];
    } catch {
      // No such account. Fall through to the name search rather than reporting
      // "not found" — the string might still be a display name.
    }
  }

  // 3. Display-name prefix.
  const norm = q.toLowerCase();
  const snap = await adminDb().collection('users')
    .orderBy('displayNameNormalized')
    .startAt(norm)
    .endAt(`${norm}`)
    .limit(capped)
    .get();
  return snap.docs.map(d => rowFrom(d.id, d.data()));
}

export interface AdminUserDetail extends AdminUserRow {
  email: string | null;
  emailVerified: boolean;
  authDisabled: boolean;
  reportsAgainstCount: number;
}

export async function getUserDetail(uid: string): Promise<AdminUserDetail | null> {
  const snap = await adminDb().collection('users').doc(uid).get();
  if (!snap.exists) return null;
  const row = rowFrom(snap.id, snap.data() ?? {});

  let email: string | null = null;
  let emailVerified = false;
  let authDisabled = false;
  try {
    const u = await adminAuth().getUser(uid);
    email = u.email ?? null;
    emailVerified = u.emailVerified;
    authDisabled = u.disabled;
  } catch { /* Firestore-only account; not an error for this screen */ }

  // How many reports name content this person authored. Counted through their
  // posts rather than stored on the profile, so it cannot drift and cannot be
  // written by anyone.
  const posts = await adminDb().collection('posts')
    .where('authorId', '==', uid).limit(100).get();
  const postIds = posts.docs.map(d => d.id);
  let reportsAgainstCount = 0;
  for (let i = 0; i < postIds.length; i += 10) {
    const batch = postIds.slice(i, i + 10);
    if (!batch.length) break;
    const r = await adminDb().collection('reports').where('postId', 'in', batch).get();
    reportsAgainstCount += r.size;
  }

  return { ...row, email, emailVerified, authDisabled, reportsAgainstCount };
}

export interface AdminReportRow {
  id: string;
  targetType: 'post' | 'comment';
  targetId: string;
  postId: string;
  reporterId: string;
  reporterName: string | null;
  reason: string;
  note: string | null;
  createdAt: string | null;
  status: ReportStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNoteAr: string | null;
}

export const REPORT_REASON_AR: Record<string, string> = {
  spam: 'إزعاج أو إعلان',
  abuse: 'إساءة أو تجاوز',
  dangerous: 'معلومات خطيرة',
  other: 'سبب آخر',
};

/**
 * The report queue.
 *
 * Filtered in memory on the derived status rather than by a `where` on the
 * stored field, because the effective status is a FUNCTION of `resolved` and
 * `status` (see `effectiveReportStatus`) and a query on either one alone would
 * silently miss reports written by the phone, which sets only `resolved`. The
 * queue is bounded and small; correctness beats an index here.
 */
export async function listReports(opts: {
  status?: ReportStatus | 'all';
  limit?: number;
} = {}): Promise<AdminReportRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const snap = await adminDb().collection('reports')
    .orderBy('createdAt', 'desc').limit(limit * 2).get();

  const rows: AdminReportRow[] = snap.docs.map(d => {
    const v = d.data();
    return {
      id: d.id,
      targetType: v.targetType === 'comment' ? 'comment' : 'post',
      targetId: String(v.targetId ?? ''),
      postId: String(v.postId ?? ''),
      reporterId: String(v.reporterId ?? ''),
      reporterName: null,
      reason: String(v.reason ?? 'other'),
      note: typeof v.note === 'string' ? v.note : null,
      createdAt: toIso(v.createdAt),
      status: effectiveReportStatus(v),
      reviewedBy: typeof v.reviewedBy === 'string' ? v.reviewedBy : null,
      reviewedAt: toIso(v.reviewedAt),
      reviewNoteAr: typeof v.reviewNoteAr === 'string' ? v.reviewNoteAr : null,
    };
  });

  const filtered = !opts.status || opts.status === 'all'
    ? rows
    : rows.filter(r => r.status === opts.status);

  return filtered.slice(0, limit);
}

export interface AdminReportDetail extends AdminReportRow {
  /** The reported content itself, as much of it as the decision needs. */
  content: {
    exists: boolean;
    text: string;
    authorId: string;
    authorName: string | null;
    status: string;
    mediaType: 'none' | 'image' | 'video';
    mediaURL: string | null;
    thumbnailURL: string | null;
    mediaWidth: number | null;
    mediaHeight: number | null;
    mediaDuration: number | null;
  } | null;
}

export async function getReportDetail(reportId: string): Promise<AdminReportDetail | null> {
  const snap = await adminDb().collection('reports').doc(reportId).get();
  if (!snap.exists) return null;
  const [row] = await listReportRows([{ id: snap.id, data: snap.data() ?? {} }]);

  // The reported artifact. Read with the Admin SDK precisely because a hidden
  // or deleted post is exactly what a moderator most needs to look at, and the
  // public read rule refuses those.
  let content: AdminReportDetail['content'] = null;
  if (row.targetType === 'post') {
    const p = await adminDb().collection('posts').doc(row.targetId).get();
    content = p.exists ? fromPost(p.data() ?? {}) : { ...EMPTY_CONTENT, exists: false };
  } else {
    const c = await adminDb().collection('posts').doc(row.postId)
      .collection('comments').doc(row.targetId).get();
    content = c.exists
      ? {
        exists: true,
        text: String(c.data()?.text ?? ''),
        authorId: String(c.data()?.authorId ?? ''),
        authorName: typeof c.data()?.authorName === 'string' ? c.data()!.authorName : null,
        status: String(c.data()?.status ?? 'active'),
        mediaType: 'none', mediaURL: null, thumbnailURL: null,
        mediaWidth: null, mediaHeight: null, mediaDuration: null,
      }
      : { ...EMPTY_CONTENT, exists: false };
  }

  const reporter = await adminDb().collection('users').doc(row.reporterId).get();
  return {
    ...row,
    reporterName: reporter.exists && typeof reporter.data()?.displayName === 'string'
      ? reporter.data()!.displayName as string
      : null,
    content,
  };
}

const EMPTY_CONTENT = {
  exists: true, text: '', authorId: '', authorName: null, status: 'active',
  mediaType: 'none' as const, mediaURL: null, thumbnailURL: null,
  mediaWidth: null, mediaHeight: null, mediaDuration: null,
};

function fromPost(d: Record<string, unknown>): NonNullable<AdminReportDetail['content']> {
  return {
    exists: true,
    text: String(d.text ?? ''),
    authorId: String(d.authorId ?? ''),
    authorName: typeof d.authorName === 'string' ? d.authorName : null,
    status: String(d.status ?? 'active'),
    mediaType: (d.mediaType === 'image' || d.mediaType === 'video' ? d.mediaType : 'none'),
    mediaURL: typeof d.mediaURL === 'string' ? d.mediaURL : null,
    thumbnailURL: typeof d.thumbnailURL === 'string' ? d.thumbnailURL : null,
    mediaWidth: typeof d.mediaWidth === 'number' ? d.mediaWidth : null,
    mediaHeight: typeof d.mediaHeight === 'number' ? d.mediaHeight : null,
    mediaDuration: typeof d.mediaDuration === 'number' ? d.mediaDuration : null,
  };
}

function listReportRows(docs: { id: string; data: Record<string, unknown> }[]): AdminReportRow[] {
  return docs.map(({ id, data: v }) => ({
    id,
    targetType: v.targetType === 'comment' ? 'comment' : 'post',
    targetId: String(v.targetId ?? ''),
    postId: String(v.postId ?? ''),
    reporterId: String(v.reporterId ?? ''),
    reporterName: null,
    reason: String(v.reason ?? 'other'),
    note: typeof v.note === 'string' ? v.note : null,
    createdAt: toIso(v.createdAt),
    status: effectiveReportStatus(v),
    reviewedBy: typeof v.reviewedBy === 'string' ? v.reviewedBy : null,
    reviewedAt: toIso(v.reviewedAt),
    reviewNoteAr: typeof v.reviewNoteAr === 'string' ? v.reviewNoteAr : null,
  }));
}

/**
 * The dashboard's numbers.
 *
 * Every one is COUNTED from the collection it describes, at read time. None is
 * a stored counter, because a stored counter is a number that can be wrong, and
 * a dashboard whose figures are quietly stale is worse than one with no figures
 * at all — it produces confident decisions from bad data.
 *
 * The counts are bounded rather than exhaustive: `count()` aggregation with a
 * cap, so a platform with a hundred thousand posts does not make this page
 * expensive. Where a cap is hit the UI says «+» rather than pretending the
 * number is exact.
 */
export interface AdminStats {
  openReports: number;
  inReviewReports: number;
  hiddenPosts: number;
  bannedUsers: number;
  totalUsers: number;
  capped: boolean;
}

const STAT_CAP = 500;

export async function getAdminStats(): Promise<AdminStats> {
  const db = adminDb();

  const [reportsSnap, hidden, banned, users] = await Promise.all([
    db.collection('reports').limit(STAT_CAP).get(),
    db.collection('posts').where('status', '==', 'hidden').limit(STAT_CAP).get(),
    db.collection('users').where('status', '==', 'banned').limit(STAT_CAP).get(),
    db.collection('users').limit(STAT_CAP).get(),
  ]);

  let openReports = 0;
  let inReviewReports = 0;
  for (const d of reportsSnap.docs) {
    const s = effectiveReportStatus(d.data());
    if (s === 'open') openReports++;
    else if (s === 'in_review') inReviewReports++;
  }

  return {
    openReports,
    inReviewReports,
    hiddenPosts: hidden.size,
    bannedUsers: banned.size,
    totalUsers: users.size,
    capped: reportsSnap.size >= STAT_CAP || users.size >= STAT_CAP,
  };
}
