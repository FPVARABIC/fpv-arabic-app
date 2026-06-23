import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { ProgressRing } from '../components/ProgressRing';
import { useProgress } from '../hooks/useProgress';
import { lessonsData } from '../data/lessonsData';
import { roadmapData } from '../data/roadmapData';
import { ArrowLeft, BookOpen, Map, Cpu, CheckSquare, Wrench, Bot, Shield, MoreVertical, X, Settings, Mail, Info } from 'lucide-react';

const quickSections = [
  { icon: Map, label: 'خريطة البناء', path: '/roadmap', grad: 'linear-gradient(135deg, rgba(24,230,230,0.22), rgba(0,160,255,0.12))', color: 'text-cyan-300' },
  { icon: BookOpen, label: 'الدروس', path: '/lessons', grad: 'linear-gradient(135deg, rgba(59,130,246,0.24), rgba(99,102,241,0.12))', color: 'text-blue-300' },
  { icon: Cpu, label: 'Betaflight', path: '/betaflight', grad: 'linear-gradient(135deg, rgba(168,85,247,0.24), rgba(217,70,239,0.12))', color: 'text-purple-300' },
  { icon: CheckSquare, label: 'Checklist', path: '/checklists', grad: 'linear-gradient(135deg, rgba(34,197,94,0.24), rgba(16,185,129,0.12))', color: 'text-green-300' },
  { icon: Wrench, label: 'المشاكل والحلول', path: '/troubleshooting', grad: 'linear-gradient(135deg, rgba(249,115,22,0.24), rgba(245,158,11,0.12))', color: 'text-orange-300' },
  { icon: Bot, label: 'مساعد FPV', path: '/bot', grad: 'linear-gradient(135deg, rgba(236,72,153,0.24), rgba(244,114,182,0.12))', color: 'text-pink-300' },
];

const secondaryOptions = [
  { icon: Settings, label: 'الإعدادات', path: '/settings', color: 'text-cyan-300' },
  { icon: Mail, label: 'اتصل بنا', path: '/contact', color: 'text-blue-300' },
  { icon: Info, label: 'حول التطبيق', path: '/about', color: 'text-purple-300' },
];

export const HomeView: React.FC = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { lastOpened, overallProgress, completedLessons, completedRoadmapSteps, totalLessons, totalRoadmapSteps } = useProgress();
  const lastLesson = lastOpened.lessonId ? lessonsData.find(l => l.id === lastOpened.lessonId) : null;
  const lastStep = lastOpened.roadmapStepId ? roadmapData.find(s => s.id === lastOpened.roadmapStepId) : null;

  const statChips: [string, string][] = [
    [`${completedLessons.length}/${totalLessons}`, 'الدروس'],
    [`${completedRoadmapSteps.length}/${totalRoadmapSteps}`, 'مراحل البناء'],
    [`${overallProgress}%`, 'التقدم العام'],
  ];

  const handleSecondaryNav = (path: string) => {
    setMenuOpen(false);
    navigate(path);
  };

  return (
    <AppShell tint="cyan">
      <div className="fade-in">
        {/* Brand block — centered logo, menu button pinned to top-right corner */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', paddingTop: 24, paddingBottom: 12 }}>
          <img
            src="/assets/logo.png"
            alt="FPV بالعربي"
            style={{
              maxHeight: 200,
              width: 'auto',
              display: 'block',
              filter: 'drop-shadow(0 0 18px rgba(24,230,230,0.55))',
            }}
          />
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="قائمة الإعدادات"
            style={{
              position: 'absolute',
              top: 24,
              right: 16,
              width: 44,
              height: 44,
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(34,211,238,0.08)',
              border: '1px solid rgba(34,211,238,0.18)',
              cursor: 'pointer',
            }}
            className="press"
          >
            <MoreVertical size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Secondary options half-screen sheet */}
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm fade-in"
              onClick={() => setMenuOpen(false)}
            />
            {/* pb-[76px] = nav height (64px) + 12px gap so the sheet clears BottomNavigation */}
            <div className="fixed bottom-0 left-0 right-0 z-50 fade-in" onClick={e => e.stopPropagation()}>
              <div className="max-w-[390px] mx-auto px-3" style={{ paddingBottom: 76 }}>
                <div
                  style={{
                    borderRadius: '24px 24px 20px 20px',
                    background: 'linear-gradient(160deg, #071828 0%, #050f1c 100%)',
                    border: '1px solid rgba(34,211,238,0.28)',
                    boxShadow: '0 -12px 48px rgba(34,211,238,0.18), 0 -2px 0 rgba(34,211,238,0.35), 0 16px 48px rgba(0,0,0,0.7)',
                    padding: '20px 20px 24px',
                  }}
                >
                  {/* grabber */}
                  <div className="w-10 h-1 rounded-full mx-auto mb-5"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.5), transparent)' }} />
                  <div className="flex items-center justify-between mb-5">
                    <p className="text-base font-bold text-white">الإعدادات والمزيد</p>
                    <button
                      onClick={() => setMenuOpen(false)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                      style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.18)' }}
                    >
                      <X size={16} className="text-cyan-300" />
                    </button>
                  </div>
                  <div
                    style={{
                      borderRadius: 16,
                      overflow: 'hidden',
                      border: '1px solid rgba(34,211,238,0.12)',
                    }}
                  >
                    {secondaryOptions.map((opt, idx) => (
                      <button
                        key={opt.path}
                        onClick={() => handleSecondaryNav(opt.path)}
                        className="w-full flex items-center gap-3 press"
                        style={{
                          padding: '14px 16px',
                          background: idx % 2 === 0 ? 'rgba(34,211,238,0.04)' : 'rgba(255,255,255,0.02)',
                          borderBottom: idx < secondaryOptions.length - 1 ? '1px solid rgba(34,211,238,0.10)' : 'none',
                          textAlign: 'right',
                        }}
                      >
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                          style={{
                            background: 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(0,160,255,0.08))',
                            border: '1px solid rgba(34,211,238,0.25)',
                          }}
                        >
                          <opt.icon size={18} className={opt.color} />
                        </div>
                        <span className="text-sm font-bold text-slate-100 flex-1">{opt.label}</span>
                        <ArrowLeft size={15} className="text-cyan-500 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

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
