'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_TABS, isTabActive } from '@/lib/navTabs';

/**
 * The tab bar, rendered twice and defined once.
 *
 * WHY IT IS A CLIENT COMPONENT
 * ----------------------------
 * Only because it needs `usePathname()` to know which tab is lit. It holds no
 * state, fetches nothing, and its markup is otherwise static — so it is a small
 * island inside an otherwise server-rendered header, not a client page.
 *
 * THE PROPELLER
 * -------------
 * The phone app draws a spinning arc with a magenta tip on the active tab's
 * icon (`BottomNavigation.tsx`), and it is the single most recognisable piece
 * of motion the product has. It is reproduced here at the same 3s linear spin,
 * with the same arc geometry and the same two colours.
 *
 * It is `aria-hidden` and purely decorative: the active tab is announced by
 * `aria-current="page"`, which is what a screen reader actually needs, and the
 * lit state is also carried by background and weight — never by the spinner
 * alone. Under `prefers-reduced-motion` the global rule in `globals.css`
 * freezes it, and the tab is still obviously active.
 */

const Propeller: React.FC = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" className="nav-prop" aria-hidden>
    <circle
      cx="14" cy="14" r="12" fill="none"
      stroke="var(--nav-prop)" strokeWidth="1.5"
      strokeDasharray="18.85 56.55" strokeLinecap="round"
    />
    <circle cx="26" cy="14" r="2" fill="var(--nav-prop-dot)" />
  </svg>
);

export const NavTabs: React.FC<{ variant: 'header' | 'bottom' }> = ({ variant }) => {
  const pathname = usePathname() ?? '/';

  return (
    <ul
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: variant === 'header' ? 2 : 0,
        justifyContent: variant === 'bottom' ? 'space-around' : undefined,
        listStyle: 'none',
        margin: 0,
        padding: 0,
        width: variant === 'bottom' ? '100%' : undefined,
      }}
    >
      {NAV_TABS.map(tab => {
        const active = isTabActive(tab, pathname);
        return (
          <li key={tab.id} style={{ flex: variant === 'bottom' ? 1 : undefined, minWidth: 0 }}>
            <Link
              href={tab.href}
              className="nav-tab"
              data-testid={`nav-${tab.id}`}
              aria-current={active ? 'page' : undefined}
              style={{ width: variant === 'bottom' ? '100%' : undefined }}
            >
              <span className="nav-tab-icon">
                {active && <Propeller />}
                <tab.Icon size={20} style={{ position: 'relative', zIndex: 1 }} aria-hidden />
              </span>
              <span className="nav-tab-label">{tab.labelAr}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

/**
 * The phone-width bar, fixed under the thumb.
 *
 * Hidden from 900px up by CSS rather than by a media query in JavaScript, so
 * the server sends one HTML document that is correct at every width — no
 * layout shift while a hook works out how wide the window is.
 */
export const BottomNav: React.FC = () => (
  <nav className="navbar nav-bottom" aria-label="التنقّل الرئيسي">
    <div className="nav-bottom-row">
      <NavTabs variant="bottom" />
    </div>
  </nav>
);
