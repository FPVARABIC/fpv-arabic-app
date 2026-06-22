import React, { useState } from 'react';

import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { roadmapData } from '../data/roadmapData';
import { useProgress } from '../hooks/useProgress';
import { CheckSquare, Square, ChevronDown, ChevronUp, Package, Wrench, Cpu, Zap, Shield, Settings, Activity, Wind, CheckCircle2 } from 'lucide-react';

const iconMap: Record<string, React.FC<{size?: number; className?: string}>> = {
  Package, Wrench, Cpu, Zap, Shield, Settings, Activity, Wind,
};

export const BuildRoadmapView: React.FC = () => {
  const { completedRoadmapSteps, getRoadmapStepProgress, toggleRoadmapChecklistItem, isRoadmapItemDone, completeRoadmapStep, setLastOpenedRoadmapStep } = useProgress();
  const [openStep, setOpenStep] = useState<string | null>(null);

  const toggleStep = (id: string) => {
    const next = openStep === id ? null : id;
    setOpenStep(next);
    if (next) setLastOpenedRoadmapStep(id);
  };

  return (
    <AppShell>
      <Header title="خريطة البناء"/>
      <div className="px-4 py-4 fade-in">
        <p className="text-sm text-slate-400 mb-4">{completedRoadmapSteps.length} من {roadmapData.length} مراحل مكتملة</p>
        <div className="relative space-y-3">
          {/* Timeline line */}
          <div className="absolute right-7 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-400/30 to-transparent -z-10"/>
          {roadmapData.map(step => {
            const Icon = iconMap[step.icon] || Package;
            const done = completedRoadmapSteps.includes(step.id);
            const pct = getRoadmapStepProgress(step.id, step.checklist.length);
            const active = openStep === step.id;
            const checklistDoneCount = step.checklist.filter((_, i) => isRoadmapItemDone(step.id, i)).length;
            return (
              <div key={step.id} className={`glass-card transition-all ${done ? 'border-green-400/30' : active ? 'border-cyan-400/40 pulse-glow' : ''}`}>
                <button className="w-full p-4 flex items-center gap-3 text-right" onClick={() => toggleStep(step.id)}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-400/20' : 'bg-cyan-400/10'}`}>
                    {done ? <CheckCircle2 size={20} className="text-green-400"/> : <Icon size={20} className="text-cyan-400"/>}
                  </div>
                  <div className="flex-1 text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">المرحلة {step.number}</span>
                      {done && <span className="text-xs bg-green-400/10 text-green-400 px-1.5 rounded-full border border-green-400/20">مكتمل</span>}
                    </div>
                    <h3 className="font-semibold text-white text-sm">{step.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 transition-all" style={{width: `${pct}%`}}/>
                      </div>
                      <span className="text-xs text-slate-500">{checklistDoneCount}/{step.checklist.length}</span>
                    </div>
                  </div>
                  {active ? <ChevronUp size={16} className="text-cyan-400 flex-shrink-0"/> : <ChevronDown size={16} className="text-slate-500 flex-shrink-0"/>}
                </button>
                {active && (
                  <div className="px-4 pb-4 space-y-3 border-t border-cyan-400/10 pt-3">
                    <p className="text-xs text-slate-400">{step.description}</p>
                    <div className="space-y-2">
                      {step.checklist.map((item, i) => {
                        const itemDone = isRoadmapItemDone(step.id, i);
                        return (
                          <button key={i} className="w-full flex items-center gap-3 text-right hover:bg-white/3 rounded-lg p-1 transition-all" onClick={() => {
                            toggleRoadmapChecklistItem(step.id, i);
                            // check if all done after toggle
                          }}>
                            {itemDone ? <CheckSquare size={18} className="text-cyan-400 flex-shrink-0"/> : <Square size={18} className="text-slate-500 flex-shrink-0"/>}
                            <span className={`text-sm ${itemDone ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{item}</span>
                          </button>
                        );
                      })}
                    </div>
                    {!done && checklistDoneCount === step.checklist.length && checklistDoneCount > 0 && (
                      <button className="btn-primary w-full text-sm py-2" onClick={() => completeRoadmapStep(step.id)}>
                        <CheckCircle2 size={16}/> إتمام المرحلة
                      </button>
                    )}
                    {done && <div className="success-card text-center text-sm text-green-400 font-semibold flex items-center justify-center gap-2"><CheckCircle2 size={16}/>المرحلة مكتملة</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
};
