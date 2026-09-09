'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { proposeBuild } from '@core/data/assembly/recommendation/proposeBuild';
import type { RecommendationInput } from '@core/data/assembly/recommendation/types';
import { isBuildTypeAvailable } from '@/lib/build/availability';
import { BuildPhaseHeader } from './BuildPhaseHeader';
import { BuildGoalQuestion } from './BuildGoalQuestion';
import { BuildRequiredInputQuestion } from './BuildRequiredInputQuestion';
import { BuildPreferenceQuestion, type BudgetAnswer } from './BuildPreferenceQuestion';
import {
  BuildOwnedGearQuestion, ownedWantsGoggles, ownedWantsRadio, type OwnedGear,
} from './BuildOwnedGearQuestion';
import { BuildInputSummary, summaryValue, type SummaryRow } from './BuildInputSummary';
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

const emptyAnswers = (): Answers => ({ owned: {} });

/** What the reader's answers mean to the domain. One translation, one place. */
function toEngineInput(a: Answers): RecommendationInput {
  return {
    droneTypeId: a.droneTypeId!,
    sizeInch: a.sizeInch,
    cellCount: a.cellCount,
    // «لا تفضيل» is an answer that sends nothing — not a hidden default.
    budgetTier: a.budget && a.budget !== 'none' ? a.budget : undefined,
    owned: {
      rcSystem: a.owned.rcSystem,
      videoSystem: a.owned.videoSystem,
    },
  };
}

export const BuildV2Preview: React.FC = () => {
  const [answers, setAnswers] = useState<Answers>(emptyAnswers);
  const [trail, setTrail] = useState<Question[]>([{ id: 'goal' }]);
  const [idx, setIdx] = useState(0);
  const [screen, setScreen] = useState<'entry' | 'questions' | 'summary'>('entry');
  /*
   * Which questions the reader has already been PAST — by key, not by count.
   *
   * A prerequisite disappears from `requiredInputs` once answered, so the
   * engine itself says when to stop asking it. Budget and owned gear have no
   * such signal: «لا تفضيل» and «سأبدأ من الصفر» are real answers that leave
   * the engine input empty, and without this set they would be asked forever.
   */
  const [asked, setAsked] = useState<ReadonlySet<string>>(() => new Set<string>());

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
   * The asked set is passed in rather than read from state, because the click
   * that advances past a question also adds it: React has not re-rendered yet,
   * and reading the stale value would ask twice.
   *
   * The two ecosystem screens are conditional on the owned answer, so «سأبدأ
   * من الصفر» ends the journey immediately while «لدي الاثنان» opens both —
   * each on its own screen, never the two together.
   */
  const nextQuestion = (seen: ReadonlySet<string>): Question | null => {
    if (!answers.droneTypeId) return { id: 'goal' };
    const pending = build?.requiredInputs ?? [];
    if (pending.length > 0) {
      const p = pending[0];
      return { id: 'input', key: p.key as 'sizeInch' | 'cellCount', options: p.options };
    }
    if (!seen.has('budget')) return { id: 'budget' };
    if (!seen.has('owned')) return { id: 'owned' };
    if (ownedWantsRadio(answers.owned) && !seen.has('owned-rc')) return { id: 'owned-rc' };
    if (ownedWantsGoggles(answers.owned) && !seen.has('owned-video')) {
      return { id: 'owned-video' };
    }
    return null;
  };

  const goNext = () => {
    const q = current;
    // The question this very click is leaving counts as asked.
    const seen = q ? new Set([...asked, qKey(q)]) : asked;
    if (q) setAsked(seen);

    const next = nextQuestion(seen);
    if (next === null) { setScreen('summary'); return; }
    // Anything after the current position is recomputed, never reused: an
    // answer changed on the way back may have made it the wrong question.
    const kept = trail.slice(0, idx + 1);
    if (qKey(kept[idx]) === qKey(next)) return;
    setTrail([...kept, next]);
    setIdx(idx + 1);
  };

  const goBack = () => {
    if (screen === 'summary') { setScreen('questions'); return; }
    if (idx > 0) { setIdx(idx - 1); return; }
    setScreen('entry');
  };

  /**
   * Changing the goal invalidates what was answered UNDER it.
   *
   * A voltage chosen for a Freestyle build is not an answer about a Long-range
   * one, and silently keeping it would produce a summary the reader never
   * agreed to. Budget and owned gear are about the reader, not the build, so
   * they survive.
   */
  const setGoal = (droneTypeId: string) => {
    if (answers.droneTypeId === droneTypeId) return;
    setAnswers(a => ({ ...a, droneTypeId, sizeInch: undefined, cellCount: undefined }));
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
     * `owned-rc` and `owned-video` are deliberately never blocked. «لست
     * متأكدًا» is a true answer there, not a missing one — a reader who cannot
     * name their radio's protocol still deserves to reach the summary, and it
     * is the state those screens open in. Demanding a system they may not know
     * would be inventing a requirement the domain does not have.
     */
    return null;
  };

  const blocked = blockedReason();

  const rows: SummaryRow[] = [];
  if (answers.droneTypeId) {
    rows.push({
      key: 'droneType', label: SUMMARY.fields.droneType,
      value: summaryValue.droneType(answers.droneTypeId), provenance: 'chosen',
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
  if (answers.owned.rcSystem) {
    rows.push({
      key: 'rcSystem', label: SUMMARY.fields.rcSystem,
      value: answers.owned.rcSystem, provenance: 'chosen',
    });
  }
  if (answers.owned.videoSystem) {
    rows.push({
      key: 'videoSystem', label: SUMMARY.fields.videoSystem,
      value: answers.owned.videoSystem, provenance: 'chosen',
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
        <Link href="/build" data-testid="v2-back-to-v1"
          style={{ fontSize: 12.5, marginInlineStart: 'auto' }}>
          {PREVIEW_NOTICE.backToV1}
        </Link>
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
              onChange={v => setAnswers(a => ({ ...a, [current.key]: v }))}
            />
          )}
          {current?.id === 'budget' && (
            <BuildPreferenceQuestion
              value={answers.budget}
              onChange={v => setAnswers(a => ({ ...a, budget: v }))}
            />
          )}
          {(current?.id === 'owned' || current?.id === 'owned-rc'
            || current?.id === 'owned-video') && (
            <BuildOwnedGearQuestion
              mode={current.id === 'owned' ? 'which' : current.id === 'owned-rc' ? 'rc' : 'video'}
              value={answers.owned}
              onChange={owned => setAnswers(a => ({ ...a, owned }))}
            />
          )}
        </>
      )}

      {screen === 'summary' && <BuildInputSummary rows={rows} />}

      {screen !== 'entry' && (
        <footer style={{ display: 'grid', gap: 9 }}>
          {blocked && (
            <p role="status" data-testid="v2-blocked-reason"
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
                aria-describedby={blocked ? 'v2-blocked' : undefined}
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
