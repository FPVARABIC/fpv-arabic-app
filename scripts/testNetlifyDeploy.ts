#!/usr/bin/env tsx
/**
 * Does the Netlify deployment actually serve the site?
 *
 * WHY A BUILD THAT SUCCEEDS PROVES NOTHING
 * ----------------------------------------
 * The first Netlify deploy of this repository showed a blank white page, and
 * every artefact was fine: `next build` passed, the bundle was correct, the
 * tests were green. Nothing in the repository was broken. What was wrong was
 * WHICH configuration Netlify read, and that is invisible to every check that
 * looks at source or at build output.
 *
 * A site whose base directory is set in the Netlify UI reads `netlify.toml`
 * from INSIDE that directory. The repository had one only at the root, so it
 * was ignored: no root dependency install, no runtime plugin. The raw UI
 * command then failed on `firebase/app`, a failed build publishes nothing, and
 * the site kept serving the deploy Netlify had made when it first auto-detected
 * the Vite app at the repository root — the Android surface, which renders
 * blank as a website because `src/lib/firebase.ts` calls `getAuth()` at module
 * scope and that throws without `VITE_FIREBASE_*`.
 *
 * So this suite asks the two questions that would have caught it:
 *
 *   1. Is the config in a place a base-directory site will read, and do the
 *      two copies agree?
 *   2. When the REAL generated Netlify function is handed a request for `/`,
 *      does it answer with the Next.js app — or with an empty shell?
 *
 * The second half runs the actual `.netlify/functions/…zip` produced by
 * `netlify build`, against a stand-in for Netlify Blobs. It is the closest
 * reproduction of the deployed runtime this environment allows.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync, rmSync, symlinkSync, lstatSync, unlinkSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');

let passed = 0;
let failed = 0;
function ok(label: string, cond: boolean): void {
  if (cond) { passed++; console.log(`  ok — ${label}`); }
  else { failed++; console.log(`  FAIL — ${label}`); }
}

/** Values from a netlify.toml, comments stripped so they cannot satisfy a rule. */
function toml(file: string): { live: string; get: (k: string) => string | null } {
  const live = read(file).split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
  return {
    live,
    get: (k: string) => new RegExp(`^\\s*${k}\\s*=\\s*"([^"]*)"`, 'm').exec(live)?.[1] ?? null,
  };
}

console.log('\n[1] The config sits where a base-directory site will read it');
{
  ok('web/netlify.toml exists — the copy a `Base directory: web` site reads',
    existsSync(path.join(ROOT, 'web/netlify.toml')));
  ok('netlify.toml exists at the root — the copy read when the UI base is empty',
    existsSync(path.join(ROOT, 'netlify.toml')));

  const web = toml('web/netlify.toml');
  const root = toml('netlify.toml');

  // The root copy must declare the base; the web copy must NOT, or Netlify —
  // already inside web/ when it reads it — would resolve `web/web`.
  ok('the root copy declares base = "web"', root.get('base') === 'web');
  ok('the web copy declares no base at all', web.get('base') === null);

  // Everything else has to agree, or the site behaves differently depending on
  // a setting in a UI nobody can see from here.
  for (const key of [
    'command', 'publish', 'NODE_VERSION', 'STAGING', 'PAYMENT_PROVIDER',
    'SECRETS_SCAN_OMIT_KEYS', 'PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD', 'PUPPETEER_SKIP_DOWNLOAD',
  ]) {
    const a = root.get(key);
    const b = web.get(key);
    ok(`both copies agree on ${key}`, a !== null && a === b);
  }

  for (const [name, t] of [['root', root], ['web', web]] as const) {
    ok(`the ${name} copy installs the repository root before building`,
      /cd\s+\.\.\s*&&\s*npm\s+ci/.test(t.get('command') ?? ''));
    ok(`the ${name} copy declares the Next.js runtime plugin`,
      /package\s*=\s*"@netlify\/plugin-nextjs"/.test(t.live));
  }
}

