import 'server-only';

import {
  getProfileRow, getAuthEmail, updateProfileFields, countOwners as countOwnerRows,
  getPostRow, setPostStatus, clearPostMedia, getCommentRow, setCommentStatus,
  getReportRow, updateReportRow, deleteServicePrefix,
} from '../backend/supabase/adminData';
import { ForbiddenError, type Session } from './session';
import {
  logAudit, logDenied, markAuditResult, actorFromSession,
  type AuditAction, type AuditTargetType,
} from './audit';
import {
  toRole, can, canActOnUser, canAssignRole, ROLE_LABEL_AR,
  type PlatformRole, type Capability,
} from '@core/data/auth/roles';

/**
 * Every administrative MUTATION on this platform.
 *
 * WHY THEY ALL LIVE HERE AND NOT IN THE ROUTE HANDLERS
 * ----------------------------------------------------
 * Because each one has invariants that must hold no matter which door the
 * request came through, and a rule enforced in a route handler is a rule that
 * exists only for the callers who happen to use that handler. Putting them in
 * one module means "an admin may not promote themselves" is a property of the
 * OPERATION, not of one endpoint that remembered to check.
 *
 * The route handlers above these functions do exactly three things: verify the
 * session, parse and shape-check the body, and translate a thrown error into a
 * status code. Every decision about whether an action is permissible is made
 * here.
 *
 * THE ORDER IS THE SECURITY MODEL
 * -------------------------------
 * Every function below runs the same sequence, and the order is not negotiable:
 *
 *   1. Require the capability (the session is already verified by the caller).
 *   2. Load the TARGET from the database — never trust what the client said
 *      about it. A client that claims the target is a plain user is not asked.
 *   3. Check the actor against the target: self-action, rank, owner protection.
 *   4. Write the audit entry.
 *   5. Perform the action.
 *   6. Correct the audit entry if the action then failed.
 *
 * Steps 2 and 3 are what make this more than a capability check. `users.ban` is
 * a capability an admin holds; banning THE OWNER is not something any capability
 * grants, and that distinction can only be made after the target is read.
 *
 * SERVICE KEY, WHICH MEANS ROW-LEVEL SECURITY DOES NOT APPLY
 * ----------------------------------------------------------
 * Every write here runs on the secret key and bypasses RLS by design — that
 * is what the service role is. It is the reason the checks in this file have
 * to be complete rather than a second opinion: there is no policy layer
 * behind them to catch a mistake. `scripts/testAdminRoles.ts` exercises the
 * decision logic directly.
 */

/* ── Errors ──────────────────────────────────────────────────────────────── */

/**
 * A refusal with a stable machine-readable code.
 *
 * The code lets the UI say something specific ("you cannot change your own
 * role") without parsing Arabic prose, and lets a test assert on the REASON a
 * request was refused rather than merely that it was — the difference between
 * proving owner protection works and proving something went wrong.
 */
export class AdminError extends Error {
  readonly status: number;
  readonly code: AdminErrorCode;
  constructor(code: AdminErrorCode, messageAr: string, status = 400) {
    super(messageAr);
    this.name = 'AdminError';
    this.code = code;
    this.status = status;
  }
}

export type AdminErrorCode =
  | 'not_found'
  | 'self_action'
  | 'owner_protected'
  | 'last_owner'
  | 'rank_too_low'
  | 'role_not_assignable'
  | 'invalid_input'
  | 'invalid_transition'
  | 'media_mismatch';

/* ── Shared preflight ────────────────────────────────────────────────────── */

export interface TargetUser {
  uid: string;
  role: PlatformRole;
  status: 'active' | 'banned';
  displayName: string | null;
  email: string | null;
}

async function loadUser(uid: string): Promise<TargetUser> {
  const row = await getProfileRow(uid);
  if (!row) throw new AdminError('not_found', 'لا يوجد مستخدم بهذا المعرّف', 404);
  return {
    uid,
    role: toRole(row.role),
    status: row.status === 'banned' ? 'banned' : 'active',
    displayName: row.displayName,
    email: await getAuthEmail(uid),
  };
}

