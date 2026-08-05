import type { CurrencyCode, Minor } from './types';

/**
 * Payment, as a state of its own.
 *
 * WHY THIS IS NOT PART OF `OrderStatus`
 * -------------------------------------
 * Because they answer different questions and move at different times. «هل
 * وصلنا المال؟» and «أين وصلت الشحنة؟» are independent: a paid order can sit
 * unshipped for a week, a shipped order can be refunded, and a cancelled order
 * can still be owed money back. Folding them into one enum forces a product to
 * invent states like `paid-but-not-shipped` and then discover it needs
 * `refunded-after-shipping` too — the combinations multiply, and every one of
 * them is a branch somebody forgets.
 *
 * So `OrderStatus` stays exactly what it already was — the fulfilment track the
 * admin panel and its tests already drive — and payment lives here beside it.
 *
 * THE ONE RULE THAT MATTERS MOST
 * ------------------------------
 * Nothing in this file is ever set from a browser. Not by a form, not by a
 * redirect, not by a webhook body. The status is written only after the server
 * has asked the payment provider directly what it thinks happened. A customer
 * returning to `/success` proves that a customer visited a URL; it proves
 * nothing whatsoever about money.
 */

export type PaymentStatus =
  /** Created with the provider; nobody has paid yet. */
  | 'pending'
  /** The provider needs the customer to do something (3-D Secure, a bank app). */
  | 'requires_action'
  /** The provider has confirmed the money. The only status that ships goods. */
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'cancelled';

export const PAYMENT_STATUS_LABEL_AR: Record<PaymentStatus, string> = {
  pending: 'بانتظار الدفع',
  requires_action: 'يحتاج إجراءً من العميل',
  paid: 'مدفوع',
  failed: 'فشل الدفع',
  refunded: 'مُسترجَع بالكامل',
  partially_refunded: 'مُسترجَع جزئياً',
  cancelled: 'أُلغي الدفع',
};

/**
 * Which transitions are real.
 *
 * A refund can only follow a payment; a failed attempt cannot become paid
 * without a NEW attempt. Declared as data so the webhook handler cannot invent
 * a transition, and so an out-of-order webhook — they arrive out of order,
 * routinely — is rejected rather than applied.
 */
export const PAYMENT_STATUS_NEXT: Record<PaymentStatus, readonly PaymentStatus[]> = {
  pending: ['requires_action', 'paid', 'failed', 'cancelled'],
  requires_action: ['paid', 'failed', 'cancelled'],
  paid: ['refunded', 'partially_refunded'],
  // A second attempt is a new payment record, not a resurrection of this one.
  failed: [],
  refunded: [],
  partially_refunded: ['refunded'],
  cancelled: [],
};

/** Statuses that will never change again. */
export const TERMINAL_PAYMENT_STATUSES: readonly PaymentStatus[] = [
  'failed', 'refunded', 'cancelled',
];

export function isTerminalPayment(s: PaymentStatus): boolean {
  return TERMINAL_PAYMENT_STATUSES.includes(s);
}

/**
 * May this payment move to that status?
 *
 * Same-to-same is allowed and is the ordinary case: providers deliver the same
 * webhook more than once, and re-applying `paid` to a paid order must be a
 * no-op rather than an error. That is what makes the handler idempotent.
 */
export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  if (from === to) return true;
  return PAYMENT_STATUS_NEXT[from].includes(to);
}

/** Only a paid order may be fulfilled. The one question fulfilment asks. */
export function isSettled(s: PaymentStatus): boolean {
  return s === 'paid' || s === 'partially_refunded';
}

/**
 * Methods the shop intends to offer.
 *
 * iDEAL first, deliberately: this shop sells into the Netherlands, where iDEAL
 * is how most people actually pay and a card-only checkout loses the sale at
 * the last screen. The list is open because the provider decides what is
 * available per country and per amount — this is what we ASK for.
 */
export type PaymentMethod = 'ideal' | 'card' | 'paypal' | 'bancontact' | 'other';

