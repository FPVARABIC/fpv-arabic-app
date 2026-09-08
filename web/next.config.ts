import type { NextConfig } from 'next';
import path from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { isStagingFromEnv } from './lib/staging';

/**
 * WHICH PROJECT PHOTOGRAPHS EXIST — DECIDED HERE, AT BUILD TIME
 * -------------------------------------------------------------
 * The owner drops covers into `public/assets/projects/<id>/` and pushes;
 * `lib/server/projectImages.ts` answers «which are uploaded?». The obvious
 * implementation asks `existsSync` at REQUEST time, and it is correct exactly
 * as long as the serving runtime carries the repository files — true of a
 * local `next start`, conditionally true of a lambda, and false on a
 * filesystem-less runtime. The failure mode is the quiet one: files on the
 * CDN, placeholders on the cards, nothing red anywhere.
 *
 * This config file is the one place guaranteed to run under Node with the
 * real repository present — on every host, because it IS the build. So the
 * directory is read once here and the answer ships as an inlined constant:
 * Next substitutes `env` entries at build time, so the resolver does string
 * lookups and never touches a filesystem. Adding a photograph still takes no
 * data edit — drop the file, push, and the next build sees it. (In `next dev`
 * the list is read when the dev server starts; a file dropped mid-session
 * appears on restart.)
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
 *
 * WHICH MEANS THE BUILD MUST INSTALL THE ROOT MANIFEST
 * ----------------------------------------------------
 * The rule above has a consequence that is easy to miss and fatal when missed:
 * a bare import inside `../src` resolves upward from `src/`, so it can only
 * ever be satisfied by the REPOSITORY ROOT's `node_modules` — never by
 * `web/node_modules`, which is not on that lookup path at all. Installing only
 * inside `web/` produces a build that fails at
 * «Module not found: Can't resolve 'firebase/storage'», and then the same for
 * `browser-image-compression`, and then `lucide-react` from the shared
 * diagrams: not three missing packages, one missing install.
 *
 * That is what happened on Vercel, whose project is rooted at `web/` and so
 * ran `npm install` there and nowhere else. `web/vercel.json` now declares an
 * `installCommand` that installs the root manifest first, keeping the single
 * copy exactly where this comment requires it.
 */
const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd(), '..'),

  // Read once above, inlined here, so the cover resolver works identically on
  // any runtime. See the note on `uploadedProjectImages`.
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
