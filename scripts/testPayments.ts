#!/usr/bin/env tsx
/**
 * The payment layer's guarantees, each made into a failure.
 *
 * Two kinds of check live here, deliberately together:
 *
 *   BEHAVIOUR — the state machine and the money arithmetic, exercised directly.
 *   STRUCTURE — that the dangerous shortcuts are absent from the source. A
 *               reviewer can read `service.ts` today and see it never trusts a
 *               request body; nobody can read every future edit. So the rules
 *               that would be catastrophic to lose are asserted against the
 *               files themselves.
 *
 * Structural checks are usually a smell — they test the shape of code rather
 * than what it does. They earn their place for exactly the properties where the
 * failure is silent and expensive: a shop that marks orders paid from a browser
 * redirect looks completely normal until the stock runs out.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canTransitionPayment, isTerminalPayment, isSettled, mapProviderStatus,
  paymentIdempotencyKey, PAYMENT_STATUS_NEXT, PAYMENT_STATUS_LABEL_AR,
  TERMINAL_PAYMENT_STATUSES, toDecimalAmount, fromDecimalAmount,
  type PaymentStatus,
} from '../src/data/store/payment';

// The adapter re-exports these under Mollie's name; the arithmetic is the
// core's. Testing the core directly keeps this suite runnable from the repo
// root, where `web/`'s path aliases do not resolve.
const toMollieAmount = toDecimalAmount;
const fromMollieAmount = fromDecimalAmount;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
/** Comments explain the rules; they must not be what satisfies them. */
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

let passed = 0;
const failures: string[] = [];
function ok(name: string, cond: boolean, detail = '') {
  if (cond) { passed += 1; console.log(`  ok — ${name}`); return; }
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  console.log(`  FAIL — ${name}${detail ? ` — ${detail}` : ''}`);
}

const service = stripComments(read('web/lib/server/payments/service.ts'));
const mollie = stripComments(read('web/lib/server/payments/mollie.ts'));
const provider = stripComments(read('web/lib/server/payments/provider.ts'));
const webhook = stripComments(read('web/app/api/payments/webhook/route.ts'));
const registry = stripComments(read('web/lib/server/payments/index.ts'));

const ALL: PaymentStatus[] = [
  'pending', 'requires_action', 'paid', 'failed',
  'refunded', 'partially_refunded', 'cancelled',
];

console.log('\n[1] The state machine says what it means');
{
  ok('every status has an Arabic label',
    ALL.every(s => (PAYMENT_STATUS_LABEL_AR[s] ?? '').trim().length > 2));
  ok('every status has a transition list', ALL.every(s => !!PAYMENT_STATUS_NEXT[s]));

  ok('a failed payment cannot become paid', !canTransitionPayment('failed', 'paid'));
  ok('a cancelled payment cannot become paid', !canTransitionPayment('cancelled', 'paid'));
  ok('a refunded payment cannot become paid', !canTransitionPayment('refunded', 'paid'));
  ok('a paid payment cannot go back to pending', !canTransitionPayment('paid', 'pending'));
  ok('pending can become paid', canTransitionPayment('pending', 'paid'));
  ok('paid can be refunded', canTransitionPayment('paid', 'refunded'));
  ok('a partial refund can become a full one',
    canTransitionPayment('partially_refunded', 'refunded'));

  // Idempotency, as a property of the machine rather than of a counter.
  ok('every status may transition to itself — this is what makes a repeat webhook a no-op',
    ALL.every(s => canTransitionPayment(s, s)));

  ok('terminal statuses have no way out',
    TERMINAL_PAYMENT_STATUSES.every(s => PAYMENT_STATUS_NEXT[s].length === 0));
  ok('failed is terminal', isTerminalPayment('failed'));
  ok('pending is not terminal', !isTerminalPayment('pending'));

  ok('only paid and partially refunded count as settled',
    isSettled('paid') && isSettled('partially_refunded')
    && !isSettled('pending') && !isSettled('requires_action')
    && !isSettled('failed') && !isSettled('refunded') && !isSettled('cancelled'));

  // A control: the machine must be capable of refusing something.
  ok('the machine can refuse (control)',
    ALL.some(a => ALL.some(b => !canTransitionPayment(a, b))));
}

