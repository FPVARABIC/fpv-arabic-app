'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { droneTypes } from '@core/data/assembly/droneTypes';
import { getAvailableSizeOptions, frameMatchesSize } from '@core/data/assembly/frameSizeMatch';
import { batteryVoltageOptions } from '@core/data/assembly/batteryVoltageOptions';
import { buildStages } from '@core/data/assembly/buildStages';
import { PART_CATEGORY_MAP, PART_CATEGORY_LABEL_AR } from '@core/data/project/store';
import { computeFindings, sortFindings } from '@core/data/project/verdicts';
import type { BasePart, Frame } from '@core/data/assembly/types';
import {
  BUILD_PATH, TOTAL_BUILD_STEPS, phoneStageIndexFor, type BuildStep,
} from '@/lib/build/path';
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
import { MyBuildPanel } from './MyBuildPanel';
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

  // Persist + mirror on every draft change. The draft is the truth; the
  // shared store follows it.
  useEffect(() => {
    saveDraft(draft);
    mirrorToProject(draft);
  }, [draft]);

  const update = (patch: Partial<BuildDraft>) => setDraft(d => ({ ...d, ...patch }));

  const ctx: BuildContext = useMemo(() => ({
    droneTypeId: draft.droneTypeId,
    sizeInch: draft.sizeInch,
    batteryVoltage: draft.batteryVoltage,
    parts: draftParts(draft),
  }), [draft]);

  const findings = useMemo(() => {
    const snapshot = snapshotFromContext(ctx, phoneStageIndexFor(draft.stepIndex));
    return snapshot.exists ? sortFindings(computeFindings(snapshot)) : [];
  }, [ctx, draft.stepIndex]);
  const blockers = findings.filter(f => f.severity === 'blocker').length;

  /** Selecting a part, with the same single-field invalidation the phone does. */
  const selectPart = (category: string, part: BasePart) => {
    setDraft(d => {
      const partIds = { ...d.partIds, [category]: part.id };
      const externalParts = { ...d.externalParts };
      delete externalParts[category];
      return { ...d, partIds, externalParts };
    });
  };

  const selectSize = (sizeInch: number) => {
    setDraft(d => {
      const partIds = { ...d.partIds };
      const frame = partIds.frames
        ? (PART_CATEGORY_MAP.frames?.find(p => p.id === partIds.frames) as Frame | undefined)
        : undefined;
      if (frame && !frameMatchesSize(frame, sizeInch)) delete partIds.frames;
      return { ...d, sizeInch, partIds };
    });
  };

  const selectVoltage = (sCount: number) => {
    setDraft(d => {
      const partIds: Record<string, string> = {};
      for (const [category, id] of Object.entries(d.partIds)) {
        const part = PART_CATEGORY_MAP[category]?.find(p => p.id === id);
        if (part && part.compatibilityTags.batteryVoltages.includes(sCount)) {
          partIds[category] = id;
        }
      }
      return { ...d, batteryVoltage: sCount, partIds };
    });
  };

  const selectDroneType = (droneTypeId: string) => {
    setDraft(d => {
      if (d.droneTypeId && d.droneTypeId !== droneTypeId
        && Object.keys(d.partIds).length > 0
        && !window.confirm('تغيير نوع الدرون سيُسقط القطع غير الموسومة للنوع الجديد. هل تريد المتابعة؟')) {
        return d;
      }
      const partIds: Record<string, string> = {};
      for (const [category, id] of Object.entries(d.partIds)) {
        const part = PART_CATEGORY_MAP[category]?.find(p => p.id === id);
        if (part && part.compatibilityTags.droneTypes.includes(droneTypeId)) {
          partIds[category] = id;
        }
      }
      const sizeStillValid = d.sizeInch !== undefined
        && getAvailableSizeOptions(droneTypeId).some(o => o.sizeInch === d.sizeInch);
      return {
        ...d, droneTypeId, partIds,
        sizeInch: sizeStillValid ? d.sizeInch : undefined,
      };
    });
  };

  const step = BUILD_PATH[draft.stepIndex];

  const canAdvance = (): boolean => {
    switch (step.kind) {
      case 'choice':
        if (step.id === 'goal') return !!draft.droneTypeId;
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

  const goNext = () => update({ stepIndex: Math.min(draft.stepIndex + 1, TOTAL_BUILD_STEPS - 1) });
  const goPrev = () => {
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
            <div style={{ display: 'grid', gap: 10 }} data-testid="choice-goal">
              {droneTypes.map(t => (
                <button key={t.id} type="button"
                  data-testid={`goal-${t.id}`}
                  onClick={() => selectDroneType(t.id)}
                  aria-pressed={draft.droneTypeId === t.id}
                  className="card-sm"
                  style={{
                    textAlign: 'start', cursor: 'pointer', padding: '14px 16px',
                    border: draft.droneTypeId === t.id ? '2px solid var(--accent-ink)' : undefined,
                  }}>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 900 }}>{t.primaryName}</span>
                  <span style={{ display: 'block', marginTop: 5, fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.9 }}>
                    {t.description}
                  </span>
                </button>
              ))}
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
                        flex: '1 1 140px', cursor: 'pointer', padding: '16px',
                        textAlign: 'center', fontSize: 15, fontWeight: 900,
                        border: draft.sizeInch === opt.sizeInch ? '2px solid var(--accent-ink)' : undefined,
                      }}>
                      {opt.labelAr}
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

        {/* ── The two directions ─────────────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}>
          <button type="button" className="btn-ghost" data-testid="wizard-prev"
            onClick={goPrev} style={{ fontSize: 13.5 }}>
            → السابق
          </button>
          {draft.stepIndex < TOTAL_BUILD_STEPS - 1 ? (
            <button type="button" className="btn-primary" data-testid="wizard-next"
              disabled={!canAdvance()} onClick={goNext} style={{ fontSize: 13.5 }}>
              التالي ←
            </button>
          ) : (
            <Link href="/project" className="btn-primary" data-testid="wizard-finish"
              style={{ fontSize: 13.5 }}>
              البناء مكتمل — افتح مشروعي ←
            </Link>
          )}
        </div>
        {!canAdvance() && step.kind === 'report' && blockers > 0 && (
          <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--sev-blocker)' }}>
            «التالي» مقفل حتى تُعالج الموانع أعلاه.
          </p>
        )}
      </div>

      <MyBuildPanel draft={draft} findings={findings} />
    </div>
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
      </p>
      <button type="button" className="btn-ghost" onClick={onEditAnswers}
        data-testid="wizard-edit-answers" style={{ fontSize: 11.5, marginInlineStart: 'auto' }}>
        عدّل إجاباتك
      </button>
    </div>
    <div aria-hidden style={{
      height: 5, borderRadius: 999, background: 'var(--surface-2)', marginTop: 8, overflow: 'hidden',
    }}>
      <div style={{
        height: '100%', borderRadius: 999, background: 'var(--accent)',
        width: `${Math.round((step.number / TOTAL_BUILD_STEPS) * 100)}%`,
      }} />
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

const OwnedParts: React.FC<{
  draft: BuildDraft;
  onChange: (patch: Partial<BuildDraft>) => void;
  onDone: () => void;
}> = ({ draft, onChange, onDone }) => {
  const categories = Object.keys(PART_CATEGORY_MAP);
  return (
    <div data-testid="build-owned-parts" style={{ maxWidth: 720 }}>
      <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>قطعك الحالية</h2>
      <p style={{ margin: '8px 0 18px', fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.95 }}>
        حدد ما تملكه — من الكتالوج إن وُجد، أو باسمه إن لم يوجد. ما تتركه فارغاً
        سيقترحه المسار حولك. القطع من خارج الكتالوج لا يمكن فحص توافقها آلياً،
        وستُعلَّم بذلك بوضوح.
      </p>
      <div style={{ display: 'grid', gap: 12 }}>
        {categories.map(category => {
          const parts = PART_CATEGORY_MAP[category];
          const owned = draft.partIds[category];
          const external = draft.externalParts[category];
          return (
            <div key={category} className="card-sm" style={{ padding: '13px 15px' }}>
              <p style={{ margin: '0 0 8px', fontSize: 13.5, fontWeight: 900 }}>
                {PART_CATEGORY_LABEL_AR[category] ?? category}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
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
                  style={{
                    fontSize: 13, padding: '8px 10px', borderRadius: 8,
                    border: '1px solid var(--border-soft)', background: 'var(--surface)',
                    maxWidth: '100%',
                  }}
                >
                  <option value="">— لا أملكها / يقترحها المسار —</option>
                  {parts.map(p => (
                    <option key={p.id} value={p.id}>{p.nameAr} — {p.nameEn}</option>
                  ))}
                </select>
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
                  style={{
                    fontSize: 13, padding: '8px 10px', borderRadius: 8,
                    border: '1px solid var(--border-soft)', background: 'var(--surface)',
                    flex: '1 1 200px',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <button type="button" className="btn-primary" data-testid="owned-done"
        onClick={onDone} style={{ marginTop: 18, fontSize: 13.5 }}>
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
