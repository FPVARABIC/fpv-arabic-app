import 'server-only';

import { adminDb } from './firebaseAdmin';
import type { Session } from './session';

/**
 * The audit trail for administrative actions.
 *
 * WHY IT IS APPEND-ONLY AND WHY IT IS WRITTEN SERVER-SIDE
 * ------------------------------------------------------
 * An audit log that the actor can edit is not an audit log. This writes through
 * the Admin SDK from the server, and `firestore.rules` gives NO client any
 * write, update or delete access to the collection — reads are limited to roles
 * holding `audit.view`. The result is a record that even the administrator who
 * created it cannot alter.
 *
 * WHAT IS RECORDED, AND WHAT IS NOT
 * ---------------------------------
 * Who acted, what they did, to what, when, and the before/after of the specific
 * field that changed. Deliberately NOT recorded: the actor's IP, the full
 * subject document, or anything about content the action did not touch —
 * an audit trail that accumulates personal data becomes its own liability.
 *
 * FAILURE POLICY
 * --------------
 * A failed audit write must never silently succeed. `logAudit` throws, and
 * callers write the log BEFORE performing a destructive action, so an action
 * that cannot be recorded does not happen.
 */

export type AuditAction =
  | 'user.role.assign'
  | 'user.ban'
  | 'user.unban'
  | 'post.hide'
  | 'post.unhide'
  | 'post.delete'
  | 'comment.hide'
  | 'report.resolve';

export interface AuditEntry {
  action: AuditAction;
  /** The document the action targeted. */
  targetType: 'user' | 'post' | 'comment' | 'report';
  targetId: string;
  /** Only the field that changed, before and after. */
  before?: string | null;
  after?: string | null;
  /** Free-text reason the actor supplied, when the action asks for one. */
  reasonAr?: string;
}

export async function logAudit(actor: Session, entry: AuditEntry): Promise<void> {
  await adminDb().collection('auditLog').add({
    actorUid: actor.uid,
    actorRole: actor.role,
    actorEmail: actor.email,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    before: entry.before ?? null,
    after: entry.after ?? null,
    reasonAr: entry.reasonAr ?? null,
    // Server time, not client time: a client clock is trivially wrong and
    // trivially forged, and an audit entry's timestamp is half its value.
    at: new Date().toISOString(),
  });
}