console.log('\n[2] An unmapped provider status is refused, never guessed');
{
  const table = { paid: 'paid' as PaymentStatus };
  ok('a known status maps', mapProviderStatus('paid', table) === 'paid');
  ok('an unknown status returns null rather than a plausible default',
    mapProviderStatus('chargeback_reversed_partial', table) === null);
  ok('the adapter throws on an unmapped status rather than continuing',
    /unmapped Mollie status/.test(mollie));
}

console.log('\n[3] Money arithmetic is exact');
{
  const cases: [number, string][] = [
    [0, '0.00'], [1, '0.01'], [9, '0.09'], [10, '0.10'], [99, '0.99'],
    [100, '1.00'], [1099, '10.99'], [1000, '10.00'], [123456, '1234.56'],
    [100000000, '1000000.00'],
  ];
  ok('minor units render as two-decimal strings',
    cases.every(([m, s]) => toMollieAmount(m) === s),
    cases.filter(([m, s]) => toMollieAmount(m) !== s).map(([m]) => m).join(', '));
  ok('and parse back exactly',
    cases.every(([m, s]) => fromMollieAmount(s) === m),
    cases.filter(([m, s]) => fromMollieAmount(s) !== m).map(([, s]) => s).join(', '));

  // The specific float trap this code exists to avoid.
  ok('10.99 does not lose a cent through floating point',
    fromMollieAmount('10.99') === 1099 && Math.round(parseFloat('10.99') * 100) === 1099);
  ok('a round trip is stable across the whole range',
    Array.from({ length: 500 }, (_, i) => i * 37 + 1)
      .every(m => fromMollieAmount(toMollieAmount(m)) === m));

  ok('a malformed amount throws rather than returning zero', (() => {
    try { fromMollieAmount('ten euros'); return false; } catch { return true; }
  })());
  ok('an over-precise amount is refused', (() => {
    try { fromMollieAmount('1.005'); return false; } catch { return true; }
  })());
}

console.log('\n[4] Idempotency keys are deterministic and distinct');
{
  ok('the same order and attempt give the same key',
    paymentIdempotencyKey('ord_1', 1) === paymentIdempotencyKey('ord_1', 1));
  ok('a different attempt gives a different key',
    paymentIdempotencyKey('ord_1', 1) !== paymentIdempotencyKey('ord_1', 2));
  ok('a different order gives a different key',
    paymentIdempotencyKey('ord_1', 1) !== paymentIdempotencyKey('ord_2', 1));
  ok('the key names the order, so a stray key is traceable',
    paymentIdempotencyKey('ord_9', 3).includes('ord_9'));
  ok('the adapter actually sends it to the provider',
    /'Idempotency-Key':\s*input\.idempotencyKey/.test(mollie));
}

