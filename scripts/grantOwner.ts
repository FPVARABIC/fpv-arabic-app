/**
 * Grant the platform-owner role.
 *
 * WHY THIS IS A SCRIPT AND NOT A BUTTON
 * -------------------------------------
 * `canAssignRole` excludes 'owner' for EVERY actor, including an existing
 * owner. There is deliberately no code path in the web application, in any API
 * route, or in any Cloud Function that can create an owner — so a compromised
 * admin session, a stolen owner session, or a bug in the role endpoint cannot
 * mint an account that outranks everyone else.
 *
 * The cost of that decision is this file: granting the first owner requires
 * someone with the service-account credentials to run a command on a machine
 * they control. That is the correct amount of friction for the single most
 * powerful action the platform has.
 *
 * WHAT IT REQUIRES, AND WHY BOTH
 * ------------------------------
 * BOTH the email and the uid, and they must belong to the same account. Either
 * alone is a plausible typo away from promoting the wrong person: a uid is an
 * opaque string nobody can proofread, and an email can be reassigned or
 * mistyped into another real user's. Requiring both means a mistake has to be
 * made twice, consistently, to do damage.
 *
 * WHAT IT DOES
 * ------------
 *   1. Resolves the account by email and checks the uid matches.
 *   2. Refuses if the account is already an owner.
 *   3. Writes an audit entry BEFORE granting, so an ungrantable-but-attempted
 *      promotion is still visible.
 *   4. Sets `users/{uid}.role = 'owner'` and the matching custom claim.
 *   5. Revokes refresh tokens so the new claim is picked up immediately.
 *
 * WHAT IT DOES NOT DO
 * -------------------
 * It never REMOVES an owner. Demotion of an owner has no tool at all, on
 * purpose: `--revoke` would be the exact capability an attacker who reached
 * this script would want. Removing an owner is a deliberate database operation
 * performed by a human who has thought about who is left.
 *
 * USAGE
 * -----
 *   npx tsx scripts/grantOwner.ts --email=someone@example.com --uid=abc123
 *
 * Requires FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY,
 * or Application Default Credentials, or an emulator host. It cannot be invoked
 * over HTTP: it is not a route, it exports nothing, and nothing imports it.
 */
import { cert, getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function arg(name: string): string | null {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

function initAdmin() {
  if (getApps().length) return;
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.GCLOUD_PROJECT;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
  } else if (projectId) {
    // Emulator or ADC. The emulator needs no credential at all, only a project.
    initializeApp(process.env.FIRESTORE_EMULATOR_HOST ? { projectId } : { credential: applicationDefault(), projectId });
  } else {
    fail('لا توجد بيانات اعتماد. اضبط FIREBASE_PROJECT_ID ورفيقيه، أو GOOGLE_APPLICATION_CREDENTIALS.');
  }
}

async function main() {
  const email = arg('email');
  const uid = arg('uid');

  if (!email || !uid) {
    fail('الاستخدام: npx tsx scripts/grantOwner.ts --email=… --uid=…\nكلاهما مطلوب، ويجب أن يعودا للحساب نفسه.');
  }

  initAdmin();
  const auth = getAuth();
  const db = getFirestore();

  // 1. Resolve by email, then require the uid to agree. Two independent
  //    identifiers naming the same account.
  let record;
  try {
    record = await auth.getUserByEmail(email);
  } catch {
    fail(`لا يوجد حساب بهذا البريد: ${email}`);
  }

  if (record.uid !== uid) {
    fail(
      `البريد والمعرّف لا يعودان للحساب نفسه.\n`
      + `  البريد ${email} يعود للمعرّف ${record.uid}\n`
      + `  والمعرّف المُمرَّر هو ${uid}\n`
      + `لم يُنفَّذ أي تغيير.`,
    );
  }

  const ref = db.collection('users').doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    fail(`الحساب موجود في المصادقة لكن لا وثيقة له في users/${uid}. لِيدخل المستخدم مرة واحدة أولاً.`);
  }

  const before = String(snap.data()?.role ?? 'user');
  if (before === 'owner') {
    console.log(`\n• الحساب ${email} مالك بالفعل. لم يُنفَّذ أي تغيير.\n`);
    return;
  }

  // 2. Record the intent BEFORE acting. An owner grant that happened without a
  //    log entry is the one event this system must never have.
  const requestId = `grant-owner-${Date.now()}`;
  await db.collection('auditLog').add({
    actorUid: 'script:grantOwner',
    actorRole: 'owner',
    actorEmail: null,
    actorCapabilities: ['*'],
    action: 'owner.grant',
    targetType: 'user',
    targetId: uid,
    before,
    after: 'owner',
    reasonAr: 'منح دور المالك عبر الأداة الخادمية',
    result: 'ok',
    error: null,
    meta: { email, viaScript: true },
    requestId,
    at: FieldValue.serverTimestamp(),
  });

  // 3. Grant. Document first — `getSession` takes the LOWER of the document and
  //    the claim, so the document is what actually confers the role.
  await ref.update({ role: 'owner' });
  await auth.setCustomUserClaims(uid, { role: 'owner' });
  await auth.revokeRefreshTokens(uid);

  console.log(
    `\n✓ ${email} (${uid}) أصبح مالك المنصة.\n`
    + `  الدور السابق: ${before}\n`
    + `  سُجّل الإجراء في auditLog بالمعرّف ${requestId}\n`
    + `  أُبطلت جلساته ليُعاد إصدار صلاحياته عند الدخول التالي.\n`,
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
