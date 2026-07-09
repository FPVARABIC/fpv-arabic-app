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
// Cinematic/Long-Range research additions touched shared files). Cinewhoop
// remains disabled/out of scope — no part data exists for it. Beginner was
// removed entirely from droneTypes.ts (not merely disabled) per an
// explicit product decision — see droneTypes.ts directly for the current
// type list. The remaining locked type renders disabled in its locked
// array position — no reordering by data-availability status. 2-column
// grid, compact cards sized so all five (3 rows, last one trailing/
// centered) fit the 390×844 viewport without scrolling — see Phase 1
// height-budget evidence.
export const AssemblyHome: React.FC<AssemblyHomeProps> = ({ onSelectType }) => (
  <div style={{ padding: 16 }}>
    <h1 style={{ fontSize: 18, fontWeight: 800, color: '#3a2e1f', margin: '4px 0 2px' }}>التجميع</h1>
    <p style={{ fontSize: 12, color: '#7a6a52', margin: '0 0 12px' }}>هنا تختار القطع المناسبة لمشروعك</p>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {droneTypes.map(type => {
        const isAvailable = ['freestyle', 'racing', 'cinematic', 'long-range'].includes(type.id);
        return (
          <button
            key={type.id}
            disabled={!isAvailable}
            onClick={() => isAvailable && onSelectType(type.id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'stretch',
              padding: 8, borderRadius: 12, textAlign: 'center',
              border: isAvailable ? '1px solid #D4A574' : '1px solid #e5ddcf',
              background: isAvailable ? '#ffffff' : '#f5f1e8',
              opacity: isAvailable ? 1 : 0.55,
              cursor: isAvailable ? 'pointer' : 'not-allowed',
            }}
          >
            <div style={{ position: 'relative' }}>
              <TypeImage imagePath={type.imagePath} />
              {!isAvailable && (
                <span style={{
                  position: 'absolute', top: 4, insetInlineStart: 4,
                  fontSize: 9, fontWeight: 700, color: '#b08d4a',
                  background: '#fff3cd', padding: '2px 6px', borderRadius: 999,
                }}>
                  قريباً
                </span>
              )}
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: isAvailable ? '#3a2e1f' : '#a89a80' }}>
              {type.primaryName}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);
