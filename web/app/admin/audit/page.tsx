import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession, sessionCan } from '@/lib/server/session';
import { listAudit, type AuditAction } from '@/lib/server/audit';
import { AdminShell } from '@/components/admin/AdminShell';
import { AuditTable } from '@/components/admin/AuditTable';

export const metadata: Metadata = { title: 'سجل التدقيق — الإدارة', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const ACTIONS: { id: string; labelAr: string }[] = [
  { id: 'all', labelAr: 'كل الإجراءات' },
  { id: 'user.role.assign', labelAr: 'تغيير دور' },
  { id: 'user.ban', labelAr: 'إيقاف' },
  { id: 'user.unban', labelAr: 'رفع إيقاف' },
  { id: 'post.hide', labelAr: 'إخفاء منشور' },
  { id: 'post.delete', labelAr: 'حذف إداري' },
  { id: 'media.delete', labelAr: 'حذف وسائط' },
  { id: 'report.resolve', labelAr: 'قبول بلاغ' },
  { id: 'report.reject', labelAr: 'رفض بلاغ' },
];

/**
 * The audit trail.
 *
 * Read through the Admin SDK behind `audit.view`. `firestore.rules` closes the
 * collection to every client completely, so this page is the only way to see it
 * and there is no client query path to it at all.
 */
export default async function AdminAudit(
  { searchParams }: { searchParams: Promise<{ action?: string }> },
) {
  const session = await getSession();
  if (!session || !sessionCan(session, 'audit.view')) redirect('/');

  const { action = 'all' } = await searchParams;
  const rows = await listAudit({
    limit: 100,
    action: action !== 'all' ? action as AuditAction : undefined,
  });

  return (
    <div className="shell">
      <AdminShell role={session.role} actorName={session.displayName} current="/admin/audit" titleAr="سجل التدقيق">
        <p style={{ color: 'var(--text-dim)', fontSize: 13, margin: '0 0 6px', lineHeight: 1.9 }}>
          سجل للإضافة فقط. لا يستطيع أي عميل قراءته أو الكتابة فيه أو تعديله —
          كل ما هنا كُتب من الخادم، ويحمل صلاحيات المنفِّذ كما كانت لحظة التنفيذ.
        </p>

        <div className="admin-filters" role="group" aria-label="تصفية حسب نوع الإجراء">
          {ACTIONS.map(a => (
            <Link
              key={a.id}
              href={`/admin/audit?action=${a.id}`}
              className={action === a.id ? 'admin-nav-link is-active' : 'admin-nav-link'}
              data-testid={`admin-audit-filter-${a.id}`}
              aria-current={action === a.id ? 'true' : undefined}
            >
              {a.labelAr}
            </Link>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="card-sm admin-empty" data-testid="admin-audit-empty">
            لا إجراءات مسجَّلة بهذا التصنيف.
          </div>
        ) : <AuditTable rows={rows} />}
      </AdminShell>
    </div>
  );
}
