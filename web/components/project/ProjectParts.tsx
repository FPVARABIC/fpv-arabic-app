'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  PART_CATEGORY_MAP, saveAssemblyProject, droneTypes,
  type ProjectSnapshot, type BasePart,
} from '@/lib/project';
import { PART_CATEGORY_LABEL_AR } from '@core/data/project/store';

/**
 * The project's parts, and the catalogue for changing them.
 *
 * WHAT «UNSUPPORTED» LOOKS LIKE HERE
 * ----------------------------------
 * The catalogue has twelve categories. The build has more things in it than
 * that — antennas, goggles, a BEC, wire gauge, connectors, LEDs, a payload —
 * and this panel does NOT invent fields for them. Inventing a field would make
 * the platform look as though it were checking something it cannot check, and
 * a verdict engine that silently ignores a recorded value is worse than one
 * that says it has no data.
 *
 * Some of those facts DO have a home already: the control link's antennas,
 * regulatory domain, protocol and failsafe live in `rcSetup`, and the video
 * ecosystem, goggles, camera and overlay path live in `videoSetup`. Those are
 * shown below and edited on the phone. The rest are named explicitly as a gap
 * at the bottom of this panel, rather than left for the reader to discover by
 * their absence.
 *
 * THE CATALOGUE IS LOADED WHEN IT IS OPENED, NOT WHEN THE PAGE IS
 * ---------------------------------------------------------------
 * `PART_CATEGORY_MAP` is a large object. It is only referenced inside the
 * picker, which is rendered on demand, and the picker filters before it
 * renders, so opening `/project` costs nothing for parts the reader never
 * looks at.
 */

const CATEGORIES = Object.keys(PART_CATEGORY_MAP);

