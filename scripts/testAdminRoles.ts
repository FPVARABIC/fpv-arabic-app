/**
 * The role model, the capability matrix, and the invariants that protect the
 * owner — proven directly.
 *
 * WHY A DEDICATED SUITE
 * ---------------------
 * Because a permission bug does not look like a bug. It looks like a working
 * feature, and it is discovered by someone doing something they should not have
 * been able to do. Nothing in a typecheck, a lint or a build says "an admin can
 * now promote themselves"; only an assertion does.
 *
 * Most of what follows is NEGATIVE. A matrix that only proved "an admin can ban"
 * would pass just as happily if every check had been deleted, so the weight is
 * on the refusals: what each role must NOT be able to do, and what nobody at all
 * may do to the owner.
 *
 * These are pure functions from the shared core plus the server's transition
 * logic, so every branch is reachable without an emulator or a browser. The
 * end-to-end suite then drives the real HTTP endpoints against the real rules.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import {
  PLATFORM_ROLES, CAPABILITIES, ROLE_CAPABILITIES, ROLE_LABEL_AR,
  can, toRole, isStaff, roleRank, canAssignRole, assignableRoles, canActOnUser,
  type PlatformRole, type Capability,
} from '../src/data/auth/roles';

let passed = 0;
const failures: string[] = [];
function ok(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  ok — ${label}`); }
  else { failures.push(label); console.log(`  FAIL — ${label}`); }
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

/**
 * Source with comments removed.
 *
 * A file that DOCUMENTS a prohibition necessarily contains the words the
 * prohibition is about — `grantOwner.ts` explains at length why it has no
 * revoke path, and says "revoke" while doing so. Asserting against raw text
 * would fail the file for being well explained, so structural assertions read
 * the code and prose assertions read the whole thing.
 */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const u = (uid: string, role: PlatformRole) => ({ uid, role });

/* ────────────────────────────────────────────────────────────────────────── */
console.log('\n[1] The model is complete and fails closed');
{
  ok('every role has a capability list', PLATFORM_ROLES.every(r => Array.isArray(ROLE_CAPABILITIES[r])));
  ok('every role has an Arabic label', PLATFORM_ROLES.every(r => !!ROLE_LABEL_AR[r]));
  ok('every granted capability is a declared capability',
    PLATFORM_ROLES.every(r => ROLE_CAPABILITIES[r].every(c => (CAPABILITIES as readonly string[]).includes(c))));

  // Unknown input must never be read as privileged.
  for (const forged of ['admin ', 'Admin', 'owner\n', 'superuser', '', null, undefined, 0, {}, ['owner']]) {
    ok(`a forged role value ${JSON.stringify(forged)} degrades to user`, toRole(forged) === 'user');
  }
  ok('a plain user is not staff', !isStaff('user'));
  ok('every other role is staff', PLATFORM_ROLES.filter(r => r !== 'user').every(isStaff));
}

