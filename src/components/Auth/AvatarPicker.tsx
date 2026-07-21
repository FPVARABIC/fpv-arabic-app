import React from 'react';
import { AVATAR_OPTIONS } from '../../data/avatars';

interface AvatarPickerProps {
  selected: string | null;
  onSelect: (path: string) => void;
}

// Shared preset-avatar grid (Part C) — used at email/password sign-up and
// reused, unchanged, from ProfileSheet.tsx's "تغيير الصورة الشخصية" entry
// point for every signed-in user (Google included). No custom upload —
// Blaze-blocked, see docs/KNOWN_ISSUES.md.
export const AvatarPicker: React.FC<AvatarPickerProps> = ({ selected, onSelect }) => (
  <div
    role="radiogroup"
    aria-label="اختر صورة شخصية"
    style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}
  >
    {AVATAR_OPTIONS.map(avatar => {
      const isSelected = selected === avatar.path;
      return (
        <button
          key={avatar.id}
          type="button"
          role="radio"
          aria-checked={isSelected}
          aria-label={avatar.label}
          onClick={() => onSelect(avatar.path)}
          style={{
            width: '100%',
            aspectRatio: '1',
            padding: 2,
            borderRadius: '50%',
            border: isSelected ? '2px solid #22d3ee' : '2px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          <img
            src={avatar.path}
            alt=""
            style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'block' }}
          />
        </button>
      );
    })}
  </div>
);
