/**
 * COUNTING IN ARABIC, WHICH IS NOT COUNTING IN ENGLISH
 * ====================================================
 *
 * «حسمنا 6 اختيارات، ونحتاج رأيك في اختيارين.» The numbers are derived from
 * the engine, so the sentence has to survive every value they can take — and
 * Arabic does not pluralise by appending a digit and an «s».
 *
 *   1   اختيار واحد          singular, the noun carries the count
 *   2   اختيارين             the dual — a form English does not have, and the
 *                            one machine-translated Arabic always gets wrong
 *   3-10 ٣ اختيارات          the numeral, then the plural
 *   11+ ١١ اختيارًا           the numeral, then the SINGULAR accusative
 *
 * Writing «6 اختيار» or «2 اختيارات» is the tell that nobody who speaks the
 * language read the screen. The engine can produce any of 0-8 here, so all
 * four forms are reachable and all four are tested.
 *
 * Arabic-Indic digits, because the rest of the product uses them.
 */

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export const arabicNumber = (n: number): string =>
  String(n).split('').map(c => AR_DIGITS[Number(c)] ?? c).join('');

export interface ArabicNoun {
  /** «اختيار» — used with 1 and with 11+. */
  singular: string;
  /** «اختياران/اختيارين» — the dual, in the form these sentences need. */
  dual: string;
  /** «اختيارات» — used with 3-10. */
  plural: string;
  /** «اختيارًا» — the accusative singular used after 11+. */
  accusative: string;
}

export const CHOICE_NOUN: ArabicNoun = {
  singular: 'اختيار واحد',
  dual: 'اختيارين',
  plural: 'اختيارات',
  accusative: 'اختيارًا',
};

/** «اختيار واحد» · «اختيارين» · «٦ اختيارات» · «١١ اختيارًا» */
export function arabicCount(n: number, noun: ArabicNoun): string {
  if (n === 1) return noun.singular;
  if (n === 2) return noun.dual;
  if (n >= 3 && n <= 10) return `${arabicNumber(n)} ${noun.plural}`;
  return `${arabicNumber(n)} ${noun.accusative}`;
}
