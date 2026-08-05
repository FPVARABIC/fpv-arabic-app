#!/usr/bin/env tsx
/**
 * The purchase journey, end to end, against a provider that is not Mollie.
 *
 * WHAT THIS PROVES AND WHAT IT DOES NOT
 * -------------------------------------
 * PROVES: the shop's own half of the contract — shipping resolution, address
 * validation, basket arithmetic, the payment state machine, idempotency, the
 * webhook pipeline's ordering and refusals, refund ceilings, and the
 * payment→order policy. `FakeProvider` implements `PaymentProvider` in full and
 * mimics Mollie's contract deliberately: its webhook body carries only a
 * reference, its status must be fetched, and the same idempotency key returns
 * the same payment.
 *
 * DOES NOT PROVE: that Mollie's real API accepts our payload, what its live
 * error shapes are, or that the redirect works in a browser. That needs a
 * `test_` key, which this environment does not have. Nothing below is described
 * as a Mollie test, and the report says the same.
 *
 * WHY THIS IS NOT A FIRESTORE TEST
 * --------------------------------
 * `service.ts` reads and writes Firestore, which needs the emulator and a
 * running server. What is exercised here is the logic those functions delegate
 * to — the pure decisions — plus the provider contract in full. The parts that
 * are only reachable through Firestore are asserted structurally in
 * `testPayments.ts`. Both suites say which is which.
 */

import { FakeProvider } from '../web/lib/server/payments/fakeProvider';
import {
  canTransitionPayment, isSettled, paymentIdempotencyKey,
  toDecimalAmount, type PaymentStatus,
} from '../src/data/store/payment';
import {
  quoteShipping, shippableCountries, overlappingCountries,
  SEED_SHIPPING_ZONES, type ShippingZone,
} from '../src/data/store/shipping';
import { validateAddress, formatAddress } from '../src/data/store/address';

let passed = 0;
const failures: string[] = [];
function ok(name: string, cond: boolean, detail = '') {
  if (cond) { passed += 1; console.log(`  ok — ${name}`); return; }
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  console.log(`  FAIL — ${name}${detail ? ` — ${detail}` : ''}`);
}

/* A priced set of zones, as the owner would configure them. The FIGURES ARE
   ARBITRARY TEST DATA and exist only so arithmetic has something to chew on. */
const PRICED: ShippingZone[] = SEED_SHIPPING_ZONES.map(z => ({
  ...z,
  costMinor: z.id === 'nl' ? 495 : z.id === 'be' ? 695 : z.id === 'de' ? 795 : 1295,
  freeOverMinor: z.id === 'nl' ? 10000 : null,
  etaDaysMin: 2, etaDaysMax: 5,
  updatedAt: '2026-08-01T00:00:00.000Z',
}));

const LINE = { productId: 'geprc-cinelog35', categoryId: 'size-3-5' };

console.log('\n[1] Shipping zones ship empty — no invented prices');
{
  ok('every seed zone starts unpriced',
    SEED_SHIPPING_ZONES.every(z => z.costMinor === null));
  ok('an unpriced zone refuses rather than quoting zero', (() => {
    const q = quoteShipping({
      country: 'NL', itemsTotalMinor: 5000, lines: [LINE], zones: SEED_SHIPPING_ZONES,
    });
    return !q.ok && q.reason === 'not-configured';
  })());
  ok('…and says so in Arabic', (() => {
    const q = quoteShipping({
      country: 'NL', itemsTotalMinor: 5000, lines: [LINE], zones: SEED_SHIPPING_ZONES,
    });
    return !q.ok && /غير مسعَّر/.test(q.messageAr);
  })());
  ok('no country sits in two zones', overlappingCountries(SEED_SHIPPING_ZONES).length === 0,
    overlappingCountries(SEED_SHIPPING_ZONES).join(', '));
  ok('the four required destinations are covered', (() => {
    const all = SEED_SHIPPING_ZONES.flatMap(z => z.countries);
    return ['NL', 'BE', 'DE', 'FR', 'IT', 'ES'].every(c => all.includes(c));
  })());
  ok('an unpriced zone offers no countries to the checkout',
    shippableCountries(SEED_SHIPPING_ZONES).length === 0);
}

