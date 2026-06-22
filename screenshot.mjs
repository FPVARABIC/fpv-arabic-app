import { chromium } from 'playwright';

const PORT = process.env.PORT || 5174;
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

await page.goto(`http://localhost:${PORT}`);
await page.evaluate(() => {
  localStorage.setItem('fpv_has_started', 'true');
  localStorage.setItem('fpv_safety_seen', 'true');
});

const shots = [
  { path: '/welcome', file: '/tmp/01-splash.png' },
  { path: '/home', file: '/tmp/02-home.png' },
  { path: '/roadmap', file: '/tmp/03-roadmap.png' },
  { path: '/lessons', file: '/tmp/04-lessons.png' },
  { path: '/lessons/lesson-2', file: '/tmp/05-lesson-signal.png' },
  { path: '/lessons/lesson-9', file: '/tmp/06-lesson-txrx.png' },
  { path: '/lessons/lesson-17', file: '/tmp/07-lesson-motortest.png' },
  { path: '/betaflight', file: '/tmp/08-betaflight.png' },
  { path: '/bot', file: '/tmp/09-bot.png' },
  { path: '/progress', file: '/tmp/10-progress.png' },
];

for (const { path, file } of shots) {
  await page.goto(`http://localhost:${PORT}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: file, fullPage: path.startsWith('/lessons/') });
  console.log('✓', file);
}
await browser.close();
console.log('Done');
