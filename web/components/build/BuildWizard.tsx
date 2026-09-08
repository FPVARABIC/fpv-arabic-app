'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { droneTypes } from '@core/data/assembly/droneTypes';
import { getAvailableSizeOptions, frameMatchesSize } from '@core/data/assembly/frameSizeMatch';
import { batteryVoltageOptions } from '@core/data/assembly/batteryVoltageOptions';
import { buildStages } from '@core/data/assembly/buildStages';
import { PART_CATEGORY_MAP } from '@core/data/project/store';
import { computeFindings, sortFindings } from '@core/data/project/verdicts';
import type { Finding } from '@core/data/project/types';
import type { BasePart, Frame } from '@core/data/assembly/types';
import {
  BUILD_PATH, BUILD_PHASES, TOTAL_BUILD_STEPS, phaseForStep, phoneStageIndexFor,
  type BuildStep,
} from '@/lib/build/path';
import { partLabel, partLabelAr, SIZE_MEANING_AR, VOLTAGE_MEANING_AR } from '@/lib/build/labels';
import {
  buildTypeAvailability, isBuildTypeAvailable, unavailableLabelAr,
} from '@/lib/build/availability';
import {
  loadDraft, saveDraft, seedFromProject, emptyDraft, mirrorToProject,
  draftParts, firstUnresolvedStep,
  type BuildDraft,
} from '@/lib/build/draft';
import {
  snapshotFromContext, videoSystemOptions, rcProtocolOptions, UNDECIDED_PREF,
  type BuildContext,
} from '@/lib/build/checks';
import { gateFor } from '@/lib/build/gates';
import { PartPicker } from './PartPicker';
import { MyBuildPanel, MyBuildBody, buildPulse } from './MyBuildPanel';
import { GateStep, isGateComplete } from './GateStep';
import { CompatReport, BomView } from './ReportStep';
import { WiringStep, AssemblyStep, SoftwareStep, FirstFlightStep } from './GuideSteps';

/**
 * The wizard — one machine for the three ways in.
 *
 * THE THREE MODES ARE PRESETS, NOT FORKS
 * --------------------------------------
 * «ساعدني في اختيار كل شيء», «لدي بعض القطع» and «أريد بناءً متقدماً» run the
 * SAME twenty-step path over the same data and the same engine. What a mode
 * changes is posture: whether the owned-parts screen appears, whether
 * candidates are ordered by the reader's budget, and whether a documented
 * incompatibility is selectable at all. One path means one progress model,
 * one persistence story, and a report that means the same thing however you
 * arrived at it.
 *
 * STATE LIVES IN THE DRAFT, RENDER READS IT
 * -----------------------------------------
 * Every mutation goes through `update()`, which saves the draft and mirrors
 * the shared subset into the platform's one project store. Back-navigation
 * therefore CANNOT lose choices — there is no transient state to lose.
 *
 * THE HARD STOPS
 * --------------
 * «التالي» refuses: a choice step without its choice, a parts step missing a
 * required category, the report while a blocker stands, and every safety
 * gate until each item is individually confirmed. These are the product's
 * own rules («لا تسمح للـWizard بالقفز… إلى أول طيران») made mechanical.
 */

type QuestionId = 'experience' | 'tier' | 'video' | 'rc';

/** Same rule as the phone's BuildFlow: a voltage is offered only when every
 * mandatory category has at least one real part for this type at it. */
const MANDATORY_PART_CATEGORIES = buildStages
  .map(s => s.partCategory)
  .filter((c): c is string => c !== null && c !== 'gps');

