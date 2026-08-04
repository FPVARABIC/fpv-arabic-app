import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Shield, AlertCircle, Library, Wrench, Store, Users, Search, CircuitBoard,
} from 'lucide-react';
import { getSession } from '@/lib/server/session';
import { AccountRail } from '@/components/AccountRail';

export const metadata: Metadata = {
  title: 'حول المنصّة',
  description:
    'ما هي FPVARABIC، وما الذي تلتزم به: مصادر موثّقة، وتواريخ مراجعة، ولا ادّعاء '
    + 'انتماء لأي شركة مصنّعة.',
  alternates: { canonical: '/about' },
};

/**
 * About — the app's screen, told as this product tells things.
 *
 * WHY IT IS NOT A GENERIC «ABOUT US» PAGE
 * ---------------------------------------
 * The shop's owner asked for exactly that, and they were right to: an about
 * page that opens with a mission statement and a stock photo says nothing a
 * reader can check. This one is built from the two things the app's own about
 * screen leads with — what the product IS, and what it explicitly does NOT
 * claim — plus the editorial rules the encyclopedia is actually held to.
 *
 * Every claim on this page is one the reader can verify somewhere else on the
 * site: the source lines under the articles, the review dates, the audit notes
 * in the shop. That is deliberate. A page that only asserts trustworthiness is
 * the least trustworthy page on a site.
 *
 * The two disclaimers are carried over WORD FOR WORD from `src/views/
 * AboutView.tsx`, because they are legal-adjacent statements and rewriting
 * them prettier is how their meaning drifts.
 */

const PILLARS = [
  {
    Icon: Library,
    title: 'الموسوعة',
    body: 'سبع منظومات مشروحة من المبدأ إلى العطل. كل رقم فيها له مصدر وتاريخ مراجعة، '
      + 'وما لم نتأكّد منه مكتوب أنه غير مؤكَّد بدل أن يُخمَّن.',
    href: '/kb',
  },
  {
    Icon: Search,
    title: 'البحث والتشخيص',
    body: 'محرّك واحد يصل إلى المقالات والمصطلحات وصفحات البرامج. والتشخيص يبدأ من '
      + 'العرَض الذي تراه، بترتيب فحص يبدأ من الأقلّ خطراً.',
    href: '/search',
  },
  {
    Icon: CircuitBoard,
    title: 'مراكز البرامج',
    body: 'Betaflight وExpressLRS وEdgeTX وأنظمة الفيديو — مشروحة بالعربية ومربوطة '
      + 'بقطعك، لا مترجمة عن قوائم البرنامج.',
    href: '/programming',
  },
  {
    Icon: Wrench,
    title: 'مشروعك',
    body: 'قطعك وإعداداتك في مكان واحد، وأحكام التوافق محسوبة منها — مع ذكر ما لا '
      + 'نستطيع الحكم عليه.',
    href: '/project',
  },
  {
    Icon: Store,
    title: 'المتجر',
    body: 'منتجات مختارة ومراجَعة واحداً واحداً مقابل صفحات المصنّعين، بفارق واضح بين '
      + 'كلّ خيار والذي بجانبه.',
    href: '/store',
  },
  {
    Icon: Users,
    title: 'المجتمع',
    body: 'أسئلة الطيارين ومشاريعهم. محتوى يكتبه المستخدمون، منفصل عن الموسوعة '
      + 'المراجَعة — والفرق بينهما مكتوب في كل صفحة.',
    href: '/community',
  },
];

