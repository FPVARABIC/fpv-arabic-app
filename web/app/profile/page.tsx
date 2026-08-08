import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/server/session';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { ROLE_LABEL_AR, ROLE_DESCRIPTION_AR, isStaff } from '@core/data/auth/roles';

export const metadata: Metadata = {
  title: 'ملفي',
  // A personal page must never be indexed. The requirement named this
  // explicitly, and it is also simply correct: nothing here is public.
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * The signed-in user's own profile.
 *
 * THE PROTECTION IS HERE, NOT ONLY IN MIDDLEWARE
 * ----------------------------------------------
 * Middleware already redirects requests with no session cookie, but that check
 * is presence-only — it cannot verify the cookie in the edge runtime. This page
 * calls `getSession()`, which verifies the cookie's signature with Firebase and
 * re-reads the account's role and status from Firestore. If the middleware were
 * removed tomorrow, this page would still be closed.
 *
 * `?next=` is set so that signing in returns the user here rather than dumping
 * them on the home page — and it is validated on the way back out.
 */
export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect('/signin?next=%2Fprofile');

  const rows: { k: string; v: string }[] = [
    { k: 'الاسم الظاهر', v: session.displayName ?? '— لم يُضبَط —' },
    { k: 'البريد', v: session.email ?? '—' },
    { k: 'البريد موثَّق', v: session.emailVerified ? 'نعم' : 'لا' },
    { k: 'الدور', v: ROLE_LABEL_AR[session.role] },
    { k: 'حالة الحساب', v: session.status === 'banned' ? 'موقوف' : 'نشط' },
  ];

  return (
    <div className="shell" style={{ paddingTop: 40, paddingBottom: 40, maxWidth: 760 }}>
      <h1 className="page-title">ملفي</h1>
      <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: '10px 0 0', lineHeight: 1.9 }}>
        هذا الحساب نفسه الذي تستخدمه في تطبيق الهاتف. أي تغيير هنا يظهر هناك، والعكس.
      </p>

      {session.status === 'banned' && (
        <div
          className="card"
          style={{
            marginTop: 20, padding: '14px 16px',
            borderColor: 'rgba(248,113,113,0.35)', background: 'rgba(248,113,113,0.07)',
          }}
        >
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--sev-blocker)', lineHeight: 1.9 }}>
            هذا الحساب موقوف. يمكنك تصفّح المحتوى، لكن لا يمكنك النشر أو التعليق.
          </p>
        </div>
      )}

      <section aria-labelledby="acct-h" style={{ marginTop: 28 }}>
        <h2 id="acct-h" style={{ fontSize: 16, fontWeight: 900, margin: '0 0 12px' }}>الحساب</h2>
        <dl
          className="card"
          data-testid="profile-account"
          style={{
            margin: 0, padding: '6px 4px', display: 'grid',
            gridTemplateColumns: 'minmax(130px, auto) 1fr',
          }}
        >
          {rows.map((r, i) => (
            <div key={r.k} style={{ display: 'contents' }}>
              <dt style={{
                padding: '11px 15px', fontSize: 13, color: 'var(--text-dimmer)',
                borderTop: i === 0 ? 'none' : '1px solid var(--border-soft)',
              }}>
                {r.k}
              </dt>
              <dd style={{
                margin: 0, padding: '11px 15px', fontSize: 13.5, fontWeight: 700,
                borderTop: i === 0 ? 'none' : '1px solid var(--border-soft)',
              }}>
                {r.k === 'البريد' ? <span className="ltr">{r.v}</span> : r.v}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {session.role !== 'user' && (
        <section aria-labelledby="role-h" style={{ marginTop: 26 }}>
          <h2 id="role-h" style={{ fontSize: 16, fontWeight: 900, margin: '0 0 12px' }}>صلاحيتك</h2>
          <div className="card" style={{ padding: '15px 17px' }}>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.9 }}>
              {ROLE_DESCRIPTION_AR[session.role]}
            </p>
            {isStaff(session.role) && (
              <p style={{ margin: '12px 0 0' }}>
                <Link href="/admin" className="btn-ghost" data-testid="profile-admin-link">
                  افتح لوحة الإدارة
                </Link>
              </p>
            )}
          </div>
        </section>
      )}

      <section aria-labelledby="mine-h" style={{ marginTop: 26 }}>
        <h2 id="mine-h" style={{ fontSize: 16, fontWeight: 900, margin: '0 0 12px' }}>ما يخصّك</h2>
        <div style={{ display: 'grid', gap: 11, gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
          {[
            { href: '/project', titleAr: 'مشروعي', blurbAr: 'قطعك وإعداداتك وأحكام التوافق.' },
            { href: '/build', titleAr: 'البناء', blurbAr: 'تابع مسار بناء درونك من حيث توقفت.' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-sm" style={{ display: 'block', padding: '14px 16px' }}>
              <h3 style={{ fontSize: 14.5, fontWeight: 800, margin: 0 }}>{c.titleAr}</h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '6px 0 0', lineHeight: 1.8 }}>
                {c.blurbAr}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <div style={{ marginTop: 34, paddingTop: 20, borderTop: '1px solid var(--border-soft)' }}>
        <SignOutButton />
        <p style={{ fontSize: 12, color: 'var(--text-dimmer)', margin: '10px 0 0', lineHeight: 1.85 }}>
          تسجيل الخروج يُبطل جلستك هنا وعلى أي جهاز آخر سجّلت منه الدخول بهذا الحساب.
        </p>
      </div>
    </div>
  );
}
