/**
 * Database row → domain shape, and nothing else.
 *
 * WHY THIS IS A SEPARATE FILE WITH NO SDK IMPORT
 * ==============================================
 * Mapping is where the bugs live. A column renamed, a `null` where a `0` was
 * assumed, a timestamp that arrives as a string in one driver and a Date in
 * another — none of that is caught by a type annotation, because the row comes
 * back as `any` from a query builder that cannot know the schema.
 *
 * Keeping the mappers here, importing nothing, means `scripts/testBackendAdapter.ts`
 * can feed them hostile rows directly and assert what comes out. If they lived
 * inside `client.ts` beside `createBrowserClient`, testing them would require
 * the SDK, a URL and a network — and so they would not be tested, which is how
 * mapping bugs reach production in the first place.
 *
 * EVERY FIELD IS DEFENDED
 * =======================
 * The same posture `lib/server/community.ts` already takes: a row written
 * before a column existed must render, not produce `NaN` or `undefined` in the
 * markup. So every read is `typeof x === … ? x : fallback`, and every count
 * falls back to `0` rather than to nothing.
 */

import {
  POST_CATEGORIES,
  type CommentSummary,
  type ContentStatus,
  type FulfilmentState,
  type MediaKind,
  type OrderSummary,
  type PaymentState,
  type PlatformRole,
  type PostCategory,
  type PostSummary,
  type StoreProductSummary,
  type StoreVariantSummary,
  type SupplyRecord,
} from '../ports';

/** Anything the driver hands back. Deliberately not pretending to know. */
export type Row = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);
const num = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  // `bigint` and `numeric` come back as strings from PostgREST when they exceed
  // what a JS number can hold — and `numeric` does so ALWAYS, regardless of
  // size, because the driver refuses to lose precision on our behalf. A margin
  // of `45.0` arriving as `"45.0"` and being dropped to `null` would silently
  // unprice the catalogue.
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
};
const int = (v: unknown): number | null => {
  const n = num(v);
  return n === null ? null : Math.trunc(n);
};
const count = (v: unknown): number => int(v) ?? 0;

/**
 * A timestamp column → ISO string, or null.
 *
 * PostgREST returns `timestamptz` as an ISO-ish string already, so this is
 * mostly a validation step — but `Date.parse` is what proves it, and a column
 * that is missing entirely (an old row, a partial select) must become `null`
 * rather than `"Invalid Date"` in the markup.
 */
export function toIso(v: unknown): string | null {
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isFinite(t) ? new Date(t).toISOString() : null;
  }
  if (v instanceof Date) {
    const t = v.getTime();
    return Number.isFinite(t) ? v.toISOString() : null;
  }
  return null;
}

const CATEGORY_SET: ReadonlySet<string> = new Set(POST_CATEGORIES);

/**
 * An unknown category becomes `null`, not itself.
 *
 * A category id that is not one of the nine cannot be rendered — there is no
 * Arabic label for it and no chip to filter by it. Passing it through would put
 * a raw slug on the screen; dropping it shows the post uncategorised, which is
 * what an unrecognised category actually means.
 */
export function toCategory(v: unknown): PostCategory | null {
  return typeof v === 'string' && CATEGORY_SET.has(v) ? (v as PostCategory) : null;
}

const toStatus = (v: unknown): ContentStatus =>
  v === 'hidden' || v === 'deleted' ? v : 'active';

const toMediaKind = (v: unknown): MediaKind =>
  v === 'image' || v === 'video' ? v : 'none';

export function toRole(v: unknown): PlatformRole {
  return v === 'moderator' || v === 'admin' || v === 'owner' ? v : 'user';
}

export function toPostSummary(r: Row): PostSummary {
  return {
    id: str(r.id) ?? '',
    authorId: str(r.author_id) ?? '',
    // The same fallback the phone app and the web already use. An author whose
    // display name was never set is «طيّار», not an empty byline.
    authorName: str(r.author_name) ?? 'طيّار',
    authorPhoto: str(r.author_photo),
    text: typeof r.text === 'string' ? r.text : '',
    category: toCategory(r.category),
    mediaType: toMediaKind(r.media_type),
    mediaURL: str(r.media_url),
    thumbnailURL: str(r.thumbnail_url),
    mediaWidth: int(r.media_width),
    mediaHeight: int(r.media_height),
    // Video only, and `null` means «not a video, or never recorded» — never
    // «zero seconds».
    mediaDuration: num(r.media_duration),
    commentsCount: count(r.comments_count),
    likesCount: count(r.likes_count),
    createdAt: toIso(r.created_at),
    editedAt: toIso(r.edited_at),
    status: toStatus(r.status),
  };
}

export function toCommentSummary(r: Row): CommentSummary {
  return {
    id: str(r.id) ?? '',
    authorId: str(r.author_id) ?? '',
    authorName: str(r.author_name) ?? 'طيّار',
    authorPhoto: str(r.author_photo),
    text: typeof r.text === 'string' ? r.text : '',
    createdAt: toIso(r.created_at),
    likesCount: count(r.likes_count),
    status: toStatus(r.status),
  };
}

