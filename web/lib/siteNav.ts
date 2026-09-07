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
  /**
   * Whether the route this points at EXISTS YET.
   *
   * The nav is written ahead of the batches that build these sections, which is
   * useful as a plan and dangerous as a header: Next prefetches every visible
   * link, so an entry for a route that does not exist fires a 404 on page load
   * and offers the reader a dead click. `planned` entries are kept here — they
   * are the map — but `SiteHeader` does not render them as links.
   *
   * Flip to `live` in the batch that ships the route, not before.
   */
  status?: 'live' | 'planned';
  /** One line explaining the section, used on the home page and in menus. */
  blurbAr: string;
  group: 'learn' | 'build' | 'software' | 'store' | 'community' | 'account' | 'admin';
  /** Signed-out users do not see it, and the server refuses it. */
  requiresAuth?: boolean;
  /** Minimum role. Enforced server-side; listed here only for menu rendering. */
  requiresRole?: PlatformRole;
}

export const NAV_ITEMS: NavItem[] = [
  // ── Learn ────────────────────────────────────────────────────────────────
  {
    id: 'lessons', labelAr: 'الدروس', href: '/lessons', group: 'learn',
    blurbAr: 'سبعة عشر درساً من الصفر حتى أول تحليق، بأسئلة تحقّق ومخطّطات تفاعلية، وتقدّمك محفوظ في متصفّحك.',
  },
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
    id: 'build', labelAr: 'البناء', href: '/build', group: 'build',
    blurbAr: 'مراحل بناء الطائرة بالترتيب، بتحذيراتها وشروط التوقف، ثم قوائم الفحص قبل أول تشغيل.',
  },
  {
    id: 'projects', labelAr: 'المشاريع', href: '/projects', group: 'build',
    blurbAr: 'مشاريع حقيقية تجمع الطيران بالذكاء الاصطناعي والرؤية الحاسوبية.',
  },
  {
    id: 'project', labelAr: 'مشروعي', href: '/project', group: 'build',
    blurbAr: 'قطعك وإعداداتك، وأحكام التوافق التي تُحسب منها.',
  },

  // ── Store ────────────────────────────────────────────────────────────────
  {
    id: 'store', labelAr: 'المتجر', href: '/store', group: 'store',
    blurbAr: 'منتجات مختارة في كل قسم، بفارق واضح بينها، ومع كل طلب خدمة إعداد.',
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
  // These three exist in the phone app and did not exist on the web at all,
  // which is why a reader had nowhere to go for «كيف أوقف هذا» or «من أنتم».
  // They are `account`-group but NOT `requiresAuth`: a signed-out visitor has
  // every reason to read the about page and to write to us.
  {
    id: 'settings', labelAr: 'الإعدادات', href: '/settings', group: 'account',
    blurbAr: 'البيانات المحفوظة في متصفّحك، وما يخصّ حسابك.',
  },
  {
    id: 'contact', labelAr: 'اتصل بنا', href: '/contact', group: 'account',
    blurbAr: 'اقتراح أو مشكلة أو سؤال أو تعاون.',
  },
  {
    id: 'about', labelAr: 'حول المنصّة', href: '/about', group: 'account',
    blurbAr: 'ما هي المنصّة، وما تلتزم به، وما لا تدّعيه.',
  },

  // ── Admin ────────────────────────────────────────────────────────────────
  {
    id: 'admin', labelAr: 'الإدارة', href: '/admin', group: 'admin',
    blurbAr: 'المستخدمون والبلاغات والمحتوى وسجلّ التدقيق.',
    requiresAuth: true, requiresRole: 'reviewer',
  },
];

/** The items shown in the primary sidebar, in order. */
/**
 * What the header actually renders.
 *
 * Excludes `planned` entries. Next prefetches every link it can see, so an
 * entry pointing at a route that has not shipped fires a 404 on every page
 * load and gives the reader a dead click — which the admin end-to-end run
 * caught as console errors on all three viewports. The entries stay in
 * NAV_ITEMS as the map of where the site is going; they become links when
 * their route exists.
 */
export const PRIMARY_NAV = NAV_ITEMS.filter(i =>
  i.group !== 'admin' && !i.requiresAuth && i.status !== 'planned');

export function navItem(id: string): NavItem | undefined {
  return NAV_ITEMS.find(i => i.id === id);
}
