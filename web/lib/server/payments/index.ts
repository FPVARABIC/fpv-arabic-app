import 'server-only';
import { MollieProvider } from './mollie';
import { PaymentProviderError, type PaymentProvider } from './provider';

/**
 * Which provider this deployment uses, if any.
 *
 * NOT CONFIGURED IS A FIRST-CLASS STATE
 * -------------------------------------
 * The shop runs today with no payment account at all, and must keep running:
 * the catalogue, the basket and the order form all work without one. So this
 * returns `null` rather than throwing at import time, and every caller is
 * written to say «الدفع غير مفعّل» instead of crashing a page that has nothing
 * to do with payment.
 *
 * NO FAKE KEYS, ANYWHERE
 * ----------------------
 * There is no placeholder default and no `sk_test_xxx` committed for
 * convenience. A fake key is indistinguishable from a real one in a diff, and
 * the day somebody replaces it in the wrong file is the day payments silently
 * go to nobody. Absent means absent. `docs/store/PAYMENTS.md` lists the values
 * the owner will supply, and this file reads them and nothing else.
 */

let cached: PaymentProvider | null | undefined;

export function paymentProvider(): PaymentProvider | null {
  if (cached !== undefined) return cached;
  cached = build();
  return cached;
}

function build(): PaymentProvider | null {
  const name = (process.env.PAYMENT_PROVIDER ?? 'mollie').trim().toLowerCase();

  if (name === 'mollie') {
    const key = process.env.MOLLIE_API_KEY?.trim();
    if (!key) return null;
    return new MollieProvider(key);
  }

  // An unknown name is a configuration mistake, not a reason to fall back to
  // some default provider and take money through it.
  throw new PaymentProviderError(`unknown PAYMENT_PROVIDER: ${name}`);
}

export function isPaymentConfigured(): boolean {
  return paymentProvider() !== null;
}

/**
 * Whether this deployment is talking to a provider's TEST environment.
 *
 * Rendered beside the pay button, because a test-mode shop that looks exactly
 * like a live one is how the first real customer discovers their money went
 * nowhere.
 */
export function isPaymentTestMode(): boolean {
  const p = paymentProvider();
  return p ? !p.live : false;
}

/** For tests, which build providers directly. */
export function resetPaymentProviderCache(): void {
  cached = undefined;
}

export { PaymentProviderError } from './provider';
export type { PaymentProvider } from './provider';
