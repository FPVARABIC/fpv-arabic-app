/**
 * Pre-launch presentation flags — the switchboard for what the FIRST public
 * version shows, deliberately separate from what the platform can DO.
 *
 * Nothing behind these flags is deleted: auth, checkout and payments keep
 * their code, their routes and their server-side gates untouched. The flags
 * only decide what a visitor is INVITED to click. Re-enabling either surface
 * is a one-line change here — which is the entire reason this file exists,
 * instead of a dozen scattered conditions that would each need finding again.
 *
 * `scripts/testWebClosure.ts` asserts the user-facing consequences of both
 * flags, so flipping one deliberately is one edit here plus its test row —
 * and flipping one ACCIDENTALLY fails the suite.
 */

/**
 * Hide every sign-in invitation from the experience: the header button, the
 * account rail's row, the settings CTA — and /signin itself redirects home
 * (see next.config.ts). Server-side session verification stays exactly as
 * it was: a reader who already holds a valid session keeps their account
 * chip and their capabilities.
 */
export const AUTH_UI_HIDDEN = true;

/**
 * The store browses fully — sections, products, prices, the cart — but says
 * plainly that ordering opens later: a banner on the storefront, the
 * checkout call-to-action replaced with the same sentence, and the checkout
 * routes redirecting back to the cart (see next.config.ts).
 */
export const STORE_OPENING_SOON = true;