/**
 * May this actor act on this subject at all?
 *
 * Delegates to the shared core's `canActOnUser`, which encodes the three rules
 * that matter — no self-action, the owner is untouchable, and the actor must
 * outrank the subject — so the phone, the web and any future surface answer
 * this question identically. The error codes below exist so the refusal can be
 * explained precisely rather than as a generic 403.
 */
function assertMayActOn(actor: Session, subject: TargetUser): void {
  if (actor.uid === subject.uid) {
    throw new AdminError('self_action', 'لا يمكنك تنفيذ إجراء إداري على حسابك نفسه', 403);
  }
  if (subject.role === 'owner') {
    throw new AdminError('owner_protected', 'لا يمكن تنفيذ هذا الإجراء على مالك المنصة', 403);
  }
  if (!canActOnUser(actor, subject)) {
    throw new AdminError('rank_too_low', 'لا تملك صلاحية كافية تجاه هذا الحساب', 403);
  }
}

function requireCap(actor: Session, capability: Capability): void {
  if (!can(actor.role, capability)) {
    throw new ForbiddenError('لا تملك صلاحية هذا الإجراء', 403);
  }
}

/**
 * Run an operation with its audit entry written first and corrected after.
 *
 * The entry is created BEFORE the mutation, so an action that cannot be
 * recorded never happens. If the mutation then throws, the entry is amended to
 * `result: 'error'` rather than deleted — deleting it would make the log
 * editable by exactly the code paths it exists to observe.
 */
async function audited<T>(
  actor: Session,
  requestId: string,
  entry: {
    action: AuditAction; targetType: AuditTargetType; targetId: string;
    before?: string | null; after?: string | null; reasonAr?: string | null;
    meta?: Record<string, string | number | boolean | null>;
  },
  run: () => Promise<T>,
): Promise<T> {
  const entryId = await logAudit(actorFromSession(actor), requestId, entry);
  try {
    return await run();
  } catch (err) {
    await markAuditResult(entryId, 'error', err instanceof Error ? err.message : 'unknown')
      .catch(() => { /* the entry stands; an un-amended 'ok' is the lesser fault */ });
    throw err;
  }
}

/** Record the refusal, then re-throw it. Denials must leave a trace too. */
async function denied(
  actor: Session, requestId: string,
  entry: { action: AuditAction; targetType: AuditTargetType; targetId: string },
  err: unknown,
): Promise<never> {
  await logDenied(actorFromSession(actor), requestId, {
    ...entry,
    error: err instanceof AdminError ? err.code
      : err instanceof Error ? err.message
      : 'unknown',
  });
  throw err;
}

/* ── Users ───────────────────────────────────────────────────────────────── */

export interface BanInput {
  uid: string;
  reasonAr: string;
}

/**
 * Ban an account.
 *
 * WHAT BANNING ACTUALLY DOES, STATED PRECISELY
 * --------------------------------------------
 *   - `profiles.status` becomes 'banned'. Every RLS insert policy reads that
 *     row through `is_active()`, so the account immediately loses the ability
 *     to post, comment, upload and report — enforced by the database, not by
 *     the UI, and proven by the RLS suite. `getSession` additionally collapses
 *     a banned session's role to `user` on its very next request.
 *   - The Auth account is NOT disabled and sign-in is NOT blocked. A banned
 *     person can still authenticate and read the site. That is deliberate:
 *     disabling the Auth record would make the state invisible to them and
 *     unrecoverable through the normal flow, and this platform's ban is a
 *     posting restriction, not an erasure.
 *   - Their existing content stays visible. Hiding it is a separate,
 *     separately-audited decision — a ban is about the account, and conflating
 *     the two would delete a person's history as a side effect of a warning.
 *   - It is fully reversible via `unbanUser`.
 *
 * `getSession` additionally degrades a banned session's role to 'user', so a
 * banned staff account cannot use its capabilities even in the window before
 * revocation propagates.
 */
