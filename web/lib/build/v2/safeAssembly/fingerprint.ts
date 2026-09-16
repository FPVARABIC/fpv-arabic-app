import { REQUIRED_BUILD_CATEGORIES } from '@core/data/assembly/recommendation/eligibility';
import type { ProposedBuild } from '@core/data/assembly/recommendation/types';

/**
 * WHICH BUILD THIS PHYSICAL PROGRESS BELONGS TO
 * ==============================================
 *
 * A confirmation in «التجميع الآمن» is a claim about an object in the world:
 * «I checked that THIS screw does not reach THIS motor's windings». It is not
 * a claim about a plan. So it is only meaningful while the plan still
 * describes the object.
 *
 * Change the frame and the screw-length check is about a different arm. Change
 * the ESC and the polarity check is about different pads. Nothing throws, and
 * the reader — who has spent an evening soldering — has no way to notice that
 * the ticks they are looking at were earned on a build that no longer exists.
 *
 * This function is the guard. Two builds that are physically the same produce
 * the same string; two that differ in any way that matters to a person holding
 * a soldering iron produce different ones.
 *
 * WHAT IS IN IT, AND WHY ONLY THIS
 * --------------------------------
 * The eight required part IDs, plus the three answers that change what those
 * parts physically are: the type, the frame size, and the cell count. Those are
 * the fields a confirmation depends on.
 *
 * WHAT IS DELIBERATELY OUT
 * ------------------------
 * · display names — a catalogue typo fix is not a different drone, and a name
 *   is not an identity;
 * · price, tier, provenance, recommendation reasons, compatibility prose —
 *   none of it changes the object on the bench;
 * · accessories — a capacitor added after the fact does not invalidate the
 *   motor screws;
 * · manual-check state, current screen, timestamps — state, not identity.
 *
 * Including any of them would invalidate real physical work for a reason that
 * is not physical, and readers who are made to redo safety checks for no
 * visible reason stop reading them.
 *
 * WHY IT IS A READABLE STRING AND NOT A HASH
 * ------------------------------------------
 * A hash would make every mismatch equally opaque. This value ends up in a
 * diagnostic record and in test failure output, and «the frames id changed»
 * is worth more there than a hex digest. There is nothing secret in it and
 * nothing to defend against — it is compared for equality, not trusted as a
 * credential. Hashing it would add ceremony and remove information.
 */

/** Bumped only when the FIELD SET changes — never when a part changes. */
const FINGERPRINT_VERSION = 'bf1';

/**
 * Every separator this format uses, escaped in every value.
 *
 * Without this, a part id containing `|` or `=` could make two different
 * builds serialise identically — the classic ambiguity that turns a safety
 * comparison into a coincidence. Backslash is escaped first so the escape
 * itself cannot be forged.
 */
const esc = (v: string): string =>
  v.replace(/\\/g, '\\\\').replace(/\|/g, '\\p').replace(/=/g, '\\e');

/** Absent is a value too, and must be distinguishable from the string "". */
const field = (name: string, value: string | number | undefined): string =>
  `${name}=${value === undefined ? '\\0' : esc(String(value))}`;

/**
 * The physical identity of a build, from whatever describes it.
 *
 * Takes the narrow shape rather than a `ProposedBuild` so that a test — and a
 * future caller that has only ids — can compute one without running the
 * engine. `fingerprintOfBuild` below is the convenience for the normal case.
 */
export interface BuildIdentity {
  droneTypeId: string;
  sizeInch?: number;
  cellCount?: number;
  /** category → catalogue part id. Only the eight required are read. */
  partIds: Readonly<Record<string, string | undefined>>;
}

export function buildFingerprint(identity: BuildIdentity): string {
  /*
   * ORDER COMES FROM THE ENGINE'S OWN LIST, NEVER FROM THE OBJECT.
   *
   * `Object.keys` order depends on insertion, so two identical builds assembled
   * in different orders would fingerprint differently — and the reader would
   * lose their work for having answered the questions in another sequence.
   * Iterating `REQUIRED_BUILD_CATEGORIES` makes the serialisation depend on the
   * domain's fixed order and nothing else.
   */
  const parts = REQUIRED_BUILD_CATEGORIES
    .map(category => field(category, identity.partIds[category]))
    .join('|');

  return [
    FINGERPRINT_VERSION,
    field('type', identity.droneTypeId),
    field('size', identity.sizeInch),
    field('cells', identity.cellCount),
    parts,
  ].join('|');
}

/** The normal case: the identity of a build the engine just produced. */
export function fingerprintOfBuild(build: ProposedBuild): string {
  const partIds: Record<string, string | undefined> = {};
  for (const category of REQUIRED_BUILD_CATEGORIES) {
    partIds[category] = build.parts[category]?.id;
  }
  return buildFingerprint({
    droneTypeId: build.droneTypeId,
    sizeInch: build.sizeInch,
    cellCount: build.cellCount,
    partIds,
  });
}
