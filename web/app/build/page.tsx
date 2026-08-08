import type { Metadata } from 'next';
import Link from 'next/link';
import { PART_CATEGORY_MAP } from '@core/data/project/store';
import { droneTypes } from '@core/data/assembly/droneTypes';
import { BUILD_PATH, TOTAL_BUILD_STEPS, GATE_STEP_IDS } from '@/lib/build/path';
import { SAFETY_GATES } from '@/lib/build/gates';
import { BuildResume } from '@/components/build/BuildResume';

export const metadata: Metadata = {
  title: 'البناء — ابنِ درونك خطوة بخطوة',
  description:
    'نظام إرشادي تفاعلي لبناء درون FPV: من اختيار القطع وفحص توافقها إلى '
    + 'اللحام والإعداد البرمجي وبوابات السلامة وأول طيران.',
  alternates: { canonical: '/build' },
};

/**
 * /build — the landing. Its one job is the three doors.
 *
 * WHY THE WIZARD IS NOT ON THIS PAGE
 * ----------------------------------
 * «عند فتح قسم البناء لا ترمِ المستخدم داخل عشرات الخيارات» — the landing is
 * server-rendered, indexable, and offers exactly three ways in plus the path
 * overview. The wizard itself is a client island on /build/wizard, because it
 * reads the reader's own draft from their browser.
 *
 * EVERY NUMBER IS COUNTED
 * -----------------------
 * Parts, categories, steps, gates and gate items are all counted from the
 * shared core and the path definition at build time — the same rule the home
 * page follows, for the same reason: a written figure is a promise that rots.
 */
