import Link from 'next/link';
import { PRIMARY_NAV, navItem } from '@/lib/siteNav';
import { isStaff, ROLE_LABEL_AR, type PlatformRole } from '@core/data/auth/roles';

/**
 * The site header — the web's counterpart to the phone app's bottom navigation.
 *
 * WHY IT IS A SERVER COMPONENT
 * ----------------------------
 * Because it renders from the verified session the layout already read. That
 * means the very first byte of HTML already knows whether you are signed in and
 * what you may see — no flash of a logged-out header, no client fetch, and no
 * possibility of the browser telling the page it is an admin.
 *
 * The admin link is rendered only for staff. That is a CONVENIENCE, not the
 * security boundary — `/admin` refuses non-staff in middleware and again on the
 * server before any admin data is read. Hiding the link protects nothing on its
 * own, and this component is deliberately written as though the link were
 * visible to everyone.
 */

export const SiteHeader: React.FC<{
  signedIn: boolean;
  displayName: string | null;
  photoURL: string | null;
  role: PlatformRole;
}> = ({ signedIn, displayName, role }) => {
  const admin = navItem('admin');
  const showAdmin = signedIn && isStaff(role);

  return (
    <header
      style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(2,8,15,0.86)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border-soft)',
      }}
    >
      <div
        className="shell"
        style={{ display: 'flex', alignItems: 'center', gap: 18, height: 62 }}
      >
        <Link
          href="/"
          style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}
          aria-label="FPV بالعربي — الصفحة الرئيسية"
        >
          <span
            aria-hidden
            style={{
              width: 30, height: 30, borderRadius: 9,
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: '#04101e', fontWeight: 900, fontSize: 15,
            }}
          >
            F
          </span>
          <span style={{ fontWeight: 900, fontSize: 16 }}>
            FPV <span style={{ color: 'var(--accent)' }}>بالعربي</span>
          </span>
        </Link>

        <nav aria-label="التنقّل الرئيسي" style={{ flex: 1, minWidth: 0 }}>
          <ul
            className="scroll-x"
            style={{
              display: 'flex', gap: 4, listStyle: 'none', margin: 0, padding: 0,
              alignItems: 'center',
            }}
          >
            {PRIMARY_NAV.map(item => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  style={{
                    display: 'inline-block', padding: '7px 12px', borderRadius: 9,
                    fontSize: 13.5, fontWeight: 700, color: 'var(--text-dim)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.labelAr}
                </Link>
              </li>
            ))}
            {showAdmin && admin && (
              <li>
                <Link
                  href={admin.href}
                  data-testid="nav-admin"
                  style={{
                    display: 'inline-block', padding: '7px 12px', borderRadius: 9,
                    fontSize: 13.5, fontWeight: 800, color: 'var(--accent)',
                    border: '1px solid var(--border)', whiteSpace: 'nowrap',
                  }}
                >
                  {admin.labelAr}
                </Link>
              </li>
            )}
          </ul>
        </nav>

        <div style={{ flexShrink: 0 }}>
          {signedIn ? (
            <Link
              href="/profile"
              data-testid="header-account"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                {displayName ?? 'حسابي'}
              </span>
              {role !== 'user' && (
                <span
                  style={{
                    fontSize: 10, fontWeight: 800, color: 'var(--accent)',
                    border: '1px solid var(--border)', borderRadius: 999,
                    padding: '2px 8px',
                  }}
                >
                  {ROLE_LABEL_AR[role]}
                </span>
              )}
            </Link>
          ) : (
            <Link href="/signin" className="btn-ghost" data-testid="header-signin">
              تسجيل الدخول
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
