/**
 * Platform roles and what each one is actually allowed to do.
 *
 * WHY THIS LIVES IN THE SHARED CORE
 * ---------------------------------
 * Because the phone app, the web app, the Cloud Functions and the Firestore
 * rules must all agree on what «مشرف» means. If the web invented its own role
 * list, a moderator would have one set of powers in the app and another on the
 * site, and the difference would be discovered by a user doing something they
 * should not have been able to do.
 *
 * The rules file cannot import TypeScript, so `firestore.rules` restates the
 * capability checks by hand — but it restates THESE names, and
 * `scripts/testAdminRoles.ts` asserts the two have not drifted apart. That
 * assertion is not decoration: the first thing it found was that the rules
 * already let a `moderator` ban a user while this file said they could not.
 *
 * WHAT THIS FILE IS NOT
 * ---------------------
 * It is not the security boundary. Nothing here is trusted from a browser. A
 * role is read from a source the client cannot write to (a Firebase custom
 * claim, or the `users/{uid}` document whose `role` field has no client write
 * path), and every privileged action is checked again on the server before it
 * runs. This file only answers "given a verified role, is this allowed?" —
 * consistently, in one place, for every surface.
 *
 * ON EXTENDING RATHER THAN REPLACING
 * ----------------------------------
 * `user` and `moderator` already exist in production data and in
 * `firestore.rules`, which calls `isModerator()` in many places. Their meaning
 * is deliberately unchanged: `moderator` is still exactly "community
 * moderator", with exactly the powers it had. The four new roles are additions
 * beside it, not a re-shuffle around it — a re-shuffle would silently change
 * what existing accounts can do.
 */

/**
 * Every role the platform recognises, ordered from least to most privileged.
 *
 * The order is meaningful: `roleAtLeast` uses it. But privilege is NOT purely
 * hierarchical — see `ROLE_CAPABILITIES`, where an `editor` can touch teaching
 * content that a `moderator` cannot, and a `moderator` can hide posts that an
 * `editor` cannot. Ranking is a convenience for "is this person staff at all",
 * never the authority for a specific action.
 */
