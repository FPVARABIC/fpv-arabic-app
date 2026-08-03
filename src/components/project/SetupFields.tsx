import React from 'react';
import { LABEL, FIELD, type Option } from './setupFieldStyles';

/**
 * The form primitives both setup records are edited with.
 *
 * Extracted when the video record arrived, for one reason: a second copy of
 * `Select`, `Text`, `Num` and `Toggle` would have meant that a fix to how an
 * optional field clears itself — or to how a number input handles a non-numeric
 * paste — had to be made twice, and would eventually be made once. The
 * control-link card and the video card are different forms about different
 * subjects; the widgets they are built from are the same widgets.
 *
 * The shared behaviour that matters and must not diverge:
 *   · every control can return to `undefined`, because every field is optional
 *     and "I do not know" has to stay expressible after a value was entered
 *   · latin-alphabet values (model names, versions, dates) render LTR inside an
 *     RTL page without dragging the label with them
 *   · the input `id` equals the `data-testid`, which is what lets a deep link
 *     name a field and have the form focus it
 *
 * The style objects and `optionsOf` live in `setupFieldStyles.ts` rather than
 * here: a module that exports both components and plain values cannot be hot
 * -swapped, and remounting the whole workspace on every edit would discard the
 * draft the user is typing into it.
 */

export const Row: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 9 }}>{children}</div>
);

export function Select<T extends string>({ label, value, options, onChange, testid }: {
  label: string; value: T | undefined; options: Option<T>[];
  onChange: (v: T | undefined) => void; testid: string;
}) {
  return (
    <div>
      <label style={LABEL} htmlFor={testid}>{label}</label>
      <select
        id={testid}
        data-testid={testid}
        value={value ?? ''}
        onChange={e => onChange((e.target.value || undefined) as T | undefined)}
        style={FIELD}
      >
        <option value="">— غير محدد —</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export const Text: React.FC<{
  label: string; value: string | undefined; onChange: (v: string | undefined) => void;
  testid: string; placeholder?: string; dirLtr?: boolean;
}> = ({ label, value, onChange, testid, placeholder, dirLtr }) => (
  <div>
    <label style={LABEL} htmlFor={testid}>{label}</label>
    <input
      id={testid}
      data-testid={testid}
      type="text"
      value={value ?? ''}
      placeholder={placeholder}
      dir={dirLtr ? 'ltr' : undefined}
      onChange={e => onChange(e.target.value.trim() === '' ? undefined : e.target.value)}
      style={{ ...FIELD, ...(dirLtr ? { unicodeBidi: 'isolate' as const, textAlign: 'left' as const } : {}) }}
    />
  </div>
);

export const Num: React.FC<{
  label: string; value: number | undefined; onChange: (v: number | undefined) => void;
  testid: string; min: number; max: number;
}> = ({ label, value, onChange, testid, min, max }) => (
  <div>
    <label style={LABEL} htmlFor={testid}>{label}</label>
    <input
      id={testid}
      data-testid={testid}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={value ?? ''}
      dir="ltr"
      onChange={e => {
        const n = Number(e.target.value);
        onChange(e.target.value === '' || !Number.isFinite(n) ? undefined : n);
      }}
      style={{ ...FIELD, textAlign: 'left', unicodeBidi: 'isolate' }}
    />
  </div>
);

/**
 * Three-state on purpose: yes, no, and «لم أسجّله».
 *
 * Pressing the active choice again clears it. That is not a convenience — for a
 * field like «الهوائي مركّب» the difference between "no" and "not recorded" is
 * the difference between a blocker and a request for data, and a two-state
 * control would silently turn every unanswered question into a "no".
 */
export const Toggle: React.FC<{
  label: string; value: boolean | undefined; onChange: (v: boolean | undefined) => void; testid: string;
}> = ({ label, value, onChange, testid }) => (
  <div>
    <span style={LABEL}>{label}</span>
    <div style={{ display: 'flex', gap: 6 }}>
      {[
        { v: true, t: 'نعم' }, { v: false, t: 'لا' },
      ].map(o => (
        <button
          key={String(o.v)}
          type="button"
          data-testid={`${testid}-${o.v ? 'yes' : 'no'}`}
          aria-pressed={value === o.v}
          onClick={() => onChange(value === o.v ? undefined : o.v)}
          style={{
            flex: 1, fontSize: 12, fontWeight: 700, padding: '8px 4px', borderRadius: 9, cursor: 'pointer',
            border: value === o.v ? '1px solid rgba(14,165,233,0.5)' : '1px solid rgba(15,23,42,0.15)',
            background: value === o.v ? 'rgba(14,165,233,0.10)' : '#fff',
            color: value === o.v ? '#0369a1' : '#475569',
          }}
        >
          {o.t}
        </button>
      ))}
    </div>
  </div>
);

export const SectionTitle: React.FC<{ children: React.ReactNode; accent?: string }> = ({
  children, accent = '#0369a1',
}) => (
  <div style={{
    fontSize: 11, fontWeight: 800, color: accent, margin: '4px 0 8px',
    paddingBottom: 4, borderBottom: '1px solid rgba(14,165,233,0.18)',
  }}>
    {children}
  </div>
);
