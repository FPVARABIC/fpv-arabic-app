/**
 * The non-component half of the setup-form primitives.
 *
 * Split out of `SetupFields.tsx` because a file that exports both components
 * and plain values breaks Fast Refresh: React cannot hot-swap a module whose
 * exports it cannot prove are all components, so editing one label in the form
 * would remount the whole workspace and throw away the draft the user was
 * typing. That is a real cost during authoring, not a lint formality.
 *
 * What lives here is everything the widgets need but that is not itself a
 * widget: the two shared style objects, and the one helper that turns a
 * closed-set Arabic label map into options.
 */

/** One choice in a select, carrying the stored value and its Arabic label. */
export type Option<T extends string> = { value: T; label: string };

/**
 * Turns a closed-set Arabic label map into options, preserving declared order.
 *
 * Declared order matters: the enums are written in the order a reader thinks
 * about them (analog before digital, unknown last), and re-sorting them
 * alphabetically in Arabic would scatter that.
 */
export function optionsOf<T extends string>(labels: Record<T, string>): Option<T>[] {
  return (Object.keys(labels) as T[]).map(value => ({ value, label: labels[value] }));
}

export const LABEL: React.CSSProperties = {
  fontSize: 11, color: '#64748b', marginBottom: 3, display: 'block',
};

export const FIELD: React.CSSProperties = {
  width: '100%', fontSize: 12.5, padding: '8px 9px', borderRadius: 9,
  border: '1px solid rgba(15,23,42,0.15)', background: '#fff', color: '#0f172a',
};
