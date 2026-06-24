import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { lessonsData } from '../data/lessonsData';
import { useProgress } from '../hooks/useProgress';
import { CheckCircle2, Clock, ChevronLeft } from 'lucide-react';

export const LessonsView: React.FC = () => {
  const navigate = useNavigate();
  const { completedLessons } = useProgress();

  const stages = [
    { title: 'الأساسيات', subtitle: 'افهم الفكرة والقطع قبل الشراء', lessons: lessonsData.slice(0, 5) },
    { title: 'الكهرباء والسلامة', subtitle: 'تعلّم الطاقة والتوصيل الآمن قبل البطارية', lessons: lessonsData.slice(5, 10) },
    { title: 'التركيب', subtitle: 'ركّب القطع خطوة بخطوة', lessons: lessonsData.slice(10, 16) },
    { title: 'الاختبار والطيران', subtitle: 'افحص بأمان واستعد لأول طيران', lessons: lessonsData.slice(16, 18) },
  ];

  return (
    <AppShell>
      <Header title="الدروس" />
      <div className="px-4 py-4 space-y-3 fade-in">
        <p className="text-sm text-slate-400">{completedLessons.length} من {lessonsData.length} درسًا مكتملًا</p>
        <div className="h-1.5 rounded-full bg-white/5 mb-4">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 transition-all" style={{width: `${(completedLessons.length/lessonsData.length)*100}%`}}/>
        </div>
        {stages.map((stage, si) => (
          <div key={si} className={`space-y-2.5${si > 0 ? ' pt-3 border-t border-white/5' : ''}`}>
            <div className="flex items-start justify-between gap-2 pb-0.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-400/15 border border-cyan-400/30 text-cyan-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {si + 1}
                </span>
                <div>
                  <h2 className="text-sm font-extrabold text-white leading-tight">{stage.title}</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{stage.subtitle}</p>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 flex-shrink-0 mt-0.5">{stage.lessons.length} دروس</span>
            </div>
            {stage.lessons.map(lesson => {
              const done = completedLessons.includes(lesson.id);
              return (
                <div key={lesson.id} className={`glass-card p-4 transition-all ${done ? 'border-green-400/30' : 'hover:border-cyan-400/40'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold ${done ? 'bg-green-400/20 text-green-400' : 'bg-cyan-400/10 text-cyan-400'}`}>
                      {done ? <CheckCircle2 size={18}/> : lesson.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-white text-sm">{lesson.title}</h3>
                        {done && <span className="text-xs bg-green-400/10 text-green-400 px-2 py-0.5 rounded-full border border-green-400/20">مكتمل</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{lesson.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-slate-500 flex items-center gap-1"><Clock size={10}/>{lesson.duration}</span>
                        <span className="text-xs bg-cyan-400/10 text-cyan-400 px-2 py-0.5 rounded-full">{lesson.level}</span>
                      </div>
                    </div>
                    <button onClick={() => navigate(`/lessons/${lesson.id}`)} className="flex-shrink-0 w-8 h-8 rounded-lg bg-cyan-400/10 flex items-center justify-center text-cyan-400 hover:bg-cyan-400/20 transition-all">
                      <ChevronLeft size={16}/>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </AppShell>
  );
};
