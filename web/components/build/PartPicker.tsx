'use client';

import { useState } from 'react';
import type { BasePart } from '@core/data/assembly/types';
import { partLabel } from '@/lib/build/labels';
import {
  checkCandidate, checkEcosystemFit, CANDIDATE_VERDICT_LABEL_AR,
  type BuildContext, type CandidateVerdict,
} from '@/lib/build/checks';
import type { TierPreference } from '@/lib/build/draft';

/**
 * One category's candidates, each carrying its verdict BEFORE selection.
 *
 * WHAT A CARD SHOWS AND WHY
 * -------------------------
 * The verdict chip («متوافق» / «يحتاج مراجعة» / «غير متوافق») with its
 * reasons, the tier, the documented price range, and the two authored quick
 * tags. The «لماذا هذه القطعة؟» disclosure carries the full authored record —
 * whyChoose, notFor, the notes — because a recommendation without its
 * counter-case is advertising, not guidance.
 *
 * WHAT SELECTION REFUSES — AND WHAT GUIDED MODES FOLD AWAY
 * --------------------------------------------------------
 * A documented incompatibility cannot be selected in the guided modes. It is
 * also not the first thing a first-time builder should wade through: a wall
 * of red cards reads as «كله غلط» before the eye finds the green ones. So the
 * guided modes fold the incompatible candidates behind one labelled toggle —
 * still one tap away WITH their reasons, because seeing why something is
 * wrong teaches more than hiding it, but no longer in the way of the actual
 * decision. Advanced mode folds nothing and may select anything (the reader
 * asked for control), and the full report will carry the same objection.
 */

const TIER_LABEL_AR: Record<string, string> = {
  budget: 'اقتصادي',
  mid: 'متوازن',
  premium: 'Premium',
};

const VERDICT_STYLE: Record<CandidateVerdict, { cls: string; icon: string }> = {
  ok: { cls: 'admin-badge admin-badge-ok', icon: '✓' },
  review: { cls: 'admin-badge admin-badge-warn', icon: '؟' },
  incompatible: { cls: 'admin-badge admin-badge-bad', icon: '⛔' },
};

export interface PartPickerProps {
  category: string;
  candidates: readonly BasePart[];
  ctx: BuildContext;
  selectedId?: string;
  /** The reader's uncatalogued part for this category, when they named one. */
  externalName?: string;
  optional?: boolean;
  tierPref?: TierPreference;
  videoSystemPref?: string;
  rcProtocolPref?: string;
  /** Advanced mode: everything selectable, catalogue order. */
  advanced?: boolean;
  onSelect: (part: BasePart) => void;
  onClearExternal?: () => void;
}

