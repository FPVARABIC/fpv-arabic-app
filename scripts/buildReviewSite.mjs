/**
 * Build a fully static, browsable copy of FPVARABIC for review.
 *
 * WHY A SEPARATE BUILD AND NOT A FLAG
 * -----------------------------------
 * The real site is a Next.js SERVER application: middleware, nine server-action
 * files, twelve force-dynamic pages and eight API routes. `output: 'export'`
 * rejects every one of those, and bending the real app to satisfy it would mean
 * removing the admin panel, the session and the checkout from the product in
 * order to look at the product.
 *
 * So nothing in `web/` is touched. This copies it to a scratch directory, prunes
 * the parts that need a server, and builds THAT. The result is a directory of
 * plain HTML a static host can serve — which is the only kind of host reachable
 * from here without an account credential.
 *
 * WHAT THE REVIEW COPY LOSES, AND WHY THAT IS ACCEPTABLE
 * -----------------------------------------------------
 * Signing in, posting, ordering and the admin panel — everything that writes.
 * All of it needs a server and a database, and none of it can be judged by
 * looking anyway. What survives is everything the review is FOR: every page,
 * every route, the whole design, the encyclopedia, the store, the project
 * workspace, and the real navigation between them.
 *
 * Pages that would have been dynamic render their honest not-configured state —
 * the same state the real site shows without credentials, which is what the
 * reviewer would see there too.
 */
import { cpSync, rmSync, existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const SRC = join(ROOT, 'web');
const OUT = join(ROOT, '.review-site');
const BASE_PATH = process.env.REVIEW_BASE_PATH ?? '';

rmSync(OUT, { recursive: true, force: true });

// Copy the web app, minus everything regenerable.
// The filter matches the BASENAME, not the tail of the path. Written as
// `/(node_modules|\.next|out)$/` it also excluded `app/about`, because «about»
// ends in «out» — so the About page silently never reached the copy and never
// appeared in the build. Nothing failed; the page simply was not there.
const SKIP = new Set(['node_modules', '.next', 'out']);
cpSync(SRC, OUT, {
  recursive: true,
  filter: (s) => !SKIP.has(basename(s)),
});

const drop = (p) => rmSync(join(OUT, p), { recursive: true, force: true });

// ── The parts that genuinely require a server ────────────────────────────────
drop('middleware.ts');        // rewrites requests; there is no request here
drop('app/api');              // route handlers
drop('app/admin');            // every page force-dynamic, every action a write
drop('app/community/new');    // a form whose submit is a server action
drop('app/store/cart/checkout');
drop('app/profile');          // redirects on a session that cannot exist

// A post page cannot enumerate ids without a database, so it has no static
// params — the route is dropped rather than shipped broken.
drop('app/community/posts');

// `/signin` posts a token to an endpoint that no longer exists here. It stays
// as a page — it is part of the design under review — and says so.
for (const f of ['app/signin/page.tsx', 'app/settings/page.tsx', 'app/search/page.tsx']) {
  const p = join(OUT, f);
  if (!existsSync(p)) continue;
  let s = readFileSync(p, 'utf8');
  s = s.replace(/export const dynamic = 'force-dynamic';\n?/g, '');
  writeFileSync(p, s);
}

// ── Metadata routes ──────────────────────────────────────────────────────────
// `manifest.webmanifest`, `robots.txt` and `sitemap.xml` are route handlers, and
// a static export refuses a route handler that has not declared itself static.
// The manifest and robots stay (an installable review copy is worth having);
// the sitemap is dropped, because a review copy must never offer one.
drop('app/sitemap.ts');
for (const f of ['app/manifest.ts', 'app/robots.ts']) {
  const p = join(OUT, f);
  if (!existsSync(p)) continue;
  const s = readFileSync(p, 'utf8');
  writeFileSync(p, `export const dynamic = 'force-static';\n${s}`);
}

// ── Pages that read the query string ─────────────────────────────────────────
// A static export has no request, so `await searchParams` cannot be prerendered
// anywhere. These pages are NOT dropped — `/search` is the platform's spine and
// `/signin` is part of the design under review. Each renders its no-parameters
// state instead, which is the state carrying the layout worth looking at.
//
// Done by scanning every page rather than by naming files: the first two
// attempts fixed `/search`, then `/signin`, and a third would have found the
// next one. A rule beats a list.
{
  const pages = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'page.tsx') pages.push(p);
    }
  };
  walk(join(OUT, 'app'));

  let patched = 0;
  for (const p of pages) {
    const before = readFileSync(p, 'utf8');
    // `const { a, b } = await searchParams;` and `const x = await searchParams;`
    let after = before.replace(
      /const\s+(\{[^}]*\}|[A-Za-z_$][\w$]*)\s*=\s*await\s+searchParams;/g,
      (_m, target) => `void searchParams;\n  const ${target} = {} as never;`);
    // Every remaining per-request page. Each already renders an honest
    // «not configured» state without credentials — making it static bakes that
    // state in rather than removing the page from the review.
    after = after.replace(/export const dynamic = 'force-dynamic';/g,
      "export const dynamic = 'force-static';");
    if (after !== before) { writeFileSync(p, after); patched++; }
  }
  console.log(`  made ${patched} page(s) statically renderable`);
}

