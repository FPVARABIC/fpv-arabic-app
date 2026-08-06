import 'server-only';

import {
  getProfileRow, listProfileRows, countProfiles,
  getCommentRow, listPostRows,
  getReportRow, listReportRows, countReports, countPosts,
  type ProfileRow, type ReportRowData,
} from '../backend/supabase/adminData';
import { serviceClient } from '../backend/supabase/service';
import { toRole, ROLE_LABEL_AR, type PlatformRole } from '@core/data/auth/roles';
import { reportStatusFromState, stateFromReportStatus, type ReportStatus } from './admin';

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
 * the whole profile row, not the reporter's own history, not a user's saved
 * posts or devices. An admin list is a tool for a specific job, not a licence
 * to read everything about a person — and each field returned here is a field
 * that will end up in a screenshot someday.
 *
 * Emails live in the Auth record rather than the profile row. They are
 * included ONLY on the single-user detail screen, where identifying the right
 * account is the task; the list view deliberately does without them.
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

async function rowFrom(p: ProfileRow, postsCount: number, lastPostAt: string | null): Promise<AdminUserRow> {
  const role = toRole(p.role);
  return {
    uid: p.uid,
    displayName: p.displayName,
    photoURL: p.photoURL,
    role,
    roleLabelAr: ROLE_LABEL_AR[role],
    status: p.status === 'banned' ? 'banned' : 'active',
    postsCount,
    joinedAt: p.createdAt,
    lastPostAt,
  };
}

/**
 * Posts per author, counted from the posts table at read time.
 *
 * Not a stored counter — a stored counter is a number that can be wrong. One
 * bounded count per listed row; an admin list of 25 costs 25 fast indexed
 * counts, which is the right trade for a screen whose numbers must be true.
 */
async function postCounts(uids: string[]): Promise<Record<string, number>> {
  const sb = serviceClient();
  if (!sb) return {};
  const pairs = await Promise.all(uids.map(async uid => {
    const { count } = await sb
      .from('posts').select('id', { count: 'exact', head: true }).eq('author_id', uid);
    return [uid, count ?? 0] as const;
  }));
  return Object.fromEntries(pairs);
}

/**
 * Find users.
 *
 * Three lookups, tried in the order that gives an administrator the fastest
 * answer for what they actually typed:
 *
 *   1. An exact uid — what an audit entry or a report gives you, and the only
 *      identifier guaranteed to be unique.
 *   2. An email, resolved through the Auth admin API — what a support request
 *      gives you. Profiles never store emails, so this cannot be a query.
 *   3. A display-name prefix, over the SAME `display_name_normalized` field
 *      the community's own user search maintains — reusing it rather than
 *      adding a second index that could disagree with the first.
 */
export async function findUsers(rawQuery: string, limit = 25): Promise<AdminUserRow[]> {
  const q = rawQuery.trim().slice(0, 120);
  const capped = Math.min(Math.max(limit, 1), 100);

  let rows: ProfileRow[];

  if (!q) {
    rows = await listProfileRows({ limit: capped });
  } else {
    // 1. Exact uid.
    const byId = /^[0-9a-f-]{36}$/i.test(q) ? await getProfileRow(q) : null;
    if (byId) {
      rows = [byId];
    } else if (q.includes('@')) {
      // 2. Email, via the Auth admin API — list-and-match, because GoTrue's
      // admin listing is the only email lookup the API offers.
      const sb = serviceClient();
      let match: ProfileRow | null = null;
      if (sb) {
        try {
          const { data } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
          const hit = data.users.find(u => u.email?.toLowerCase() === q.toLowerCase());
          if (hit) match = await getProfileRow(hit.id);
        } catch { /* fall through to the name search */ }
      }
      rows = match ? [match] : await listProfileRows({ namePrefix: q.toLowerCase(), limit: capped });
    } else {
      // 3. Display-name prefix.
      rows = await listProfileRows({ namePrefix: q.toLowerCase(), limit: capped });
    }
  }

  const counts = await postCounts(rows.map(r => r.uid));
  return Promise.all(rows.map(r => rowFrom(r, counts[r.uid] ?? 0, null)));
}

export interface AdminUserDetail extends AdminUserRow {
  email: string | null;
  emailVerified: boolean;
  authDisabled: boolean;
  reportsAgainstCount: number;
}

