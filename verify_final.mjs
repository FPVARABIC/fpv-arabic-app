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
const shots = [
  ['home',             '/home'],
  ['signal-flow',      '/lessons/lesson-2'],
  ['txrx',             '/lessons/lesson-9'],
  ['motortest',        '/lessons/lesson-17'],
  ['fab-panel',        '/home'],
];
for (const [name, path] of shots) {
  await p.goto(BASE + path, { waitUntil: 'networkidle' });
  await p.waitForTimeout(500);
  if (name === 'fab-panel') {
    const fab = await p.$('button[aria-label="مساعد FPV"]');
    if (fab) await fab.click();
    await p.waitForTimeout(400);
  }
  await p.screenshot({ path: `/tmp/final-${name}.png`, fullPage: false });
  console.log('ok', name);
}
await b.close();
