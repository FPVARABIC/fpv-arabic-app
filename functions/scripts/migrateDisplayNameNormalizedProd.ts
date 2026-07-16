/**
 * PRODUCTION backfill for users/{uid}.displayNameNormalized — the real,
 * executable counterpart to scripts/migrateDisplayNameNormalized.ts (which
 * is deliberately emulator-only; see that file's header for the full design
 * rationale this script follows). Lives inside functions/ specifically so it
 * can use the Admin SDK (functions/package.json already depends on
 * firebase-admin ^13.10.0 for createComment/toggleCommentLike/
 * togglePostLike — no new dependency was added for this script) without
 * polluting the root Vite client app's dependency tree.
 *
 * Not part of the deployed Cloud Functions bundle: functions/tsconfig.json's
 * `include` is `["src"]` only, so `npm run build` never compiles or bundles
 * anything under functions/scripts/. Never wired into any npm script that
 * runs automatically, in CI or otherwise — this is a manually-invoked,
 * one-off operator tool.
 *
 * Credentials: uses Application Default Credentials only — no service
 * account key file is read, embedded, or expected to exist in this repo.
 * Run `gcloud auth application-default login` once locally under an
 * identity that holds at least `roles/datastore.user` on the target
 * project, or set GOOGLE_APPLICATION_CREDENTIALS to a key file path kept
 * OUTSIDE this repo, before invoking this script.
 *
 * Idempotent: skips any document that already has displayNameNormalized —
 * safe to re-run any number of times. Malformed documents (missing/non-
 * string displayName) are skipped with a warning, never coerced into a
 * silent empty-string write and never allowed to abort the whole run.
 * Copies/reads/writes exactly one field (displayNameNormalized) via a
 * single-field update — structurally incapable of touching email or any
 * other field, since none is ever read from or written to the update call.
 *
 * Dry-run by default. Pass --apply to actually write.
 *
 * Usage:
 *   cd functions
 *   npx tsx scripts/migrateDisplayNameNormalizedProd.ts --project <real-project-id>            # dry run
 *   npx tsx scripts/migrateDisplayNameNormalizedProd.ts --project <real-project-id> --apply     # writes
 *
 * (See docs/production deployment checklist in the task's final report for
 * the full step-by-step runbook this fits into.)
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { normalizeDisplayName } from '../../src/components/Community/utils/userSearch';

const APPLY = process.argv.includes('--apply');

function readFlag(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

const projectId = readFlag('--project');
if (!projectId) {
  console.error('[migrateDisplayNameNormalizedProd] Missing required --project <real-project-id> flag. Refusing to guess a target project.');
  process.exit(1);
}

// Bounded page size — the same "never one unbounded collection read"
// discipline already applied everywhere else in this codebase (comment
// pagination, feed pagination, etc.), scaled up for an admin batch job
// rather than a live UI page.
const PAGE_SIZE = 500;

async function main() {
  initializeApp({ credential: applicationDefault(), projectId });
  const db = getFirestore();

  console.log(`\n=== ${APPLY ? 'APPLY' : 'DRY-RUN'} — target project: ${projectId} ===`);
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.log(`(FIRESTORE_EMULATOR_HOST=${process.env.FIRESTORE_EMULATOR_HOST} is set — this run will hit that emulator, not real production.)`);
  }

  let scanned = 0;
  let missing = 0;
  let skippedMalformed = 0;
  let written = 0;

  // BulkWriter batches, rate-limits, and automatically retries with
  // exponential backoff — the Admin SDK's own recommended tool for a
  // bounded-but-potentially-large number of independent single-document
  // writes, rather than manually chunking into 500-write WriteBatches.
  const bulkWriter = APPLY ? db.bulkWriter() : null;

  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let q = db.collection('users').orderBy('__name__').limit(PAGE_SIZE);
    if (cursor) q = q.startAfter(cursor);
    const page = await q.get();
    if (page.empty) break;

    for (const userDoc of page.docs) {
      scanned++;
      const data = userDoc.data();

      if (typeof data.displayNameNormalized === 'string') continue; // already migrated — idempotent skip

      if (typeof data.displayName !== 'string' || data.displayName.trim().length === 0) {
        skippedMalformed++;
        console.warn(`  SKIP (malformed)  users/${userDoc.id}  displayName=${JSON.stringify(data.displayName)}`);
        continue;
      }

      missing++;
      const normalized = normalizeDisplayName(data.displayName);
      console.log(`  ${APPLY ? 'WRITE' : 'DRY-RUN'}  users/${userDoc.id}  displayName="${data.displayName}"  ->  displayNameNormalized="${normalized}"`);

      if (bulkWriter) {
        bulkWriter.update(userDoc.ref, { displayNameNormalized: normalized });
        written++;
      }
    }

    cursor = page.docs[page.docs.length - 1];
    if (page.docs.length < PAGE_SIZE) break; // that page was the last one
  }

  if (bulkWriter) {
    await bulkWriter.close();
  }

  console.log(
    `\n=== Scanned ${scanned} user documents. ${missing} missing displayNameNormalized`
    + `${skippedMalformed > 0 ? ` (${skippedMalformed} skipped as malformed)` : ''}.`
    + ` ${APPLY ? `${written} written.` : 'Dry run — nothing written. Re-run with --apply to write.'} ===\n`,
  );
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('[migrateDisplayNameNormalizedProd] Failed:', err);
    process.exit(1);
  });
