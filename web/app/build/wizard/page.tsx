import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { BuildWizardClient } from '@/components/build/BuildWizardClient';

export const metadata: Metadata = {
  title: 'مسار البناء',
  description: 'المسار التفاعلي: اختيار القطع، فحص التوافق، بوابات السلامة، وأول طيران.',
  // The wizard renders the reader's own draft — nothing here for a crawler.
  robots: { index: false, follow: false },
};

/**
 * The wizard's page shell — server-rendered frame, client island inside.
 *
 * The Suspense boundary exists because the wizard reads its `mode` from the
 * URL through `useSearchParams`, which Next requires to be wrapped when the
 * page itself is otherwise static.
 */
export default function BuildWizardPage() {
  return (
    <div className="shell" style={{ paddingTop: 26, paddingBottom: 44 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span>{' '}
        <Link href="/build">البناء</Link> <span aria-hidden>/</span> المسار
      </nav>
      <h1 className="sr-only">مسار البناء التفاعلي</h1>
      <div style={{ marginTop: 16 }}>
        <Suspense fallback={
          <p className="card-sm" style={{ padding: '18px 20px' }}>جارٍ فتح مسار البناء…</p>
        }>
          <BuildWizardClient />
        </Suspense>
      </div>
    </div>
  );
}
