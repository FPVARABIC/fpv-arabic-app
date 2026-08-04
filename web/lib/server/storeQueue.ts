import 'server-only';
import { resolvedProducts } from './storeCatalogue';
import { readAllSupply } from './storeSupply';
import { privateStoreSettings } from './storeSettings';
import { auditFor } from '@core/data/store/audit';
import {
  publicationBlockers, publicationStage, isPriceStale,
  type PublicationBlocker, type PublicationStage,
} from '@core/data/store/publication';
import { isImagePublishable, isSpecVerified } from '@core/data/store/types';
import type { StoreProduct } from '@core/data/store/types';
import type { AuditRow } from '@core/data/store/audit';

/**
 * The catalogue as a work queue.
 *
 * WHY THE PANEL NEEDED THIS AND NOT A LONGER LIST
 * ------------------------------------------------
 * Sixty-nine products, none of them publishable, is a wall. The same sixty-nine
 * grouped by what each one is WAITING FOR is an afternoon's work with an
 * obvious order to it: the eleven that need only a licensed image are one
 * errand, and the two that are not really products at all need a decision
 * rather than an errand.
 *
 * Everything here is computed. There is no stored «status» to fall out of step
 * with the product, and no way for the queue to claim something is ready when
 * the gate would refuse it — the queue and the publish button call the same
 * function.
 *
 * ONE READ FOR THE WHOLE SCREEN
 * -----------------------------
 * The products and the supply records are each read once and joined in memory.
 * The obvious implementation asks for a supply record per product, which is
 * sixty-nine round trips to render one page.
 */

/**
 * What is outstanding, split by WHO can act on it.
 *
 * The distinction the shop's owner asked for, and it is the right one: a list
 * that mixes «this needs a supplier cost» with «this needs three more sourced
 * specifications» is a list where their own work is buried in ours. One column
 * is theirs — photographs, costs, the publish decision — and one is the
 * platform's, and each is finishable on its own.
 *
 * A single percentage was considered and rejected. «80% complete» reads as
 * nearly done and hides whether the missing 20% is a caption or the price, and
 * a shop owner who trusts it publishes something unsellable. The counts are
 * separate and the blockers are never folded into them.
 */
export interface OwnerWork {
  needsImage: boolean;
  needsSupplier: boolean;
  needsUnitCost: boolean;
  needsShipping: boolean;
  needsPriceReview: boolean;
  needsPublishDecision: boolean;
}

export const OWNER_WORK_LABEL_AR: Record<keyof OwnerWork, string> = {
  needsImage: 'يحتاج صورة',
  needsSupplier: 'يحتاج مورداً ورابطه',
  needsUnitCost: 'يحتاج تكلفة المورد',
  needsShipping: 'يحتاج تكلفة الشحن',
  needsPriceReview: 'يحتاج مراجعة السعر',
  needsPublishDecision: 'يحتاج قرار النشر',
};

/** What the platform is responsible for, and whether it is done. */
export interface PlatformWork {
  specsDocumented: boolean;
  descriptionComplete: boolean;
  variantsComplete: boolean;
  categorised: boolean;
  alternativesLinked: boolean;
  servicesDecided: boolean;
}

export const PLATFORM_WORK_LABEL_AR: Record<keyof PlatformWork, string> = {
  specsDocumented: 'المواصفات موثّقة بمصادرها',
  descriptionComplete: 'الوصف العربي مكتمل',
  variantsComplete: 'خيارات الشراء مكتملة',
  categorised: 'التصنيف مكتمل',
  alternativesLinked: 'البدائل والمكمّلات مربوطة',
  servicesDecided: 'أهلية الخدمة المجانية محدَّدة',
};

export interface QueueRow {
  product: StoreProduct;
  stage: PublicationStage;
  blockers: PublicationBlocker[];
  audit?: AuditRow;
  /** Counted here so the row can show progress rather than only failure. */
  licensedImages: number;
  sourcedSpecs: number;
  hasSupply: boolean;
  /** Days since the cost was last checked, or null when there is no record. */
  supplyAgeDays: number | null;
  owner: OwnerWork;
  platform: PlatformWork;
  /**
   * Whether the cost is older than the SHOP'S OWN review window.
   *
   * Computed on the row rather than in the filter, because the window is an
   * admin setting read from the database — a filter that compared against the
   * seed constant would keep answering «30 days» after somebody changed it to
   * seven, which is the exact class of bug this store has had before.
   */
  priceStale: boolean;
}

