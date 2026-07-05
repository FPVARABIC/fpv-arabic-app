import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { ProgressRing } from '../components/ProgressRing';
import { useProgressContext } from '../contexts/ProgressContext';
import { lessonsData } from '../data/lessonsData';
import { roadmapData } from '../data/roadmapData';
import { Trophy, CheckCircle2, Lock } from 'lucide-react';

interface Achievement { id: string; title: string; icon: string; unlocked: boolean; }

export const ProgressViewLegacy: React.FC = () => {
  const navigate = useNavigate();
  const { overallProgress, completedLessons, completedRoadmapSteps, checklistProgress, totalLessons, totalRoadmapSteps, lastOpened, hasStarted, safetySeen, lessonProgress, roadmapProgress } = useProgressContext();

  const achievements: Achievement[] = [
    { id: 'started', title: 'بدأت الرحلة', icon: '🚀', unlocked: hasStarted },
    { id: 'safety', title: 'أنهيت السلامة', icon: '🛡️', unlocked: safetySeen },
    { id: 'electricity', title: 'أنهيت الكهرباء', icon: '⚡', unlocked: ['lesson-electricity-basics','lesson-lipo-batteries','lesson-power-rails'].every(id => completedLessons.includes(id)) },
    { id: 'betaflight', title: 'وصلت إلى Betaflight', icon: '🖥️', unlocked: completedLessons.includes('lesson-motor-test') },
    { id: 'flight', title: 'جاهز لأول طيران', icon: '🏆', unlocked: completedLessons.includes('lesson-first-flight') || completedRoadmapSteps.includes('step-8') },
  ];

  const lastLesson = lastOpened.lessonId ? lessonsData.find(l => l.id === lastOpened.lessonId) : null;
  const lastStep = lastOpened.roadmapStepId ? roadmapData.find(s => s.id === lastOpened.roadmapStepId) : null;

  return (
    <AppShell tint="green">
      <Header title="التقدم"/>
      <div className="px-4 py-4 space-y-5 fade-in">
        <div className="card-hero p-5 flex items-center gap-5">
          <ProgressRing progress={overallProgress} size={88} strokeWidth={7}/>
          <div className="flex-1 space-y-2">
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1"><span>الدروس</span><span>{completedLessons.length}/{totalLessons}</span></div>
              <div className="h-1.5 rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400" style={{width: `${lessonProgress}%`}}/></div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1"><span>مراحل البناء</span><span>{completedRoadmapSteps.length}/{totalRoadmapSteps}</span></div>
              <div className="h-1.5 rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-green-400 to-teal-400" style={{width: `${roadmapProgress}%`}}/></div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1"><span>Checklist</span><span>{checklistProgress}%</span></div>
              <div className="h-1.5 rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-purple-400 to-pink-400" style={{width: `${checklistProgress}%`}}/></div>
            </div>
          </div>
        </div>

        {(lastLesson || lastStep) && (
          <div className="card-feature p-4 space-y-2">
            <h2 className="text-sm font-semibold text-slate-300">آخر نشاط</h2>
            {lastLesson && <p className="text-sm text-slate-400">درس: <span className="text-white">درس {lastLesson.number}: {lastLesson.title}</span></p>}
            {lastStep && <p className="text-sm text-slate-400">مرحلة بناء: <span className="text-white">المرحلة {lastStep.number}: {lastStep.title}</span></p>}
            <button className="btn-secondary text-sm py-2 px-4" onClick={() => navigate(lastLesson ? `/lessons/${lastLesson.id}` : '/roadmap')}>تابع التعلم</button>
          </div>
        )}

        <div>
          <h2 className="text-sm font-bold text-slate-300 mb-3 accent-head flex items-center gap-2"><Trophy size={16} className="text-amber-400"/>الإنجازات</h2>
          <div className="relative pr-4">
            {/* timeline line */}
            <div className="absolute right-[10px] top-2 bottom-2 w-0.5 border-r-2 border-dashed border-cyan-400/30"/>
            <div className="space-y-3">
              {achievements.map(a => (
                <div key={a.id} className="relative flex items-center gap-3">
                  <div className={`relative z-10 w-7 h-7 -mr-[26px] ml-1 rounded-full flex items-center justify-center flex-shrink-0 ${a.unlocked ? 'bg-amber-400/25 border border-amber-400/50' : 'bg-slate-800 border border-slate-700'}`}>
                    {a.unlocked ? <CheckCircle2 size={15} className="text-amber-300"/> : <Lock size={13} className="text-slate-600"/>}
                  </div>
                  <div className={`card-subtle p-3 flex items-center gap-3 flex-1 ${a.unlocked ? '' : 'opacity-55'}`}>
                    <span className="text-2xl">{a.icon}</span>
                    <div className="flex-1">
                      <p className={`font-bold text-sm ${a.unlocked ? 'text-white' : 'text-slate-500'}`}>{a.title}</p>
                      <p className="text-xs text-slate-500">{a.unlocked ? 'مفتوح' : 'مقفل'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};
