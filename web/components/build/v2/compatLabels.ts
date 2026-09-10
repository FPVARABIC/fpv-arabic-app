import type { CompatRuleId } from '@core/data/assembly/compatibility/rules';

/**
 * WHAT A COMPATIBILITY RULE IS CALLED, FOR SOMEONE WHO IS NOT A MAINTAINER
 * =======================================================================
 *
 * The proposal used to print the rule's identifier straight into the
 * disclosure:
 *
 *     frame-size — سليم
 *
 * `frame-size` is a database key. It is in English, it is kebab-cased, and it
 * means nothing to the reader this journey is written for — it is the
 * «database-looking UI» the whole of V2 exists to replace, smuggled in behind
 * a detail toggle where it was easy to miss.
 *
 *     الإطار مقابل حجم البناء المعلن — سليم
 *
 * WHY A `Record` OVER THE UNION AND NOT A LOOKUP IN THE REGISTRY
 * --------------------------------------------------------------
 * `SHARED_COMPAT_RULES` already carries an Arabic `whatAr` per rule, and this
 * map takes its wording from there. But that registry is an ARRAY: a fifth
 * member could join `CompatRuleId` without ever being appended to it, and a
 * runtime lookup would then return `undefined` and fall back to — the id
 * again, which is the defect this file exists to remove.
 *
 * `Record<CompatRuleId, string>` cannot be under-populated. Add a rule to the
 * union and this file stops compiling until someone writes the sentence a
 * reader will see. `scripts/testBuildV2Proposal.ts` closes the other half:
 * every label here must still match the registry's `whatAr`, so the two
 * cannot drift into two different Arabic descriptions of one rule.
 *
 * DISPLAY ONLY. Nothing here evaluates anything; the shared rules remain the
 * technical truth, and this is the sentence printed next to their verdict.
 */
export const COMPAT_RULE_LABEL_AR: Record<CompatRuleId, string> = {
  'frame-size': 'الإطار مقابل حجم البناء المعلن',
  'frame-motor-class': 'فئة المحرك مقابل الإطار',
  'prop-clearance': 'قطر المروحة مقابل خلوص الإطار',
  'design-voltage': 'البطارية مقابل جهد التصميم المعلن',
};

/**
 * The reader-facing name of a rule.
 *
 * Typed to `CompatRuleId`, so there is no «unknown rule» branch to fall back
 * from. If a caller ever holds a wider string, that is a type error at the
 * call site — which is where it should be fixed, not papered over here.
 */
export const compatRuleLabelAr = (id: CompatRuleId): string => COMPAT_RULE_LABEL_AR[id];
