import type { NextConfig } from 'next';
import path from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { isStagingFromEnv } from './lib/staging';

/**
 * WHICH PROJECT PHOTOGRAPHS EXIST — DECIDED HERE, AT BUILD TIME
 * -------------------------------------------------------------
 * The owner drops covers into `public/assets/projects/<id>/` and pushes;
 * `lib/server/projectImages.ts` answers «which are uploaded?». It used to
 * answer with `existsSync` at REQUEST time, which was correct on a host whose
 * lambdas carry the repository files — and quietly wrong everywhere else. On
 * Cloudflare Workers there is no repository filesystem at request time at
 * all: every card would have fallen back to its placeholder while the files
 * sat on the CDN, the same invisible-images failure this project has already
 * had once, on a second host, for a second reason.
 *
 * This config file is the one place guaranteed to run under Node with the
 * real repository present — on every host, because it IS the build. So the
 * directory is read once here, and the answer ships as an inlined constant:
 * Next substitutes `env` entries at build time into both bundles, so the
 * resolver does string lookups and never touches a filesystem again. Adding
 * a photograph still takes no data edit — drop the file, push, and the next
 * build sees it. (In `next dev` the list is read when the dev server starts;
 * a file dropped in mid-session appears on restart.)
 */
function uploadedProjectImages(): Record<string, string[]> {
  const root = path.join(process.cwd(), 'public/assets/projects');
  if (!existsSync(root)) return {};
  const out: Record<string, string[]> = {};
  for (const dir of readdirSync(root, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const files = readdirSync(path.join(root, dir.name))
      .filter(f => f.endsWith('.webp'))
      .sort();
    if (files.length > 0) out[dir.name] = files;
  }
  return out;
}

/**
 * The web surface of FPVARABIC.
 *
 * `outputFileTracingRoot` points at the repository root because that is where
 * the module graph genuinely ends: `@core/*` maps to `../src`, and Turbopack
 * compiles only what sits inside this root — pin it to `web/` and every
 * import that reaches the shared core fails with module-not-found (224 of
 * them, measured). The root being the parent also nests the standalone
 * output as `standalone/web/.next`, which is exactly the layout the OpenNext
 * adapter expects for a workspace member: it walks up from `web/` to the
 * single workspace lockfile at the repository root and derives the same
 * geometry. One lockfile, one root, every tool in agreement — which is the
 * reason the repository is an npm workspace and `web/` carries no lockfile
 * of its own.
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
  outputFileTracingRoot: path.join(__dirname, '..'),

  // The build-time answer to «which project photographs are uploaded» —
  // see uploadedProjectImages() above. Inlined into the bundles, so the
  // resolver works identically on a filesystem-less runtime. This replaced
  // `outputFileTracingIncludes` for the same files: tracing shipped the
  // photographs INTO the lambdas so runtime existsSync could see them, and
  // with no runtime filesystem reads left there is nothing for the lambdas
  // to carry — the CDN serves the files, the constant answers the question.
  env: {
    UPLOADED_PROJECT_IMAGES: JSON.stringify(uploadedProjectImages()),
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

  /**
   * The community section was RETIRED from the web experience and replaced by
   * «البناء». The route redirects rather than 404s because links to it exist
   * in the wild — old shares, browser history, the phone app's own copy —
   * and each should land somewhere alive. TEMPORARY (307) by instruction:
   * the Supabase data underneath is intact, and a permanent redirect would
   * teach caches and crawlers to never come back if the section returns.
   */
  async redirects() {
    return [
      { source: '/community', destination: '/build', permanent: false },
      { source: '/community/:path*', destination: '/build', permanent: false },
    ];
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
