'use client';

import React, { useMemo, useState } from 'react';
import { proposeBuild } from '@core/data/assembly/recommendation/proposeBuild';
import type { RecommendationInput } from '@core/data/assembly/recommendation/types';
import { isBuildTypeAvailable } from '@/lib/build/availability';
import { BuildPhaseHeader } from './BuildPhaseHeader';
import { BuildGoalQuestion } from './BuildGoalQuestion';
import { BuildRequiredInputQuestion } from './BuildRequiredInputQuestion';
import { BuildPreferenceQuestion, type BudgetAnswer } from './BuildPreferenceQuestion';
import {
  BuildOwnedGearQuestion, ecosystemValue, ownedWantsGoggles, ownedWantsRadio,
  type OwnedGear,
} from './BuildOwnedGearQuestion';
import { BuildInputSummary, summaryValue, type SummaryRow } from './BuildInputSummary';
import { readinessOf } from './readiness';
import {
  NO_SELECTIONS, selectionsSurviving, withCategory, withoutCategory,
  type ReaderSelections, type SelectionContext,
} from './selectionState';
import { ProposalScreen } from './ProposalScreen';
import { PROPOSAL } from './copy';
import { ENTRY, NAV, PREVIEW_NOTICE, SUMMARY } from './copy';

/**
 * THE V2 ENTRY JOURNEY.
 *
 * One question at a time, and only questions the domain says are genuinely
 * open. The sequence is NOT written here: after every answer the engine is
 * asked again, and whatever it reports as `requiredInputs` is what gets shown.
 * That is why Freestyle never sees a size screen and Long-range sees neither.
 *
 * STATE LIVES ONLY IN THIS COMPONENT — ON PURPOSE
 * -----------------------------------------------
 * No localStorage key, no Firebase write, no `mirrorToProject`, no phone
 * progress. A refresh resets the preview, and that is the correct trade for
 * now: persistence is a schema decision, and committing to one before the
 * interaction model is accepted would mean migrating a shape nobody has agreed
 * to. It comes after this review, not before.
 */

type Answers = {
  droneTypeId?: string;
  sizeInch?: number;
  cellCount?: number;
  budget?: BudgetAnswer;
  owned: OwnedGear;
  /**
   * The categories the reader closed themselves — category → part id.
   *
   * IN MEMORY ONLY, exactly like every other field here. No storage key, no
   * draft document, no project schema. That is not an oversight to be fixed by
   * adding one: persisting a selection means agreeing on a shape for it, and
   * the shape is only worth agreeing on after this interaction is accepted.
   * A refresh clears it, and the notice at the top of the screen says so.
   *
   * It sits BESIDE `owned`, never inside it. «I have this» and «I want this in
   * this build» are different claims, the engine keeps them in different
   * fields for that reason, and the moment the UI merges them it starts
   * telling readers they own hardware they have not bought.
   */
  selectedParts: ReaderSelections;
};

/**
 * A question that is currently on screen, WITH the options it was opened for.
 *
 * The options are snapshotted rather than re-read, because answering a
 * prerequisite removes it from `requiredInputs` — the engine has no further
 * question about it. Re-reading would blank the very screen the reader is
 * looking at the instant they choose.
 */
type Question =
  | { id: 'goal' }
  | { id: 'budget' }
  | { id: 'owned' }
  | { id: 'owned-rc' }
  | { id: 'owned-video' }
  | { id: 'input'; key: 'sizeInch' | 'cellCount'; options: readonly (string | number)[] };

const qKey = (q: Question) => (q.id === 'input' ? `input:${q.key}` : q.id);

/** One id, written once, so the button and the message cannot drift apart. */
const BLOCKED_ID = 'v2-blocked';

/** Both ecosystem screens block for the same reason, in the same words. */
const OWNED_BLOCKED = 'اختر النظام، أو اختر «لست متأكدًا».';

const emptyAnswers = (): Answers => ({ owned: {}, selectedParts: NO_SELECTIONS });

