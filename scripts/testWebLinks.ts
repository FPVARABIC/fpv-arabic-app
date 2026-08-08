/**
 * The internal-link crawler — «صفر طريق مسدود», proven by walking every path.
 *
 * WHAT COUNTS AS A DEAD END
 * -------------------------
 * Not just a 404. The closure rule is stricter: any destination a visitor
 * reaches from something that LOOKED ready must hold real content. So every
 * crawled page is judged three ways:
 *
 *   1. STATUS   — 200, or a redirect on the declared allowlist (the retired
 *                 community, the pre-launch sign-in, the folded checkout).
 *   2. MARKERS  — the phrases our own codebase uses for not-ready surfaces
 *                 («قيد التطوير», «هذه الصفحة غير موجودة»…) must not appear
 *                 in a page other pages LINK to. Pages that legitimately
 *                 carry a marker (the store's opening-soon banner, the 404
 *                 page itself) are allowlisted BY PATH with the reason.
 *   3. SUBSTANCE— the <main> region must carry real text. A 200 with a
 *                 heading and nothing under it is a dead end with extra
 *                 steps. Client-island pages (the wizard, «مشروعي») render
 *                 their shell server-side and their substance in the
 *                 browser, so they are exempt from the text floor — their
 *                 interactive depth is covered by the E2E suite.
 *
 * It crawls the RENDERED HTML (SSR output via fetch), breadth-first from
 * every navigation root, following only same-origin links a visitor can see.
 * Pass BASE=https://… to point it at production; it defaults to a local
 * `next start`.
 *
 * Run: npx tsx --tsconfig web/tsconfig.json scripts/testWebLinks.ts
 *      BASE=https://fpv-arabic-app.vercel.app SKIP_SERVER=1 … for production.
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';

const PORT = 3163;
const BASE = (process.env.BASE ?? `http://localhost:${PORT}`).replace(/\/$/, '');
const SKIP_SERVER = process.env.SKIP_SERVER === '1' || !!process.env.BASE;

let passed = 0;
const failures: string[] = [];
function ok(label: string, cond: boolean) {
  if (cond) { passed++; }
  else { failures.push(label); console.log(`  FAIL — ${label}`); }
}

/** Redirects that are DESIGN, not decay. Target must match too. */
const INTENDED_REDIRECTS: Record<string, string> = {
  '/community': '/build',
  '/signin': '/',
  '/store/cart/checkout': '/store/cart',
};
const REDIRECT_PREFIXES: [string, string][] = [
  ['/community/', '/build'],
  ['/store/cart/checkout/', '/store/cart'],
];

/** Not-ready phrases. A LINKED page carrying one is a dead end. */
const DEAD_MARKERS = [
  'قيد التطوير',
  'هذه الصفحة غير موجودة',
  'لم تُوثَّق هذه الصفحة بعد',
  'المنصّة لم تستطع بدء الصفحة',
  // The staging sash. It renders only on a DECLARED staging deploy (see
  // showStagingBadge) — appearing on ANY crawled page means the launch
  // cleanup regressed, on production most of all.
  'نسخة تجريبية —',
];

/**
 * Pages allowed to carry a marker, with the reason — each is either the
 * not-ready NOTICE ITSELF (reached knowingly) or names its gaps honestly
 * inside real content.
 */
const MARKER_ALLOWLIST: Record<string, string> = {
  '/store': 'the opening-soon banner IS the honest notice, atop a working storefront',
  '/store/cart': 'same banner text on the cart\'s call-to-action',
};

/** Paths never crawled: private, admin, or deliberately unlinked. */
const SKIP = (path: string) =>
  path.startsWith('/admin') || path.startsWith('/api/') || path.startsWith('/profile')
  || path.startsWith('/_next') || path.includes('.webp') || path.includes('.png')
  || path.includes('.xml') || path.includes('.txt') || path.includes('.svg');

function freePort() {
  spawnSync('bash', ['-c', `fuser -k ${PORT}/tcp 2>/dev/null || true`], { stdio: 'ignore' });
}

async function startServer(): Promise<ChildProcess | null> {
  if (SKIP_SERVER) return null;
  freePort();
  const proc = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    cwd: 'web', env: process.env, stdio: ['ignore', 'pipe', 'pipe'], detached: true,
  });
  for (let i = 0; i < 60; i++) {
    if (proc.exitCode !== null) throw new Error(`next start exited ${proc.exitCode}`);
    try { const r = await fetch(`${BASE}/build`); if (r.status > 0) return proc; }
    catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('server never came up');
}

