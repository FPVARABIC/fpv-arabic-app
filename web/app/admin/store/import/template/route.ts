import { NextResponse } from 'next/server';
import { getSession, sessionCan } from '@/lib/server/session';
import { toCsv, type SupplyCsvRow } from '@core/data/store/supplyCsv';
import { resolvedProducts } from '@/lib/server/storeCatalogue';
import { readAllSupply } from '@/lib/server/storeSupply';

export const dynamic = 'force-dynamic';

/**
 * The template, pre-filled with everything already known.
 *
 * NOT AN EMPTY FORM
 * -----------------
 * Every variant is already a row, with its product name and its option name in
 * Arabic, and any cost already recorded is already in the cell. So the job is
 * «fill in the blanks», not «work out which of ninety ids this line is» — and
 * re-importing an unedited file is a no-op rather than a way to wipe what is
 * there.
 *
 * It is a route rather than a server action because a browser downloading a
 * file wants a response with a filename on it, and an action returning a string
 * would need a component to turn it into one.
 */
export async function GET() {
  const session = await getSession();
  // The costs are in it, so this needs the capability that guards costs.
  if (!session || !sessionCan(session, 'store.viewSupply')) {
    return new NextResponse('forbidden', { status: 403 });
  }

  const [products, supply] = await Promise.all([resolvedProducts(), readAllSupply()]);
  const rows: SupplyCsvRow[] = products.flatMap(p => p.variants.map(v => {
    const s = supply[v.id];
    return {
      variantId: v.id,
      productNameEn: p.nameEn,
      variantNameAr: p.variants.length > 1 ? v.nameAr : p.titleAr,
      supplierId: s?.supplierId ?? '',
      supplierUrl: s?.supplierUrl ?? '',
      unitCost: s ? (s.unitCostMinor / 100).toFixed(2) : '',
      inboundShipping: s ? (s.inboundShippingMinor / 100).toFixed(2) : '',
      currency: 'USD',
      availability: v.availability,
      verified: s?.verified ? 'true' : '',
      notesAr: s?.notesAr ?? '',
    };
  }));

  return new NextResponse(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="fpv-store-supply.csv"',
      // Never cached: it contains costs, and a stale copy is a copy that
      // overwrites newer numbers when re-imported.
      'Cache-Control': 'no-store, must-revalidate',
    },
  });
}
