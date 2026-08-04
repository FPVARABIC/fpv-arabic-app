import Link from 'next/link';
import { allKbModules } from '@core/data/kb/registry';
import { allDxTrees } from '@core/data/kb/diagnostics/trees';
import { kbTerms } from '@core/data/kb/glossary/terms';
import { allVideoToolPages } from '@core/data/video/software/registry';
import { allEdgeTxPages } from '@core/data/edgetx/registry';
import { NAV_ITEMS } from '@/lib/siteNav';
import { href } from '@/lib/webRoutes';

/**
 * The home page.
 *
 * The requirement was explicit: «لا تجعلها صفحة دعائية فارغة». So every number
 * on this page is COUNTED from the shared core at build time, not written by
 * hand — seven modules because `allKbModules.length` is seven, twenty-eight
 * trees because that is how many exist. A hand-written figure is a promise that
 * rots the first time content changes; a counted one cannot be wrong.
 *
 * It is a server component with no client JavaScript, so it is fully indexable
 * and its first paint needs no hydration.
 */

export const metadata = {
  title: 'FPVARABIC — منصة الطيران بالمنظور الأول بالعربية',
  alternates: { canonical: '/' },
};

export default function HomePage() {
  const modules = allKbModules;
  const articleCount = modules.reduce((n, m) => n + m.articles.length, 0);
  const pathCount = modules.reduce((n, m) => n + (m.paths?.length ?? 0), 0);

  const stats = [
    { n: modules.length, labelAr: 'منظومة مشروحة' },
    { n: articleCount, labelAr: 'مقالاً' },
    { n: allDxTrees.length, labelAr: 'شجرة تشخيص' },
    { n: kbTerms.length, labelAr: 'مصطلحاً في القاموس' },
    { n: pathCount, labelAr: 'مسار تعلّم' },
    { n: allEdgeTxPages.length + allVideoToolPages.length, labelAr: 'صفحة برامج' },
  ];

  return (
    <div className="shell" style={{ paddingTop: 44, paddingBottom: 20 }}>
      {/* ── What this is ─────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 760 }}>
        <h1 style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.4, margin: 0 }}>
          الطيران بالمنظور الأول،{' '}
          <span style={{ color: 'var(--accent-ink)' }}>بالعربية</span>، بمصادر وتواريخ مراجعة
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-dim)', marginTop: 16, lineHeight: 1.95 }}>
          منصة واحدة على الهاتف والويب: موسوعة تشرح المبدأ قبل الخطوة، وتشخيص يبدأ من العرَض
          الذي تراه بترتيب فحص يبدأ من الأقل خطراً، ومراكز برامج مربوطة بقطعك أنت، ومجتمع
          يسأل فيه الطيارون. الحساب نفسه، والمشروع نفسه، والمحتوى نفسه — أينما فتحتها.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
          <Link href="/kb" className="btn-primary">ابدأ من الموسوعة</Link>
          <Link href="/diagnose" className="btn-ghost">عندي مشكلة الآن</Link>
          <Link href="/search" className="btn-ghost">ابحث</Link>
        </div>
      </section>

      {/* ── Counted, not claimed ─────────────────────────────────────────── */}
      <section aria-label="حجم المحتوى" style={{ marginTop: 40 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 12,
          }}
        >
          {stats.map(s => (
            <div key={s.labelAr} className="card-sm" style={{ padding: '16px 18px' }}>
              <div
                style={{ fontSize: 26, fontWeight: 900, color: 'var(--accent-ink)' }}
                dir="ltr"
              >
                {s.n}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 2 }}>
                {s.labelAr}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── The systems, straight from the registry ──────────────────────── */}
      <section style={{ marginTop: 52 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>المنظومات</h2>
          <Link href="/kb" style={{ fontSize: 13, color: 'var(--accent-ink)' }}>
            كل الموسوعة ←
          </Link>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 14,
          }}
        >
          {modules.map(m => {
            const to = href({ kind: 'module', id: m.id });
            if (!to) return null;
            return (
              <Link
                key={m.id}
                href={to}
                className="card"
                data-testid={`home-module-${m.id}`}
                style={{ padding: '18px 20px', display: 'block' }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>{m.titleAr}</h3>
                <p
                  className="ltr"
                  style={{ fontSize: 11.5, color: 'var(--text-dimmer)', margin: '3px 0 0' }}
                >
                  {m.titleEn}
                </p>
                <p
                  style={{
                    fontSize: 13, color: 'var(--text-dim)', margin: '10px 0 0',
                    lineHeight: 1.85,
                  }}
                >
                  {m.summaryAr}
                </p>
                <p style={{ fontSize: 11.5, color: 'var(--text-dimmer)', margin: '10px 0 0' }}>
                  {m.articles.length} مقالاً · روجعت {m.lastReviewed}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Where to go ──────────────────────────────────────────────────── */}
      <section style={{ marginTop: 52 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 16 }}>أقسام المنصة</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 12,
          }}
        >
          {/* `status !== 'planned'` — a card for a route that does not exist is a
              dead click and a prefetched 404. The entries return here when
              their batch ships them. */}
          {NAV_ITEMS.filter(i => !i.requiresAuth && !i.requiresRole && i.status !== 'planned').map(i => (
            <Link
              key={i.id}
              href={i.href}
              className="card-sm"
              data-testid={`home-nav-${i.id}`}
              style={{ padding: '15px 17px', display: 'block' }}
            >
              <h3 style={{ fontSize: 14.5, fontWeight: 800, margin: 0 }}>{i.labelAr}</h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '6px 0 0', lineHeight: 1.8 }}>
                {i.blurbAr}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Honest about what this is ────────────────────────────────────── */}
      <section style={{ marginTop: 52, maxWidth: 760 }}>
        <div className="card" style={{ padding: '20px 22px' }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>كيف يُكتب المحتوى هنا</h2>
          <ul
            style={{
              margin: '12px 0 0', padding: 0, listStyle: 'none',
              display: 'grid', gap: 9,
            }}
          >
            {[
              'كل مقال يذكر مصادره وإصداراتها وتاريخ مراجعتها — لا معلومة بلا أصل.',
              'ما لا نعرفه يُقال صراحةً: لا نخترع Pinout ولا جدول قنوات ولا توافق أجيال.',
              'إجراءات التشخيص تبدأ دائماً بالفحص الأقل خطراً، والمراوح منزوعة.',
              'الأحكام تمتنع عن الحكم حين تنقص البيانات، بدل أن تخمّن.',
            ].map(t => (
              <li key={t} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                <span
                  aria-hidden
                  style={{
                    width: 5, height: 5, borderRadius: 999, background: 'var(--accent-ink)',
                    marginTop: 10, flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.9 }}>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
