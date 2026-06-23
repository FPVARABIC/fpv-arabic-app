import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']});
const c = await b.newContext({ viewport:{width:390,height:844} });
const p = await c.newPage();
const BASE = 'http://localhost:5174';

// Splash fresh
await p.goto(BASE); await p.evaluate(() => localStorage.clear());
await p.goto(BASE + '/welcome', { waitUntil:'networkidle' }); await p.waitForTimeout(600);
await p.screenshot({ path:'/tmp/a3-splash.png' });

// Set app state
await p.evaluate(() => {
  localStorage.setItem('fpv_has_started','true');
  localStorage.setItem('fpv_safety_seen','true');
});
const shots = [
  '/home','/roadmap','/lessons/lesson-9','/lessons/lesson-8',
  '/betaflight','/betaflight/motors','/checklists','/progress','/about',
];
for (const path of shots) {
  await p.goto(BASE + path, { waitUntil:'networkidle' }); await p.waitForTimeout(500);
  const name = path.replace(/\//g,'-').slice(1) || 'home';
  await p.screenshot({ path:`/tmp/a3-${name}.png`, fullPage: false });
  console.log('ok', name);
}
// FAB open
await p.goto(BASE+'/home', { waitUntil:'networkidle' }); await p.waitForTimeout(500);
const fab = await p.$('button[aria-label="مساعد FPV"]');
if (fab) { await fab.click({ force:true }); await p.waitForTimeout(500); }
await p.screenshot({ path:'/tmp/a3-fab-open.png' });
console.log('ok fab-open');

await b.close();
