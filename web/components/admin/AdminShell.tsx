import Link from 'next/link';
import { can, ROLE_LABEL_AR, type Capability, type PlatformRole } from '@core/data/auth/roles';

/**
 * The frame every admin screen sits in.
 *
 * DESKTOP FIRST, PHONE STILL USABLE
 * ---------------------------------
 * Moderation is desk work: wide tables, several columns, long reasons. So the
 * sidebar is a real sidebar above 900px and collapses into a horizontal strip
 * below it, rather than the layout being designed for a phone and then
 * stretched. The phone case is not decorative though — an urgent report at
 * midnight gets handled on whatever screen is at hand, so every action remains
 * reachable at 390px.
 *
 * THE NAVIGATION IS BUILT FROM CAPABILITIES
 * -----------------------------------------
 * A reviewer sees no link to anything they cannot do. That is courtesy, not
 * security — every page and every route behind these links re-checks the
 * capability on the server, so the list being wrong would be a cosmetic bug
 * rather than a hole.
 */

export interface AdminNavItem {
  href: string;
  labelAr: string;
  capability: Capability;
}

export const ADMIN_NAV: readonly AdminNavItem[] = [
  { href: '/admin', labelAr: 'اللوحة', capability: 'admin.access' },
  { href: '/admin/reports', labelAr: 'البلاغات', capability: 'community.viewReports' },
  { href: '/admin/users', labelAr: 'المستخدمون', capability: 'users.list' },
  { href: '/admin/store/orders', labelAr: 'الطلبات', capability: 'store.viewOrders' },
  { href: '/admin/store/products', labelAr: 'المنتجات', capability: 'store.viewProducts' },
  { href: '/admin/store/supply', labelAr: 'التسعير والموردون', capability: 'store.viewSupply' },
  { href: '/admin/store/shipping', labelAr: 'الشحن', capability: 'store.viewSupply' },
  { href: '/admin/store/decisions', labelAr: 'قرارات تنتظرك', capability: 'store.viewProducts' },
  { href: '/admin/store/settings', labelAr: 'إعدادات المتجر', capability: 'store.viewSupply' },
  { href: '/admin/audit', labelAr: 'سجل التدقيق', capability: 'audit.view' },
];

export const AdminShell: React.FC<{
  role: PlatformRole;
  actorName: string | null;
  current: string;
  titleAr: string;
  /** Set when the screen renders a better heading than its route name. */
  ownTitle?: boolean;
  children: React.ReactNode;
}> = ({ role, actorName, current, titleAr, ownTitle, children }) => {
  const items = ADMIN_NAV.filter(i => can(role, i.capability));

  return (
    <div className="admin-shell">
      <nav className="admin-nav" aria-label="أقسام الإدارة">
        <p className="admin-nav-title">الإدارة</p>
        <ul>
          {items.map(i => {
            // Exact match for the dashboard, prefix match for sections, so
            // /admin/users/abc still highlights «المستخدمون».
            const active = i.href === '/admin' ? current === '/admin' : current.startsWith(i.href);
            return (
              <li key={i.href}>
                <Link
                  href={i.href}
                  data-testid={`admin-nav-${i.href.split('/').pop()}`}
                  aria-current={active ? 'page' : undefined}
                  className={active ? 'admin-nav-link is-active' : 'admin-nav-link'}
                >
                  {i.labelAr}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="admin-nav-actor">
          <span>{actorName ?? 'مسؤول'}</span>
          <span className="admin-badge admin-badge-role" data-testid="admin-actor-role">
            {ROLE_LABEL_AR[role]}
          </span>
        </div>
      </nav>

      <main className="admin-main">
        {/* The shell owns the page's one heading.
            A screen that wants a more useful title than its route name — the
            product editor wants the product's name — passes `ownTitle` and
            renders its own. Two h1s in one document is two documents as far as
            a screen reader is concerned, and it is what the admin end-to-end
            run checks on every screen. */}
        {!ownTitle && <h1 className="admin-title">{titleAr}</h1>}
        {children}
      </main>
    </div>
  );
};