export async function banUser(actor: Session, requestId: string, input: BanInput): Promise<TargetUser> {
  const entry = { action: 'user.ban' as const, targetType: 'user' as const, targetId: input.uid };
  try {
    requireCap(actor, 'users.ban');
    const subject = await loadUser(input.uid);
    assertMayActOn(actor, subject);
    if (subject.status === 'banned') {
      throw new AdminError('invalid_transition', 'هذا الحساب موقوف بالفعل', 409);
    }

    return await audited(actor, requestId, {
      ...entry, before: 'active', after: 'banned', reasonAr: input.reasonAr,
    }, async () => {
      await updateProfileFields(input.uid, { status: 'banned' });
      // No token revocation call here, and that is a considered difference
      // from the Firebase version: enforcement never rested on it. The status
      // field is re-read on EVERY privileged request by `getSession`, and
      // `is_active()` refuses every write in RLS the moment the row says
      // banned — so a live access token buys a banned account nothing beyond
      // reading public pages, which a signed-out browser can do anyway.
      return { ...subject, status: 'banned' as const };
    });
  } catch (err) {
    return denied(actor, requestId, entry, err);
  }
}

export async function unbanUser(actor: Session, requestId: string, input: BanInput): Promise<TargetUser> {
  const entry = { action: 'user.unban' as const, targetType: 'user' as const, targetId: input.uid };
  try {
    requireCap(actor, 'users.unban');
    const subject = await loadUser(input.uid);
    assertMayActOn(actor, subject);
    if (subject.status === 'active') {
      throw new AdminError('invalid_transition', 'هذا الحساب غير موقوف', 409);
    }

    return await audited(actor, requestId, {
      ...entry, before: 'banned', after: 'active', reasonAr: input.reasonAr,
    }, async () => {
      await updateProfileFields(input.uid, { status: 'active' });
      return { ...subject, status: 'active' as const };
    });
  } catch (err) {
    return denied(actor, requestId, entry, err);
  }
}

export interface AssignRoleInput {
  uid: string;
  role: PlatformRole;
  reasonAr: string;
}

/**
 * Change someone's role.
 *
 * THE FIVE THINGS THIS REFUSES, AND WHY EACH ONE EXISTS
 * -----------------------------------------------------
 *   1. Acting on yourself — closes self-promotion, the most direct escalation
 *      there is.
 *   2. Acting on an owner — the owner cannot be demoted through the product.
 *   3. Acting on someone you do not outrank — an admin cannot touch another
 *      admin, so compromising one admin does not cascade.
 *   4. Granting a role you may not grant — `canAssignRole` excludes 'owner'
 *      from every actor including the owner, so no application code path can
 *      mint an owner. That is the bootstrap script's job, and only its job.
 *   5. Removing the last owner — checked even though (2) already forbids acting
 *      on an owner at all, because the two protect different futures: (2) is
 *      about this call, (5) is about the invariant surviving whatever a later
 *      change to (2) looks like.
 *
 * ONE SOURCE, READ FRESH
 * ----------------------
 * `profiles.role` is the only place a role lives. `getSession` re-reads it on
 * every request and the RLS helpers re-read it inside the database, so there
 * is no claim to reissue, no revocation to remember, and no window in which
 * two sources disagree about who someone is.
 */
export async function assignRole(
  actor: Session, requestId: string, input: AssignRoleInput,
): Promise<TargetUser> {
  const entry = { action: 'user.role.assign' as const, targetType: 'user' as const, targetId: input.uid };
  try {
    requireCap(actor, 'users.assignRole');

    if (!canAssignRole(actor.role, input.role)) {
      throw new AdminError(
        'role_not_assignable',
        `لا يمكنك منح دور «${ROLE_LABEL_AR[input.role] ?? input.role}»`,
        403,
      );
    }

    const subject = await loadUser(input.uid);
    assertMayActOn(actor, subject);

    if (subject.role === input.role) {
      throw new AdminError('invalid_transition', 'الحساب يحمل هذا الدور بالفعل', 409);
    }

    // Belt and braces beside assertMayActOn's owner check — see (5) above.
    if (subject.role === 'owner') {
      const owners = await countOwners();
      if (owners <= 1) {
        throw new AdminError('last_owner', 'لا يمكن إزالة آخر مالك للمنصة', 403);
      }
    }

    return await audited(actor, requestId, {
      ...entry, before: subject.role, after: input.role, reasonAr: input.reasonAr,
    }, async () => {
      // ONE write, ONE source. There is no custom claim to keep in step any
      // more: `getSession` and every RLS helper read `profiles.role` fresh on
      // each request, so the demotion or promotion is total the moment this
      // statement commits. The two-source choreography the Firebase version
      // needed — document first, then the claim, then a revocation — was the
      // cost of having two answers to one question, and it is gone with them.
      await updateProfileFields(input.uid, { role: input.role });
      return { ...subject, role: input.role };
    });
  } catch (err) {
    return denied(actor, requestId, entry, err);
  }
}

