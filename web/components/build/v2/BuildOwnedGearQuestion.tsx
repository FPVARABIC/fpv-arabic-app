'use client';

import React from 'react';
import { rcSystemsInCatalogue } from '@core/data/assembly/recommendation/proposeBuild';
import { videoSystemOptions } from '@/lib/build/checks';
import { OWNED } from './copy';
import { ChoiceCard, ChoiceList, QuestionShell } from './QuestionShell';

export type OwnedGearAnswer = 'none' | 'radio' | 'goggles' | 'both';

/**
 * WHAT THE READER SAID ABOUT ONE ECOSYSTEM — INCLUDING «I DON'T KNOW».
 *
 * Three states, and the difference between two of them is the whole point:
 *
 *   undefined            they have not answered yet
 *   { kind: 'unsure' }   they answered, and the answer is «I don't know»
 *   { kind: 'known' }    they answered with a system
 *
 * An earlier draft used `rcSystem?: string` alone and read `undefined` as
 * «لست متأكدًا». That collapsed the first two states into one, so the screen
 * opened with «لست متأكدًا» pre-selected and a reader who pressed «التالي»
 * without touching anything was recorded as having chosen it. Silence is not
 * an answer, and a summary that reports it as one is not a summary the reader
 * can check.
 *
 * A union rather than a `string` + `answered: boolean` pair because the pair
 * can hold states that mean nothing — answered-false with a system name, or
 * answered-true with none — and every reader of it would have to decide which
 * field wins. Here there is nothing to decide.
 */
export type EcosystemAnswer =
  | { kind: 'known'; value: string }
  | { kind: 'unsure' };

export interface OwnedGear {
  answer?: OwnedGearAnswer;
  rc?: EcosystemAnswer;
  video?: EcosystemAnswer;
}

/** The system to constrain the build by — nothing at all when unsure. */
export const ecosystemValue = (a: EcosystemAnswer | undefined): string | undefined =>
  a?.kind === 'known' ? a.value : undefined;

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
                // the reader says they own nothing — and so the question is
                // genuinely open again if they switch back.
                o.value === 'none' ? { answer: 'none' }
                  : o.value === 'radio' ? { answer: 'radio', rc: value.rc }
                  : o.value === 'goggles' ? { answer: 'goggles', video: value.video }
                  : { ...value, answer: 'both' },
              )}
            />
          ))}
        </ChoiceList>
      </QuestionShell>
    );
  }

  /*
   * Both ecosystem screens are the same screen with a different list, and the
   * selection test is `answer.kind`, never «is the value empty». That is what
   * keeps «لست متأكدًا» a card the reader clicks rather than the state the
   * screen happens to open in.
   */
  const answer = mode === 'rc' ? value.rc : value.video;
  const systems = mode === 'rc' ? rcSystemsInCatalogue() : videoSystemOptions();
  const set = (next: EcosystemAnswer) =>
    onChange(mode === 'rc' ? { ...value, rc: next } : { ...value, video: next });

  const question = mode === 'rc' ? OWNED.radioQuestion : OWNED.gogglesQuestion;
  const help = mode === 'rc' ? OWNED.radioHelp : OWNED.gogglesHelp;
  const prefix = mode === 'rc' ? 'v2-owned-rc' : 'v2-owned-video';

  return (
    <QuestionShell question={question} help={help}>
      <ChoiceList label={question}>
        {systems.map(sys => (
          <ChoiceCard
            key={sys}
            testId={`${prefix}-${sys}`}
            label={sys}
            selected={answer?.kind === 'known' && answer.value === sys}
            onSelect={() => set({ kind: 'known', value: sys })}
          />
        ))}
        <ChoiceCard
          testId={`${prefix}-unsure`}
          label={OWNED.unsure}
          note={OWNED.unsureNote}
          selected={answer?.kind === 'unsure'}
          onSelect={() => set({ kind: 'unsure' })}
        />
      </ChoiceList>
    </QuestionShell>
  );
};
