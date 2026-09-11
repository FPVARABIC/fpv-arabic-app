import type { ProposedBuild } from '@core/data/assembly/recommendation/types';
import { ownedWantsGoggles, ownedWantsRadio, type OwnedGear } from './BuildOwnedGearQuestion';

/**
 * WHAT THE SUMMARY IS ALLOWED TO CLAIM
 * ====================================
 *
 * «هذا ما فهمناه» ended on «جاهزون لبناء اقتراح القطع» unconditionally. It
 * said that to a reader whose choices the catalogue cannot satisfy at all, and
 * to a reader who has just told us they do not know what radio they own. Both
 * are the summary claiming a readiness it has no evidence for, on the one
 * screen whose entire job is to be checkable.
 *
 * Three end states, in this order of precedence:
 *
 *   1. no-viable-build   the engine found no blocker-free complete assignment
 *   2. needs-equipment   there is one, but a piece of the reader's own gear
 *                        is explicitly unidentified
 *   3. ready             there is one, and nothing is outstanding
 *
 * A hard constraint that already makes the build impossible outranks softer
 * missing information: telling someone «identify your radio» when no build
 * exists at any answer would send them off to look up a spec that changes
 * nothing.
 *
 * `provenPath` IS THE RECEIPT — `complete` IS NOT
 * -----------------------------------------------
 * It is tempting to read `complete === true` as «ready». It is wrong, and
 * measurably so: a perfectly healthy Freestyle 6S build with nothing owned
 * reports `complete: false`, because all eight categories are
 * `choice-required` — several parts tie and the engine refuses to break the
 * tie for the reader. Those are precisely the choices Phase 2C exists to
 * present. Gating readiness on `complete` would declare every build in the
 * catalogue impossible.
 *
 * The question Phase 2B actually asks is «does at least one blocker-free
 * complete build exist under these inputs?», and `provenPath` is the engine's
 * answer to exactly that.
 *
 * ⚠ THE UNIDENTIFIED-ECOSYSTEM CONTRACT — STILL LIVE
 * --------------------------------------------------
 * `ecosystemValue()` sends an explicit «لست متأكدًا» to the engine as
 * ABSENCE, identical to owning no radio at all. «Owns an unknown radio» is NOT
 * «owns no radio», and proposing an ExpressLRS receiver to someone holding a
 * Crossfire transmitter is the exact failure this journey exists to prevent.
 *
 * Phase 2B could hold that line by rendering no parts at all. Phases 2C to 2E
 * render parts, and the line is held HERE instead: while either ecosystem is
 * owned-but-unnamed, `needs-equipment-identification` is the readiness state,
 * and `BuildV2Preview` opens the proposal only on `ready`. So the reader is
 * asked before a receiver is ever proposed on that basis. Nothing has solved
 * the underlying semantics; the door is simply still shut, which is why this
 * note stays.
 */

/** Which piece of the reader's own gear is still unidentified. */
export type UnresolvedGear = 'rc' | 'video';

export type Readiness =
  | { state: 'no-viable-build'; reasonsAr: readonly string[] }
  | { state: 'needs-equipment-identification'; unresolved: readonly UnresolvedGear[] }
  | { state: 'ready' };

/**
 * Why the engine could not finish, IN ITS OWN WORDS.
 *
 * Deduplicated because the search fails globally: when no complete assignment
 * exists, every category carries the same sentence, and printing it eight
 * times would read as eight problems.
 *
 * Nothing is synthesised here. The UI does not know why a build fails and must
 * not guess — «no Crossfire receiver fits this frame» is a compatibility claim,
 * and compatibility claims belong to the shared rules, not to React.
 */
function engineReasons(build: ProposedBuild): readonly string[] {
  const seen = new Set<string>();
  for (const d of build.decisions) {
    if (d.status !== 'unavailable') continue;
    for (const r of d.reasons) seen.add(r.ar);
  }
  return [...seen];
}

export function readinessOf(
  build: ProposedBuild | null,
  owned: OwnedGear,
): Readiness {
  // 1 — nothing the catalogue offers can satisfy these answers.
  if (build === null || build.provenPath === null) {
    return { state: 'no-viable-build', reasonsAr: build ? engineReasons(build) : [] };
  }

  // 2 — a build exists, but the reader's own equipment is unidentified.
  const unresolved: UnresolvedGear[] = [];
  if (ownedWantsRadio(owned) && owned.rc?.kind === 'unsure') unresolved.push('rc');
  if (ownedWantsGoggles(owned) && owned.video?.kind === 'unsure') unresolved.push('video');
  if (unresolved.length > 0) {
    return { state: 'needs-equipment-identification', unresolved };
  }

  // 3 — a build exists and nothing is outstanding.
  return { state: 'ready' };
}