export default function BuildPage() {
  const categoryCount = Object.keys(PART_CATEGORY_MAP).length;
  const partCount = Object.values(PART_CATEGORY_MAP).reduce((n, list) => n + list.length, 0);
  const gateItemCount = SAFETY_GATES.reduce((n, g) => n + g.items.length, 0);

  const modes = [
    {
      id: 'guided',
      titleAr: 'ساعدني في اختيار كل شيء',
      bodyAr:
        'لأول بناء: أسئلة قليلة عن هدفك وميزانيتك، ثم مسار كامل يقترح كل قطعة '
        + 'ويشرح لماذا — حتى أول طيران آمن.',
      ctaAr: 'ابدأ من الصفر',
    },
    {
      id: 'parts',
      titleAr: 'لدي بعض القطع',
      bodyAr:
        'سجّل ما تملكه — من الكتالوج أو باسمه — ونكمل بقية المنظومة حوله، '
        + 'مع فحص التوافق على كل إضافة.',
      ctaAr: 'أكمل ما عندي',
    },
    {
      id: 'advanced',
      titleAr: 'أريد بناءً متقدماً',
      bodyAr:
        'كل الخيارات ظاهرة بلا ترشيح، وأنت من يقرر — ومحرك التوافق يراجع '
        + 'خلفك ويقول رأيه بالسبب والدليل.',
      ctaAr: 'افتح التحكم الكامل',
    },
  ];

  const phases = [
    { titleAr: 'الاختيار', stepsAr: BUILD_PATH.filter(s => s.number <= 10) },
    { titleAr: 'التحقق', stepsAr: BUILD_PATH.filter(s => s.number > 10 && s.number <= 12) },
    { titleAr: 'التنفيذ', stepsAr: BUILD_PATH.filter(s => s.number > 12 && s.number <= 16) },
    { titleAr: 'التشغيل الآمن', stepsAr: BUILD_PATH.filter(s => s.number > 16) },
  ];

  return (
    <div className="shell" style={{ paddingTop: 36, paddingBottom: 44 }}>
      {/* ── What this is ─────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 780 }}>
        <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
          <Link href="/">الرئيسية</Link> <span aria-hidden>/</span> البناء
        </nav>
        <h1 style={{ fontSize: 32, fontWeight: 900, lineHeight: 1.45, margin: '12px 0 0' }}>
          ابنِ درونك — <span style={{ color: 'var(--accent-ink)' }}>من اختيار القطع إلى أول طيران</span>
        </h1>
        <p style={{ fontSize: 15.5, color: 'var(--text-dim)', marginTop: 14, lineHeight: 1.95 }}>
          ليست صفحة مقال: مسار تفاعلي من <span dir="ltr">{TOTAL_BUILD_STEPS}</span> خطوة
          يمشي معك — يقترح القطعة ويقول لماذا، ويفحص التوافق الكهربائي والميكانيكي
          بمحرك أحكام يشرح كل حكم بسببه ودليله، ويقف عند بوابات السلامة قبل أن
          تلمس البطارية. وما لا نملك مواصفته الموثقة نقوله صراحةً:
          «تحتاج المواصفة إلى تحقق من الشركة المصنّعة» — لا تخمين.
        </p>
        <p style={{ fontSize: 12.5, color: 'var(--text-dimmer)', marginTop: 10 }} data-testid="build-counts">
          <span dir="ltr">{partCount}</span> قطعة موثقة في{' '}
          <span dir="ltr">{categoryCount}</span> فئة ·{' '}
          <span dir="ltr">{droneTypes.length}</span> أنواع بناء ·{' '}
          <span dir="ltr">{GATE_STEP_IDS.length}</span> بوابات سلامة بـ
          <span dir="ltr">{gateItemCount}</span> فحصاً إلزامياً
        </p>
        <BuildResume />
      </section>

      {/* ── The three doors ──────────────────────────────────────────────── */}
      <section aria-labelledby="modes-h" style={{ marginTop: 40 }}>
        <h2 id="modes-h" style={{ fontSize: 21, fontWeight: 900, margin: '0 0 14px' }}>
          ماذا تريد أن تبني؟
        </h2>
        <div className="pillar-grid">
          {modes.map(m => (
            <Link
              key={m.id}
              href={`/build/wizard?mode=${m.id}`}
              className="card pillar"
              data-testid={`build-mode-${m.id}`}
            >
              <h3 style={{ fontSize: 17, fontWeight: 900, margin: 0 }}>{m.titleAr}</h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.9, margin: '10px 0 0', flex: 1 }}>
                {m.bodyAr}
              </p>
              <span className="pillar-cta">{m.ctaAr} ←</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── The path, so nobody starts blind ─────────────────────────────── */}
      <section aria-labelledby="path-h" style={{ marginTop: 44 }}>
        <h2 id="path-h" style={{ fontSize: 21, fontWeight: 900, margin: '0 0 6px' }}>
          المسار كاملاً — <span dir="ltr">{TOTAL_BUILD_STEPS}</span> خطوة
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 16px', lineHeight: 1.9 }}>
          ترى تقدمك في كل خطوة، وترجع بلا فقدان اختيارات، وتقف البوابات الحمراء
          بينك وبين أي قفزة خطرة.
        </p>
        <div style={{
          display: 'grid', gap: 12,
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        }}>
          {phases.map(phase => (
            <div key={phase.titleAr} className="card-sm" style={{ padding: '15px 17px' }}>
              <h3 style={{ fontSize: 13.5, fontWeight: 900, margin: '0 0 8px', color: 'var(--accent-ink)' }}>
                {phase.titleAr}
              </h3>
              <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 5 }}>
                {phase.stepsAr.map(s => (
                  <li key={s.id} style={{ display: 'flex', gap: 8, fontSize: 12.5, lineHeight: 1.8 }}>
                    <span dir="ltr" style={{ fontWeight: 900, color: 'var(--text-dimmer)', minWidth: 18 }}>
                      {s.number}
                    </span>
                    <span>
                      {s.titleAr}
                      {s.kind === 'gate' && (
                        <span className="admin-badge admin-badge-warn"
                          style={{ marginInlineStart: 6, fontSize: 9.5 }}>
                          بوابة سلامة
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* ── The safety stance, stated before anyone starts ───────────────── */}
      <section aria-labelledby="safety-h" style={{ marginTop: 44, maxWidth: 780 }}>
        <div className="card" style={{ padding: '20px 22px' }}>
          <h2 id="safety-h" style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>
            السلامة ليست فقرة في النهاية
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.95, margin: '10px 0 0' }}>
            المسار لا يسمح بالقفز من تركيب القطع إلى أول طيران: فحص اللحام
            والقطبية بالـMultimeter وSmoke Stopper قبل أي بطارية، والمراوح منزوعة
            في أي اختبار محركات، وFailsafe يُضبط ويُختبر قبل أن يُحتاج — كل بوابة
            قائمة تُؤكَّد بنداً بنداً، ولا يفتح «التالي» قبل اكتمالها.
          </p>
        </div>
      </section>

      {/* ── Where the rest of the platform plugs in ──────────────────────── */}
      <section aria-labelledby="links-h" style={{ marginTop: 40 }}>
        <h2 id="links-h" style={{ fontSize: 16, fontWeight: 900, margin: '0 0 12px' }}>
          البناء موصول ببقية المنصّة
        </h2>
        <div style={{
          display: 'grid', gap: 12,
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        }}>
          {[
            { href: '/project', titleAr: 'بناءي (مشروعي)', bodyAr: 'قطعك وأحكام التوافق وسجلا التحكم والفيديو — مساحة عملك الدائمة.' },
            { href: '/kb', titleAr: 'الموسوعة', bodyAr: 'حين تحتاج فهم قطعة قبل اختيارها — المبدأ قبل الخطوة.' },
            { href: '/programming', titleAr: 'البرامج', bodyAr: 'Betaflight والريسيفر والفيديو — خطوة الإعداد ترسلك للصفحة الصحيحة.' },
            { href: '/projects', titleAr: 'المشاريع', bodyAr: 'بعد أول طيران: مشاريع كاملة مراجَعة تبني عليها.' },
          ].map(l => (
            <Link key={l.href} href={l.href} className="card-sm" data-testid={`build-link-${l.href.replace(/\//g, '')}`}
              style={{ padding: '15px 17px', display: 'block' }}>
              <h3 style={{ fontSize: 14, fontWeight: 900, margin: 0 }}>{l.titleAr}</h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.85, margin: '7px 0 0' }}>
                {l.bodyAr}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
