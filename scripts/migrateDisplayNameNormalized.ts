/**
 * Backfill utility (Phase 6): computes and writes displayNameNormalized for
 * every users/{uid} document that predates that field, so pre-existing
 * accounts become discoverable via useUserSearch.ts without waiting for
 * their next post/comment (ensureCommunityUser.ts is create-once and never
 * backfills an already-bootstrapped document — see that file's own comment).
 *
 * ============================================================================
 * SCOPE — EMULATOR-ONLY BY DESIGN, DELIBERATELY, NOT AS A TEMPORARY GAP
 * ============================================================================
 * This script targets ONLY the local Firebase emulator (PROJECT_ID below,
 * matching seedCommunityEmulator.ts/testCommunityRules.ts's own convention)
 * and bypasses Security Rules via withSecurityRulesDisabled — the same
 * emulator-admin-bypass mechanism those two scripts already use. It CANNOT
 * reach a real production project: the root package.json deliberately has no
 * firebase-admin dependency and no service-account credential handling (a
 * decision confirmed explicitly — a devDependency addition for this one-off
 * admin script was considered and declined for now, see chat history). This
 * is fail-safe by construction, and additionally fails CLOSED at startup
 * (see the FIRESTORE_EMULATOR_HOST check below) rather than merely by
 * omission, so a future accidental copy-paste into a non-emulator context
 * cannot silently reach a real project either.
 *
 * ============================================================================
 * PRODUCTION MIGRATION RUNBOOK (for whenever a real backfill is actually
 * needed — not executed by this script, not executed by this session)
 * ============================================================================
 * 1. Dependency: add firebase-admin as a devDependency, but NOT to this
 *    repo's root package.json (which is the Vite CLIENT app's dependency
 *    tree — mixing an Admin-SDK-capable script in there is exactly the kind
 *    of scope creep this correction pass is trying to avoid elsewhere).
 *    Instead, either:
 *      (a) add it to functions/package.json (which already depends on
 *          firebase-admin ^13.10.0 for createComment/toggleCommentLike) and
 *          run the migration as a one-off script inside that sub-package, or
 *      (b) create a small dedicated admin-tools/ sub-package (its own
 *          package.json/node_modules, same isolation pattern as functions/)
 *          if admin tooling grows beyond this one script.
 *    Recommended version: firebase-admin ^13.10.0 (the same pin already
 *    verified compatible in this repo, for consistency — re-check for a
 *    newer 13.x/14.x at implementation time).
 *
 * 2. Credentials (never committed, ever):
 *      - Preferred: Application Default Credentials — the operator runs
 *        `gcloud auth application-default login` once, locally, under their
 *        own IAM identity. No key file touches the filesystem or the repo.
 *      - Alternative (for CI/non-interactive use): a service-account JSON
 *        key, referenced via `GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json`
 *        — the path is an env var, the key file itself must never be added
 *        to this repo (confirm .gitignore coverage before creating one).
 *      - Required IAM role: the minimum sufficient role is
 *        `roles/datastore.user` (Cloud Datastore User) scoped to the target
 *        project — broader roles like Editor/Owner are NOT needed for a
 *        read+write-one-field migration.
 *
 * 3. Command shape (illustrative — exact flags depend on the final script):
 *      GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json \
 *        node --import tsx admin-tools/migrateDisplayNameNormalized.ts \
 *        --project <real-project-id>                    # dry run (default)
 *      GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json \
 *        node --import tsx admin-tools/migrateDisplayNameNormalized.ts \
 *        --project <real-project-id> --apply             # writes
 *
 * 4. Scale/batching: this emulator-only version's single unbounded
 *    `getDocs(collection(db, 'users'))` is fine for a test fixture's
 *    handful of documents, but is NOT how the production version should
 *    read a real user base. The production script should page through
 *    `users` in bounded chunks (e.g. `.orderBy('__name__').limit(500)` +
 *    `startAfter(cursor)`), and should write via `admin.firestore().bulkWriter()`
 *    (which batches, rate-limits, and automatically retries with exponential
 *    backoff) rather than one `updateDoc` call per document in a tight loop.
 *
 * 5. Rollback/verification: this migration only ever ADDS a missing field —
 *    it never overwrites an existing displayNameNormalized (same idempotent
 *    skip logic as this emulator version), so there is no data-loss risk to
 *    roll back. Verification is simply re-running in dry-run mode afterward
 *    and confirming "0 missing" in the summary line.
 *
 * 6. Trust boundary warning: the Admin SDK bypasses Firestore Security Rules
 *    entirely, by design (same fact already documented in
 *    functions/src/index.ts) — this is what makes an admin migration
 *    possible at all (a plain client SDK cannot write another user's
 *    document, real or emulated), but it also means this script's own
 *    correctness (only ever touching displayNameNormalized, only ever on a
 *    genuinely-missing field) is the ONLY thing standing between it and a
 *    much more destructive accidental write — review the production version
 *    with that in mind before it is ever run for real.
 * ============================================================================
 *
 * Idempotent: skips any document that already has displayNameNormalized,
 * so re-running is always safe and touches only what's actually missing.
 *
 * Dry-run by default — pass --apply to actually write.
 *
 * Run with:
 *   npx firebase emulators:exec --project demo-community-rules-test \
 *     "npx tsx scripts/migrateDisplayNameNormalized.ts"          # dry run
 *   npx firebase emulators:exec --project demo-community-rules-test \
 *     "npx tsx scripts/migrateDisplayNameNormalized.ts --apply"  # writes
 */

import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { normalizeDisplayName } from '../src/components/Community/utils/userSearch';
import type { CommunityUser } from '../src/components/Community/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const PROJECT_ID = 'demo-community-rules-test';

const APPLY = process.argv.includes('--apply');

// Fail CLOSED, not just by omission: this script has no admin credential
// path at all (see the header), so it could never actually reach a real
// project even without this check — but requiring the emulator's own
// FIRESTORE_EMULATOR_HOST marker to be present (set automatically by
// `firebase emulators:exec`/`emulators:start`, never present in a normal
// shell) makes that limitation an explicit, checked precondition instead of
// an implicit property a future edit could accidentally erode.
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('[migrateDisplayNameNormalized] Refusing to run: FIRESTORE_EMULATOR_HOST is not set.');
  console.error('This script is EMULATOR-ONLY by design (see the file header for the production runbook).');
  console.error('Run it via: npm run migrate:display-name-normalized');
  process.exit(1);
}

async function main() {
  const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(join(ROOT, 'firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });

  let scanned = 0;
  let missing = 0;
  let written = 0;

  await testEnv.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    const snap = await getDocs(collection(db, 'users'));
    scanned = snap.docs.length;

    for (const userDoc of snap.docs) {
      const data = userDoc.data() as CommunityUser;
      if (typeof data.displayNameNormalized === 'string') continue; // already migrated — idempotent skip
      missing++;
      const normalized = normalizeDisplayName(data.displayName ?? '');
      console.log(`  ${APPLY ? 'WRITE' : 'DRY-RUN'}  users/${userDoc.id}  displayName="${data.displayName}"  ->  displayNameNormalized="${normalized}"`);
      if (APPLY) {
        await updateDoc(doc(db, 'users', userDoc.id), { displayNameNormalized: normalized });
        written++;
      }
    }
  });

  console.log(`\n=== Scanned ${scanned} user documents. ${missing} missing displayNameNormalized. ${APPLY ? `${written} written.` : 'Dry run — nothing written. Re-run with --apply to write.'} ===\n`);

  await testEnv.cleanup();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
