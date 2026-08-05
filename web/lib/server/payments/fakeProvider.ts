import 'server-only';
import { mapProviderStatus, toDecimalAmount, fromDecimalAmount } from '@core/data/store/payment';
import type { PaymentStatus } from '@core/data/store/payment';
import type { Minor } from '@core/data/store/types';
import {
  PaymentProviderError,
  type CreateCheckoutInput, type CreateCheckoutResult,
  type PaymentProvider, type ProviderPaymentState, type WebhookParse,
} from './provider';

/**
 * A payment provider that exists only in memory.
 *
 * WHY THIS IS NOT A MOCK
 * ----------------------
 * It implements `PaymentProvider` in full and is driven through the SAME
 * service, the same webhook route and the same state machine as Mollie. Nothing
 * in `service.ts` knows which one it is talking to. That is the difference
 * between exercising the journey and asserting that some stubs were called: a
 * bug in the ordering of «fetch status → check amount → check transition»
 * shows up here exactly as it would in production.
 *
 * It deliberately mimics Mollie's CONTRACT rather than its convenience:
 *   - the webhook body carries only a reference, never a status
 *   - the status must be fetched
 *   - the same idempotency key returns the SAME payment
 *   - an unknown status is refused rather than mapped to something plausible
 *
 * WHAT IT CANNOT TELL US
 * ----------------------
 * Whether Mollie's real API accepts our payload, what its live error shapes
 * look like, or whether the redirect flow behaves in a browser. Those need a
 * `test_` key, and the report says so rather than implying coverage this does
 * not have. This proves OUR half of the contract.
 */

interface FakePayment {
  ref: string;
  orderId: string;
  amountMinor: Minor;
  currency: string;
  raw: string;
  refundedMinor: Minor;
  idempotencyKey: string;
}

/** The vocabulary a test drives it with — deliberately Mollie's own words. */
const STATUS_TABLE: Record<string, PaymentStatus> = {
  open: 'pending',
  pending: 'requires_action',
  paid: 'paid',
  canceled: 'cancelled',
  expired: 'cancelled',
  failed: 'failed',
};

export class FakeProvider implements PaymentProvider {
  readonly id = 'fake';
  /** Never live. A fake that could claim to be live is a fake in production. */
  readonly live = false;

  private readonly payments = new Map<string, FakePayment>();
  private readonly byIdempotencyKey = new Map<string, string>();
  private counter = 0;

  /** Set to make the next `fetchStatus` throw, for the outage case. */
  failNextFetch = false;

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    // The provider-side half of duplicate prevention, exactly as Mollie does it.
    const existing = this.byIdempotencyKey.get(input.idempotencyKey);
    if (existing) {
      return {
        providerRef: existing,
        checkoutUrl: `https://fake.test/checkout/${existing}`,
        testMode: true,
      };
    }

    this.counter += 1;
    const ref = `tr_fake${String(this.counter).padStart(6, '0')}`;
    this.payments.set(ref, {
      ref,
      orderId: input.orderId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      raw: 'open',
      refundedMinor: 0,
      idempotencyKey: input.idempotencyKey,
    });
    this.byIdempotencyKey.set(input.idempotencyKey, ref);

    return {
      providerRef: ref,
      checkoutUrl: `https://fake.test/checkout/${ref}`,
      testMode: true,
    };
  }

  parseWebhook(_headers: Headers, rawBody: string): WebhookParse {
    const id = new URLSearchParams(rawBody).get('id');
    if (!id) return { ok: false, errorAr: 'طلب غير صالح.' };
    if (!/^tr_[A-Za-z0-9]{6,64}$/.test(id)) return { ok: false, errorAr: 'معرّف غير صالح.' };
    return { ok: true, providerRef: id };
  }

  async fetchStatus(providerRef: string): Promise<ProviderPaymentState> {
    if (this.failNextFetch) {
      this.failNextFetch = false;
      throw new PaymentProviderError('simulated provider outage');
    }
    const p = this.payments.get(providerRef);
    if (!p) throw new PaymentProviderError(`unknown payment ${providerRef}`);

    const status = mapProviderStatus(p.raw, STATUS_TABLE);
    if (!status) throw new PaymentProviderError(`unmapped status: ${p.raw}`);

    let finalStatus = status;
    if (status === 'paid' && p.refundedMinor > 0) {
      finalStatus = p.refundedMinor >= p.amountMinor ? 'refunded' : 'partially_refunded';
    }

    return {
      status: finalStatus,
      amountMinor: p.amountMinor,
      currency: p.currency as ProviderPaymentState['currency'],
      method: status === 'paid' ? 'ideal' : undefined,
      refundedMinor: p.refundedMinor,
    };
  }

  async refund(providerRef: string, amountMinor: Minor): Promise<ProviderPaymentState> {
    const p = this.payments.get(providerRef);
    if (!p) throw new PaymentProviderError(`unknown payment ${providerRef}`);
    if (p.raw !== 'paid') throw new PaymentProviderError('cannot refund an unpaid payment');
    if (amountMinor <= 0) throw new PaymentProviderError('refund amount must be positive');
    if (p.refundedMinor + amountMinor > p.amountMinor) {
      throw new PaymentProviderError('refund exceeds the amount paid');
    }
    p.refundedMinor += amountMinor;
    return this.fetchStatus(providerRef);
  }

  /* ── Test controls. Not part of `PaymentProvider`. ───────────────────────── */

  /** Move a payment to a provider-side status, as the customer would. */
  drive(providerRef: string, rawStatus: string): void {
    const p = this.payments.get(providerRef);
    if (!p) throw new PaymentProviderError(`unknown payment ${providerRef}`);
    p.raw = rawStatus;
  }

  /** Tamper with the settled amount, for the mismatch case. */
  forceAmount(providerRef: string, amountMinor: Minor): void {
    const p = this.payments.get(providerRef);
    if (!p) throw new PaymentProviderError(`unknown payment ${providerRef}`);
    p.amountMinor = amountMinor;
  }

  forceCurrency(providerRef: string, currency: string): void {
    const p = this.payments.get(providerRef);
    if (!p) throw new PaymentProviderError(`unknown payment ${providerRef}`);
    p.currency = currency;
  }

  webhookBody(providerRef: string): string {
    return new URLSearchParams({ id: providerRef }).toString();
  }

  count(): number { return this.payments.size; }

  /** So a test can assert the decimal contract without importing Mollie. */
  static readonly amountCodec = { to: toDecimalAmount, from: fromDecimalAmount };
}
