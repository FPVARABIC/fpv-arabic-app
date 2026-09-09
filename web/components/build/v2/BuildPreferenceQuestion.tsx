'use client';

import React from 'react';
import { BUDGET } from './copy';
import { ChoiceCard, ChoiceList, QuestionShell } from './QuestionShell';

/** «none» is a real answer — it means «send no budgetTier to the engine». */
export type BudgetAnswer = 'budget' | 'mid' | 'premium' | 'none';

/**
 * A PREFERENCE, AND ONLY A PREFERENCE.
 *
 * `tier` is the one field in this catalogue that can order compatible parts,
 * and it is already what V1's «ضمن فئة ميزانيتك» badge reads. So the three
 * tiers map onto real data rather than a story about money.
 *
 * WHY «الفئة الأعلى» AND NOT «السعر ليس الأولوية»
 * ----------------------------------------------
 * They are different statements. `premium` is a label the catalogue puts on a
 * part; «price is not a priority» is a claim about the reader's wallet that
 * nobody asked them to make. The honest label names the tier.
 *
 * And it is optional. «لا تفضيل» sends no tier at all, which leaves every
 * viable part in the running and every tied category honestly unresolved —
 * exactly what the engine does when it has no ranking evidence.
 */
export const BuildPreferenceQuestion: React.FC<{
  value?: BudgetAnswer;
  onChange: (value: BudgetAnswer) => void;
}> = ({ value, onChange }) => (
  <QuestionShell question={BUDGET.question} help={BUDGET.help}>
    <ChoiceList label={BUDGET.question}>
      {BUDGET.options.map(o => (
        <ChoiceCard
          key={o.value}
          testId={`v2-budget-${o.value}`}
          label={o.label}
          note={o.value === 'none' ? BUDGET.noneNote : undefined}
          selected={value === o.value}
          onSelect={() => onChange(o.value as BudgetAnswer)}
        />
      ))}
    </ChoiceList>
  </QuestionShell>
);
