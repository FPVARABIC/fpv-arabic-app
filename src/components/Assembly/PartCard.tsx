import React, { useState } from 'react';
import type { BasePart } from '../../data/assembly/types';

// Generic hardcoded fallback — used whenever part.placeholderIcon is
// undefined. Per-category custom icons are a dedicated future task.
const DEFAULT_PART_ICON = '⚙️';

// specs is added per-subtype (Frame/Motor/Esc/...), not on BasePart itself —
// this widened type lets the card generically dump whatever spec fields the
// concrete part actually has, without needing a per-category prop type.
interface PartCardProps {
  part: BasePart & { specs?: Record<string, unknown> };
  selected: boolean;
  onSelect: () => void;
}

// 2-column grid card, matching AssemblyHome's drone-type card EXACTLY:
// same 16px horizontal container padding, same 12px grid gap (-> identical
// 173px column width at 390px viewport), same 8px card padding, same 4:3
// image ratio, same 8px image border-radius/#f5f1e8 background/6px
// marginBottom, same 12.5px/700/#3a2e1f label, same corner-badge styling,
// same 1px border (color changes only, width never does). This is a
// deliberate, exact match — not an adaptation — per explicit decision.
// The only additions beyond AssemblyHome's card are what a part needs that
// a drone type doesn't: a price line (appended below the label) and an
// info tap-target (a 32x32 corner overlay on the image, opposite corner
// from the tier badge — sized deliberately larger than an earlier attempt
// this session that measured a 20x20 corner icon as too small to tap).
// Both additions overlay/append; neither resizes the image, badge, or
// label. This card intentionally does NOT fit the worst-case (videoUnits,
// 7 entries) grid within the real no-scroll ceiling on its own — see
// PartCardsContainer.tsx's comment for the verified overflow amount and
// the clearance fix that makes the resulting scroll actually work.
export const PartCard: React.FC<PartCardProps> = ({ part, selected, onSelect }) => {
  const [expanded, setExpanded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const specEntries = Object.entries(part.specs ?? {});

  return (
    <div>
      <div
        onClick={onSelect}
        style={{
          border: `1px solid ${selected ? '#D4A574' : '#e5ddcf'}`,
          background: '#ffffff',
          borderRadius: 12,
          padding: 8,
          cursor: 'pointer',
        }}
      >
        <div style={{
          position: 'relative', width: '100%', aspectRatio: '4 / 3', borderRadius: 8,
          background: '#f5f1e8', display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', fontSize: 24, marginBottom: 6,
        }}>
          {part.imagePath && !imageFailed ? (
            <img
              src={part.imagePath}
              alt=""
              onError={() => setImageFailed(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span>{part.placeholderIcon ?? DEFAULT_PART_ICON}</span>
          )}
          <span style={{
            position: 'absolute', top: 4, insetInlineStart: 4,
            fontSize: 9, fontWeight: 700, color: '#b08d4a', background: '#fff3cd',
            padding: '2px 6px', borderRadius: 999, whiteSpace: 'nowrap',
          }}>
            {part.tier}
          </span>
          <button
            onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
            style={{
              position: 'absolute', top: 4, insetInlineEnd: 4, width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 999, border: 'none', background: 'rgba(255,255,255,0.85)',
              color: '#0e7c86', fontSize: 15, cursor: 'pointer', padding: 0,
            }}
          >
            ⓘ
          </button>
        </div>
        <div style={{
          fontSize: 12.5, fontWeight: 700, color: '#3a2e1f',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {part.nameEn}
        </div>
        {part.priceRangeUSD && (
          <div dir="ltr" style={{ fontSize: 10.5, color: '#7a6a52', marginTop: 2 }}>
            {part.priceRangeUSD[0]}–{part.priceRangeUSD[1]} USD
          </div>
        )}
      </div>
      {expanded && (
        <div style={{ marginTop: 4, padding: '6px 8px', fontSize: 10.5, color: '#5a4e3a', textAlign: 'start' }}>
          {part.whyChoose && <p style={{ margin: '1px 0' }}>✅ {part.whyChoose}</p>}
          {part.notFor && <p style={{ margin: '1px 0' }}>🚫 {part.notFor}</p>}
          {specEntries.map(([key, value]) => (
            <p key={key} style={{ margin: '1px 0' }}>📋 {key}: {String(value)}</p>
          ))}
          {part.beginnerNotes.map((n, i) => <p key={`b${i}`} style={{ margin: '1px 0' }}>💡 {n}</p>)}
          {part.safetyNotes.map((n, i) => <p key={`s${i}`} style={{ margin: '1px 0' }}>⚠️ {n}</p>)}
          {part.buildNotes.map((n, i) => <p key={`n${i}`} style={{ margin: '1px 0' }}>🔧 {n}</p>)}
        </div>
      )}
    </div>
  );
};
