import type { MetadataRoute } from 'next';
import { BRAND_NAME, BRAND_TITLE_AR, BRAND_TAGLINE_AR } from '@core/data/brand';

/**
 * The web app manifest.
 *
 * Makes «add to home screen» produce something that opens like the Android app
 * rather than like a bookmark: the same mint chrome, the same name, RTL, and a
 * standalone window with no browser furniture.
 *
 * `background_color` is the cream the pages actually use and `theme_color` is
 * the navigation bar's mint — the two colours a launching splash screen shows
 * before any of the site's own CSS has loaded. Getting them wrong produces a
 * white flash in a product that has no white surface.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_TITLE_AR,
    short_name: BRAND_NAME,
    description: BRAND_TAGLINE_AR,
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'ar',
    dir: 'rtl',
    background_color: '#FAF8F3',
    theme_color: '#5EEAD4',
    categories: ['education', 'shopping'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
