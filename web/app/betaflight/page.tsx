import Link from 'next/link';
import type { Metadata } from 'next';
import { bfPageRegistry } from '@core/data/betaflight/pageRegistry';
import { BF_VERSION_CONTEXT } from '@core/data/betaflight/sourceHelpers';
import { webHref, SECTION_ROUTES } from '@/lib/webRoutes';

export const metadata: Metadata = {
  title: 'Betaflight — مركز البرامج',
  description:
    'صفحات Betaflight Configurator بالعربية: المنافذ، والمستقبل، والأوضاع، والمحركات، '
    + 'والحماية عند فقدان الإشارة — بأسمائها الإنجليزية الأصلية ومصادرها وإصداراتها.',
  alternates: { canonical: '/betaflight' },
  openGraph: { type: 'website', title: 'Betaflight — FPV بالعربي' },
};

const SAFETY_CLASS: Record<string, string> = {
  critical: 'admin-badge admin-badge-bad',
  warning: 'admin-badge admin-badge-warn',
  caution: 'admin-badge',
  informational: 'admin-badge',
};

const SAFETY_AR: Record<string, string> = {
  critical: 'حرج',
  warning: 'تحذير',
  caution: 'انتبه',
  informational: 'معلومة',
};

/**
 * The Betaflight centre.
 *
 * PAGES WITHOUT CONTENT ARE SHOWN AS SUCH, NOT HIDDEN
 * ---------------------------------------------------
 * The registry knows about every tab the Configurator has, and some of them
 * have no written content yet. Hiding those would make the list look complete
 * and leave a reader hunting for the Blackbox tab they can see on their own
 * screen. They are listed, marked, and not clickable — the honest shape of "we
 * know it exists and have not documented it".
 *
 * ORDER IS THE CONFIGURATOR'S OWN
 * -------------------------------
 * `officialOrder` from the registry, so the list reads in the same sequence as
 * the tabs down the side of the real program. A reader comparing the two should
 * never have to translate positions.
 */
export default function BetaflightHub() {
  const documented = bfPageRegistry.filter(p => !!p.page);
  const pending = bfPageRegistry.filter(p => !p.page);
  const connected = documented.filter(p => p.connectionState === 'connected');
  const disconnected = documented.filter(p => p.connectionState === 'disconnected');

  return (
    <div className="shell" style={{ paddingTop: 30, paddingBottom: 46, maxWidth: 1100 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span>{' '}
        <Link href={SECTION_ROUTES.programming}>البرامج</Link> <span aria-hidden>/</span> Betaflight
      </nav>

      <h1 style={{ fontSize: 27, fontWeight: 900, margin: '14px 0 8px' }}>
        <span className="ltr">Betaflight Configurator</span>
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 2, margin: '0 0 8px', maxWidth: 780 }}>
        كل صفحة هنا تحمل أسماء الحقول الإنجليزية كما تظهر في البرنامج تماماً،
        ومعناها بالعربية، ومصدرها، والإصدار الذي رُوجعت عليه. الترتيب هو ترتيب
        التبويبات في البرنامج نفسه.
      </p>
      <p style={{ fontSize: 12.5, color: 'var(--text-dimmer)', margin: '0 0 24px' }}>
        <span dir="ltr">{documented.length}</span> صفحة موثّقة من{' '}
        <span dir="ltr">{bfPageRegistry.length}</span> تبويباً مسجَّلاً — رُوجعت على
        فيرموير <span dir="ltr">{BF_VERSION_CONTEXT.firmwareVersion}</span> وبرنامج{' '}
        <span dir="ltr">{BF_VERSION_CONTEXT.appVersion}</span> بتاريخ{' '}
        <span dir="ltr">{BF_VERSION_CONTEXT.reviewedAt}</span>.
      </p>

      <Group titleAr="بعد الاتصال باللوحة" pages={connected} />
      <Group titleAr="قبل الاتصال" pages={disconnected} />

      {pending.length > 0 && (
        <section className="admin-section" aria-labelledby="bf-pending">
          <h2 id="bf-pending">تبويبات مسجَّلة بلا محتوى بعد</h2>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.95, margin: '0 0 12px' }}>
            هذه تبويبات موجودة فعلاً في البرنامج ونعرفها، ولم تُكتب لها صفحة بعد.
            مذكورة هنا كي لا تبحث عن شيء أخفيناه.
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {pending.map(p => (
              <li key={p.id} className="admin-badge" data-testid={`bf-pending-${p.id}`}>
                <span className="ltr">{p.officialTitle}</span> — {p.titleAr}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

const Group: React.FC<{ titleAr: string; pages: typeof bfPageRegistry }> = ({ titleAr, pages }) => {
  if (pages.length === 0) return null;
  return (
    <section className="admin-section" aria-labelledby={`g-${titleAr}`}>
      <h2 id={`g-${titleAr}`}>{titleAr}</h2>
      <div style={{ display: 'grid', gap: 11, gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))' }}>
        {[...pages].sort((a, b) => a.officialOrder - b.officialOrder).map(p => (
          <Link
            key={p.id}
            href={webHref({ kind: 'betaflight', id: p.id }).href ?? '#'}
            className="card-sm"
            data-testid={`bf-page-${p.id}`}
            style={{ padding: '14px 16px', display: 'block' }}
          >
            <span style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
              {/* The official English label first: it is what the reader is
                  looking at on their own screen. */}
              <span className="ltr" style={{ fontSize: 14.5, fontWeight: 900 }}>{p.officialTitle}</span>
              <span className={SAFETY_CLASS[p.safetyLevel]}>{SAFETY_AR[p.safetyLevel]}</span>
            </span>
            <span style={{ display: 'block', fontSize: 13.5, color: 'var(--text-dim)', marginTop: 5 }}>
              {p.titleAr}
            </span>
            {p.page?.summaryAr && (
              <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-dimmer)', marginTop: 7, lineHeight: 1.9 }}>
                {p.page.summaryAr}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
};
