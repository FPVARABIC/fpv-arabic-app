import { formatPrice } from '@core/data/store/pricing';
import { supplier } from '@core/data/store/suppliers';
import type { StoreSupply } from '@core/data/store/types';
import { breakdownFor } from '@/lib/server/storeSupply';
import { SupplyEditor } from './SupplyEditor';

/**
 * One product's supply record, and the price it produces.
 *
 * A server component: it reads the cost, which no browser may see. Only the
 * editor beneath it is a client island, and it receives the current values as
 * props rather than fetching them — so the cost reaches the browser only for
 * the person who already has permission to see it.
 */
export const SupplyRow: React.FC<{
  productId: string;
  nameEn: string;
  titleAr: string;
  categoryAr: string;
  supply: StoreSupply | null;
  defaultMarginPercent: number;
  canEdit: boolean;
}> = ({ productId, nameEn, titleAr, categoryAr, supply, defaultMarginPercent, canEdit }) => {
  const breakdown = supply ? breakdownFor(supply, defaultMarginPercent) : null;
  const src = supply ? supplier(supply.supplierId) : undefined;

  return (
    <li className="card-sm" data-testid={`supply-${productId}`} style={{ padding: '14px 16px', minWidth: 0 }}>
      <div style={{ display: 'flex', gap: 9, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <span className="ltr" style={{ fontSize: 13.5, fontWeight: 900 }}>{nameEn}</span>
        <span className="admin-badge">{categoryAr}</span>
        {!supply && (
          <span className="admin-badge admin-badge-warn" data-testid={`supply-missing-${productId}`}>
            بلا سجلّ توريد
          </span>
        )}
        {supply && !supply.verified && (
          <span className="admin-badge admin-badge-warn">التكلفة غير مؤكَّدة</span>
        )}
      </div>
      <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-dimmer)' }}>{titleAr}</p>

      {breakdown ? (
        <dl className="admin-kv" data-testid={`supply-breakdown-${productId}`} style={{ marginTop: 11 }}>
          <div><dt>المورد</dt><dd>{src?.nameAr ?? supply?.supplierId}</dd></div>
          <div>
            <dt>التكلفة الواصلة</dt>
            <dd className="ltr">
              {formatPrice(breakdown.unitCostMinor, breakdown.currency)}
              {' + '}{formatPrice(breakdown.inboundShippingMinor, breakdown.currency)}
              {' = '}{formatPrice(breakdown.landedCostMinor, breakdown.currency)}
            </dd>
          </div>
          <div>
            <dt>الهامش</dt>
            {/* Both numbers, because rounding moves the second one and a shop
                owner needs what they GET, not what they typed. */}
            <dd className="ltr">
              {breakdown.marginPercent}% مطلوب · {breakdown.realisedPercent.toFixed(1)}% فعلي
            </dd>
          </div>
          <div>
            <dt style={{ fontWeight: 900 }}>سعر البيع</dt>
            <dd className="ltr" style={{ fontWeight: 900 }}>
              {formatPrice(breakdown.sellMinor, breakdown.currency)}
            </dd>
          </div>
          <div>
            <dt>آخر تحديث</dt>
            <dd className="ltr">{supply?.updatedAt?.slice(0, 10) ?? '—'}</dd>
          </div>
        </dl>
      ) : (
        <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--text-dimmer)', lineHeight: 1.9 }}>
          لا سعر لهذا المنتج في المتجر حتى تُدخل تكلفته.
        </p>
      )}

      {canEdit && <SupplyEditor productId={productId} supply={supply} />}
    </li>
  );
};
