import 'server-only';
import { resolvedProducts } from './storeCatalogue';
import { readAllSupply } from './storeSupply';
import { INITIAL_PRIVATE_SETTINGS } from '@core/data/store/settings';
import { auditFor } from '@core/data/store/audit';
import {
  publicationBlockers, publicationStage,
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
}

export async function catalogueQueue(nowIso = new Date().toISOString()): Promise<QueueRow[]> {
  const [products, supply] = await Promise.all([resolvedProducts(), readAllSupply()]);
  const reviewDays = INITIAL_PRIVATE_SETTINGS.priceReviewDays;

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
  | 'needs-decision';

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
    case 'stale-price':
      return rows.filter(r => r.hasSupply
        && r.supplyAgeDays !== null
        && r.supplyAgeDays > INITIAL_PRIVATE_SETTINGS.priceReviewDays);
    case 'unpublished': return rows.filter(r => !r.product.published && !r.product.suspendedReasonAr);
    case 'ready': return rows.filter(r => r.stage === 'ready');
    case 'published': return rows.filter(r => r.stage === 'published');
    case 'suspended': return rows.filter(r => r.stage === 'suspended');
    // The ones no amount of data entry will fix: a slot with no product in it,
    // a bundle nobody sells as a box, something to replace or withdraw.
    case 'needs-decision':
      return rows.filter(r => r.audit
        && (r.audit.decision === 'replace' || r.audit.decision === 'unpublish'));
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
