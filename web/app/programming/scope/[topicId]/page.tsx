import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { SOFTWARE_SCOPE, softwareScope } from '@core/data/software/scope';
import { SECTION_ROUTES } from '@/lib/webRoutes';
import { Note, Links, Sources } from '@/components/software/SoftwareBlocks';

export const dynamicParams = false;

export function generateStaticParams() {
  return SOFTWARE_SCOPE.map(s => ({ topicId: s.id }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ topicId: string }> },
): Promise<Metadata> {
  const { topicId } = await params;
  const scope = softwareScope(topicId);
  if (!scope) return { title: 'صفحة غير موجودة', robots: { index: false, follow: false } };
  return {
    title: scope.titleAr,
    description: `${scope.whatItIsAr} — ${scope.whyAr}`.slice(0, 160),
    alternates: { canonical: SECTION_ROUTES.scope(scope.id) },
    openGraph: {
      type: 'article',
      title: `${scope.titleAr} — FPVARABIC`,
      description: scope.whatItIsAr.slice(0, 160),
    },
  };
}

/**
 * An honest answer to "do you cover this program?", when the answer is no.
 *
 * WHY THIS PAGE EXISTS RATHER THAN A 404 OR A STUB
 * -------------------------------------------------
 * A reader looking for BLHeliSuite gets one of three things. A 404 tells them
 * nothing and implies the platform has never heard of it. A stub — three
 * paragraphs that look like coverage — is worse, because it ends their search
 * with nothing useful. This page is the third: what the program is, who actually
 * needs it, what this platform DOES have that is relevant, what it genuinely
 * lacks, why, and the official documentation to go read instead.
 *
 * That is a complete answer. It is just not a yes.
 *
 * NOTHING HERE IS WRITTEN IN THIS FILE
 * ------------------------------------
 * Every word comes from `src/data/software/scope.ts`, so «هل تدعمون INAV؟» has
 * the same answer on the phone, in search, and from any future answering layer,
 * and updating it when coverage lands is one edit in the core rather than a hunt
 * through page components.
 */
export default async function SoftwareScopePage(
  { params }: { params: Promise<{ topicId: string }> },
) {
  const { topicId } = await params;
  const scope = softwareScope(topicId);
  if (!scope) notFound();

  return (
    <div className="shell" style={{ paddingTop: 30, paddingBottom: 46, maxWidth: 820 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span>{' '}
        <Link href={SECTION_ROUTES.programming}>البرامج</Link> <span aria-hidden>/</span>{' '}
        <span className="ltr">{scope.nameEn}</span>
      </nav>

      <header style={{ margin: '14px 0 6px' }}>
        <h1 style={{ fontSize: 25, fontWeight: 900, margin: 0, lineHeight: 1.5 }}>{scope.titleAr}</h1>
        <p className="ltr" style={{ margin: '7px 0 0', fontSize: 14, color: 'var(--text-dim)' }}>
          {scope.nameEn}
        </p>
      </header>

      {/* The verdict, before anything else. Nobody should have to scroll to
          learn that the answer is no. */}
      <p className="card" data-testid="scope-verdict"
        style={{ padding: '15px 17px', marginTop: 16, fontSize: 14, lineHeight: 2, color: 'var(--sev-warning)' }}>
        هذه الصفحة تقول ما لا نغطّيه، بصراحة. لا يوجد شرح لهذا البرنامج في المنصة،
        وما تجده أدناه هو ما نملكه فعلاً مما يتّصل به، وأين تذهب لما لا نملكه.
      </p>

      <section className="admin-section" aria-labelledby="scope-what">
        <h2 id="scope-what">ما هو</h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-dim)', lineHeight: 2 }}>{scope.whatItIsAr}</p>
        <p style={{ margin: '12px 0 0', fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.95 }}>
          <strong>من يحتاجه:</strong> {scope.whoNeedsItAr}
        </p>
      </section>

      <section className="admin-section" aria-labelledby="scope-have">
        <h2 id="scope-have">ما تملكه المنصة مما يتّصل به</h2>
        {scope.weHaveAr.length > 0 ? (
          <ul style={{ margin: 0, paddingInlineStart: 20, display: 'grid', gap: 7 }} data-testid="scope-have">
            {scope.weHaveAr.map((t, i) => (
              <li key={i} style={{ fontSize: 13.5, lineHeight: 1.95, color: 'var(--text-dim)' }}>{t}</li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.95 }}
            data-testid="scope-have-nothing">
            لا شيء. لا توجد في المنصة مادة تتّصل بهذا البرنامج، ولا نريد إيهامك بغير ذلك.
          </p>
        )}
      </section>

      <section className="admin-section" aria-labelledby="scope-missing">
        <h2 id="scope-missing">ما لا تملكه</h2>
        <ul style={{ margin: 0, paddingInlineStart: 20, display: 'grid', gap: 7 }} data-testid="scope-missing">
          {scope.weDoNotHaveAr.map((t, i) => (
            <li key={i} style={{ fontSize: 13.5, lineHeight: 1.95, color: 'var(--sev-warning)' }}>{t}</li>
          ))}
        </ul>
      </section>

      <Note titleAr="لماذا" textAr={scope.whyAr} />
      <Note titleAr="أين تذهب بدلاً من ذلك" textAr={scope.goInsteadAr} />

      <Links titleAr="روابط تنفع فعلاً" links={scope.links} />
      <Sources sources={scope.sources} reviewedAt={scope.reviewedAt} />

      <p style={{ marginTop: 26, fontSize: 13 }}>
        <Link href={SECTION_ROUTES.programming} className="btn-ghost">← كل البرامج</Link>
      </p>
    </div>
  );
}
