import React, { useState } from 'react';
import type { BasePart } from '../../data/assembly/types';

// Generic hardcoded fallback — used whenever part.placeholderIcon is
// undefined. Per-category custom icons are a dedicated future task.
const DEFAULT_PART_ICON = '⚙️';

interface PartCardProps {
  part: BasePart;
  selected: boolean;
  onSelect: () => void;
}

// Compact list-row card — sized so the worst-case option count on any single
// stage (Stage 16 "Tools", 9 entries) still fits the 390×844 viewport
// without scrolling. See Phase 1 height-budget evidence.
export const PartCard: React.FC<PartCardProps> = ({ part, selected, onSelect }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      onClick={onSelect}
      style={{
        border: selected ? '2px solid #D4A574' : '1px solid #e5ddcf',
        background: selected ? '#fffbf7' : '#ffffff',
        borderRadius: 10,
        padding: 8,
        marginBottom: 6,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 40, aspectRatio: '4 / 3', borderRadius: 8, background: '#f5f1e8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontSize: 16, overflow: 'hidden',
          }}
        >
          {part.imagePath ? (
            <img src={part.imagePath} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span>{part.placeholderIcon ?? DEFAULT_PART_ICON}</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 12.5, fontWeight: 700, color: '#3a2e1f',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {part.nameEn}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, color: '#b08d4a', background: '#fff3cd',
              padding: '1px 6px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {part.tier}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
            {part.priceRangeUSD ? (
              <span dir="ltr" style={{ fontSize: 10.5, color: '#7a6a52' }}>
                {part.priceRangeUSD[0]}–{part.priceRangeUSD[1]} USD
              </span>
            ) : <span />}
            <button
              onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
              style={{ fontSize: 10, color: '#0e7c86', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              {expanded ? 'إخفاء' : 'الملاحظات'}
            </button>
          </div>
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #efe8da', fontSize: 10.5, color: '#5a4e3a' }}>
          {part.beginnerNotes.map((n, i) => <p key={`b${i}`} style={{ margin: '1px 0' }}>💡 {n}</p>)}
          {part.safetyNotes.map((n, i) => <p key={`s${i}`} style={{ margin: '1px 0' }}>⚠️ {n}</p>)}
          {part.buildNotes.map((n, i) => <p key={`n${i}`} style={{ margin: '1px 0' }}>🔧 {n}</p>)}
        </div>
      )}
    </div>
  );
};