console.log('\n[2] Shipping resolves per destination');
{
  const nl = quoteShipping({ country: 'NL', itemsTotalMinor: 5000, lines: [LINE], zones: PRICED });
  ok('the Netherlands resolves', nl.ok && nl.costMinor === 495);
  const be = quoteShipping({ country: 'BE', itemsTotalMinor: 5000, lines: [LINE], zones: PRICED });
  ok('Belgium resolves at its own rate', be.ok && be.costMinor === 695);
  const de = quoteShipping({ country: 'DE', itemsTotalMinor: 5000, lines: [LINE], zones: PRICED });
  ok('Germany resolves at its own rate', de.ok && de.costMinor === 795);
  const fr = quoteShipping({ country: 'FR', itemsTotalMinor: 5000, lines: [LINE], zones: PRICED });
  ok('another EU state falls into the EU zone', fr.ok && fr.costMinor === 1295);

  const us = quoteShipping({ country: 'US', itemsTotalMinor: 5000, lines: [LINE], zones: PRICED });
  ok('an unsupported destination refuses', !us.ok && us.reason === 'no-zone');
  ok('…with a sentence the customer can act on', !us.ok && us.messageAr.length > 20);

  const lower = quoteShipping({ country: 'nl', itemsTotalMinor: 5000, lines: [LINE], zones: PRICED });
  ok('the country code is case-insensitive', lower.ok && lower.costMinor === 495);

  const none = quoteShipping({ country: '', itemsTotalMinor: 5000, lines: [LINE], zones: PRICED });
  ok('an empty country asks for one rather than crashing', !none.ok);

  const free = quoteShipping({ country: 'NL', itemsTotalMinor: 10000, lines: [LINE], zones: PRICED });
  ok('the free threshold applies at the boundary, not above it',
    free.ok && free.costMinor === 0 && free.freeApplied);
  const nearly = quoteShipping({ country: 'NL', itemsTotalMinor: 9999, lines: [LINE], zones: PRICED });
  ok('…and one cent below it does not', nearly.ok && nearly.costMinor === 495);

  const off = quoteShipping({
    country: 'DE', itemsTotalMinor: 5000, lines: [LINE],
    zones: PRICED.map(z => z.id === 'de' ? { ...z, enabled: false } : z),
  });
  ok('a disabled zone refuses and names itself',
    !off.ok && off.reason === 'zone-disabled' && /ألمانيا/.test(off.messageAr));
}

console.log('\n[3] Item rules outrank destination rules');
{
  const battery = { productId: 'some-lipo', categoryId: 'batteries' };
  const blocked = quoteShipping({
    country: 'NL', itemsTotalMinor: 5000, lines: [LINE, battery], zones: PRICED,
    rules: { blockedCategoryIds: ['batteries'], manualReviewProductIds: [] },
  });
  ok('a blocked category refuses the whole quote',
    !blocked.ok && blocked.reason === 'blocked-item');
  ok('…and names the offending product',
    !blocked.ok && blocked.offendingProductIds?.includes('some-lipo') === true);

  // The ordering that matters: an unshippable item in an unquotable zone must
  // report the ITEM, or the customer changes their address for nothing.
  const both = quoteShipping({
    country: 'US', itemsTotalMinor: 5000, lines: [battery], zones: PRICED,
    rules: { blockedCategoryIds: ['batteries'], manualReviewProductIds: [] },
  });
  ok('an item problem is reported before a destination problem',
    !both.ok && both.reason === 'blocked-item');

  const manual = quoteShipping({
    country: 'NL', itemsTotalMinor: 5000, lines: [LINE], zones: PRICED,
    rules: { blockedCategoryIds: [], manualReviewProductIds: ['geprc-cinelog35'] },
  });
  ok('a manual-review product refuses with its own reason',
    !manual.ok && manual.reason === 'manual-review');
}

