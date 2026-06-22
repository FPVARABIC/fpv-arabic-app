import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Logo } from '../components/Logo';
import { ProgressRing } from '../components/ProgressRing';
import { useProgress } from '../hooks/useProgress';
import { lessonsData } from '../data/lessonsData';
import { roadmapData } from '../data/roadmapData';
import { ArrowLeft, BookOpen, Map, Cpu, CheckSquare, Wrench, Bot, Shield } from 'lucide-react';

const quickSections = [
  { icon: Map, label: 'خريطة البناء', path: '/roadmap', color: 'text-cyan-400' },
  { icon: BookOpen, label: 'الدروس', path: '/lessons', color: 'text-blue-400' },
  { icon: Cpu, label: 'Betaflight', path: '/betaflight', color: 'text-purple-400' },
  { icon: CheckSquare, label: 'Checklist', path: '/checklists', color: 'text-green-400' },
  { icon: Wrench, label: 'المشاكل والحلول', path: '/troubleshooting', color: 'text-orange-400' },
  { icon: Bot, label: 'مساعد FPV', path: '/bot', color: 'text-pink-400' },
];

export const HomeView: React.FC = () => {
  const navigate = useNavigate();
  const { lastOpened, overallProgress, completedLessons, completedRoadmapSteps, totalLessons, totalRoadmapSteps } = useProgress();
  const lastLesson = lastOpened.lessonId ? lessonsData.find(l => l.id === lastOpened.lessonId) : null;
  const lastStep = lastOpened.roadmapStepId ? roadmapData.find(s => s.id === lastOpened.roadmapStepId) : null;

  return (
    <AppShell>
      <div className="fade-in">
        <div className="px-4 pt-6 pb-3 border-b border-cyan-400/10 flex items-center justify-between">
          <Logo size="sm"/>
          <ProgressRing progress={overallProgress} size={48} strokeWidth={4}/>
        </div>

        <div className="px-4 py-5 space-y-5">
          <div className="hero-card p-5">
            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="flex-1">
                <h1 className="text-xl font-bold text-white leading-snug">مرحبًا بك في<br/><span className="text-gradient">FPV بالعربي</span></h1>
                <p className="text-sm text-slate-400 mt-2">مساعدك العربي لبناء أول كوادكابتر FPV خطوة بخطوة</p>
                <button className="chip mt-3" onClick={() => navigate('/roadmap')}>
                  ابدأ البناء <ArrowLeft size={14}/>
                </button>
              </div>
              <ProgressRing progress={overallProgress} size={72} strokeWidth={6}/>
            </div>
          </div>

          {(lastLesson || lastStep) && (
            <div className="glass-card p-4 space-y-3">
              <h2 className="text-sm font-semibold text-cyan-400 flex items-center gap-2"><ArrowLeft size={14}/>أكمل من حيث توقفت</h2>
              {lastLesson && (
                <div className="glass-card-sm p-3">
                  <p className="text-xs text-slate-400">آخر درس</p>
                  <p className="text-sm font-semibold text-white mt-0.5">درس {lastLesson.number}: {lastLesson.title}</p>
                  <button className="btn-secondary text-xs py-1 px-3 mt-2" onClick={() => navigate(`/lessons/${lastLesson.id}`)}>تابع الدرس</button>
                </div>
              )}
              {lastStep && (
                <div className="glass-card-sm p-3">
                  <p className="text-xs text-slate-400">آخر مرحلة بناء</p>
                  <p className="text-sm font-semibold text-white mt-0.5">المرحلة {lastStep.number}: {lastStep.title}</p>
                  <button className="btn-secondary text-xs py-1 px-3 mt-2" onClick={() => navigate('/roadmap')}>تابع البناء</button>
                </div>
              )}
            </div>
          )}

          <div className="glass-card p-4">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">التقدم العام</h2>
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>الدروس</span><span>{completedLessons.length}/{totalLessons}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 transition-all" style={{width: `${(completedLessons.length/totalLessons)*100}%`}}/>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>مراحل البناء</span><span>{completedRoadmapSteps.length}/{totalRoadmapSteps}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-gradient-to-r from-green-400 to-teal-400 transition-all" style={{width: `${(completedRoadmapSteps.length/totalRoadmapSteps)*100}%`}}/>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-300 mb-3">الأقسام السريعة</h2>
            <div className="grid grid-cols-3 gap-3">
              {quickSections.map(s => (
                <button key={s.path} onClick={() => navigate(s.path)} className="card-elevated p-3 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-white/4 flex items-center justify-center">
                    <s.icon size={20} className={s.color}/>
                  </div>
                  <span className="text-xs text-slate-300 text-center leading-tight">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="warning-card flex items-start gap-2">
            <Shield size={16} className="text-amber-400 flex-shrink-0 mt-0.5"/>
            <p className="text-xs text-amber-300">ابدأ دائمًا بالسلامة قبل البطارية — لا مراوح أثناء الاختبار</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
};
