/**
 * THE TEMPORARY DOOR TO BUILD V2 — DELETE THIS FILE AT CUTOVER
 * ===========================================================
 *
 * BUILD V2's journey is being built in the open, one phase at a time, while V1
 * remains the product. That needs a way to look at V2 on the real site without
 * shipping an unfinished journey to anybody who taps «البناء».
 *
 * So: no second route. `/build?buildV2=1` renders the preview; `/build` renders
 * V1, unchanged, byte for byte. A permanent `/build-v2` would have to be
 * deleted, redirected and de-indexed later; a query flag leaves nothing behind
 * but this file.
 *
 * WHY A QUERY FLAG AND NOT A SERVER CHECK
 * ---------------------------------------
 * `/build` is STATICALLY PRERENDERED (`○` in the build output). Reading
 * `searchParams` in the page would opt it into dynamic rendering (`ƒ`) for
 * every visitor — a real regression in how V1 is served, to support a hidden
 * preview. So the flag is read on the client, inside a gate that renders the
 * untouched server-rendered V1 as its children.
 *
 * WHAT TO DO AT CUTOVER
 * ---------------------
 *   1. delete this file
 *   2. delete `BuildV2PreviewGate` and unwrap `/build/page.tsx`
 *   3. make the V2 journey the page itself
 *
 * Nothing else references the flag, by design.
 */

/** The query parameter. One spelling, one place. */
export const BUILD_V2_PREVIEW_PARAM = 'buildV2';

/** The only value that opens the preview. Anything else is V1. */
export const BUILD_V2_PREVIEW_VALUE = '1';

/**
 * Is this reader asking for the preview?
 *
 * Deliberately exact: `?buildV2=0`, `?buildV2=true` and a bare `?buildV2` are
 * all V1. A flag with a fuzzy boundary is a flag that turns itself on.
 */
export function isBuildV2Preview(value: string | null | undefined): boolean {
  return value === BUILD_V2_PREVIEW_VALUE;
}
