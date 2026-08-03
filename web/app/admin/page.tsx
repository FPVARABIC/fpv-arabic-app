import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession, sessionCan } from '@/lib/server/session';
import { isAdminConfigured } from '@/lib/server/firebaseAdmin';
import {
  ROLE_LABEL_AR, ROLE_DESCRIPTION_AR, ROLE_CAPABILITIES, can,
} from '@core/data/auth/roles';

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
 * WHAT EACH VIEWER SEES
 * ---------------------
 * The tiles shown are computed from the viewer's own capabilities, so a
 * reviewer does not see actions they cannot perform. That is a courtesy, not a
 * control: every route behind these tiles re-checks the capability server-side,
 * because a hidden link is not a closed door.
 */
export default async function AdminHome() {
  const session = await getSession();

  // Not signed in, or signed in without staff access: this page does not exist
  // as far as they are concerned. A redirect rather than a message, so the
  // surface does not confirm to a probing user that it is there.
  if (!session || !sessionCan(session, 'admin.access')) redirect('/');

  const tiles = [
    {
      id: 'users', href: '/admin/users', titleAr: 'المستخدمون',
      blurbAr: 'ابحث عن حساب، اعرض دوره وحالته، وامنح أو اسحب الأدوار ضمن صلاحيتك.',
      cap: 'users.list' as const,
    },
    {
      id: 'reports', href: '/admin/reports', titleAr: 'البلاغات',
      blurbAr: 'بلاغات المجتمع بترتيب ورودها، مع ما تسمح لك صلاحيتك بفعله.',
      cap: 'community.viewReports' as const,
    },
    {
      id: 'posts', href: '/admin/posts', titleAr: 'المنشورات',
      blurbAr: 'راجع منشورات المجتمع وأخفِ المخالف منها.',
      cap: 'community.hidePost' as const,
    },
    {
      id: 'audit', href: '/admin/audit', titleAr: 'سجلّ التدقيق',
      blurbAr: 'كل إجراء إداري: من فعله، وبماذا، ومتى. لا يُعدَّل ولا يُحذَف.',
      cap: 'audit.view' as const,
    },
  ].filter(t => can(session.role, t.cap));

  return (
    <div className="shell" style={{ paddingTop: 36, paddingBottom: 20 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>الإدارة</h1>
      <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: '10px 0 0', lineHeight: 1.9 }}>
        أنت داخل بدور <strong style={{ color: 'var(--accent)' }}>{ROLE_LABEL_AR[session.role]}</strong>.
        {' '}{ROLE_DESCRIPTION_AR[session.role]}
      </p>

      {!isAdminConfigured() && (
        <div
          className="card"
          style={{
            marginTop: 20, padding: '14px 16px',
            borderColor: 'rgba(251,191,36,0.32)', background: 'rgba(251,191,36,0.07)',
          }}
        >
          <p style={{ margin: 0, fontSize: 13, color: '#fcd34d', lineHeight: 1.9 }}>
            بيانات اعتماد الخادم غير مهيّأة في هذه البيئة، فبعض الإجراءات ستكون معطّلة.
            راجع <span className="ltr">web/.env.example</span>.
          </p>
        </div>
      )}

      <section aria-labelledby="tiles-h" style={{ marginTop: 28 }}>
        <h2 id="tiles-h" className="sr-only">أقسام الإدارة</h2>
        <div
          style={{
            display: 'grid', gap: 13,
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          }}
        >
          {tiles.map(t => (
            <Link
              key={t.id}
              href={t.href}
              className="card"
              data-testid={`admin-tile-${t.id}`}
              style={{ display: 'block', padding: '18px 20px' }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>{t.titleAr}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '8px 0 0', lineHeight: 1.85 }}>
                {t.blurbAr}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="caps-h" style={{ marginTop: 36, maxWidth: 640 }}>
        <h2 id="caps-h" style={{ fontSize: 15, fontWeight: 900, margin: '0 0 12px' }}>
          ما تسمح به صلاحيتك
        </h2>
        <ul
          className="card-sm"
          style={{ margin: 0, padding: '13px 16px', listStyle: 'none', display: 'grid', gap: 6 }}
        >
          {ROLE_CAPABILITIES[session.role].map(c => (
            <li key={c} className="ltr" style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              {c}
            </li>
          ))}
        </ul>
        <p style={{ fontSize: 12, color: 'var(--text-dimmer)', margin: '10px 0 0', lineHeight: 1.85 }}>
          هذه القائمة تُقرأ من نموذج الأدوار المشترك، والتحقق يتم على الخادم في كل طلب —
          إخفاء زر لا يمنع أحداً.
        </p>
      </section>
    </div>
  );
}
