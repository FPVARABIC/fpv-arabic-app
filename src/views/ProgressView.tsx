import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { ProgressRing } from '../components/ProgressRing';
import { useProgress } from '../hooks/useProgress';
import { lessonsData } from '../data/lessonsData';
import { roadmapData } from '../data/roadmapData';
import { Trophy, CheckCircle2, Lock } from 'lucide-react';

interface Achievement { id: string; title: string; icon: string; unlocked: boolean; }

export const ProgressView: React.FC = () => {
  const navigate = useNavigate();
  const { overallProgress, completedLessons, completedRoadmapSteps, checklistProgress, totalLessons, totalRoadmapSteps, lastOpened, hasStarted, safetySeen, lessonProgress, roadmapProgress } = useProgress();

  const achievements: Achievement[] = [
    { id: 'started', title: 'بدأت الرحلة', icon: '🚀', unlocked: hasStarted },
    { id: 'safety', title: 'أنهيت السلامة', icon: '🛡️', unlocked: safetySeen },
    { id: 'electricity', title: 'أنهيت الكهرباء', icon: '⚡', unlocked: ['lesson-6','lesson-7','lesson-8'].every(id => completedLessons.includes(id)) },
    { id: 'betaflight', title: 'وصلت إلى Betaflight', icon: '🖥️', unlocked: completedLessons.includes('lesson-17') },
    { id: 'flight', title: 'جاهز لأول طيران', icon: '🏆', unlocked: completedLessons.includes('lesson-18') || completedRoadmapSteps.includes('step-8') },
  ];

  const lastLesson = lastOpened.lessonId ? lessonsData.find(l => l.id === lastOpened.lessonId) : null;
  const lastStep = lastOpened.roadmapStepId ? roadmapData.find(s => s.id === lastOpened.roadmapStepId) : null;

  return (
    <AppShell>
      <Header title="التقدم"/>
      <div className="px-4 py-4 space-y-5 fade-in">
        <div className="glass-card p-5 flex items-center gap-5">
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
          <div className="glass-card p-4 space-y-2">
            <h2 className="text-sm font-semibold text-slate-300">آخر نشاط</h2>
            {lastLesson && <p className="text-sm text-slate-400">درس: <span className="text-white">درس {lastLesson.number}: {lastLesson.title}</span></p>}
            {lastStep && <p className="text-sm text-slate-400">مرحلة بناء: <span className="text-white">المرحلة {lastStep.number}: {lastStep.title}</span></p>}
            <button className="btn-secondary text-sm py-2 px-4" onClick={() => navigate(lastLesson ? `/lessons/${lastLesson.id}` : '/roadmap')}>تابع التعلم</button>
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2"><Trophy size={16} className="text-amber-400"/>الإنجازات</h2>
          <div className="grid grid-cols-1 gap-3">
            {achievements.map(a => (
              <div key={a.id} className={`glass-card-sm p-3 flex items-center gap-3 transition-all ${a.unlocked ? 'border-amber-400/30' : 'opacity-50'}`}>
                <span className="text-2xl">{a.icon}</span>
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${a.unlocked ? 'text-white' : 'text-slate-500'}`}>{a.title}</p>
                  <p className="text-xs text-slate-500">{a.unlocked ? 'مفتوح' : 'مقفل'}</p>
                </div>
                {a.unlocked ? <CheckCircle2 size={18} className="text-amber-400"/> : <Lock size={16} className="text-slate-600"/>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
};
