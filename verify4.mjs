import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']});
const c = await b.newContext({ viewport:{width:390,height:844}});
const p = await c.newPage();
const BASE = 'http://localhost:5174';

// clear localStorage to get the real splash
await p.goto(BASE);
await p.evaluate(() => localStorage.clear());
await p.goto(BASE + '/welcome', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
await p.screenshot({ path: '/tmp/v4-splash.png' });
console.log('splash ok');

// Take checklist screenshot
await p.evaluate(() => {
  localStorage.setItem('fpv_has_started','true');
  localStorage.setItem('fpv_safety_seen','true');
});
await p.goto(BASE + '/checklists', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
await p.screenshot({ path: '/tmp/v4-checklists.png', fullPage: true });
console.log('checklists ok');

// Betaflight receiver and modes
await p.goto(BASE + '/betaflight/receiver', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
await p.screenshot({ path: '/tmp/v4-betaflight-receiver.png', fullPage: true });
await p.goto(BASE + '/betaflight/modes', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
await p.screenshot({ path: '/tmp/v4-betaflight-modes.png', fullPage: true });
await p.goto(BASE + '/betaflight/failsafe', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
await p.screenshot({ path: '/tmp/v4-betaflight-failsafe.png', fullPage: true });
await p.goto(BASE + '/betaflight/firmware', { waitUntil: 'networkidle' });
await p.waitForTimeout(400);
await p.screenshot({ path: '/tmp/v4-betaflight-firmware.png', fullPage: true });
console.log('all betaflight detail pages done');

await b.close();
