import Link from 'next/link';
import {
  CHOICE_POSITION_LABEL_AR, PACKAGE_LABEL_AR, BUYER_LEVEL_LABEL_AR,
  LINK_PROTOCOL_LABEL_AR, VIDEO_SYSTEM_LABEL_AR, AVAILABILITY_LABEL_AR,
} from '@core/data/store/types';
import type { ChoiceAxis, StoreProduct } from '@core/data/store/types';
import { formatPrice } from '@core/data/store/pricing';
import { productHref } from '@/lib/store';

/**
 * The section's options, side by side.
 *
 * WHY EVERY CELL IS COMPUTED AND NO BADGE IS TYPED
 * -------------------------------------------------
 * The brief asked for badges — «الأكثر توازناً», «مناسب للمبتدئ» — and then
 * asked for the thing that makes them worth anything: «لا تضع الشارة يدوياً من
 * دون معيار». A hand-placed badge is an opinion wearing a fact's clothes, and
 * the one that says «best value» is always on whatever has the best margin.
 *
 * So: «الأرخص» is whichever row has the lowest price, and it appears only when
 * the prices are actually known. The level, the package, the protocol and the
 * video system are read off the product. Nothing here can be flattered.
 *
 * WHY IT IS NOT AN ANALYSIS
 * -------------------------
 * Six rows, all of them facts a buyer can act on. No scores, no stars, no
 * «recommended for». The encyclopedia is one click away and this is a shop —
 * the job here is to make a difference visible, not to teach what it means.
 *
 * WHY A TABLE AND NOT A GRID OF CARDS
 * -----------------------------------
 * Because comparison is what a table is for: the eye runs along a row and finds
 * the one figure that differs. Cards make you hold three values in your head.
 * It scrolls inside its own container so a wide row never scrolls the page,
 * which in a right-to-left document is how these usually break.
 */
export const CompareTable: React.FC<{
  products: StoreProduct[];
  axis: ChoiceAxis;
}> = ({ products, axis }) => {
  // Two is the fewest that can be compared; one row is not a comparison.
  if (products.length < 2) return null;

  const defaultVariant = (p: StoreProduct) =>
    p.variants.find(v => v.isDefault) ?? p.variants[0];

  const priced = products
    .map(p => defaultVariant(p)?.priceMinor)
    .filter((n): n is number => typeof n === 'number' && n > 0);
  // «الأرخص» only means something when every price is known. Marking the
  // cheapest of two out of four is marking the cheapest of the ones we have
  // got round to pricing, which is not what a reader will understand it to say.
  const cheapest = priced.length === products.length && priced.length > 0
    ? Math.min(...priced)
    : null;

  const ROWS: { labelAr: string; cell: (p: StoreProduct) => React.ReactNode }[] = [
    {
      labelAr: 'الموضع',
      cell: p => CHOICE_POSITION_LABEL_AR[axis][p.choicePosition],
    },
    {
      labelAr: 'السعر',
      cell: p => {
        const v = defaultVariant(p);
        if (!v || v.priceMinor === null) {
          return <span style={{ color: 'var(--text-dimmer)' }}>قيد التحديث</span>;
        }
        return (
          <>
            <span className="ltr">{formatPrice(v.priceMinor, p.currency)}</span>
            {cheapest !== null && v.priceMinor === cheapest && (
              <span className="admin-badge" data-testid={`compare-cheapest-${p.id}`}
                style={{ marginInlineStart: 6, fontSize: 10, color: 'var(--accent-ink)' }}>
                الأرخص
              </span>
            )}
          </>
        );
      },
    },
    {
      labelAr: 'كيف يُباع',
      cell: p => {
        const kinds = [...new Set(p.variants.map(v => PACKAGE_LABEL_AR[v.packageKind]))];
        return kinds.join(' · ');
      },
    },
    {
      labelAr: 'يبِنّ مع',
      cell: p => {
        const links = [...new Set(p.variants.map(v => v.linkProtocol))].filter(l => l !== 'none');
        return links.length === 0
          ? <span style={{ color: 'var(--text-dimmer)' }}>—</span>
          : links.map(l => LINK_PROTOCOL_LABEL_AR[l]).join(' · ');
      },
    },
    {
      labelAr: 'يظهر في',
      cell: p => {
        const vids = [...new Set(p.variants.map(v => v.videoSystem))].filter(v => v !== 'none');
        return vids.length === 0
          ? <span style={{ color: 'var(--text-dimmer)' }}>—</span>
          : vids.map(v => VIDEO_SYSTEM_LABEL_AR[v]).join(' · ');
      },
    },
    { labelAr: 'لمن', cell: p => BUYER_LEVEL_LABEL_AR[p.level] },
    { labelAr: 'التوفّر', cell: p => AVAILABILITY_LABEL_AR[p.availability] },
  ];

  return (
    <section className="admin-section" aria-labelledby="compare-h">
      <h2 id="compare-h">قارن بينها</h2>
      {/* Its own scroll container: a wide comparison must never make the page
          itself scroll sideways, which in RTL is where this always breaks. */}
      <div style={{ overflowX: 'auto' }}>
        <table data-testid="compare-table"
          style={{ borderCollapse: 'collapse', width: '100%', minWidth: 460, fontSize: 12.5 }}>
          <caption className="sr-only">
            مقارنة بين خيارات هذا القسم بالسعر وطريقة البيع والبروتوكول ونظام الفيديو
          </caption>
          <thead>
            <tr>
              <th scope="col" style={th}>{''}</th>
              {products.map(p => (
                <th key={p.id} scope="col" style={{ ...th, minWidth: 118 }}>
                  <Link href={productHref(p.id)} className="ltr"
                    data-testid={`compare-head-${p.id}`}
                    style={{ fontWeight: 900, fontSize: 12.5 }}>
                    {p.nameEn}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(row => (
              <tr key={row.labelAr}>
                <th scope="row" style={{ ...td, fontWeight: 800, color: 'var(--text-dimmer)', whiteSpace: 'nowrap' }}>
                  {row.labelAr}
                </th>
                {products.map(p => (
                  <td key={p.id} style={td}>{row.cell(p)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const th: React.CSSProperties = {
  textAlign: 'start', padding: '8px 10px',
  borderBottom: '1px solid var(--border)', verticalAlign: 'bottom',
};
const td: React.CSSProperties = {
  textAlign: 'start', padding: '8px 10px',
  borderBottom: '1px solid var(--border-soft)', lineHeight: 1.8,
};
