import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, X, BookOpen, Map, CheckSquare, Cpu, Wrench, BarChart2, ChevronLeft, Zap, HelpCircle } from 'lucide-react';

const quickActions = [
  { icon: HelpCircle, label: 'لا أعرف من أين أبدأ', route: '/bot' },
  { icon: BookOpen, label: 'اختيار القطع', route: '/lessons/lesson-3' },
  { icon: Map, label: 'خريطة البناء', route: '/roadmap' },
  { icon: CheckSquare, label: 'Checklist قبل الطيران', route: '/checklists' },
  { icon: Cpu, label: 'مشكلة في Betaflight', route: '/betaflight' },
  { icon: Wrench, label: 'Receiver لا يعمل', route: '/troubleshooting' },
  { icon: Zap, label: 'المحركات لا تدور', route: '/betaflight/motors' },
  { icon: BarChart2, label: 'تقدمي في التعلم', route: '/progress' },
  { icon: BookOpen, label: 'درس التوصيل TX/RX', route: '/lessons/lesson-9' },
  { icon: Bot, label: 'مساعد FPV الكامل', route: '/bot' },
];

export const FloatingAssistant: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleAction = (route: string) => {
    setOpen(false);
    navigate(route);
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm fade-in" onClick={() => setOpen(false)} />
      )}

      {/* Bottom sheet panel */}
      {open && (
        <div className="fixed bottom-0 left-0 right-0 z-50 fade-in" onClick={e => e.stopPropagation()}>
          <div className="max-w-lg mx-auto px-3 pb-3">
            <div className="card-feature p-5"
              style={{ borderRadius: '24px 24px 18px 18px',
                boxShadow: '0 -8px 40px rgba(34,211,238,0.14), 0 8px 32px rgba(0,0,0,0.6)' }}>
              {/* grabber */}
              <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-4"/>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(24,230,230,0.18), rgba(0,160,255,0.12))', border: '1px solid rgba(34,211,238,0.3)' }}>
                    <Bot size={20} className="text-cyan-300" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-white">مساعد FPV</p>
                    <p className="text-xs text-slate-400">اختر ما تحتاجه للبدء بسرعة</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <X size={16} className="text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {quickActions.map((action, i) => (
                  <button key={i} onClick={() => handleAction(action.route)}
                    className="card-subtle flex items-center gap-2.5 p-3 text-right press">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(24,230,230,0.12)', border: '1px solid rgba(34,211,238,0.22)' }}>
                      <action.icon size={15} className="text-cyan-300" />
                    </div>
                    <span className="text-xs text-slate-200 text-right leading-tight font-medium flex-1">{action.label}</span>
                    <ChevronLeft size={12} className="text-slate-500 flex-shrink-0" />
                  </button>
                ))}
              </div>

              <button onClick={() => handleAction('/bot')}
                className="btn-secondary w-full mt-4 text-sm">
                افتح المساعد الكامل <ChevronLeft size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button onClick={() => setOpen(o => !o)}
        className={`fixed bottom-[5rem] right-4 z-50 w-14 h-14 rounded-2xl flex items-center justify-center press transition-all ${open ? '' : 'pulse-ring'}`}
        style={{
          background: 'linear-gradient(135deg, #0a93b8, #06b6d4)',
          boxShadow: open
            ? '0 0 28px rgba(34,211,238,0.6), 0 6px 20px rgba(0,0,0,0.5)'
            : '0 0 18px rgba(34,211,238,0.4), 0 6px 16px rgba(0,0,0,0.5)',
          border: '1px solid rgba(34,211,238,0.5)',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 36px rgba(34,211,238,0.75), 0 6px 20px rgba(0,0,0,0.5)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = open ? '0 0 28px rgba(34,211,238,0.6), 0 6px 20px rgba(0,0,0,0.5)' : '0 0 18px rgba(34,211,238,0.4), 0 6px 16px rgba(0,0,0,0.5)'; }}
        aria-label="مساعد FPV">
        {open ? <X size={22} className="text-white" /> : <Bot size={24} className="text-white" />}
      </button>
    </>
  );
};
