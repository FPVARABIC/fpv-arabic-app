'use client';

import React from 'react';
import { rcSystemsInCatalogue } from '@core/data/assembly/recommendation/proposeBuild';
import { videoSystemOptions } from '@/lib/build/checks';
import { OWNED } from './copy';
import { ChoiceCard, ChoiceList, QuestionShell } from './QuestionShell';

export type OwnedGearAnswer = 'none' | 'radio' | 'goggles' | 'both';

export interface OwnedGear {
  answer?: OwnedGearAnswer;
  rcSystem?: string;
  videoSystem?: string;
}

/**
 * WHAT IS ALREADY ON YOUR DESK — IN TWO QUESTIONS, NOT TWELVE.
 *
 * V1's «لدي بعض القطع» screen offered a dropdown per category and was one of
 * the heaviest screens in the product. Phase 2B deliberately supports only the
 * two answers that actually CONSTRAIN a build rather than merely fill it in: a
 * radio and a pair of goggles. Both are ecosystems — a DJI goggle owner cannot
 * use a Walksnail air unit at any price — so answering either genuinely
 * narrows what can be proposed. A motor the reader owns does not.
 *
 * Arbitrary part entry is NOT here, and the screen makes no promise about when
 * it will be.
 *
 * THE OPTIONS ARE DERIVED, NEVER TYPED
 * ------------------------------------
 * Radio systems come from `rcSystemsInCatalogue()`, which reads the canonical
 * `specs.protocol` off real receivers — «ExpressLRS» and «Crossfire». Video
 * systems come from `videoSystemOptions()`, the same derivation V1 uses.
 *
 * Two things can therefore never appear, because no part declares them:
 *
 *   · «CRSF» — the serial protocol between receiver and flight controller,
 *     which BOTH radio systems speak. It is in every receiver's display string
 *     and is not the identity of either ecosystem.
 *   · «Diversity» — two antennas on one receiver. A feature of a product, not
 *     a language it speaks.
 *
 * Typing either into a list here is how the questionnaire confusion the audit
 * found gets rebuilt.
 */
export const ownedWantsRadio = (g: OwnedGear) => g.answer === 'radio' || g.answer === 'both';
export const ownedWantsGoggles = (g: OwnedGear) => g.answer === 'goggles' || g.answer === 'both';

/**
 * ONE DECISION PER SCREEN — INCLUDING HERE.
 *
 * An earlier draft revealed the radio and the goggle questions together the
 * moment a reader said «لدي الاثنان». Measured at 390px that screen came to
 * 1.69 viewports and fifteen controls — by some distance the heaviest in the
 * journey, and two decisions at once on the one screen where the reader is
 * least sure of the vocabulary. So the three are separate questions in the
 * trail, and each fits a phone.
 */
export const BuildOwnedGearQuestion: React.FC<{
  mode: 'which' | 'rc' | 'video';
  value: OwnedGear;
  onChange: (next: OwnedGear) => void;
}> = ({ mode, value, onChange }) => {
  if (mode === 'which') {
    return (
      <QuestionShell question={OWNED.question} help={OWNED.help}>
        <ChoiceList label={OWNED.question}>
          {OWNED.options.map(o => (
            <ChoiceCard
              key={o.value}
              testId={`v2-owned-${o.value}`}
              label={o.label}
              selected={value.answer === o.value}
              onSelect={() => onChange(
                // Switching away from owning something clears what it set, so
                // a stale ecosystem cannot keep constraining the build after
                // the reader says they own nothing.
                o.value === 'none' ? { answer: 'none' }
                  : o.value === 'radio' ? { answer: 'radio', rcSystem: value.rcSystem }
                  : o.value === 'goggles' ? { answer: 'goggles', videoSystem: value.videoSystem }
                  : { ...value, answer: 'both' },
              )}
            />
          ))}
        </ChoiceList>
      </QuestionShell>
    );
  }

  if (mode === 'rc') {
    return (
        <QuestionShell question={OWNED.radioQuestion} help={OWNED.radioHelp}>
          <ChoiceList label={OWNED.radioQuestion}>
            {rcSystemsInCatalogue().map(sys => (
              <ChoiceCard
                key={sys}
                testId={`v2-owned-rc-${sys}`}
                label={sys}
                selected={value.rcSystem === sys}
                onSelect={() => onChange({ ...value, rcSystem: sys })}
              />
            ))}
            <ChoiceCard
              testId="v2-owned-rc-unsure"
              label={OWNED.unsure}
              note={OWNED.unsureNote}
              selected={value.rcSystem === undefined}
              onSelect={() => onChange({ ...value, rcSystem: undefined })}
            />
          </ChoiceList>
        </QuestionShell>
    );
  }

  return (
        <QuestionShell question={OWNED.gogglesQuestion} help={OWNED.gogglesHelp}>
          <ChoiceList label={OWNED.gogglesQuestion}>
            {videoSystemOptions().map(sys => (
              <ChoiceCard
                key={sys}
                testId={`v2-owned-video-${sys}`}
                label={sys}
                selected={value.videoSystem === sys}
                onSelect={() => onChange({ ...value, videoSystem: sys })}
              />
            ))}
            <ChoiceCard
              testId="v2-owned-video-unsure"
              label={OWNED.unsure}
              note={OWNED.unsureNote}
              selected={value.videoSystem === undefined}
              onSelect={() => onChange({ ...value, videoSystem: undefined })}
            />
          </ChoiceList>
        </QuestionShell>
  );
};
