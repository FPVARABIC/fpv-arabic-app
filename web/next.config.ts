import type { NextConfig } from 'next';
import path from 'node:path';
import { isStagingFromEnv } from './lib/staging';

/**
 * The web surface of FPVARABIC.
 *
 * `outputFileTracingRoot` points at the repository root rather than `web/`
 * because the shared core lives OUTSIDE this directory, in `../src`. Without
 * it Next traces only files under `web/` and a production build silently ships
 * without the encyclopedia — the failure looks like an empty site rather than
 * an error, which is the worst kind.
 *
 * ONE COPY OF EVERY RUNTIME PACKAGE THE SHARED CORE IMPORTS
 * ---------------------------------------------------------
 * `firebase` and `browser-image-compression` are DELIBERATELY ABSENT from
 * `web/package.json`, so both this app and the shared core resolve them from
 * the repository root's `node_modules` — one copy, shared.
 *
 * Listing them here as well installs a SECOND copy under `web/node_modules`,
 * and the two are mutually unintelligible: `clientStorage()` would return a
 * handle built by the web's copy, `ref()` inside the core would receive it,
 * fail to recognise it, and throw "Cannot read properties of undefined
 * (reading 'path')" the first time anybody uploaded a photo. Typecheck, lint
 * and `next build` all pass in that state — the types are structurally
 * identical — so only running it finds the fault. It cost an end-to-end run to
 * find once; the rule is: a runtime package imported by `../src` belongs in the
 * ROOT manifest and nowhere else. `scripts/testWebCore.ts` enforces it.
 */
const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd(), '..'),

  /*
   * THE UPLOADED PHOTOGRAPHS TRAVEL WITH THE ROUTES THAT LOOK FOR THEM
   * ------------------------------------------------------------------
   * `lib/server/projectImages.ts` decides whether a photograph exists by asking
   * the filesystem — see the reasoning there. That is free and correct during
   * `next build`, where the whole repository is present. It is NOT
   * automatically true afterwards: `public/` is served by the
   * CDN and is not part of a route's traced bundle, so when a page with
   * `revalidate` regenerates on the server, `existsSync` would answer «no» for a
   * file that is sitting in the repository, and every card would silently fall
   * back to its placeholder some minutes after each deploy.
   *
   * Tracing them in makes the two moments agree. The globs are relative to this
   * directory; the listed routes are exactly the ones whose server code asks the
   * question — the two public project routes, and the two admin routes that
   * resolve a project in order to show the owner what is already uploaded.
   *
   * `lib/server/storeImages.ts` has the same shape and will need the same entry
   * for `./public/assets/store/**` the day a shop route renders an uploaded
   * photograph. It is left out until then rather than listed against routes
   * that do not read it, so this map keeps saying something true.
   */
  outputFileTracingIncludes: {
    '/projects': ['./public/assets/projects/**'],
    '/projects/[projectId]': ['./public/assets/projects/**'],
    '/admin/projects': ['./public/assets/projects/**'],
    '/admin/projects/[projectId]': ['./public/assets/projects/**'],
  },

  // The core is plain TypeScript compiled from source, not a published
  // package, so it must go through the same transpile pipeline as the app's
  // own files.
  transpilePackages: [],

  typescript: {
    // Never ignore type errors: the whole point of sharing the core by import
    // is that a breaking change to it fails the web build immediately.
    ignoreBuildErrors: false,
  },

  images: {
    // Community media lives in Supabase Storage. The Firebase hosts stay ONLY
    // until the data migration rewrites imported posts' media URLs — they are
    // a read-only allowance for legacy files, not a runtime dependency — and
    // they come out with that phase. An open remote-image policy is an SSRF
    // and cost amplifier, so the list is exact either way.
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // Private and administrative surfaces must never be indexed, and the
        // header is the belt to robots.txt's braces — a crawler that ignores
        // robots.txt still honours this.
        source: '/admin/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
      },
      // A staging deployment says the same thing about EVERY path.
      //
      // WHY, WHEN robots.txt AND THE META TAG ALREADY SAY IT
      // ----------------------------------------------------
      // Because those two cover different things and both have holes. The
      // `<meta>` tag exists only on pages Next renders as HTML — it is absent
      // from `/sitemap.xml`, from the OG image, from every file under
      // `/assets`, and from any route that answers with JSON. And robots.txt
      // is a request: a crawler that ignores it is exactly the crawler this
      // matters for. A response header covers every one of those and is the
      // only one of the three a crawler cannot skip.
      //
      // `noarchive` is included on purpose. Without it a cached copy of a
      // staging page outlives the deployment itself.
      ...(isStagingFromEnv(process.env) ? [{
        source: '/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
      }] : []),
    ];
  },
};

export default nextConfig;