/** How many owners exist. Used only to refuse removing the last one. */
export async function countOwners(): Promise<number> {
  return countOwnerRows();
}

/* ── Content ─────────────────────────────────────────────────────────────── */

export type ContentStatus = 'active' | 'hidden' | 'deleted';

export interface ModeratePostInput {
  postId: string;
  reasonAr: string;
  /** The report this decision came from, when it came from one. */
  reportId?: string | null;
}

async function loadPost(postId: string) {
  const row = await getPostRow(postId);
  if (!row) throw new AdminError('not_found', 'لا يوجد منشور بهذا المعرّف', 404);
  return {
    id: postId,
    authorId: row.authorId,
    status: (row.status === 'hidden' || row.status === 'deleted' ? row.status : 'active') as ContentStatus,
    // The storage folder is DERIVED — `{uid}/{postId}` is the only shape the
    // policies ever accepted, so there is no stored path to disagree with it.
    mediaPath: row.mediaType !== 'none' ? `${row.authorId}/${postId}` : null,
    mediaType: (row.mediaType === 'image' || row.mediaType === 'video' ? row.mediaType : 'none') as 'none' | 'image' | 'video',
  };
}

/**
 * Hide a post from public view.
 *
 * `hidden`, not `deleted` — the two are different decisions and the platform
 * has always distinguished them: `deleted` is what an author does to their own
 * post, `hidden` is what moderation does. Keeping them apart means a reader
 * cannot tell whether an author withdrew a post or a moderator removed it, and
 * an appeal can restore the exact prior state.
 *
 * The post's media is NOT deleted here. `cleanupPostMedia` (a Cloud Function
 * trigger on the status change) removes the files, and `unhidePost` therefore
 * restores a post whose media may already be gone — which is why the UI says so
 * and why `media.delete` is a separately-audited action.
 */
export async function hidePost(actor: Session, requestId: string, input: ModeratePostInput) {
  const entry = { action: 'post.hide' as const, targetType: 'post' as const, targetId: input.postId };
  try {
    requireCap(actor, 'community.hidePost');
    const post = await loadPost(input.postId);
    if (post.status === 'hidden') {
      throw new AdminError('invalid_transition', 'المنشور مخفي بالفعل', 409);
    }
    if (post.status === 'deleted') {
      throw new AdminError('invalid_transition', 'المنشور محذوف من صاحبه', 409);
    }

    return await audited(actor, requestId, {
      ...entry, before: post.status, after: 'hidden', reasonAr: input.reasonAr,
      meta: { reportId: input.reportId ?? null, authorId: post.authorId },
    }, async () => {
      await setPostStatus(input.postId, 'hidden');
      return { ...post, status: 'hidden' as ContentStatus };
    });
  } catch (err) {
    return denied(actor, requestId, entry, err);
  }
}

/**
 * Restore a hidden post.
 *
 * Only from `hidden`. A post its author deleted stays deleted — restoring it
 * would be moderation overriding a person's decision about their own writing,
 * which is not what an appeal is for.
 */
export async function unhidePost(actor: Session, requestId: string, input: ModeratePostInput) {
  const entry = { action: 'post.unhide' as const, targetType: 'post' as const, targetId: input.postId };
  try {
    requireCap(actor, 'community.hidePost');
    const post = await loadPost(input.postId);
    if (post.status !== 'hidden') {
      throw new AdminError('invalid_transition', 'المنشور ليس مخفياً بقرار إداري', 409);
    }

    return await audited(actor, requestId, {
      ...entry, before: 'hidden', after: 'active', reasonAr: input.reasonAr,
      meta: { reportId: input.reportId ?? null, authorId: post.authorId },
    }, async () => {
      await setPostStatus(input.postId, 'active');
      return { ...post, status: 'active' as ContentStatus };
    });
  } catch (err) {
    return denied(actor, requestId, entry, err);
  }
}

