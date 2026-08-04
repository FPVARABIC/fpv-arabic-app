import type { NextConfig } from 'next';
import path from 'node:path';

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
    // Community media lives in Firebase Storage. Only that host is allowed —
    // an open remote-image policy is an SSRF and cost amplifier.
    remotePatterns: [
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
    ];
  },
};

export default nextConfig;
