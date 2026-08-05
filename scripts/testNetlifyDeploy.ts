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
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, symlinkSync, lstatSync, unlinkSync } from 'node:fs';
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

console.log('\n[2b] The publish gate catches the deploy that actually shipped');
{
  /*
   * The gate is only worth having if it FAILS on the artefact that went live.
   * So it is driven against a reconstruction of that artefact — the repository
   * root, whose `index.html` asks for `/src/main.tsx` — as well as against a
   * correct publish directory, because a check that rejects everything is as
   * useless as one that accepts everything.
   */
  const { verifyPublishDir } = await import('../web/netlify/plugins/verify-publish/verify.js') as {
    verifyPublishDir: (d: string) => { errors: string[]; stats: Record<string, number> };
  };

  // THE FAILING CASE, rebuilt exactly: the shell and the module the browser
  // refused, with the MIME type Netlify gives an unknown extension.
  const bad = path.join(ROOT, '.netlify-gate-check');
  rmSync(bad, { recursive: true, force: true });
  mkdirSync(path.join(bad, 'src'), { recursive: true });
  writeFileSync(path.join(bad, 'index.html'),
    '<!doctype html><html><body><div id="root"></div>'
    + '<script type="module" src="/src/main.tsx"></script></body></html>');
  writeFileSync(path.join(bad, 'src/main.tsx'), 'export const x = 1;\n');

  const rejected = verifyPublishDir(bad);
  ok(`the repository root is rejected (${rejected.errors.length} reason(s))`,
    rejected.errors.length > 0);
  ok('…naming /src/main.tsx specifically',
    rejected.errors.some(e => e.includes('src/main.tsx')));
  ok('…and the missing _next/static',
    rejected.errors.some(e => e.includes('_next/static')));
  ok('…and the source file a browser cannot execute',
    rejected.errors.some(e => /source file/.test(e)));
  rmSync(bad, { recursive: true, force: true });

  // An empty or absent directory must not pass by having nothing to object to.
  ok('an absent publish directory is rejected',
    verifyPublishDir(path.join(ROOT, '.does-not-exist')).errors.length > 0);

  // THE POSITIVE CONTROL. Without it every assertion above is satisfied by a
  // gate that simply refuses everything, and the first correct deploy fails.
  const real = path.join(ROOT, 'web/.netlify/static');
  if (existsSync(real)) {
    const accepted = verifyPublishDir(real);
    if (accepted.errors.length) console.log('      unexpected:', accepted.errors);
    ok(`the real Next publish directory is accepted (${accepted.stats.nextStatic} assets under _next/static)`,
      accepted.errors.length === 0 && accepted.stats.nextStatic > 0);
  } else {
    ok('the real Next publish directory exists to check against', false);
  }

  /*
   * A local plugin needs a manifest.yml, and declaring it in netlify.toml is
   * NOT enough. Without the file the whole build dies at config resolution:
   *
   *   The plugin "./netlify/plugins/verify-publish" is missing a "manifest.yml".
   *
   * Nothing in the repository showed that; running the real pipeline did. So
   * the file's existence is asserted rather than remembered.
   */
  const PLUGIN = 'web/netlify/plugins/verify-publish';
  ok('the gate has the manifest.yml Netlify requires of a local plugin',
    existsSync(path.join(ROOT, PLUGIN, 'manifest.yml')));
  ok('…naming itself, which is what the manifest is for',
    /^\s*name:\s*verify-publish\s*$/m.test(read(`${PLUGIN}/manifest.yml`)));
  ok('the gate declares its entry point',
    JSON.parse(read(`${PLUGIN}/package.json`)).main === 'index.js');

  // And it must be wired into both configs, or it protects nothing.
  for (const f of ['netlify.toml', 'web/netlify.toml']) {
    ok(`${f} declares the publish gate`,
      /package\s*=\s*"\.\/netlify\/plugins\/verify-publish"/.test(read(f)));
    ok(`${f} declares it AFTER the Next runtime`,
      read(f).indexOf('@netlify/plugin-nextjs') < read(f).indexOf('verify-publish'));
  }
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
     * [3b] THE THREE ROUTES THAT RETURNED 500 IN PRODUCTION
     * ----------------------------------------------------
     * `/community`, `/projects` and `/search` are the routes that are NOT
     * prerendered — they run the server function on every request, while `/`
     * is a static file that never does. That is the whole line between the
     * page that worked in production and the three that answered
     * `Internal Server Error`.
     *
     * They are driven here in BOTH environment shapes, because passing in one
     * says nothing about the other and the deployed site was in the second:
     *
     *   · no Firebase variables at all — the public content must still render
     *   · Firebase variables present but not usable — the shape a real deploy
     *     is in when a key is mangled or the project is unreachable. This is
     *     the case that used to throw out of `community.ts` and take the page
     *     down; a failed read is now a value.
     *
     * A 500 in either column is a failure. So is a 200 with no content — that
     * was the original bug wearing a different mask.
     */
    console.log('\n[3b] The three function-rendered routes, in both Firebase states');
    {
      const ROUTES = ['/community', '/projects', '/search?q=%D8%A8%D8%B7%D8%A7%D8%B1%D9%8A%D8%A9'];

      // A syntactically valid PEM that belongs to nothing, so `cert()` parses
      // and the failure lands where a real broken deploy's does: the read.
      const { generateKeyPairSync } = await import('node:crypto');
      const { privateKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        publicKeyEncoding: { type: 'spki', format: 'pem' },
      });

      const STATES: Array<{ label: string; env: Record<string, string | undefined> }> = [
        {
          label: 'no Firebase variables',
          env: {
            FIREBASE_PROJECT_ID: undefined,
            FIREBASE_CLIENT_EMAIL: undefined,
            FIREBASE_PRIVATE_KEY: undefined,
          },
        },
        {
          label: 'Firebase configured but unreachable',
          env: {
            FIREBASE_PROJECT_ID: 'fpvarabic-unreachable',
            FIREBASE_CLIENT_EMAIL: 'sa@fpvarabic-unreachable.iam.gserviceaccount.com',
            FIREBASE_PRIVATE_KEY: privateKey as string,
          },
        },
      ];

      for (const state of STATES) {
        const saved: Record<string, string | undefined> = {};
        for (const k of Object.keys(state.env)) saved[k] = process.env[k];
        for (const [k, v] of Object.entries(state.env)) {
          if (v === undefined) delete process.env[k]; else process.env[k] = v;
        }

        for (const route of ROUTES) {
          const r = await fetchPath(route);
          const name = route.split('?')[0];
          ok(`[${state.label}] ${name} answers 200 (got ${r.status})`, r.status === 200);
          ok(`[${state.label}] ${name} renders content (${r.body.length} bytes)`,
            r.body.length > 10_000);
          // The bare production fallback, which is what a missing error
          // boundary produces. Twenty-one bytes and no Arabic.
          ok(`[${state.label}] ${name} is not the bare Internal Server Error`,
            !/^Internal Server Error$/.test(r.body.trim()));
        }

        for (const [k, v] of Object.entries(saved)) {
          if (v === undefined) delete process.env[k]; else process.env[k] = v;
        }
      }
    }

    console.log('\n[3c] A failed render has somewhere to land');
    {
      // Without these files, ANY server exception becomes twenty-one bytes of
      // `Internal Server Error` — no message, no digest, no Arabic. That is
      // why the production failure could not be diagnosed from outside.
      ok('web/app/error.tsx exists', existsSync(path.join(ROOT, 'web/app/error.tsx')));
      ok('web/app/global-error.tsx exists — the root layout has a boundary too',
        existsSync(path.join(ROOT, 'web/app/global-error.tsx')));

      const routeErr = read('web/app/error.tsx');
      const globalErr = read('web/app/global-error.tsx');
      ok('the route boundary shows the digest that ties the page to the log',
        /error\.digest/.test(routeErr));
      ok('the global boundary shows it too', /error\.digest/.test(globalErr));
      ok('both speak Arabic rather than English',
        /تعذّر/.test(routeErr) && /المنصّة/.test(globalErr));
      ok('the route boundary offers a retry', /reset\(\)|onClick=\{reset\}/.test(routeErr));
      // global-error replaces the root layout, so it must bring its own html.
      ok('the global boundary supplies its own <html> and <body>',
        /<html/.test(globalErr) && /<body/.test(globalErr));
    }

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