console.log('\n[5] The amount can only come from the order');
{
  ok('the amount is read from the order document',
    /const amountMinor = order\.totalMinor/.test(service));
  ok('startPayment takes an order id and nothing else',
    /export async function startPayment\(\s*orderId: string\s*\)/.test(service));
  ok('the service never reads an amount from a request',
    !/req\.(json|body|formData)|searchParams\.get\(['"]amount/.test(service));
  ok('a non-integer or non-positive total is refused',
    /Number\.isInteger\(amountMinor\)/.test(service) && /amountMinor <= 0/.test(service));
}

console.log('\n[6] The browser redirect proves nothing');
{
  ok('the return page exists', (() => {
    try { read('web/app/store/cart/checkout/done/page.tsx'); return true; }
    catch { return false; }
  })());
  const done = stripComments(read('web/app/store/cart/checkout/done/page.tsx'));
  ok('…and writes nothing at all',
    !/\.set\(|\.update\(|\.add\(|applyPaymentWebhook|startPayment/.test(done));
  ok('…and does not mark anything paid',
    !/status:\s*['"]paid['"]/.test(done));
}

console.log('\n[7] The webhook is never believed, only its reference');
{
  ok('parseWebhook returns a reference and no status',
    /providerRef: string/.test(provider)
    && !/parseWebhook[\s\S]{0,400}status:/.test(provider));
  ok('the service re-fetches the status from the provider',
    /provider\.fetchStatus\(ref\)/.test(service));
  ok('the route passes the RAW body, not parsed JSON',
    /await req\.text\(\)/.test(webhook) && !/await req\.json\(\)/.test(webhook));
  ok('an unknown payment reference is refused and recorded',
    /webhook for an unknown payment reference/.test(service));
  ok('a mismatched paid amount is refused',
    /paid amount does not match the order/.test(service));
  ok('an impossible transition is refused and recorded',
    /refused an impossible or out-of-order payment transition/.test(service));
  ok('a provider outage answers 500 so the provider retries',
    /status: retryable \? 500 : 400/.test(webhook));
  ok('the GET probe cannot change anything — there is no write in it',
    !/export async function GET[\s\S]*?(\.set\(|\.update\(|applyPaymentWebhook)/.test(webhook));
}

console.log('\n[8] Ownership and double payment');
{
  ok('the order owner is checked against the session',
    /order\.customerUid !== session\.uid/.test(service));
  ok('paying another account\'s order is audited as denied',
    /attempted to pay an order belonging to another account/.test(service));
  ok('an already-paid order refuses a new payment',
    /هذا الطلب مدفوع بالفعل/.test(service));
  ok('an open attempt returns the SAME checkout url instead of a second charge',
    /existing\.checkoutUrl/.test(service));
  ok('a cancelled order cannot be paid', /هذا الطلب ملغى/.test(service));
  ok('sign-in is required', /if \(!session\) return \{ ok: false/.test(service));
}

console.log('\n[9] No secrets, no fake keys, no live-mode surprise');
{
  const files = [service, mollie, provider, registry, webhook];
  ok('no key literal anywhere in the payment layer',
    files.every(f => !/(test|live)_[A-Za-z0-9]{10,}/.test(f)));
  ok('no placeholder key is committed as a default',
    !/MOLLIE_API_KEY\s*(\?\?|\|\|)\s*['"]/.test(registry));
  ok('an absent key yields no provider rather than a broken one',
    /if \(!key\) return null;/.test(registry));
  ok('test mode is read from the key prefix, not a separate flag',
    /startsWith\('live_'\)/.test(mollie));
  ok('an unknown provider name throws rather than falling back',
    /unknown PAYMENT_PROVIDER/.test(registry));
  ok('the webhook origin must be configured, never defaulted to localhost',
    /NEXT_PUBLIC_SITE_URL must be set for payments/.test(service));
  ok('card details are never stored — nothing in the layer reads a card field',
    files.every(f => !/\b(cardNumber|cvc|cvv|pan|expiryMonth)\b/.test(f)));
}

console.log('\n[10] The provider stays swappable');
{
  ok('the service imports the interface, never Mollie directly',
    !/from '\.\/mollie'/.test(service));
  ok('the webhook route imports the service, never a provider',
    !/mollie|stripe/i.test(webhook));
  ok('Mollie-specific code lives only in mollie.ts',
    !/api\.mollie\.com/.test(service) && !/api\.mollie\.com/.test(provider));
  ok('the interface declares exactly the four operations the shop needs',
    /createCheckout/.test(provider) && /parseWebhook/.test(provider)
    && /fetchStatus/.test(provider) && /refund\?/.test(provider));
}

console.log(`\n${failures.length ? '❌' : '✅'} testPayments: ${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log(`   ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
