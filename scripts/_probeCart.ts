import { chromium } from 'playwright';
import { freeSetupVariantId } from '/home/user/fpv-arabic-app/src/data/store/services';
import { CART_STORAGE_KEY, CART_SCHEMA_VERSION } from '/home/user/fpv-arabic-app/src/data/store/cart';

const BASE = 'http://localhost:3210';
async function main() {
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' as any });
const page = await (await browser.newContext()).newPage();
const id = freeSetupVariantId();
console.log('freeVariant =', id);
await page.goto(`${BASE}/store`, { waitUntil: 'networkidle' });
await page.evaluate(([k, vid, v]) => localStorage.setItem(k, JSON.stringify({
  v: Number(v), items: [{ variantId: vid, quantity: 1 }], updatedAt: '',
})), [CART_STORAGE_KEY, id, String(CART_SCHEMA_VERSION)] as const);
await page.goto(`${BASE}/store/cart`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const ids = await page.locator('[data-testid^="cart-line-"]').evaluateAll(els => els.map(e => e.getAttribute('data-testid')));
console.log('cart-line testids:', ids);
const dropped = await page.locator('[data-testid="cart-dropped"]').innerText().catch(() => '(none)');
console.log('dropped box:', dropped);
console.log('body has مجاناً:', (await page.locator('body').innerText()).includes('مجاناً'));
await browser.close();

}
main();