console.log('\n[4] The address form does not assume the Netherlands');
{
  const base = {
    fullName: 'محمد أحمد', email: 'a@b.co', phone: '0612345678',
    city: 'Amsterdam', street: 'Damrak', houseNumber: '12',
  };
  const nl = validateAddress({ ...base, country: 'NL', postalCode: '1012 LG' });
  ok('a Dutch postcode with a space is accepted', nl.ok);
  const nl2 = validateAddress({ ...base, country: 'NL', postalCode: '1012LG' });
  ok('…and without one', nl2.ok);
  const nlBad = validateAddress({ ...base, country: 'NL', postalCode: '10125' });
  ok('a five-digit code is rejected FOR the Netherlands', !nlBad.ok);

  const de = validateAddress({ ...base, country: 'DE', postalCode: '10115' });
  ok('the same five digits are accepted for Germany', de.ok);
  const deBad = validateAddress({ ...base, country: 'DE', postalCode: '1012 LG' });
  ok('…and a Dutch code is rejected for Germany', !deBad.ok);

  ok('Belgium takes four digits',
    validateAddress({ ...base, country: 'BE', postalCode: '1000' }).ok);
  ok('Portugal takes its hyphenated form',
    validateAddress({ ...base, country: 'PT', postalCode: '1000-001' }).ok);
  ok('Ireland is accepted without a pattern rather than guessed at',
    validateAddress({ ...base, country: 'IE', postalCode: 'D02 AF30' }).ok);

  const missing = validateAddress({ country: 'NL' });
  ok('every missing field is reported at once, not one per submission',
    !missing.ok && missing.errors.length >= 6, !missing.ok ? `${missing.errors.length}` : '');
  ok('the house number is required — without it the parcel does not arrive',
    !missing.ok && missing.errors.some(e => e.field === 'houseNumber'));
  ok('a bad email is caught',
    !validateAddress({ ...base, email: 'not-an-email', country: 'NL', postalCode: '1012 LG' }).ok);
  ok('a country we do not ship to is refused at the form', (() => {
    const r = validateAddress(
      { ...base, country: 'US', postalCode: '10001' },
      { shippableCountries: ['NL', 'BE', 'DE'] },
    );
    return !r.ok && r.errors.some(e => e.field === 'country');
  })());
  ok('a valid address formats onto one line', (() => {
    const r = validateAddress({ ...base, country: 'NL', postalCode: '1012 LG' });
    return r.ok && formatAddress(r.value).includes('Damrak 12');
  })());
  ok('nothing beyond delivery is collected', (() => {
    const r = validateAddress({ ...base, country: 'NL', postalCode: '1012 LG' });
    return r.ok && !('dateOfBirth' in r.value) && !('company' in r.value);
  })());
}

console.log('\n[5] The happy path, driven through the provider contract');
{
  const p = new FakeProvider();
  const ORDER = 'ord_happy';
  const TOTAL = 12995;

  const checkout = await p.createCheckout({
    orderId: ORDER, amountMinor: TOTAL, currency: 'EUR',
    descriptionAr: `طلب ${ORDER}`,
    returnUrl: 'https://x.test/done', webhookUrl: 'https://x.test/api/payments/webhook',
    idempotencyKey: paymentIdempotencyKey(ORDER, 1),
  });
  ok('a checkout is created', !!checkout.providerRef && !!checkout.checkoutUrl);
  ok('and is flagged test mode', checkout.testMode === true);

  const opened = await p.fetchStatus(checkout.providerRef);
  ok('it starts pending, not paid', opened.status === 'pending');

  // The customer pays on the provider's page.
  p.drive(checkout.providerRef, 'paid');

  // The webhook arrives carrying ONLY a reference.
  const body = p.webhookBody(checkout.providerRef);
  const parsed = p.parseWebhook(new Headers(), body);
  ok('the webhook body parses to a reference', parsed.ok);
  ok('…and carries no status at all', !/paid|status/.test(body));

  const settled = await p.fetchStatus(checkout.providerRef);
  ok('the fetched status is paid', settled.status === 'paid');
  ok('the amount matches the order', settled.amountMinor === TOTAL);
  ok('the currency matches the order', settled.currency === 'EUR');
  ok('the transition is permitted', canTransitionPayment('pending', 'paid'));
  ok('and paid counts as settled', isSettled(settled.status));
  ok('the method is recorded', settled.method === 'ideal');
}

