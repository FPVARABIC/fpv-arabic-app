import type { Metadata, Viewport } from 'next';
// The same font package the phone app imports in src/index.css, so both
// surfaces render in literally the same Cairo files. Imported BEFORE
// globals.css so the site's own rules win any tie.
import '@fontsource-variable/cairo';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { BottomNav } from '@/components/NavTabs';
import { siteOrigin, isCanonicalOrigin } from '@/lib/siteOrigin';
import { BRAND_NAME, BRAND_TITLE_AR, BRAND_TITLE_SUFFIX } from '@core/data/brand';
import { isStagingEnvironment, STAGING_BADGE_AR } from '@/lib/staging';

/**
 * The root of the web surface.
 *
 * `lang="ar" dir="rtl"` on the `<html>` element itself, exactly as the phone
 * app's index.html does it. Setting direction on a wrapper instead is the usual
 * mistake: it leaves the scrollbar, the native form controls and the browser's
 * own UI laid out left-to-right around a right-to-left page.
 *
 * The session is deliberately NOT read here. One `cookies()` in the root
 * layout makes every route request-rendered the moment the environment is
 * configured — the sentinel-credential build proved it, taking the site from
 * 260 prerendered pages to one. The header's account corner hydrates in the
 * browser instead (see HeaderSession); every real gate stays server-side on
 * its own page, where `requireCapability` runs per request as it always did.
 */

const DESCRIPTION =
  'منصّة عربية متكاملة للطيران بالمنظور الأول: موسوعة مشروحة بالمصادر، وتشخيص للأعطال، '
  + 'ومراكز برامج Betaflight وExpressLRS وEdgeTX وأنظمة الفيديو، ومتجر مراجَع، ومجتمع.';

export const metadata: Metadata = {
  // `siteOrigin()` rather than a literal: a preview deployment must produce
  // canonical URLs and Open Graph cards that point at ITSELF. A preview whose
  // cards point at production is a preview that sends its own traffic away —
  // and worse, it invites a search engine to index the preview's content under
  // the live site's URLs.
  metadataBase: new URL(siteOrigin()),
  title: {
    default: BRAND_TITLE_AR,
    // The same product name on every page, so a tab in a crowded browser is
    // still identifiable — and it goes at the END, because that is the part a
    // narrow tab still shows.
    template: `%s${BRAND_TITLE_SUFFIX}`,
  },
  description: DESCRIPTION,
  applicationName: BRAND_NAME,
  authors: [{ name: BRAND_NAME }],
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'ar_AR',
    siteName: BRAND_NAME,
    title: BRAND_TITLE_AR,
    description: DESCRIPTION,
    url: '/',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: BRAND_TITLE_AR }],
  },
  twitter: {
    card: 'summary_large_image',
    title: BRAND_TITLE_AR,
    description: DESCRIPTION,
    images: ['/og.png'],
  },
  alternates: { canonical: '/' },
  // Indexing is allowed only on the canonical origin. Every other deployment —
  // a preview, a branch build, a staging host — is told not to index, so the
  // official site is never competing with a copy of itself in search results.
  robots: isCanonicalOrigin()
    ? { index: true, follow: true }
    : { index: false, follow: false },
};

export const viewport: Viewport = {
  // The header's mint, so a mobile browser's own chrome continues the bar
  // instead of framing it in a colour the product does not use.
  themeColor: '#5EEAD4',
  width: 'device-width',
  initialScale: 1,
  // Lets the page extend under notches and home indicators, which is what
  // makes the `env(safe-area-inset-*)` paddings on the bottom bar actually
  // receive non-zero values on the phones that need them.
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <a href="#main" className="skip-link">تخطَّ إلى المحتوى</a>
        {/* In the layout, above the header, so it appears on EVERY page — a
            badge only the home page carries is one somebody deep-links past.
            It is not dismissible: the moment it can be closed, the person most
            likely to close it is the one about to forget which site they are
            on. */}
        {isStagingEnvironment() && (
          <p className="staging-badge" role="status" data-testid="staging-badge">
            {STAGING_BADGE_AR}
          </p>
        )}
        {/* No session read here, and that is load-bearing: one `cookies()`
            in the root layout makes EVERY route request-rendered the moment
            the environment is configured. The account corner hydrates
            client-side instead; every real gate stays server-side on its own
            page. */}
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        {/* The thumb-reachable tab bar. CSS hides it from 900px up, where the
            same tabs are already in the header — one component, two placements. */}
        <BottomNav />
      </body>
    </html>
  );
}
