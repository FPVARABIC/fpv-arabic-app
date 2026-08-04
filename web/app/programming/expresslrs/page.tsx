import Link from 'next/link';
import type { Metadata } from 'next';
import { setupSteps } from '@core/data/expresslrs/setupSteps';
import {
  troubleshootingIssues, TROUBLESHOOTING_CATEGORIES,
} from '@core/data/expresslrs/troubleshootingIssues';
import { webHref, SECTION_ROUTES } from '@/lib/webRoutes';

export const metadata: Metadata = {
  title: 'ExpressLRS — مركز البرامج',
  description:
    'إعداد ExpressLRS خطوة بخطوة وتشخيص أعطاله: تحديد الأجهزة، وبناء الفيرموير، والتحديث، '
    + 'والربط، والتوصيل بمتحكم الطيران، ثم التحقق النهائي قبل الطيران.',
  alternates: { canonical: '/programming/expresslrs' },
  openGraph: { type: 'website', title: 'ExpressLRS — FPV بالعربي' },
};

/**
 * The ExpressLRS centre's front door.
 *
 * TWO DOORS, NOT ONE LIST
 * -----------------------
 * A reader arriving here is in one of exactly two states: building a link that
 * has never worked, or holding one that stopped working. Those need opposite
 * things — an ordered curriculum you do not skip, versus a symptom index you
 * jump into at the middle — and merging them produces a page that serves
 * neither. So the split is the structure, and each door states its own size so
 * nobody clicks into forty issues expecting four.
 */
export default function ExpressLrsHub() {
  const setupHref = webHref({ kind: 'elrs-setup' }).href ?? '#';
  const issuesHref = webHref({ kind: 'elrs-issue' }).href ?? '#';
  const totalMinutes = setupSteps.reduce((n, s) => n + s.estimatedMinutes, 0);

  return (
    <div className="shell" style={{ paddingTop: 30, paddingBottom: 46, maxWidth: 900 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span>{' '}
        <Link href={SECTION_ROUTES.programming}>البرامج</Link> <span aria-hidden>/</span>{' '}
        <span className="ltr">ExpressLRS</span>
      </nav>

      <h1 style={{ fontSize: 27, fontWeight: 900, margin: '14px 0 8px' }}>
        <span className="ltr">ExpressLRS</span>
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 2, margin: '0 0 24px', maxWidth: 760 }}>
        رابط التحكم بين جهازك والطائرة. طرفاه — الوحدة في الراديو والمستقبل على
        الطائرة — يجب أن يحملا نظاماً ونطاقاً وإصداراً متوافقة، وأغلب أعطال
        «الطائرة لا تستجيب» تعود إلى أحدها. ابدأ من الباب الذي يصف حالتك.
      </p>

      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <Link href={setupHref} className="card" data-testid="elrs-door-setup"
          style={{ padding: '18px 20px', display: 'block' }}>
          <span style={{ display: 'block', fontSize: 16, fontWeight: 900 }}>الإعداد من الصفر</span>
          <span style={{ display: 'block', fontSize: 13.5, color: 'var(--text-dim)', marginTop: 8, lineHeight: 1.95 }}>
            <span dir="ltr">{setupSteps.length}</span> خطوة مرتّبة، من تحديد أجهزتك إلى
            التحقق النهائي. الترتيب ليس اقتراحاً — كل خطوة تفترض ما قبلها.
          </span>
          <span style={{ display: 'block', fontSize: 12, color: 'var(--text-dimmer)', marginTop: 8 }}>
            وقت تقديري إجمالي: <span dir="ltr">{totalMinutes}</span> دقيقة
          </span>
        </Link>

        <Link href={issuesHref} className="card" data-testid="elrs-door-troubleshooting"
          style={{ padding: '18px 20px', display: 'block' }}>
          <span style={{ display: 'block', fontSize: 16, fontWeight: 900 }}>شيء لا يعمل</span>
          <span style={{ display: 'block', fontSize: 13.5, color: 'var(--text-dim)', marginTop: 8, lineHeight: 1.95 }}>
            <span dir="ltr">{troubleshootingIssues.length}</span> عطلاً في{' '}
            <span dir="ltr">{TROUBLESHOOTING_CATEGORIES.length}</span> فئة، كل واحد
            بفحوص مرتّبة تبدأ من الأقل خطراً — فحص واحد في كل مرة.
          </span>
          <span style={{ display: 'block', fontSize: 12, color: 'var(--text-dimmer)', marginTop: 8 }}>
            ابدأ من العرَض الذي تراه، لا من السبب الذي تظنّه.
          </span>
        </Link>
      </div>

      <section className="admin-section" aria-labelledby="elrs-safety">
        <h2 id="elrs-safety">قبل أي اختبار</h2>
        <p className="card-sm" style={{ padding: '13px 15px', fontSize: 13.5, color: 'var(--sev-blocker)', lineHeight: 2, margin: 0 }}>
          انزع المراوح قبل أي تسليح أو اختبار قنوات. اختبار الرابط يعني تحريك
          العصي والطائرة مسلَّحة، وهذا أكثر ما تُصاب الأيدي فيه.
        </p>
      </section>

      <p style={{ marginTop: 26, fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.95 }}>
        الجهة الأخرى من الرابط — جهاز التحكم نفسه — في{' '}
        <Link href={webHref({ kind: 'edgetx' }).href ?? '#'} style={{ color: 'var(--accent)' }}>
          مركز EdgeTX
        </Link>
        ، وتوصيل المستقبل بمتحكم الطيران في{' '}
        <Link href={webHref({ kind: 'betaflight', id: 'ports' }).href ?? '#'} style={{ color: 'var(--accent)' }}>
          صفحة Ports
        </Link>.
      </p>
    </div>
  );
}
