#!/usr/bin/env node
/**
 * Package the whole built site into ONE self-contained HTML file.
 *
 * WHY THIS EXISTS
 * ---------------
 * The static export in `.review-site/out` is a real, correct website — but a
 * website needs a host, and every hosting provider this environment can reach
 * is refused at the egress gateway. That left the owner unable to look at their
 * own product, which is the one thing they asked for.
 *
 * A single file has no host. It is one document that carries the entire site
 * inside it, so it can be delivered through any channel that can carry a file
 * and opened on a phone with no server, no account and no configuration.
 *
 * WHAT IT PRESERVES, AND WHY IT IS NOT A MOCK-UP
 * ----------------------------------------------
 * Each page's REAL rendered `<body>` is stored verbatim, and navigation swaps
 * the whole body. Nothing is re-implemented: the header, the active tab, the
 * account rail, the bottom bar and the footer are the exact nodes Next.js
 * produced for that route. If a margin is wrong here, it is wrong on the live
 * site too — which is the entire point of a design review.
 *
 * WHAT IT DROPS, AND WHY THAT IS SAFE
 * -----------------------------------
 * The `<script>` tags. In a Next.js export those carry ~14 MB of React
 * hydration payload whose only job is to re-attach client behaviour to markup
 * that is ALREADY rendered. Dropping them costs the client-only islands (the
 * search box, the cart buttons, form submission) and costs nothing visual. The
 * tradeoff is stated in the report rather than hidden.
 *
 * WHY IT IS COMPRESSED
 * --------------------
 * Verbatim bodies are ~11 MB, which is both over the delivery ceiling and a
 * cruel thing to send to a phone. Arabic prose gzips to roughly a sixth of its
 * size, so the payload ships compressed and is inflated in the browser with
 * `DecompressionStream` — no library, no network.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, dirname, basename } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, '.review-site', 'out');
const DEST = process.argv[2] || join(ROOT, '.review-site', 'fpvarabic-review.html');

if (!existsSync(OUT_DIR)) {
  console.error(`[artifact] missing ${OUT_DIR} — run scripts/buildReviewSite.mjs first`);
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * 1. The stylesheet, with its fonts folded in.
 *
 * The three Cairo files are referenced by RELATIVE url() from inside
 * `_next/static/chunks`, so they resolve against the CSS file's own
 * directory — not the document's. Getting that wrong silently falls back
 * to a system Arabic font, which changes every line-height on the page
 * and would make the review measure the wrong thing.
 * ------------------------------------------------------------------ */
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const allFiles = walk(OUT_DIR);
const cssFiles = allFiles.filter((f) => f.endsWith('.css'));
if (cssFiles.length !== 1) {
  console.error(`[artifact] expected exactly one stylesheet, found ${cssFiles.length}`);
  process.exit(1);
}

