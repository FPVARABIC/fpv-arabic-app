/**
 * The platform's identity, in one place.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The name was written out by hand in forty-six places across two surfaces —
 * page titles, Open Graph cards, the footer, the Android manifest, the sign-in
 * panel. Renaming the platform meant finding all forty-six and getting every
 * one right, and the ones that got missed would not fail a build or a test:
 * they would simply sit there, on a live page, calling the product by a name it
 * no longer has.
 *
 * So the name is a value now. Both surfaces import it, and the next rename is
 * this file.
 *
 * THE TWO NAMES, AND WHY BOTH
 * ---------------------------
 * `FPVARABIC` is the official name — the one on the domain, in metadata, in
 * legal and commercial contexts, and the one a search engine indexes. It is
 * Latin script because a domain and an app-store listing are Latin script.
 *
 * `بالعربي` is not a second brand. It is the same name's Arabic-language
 * expression, and it stays because the entire product is Arabic and because
 * dropping it would remove the one word that says what this platform is FOR.
 * Bilingual brands work exactly this way: one canonical name, one native
 * rendering, never two identities.
 *
 * WHAT IS DELIBERATELY NOT HERE
 * -----------------------------
 * Colours, spacing and type. Those live in each surface's stylesheet, because
 * they are expressed differently by a Tailwind config and a CSS custom
 * property, and a shared file that tried to hold both would be a file neither
 * surface actually used.
 */

/** The official name. Latin, uppercase, no spaces — as it appears on the domain. */
export const BRAND_NAME = 'FPVARABIC';

/** The Arabic-language rendering of the same name. */
export const BRAND_NAME_AR = 'بالعربي';

/**
 * How the brand is written in running Arabic prose.
 *
 * Used mid-sentence — «مجتمع FPVARABIC بالعربي» reads badly, so prose gets the
 * name alone and the descriptor is carried by the sentence around it.
 */
export const BRAND_IN_PROSE = 'FPVARABIC';

/** The one-line description, used as a fallback meta description and in cards. */
export const BRAND_TAGLINE_AR = 'منصّة الطيران بالمنظور الأول بالعربية';

/**
 * The canonical origin.
 *
 * Read from the environment where one is set, so a preview deployment produces
 * canonical URLs and Open Graph cards pointing at ITSELF rather than at
 * production — a preview whose cards point at the live site is a preview that
 * quietly sends its traffic away.
 */
export const BRAND_DOMAIN = 'fpvarabic.com';
export const BRAND_ORIGIN = `https://${BRAND_DOMAIN}`;

/** The full title used on the home page and as the metadata default. */
export const BRAND_TITLE_AR = `${BRAND_NAME} — ${BRAND_TAGLINE_AR}`;

/**
 * The suffix every other page's title carries.
 *
 * A tab in a crowded browser is identified by its last few words, so every page
 * ends with the platform's name rather than beginning with it.
 */
export const BRAND_TITLE_SUFFIX = ` — ${BRAND_NAME}`;

/** The Android/app-store display name. Same official name, no descriptor. */
export const BRAND_APP_NAME = BRAND_NAME;

/**
 * The Android application id.
 *
 * Present here to be READ, never to be changed: an application id is the
 * permanent identity of an installed app, and altering it produces a second,
 * unrelated app that cannot update the first. It already matches the official
 * name, which is why the rename needed no migration.
 */
export const ANDROID_APPLICATION_ID = 'com.fpvarabic.app';