export const PAYMENT_METHOD_LABEL_AR: Record<PaymentMethod, string> = {
  ideal: 'iDEAL',
  card: 'بطاقة',
  paypal: 'PayPal',
  bancontact: 'Bancontact',
  other: 'وسيلة أخرى',
};

/**
 * The payment attached to an order.
 *
 * There is at most one ACTIVE record per order. A failed attempt is kept — a
 * customer who tried three times and succeeded on the fourth is a fact worth
 * being able to read back — but only one may be non-terminal at a time, which
 * is what stops an order being paid twice.
 */
export interface OrderPayment {
  /** Our id, not the provider's. Stable even if we change providers. */
  id: string;
  orderId: string;
  /** `mollie`, `stripe`, … Recorded so a migration can tell records apart. */
  provider: string;
  /**
   * The provider's own id for this payment.
   *
   * The webhook carries this and nothing else worth trusting; everything else
   * is re-fetched from the provider using it.
   */
  providerRef: string;
  /**
   * Whether this was created against the provider's TEST credentials.
   *
   * Stored on the record rather than inferred from today's configuration,
   * because configuration changes and a test payment must never later read as
   * a real one.
   */
  testMode: boolean;
  status: PaymentStatus;
  /** Computed from the order on the server. Never sent by a browser. */
  amountMinor: Minor;
  currency: CurrencyCode;
  /** Filled once the provider reports what the customer actually used. */
  method?: PaymentMethod;
  /** How much has gone back, if any. */
  refundedMinor?: Minor;
  /**
   * The key that makes «create a payment» safe to retry.
   *
   * Derived from the order and the attempt, so a double-clicked button or a
   * retried request produces the SAME key and therefore the same payment
   * instead of a second charge.
   */
  idempotencyKey: string;
  /** Where the provider sent the customer. Not proof of anything. */
  checkoutUrl?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * The idempotency key for one attempt at one order.
 *
 * Deterministic on purpose: the same order and attempt number always produce
 * the same key, so a retry of a request that already succeeded is recognised as
 * the same operation rather than being charged again.
 */
export function paymentIdempotencyKey(orderId: string, attempt: number): string {
  return `order:${orderId}:attempt:${attempt}`;
}

/**
 * How a provider's own vocabulary becomes ours.
 *
 * Every provider names these differently and adds states we do not model. The
 * mapping is total by construction — an unrecognised status maps to `null` and
 * the caller REFUSES to write it, rather than defaulting to something plausible.
 * A provider status we have never seen must stop the pipeline and be looked at,
 * because the one that silently maps to `paid` is the one that ships free goods.
 */
export function mapProviderStatus(
  raw: string,
  table: Record<string, PaymentStatus>,
): PaymentStatus | null {
  return table[raw] ?? null;
}

/* ── Money at the provider boundary ───────────────────────────────────────── */

/**
 * `1099` → `"10.99"`.
 *
 * Most payment APIs — Mollie, PayPal, Adyen — speak decimal strings, while this
 * shop speaks integer minor units everywhere because floating-point money is
 * how a cent goes missing. The conversion therefore happens at exactly one
 * boundary, in one direction each way.
 *
 * It lives HERE rather than in a provider adapter because it is arithmetic, not
 * vendor behaviour: it has no server dependency, it is the same for every
 * provider that speaks decimals, and putting it in the shared core is what lets
 * it be tested directly at its boundary values.
 */
export function toDecimalAmount(minor: Minor): string {
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(minor);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/**
 * `"10.99"` → `1099`.
 *
 * Parsed by splitting on the decimal point rather than by `parseFloat` and
 * multiplying: `parseFloat('10.99') * 100` is `1098.9999999999998`. Rounding
 * that happens to give the right answer for every amount this shop sends today,
 * and "happens to work" is not a property to build a payment ledger on.
 *
 * Throws on anything it cannot read exactly — including three decimal places.
 * A malformed amount that silently became `0` would be a free order.
 */
export function fromDecimalAmount(value: string): Minor {
  const m = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!m) throw new RangeError(`unparseable money amount: ${value}`);
  const [, sign, whole, frac = '0'] = m;
  const minor = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  return sign === '-' ? -minor : minor;
}
