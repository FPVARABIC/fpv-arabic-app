import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']});
const c = await b.newContext({ viewport:{width:390,height:844}});
const p = await c.newPage();
const BASE = 'http://localhost:5174';

// --- Splash (fresh) ---
await p.goto(BASE);
await p.evaluate(() => localStorage.clear());
await p.goto(BASE + '/welcome', { waitUntil:'networkidle' }); await p.waitForTimeout(400);
await p.screenshot({ path:'/tmp/a2-splash.png' });

// --- After start button (should go to HOME) ---
await p.click('button:has-text("ابدأ"), button:has-text("رحلتك"), button:has-text("ابدأ رحلتك"), button:has-text("أبدأ")');
await p.waitForTimeout(600);
await p.screenshot({ path:'/tmp/a2-after-splash-click.png' });
const afterUrl = p.url();
console.log('After splash click URL:', afterUrl);

// Set session state
await p.evaluate(() => {
  localStorage.setItem('fpv_has_started','true');
  localStorage.setItem('fpv_safety_seen','true');
});

const shots = [
  ['/home', 'home'],
  ['/roadmap', 'roadmap'],
  ['/lessons/lesson-9', 'lesson-txrx'],
  ['/lessons/lesson-8', 'lesson-gndvbat'],
  ['/betaflight', 'betaflight'],
  ['/betaflight/motors', 'betaflight-motors'],
  ['/checklists', 'checklists'],
  ['/progress', 'progress'],
  ['/about', 'about'],
];
for (const [path, name] of shots) {
  await p.goto(BASE + path, { waitUntil:'networkidle' }); await p.waitForTimeout(400);
  await p.screenshot({ path:`/tmp/a2-${name}.png`, fullPage: false });
  console.log('ok', name);
}

// FAB open on home
await p.goto(BASE + '/home', { waitUntil:'networkidle' }); await p.waitForTimeout(400);
const fab = await p.$('button[aria-label="مساعد FPV"]');
if (fab) { await fab.click(); await p.waitForTimeout(400); }
await p.screenshot({ path:'/tmp/a2-fab-open.png' });
console.log('ok fab-open');

await b.close();
