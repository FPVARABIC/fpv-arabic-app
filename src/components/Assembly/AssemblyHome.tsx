import React, { useState } from 'react';
import { droneTypes } from '../../data/assembly/droneTypes';

const DEFAULT_TYPE_ICON = '🚁';

interface TypeImageProps {
  imagePath?: string;
}

// No drone-type PNG assets exist on disk yet, so the <img> load always fails
// today — onError swaps to the emoji fallback rather than showing a broken
// image icon. Once real assets land under /assets/assembly/drone-types/,
// this same component picks them up with no further change.
const TypeImage: React.FC<TypeImageProps> = ({ imagePath }) => {
  const [failed, setFailed] = useState(false);
  const showImage = !!imagePath && !failed;

  return (
    <div
      style={{
        position: 'relative', width: '100%', aspectRatio: '4 / 3', borderRadius: 8, background: '#f5f1e8',
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', fontSize: 24, marginBottom: 6,
      }}
    >
      {showImage ? (
        <img
          src={imagePath}
          alt=""
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span>{DEFAULT_TYPE_ICON}</span>
      )}
    </div>
  );
};

interface AssemblyHomeProps {
  onSelectType: (droneTypeId: string) => void;
}

// 'freestyle', 'racing', 'cinematic', and 'long-range' all have real,
// verified part data behind them — every mandatory build stage populated
// and confirmed via a real end-to-end walkthrough reaching 100%
// compatibility for each (Racing re-confirmed unchanged after the later
// Cinematic/Long-Range research additions touched shared files). Beginner
// was removed entirely from droneTypes.ts (not merely disabled) per an
// explicit product decision — see droneTypes.ts directly for the current
// type list.
//
// Cinewhoop is filtered out here (not rendered at all) rather than shown
// disabled/"قريباً": no part data exists for it, and per an explicit later
// product decision, an unimplemented type should not occupy a visible slot
// at all. droneTypes.ts itself is left untouched (data preserved, not
// deleted) in case another part of the app still relies on the full list.
//
// VISIBLE_ORDER is a presentation-only reordering (droneTypes.ts's own
// array order is freestyle/cinematic/long-range/cinewhoop/racing — kept
// as-is) so the visible grid reads, in RTL, row 1: Cinematic/Freestyle,
// row 2: مدى طويل/سباقات — the explicit requested 2×2 layout. This grid
// DOES mirror its column order for RTL (re-verified directly via
// getBoundingClientRect() in a real browser: the first array item renders
// in the physical-right column, the second in physical-left, matching the
// page's dir="rtl") — so to get Cinematic reading first (rightmost) the
// array must list Cinematic before Freestyle, and مدى طويل before Racing.
// (An earlier version of this comment/order, based on a misread screenshot,
// had this backwards — corrected after direct pixel measurement.)
//
// All four visible types are real/available now (no locked/disabled cards
// remain on this screen), so the "قريباً" badge and disabled-card styling
// that used to apply to Cinewhoop no longer has a use case here. 2-column
// grid, compact cards, exactly 2 rows of 2 — fits the 390×844 viewport
// without scrolling.
const VISIBLE_ORDER = ['cinematic', 'freestyle', 'long-range', 'racing'];

export const AssemblyHome: React.FC<AssemblyHomeProps> = ({ onSelectType }) => {
  const visibleTypes = VISIBLE_ORDER
    .map(id => droneTypes.find(t => t.id === id))
    .filter((t): t is NonNullable<typeof t> => t !== undefined);

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 18, fontWeight: 800, color: '#3a2e1f', margin: '4px 0 2px' }}>التجميع</h1>
      <p style={{ fontSize: 12, color: '#7a6a52', margin: '0 0 12px' }}>هنا تختار القطع المناسبة لمشروعك</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {visibleTypes.map(type => (
          <button
            key={type.id}
            data-testid={`assembly-drone-type-${type.id}`}
            onClick={() => onSelectType(type.id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'stretch',
              padding: 8, borderRadius: 12, textAlign: 'center',
              border: '1px solid #D4A574',
              background: '#ffffff',
              opacity: 1,
              cursor: 'pointer',
            }}
          >
            <TypeImage imagePath={type.imagePath} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#3a2e1f' }}>
              {type.primaryName}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
