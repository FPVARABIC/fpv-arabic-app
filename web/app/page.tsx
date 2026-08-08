import Link from 'next/link';
import { Wrench, Store, CircuitBoard, Library, Hammer, type LucideIcon } from 'lucide-react';
import { allKbModules } from '@core/data/kb/registry';
import { allDxTrees } from '@core/data/kb/diagnostics/trees';
import { kbTerms } from '@core/data/kb/glossary/terms';
import { STORE_PRODUCTS } from '@core/data/store/catalogue';
import { STORE_CATEGORIES } from '@core/data/store/categories';
import { ALL_PROJECTS } from '@core/data/projects/registry';
import { PART_CATEGORY_MAP } from '@core/data/project/store';
import { HUB_TOTALS } from '@/lib/softwareHub';
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
 * shape: البناء · البرامج · الموسوعة · المشاريع · المتجر. That correspondence
 * is now checked rather than remembered — this page carried four pillars for a
 * while after the bar grew to six tabs, and a visitor who meets a section on
 * the bar that the page never mentioned has been told, quietly, that the page
 * is not a map of the platform. That is the one job it has.
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
 * `STORE_PRODUCTS.length`, `allDxTrees.length`, `HUB_TOTALS` — all read from the
 * shared core at build time. This was the rule the old page followed and it is
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
  const buildPartCount = Object.values(PART_CATEGORY_MAP).reduce((n, l) => n + l.length, 0);
  const buildCategoryCount = Object.keys(PART_CATEGORY_MAP).length;

  const softwarePages =
    HUB_TOTALS.betaflightPages + HUB_TOTALS.edgetxPages + HUB_TOTALS.videoPages;

  /* The five load-bearing sections, in navigation order. One array, one
     renderer — see the note above on why that matters more than it looks. */
  const pillars: Pillar[] = [
    {
      id: 'build',
      labelAr: 'البناء',
      href: sectionHref('build'),
      Icon: Wrench,
      blurbAr:
        'ابنِ درونك خطوة بخطوة: مسار تفاعلي يقترح القطعة ويقول لماذا، ويفحص '
        + 'التوافق بمحرك أحكام يشرح كل حكم، ويقف عند بوابات السلامة قبل البطارية.',
      count: buildPartCount,
      countLabelAr: `قطعة موثّقة في ${buildCategoryCount} فئة`,
      ctaAr: 'ابنِ درونك',
    },
    {
      id: 'programming',
      labelAr: 'مركز البرامج',
      href: sectionHref('programming'),
      Icon: CircuitBoard,
      blurbAr:
        'Betaflight وExpressLRS وEdgeTX وأدوات الفيديو — أين كل إعداد، وماذا '
        + 'يفعل، وعلى أي قطعة ينطبق، وما الذي يتغيّر بعده.',
      count: softwarePages,
      countLabelAr: 'صفحة إعداد وشرح',
      ctaAr: 'افتح مركز البرامج',
    },
    {
      id: 'kb',
      labelAr: 'الموسوعة',
      href: sectionHref('kb'),
      Icon: Library,
      blurbAr:
        'المبدأ قبل الخطوة: كيف يعمل النظام، ولماذا يفشل، وكيف تفحصه — بمصادر '
        + 'وإصدارات وتواريخ مراجعة مذكورة في كل مقال.',
      count: articleCount,
      countLabelAr: `مقالاً في ${modules.length} منظومات`,
      ctaAr: 'افتح الموسوعة',
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
      href: '/projects',
      Icon: Hammer,
      blurbAr:
        'مشاريع كاملة ومراجَعة — ما ستتعلّمه، وما يجب أن تعرفه قبلها، والقطع '
        + 'والبرامج مربوطة بأماكنها داخل المنصّة.',
      count: publishedProjectCount,
      countLabelAr: 'مشروعاً مراجَعاً',
      ctaAr: 'تصفّح المشاريع',
    },
    /* The store closes the list, mirroring the bar — last by instruction. */
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
        <h1 style={{ fontSize: 'clamp(24px, 6vw, 34px)', fontWeight: 900, lineHeight: 1.4, margin: '10px 0 0' }}>
          كل ما تحتاجه للطيران بالمنظور الأول،{' '}
          <span style={{ color: 'var(--accent-ink)' }}>بالعربية</span>
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-dim)', marginTop: 16, lineHeight: 1.95 }}>
          منصّة واحدة على الهاتف والويب: مسار بناء يمشي معك من اختيار القطع إلى أول
          طيران، ومتجر بمواصفات موثّقة، ومركز برامج يشرح كل إعداد، وموسوعة تشرح
          المبدأ قبل الخطوة. الحساب نفسه، والمشروع نفسه، والمحتوى نفسه — أينما فتحتها.
        </p>

        {/* The hero used to repeat the search at full size right under the
            header's own field — two identical controls stacked within one
            phone viewport. The header field (a real field on phones too) is
            the one search; the hero hands the space back to the pillars. */}
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

      {/* ── The build call — the strong card the brief asked for ─────────── */}
      <section aria-labelledby="build-h" style={{ marginTop: 52 }}>
        <div className="card project-band">
          <div style={{ minWidth: 0 }}>
            <span aria-hidden className="pillar-icon">
              <Wrench size={20} strokeWidth={2} />
            </span>
            <h2 id="build-h" style={{ fontSize: 19, fontWeight: 900, margin: '12px 0 0' }}>
              ابنِ درونك
            </h2>
            <p
              style={{
                fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.95,
                margin: '9px 0 0', maxWidth: 620,
              }}
            >
              من اختيار القطع إلى أول طيران — خطوة بخطوة. المسار يقترح ويشرح لماذا،
              ومحرك التوافق يحكم بالسبب والدليل ودرجة الثقة، وبوابات السلامة تقف
              قبل البطارية. وما تختاره يصبح «مشروعي»: مساحة عملك الدائمة التي تربط
              الإعداد والتشخيص بقطعك أنت.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <Link href={sectionHref('build')} className="btn-primary" data-testid="home-build">
              ابنِ درونك
            </Link>
            <Link href={sectionHref('project')} className="btn-ghost" data-testid="home-project">
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
              'مسار البناء لا يخمّن مواصفة: ما ليس موثّقاً يقول «تحتاج تحققاً من الشركة المصنّعة».',
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
