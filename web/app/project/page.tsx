import type { Metadata } from 'next';
import Link from 'next/link';
import { ProjectClient } from '@/components/project/ProjectClient';

export const metadata: Metadata = {
  title: 'مشروعي',
  description: 'قطعك وإعداداتك وأحكام التوافق المحسوبة منها، مع ما ينقص وما يمنع.',
  // A project is private and lives only in this browser. There is nothing here
  // for a crawler to index, and a robots directive says so rather than relying
  // on the page happening to be empty for an anonymous fetch.
  robots: { index: false, follow: false },
};

/**
 * The project workspace's page shell.
 *
 * A SERVER SHELL AROUND A CLIENT ISLAND
 * -------------------------------------
 * The project lives in localStorage — the existing storage contract, which this
 * batch deliberately does not replace — so it can only be read in the browser.
 * The heading, the explanation, the breadcrumb and the metadata are
 * server-rendered; the workspace itself loads on the client through
 * `ProjectClient`, which is where the `ssr: false` boundary lives.
 *
 * WHY THERE IS NOW AN EXPLANATION ABOVE THE ISLAND
 * ------------------------------------------------
 * Because without one this page was, in the owner's words, «فارغة تماماً».
 * The whole workspace sat behind `ssr: false`, so everything a visitor could
 * learn about the feature — what it is, what it gives them, how to start —
 * lived in JavaScript. Anyone arriving before that JavaScript ran, or in the
 * static review copy where it never runs, met a heading and the word
 * «جارٍ فتح مساحة العمل…» and nothing else. A page whose only content is a
 * spinner is indistinguishable from a broken one.
 *
 * So the ANSWER to «ما هذا وماذا أفعل به» is server-rendered and always
 * present, and the interactive workspace loads underneath it. The explanation
 * is not a placeholder that the island replaces — it is correct whether or not
 * a project exists, and it stays.
 */

/** What the feature is FOR, in the order a newcomer asks it. */
const VALUE_POINTS: { titleAr: string; bodyAr: string }[] = [
  {
    titleAr: 'سجّل قطعك مرّة واحدة',
    bodyAr:
      'متحكّم الطيران، الـESC، المحركات، الريسيفر، الكاميرا، المرسل — ما تعرفه '
      + 'الآن يكفي للبدء، وما لا تعرفه تتركه فارغاً.',
  },
  {
    titleAr: 'اقرأ أحكام التوافق',
    bodyAr:
      'تُحسب من قطعك أنت: ما الذي يعمل معاً، وما الذي يمنع الطيران، وما الذي '
      + 'ينقص للحكم — بالسبب والدليل ودرجة الثقة، لا بنعم/لا.',
  },
  {
    titleAr: 'اربط الإعداد بالتشخيص',
    bodyAr:
      'صفحات Betaflight وExpressLRS والتشخيص تصبح مربوطة بقطعك بدل أن تكون '
      + 'شرحاً عاماً لأجهزة لا تملكها.',
  },
];

export default function ProjectPage() {
  return (
    <div className="shell" style={{ paddingTop: 30, paddingBottom: 44, maxWidth: 1100 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span> مشروعي
      </nav>

      <h1 style={{ fontSize: 27, fontWeight: 900, margin: '14px 0 8px' }}>مشروعي</h1>
      <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 2, margin: '0 0 22px', maxWidth: 760 }}>
        هذه ليست قائمة قطع. المنصة تقرأ ما سجّلته وتحسب منه أحكام التوافق نفسها
        التي يحسبها التطبيق — بالسبب، والدليل، ودرجة الثقة، وما ينقص للحكم. حين
        لا تكفي البيانات تقول ذلك صراحةً بدل أن تفترض.
      </p>

      {/* Server-rendered, so it is here with or without JavaScript. */}
      <section
        aria-labelledby="project-what-h"
        data-testid="project-explainer"
        style={{ marginBottom: 26 }}
      >
        <h2 id="project-what-h" className="sr-only">ما الذي يفعله «مشروعي»</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 12,
          }}
        >
          {VALUE_POINTS.map((v, i) => (
            <div key={v.titleAr} className="card-sm" style={{ padding: '16px 18px' }}>
              <p
                style={{
                  margin: 0, fontSize: 11, fontWeight: 800,
                  color: 'var(--accent-ink)',
                }}
                dir="ltr"
              >
                {i + 1}
              </p>
              <h3 style={{ fontSize: 14.5, fontWeight: 900, margin: '4px 0 0' }}>{v.titleAr}</h3>
              <p
                style={{
                  fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.9,
                  margin: '7px 0 0',
                }}
              >
                {v.bodyAr}
              </p>
            </div>
          ))}
        </div>

        <p
          style={{
            fontSize: 12.5, color: 'var(--text-dimmer)', lineHeight: 1.9,
            margin: '14px 0 0', maxWidth: 760,
          }}
        >
          مشروعك محفوظ في هذا المتصفّح وحده — لا يُرفع إلى خادم ولا يظهر لأحد. لذلك
          لن تجده إذا فتحت المنصّة من متصفّح أو جهاز آخر؛ انقله بالتصدير والاستيراد.
        </p>
      </section>

      <ProjectClient />
    </div>
  );
}
