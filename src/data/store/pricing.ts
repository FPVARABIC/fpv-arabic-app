/**
 * The pricing engine.
 *
 * ONE FUNCTION, AND IT IS PURE
 * ----------------------------
 * `sellingPrice(supply, settings)` takes what we paid and what we decided to
 * charge above it, and returns the number a customer sees. It reads no
 * database, holds no state, and makes no decision that is not in its inputs —
 * which is what lets `scripts/testStore.ts` assert its behaviour exhaustively
 * instead of hoping.
 *
 * Everything about it is a policy the admin panel can change: the margin, the
 * rounding, the per-product override. Nothing is a number in a component.
 *
 * WHY INTEGER MINOR UNITS THROUGHOUT
 * ----------------------------------
 * Because floating point cannot hold a price. `19.99 * 1.1` is
 * 21.989000000000004, and a store that carries that number into a total ends
 * up with an invoice that does not add up — usually by one cent, always in
 * front of a customer. Every amount here is an integer number of cents, and
 * the only division is the final rounding, which is explicit and tested.
 *
 * WHY MARGIN IS APPLIED TO LANDED COST, NOT TO THE UNIT PRICE
 * -----------------------------------------------------------
 * Because inbound shipping is a cost of selling the thing. A 10% margin on the
 * unit price alone, on an item that costs $30 with $20 of shipping, yields $53
 * against $50 of real cost — a 6% margin that somebody believed was 10%. The
 * distinction is the difference between a store that makes money and one that
 * finds out at the end of the quarter.
 */

import type {
  CurrencyCode, Minor, StorePrivateSettings, StoreSupply,
} from './types';
import { CURRENCIES } from './types';

/** How the final price is tidied up for display. */
export type RoundingMode =
  /** No tidying — the computed figure to the cent. */
  | 'exact'
  /** Up to the next whole major unit: 21.99 → 22. */
  | 'whole'
  /** Up to the next .99: 21.30 → 21.99. The convention most stores use. */
  | 'charm';

export interface PricingPolicy {
  marginPercent: number;
  rounding: RoundingMode;
}

export const DEFAULT_ROUNDING: RoundingMode = 'charm';

/**
 * What a price is made of, itemised.
 *
 * Returned rather than just the final number so the admin panel can show
 * whoever sets a margin exactly what it produced, and so a wrong price can be
 * traced to the input that caused it instead of being re-derived by hand.
 * The customer sees only `sellMinor`; this whole object is staff-only.
 */
export interface PriceBreakdown {
  unitCostMinor: Minor;
  inboundShippingMinor: Minor;
  /** What the item actually costs us, delivered. */
  landedCostMinor: Minor;
  marginPercent: number;
  /** The margin in money, after rounding is applied. */
  marginMinor: Minor;
  /** Before rounding — kept so rounding's effect is visible, not implied. */
  rawSellMinor: Minor;
  sellMinor: Minor;
  rounding: RoundingMode;
  currency: CurrencyCode;
}

/**
 * Rounds a computed price up according to the policy.
 *
 * Always UP. Rounding a price down means selling below the margin that was
 * set, silently, on every item that happens to land on the wrong cent.
 */
export function applyRounding(minor: Minor, mode: RoundingMode, currency: CurrencyCode): Minor {
  const per = CURRENCIES[currency].minorPerMajor;
  switch (mode) {
    case 'exact':
      return minor;
    case 'whole':
      return Math.ceil(minor / per) * per;
    case 'charm': {
      // The next X.99 at or above the figure. A price that is already X.99
      // stays where it is rather than jumping a whole unit.
      const remainder = minor % per;
      const base = minor - remainder;
      if (remainder === per - 1) return minor;
      if (remainder < per - 1) return base + (per - 1);
      return base + per + (per - 1);
    }
  }
}

/** The policy in force for one product: its override, or the store default. */
export function policyFor(
  supply: Pick<StoreSupply, 'marginPercentOverride'>,
  settings: Pick<StorePrivateSettings, 'defaultMarginPercent'>,
  rounding: RoundingMode = DEFAULT_ROUNDING,
): PricingPolicy {
  const override = supply.marginPercentOverride;
  return {
    marginPercent: typeof override === 'number' && Number.isFinite(override) && override >= 0
      ? override
      : settings.defaultMarginPercent,
    rounding,
  };
}

/**
 * The selling price and everything that produced it.
 *
 * Returns `null` when the supply record is not complete enough to price from.
 * That is a real answer, and the storefront renders it as «السعر قيد التحديث»
 * with ordering disabled. The alternative — a placeholder number — is a lie
 * that a customer can act on.
 */