/** What the reader's answers mean to the domain. One translation, one place. */
function toEngineInput(a: Answers): RecommendationInput {
  return {
    droneTypeId: a.droneTypeId!,
    sizeInch: a.sizeInch,
    cellCount: a.cellCount,
    // «لا تفضيل» is an answer that sends nothing — not a hidden default.
    budgetTier: a.budget && a.budget !== 'none' ? a.budget : undefined,
    owned: {
      // «لست متأكدًا» is an ANSWER that constrains nothing. It reaches the
      // engine exactly as «I have no radio» does — as absence — because the
      // engine can only narrow by a system it was given a name for.
      rcSystem: ecosystemValue(a.owned.rc),
      videoSystem: ecosystemValue(a.owned.video),
    },
    /*
     * THE READER'S OWN CHOICES — a top-level field, not a member of `owned`.
     *
     * This is the whole of the wiring. There is no second place a choice can
     * be recorded and no React-side lock the engine does not see: the map goes
     * in here, `proposeBuild` runs again, and whatever comes back is what the
     * screen shows. A card that looks chosen looks that way because the engine
     * said `user-selected`, never because a component remembered a click.
     */
    selectedParts: a.selectedParts,
  };
}

/**
 * The answers REDUCED TO WHAT CAN INVALIDATE A CHOICE.
 *
 * Read off `toEngineInput` rather than off `Answers`, so the comparison is
 * against the values that actually constrain the build. Two answers the engine
 * cannot tell apart must not clear anything, and the only way to guarantee
 * that is to ask the same translation the engine is given.
 */
const selectionContext = (a: Answers): SelectionContext => {
  const input = toEngineInput(a);
  return {
    droneTypeId: a.droneTypeId,
    sizeInch: input.sizeInch,
    cellCount: input.cellCount,
    rcSystem: input.owned?.rcSystem,
    videoSystem: input.owned?.videoSystem,
  };
};