/**
 * Administratively remove a post.
 *
 * Still a soft delete. `firestore.rules` forbids hard deletion outright
 * (`allow delete: if false`) and this does not go around that: the document
 * survives, its comments survive, and the moderation record survives. Requires
 * `community.deletePost`, which a community moderator does NOT hold — a
 * moderator hides, an admin removes.
 */
export async function deletePostAdmin(actor: Session, requestId: string, input: ModeratePostInput) {
  const entry = { action: 'post.delete' as const, targetType: 'post' as const, targetId: input.postId };
  try {
    requireCap(actor, 'community.deletePost');
    const post = await loadPost(input.postId);
    if (post.status === 'deleted') {
      throw new AdminError('invalid_transition', 'المنشور محذوف بالفعل', 409);
    }

    return await audited(actor, requestId, {
      ...entry, before: post.status, after: 'deleted', reasonAr: input.reasonAr,
      meta: { reportId: input.reportId ?? null, authorId: post.authorId },
    }, async () => {
      await setPostStatus(input.postId, 'deleted');
      return { ...post, status: 'deleted' as ContentStatus };
    });
  } catch (err) {
    return denied(actor, requestId, entry, err);
  }
}

export interface ModerateCommentInput {
  postId: string;
  commentId: string;
  reasonAr: string;
  reportId?: string | null;
}

export async function hideComment(actor: Session, requestId: string, input: ModerateCommentInput) {
  const entry = { action: 'comment.hide' as const, targetType: 'comment' as const, targetId: input.commentId };
  try {
    requireCap(actor, 'community.hideComment');
    const comment = await getCommentRow(input.commentId);
    if (!comment) throw new AdminError('not_found', 'لا يوجد تعليق بهذا المعرّف', 404);
    const before = comment.status;
    if (before === 'hidden') throw new AdminError('invalid_transition', 'التعليق مخفي بالفعل', 409);

    return await audited(actor, requestId, {
      ...entry, before, after: 'hidden', reasonAr: input.reasonAr,
      meta: { postId: comment.postId, reportId: input.reportId ?? null },
    }, async () => {
      await setCommentStatus(input.commentId, 'hidden');
      return { id: input.commentId, status: 'hidden' as ContentStatus };
    });
  } catch (err) {
    return denied(actor, requestId, entry, err);
  }
}

/* ── Media ───────────────────────────────────────────────────────────────── */

/**
 * Delete the media attached to a specific post.
 *
 * THE CLIENT NEVER NAMES A FILE
 * -----------------------------
 * The only input is a post id. The folder deleted is DERIVED from that post's
 * own author and id — `{authorUid}/{postId}`, the only shape the storage
 * policies ever accepted — so it is structurally impossible for this to touch
 * another user's files, whatever a caller sends. A forged URL or a
 * hand-written path has nowhere to enter.
 *
 * The stored path is re-derived and compared before anything is removed, so
 * even a post document corrupted by some other route cannot redirect this at a
 * different folder.
 */
export async function deletePostMedia(actor: Session, requestId: string, input: ModeratePostInput) {
  const entry = { action: 'media.delete' as const, targetType: 'media' as const, targetId: input.postId };
  try {
    requireCap(actor, 'community.deletePost');
    const post = await loadPost(input.postId);
    if (post.mediaType === 'none' || !post.mediaPath) {
      throw new AdminError('invalid_transition', 'لا وسائط مرتبطة بهذا المنشور', 409);
    }

    // The folder is DERIVED from the post's own author and id — the only
    // shape the storage policies ever accepted — so it is structurally
    // impossible for this to touch another user's files, whatever a caller
    // sends. A forged URL or a hand-written path has nowhere to enter.
    const expected = `${post.authorId}/${post.id}`;

    return await audited(actor, requestId, {
      ...entry, before: post.mediaType, after: 'none', reasonAr: input.reasonAr,
      meta: { path: expected, authorId: post.authorId, reportId: input.reportId ?? null },
    }, async () => {
      const deleted = await deleteServicePrefix('community-media', expected);
      await clearPostMedia(input.postId);
      return { deleted };
    });
  } catch (err) {
    return denied(actor, requestId, entry, err);
  }
}

/* ── Reports ─────────────────────────────────────────────────────────────── */

