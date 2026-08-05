import 'server-only';

import { randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebaseAdmin';
import { ROLE_CAPABILITIES } from '@core/data/auth/roles';
import type { Session } from './session';

/**
 * The audit trail for administrative actions.
 *
 * WHY IT IS APPEND-ONLY AND WHY IT IS WRITTEN SERVER-SIDE
 * ------------------------------------------------------
 * An audit log that the actor can edit is not an audit log. This writes through
 * the Admin SDK from the server, and `firestore.rules` closes the collection to
 * every client completely — read, create, update and delete alike. Reads happen
 * only here, behind `requireCapability('audit.view')`.
 *
 * That total closure is deliberately narrower than granting a client read to
 * roles holding `audit.view`: an admin page is server-rendered and needs no
 * client access, and a log a client can query is a log whose access nobody can
 * account for. (An earlier version of this comment claimed a client read
 * allowance existed. It did not — there was no rule for the collection at all,
 * so the claim was doubly wrong. `scripts/testCommunityRules.ts` now proves the
 * closure directly.)
 *
 * WHAT IS RECORDED, AND WHAT IS NOT
 * ---------------------------------
 * Who acted, the role AND capabilities they held at that moment, what they did,
 * to what, why, when, the before/after of the specific field that changed, the
 * outcome, and a request id that ties the entry to the HTTP request that caused
 * it. Deliberately NOT recorded: the actor's IP, the subject's full document,
 * post or comment bodies, media URLs, or anything the action did not touch — an
 * audit trail that accumulates personal data becomes its own liability.
 *
 * WHY THE CAPABILITIES ARE SNAPSHOTTED
 * ------------------------------------
 * Roles change. Reading an old entry and looking up what `admin` can do TODAY
 * answers the wrong question — the one that matters is what this person was
 * permitted to do at the moment they acted. Storing the set makes the entry
 * self-contained evidence rather than a pointer into mutable configuration.
 *
 * FAILURES ARE RECORDED TOO
 * -------------------------
 * `result: 'denied'` entries exist so a refused privileged attempt leaves a
 * trace. A log that only contains successes cannot answer "did someone try?",
 * which is the question an audit log is most often opened to answer.
 */

export type AuditAction =
  | 'user.role.assign'
  | 'user.ban'
  | 'user.unban'
  | 'post.hide'
  | 'post.unhide'
  | 'post.delete'
  | 'comment.hide'
  | 'comment.unhide'
  | 'report.resolve'
  | 'report.reject'
  | 'report.review'
  | 'media.delete'
  | 'owner.grant'
  // The store. An order's status decides whether somebody's money and
  // hardware move, so it is audited exactly like a ban is.
  | 'store.order.status'
  // What we pay a supplier, and therefore what we charge. Audited because a
  // margin change moves every price it touches.
  | 'store.supply.set'
  // Taking a product off the shop, or putting it back. The nearest thing the
  // store has to a delete, and audited for the same reason a ban is: it removes
  // something customers could see, and somebody should be able to ask who.
  | 'store.product.publish'
  // Availability, images, specs and the editorial copy. One action rather than
  // five, because they are saved together by one screen.
  | 'store.product.edit'
  // The gallery. Separate from an edit because it is a different job done at a
  // different time, and because «who put that photograph on the site» is a
  // question somebody eventually asks.
  | 'store.product.images'
  // The margin, the review window and the shop-wide notices. One action for
  // the settings screen — a margin change moves every price it touches.
  | 'store.settings'
  // A judgement the system declined to make. Recorded because «who decided to
  // keep selling that» is a question with consequences.
  | 'store.decision'
  // A bulk edit of supplier costs. Audited as one entry naming how many rows
  // moved, because fifty separate entries is a log nobody reads.
  | 'store.import'
  // The project library. Writing a project and publishing it are separate
  // entries for the same reason the store's are: one is authorship, the other
  // is the decision that put it in front of readers, and «who published that»
  // is the question somebody asks when a page turns out to be wrong.
  | 'project.edit'
  | 'project.publish';

export type AuditResult = 'ok' | 'denied' | 'error';

export type AuditTargetType =
  'user' | 'post' | 'comment' | 'report' | 'media' | 'order' | 'product'
  // A project in the library. Not `product`: they live in different
  // collections, are edited by different roles, and conflating them would make
  // «every action on product X» return somebody else's article.
  | 'project';

export interface AuditEntry {
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  /** Only the field that changed, before and after. */
  before?: string | null;
  after?: string | null;
  /** Free-text reason the actor supplied, when the action asks for one. */
  reasonAr?: string | null;
  result?: AuditResult;
  /** Short, non-sensitive extra context. Never a document body. */
  meta?: Record<string, string | number | boolean | null>;
  /** Present when result is 'denied' or 'error'. A message, never a stack. */
  error?: string | null;
}

/**
 * A correlation id for one HTTP request.
 *
 * Generated per request and threaded into every audit entry it produces, so a
 * single action that touches several documents (hiding a post AND resolving the
 * report that prompted it) reads back as one event rather than as unrelated
 * rows that happen to share a timestamp.
 */
export function newRequestId(): string {
  return randomUUID();
}

/**
 * The actor's identity, frozen at the moment of the action.
 *
 * Not a `Session` because an audit entry must also be writable for an actor
 * resolved outside a browser session — the owner-bootstrap script has no
 * cookie, and its grant is the single most important thing in this log.
 */
export interface AuditActor {
  uid: string;
  role: Session['role'];
  email: string | null;
}

export function actorFromSession(session: Session): AuditActor {
  return { uid: session.uid, role: session.role, email: session.email };
}

/**
 * Append one entry.
 *
 * Throws on failure, and every caller writes the log BEFORE performing a
 * destructive action — so an action that cannot be recorded does not happen.
 * That ordering costs a rare "logged but not applied" entry when the action
 * itself then fails; that entry is corrected to `result: 'error'`, which is
 * strictly better than an applied action with no record of it.
 */
export async function logAudit(
  actor: AuditActor,
  requestId: string,
  entry: AuditEntry,
): Promise<string> {
  const ref = await adminDb().collection('auditLog').add({
    actorUid: actor.uid,
    actorRole: actor.role,
    actorEmail: actor.email,
    // What they were permitted to do at this instant — see the header.
    actorCapabilities: [...(ROLE_CAPABILITIES[actor.role] ?? [])],
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    before: entry.before ?? null,
    after: entry.after ?? null,
    reasonAr: entry.reasonAr?.trim() ? entry.reasonAr.trim().slice(0, 500) : null,
    result: entry.result ?? 'ok',
    error: entry.error ?? null,
    meta: entry.meta ?? null,
    requestId,
    // Server time, from the database's own clock. A client clock is trivially
    // wrong and trivially forged, and an entry's timestamp is half its value.
    at: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

/** Mark an already-written entry with the outcome the action actually had. */
export async function markAuditResult(
  entryId: string,
  result: AuditResult,
  error?: string,
): Promise<void> {
  await adminDb().collection('auditLog').doc(entryId).update({
    result,
    error: error ?? null,
  });
}

/**
 * Record a refused attempt without letting the recording failure mask the
 * refusal.
 *
 * A denial is already the unhappy path; if writing the log then throws, the
 * caller must still return 403 rather than 500, or an attacker learns to
 * distinguish "forbidden" from "forbidden and unlogged".
 */
export async function logDenied(
  actor: AuditActor,
  requestId: string,
  entry: Omit<AuditEntry, 'result'> & { error: string },
): Promise<void> {
  await logAudit(actor, requestId, { ...entry, result: 'denied' }).catch(() => {});
}

export interface AuditRecord {
  id: string;
  actorUid: string;
  actorRole: string;
  actorEmail: string | null;
  actorCapabilities: string[];
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  before: string | null;
  after: string | null;
  reasonAr: string | null;
  result: AuditResult;
  error: string | null;
  requestId: string;
  at: string | null;
}

/**
 * Read the trail, newest first.
 *
 * Server-only and capability-gated by its caller. A filter narrows by a single
 * equality field; combining one with the `at` ordering is a composite index in
 * production, which is why only one filter is accepted at a time rather than
 * building an arbitrary query a caller could make expensive.
 */
export async function listAudit(opts: {
  limit?: number;
  actorUid?: string;
  targetId?: string;
  action?: AuditAction;
} = {}): Promise<AuditRecord[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);

  const base = adminDb().collection('auditLog');
  const filtered = opts.actorUid ? base.where('actorUid', '==', opts.actorUid)
    : opts.targetId ? base.where('targetId', '==', opts.targetId)
    : opts.action ? base.where('action', '==', opts.action)
    : base;

  const snap = await filtered.orderBy('at', 'desc').limit(limit).get();
  return snap.docs.map(d => {
    const v = d.data();
    return {
      id: d.id,
      actorUid: String(v.actorUid ?? ''),
      actorRole: String(v.actorRole ?? 'user'),
      actorEmail: typeof v.actorEmail === 'string' ? v.actorEmail : null,
      actorCapabilities: Array.isArray(v.actorCapabilities) ? v.actorCapabilities.map(String) : [],
      action: v.action as AuditAction,
      targetType: v.targetType as AuditTargetType,
      targetId: String(v.targetId ?? ''),
      before: v.before ?? null,
      after: v.after ?? null,
      reasonAr: v.reasonAr ?? null,
      result: (v.result ?? 'ok') as AuditResult,
      error: v.error ?? null,
      requestId: String(v.requestId ?? ''),
      at: v.at?.toDate?.().toISOString() ?? null,
    };
  });
}
