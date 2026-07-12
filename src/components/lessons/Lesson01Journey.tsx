import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Lesson } from '../../types';
import { QuadXLayout } from '../diagrams/QuadXLayout';
import { useProgressContext } from '../../contexts/ProgressContext';
import { CHECKPOINTS, GLOSSARY, RECALL_PROMPTS, type Checkpoint } from '../../data/lessons/lesson01JourneyContent';
import {
  createInitialJourneyState, goToStage, recordMotorExplored, recordCheckpointAnswer,
  recordRecallRevealed, isXLayoutComplete,
  getReadinessRequirements, isReadyToComplete, STAGE, STAGE_COUNT,
  type Lesson01JourneyState,
} from '../../data/lessons/lesson01JourneyState';
import { CheckCircle2, ArrowRight, ChevronLeft, ChevronRight, Circle, Star, Clock } from 'lucide-react';

interface Props {
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

const ACCENT = '#5EEAD4';
const CARD_BG = '#173F4D';

// ── Checkpoint block (reused by all four required concept checks) ───────────

const CheckpointCard: React.FC<{
  checkpoint: Checkpoint;
  answeredOptionId: string | null;
  onAnswer: (optionId: string) => void;
}> = ({ checkpoint, answeredOptionId, onAnswer }) => (
  <div className="card-subtle p-4 space-y-3" style={{ background: CARD_BG }} data-testid={`checkpoint-${checkpoint.id}`}>
    <p className="text-sm font-bold" style={{ color: '#F8FAFC' }}>{checkpoint.question}</p>
    <div className="space-y-2">
      {checkpoint.options.map(opt => {
        const isSelected = answeredOptionId === opt.id;
        return (
          <button
            key={opt.id}
            data-testid={`checkpoint-${checkpoint.id}-option-${opt.id}`}
            onClick={() => onAnswer(opt.id)}
            className="w-full text-right rounded-xl px-3 py-2.5 text-sm transition-all press"
            style={{
              background: isSelected ? (opt.correct ? 'rgba(74,222,128,0.14)' : 'rgba(248,113,113,0.12)') : 'rgba(255,255,255,0.04)',
              border: `1px solid ${isSelected ? (opt.correct ? 'rgba(74,222,128,0.4)' : 'rgba(248,113,113,0.35)') : 'rgba(255,255,255,0.08)'}`,
              color: '#E2E8F0',
            }}
          >
            {opt.text}
          </button>
        );
      })}
    </div>
    {answeredOptionId && (() => {
      const opt = checkpoint.options.find(o => o.id === answeredOptionId)!;
      return (
        <div
          data-testid={`checkpoint-${checkpoint.id}-feedback`}
          className="rounded-xl px-3 py-2.5 text-sm leading-relaxed"
          style={{
            background: opt.correct ? 'rgba(74,222,128,0.1)' : 'rgba(251,191,36,0.1)',
            border: `1px solid ${opt.correct ? 'rgba(74,222,128,0.3)' : 'rgba(251,191,36,0.3)'}`,
            color: opt.correct ? '#BBF7D0' : '#FDE68A',
          }}
        >
          {opt.feedback}
          {!opt.correct && (
            <p className="mt-1.5 text-xs" style={{ color: '#94a3b8' }}>لا بأس، جرّب اختيارًا آخر — يمكنك تغيير إجابتك في أي وقت.</p>
          )}
        </div>
      );
    })()}
  </div>
);

// ── Glossary retrieval card: term shown, definition hidden until requested ──

const GlossaryRevealCard: React.FC<{ index: number; term: string; definition: string }> = ({ index, term, definition }) => {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="card-subtle p-3.5" style={{ background: CARD_BG }} data-testid={`glossary-item-${index}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold" style={{ color: ACCENT }}>{term}</p>
        <button
          onClick={() => setRevealed(r => !r)}
          data-testid={`glossary-item-${index}-toggle`}
          className="text-xs flex-shrink-0 underline press"
          style={{ color: ACCENT }}
        >
          {revealed ? 'إخفاء التعريف' : 'اعرض التعريف'}
        </button>
      </div>
      {revealed && (
        <p className="text-sm leading-relaxed mt-2" style={{ color: '#CBD5E1' }} data-testid={`glossary-item-${index}-definition`}>
          {definition}
        </p>
      )}
    </div>
  );
};

// ── Stage chrome shared by every stage ───────────────────────────────────────

const StageShell: React.FC<{
  stage: number;
  title: string;
  children: React.ReactNode;
  onPrev?: () => void;
  onNext?: () => void;
}> = ({ stage, title, children, onPrev, onNext }) => (
  <div className="space-y-4" data-testid="lesson01-stage" data-stage={stage}>
    <div className="flex items-center justify-between">
      <p className="text-[11px] text-slate-500">المرحلة {stage} من {STAGE_COUNT}</p>
      <div className="h-1 rounded-full flex-1 mx-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${(stage / STAGE_COUNT) * 100}%`, background: `linear-gradient(to right, ${ACCENT}, #A7F3D0)` }} />
      </div>
    </div>
    <h2 className="text-base font-extrabold" style={{ color: '#F8FAFC' }}>{title}</h2>
    <div className="space-y-3">{children}</div>
    <div className="flex gap-2 pt-1">
      {onPrev ? (
        <button onClick={onPrev} data-testid="lesson01-prev" className="flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-3 bg-white/3 border border-white/8 hover:bg-white/6 transition-all press text-sm text-slate-300">
          <ChevronRight size={15}/> السابق
        </button>
      ) : <div className="flex-1"/>}
      {onNext && (
        <button
          onClick={onNext}
          data-testid="lesson01-next"
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-3 transition-all press"
          style={{ background: 'rgba(94,234,212,0.1)', border: `1px solid rgba(94,234,212,0.3)`, color: ACCENT }}
        >
          التالي <ChevronLeft size={15}/>
        </button>
      )}
    </div>
  </div>
);

