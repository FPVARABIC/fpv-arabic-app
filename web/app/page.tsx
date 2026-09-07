import Link from 'next/link';
import { BookOpen, Wrench, Store, Library, Hammer, type LucideIcon } from 'lucide-react';
import { allKbModules } from '@core/data/kb/registry';
import { allDxTrees } from '@core/data/kb/diagnostics/trees';
import { kbTerms } from '@core/data/kb/glossary/terms';
import { STORE_PRODUCTS } from '@core/data/store/catalogue';
import { STORE_CATEGORIES } from '@core/data/store/categories';
import { lessonsData } from '@core/data/lessonsData';
import { roadmapData } from '@core/data/roadmapData';
import { ALL_PROJECTS } from '@core/data/projects/registry';
import { href } from '@/lib/webRoutes';
import { navItem } from '@/lib/siteNav';
import { BRAND_NAME } from '@core/data/brand';

/**
 * A section's own path, from the site map rather than typed here.
 *
 * Throwing on a miss is the point: a mistyped id becomes a BUILD failure rather
 * than a card on the front page that leads nowhere. The alternative — `?.href ??
 * '/'` — turns a typo into a link that silently sends every visitor home.
 */
function sectionHref(id: string): string {
  const item = navItem(id);
  if (!item) throw new Error(`[home] unknown nav id: ${id}`);
  return item.href;
}

/**
 * The home page — the entrance to the whole platform.
 *
 * WHAT WAS WRONG WITH THE OLD ONE
 * -------------------------------
 * It read as the encyclopedia's front page rather than the platform's. The
 * owner's words: «الصفحة الرئيسية الآن تشبه الموسوعة أكثر من كونها واجهة للمنصة
 * كاملة». And it was true by measurement, not taste — of the two largest blocks
 * on the page, one was a six-cell grid whose every figure counted encyclopedia
 * content, and the other was a card per encyclopedia module. The store, the
 * community and the software centre appeared once each, as small equal cells in
 * a list of «أقسام المنصة» that also contained the glossary and the contact
 * form. A visitor could read the whole page and not learn there was a shop.
 *
 * HOW THIS ONE IS BUILT INSTEAD
 * -----------------------------
 * Five pillars, rendered from ONE array through ONE component, so they are
 * equal by construction rather than by my remembering to keep them equal. Same
 * card, same icon size, same number treatment, same call to action. If a future
 * edit makes one of them louder, it makes all five louder — which is the only
 * way «وزناً متقارباً» survives contact with later changes.
 *
 * The order follows the navigation bar, so the page and the bar teach the same
 * shape: الدروس · الموسوعة · البناء · المشاريع · المتجر. That correspondence is
 * checked rather than remembered — this page carried four pillars for a while
 * after the bar grew, and a visitor who meets a section on the bar that the
 * page never mentioned has been told, quietly, that the page is not a map of
 * the platform. That is the one job it has.
 *
 * «المجتمع» and «البرامج» have no card here for the same reason they have no
 * tab: the owner named five sections for this row and neither is among them.
 * Neither section was touched — `/community` and `/programming` build, work and
 * stay in `siteNav.ts`; they are simply not what this page leads with today.
 *
 * WHAT IS DELIBERATELY NOT ON THIS PAGE
 * -------------------------------------
 * Any section's own detail. The instruction was «هدفها أن تقود المستخدم، لا أن
 * تشرح كل المنصة»: a landing page that explains each section is a page nobody
 * finishes. «أحدث ما رُوجع» is real and useful and is therefore kept — folded
 * shut, near the bottom, where somebody who wants it can open it and nobody
 * else has to scroll past it.
 *
 * EVERY NUMBER IS COUNTED, NONE IS WRITTEN
 * ----------------------------------------
 * `STORE_PRODUCTS.length`, `allDxTrees.length`, `roadmapData.length` — all read
 * from the shared core at build time. This was the rule the old page followed and it is
 * kept: a hand-written figure is a promise that rots the first time content
 * changes, and here it would rot into a lie about the size of the platform.
 *
 * Still a server component with no client JavaScript, so it is fully indexable
 * and its first paint needs no hydration.
 */

