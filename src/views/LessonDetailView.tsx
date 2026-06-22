import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { SafetyWarning } from '../components/SafetyWarning';
import { EducationalDiagram } from '../components/EducationalDiagram';
import { lessonsData } from '../data/lessonsData';
import { useProgress } from '../hooks/useProgress';
import { CheckCircle2, ArrowRight, AlertCircle, Star, BookOpen } from 'lucide-react';

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
    <AppShell>
      <div className="fade-in">
        <div className="px-4 pt-4 pb-2 flex items-center gap-3 border-b border-cyan-400/10">
          <button onClick={() => navigate('/lessons')} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
            <ArrowRight size={18} className="text-slate-400"/>
          </button>
          <div className="flex-1">
            <p className="text-xs text-slate-500">درس {lesson.number} من {lessonsData.length}</p>
            <h1 className="text-base font-bold text-white truncate">{lesson.title}</h1>
          </div>
          {isDone && <span className="text-xs bg-green-400/10 text-green-400 px-2 py-1 rounded-full border border-green-400/20 flex-shrink-0">مكتمل</span>}
        </div>

        <div className="px-4 py-4 space-y-4">
          <div className="flex items-center gap-2">
            <span className="badge-cyan">{lesson.level}</span>
            <span className="badge-cyan">⏱ {lesson.duration}</span>
          </div>

          <div className="glass-card-sm p-3 border-r-2 border-cyan-400/50">
            <p className="text-xs text-cyan-400 font-semibold mb-1">🎯 الهدف من الدرس</p>
            <p className="text-sm text-slate-200">{lesson.objective}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-xs font-semibold text-slate-400">الرسم التعليمي</span>
              <span className="text-[10px] badge-cyan">تفاعلي</span>
            </div>
            <EducationalDiagram type={lesson.diagramType}/>
          </div>

          <div className="glass-card p-4">
            <h2 className="text-sm font-semibold text-cyan-400 mb-2">الشرح</h2>
            <p className="text-sm text-slate-200 leading-relaxed">{lesson.explanation}</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 px-1"><Star size={14} className="text-cyan-400"/>نقاط مهمة</h2>
            <div className="grid gap-2">
              {lesson.importantPoints.map((point, i) => (
                <div key={i} className="card-elevated p-3 flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-cyan-400/12 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-cyan-400 text-xs font-bold">{i+1}</span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">{point}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card-sm p-3">
            <p className="text-xs text-amber-400 font-semibold mb-1 flex items-center gap-1"><AlertCircle size={12}/>الخطأ الشائع</p>
            <p className="text-sm text-slate-300">{lesson.commonMistake}</p>
          </div>

          {lesson.warning && <SafetyWarning message={lesson.warning} type="danger"/>}

          {showNotUnderstood && (
            <div className="glass-card p-4 space-y-2 border-blue-400/30">
              <p className="text-sm font-semibold text-blue-400">لا بأس! هذه اقتراحاتنا:</p>
              <ul className="space-y-1">
                <li className="text-sm text-slate-300">• راجع الدرس السابق مرة أخرى</li>
                <li className="text-sm text-slate-300">• افتح Checklist المتعلق بهذه المرحلة</li>
                <li><button className="text-sm text-cyan-400 underline" onClick={() => navigate('/bot')}>• اسأل مساعد FPV</button></li>
              </ul>
            </div>
          )}

          <div className="space-y-3 pb-4">
            {!isDone ? (
              <button className="btn-primary w-full" onClick={() => { completeLesson(lesson.id); }}>
                <CheckCircle2 size={18}/> فهمت وأكملت الدرس
              </button>
            ) : (
              <div className="success-card flex items-center gap-2 justify-center">
                <CheckCircle2 size={18} className="text-green-400"/><span className="text-green-400 font-semibold">تم إكمال هذا الدرس</span>
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
