import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Lesson } from '../../types';
import type { LessonJourneyDefinition } from '../../types/lessonJourney';
import { useProgressContext } from '../../contexts/ProgressContext';
import {
  createInitialSessionState, currentStage, stageCount, nextStage, prevStage, goToStageId,
  recordCheckpointAnswer, recordInteractionVariant, recordRecallRevealed,
  isInteractionComplete, getReadinessRequirements, isReadyToComplete,
  type JourneySessionState,
} from '../../data/lessons/lessonJourneyEngine';
import {
  StageShell, CheckpointCard, GlossaryRevealCard, ACCENT, CARD_BG,
} from './journeyStageComponents';
import { interactiveDiagramAdapters } from './interactiveDiagramAdapters';
import { enrichJourneyDefinition } from '../../data/lessons/lessonJourneyEnrich';
import { SafetyWarning } from '../SafetyWarning';
import { resolveDestination } from '../../platform/destinations';
import { getDxTree } from '../../data/kb/diagnostics/trees';
import type { JourneyStageTool } from '../../types/lessonJourney';
import { CheckCircle2, ArrowRight, ChevronLeft, ChevronRight, Circle, Star, Clock } from 'lucide-react';

/**
 * The optional tool a callout may point at.
 *
 * It is a button, not a journey control: it leaves the lesson entirely, and the
 * lesson's saved progress is what brings the reader back where they were. It is
 * never part of the readiness checklist — a callout carries no requirement, so
 * skipping this cannot block completion.
 *
 * `resolveDestination` returns null for a target that no longer exists, and
 * nothing is rendered in that case rather than a button that goes nowhere.
 */
const StageTool: React.FC<{ tool: JourneyStageTool; stageId: string }> = ({ tool, stageId }) => {
  const navigate = useNavigate();
  const path = resolveDestination(tool.destination, { dxExists: id => !!getDxTree(id) });
  if (!path) return null;
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => navigate(path)}
        data-testid={`stage-tool-${stageId}`}
        className="w-full text-right rounded-xl px-4 py-3 text-sm font-bold leading-relaxed"
        style={{ background: CARD_BG, border: `1px solid ${ACCENT}`, color: ACCENT }}
      >
        {tool.label}
      </button>
      <p className="text-xs mt-2 leading-relaxed" style={{ color: '#94A3B8' }}>{tool.note}</p>
    </div>
  );
};

interface Props {
  definition: LessonJourneyDefinition;
  lesson: Lesson;
  nextLesson: Lesson | null;
}

/** Same level/duration badge markup the generic lesson page already uses. */
const LessonMetaBadges: React.FC<{ lesson: Lesson }> = ({ lesson }) => (
  <div className="flex items-center gap-2.5">
    <span className="pill-stat text-sm"><Star size={14} style={{ color: '#5EEAD4' }}/> {lesson.level}</span>
    <span className="pill-stat text-sm"><Clock size={14} style={{ color: '#5EEAD4' }}/> {lesson.duration}</span>
  </div>
);

/**
 * Renders any LessonJourneyDefinition — a sequence of typed stages driving a
 * generic progression/readiness engine (lessonJourneyEngine.ts). Every lesson
 * in `lessonsData` has a definition (see journeyRegistry.ts) and renders here.
 *
 * The definition is enriched on the way in (`enrichJourneyDefinition`), so the
 * lesson's authored objective, key points, common mistake and safety warning
 * appear as stages — the same view the web renders.
 *
 * The `lesson01-*` data-testid prefix is historical: the sixteen per-lesson UI
 * scripts under scripts/ select by it, so it stays until they are updated
 * together.
 */