export const ProjectParts: React.FC<{
  snapshot: ProjectSnapshot;
  onChanged: () => void;
}> = ({ snapshot, onChanged }) => {
  const [picking, setPicking] = useState<string | null>(null);

  function setPart(category: string, part: BasePart | null) {
    const parts = { ...snapshot.parts };
    if (part) parts[category] = part;
    else delete parts[category];

    // Writes through the store, which merges: the control-link and video
    // records this panel does not own are carried forward rather than
    // overwritten. That merge is the fix for a real data-loss bug — see
    // saveAssemblyProject's own comment.
    saveAssemblyProject({
      droneTypeId: snapshot.droneTypeId!,
      stageIndex: snapshot.stageIndex,
      sizeInch: snapshot.sizeInch,
      batteryVoltage: snapshot.cellCount,
      parts,
    });
    setPicking(null);
    onChanged();
  }

  return (
    <div data-testid="project-parts">
      <div className="admin-table-wrap">
        <table className="admin-table">
          <caption className="sr-only">قطع المشروع: الفئة والقطعة المسجَّلة.</caption>
          <thead>
            <tr>
              <th scope="col">الفئة</th>
              <th scope="col">القطعة</th>
              <th scope="col"><span className="sr-only">إجراءات</span></th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map(cat => {
              const part = snapshot.parts[cat];
              return (
                <tr key={cat} data-testid={`part-row-${cat}`}>
                  <td style={{ fontWeight: 800 }}>{PART_CATEGORY_LABEL_AR[cat] ?? cat}</td>
                  <td>
                    {part ? (
                      <>
                        <span style={{ display: 'block' }}>{part.nameAr}</span>
                        <span className="ltr" style={{ fontSize: 11.5, color: 'var(--text-dimmer)' }}>
                          {part.nameEn}{part.brand ? ` · ${part.brand}` : ''}
                        </span>
                      </>
                    ) : (
                      <span className="admin-badge" data-testid={`part-empty-${cat}`}>غير محددة</span>
                    )}
                  </td>
                  <td style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    <button type="button" className="btn-ghost" data-testid={`part-pick-${cat}`}
                      onClick={() => setPicking(picking === cat ? null : cat)}>
                      {part ? 'غيّر' : 'اختر'}
                    </button>
                    {part && (
                      <button type="button" className="btn-ghost" data-testid={`part-remove-${cat}`}
                        onClick={() => setPart(cat, null)}>
                        أزل
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {picking && (
        <PartPicker
          category={picking}
          current={snapshot.parts[picking]?.id}
          onPick={p => setPart(picking, p)}
          onClose={() => setPicking(null)}
        />
      )}

      <ProjectSetupSections snapshot={snapshot} />
      <DeclaredGaps />
    </div>
  );
};

/**
 * Choosing a part from the catalogue.
 *
 * Filters on the same fields a reader would search by — Arabic name, English
 * name, brand — and caps what it renders. The cap is not cosmetic: some
 * categories have enough entries that rendering all of them on a phone is a
 * visible stall, and a bounded list with a "narrow your search" note is more
 * honest than a virtualised list that pretends the reader can scan hundreds.
 */
const PartPicker: React.FC<{
  category: string;
  current?: string;
  onPick: (p: BasePart) => void;
  onClose: () => void;
}> = ({ category, current, onPick, onClose }) => {
  const [q, setQ] = useState('');

  // The catalogue lookup lives INSIDE the memo. Pulling it out into a `??`
  // expression above would produce a fresh array identity on every render and
  // defeat the memo entirely — the filter would re-run on every keystroke in
  // any other field on the page.
  const matches = useMemo(() => {
    const all = PART_CATEGORY_MAP[category] ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return all;
    return all.filter(p =>
      p.nameAr.includes(q.trim())
      || p.nameEn.toLowerCase().includes(needle)
      || (p.brand ?? '').toLowerCase().includes(needle));
  }, [q, category]);

  const LIMIT = 40;
  const shown = matches.slice(0, LIMIT);

  return (
    <section className="card" data-testid={`part-picker-${category}`} style={{ padding: '16px 18px', marginTop: 16 }}>
      <header style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900, flex: 1 }}>
          {PART_CATEGORY_LABEL_AR[category] ?? category}
        </h3>
        <button type="button" className="btn-ghost" onClick={onClose} data-testid="part-picker-close">أغلق</button>
      </header>

      <label htmlFor="part-q" className="sr-only">ابحث في الكتالوج</label>
      <input
        id="part-q" data-testid="part-picker-search" className="admin-field"
        style={{ marginTop: 12 }} value={q} onChange={e => setQ(e.target.value)}
        placeholder="ابحث بالاسم العربي أو الإنجليزي أو الشركة"
      />

      <p aria-live="polite" style={{ fontSize: 12, color: 'var(--text-dimmer)', margin: '9px 0 0' }}>
        <span dir="ltr" data-testid="part-picker-count">{matches.length}</span> نتيجة
        {matches.length > LIMIT && <> — تُعرض أول <span dir="ltr">{LIMIT}</span>، ضيّق البحث لرؤية البقية</>}
      </p>

      {shown.length === 0 ? (
        <p className="admin-empty" data-testid="part-picker-empty">لا نتائج مطابقة.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'grid', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
          {shown.map(p => (
            <li key={p.id}>
              <button
                type="button"
                className="card-sm"
                data-testid={`part-option-${p.id}`}
                onClick={() => onPick(p)}
                style={{
                  width: '100%', textAlign: 'start', padding: '11px 13px', cursor: 'pointer',
                  fontFamily: 'inherit', color: 'inherit',
                  borderColor: p.id === current ? 'var(--border-accent)' : undefined,
                }}
              >
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800 }}>{p.nameAr}</span>
                <span className="ltr" style={{ fontSize: 11.5, color: 'var(--text-dimmer)' }}>
                  {p.nameEn}{p.brand ? ` · ${p.brand}` : ''}
                </span>
                {p.id === current && <span className="admin-badge admin-badge-ok" style={{ marginTop: 6 }}>المسجَّلة حالياً</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

/**
 * The control-link and video records.
 *
 * READ-ONLY ON THE WEB, ON PURPOSE
 * --------------------------------
 * Both are edited in the phone app's workspace, where they are filled in while
 * wiring and flashing with the hardware in hand. Reproducing those forms here
 * would be a second editor for the same document; what the web needs is for the
 * facts to be VISIBLE, because the verdicts reason from them and a reader
 * looking at a verdict needs to see what it was told.
 */
const ProjectSetupSections: React.FC<{ snapshot: ProjectSnapshot }> = ({ snapshot }) => {
  const rc = snapshot.rcSetup;
  const video = snapshot.videoSetup;

  return (
    <div className="admin-section">
      <h2>إعداد التحكم والفيديو</h2>
      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <SetupCard titleAr="إعداد التحكم اللاسلكي" testId="project-rc-setup"
          empty={!rc || Object.keys(rc).length === 0}
          rows={rc ? Object.entries(rc).map(([k, v]) => [k, String(v)]) : []} />
        <SetupCard titleAr="إعداد الفيديو" testId="project-video-setup"
          empty={!video || Object.keys(video).length === 0}
          rows={video ? Object.entries(video).map(([k, v]) => [k, String(v)]) : []} />
      </div>
    </div>
  );
};

const SetupCard: React.FC<{
  titleAr: string; testId: string; empty: boolean; rows: [string, string][];
}> = ({ titleAr, testId, empty, rows }) => (
  <section className="card-sm" data-testid={testId} style={{ padding: '14px 16px' }}>
    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 900 }}>{titleAr}</h3>
    {empty ? (
      <p style={{ margin: '9px 0 0', fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.9 }}>
        لم يُسجَّل شيء بعد. يُملأ هذا السجل من تطبيق الهاتف أثناء التوصيل والبرمجة،
        والأحكام أعلاه تعتمد عليه — فما دام فارغاً ستظهر «بيانات ناقصة».
      </p>
    ) : (
      <dl className="admin-kv" style={{ marginTop: 10 }}>
        {rows.map(([k, v]) => (
          <div key={k}><dt className="ltr">{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
    )}
  </section>
);

/**
 * What this platform does NOT model, said out loud.
 *
 * The requirement listed components the catalogue has no schema for. The
 * instruction was explicit: do not create fields that pretend to support them.
 * So they are named here instead. A reader who wonders "where do I record my
 * BEC?" gets an answer rather than a hunt.
 */
const DeclaredGaps: React.FC = () => (
  <section className="admin-section" data-testid="project-gaps">
    <h2>ما لا نسجّله بعد</h2>
    <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.95, margin: '0 0 10px' }}>
      هذه المكوّنات لا يملك القلب المشترك مخططاً لها اليوم، فلا نعرض لها حقولاً
      توهم بأننا نفحصها. تسجيلها بلا فحص أسوأ من عدم تسجيلها، لأن الحقل الفارغ
      يبدو كأنه فُحص ووُجد سليماً.
    </p>
    <ul style={{ margin: 0, paddingInlineStart: 20, fontSize: 13, lineHeight: 2, color: 'var(--text-dim)' }}>
      <li>BEC / UBEC منفصل، ومقاس الأسلاك، والموصّلات.</li>
      <li>الإضاءة (LEDs) والحمولة (Payload).</li>
      <li>الهوائيات والنظارات والكاميرا كقطع مستقلة — بعض حقائقها مسجَّلة داخل إعداد التحكم وإعداد الفيديو أعلاه.</li>
      <li>قطعة يدوية بمواصفات رقمية يقرأها محرك الأحكام.</li>
    </ul>
    <p style={{ fontSize: 12.5, color: 'var(--text-dimmer)', lineHeight: 1.9, margin: '10px 0 0' }}>
      لمعرفة ما تعنيه أي من هذه المكوّنات، افتح{' '}
      <Link href="/kb" style={{ color: 'var(--accent-ink)' }}>الموسوعة</Link> أو{' '}
      <Link href="/glossary" style={{ color: 'var(--accent-ink)' }}>القاموس</Link>.
    </p>
  </section>
);

export { droneTypes };