export const PLATFORM_ROLES = [
  'user',
  'moderator',
  'reviewer',
  'editor',
  'admin',
  'owner',
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const ROLE_LABEL_AR: Record<PlatformRole, string> = {
  user: 'مستخدم',
  moderator: 'مشرف مجتمع',
  reviewer: 'مراجع محتوى',
  editor: 'محرر',
  admin: 'مدير',
  owner: 'مالك المنصة',
};

export const ROLE_DESCRIPTION_AR: Record<PlatformRole, string> = {
  user: 'الدور الافتراضي: ينشر ويعلّق ويبلّغ، ويملك بياناته ومشروعه وحده.',
  moderator: 'يراجع بلاغات المجتمع ويخفي المحالف منها. لا يمسّ الأدوار ولا المحتوى التعليمي.',
  reviewer: 'يقرأ لوحة الإدارة ويراجع البلاغات والمحتوى، بلا صلاحية تعديل أو حذف.',
  editor: 'يحرّر المحتوى التعليمي ومصادره وإصداراته. لا يدير مستخدمين ولا أدواراً.',
  admin: 'يدير المستخدمين والمحتوى والبلاغات. لا يمسّ المالك ولا يمنح دور المالك.',
  owner: 'صلاحية كاملة، بما فيها منح الأدوار. لا يُحذف ولا يُخفَّض من الواجهة.',
};

/**
 * Every privileged thing the platform can do.
 *
 * Named per ACTION rather than per screen on purpose: a screen can move or be
 * split, and if permissions were keyed to screens they would have to be
 * rewritten every time the UI changed. An action is stable.
 */
export const CAPABILITIES = [
  // Reading the admin surface at all.
  'admin.access',

  // Community moderation.
  'community.viewReports',
  'community.resolveReports',
  'community.hidePost',
  'community.deletePost',
  'community.hideComment',

  // User administration.
  'users.list',
  'users.viewDetail',
  'users.ban',
  'users.unban',
  'users.assignRole',
  'users.assignPrivilegedRole',

  // Teaching content.
  'content.edit',
  'content.publish',

  // The audit trail.
  'audit.view',

  // The store.
  //
  // Split into four rather than one «store.manage» because they are genuinely
  // different powers: reading orders to fulfil them is a daily job, seeing what
  // we pay suppliers is commercially sensitive, and setting the margin decides
  // whether the shop makes money. A single capability would hand all three to
  // whoever needs the first.
  'store.viewOrders',
  'store.manageOrders',
  'store.editProducts',
  'store.viewSupply',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

/**
 * Least privilege, written out explicitly.
 *
 * Deliberately NOT expressed as "role X inherits everything from role Y". A
 * cascade reads compactly and then grants something nobody intended the moment
 * a capability is added to a lower tier. Listing each role's powers in full
 * means adding a capability grants it to nobody until someone writes it down.
 */
export const ROLE_CAPABILITIES: Record<PlatformRole, readonly Capability[]> = {
  user: [],

  // Exactly the powers `firestore.rules`' isModerator() already grants today —
  // including banning, which is the reconciliation this list needed.
  //
  // `users.ban`/`users.unban` were missing here while the rules' users/{uid}
  // update branch has always let a moderator flip another account's `status`
  // between 'active' and 'banned' from the client, and the phone's admin
  // dashboard uses exactly that. So the model was wrong, not the rules. The fix
  // is to record what a moderator can actually do rather than to take a power
  // away from live accounts, which is what "preserve the meaning of the
  // existing role" requires. `users.viewDetail` comes with it: being able to
  // ban someone you cannot look at first is not a coherent permission.
  moderator: [
    'admin.access',
    'community.viewReports',
    'community.resolveReports',
    'community.hidePost',
    'community.hideComment',
    'users.list',
    'users.viewDetail',
    'users.ban',
    'users.unban',
  ],

  // Deliberately read-only. A reviewer exists so someone can audit the queue
  // without being able to change it.
  reviewer: [
    'admin.access',
    'community.viewReports',
    'users.list',
    'audit.view',
  ],

  // Teaching content only. An editor has no power over people.
  editor: [
    'admin.access',
    'content.edit',
    'content.publish',
    'users.list',
  ],

  admin: [
    'admin.access',
    'community.viewReports',
    'community.resolveReports',
    'community.hidePost',
    'community.deletePost',
    'community.hideComment',
    'users.list',
    'users.viewDetail',
    'users.ban',
    'users.unban',
    'users.assignRole',
    'content.edit',
    'content.publish',
    'audit.view',
    // The store, in full. An admin runs the business; the split between these
    // four exists so a future fulfilment role can be given the first two
    // without ever seeing what we pay a supplier.
    'store.viewOrders',
    'store.manageOrders',
    'store.editProducts',
    'store.viewSupply',
  ],

  // The only role that may create other privileged roles.
  owner: [...CAPABILITIES],
};

/** The roles an `admin` may hand out. Notably excludes `admin` and `owner`. */
export const ROLES_ASSIGNABLE_BY_ADMIN: readonly PlatformRole[] = [
  'user', 'moderator', 'reviewer', 'editor',
];

/** The roles an `owner` may hand out — everything except minting another owner. */
export const ROLES_ASSIGNABLE_BY_OWNER: readonly PlatformRole[] = [
  'user', 'moderator', 'reviewer', 'editor', 'admin',
];

export function isPlatformRole(v: unknown): v is PlatformRole {
  return typeof v === 'string' && (PLATFORM_ROLES as readonly string[]).includes(v);
}

/**
 * Normalise whatever came out of storage into a role.
 *
 * Anything unrecognised — absent, misspelled, a value from a future version,
 * or an outright forgery — becomes `user`. Failing closed is the only correct
 * behaviour: an unknown role must never be treated as more privileged than the
 * default.
 */
export function toRole(v: unknown): PlatformRole {
  return isPlatformRole(v) ? v : 'user';
}

/** Does this verified role hold this capability? */
export function can(role: PlatformRole, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role].includes(capability);
}

/** Rank, for "is this person staff at all" questions only. */
export function roleRank(role: PlatformRole): number {
  return PLATFORM_ROLES.indexOf(role);
}

export function roleAtLeast(role: PlatformRole, minimum: PlatformRole): boolean {
  return roleRank(role) >= roleRank(minimum);
}

/** True for any role that may open the admin surface at all. */
export function isStaff(role: PlatformRole): boolean {
  return can(role, 'admin.access');
}

/**
 * Which roles `actor` is allowed to grant.
 *
 * Three rules are enforced here rather than at each call site, because each one
 * has been the source of a real privilege-escalation bug in some system:
 *
 *   1. Only `admin` and `owner` may assign at all.
 *   2. Nobody may grant a role they do not themselves outrank — this is what
 *      stops an admin from minting another admin, or an owner.
 *   3. `owner` is never assignable through the application. It is granted by a
 *      server-side operator tool, so a compromised admin session cannot create
 *      an account that outranks every other.
 */
export function assignableRoles(actor: PlatformRole): readonly PlatformRole[] {
  if (actor === 'owner') return ROLES_ASSIGNABLE_BY_OWNER;
  if (actor === 'admin') return ROLES_ASSIGNABLE_BY_ADMIN;
  return [];
}

export function canAssignRole(actor: PlatformRole, target: PlatformRole): boolean {
  return assignableRoles(actor).includes(target);
}

/**
 * Can `actor` act on `subject` at all?
 *
 * The owner is untouchable by anyone but themselves, and nobody may act on
 * their own account through the admin surface — self-service ban and
 * self-promotion are both closed by this one check.
 */
export function canActOnUser(
  actor: { uid: string; role: PlatformRole },
  subject: { uid: string; role: PlatformRole },
): boolean {
  if (actor.uid === subject.uid) return false;
  if (subject.role === 'owner') return false;
  return roleRank(actor.role) > roleRank(subject.role);
}
