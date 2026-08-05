'use client';

import type { RefOptionGroup } from '@/lib/projectRefOptions';
import type { RefInput } from '@/app/admin/projects/actions';

/**
 * Choosing where something in a project points.
 *
 * WHY A DROPDOWN OF REAL IDS AND NOT A TEXT FIELD
 * -----------------------------------------------
 * A text field is how a dead link gets written. The ids offered here are read
 * from the live registries — every encyclopedia article, every glossary term,
 * every product, every software-centre entry — so the ordinary path cannot
 * produce a target that does not exist. The server re-checks the id anyway,
 * because a `<select>` is a courtesy and a POST body is a claim.
 *
 * THE TWO NON-TARGETS ARE FIRST-CLASS, NOT AN ESCAPE HATCH
 * --------------------------------------------------------
 * «سيضاف لاحقاً» and «خارج المنصّة» are the honest answers, and they are meant
 * to be chosen often — most of what an AI-and-drones project needs, this
 * encyclopedia has not written yet. They are two options rather than one
 * because they say different things: one is a backlog entry, the other is
 * «we do not do this, here is who does». Merging them would turn «Raspberry Pi
 * is not something we stock» into a promise to stock it.
 */
export const RefPicker: React.FC<{
  value: RefInput;
  groups: RefOptionGroup[];
  plannedSections: readonly string[];
  onChange: (next: RefInput) => void;
  /** Rendered as the field's label, so a screen reader knows which row this is. */
  labelAr: string;
}> = ({ value, groups, plannedSections, onChange, labelAr }) => {
  const group = groups.find(g => g.to === value.to);

  return (
    <div className="pe-ref" data-testid="ref-picker">
      <label className="pe-field">
        <span>{labelAr}</span>
        <select
          value={value.to}
          onChange={e => onChange({ ...value, to: e.target.value, id: '' })}
        >
          {groups.map(g => (
            <option key={g.to} value={g.to}>{g.labelAr}</option>
          ))}
        </select>
      </label>

      {value.to === 'planned' && (
        <label className="pe-field">
          <span>القسم الذي سيُضاف إليه</span>
          <select
            value={value.sectionAr}
            onChange={e => onChange({ ...value, sectionAr: e.target.value })}
          >
            <option value="">— اختر —</option>
            {plannedSections.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      )}

      {value.to === 'elsewhere' && (
        <label className="pe-field">
          <span>من أين يأتي فعلاً</span>
          <input
            type="text"
            value={value.whereAr}
            maxLength={200}
            placeholder="مثال: من موزّعي NVIDIA المعتمدين — متجرنا لا يبيع حواسيب مرافقة"
            onChange={e => onChange({ ...value, whereAr: e.target.value })}
          />
        </label>
      )}

      {group && group.options.length > 0 && (
        <label className="pe-field">
          <span>الهدف</span>
          <select
            value={value.id}
            onChange={e => onChange({ ...value, id: e.target.value })}
          >
            <option value="">— اختر —</option>
            {group.options.map(o => (
              <option key={o.id} value={o.id}>{o.labelAr}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
};

/** A fresh reference, defaulting to the honest absence rather than a guess. */
export function blankRef(): RefInput {
  return { to: 'planned', id: '', sectionAr: 'الموسوعة', whereAr: '' };
}

/** Turn a stored reference back into the form's shape. */
export function refToInput(ref: { to: string; [k: string]: unknown } | undefined): RefInput {
  if (!ref) return blankRef();
  return {
    to: ref.to,
    id: typeof ref.id === 'string' ? ref.id : '',
    sectionAr: typeof ref.sectionAr === 'string' ? ref.sectionAr : 'الموسوعة',
    whereAr: typeof ref.whereAr === 'string' ? ref.whereAr : '',
  };
}