export const BuildV2Preview: React.FC = () => {
  const [answers, setAnswers] = useState<Answers>(emptyAnswers);
  const [trail, setTrail] = useState<Question[]>([{ id: 'goal' }]);
  const [idx, setIdx] = useState(0);
  const [screen, setScreen] = useState<'entry' | 'questions' | 'summary' | 'proposal'>('entry');

  /*
   * The engine runs on every ANSWER, not on every render.
   *
   * The viability search walks real part combinations, so re-running it
   * because the reader pressed «رجوع» would be waste rather than caution.
   * `answers` is only ever replaced wholesale by the setters below, so its
   * identity changes exactly when an answer does — which is what makes it a
   * sound dependency on its own.
   */
  const build = useMemo(
    () => (answers.droneTypeId ? proposeBuild(toEngineInput(answers)) : null),
    [answers],
  );

  const current: Question | null = screen === 'questions' ? trail[idx] : null;

  /**
   * The next open question, recomputed from the answers rather than stored.
   *
   * Prerequisites are checked FIRST and on every pass, so an answer that
   * narrows viability — owning a radio, say — can reopen a question that had
   * been settled, and the reader is asked before they reach a summary built on
   * a stale assumption.
   *
   * EVERY LINE BELOW IS «IS THIS ANSWERED?», NEVER «HAVE I ASKED?»
   * --------------------------------------------------------------
   * An earlier version tracked a set of questions already put to the reader.
   * That set could disagree with the answers: go back, switch «لدي نظارة» to
   * «لدي الاثنان», and the radio question counted as asked while its answer
   * had been cleared — so the journey walked past an open question to a
   * summary that reported nothing about it.
   *
   * Reading the answers instead makes the state machine self-healing: a
   * question is open exactly while it has no answer, and every question here
   * blocks «التالي» until it has one. «لا تفضيل», «سأبدأ من الصفر» and «لست
   * متأكدًا» are answers, so they close their question the same as any other.
   *
   * The two ecosystem screens are conditional on the owned answer, so «سأبدأ
   * من الصفر» ends the journey immediately while «لدي الاثنان» opens both —
   * each on its own screen, never the two together.
   */
  const nextQuestion = (): Question | null => {
    if (!answers.droneTypeId) return { id: 'goal' };
    const pending = build?.requiredInputs ?? [];
    if (pending.length > 0) {
      const p = pending[0];
      return { id: 'input', key: p.key as 'sizeInch' | 'cellCount', options: p.options };
    }
    if (answers.budget === undefined) return { id: 'budget' };
    if (answers.owned.answer === undefined) return { id: 'owned' };
    if (ownedWantsRadio(answers.owned) && answers.owned.rc === undefined) {
      return { id: 'owned-rc' };
    }
    if (ownedWantsGoggles(answers.owned) && answers.owned.video === undefined) {
      return { id: 'owned-video' };
    }
    return null;
  };

  const goNext = () => {
    const next = nextQuestion();
    if (next === null) { setScreen('summary'); return; }
    // Anything after the current position is recomputed, never reused: an
    // answer changed on the way back may have made it the wrong question.
    const kept = trail.slice(0, idx + 1);
    if (qKey(kept[idx]) === qKey(next)) return;
    setTrail([...kept, next]);
    setIdx(idx + 1);
  };

  /*
   * Navigation moves the SCREEN, never the answers.
   *
   * Which is why a selection survives «رجوع» from the proposal to the summary
   * and back again: nothing here writes `answers`, so there is nothing for the
   * invalidation rule to act on. Memory-only does not mean fragile — it means
   * it lives exactly as long as this component does.
   */
  const goBack = () => {
    if (screen === 'proposal') { setScreen('summary'); return; }
    if (screen === 'summary') { setScreen('questions'); return; }
    if (idx > 0) { setIdx(idx - 1); return; }
    setScreen('entry');
  };

  /**
   * THE ONLY WAY AN ANSWER IS WRITTEN — so it is the only place the reader's
   * choices can be invalidated, and there is no route around it.
   *
   * Every answer setter below goes through here. The rule itself is in
   * `selectionState.ts`, stated over the values the engine sees, and it runs on
   * the before/after pair rather than on the setter's intent: a setter cannot
   * forget to declare what it invalidates, because it does not get to say.
   */
  const answer = (change: (a: Answers) => Answers) => setAnswers(prev => {
    const next = change(prev);
    const selectedParts = selectionsSurviving(
      selectionContext(prev), selectionContext(next), next.selectedParts,
    );
    return selectedParts === next.selectedParts ? next : { ...next, selectedParts };
  });

  /**
   * A CHOICE, which is a different kind of write from an answer.
   *
   * It never invalidates anything: closing one category says nothing about the
   * reader's frame two cards up, and the accumulation is a fresh object with
   * one key added so that it cannot. What comes back from the engine on the
   * next render is the whole of the result — this function decides nothing
   * about how the card will look.
   */
  const chooseFor = (category: string, partId: string) =>
    setAnswers(a => ({ ...a, selectedParts: withCategory(a.selectedParts, category, partId) }));

  /**
   * UNDO, and it is a DELETE rather than a re-selection.
   *
   * Clearing `frames` removes the `frames` key and nothing else, and then the
   * engine is asked again with one fewer lock — so the candidate list the
   * reader sees next is recomputed against the choices they still have, never
   * the list they were shown before. Whatever status comes back is the answer:
   * this may reopen the category, or the remaining locks may now leave exactly
   * one compatible part, and the screen reports whichever it is.
   */
  const clearChoiceIn = (category: string) =>
    setAnswers(a => ({ ...a, selectedParts: withoutCategory(a.selectedParts, category) }));

  /**
   * Changing the goal invalidates what was answered UNDER it.
   *
   * A voltage chosen for a Freestyle build is not an answer about a Long-range
   * one, and silently keeping it would produce a summary the reader never
   * agreed to. Budget and owned gear are about the reader, not the build, so
   * they survive. The reader's PART choices do not: a frame picked for a
   * Freestyle build is an answer about that build, and `answer()` clears them
   * without this setter having to remember to.
   */
  const setGoal = (droneTypeId: string) => {
    if (answers.droneTypeId === droneTypeId) return;
    answer(a => ({ ...a, droneTypeId, sizeInch: undefined, cellCount: undefined }));
    setTrail([{ id: 'goal' }]);
    setIdx(0);
  };

  const blockedReason = (): string | null => {
    if (current?.id === 'goal') {
      if (!answers.droneTypeId) return 'اختر نوع البناء للمتابعة.';
      if (!isBuildTypeAvailable(answers.droneTypeId)) {
        return 'هذا النوع غير متاح للبناء حاليًا — اختر نوعًا آخر.';
      }
    }
    if (current?.id === 'input' && current.key === 'cellCount' && answers.cellCount === undefined) {
      return 'اختر جهد البطارية للمتابعة.';
    }
    if (current?.id === 'input' && current.key === 'sizeInch' && answers.sizeInch === undefined) {
      return 'اختر المقاس للمتابعة.';
    }
    if (current?.id === 'budget' && !answers.budget) {
      return 'اختر فئة الميزانية، أو «لا تفضيل».';
    }
    if (current?.id === 'owned' && !answers.owned.answer) {
      return 'أخبرنا إن كان لديك معدات، أو اختر «سأبدأ من الصفر».';
    }
    /*
     * The ecosystem screens block until the reader answers — and «لست
     * متأكدًا» IS an answer, which is why the message names it.
     *
     * A reader who cannot name their radio's protocol still reaches the
     * summary; they just have to say so. The alternative, which this replaced,
     * was treating an untouched screen as «لست متأكدًا» and reporting a choice
     * they never made.
     */
    if (current?.id === 'owned-rc' && answers.owned.rc === undefined) {
      return OWNED_BLOCKED;
    }
    if (current?.id === 'owned-video' && answers.owned.video === undefined) {
      return OWNED_BLOCKED;
    }
    return null;
  };

  const blocked = blockedReason();
  const readiness = readinessOf(build, answers.owned);

  const rows: SummaryRow[] = [];
  // No row rather than a row naming the id — see `summaryValue.droneType`.
  const droneTypeName = answers.droneTypeId
    ? summaryValue.droneType(answers.droneTypeId) : undefined;
  if (droneTypeName) {
    rows.push({
      key: 'droneType', label: SUMMARY.fields.droneType,
      value: droneTypeName, provenance: 'chosen',
    });
  }
  if (build?.sizeInch !== undefined) {
    rows.push({
      key: 'sizeInch', label: SUMMARY.fields.sizeInch,
      value: summaryValue.sizeInch(build.sizeInch),
      provenance: answers.sizeInch === undefined ? 'derived' : 'chosen',
    });
  }
  if (build?.cellCount !== undefined) {
    rows.push({
      key: 'cellCount', label: SUMMARY.fields.cellCount,
      value: summaryValue.cellCount(build.cellCount),
      provenance: answers.cellCount === undefined ? 'derived' : 'chosen',
    });
  }
  if (answers.budget && answers.budget !== 'none') {
    rows.push({
      key: 'budgetTier', label: SUMMARY.fields.budgetTier,
      value: { budget: 'اقتصادي', mid: 'متوازن', premium: 'الفئة الأعلى' }[answers.budget],
      provenance: 'chosen',
    });
  }
  /*
   * «هذا ما فهمناه» is the trust screen, so a question the reader ANSWERED
   * cannot be missing from it. Rendering only truthy system names meant «لدي
   * جهاز تحكم، ولست متأكدًا من نظامه» vanished entirely — the reader saw a
   * summary implying they were never asked.
   *
   * The row is driven by what they said they own, and its value by what they
   * said about it. «سأبدأ من الصفر» produces no rows at all: there is no
   * equipment to report, and inventing one would be the opposite failure.
   */
  if (ownedWantsRadio(answers.owned) && answers.owned.rc) {
    rows.push({
      key: 'rcSystem', label: SUMMARY.fields.rcSystem,
      value: answers.owned.rc.kind === 'known' ? answers.owned.rc.value : SUMMARY.unsureValue,
      provenance: 'chosen',
    });
  }
  if (ownedWantsGoggles(answers.owned) && answers.owned.video) {
    rows.push({
      key: 'videoSystem', label: SUMMARY.fields.videoSystem,
      value: answers.owned.video.kind === 'known'
        ? answers.owned.video.value : SUMMARY.unsureValue,
      provenance: 'chosen',
    });
  }

  return (
    <div data-testid="build-v2-preview" style={{ display: 'grid', gap: 22, maxWidth: 640 }}>
      <aside className="card-sm" data-testid="v2-preview-notice"
        style={{ padding: '11px 14px', display: 'flex', gap: 9, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <span className="admin-badge" style={{ fontSize: 10.5 }}>{PREVIEW_NOTICE.label}</span>
        <span style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.85 }}>
          {PREVIEW_NOTICE.body}
        </span>
        {/*
          * A PLAIN ANCHOR, NOT `next/link` — DELIBERATELY.
          *
          * The gate reads the flag from `location.search` and subscribes to
          * `popstate`. A client-side `<Link>` navigation calls
          * `history.pushState`, which fires NO `popstate`, so the URL became
          * `/build` while the preview stayed on screen. A browser test caught
          * exactly that.
          *
          * The alternatives were monkey-patching `history.pushState` globally
          * from a temporary preview, or going back to `useSearchParams` and
          * with it the blank-V1 hydration flash. A full navigation to a
          * statically prerendered page is the cheapest correct answer, and it
          * leaves nothing behind at cutover.
          */}
        <a href="/build" data-testid="v2-back-to-v1"
          style={{ fontSize: 12.5, marginInlineStart: 'auto' }}>
          {PREVIEW_NOTICE.backToV1}
        </a>
      </aside>

      <BuildPhaseHeader activeId="parts" />

      {screen === 'entry' && (
        <section data-testid="v2-entry" style={{ display: 'grid', gap: 14 }}>
          <h1 style={{ margin: 0, fontSize: 25, fontWeight: 900, lineHeight: 1.5 }}>
            {ENTRY.title}
          </h1>
          <p style={{ margin: 0, fontSize: 14.5, color: 'var(--text-dim)', lineHeight: 1.95 }}>
            {ENTRY.lead}
          </p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-dimmer)', lineHeight: 1.9 }}>
            {ENTRY.reassure}
          </p>
          <button type="button" className="btn-primary" data-testid="v2-start"
            onClick={() => setScreen('questions')}
            style={{ justifySelf: 'start', fontSize: 15, padding: '12px 22px' }}>
            {ENTRY.cta}
          </button>
        </section>
      )}

      {screen === 'questions' && (
        <>
          {current?.id === 'goal' && (
            <BuildGoalQuestion value={answers.droneTypeId} onChange={setGoal} />
          )}
          {current?.id === 'input' && (
            <BuildRequiredInputQuestion
              input={{ key: current.key, options: current.options, ar: '' }}
              value={current.key === 'cellCount' ? answers.cellCount : answers.sizeInch}
              onChange={v => answer(a => ({ ...a, [current.key]: v }))}
            />
          )}
          {current?.id === 'budget' && (
            <BuildPreferenceQuestion
              value={answers.budget}
              onChange={v => answer(a => ({ ...a, budget: v }))}
            />
          )}
          {(current?.id === 'owned' || current?.id === 'owned-rc'
            || current?.id === 'owned-video') && (
            <BuildOwnedGearQuestion
              mode={current.id === 'owned' ? 'which' : current.id === 'owned-rc' ? 'rc' : 'video'}
              value={answers.owned}
              onChange={owned => answer(a => ({ ...a, owned }))}
            />
          )}
        </>
      )}

      {screen === 'summary' && (
        <>
          <BuildInputSummary rows={rows} readiness={readiness} />
          {/*
            THE ONLY DOOR TO THE PROPOSAL, AND IT IS LOCKED BY THE READINESS
            STATE — not by a separate check that could drift from it.

            `needs-equipment-identification` does not open it: the reader has
            said they own a radio and cannot name its system, and `owned.rc`
            reaches the engine as absence. Proposing a receiver on that basis
            would be recommending parts as though they owned no radio at all —
            the exact failure `readiness.ts` documents. `no-viable-build` does
            not open it either: there is nothing to propose.
          */}
          {readiness.state === 'ready' && (
            <button type="button" className="btn-primary" data-testid="v2-open-proposal"
              onClick={() => setScreen('proposal')}
              style={{ justifySelf: 'start', fontSize: 14.5, padding: '12px 22px' }}>
              {PROPOSAL.open}
            </button>
          )}
        </>
      )}

      {/*
        The proposal screen is handed WHAT TO DO, never WHAT IS CHOSEN. The
        selections map does not cross this line: the screen reads the reader's
        choices out of the engine's own decisions, so there is no second
        source of truth for it to disagree with.
      */}
      {screen === 'proposal' && build && (
        <ProposalScreen build={build} onChoose={chooseFor} onClearChoice={clearChoiceIn} />
      )}

      {screen !== 'entry' && (
        <footer style={{ display: 'grid', gap: 9 }}>
          {/*
            * The id is what `aria-describedby` on «التالي» points at. It was
            * missing once, so the button named a description that did not
            * exist and a screen-reader user got a disabled button with no
            * stated reason — the one thing the visible text was there to say.
            */}
          {blocked && (
            <p role="status" id={BLOCKED_ID} data-testid="v2-blocked-reason"
              style={{ margin: 0, fontSize: 12.5, color: 'var(--sev-warning)', lineHeight: 1.85 }}>
              {blocked}
            </p>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn-ghost" data-testid="v2-back" onClick={goBack}
              style={{ fontSize: 14, padding: '11px 18px' }}>
              {NAV.back}
            </button>
            {screen === 'questions' && (
              <button type="button" className="btn-primary" data-testid="v2-next"
                disabled={!!blocked}
                aria-describedby={blocked ? BLOCKED_ID : undefined}
                onClick={goNext}
                style={{ fontSize: 14, padding: '11px 22px', opacity: blocked ? 0.5 : 1 }}>
                {NAV.next}
              </button>
            )}
          </div>
        </footer>
      )}
    </div>
  );
};