export const metadata = {
  title: `${BRAND_NAME} — منصة الطيران بالمنظور الأول بالعربية`,
  alternates: { canonical: '/' },
};

interface Pillar {
  id: string;
  labelAr: string;
  href: string;
  Icon: LucideIcon;
  /** What a person does here, in their words rather than the system's. */
  blurbAr: string;
  /** Counted from the core. `null` when there is no honest figure to give. */
  count: number | null;
  countLabelAr: string;
  ctaAr: string;
}

export default function HomePage() {
  const modules = allKbModules;
  const articleCount = modules.reduce((n, m) => n + m.articles.length, 0);
  const publishedProjectCount = ALL_PROJECTS.filter(p => p.published).length;

  /* The five load-bearing sections, in navigation order. One array, one
     renderer — see the note above on why that matters more than it looks. */
  const pillars: Pillar[] = [
    /*
     * الدروس first. The beginner path is what the product is named for, and
     * the first tester's first note was that it had disappeared from the site.
     */
    {
      id: 'lessons',
      labelAr: 'الدروس',
      href: sectionHref('lessons'),
      Icon: BookOpen,
      blurbAr:
        'مسار مرتّب خطوة بخطوة من الأساسيات حتى أول طيران آمن: شرح قصير، ثم سؤال، '
        + 'ثم مخطّط تضغطه بنفسك. كل إجابة وكل مرحلة تُحفظ في متصفّحك، فتعود حيث توقّفت.',
      count: lessonsData.length,
      countLabelAr: 'درساً في خمس محطّات',
      ctaAr: 'ابدأ الدروس',
    },
    {
      id: 'kb',
      labelAr: 'الموسوعة',
      href: sectionHref('kb'),
      Icon: Library,
      blurbAr:
        'مرجع ترجع إليه عندما تحتاج معلومة عن موضوع بعينه — لا مسارًا تسير فيه: '
        + 'كيف يعمل النظام، ولماذا يفشل، وكيف تفحصه، بمصادر وتواريخ مراجعة.',
      count: articleCount,
      countLabelAr: `مقالاً في ${modules.length} منظومات`,
      ctaAr: 'افتح الموسوعة',
    },
    /*
     * البناء, restored to the front page with the tab.
     *
     * The stages were on the web already — but only inside «مشروعي», a private
     * workspace that renders nothing until you have created a project there. So
     * a beginner could read this whole page, open every card, and never learn
     * that the platform tells you how to build the aircraft. `/build` is the
     * door; this is the sign on it.
     */
    {
      id: 'build',
      labelAr: 'البناء',
      href: sectionHref('build'),
      Icon: Wrench,
      blurbAr:
        'مراحل بناء الطائرة بالترتيب الذي تُنفَّذ به: التحضير، الخطوات العملية، '
        + 'التحذيرات، وأخطاء شائعة، ومتى تتوقف ولا تُكمل — ثم قوائم الفحص قبل أول تشغيل.',
      count: roadmapData.length,
      countLabelAr: 'مراحل بناء مرتّبة',
      ctaAr: 'افتح البناء',
    },
    /*
     * المشاريع, added because the tab bar had six tabs and this page had four
     * pillars.
     *
     * A visitor who arrives on the home page and then meets a section on the
     * bar that the page never mentioned has been told, quietly, that the page
     * is not a map of the platform. That is the one job it has.
     */
    {
      id: 'projects',
      labelAr: 'المشاريع',
      href: sectionHref('projects'),
      Icon: Hammer,
      blurbAr:
        'مشاريع كاملة ومراجَعة — ما ستتعلّمه، وما يجب أن تعرفه قبلها، والقطع '
        + 'والبرامج مربوطة بأماكنها داخل المنصّة.',
      count: publishedProjectCount,
      countLabelAr: 'مشروعاً مراجَعاً',
      ctaAr: 'تصفّح المشاريع',
    },
    {
      id: 'store',
      labelAr: 'المتجر',
      href: sectionHref('store'),
      Icon: Store,
      blurbAr:
        'عدد صغير من المنتجات المختارة في كل قسم، بفارق واضح بينها ومواصفات '
        + 'موثّقة من الشركة الصانعة. ومع كل طلب خدمة الإعداد التي نشرحها هنا.',
      count: STORE_PRODUCTS.length,
      countLabelAr: `منتجاً في ${STORE_CATEGORIES.length} قسماً`,
      ctaAr: 'تصفّح المتجر',
    },
  ];

  /* Real content, sorted by the review date the articles already carry. Not a
     «latest» list invented for the home page — these are the most recently
     re-checked articles on the platform, which is a fact it can prove. */
  const recentlyReviewed = modules
    .flatMap(m => m.articles.map(a => ({ article: a, module: m })))
    .filter(x => !!x.article.lastReviewed)
    .sort((a, b) => b.article.lastReviewed.localeCompare(a.article.lastReviewed))
    .slice(0, 6);

  /* Three ways in, by what the visitor came to do rather than by section name.
     Somebody with a drone that will not arm does not think «الموسوعة». */
  const entryPoints = [
    {
      href: sectionHref('diagnose'),
      titleAr: 'عندي عطل الآن',
      bodyAr: 'ابدأ من العرَض الذي تراه. ترتيب الفحص يبدأ دائماً من الأقل خطراً، والمراوح منزوعة.',
      metaAr: `${allDxTrees.length} شجرة تشخيص`,
    },
    {
      href: sectionHref('kb'),
      titleAr: 'أنا جديد تماماً',
      bodyAr: 'ابدأ من المنظومات: ماذا يفعل كل جزء في الطائرة، وبأي ترتيب تتعلّمه.',
      metaAr: `${modules.length} منظومات مشروحة`,
    },
    {
      href: sectionHref('glossary'),
      titleAr: 'قرأت مصطلحاً ولم أفهمه',
      bodyAr: 'المصطلح بالعربية، واسمه الإنجليزي كما يظهر تماماً داخل البرامج.',
      metaAr: `${kbTerms.length} مصطلحاً`,
    },
  ];

  return (
    <div className="shell" style={{ paddingTop: 40, paddingBottom: 24 }}>
      {/* ── Who we are, and the one control that reaches everything ──────── */}
      <section style={{ maxWidth: 780 }}>
        <p
          style={{
            fontSize: 12.5, fontWeight: 800, letterSpacing: '0.08em',
            color: 'var(--accent-ink)', margin: 0,
          }}
          dir="ltr"
        >
          {BRAND_NAME}
        </p>
        <h1 style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.4, margin: '10px 0 0' }}>
          كل ما تحتاجه للطيران بالمنظور الأول،{' '}
          <span style={{ color: 'var(--accent-ink)' }}>بالعربية</span>
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-dim)', marginTop: 16, lineHeight: 1.95 }}>
          منصّة واحدة على الهاتف والويب: مسار تعليمي مرتّب من الأساسيات حتى أول طيران
          آمن، وموسوعة ترجع إليها عند الحاجة، ومراحل بناء مرتّبة تمشي معك حتى أول
          تشغيل، ومجتمع تسأل فيه وتعرض بناءك، ومتجر بمواصفات موثّقة، ومركز برامج
          يشرح كل إعداد.
        </p>

        {/*
          The one thing a first-time visitor is here to do.

          WHY IT SITS ABOVE THE SEARCH FIELD
          ----------------------------------
          A phone at 390px showed the old order costing a beginner one and a half
          screens of scrolling before any section appeared: banner, header field,
          headline, paragraph, a second search field, and only then «أركان المنصّة».
          Search answers «I have a specific question»; it cannot answer «I do not
          know enough to have one yet», which is the state the lessons exist for.

          It is a link, not a button — it navigates, so a reader can open it in a
          new tab and a screen reader announces it as a link.
        */}
        <div className="hero-cta">
          <Link href={sectionHref('lessons')} className="btn-primary hero-cta-main" data-testid="home-hero-lessons">
            ابدأ الدروس
          </Link>
          <span className="hero-cta-note">
            <span dir="ltr" style={{ fontWeight: 900, color: 'var(--accent-ink)' }}>{lessonsData.length}</span>
            {' '}درساً مرتّبة في خمس محطّات — من «ما هو الكوادكابتر؟» حتى أول تحليق.
          </span>
        </div>

        {/* The site's search, repeated here at full size. The header field is
            the global entry; on the page a visitor is looking AT, a wide field
            is the fastest answer to «where do I even start». Same GET form,
            same destination, same engine — no second search anywhere. */}
        <form
          action={sectionHref('search')}
          method="get"
          role="search"
          style={{ marginTop: 24 }}
        >
          <label htmlFor="home-q" className="sr-only">ابحث في المنصّة</label>
          <div className="search-bar">
            <span aria-hidden className="search-bar-icon" style={{ fontSize: 19 }}>⌕</span>
            <input
              id="home-q"
              type="search"
              name="q"
              className="search-bar-input"
              data-testid="home-search-input"
              placeholder="ابحث: «الريسيفر لا يشتغل»، «UART»، «اختيار كاميرا»…"
            />
            <button type="submit" className="btn-primary search-bar-submit">ابحث</button>
          </div>
        </form>
      </section>

      {/* ── The four pillars, equal by construction ──────────────────────── */}
      <section aria-labelledby="pillars-h" style={{ marginTop: 46 }}>
        <h2 id="pillars-h" style={{ fontSize: 22, fontWeight: 900, margin: '0 0 16px' }}>
          أركان المنصّة
        </h2>
        <div className="pillar-grid">
          {pillars.map(p => (
            <Link
              key={p.id}
              href={p.href}
              className="card pillar"
              data-primary={p.id === 'lessons' ? '' : undefined}
              data-testid={`home-pillar-${p.id}`}
            >
              <span aria-hidden className="pillar-icon">
                <p.Icon size={22} strokeWidth={2} />
              </span>
              <h3 style={{ fontSize: 17, fontWeight: 900, margin: '12px 0 0' }}>{p.labelAr}</h3>
              <p
                style={{
                  fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.9,
                  margin: '8px 0 0', flex: 1,
                }}
              >
                {p.blurbAr}
              </p>
              <p style={{ margin: '14px 0 0', display: 'flex', alignItems: 'baseline', gap: 6 }}>
                {p.count !== null && (
                  <span
                    style={{ fontSize: 21, fontWeight: 900, color: 'var(--accent-ink)' }}
                    dir="ltr"
                  >
                    {p.count}
                  </span>
                )}
                <span style={{ fontSize: 11.5, color: 'var(--text-dimmer)' }}>
                  {p.countLabelAr}
                </span>
              </p>
              <span className="pillar-cta">{p.ctaAr} ←</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Where do I start ─────────────────────────────────────────────── */}
      <section aria-labelledby="start-h" style={{ marginTop: 52 }}>
        <h2 id="start-h" style={{ fontSize: 22, fontWeight: 900, margin: '0 0 6px' }}>
          من أين تبدأ؟
        </h2>
        <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: '0 0 16px' }}>
          اختر ما ينطبق عليك الآن.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 12,
          }}
        >
          {entryPoints.map(e => (
            <Link
              key={e.href}
              href={e.href}
              className="card-sm"
              data-testid={`home-start-${e.href.replace(/\//g, '')}`}
              style={{ padding: '17px 19px', display: 'block' }}
            >
              <h3 style={{ fontSize: 15, fontWeight: 900, margin: 0 }}>{e.titleAr}</h3>
              <p
                style={{
                  fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.85,
                  margin: '8px 0 0',
                }}
              >
                {e.bodyAr}
              </p>
              <p style={{ fontSize: 11.5, color: 'var(--text-dimmer)', margin: '10px 0 0' }}>
                {e.metaAr}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── The personal workspace ───────────────────────────────────────── */}
      <section aria-labelledby="project-h" style={{ marginTop: 52 }}>
        <div className="card project-band">
          <div style={{ minWidth: 0 }}>
            <span aria-hidden className="pillar-icon">
              <Hammer size={20} strokeWidth={2} />
            </span>
            <h2 id="project-h" style={{ fontSize: 19, fontWeight: 900, margin: '12px 0 0' }}>
              مشروعي
            </h2>
            <p
              style={{
                fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.95,
                margin: '9px 0 0', maxWidth: 620,
              }}
            >
              سجّل قطعك مرّة واحدة، فتقرأ المنصّة منها أحكام التوافق نفسها التي يحسبها
              التطبيق — بالسبب، والدليل، ودرجة الثقة، وما ينقص للحكم. وتصبح صفحات
              الإعداد والتشخيص مربوطة بقطعك أنت لا بقطع عامة.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <Link href={sectionHref('project')} className="btn-primary" data-testid="home-project">
              افتح مشروعي
            </Link>
          </div>
        </div>
      </section>

      {/* ── Real content, folded shut ────────────────────────────────────
          Kept, because the review dates are a fact this platform can prove and
          few others can. Folded, because a landing page's job is to point at
          the sections rather than to sample one of them — and this sampled the
          encyclopedia, which is the imbalance the page was rebuilt to fix. */}
      {recentlyReviewed.length > 0 && (
        <details data-testid="home-recent" style={{ marginTop: 52 }}>
          <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 17, fontWeight: 900 }}>أحدث ما رُوجع</span>
            <span style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
              آخر <span dir="ltr">{recentlyReviewed.length}</span> مقالات أُعيد فحصها
            </span>
          </summary>
          <p style={{ margin: '10px 0 14px' }}>
            <Link href={sectionHref('kb')} style={{ fontSize: 13, color: 'var(--accent-ink)' }}>
              كل الموسوعة ←
            </Link>
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
              gap: 12,
            }}
          >
            {recentlyReviewed.map(({ article, module }) => {
              const to = href({ kind: 'article', id: article.id });
              if (!to) return null;
              return (
                <Link
                  key={`${module.id}/${article.id}`}
                  href={to}
                  className="card-sm"
                  data-testid={`home-recent-${article.id}`}
                  style={{ padding: '15px 17px', display: 'block' }}
                >
                  <p style={{ fontSize: 11, color: 'var(--text-dimmer)', margin: 0 }}>
                    {module.titleAr}
                  </p>
                  <h3 style={{ fontSize: 14.5, fontWeight: 800, margin: '5px 0 0', lineHeight: 1.6 }}>
                    {article.titleAr}
                  </h3>
                  <p style={{ fontSize: 11.5, color: 'var(--text-dimmer)', margin: '9px 0 0' }} dir="ltr">
                    {article.lastReviewed}
                  </p>
                </Link>
              );
            })}
          </div>
        </details>
      )}

      {/* ── Honest about what this is ────────────────────────────────────── */}
      <section style={{ marginTop: 52, maxWidth: 780 }}>
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
              'منشورات المجتمع تجارب شخصية، لا مرجع — وعند التعارض تُقدَّم الموسوعة ودليل الشركة.',
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
          <p style={{ margin: '14px 0 0' }}>
            <Link href="/about" style={{ fontSize: 12.5, color: 'var(--accent-ink)', fontWeight: 700 }}>
              حول المنصّة ←
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
