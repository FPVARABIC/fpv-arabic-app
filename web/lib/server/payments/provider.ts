import 'server-only';
import type { PaymentMethod, PaymentStatus } from '@core/data/store/payment';
import type { CurrencyCode, Minor } from '@core/data/store/types';

/**
 * What the shop needs from a payment provider — and nothing more.
 *
 * WHY AN INTERFACE AT ALL
 * -----------------------
 * The brief was explicit: «صمّمها بحيث يكون مزود الدفع قابلاً للتغيير، ولا تربط
 * منطق الطلب بمزود واحد داخل المكونات». A provider is a commercial decision
 * that changes — fees change, a market needs a method the current one lacks,
 * an account gets frozen. When the provider's SDK is imported directly by a
 * checkout button, changing it means touching every component that sells
 * anything, and the order logic gets rewritten to suit a vendor.
 *
 * So exactly four operations cross this line, and the order logic knows nothing
 * else about who processes the money.
 *
 * THE SHAPE IS BUILT AROUND ONE RULE: NEVER TRUST THE REQUEST
 * -----------------------------------------------------------
 * `parseWebhook` deliberately returns ONLY a reference — never a status, never
 * an amount, even when the provider's webhook body contains both. The status is
 * then fetched with `fetchStatus`, over an authenticated connection we opened,
 * from the provider's own API.
 *
 * That is not paranoia about signatures; it is what makes the design correct
 * for both kinds of provider. Stripe signs its webhooks and the body can be
 * trusted after verification. Mollie does not sign, and sends only an id
 * precisely because the body is not meant to be trusted. A single pipeline that
 * always re-fetches is correct for both, and cannot be got wrong by whoever
 * adds the third provider.
 */

export interface CreateCheckoutInput {
  /** Our order id. Sent to the provider as metadata so a payment is traceable. */
  orderId: string;
  /** Computed on the server FROM THE ORDER. A browser never supplies this. */
  amountMinor: Minor;
  currency: CurrencyCode;
  /** Shown on the customer's bank statement. Kept short and recognisable. */
  descriptionAr: string;
  /** Where the customer lands afterwards. Proof of nothing — see the note. */
  returnUrl: string;
  /** Where the provider POSTs. Must be publicly reachable. */
  webhookUrl: string;
  /** Same key ⇒ same payment. The provider must not create a second one. */
  idempotencyKey: string;
  /** What we would like offered. The provider decides what it can honour. */
  preferredMethods?: PaymentMethod[];
  /** For providers that localise their hosted page. */
  locale?: string;
}

export interface CreateCheckoutResult {
  providerRef: string;
  /** Where to send the customer. */
  checkoutUrl: string;
  /** True when created against test credentials. Recorded on the payment. */
  testMode: boolean;
}

/** What a provider can tell us about a payment when we ask it directly. */
export interface ProviderPaymentState {
  status: PaymentStatus;
  /** The authoritative amount, as the provider holds it. */
  amountMinor: Minor;
  currency: CurrencyCode;
  method?: PaymentMethod;
  refundedMinor?: Minor;
  failureReason?: string;
}

export type WebhookParse =
  | { ok: true; providerRef: string }
  | { ok: false; errorAr: string };

export interface PaymentProvider {
  /** `mollie`, `stripe`. Stored on every payment record. */
  readonly id: string;
  /** False when running against test credentials. */
  readonly live: boolean;

  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;

  /**
   * Extract the provider's payment reference from an incoming webhook.
   *
   * This is where a signature is verified, for providers that sign. It returns
   * a reference and NOTHING else on purpose: see the header. A provider that
   * signs still goes through `fetchStatus`, because a valid signature proves
   * the message is authentic, not that it is current — webhooks arrive late and
   * out of order.
   */
  parseWebhook(headers: Headers, rawBody: string): WebhookParse;

  /** Ask the provider what it thinks happened. The only source of truth. */
  fetchStatus(providerRef: string): Promise<ProviderPaymentState>;

  /**
   * Send money back. Optional — a provider without it simply cannot be used for
   * refunds, and the admin panel says so rather than pretending.
   */
  refund?(providerRef: string, amountMinor: Minor): Promise<ProviderPaymentState>;
}

/**
 * Thrown when the provider is reachable but refuses, or is misconfigured.
 *
 * Carries an Arabic sentence for the customer and keeps the technical detail
 * for the log. A payment error that reaches a customer as a stack trace is two
 * failures: the payment, and the shop's composure.
 */
export class PaymentProviderError extends Error {
  constructor(
    message: string,
    readonly customerMessageAr = 'تعذّر بدء الدفع الآن. حاول بعد قليل.',
  ) {
    super(message);
    this.name = 'PaymentProviderError';
  }
}
