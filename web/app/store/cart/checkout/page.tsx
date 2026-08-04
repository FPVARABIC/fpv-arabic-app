import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession } from '@/lib/server/session';
import { publicStoreSettings } from '@/lib/server/storeSettings';
import { SECTION_ROUTES } from '@/lib/webRoutes';
import { cartHref } from '@/lib/store';
import { CheckoutForm } from '@/components/store/CheckoutForm';
import { cartProductViews } from '@/lib/server/storeCatalogue';
import { StoreBanner } from '@/components/store/StorePieces';

export const metadata: Metadata = {
  title: 'إتمام الطلب',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Checkout.
 *
 * SIGN-IN IS CHECKED ON THE SERVER, BEFORE ANYTHING RENDERS
 * ---------------------------------------------------------
 * Not because the form would break without it, but because the order is
 * attached to an account and a customer who fills in an address only to be told
 * afterwards has been wasted. The server action checks again — this redirect is
 * a courtesy, that check is the boundary.
 */
export default async function CheckoutPage() {
  const session = await getSession();
  if (!session) {
    redirect(`/signin?next=${encodeURIComponent(`${SECTION_ROUTES.store}/cart/checkout`)}`);
  }

  const [catalogue, settings] = await Promise.all([cartProductViews(), publicStoreSettings()]);

  return (
    <div className="shell" style={{ paddingTop: 30, paddingBottom: 46, maxWidth: 720 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href={SECTION_ROUTES.store}>المتجر</Link> <span aria-hidden>/</span>{' '}
        <Link href={cartHref()}>السلة</Link> <span aria-hidden>/</span> إتمام الطلب
      </nav>

      <h1 style={{ fontSize: 26, fontWeight: 900, margin: '14px 0 6px' }}>إتمام الطلب</h1>
      <p style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.95, margin: 0 }}>
        لا دفع إلكتروني في هذه المرحلة. نستلم طلبك، ونؤكّد التوفّر والشحن معك،
        ثم نتّفق على الدفع.
      </p>

      <CheckoutForm catalogue={catalogue} />

      <StoreBanner settings={settings} compact />
    </div>
  );
}