export function toProductSummary(r: Row): StoreProductSummary {
  return {
    id: str(r.id) ?? '',
    nameAr: str(r.name_ar) ?? '',
    nameEn: str(r.name_en),
    brand: str(r.brand),
    categoryId: str(r.category_id) ?? '',
    published: r.published === true,
    suspendedReasonAr: str(r.suspended_reason_ar),
  };
}

export function toVariantSummary(r: Row): StoreVariantSummary {
  return {
    id: str(r.id) ?? '',
    productId: str(r.product_id) ?? '',
    labelAr: str(r.label_ar) ?? '',
    // `null`, not `0`. A variant with no price is one nobody has costed yet,
    // and «مجاناً» is a very different claim from «السعر غير محدد».
    priceMinor: int(r.price_minor),
    currency: str(r.currency) ?? 'EUR',
    isDefault: r.is_default === true,
  };
}

const PAYMENT_STATES: readonly PaymentState[] = [
  'draft', 'awaiting_payment', 'paid', 'cancelled', 'expired', 'refunded', 'failed',
];
const FULFILMENT_STATES: readonly FulfilmentState[] = [
  'received', 'confirmed', 'ordered-from-supplier', 'shipped', 'delivered', 'cancelled',
];

/**
 * An unrecognised payment state becomes `draft`, and an unrecognised fulfilment
 * state becomes `received`.
 *
 * Both fall back to the state that claims the LEAST. Defaulting a strange value
 * to `paid` or to `delivered` would have the shop believe money arrived or a
 * parcel left on the strength of a string it could not parse.
 */
export function toPaymentState(v: unknown): PaymentState {
  return PAYMENT_STATES.includes(v as PaymentState) ? (v as PaymentState) : 'draft';
}

export function toFulfilmentState(v: unknown): FulfilmentState {
  return FULFILMENT_STATES.includes(v as FulfilmentState) ? (v as FulfilmentState) : 'received';
}

/**
 * Strict parse — `null` for anything that is not one of the seven.
 *
 * Used where a state arrives from OUTSIDE the database: a Mollie webhook body,
 * an admin form. There the tolerant fallback above is wrong, because «I did not
 * recognise this» must stop the write rather than quietly record `draft`.
 */
export function parsePaymentState(v: unknown): PaymentState | null {
  return PAYMENT_STATES.includes(v as PaymentState) ? (v as PaymentState) : null;
}

export function parseFulfilmentState(v: unknown): FulfilmentState | null {
  return FULFILMENT_STATES.includes(v as FulfilmentState) ? (v as FulfilmentState) : null;
}

export function toOrderSummary(r: Row): OrderSummary {
  return {
    id: str(r.id) ?? '',
    reference: str(r.reference) ?? '',
    userId: str(r.user_id),
    subtotalMinor: count(r.subtotal_minor),
    shippingMinor: count(r.shipping_minor),
    totalMinor: count(r.total_minor),
    currency: str(r.currency) ?? 'EUR',
    paymentState: toPaymentState(r.payment_state),
    fulfilmentState: toFulfilmentState(r.fulfilment),
    createdAt: toIso(r.created_at),
  };
}

export function toSupplyRecord(r: Row): SupplyRecord {
  return {
    productId: str(r.product_id) ?? '',
    variantId: str(r.variant_id),
    supplierName: str(r.supplier_name),
    supplierUrl: str(r.supplier_url),
    costMinor: int(r.cost_minor),
    currency: str(r.currency) ?? 'EUR',
    marginPct: num(r.margin_pct),
    moq: int(r.moq),
    leadTimeDays: int(r.lead_time_days),
    updatedAt: toIso(r.updated_at),
  };
}

/* ── Pagination ───────────────────────────────────────────────────────────── */

/**
 * The composite keyset predicate, as a PostgREST `or` filter.
 *
 * `(created_at, id)` STRICTLY AFTER the cursor, in the query's direction. Both
 * halves are required and this is not a nicety: two rows written in the same
 * millisecond tie on `created_at` alone, and an ambiguous sort is exactly what
 * makes a cursor skip a row or serve it twice. The database indexes
 * `(created_at desc, id desc)` for posts and `(post_id, created_at asc, id asc)`
 * for comments, so the predicate below is an index seek rather than a scan.
 *
 * Written as a string because PostgREST expresses disjunction that way; the
 * only interpolated values are an ISO timestamp this module produced and an id
 * the caller is required to have escaped. `encodeKeysetCursor`/`decodeCursor`
 * are the pair that guarantees the id came from us.
 */
export function keysetFilter(
  createdAtIso: string,
  id: string,
  direction: 'asc' | 'desc',
): string {
  const cmp = direction === 'desc' ? 'lt' : 'gt';
  const q = (v: string) => `"${v.replace(/["\\]/g, '\\$&')}"`;
  return [
    `created_at.${cmp}.${q(createdAtIso)}`,
    `and(created_at.eq.${q(createdAtIso)},id.${cmp}.${q(id)})`,
  ].join(',');
}

/** The clamp every list applies. Out-of-range and missing both become the default. */
export function clampLimit(raw: number | undefined, fallback: number, max: number): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return fallback;
  return Math.min(Math.max(Math.trunc(raw), 1), max);
}