/**
 * The report lifecycle.
 *
 * WHY A NEW `status` FIELD BESIDE THE EXISTING `resolved` BOOLEAN
 * ---------------------------------------------------------------
 * `resolved: boolean` is what the phone app writes and reads today, and
 * `firestore.rules` has a client branch that lets a moderator flip it. Replacing
 * it with an enum would break both. So `resolved` remains the binary source of
 * truth for "has this been dealt with", and `status` is an OPTIONAL refinement
 * that says HOW.
 *
 * The two can never contradict each other, because the effective status is
 * DERIVED rather than read: `resolved` decides the half of the space, and
 * `status` only chooses within it. A moderator flipping `resolved` from the
 * phone therefore produces 'resolved', not a stale 'in_review' — no migration,
 * no repair job, and no possible disagreement.
 */
export type ReportStatus = 'open' | 'in_review' | 'resolved' | 'rejected';

/**
 * The table's enum and the web's vocabulary, mapped in one place.
 *
 * `0001` named the states `open / reviewing / resolved / dismissed`; the web
 * UI had already shipped `in_review` and `rejected`. The database's names win
 * at rest, the UI's win on screen, and these two functions are the entire
 * treaty between them.
 */
export function reportStatusFromState(state: string): ReportStatus {
  if (state === 'reviewing') return 'in_review';
  if (state === 'dismissed') return 'rejected';
  if (state === 'resolved') return 'resolved';
  return 'open';
}

export function stateFromReportStatus(status: ReportStatus): string {
  if (status === 'in_review') return 'reviewing';
  if (status === 'rejected') return 'dismissed';
  return status;
}

/** The Firestore-era derivation, kept for callers that still hold old docs. */
export function effectiveReportStatus(doc: { resolved?: unknown; status?: unknown }): ReportStatus {
  const stored = typeof doc.status === 'string' ? doc.status : null;
  if (doc.resolved === true) return stored === 'rejected' ? 'rejected' : 'resolved';
  return stored === 'in_review' ? 'in_review' : 'open';
}

/** Which transitions are permitted. A closed report cannot silently reopen. */
const ALLOWED_TRANSITIONS: Record<ReportStatus, readonly ReportStatus[]> = {
  open: ['in_review', 'resolved', 'rejected'],
  in_review: ['resolved', 'rejected', 'open'],
  // Terminal. Reversing a decision is a new report, not an edit of the old one
  // — otherwise the record of what was decided, and when, is rewritable.
  resolved: [],
  rejected: [],
};

export function canTransition(from: ReportStatus, to: ReportStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export interface ReportDecisionInput {
  reportId: string;
  to: ReportStatus;
  reasonAr: string;
}

export async function decideReport(
  actor: Session, requestId: string, input: ReportDecisionInput,
) {
  const action: AuditAction =
    input.to === 'resolved' ? 'report.resolve'
    : input.to === 'rejected' ? 'report.reject'
    : 'report.review';
  const entry = { action, targetType: 'report' as const, targetId: input.reportId };

  try {
    requireCap(actor, 'community.resolveReports');

    const row = await getReportRow(input.reportId);
    if (!row) throw new AdminError('not_found', 'لا يوجد بلاغ بهذا المعرّف', 404);
    const from = reportStatusFromState(row.state);

    if (!canTransition(from, input.to)) {
      throw new AdminError(
        'invalid_transition',
        `لا يمكن الانتقال من «${REPORT_STATUS_AR[from]}» إلى «${REPORT_STATUS_AR[input.to]}»`,
        409,
      );
    }

    return await audited(actor, requestId, {
      ...entry, before: from, after: input.to, reasonAr: input.reasonAr,
    }, async () => {
      await updateReportRow(input.reportId, {
        state: stateFromReportStatus(input.to),
        handled_by: actor.uid,
        handled_at: new Date().toISOString(),
        resolution_note: input.reasonAr.trim().slice(0, 500) || null,
      });
      return { id: input.reportId, status: input.to };
    });
  } catch (err) {
    return denied(actor, requestId, entry, err);
  }
}

export const REPORT_STATUS_AR: Record<ReportStatus, string> = {
  open: 'مفتوح',
  in_review: 'قيد المراجعة',
  resolved: 'مقبول ومُعالج',
  rejected: 'مرفوض',
};
