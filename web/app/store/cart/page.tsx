import Link from 'next/link';
import type { Metadata } from 'next';
import { publicSettings } from '@/lib/store';
import { SECTION_ROUTES } from '@/lib/webRoutes';
import { CartContents } from '@/components/store/CartControls';
import { cartProductViews } from '@/lib/server/storeCatalogue';
import { StoreBanner } from '@/components/store/StorePieces';

export const metadata: Metadata = {
  title: 'السلة',
  // The basket is one person's, so it has nothing to index and nothing a
  // crawler should follow into.
  robots: { index: false, follow: false },
};

// Prices are live: an admin who re-prices something at noon must not be
// contradicted by a basket rendered at build time.
export const dynamic = 'force-dynamic';

/**
 * The basket.
 *
 * Server-rendered shell, client-rendered contents — the cart lives in the
 * reader's own browser and never reaches this response, which is the same
 * privacy property the project workspace has.
 */
export default async function CartPage() {
  // Live prices, read once here and handed to the client island. The basket
  // itself never leaves the browser; only the catalogue travels, and it travels
  // the other way.
  const catalogue = await cartProductViews();
  return (
    <div className="shell" style={{ paddingTop: 30, paddingBottom: 46, maxWidth: 760 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span>{' '}
        <Link href={SECTION_ROUTES.store}>المتجر</Link> <span aria-hidden>/</span> السلة
      </nav>

      <h1 style={{ fontSize: 26, fontWeight: 900, margin: '14px 0 0' }}>السلة</h1>

      <CartContents catalogue={catalogue} />

      <StoreBanner settings={publicSettings()} compact />
    </div>
  );
}
