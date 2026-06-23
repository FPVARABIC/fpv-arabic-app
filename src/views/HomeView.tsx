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
  { icon: Map, label: 'خريطة البناء', path: '/roadmap', grad: 'linear-gradient(135deg, rgba(24,230,230,0.22), rgba(0,160,255,0.12))', color: 'text-cyan-300' },
  { icon: BookOpen, label: 'الدروس', path: '/lessons', grad: 'linear-gradient(135deg, rgba(59,130,246,0.24), rgba(99,102,241,0.12))', color: 'text-blue-300' },
  { icon: Cpu, label: 'Betaflight', path: '/betaflight', grad: 'linear-gradient(135deg, rgba(168,85,247,0.24), rgba(217,70,239,0.12))', color: 'text-purple-300' },
  { icon: CheckSquare, label: 'Checklist', path: '/checklists', grad: 'linear-gradient(135deg, rgba(34,197,94,0.24), rgba(16,185,129,0.12))', color: 'text-green-300' },
  { icon: Wrench, label: 'المشاكل والحلول', path: '/troubleshooting', grad: 'linear-gradient(135deg, rgba(249,115,22,0.24), rgba(245,158,11,0.12))', color: 'text-orange-300' },
  { icon: Bot, label: 'مساعد FPV', path: '/bot', grad: 'linear-gradient(135deg, rgba(236,72,153,0.24), rgba(244,114,182,0.12))', color: 'text-pink-300' },
];

export const HomeView: React.FC = () => {
  const navigate = useNavigate();
  const { lastOpened, overallProgress, completedLessons, completedRoadmapSteps, totalLessons, totalRoadmapSteps } = useProgress();
  const lastLesson = lastOpened.lessonId ? lessonsData.find(l => l.id === lastOpened.lessonId) : null;
  const lastStep = lastOpened.roadmapStepId ? roadmapData.find(s => s.id === lastOpened.roadmapStepId) : null;

  const statChips: [string, string][] = [
    [`${completedLessons.length}/${totalLessons}`, 'الدروس'],
    [`${completedRoadmapSteps.length}/${totalRoadmapSteps}`, 'مراحل البناء'],
    [`${overallProgress}%`, 'التقدم العام'],
  ];

  return (
    <AppShell tint="cyan">
      <div className="fade-in">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <Logo size="sm"/>
          <ProgressRing progress={overallProgress} size={56} strokeWidth={4}/>
        </div>

        <div className="px-4 py-4 space-y-6">
          {/* Hero */}
          <div className="card-hero p-6">
            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="flex-1">
                <span className="chip mb-3">مرحبًا بعودتك 👋</span>
                <h1 className="text-2xl font-extrabold text-white leading-tight">جاهز لبناء<br/><span className="text-gradient">أول كوادكابتر FPV؟</span></h1>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">مساعدك العربي خطوة بخطوة، من القطع إلى أول طيران.</p>
                <button className="btn-primary mt-4 text-sm py-2.5 px-5" onClick={() => navigate('/roadmap')}>
                  ابدأ البناء <ArrowLeft size={16}/>
                </button>
              </div>
              <ProgressRing progress={overallProgress} size={80} strokeWidth={7}/>
            </div>
          </div>

          {/* Continue */}
          {(lastLesson || lastStep) && (
            <div className="card-feature p-4 space-y-3">
              <h2 className="text-sm font-bold text-cyan-300 accent-head">أكمل من حيث توقفت</h2>
              {lastLesson && (
                <div className="card-subtle p-3">
                  <p className="text-[11px] text-slate-500">آخر درس</p>
                  <p className="text-sm font-bold text-white mt-0.5">درس {lastLesson.number}: {lastLesson.title}</p>
                  <button className="btn-secondary text-xs py-1.5 px-3 mt-2" onClick={() => navigate(`/lessons/${lastLesson.id}`)}>تابع الدرس</button>
                </div>
              )}
              {lastStep && (
                <div className="card-subtle p-3">
                  <p className="text-[11px] text-slate-500">آخر مرحلة بناء</p>
                  <p className="text-sm font-bold text-white mt-0.5">المرحلة {lastStep.number}: {lastStep.title}</p>
                  <button className="btn-secondary text-xs py-1.5 px-3 mt-2" onClick={() => navigate('/roadmap')}>تابع البناء</button>
                </div>
              )}
            </div>
          )}

          {/* Stats horizontal scroll */}
          <div>
            <h2 className="text-sm font-bold text-slate-300 mb-3 accent-head">نظرة سريعة</h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
              {statChips.map(([v, l]) => (
                <div key={l} className="card-feature px-5 py-3 flex-shrink-0 text-center min-w-[110px]">
                  <p className="text-2xl font-extrabold text-gradient">{v}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{l}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="divider-soft"/>

          {/* Quick sections */}
          <div>
            <h2 className="text-sm font-bold text-slate-300 mb-3 accent-head">الأقسام السريعة</h2>
            <div className="grid grid-cols-2 gap-3">
              {quickSections.map(s => (
                <button key={s.path} onClick={() => navigate(s.path)} className="card-feature p-4 flex items-center gap-3 text-right press">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: s.grad, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <s.icon size={22} className={s.color}/>
                  </div>
                  <span className="text-sm font-bold text-slate-100 leading-tight">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="warning-strip">
            <Shield size={18} className="text-amber-400 flex-shrink-0"/>
            <p className="text-xs text-amber-200 font-semibold">ابدأ دائمًا بالسلامة قبل البطارية — لا مراوح أثناء الاختبار</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
};
