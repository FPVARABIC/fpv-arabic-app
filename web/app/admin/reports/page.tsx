import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession, sessionCan } from '@/lib/server/session';
import { listReports, REPORT_REASON_AR } from '@/lib/server/adminRead';
import { REPORT_STATUS_AR, type ReportStatus } from '@/lib/server/admin';
import { AdminShell } from '@/components/admin/AdminShell';

export const metadata: Metadata = { title: 'البلاغات — الإدارة', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const STATUS_CLASS: Record<ReportStatus, string> = {
  open: 'admin-badge admin-badge-warn',
  in_review: 'admin-badge admin-badge-role',
  resolved: 'admin-badge admin-badge-ok',
  rejected: 'admin-badge',
};

/**
 * The report queue.
 *
 * Reads the SAME `reports` collection the phone app writes to and the phone's
 * own admin dashboard reads. There is no second reports store, and no
 * web-specific mirror — a report filed from the app appears here, and a
 * decision made here is visible there.
 */
export default async function AdminReports(
  { searchParams }: { searchParams: Promise<{ status?: string; type?: string }> },
) {
  const session = await getSession();
  if (!session || !sessionCan(session, 'community.viewReports')) redirect('/');

  const { status = 'open', type = 'all' } = await searchParams;
  const wanted = (['open', 'in_review', 'resolved', 'rejected'] as const)
    .includes(status as ReportStatus) ? status as ReportStatus : 'all';

  const all = await listReports({ status: wanted, limit: 100 });
  const rows = type === 'post' || type === 'comment' ? all.filter(r => r.targetType === type) : all;

  const filters: { id: string; labelAr: string }[] = [
    { id: 'open', labelAr: 'مفتوح' },
    { id: 'in_review', labelAr: 'قيد المراجعة' },
    { id: 'resolved', labelAr: 'مقبول' },
    { id: 'rejected', labelAr: 'مرفوض' },
    { id: 'all', labelAr: 'الكل' },
  ];

  return (
    <div className="shell">
      <AdminShell role={session.role} actorName={session.displayName} current="/admin/reports" titleAr="البلاغات">
        <div className="admin-filters" role="group" aria-label="تصفية حسب الحالة">
          {filters.map(f => (
            <Link
              key={f.id}
              href={`/admin/reports?status=${f.id}${type !== 'all' ? `&type=${type}` : ''}`}
              className={status === f.id ? 'admin-nav-link is-active' : 'admin-nav-link'}
              data-testid={`admin-report-filter-${f.id}`}
              aria-current={status === f.id ? 'true' : undefined}
            >
              {f.labelAr}
            </Link>
          ))}
        </div>

        <div className="admin-filters" role="group" aria-label="تصفية حسب نوع المحتوى">
          {[
            { id: 'all', labelAr: 'كل الأنواع' },
            { id: 'post', labelAr: 'منشورات' },
            { id: 'comment', labelAr: 'تعليقات' },
          ].map(f => (
            <Link
              key={f.id}
              href={`/admin/reports?status=${status}&type=${f.id}`}
              className={type === f.id ? 'admin-nav-link is-active' : 'admin-nav-link'}
              data-testid={`admin-report-type-${f.id}`}
              aria-current={type === f.id ? 'true' : undefined}
            >
              {f.labelAr}
            </Link>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="card-sm admin-empty" data-testid="admin-reports-empty">
            لا بلاغات في هذه الحالة.
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table" data-testid="admin-reports-table">
              <caption className="sr-only">البلاغات: النوع والسبب والحالة وتاريخ الورود.</caption>
              <thead>
                <tr>
                  <th scope="col">النوع</th>
                  <th scope="col">السبب</th>
                  <th scope="col">الحالة</th>
                  <th scope="col">وصل في</th>
                  <th scope="col"><span className="sr-only">إجراءات</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} data-testid={`admin-report-row-${r.id}`}>
                    <td>{r.targetType === 'comment' ? 'تعليق' : 'منشور'}</td>
                    <td>{REPORT_REASON_AR[r.reason] ?? r.reason}</td>
                    <td><span className={STATUS_CLASS[r.status]}>{REPORT_STATUS_AR[r.status]}</span></td>
                    <td dir="ltr" style={{ whiteSpace: 'nowrap' }}>{r.createdAt?.slice(0, 10) ?? '—'}</td>
                    <td>
                      <Link href={`/admin/reports/${r.id}`} className="btn-ghost" data-testid={`admin-report-open-${r.id}`}>
                        افتح
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminShell>
    </div>
  );
}
