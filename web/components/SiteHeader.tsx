import Link from 'next/link';
import { navItem } from '@/lib/siteNav';
import { NavTabs } from '@/components/NavTabs';
import { HeaderSearch } from '@/components/search/HeaderSearch';
import { CartBadge } from '@/components/store/CartControls';
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
 *
 * WHAT CHANGED IN THE UNIFICATION PASS
 * ------------------------------------
 * The header used to be a dark translucent strip carrying seven text links in
 * a scrolling row, with no icons anywhere on the site. It now carries the phone
 * app's own tab bar — same icons, same order, same mint field, same lit state
 * with its spinning propeller — on the mint the app uses, above a cream page.
 * Below 900px the tabs move to a fixed bottom bar where a thumb can reach them,
 * and the header keeps only identity, search and the basket.
 */

export const SiteHeader: React.FC<{
  signedIn: boolean;
  displayName: string | null;
  photoURL: string | null;
  role: PlatformRole;
}> = ({ signedIn, displayName, photoURL, role }) => {
  const admin = navItem('admin');
  const showAdmin = signedIn && isStaff(role);

  return (
    <header
      style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 12px), var(--nav-bg)',
        borderBottom: '1px solid rgba(103,232,249,0.35)',
        boxShadow: '0 2px 14px -8px rgba(21,34,50,0.25)',
      }}
    >
      <div
        className="shell"
        style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: 60 }}
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
              color: 'var(--accent-ink-on-fill)', fontWeight: 900, fontSize: 15,
              boxShadow: '0 2px 8px -2px rgba(0,120,160,0.4)',
            }}
          >
            F
          </span>
          <span style={{ fontWeight: 900, fontSize: 16, color: 'var(--nav-ink)' }}>
            FPV بالعربي
          </span>
        </Link>

        {/* The tabs, on screens with room for them. The same component renders
            the fixed bottom bar below 900px — see BottomNav in the layout. */}
        <nav
          aria-label="التنقّل الرئيسي"
          className="header-tabs"
          style={{ flex: 1, minWidth: 0 }}
        >
          <NavTabs variant="header" />
        </nav>

        {/* Pushes the controls to the far edge when the tabs are hidden. */}
        <div className="header-spacer" style={{ flex: 1 }} />

        {/* Search from anywhere. A client island inside a server header — the
            rest of the header stays server-rendered. */}
        <HeaderSearch />

        {/* The basket, from anywhere.
            It renders NOTHING when the basket is empty, so it costs a reader
            who is not shopping one component and no visual weight — this is a
            teaching site with a shop attached, not the other way round.
            It reads the stored cart and never the catalogue, so putting it on
            every page in the site costs no database read. */}
        <CartBadge />

        {showAdmin && admin && (
          <Link
            href={admin.href}
            data-testid="nav-admin"
            style={{
              display: 'inline-block', padding: '6px 12px', borderRadius: 9,
              fontSize: 13, fontWeight: 800, color: 'var(--nav-ink)',
              border: '1px solid rgba(18,34,42,0.28)', whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {admin.labelAr}
          </Link>
        )}

        <div style={{ flexShrink: 0 }}>
          {signedIn ? (
            <Link
              href="/profile"
              data-testid="header-account"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoURL}
                  alt=""
                  width={28}
                  height={28}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', objectFit: 'cover',
                    border: '2px solid rgba(255,255,255,0.7)',
                  }}
                />
              ) : (
                <span
                  aria-hidden
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--acct-blue)', color: '#fff',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 13,
                  }}
                >
                  {(displayName ?? 'ح').trim().charAt(0)}
                </span>
              )}
              <span
                className="header-account-name"
                style={{ fontSize: 13, fontWeight: 800, color: 'var(--nav-ink)' }}
              >
                {displayName ?? 'حسابي'}
              </span>
              {role !== 'user' && (
                <span
                  className="header-account-role"
                  style={{
                    fontSize: 10, fontWeight: 800, color: 'var(--nav-ink)',
                    border: '1px solid rgba(18,34,42,0.28)', borderRadius: 999,
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