const cssPath = cssFiles[0];
let css = readFileSync(cssPath, 'utf8');
let fontsInlined = 0;
css = css.replace(/url\(([^)"']+\.woff2?)\)/g, (whole, rel) => {
  const abs = join(dirname(cssPath), rel);
  if (!existsSync(abs)) {
    console.error(`[artifact] font referenced but missing: ${rel}`);
    process.exit(1);
  }
  fontsInlined += 1;
  const b64 = readFileSync(abs).toString('base64');
  const kind = abs.endsWith('.woff2') ? 'woff2' : 'woff';
  return `url(data:font/${kind};base64,${b64})`;
});
if (fontsInlined === 0) {
  console.error('[artifact] no fonts were inlined — the CSS url() shape must have changed');
  process.exit(1);
}

/*
 * The reviewer's browser may be in dark mode, and the page it is embedded in
 * paints `<html>`. The site styles `body`, not `html`, so a dark viewer shows
 * through wherever body does not reach: the overscroll rubber-band at the top
 * of a phone, and the strip below a short page. `color-scheme: light` is the
 * other half — without it the browser renders native controls and scrollbars
 * dark, on a cream page.
 *
 * This is a PACKAGING fix, not a design change: FPVARABIC deliberately owns one
 * visual world, and a review has to show that world, not a recolour of it.
 */
css += `\nhtml { background: var(--bg); color-scheme: light; }\n`;

/* ------------------------------------------------------------------ *
 * 2. Every page's real body.
 * ------------------------------------------------------------------ */
const BODY_RE = /<body[^>]*>([\s\S]*)<\/body>/;
const TITLE_RE = /<title>([\s\S]*?)<\/title>/;
const SCRIPT_RE = /<script[\s\S]*?<\/script>/g;
/* Next marks streaming boundaries with `<!--$-->` / `<!--/$-->` and empty
 * `<div hidden>` holders that only mean something to the hydration runtime. */
const RSC_NOISE_RE = /<div hidden=""><!--\$--><!--\/\$--><\/div>/g;

/** File path → the route a link would use. `trailingSlash` is on, so `/kb/`. */
function routeOf(file) {
  const rel = relative(OUT_DIR, file).split('\\').join('/');
  if (rel === 'index.html') return '/';
  if (!rel.endsWith('/index.html')) return null; // 404.html and friends
  return `/${rel.slice(0, -'index.html'.length)}`;
}

const pages = {};
let rawBodyBytes = 0;
let scriptBytes = 0;

for (const file of allFiles) {
  if (!file.endsWith('.html')) continue;
  const route = routeOf(file);
  if (route === null) continue;

  const html = readFileSync(file, 'utf8');
  const bodyMatch = BODY_RE.exec(html);
  if (!bodyMatch) {
    console.error(`[artifact] no <body> in ${file}`);
    process.exit(1);
  }
  const withScripts = bodyMatch[1];
  const body = withScripts.replace(SCRIPT_RE, '').replace(RSC_NOISE_RE, '');
  scriptBytes += withScripts.length - body.length;
  rawBodyBytes += body.length;

  const titleMatch = TITLE_RE.exec(html);
  pages[route] = { t: titleMatch ? titleMatch[1] : 'FPVARABIC', b: body };
}

const routes = Object.keys(pages);
if (routes.length < 200) {
  console.error(`[artifact] only ${routes.length} routes captured — expected the full site`);
  process.exit(1);
}

/* A page every unknown route falls back to, so a stray link shows the product's
 * own 404 rather than a blank screen that reads as a broken build. */
const NOT_FOUND = pages['/_not-found/'] ? '/_not-found/' : null;

const json = JSON.stringify(pages);
const packed = gzipSync(Buffer.from(json, 'utf8'), { level: 9 });
const b64 = packed.toString('base64');

/* ------------------------------------------------------------------ *
 * 3. The router.
 *
 * Hash routing, because the file is opened from a URL nobody controls the
 * server for — a path-based route would 404 on reload. Every internal link
 * is rewritten to a hash on click, so the site navigates exactly as it reads.
 * ------------------------------------------------------------------ */
const runtime = `
(function () {
  var css = document.getElementById('fpv-css');
  // Move the stylesheet OUT of the body before anything replaces the body,
  // or the first navigation would delete the site's entire design.
  document.head.appendChild(css);
  var titleEl = document.createElement('title');
  titleEl.textContent = 'FPVARABIC';
  document.head.appendChild(titleEl);

  var html = document.documentElement;
  html.lang = 'ar';
  html.dir = 'rtl';

  var NOT_FOUND = ${JSON.stringify(NOT_FOUND)};
  var pages = null;

  function norm(p) {
    if (!p) return '/';
    p = p.split('#')[0].split('?')[0];
    if (p.charAt(0) !== '/') p = '/' + p;
    if (p.charAt(p.length - 1) !== '/') p += '/';
    return p === '//' ? '/' : p;
  }

  function current() {
    var h = location.hash || '';
    return norm(h.charAt(0) === '#' ? h.slice(1) : h);
  }

  function render(route) {
    var page = pages[route];
    if (!page && NOT_FOUND) page = pages[NOT_FOUND];
    if (!page) {
      document.body.innerHTML =
        '<div style="padding:48px;text-align:center;font-family:Cairo,sans-serif">'
        + 'لا توجد صفحة بهذا العنوان</div>';
      return;
    }
    document.body.innerHTML = page.b;
    titleEl.textContent = page.t;
    window.scrollTo(0, 0);
  }

  // One delegated listener on the document, so it survives every body swap.
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href) return;

    // In-page anchors keep working; the skip link depends on it.
    if (href.charAt(0) === '#') return;
    // Anything off-site opens normally, in a new tab.
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) { a.target = '_blank'; a.rel = 'noopener'; return; }
    if (href.charAt(0) !== '/') return;

    e.preventDefault();
    var route = norm(href);
    if (route === current()) { render(route); return; }
    location.hash = route;
  }, false);

  // The search field is a real GET form. Left alone it would try to navigate to
  // a path this file has no server for, and the copy would appear to break at
  // the one control the reviewer is most likely to try. Routed through the same
  // hash router it lands on the search page — which cannot show RESULTS here,
  // because ranking them needs the index that only the live server holds.
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM') return;
    var action = form.getAttribute('action') || '';
    if (action.charAt(0) !== '/') return;
    e.preventDefault();
    location.hash = norm(action);
  }, false);

  window.addEventListener('hashchange', function () { render(current()); });

  function inflate(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    if (typeof DecompressionStream === 'undefined') {
      return Promise.reject(new Error('DecompressionStream unsupported'));
    }
    var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
  }

  inflate(window.__FPV__).then(function (text) {
    pages = JSON.parse(text);
    delete window.__FPV__;
    render(current());
  }).catch(function (err) {
    document.body.innerHTML =
      '<div style="padding:48px;text-align:center;font-family:Cairo,sans-serif">'
      + '<p>تعذّر فتح النسخة في هذا المتصفّح.</p>'
      + '<p style="opacity:.7;font-size:14px">' + String(err && err.message || err) + '</p></div>';
  });
})();
`.trim();

const doc = `<title>FPVARABIC — نسخة المراجعة</title>
<style id="fpv-css">${css}</style>
<div id="fpv-boot" style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#FAF8F3;color:#55636F;font-family:Cairo,system-ui,sans-serif;font-size:15px">
  جارٍ فتح FPVARABIC…
</div>
<script>window.__FPV__=${JSON.stringify(b64)};</script>
<script>${runtime}</script>
`;

mkdirSync(dirname(DEST), { recursive: true });
writeFileSync(DEST, doc, 'utf8');

const mb = (n) => `${(n / 1048576).toFixed(2)} MB`;
console.log(`[artifact] routes captured   ${routes.length}`);
console.log(`[artifact] hydration dropped ${mb(scriptBytes)}`);
console.log(`[artifact] bodies (verbatim) ${mb(rawBodyBytes)}`);
console.log(`[artifact] gzipped           ${mb(packed.length)}`);
console.log(`[artifact] fonts inlined     ${fontsInlined}`);
console.log(`[artifact] FILE              ${DEST}  ${mb(statSync(DEST).size)}`);
if (statSync(DEST).size > 16 * 1048576) {
  console.error('[artifact] OVER the 16 MB delivery ceiling');
  process.exit(1);
}
