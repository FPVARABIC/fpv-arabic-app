/**
 * The web's section map — the counterpart of the phone app's bottom navigation.
 *
 * Declared as data, in one file, for the same reason the destination resolver
 * exists: so "where does the encyclopedia live" has exactly one answer, and so
 * the correspondence table in `docs/platform/11-WEB-IMPLEMENTATION-PLAN.md` can
 * be asserted by a test rather than maintained by hand.
 *
 * `requiresAuth` and `requiresRole` are declared here too, but they are NOT the
 * security boundary — they only decide what to render in a menu. The real gate
 * is server-side (`web/lib/server/requireRole.ts` and the middleware), because
 * hiding a link protects nothing.
 */

import type { PlatformRole } from '@core/data/auth/roles';

export interface NavItem {
  id: string;
  labelAr: string;
  href: string;
  /** One line explaining the section, used on the home page and in menus. */
  blurbAr: string;
  group: 'learn' | 'build' | 'software' | 'community' | 'account' | 'admin';
  /** Signed-out users do not see it, and the server refuses it. */
  requiresAuth?: boolean;
  /** Minimum role. Enforced server-side; listed here only for menu rendering. */
  requiresRole?: PlatformRole;
}

export const NAV_ITEMS: NavItem[] = [
  // ── Learn ────────────────────────────────────────────────────────────────
  {
    id: 'kb', labelAr: 'الموسوعة', href: '/kb', group: 'learn',
    blurbAr: 'سبع منظومات مشروحة من المبدأ إلى العطل، بمصادر وتواريخ مراجعة.',
  },
  {
    id: 'search', labelAr: 'البحث', href: '/search', group: 'learn',
    blurbAr: 'محرّك واحد يصل إلى المقالات والمصطلحات والتشخيص وصفحات البرامج.',
  },
  {
    id: 'glossary', labelAr: 'القاموس', href: '/glossary', group: 'learn',
    blurbAr: 'المصطلح بالعربية، واسمه الإنجليزي كما يظهر داخل البرامج.',
  },
  {
    id: 'diagnose', labelAr: 'التشخيص', href: '/diagnose', group: 'learn',
    blurbAr: 'ابدأ من العرَض الذي تراه، بترتيب فحص يبدأ من الأقل خطراً.',
  },

  // ── Software ─────────────────────────────────────────────────────────────
  {
    id: 'programming', labelAr: 'البرامج', href: '/programming', group: 'software',
    blurbAr: 'Betaflight وExpressLRS وEdgeTX وأدوات الفيديو، مربوطة بمشروعك.',
  },

  // ── Build ────────────────────────────────────────────────────────────────
  {
    id: 'project', labelAr: 'مشروعي', href: '/project', group: 'build',
    blurbAr: 'قطعك وإعداداتك، وأحكام التوافق التي تُحسب منها.',
  },

  // ── Community ────────────────────────────────────────────────────────────
  {
    id: 'community', labelAr: 'المجتمع', href: '/community', group: 'community',
    blurbAr: 'أسئلة الطيارين ومشاريعهم — نفس المجتمع الموجود في التطبيق.',
  },

  // ── Account ──────────────────────────────────────────────────────────────
  {
    id: 'profile', labelAr: 'ملفي', href: '/profile', group: 'account',
    blurbAr: 'حسابك ومنشوراتك وتقدّمك.', requiresAuth: true,
  },

  // ── Admin ────────────────────────────────────────────────────────────────
  {
    id: 'admin', labelAr: 'الإدارة', href: '/admin', group: 'admin',
    blurbAr: 'المستخدمون والبلاغات والمحتوى وسجلّ التدقيق.',
    requiresAuth: true, requiresRole: 'reviewer',
  },
];

/** The items shown in the primary sidebar, in order. */
export const PRIMARY_NAV = NAV_ITEMS.filter(i => i.group !== 'admin' && !i.requiresAuth);

export function navItem(id: string): NavItem | undefined {
  return NAV_ITEMS.find(i => i.id === id);
}
