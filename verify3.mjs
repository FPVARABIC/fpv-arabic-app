import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']});
const c = await b.newContext({ viewport:{width:390,height:844}});
const p = await c.newPage();
const BASE = 'http://localhost:5174';
await p.goto(BASE);
await p.evaluate(() => {
  localStorage.setItem('fpv_has_started','true');
  localStorage.setItem('fpv_safety_seen','true');
});

// Splash page (does not go through RedirectLogic since we set localStorage after)
// But /welcome is always reachable
await p.goto(BASE + '/welcome', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
await p.screenshot({ path: '/tmp/v3-splash.png' });
console.log('splash done');

// Check FAB is visible on home - click it
await p.goto(BASE + '/home', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
const fab = await p.$('button[aria-label="مساعد FPV"]');
console.log('FAB found on home:', !!fab);
if (fab) {
  await fab.click();
  await p.waitForTimeout(400);
  await p.screenshot({ path: '/tmp/v3-fab-open.png' });
  console.log('FAB panel screenshot done');
}

// Check betaflight interface visual
await p.goto(BASE + '/betaflight/interface', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
await p.screenshot({ path: '/tmp/v3-betaflight-interface.png', fullPage: true });
console.log('betaflight interface done');

// Betaflight CLI
await p.goto(BASE + '/betaflight/cli', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
await p.screenshot({ path: '/tmp/v3-betaflight-cli.png', fullPage: true });
console.log('betaflight cli done');

await b.close();