/** Normalize an internal href to a crawl key. Returns null for externals. */
function normalize(href: string, fromPath: string): string | null {
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return null;
  let url: URL;
  try { url = new URL(href, `${BASE}${fromPath}`); } catch { return null; }
  if (!url.href.startsWith(BASE)) return null;
  const path = url.pathname.replace(/\/$/, '') || '/';
  // Query strings matter on /search only; elsewhere they duplicate the page.
  return path === '/search' && url.search ? `${path}${url.search}` : path;
}

function extractLinks(html: string): string[] {
  // The pages are server-rendered; anchors are in the HTML. Client-only
  // interactions are buttons, not links, and the E2E suite drives those.
  const out = new Set<string>();
  for (const m of html.matchAll(/<a\s[^>]*href="([^"]+)"/g)) out.add(m[1]);
  return [...out];
}

/**
 * VISIBLE text only. The app router embeds the not-found boundary's copy in
 * every page's RSC <script> payload, so a marker check against raw HTML
 * convicts every healthy page of being a 404. Scripts and styles are not
 * something a visitor reads.
 */
function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function mainText(html: string): string {
  const main = html.match(/<main[\s\S]*?<\/main>/)?.[0]
    ?? html.match(/<body[\s\S]*?<\/body>/)?.[0] ?? html;
  return visibleText(main);
}

/** Client-island shells: substance renders in the browser, E2E covers it. */
const CLIENT_ISLANDS = ['/build/wizard', '/project', '/store/cart'];

async function main() {
  const server = await startServer();
  const seen = new Map<string, string>();       // path -> first referrer
  const queue: [string, string][] = [
    ['/', '(root)'], ['/build', '(nav)'], ['/programming', '(nav)'], ['/kb', '(nav)'],
    ['/projects', '(nav)'], ['/store', '(nav)'], ['/search?q=UART', '(seed)'],
    ['/glossary', '(seed)'], ['/diagnose', '(seed)'], ['/settings', '(seed)'],
    ['/contact', '(seed)'], ['/about', '(seed)'],
    // Nothing LINKS to these three any more — that absence is itself part of
    // the design — but their redirect behaviour must hold for old links from
    // outside, so they are probed explicitly every run.
    ['/community', '(probe)'], ['/signin', '(probe)'], ['/store/cart/checkout', '(probe)'],
  ];
  let status200 = 0, redirects = 0;

  console.log(`\n[crawl] ${BASE}`);
  while (queue.length > 0) {
    const [path, from] = queue.shift()!;
    if (seen.has(path) || SKIP(path)) continue;
    seen.set(path, from);

    const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });

    if (res.status >= 300 && res.status < 400) {
      const loc = new URL(res.headers.get('location') ?? '/', BASE).pathname;
      const intended = INTENDED_REDIRECTS[path] === loc
        || REDIRECT_PREFIXES.some(([p, t]) => path.startsWith(p) && loc === t);
      ok(`${path} (from ${from}): redirect → ${loc} is intended`, intended);
      if (intended) redirects++;
      continue;
    }

    ok(`${path} (from ${from}): HTTP ${res.status}`, res.status === 200);
    if (res.status !== 200) continue;
    status200++;

    const html = await res.text();
    const visible = visibleText(html);

    const marker = DEAD_MARKERS.find(m => visible.includes(m));
    const allowReason = MARKER_ALLOWLIST[path];
    ok(`${path} (from ${from}): no dead-end marker${marker && !allowReason ? ` («${marker}»)` : ''}`,
      !marker || !!allowReason);

    if (!CLIENT_ISLANDS.some(p => path === p || path.startsWith(`${p}/`))) {
      const text = mainText(html);
      ok(`${path} (from ${from}): real content (${text.length} chars)`, text.length >= 200);
    }

    for (const href of extractLinks(html)) {
      const next = normalize(href, path);
      if (next && !seen.has(next) && !SKIP(next)) queue.push([next, path]);
    }
  }

  if (server?.pid) { try { process.kill(-server.pid); } catch { /* gone */ } }
  if (!SKIP_SERVER) freePort();

  console.log(`\n[crawl] pages: ${seen.size} · 200s: ${status200} · intended redirects: ${redirects}`);
  console.log(`${failures.length === 0 ? '✅' : '❌'} testWebLinks: ${passed} passed, ${failures.length} failed`);
  if (failures.length > 0) { failures.slice(0, 25).forEach(f => console.log(`   FAIL — ${f}`)); process.exit(1); }
}

main().catch(e => { console.error(e); process.exit(1); });
