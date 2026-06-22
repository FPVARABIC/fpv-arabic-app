import { chromium } from 'playwright';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

// Go straight to lessons (already past safety)
await page.goto('http://localhost:5173/lessons');
await page.waitForTimeout(1200);
await page.screenshot({ path: '/tmp/05-lessons.png' });

// First lesson detail
await page.goto('http://localhost:5173/lessons/lesson-1');
await page.waitForTimeout(1200);
await page.screenshot({ path: '/tmp/06-lesson-detail.png' });

// Roadmap
await page.goto('http://localhost:5173/roadmap');
await page.waitForTimeout(1200);
await page.screenshot({ path: '/tmp/07-roadmap.png' });

// Betaflight
await page.goto('http://localhost:5173/betaflight');
await page.waitForTimeout(1200);
await page.screenshot({ path: '/tmp/08-betaflight.png' });

// Bot
await page.goto('http://localhost:5173/bot');
await page.waitForTimeout(1200);
await page.screenshot({ path: '/tmp/09-bot.png' });

await browser.close();
console.log('Done');
