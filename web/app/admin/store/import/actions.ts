'use server';

import { revalidatePath } from 'next/cache';
import { getSession, sessionCan } from '@/lib/server/session';
import { adminDb, isAdminConfigured } from '@/lib/server/firebaseAdmin';
import { actorFromSession, logAudit, markAuditResult, newRequestId } from '@/lib/server/audit';
import { STORE_PRODUCTS } from '@core/data/store/catalogue';
import { SUPPLIERS } from '@core/data/store/suppliers';
import { priceFrom } from '@core/data/store/pricing';
import { parseCsv, validateRows, type RowVerdict } from '@core/data/store/supplyCsv';
import { privateStoreSettings } from '@/lib/server/storeSettings';

/**
 * A spreadsheet of supplier costs, previewed and then applied.
 *
 * TWO CALLS, ONE PARSE
 * --------------------
 * `previewSupplyCsv` and `applySupplyCsv` both run `validateRows`, so what the
 * operator approved and what gets written come out of the same function. A
 * preview produced by different code from the write is a preview that lies, and
 * a preview that lies is worse than none — it manufactures confidence.
 *
 * The file is re-sent for the apply rather than held on the server between the
 * two calls. That is one more upload and no session state to expire, get
 * confused between two open tabs, or leak between operators.
 *
 * WHAT AN IMPORT CANNOT DO
 * ------------------------
 * Publish anything. Not one row, not by any column — the file has no
 * `published` field and this action writes none. Fifty products going live
 * because somebody pasted a column is precisely the accident the whole
 * publication gate exists to prevent, and a bulk tool is where that accident
 * would happen.
 */

export type PreviewResult =
  | { ok: true; verdicts: RowVerdict[]; applyCount: number; skipCount: number; rejectCount: number }
  | { ok: false; errorAr: string };

export type ApplyResult =
  | { ok: true; applied: number; skipped: number; rejected: number }
  | { ok: false; errorAr: string };

const MAX_CSV_BYTES = 512 * 1024;

type Gate = { session: NonNullable<Awaited<ReturnType<typeof getSession>>> } | { errorAr: string };

async function gate(): Promise<Gate> {
  const session = await getSession();
  if (!session || !sessionCan(session, 'store.editProducts')
    || !sessionCan(session, 'store.viewSupply')) {
    // Both, because an import writes costs — which is the commercially
    // sensitive half — as well as prices.
    return { errorAr: 'لا تملك صلاحية استيراد بيانات التوريد.' };
  }
  if (!isAdminConfigured()) return { errorAr: 'الاتصال بقاعدة البيانات غير متاح.' };
  return { session };
}

type Judgement = { verdicts: RowVerdict[] } | { errorAr: string };

function judge(csv: string): Judgement {
  if (csv.length > MAX_CSV_BYTES) {
    return { errorAr: 'الملف أكبر من الحد. قسّمه إلى ملفات أصغر.' };
  }
  const parsed = parseCsv(csv);
  if (parsed.errorAr) return { errorAr: parsed.errorAr };

  const knownVariantIds = new Set(STORE_PRODUCTS.flatMap(p => p.variants.map(v => v.id)));
  const knownSupplierIds = new Set(SUPPLIERS.map(s => s.id));
  return { verdicts: validateRows(parsed.rows, { knownVariantIds, knownSupplierIds }) };
}

export async function previewSupplyCsv(csv: string): Promise<PreviewResult> {
  const g = await gate();
  if ('errorAr' in g) return { ok: false, errorAr: g.errorAr };
  const j = judge(csv);
  if ('errorAr' in j) return { ok: false, errorAr: j.errorAr };

  return {
    ok: true,
    verdicts: j.verdicts,
    applyCount: j.verdicts.filter(v => v.kind === 'apply').length,
    skipCount: j.verdicts.filter(v => v.kind === 'skip').length,
    rejectCount: j.verdicts.filter(v => v.kind === 'reject').length,
  };
}

export async function applySupplyCsv(csv: string): Promise<ApplyResult> {
  const g = await gate();
  if ('errorAr' in g) return { ok: false, errorAr: g.errorAr };
  const j = judge(csv);
  if ('errorAr' in j) return { ok: false, errorAr: j.errorAr };

  const toApply = j.verdicts.filter(v => v.kind === 'apply');
  if (toApply.length === 0) {
    return { ok: false, errorAr: 'لا صفّ صالح للتطبيق في هذا الملف.' };
  }

  const settings = await privateStoreSettings();
  const now = new Date().toISOString();

  // One audit entry naming how many rows moved. Fifty separate entries is a log
  // nobody reads, and the file's own verdicts are the detail.
  const entryId = await logAudit(actorFromSession(g.session), newRequestId(), {
    action: 'store.import',
    targetType: 'product',
    targetId: 'supply-csv',
    after: `${toApply.length} صفّاً مطبَّقاً، ${j.verdicts.length - toApply.length} متروكاً`,
  });

  try {
    // Batched: fifty round trips is fifty chances for the connection to drop
    // halfway and leave the catalogue half-updated.
    const batch = adminDb().batch();
    for (const row of toApply) {
      if (row.kind !== 'apply') continue;
      const productId = row.variantId.split(':')[0];
      const supply = {
        variantId: row.variantId,
        supplierId: row.supplierId,
        supplierUrl: row.supplierUrl,
        unitCostMinor: row.unitCostMinor,
        inboundShippingMinor: row.inboundShippingMinor,
        costCurrency: 'USD' as const,
        notesAr: row.notesAr,
        verified: row.verified,
        updatedAt: now,
      };
      batch.set(adminDb().collection('storeSupply').doc(row.variantId), supply);

      const breakdown = priceFrom(supply, settings);
      if (breakdown) {
        // The price lands on the variant, exactly as the single-product screen
        // writes it. `published` is deliberately absent from this write.
        batch.set(adminDb().collection('storeProducts').doc(productId), {
          variantState: {
            [row.variantId]: {
              priceMinor: breakdown.sellMinor,
              availability: row.availability,
            },
          },
          currency: 'USD',
          updatedAt: now,
        }, { merge: true });
      }
    }
    await batch.commit();
    await markAuditResult(entryId, 'ok');
  } catch {
    await markAuditResult(entryId, 'error', 'batch write failed');
    return { ok: false, errorAr: 'تعذّر تطبيق الاستيراد. لم يُكتب شيء.' };
  }

  revalidatePath('/admin/store/supply');
  revalidatePath('/admin/store/products');
  revalidatePath('/store', 'layout');
  return {
    ok: true,
    applied: toApply.length,
    skipped: j.verdicts.filter(v => v.kind === 'skip').length,
    rejected: j.verdicts.filter(v => v.kind === 'reject').length,
  };
}