export default async function AboutPage() {
  const session = await getSession();

  return (
    <div className="shell" style={{ paddingTop: 34, paddingBottom: 56 }}>
      <div className="with-rail">
        <div style={{ minWidth: 0 }} className="fade-in">
          {/* The identity block. Same mark, same wordmark, same gradient as the
              header and as the app's own logo treatment. */}
          <header
            className="card"
            style={{
              padding: '30px 26px',
              background: 'linear-gradient(150deg, var(--acct-tile) 0%, var(--surface) 60%)',
              borderColor: 'var(--acct-border)',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 56, height: 56, borderRadius: 17,
                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent-ink-on-fill)', fontWeight: 900, fontSize: 26,
                boxShadow: '0 8px 22px -10px rgba(0,140,190,0.6)',
              }}
            >
              F
            </span>
            <h1 className="page-title" style={{ marginTop: 16 }}>FPVARABIC</h1>
            <p style={{ fontSize: 15, color: 'var(--text-dim)', margin: '12px 0 0', lineHeight: 2, maxWidth: '62ch' }}>
              منصّة عربية للطيران بالمنظور الأول: تشرح، وتشخّص، وتحسب التوافق، وتبيع
              ما راجعته. الهدف واحد — أن يفهم من يقرأ بالعربية ما يفعله، لا أن يقلّد
              خطوات لا يعرف سببها.
            </p>
          </header>

          {/* What the platform is, as six checkable things. */}
          <section style={{ marginTop: 34 }}>
            <h2 className="accent-head" style={{ fontSize: 20, fontWeight: 900, margin: '0 0 16px' }}>
              ماذا تجد هنا
            </h2>
            <div
              className="stagger"
              style={{
                display: 'grid', gap: 14,
                gridTemplateColumns: 'repeat(auto-fit, minmax(255px, 1fr))',
              }}
            >
              {PILLARS.map(p => (
                <Link key={p.title} href={p.href} className="card card-link fade-in" style={{ padding: '18px 20px' }}>
                  <span className="rail-row-icon" aria-hidden style={{ marginBottom: 11 }}>
                    <p.Icon size={16} />
                  </span>
                  <h3 style={{ fontSize: 15.5, fontWeight: 900, margin: '0 0 7px' }}>{p.title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, lineHeight: 1.9 }}>{p.body}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* The editorial rules. This is the part a reader can hold us to. */}
          <section style={{ marginTop: 38 }}>
            <h2 className="accent-head" style={{ fontSize: 20, fontWeight: 900, margin: '0 0 16px' }}>
              ما نلتزم به
            </h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
              {[
                'كل مواصفة تُنسب إلى صفحة المصنّع أو دليله، مع تاريخ قراءتها — لا إلى قائمة بائع.',
                'ما لم نتأكّد منه يُكتب أنه غير متوفّر من المصدر، لا يُخمَّن ولا يُحذف.',
                'حين تتعارض المصادر نسجّل التعارض بدل أن نختار أحدها بصمت.',
                'المحتوى الذي يكتبه المستخدمون معلَّم بأنه كذلك، ومنفصل عن الموسوعة المراجَعة.',
                'لا نستعمل صوراً مولَّدة بالذكاء الاصطناعي ولا صوراً منسوخة بلا إذن.',
              ].map(rule => (
                <li key={rule} className="card" style={{ padding: '14px 18px', display: 'flex', gap: 11 }}>
                  <span
                    aria-hidden
                    style={{ color: 'var(--sev-ok)', fontWeight: 900, fontSize: 15, flexShrink: 0 }}
                  >
                    ✓
                  </span>
                  <span style={{ fontSize: 13.5, lineHeight: 1.95, color: 'var(--text-dim)' }}>{rule}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Carried over verbatim from the app's about screen. */}
          <section style={{ marginTop: 34, display: 'grid', gap: 14 }}>
            <div
              className="card"
              style={{
                padding: '16px 19px',
                borderColor: 'rgba(138,90,0,0.32)', background: 'var(--sev-warning-wash)',
              }}
            >
              <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 900, color: 'var(--sev-warning)' }}>
                <Shield size={15} aria-hidden />
                تنبيه مهم
              </p>
              <p style={{ margin: '9px 0 0', fontSize: 13, color: 'var(--sev-warning)', lineHeight: 1.95 }}>
                المنصّة لا تغني عن قراءة كتيّبات القطع الرسمية أو الالتزام بقوانين الطيران
                المحلّية في بلدك.
              </p>
            </div>

            <div className="card" style={{ padding: '16px 19px' }}>
              <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 900 }}>
                <AlertCircle size={15} color="var(--accent-ink-2)" aria-hidden />
                إخلاء مسؤولية
              </p>
              <p style={{ margin: '9px 0 0', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.95 }}>
                هذه المنصّة لا تستخدم شعارات رسمية ولا تدّعي الانتماء إلى Betaflight أو
                أي شركة مصنّعة. جميع الأسماء التقنية (<span className="ltr">ESC</span>،{' '}
                <span className="ltr">FC</span>، <span className="ltr">ELRS</span>…) مصطلحات
                صناعية شائعة.
              </p>
            </div>
          </section>

          <p style={{ marginTop: 30, fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.95 }}>
            وجدت خطأً أو لديك اقتراح؟{' '}
            <Link href="/contact" style={{ color: 'var(--accent-ink)', fontWeight: 800 }}>
              اكتب لنا
            </Link>
            .
          </p>
        </div>

        <AccountRail
          signedIn={!!session}
          displayName={session?.displayName ?? null}
          photoURL={session?.photoURL ?? null}
          email={session?.email ?? null}
          role={session?.role ?? 'user'}
          signInNext="/about"
        />
      </div>
    </div>
  );
}