export const PartPicker: React.FC<PartPickerProps> = ({
  category, candidates, ctx, selectedId, externalName, optional,
  tierPref, videoSystemPref, rcProtocolPref, advanced, onSelect, onClearExternal,
}) => {
  const judged = candidates.map(part => {
    const base = checkCandidate(category, part, ctx);
    const eco = checkEcosystemFit(category, part, { videoSystem: videoSystemPref, rcProtocol: rcProtocolPref });
    const verdict: CandidateVerdict =
      base.verdict === 'incompatible' || eco.verdict === 'incompatible' ? 'incompatible'
      : base.verdict === 'review' || eco.verdict === 'review' ? 'review'
      : 'ok';
    return { part, verdict, reasonsAr: [...base.reasonsAr, ...eco.reasonsAr] };
  });

  // Guided ordering: cleanest verdict first, the reader's budget tier first
  // within it. Advanced keeps the catalogue's own order — control means the
  // list does not reshuffle under your preferences.
  const ordered = advanced ? judged : [...judged].sort((a, b) => {
    const rank: Record<CandidateVerdict, number> = { ok: 0, review: 1, incompatible: 2 };
    if (rank[a.verdict] !== rank[b.verdict]) return rank[a.verdict] - rank[b.verdict];
    if (tierPref) {
      const prefRank = (p: BasePart) => (p.tier === tierPref ? 0 : 1);
      return prefRank(a.part) - prefRank(b.part);
    }
    return 0;
  });

  // Guided modes fold the incompatible away; advanced folds nothing.
  const shown = advanced ? ordered : ordered.filter(x => x.verdict !== 'incompatible');
  const folded = advanced ? [] : ordered.filter(x => x.verdict === 'incompatible');
  const [showFolded, setShowFolded] = useState(false);

  return (
    <div data-testid={`part-picker-${category}`}>
      <h3 style={{ fontSize: 15.5, fontWeight: 900, margin: '0 0 4px' }}>
        {partLabel(category)}
        {optional && (
          <span className="admin-badge" style={{ marginInlineStart: 8, fontSize: 10.5 }}>اختياري</span>
        )}
      </h3>

      {externalName && (
        <div className="card-sm" data-testid={`external-part-${category}`}
          style={{ padding: '12px 14px', margin: '8px 0' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800 }}>
            قطعتك الحالية: {externalName}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--sev-warning)', lineHeight: 1.9 }}>
            قطعة من خارج الكتالوج — لا يمكن فحص توافقها آلياً. راجع دليل الشركة
            المصنّعة قبل الاعتماد عليها في منظومة الطاقة.
          </p>
          {onClearExternal && (
            <button type="button" className="btn-ghost" style={{ marginTop: 8, fontSize: 12 }}
              onClick={onClearExternal}>
              استبدلها باختيار من الكتالوج
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
        {shown.map(({ part, verdict, reasonsAr }) => (
          <PartCard
            key={part.id}
            part={part}
            verdict={verdict}
            reasonsAr={reasonsAr}
            selected={selectedId === part.id}
            selectable={advanced || verdict !== 'incompatible'}
            recommended={!advanced && !!tierPref && part.tier === tierPref && verdict === 'ok'}
            onSelect={() => onSelect(part)}
          />
        ))}
        {ordered.length === 0 && (
          <p className="card-sm" style={{ padding: '13px 15px', fontSize: 13, color: 'var(--text-dim)' }}>
            {optional
              ? 'لا خيارات موثقة لهذه الفئة مع اختياراتك الحالية — الفئة اختيارية ويمكنك المتابعة.'
              : 'لا قطع متوافقة مع اختياراتك الحالية — عد خطوة وغيّر ما قبلها.'}
          </p>
        )}
        {shown.length === 0 && folded.length > 0 && (
          <p className="card-sm" style={{ padding: '13px 15px', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.9 }}>
            كل قطع هذه الفئة غير متوافقة مع اختياراتك الحالية — اقرأ الأسباب
            أدناه، أو عد خطوة وغيّر ما قبلها.
          </p>
        )}
      </div>

      {folded.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <button type="button" className="btn-ghost" aria-expanded={showFolded}
            data-testid={`show-blocked-${category}`}
            onClick={() => setShowFolded(o => !o)}
            style={{ fontSize: 12.5 }}>
            {/* The count is one LTR token, parentheses included — split
                around the digit they shatter when this label wraps in RTL. */}
            {showFolded
              ? 'أخفِ غير المتوافقة'
              : <>غير المتوافقة مع بنائك <span dir="ltr">({folded.length})</span> — اعرض لماذا لا تصلح</>}
          </button>
          {showFolded && (
            <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
              {folded.map(({ part, verdict, reasonsAr }) => (
                <PartCard
                  key={part.id}
                  part={part}
                  verdict={verdict}
                  reasonsAr={reasonsAr}
                  selected={selectedId === part.id}
                  selectable={false}
                  recommended={false}
                  onSelect={() => onSelect(part)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PartCard: React.FC<{
  part: BasePart;
  verdict: CandidateVerdict;
  reasonsAr: string[];
  selected: boolean;
  selectable: boolean;
  recommended: boolean;
  onSelect: () => void;
}> = ({ part, verdict, reasonsAr, selected, selectable, recommended, onSelect }) => {
  const [open, setOpen] = useState(false);
  const style = VERDICT_STYLE[verdict];

  return (
    <article
      className="card-sm"
      data-testid={`part-card-${part.id}`}
      data-verdict={verdict}
      style={{
        padding: '14px 16px',
        border: selected ? '2px solid var(--accent-ink)' : undefined,
        opacity: !selectable && !selected ? 0.75 : 1,
      }}
    >
      <header style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 900 }}>{part.nameAr}</h4>
          <p style={{ margin: '3px 0 0', fontSize: 11.5, color: 'var(--text-dimmer)' }} dir="ltr">
            {part.nameEn}{part.brand ? ` — ${part.brand}` : ''}
          </p>
        </div>
        <span className={style.cls} data-testid={`part-verdict-${part.id}`}>
          <span aria-hidden>{style.icon}</span> {CANDIDATE_VERDICT_LABEL_AR[verdict]}
        </span>
      </header>

      <p style={{ margin: '8px 0 0', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <span className="admin-badge" style={{ fontSize: 10.5 }}>{TIER_LABEL_AR[part.tier] ?? part.tier}</span>
        {recommended && (
          <span className="admin-badge admin-badge-ok" style={{ fontSize: 10.5 }}
            data-testid={`part-recommended-${part.id}`}>
            مقترح لميزانيتك
          </span>
        )}
        {part.priceRangeUSD && (
          <span style={{ fontSize: 11.5, color: 'var(--text-dimmer)' }} dir="ltr">
            ${part.priceRangeUSD[0]}–${part.priceRangeUSD[1]}
          </span>
        )}
        {part.confidence && (
          <span style={{ fontSize: 11, color: 'var(--text-dimmer)' }}>التوثيق: {part.confidence}</span>
        )}
      </p>

      {part.quickTags && (
        <p style={{ margin: '7px 0 0', fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.85 }}>
          {part.quickTags.whyTag} · {part.quickTags.noteTag}
        </p>
      )}

      {reasonsAr.length > 0 && (
        <ul data-testid={`part-reasons-${part.id}`} style={{
          margin: '8px 0 0', paddingInlineStart: 18, fontSize: 12.5,
          color: verdict === 'incompatible' ? 'var(--sev-blocker)' : 'var(--sev-warning)',
          lineHeight: 1.9, display: 'grid', gap: 3,
        }}>
          {reasonsAr.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 11, flexWrap: 'wrap' }}>
        <button
          type="button"
          className={selected ? 'btn-ghost' : 'btn-primary'}
          data-testid={`part-select-${part.id}`}
          disabled={!selectable}
          onClick={onSelect}
          style={{ fontSize: 13 }}
        >
          {selected ? '✓ مختارة' : selectable ? 'اختر هذه القطعة' : 'غير قابلة للاختيار'}
        </button>
        <button
          type="button"
          className="btn-ghost"
          aria-expanded={open}
          data-testid={`part-why-${part.id}`}
          onClick={() => setOpen(o => !o)}
          style={{ fontSize: 12.5 }}
        >
          {open ? 'أخفِ التفاصيل' : 'لماذا هذه القطعة؟'}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 11, display: 'grid', gap: 9, fontSize: 13, lineHeight: 1.95, color: 'var(--text-dim)' }}>
          {part.whyChoose && <Detail titleAr="لماذا؟">{part.whyChoose}</Detail>}
          {part.notFor && <Detail titleAr="متى لا تختارها؟">{part.notFor}</Detail>}
          {part.beginnerNotes.length > 0 && (
            <Detail titleAr="للمبتدئ">{part.beginnerNotes.join(' · ')}</Detail>
          )}
          {part.safetyNotes.length > 0 && (
            <Detail titleAr="السلامة">{part.safetyNotes.join(' · ')}</Detail>
          )}
          {part.buildNotes.length > 0 && (
            <Detail titleAr="ملاحظات البناء">{part.buildNotes.join(' · ')}</Detail>
          )}
          {part.upgradePath && <Detail titleAr="مسار الترقية">{part.upgradePath}</Detail>}
          {part.lastReviewed && (
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-dimmer)' }}>
              آخر مراجعة: <span dir="ltr">{part.lastReviewed}</span>
            </p>
          )}
        </div>
      )}
    </article>
  );
};

const Detail: React.FC<{ titleAr: string; children: React.ReactNode }> = ({ titleAr, children }) => (
  <div>
    <span style={{ fontWeight: 900, fontSize: 12, color: 'var(--text-dimmer)' }}>{titleAr} </span>
    <span>{children}</span>
  </div>
);
