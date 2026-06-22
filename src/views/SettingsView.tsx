import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { useProgress } from '../hooks/useProgress';
import { AlertTriangle, CheckCircle2, Info, RotateCcw } from 'lucide-react';

interface ConfirmState { action: string; label: string; fn: () => void; }

export const SettingsView: React.FC = () => {
  const navigate = useNavigate();
  const { resetLessons, resetRoadmap, resetChecklists, resetAll, setSafetySeen } = useProgress();
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const doAction = (label: string, fn: () => void) => {
    fn();
    setConfirm(null);
    setDone(label);
    setTimeout(() => setDone(null), 2500);
  };

  const resetOptions = [
    { label: 'إعادة ضبط تقدم الدروس', fn: resetLessons, danger: false },
    { label: 'إعادة ضبط مراحل البناء', fn: resetRoadmap, danger: false },
    { label: 'إعادة ضبط Checklists', fn: resetChecklists, danger: false },
    { label: 'عرض تحذير السلامة مرة أخرى', fn: () => { setSafetySeen(false); navigate('/safety'); }, danger: false },
    { label: 'إعادة ضبط كل التقدم', fn: resetAll, danger: true },
  ];

  return (
    <AppShell>
      <Header title="الإعدادات"/>
      <div className="px-4 py-4 space-y-5 fade-in">
        {done && (
          <div className="success-card flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-400"/>
            <p className="text-sm text-green-400">تم: {done}</p>
          </div>
        )}

        <div className="glass-card p-4 space-y-2">
          <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2"><RotateCcw size={14} className="text-cyan-400"/>إعادة الضبط</h2>
          {resetOptions.map((opt, i) => (
            <button key={i} className={`w-full text-right p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${opt.danger ? 'bg-red-400/5 border-red-400/20 hover:border-red-400/40 text-red-400' : 'bg-white/3 border-white/5 hover:border-cyan-400/20 text-slate-300 hover:text-white'}`}
              onClick={() => setConfirm({ action: opt.label, label: opt.label, fn: opt.fn })}>
              <span className="text-sm">{opt.label}</span>
              {opt.danger && <AlertTriangle size={14}/>}
            </button>
          ))}
        </div>

        <button className="glass-card p-4 w-full text-right flex items-center gap-3 hover:border-cyan-400/30 transition-all" onClick={() => navigate('/about')}>
          <Info size={18} className="text-cyan-400"/>
          <span className="text-sm text-slate-300">حول التطبيق</span>
        </button>

        {confirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
            <div className="glass-card p-5 max-w-sm w-full space-y-4 fade-in">
              <div className="flex items-start gap-2">
                <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5"/>
                <div>
                  <h3 className="font-semibold text-white">تأكيد الإجراء</h3>
                  <p className="text-sm text-slate-400 mt-1">{confirm.label}؟ لا يمكن التراجع عن هذا الإجراء.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="btn-danger flex-1 py-2 text-sm" onClick={() => doAction(confirm.label, confirm.fn)}>نعم، تأكيد</button>
                <button className="btn-secondary flex-1 py-2 text-sm" onClick={() => setConfirm(null)}>إلغاء</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};
