import Link from 'next/link';
import type { Metadata } from 'next';
import {
  SOFTWARE, CATEGORY_ORDER, CATEGORY_LABEL_AR, CATEGORY_BLURB_AR,
  COVERAGE_LABEL_AR, softwareByCategory, HUB_TOTALS,
} from '@/lib/softwareHub';
import { webHref, SECTION_ROUTES } from '@/lib/webRoutes';

export const metadata: Metadata = {
  title: 'مركز البرامج',
  description:
    'البرامج التي تُعدّ بها طائرتك — Betaflight وExpressLRS وEdgeTX وأدوات الفيديو — '
    + 'مربوطة بقطعك وبأحكام التوافق وبالتشخيص، مع ذكر صريح لما لا تغطّيه المنصة.',
  alternates: { canonical: '/programming' },
  openGraph: {
    type: 'website',
    title: 'مركز البرامج — FPVARABIC',
    description: 'البرنامج ← الإعداد ← القطعة ← مشروعك ← الاختبار ← التشخيص.',
  },
};

const COVERAGE_CLASS: Record<string, string> = {
  full: 'admin-badge admin-badge-ok',
  partial: 'admin-badge admin-badge-warn',
  none: 'admin-badge',
};

/**
 * The software centre.
 *
 * WHY THE COVERAGE BADGE IS THE MOST IMPORTANT THING ON THIS PAGE
 * ---------------------------------------------------------------
 * A reader arrives asking "does this platform help me with BLHeli?". The
 * honest answer today is no, and the badge says so before they spend a click
 * finding out. Every count comes from the registries themselves, so a program
 * cannot be described as covered while its pages are empty — the number would
 * contradict the claim in the same row.
 *
 * WHY PROGRAMS WITH NO COVERAGE ARE STILL LISTED
 * ----------------------------------------------
 * Omitting them would read as "this platform has never heard of AM32", and a
 * builder would go looking for the page that does not exist. Listing them with
 * an explicit scope page is the difference between a gap and a silence.
 */
export default function ProgrammingHub() {
  const covered = SOFTWARE.filter(s => s.coverage !== 'none').length;

  return (
    <div className="shell" style={{ paddingTop: 30, paddingBottom: 46, maxWidth: 1100 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span> البرامج
      </nav>

      {/* Content first: the title, one line, then the programs themselves.
          The full explanation and the counted numbers moved BELOW the
          catalogue («عن هذا القسم») — somebody opening the software centre
          came for the software, not for a preface about it. */}
      <h1 className="page-title" style={{ margin: '14px 0 8px' }}>مركز البرامج</h1>
      <p className="page-lede" style={{ margin: '0 0 24px' }}>
        كل برنامج مغطّى يفتح على صفحاته الحقيقية — مربوطة بقطعك أنت، لا شرحاً عاماً.
      </p>

      {CATEGORY_ORDER.map(cat => (
        <section key={cat} className="admin-section" aria-labelledby={`cat-${cat}`}>
          <h2 id={`cat-${cat}`}>{CATEGORY_LABEL_AR[cat]}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-dimmer)', margin: '0 0 14px', lineHeight: 1.9 }}>
            {CATEGORY_BLURB_AR[cat]}
          </p>

          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))' }}>
            {softwareByCategory(cat).map(s => {
              const body = (
                <>
                  <div style={{ display: 'flex', gap: 9, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <span className="ltr" style={{ fontSize: 15, fontWeight: 900 }}>{s.nameEn}</span>
                    <span className={COVERAGE_CLASS[s.coverage]} data-testid={`software-coverage-${s.id}`}>
                      {COVERAGE_LABEL_AR[s.coverage]}
                      {s.coverage !== 'none' && <> · <span dir="ltr">{s.documented}</span></>}
                    </span>
                  </div>
                  <p style={{ margin: '9px 0 0', fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.95 }}>
                    {s.purposeAr}
                  </p>
                  <p style={{ margin: '9px 0 0', fontSize: 12, color: 'var(--text-dimmer)', lineHeight: 1.85 }}>
                    يخصّ: {s.appliesToAr.join(' · ')}
                  </p>
                  {s.pending > 0 && (
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--sev-warning)', lineHeight: 1.85 }}>
                      <span dir="ltr">{s.pending}</span> صفحة مسجَّلة بلا محتوى بعد — تظهر معلَّمة داخل المركز.
                    </p>
                  )}
                  {s.insteadAr && (
                    <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--text-dimmer)', lineHeight: 1.9 }}>
                      {s.insteadAr}
                    </p>
                  )}
                </>
              );

              // Covered programs resolve through the shared destination table;
              // uncovered ones open the scope page that says so. Neither URL is
              // written here — a path in a component is a second routing table.
              const target = s.destination
                ? webHref(s.destination).href
                : s.scopeId
                  ? SECTION_ROUTES.scope(s.scopeId)
                  : null;

              return target ? (
                <Link key={s.id} href={target} className="card-sm" data-testid={`software-card-${s.id}`}
                  style={{ padding: '15px 17px', display: 'block' }}>
                  {body}
                </Link>
              ) : (
                <div key={s.id} className="card-sm" data-testid={`software-card-${s.id}`} style={{ padding: '15px 17px' }}>
                  {body}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <p style={{ marginTop: 30, fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.95 }}>
        لا تعرف من أين تبدأ؟ افتح <Link href="/project" style={{ color: 'var(--accent-ink)' }}>مشروعك</Link>{' '}
        — الأحكام هناك تدلّك على الصفحة التي تخصّك،
        أو ابدأ من <Link href="/diagnose" style={{ color: 'var(--accent-ink)' }}>التشخيص</Link> إن كان شيء لا يعمل.
      </p>

      {/* ── About this section — the moved preface, after the content ────── */}
      <section aria-labelledby="about-hub-h" style={{ marginTop: 34, maxWidth: 780 }}>
        <div className="card-sm" style={{ padding: '16px 18px' }}>
          <h2 id="about-hub-h" style={{ fontSize: 14, fontWeight: 900, margin: 0 }}>عن هذا القسم</h2>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 2, margin: '9px 0 0' }}>
            ليست قائمة أسماء. كل برنامج مغطّى هنا يفتح على صفحاته الحقيقية، وكل صفحة
            تقرأ من مشروعك ما يخصّها وحده — المنفذ، أو المستقبل، أو نظام الفيديو —
            وتعرض ما ينقص وما يمنع، وتقودك إلى الدرس أو شجرة التشخيص المناسبة.
          </p>
          <p style={{ fontSize: 12.5, color: 'var(--text-dimmer)', lineHeight: 1.95, margin: '9px 0 0' }}>
            الأعداد أعلاه محسوبة من محتوى المنصة نفسه، لا مكتوبة يدوياً: {' '}
            <span dir="ltr">{HUB_TOTALS.betaflightDocumented}/{HUB_TOTALS.betaflightPages}</span> صفحة Betaflight،
            و<span dir="ltr">{HUB_TOTALS.edgetxPages}</span> صفحة EdgeTX،
            و<span dir="ltr">{HUB_TOTALS.elrsSteps}</span> خطوة و<span dir="ltr">{HUB_TOTALS.elrsIssues}</span> مشكلة في ExpressLRS،
            و<span dir="ltr">{HUB_TOTALS.videoPages}</span> صفحة لأدوات الفيديو.
            {' '}<span dir="ltr">{covered}</span> برامج مغطّاة، والباقي مذكور بصراحة كغير متاح.
          </p>
        </div>
      </section>
    </div>
  );
}
