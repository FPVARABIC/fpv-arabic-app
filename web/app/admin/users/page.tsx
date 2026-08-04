import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession, sessionCan } from '@/lib/server/session';
import { findUsers } from '@/lib/server/adminRead';
import { AdminShell } from '@/components/admin/AdminShell';

export const metadata: Metadata = { title: 'المستخدمون — الإدارة', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * The user list.
 *
 * SEARCH IS A GET WITH A QUERY STRING, ON PURPOSE
 * -----------------------------------------------
 * So a search is a URL: linkable, shareable with a colleague, and survivable
 * across a refresh. It also keeps this page a server component with no client
 * JavaScript at all — the list itself needs none, and every byte not shipped
 * here is one an administrator on a phone at midnight does not wait for.
 */
export default async function AdminUsers(
  { searchParams }: { searchParams: Promise<{ q?: string; status?: string }> },
) {
  const session = await getSession();
  if (!session || !sessionCan(session, 'users.list')) redirect('/');

  const { q = '', status = 'all' } = await searchParams;
  const all = await findUsers(q, 50);
  const users = status === 'banned' ? all.filter(u => u.status === 'banned')
    : status === 'active' ? all.filter(u => u.status === 'active')
    : all;

  return (
    <div className="shell">
      <AdminShell role={session.role} actorName={session.displayName} current="/admin/users" titleAr="المستخدمون">
        <form method="get" action="/admin/users" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
          <label htmlFor="admin-user-q" className="sr-only">ابحث بالمعرّف أو البريد أو الاسم</label>
          <input
            id="admin-user-q" name="q" defaultValue={q}
            data-testid="admin-user-search"
            className="admin-field"
            style={{ maxWidth: 380 }}
            placeholder="المعرّف (UID) أو البريد الإلكتروني أو الاسم"
          />
          <button type="submit" className="btn-primary" data-testid="admin-user-search-submit">ابحث</button>
        </form>

        <div className="admin-filters" role="group" aria-label="تصفية حسب الحالة">
          {[
            { id: 'all', labelAr: 'الكل' },
            { id: 'active', labelAr: 'نشط' },
            { id: 'banned', labelAr: 'موقوف' },
          ].map(f => (
            <Link
              key={f.id}
              href={`/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), status: f.id })}`}
              className={status === f.id ? 'admin-nav-link is-active' : 'admin-nav-link'}
              data-testid={`admin-user-filter-${f.id}`}
              aria-current={status === f.id ? 'true' : undefined}
            >
              {f.labelAr}
            </Link>
          ))}
        </div>

        {users.length === 0 ? (
          <div className="card-sm admin-empty" data-testid="admin-users-empty">
            لا نتائج مطابقة. جرّب المعرّف الكامل أو البريد الإلكتروني.
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table" data-testid="admin-users-table">
              <caption className="sr-only">قائمة الحسابات: الاسم والدور والحالة وعدد المنشورات.</caption>
              <thead>
                <tr>
                  <th scope="col">الحساب</th>
                  <th scope="col">الدور</th>
                  <th scope="col">الحالة</th>
                  <th scope="col">المنشورات</th>
                  <th scope="col"><span className="sr-only">إجراءات</span></th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.uid} data-testid={`admin-user-row-${u.uid}`}>
                    <td>
                      <span style={{ fontWeight: 800, display: 'block' }}>{u.displayName ?? '—'}</span>
                      <span className="ltr" style={{ fontSize: 11, color: 'var(--text-dimmer)' }}>{u.uid}</span>
                    </td>
                    <td><span className="admin-badge admin-badge-role">{u.roleLabelAr}</span></td>
                    <td>
                      <span className={u.status === 'banned' ? 'admin-badge admin-badge-bad' : 'admin-badge admin-badge-ok'}>
                        {u.status === 'banned' ? 'موقوف' : 'نشط'}
                      </span>
                    </td>
                    <td dir="ltr">{u.postsCount}</td>
                    <td>
                      <Link href={`/admin/users/${u.uid}`} className="btn-ghost" data-testid={`admin-user-open-${u.uid}`}>
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
