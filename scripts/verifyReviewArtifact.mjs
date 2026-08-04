#!/usr/bin/env node
/**
 * Prove the single-file review copy is the real site, not a plausible-looking
 * shell. Every assertion here exists because it is a way the packaging could
 * quietly be wrong while still LOOKING right in a screenshot:
 *
 *  - a route could render the wrong page's body (router key mismatch)
 *  - the font could silently fall back (relative url() resolved wrong)
 *  - the design could vanish (stylesheet destroyed by the first body swap)
 *  - navigation could dead-end (delegated listener lost with the body)
 *  - a phone could scroll sideways (the one thing a desktop pass never catches)
 *
 * Content parity is checked against the ORIGINAL built HTML, so this cannot
 * pass by agreeing with itself.
 */

import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, '.review-site', 'fpvarabic-review.html');
const OUT_DIR = join(ROOT, '.review-site', 'out');

const ROUTES = [
  '/', '/kb/', '/search/', '/store/', '/store/cart/', '/community/',
  '/project/', '/programming/', '/settings/', '/contact/', '/about/',
  '/signin/', '/diagnose/', '/glossary/', '/betaflight/',
];

const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1440, height: 900 },
];

/** Visible text of the original build, for parity comparison. */
function sourceTextLength(route) {
  const file = join(OUT_DIR, route === '/' ? 'index.html' : `${route.slice(1)}index.html`);
  if (!existsSync(file)) return null;
  const html = readFileSync(file, 'utf8');
  const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html);
  if (!body) return null;
  return body[1]
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim().length;
}

let pass = 0;
const fail = [];
function check(name, ok, detail = '') {
  if (ok) { pass += 1; return; }
  fail.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

const url = pathToFileURL(FILE).href;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();

  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  for (const route of ROUTES) {
    await page.goto(`${url}#${route}`);
    // The boot placeholder is replaced only once inflate + render have run.
    await page.waitForFunction(() => !document.getElementById('fpv-boot'), { timeout: 20000 });
    await page.waitForSelector('main#main', { timeout: 10000 });

    const seen = await page.evaluate(() => ({
      title: document.title,
      dir: document.documentElement.dir,
      lang: document.documentElement.lang,
      text: (document.querySelector('main#main')?.innerText || '').trim().length,
      bodyText: document.body.innerText.replace(/\s+/g, ' ').trim().length,
      font: getComputedStyle(document.body).fontFamily,
      bg: getComputedStyle(document.body).backgroundColor,
      hasHeader: !!document.querySelector('header'),
      hasFooter: !!document.querySelector('footer'),
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      styleSheets: document.styleSheets.length,
    }));

    const tag = `${vp.name} ${route}`;
    check(`${tag} renders content`, seen.text > 40, `main text ${seen.text}`);
    check(`${tag} titled FPVARABIC`, /FPVARABIC/.test(seen.title), seen.title);
    check(`${tag} rtl`, seen.dir === 'rtl' && seen.lang === 'ar', `${seen.dir}/${seen.lang}`);
    check(`${tag} Cairo loaded`, /Cairo/i.test(seen.font), seen.font);
    check(`${tag} cream background`, seen.bg === 'rgb(250, 248, 243)', seen.bg);
    check(`${tag} header present`, seen.hasHeader);
    check(`${tag} footer present`, seen.hasFooter);
    check(`${tag} stylesheet alive`, seen.styleSheets >= 1, `${seen.styleSheets} sheets`);
    check(`${tag} no sideways scroll`, seen.scrollW <= seen.clientW + 1,
      `${seen.scrollW} > ${seen.clientW}`);

    // Parity against the original build: same page, same amount of words.
    const srcLen = sourceTextLength(route);
    if (srcLen !== null) {
      const ratio = seen.bodyText / srcLen;
      check(`${tag} matches built page`, ratio > 0.75 && ratio < 1.25,
        `artifact ${seen.bodyText} vs built ${srcLen}`);
    }
  }

  // Navigation must work AFTER a body swap — that is the failure mode a
  // one-page screenshot pass would never surface.
  await page.goto(`${url}#/`);
  await page.waitForFunction(() => !document.getElementById('fpv-boot'), { timeout: 20000 });
  const storeLink = page.locator('a[href="/store"]:visible, a[href="/store/"]:visible').first();
  await storeLink.click();
  await page.waitForFunction(() => /\/store/.test(location.hash), { timeout: 5000 }).catch(() => {});
  const afterStore = await page.evaluate(() => ({
    hash: location.hash,
    text: (document.querySelector('main#main')?.innerText || '').slice(0, 200),
  }));
  check(`${vp.name} nav → store`, /\/store/.test(afterStore.hash), afterStore.hash);

  const kbLink = page.locator('a[href="/kb"]:visible, a[href="/kb/"]:visible').first();
  await kbLink.click();
  await page.waitForFunction(() => /\/kb/.test(location.hash), { timeout: 5000 }).catch(() => {});
  const afterKb = await page.evaluate(() => location.hash);
  check(`${vp.name} store → kb (second hop)`, /\/kb/.test(afterKb), afterKb);

  await page.goBack();
  await page.waitForTimeout(300);
  const afterBack = await page.evaluate(() => location.hash);
  check(`${vp.name} back button`, /\/store/.test(afterBack), afterBack);

  check(`${vp.name} console clean`, errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

// A deep content route, to prove the long articles survived compression whole.
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${url}#/betaflight/pid-tuning/`);
  await page.waitForFunction(() => !document.getElementById('fpv-boot'), { timeout: 20000 });
  const len = await page.evaluate(() => document.querySelector('main#main').innerText.length);
  check('deep article intact', len > 5000, `${len} chars`);
  await ctx.close();
}

await browser.close();

console.log(`\npassed: ${pass}`);
console.log(`failed: ${fail.length}`);
for (const f of fail) console.log(`  ✗ ${f}`);
process.exit(fail.length ? 1 : 0);
