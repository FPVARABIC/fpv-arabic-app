import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession, sessionCan } from '@/lib/server/session';
import { listOrders } from '@/lib/server/storeOrders';
import { ORDER_STATUS_LABEL_AR, type OrderStatus } from '@core/data/store/types';
import { formatPrice } from '@core/data/store/pricing';
import { AdminShell } from '@/components/admin/AdminShell';
import { OrderStatusControl } from '@/components/admin/OrderStatusControl';

export const metadata: Metadata = { title: 'الطلبات — الإدارة', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const STATUS_CLASS: Record<OrderStatus, string> = {
  received: 'admin-badge admin-badge-warn',
  confirmed: 'admin-badge admin-badge-role',
  'ordered-from-supplier': 'admin-badge admin-badge-role',
  shipped: 'admin-badge admin-badge-role',
  delivered: 'admin-badge admin-badge-ok',
  cancelled: 'admin-badge admin-badge-bad',
};

const FILTERS: { id: string; labelAr: string }[] = [
  { id: 'all', labelAr: 'الكل' },
  { id: 'received', labelAr: 'جديدة' },
  { id: 'confirmed', labelAr: 'مؤكَّدة' },
  { id: 'ordered-from-supplier', labelAr: 'عند المورد' },
  { id: 'shipped', labelAr: 'مشحونة' },
  { id: 'delivered', labelAr: 'مكتملة' },
  { id: 'cancelled', labelAr: 'ملغاة' },
];

/**
 * The order queue.
 *
 * Every order the shop has taken, with what was ordered, who ordered it, and
 * where it has got to. The status control offers only the transitions the
 * lifecycle declares — a delivered order has no next step, and the UI cannot
 * offer one because the data does not contain one.
 */
export default async function AdminOrders(
  { searchParams }: { searchParams: Promise<{ status?: string }> },
) {
  const session = await getSession();
  if (!session || !sessionCan(session, 'store.viewOrders')) redirect('/');

  const { status = 'all' } = await searchParams;
  const wanted = FILTERS.some(f => f.id === status && f.id !== 'all')
    ? status as OrderStatus
    : undefined;

  const orders = await listOrders({ status: wanted, limit: 100 });
  const canManage = sessionCan(session, 'store.manageOrders');

  return (
    <AdminShell role={session.role} actorName={session.displayName} current="/admin/store/orders" titleAr="الطلبات">
      <p style={{ fontSize: 12.5, color: 'var(--text-dimmer)', margin: '0 0 14px' }}>
        <span dir="ltr">{orders.length}</span> طلباً. الشحن يُتّفق عليه مع العميل
        بعد التأكيد، ولا يُخصم شيء تلقائياً.
      </p>

      <nav aria-label="تصفية حسب الحالة" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {FILTERS.map(f => (
          <Link key={f.id} href={`/admin/store/orders?status=${f.id}`}
            data-testid={`orders-filter-${f.id}`}
            className={status === f.id ? 'btn-primary' : 'btn-ghost'}
            style={{ fontSize: 12, padding: '5px 12px' }}>
            {f.labelAr}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className="card-sm" data-testid="orders-empty" style={{ padding: '15px 17px', fontSize: 13.5 }}>
          لا طلبات بهذه الحالة.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
          {orders.map(o => (
            <li key={o.id} className="card-sm" data-testid={`order-${o.id}`}
              style={{ padding: '15px 17px', minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 9, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span className={STATUS_CLASS[o.status]}>{ORDER_STATUS_LABEL_AR[o.status]}</span>
                <span className="ltr" style={{ fontSize: 11.5, color: 'var(--text-dimmer)' }}>{o.id}</span>
                <span style={{ fontSize: 11.5, color: 'var(--text-dimmer)' }} dir="ltr">
                  {o.createdAt.slice(0, 10)}
                </span>
              </div>

              <dl className="admin-kv" style={{ marginTop: 12 }}>
                <div><dt>العميل</dt><dd>{o.contact.fullNameAr}</dd></div>
                <div><dt>الهاتف</dt><dd className="ltr">{o.contact.phone}</dd></div>
                <div><dt>الوجهة</dt><dd>{o.contact.country} — {o.contact.cityAr}</dd></div>
                <div><dt>العنوان</dt><dd style={{ lineHeight: 1.9 }}>{o.contact.addressAr}</dd></div>
                {o.contact.notesAr && (
                  <div><dt>ملاحظات العميل</dt><dd style={{ lineHeight: 1.9 }}>{o.contact.notesAr}</dd></div>
                )}
              </dl>

              <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'grid', gap: 5 }}>
                {o.items.map(it => (
                  <li key={it.productId} style={{
                    display: 'flex', gap: 10, justifyContent: 'space-between',
                    fontSize: 12.5, flexWrap: 'wrap',
                  }}>
                    <span className="ltr" style={{ minWidth: 0 }}>
                      {it.nameEn} <span dir="ltr">× {it.quantity}</span>
                    </span>
                    <span style={{ whiteSpace: 'nowrap' }}>
                      {it.unitPriceMinor === 0
                        ? 'مجاناً'
                        : formatPrice(it.lineTotalMinor, o.currency)}
                    </span>
                  </li>
                ))}
              </ul>

              <p style={{ margin: '11px 0 0', fontSize: 13, fontWeight: 900 }}>
                الإجمالي قبل الشحن: <span className="ltr">{formatPrice(o.totalMinor, o.currency)}</span>
                {o.includesFreeSetup && (
                  <span style={{ fontSize: 11.5, fontWeight: 500, color: '#6ee7b7' }}>
                    {' '}· يشمل الإعداد المجاني
                  </span>
                )}
              </p>

              {canManage && <OrderStatusControl orderId={o.id} status={o.status} />}
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