export function priceFrom(
  supply: Pick<StoreSupply, 'unitCostMinor' | 'inboundShippingMinor' | 'costCurrency' | 'marginPercentOverride'>,
  settings: Pick<StorePrivateSettings, 'defaultMarginPercent'>,
  rounding: RoundingMode = DEFAULT_ROUNDING,
): PriceBreakdown | null {
  const { unitCostMinor, inboundShippingMinor, costCurrency } = supply;

  // A missing or nonsensical cost prices nothing. Note that ZERO is refused
  // too: a free unit cost is far more likely to be an unfilled field than a
  // genuine gift, and pricing from it would sell at pure margin on nothing.
  if (!Number.isInteger(unitCostMinor) || unitCostMinor <= 0) return null;
  if (!Number.isInteger(inboundShippingMinor) || inboundShippingMinor < 0) return null;

  const policy = policyFor(supply, settings, rounding);
  if (!Number.isFinite(policy.marginPercent) || policy.marginPercent < 0) return null;

  const landedCostMinor = unitCostMinor + inboundShippingMinor;
  // Rounded, not truncated: truncation loses a cent per item in our favour on
  // some prices and against us on others, and neither is a policy anybody chose.
  const rawSellMinor = Math.round(landedCostMinor * (1 + policy.marginPercent / 100));
  const sellMinor = applyRounding(rawSellMinor, policy.rounding, costCurrency);

  return {
    unitCostMinor,
    inboundShippingMinor,
    landedCostMinor,
    marginPercent: policy.marginPercent,
    marginMinor: sellMinor - landedCostMinor,
    rawSellMinor,
    sellMinor,
    rounding: policy.rounding,
    currency: costCurrency,
  };
}

/**
 * The realised margin, which is not the margin that was asked for.
 *
 * Rounding moves the final figure, so a 10% policy on a $27.30 landed cost
 * sells at $30.99 — 13.5%. The admin panel shows both, because a shop owner
 * setting margins needs to see what they actually get, not what they typed.
 */
export function realisedMarginPercent(b: PriceBreakdown): number {
  if (b.landedCostMinor <= 0) return 0;
  return ((b.sellMinor - b.landedCostMinor) / b.landedCostMinor) * 100;
}

/* ── Formatting ───────────────────────────────────────────────────────────── */

/**
 * A price, as a customer reads it.
 *
 * Latin digits deliberately, even in Arabic text: prices are compared against
 * other shops, copied into messages and read aloud, and Arabic-Indic digits in
 * a figure people intend to compare are a small, constant tax on doing so. The
 * platform's own style gate already forbids them in authored prose.
 */
export function formatPrice(minor: Minor, currency: CurrencyCode): string {
  const meta = CURRENCIES[currency];
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const major = Math.floor(abs / meta.minorPerMajor);
  const rest = abs % meta.minorPerMajor;
  const digits = String(meta.minorPerMajor - 1).length;
  const grouped = major.toLocaleString('en-US');
  const body = rest === 0
    ? grouped
    : `${grouped}.${String(rest).padStart(digits, '0')}`;
  return `${negative ? '−' : ''}${body} ${meta.labelAr}`;
}

/* ── Totals ───────────────────────────────────────────────────────────────── */

export interface CartLine {
  productId: string;
  quantity: number;
  unitPriceMinor: Minor;
}

export interface CartTotals {
  itemsTotalMinor: Minor;
  shippingMinor: Minor;
  totalMinor: Minor;
  itemCount: number;
}

/**
 * Order totals, summed in integers.
 *
 * Shipping is passed in rather than computed here: what it costs to deliver
 * depends on where to, and this module has no business knowing a customer's
 * address. The caller that does know supplies the figure.
 */
export function cartTotals(lines: readonly CartLine[], shippingMinor: Minor): CartTotals {
  let itemsTotalMinor = 0;
  let itemCount = 0;
  for (const l of lines) {
    if (!Number.isInteger(l.quantity) || l.quantity <= 0) continue;
    if (!Number.isInteger(l.unitPriceMinor) || l.unitPriceMinor < 0) continue;
    itemsTotalMinor += l.unitPriceMinor * l.quantity;
    itemCount += l.quantity;
  }
  const shipping = Number.isInteger(shippingMinor) && shippingMinor >= 0 ? shippingMinor : 0;
  return {
    itemsTotalMinor,
    shippingMinor: shipping,
    totalMinor: itemsTotalMinor + shipping,
    itemCount,
  };
}