// ── Anything still importing a pruned module ─────────────────────────────────
// The layout reads the session; without it every page renders signed-out, which
// is the correct state for a review copy.
{
  const p = join(OUT, 'app/layout.tsx');
  let s = readFileSync(p, 'utf8');
  s = s.replace(/import \{ getSession \} from '@\/lib\/server\/session';\n/, '');
  s = s.replace(/const session = await getSession\(\);/,
    'const session = null as Awaited<ReturnType<typeof import("@/lib/server/session").getSession>>;');
  writeFileSync(p, s);
}

// ── The export config ────────────────────────────────────────────────────────
writeFileSync(join(OUT, 'next.config.ts'), `import type { NextConfig } from 'next';
import path from 'node:path';

/** Generated by scripts/buildReviewSite.mjs — not edited by hand. */
const nextConfig: NextConfig = {
  output: 'export',
  outputFileTracingRoot: path.join(process.cwd(), '..'),
  basePath: ${JSON.stringify(BASE_PATH)},
  images: { unoptimized: true },
  // A static host serves /about as /about/index.html; trailing slashes make
  // every internal link resolve without a server rewrite.
  trailingSlash: true,
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
`);

// The copy sits at the repository root, exactly where `web/` sits, so every
// `../src/*` alias in its tsconfig already resolves to the real shared core.
// Rewriting them to `../../src/*` broke every @core import — the first attempt
// did precisely that.

// A review copy must never be indexed, on any host. `robots.ts` already returns
// disallow-everything when NEXT_PUBLIC_SITE_URL does not name the canonical
// origin — which it never does here — but a static file is belt and braces, and
// it survives even if someone later sets that variable by accident.
writeFileSync(join(OUT, 'public', 'robots.txt'), 'User-agent: *\nDisallow: /\n');

execSync('npm install --no-save --prefer-offline', { cwd: OUT, stdio: 'inherit' });
/*
 * Tells the pages they are being built for review rather than for a live
 * deployment. Exactly one thing reads it today: the community feed, which is
 * absent here for a structural reason (no server, so no live database read)
 * and says so in the reviewer's terms instead of pointing at an env file.
 *
 * `NEXT_PUBLIC_` because it has to survive into the rendered output — and it
 * is safe to: it carries no secret, only the fact that this is a review copy.
 */
execSync('npx next build', {
  cwd: OUT,
  stdio: 'inherit',
  env: { ...process.env, NEXT_PUBLIC_REVIEW_COPY: '1' },
});

const dist = join(OUT, 'out');
const count = (d) => readdirSync(d).reduce((n, e) => {
  const p = join(d, e);
  return n + (statSync(p).isDirectory() ? count(p) : (e.endsWith('.html') ? 1 : 0));
}, 0);
console.log(`\n✅ review site built: ${count(dist)} HTML pages in ${dist}`);