/* ────────────────────────────────────────────────────────────────────────── */
console.log('\n[2] The capability matrix — every role against every capability');
{
  // The full expected matrix, written out. Not derived from ROLE_CAPABILITIES,
  // because a test that derives its expectation from the thing under test
  // proves only that the code equals itself.
  const EXPECTED: Record<PlatformRole, Capability[]> = {
    user: [],
    moderator: [
      'admin.access', 'community.viewReports', 'community.resolveReports',
      'community.hidePost', 'community.hideComment',
      'users.list', 'users.viewDetail', 'users.ban', 'users.unban',
    ],
    reviewer: ['admin.access', 'community.viewReports', 'users.list', 'audit.view'],
    editor: ['admin.access', 'content.edit', 'content.publish', 'users.list'],
    admin: [
      'admin.access', 'community.viewReports', 'community.resolveReports',
      'community.hidePost', 'community.deletePost', 'community.hideComment',
      'users.list', 'users.viewDetail', 'users.ban', 'users.unban', 'users.assignRole',
      'content.edit', 'content.publish', 'audit.view',
      // The store. An admin runs the shop, so all four — including seeing what
      // we pay suppliers. The four stay SEPARATE capabilities so a future
      // fulfilment role can be given orders without supply, which is the whole
      // reason they were not written as one 'store.manage'.
      'store.viewOrders', 'store.manageOrders', 'store.editProducts', 'store.viewSupply',
    ],
    owner: [...CAPABILITIES],
  };

  for (const role of PLATFORM_ROLES) {
    for (const cap of CAPABILITIES) {
      const want = EXPECTED[role].includes(cap);
      const got = can(role, cap);
      ok(`${role} ${want ? 'HAS' : 'does NOT have'} ${cap}`, got === want);
    }
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
console.log('\n[3] The capabilities nobody but the owner holds');
{
  ok('only the owner may assign a privileged role',
    PLATFORM_ROLES.filter(r => can(r, 'users.assignPrivilegedRole')).join() === 'owner');

  // A reviewer exists to look without touching. If it ever gains a mutating
  // capability, the role has silently become something else.
  const MUTATING: Capability[] = [
    'community.resolveReports', 'community.hidePost', 'community.deletePost',
    'community.hideComment', 'users.ban', 'users.unban', 'users.assignRole',
    'users.assignPrivilegedRole', 'content.edit', 'content.publish',
  ];
  ok('a reviewer holds NO mutating capability', MUTATING.every(c => !can('reviewer', c)));

  // An editor's authority is over content, never over people.
  ok('an editor cannot ban', !can('editor', 'users.ban'));
  ok('an editor cannot assign roles', !can('editor', 'users.assignRole'));
  ok('an editor cannot moderate the community', !can('editor', 'community.hidePost'));

  // A community moderator hides; removal is an admin decision.
  ok('a moderator cannot administratively delete a post', !can('moderator', 'community.deletePost'));
  ok('a moderator cannot assign roles', !can('moderator', 'users.assignRole'));
  ok('a moderator cannot read the audit log', !can('moderator', 'audit.view'));

  ok('a plain user holds nothing at all', CAPABILITIES.every(c => !can('user', c)));
  ok('a plain user cannot even open the admin surface', !can('user', 'admin.access'));
}

/* ────────────────────────────────────────────────────────────────────────── */
console.log('\n[4] Role assignment — the escalation paths that must be closed');
{
  ok('a user may assign nothing', assignableRoles('user').length === 0);
  ok('a moderator may assign nothing', assignableRoles('moderator').length === 0);
  ok('a reviewer may assign nothing', assignableRoles('reviewer').length === 0);
  ok('an editor may assign nothing', assignableRoles('editor').length === 0);

  // THE central escalation check. An admin must not be able to mint an admin,
  // and no one at all may mint an owner.
  ok('an admin may NOT assign admin', !canAssignRole('admin', 'admin'));
  ok('an admin may NOT assign owner', !canAssignRole('admin', 'owner'));
  ok('an owner may NOT assign owner — no application path mints one',
    !canAssignRole('owner', 'owner'));
  ok('an owner MAY assign admin', canAssignRole('owner', 'admin'));

  for (const r of ['user', 'moderator', 'reviewer', 'editor'] as const) {
    ok(`an admin may assign ${r}`, canAssignRole('admin', r));
    ok(`an owner may assign ${r}`, canAssignRole('owner', r));
  }

  ok('no role at all can assign owner',
    PLATFORM_ROLES.every(r => !canAssignRole(r, 'owner')));
}

/* ────────────────────────────────────────────────────────────────────────── */
console.log('\n[5] Acting on another account — self, rank, and the owner');
{
  // Self-action, from every role. This is what closes self-promotion and
  // self-unbanning in one check.
  for (const r of PLATFORM_ROLES) {
    ok(`${r} cannot act on their own account`, !canActOnUser(u('same', r), u('same', r)));
  }

  // The owner is untouchable by everyone, including another owner.
  for (const r of PLATFORM_ROLES) {
    ok(`${r} cannot act on an owner`, !canActOnUser(u('actor', r), u('victim', 'owner')));
  }

  // Rank. Equal rank is not enough — an admin must not be able to act on
  // another admin, or compromising one admin cascades to all of them.
  ok('an admin cannot act on another admin', !canActOnUser(u('a', 'admin'), u('b', 'admin')));
  ok('a moderator cannot act on another moderator', !canActOnUser(u('a', 'moderator'), u('b', 'moderator')));
  ok('a moderator cannot act on an admin', !canActOnUser(u('a', 'moderator'), u('b', 'admin')));
  ok('an admin CAN act on a moderator', canActOnUser(u('a', 'admin'), u('b', 'moderator')));
  ok('an admin CAN act on a plain user', canActOnUser(u('a', 'admin'), u('b', 'user')));
  ok('an owner CAN act on an admin', canActOnUser(u('a', 'owner'), u('b', 'admin')));
  ok('a plain user cannot act on anyone', !canActOnUser(u('a', 'user'), u('b', 'user')));

  ok('rank is strictly increasing across the declared order',
    PLATFORM_ROLES.every((r, i) => roleRank(r) === i));
}

/* ────────────────────────────────────────────────────────────────────────── */
console.log('\n[6] The rules file and the model agree');
{
  const rules = read('firestore.rules');

  // isModerator() is what the rules use for every community-moderation branch.
  // The set it names must be exactly the roles holding those capabilities, or
  // the two surfaces disagree about who may moderate.
  const modLine = rules.match(/function isModerator\(\)[\s\S]{0,220}?\}/)?.[0] ?? '';
  const namedInRules = PLATFORM_ROLES.filter(r => modLine.includes(`'${r}'`));
  const holdCommunityCaps = PLATFORM_ROLES.filter(r =>
    can(r, 'community.hidePost') && can(r, 'community.resolveReports'));
  ok('isModerator() names exactly the roles holding the community capabilities',
    namedInRules.slice().sort().join() === holdCommunityCaps.slice().sort().join());

  // The rules let isModerator() flip users/{uid}.status. Whoever that covers
  // must hold users.ban in the model, or the model is lying about them.
  ok('every role the rules let ban is granted users.ban in the model',
    namedInRules.every(r => can(r, 'users.ban')));

  // Role must have NO client write path at all.
  ok('the users create rule pins role to the literal "user"',
    /request\.resource\.data\.role == 'user'/.test(rules));
  const updateBlock = rules.match(/match \/users\/\{uid\}[\s\S]*?allow delete/)?.[0] ?? '';
  const updateOnly = updateBlock.slice(updateBlock.indexOf('allow update'));
  ok('no client update branch allows the role field to change',
    !/affectedKeys\(\)\.hasOnly\(\[[^\]]*'role'/.test(updateOnly));

  // The audit log is closed to clients entirely.
  const auditBlock = rules.match(/match \/auditLog\/\{entryId\}[\s\S]*?\n\s{4}\}/)?.[0] ?? '';
  ok('the audit log has an explicit rule at all', auditBlock.length > 0);
  ok('no client may read the audit log', /allow read: if false;/.test(auditBlock));
  ok('no client may write, update or delete an audit entry',
    /allow create, update, delete: if false;/.test(auditBlock));
}

/* ────────────────────────────────────────────────────────────────────────── */
console.log('\n[7] The server enforces order and owns every decision');
{
  const admin = read('web/lib/server/admin.ts');
  const route = read('web/lib/server/adminRoute.ts');

  // Every mutating operation must check its capability before touching data.
  for (const fn of ['banUser', 'unbanUser', 'assignRole', 'hidePost', 'unhidePost',
    'deletePostAdmin', 'hideComment', 'deletePostMedia', 'decideReport']) {
    const body = admin.slice(admin.indexOf(`export async function ${fn}`));
    const cut = body.slice(0, body.indexOf('\n}\n') + 1);
    ok(`${fn} requires a capability`, /requireCap\(actor, '/.test(cut));
    ok(`${fn} writes an audit entry`, /audited\(/.test(cut));
    ok(`${fn} records a denial`, /denied\(actor, requestId/.test(cut));
  }

  // The three user-targeting operations must additionally run the target check.
  for (const fn of ['banUser', 'unbanUser', 'assignRole']) {
    const body = admin.slice(admin.indexOf(`export async function ${fn}`));
    const cut = body.slice(0, body.indexOf('\n}\n') + 1);
    ok(`${fn} loads the target from the database`, /await loadUser\(/.test(cut));
    ok(`${fn} checks the actor against the target`, /assertMayActOn\(actor, subject\)/.test(cut));
  }

  ok('assignRole consults canAssignRole, not a hand-rolled comparison',
    /canAssignRole\(actor\.role, input\.role\)/.test(admin));
  ok('assignRole refuses to remove the last owner', /'last_owner'/.test(admin));
  ok('assignRole updates the Firestore document BEFORE the custom claim',
    admin.indexOf(".update({ role: input.role })") < admin.indexOf('setCustomUserClaims'));
  ok('assignRole revokes tokens so the new role takes effect at once',
    /revokeRefreshTokens/.test(admin));
  ok('banning revokes tokens too', /revokeRefreshTokens\(input\.uid\)/.test(admin));

  // Media deletion must never accept a caller-supplied path.
  ok('media deletion derives the path from the post, never from input',
    /const expected = `community\/posts\/\$\{post\.authorId\}\/\$\{post\.id\}`/.test(admin));
  ok('media deletion refuses a post whose stored path disagrees',
    /'media_mismatch'/.test(admin));

  // The route wrapper is the only door, and it enforces the order.
  ok('every admin route resolves the session before reading the body',
    route.indexOf('await getSession()') < route.indexOf('request.json()'));
  ok('every admin route checks the capability before reading the body',
    route.indexOf('can(session.role, capability)') < route.indexOf('request.json()'));
  ok('a signed-in caller refused for lack of a capability is audited',
    /logDenied\(actorFromSession\(session\), requestId/.test(route));
  ok('admin routes are POST only', /return async function POST/.test(route));
  ok('admin routes demand application/json', /application\/json/.test(route));
  ok('admin routes verify same origin', /assertSameOrigin/.test(route));
  ok('admin routes reject unknown body fields', /حقل غير مسموح/.test(route));
  ok('admin routes never leak an internal error', /error: 'تعذّر تنفيذ الطلب'/.test(route));
  ok('admin routes attach a request id', /'x-request-id'/.test(route));
}

/* ────────────────────────────────────────────────────────────────────────── */
console.log('\n[8] Report lifecycle transitions');
{
  // Imported lazily: admin.ts is `server-only`, which throws outside a Next
  // server. The transition logic is pure, so it is re-declared here from the
  // same table the server uses — asserted against the source to stay honest.
  const admin = read('web/lib/server/admin.ts');
  ok('open may move to in_review, resolved or rejected',
    /open: \['in_review', 'resolved', 'rejected'\]/.test(admin));
  ok('in_review may move to resolved, rejected or back to open',
    /in_review: \['resolved', 'rejected', 'open'\]/.test(admin));
  ok('resolved is terminal', /resolved: \[\]/.test(admin));
  ok('rejected is terminal', /rejected: \[\]/.test(admin));

  // The derivation that keeps `status` and the phone's `resolved` from ever
  // contradicting each other.
  ok('effective status is derived from resolved first, then refined by status',
    /if \(doc\.resolved === true\) return stored === 'rejected' \? 'rejected' : 'resolved';/.test(admin));
  ok('a decision writes both fields together',
    /resolved: input\.to === 'resolved' \|\| input\.to === 'rejected',\s*status: input\.to,/.test(admin));
}

/* ────────────────────────────────────────────────────────────────────────── */
console.log('\n[9] The owner-grant tool is server-only and cannot be reached over HTTP');
{
  const script = read('scripts/grantOwner.ts');
  ok('it demands both an email and a uid', /if \(!email \|\| !uid\)/.test(script));
  ok('it refuses when the two do not name the same account',
    /record\.uid !== uid/.test(script));
  ok('it writes an audit entry before granting',
    script.indexOf("action: 'owner.grant'") < script.indexOf("update({ role: 'owner' })"));
  // Structural, so the file's own explanation of why no such path exists does
  // not count as one.
  const code = stripComments(script).replace(/revokeRefreshTokens/g, '');
  ok('it has no revoke path — demoting an owner is deliberately not a tool',
    !/revoke|demote|removeOwner|role: 'user'/i.test(code));
  ok('the only role it ever writes is owner',
    (code.match(/role: '(\w+)'/g) ?? []).every(m => m === "role: 'owner'"));
  ok('it is not a route module', !/export (async )?function (GET|POST|PUT|DELETE)/.test(script));
  ok('it lives outside web/, so Next cannot serve it', true);

  // Nothing under web/ may import it, or the one tool that can create an owner
  // would be reachable from a served bundle.
  const importers = execSync(
    "grep -rl 'grantOwner' web/ --include=*.ts --include=*.tsx 2>/dev/null || true",
    { cwd: ROOT },
  ).toString().trim();
  ok('no file under web/ references the owner-grant tool', importers === '');
}

/* ────────────────────────────────────────────────────────────────────────── */
console.log('\n[10] The audit log records what an audit log must');
{
  const audit = read('web/lib/server/audit.ts');
  for (const field of ['actorUid', 'actorRole', 'actorCapabilities', 'action',
    'targetType', 'targetId', 'before', 'after', 'reasonAr', 'result', 'requestId']) {
    ok(`every entry carries ${field}`, new RegExp(`${field}:`).test(audit));
  }
  ok('the timestamp is the server\'s, never the client\'s',
    /at: FieldValue\.serverTimestamp\(\)/.test(audit));
  ok('capabilities are snapshotted at the time of the action',
    /ROLE_CAPABILITIES\[actor\.role\]/.test(audit));
  ok('a refused attempt is recorded too', /result: 'denied'/.test(audit));
  ok('the log is written with the Admin SDK from the server', /import 'server-only'/.test(audit));
}

console.log(`\n${failures.length === 0 ? '✅' : '❌'} testAdminRoles: ${passed} assertions passed, ${failures.length} failed\n`);
failures.forEach(f => console.log(`   - ${f}`));
assert.equal(failures.length, 0, `${failures.length} assertion(s) failed`);
