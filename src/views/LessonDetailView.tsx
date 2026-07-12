import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { SafetyWarning } from '../components/SafetyWarning';
import { EducationalDiagram } from '../components/EducationalDiagram';
import { InteractiveLessonJourney } from '../components/lessons/InteractiveLessonJourney';
import { getLessonJourneyDefinition } from '../data/lessons/journeyRegistry';
import { lessonsData } from '../data/lessonsData';
import { useProgressContext } from '../contexts/ProgressContext';
import { CheckCircle2, ArrowRight, AlertCircle, Star, BookOpen, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

export const LessonDetailView: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { completedLessons, completeLesson, setLastOpenedLesson } = useProgressContext();
  const [showNotUnderstood, setShowNotUnderstood] = useState(false);

  const lesson = lessonsData.find(l => l.id === lessonId);
  const effectiveLessonId = lesson?.id;

  // Read the latest setLastOpenedLesson via a ref rather than the effect's
  // own dependency array: that function is recreated on every render of
  // useProgress() (it is not memoized there, and this fix must not touch
  // ProgressContext/useProgress), so depending on it directly would re-fire
  // this effect — and re-write the same value — on any unrelated progress
  // state change elsewhere in the app while a lesson page stays mounted.
  const setLastOpenedLessonRef = React.useRef(setLastOpenedLesson);
  React.useEffect(() => {
    setLastOpenedLessonRef.current = setLastOpenedLesson;
  });

  React.useEffect(() => {
    if (effectiveLessonId) setLastOpenedLessonRef.current(effectiveLessonId);
  }, [effectiveLessonId]);

  if (!lesson) return <div className="p-8 text-center text-slate-400">الدرس غير موجود</div>;

  const isDone = completedLessons.includes(lesson.id);
  const lessonIndex = lessonsData.findIndex(l => l.id === lesson.id);
  const prevLesson = lessonIndex > 0 ? lessonsData[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < lessonsData.length - 1 ? lessonsData[lessonIndex + 1] : null;

  const journeyDefinition = getLessonJourneyDefinition(lesson.id);
  if (journeyDefinition) {
    return (
      <AppShell>
        <div className="fade-in" style={{ background: 'linear-gradient(180deg, #0E2A36 0%, #123A46 100%)', minHeight: '100%' }}>
          <div className="px-4 pt-4 pb-3 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(94,234,212,0.1)' }}>
            <button onClick={() => navigate('/lessons')} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center press">
              <ArrowRight size={18} className="text-slate-400"/>
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-500">درس {lesson.number} من {lessonsData.length}</p>
              <h1 className="text-lg font-extrabold truncate" style={{ color: '#F8FAFC' }}>{lesson.title}</h1>
            </div>
            {isDone && <span className="badge-green flex-shrink-0">مكتمل</span>}
          </div>
          <div className="px-4 py-4">
            <InteractiveLessonJourney definition={journeyDefinition} lesson={lesson} nextLesson={nextLesson} />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="fade-in" style={{ background: 'linear-gradient(180deg, #0E2A36 0%, #123A46 100%)', minHeight: '100%' }}>
        <div className="px-4 pt-4 pb-3 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(94,234,212,0.1)' }}>
          <button onClick={() => navigate('/lessons')} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center press">
            <ArrowRight size={18} className="text-slate-400"/>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-slate-500">درس {lesson.number} من {lessonsData.length}</p>
            <h1 className="text-lg font-extrabold truncate" style={{ color: '#F8FAFC' }}>{lesson.title}</h1>
          </div>
          {isDone && <span className="badge-green flex-shrink-0">مكتمل</span>}
        </div>

        <div className="px-4 py-4 space-y-5">
          {/* large prominent badges */}
          <div className="flex items-center gap-2.5">
            <span className="pill-stat text-sm"><Star size={14} style={{ color: '#5EEAD4' }}/> {lesson.level}</span>
            <span className="pill-stat text-sm"><Clock size={14} style={{ color: '#5EEAD4' }}/> {lesson.duration}</span>
          </div>

          {/* Hero image when available, else diagram — both edge-to-edge */}
          {lesson.image ? (
            <div style={{
              borderRadius: '16px',
              overflow: 'hidden',
              border: '1px solid rgba(94,234,212,0.12)',
              background: 'rgba(14,42,54,0.7)',
            }}>
              <img
                src={lesson.image}
                alt={lesson.imagePlaceholder}
                loading="lazy"
                style={{ display: 'block', width: '100%', height: 'auto' }}
              />
            </div>
          ) : (
            <EducationalDiagram type={lesson.diagramType}/>
          )}

          {/* objective */}
          <div className="card-subtle p-4 border-r-2" style={{ background: '#173F4D', borderColor: 'rgba(94,234,212,0.45)' }}>
            <p className="text-xs font-bold mb-1" style={{ color: '#5EEAD4' }}>🎯 الهدف من الدرس</p>
            <p className="text-sm leading-relaxed" style={{ color: '#CBD5E1' }}>{lesson.objective}</p>
          </div>

          {/* explanation as pull-quote */}
          <div className="pull-quote" style={{ background: '#173F4D' }}>
            <h2 className="text-xs font-bold mb-2" style={{ color: '#5EEAD4' }}>الشرح</h2>
            <p className="text-[15px] leading-loose" style={{ color: '#F8FAFC' }}>{lesson.explanation}</p>
          </div>

          {/* important points: numbered colored circles */}
          <div className="space-y-2.5">
            <h2 className="text-sm font-bold accent-head flex items-center gap-2" style={{ color: '#F8FAFC' }}>
              <Star size={15} style={{ color: '#5EEAD4' }}/>نقاط مهمة
            </h2>
            <div className="grid gap-2.5">
              {lesson.importantPoints.map((point, i) => (
                <div key={i} className="card-subtle p-3.5 flex items-start gap-3" style={{ background: '#173F4D' }}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, rgba(94,234,212,0.22), rgba(167,243,208,0.1))', border: '1px solid rgba(94,234,212,0.35)' }}
                  >
                    <span className="text-sm font-extrabold" style={{ color: '#A7F3D0' }}>{i+1}</span>
                  </div>
                  <p className="text-sm leading-relaxed pt-1" style={{ color: '#CBD5E1' }}>{point}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="warning-card">
            <p className="text-xs text-amber-300 font-bold mb-1 flex items-center gap-1"><AlertCircle size={13}/>الخطأ الشائع</p>
            <p className="text-sm text-amber-100/90">{lesson.commonMistake}</p>
          </div>

          {lesson.warning && <SafetyWarning message={lesson.warning} type="danger"/>}

          {showNotUnderstood && (
            <div className="card-feature p-4 space-y-2">
              <p className="text-sm font-bold text-blue-300">لا بأس! هذه اقتراحاتنا:</p>
              <ul className="space-y-1">
                <li className="text-sm text-slate-300">• راجع الدرس السابق مرة أخرى</li>
                <li className="text-sm text-slate-300">• افتح Checklist المتعلق بهذه المرحلة</li>
              </ul>
            </div>
          )}

          <div className="space-y-3 pb-4">
            {!isDone ? (
              <button className="btn-primary w-full text-base py-4" onClick={() => { completeLesson(lesson.id); }}>
                <CheckCircle2 size={20}/> فهمت وأكملت الدرس
              </button>
            ) : (
              <div className="success-card flex items-center gap-2 justify-center">
                <CheckCircle2 size={18} className="text-green-400"/><span className="text-green-400 font-bold">تم إكمال هذا الدرس</span>
              </div>
            )}
            {(prevLesson || nextLesson) && (
              <div className="flex gap-2">
                {prevLesson ? (
                  <button
                    onClick={() => navigate(`/lessons/${prevLesson.id}`)}
                    className="flex-1 flex items-center gap-2 rounded-xl px-3 py-3 bg-white/3 border border-white/8 hover:bg-white/6 transition-all press"
                  >
                    <ChevronRight size={15} className="text-slate-400 flex-shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-500 leading-none mb-0.5">السابق</p>
                      <p className="text-xs text-slate-300 truncate leading-tight">{prevLesson.title}</p>
                    </div>
                  </button>
                ) : <div className="flex-1"/>}
                {nextLesson ? (
                  <button
                    onClick={() => navigate(`/lessons/${nextLesson.id}`)}
                    className="flex-1 flex items-center gap-2 rounded-xl px-3 py-3 transition-all press"
                    style={{ background: 'rgba(94,234,212,0.08)', border: '1px solid rgba(94,234,212,0.25)' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] leading-none mb-0.5" style={{ color: 'rgba(94,234,212,0.65)' }}>التالي</p>
                      <p className="text-xs font-semibold truncate leading-tight" style={{ color: '#A7F3D0' }}>{nextLesson.title}</p>
                    </div>
                    <ChevronLeft size={15} style={{ color: '#5EEAD4' }} className="flex-shrink-0"/>
                  </button>
                ) : <div className="flex-1"/>}
              </div>
            )}
            <button className="btn-secondary w-full" onClick={() => setShowNotUnderstood(!showNotUnderstood)}>
              <BookOpen size={16}/> لم أفهم جيدًا
            </button>
            <button className="w-full text-slate-400 text-sm py-2 hover:text-white transition-colors" onClick={() => navigate('/lessons')}>العودة إلى الدروس</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
};
