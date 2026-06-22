import React from 'react';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { checklistsData } from '../data/checklistsData';
import { useProgress } from '../hooks/useProgress';
import { CheckSquare, Square, ShoppingCart, Battery, Plane } from 'lucide-react';

const iconMap: Record<string, React.FC<{size?: number; className?: string}>> = {
  ShoppingCart, Battery, Plane,
};

export const ChecklistView: React.FC = () => {
  const { toggleChecklistItem, isChecklistItemDone, getChecklistGroupProgress } = useProgress();

  return (
    <AppShell>
      <Header title="Checklist"/>
      <div className="px-4 py-4 space-y-5 fade-in">
        {checklistsData.map(group => {
          const Icon = iconMap[group.icon] || CheckSquare;
          const pct = getChecklistGroupProgress(group.id, group.items.length);
          const doneCnt = group.items.filter(item => isChecklistItemDone(group.id, item.id)).length;
          return (
            <div key={group.id} className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon size={18} className="text-cyan-400"/>
                  <h2 className="font-semibold text-white">{group.title}</h2>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold ${pct === 100 ? 'text-green-400' : 'text-cyan-400'}`}>{pct}%</span>
                  <p className="text-xs text-slate-500">{doneCnt}/{group.items.length}</p>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-white/5">
                <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-gradient-to-r from-green-400 to-teal-400' : 'bg-gradient-to-r from-cyan-400 to-blue-400'}`} style={{width: `${pct}%`}}/>
              </div>
              <div className="space-y-2">
                {group.items.map(item => {
                  const done = isChecklistItemDone(group.id, item.id);
                  return (
                    <button key={item.id} className="w-full flex items-center gap-3 text-right p-1.5 rounded-lg hover:bg-white/3 transition-all" onClick={() => toggleChecklistItem(group.id, item.id)}>
                      {done ? <CheckSquare size={18} className="text-cyan-400 flex-shrink-0"/> : <Square size={18} className="text-slate-500 flex-shrink-0"/>}
                      <span className={`text-sm ${done ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{item.text}</span>
                    </button>
                  );
                })}
              </div>
              {pct === 100 && (
                <div className="success-card text-center text-sm text-green-400 font-semibold">✓ هذه القائمة مكتملة</div>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
};
