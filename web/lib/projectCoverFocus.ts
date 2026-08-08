/**
 * Which part of a cover survives the card's crop.
 *
 * THE GEOMETRY, BECAUSE IT IS NOT OBVIOUS
 * ---------------------------------------
 * `.project-card-media` is `aspect-ratio: 16/9` with `object-fit: cover`, and
 * the uploaded covers are 3:2. Filling a 16:9 box from a 3:2 source keeps
 * 84.4% of the height and discards 15.6% — 7.8% off the top and 7.8% off the
 * bottom at the browser's default centring. For a photograph that is invisible:
 * sky and foreground are what go.
 *
 * WHY THIS FILE HAS EXACTLY ONE ENTRY, AND WHY IT IS NOT A GUESS
 * --------------------------------------------------------------
 * Every cover was rendered at its true crop and looked at, one by one. Nine are
 * scenes and centre perfectly — drone, subject and tablet all survive, so they
 * take the default and are deliberately absent from this map. The tenth,
 * `autonomous-drone-racing`, is an infographic rather than a scene: its Arabic
 * title sits in the top band, so centring beheads the card. Anchoring it to the
 * top keeps the title, the aircraft, the start/finish gantry and the components
 * strip, and spends the whole 15.6% on the sensor rows at the bottom — the part
 * that is unreadable at card size anyway.
 *
 * So this is a measured correction for one image, not a styling layer. It
 * changes nothing about the card: same box, same colours, same crop ratio —
 * only WHICH 84.4% of that one photograph is shown.
 *
 * IF THAT COVER IS EVER REPLACED
 * ------------------------------
 * Delete its line. A 16:9 scene wants the default like the other nine, and a
 * stale anchor would push a new photograph off its own centre.
 */

/** `object-position` per project id. Absent means centred, which is the norm. */
const COVER_FOCUS: Readonly<Record<string, string>> = {
  'autonomous-drone-racing': '50% 0%',
};

export const DEFAULT_COVER_FOCUS = '50% 50%';

export function coverFocus(projectId: string): string {
  return COVER_FOCUS[projectId] ?? DEFAULT_COVER_FOCUS;
}
