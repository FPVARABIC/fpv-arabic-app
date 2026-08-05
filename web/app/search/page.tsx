import Link from 'next/link';
import { Search } from 'lucide-react';
import type { Metadata } from 'next';
import { retrieve, INTENT_LABEL_AR, type RetrievalResult } from '@core/platform/retrieval';
import type { SearchDocType } from '@core/data/kb/search/buildIndex';
import { searchCommunity } from '@/lib/server/communitySearch';
import {
  RESULT_TYPE_LABEL_AR, topReasons, resultHref,
  RESULT_GROUPS, GROUP_OF_TYPE, groupOf, type ResultGroupId,
} from '@/lib/searchView';
import { SECTION_ROUTES } from '@/lib/webRoutes';
import { ProjectResults } from '@/components/search/ProjectResults';
import { registerWebSearchSources } from '@/lib/search/register';

export const metadata: Metadata = {
  title: 'البحث',
  description:
    'ابحث في الموسوعة والمصطلحات والتشخيص وصفحات Betaflight وExpressLRS وEdgeTX '
    + 'والفيديو ومشروعك والمجتمع — بمحرّك واحد يشرح لماذا ظهرت كل نتيجة.',
  alternates: { canonical: '/search' },
  // A results page has no stable content of its own, and indexing every query
  // string produces thousands of near-duplicate pages. The sections it searches
  // are all individually indexed, which is what actually matters.
  robots: { index: false, follow: true },
};

/**
 * Rendered on demand rather than prerendered.
 *
 * The community half needs Firestore and the query lives in the URL, so there
 * is nothing to build ahead of time. The page is `noindex` anyway — see the
 * metadata above — so nothing is lost.
 */
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