/** Where the readiness checklist sends the learner back to for each unmet requirement. */
const REQUIREMENT_STAGE: Record<string, number> = {
  xLayout: STAGE.X_LAYOUT,
  'checkpoint-definition': STAGE.DEFINITION_CHECKPOINT,
  'checkpoint-classification': STAGE.CLASSIFICATION_CHECKPOINT,
  'checkpoint-movementPrediction': STAGE.MOVEMENT_CHECKPOINT,
  'checkpoint-fpvDistinction': STAGE.MISCONCEPTION_CHECKPOINT,
  finalRecall: STAGE.FINAL_RECALL,
};

// ── Main journey ──────────────────────────────────────────────────────────────

export const Lesson01Journey: React.FC<Props> = ({ lesson, nextLesson }) => {
  const navigate = useNavigate();
  const { completedLessons, completeLesson } = useProgressContext();
  const isDone = completedLessons.includes(lesson.id);
  const [state, setState] = useState<Lesson01JourneyState>(createInitialJourneyState);

  const goto = (stage: number) => setState(s => goToStage(s, stage));
  const next = () => goto(Math.min(state.currentStage + 1, STAGE_COUNT));
  const prev = () => goto(Math.max(state.currentStage - 1, 1));

  const answerCheckpoint = (checkpointId: Checkpoint['id'], optionId: string) =>
    setState(s => recordCheckpointAnswer(s, checkpointId, optionId));

  const exploreMotor = (_motorId: string, cw: boolean) =>
    setState(s => recordMotorExplored(s, cw));

  const revealRecall = (promptId: string) =>
    setState(s => recordRecallRevealed(s, promptId));

  const requirements = getReadinessRequirements(state);
  const ready = isReadyToComplete(state);

  const stage = state.currentStage;

  return (
    <div>
      <div className="mb-4">
        <LessonMetaBadges lesson={lesson}/>
      </div>
      {stage === STAGE.ORIENTATION && (
        <StageShell stage={stage} title="أهلًا بك في رحلة التعلّم الأولى" onNext={next}>
          <div className="pull-quote" style={{ background: CARD_BG }}>
            <p className="text-[15px] leading-loose" style={{ color: '#F8FAFC' }}>
              هذا الدرس ليس نصًا طويلاً تقرأه دفعة واحدة، بل رحلة تعلّم مقسّمة إلى مراحل قصيرة. ستشرح كل مرحلة فكرة واحدة،
              وستتوقف أحيانًا عند أسئلة قصيرة للتأكد من فهمك — لا تقلق إن أخطأت، فكل سؤال يأتي مع شرح واضح ويمكنك المحاولة
              مجددًا دون أي عقاب. في المنتصف ستستكشف تخطيط المحركات بنفسك، وفي النهاية ستراجع كل ما تعلمته قبل الانتقال
              إلى الدرس التالي.
            </p>
          </div>
        </StageShell>
      )}

      {stage === STAGE.DEFINITION && (
        <StageShell stage={stage} title="ما هو الكوادكابتر؟" onPrev={prev} onNext={next}>
          <div className="pull-quote" style={{ background: CARD_BG }}>
            <p className="text-[15px] leading-loose" style={{ color: '#F8FAFC' }}>{lesson.explanation}</p>
          </div>
        </StageShell>
      )}

      {stage === STAGE.DEFINITION_CHECKPOINT && (
        <StageShell
          stage={stage} title="تأكد من فهمك: التعريف" onPrev={prev} onNext={next}
        >
          <CheckpointCard
            checkpoint={CHECKPOINTS[0]}
            answeredOptionId={state.checkpointAnswers.definition}
            onAnswer={id => answerCheckpoint('definition', id)}
          />
        </StageShell>
      )}

      {stage === STAGE.CLASSIFICATION && (
        <StageShell stage={stage} title="درون، Multirotor، كوادكابتر: ما الفرق؟" onPrev={prev} onNext={next}>
          <div className="pull-quote" style={{ background: CARD_BG }}>
            <p className="text-[15px] leading-loose" style={{ color: '#F8FAFC' }}>
              "الدرون" مصطلح عام جدًا: أي طائرة تُدار عن بعد أو ذاتيًا، سواء كانت ثابتة الجناحين أو متعددة المراوح.
              "Multirotor" أضيق قليلاً: طائرة تعتمد على أكثر من مروحة واحدة — أربعة أو ستة أو ثمانية. "الكوادكابتر"
              أضيق من ذلك: multirotor بأربعة مراوح تحديدًا، لا أكثر ولا أقل. بعبارة أخرى: كل كوادكابتر هو drone وmultirotor،
              لكن ليس كل drone كوادكابتر، وليس كل multirotor كوادكابتر.
            </p>
          </div>
        </StageShell>
      )}

      {stage === STAGE.CLASSIFICATION_CHECKPOINT && (
        <StageShell
          stage={stage} title="تأكد من فهمك: التصنيف" onPrev={prev} onNext={next}
        >
          <CheckpointCard
            checkpoint={CHECKPOINTS[1]}
            answeredOptionId={state.checkpointAnswers.classification}
            onAnswer={id => answerCheckpoint('classification', id)}
          />
        </StageShell>
      )}

      {stage === STAGE.MOTOR_PURPOSE && (
        <StageShell stage={stage} title="لماذا أربعة محركات، ولماذا تدور بعكس بعضها؟" onPrev={prev} onNext={next}>
          <div className="pull-quote" style={{ background: CARD_BG }}>
            <p className="text-[15px] leading-loose" style={{ color: '#F8FAFC' }}>
              الكوادكابتر يحتاج أربعة محركات ليتحكم بشكل كامل في حركته: الارتفاع، والميلان للأمام والخلف، والميلان لليمين
              واليسار، والدوران حول نفسه. لكن هناك تفصيلاً مهمًا: كل محرك يدور بعكس اتجاه المحرك المجاور له. لو دارت
              كل المحركات بنفس الاتجاه، لبدأ جسم الطائرة كله بالدوران في الاتجاه المعاكس بسبب قانون رد الفعل — تمامًا
              كما تحتاج طائرة الهليكوبتر التقليدية مروحة ذيل لمنع هذا الدوران غير المرغوب. الدوران المتعاكس بين
              المحركات المتجاورة يُلغي هذا التأثير تلقائيًا.
            </p>
          </div>
        </StageShell>
      )}

      {stage === STAGE.X_LAYOUT && (
        <StageShell
          stage={stage} title="استكشف بنفسك: اتجاه دوران كل محرك" onPrev={prev} onNext={next}
        >
          <p className="text-sm" style={{ color: '#CBD5E1' }}>
            اضغط على محرك واحد على الأقل يدور مع عقارب الساعة (CW) ومحرك واحد على الأقل يدور عكسها (CCW) لمتابعة الدرس.
          </p>
          <QuadXLayout onMotorExplore={exploreMotor} />
          {!isXLayoutComplete(state) && (
            <p className="text-xs" style={{ color: '#94a3b8' }}>
              {!state.motorsExplored.cw && !state.motorsExplored.ccw && 'لم تستكشف أي محرك بعد.'}
              {state.motorsExplored.cw && !state.motorsExplored.ccw && 'استكشفت محركًا يدور مع عقارب الساعة — جرّب الآن محركًا يدور عكسها.'}
              {!state.motorsExplored.cw && state.motorsExplored.ccw && 'استكشفت محركًا يدور عكس عقارب الساعة — جرّب الآن محركًا يدور معها.'}
            </p>
          )}
        </StageShell>
      )}

      {stage === STAGE.MOVEMENT_EXPLANATION && (
        <StageShell stage={stage} title="كيف تتحرك الطائرة أصلاً؟" onPrev={prev} onNext={next}>
          <div className="pull-quote" style={{ background: CARD_BG }}>
            <p className="text-[15px] leading-loose" style={{ color: '#F8FAFC' }}>
              المبدأ بسيط: عندما تتساوى قوة دفع كل المحركات، تبقى الطائرة معلّقة في مكانها. أما عندما يختلف الدفع بين
              مجموعتين من المحركات — مثلاً بين الأمام والخلف، أو بين اليمين واليسار — تميل الطائرة نحو الجهة الأقل دفعًا
              وتتحرك في ذلك الاتجاه. هذا الميلان يُسمى Pitch عند الأمام والخلف، وRoll عند اليمين واليسار.
            </p>
          </div>
        </StageShell>
      )}

      {stage === STAGE.REAR_MOTOR_SCENARIO && (
        <StageShell stage={stage} title="مثال عملي: ماذا لو زاد دفع المحركين الخلفيين؟" onPrev={prev} onNext={next}>
          <div className="pull-quote" style={{ background: CARD_BG }}>
            <p className="text-[15px] leading-loose" style={{ color: '#F8FAFC' }}>
              تخيّل أن المحركين الخلفيين (M2 وM4) زادا دفعهما بينما بقي المحركان الأماميان (M1 وM3) كما هما. الجزء
              الخلفي من الطائرة يرتفع نسبيًا، فيصبح الجزء الأمامي أخفض بالمقارنة، فتنحني الطائرة للأمام وتبدأ بالتقدم في
              ذلك الاتجاه. هذا بالضبط ما يحدث عندما تدفع عصا جهاز التحكم للأمام.
            </p>
          </div>
        </StageShell>
      )}

      {stage === STAGE.MOVEMENT_CHECKPOINT && (
        <StageShell
          stage={stage} title="تأكد من فهمك: توقّع الحركة" onPrev={prev} onNext={next}
        >
          <CheckpointCard
            checkpoint={CHECKPOINTS[2]}
            answeredOptionId={state.checkpointAnswers.movementPrediction}
            onAnswer={id => answerCheckpoint('movementPrediction', id)}
          />
        </StageShell>
      )}

      {stage === STAGE.FPV_COMPARISON && (
        <StageShell stage={stage} title="كوادكابتر FPV مقابل كوادكابتر التصوير الجوي" onPrev={prev} onNext={next}>
          <div className="grid gap-2.5">
            <div className="card-subtle p-3.5" style={{ background: CARD_BG }}>
              <p className="text-xs font-bold mb-1" style={{ color: ACCENT }}>كوادكابتر FPV</p>
              <p className="text-sm leading-relaxed" style={{ color: '#CBD5E1' }}>
                الطيار يرى الصورة مباشرة من منظور الطائرة عبر نظارات، ويتحكم يدويًا وبشكل مباشر في كل حركة — مصمم للأداء
                السريع والحركة الحرة (Freestyle) أو السباق.
              </p>
            </div>
            <div className="card-subtle p-3.5" style={{ background: CARD_BG }}>
              <p className="text-xs font-bold mb-1" style={{ color: ACCENT }}>كوادكابتر التصوير الجوي</p>
              <p className="text-sm leading-relaxed" style={{ color: '#CBD5E1' }}>
                يعتمد غالبًا على استقرار تلقائي ومساعدة GPS، ويُدار عبر تطبيق أو جهاز تحكم بسيط — مصمم لالتقاط صور وفيديو
                مستقر وليس للتحكم اليدوي السريع.
              </p>
            </div>
          </div>
          <p className="text-sm" style={{ color: '#CBD5E1' }}>
            كلاهما قد يكون كوادكابتر فعليًا (أربعة محركات وأربع مراوح) — الفرق الحقيقي بينهما في الهدف وطريقة التحكم، وليس
            في شكل الطائرة.
          </p>
        </StageShell>
      )}

      {stage === STAGE.MISCONCEPTION_CHECKPOINT && (
        <StageShell
          stage={stage} title="تصحيح مفهوم شائع: FPV والكوادكابتر" onPrev={prev} onNext={next}
        >
          <CheckpointCard
            checkpoint={CHECKPOINTS[3]}
            answeredOptionId={state.checkpointAnswers.fpvDistinction}
            onAnswer={id => answerCheckpoint('fpvDistinction', id)}
          />
        </StageShell>
      )}

      {stage === STAGE.GLOSSARY && (
        <StageShell stage={stage} title="قاموس مصغّر: اختبر نفسك في كل مصطلح" onPrev={prev} onNext={next}>
          <p className="text-sm" style={{ color: '#CBD5E1' }}>
            حاول تذكّر معنى كل مصطلح بنفسك أولاً، ثم اضغط "اعرض التعريف" للتأكد.
          </p>
          <div className="grid gap-2.5">
            {GLOSSARY.map((g, i) => (
              <GlossaryRevealCard key={g.term} index={i} term={g.term} definition={g.definition} />
            ))}
          </div>
        </StageShell>
      )}

      {stage === STAGE.FINAL_RECALL && (
        <StageShell
          stage={stage} title="اختبر استرجاعك قبل أن ننهي الدرس" onPrev={prev} onNext={next}
        >
          <p className="text-sm" style={{ color: '#CBD5E1' }}>
            حاول الإجابة بكلماتك الخاصة أولاً في ذهنك، ثم اضغط "اعرض الإجابة" لمقارنة إجابتك — هذه ليست اختبارًا مُقيّمًا،
            بل تدريب على الاسترجاع.
          </p>
          <div className="space-y-3">
            {RECALL_PROMPTS.map(p => (
              <div key={p.id} className="card-subtle p-3.5 space-y-2" style={{ background: CARD_BG }} data-testid={`recall-${p.id}`}>
                <p className="text-sm font-bold" style={{ color: '#F8FAFC' }}>{p.question}</p>
                {!state.recallRevealed[p.id] ? (
                  <button
                    onClick={() => revealRecall(p.id)}
                    data-testid={`recall-${p.id}-reveal`}
                    className="chip"
                  >
                    اعرض الإجابة
                  </button>
                ) : (
                  <p className="text-sm leading-relaxed" style={{ color: '#A7F3D0' }} data-testid={`recall-${p.id}-answer`}>{p.modelAnswer}</p>
                )}
              </div>
            ))}
          </div>
        </StageShell>
      )}

      {stage === STAGE.READINESS_GATE && (
        <div className="space-y-4" data-testid="lesson01-stage" data-stage={stage}>
          <p className="text-[11px] text-slate-500">المرحلة {stage} من {STAGE_COUNT}</p>
          <h2 className="text-base font-extrabold" style={{ color: '#F8FAFC' }}>ملخص الدرس والانتقال إلى الدرس التالي</h2>

          <div className="pull-quote" style={{ background: CARD_BG }}>
            <p className="text-[15px] leading-loose" style={{ color: '#F8FAFC' }}>
              أصبحتَ الآن تعرف ما الكوادكابتر، وكيف يختلف عن مفهومَي الدرون والـ Multirotor الأوسع، ولماذا يحتاج أربعة
              محركات متعاكسة الدوران، وكيف يتحرك عندما يتغيّر الدفع النسبي بين محركاته، وكيف يختلف كوادكابتر FPV عن
              كوادكابتر التصوير الجوي.
            </p>
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
                      onClick={() => goto(REQUIREMENT_STAGE[r.id])}
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
              <p className="text-sm leading-relaxed" style={{ color: '#CBD5E1' }}>
                عرفتَ الآن ما الكوادكابتر وكيف تتحرك بنيته الأساسية. بقي سؤال مهم لم نُجب عليه بعد: كيف تتحول حركة عصا
                جهاز التحكم إلى أمر فعلي يدور به المحرك؟ في الدرس التالي، "{nextLesson.title}"، ستتتبع {nextLesson.description}.
              </p>
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
