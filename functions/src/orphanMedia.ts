/**
 * Finding media files that no post refers to.
 *
 * WHY THIS EXISTS AT ALL
 * ----------------------
 * Every upload path in this project mints the post id BEFORE the file, so the
 * bytes land at `community/posts/{uid}/{postId}/` and the post document is
 * written afterwards. That ordering is forced by `storage.rules` — the folder
 * name IS the authorisation — and it means there is always a window in which
 * files exist and the post does not. Both composers close that window
 * themselves by deleting the files when the post write fails, but a browser
 * that is closed mid-upload, a device that loses power, or a delete that itself
 * fails leaves the files behind with nothing left to clean them up.
 *
 * WHAT IS AND IS NOT CLAIMED
 * --------------------------
 * `findOrphanedMediaFolders` below is real, tested logic: give it the folders
 * present in Storage and a way to look up posts, and it returns exactly the
 * folders that are safe to delete. `scripts/testOrphanMedia.ts` exercises it
 * against the cases that matter, including the ones where deleting would be
 * WRONG.
 *
 * What does NOT exist is anything that runs it on a schedule. That needs a
 * deployed Cloud Function on a billing plan this project has not moved to (the
 * same constraint that keeps `recomputeFeedScores` undeployed), so the sweep is
 * documented in `docs/platform/14-MEDIA-LIFECYCLE.md` and its decision logic is
 * proven here, but no automatic cleanup is running today. Storage that leaks
 * today leaks until that function is deployed. That is stated plainly rather
 * than implied to be handled.
 *
 * THE TWO RULES THAT KEEP THIS FROM DELETING REAL DATA
 * ---------------------------------------------------
 * 1. A folder is only a candidate if its post does not exist, or exists and is
 *    NOT active. "I did not find it in one query" is never enough — the caller
 *    passes a lookup that must genuinely answer, and an inconclusive lookup
 *    (a thrown error, a null result the caller could not distinguish) keeps the
 *    folder.
 * 2. A folder is only a candidate once it is older than a grace period, so an
 *    upload that is still in flight — or a post document that is a few hundred
 *    milliseconds behind its files — is never swept out from under itself.
 */

/** Nothing younger than this is ever a candidate, however orphaned it looks. */
export const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000;

export interface MediaFolder {
  /** `community/posts/{uid}/{postId}` */
  path: string;
  /** Newest object in the folder. A folder is as young as its youngest file. */
  newestFileAtMs: number;
}

/** What the caller knows about the post a folder claims to belong to. */
export type PostLookup =
  | { kind: 'missing' }
  | { kind: 'exists'; status: 'active' | 'hidden' | 'deleted' }
  /** The lookup could not be completed. Always treated as "keep". */
  | { kind: 'unknown' };

export interface OrphanDecision {
  path: string;
  orphaned: boolean;
  /** Why — surfaced in the sweep's log so a deletion is never unexplained. */
  reason:
    | 'post-missing'
    | 'post-not-active'
    | 'within-grace-period'
    | 'post-active'
    | 'lookup-failed'
    | 'malformed-path';
}

/**
 * Parse `community/posts/{uid}/{postId}`.
 *
 * A path that does not have exactly this shape is never a candidate. That is
 * not defensive padding: a bug that produced a shorter path would otherwise let
 * this function propose deleting `community/posts/{uid}` — every one of a
 * user's posts — and the grace period would not save it.
 */
export function parseMediaFolder(path: string): { uid: string; postId: string } | null {
  const parts = path.replace(/\/+$/, '').split('/');
  if (parts.length !== 4) return null;
  const [a, b, uid, postId] = parts;
  if (a !== 'community' || b !== 'posts') return null;
  if (!uid || !postId) return null;
  return { uid, postId };
}

/**
 * Decide a single folder's fate.
 *
 * Pure: no Storage, no Firestore, no clock of its own. `nowMs` and the lookup
 * are passed in, which is what makes every branch directly testable — including
 * the ones that must NOT delete.
 */
export function classifyMediaFolder(
  folder: MediaFolder,
  lookup: PostLookup,
  nowMs: number,
): OrphanDecision {
  const parsed = parseMediaFolder(folder.path);
  if (!parsed) return { path: folder.path, orphaned: false, reason: 'malformed-path' };

  if (lookup.kind === 'unknown') {
    return { path: folder.path, orphaned: false, reason: 'lookup-failed' };
  }

  // Age is checked BEFORE the post state, because an in-flight upload has no
  // post document yet and would otherwise look exactly like an orphan.
  //
  // `<=` rather than `<`: a folder exactly at the boundary is KEPT. Every
  // ambiguous case in this function resolves towards keeping a file, because
  // the cost of keeping one orphan for another day is storage, and the cost of
  // deleting one live file is somebody's post.
  //
  // A negative age — a file timestamped in the future, which a clock skew
  // between the uploader and the bucket can genuinely produce — also lands
  // here and is kept, rather than being read as "infinitely old".
  if (nowMs - folder.newestFileAtMs <= ORPHAN_GRACE_MS) {
    return { path: folder.path, orphaned: false, reason: 'within-grace-period' };
  }

  if (lookup.kind === 'missing') {
    return { path: folder.path, orphaned: true, reason: 'post-missing' };
  }

  if (lookup.status === 'active') {
    return { path: folder.path, orphaned: false, reason: 'post-active' };
  }

  // Hidden or soft-deleted. `cleanupPostMedia` should already have removed
  // these on the status change; anything still here is that trigger's failures,
  // which is exactly what a sweep is for.
  return { path: folder.path, orphaned: true, reason: 'post-not-active' };
}

/**
 * The sweep's decision pass over a whole batch.
 *
 * Returns EVERY decision, not just the deletions, so the caller can log what it
 * chose to keep and why. A cleanup job that only reports what it deleted is
 * impossible to audit when it deletes something it should not have.
 */
export function findOrphanedMediaFolders(
  folders: MediaFolder[],
  lookupFor: (postId: string) => PostLookup,
  nowMs: number,
): OrphanDecision[] {
  return folders.map(folder => {
    const parsed = parseMediaFolder(folder.path);
    const lookup: PostLookup = parsed ? lookupFor(parsed.postId) : { kind: 'unknown' };
    return classifyMediaFolder(folder, lookup, nowMs);
  });
}
