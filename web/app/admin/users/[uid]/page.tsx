import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession, sessionCan } from '@/lib/server/session';
import { getUserDetail } from '@/lib/server/adminRead';
import { listAudit } from '@/lib/server/audit';
import { AdminShell } from '@/components/admin/AdminShell';
import { AuditTable } from '@/components/admin/AuditTable';
import { AdminAction } from '@/components/admin/AdminAction';
import {
  can, canActOnUser, assignableRoles, ROLE_LABEL_AR,
} from '@core/data/auth/roles';

export const metadata: Metadata = { title: 'حساب — الإدارة', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * One account, and everything an administrator may do to it.
 *
 * WHICH CONTROLS APPEAR IS DECIDED BY THE SAME FUNCTION THE SERVER USES
 * ---------------------------------------------------------------------
 * `canActOnUser` and `assignableRoles` come from the shared core, and the
 * endpoints behind these buttons call the very same functions. So the UI cannot
 * offer something the server would refuse, and — far more importantly — the
 * server refuses it even if the UI does offer it. When a control is withheld
 * the page SAYS WHY, rather than silently omitting it: an administrator who
 * cannot see why they lack a button assumes the system is broken.
 */
export default async function AdminUserDetail(
  { params }: { params: Promise<{ uid: string }> },
) {
  const session = await getSession();
  if (!session || !sessionCan(session, 'users.viewDetail')) redirect('/');

  const { uid } = await params;
  const user = await getUserDetail(uid);
  if (!user) notFound();

  const mayAct = canActOnUser(
    { uid: session.uid, role: session.role },
    { uid: user.uid, role: user.role },
  );
  const isSelf = session.uid === user.uid;
  const isOwnerTarget = user.role === 'owner';

  const whyNot = isSelf ? 'لا يمكنك تنفيذ إجراء إداري على حسابك نفسه.'
    : isOwnerTarget ? 'مالك المنصة محميّ: لا يمكن إيقافه أو تغيير دوره من هذه الواجهة.'
    : !mayAct ? 'صلاحيتك لا تكفي تجاه هذا الحساب.'
    : null;

  const roles = assignableRoles(session.role).filter(r => r !== user.role);
  const history = can(session.role, 'audit.view') ? await listAudit({ targetId: uid, limit: 25 }) : [];

  return (
    <div className="shell">
      <AdminShell role={session.role} actorName={session.displayName} current="/admin/users" titleAr={user.displayName ?? 'حساب'}>
        <p style={{ margin: '0 0 18px' }}>
          <Link href="/admin/users" className="btn-ghost">← كل الحسابات</Link>
        </p>

        <dl className="admin-kv card-sm" data-testid="admin-user-detail" style={{ padding: '16px 18px' }}>
          <div><dt>المعرّف</dt><dd className="ltr">{user.uid}</dd></div>
          <div><dt>البريد</dt><dd className="ltr">{user.email ?? '— غير متاح'}</dd></div>
          <div><dt>الدور</dt><dd><span className="admin-badge admin-badge-role">{user.roleLabelAr}</span></dd></div>
          <div>
            <dt>الحالة</dt>
            <dd>
              <span
                className={user.status === 'banned' ? 'admin-badge admin-badge-bad' : 'admin-badge admin-badge-ok'}
                data-testid="admin-user-status"
              >
                {user.status === 'banned' ? 'موقوف' : 'نشط'}
              </span>
            </dd>
          </div>
          <div><dt>المنشورات</dt><dd dir="ltr">{user.postsCount}</dd></div>
          <div><dt>بلاغات على محتواه</dt><dd dir="ltr">{user.reportsAgainstCount}</dd></div>
          <div><dt>تاريخ الانضمام</dt><dd dir="ltr">{user.joinedAt?.slice(0, 10) ?? '—'}</dd></div>
          <div><dt>آخر نشر</dt><dd dir="ltr">{user.lastPostAt?.slice(0, 10) ?? '—'}</dd></div>
        </dl>

        {whyNot && (
          <p className="card-sm" data-testid="admin-user-blocked" style={{
            padding: '13px 15px', marginTop: 16, fontSize: 13, color: '#fcd34d', lineHeight: 1.9,
          }}>
            {whyNot}
          </p>
        )}

        {/* ── Ban / unban ─────────────────────────────────────────────── */}
        {can(session.role, 'users.ban') && (
          <section className="admin-section" aria-labelledby="ban-h">
            <h2 id="ban-h">الإيقاف</h2>
            <p style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.95, margin: '0 0 12px' }}>
              الإيقاف يمنع النشر والتعليق ورفع الملفات فوراً — تفرضه قواعد قاعدة
              البيانات لا الواجهة — ويُبطل جلسات المتصفح المفتوحة. لا يمنع تسجيل
              الدخول ولا القراءة، ولا يُخفي المحتوى المنشور سابقاً؛ إخفاء المحتوى
              قرار منفصل يُسجَّل وحده. والإجراء قابل للتراجع.
            </p>
            {user.status === 'active' ? (
              <AdminAction
                endpoint="/api/admin/users/ban"
                payload={{ uid: user.uid, action: 'ban' }}
                labelAr="أوقف الحساب"
                confirmAr={`سيُمنع «${user.displayName ?? user.uid}» من النشر والتعليق والرفع، وستُبطل جلساته المفتوحة.`}
                severity="danger"
                testId="admin-ban"
                disabled={!mayAct}
                disabledReasonAr={whyNot ?? undefined}
              />
            ) : (
              <AdminAction
                endpoint="/api/admin/users/ban"
                payload={{ uid: user.uid, action: 'unban' }}
                labelAr="ارفع الإيقاف"
                confirmAr={`سيعود «${user.displayName ?? user.uid}» إلى النشر والتعليق.`}
                testId="admin-unban"
                disabled={!mayAct}
                disabledReasonAr={whyNot ?? undefined}
              />
            )}
          </section>
        )}

        {/* ── Roles ───────────────────────────────────────────────────── */}
        {can(session.role, 'users.assignRole') && (
          <section className="admin-section" aria-labelledby="role-h">
            <h2 id="role-h">الدور</h2>
            <p style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.95, margin: '0 0 12px' }}>
              تظهر هنا الأدوار التي تسمح لك صلاحيتك بمنحها فقط. دور «مالك المنصة»
              لا يُمنح من الواجهة إطلاقاً — لا لك ولا لمالك آخر — بل عبر أداة
              خادمية موثّقة، حتى لا تستطيع جلسة إدارية مخترَقة إنشاء حساب يفوق
              الجميع.
            </p>
            {roles.length === 0 || !mayAct ? (
              <p className="admin-badge" data-testid="admin-role-none">
                لا أدوار متاحة للمنح على هذا الحساب.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {roles.map(r => (
                  <AdminAction
                    key={r}
                    endpoint="/api/admin/users/role"
                    payload={{ uid: user.uid, role: r }}
                    labelAr={`اجعله «${ROLE_LABEL_AR[r]}»`}
                    confirmAr={`سيتغيّر دور «${user.displayName ?? user.uid}» من «${user.roleLabelAr}» إلى «${ROLE_LABEL_AR[r]}»، وستُبطل جلساته ليُعاد إصدار صلاحياته.`}
                    severity="danger"
                    testId={`admin-role-${r}`}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── This account's administrative history ───────────────────── */}
        {can(session.role, 'audit.view') && (
          <section className="admin-section" aria-labelledby="history-h">
            <h2 id="history-h">سجل الإجراءات على هذا الحساب</h2>
            {history.length === 0 ? (
              <div className="card-sm admin-empty" data-testid="admin-user-history-empty">
                لا إجراءات إدارية مسجَّلة على هذا الحساب.
              </div>
            ) : <AuditTable rows={history} />}
          </section>
        )}
      </AdminShell>
    </div>
  );
}
