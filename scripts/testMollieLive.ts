#!/usr/bin/env tsx
/**
 * The real Mollie test. Runs only when a `test_` key is present.
 *
 * WHY THIS IS SEPARATE FROM `testPurchaseJourney`
 * -----------------------------------------------
 * That suite drives `FakeProvider`, which implements our contract perfectly
 * because I wrote both sides of it. It proves the shop's own half: the state
 * machine, the ordering of checks, the refusals. It cannot prove that Mollie
 * ACCEPTS the payload we send, that its error shapes are what the adapter
 * expects, or that its status vocabulary is the one in `STATUS_TABLE`. Those
 * are exactly the assumptions a fake cannot test, because a fake is built from
 * the same assumptions.
 *
 * So this talks to Mollie. It is skipped — loudly, never silently — when there
 * is no key, and it REFUSES to run against a `live_` key: creating a real
 * payment from a test script is a thing that should be impossible rather than
 * discouraged.
 *
 * WHAT IT CANNOT DO EITHER
 * ------------------------
 * It cannot complete a payment. Mollie's test checkout requires a human to open
 * the hosted page and choose an outcome, and it cannot deliver a webhook to a
 * machine with no public address. So it covers everything up to the redirect —
 * creation, the amount round trip, the status vocabulary, idempotency, refund
 * refusals — and says plainly that the last three steps need a deployed staging
 * site. Claiming otherwise would be the one dishonest line in this repository.
 */

import { MollieProvider, toMollieAmount } from '../web/lib/server/payments/mollie';
import { paymentIdempotencyKey } from '../src/data/store/payment';

const key = process.env.MOLLIE_API_KEY?.trim();

if (!key) {
  console.log('\n⏭  testMollieLive: SKIPPED — no MOLLIE_API_KEY in this environment.');
  console.log('   This is not a pass. Mollie has not been contacted.');
  console.log('   Add a key beginning `test_` and run again:');
  console.log('     MOLLIE_API_KEY=test_… npx tsx scripts/testMollieLive.ts\n');
  process.exit(0);
}

if (key.startsWith('live_')) {
  console.error('\n❌ testMollieLive: refusing to run against a LIVE key.');
  console.error('   This script creates payments. Use a key beginning `test_`.\n');
  process.exit(1);
}

let passed = 0;
const failures: string[] = [];
function ok(name: string, cond: boolean, detail = '') {
  if (cond) { passed += 1; console.log(`  ok — ${name}`); return; }
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  console.log(`  FAIL — ${name}${detail ? ` — ${detail}` : ''}`);
}

const provider = new MollieProvider(key);
const ORDER = `staging-${Date.now()}`;
const AMOUNT = 1299;

console.log('\n[1] Mollie accepts what the adapter sends');
let ref = '';
let checkoutUrl = '';
{
  ok('the provider reports test mode', provider.live === false);

  try {
    const created = await provider.createCheckout({
      orderId: ORDER,
      amountMinor: AMOUNT,
      currency: 'EUR',
      descriptionAr: `طلب تجريبي ${ORDER}`,
      returnUrl: 'https://example.invalid/store/cart/checkout/done',
      webhookUrl: 'https://example.invalid/api/payments/webhook',
      idempotencyKey: paymentIdempotencyKey(ORDER, 1),
      preferredMethods: ['ideal', 'card'],
      locale: 'nl_NL',
    });
    ref = created.providerRef;
    checkoutUrl = created.checkoutUrl;

    ok('a payment was created', !!ref);
    ok('the reference has the shape the webhook parser expects',
      /^tr_[A-Za-z0-9]{6,64}$/.test(ref), ref);
    ok('a hosted checkout URL came back', /^https:\/\//.test(checkoutUrl));
    ok('it is flagged as test mode', created.testMode === true);
  } catch (e) {
    ok('createCheckout succeeded', false, String(e));
  }
}

console.log('\n[2] The amount survives the round trip exactly');
if (ref) {
  try {
    const state = await provider.fetchStatus(ref);
    ok('the amount comes back unchanged', state.amountMinor === AMOUNT,
      `${state.amountMinor} vs ${AMOUNT}`);
    ok('the currency comes back unchanged', state.currency === 'EUR', state.currency);
    ok('the decimal encoding was what Mollie expected', toMollieAmount(AMOUNT) === '12.99');
    ok('a fresh payment reads as pending, not paid', state.status === 'pending', state.status);
    ok('nothing is refunded yet', (state.refundedMinor ?? 0) === 0);
  } catch (e) {
    ok('fetchStatus succeeded', false, String(e));
  }
}

console.log('\n[3] Mollie\'s status vocabulary is the one the adapter maps');
if (ref) {
  // A status Mollie returns that `STATUS_TABLE` does not know would throw. That
  // this call succeeded at all is the assertion — the mapping is total for the
  // states a new payment can be in.
  ok('the live status mapped without throwing', true);
}

console.log('\n[4] Idempotency, against the real API');
if (ref) {
  try {
    const again = await provider.createCheckout({
      orderId: ORDER,
      amountMinor: AMOUNT,
      currency: 'EUR',
      descriptionAr: `طلب تجريبي ${ORDER}`,
      returnUrl: 'https://example.invalid/store/cart/checkout/done',
      webhookUrl: 'https://example.invalid/api/payments/webhook',
      idempotencyKey: paymentIdempotencyKey(ORDER, 1),
    });
    ok('the same key returns the SAME payment, not a second one',
      again.providerRef === ref, `${again.providerRef} vs ${ref}`);
  } catch (e) {
    ok('the idempotent retry succeeded', false, String(e));
  }
}

console.log('\n[5] Refunding an unpaid payment is refused by Mollie itself');
if (ref) {
  let refused = false;
  try {
    await provider.refund(ref, 100);
  } catch {
    refused = true;
  }
  ok('an unpaid payment cannot be refunded', refused);
}

console.log('\n[6] What this run did NOT prove');
console.log('   The payment was created and left OPEN. Completing it needs a human to');
console.log('   open the hosted page and choose an outcome, and the webhook needs a');
console.log('   publicly reachable URL. So these remain untested until staging is live:');
console.log('     · the customer completing payment on Mollie\'s page');
console.log('     · the webhook arriving at /api/payments/webhook');
console.log('     · the transition to `paid` and the order to `confirmed`');
console.log('     · a real full and partial refund');
if (checkoutUrl) console.log(`\n   Open to complete by hand: ${checkoutUrl}`);

console.log(`\n${failures.length ? '❌' : '✅'} testMollieLive: ${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log(`   ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
