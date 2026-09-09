'use client';

import React from 'react';
import type { RequiredInput } from '@core/data/assembly/recommendation/types';
import { batteryVoltageOptions } from '@core/data/assembly/batteryVoltageOptions';
import { SIZE_MEANING_AR, VOLTAGE_MEANING_AR } from '@/lib/build/labels';
import { REQUIRED_INPUT } from './copy';
import { ChoiceCard, ChoiceList, QuestionShell } from './QuestionShell';

/**
 * A QUESTION THE ENGINE ASKED FOR — NOT ONE THIS FILE DECIDED TO ASK.
 *
 * This is the rule Phase 2B is really testing. There is no hardcoded «first
 * size, then voltage» sequence anywhere in the UI: `proposeBuild()` returns
 * `requiredInputs`, and this renders whatever is in it.
 *
 * The consequence a reader can feel:
 *
 *   · Freestyle — one viable size, two viable voltages. They are asked the
 *     voltage and never shown a size screen at all.
 *   · Long-range — one viable size AND one viable voltage. They are asked
 *     NEITHER, and go straight from the goal to the summary.
 *   · Racing — nothing viable at any voltage, so the type never opens and the
 *     question is never put.
 *
 * If a future catalogue makes a second size viable for Freestyle, the size
 * question appears here on its own. Nothing in this component changes.
 *
 * THE OPTIONS COME FROM THE ENGINE TOO
 * ------------------------------------
 * `input.options` are the values the engine PROVED lead to a sound build — not
 * every value the catalogue declares. The wording below is borrowed from
 * `labels.ts`, where it is already written as «context, not a rule»: neither
 * voltage is called better, because nothing in the data says one is.
 */
export const BuildRequiredInputQuestion: React.FC<{
  input: RequiredInput;
  value?: number;
  onChange: (value: number) => void;
}> = ({ input, value, onChange }) => {
  const copy = REQUIRED_INPUT[input.key as keyof typeof REQUIRED_INPUT];

  const optionLabel = (raw: string | number): string => {
    if (input.key === 'cellCount') {
      return batteryVoltageOptions.find(o => o.sCount === raw)?.labelAr ?? `${raw}S`;
    }
    if (input.key === 'sizeInch') return `${raw} إنش`;
    return String(raw);
  };

  const optionNote = (raw: string | number): string | undefined => {
    if (input.key === 'cellCount') return VOLTAGE_MEANING_AR[Number(raw)];
    if (input.key === 'sizeInch') return SIZE_MEANING_AR[Number(raw)];
    return undefined;
  };

  return (
    <QuestionShell
      question={copy?.question ?? input.ar}
      help={copy?.help ?? input.ar}
    >
      <ChoiceList label={copy?.question ?? input.ar}>
        {input.options.map(opt => (
          <ChoiceCard
            key={String(opt)}
            testId={`v2-input-${input.key}-${opt}`}
            label={optionLabel(opt)}
            note={optionNote(opt)}
            selected={value === Number(opt)}
            onSelect={() => onChange(Number(opt))}
          />
        ))}
      </ChoiceList>
    </QuestionShell>
  );
};
