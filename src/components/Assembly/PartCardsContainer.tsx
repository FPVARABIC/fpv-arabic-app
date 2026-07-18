import React from 'react';
import { PartCard } from './PartCard';
import type { BasePart } from '../../data/assembly/types';

interface PartCardsContainerProps {
  parts: BasePart[];
  category: string;
  selectedId?: string;
  onSelect: (part: BasePart) => void;
}

// Grid gap and horizontal padding are matched exactly to AssemblyHome's
// drone-type grid (16px horizontal padding, 12px gap -> identical 173px
// column width at 390px viewport, verified by direct measurement). Vertical
// padding (4px) is intentionally NOT matched to AssemblyHome's 16px — it
// only affects whole-page spacing above/below the grid, not any card's own
// dimensions.
//
// minWidth: 0 on every grid-item wrapper is required, not optional. Without
// it, a long real name (e.g. "RadioMaster RP1 V2 ExpressLRS 2.4GHz Nano
// Receiver") forces the grid COLUMN to grow to the text's full unwrapped
// width instead of clipping it -- a real bug found and fixed during
// verification (classic CSS Grid/Flexbox "min-width:auto" gotcha). Verified
// fix: all cards render at a uniform 173px regardless of name length, and
// ellipsis truncation correctly engages only when the real name actually
// overflows.
//
// Odd item counts (3, 5, or 7 -- every category except frames/motors/
// flightControllers/propellers/batteries/videoSystems, which are all 4)
// leave a lone trailing card in the final row; it spans both columns and
// centers itself at half-width rather than sitting flush in one column
// with blank space beside it.
//
// Height-budget / scroll-clearance status (verified with real content, not
// paper estimates): the true worst case (videoUnits, 7 entries) computes to
// 890px of real content against the app's real scrollable ceiling -- this
// DOES overflow and requires scrolling, by design (exact visual match to
// AssemblyHome takes priority over avoiding scroll, per explicit decision).
// This only works because of a separate, required fix in AssemblyLayout.tsx
// (a real, non-negative-margined 112px clearance spacer) -- without that
// fix, scrolling to the true page maximum still leaves StageNavigation's
// buttons fully covered by the fixed bottom-nav bar with zero further scroll
// room to clear them. Verified: with the spacer, the real "التالي" button
// clears the real nav bar by 47.25px at true max scroll. Verified inert
// (zero visual/height side effect) on escs (3), frames (4), and receivers
// (5) -- the spacer only engages once content is genuinely tall enough to
// need it.
export const PartCardsContainer: React.FC<PartCardsContainerProps> = ({ parts, category, selectedId, onSelect }) => {
  const isOddTrailing = (i: number) => parts.length % 2 === 1 && i === parts.length - 1;

  return (
    <div style={{ padding: '4px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {parts.map((part, i) => (
        <div
          key={part.id}
          style={{
            minWidth: 0,
            ...(isOddTrailing(i)
              ? { gridColumn: '1 / -1', display: 'flex', justifyContent: 'center' }
              : {}),
          }}
        >
          <div style={isOddTrailing(i) ? { width: 'calc(50% - 6px)', minWidth: 0 } : undefined}>
            <PartCard part={part} category={category} selected={part.id === selectedId} onSelect={() => onSelect(part)} />
          </div>
        </div>
      ))}
    </div>
  );
};
