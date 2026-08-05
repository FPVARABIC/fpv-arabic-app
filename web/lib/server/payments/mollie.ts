import 'server-only';
import type { PaymentMethod, PaymentStatus } from '@core/data/store/payment';
import { mapProviderStatus, toDecimalAmount, fromDecimalAmount } from '@core/data/store/payment';
import type { CurrencyCode, Minor } from '@core/data/store/types';
import {
  PaymentProviderError,
  type CreateCheckoutInput, type CreateCheckoutResult,
  type PaymentProvider, type ProviderPaymentState, type WebhookParse,
} from './provider';

/**
 * Mollie.
 *
 * WHY MOLLIE FOR THIS SHOP
 * ------------------------
 * The shop sells into the Netherlands. iDEAL is how most Dutch customers
 * actually pay, and Mollie is a Dutch acquirer with iDEAL as a first-class
 * method rather than an add-on routed through a card rail. Its pricing is
 * per-transaction with no monthly floor, which suits a shop whose first month
 * might see ten orders. Cards, Bancontact and PayPal are the same integration.
 *
 * None of that is locked in: everything Mollie-specific is in this file, behind
 * `PaymentProvider`. Swapping to Stripe is a new file and one environment
 * variable.
 *
 * WHY THE WEBHOOK CARRIES NOTHING WORTH TRUSTING — AND WHY THAT IS GOOD
 * ---------------------------------------------------------------------
 * Mollie's webhook is `POST id=tr_xxx` and that is all. It is not signed, and
 * Mollie's own documentation is explicit that you must fetch the payment to
 * learn its state. That reads like a weakness and is actually the safer shape:
 * there is no body to forge into a `paid`, because the body is never believed.
 * An attacker who POSTs a made-up id gets a 404 from Mollie's API; one who
 * POSTs a REAL id causes us to re-read a payment we already own and re-apply
 * its true status, which is a no-op.
 *
 * So `parseWebhook` here verifies shape only, and every status comes from
 * `fetchStatus`. See the note on `PaymentProvider`.
 *
 * AMOUNTS
 * -------
 * Mollie speaks decimal strings — `{"currency":"EUR","value":"10.00"}` — and
 * this shop speaks integer minor units, because floating-point money is how a
 * cent goes missing. The conversion itself lives in the shared core beside the
 * money types: it is arithmetic rather than vendor behaviour, it is identical
 * for every provider that speaks decimals, and keeping it out of an adapter is
 * what lets `scripts/testPayments.ts` exercise it at its boundary values from
 * the repo root. This file only names it.
 */

const API = 'https://api.mollie.com/v2';

/** Mollie's vocabulary → ours. Anything absent is refused, never guessed. */
const STATUS_TABLE: Record<string, PaymentStatus> = {
  open: 'pending',
  pending: 'requires_action',
  authorized: 'requires_action',
  paid: 'paid',
  canceled: 'cancelled',
  expired: 'cancelled',
  failed: 'failed',
};

const METHOD_TABLE: Record<string, PaymentMethod> = {
  ideal: 'ideal',
  creditcard: 'card',
  paypal: 'paypal',
  bancontact: 'bancontact',
};

/**
 * Mollie speaks decimal strings; this shop speaks integer minor units. Both
 * conversions live in the shared core beside the money types — see
 * `toDecimalAmount` there for why `parseFloat` is not used. Re-exported under
 * Mollie's name so the adapter's callers read naturally.
 */
export const toMollieAmount = toDecimalAmount;
export const fromMollieAmount = fromDecimalAmount;

export class MollieProvider implements PaymentProvider {
  readonly id = 'mollie';
  readonly live: boolean;

  constructor(private readonly apiKey: string) {
    if (!apiKey) throw new PaymentProviderError('Mollie API key is empty');
    // Mollie keys are self-describing: `test_…` and `live_…`. Reading the mode
    // off the key rather than off a separate flag removes the failure where a
    // live key runs while a `TEST_MODE=true` variable says otherwise.
    this.live = apiKey.startsWith('live_');
  }