export const InteractiveLessonJourney: React.FC<Props> = ({ definition: baseDefinition, lesson, nextLesson }) => {
  const navigate = useNavigate();
  const { completedLessons, completeLesson } = useProgressContext();
  const isDone = completedLessons.includes(lesson.id);
  const definition = React.useMemo(() => enrichJourneyDefinition(baseDefinition, lesson), [baseDefinition, lesson]);
  const [state, setState] = useState<JourneySessionState>(() => createInitialSessionState(definition));

  const total = stageCount(definition);
  const stage = currentStage(definition, state);
  const stageNumber = state.currentStageIndex + 1;

  const goto = (stageId: string) => setState(s => goToStageId(definition, s, stageId));
  const next = () => setState(s => nextStage(definition, s));
  const prev = () => setState(s => prevStage(definition, s));

  const answerCheckpoint = (checkpointId: string, optionId: string) =>
    setState(s => recordCheckpointAnswer(s, checkpointId, optionId));

  const recordVariant = (stageId: string, variant: string) =>
    setState(s => recordInteractionVariant(s, stageId, variant));

  const revealRecall = (recallStageId: string, promptId: string) =>
    setState(s => recordRecallRevealed(s, recallStageId, promptId));

  const requirements = getReadinessRequirements(definition, state);
  const ready = isReadyToComplete(definition, state);

  const hasNext = state.currentStageIndex < total - 1;
  const hasPrev = state.currentStageIndex > 0;

  return (
    <div>
      <div className="mb-4">
        <LessonMetaBadges lesson={lesson}/>
      </div>

      {stage.type === 'orientation' && (
        <StageShell stage={stageNumber} stageCount={total} title={stage.title} onNext={hasNext ? next : undefined}>
          <div className="pull-quote" style={{ background: CARD_BG }}>
            <p className="text-[15px] leading-loose" style={{ color: '#F8FAFC' }}>{stage.body}</p>
            {stage.objective && (
              <p className="text-xs font-bold mt-3 pt-3" style={{ color: ACCENT, borderTop: '1px dashed rgba(94,234,212,0.25)' }}>
                🎯 الهدف من هذا الدرس: {stage.objective}
              </p>
            )}
          </div>
        </StageShell>
      )}

      {stage.type === 'callout' && (
        <StageShell stage={stageNumber} stageCount={total} title={stage.title} onPrev={hasPrev ? prev : undefined} onNext={hasNext ? next : undefined}>
          {stage.tone === 'danger' && <SafetyWarning message={stage.body} type="danger"/>}
          {stage.tone === 'warn' && (
            <div className="warning-card">
              <p className="text-xs text-amber-300 font-bold mb-1">تنبيه</p>
              <p className="text-sm text-amber-100/90 leading-relaxed">{stage.body}</p>
            </div>
          )}
          {stage.tone === 'info' && (
            <div className="card-subtle p-4" style={{ background: CARD_BG }}>
              <p className="text-sm leading-relaxed" style={{ color: '#CBD5E1' }}>{stage.body}</p>
            </div>
          )}
          {stage.tool && <StageTool tool={stage.tool} stageId={stage.id}/>}
        </StageShell>
      )}

      {stage.type === 'key_points' && (
        <StageShell stage={stageNumber} stageCount={total} title={stage.title} onPrev={hasPrev ? prev : undefined} onNext={hasNext ? next : undefined}>
          {stage.intro && <p className="text-sm" style={{ color: '#CBD5E1' }}>{stage.intro}</p>}
          <div className="grid gap-2.5">
            {stage.points.map((point, i) => (
              <div key={i} className="card-subtle p-3.5 flex items-start gap-3" style={{ background: CARD_BG }}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, rgba(94,234,212,0.22), rgba(167,243,208,0.1))', border: '1px solid rgba(94,234,212,0.35)' }}
                >
                  <span className="text-sm font-extrabold" style={{ color: '#A7F3D0' }}>{i + 1}</span>
                </div>
                <p className="text-sm leading-relaxed pt-1" style={{ color: '#CBD5E1' }}>{point}</p>
              </div>
            ))}
          </div>
        </StageShell>
      )}

      {stage.type === 'explanation' && (
        <StageShell stage={stageNumber} stageCount={total} title={stage.title} onPrev={hasPrev ? prev : undefined} onNext={hasNext ? next : undefined}>
          <div className="pull-quote" style={{ background: CARD_BG }}>
            <p className="text-[15px] leading-loose" style={{ color: '#F8FAFC' }}>
              {stage.body === 'lesson-explanation' ? lesson.explanation : stage.body}
            </p>
          </div>
        </StageShell>
      )}

      {stage.type === 'worked_example' && (
        <StageShell stage={stageNumber} stageCount={total} title={stage.title} onPrev={hasPrev ? prev : undefined} onNext={hasNext ? next : undefined}>
          <div className="pull-quote" style={{ background: CARD_BG }}>
            <p className="text-[15px] leading-loose" style={{ color: '#F8FAFC' }}>{stage.body}</p>
          </div>
        </StageShell>
      )}

      {stage.type === 'checkpoint' && (
        <StageShell stage={stageNumber} stageCount={total} title={stage.title} onPrev={hasPrev ? prev : undefined} onNext={hasNext ? next : undefined}>
          <CheckpointCard
            checkpoint={stage.checkpoint}
            answeredOptionId={state.checkpointAnswers[stage.checkpoint.id]}
            onAnswer={id => answerCheckpoint(stage.checkpoint.id, id)}
          />
        </StageShell>
      )}

      {stage.type === 'interactive_diagram' && (() => {
        const Diagram = interactiveDiagramAdapters[stage.diagramType];
        const recorded = state.interactionVariants[stage.id] || {};
        const recordedCount = stage.requiredVariants.filter(v => recorded[v]).length;
        const complete = isInteractionComplete(stage, state);
        return (
          <StageShell stage={stageNumber} stageCount={total} title={stage.title} onPrev={hasPrev ? prev : undefined} onNext={hasNext ? next : undefined}>
            <p className="text-sm" style={{ color: '#CBD5E1' }}>{stage.instructions}</p>
            {Diagram && <Diagram onVariant={v => recordVariant(stage.id, v)} />}
            {!complete && (
              <p className="text-xs" style={{ color: '#94a3b8' }}>
                {recordedCount === 0 && stage.hints.none}
                {recordedCount === 1 && stage.requiredVariants.filter(v => recorded[v]).map(v => stage.hints.partial[v])}
              </p>
            )}
          </StageShell>
        );
      })()}

      {stage.type === 'comparison' && (
        <StageShell stage={stageNumber} stageCount={total} title={stage.title} onPrev={hasPrev ? prev : undefined} onNext={hasNext ? next : undefined}>
          <div className="grid gap-2.5">
            {stage.items.map(item => (
              <div key={item.label} className="card-subtle p-3.5" style={{ background: CARD_BG }}>
                <p className="text-xs font-bold mb-1" style={{ color: ACCENT }}>{item.label}</p>
                <p className="text-sm leading-relaxed" style={{ color: '#CBD5E1' }}>{item.body}</p>
              </div>
            ))}
          </div>
          {stage.footer && <p className="text-sm" style={{ color: '#CBD5E1' }}>{stage.footer}</p>}
        </StageShell>
      )}

      {stage.type === 'glossary' && (
        <StageShell stage={stageNumber} stageCount={total} title={stage.title} onPrev={hasPrev ? prev : undefined} onNext={hasNext ? next : undefined}>
          <p className="text-sm" style={{ color: '#CBD5E1' }}>{stage.intro}</p>
          <div className="grid gap-2.5">
            {stage.terms.map((g, i) => (
              <GlossaryRevealCard key={g.term} index={i} term={g.term} definition={g.definition} />
            ))}
          </div>
        </StageShell>
      )}

      {stage.type === 'recall' && (
        <StageShell stage={stageNumber} stageCount={total} title={stage.title} onPrev={hasPrev ? prev : undefined} onNext={hasNext ? next : undefined}>
          <p className="text-sm" style={{ color: '#CBD5E1' }}>{stage.intro}</p>
          <div className="space-y-3">
            {stage.prompts.map(p => {
              const revealed = state.recallRevealed[stage.id]?.[p.id];
              return (
                <div key={p.id} className="card-subtle p-3.5 space-y-2" style={{ background: CARD_BG }} data-testid={`recall-${p.id}`}>
                  <p className="text-sm font-bold" style={{ color: '#F8FAFC' }}>{p.question}</p>
                  {!revealed ? (
                    <button
                      onClick={() => revealRecall(stage.id, p.id)}
                      data-testid={`recall-${p.id}-reveal`}
                      className="chip"
                    >
                      اعرض الإجابة
                    </button>
                  ) : (
                    <p className="text-sm leading-relaxed" style={{ color: '#A7F3D0' }} data-testid={`recall-${p.id}-answer`}>{p.modelAnswer}</p>
                  )}
                </div>
              );
            })}
          </div>
        </StageShell>
      )}

      {stage.type === 'completion' && (
        <div className="space-y-4" data-testid="lesson01-stage" data-stage={stageNumber}>
          <p className="text-[11px] text-slate-500">المرحلة {stageNumber} من {total}</p>
          <h2 className="text-base font-extrabold" style={{ color: '#F8FAFC' }}>{stage.title}</h2>

          <div className="pull-quote" style={{ background: CARD_BG }}>
            <p className="text-[15px] leading-loose" style={{ color: '#F8FAFC' }}>{stage.summary}</p>
          </div>

          {!isDone && (
            <div className="card-subtle p-4 space-y-2.5" style={{ background: CARD_BG }} data-testid="lesson01-readiness-checklist">
              <p className="text-xs font-bold" style={{ color: ACCENT }}>قبل إكمال الدرس، تأكد من هذه النقاط:</p>
              {requirements.map(r => (
                <div key={r.id} className="flex items-start gap-2" data-testid={`requirement-${r.id}`} data-met={r.met}>
                  {r.met
                    ? <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5 text-green-400"/>
                    : <Circle size={16} className="flex-shrink-0 mt-0.5 text-slate-500"/>}
                  <span className="text-sm flex-1" style={{ color: r.met ? '#A7F3D0' : '#94a3b8' }}>{r.label}</span>
                  {!r.met && (
                    <button
                      onClick={() => goto(r.jumpStageId)}
                      data-testid={`requirement-${r.id}-jump`}
                      className="text-xs flex-shrink-0 underline"
                      style={{ color: ACCENT }}
                    >
                      انتقل الآن
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!isDone ? (
            <button
              className="btn-primary w-full text-base py-4 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!ready}
              data-testid="lesson01-complete-btn"
              onClick={() => { if (ready) completeLesson(lesson.id); }}
            >
              <CheckCircle2 size={20}/> فهمت وأكملت الدرس
            </button>
          ) : (
            <div className="success-card flex items-center gap-2 justify-center">
              <CheckCircle2 size={18} className="text-green-400"/><span className="text-green-400 font-bold">تم إكمال هذا الدرس</span>
            </div>
          )}

          {isDone && nextLesson && (
            <div className="card-feature p-4 space-y-3" data-testid="lesson01-next-lesson-bridge">
              <p className="text-sm leading-relaxed" style={{ color: '#CBD5E1' }}>{stage.nextLessonBridge(nextLesson)}</p>
              <button
                onClick={() => navigate(`/lessons/${nextLesson.id}`)}
                data-testid="lesson01-open-next"
                className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-3 transition-all press"
                style={{ background: 'rgba(94,234,212,0.1)', border: `1px solid rgba(94,234,212,0.3)`, color: ACCENT }}
              >
                افتح الدرس التالي: {nextLesson.title} <ChevronLeft size={15}/>
              </button>
            </div>
          )}

          <button onClick={prev} data-testid="lesson01-prev" className="w-full flex items-center justify-center gap-1.5 rounded-xl px-3 py-3 bg-white/3 border border-white/8 hover:bg-white/6 transition-all press text-sm text-slate-300">
            <ChevronRight size={15}/> السابق
          </button>
          <button className="w-full text-slate-400 text-sm py-2 hover:text-white transition-colors" onClick={() => navigate('/lessons')}>
            <ArrowRight size={14} className="inline ml-1"/>العودة إلى الدروس
          </button>
        </div>
      )}
    </div>
  );
};