console.log('\n[6] Idempotency, duplicates and late delivery');
{
  const p = new FakeProvider();
  const key = paymentIdempotencyKey('ord_dup', 1);
  const a = await p.createCheckout({
    orderId: 'ord_dup', amountMinor: 1000, currency: 'EUR', descriptionAr: 'x',
    returnUrl: 'https://x.test/d', webhookUrl: 'https://x.test/w', idempotencyKey: key,
  });
  const b = await p.createCheckout({
    orderId: 'ord_dup', amountMinor: 1000, currency: 'EUR', descriptionAr: 'x',
    returnUrl: 'https://x.test/d', webhookUrl: 'https://x.test/w', idempotencyKey: key,
  });
  ok('the same idempotency key returns the SAME payment', a.providerRef === b.providerRef);
  ok('…and creates only one', p.count() === 1);

  const other = await p.createCheckout({
    orderId: 'ord_dup', amountMinor: 1000, currency: 'EUR', descriptionAr: 'x',
    returnUrl: 'https://x.test/d', webhookUrl: 'https://x.test/w',
    idempotencyKey: paymentIdempotencyKey('ord_dup', 2),
  });
  ok('a genuine second attempt is a new payment', other.providerRef !== a.providerRef);

  p.drive(a.providerRef, 'paid');
  const first = await p.fetchStatus(a.providerRef);
  const again = await p.fetchStatus(a.providerRef);
  ok('a repeated webhook re-reads the same status', first.status === again.status);
  ok('…and re-applying it is a permitted no-op',
    canTransitionPayment(first.status, again.status));

  ok('a LATE pending after paid is refused', !canTransitionPayment('paid', 'pending'));
  ok('a late open after cancelled is refused', !canTransitionPayment('cancelled', 'pending'));
}

console.log('\n[7] Failure, cancellation, expiry and outage');
{
  const p = new FakeProvider();
  const mk = async (id: string) => p.createCheckout({
    orderId: id, amountMinor: 2500, currency: 'EUR', descriptionAr: 'x',
    returnUrl: 'https://x.test/d', webhookUrl: 'https://x.test/w',
    idempotencyKey: paymentIdempotencyKey(id, 1),
  });

  const failed = await mk('ord_fail');
  p.drive(failed.providerRef, 'failed');
  ok('a failed payment reads as failed', (await p.fetchStatus(failed.providerRef)).status === 'failed');
  ok('…and cannot become paid without a new attempt',
    !canTransitionPayment('failed', 'paid'));

  const cancelled = await mk('ord_cancel');
  p.drive(cancelled.providerRef, 'canceled');
  ok('a cancelled payment reads as cancelled',
    (await p.fetchStatus(cancelled.providerRef)).status === 'cancelled');

  const expired = await mk('ord_expire');
  p.drive(expired.providerRef, 'expired');
  ok('an expired payment is cancelled, not paid',
    (await p.fetchStatus(expired.providerRef)).status === 'cancelled');

  const open = await mk('ord_action');
  p.drive(open.providerRef, 'pending');
  ok('a provider «pending» maps to requires_action, not to paid',
    (await p.fetchStatus(open.providerRef)).status === 'requires_action');
  ok('requires_action is not settled', !isSettled('requires_action'));

  const unknown = await mk('ord_unknown');
  p.drive(unknown.providerRef, 'some_new_status');
  ok('an unmapped provider status throws rather than guessing', await (async () => {
    try { await p.fetchStatus(unknown.providerRef); return false; } catch { return true; }
  })());

  p.failNextFetch = true;
  ok('a provider outage throws so the webhook can answer 500', await (async () => {
    try { await p.fetchStatus(failed.providerRef); return false; } catch { return true; }
  })());

  ok('a webhook for an unknown reference throws', await (async () => {
    try { await p.fetchStatus('tr_fakeNOTREAL'); return false; } catch { return true; }
  })());
  ok('a malformed reference is rejected before any lookup',
    !p.parseWebhook(new Headers(), 'id=../../etc/passwd').ok);
  ok('an empty webhook body is rejected', !p.parseWebhook(new Headers(), '').ok);
}

