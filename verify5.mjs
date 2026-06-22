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
const pages = [
  ['lipo',       '/lessons/lesson-7'],
  ['signal',     '/lessons/lesson-2'],
  ['size',       '/lessons/lesson-5'],
  ['quadx',      '/lessons/lesson-1'],
];
for (const [name, path] of pages) {
  await p.goto(BASE + path, { waitUntil: 'networkidle' });
  await p.waitForTimeout(500);
  await p.screenshot({ path: `/tmp/v5-${name}.png`, fullPage: true });
  console.log('ok', name);
}
await b.close();
