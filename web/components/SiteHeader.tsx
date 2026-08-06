import Link from 'next/link';
import { navItem } from '@/lib/siteNav';
import { NavTabs } from '@/components/NavTabs';
import { HeaderSearch } from '@/components/search/HeaderSearch';
import { CartBadge } from '@/components/store/CartControls';
import { HeaderSession } from '@/components/auth/HeaderSession';
import { BRAND_NAME, BRAND_NAME_AR } from '@core/data/brand';

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

export const SiteHeader: React.FC = () => {
  const admin = navItem('admin');

  return (
    <header
      style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 12px), var(--nav-bg)',
        borderBottom: '1px solid rgba(103,232,249,0.35)',
        boxShadow: '0 2px 14px -8px rgba(21,34,50,0.25)',
      }}
    >
      {/* `flexWrap` is what lets the search field take its own full-width row on
          a phone instead of squeezing the wordmark — see `.header-search-full`.
          At 620px and up nothing wraps, because the field returns to this row. */}
      <div
        className="shell"
        style={{
          display: 'flex', alignItems: 'center', gap: 14, minHeight: 60,
          flexWrap: 'wrap',
        }}
      >
        <Link
          href="/"
          style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}
          aria-label={`${BRAND_NAME} — الصفحة الرئيسية`}
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
          {/* The wordmark: the official name, with the Arabic descriptor under
              it where there is room. One brand in two scripts, not two brands. */}
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
            <span
              style={{
                fontWeight: 900, fontSize: 16.5, color: 'var(--nav-ink)',
                letterSpacing: '-0.01em',
              }}
              dir="ltr"
            >
              {BRAND_NAME}
            </span>
            <span
              className="wordmark-sub"
              style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--nav-ink-dim)' }}
            >
              {BRAND_NAME_AR}
            </span>
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

        {/* The admin link and the account chip hydrate in the browser — one
            `cookies()` read in the layout would make every route on the site
            request-rendered, and the account corner is presentation, not a
            gate. See HeaderSession for the full argument. */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <HeaderSession adminHref={admin?.href ?? null} adminLabelAr={admin?.labelAr ?? null} />
        </div>
      </div>
    </header>
  );
};
