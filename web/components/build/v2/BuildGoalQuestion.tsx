'use client';

import React from 'react';
import { droneTypes } from '@core/data/assembly/droneTypes';
import { buildTypeAvailability, unavailableLabelAr } from '@/lib/build/availability';
import { GOAL } from './copy';
import { ChoiceCard, ChoiceList, QuestionShell } from './QuestionShell';

/**
 * WHAT DO YOU WANT TO BUILD?
 *
 * Availability is NOT re-derived here. `BUILD_TYPE_AVAILABILITY` is the one
 * authority, proven against the live catalogue by
 * `scripts/testBuildReachability.ts` in both directions — so a type that
 * becomes buildable turns itself back on here with no React change at all.
 * A second opinion in a component is how «قريبًا» ends up sitting on a type
 * that works.
 *
 * An unavailable type stays VISIBLE. Hiding it would leave a reader wondering
 * whether the site knows Cinewhoops exist; showing it disabled, named, and
 * with the real reason answers the question they actually have.
 */
export const BuildGoalQuestion: React.FC<{
  value?: string;
  onChange: (droneTypeId: string) => void;
}> = ({ value, onChange }) => (
  <QuestionShell question={GOAL.question} help={GOAL.help}>
    <ChoiceList label={GOAL.question}>
      {droneTypes.map(t => {
        const a = buildTypeAvailability(t.id);
        return (
          <ChoiceCard
            key={t.id}
            testId={`v2-goal-${t.id}`}
            label={t.primaryName}
            note={t.description}
            disabled={!a.available}
            disabledBadge={unavailableLabelAr()}
            disabledReason={a.reasonAr}
            selected={value === t.id}
            onSelect={() => onChange(t.id)}
          />
        );
      })}
    </ChoiceList>
  </QuestionShell>
);
