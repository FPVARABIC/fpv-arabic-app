import type { Metadata, Viewport } from 'next';
// The same font package the phone app imports in src/index.css, so both
// surfaces render in literally the same Cairo files. Imported BEFORE
// globals.css so the site's own rules win any tie.
import '@fontsource-variable/cairo';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { BottomNav } from '@/components/NavTabs';
import { getSession } from '@/lib/server/session';

/**
 * The root of the web surface.
 *
 * `lang="ar" dir="rtl"` on the `<html>` element itself, exactly as the phone
 * app's index.html does it. Setting direction on a wrapper instead is the usual
 * mistake: it leaves the scrollbar, the native form controls and the browser's
 * own UI laid out left-to-right around a right-to-left page.
 *
 * The session is read HERE, once per request, on the server. The header renders
 * from it directly, so a signed-in user's first paint already shows them signed
 * in — no flash of a logged-out state, no client round-trip, and no role
 * information that came from the browser.
 */

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fpv-arabic.com'),
  title: {
    default: 'FPV بالعربي — منصة الطيران بالمنظور الأول بالعربية',
    // The same product name on every page, so a tab in a crowded browser is
    // still identifiable.
    template: '%s — FPV بالعربي',
  },
  description:
    'منصة عربية متكاملة للطيران بالمنظور الأول: موسوعة مشروحة بالمصادر، وتشخيص للأعطال، '
    + 'ومراكز برامج Betaflight وExpressLRS وEdgeTX وأنظمة الفيديو، ومشروع يحسب توافق قطعك.',
  applicationName: 'FPV بالعربي',
  authors: [{ name: 'FPV بالعربي' }],
  openGraph: {
    type: 'website',
    locale: 'ar_AR',
    siteName: 'FPV بالعربي',
    title: 'FPV بالعربي — منصة الطيران بالمنظور الأول بالعربية',
    description:
      'موسوعة وتشخيص ومراكز برامج ومجتمع — بالعربية، بمصادر موثّقة وتواريخ مراجعة.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  // The header's mint, so a mobile browser's own chrome continues the bar
  // instead of framing it in a colour the product does not use.
  themeColor: '#5EEAD4',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="ar" dir="rtl">
      <body>
        <a href="#main" className="skip-link">تخطَّ إلى المحتوى</a>
        <SiteHeader
          signedIn={!!session}
          displayName={session?.displayName ?? null}
          photoURL={session?.photoURL ?? null}
          role={session?.role ?? 'user'}
        />
        <main id="main">{children}</main>
        <SiteFooter />
        {/* The thumb-reachable tab bar. CSS hides it from 900px up, where the
            same tabs are already in the header — one component, two placements. */}
        <BottomNav />
      </body>
    </html>
  );
}