console.log('\n[2] The blank-screen shell now explains itself');
{
  // The root index.html is what a misconfigured Netlify serves. It must never
  // again be able to show nothing at all.
  const shell = read('index.html');
  ok('the Vite shell carries a fallback that runs without the bundle',
    /id="root"/.test(shell) && /التطبيق لم يبدأ/.test(shell));
  ok('…and it is inline, so it survives the bundle failing to evaluate',
    /<script>[\s\S]*getElementById\('root'\)[\s\S]*<\/script>/.test(shell));
  ok('…and it points at the real cause rather than a generic apology',
    shell.includes('web/netlify.toml') && shell.includes('Base directory'));
}

/* ── The runtime half ────────────────────────────────────────────────────── */

const FN_ZIP = path.join(ROOT, 'web/.netlify/functions/___netlify-server-handler.zip');
const WORK = path.join(ROOT, '.netlify-repro');

if (process.env.SKIP_NETLIFY_RUNTIME === '1') {
  console.log('\n[3] Runtime reproduction SKIPPED (SKIP_NETLIFY_RUNTIME=1)');
} else {
  console.log('\n[3] The real generated function answers like a website');

  if (!existsSync(FN_ZIP)) {
    console.log('  building via the Netlify pipeline (a couple of minutes)…');
    try {
      execFileSync('npx', ['--yes', 'netlify-cli@latest', 'build', '--offline'],
        { cwd: ROOT, stdio: 'pipe', env: { ...process.env, SKIP_NETLIFY_RUNTIME: '1' } });
    } catch {
      // Edge-function bundling downloads Deno, which this sandbox's gateway
      // refuses. The server function is already written by then, and its
      // presence is asserted below rather than assumed.
    }
  }

  ok('the Netlify pipeline produced a server function', existsSync(FN_ZIP));
  ok('…and the client chunks that the CDN serves',
    existsSync(path.join(ROOT, 'web/.netlify/static/_next/static')));

  if (existsSync(FN_ZIP)) {
    rmSync(WORK, { recursive: true, force: true });
    mkdirSync(WORK, { recursive: true });
    execFileSync('unzip', ['-q', FN_ZIP, '-d', WORK]);

    // The generated handler hard-codes `/var/task`, which is where Netlify
    // mounts a function. Reproducing that path is what makes it runnable.
    const TASK = '/var/task';
    try { if (lstatSync(TASK)) unlinkSync(TASK); } catch { /* absent */ }
    symlinkSync(WORK, TASK);

    // Every read a miss, every write a success — enough for the Next cache
    // handler to fall through to a real render.
    const store = new Map<string, Buffer>();
    const blobs: Server = createServer((req, res) => {
      const key = (req.url ?? '').split('?')[0];
      if (req.method === 'GET' || req.method === 'HEAD') {
        const hit = store.get(key);
        if (hit) { res.writeHead(200); res.end(hit); } else { res.writeHead(404); res.end('miss'); }
        return;
      }
      const chunks: Buffer[] = [];
      req.on('data', c => chunks.push(c as Buffer));
      req.on('end', () => { store.set(key, Buffer.concat(chunks)); res.writeHead(200); res.end('{}'); });
    });
    // Port 0 — the OS picks a free one. A fixed port makes the suite fail for
    // the one reason that has nothing to do with the deployment: something
    // else on the machine already holds it.
    await new Promise<void>(r => blobs.listen(0, '127.0.0.1', r));
    const blobPort = (blobs.address() as { port: number }).port;
    const blobURL = `http://127.0.0.1:${blobPort}`;

    process.env.NETLIFY_BLOBS_CONTEXT = Buffer.from(JSON.stringify({
      siteID: 'repro', deployID: 'reprodeploy', token: 't',
      edgeURL: blobURL, uncachedEdgeURL: blobURL,
      primaryRegion: 'us-east-2',
    })).toString('base64');
    process.env.NO_PROXY = '*';
    process.env.no_proxy = '*';
    process.env.STAGING = 'true';
    process.env.PAYMENT_PROVIDER = 'mollie';

    const mod = await import(`${TASK}/___netlify-server-handler.mjs`) as {
      default: (req: Request, ctx: unknown) => Promise<Response>;
    };
    const ctx = {
      account: { id: 'a' }, deploy: { id: 'd' }, site: { id: 's' }, requestId: 'r',
      geo: {}, cookies: { get: () => undefined, set: () => {}, delete: () => {} },
      log: () => {}, next: async () => new Response(null, { status: 404 }),
    };

    async function fetchPath(p: string) {
      const res = await mod.default(
        new Request(`https://fpvarabic.netlify.app${p}`, { headers: { host: 'fpvarabic.netlify.app' } }),
        ctx,
      );
      return { status: res.status, headers: res.headers, body: res.body ? await res.text() : '' };
    }

    const home = await fetchPath('/');
    ok(`GET / answers 200 (got ${home.status})`, home.status === 200);
    ok(`…with a real page, not an empty shell (${home.body.length} bytes)`, home.body.length > 20000);

    /*
     * THE ASSERTION THAT NAMES THE BUG.
     *
     * The white page was the Vite shell: `<div id="root"></div>` and a script
     * tag, with the content supplied by JavaScript that never ran. The Next
     * app server-renders its content, so the marker of «right app» is that the
     * HTML already CONTAINS the site — not that it promises to fetch it.
     */
    ok('the HTML is the server-rendered Next app, not the Vite SPA shell',
      !/<div id="root"><\/div>/.test(home.body) && /<html lang="ar" dir="rtl"/.test(home.body));
    ok('…and the navigation is present in the HTML itself',
      home.body.includes('المجتمع') && home.body.includes('الموسوعة'));
    ok('…carrying the staging badge', home.body.includes('نسخة تجريبية'));
    ok('…and the site-wide noindex header',
      /noindex/.test(home.headers.get('x-robots-tag') ?? ''));

    const community = await fetchPath('/community');
    ok(`GET /community answers 200 (got ${community.status})`, community.status === 200);
    ok('…and renders the community surface rather than an error',
      community.body.length > 10000 && community.body.includes('المجتمع'));

    const signin = await fetchPath('/signin');
    ok(`GET /signin answers 200 (got ${signin.status})`, signin.status === 200);
    ok('…and renders a sign-in surface', signin.body.includes('تسجيل الدخول'));

    // The admin gate must still be a gate when nobody is signed in.
    const admin = await fetchPath('/admin');
    ok(`GET /admin refuses an anonymous visitor (got ${admin.status})`,
      admin.status === 307 || admin.status === 302 || admin.status === 401 || admin.status === 404);

    /*
     * The chunks the HTML asks for must exist in what the CDN publishes.
     *
     * The path set is collected from BOTH the `<script>`/`<link>` tags and the
     * RSC payload, and the payload is JSON-escaped inside the HTML — so the
     * terminator is `\` as well as a quote. Without the backslash in this
     * class the capture swallowed it and reported 59 of 71 assets missing that
     * were all present; the difference was entirely in this character.
     */
    const wanted = [...new Set(
      [...home.body.matchAll(/\/_next\/static\/([^"'\\\s)]+)/g)].map(m => m[1]),
    )];
    const missing = wanted.filter(rel =>
      !existsSync(path.join(ROOT, 'web/.netlify/static/_next/static', rel)));
    ok(`every /_next/static asset the page requests is published (${wanted.length} referenced, ${missing.length} missing)`,
      wanted.length > 0 && missing.length === 0);

    /*
     * [4] A REAL BROWSER, BECAUSE «WHITE PAGE» IS A BROWSER FACT
     * ---------------------------------------------------------
     * Every assertion above could pass while a visitor still saw nothing: the
     * failure that started this was a 200 response whose content was supposed
     * to arrive from JavaScript that threw before it ran. The only way to
     * distinguish «served» from «visible» is to render it.
     *
     * The bridge below is the deployment's own two halves: static files from
     * the published directory, everything else to the generated function —
     * which is exactly how Netlify routes with `preferStatic: true`.
     */
    console.log('\n[4] A browser sees a page, not a blank screen');
    const STATIC = path.join(ROOT, 'web/.netlify/static');
    const TYPES: Record<string, string> = {
      '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
      '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2',
      '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain',
    };
    const assetStatus = new Map<string, number>();
    const site: Server = createServer((req, res) => {
      const pathname = decodeURIComponent((req.url ?? '/').split('?')[0]);
      const onDisk = path.join(STATIC, pathname);
      if (!pathname.endsWith('/') && existsSync(onDisk) && !onDisk.endsWith(path.sep)) {
        assetStatus.set(pathname, 200);
        res.writeHead(200, { 'content-type': TYPES[path.extname(onDisk)] ?? 'application/octet-stream' });
        res.end(readFileSync(onDisk));
        return;
      }
      mod.default(new Request(`http://127.0.0.1${pathname}`), ctx).then(async r => {
        assetStatus.set(pathname, r.status);
        const buf = Buffer.from(await r.arrayBuffer());
        const h: Record<string, string> = {};
        r.headers.forEach((v, k) => { if (k !== 'content-encoding') h[k] = v; });
        res.writeHead(r.status, h);
        res.end(buf);
      }).catch(() => { res.writeHead(500); res.end('err'); });
    });
    await new Promise<void>(r => site.listen(0, '127.0.0.1', r));
    const sitePort = (site.address() as { port: number }).port;

    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
      .catch(() => chromium.launch());
    const page = await browser.newPage();
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    const badResponses: string[] = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400) badResponses.push(`${r.status()} ${new URL(r.url()).pathname}`); });

    /*
     * `waitUntil: 'load'` and then an explicit wait for CONTENT, deliberately
     * not `networkidle`. This app holds a connection open (RSC prefetch), so
     * the network never goes idle and the first version of this suite hung for
     * ten minutes with a browser open and nothing printed. Waiting for the
     * thing actually being asserted — text on the page — is both faster and a
     * truer statement of the requirement.
     */
    await page.goto(`http://127.0.0.1:${sitePort}/`, { waitUntil: 'load', timeout: 30_000 });
    await page.waitForFunction(
      () => document.body.innerText.trim().length > 400, null, { timeout: 20_000 },
    ).catch(() => { /* asserted below, with the actual length in the message */ });

    const visible = (await page.evaluate(() => document.body.innerText)).trim();
    ok(`the page shows text rather than nothing (${visible.length} chars)`, visible.length > 400);
    ok('…and it is the platform, not an error shell',
      visible.includes('المجتمع') && visible.includes('الموسوعة'));
    ok('…with the staging badge visible to a reader', visible.includes('نسخة تجريبية'));

    // The exact failure that produced the white page: a module-scope throw
    // leaves `#root` — or in Next's case the app shell — with no children.
    const emptyRoot = await page.evaluate(() => {
      const r = document.getElementById('root');
      return r ? r.children.length === 0 : false;
    });
    ok('no empty #root shell is being served', !emptyRoot);

    ok(`no uncaught page errors (${pageErrors.length}${pageErrors[0] ? `: ${pageErrors[0].slice(0, 60)}` : ''})`,
      pageErrors.length === 0);
    ok(`no console errors (${consoleErrors.length}${consoleErrors[0] ? `: ${consoleErrors[0].slice(0, 60)}` : ''})`,
      consoleErrors.length === 0);
    ok(`every request the page made returned under 400 (${badResponses.length} bad: ${badResponses.slice(0, 3).join(', ')})`,
      badResponses.length === 0);

    const nextAssets = [...assetStatus].filter(([p]) => p.startsWith('/_next/'));
    ok(`/_next/* assets all answered 200 (${nextAssets.length} requested)`,
      nextAssets.length > 0 && nextAssets.every(([, s]) => s === 200));

    // The community page must render for a signed-out visitor too — an empty
    // list is a legitimate state, a blank page is not.
    await page.goto(`http://127.0.0.1:${sitePort}/community`, { waitUntil: 'load', timeout: 30_000 });
    const communityText = (await page.evaluate(() => document.body.innerText)).trim();
    ok(`/community renders in the browser (${communityText.length} chars)`, communityText.length > 300);

    await page.goto(`http://127.0.0.1:${sitePort}/signin`, { waitUntil: 'load', timeout: 30_000 });
    const signinText = (await page.evaluate(() => document.body.innerText)).trim();
    ok('/signin renders a usable sign-in surface', signinText.includes('تسجيل الدخول'));

    await browser.close();
    site.close();
    blobs.close();
    try { unlinkSync(TASK); } catch { /* already gone */ }
    rmSync(WORK, { recursive: true, force: true });
  }
}

console.log(`\n${'─'.repeat(66)}`);
console.log(`netlify deploy: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
