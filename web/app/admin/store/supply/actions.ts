'use server';

import { revalidatePath } from 'next/cache';
import { getSession, sessionCan } from '@/lib/server/session';
import { adminDb, isAdminConfigured } from '@/lib/server/firebaseAdmin';
import { actorFromSession, logAudit, markAuditResult, newRequestId } from '@/lib/server/audit';
import { supplier } from '@core/data/store/suppliers';
import { storeProduct } from '@core/data/store/catalogue';
import { priceFrom } from '@core/data/store/pricing';
import { privateStoreSettings } from '@/lib/server/storeSettings';

export interface SaveSupplyInput {
  /**
   * The VARIANT being costed.
   *
   * Supply is recorded per buyable thing, not per product — an RTF kit and the
   * bare aircraft come from the same supplier at different prices, and one cost
   * for both produces a margin that is wrong for at least one of them. The
   * product id is the variant id's prefix, so nothing is lost.
   */
  variantId: string;
  supplierId: string;
  supplierUrl: string;
  /** Major units as typed — «29.99». Converted here, and only here. */
  unitCostMajor: string;
  inboundShippingMajor: string;
  marginPercentOverride: string;
  notesAr: string;
  verified: boolean;
}

export type SaveSupplyResult = { ok: true } | { ok: false; errorAr: string };

/**
 * Records what we pay, and re-prices the product from it.
 *
 * TWO WRITES, IN THIS ORDER, ON PURPOSE
 * -------------------------------------
 * The supply record first, then the public price computed from it. If the
 * second fails, the shop is left with a product that has no price — visible,
 * described, unorderable — which is the state it was already in. The reverse
 * order could leave a public price with no record of where it came from, and a
 * price nobody can explain is worse than no price.
 *
 * The money conversion happens here rather than in the browser: a form is not
 * a trusted source even when the person filling it in is trusted.
 */
export async function saveSupply(input: SaveSupplyInput): Promise<SaveSupplyResult> {
  const session = await getSession();
  if (!session || !sessionCan(session, 'store.editProducts')) {
    return { ok: false, errorAr: 'لا تملك صلاحية تعديل التسعير.' };
  }
  if (!isAdminConfigured()) return { ok: false, errorAr: 'الاتصال بقاعدة البيانات غير متاح.' };

  const productId = input.variantId.split(':')[0];
  const product = storeProduct(productId);
  const variant = product?.variants.find(v => v.id === input.variantId);
  if (!product || !variant) return { ok: false, errorAr: 'لا يوجد خيار شراء بهذا المعرّف.' };
  if (!supplier(input.supplierId)) return { ok: false, errorAr: 'اختر مورداً من القائمة.' };

  const unitCostMinor = toMinor(input.unitCostMajor);
  const inboundShippingMinor = toMinor(input.inboundShippingMajor);
  if (unitCostMinor === null || unitCostMinor <= 0) {
    return { ok: false, errorAr: 'أدخل تكلفة وحدة صحيحة أكبر من صفر.' };
  }
  if (inboundShippingMinor === null || inboundShippingMinor < 0) {
    return { ok: false, errorAr: 'أدخل تكلفة شحن صحيحة.' };
  }

  const overrideRaw = input.marginPercentOverride.trim();
  let marginPercentOverride: number | undefined;
  if (overrideRaw) {
    const n = Number(overrideRaw);
    if (!Number.isFinite(n) || n < 0 || n > 500) {
      return { ok: false, errorAr: 'الهامش الخاص يجب أن يكون بين 0 و500.' };
    }
    marginPercentOverride = n;
  }

  const supply = {
    variantId: input.variantId,
    supplierId: input.supplierId,
    supplierUrl: input.supplierUrl.trim().slice(0, 500),
    unitCostMinor,
    inboundShippingMinor,
    costCurrency: 'USD' as const,
    ...(marginPercentOverride !== undefined ? { marginPercentOverride } : {}),
    notesAr: input.notesAr.trim().slice(0, 500),
    verified: input.verified,
    updatedAt: new Date().toISOString(),
  };

  const breakdown = priceFrom(supply, await privateStoreSettings());
  if (!breakdown) return { ok: false, errorAr: 'تعذّر حساب السعر من هذه القيم.' };

  const entryId = await logAudit(actorFromSession(session), newRequestId(), {
    action: 'store.supply.set',
    targetType: 'product',
    targetId: input.variantId,
    // The resulting PRICE is recorded, not the cost: the audit log is readable
    // by anyone with `audit.view`, which is a wider set than `store.viewSupply`.
    after: String(breakdown.sellMinor),
  });

  try {
    await adminDb().collection('storeSupply').doc(input.variantId).set(supply);
    // The price lands on the VARIANT, because that is what a basket line names
    // and what the publication gate reads. Writing a product-level price left
    // every variant unpriced and every product unpublishable — with the panel
    // cheerfully reporting a price nothing could use.
    await adminDb().collection('storeProducts').doc(productId).set({
      variantState: {
        [input.variantId]: {
          priceMinor: breakdown.sellMinor,
          availability: variant.availability,
        },
      },
      currency: breakdown.currency,
      published: product.published,
      updatedAt: supply.updatedAt,
    }, { merge: true });
    await markAuditResult(entryId, 'ok');
  } catch {
    await markAuditResult(entryId, 'error', 'write failed');
    return { ok: false, errorAr: 'تعذّر الحفظ. حاول مرة أخرى.' };
  }

  revalidatePath('/admin/store/supply');
  return { ok: true };
}

/**
 * «29.99» → 2999, refusing anything that is not a plain amount.
 *
 * Refuses rather than rounds a third decimal place: a price typed as 29.999 is
 * a typo, and silently making it 30.00 is a decision nobody asked for.
 */
function toMinor(major: string): number | null {
  const t = major.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}