/**
 * Search — the main way into everything.
 *
 * ONE ENGINE, ONE INDEX, THREE GROUPS
 * -----------------------------------
 * `retrieve()` from the shared core does the finding; this page only renders.
 * The ranking, the Arabic normalisation, the synonym expansion, the symptom
 * matching and the intent recognition are identical to what any other surface
 * gets, which is the whole point of the layer existing.
 *
 * The three groups are three fields on the response, not three filters over one
 * list. Reviewed knowledge, the reader's own build, and member posts are
 * different KINDS of thing, and the separation has to survive somebody
 * refactoring this component — so it lives in the contract rather than in the
 * markup.
 *
 * WHY IT RUNS ON THE SERVER
 * -------------------------
 * The index is built from the whole platform, and shipping it to the browser
 * would mean downloading the corpus to type a query. Server-side keeps the
 * client bundle at zero for this feature and makes a shared result URL render
 * as real HTML.
 *
 * THE PROJECT GROUP IS THE ONE EXCEPTION
 * --------------------------------------
 * It cannot be server-rendered: the project lives in the reader's own browser,
 * and putting it in the HTML would leak one person's build into a cacheable
 * public response. So it is a client island that runs `retrieve()` again, in
 * the browser, over the project only — the same function, the same contract,
 * on the side of the wire where the data already is.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; g?: string; page?: string }>;
}) {
  /*
   * The shop, the project library and the standing pages, taught to the one
   * engine before it is asked anything.
   *
   * Called here rather than as an import side effect: a side effect is what
   * somebody deletes because the import "looks unused", and the failure is
   * silent — the shop simply stops being findable.
   */
  registerWebSearchSources();

  const sp = await searchParams;
  const query = (sp.q ?? '').trim();
  const groupFilter = (sp.g ?? '').trim() as ResultGroupId | '';
  const page = Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1);

  const active = query.length >= 2;

  /*
   * Filtering by SHELF rather than by document type.
   *
   * The chips used to be one per type, which produced eight of them —
   * «موسوعة»، «مصطلح»، «Betaflight — صفحة»، «Betaflight — إعداد»… — for a
   * distinction the reader was not making. A shelf is the question somebody
   * actually has: do I want to read about this, fix it, configure it, build it,
   * or buy it.
   */
  const typesInGroup = (g: ResultGroupId): SearchDocType[] =>
    (Object.entries(GROUP_OF_TYPE) as [SearchDocType, ResultGroupId][])
      .filter(([, gid]) => gid === g).map(([t]) => t);

  const result = active
    ? retrieve(query, {
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      filters: groupFilter ? { types: typesInGroup(groupFilter) } : undefined,
    })
    : null;

  /*
   * The page's results, on their shelves.
   *
   * Built from THIS page of results, while the header count comes from
   * `countsByType` over the whole match set — so a shelf showing three of
   * eleven says so rather than implying there are three.
   */
  const shelves = RESULT_GROUPS
    .map(g => ({
      ...g,
      results: (result?.official ?? []).filter(r => groupOf(r.type) === g.id),
      total: Object.entries(result?.countsByType ?? {})
        .filter(([t]) => groupOf(t) === g.id)
        .reduce((n, [, c]) => n + c, 0),
    }))
    .filter(g => g.results.length > 0);

  // Community runs in parallel with nothing else blocking on it, and returns []
  // rather than throwing if Firestore is unreachable.
  const community = active ? await searchCommunity(query, { limit: 6 }) : [];

  const totalPages = result ? Math.max(1, Math.ceil(result.totalOfficial / PAGE_SIZE)) : 1;

  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    if (query) p.set('q', query);
    const g = over.g !== undefined ? over.g : groupFilter;
    if (g) p.set('g', g);
    const pg = over.page !== undefined ? over.page : String(page);
    if (pg && pg !== '1') p.set('page', pg);
    return `${SECTION_ROUTES.search}?${p.toString()}`;
  };

  return (
    <div className="shell" style={{ paddingTop: 36, paddingBottom: 30, maxWidth: 900 }}>
      <h1 className="page-title">البحث</h1>
      <p className="page-lede">
        محرّك واحد يصل إلى الموسوعة والمصطلحات وصفحات البرامج والتشخيص. اكتب المصطلح
        كما تعرفه — بالعربية أو كما يظهر داخل البرنامج.
      </p>

      {/* A plain GET form: works with no JavaScript, and the query lands in the
          URL so a result set can be shared, bookmarked, and reached with Back.

          The field is deliberately the largest control on the page. Search is
          the platform's spine — it is how somebody who does not know the name
          of what they are looking for finds it — and a field sized like every
          other input reads as a filter rather than as the way in. */}
      <form action={SECTION_ROUTES.search} method="get" style={{ marginTop: 22 }} role="search">
        <label htmlFor="q" className="sr-only">ابحث في المنصة</label>
        <div className="search-bar">
          <Search size={19} className="search-bar-icon" aria-hidden />
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="اكتب مصطلحاً أو عرَضاً: «الريسيفر لا يشتغل»، «أين أجد Ports»، «UART»…"
            data-testid="search-input"
            autoComplete="off"
            className="search-bar-input"
          />
          <button type="submit" className="btn-primary search-bar-submit">ابحث</button>
        </div>
      </form>

      {/* Somebody arriving with nothing typed needs a way in, not a blank box. */}
      {!active && (
        <div style={{ marginTop: 24 }} data-testid="search-examples">
          <p style={{ fontSize: 12.5, color: 'var(--text-dimmer)', margin: '0 0 9px', fontWeight: 700 }}>
            جرّب مثلاً
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['الطائرة لا تقلع', 'معنى KV', 'ExpressLRS binding', 'صورة الفيديو مشوّشة', 'PID tuning'].map(ex => (
              <li key={ex}>
                <Link
                  href={`${SECTION_ROUTES.search}?q=${encodeURIComponent(ex)}`}
                  className="btn-ghost"
                  style={{ fontSize: 12.5 }}
                >
                  {ex}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {active && result && (
        <>
          {/* What the query looked like to the engine. Shown because a reader
              who can see it was read as a fault report can tell instantly
              whether the results below make sense. */}
          {result.intents.length > 0 && (
            <p data-testid="search-intent"
              style={{ margin: '16px 0 0', fontSize: 12.5, color: 'var(--accent-ink)', fontWeight: 700 }}>
              {result.intents.map(i => INTENT_LABEL_AR[i]).join(' · ')}
            </p>
          )}

          <p data-testid="search-count"
            style={{ fontSize: 13, color: 'var(--text-dimmer)', margin: '10px 0 0' }}>
            {result.totalOfficial === 0
              ? 'لا نتائج في المحتوى الموثّق.'
              : `${result.totalOfficial} نتيجة في المحتوى الموثّق`}
            {community.length > 0 && ` · ${community.length} من المجتمع`}
          </p>

          {result.didYouMean && (
            <p data-testid="search-didyoumean" style={{ margin: '9px 0 0', fontSize: 13.5 }}>
              هل تقصد{' '}
              <Link href={`${SECTION_ROUTES.search}?q=${encodeURIComponent(result.didYouMean)}`}
                style={{ color: 'var(--accent-ink)', fontWeight: 800 }}>
                {result.didYouMean}
              </Link>
              ؟
            </p>
          )}

          {/* Filters — one per SHELF, counted from the real result set, so a
              chip never promises results it cannot deliver. */}
          {(() => {
            const counts = RESULT_GROUPS
              .map(g => ({
                g,
                n: Object.entries(result.countsByType)
                  .filter(([t]) => groupOf(t) === g.id)
                  .reduce((a, [, c]) => a + c, 0),
              }))
              .filter(x => x.n > 0);
            if (counts.length < 2) return null;
            return (
              <nav aria-label="تصفية حسب القسم" data-testid="search-filters"
                style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
                <Link href={qs({ g: '', page: '1' })}
                  className={groupFilter ? 'btn-ghost' : 'btn-primary'}
                  style={{ fontSize: 12, padding: '5px 12px' }}>
                  الكل <span dir="ltr">({result.totalOfficial})</span>
                </Link>
                {counts.map(({ g, n }) => (
                  <Link key={g.id} href={qs({ g: g.id, page: '1' })}
                    data-testid={`search-filter-${g.id}`}
                    className={groupFilter === g.id ? 'btn-primary' : 'btn-ghost'}
                    style={{ fontSize: 12, padding: '5px 12px' }}>
                    {g.titleAr} <span dir="ltr">({n})</span>
                  </Link>
                ))}
              </nav>
            );
          })()}

          {/* What a judgement would still need. Retrieval does not judge — but
              saying what is missing is the difference between an honest gap and
              a guess. */}
          {result.missingForVerdict.length > 0 && (
            <aside className="card-sm" data-testid="search-missing"
              style={{ padding: '13px 15px', marginTop: 16 }}>
              <h2 style={{ margin: 0, fontSize: 12.5, fontWeight: 900, color: 'var(--sev-warning)' }}>
                لا يمكن الحكم قبل معرفة
              </h2>
              <ul style={{ margin: '8px 0 0', paddingInlineStart: 20, display: 'grid', gap: 4 }}>
                {result.missingForVerdict.map(m => (
                  <li key={m} style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.9 }}>{m}</li>
                ))}
              </ul>
            </aside>
          )}

          {/* ── The reader's own build. Client-only, never in this HTML. ──── */}
          <ProjectResults query={query} />

          {/* ── The shelves ───────────────────────────────────────────────── */}
          {result.official.length === 0 ? (
            <div style={{ marginTop: 24 }}><EmptyState query={query} /></div>
          ) : (
            <div data-testid="search-results" style={{ marginTop: 24 }}>
              {shelves.map(shelf => (
                <section
                  key={shelf.id}
                  aria-labelledby={`shelf-${shelf.id}`}
                  data-testid={`search-shelf-${shelf.id}`}
                  style={{ marginTop: 26 }}
                >
                  <div style={{ display: 'flex', gap: 9, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <h2 id={`shelf-${shelf.id}`} style={{ fontSize: 15, fontWeight: 900, margin: 0 }}>
                      {shelf.titleAr}
                    </h2>
                    <span style={{ fontSize: 11.5, color: 'var(--text-dimmer)' }} dir="ltr">
                      {shelf.results.length < shelf.total
                        ? `${shelf.results.length} / ${shelf.total}`
                        : shelf.total}
                    </span>
                    {!groupFilter && shelf.results.length < shelf.total && (
                      <Link href={qs({ g: shelf.id, page: '1' })}
                        data-testid={`search-shelf-more-${shelf.id}`}
                        style={{ fontSize: 11.5, color: 'var(--accent-ink)', fontWeight: 800 }}>
                        اعرضها كلها ←
                      </Link>
                    )}
                  </div>
                  <p style={{ margin: '3px 0 11px', fontSize: 12, color: 'var(--text-dimmer)', lineHeight: 1.85 }}>
                    {shelf.blurbAr}
                  </p>
                  <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
                    {shelf.results.map(r => <ResultCard key={r.id} result={r} />)}
                  </ol>
                </section>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav aria-label="صفحات النتائج" data-testid="search-pagination"
              style={{ display: 'flex', gap: 9, marginTop: 22, alignItems: 'center', flexWrap: 'wrap' }}>
              {page > 1 && (
                <Link href={qs({ page: String(page - 1) })} className="btn-ghost"
                  data-testid="search-prev">← السابق</Link>
              )}
              <span style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
                صفحة <span dir="ltr">{page}</span> من <span dir="ltr">{totalPages}</span>
              </span>
              {page < totalPages && (
                <Link href={qs({ page: String(page + 1) })} className="btn-ghost"
                  data-testid="search-next">التالي →</Link>
              )}
            </nav>
          )}

          {/* ── Community, apart and marked ───────────────────────────────── */}
          {community.length > 0 && (
            <section aria-labelledby="community-h" data-testid="search-community"
              style={{ marginTop: 30, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
              <h2 id="community-h" style={{ fontSize: 15, fontWeight: 900, margin: '0 0 4px' }}>
                من المجتمع
              </h2>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text-dimmer)', lineHeight: 1.9 }}>
                كتبها أعضاء، ولم تُراجَع. تجارب وآراء — لا تُعامَل كإجابة هندسية،
                ولا تُغني عن دليل جهازك.
              </p>
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
                {community.map(r => <ResultCard key={r.id} result={r} />)}
              </ol>
            </section>
          )}
        </>
      )}

      {!active && <SearchIntro />}
    </div>
  );
}

/* ── Pieces ───────────────────────────────────────────────────────────────── */

const ResultCard: React.FC<{ result: RetrievalResult & { route?: string; postId?: string } }> = ({ result }) => {
  const { href, unavailableReasonAr } = resultHref(result);
  const reasons = topReasons(result.reasons);
  const isCommunity = result.provenance === 'community';

  const body = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
        <span
          data-testid={`result-badge-${result.type}`}
          style={{
            fontSize: 10.5, fontWeight: 800,
            color: isCommunity ? 'var(--text-dimmer)' : 'var(--accent-ink)',
            border: '1px solid var(--border)', borderRadius: 999, padding: '2px 9px',
          }}
        >
          {RESULT_TYPE_LABEL_AR[result.type] ?? result.type}
        </span>
        <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, minWidth: 0 }}>{result.titleAr}</h3>
      </div>

      {result.titleEn && (
        <p className="ltr" style={{ fontSize: 11.5, color: 'var(--text-dimmer)', margin: '4px 0 0' }}>
          {result.titleEn}
        </p>
      )}
      {result.summaryAr && (
        <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '7px 0 0', lineHeight: 1.8 }}>
          {result.summaryAr}
        </p>
      )}

      {/* Why it is here. Never a bare number. */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 9 }}>
        {reasons.map(c => (
          <span key={c.kind} data-testid={`reason-${c.kind}`}
            style={{ fontSize: 10.5, color: 'var(--text-dimmer)' }}>
            {c.labelAr}
            {c.terms.length > 0 && <>: <span className="ltr">{c.terms.join('، ')}</span></>}
          </span>
        ))}
        {result.reviewedAt && (
          <span style={{ fontSize: 10.5, color: 'var(--text-dimmer)' }}>
            · روجعت <span dir="ltr">{result.reviewedAt}</span>
          </span>
        )}
        {result.version && (
          <span className="ltr" style={{ fontSize: 10.5, color: 'var(--text-dimmer)' }}>
            · {result.version}
          </span>
        )}
      </div>

      {unavailableReasonAr && (
        <p style={{ fontSize: 11.5, color: 'var(--sev-warning)', margin: '7px 0 0', lineHeight: 1.8 }}>
          {unavailableReasonAr}
        </p>
      )}
    </>
  );

  return (
    <li>
      {href ? (
        <Link href={href} className="card-sm"
          data-testid={`search-result-${result.type}-${result.id.split(':').slice(1).join(':')}`}
          style={{ display: 'block', padding: '14px 16px' }}>
          {body}
        </Link>
      ) : (
        <div className="card-sm" style={{ padding: '14px 16px' }}>{body}</div>
      )}
    </li>
  );
};

/**
 * The empty state.
 *
 * A search that finds nothing has to leave the reader somewhere better than
 * where they started, so this offers the three things that actually work when a
 * query fails: describe the symptom instead of the cause, use the English name,
 * or start from the diagnosis index.
 */
const EmptyState: React.FC<{ query: string }> = ({ query }) => (
  <div className="card-sm" data-testid="search-empty" style={{ padding: '16px 18px' }}>
    <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>
      لا نتائج لـ «{query}» في المحتوى الموثّق.
    </p>
    <ul style={{ margin: '11px 0 0', paddingInlineStart: 20, display: 'grid', gap: 6 }}>
      <li style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.9 }}>
        صِف ما تراه بدل ما تظنّه سبباً — «الصورة تقطع» تجد أكثر من «تداخل».
      </li>
      <li style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.9 }}>
        جرّب الاسم الإنجليزي كما يظهر داخل البرنامج — <span className="ltr">Failsafe</span>،{' '}
        <span className="ltr">Ports</span>.
      </li>
      <li style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.9 }}>
        أو ابدأ من <Link href="/diagnose" style={{ color: 'var(--accent-ink)' }}>فهرس التشخيص</Link>{' '}
        إن كان شيء لا يعمل.
      </li>
    </ul>
  </div>
);

