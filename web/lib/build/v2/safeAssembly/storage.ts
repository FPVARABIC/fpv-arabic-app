import {
  load as loadStore, save as saveStore, clear as clearStore,
  type StoreDefinition,
} from '@core/platform/storage';
import { validateSession, type BuildV2Session } from './sessionModel';

/**
 * THE ONLY PLACE IN SAFE ASSEMBLY THAT TOUCHES A BROWSER
 * =======================================================
 *
 * Everything else in this folder is a pure function. That is not tidiness for
 * its own sake: the revalidation contract — «physical progress belonging to a
 * different build is refused» — is the most safety-bearing logic in the phase,
 * and it has to be provable without a browser, a storage quota, or a DOM.
 *
 * So the split is strict. `sessionModel.ts` decides what a valid session is and
 * what each transition does; this file only moves that value in and out of the
 * device, through the platform contract that already supplies versioning,
 * validation on read, migration and no-throw semantics.
 *
 * WHAT THIS DOES NOT WRITE
 * ------------------------
 * Not `fpv-assembly-project-v1` — that is the shared project store, owned by
 * «مشروعي» and mirrored to from V1. A safety confirmation is not project data
 * and must not arrive there by a side door.
 *
 * Not a `BuildDraft`. A draft is V1's persistence-and-progress record — a step
 * index, gate confirmations stored BY ARRAY INDEX, and `externalParts`. V2 has
 * none of those, and fabricating one to reuse its writer would import the exact
 * representation this phase exists to avoid.
 *
 * No Firebase, no network, no phone store. Foundation A is local and web-only,
 * which is the decision that was made — not a limitation to be quietly widened.
 */

/**
 * The key, and why it is shaped like this.
 *
 * `fpv-` matches every other store in the repository. `web-build-v2` says which
 * surface and which journey — the phone has its own progress model and must
 * never read this one. The trailing `-v1` is the SCHEMA generation, not the
 * product version: it changes only if this record's shape is replaced outright
 * rather than migrated, and changing it orphans user data, so it will not.
 */
export const BUILD_V2_SESSION_KEY = 'fpv-web-build-v2-session-v1';

const SESSION_VERSION = 1;

const SESSION_STORE: StoreDefinition<BuildV2Session> = {
  key: BUILD_V2_SESSION_KEY,
  version: SESSION_VERSION,
  validate: validateSession,
  /*
   * NO MIGRATION, AND THAT IS THE HONEST ANSWER FOR A FIRST SCHEMA.
   *
   * Nothing older than version 1 exists, so there is no older shape to upgrade
   * and no legacy key adopting this contract. A `migrate` that accepted an
   * unknown version would be guessing at a shape nobody has written — and what
   * it would be guessing about is a record of safety confirmations.
   *
   * Omitting it means `load` refuses anything that is not version 1, which is
   * the fail-closed direction: the reader re-confirms. When a version 2 exists,
   * this is where its upgrade path goes, and it must be explicit about which
   * confirmations survive the change.
   */
};

/**
 * Read the session, or null.
 *
 * Null for every kind of doubt — missing, unreadable, malformed, wrong version,
 * invalid. The caller starts clean, which is always safe. There is no partial
 * recovery: a safety record that was repaired on the way in is a record nobody
 * can vouch for.
 */
export const loadBuildV2Session = (): BuildV2Session | null => loadStore(SESSION_STORE);

/**
 * Write the session. Returns false when the device refused.
 *
 * `now` is passed in rather than read from a clock here, matching the platform
 * contract — callers stay deterministic and tests do not depend on wall time.
 * A failed write is never fatal: the journey keeps working in memory, exactly
 * as it did before this phase existed.
 */
export const saveBuildV2Session = (session: BuildV2Session, now?: number): boolean =>
  saveStore(SESSION_STORE, session, now);

export const clearBuildV2Session = (): void => clearStore(SESSION_STORE);