  private async call(path: string, init?: RequestInit): Promise<Record<string, unknown>> {
    let res: Response;
    try {
      res = await fetch(`${API}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
        cache: 'no-store',
      });
    } catch (e) {
      throw new PaymentProviderError(`Mollie unreachable: ${String(e)}`);
    }
    const body = await res.text();
    if (!res.ok) {
      // The provider's detail goes to the log; the customer gets a sentence.
      throw new PaymentProviderError(`Mollie ${res.status} on ${path}: ${body.slice(0, 300)}`);
    }
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      throw new PaymentProviderError(`Mollie returned non-JSON on ${path}`);
    }
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const body: Record<string, unknown> = {
      amount: { currency: input.currency, value: toMollieAmount(input.amountMinor) },
      description: input.descriptionAr.slice(0, 255),
      redirectUrl: input.returnUrl,
      webhookUrl: input.webhookUrl,
      // Our order id travels with the payment, so a payment found in Mollie's
      // dashboard can be traced back without a lookup table.
      metadata: { orderId: input.orderId, idempotencyKey: input.idempotencyKey },
      locale: input.locale ?? 'nl_NL',
    };

    const wanted = (input.preferredMethods ?? [])
      .map(m => Object.entries(METHOD_TABLE).find(([, v]) => v === m)?.[0])
      .filter((v): v is string => !!v);
    if (wanted.length === 1) body.method = wanted[0];

    const json = await this.call('/payments', {
      method: 'POST',
      body: JSON.stringify(body),
      // Mollie honours this header: the same key returns the SAME payment
      // instead of creating a second one. This is the provider-side half of
      // duplicate prevention; the order-side half is in `service.ts`.
      headers: { 'Idempotency-Key': input.idempotencyKey },
    });

    const ref = typeof json.id === 'string' ? json.id : '';
    const links = json._links as { checkout?: { href?: string } } | undefined;
    const url = links?.checkout?.href;
    if (!ref || !url) {
      throw new PaymentProviderError('Mollie created a payment with no id or checkout link');
    }
    return { providerRef: ref, checkoutUrl: url, testMode: !this.live };
  }

  /**
   * Mollie posts `id=tr_xxx` as form data. Shape only — no status is read here.
   */
  parseWebhook(_headers: Headers, rawBody: string): WebhookParse {
    const id = new URLSearchParams(rawBody).get('id');
    if (!id) return { ok: false, errorAr: 'طلب غير صالح.' };
    // Mollie ids look like `tr_WDqYK6vllg`. Refusing anything else keeps
    // path-shaped junk out of the URL we are about to build from it.
    if (!/^tr_[A-Za-z0-9]{6,64}$/.test(id)) return { ok: false, errorAr: 'معرّف غير صالح.' };
    return { ok: true, providerRef: id };
  }

  async fetchStatus(providerRef: string): Promise<ProviderPaymentState> {
    if (!/^tr_[A-Za-z0-9]{6,64}$/.test(providerRef)) {
      throw new PaymentProviderError(`refusing to fetch malformed ref: ${providerRef}`);
    }
    const json = await this.call(`/payments/${providerRef}`);

    const raw = typeof json.status === 'string' ? json.status : '';
    const status = mapProviderStatus(raw, STATUS_TABLE);
    if (!status) {
      // Deliberately fatal. A status we do not model is a status we do not
      // understand, and the safe response is to stop rather than to pick the
      // nearest-looking one.
      throw new PaymentProviderError(`unmapped Mollie status: ${raw || '(missing)'}`);
    }

    const amount = json.amount as { value?: string; currency?: string } | undefined;
    const refunded = json.amountRefunded as { value?: string } | undefined;
    const refundedMinor = refunded?.value ? fromMollieAmount(refunded.value) : 0;
    const amountMinor = amount?.value ? fromMollieAmount(amount.value) : 0;

    // A partial refund is ours to infer: Mollie reports the refunded amount,
    // not a distinct status for it.
    let finalStatus = status;
    if (status === 'paid' && refundedMinor > 0) {
      finalStatus = refundedMinor >= amountMinor ? 'refunded' : 'partially_refunded';
    }

    const methodRaw = typeof json.method === 'string' ? json.method : '';
    return {
      status: finalStatus,
      amountMinor,
      currency: (amount?.currency ?? 'EUR') as CurrencyCode,
      method: METHOD_TABLE[methodRaw] ?? (methodRaw ? 'other' : undefined),
      refundedMinor,
      failureReason: typeof json.details === 'object' && json.details
        ? String((json.details as Record<string, unknown>).failureReason ?? '') || undefined
        : undefined,
    };
  }

  async refund(providerRef: string, amountMinor: Minor): Promise<ProviderPaymentState> {
    if (amountMinor <= 0) throw new PaymentProviderError('refund amount must be positive');
    await this.call(`/payments/${providerRef}/refunds`, {
      method: 'POST',
      body: JSON.stringify({
        amount: { currency: 'EUR', value: toMollieAmount(amountMinor) },
      }),
    });
    // Re-read rather than trusting the refund response, for the same reason the
    // webhook is re-read: the payment's state is Mollie's to report, not ours
    // to assemble from a side effect.
    return this.fetchStatus(providerRef);
  }
}