export const BuildWizard: React.FC = () => {
  const params = useSearchParams();
  const urlMode = params.get('mode');

  const [draft, setDraft] = useState<BuildDraft>(() => {
    const existing = loadDraft() ?? seedFromProject() ?? emptyDraft();
    if (!existing.mode && (urlMode === 'guided' || urlMode === 'parts' || urlMode === 'advanced')) {
      existing.mode = urlMode;
    }
    return existing;
  });
  const [phase, setPhase] = useState<'questions' | 'owned' | 'path'>(() =>
    draft.mode ? (needsQuestions(draft) ? 'questions' : 'path') : 'questions');
  const [anchorOpen, setAnchorOpen] = useState(false);
  /**
   * A foundational change that would drop already-chosen parts, held until the
   * reader agrees to it. `next` is computed BEFORE the reader is asked, so the
   * list they read and the state they get cannot disagree.
   */
  const [pendingChange, setPendingChange] = useState<{
    titleAr: string;
    alsoAr?: string;
    removedCategories: string[];
    next: BuildDraft;
  } | null>(null);

  // Persist + mirror on every draft change. The draft is the truth; the
  // shared store follows it.
  useEffect(() => {
    saveDraft(draft);
    mirrorToProject(draft);
  }, [draft]);

  // A new step must open AT ITS TITLE. Without this, «التالي» keeps the
  // scroll position of the previous (often longer) step, and the reader
  // lands mid-content — the compat step used to open on the footer.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [draft.stepIndex, phase]);

  const update = (patch: Partial<BuildDraft>) => setDraft(d => ({ ...d, ...patch }));

  const ctx: BuildContext = useMemo(() => ({
    droneTypeId: draft.droneTypeId,
    sizeInch: draft.sizeInch,
    batteryVoltage: draft.batteryVoltage,
    parts: draftParts(draft),
  }), [draft]);

  const findings = useMemo(() => {
    const snapshot = snapshotFromContext(
      ctx,
      phoneStageIndexFor(draft.stepIndex, Object.keys(ctx.parts)),
    );
    return snapshot.exists ? sortFindings(computeFindings(snapshot)) : [];
  }, [ctx, draft.stepIndex]);
  const blockers = findings.filter(f => f.severity === 'blocker').length;

  /** Selecting a part, with the same single-field invalidation the phone does. */
  const selectPart = (category: string, part: BasePart) => {
    // While a foundational change is awaiting an answer, the draft must hold
    // still. The confirmation names the parts it will remove by computing the
    // result UP FRONT, which is what stops the message and the behaviour from
    // drifting apart — but step 4 keeps a battery picker on screen beneath the
    // sheet, so without this guard a reader could pick a battery after reading
    // the list and have that choice quietly overwritten on confirm.
    if (pendingChange) return;
    setDraft(d => {
      const partIds = { ...d.partIds, [category]: part.id };
      const externalParts = { ...d.externalParts };
      delete externalParts[category];
      return { ...d, partIds, externalParts };
    });
  };

  /**
   * A foundational change, applied only once the reader knows its cost.
   *
   * Changing the drone type, the size or the battery voltage can make an
   * already-chosen part invalid, and the old code simply deleted it — the
   * voltage path did so with no message at all, so switching 6S→4S removed a
   * motor and a battery while the only visible trace was «بناءي» quietly
   * counting 4/8 instead of 6/8. (Changing the type did ask, through a native
   * `window.confirm`: unstyled, in the browser's language, LTR inside an RTL
   * app, and inconsistent with the more destructive path beside it.)
   *
   * Every foundational selector now hands its ALREADY-COMPUTED next draft to
   * this function. The removal list is derived by diffing that result against
   * the current draft, so the parts named on screen are exactly the parts that
   * will go — the message cannot drift from the behaviour because it is read
   * from it. With nothing to remove, the change applies immediately: a
   * confirmation nobody needs is a confirmation everybody learns to dismiss.
   */
  const applyFoundationalChange = (
    titleAr: string,
    compute: (d: BuildDraft) => BuildDraft,
    alsoAr?: string,
  ) => {
    const next = compute(draft);
    const removedCategories = Object.keys(draft.partIds).filter(c => !next.partIds[c]);
    // A size the reader picked and is about to lose counts as discarded work
    // too, even though it is not a part.
    const dropsSize = draft.sizeInch !== undefined && next.sizeInch === undefined;
    if (removedCategories.length === 0 && !dropsSize) {
      setDraft(next);
      return;
    }
    setPendingChange({ titleAr, alsoAr, removedCategories, next });
  };

  const selectSize = (sizeInch: number) => {
    applyFoundationalChange(
      `تغيير الحجم إلى ${sizeInch} إنش`,
      d => {
        const partIds = { ...d.partIds };
        const frame = partIds.frames
          ? (PART_CATEGORY_MAP.frames?.find(p => p.id === partIds.frames) as Frame | undefined)
          : undefined;
        if (frame && !frameMatchesSize(frame, sizeInch)) delete partIds.frames;
        return { ...d, sizeInch, partIds };
      },
    );
  };

  const selectVoltage = (sCount: number) => {
    applyFoundationalChange(
      `تغيير جهد البطارية إلى ${sCount}S`,
      d => {
        const partIds: Record<string, string> = {};
        for (const [category, id] of Object.entries(d.partIds)) {
          const part = PART_CATEGORY_MAP[category]?.find(p => p.id === id);
          if (part && part.compatibilityTags.batteryVoltages.includes(sCount)) {
            partIds[category] = id;
          }
        }
        return { ...d, batteryVoltage: sCount, partIds };
      },
      'القطع المذكورة غير موسومة لهذا الجهد في بياناتها الموثقة، فلا يمكن إبقاؤها على بناء مصمَّم عليه.',
    );
  };

  const selectDroneType = (droneTypeId: string) => {
    const sizeWillReset = draft.sizeInch !== undefined
      && !getAvailableSizeOptions(droneTypeId).some(o => o.sizeInch === draft.sizeInch);
    const typeName = droneTypes.find(t => t.id === droneTypeId)?.primaryName ?? droneTypeId;
    applyFoundationalChange(
      `تغيير نوع البناء إلى ${typeName}`,
      d => {
        const partIds: Record<string, string> = {};
        for (const [category, id] of Object.entries(d.partIds)) {
          const part = PART_CATEGORY_MAP[category]?.find(p => p.id === id);
          if (part && part.compatibilityTags.droneTypes.includes(droneTypeId)) {
            partIds[category] = id;
          }
        }
        return {
          ...d, droneTypeId, partIds,
          sizeInch: sizeWillReset ? undefined : d.sizeInch,
        };
      },
      sizeWillReset
        ? 'وسيُعاد اختيار الحجم أيضاً، لأن الحجم الحالي غير متاح لهذا النوع.'
        : undefined,
    );
  };

  const step = BUILD_PATH[draft.stepIndex];

  const canAdvance = (): boolean => {
    switch (step.kind) {
      case 'choice':
        // A type the catalogue cannot finish is not a choice this step
        // accepts — see `lib/build/availability.ts`. A draft can carry one
        // from before it was withdrawn, or from a build started on the phone,
        // so this is checked rather than assumed impossible.
        if (step.id === 'goal') return isBuildTypeAvailable(draft.droneTypeId);
        if (step.id === 'size') return draft.sizeInch !== undefined;
        if (step.id === 'power') return draft.batteryVoltage !== undefined;
        return true;
      case 'parts': {
        const required = (step.categories ?? [])
          .filter(c => !(step.optionalCategories ?? []).includes(c));
        return required.every(c => draft.partIds[c] || draft.externalParts[c]);
      }
      case 'report':
        return blockers === 0;
      case 'gate': {
        const gate = gateFor(step.id);
        return !gate || isGateComplete(gate, draft.gateChecks[step.id]);
      }
      default:
        return true;
    }
  };

  /**
   * WHY «التالي» is closed, in words, on every step that closes it.
   *
   * A disabled button states that something is wrong and refuses to say what.
   * The audit found the section shipped exactly that on six of its twenty
   * steps — and on one of them (an unavailable drone type) the button could
   * never open at all, under an intro promising the opposite. Styling the
   * disabled state is half the fix; this is the other half.
   *
   * Returns null when the step is not blocked, so the caller renders nothing.
   */
  const blockedReasonAr = (): string | null => {
    if (canAdvance()) return null;
    switch (step.kind) {
      case 'choice': {
        if (step.id === 'goal') {
          if (!draft.droneTypeId) return 'اختر نوع البناء أولاً — كل خطوة بعده تُبنى عليه.';
          const name = droneTypes.find(t => t.id === draft.droneTypeId)?.primaryName ?? draft.droneTypeId;
          const { reasonAr } = buildTypeAvailability(draft.droneTypeId);
          return `«${name}» غير متاح للبناء الآن. ${reasonAr ?? ''} اختر نوعاً آخر للمتابعة.`;
        }
        if (step.id === 'size') {
          return 'اختر مقاس البناء للمتابعة — المقاس يحدد الإطار والمراوح.';
        }
        if (step.id === 'power') {
          return 'اختر جهد البطارية (4S أو 6S) للمتابعة — الجهد يحدد أي محرك وESC يمكن النظر فيهما.';
        }
        return null;
      }
      case 'parts': {
        const missing = (step.categories ?? [])
          .filter(c => !(step.optionalCategories ?? []).includes(c))
          .filter(c => !draft.partIds[c] && !draft.externalParts[c]);
        if (missing.length === 0) return null;
        return `اختر ${missing.map(partLabelAr).join(' و')} للمتابعة — لا يمكن إكمال البناء بدونها.`;
      }
      case 'report':
        return `يوجد ${blockers} مانع يجب حلّه قبل المتابعة. عد إلى الخطوة التي اخترت فيها القطعة المعنيّة وبدّلها — تفاصيل كل مانع أعلاه.`;
      case 'gate': {
        const gate = gateFor(step.id);
        if (!gate) return null;
        const done = draft.gateChecks[step.id]?.length ?? 0;
        const left = gate.items.length - done;
        return `بقي ${left} من ${gate.items.length} بنداً لم تؤكّده. هذه بوابة سلامة — «التالي» يفتح بعد تأكيد كل بند.`;
      }
      default:
        return null;
    }
  };
  const blockedReason = blockedReasonAr();

  const goNext = () => {
    setAnchorOpen(false);
    update({ stepIndex: Math.min(draft.stepIndex + 1, TOTAL_BUILD_STEPS - 1) });
  };
  const goPrev = () => {
    setAnchorOpen(false);
    if (draft.stepIndex === 0) setPhase('questions');
    else update({ stepIndex: draft.stepIndex - 1 });
  };

  // Finishing the questionnaire must not MOVE somebody who was already on
  // the path: «عدّل إجاباتك» from step 17 returns to step 17, not to the
  // report. Only a fresh build (still on step one, nothing picked) jumps —
  // and in the owned-parts mode it detours through the owned screen first,
  // once, for the same reason.
  const freshStart = draft.stepIndex === 0
    && Object.keys(draft.partIds).length + Object.keys(draft.externalParts).length === 0;

  if (phase === 'questions') {
    return (
      <Questionnaire
        draft={draft}
        onAnswer={update}
        onDone={() => {
          if (draft.mode === 'parts' && freshStart) setPhase('owned');
          else setPhase('path');
        }}
      />
    );
  }

  if (phase === 'owned') {
    return (
      <OwnedParts
        draft={draft}
        onChange={update}
        onDone={() => {
          if (draft.stepIndex === 0) update({ stepIndex: firstUnresolvedStep(draft) });
          setPhase('path');
        }}
      />
    );
  }

  return (
    <div className="build-cols" data-testid="build-wizard">
      <div style={{ minWidth: 0 }}>
        <ProgressHeader step={step} onEditAnswers={() => setPhase('questions')} />

        <div style={{ marginTop: 16 }}>
          {step.kind === 'choice' && step.id === 'goal' && (
            /* A type the catalogue cannot finish stays LISTED and stays
             * readable — withdrawing it from the page would answer «why is it
             * gone?» with silence — but it cannot open a journey, and it says
             * in its own words why not. See `lib/build/availability.ts`. */
            <div style={{ display: 'grid', gap: 10 }} data-testid="choice-goal">
              {droneTypes.map(t => {
                const { available, reasonAr } = buildTypeAvailability(t.id);
                return (
                  <button key={t.id} type="button"
                    data-testid={`goal-${t.id}`}
                    onClick={() => selectDroneType(t.id)}
                    disabled={!available}
                    aria-pressed={draft.droneTypeId === t.id}
                    className="card-sm"
                    style={{
                      textAlign: 'start', cursor: available ? 'pointer' : 'not-allowed',
                      padding: '14px 16px',
                      border: draft.droneTypeId === t.id ? '2px solid var(--accent-ink)' : undefined,
                    }}>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 900 }}>{t.primaryName}</span>
                      {!available && (
                        <span className="admin-badge admin-badge-warn"
                          data-testid={`goal-unavailable-${t.id}`} style={{ fontSize: 10.5 }}>
                          {unavailableLabelAr()}
                        </span>
                      )}
                    </span>
                    <span style={{ display: 'block', marginTop: 5, fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.9 }}>
                      {t.description}
                    </span>
                    {!available && reasonAr && (
                      <span data-testid={`goal-reason-${t.id}`} style={{
                        display: 'block', marginTop: 7, fontSize: 12.5,
                        color: 'var(--sev-warning)', lineHeight: 1.9, fontWeight: 400,
                      }}>
                        {reasonAr}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {step.kind === 'choice' && step.id === 'size' && (
            <div data-testid="choice-size">
              {!draft.droneTypeId ? (
                <p className="card-sm" style={{ padding: '13px 15px', fontSize: 13 }}>
                  اختر نوع الدرون أولاً (الخطوة 1).
                </p>
              ) : (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {getAvailableSizeOptions(draft.droneTypeId).map(opt => (
                    <button key={opt.sizeInch} type="button"
                      data-testid={`size-${opt.sizeInch}`}
                      onClick={() => selectSize(opt.sizeInch)}
                      aria-pressed={draft.sizeInch === opt.sizeInch}
                      className="card-sm"
                      style={{
                        flex: '1 1 170px', cursor: 'pointer', padding: '16px',
                        textAlign: 'start',
                        border: draft.sizeInch === opt.sizeInch ? '2px solid var(--accent-ink)' : undefined,
                      }}>
                      <span style={{ display: 'block', fontSize: 15, fontWeight: 900 }}>{opt.labelAr}</span>
                      {/* What the number MEANS for the decision — editorial
                          use-case guidance from labels.ts, not a spec. */}
                      {SIZE_MEANING_AR[opt.sizeInch] && (
                        <span style={{ display: 'block', marginTop: 5, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.85, fontWeight: 400 }}>
                          {SIZE_MEANING_AR[opt.sizeInch]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step.kind === 'choice' && step.id === 'power' && (
            <PowerStep
              draft={draft}
              ctx={ctx}
              onVoltage={selectVoltage}
              onSelectBattery={p => selectPart('batteries', p)}
            />
          )}

          {step.kind === 'parts' && (
            <div style={{ display: 'grid', gap: 22 }}>
              {(step.categories ?? []).map(category => (
                <PartPicker
                  key={category}
                  category={category}
                  candidates={candidatesFor(category, draft)}
                  ctx={ctx}
                  selectedId={draft.partIds[category]}
                  externalName={draft.externalParts[category]}
                  optional={(step.optionalCategories ?? []).includes(category)}
                  tierPref={draft.tierPref}
                  videoSystemPref={draft.videoSystemPref}
                  rcProtocolPref={draft.rcProtocolPref}
                  advanced={draft.mode === 'advanced'}
                  onSelect={p => selectPart(category, p)}
                  onClearExternal={() => setDraft(d => {
                    const externalParts = { ...d.externalParts };
                    delete externalParts[category];
                    return { ...d, externalParts };
                  })}
                />
              ))}
            </div>
          )}

          {step.kind === 'report' && <CompatReport findings={findings} blockers={blockers} />}
          {step.kind === 'bom' && <BomView draft={draft} />}
          {step.kind === 'guide' && step.id === 'wiring' && <WiringStep draft={draft} />}
          {step.kind === 'guide' && step.id === 'assembly' && <AssemblyStep />}
          {step.kind === 'guide' && step.id === 'software' && <SoftwareStep draft={draft} />}
          {step.kind === 'guide' && step.id === 'firstflight' && <FirstFlightStep />}
          {step.kind === 'gate' && (() => {
            const gate = gateFor(step.id);
            return gate ? (
              <GateStep
                gate={gate}
                confirmed={draft.gateChecks[step.id] ?? []}
                onToggle={i => setDraft(d => {
                  const current = d.gateChecks[step.id] ?? [];
                  const next = current.includes(i)
                    ? current.filter(x => x !== i)
                    : [...current, i];
                  return { ...d, gateChecks: { ...d.gateChecks, [step.id]: next } };
                })}
              />
            ) : null;
          })()}
        </div>

        {/* Never a dead button: whenever progression is closed, the screen says
            why and what to do about it, and the button points at this text. */}
        {blockedReason && (
          <p
            id="wizard-blocked-reason"
            role="note"
            data-testid="wizard-blocked-reason"
            className="card-sm"
            style={{
              margin: '14px 0 0', padding: '12px 14px', fontSize: 12.5,
              color: 'var(--sev-warning)', lineHeight: 1.95,
            }}
          >
            {blockedReason}
          </p>
        )}

        {/* ── The dock: the two directions + «بناءي» under the thumb ──────
            On a phone this whole block rides sticky above the tab bar, so
            «التالي» is always reachable and the anchor chip opens the SAME
            panel body the desktop side column shows — upward, as a sheet
            that never covers the tab bar and never pushes content around. */}
        <div className="wizard-dock" data-testid="wizard-dock">
          {/* The cost of a foundational change, before it is paid. Rides in the
              dock so it appears under the thumb on a phone and cannot be
              scrolled past on either surface. */}
          {pendingChange && (
            <div className="invalidation-sheet" role="alertdialog" aria-modal="false"
              aria-labelledby="invalidation-title" data-testid="invalidation-sheet">
              <h2 id="invalidation-title" style={{ fontSize: 15, fontWeight: 900, margin: 0 }}>
                {pendingChange.titleAr}
              </h2>
              <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.95 }}>
                سيؤدي هذا إلى إزالة{' '}
                <b dir="ltr">{pendingChange.removedCategories.length}</b>{' '}
                من قطعك المختارة:
              </p>
              <ul data-testid="invalidation-list" style={{
                margin: '8px 0 0', paddingInlineStart: 18, fontSize: 13,
                lineHeight: 1.95, display: 'grid', gap: 3,
              }}>
                {pendingChange.removedCategories.map(category => {
                  const part = PART_CATEGORY_MAP[category]
                    ?.find(p => p.id === draft.partIds[category]);
                  return (
                    <li key={category} data-testid={`invalidation-item-${category}`}>
                      <span style={{ color: 'var(--text-dimmer)' }}>{partLabelAr(category)}: </span>
                      <b>{part?.nameAr ?? draft.partIds[category]}</b>
                    </li>
                  );
                })}
              </ul>
              {pendingChange.alsoAr && (
                <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--sev-warning)', lineHeight: 1.95 }}>
                  {pendingChange.alsoAr}
                </p>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button type="button" className="btn-primary" data-testid="invalidation-confirm"
                  onClick={() => { setDraft(pendingChange.next); setPendingChange(null); }}
                  style={{ fontSize: 13 }}>
                  متابعة التغيير
                </button>
                <button type="button" className="btn-ghost" data-testid="invalidation-cancel"
                  onClick={() => setPendingChange(null)} style={{ fontSize: 13 }}>
                  إلغاء
                </button>
              </div>
            </div>
          )}
          {anchorOpen && (
            <div className="mybuild-sheet" data-testid="my-build-sheet">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <h2 style={{ fontSize: 15, fontWeight: 900, margin: 0, flex: 1 }}>بناءي</h2>
                <button type="button" className="btn-ghost" data-testid="my-build-close"
                  onClick={() => setAnchorOpen(false)} style={{ fontSize: 12 }}>
                  أغلق ✕
                </button>
              </div>
              <MyBuildBody draft={draft} findings={findings} />
            </div>
          )}
          <div className="wizard-actions">
            <button type="button" className="btn-ghost" data-testid="wizard-prev"
              onClick={goPrev} style={{ fontSize: 13.5 }}>
              → السابق
            </button>
            <MyBuildChip draft={draft} findings={findings}
              open={anchorOpen} onToggle={() => setAnchorOpen(o => !o)} />
            {draft.stepIndex < TOTAL_BUILD_STEPS - 1 ? (
              <button type="button" className="btn-primary" data-testid="wizard-next"
                disabled={!canAdvance()} onClick={goNext} style={{ fontSize: 13.5 }}
                aria-describedby={blockedReason ? 'wizard-blocked-reason' : undefined}>
                التالي ←
              </button>
            ) : (
              <Link href="/project" className="btn-primary" data-testid="wizard-finish"
                style={{ fontSize: 13.5 }}>
                البناء مكتمل — افتح مشروعي ←
              </Link>
            )}
          </div>
        </div>
      </div>

      <MyBuildPanel draft={draft} findings={findings} />
    </div>
  );
};

/** The compact «بناءي» pulse in the dock — phone widths only (see CSS). */
const MyBuildChip: React.FC<{
  draft: BuildDraft;
  findings: Finding[];
  open: boolean;
  onToggle: () => void;
}> = ({ draft, findings, open, onToggle }) => {
  const pulse = buildPulse(draft, findings);
  return (
    <button type="button" className="btn-ghost mybuild-chip" data-testid="my-build-toggle"
      aria-expanded={open} onClick={onToggle} style={{ fontSize: 12.5 }}>
      بناءي <span dir="ltr">{pulse.requiredDone}/{pulse.requiredTotal}</span>
      {pulse.blockers > 0 && (
        <span className="admin-badge admin-badge-bad" style={{ fontSize: 10 }}>⛔ {pulse.blockers}</span>
      )}
      {pulse.blockers === 0 && pulse.warnings > 0 && (
        <span className="admin-badge admin-badge-warn" style={{ fontSize: 10 }}>⚠ {pulse.warnings}</span>
      )}
      <span aria-hidden style={{ fontSize: 10, color: 'var(--text-dimmer)' }}>{open ? '▼' : '▲'}</span>
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

function needsQuestions(draft: BuildDraft): boolean {
  if (!draft.mode) return true;
  if (!draft.experience) return true;
  if (draft.mode === 'advanced') return false;
  return !draft.tierPref || !draft.videoSystemPref || !draft.rcProtocolPref;
}

function candidatesFor(category: string, draft: BuildDraft): readonly BasePart[] {
  const all = PART_CATEGORY_MAP[category] ?? [];
  // Advanced mode sees the whole catalogue; guided modes see what the phone
  // flow would show — parts tagged for the chosen type (and voltage, which
  // checkCandidate already turns into a hard verdict shown on the card).
  if (draft.mode === 'advanced' || !draft.droneTypeId) return all;
  const tagged = all.filter(p => p.compatibilityTags.droneTypes.includes(draft.droneTypeId!));
  return tagged.length > 0 ? tagged : all;
}

const ProgressHeader: React.FC<{ step: BuildStep; onEditAnswers: () => void }> = ({ step, onEditAnswers }) => (
  <header>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
      <p data-testid="wizard-progress" style={{ margin: 0, fontSize: 12, fontWeight: 900, color: 'var(--accent-ink)' }}>
        الخطوة <span dir="ltr">{step.number}</span> من <span dir="ltr">{TOTAL_BUILD_STEPS}</span>
        <span style={{ fontWeight: 700, color: 'var(--text-dimmer)' }}> · مرحلة {phaseForStep(step.number)}</span>
      </p>
      <button type="button" className="btn-ghost" onClick={onEditAnswers}
        data-testid="wizard-edit-answers" style={{ fontSize: 11.5, marginInlineStart: 'auto' }}>
        عدّل إجاباتك
      </button>
    </div>
    {/* Four segments, one per arc of the journey — a form has one bar, a
        journey has stages you can SEE yourself crossing. Widths are
        proportional to each arc's step count. */}
    <div aria-hidden data-testid="wizard-phase-bar" style={{ display: 'flex', gap: 4, marginTop: 8 }}>
      {BUILD_PHASES.map(p => {
        const total = p.to - p.from + 1;
        const fill = step.number > p.to ? 100
          : step.number < p.from ? 0
          : Math.round(((step.number - p.from + 1) / total) * 100);
        return (
          <div key={p.titleAr} title={p.titleAr} style={{
            flex: total, height: 5, borderRadius: 999,
            background: 'var(--surface-2)', overflow: 'hidden',
          }}>
            <div style={{ height: '100%', width: `${fill}%`, borderRadius: 999, background: 'var(--accent)' }} />
          </div>
        );
      })}
    </div>
    <h2 style={{ fontSize: 20, fontWeight: 900, margin: '14px 0 0' }}>{step.titleAr}</h2>
    <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.95 }}>
      {step.introAr}
    </p>
    {/* A first build is full of first words. The glossary carries every term
        with its English form as the software spells it — one tap away on
        every step, so an unknown word never blocks a decision. */}
    <p style={{ margin: '7px 0 0', fontSize: 11.5 }}>
      <Link href="/glossary" data-testid="wizard-glossary" style={{ color: 'var(--text-dimmer)' }}>
        مصطلح غير مفهوم؟ افتح القاموس ←
      </Link>
    </p>
  </header>
);

// ── The questionnaire — one clear question at a time ────────────────────────

const Questionnaire: React.FC<{
  draft: BuildDraft;
  onAnswer: (patch: Partial<BuildDraft>) => void;
  onDone: () => void;
}> = ({ draft, onAnswer, onDone }) => {
  const pending: QuestionId[] = [];
  if (!draft.experience) pending.push('experience');
  if (draft.mode !== 'advanced') {
    if (!draft.tierPref) pending.push('tier');
    if (!draft.videoSystemPref) pending.push('video');
    if (!draft.rcProtocolPref) pending.push('rc');
  }
  const [cursor, setCursor] = useState(0);

  // Re-entry with everything answered: this screen is now an EDIT screen.
  const editing = pending.length === 0;
  const current: QuestionId | undefined = editing ? undefined : pending[Math.min(cursor, pending.length - 1)];

  const answerAndNext = (patch: Partial<BuildDraft>) => {
    onAnswer(patch);
    if (pending.length <= 1) onDone();
    else setCursor(0); // pending recomputes next render; first unanswered wins
  };

  return (
    <div data-testid="build-questionnaire" style={{ maxWidth: 640 }}>
      {!draft.mode && (
        <QuestionCard titleAr="كيف تريد أن تبني؟" subtitleAr="اختر طريقتك — يمكن تغييرها لاحقاً.">
          <OptionButton testId="mode-guided" onClick={() => onAnswer({ mode: 'guided' })}
            titleAr="ساعدني في اختيار كل شيء" bodyAr="مسار كامل موجّه — الأنسب لأول بناء." />
          <OptionButton testId="mode-parts" onClick={() => onAnswer({ mode: 'parts' })}
            titleAr="لدي بعض القطع" bodyAr="سجّل ما تملكه، ونكمل بقية المنظومة حوله." />
          <OptionButton testId="mode-advanced" onClick={() => onAnswer({ mode: 'advanced' })}
            titleAr="أريد بناءً متقدماً" bodyAr="كل الخيارات ظاهرة، وأنت من يقرر — والمحرك يراجع خلفك." />
        </QuestionCard>
      )}

      {draft.mode && current === 'experience' && (
        <QuestionCard titleAr="ما مستوى خبرتك؟" subtitleAr="يضبط كم نشرح، لا ماذا نخفي.">
          <OptionButton testId="exp-beginner" onClick={() => answerAndNext({ experience: 'beginner' })}
            titleAr="مبتدئ" bodyAr="هذا أول بناء لي." />
          <OptionButton testId="exp-intermediate" onClick={() => answerAndNext({ experience: 'intermediate' })}
            titleAr="متوسط" bodyAr="بنيت أو أصلحت من قبل، وأريد تركيبة أفضل." />
          <OptionButton testId="exp-advanced" onClick={() => answerAndNext({ experience: 'advanced' })}
            titleAr="متقدم" bodyAr="أعرف ما أفعله وأريد التفاصيل كاملة." />
        </QuestionCard>
      )}

      {draft.mode && current === 'tier' && (
        <QuestionCard titleAr="ما ميزانيتك؟" subtitleAr="ترتّب المقترحات ولا تُخفي شيئاً.">
          <OptionButton testId="tier-budget" onClick={() => answerAndNext({ tierPref: 'budget' })}
            titleAr="اقتصادية" bodyAr="أقل كلفة تعطي بناءً موثوقاً." />
          <OptionButton testId="tier-mid" onClick={() => answerAndNext({ tierPref: 'mid' })}
            titleAr="متوازنة" bodyAr="منتصف المدى — أداء أعلى بكلفة معقولة." />
          <OptionButton testId="tier-premium" onClick={() => answerAndNext({ tierPref: 'premium' })}
            titleAr="Premium" bodyAr="أفضل المتاح في الكتالوج." />
        </QuestionCard>
      )}

      {draft.mode && current === 'video' && (
        <QuestionCard titleAr="أي منظومة فيديو تستخدم نظارتك؟"
          subtitleAr="المنظومات لا تتخاطب — وحدة البث يجب أن تطابق النظارة.">
          {videoSystemOptions().map(sys => (
            <OptionButton key={sys} testId={`video-${sys}`}
              onClick={() => answerAndNext({ videoSystemPref: sys })}
              titleAr={sys} bodyAr="" ltrTitle />
          ))}
          <OptionButton testId="video-skip" onClick={() => answerAndNext({ videoSystemPref: UNDECIDED_PREF })}
            titleAr="لا أعرف بعد" bodyAr="سنعرض الكل ونشرح الفرق عند خطوة الفيديو." />
        </QuestionCard>
      )}

      {draft.mode && current === 'rc' && (
        <QuestionCard titleAr="ما بروتوكول جهاز التحكم لديك؟"
          subtitleAr="الريسيفر يجب أن يكون من نفس البروتوكول.">
          {rcProtocolOptions().map(proto => (
            <OptionButton key={proto} testId={`rc-${proto}`}
              onClick={() => answerAndNext({ rcProtocolPref: proto })}
              titleAr={proto} bodyAr="" ltrTitle />
          ))}
          <OptionButton testId="rc-skip" onClick={() => answerAndNext({ rcProtocolPref: UNDECIDED_PREF })}
            titleAr="لا أملك جهاز تحكم بعد" bodyAr="سنعرض الكل عند خطوة الريسيفر." />
        </QuestionCard>
      )}

      {editing && draft.mode && (
        <QuestionCard titleAr="إجاباتك" subtitleAr="بدّل ما تريد ثم تابع.">
          <EditRow labelAr="الطريقة" valueAr={
            draft.mode === 'guided' ? 'ساعدني في اختيار كل شيء'
            : draft.mode === 'parts' ? 'لدي بعض القطع' : 'بناء متقدم'}
            onClear={() => onAnswer({ mode: undefined })} />
          <EditRow labelAr="الخبرة" valueAr={
            draft.experience === 'beginner' ? 'مبتدئ'
            : draft.experience === 'intermediate' ? 'متوسط' : 'متقدم'}
            onClear={() => onAnswer({ experience: undefined })} />
          {draft.mode !== 'advanced' && (
            <>
              <EditRow labelAr="الميزانية" valueAr={
                draft.tierPref === 'budget' ? 'اقتصادية'
                : draft.tierPref === 'mid' ? 'متوازنة' : 'Premium'}
                onClear={() => onAnswer({ tierPref: undefined })} />
              <EditRow labelAr="الفيديو"
                valueAr={draft.videoSystemPref === UNDECIDED_PREF ? 'أقرر لاحقاً' : draft.videoSystemPref ?? '—'}
                onClear={() => onAnswer({ videoSystemPref: undefined })} />
              <EditRow labelAr="التحكم"
                valueAr={draft.rcProtocolPref === UNDECIDED_PREF ? 'أقرر لاحقاً' : draft.rcProtocolPref ?? '—'}
                onClear={() => onAnswer({ rcProtocolPref: undefined })} />
            </>
          )}
          <button type="button" className="btn-primary" data-testid="questions-done"
            onClick={onDone} style={{ marginTop: 6, fontSize: 13.5 }}>
            تابع البناء ←
          </button>
        </QuestionCard>
      )}
    </div>
  );
};

// ── «لدي بعض القطع» — the owned-parts screen ────────────────────────────────

/**
 * «قطعك الحالية» — one clean card per category, phone-first.
 *
 * WHY THE CONTROLS ARE STACKED, NOT SIDE BY SIDE
 * ----------------------------------------------
 * The first layout put the select and the free-text input on one flex row.
 * A native <select> sizes itself to its LONGEST option — and the options
 * carried «الاسم العربي — the English name», so on a 390px phone the row
 * blew the page out to 723px and the reader met a horizontally-scrolled,
 * seemingly-broken screen. Now: the Arabic name is the option (short), the
 * chosen part's English name renders under the control as a caption, and
 * every control is full-width with a touch-friendly height. The global
 * `select { min-width: 0; max-width: 100% }` rule guards the class of bug;
 * this layout removes the instance.
 */
const OwnedParts: React.FC<{
  draft: BuildDraft;
  onChange: (patch: Partial<BuildDraft>) => void;
  onDone: () => void;
}> = ({ draft, onChange, onDone }) => {
  const categories = Object.keys(PART_CATEGORY_MAP);
  const control: React.CSSProperties = {
    width: '100%', minWidth: 0, fontSize: 15, padding: '12px 12px',
    borderRadius: 10, border: '1px solid var(--border-soft)',
    background: 'var(--surface)', color: 'var(--text)',
  };
  return (
    <div data-testid="build-owned-parts" style={{ maxWidth: 640 }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: 'var(--accent-ink)' }}>
        خطوة تمهيدية — قبل مسار البناء
      </p>
      <h2 style={{ fontSize: 20, fontWeight: 900, margin: '6px 0 0' }}>قطعك الحالية</h2>
      <p style={{ margin: '8px 0 18px', fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.95 }}>
        حدد ما تملكه، وما تتركه فارغاً سيقترحه المسار حولك.
      </p>
      <div style={{ display: 'grid', gap: 12 }}>
        {categories.map(category => {
          const parts = PART_CATEGORY_MAP[category];
          const owned = draft.partIds[category];
          const external = draft.externalParts[category];
          const ownedPart = owned ? parts.find(p => p.id === owned) : undefined;
          return (
            <div key={category} className="card-sm" style={{ padding: '14px 16px', minWidth: 0 }}>
              <p style={{ margin: '0 0 9px', fontSize: 14, fontWeight: 900 }}>
                {partLabel(category)}
              </p>
              <select
                value={owned ?? ''}
                data-testid={`owned-select-${category}`}
                onChange={e => {
                  const id = e.target.value;
                  const partIds = { ...draft.partIds };
                  const externalParts = { ...draft.externalParts };
                  if (id) { partIds[category] = id; delete externalParts[category]; }
                  else delete partIds[category];
                  onChange({ partIds, externalParts });
                }}
                style={control}
              >
                <option value="">لا أملكها — يقترحها المسار</option>
                {parts.map(p => (
                  <option key={p.id} value={p.id}>{p.nameAr}</option>
                ))}
              </select>
              {ownedPart && (
                <p dir="ltr" style={{
                  margin: '6px 2px 0', fontSize: 11.5, color: 'var(--text-dimmer)',
                  textAlign: 'end', overflowWrap: 'anywhere',
                }}>
                  {ownedPart.nameEn}{ownedPart.brand ? ` — ${ownedPart.brand}` : ''}
                </p>
              )}
              <input
                type="text"
                placeholder="أو اكتب اسم قطعتك غير المدرجة"
                defaultValue={external ?? ''}
                data-testid={`owned-external-${category}`}
                onBlur={e => {
                  const name = e.target.value.trim();
                  const partIds = { ...draft.partIds };
                  const externalParts = { ...draft.externalParts };
                  if (name) { externalParts[category] = name; delete partIds[category]; }
                  else delete externalParts[category];
                  onChange({ partIds, externalParts });
                }}
                style={{ ...control, marginTop: 8 }}
              />
            </div>
          );
        })}
      </div>
      <button type="button" className="btn-primary" data-testid="owned-done"
        onClick={onDone} style={{ marginTop: 18, fontSize: 14.5, width: '100%', padding: '13px 16px' }}>
        تم — أكمل البناء حول قطعي ←
      </button>
    </div>
  );
};

// ── Step 4 — voltage first, the concrete battery optional ───────────────────

const PowerStep: React.FC<{
  draft: BuildDraft;
  ctx: BuildContext;
  onVoltage: (s: number) => void;
  onSelectBattery: (p: BasePart) => void;
}> = ({ draft, ctx, onVoltage, onSelectBattery }) => {
  const voltageHasFullCoverage = (sCount: number) =>
    !draft.droneTypeId || MANDATORY_PART_CATEGORIES.every(cat =>
      (PART_CATEGORY_MAP[cat] ?? []).some(p =>
        p.compatibilityTags.droneTypes.includes(draft.droneTypeId!)
        && p.compatibilityTags.batteryVoltages.includes(sCount)));

  return (
    <div data-testid="choice-power">
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {batteryVoltageOptions.map(opt => {
          const covered = voltageHasFullCoverage(opt.sCount);
          return (
            <button key={opt.sCount} type="button"
              data-testid={`voltage-${opt.sCount}s`}
              disabled={!covered}
              onClick={() => onVoltage(opt.sCount)}
              aria-pressed={draft.batteryVoltage === opt.sCount}
              className="card-sm"
              style={{
                flex: '1 1 150px', cursor: covered ? 'pointer' : 'not-allowed',
                padding: 16, textAlign: 'center', opacity: covered ? 1 : 0.55,
                border: draft.batteryVoltage === opt.sCount ? '2px solid var(--accent-ink)' : undefined,
              }}>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 900 }}>{opt.labelAr}</span>
              {/* The decision the number stands for, before the number. */}
              {VOLTAGE_MEANING_AR[opt.sCount] && (
                <span style={{ display: 'block', marginTop: 5, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.85 }}>
                  {VOLTAGE_MEANING_AR[opt.sCount]}
                </span>
              )}
              <span dir="ltr" style={{ display: 'block', marginTop: 4, fontSize: 11.5, color: 'var(--text-dimmer)' }}>
                nominal {opt.nominalVoltage}V · full {opt.maxVoltage}V
              </span>
              {!covered && (
                <span style={{ display: 'block', marginTop: 4, fontSize: 11, color: 'var(--text-dimmer)' }}>
                  لا تغطية كاملة لقطع نوعك بعد
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.9 }}>
        اختيار الفولتية لا يثبت وحده توافق البناء — منظومة الطاقة كلها تُفحص في خطوة التوافق.
      </p>

      {draft.batteryVoltage !== undefined && (
        <div style={{ marginTop: 20 }}>
          <PartPicker
            category="batteries"
            candidates={PART_CATEGORY_MAP.batteries ?? []}
            ctx={ctx}
            selectedId={draft.partIds.batteries}
            externalName={draft.externalParts.batteries}
            optional
            tierPref={draft.tierPref}
            advanced={draft.mode === 'advanced'}
            onSelect={onSelectBattery}
          />
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-dimmer)' }}>
            يمكن تأجيل منتج البطارية — سيبقى ظاهراً كناقص في «بناءي» والقائمة النهائية.
          </p>
        </div>
      )}
    </div>
  );
};

// ── Small shared pieces ─────────────────────────────────────────────────────

const QuestionCard: React.FC<{
  titleAr: string; subtitleAr: string; children: React.ReactNode;
}> = ({ titleAr, subtitleAr, children }) => (
  <section className="card" style={{ padding: '20px 22px', marginBottom: 14 }}>
    <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>{titleAr}</h2>
    <p style={{ margin: '6px 0 14px', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.9 }}>
      {subtitleAr}
    </p>
    <div style={{ display: 'grid', gap: 10 }}>{children}</div>
  </section>
);

const OptionButton: React.FC<{
  titleAr: string; bodyAr: string; onClick: () => void; testId: string; ltrTitle?: boolean;
}> = ({ titleAr, bodyAr, onClick, testId, ltrTitle }) => (
  <button type="button" className="card-sm" data-testid={testId} onClick={onClick}
    style={{ textAlign: 'start', cursor: 'pointer', padding: '14px 16px' }}>
    <span style={{ display: 'block', fontSize: 14.5, fontWeight: 900 }}
      dir={ltrTitle ? 'ltr' : undefined}>{titleAr}</span>
    {bodyAr && (
      <span style={{ display: 'block', marginTop: 4, fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.85 }}>
        {bodyAr}
      </span>
    )}
  </button>
);

const EditRow: React.FC<{ labelAr: string; valueAr: string; onClear: () => void }> = ({
  labelAr, valueAr, onClear,
}) => (
  <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
    <span style={{ fontSize: 12.5, color: 'var(--text-dimmer)', minWidth: 70 }}>{labelAr}</span>
    <span style={{ fontSize: 13.5, fontWeight: 800, flex: 1 }}>{valueAr}</span>
    <button type="button" className="btn-ghost" onClick={onClear} style={{ fontSize: 12 }}>
      غيّر
    </button>
  </div>
);
