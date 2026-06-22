import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, X, BookOpen, Map, CheckSquare, Cpu, Wrench, BarChart2, ChevronLeft, Zap, HelpCircle } from 'lucide-react';

const quickActions = [
  { icon: HelpCircle, label: 'لا أعرف من أين أبدأ', route: '/bot', botId: 'start' },
  { icon: BookOpen, label: 'اختيار القطع', route: '/lessons/lesson-3', botId: null },
  { icon: Map, label: 'خريطة البناء', route: '/roadmap', botId: null },
  { icon: CheckSquare, label: 'Checklist قبل الطيران', route: '/checklists', botId: null },
  { icon: Cpu, label: 'مشكلة في Betaflight', route: '/betaflight', botId: null },
  { icon: Wrench, label: 'Receiver لا يعمل', route: '/troubleshooting', botId: null },
  { icon: Zap, label: 'المحركات لا تدور', route: '/betaflight/motors', botId: null },
  { icon: BarChart2, label: 'تقدمي في التعلم', route: '/progress', botId: null },
  { icon: BookOpen, label: 'درس التوصيل TX/RX', route: '/lessons/lesson-9', botId: null },
  { icon: Bot, label: 'مساعد FPV الكامل', route: '/bot', botId: null },
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
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-20 left-3 right-3 z-50 fade-in"
          style={{ maxWidth: 420, margin: '0 auto' }}
          onClick={e => e.stopPropagation()}
        >
          <div
            className="glass-card p-4"
            style={{
              background: 'linear-gradient(135deg, rgba(6,24,39,0.98) 0%, rgba(8,30,55,0.98) 100%)',
              border: '1px solid rgba(34,211,238,0.25)',
              boxShadow: '0 0 40px rgba(34,211,238,0.12), 0 8px 32px rgba(0,0,0,0.6)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-400/10 border border-cyan-400/25 flex items-center justify-center">
                  <Bot size={16} className="text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">مساعد FPV</p>
                  <p className="text-xs text-slate-400">اختر ما تحتاجه</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <X size={14} className="text-slate-400" />
              </button>
            </div>

            {/* Actions grid */}
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => handleAction(action.route)}
                  className="flex items-center gap-2 p-2.5 rounded-xl text-right transition-all press"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,211,238,0.08)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(34,211,238,0.2)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.06)';
                  }}
                >
                  <div className="w-6 h-6 rounded-lg bg-cyan-400/10 flex items-center justify-center flex-shrink-0">
                    <action.icon size={12} className="text-cyan-400" />
                  </div>
                  <span className="text-xs text-slate-300 text-right leading-tight">{action.label}</span>
                  <ChevronLeft size={10} className="text-slate-500 flex-shrink-0 mr-auto" />
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
              <p className="text-xs text-slate-500">للمساعدة الكاملة</p>
              <button
                onClick={() => handleAction('/bot')}
                className="text-xs text-cyan-400 font-semibold flex items-center gap-1 hover:text-cyan-300 transition-colors"
              >
                افتح المساعد <ChevronLeft size={10} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-[4.5rem] left-4 z-50 w-12 h-12 rounded-2xl flex items-center justify-center press transition-all"
        style={{
          background: open
            ? 'linear-gradient(135deg, #0891b2, #06b6d4)'
            : 'linear-gradient(135deg, rgba(8,145,178,0.9), rgba(6,182,212,0.9))',
          boxShadow: open
            ? '0 0 20px rgba(34,211,238,0.5), 0 4px 16px rgba(0,0,0,0.4)'
            : '0 0 12px rgba(34,211,238,0.3), 0 4px 12px rgba(0,0,0,0.4)',
          border: '1px solid rgba(34,211,238,0.4)',
        }}
        aria-label="مساعد FPV"
      >
        {open ? <X size={18} className="text-white" /> : <Bot size={18} className="text-white" />}
      </button>
    </>
  );
};
