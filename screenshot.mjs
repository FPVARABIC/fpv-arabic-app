import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

// Pre-seed localStorage to skip onboarding gates
await page.goto('http://localhost:5173');
await page.evaluate(() => {
  localStorage.setItem('fpv_has_started', 'true');
  localStorage.setItem('fpv_safety_seen', 'true');
});

const shots = [
  { path: '/welcome', file: '/tmp/01-splash.png' },
  { path: '/home', file: '/tmp/02-home.png' },
  { path: '/roadmap', file: '/tmp/03-roadmap.png' },
  { path: '/lessons', file: '/tmp/04-lessons.png' },
  { path: '/betaflight', file: '/tmp/05-betaflight.png' },
  { path: '/bot', file: '/tmp/06-bot.png' },
];

for (const { path, file } of shots) {
  await page.goto(`http://localhost:5173${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: file });
  console.log('✓', file);
}

await browser.close();
console.log('Done');