const SearchIntro: React.FC = () => (
  <section style={{ marginTop: 26 }}>
    <h2 style={{ fontSize: 15, fontWeight: 900, margin: '0 0 10px' }}>البحث يصل إلى</h2>
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 7 }}>
      {[
        'الموسوعة ومنظوماتها ومسارات التعلّم والمصطلحات',
        'أشجار التشخيص وخطواتها — ابحث بالعرَض كما تصفه أنت',
        'صفحات Betaflight وحقولها، وخطوات ExpressLRS ومشكلاته، وEdgeTX، وأدوات الفيديو',
        'المشاريع وأقسامها — القطع والمتطلّبات والمصطلحات والمراحل والتحدّيات',
        'منتجات المتجر المنشورة وخياراتها وخدماتها',
        'قطعك وأحكام مشروعك — تظهر لك وحدك',
        'منشورات المجتمع، في مجموعة منفصلة وموسومة',
      ].map(t => (
        <li key={t} style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.9 }}>— {t}</li>
      ))}
    </ul>

    <p style={{ marginTop: 20, fontSize: 13, color: 'var(--text-dimmer)', lineHeight: 1.95 }}>
      اكتب كما تتكلّم. «الريسيفر لا يشتغل» و«أين أجد Ports» و«هل تدعمون INAV»
      كلها أسئلة يفهمها البحث، ويقول لك لماذا ظهرت كل نتيجة.
    </p>
  </section>
);