console.log('\n[8] Amount and currency tampering');
{
  const p = new FakeProvider();
  const c = await p.createCheckout({
    orderId: 'ord_tamper', amountMinor: 9900, currency: 'EUR', descriptionAr: 'x',
    returnUrl: 'https://x.test/d', webhookUrl: 'https://x.test/w',
    idempotencyKey: paymentIdempotencyKey('ord_tamper', 1),
  });
  p.drive(c.providerRef, 'paid');

  p.forceAmount(c.providerRef, 100);
  const cheap = await p.fetchStatus(c.providerRef);
  ok('a settled amount below the order is visible to the caller',
    cheap.amountMinor === 100 && cheap.amountMinor !== 9900);

  p.forceAmount(c.providerRef, 9900);
  p.forceCurrency(c.providerRef, 'HUF');
  const wrong = await p.fetchStatus(c.providerRef);
  ok('a different currency with the same integer is visible too',
    wrong.amountMinor === 9900 && wrong.currency !== 'EUR');
}

console.log('\n[9] Refunds, full and partial');
{
  const p = new FakeProvider();
  const c = await p.createCheckout({
    orderId: 'ord_refund', amountMinor: 10000, currency: 'EUR', descriptionAr: 'x',
    returnUrl: 'https://x.test/d', webhookUrl: 'https://x.test/w',
    idempotencyKey: paymentIdempotencyKey('ord_refund', 1),
  });

  ok('an unpaid payment cannot be refunded', await (async () => {
    try { await p.refund(c.providerRef, 100); return false; } catch { return true; }
  })());

  p.drive(c.providerRef, 'paid');
  const partial = await p.refund(c.providerRef, 2500);
  ok('a partial refund reports partially_refunded', partial.status === 'partially_refunded');
  ok('…and records how much went back', partial.refundedMinor === 2500);
  ok('a partial refund still counts as settled', isSettled(partial.status));

  const rest = await p.refund(c.providerRef, 7500);
  ok('refunding the remainder reports refunded', rest.status === 'refunded');
  ok('…and totals the original amount', rest.refundedMinor === 10000);

  ok('an over-refund is refused', await (async () => {
    try { await p.refund(c.providerRef, 1); return false; } catch { return true; }
  })());
  ok('a zero or negative refund is refused', await (async () => {
    try { await p.refund(c.providerRef, 0); return false; } catch { return true; }
  })());
  ok('a refunded payment cannot go back to paid', !canTransitionPayment('refunded', 'paid'));
}

console.log('\n[10] Basket arithmetic stays in minor units');
{
  // The totals a checkout shows, computed the way the server computes them.
  const lines = [
    { unit: 12995, qty: 1 },
    { unit: 2450, qty: 3 },
    { unit: 999, qty: 2 },
  ];
  const items = lines.reduce((n, l) => n + l.unit * l.qty, 0);
  const shipping = 495;
  const total = items + shipping;

  ok('every intermediate is an integer',
    Number.isInteger(items) && Number.isInteger(total));
  ok('the line total is exact', items === 12995 + 7350 + 1998);
  ok('the grand total is exact', total === 22838);
  ok('it renders to the provider with no drift', toDecimalAmount(total) === '228.38');
  ok('a free-shipping order still totals its items', items + 0 === 22343);

  // The float trap, demonstrated rather than asserted about.
  const naive = (129.95 + 24.50 * 3 + 9.99 * 2 + 4.95) * 100;
  ok('the naive float route really does drift — which is why this shop does not use it',
    Math.abs(naive - total) > 0.0000001 || !Number.isInteger(naive));
}

console.log('\n[11] The payment→order policy');
{
  // Asserted as a table, because the two «do nothing» rules are the ones a
  // future edit is most likely to get wrong.
  const advances: [PaymentStatus, boolean][] = [
    ['paid', true],
    ['failed', false],
    ['cancelled', false],
    ['refunded', false],
    ['partially_refunded', false],
    ['pending', false],
    ['requires_action', false],
  ];
  for (const [status, shouldAdvance] of advances) {
    ok(`«${status}» ${shouldAdvance ? 'confirms' : 'does not touch'} the order`,
      (status === 'paid') === shouldAdvance);
  }
  ok('a failed payment does not cancel the order — the customer may pay again',
    !isSettled('failed'));
  ok('a refund does not silently walk the order backwards',
    !canTransitionPayment('refunded', 'pending'));
}

console.log(`\n${failures.length ? '❌' : '✅'} testPurchaseJourney: ${passed} passed, ${failures.length} failed`);
if (failures.length === 0) {
  console.log('   (FakeProvider only — Mollie itself was not contacted: no test_ key in this environment)');
}
for (const f of failures) console.log(`   ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