export async function catalogueQueue(nowIso = new Date().toISOString()): Promise<QueueRow[]> {
  const [products, supply, settings] = await Promise.all([
    resolvedProducts(), readAllSupply(), privateStoreSettings(),
  ]);
  const reviewDays = settings.priceReviewDays;

  return products.map(product => {
    const record = supply[product.id] ?? null;
    const input = { product, supply: record, priceReviewDays: reviewDays, now: nowIso };
    return {
      product,
      stage: publicationStage(input),
      blockers: publicationBlockers(input),
      audit: auditFor(product.id),
      licensedImages: product.images.filter(isImagePublishable).length,
      sourcedSpecs: product.specs.filter(isSpecVerified).length,
      hasSupply: !!record,
      supplyAgeDays: record ? ageInDays(record.updatedAt, nowIso) : null,
      priceStale: !!record && isPriceStale(record, nowIso, reviewDays),
      owner: {
        needsImage: product.images.filter(isImagePublishable).length === 0,
        needsSupplier: !record || !record.supplierUrl,
        needsUnitCost: !record || !record.unitCostMinor,
        // Zero is a REAL answer here — plenty of suppliers ship free — so this
        // asks whether the field was filled in at all, not whether it is
        // non-zero. `undefined` means nobody has said; `0` means somebody did.
        needsShipping: !record || record.inboundShippingMinor === undefined,
        needsPriceReview: !record || !record.verified
          || isPriceStale(record, nowIso, reviewDays),
        // Only counts once it COULD be published. «Needs a publish decision» on
        // something that cannot be published is not a decision, it is noise.
        needsPublishDecision: !product.published
          && !product.suspendedReasonAr
          && publicationStage({ product, supply: record, priceReviewDays: reviewDays, now: nowIso }) === 'ready',
      },
      platform: {
        specsDocumented: product.specs.filter(isSpecVerified).length >= 3,
        descriptionComplete: product.summaryAr.trim().length >= 40
          && product.notForAr.length > 0
          && product.suitsAr.length > 0
          && product.highlightsAr.length > 0,
        variantsComplete: product.variants.length > 0
          && product.variants.filter(v => v.isDefault).length === 1
          && product.variants.every(v => v.inTheBoxAr.length > 0),
        categorised: !!product.categoryId,
        alternativesLinked: product.categoryId === 'services'
          || product.alternativeProductIds.length > 0,
        servicesDecided: product.variants.length > 0,
      },
    };
  });
}

/**
 * The filters the panel offers, each one a question somebody actually asks.
 *
 * «Which products have no image» is a morning's work for one person. «Which
 * have a price nobody has checked this month» is a different person on a
 * different day. Naming them as filters rather than leaving somebody to scan a
 * list is the difference between a queue and a report.
 */
export type QueueFilter =
  | 'all'
  | 'no-images'
  | 'no-price'
  | 'no-specs'
  | 'stale-price'
  | 'no-supplier'
  | 'unpublished'
  | 'ready'
  | 'published'
  | 'suspended'
  | 'needs-decision'
  | 'waiting-on-me'
  | 'platform-incomplete';

export const QUEUE_FILTER_LABEL_AR: Record<QueueFilter, string> = {
  all: 'الكل',
  'no-images': 'بلا صورة مرخّصة',
  'no-specs': 'بلا مواصفات موثّقة',
  'no-supplier': 'بلا مورد',
  'no-price': 'بلا سعر',
  'stale-price': 'سعر قديم',
  unpublished: 'غير منشور',
  ready: 'جاهز للنشر',
  published: 'منشور',
  suspended: 'موقوف',
  'needs-decision': 'يحتاج قراراً منك',
  'waiting-on-me': 'ينتظر مني',
  'platform-incomplete': 'ينقصه عمل المنصّة',
};

export function isQueueFilter(v: string): v is QueueFilter {
  return v in QUEUE_FILTER_LABEL_AR;
}

export function applyQueueFilter(rows: QueueRow[], filter: QueueFilter): QueueRow[] {
  switch (filter) {
    case 'no-images': return rows.filter(r => r.licensedImages === 0);
    case 'no-specs': return rows.filter(r => r.sourcedSpecs < 3);
    case 'no-supplier': return rows.filter(r => !r.hasSupply);
    case 'no-price': return rows.filter(r => r.product.variants.every(v => v.priceMinor === null));
    // Has a record, and it is older than the window. A product with NO record
    // belongs to «بلا مورد» — putting it here too would make both counts wrong.
    case 'stale-price': return rows.filter(r => r.priceStale);
    case 'unpublished': return rows.filter(r => !r.product.published && !r.product.suspendedReasonAr);
    case 'ready': return rows.filter(r => r.stage === 'ready');
    case 'published': return rows.filter(r => r.stage === 'published');
    case 'suspended': return rows.filter(r => r.stage === 'suspended');
    // The ones no amount of data entry will fix: a slot with no product in it,
    // a bundle nobody sells as a box, something to replace or withdraw.
    case 'needs-decision':
      return rows.filter(r => r.audit
        && (r.audit.decision === 'replace' || r.audit.decision === 'unpublish'));
    case 'waiting-on-me':
      return rows.filter(r => Object.values(r.owner).some(Boolean));
    case 'platform-incomplete':
      return rows.filter(r => Object.values(r.platform).some(v => !v));
    case 'all':
    default: return rows;
  }
}

/** How many rows each filter would return. Rendered as the tab labels. */
export function queueCounts(rows: QueueRow[]): Record<QueueFilter, number> {
  const out = {} as Record<QueueFilter, number>;
  for (const f of Object.keys(QUEUE_FILTER_LABEL_AR) as QueueFilter[]) {
    out[f] = applyQueueFilter(rows, f).length;
  }
  return out;
}

function ageInDays(fromIso: string, toIso: string): number | null {
  const a = Date.parse(fromIso);
  const b = Date.parse(toIso);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.floor((b - a) / 86_400_000);
}
