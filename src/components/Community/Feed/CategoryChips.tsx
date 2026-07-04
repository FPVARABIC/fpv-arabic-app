import React from 'react';
import { VISIBLE_CATEGORY_IDS, CATEGORY_LABELS, CATEGORY_TINTS } from '../utils/categories';
import type { PostCategory } from '../types';

export type ChipValue = PostCategory | 'all';

interface CategoryChipsProps {
  value: ChipValue;
  onChange: (value: ChipValue) => void;
}

const ALL_TINT = { bg: '#eef2f6', text: '#5a6b7c' };

export const CategoryChips: React.FC<CategoryChipsProps> = ({ value, onChange }) => (
  <div
    className="no-scrollbar"
    style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 16px 12px' }}
  >
    <Chip label="الكل" active={value === 'all'} tint={ALL_TINT} onClick={() => onChange('all')} />
    {VISIBLE_CATEGORY_IDS.map(id => (
      <Chip
        key={id}
        label={CATEGORY_LABELS[id]}
        active={value === id}
        tint={CATEGORY_TINTS[id]}
        onClick={() => onChange(id)}
      />
    ))}
  </div>
);

const Chip: React.FC<{
  label: string;
  active: boolean;
  tint: { bg: string; text: string };
  onClick: () => void;
}> = ({ label, active, tint, onClick }) => (
  <button
    onClick={onClick}
    style={{
      flexShrink: 0,
      padding: '7px 14px',
      borderRadius: 999,
      fontSize: 13,
      fontWeight: 600,
      border: active ? '1px solid #0e7c86' : '0.5px solid #e5eaf0',
      background: active ? '#0e7c86' : tint.bg,
      color: active ? '#ffffff' : tint.text,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    }}
  >
    {label}
  </button>
);