export async function getUserDetail(uid: string): Promise<AdminUserDetail | null> {
  const p = await getProfileRow(uid);
  if (!p) return null;

  const posts = await listPostRows({ authorId: uid, limit: 100 });
  const lastPostAt = posts[0]?.createdAt ?? null;

  let email: string | null = null;
  let emailVerified = false;
  const sb = serviceClient();
  if (sb) {
    try {
      const { data } = await sb.auth.admin.getUserById(uid);
      email = data.user?.email ?? null;
      emailVerified = Boolean(data.user?.email_confirmed_at);
    } catch { /* profile without a reachable Auth record; not an error here */ }
  }

  // How many reports name content this person authored — counted through
  // their posts rather than stored on the profile, so it cannot drift and
  // cannot be written by anyone.
  const postIds = posts.map(x => x.id);
  const reports = postIds.length
    ? await listReportRows({ targetIds: postIds, limit: 500 })
    : [];

  const row = await rowFrom(p, postIds.length, lastPostAt);
  return {
    ...row,
    email,
    emailVerified,
    // Supabase Auth has no per-account «disabled» flag the platform uses;
    // the platform's own suspension is `status = 'banned'`, shown beside it.
    authDisabled: false,
    reportsAgainstCount: reports.length,
  };
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

function toAdminReportRow(r: ReportRowData): AdminReportRow {
  return {
    id: r.id,
    targetType: r.targetType === 'comment' ? 'comment' : 'post',
    targetId: r.targetId,
    // For a post the target IS the post; for a comment the parent post id is
    // resolved where it is needed (the detail screen), not stored twice.
    postId: r.targetType === 'comment' ? '' : r.targetId,
    reporterId: r.reporterId ?? '',
    reporterName: null,
    reason: r.reason || 'other',
    note: r.detail,
    createdAt: r.createdAt,
    status: reportStatusFromState(r.state),
    reviewedBy: r.handledBy,
    reviewedAt: r.handledAt,
    reviewNoteAr: r.resolutionNote,
  };
}

/**
 * The report queue.
 *
 * Filtered by the STORED state now — the Firestore version had to filter in
 * memory because its status was derived from two fields written by two
 * surfaces; the relational table has one state column and one writer, so the
 * query can simply say what it wants.
 */
export async function listReports(opts: {
  status?: ReportStatus | 'all';
  limit?: number;
} = {}): Promise<AdminReportRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const rows = await listReportRows({
    states: !opts.status || opts.status === 'all'
      ? undefined
      : [stateFromReportStatus(opts.status)],
    limit,
  });
  return rows.map(toAdminReportRow);
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
  const r = await getReportRow(reportId);
  if (!r) return null;
  const row = toAdminReportRow(r);

  // The reported artifact. Read on the service key precisely because a hidden
  // or deleted post is exactly what a moderator most needs to look at, and
  // the public read policy refuses those.
  let content: AdminReportDetail['content'] = null;
  if (row.targetType === 'post') {
    const sb = serviceClient();
    const { data } = sb
      ? await sb.from('posts').select('*').eq('id', row.targetId).maybeSingle()
      : { data: null };
    content = data ? fromPostRow(data as Record<string, unknown>) : { ...EMPTY_CONTENT, exists: false };
  } else {
    const c = await getCommentRow(row.targetId);
    if (c) {
      row.postId = c.postId;
      content = {
        exists: true,
        text: c.text,
        authorId: c.authorId,
        authorName: null,
        status: c.status,
        mediaType: 'none', mediaURL: null, thumbnailURL: null,
        mediaWidth: null, mediaHeight: null, mediaDuration: null,
      };
    } else {
      content = { ...EMPTY_CONTENT, exists: false };
    }
  }

  const reporter = row.reporterId ? await getProfileRow(row.reporterId) : null;
  return {
    ...row,
    reporterName: reporter?.displayName ?? null,
    content,
  };
}

const EMPTY_CONTENT = {
  exists: true, text: '', authorId: '', authorName: null, status: 'active',
  mediaType: 'none' as const, mediaURL: null, thumbnailURL: null,
  mediaWidth: null, mediaHeight: null, mediaDuration: null,
};

function fromPostRow(d: Record<string, unknown>): NonNullable<AdminReportDetail['content']> {
  return {
    exists: true,
    text: String(d.text ?? ''),
    authorId: String(d.author_id ?? ''),
    authorName: typeof d.author_name === 'string' ? d.author_name : null,
    status: String(d.status ?? 'active'),
    mediaType: (d.media_type === 'image' || d.media_type === 'video' ? d.media_type : 'none'),
    mediaURL: typeof d.media_url === 'string' ? d.media_url : null,
    thumbnailURL: typeof d.thumbnail_url === 'string' ? d.thumbnail_url : null,
    mediaWidth: typeof d.media_width === 'number' ? d.media_width : null,
    mediaHeight: typeof d.media_height === 'number' ? d.media_height : null,
    mediaDuration: typeof d.media_duration === 'number' ? Number(d.media_duration) : null,
  };
}

/**
 * The dashboard's numbers.
 *
 * Every one is COUNTED from the table it describes, at read time. None is a
 * stored counter, because a stored counter is a number that can be wrong, and
 * a dashboard whose figures are quietly stale produces confident decisions
 * from bad data. PostgreSQL's `count` is exact and indexed, so the Firestore
 * version's sampling cap is gone — `capped` stays in the contract and is
 * simply always false now.
 */
export interface AdminStats {
  openReports: number;
  inReviewReports: number;
  hiddenPosts: number;
  bannedUsers: number;
  totalUsers: number;
  capped: boolean;
}

export async function getAdminStats(): Promise<AdminStats> {
  const [openReports, inReviewReports, hiddenPosts, bannedUsers, totalUsers] = await Promise.all([
    countReports(['open']),
    countReports(['reviewing']),
    countPosts('hidden'),
    countProfiles({ status: 'banned' }),
    countProfiles(),
  ]);

  return { openReports, inReviewReports, hiddenPosts, bannedUsers, totalUsers, capped: false };
}
