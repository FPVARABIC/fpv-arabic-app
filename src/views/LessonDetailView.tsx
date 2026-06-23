import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { SafetyWarning } from '../components/SafetyWarning';
import { EducationalDiagram } from '../components/EducationalDiagram';
import { lessonsData } from '../data/lessonsData';
import { useProgress } from '../hooks/useProgress';
import { CheckCircle2, ArrowRight, AlertCircle, Star, BookOpen, Clock } from 'lucide-react';

export const LessonDetailView: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { completedLessons, completeLesson, setLastOpenedLesson } = useProgress();
  const [showNotUnderstood, setShowNotUnderstood] = useState(false);

  const lesson = lessonsData.find(l => l.id === lessonId);
  if (!lesson) return <div className="p-8 text-center text-slate-400">الدرس غير موجود</div>;

  const isDone = completedLessons.includes(lesson.id);

  React.useEffect(() => { setLastOpenedLesson(lesson.id); }, [lesson.id]);

  return (
    <AppShell tint="blue">
      <div className="fade-in">
        <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-cyan-400/10">
          <button onClick={() => navigate('/lessons')} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center press">
            <ArrowRight size={18} className="text-slate-400"/>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-slate-500">درس {lesson.number} من {lessonsData.length}</p>
            <h1 className="text-lg font-extrabold text-white truncate">{lesson.title}</h1>
          </div>
          {isDone && <span className="badge-green flex-shrink-0">مكتمل</span>}
        </div>

        <div className="px-4 py-4 space-y-5">
          {/* large prominent badges */}
          <div className="flex items-center gap-2.5">
            <span className="pill-stat text-sm"><Star size={14} className="text-cyan-300"/> {lesson.level}</span>
            <span className="pill-stat text-sm"><Clock size={14} className="text-cyan-300"/> {lesson.duration}</span>
          </div>

          {/* Diagram FIRST, edge-to-edge inside feature card */}
          <EducationalDiagram type={lesson.diagramType}/>

          {/* objective */}
          <div className="card-subtle p-4 border-r-2 border-cyan-400/50">
            <p className="text-xs text-cyan-300 font-bold mb-1">🎯 الهدف من الدرس</p>
            <p className="text-sm text-slate-200 leading-relaxed">{lesson.objective}</p>
          </div>

          {/* explanation as pull-quote */}
          <div className="pull-quote">
            <h2 className="text-xs font-bold text-cyan-300 mb-2">الشرح</h2>
            <p className="text-[15px] text-slate-100 leading-loose">{lesson.explanation}</p>
          </div>

          {/* important points: numbered colored circles */}
          <div className="space-y-2.5">
            <h2 className="text-sm font-bold text-white accent-head flex items-center gap-2"><Star size={15} className="text-cyan-300"/>نقاط مهمة</h2>
            <div className="grid gap-2.5">
              {lesson.importantPoints.map((point, i) => (
                <div key={i} className="card-subtle p-3.5 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, rgba(24,230,230,0.25), rgba(0,160,255,0.15))', border: '1px solid rgba(34,211,238,0.35)' }}>
                    <span className="text-cyan-200 text-sm font-extrabold">{i+1}</span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed pt-1">{point}</p>
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
                <li><button className="text-sm text-cyan-300 underline" onClick={() => navigate('/bot')}>• اسأل مساعد FPV</button></li>
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
