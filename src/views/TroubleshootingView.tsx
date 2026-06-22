import React, { useState } from 'react';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { troubleshootingData } from '../data/troubleshootingData';
import { SafetyWarning } from '../components/SafetyWarning';
import { ChevronDown, ChevronUp, AlertTriangle, Search } from 'lucide-react';

export const TroubleshootingView: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <AppShell>
      <Header title="استكشاف الأعطال"/>
      <div className="px-4 py-4 space-y-3 fade-in">
        <p className="text-sm text-slate-400 mb-2">اعثر على المشكلة وتابع الخطوات خطوة بخطوة</p>
        {troubleshootingData.map(item => {
          const open = openId === item.id;
          return (
            <div key={item.id} className={`glass-card transition-all ${open ? 'border-cyan-400/40' : ''}`}>
              <button className="w-full p-4 flex items-center gap-3 text-right" onClick={() => setOpenId(open ? null : item.id)}>
                <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={16} className="text-amber-400"/>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white text-sm">{item.problem}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{item.symptoms.slice(0,2).join(' • ')}</p>
                </div>
                {open ? <ChevronUp size={16} className="text-cyan-400 flex-shrink-0"/> : <ChevronDown size={16} className="text-slate-500 flex-shrink-0"/>}
              </button>
              {open && (
                <div className="px-4 pb-4 space-y-4 border-t border-cyan-400/10 pt-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 mb-1.5">الأعراض:</p>
                    <div className="space-y-1">
                      {item.symptoms.map((s, i) => <p key={i} className="text-xs text-slate-300 flex items-start gap-1"><span className="text-cyan-400">•</span>{s}</p>)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 mb-1.5">الأسباب المحتملة:</p>
                    <div className="space-y-1">
                      {item.causes.map((c, i) => <p key={i} className="text-xs text-slate-300 flex items-start gap-1"><span className="text-amber-400">•</span>{c}</p>)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1"><Search size={11}/>خطوات الفحص:</p>
                    <div className="space-y-1.5">
                      {item.steps.map((s, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-cyan-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-cyan-400 text-xs">{i+1}</span>
                          </div>
                          <p className="text-xs text-slate-200">{s}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {item.safetyNote && <SafetyWarning message={item.safetyNote} type="warning"/>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
};
