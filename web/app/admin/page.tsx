import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession, sessionCan } from '@/lib/server/session';
import { isServiceConfigured as isAdminConfigured } from '@/lib/backend/supabase/adminData';
import { getAdminStats } from '@/lib/server/adminRead';
import { listAudit } from '@/lib/server/audit';
import { AdminShell } from '@/components/admin/AdminShell';
import { AuditTable } from '@/components/admin/AuditTable';
import { can } from '@core/data/auth/roles';

export const metadata: Metadata = {
  title: 'الإدارة',
  // Belt and braces with the X-Robots-Tag header set in next.config.ts.
  robots: { index: false, follow: false },
};

// The admin surface reads live data and a live session; caching it would serve
// one administrator's view to another.
export const dynamic = 'force-dynamic';

/**
 * The admin dashboard.
 *
 * THE GUARD IS THE FIRST THING THAT HAPPENS
 * -----------------------------------------
 * `getSession()` verifies the httpOnly session cookie with Firebase, then reads
 * the role from Firestore and takes the lower of that and the cookie's claim.
 * Only then does anything render. Middleware has already turned away requests
 * with no cookie at all, but this check is what actually authorises — and it
 * would still be correct if the middleware were deleted.
 *
 * EVERY NUMBER HERE IS COUNTED, NOT STORED
 * ----------------------------------------
 * The tiles come from `getAdminStats`, which counts the collections it
 * describes at read time. No cached totals, no denormalised counters. A
 * dashboard whose figures are quietly stale is worse than one with no figures:
 * it produces confident decisions from wrong data. Where a count hits its cap
 * the tile says so rather than reporting the cap as the truth.
 */
export default async function AdminHome() {
  const session = await getSession();

  // Not signed in, or signed in without staff access: this page does not exist
  // as far as they are concerned. A redirect rather than a message, so the
  // surface does not confirm to a probing user that it is there.
  if (!session || !sessionCan(session, 'admin.access')) redirect('/');

  if (!isAdminConfigured()) {
    return (
      <div className="shell">
        <p className="card" data-testid="admin-unconfigured" style={{ padding: '18px 20px', marginTop: 30 }}>
          الإدارة غير مهيّأة في هذه البيئة.
        </p>
      </div>
    );
  }

  const stats = await getAdminStats();
  const recent = can(session.role, 'audit.view') ? await listAudit({ limit: 8 }) : [];

  const tiles = [
    { id: 'open-reports', value: stats.openReports, labelAr: 'بلاغات مفتوحة', href: '/admin/reports?status=open', cap: 'community.viewReports' as const },
    { id: 'in-review', value: stats.inReviewReports, labelAr: 'بلاغات قيد المراجعة', href: '/admin/reports?status=in_review', cap: 'community.viewReports' as const },
    { id: 'hidden-posts', value: stats.hiddenPosts, labelAr: 'منشورات مخفية', href: '/admin/reports', cap: 'community.hidePost' as const },
    { id: 'banned-users', value: stats.bannedUsers, labelAr: 'حسابات موقوفة', href: '/admin/users?status=banned', cap: 'users.list' as const },
    { id: 'total-users', value: stats.totalUsers, labelAr: 'حسابات مسجّلة', href: '/admin/users', cap: 'users.list' as const },
  ].filter(t => can(session.role, t.cap));

  return (
    <div className="shell">
      <AdminShell role={session.role} actorName={session.displayName} current="/admin" titleAr="لوحة الإدارة">
        <p style={{ color: 'var(--text-dim)', fontSize: 13.5, margin: '0 0 4px', lineHeight: 1.9 }}>
          كل رقم هنا محسوب من قاعدة البيانات عند فتح الصفحة، لا من عدّاد مخزَّن.
          {stats.capped && ' بعض الأعداد بلغت حدّ العدّ وتظهر بعلامة «+».'}
        </p>

        <div className="admin-stats" data-testid="admin-stats">
          {tiles.map(t => (
            <Link key={t.id} href={t.href} className="admin-stat" data-testid={`admin-stat-${t.id}`}>
              <div className="admin-stat-value" dir="ltr">
                {t.value}{stats.capped && t.value >= 500 ? '+' : ''}
              </div>
              <div className="admin-stat-label">{t.labelAr}</div>
            </Link>
          ))}
        </div>

        {can(session.role, 'audit.view') && (
          <section className="admin-section" aria-labelledby="recent-actions">
            <h2 id="recent-actions">آخر الإجراءات الإدارية</h2>
            {recent.length === 0 ? (
              <div className="card-sm admin-empty" data-testid="admin-audit-empty">
                لا إجراءات مسجَّلة بعد.
              </div>
            ) : (
              <>
                <AuditTable rows={recent} />
                <p style={{ marginTop: 12 }}>
                  <Link href="/admin/audit" className="btn-ghost">كل السجل ←</Link>
                </p>
              </>
            )}
          </section>
        )}
      </AdminShell>
    </div>
  );
}
