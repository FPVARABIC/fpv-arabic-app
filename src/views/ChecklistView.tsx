import React from 'react';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { checklistsData } from '../data/checklistsData';
import { useProgressContext } from '../contexts/ProgressContext';
import { CheckSquare, ShoppingCart, Battery, Plane, Check } from 'lucide-react';

const iconMap: Record<string, React.FC<{size?: number; className?: string}>> = {
  ShoppingCart, Battery, Plane,
};

export const ChecklistView: React.FC = () => {
  const { toggleChecklistItem, isChecklistItemDone, getChecklistGroupProgress } = useProgressContext();

  return (
    <AppShell tint="green">
      <Header title="Checklist"/>
      <div className="px-4 py-4 space-y-5 fade-in">
        {checklistsData.map(group => {
          const Icon = iconMap[group.icon] || CheckSquare;
          const pct = getChecklistGroupProgress(group.id, group.items.length);
          const doneCnt = group.items.filter(item => isChecklistItemDone(group.id, item.id)).length;
          const complete = pct === 100;
          return (
            <div key={group.id} className="card-feature p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ background: complete ? 'rgba(34,197,94,0.18)' : 'rgba(24,230,230,0.14)', border: `1px solid ${complete ? 'rgba(34,197,94,0.4)' : 'rgba(34,211,238,0.3)'}` }}>
                    <Icon size={20} className={complete ? 'text-green-300' : 'text-cyan-300'}/>
                  </div>
                  <h2 className="font-bold text-white">{group.title}</h2>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-extrabold ${complete ? 'badge-green' : 'badge-cyan'}`}>{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${complete ? 'bg-gradient-to-r from-green-400 to-teal-400' : 'bg-gradient-to-r from-cyan-400 to-blue-400'}`} style={{width: `${pct}%`}}/>
              </div>
              <p className="text-xs text-slate-500 -mt-1">{doneCnt} من {group.items.length} مكتمل</p>
              <div className="space-y-1.5">
                {group.items.map(item => {
                  const done = isChecklistItemDone(group.id, item.id);
                  return (
                    <button key={item.id} className="w-full flex items-center gap-3 text-right p-2.5 rounded-xl hover:bg-white/4 transition-all press" onClick={() => toggleChecklistItem(group.id, item.id)}>
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${done ? 'bg-cyan-400/25 border border-cyan-400/50 check-pop' : 'border-2 border-slate-600'}`}>
                        {done && <Check size={14} className="text-cyan-300" strokeWidth={3}/>}
                      </span>
                      <span className={`text-sm ${done ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{item.text}</span>
                    </button>
                  );
                })}
              </div>
              {complete && (
                <div className="success-card text-center text-sm text-green-400 font-bold">✓ هذه القائمة مكتملة</div>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
};
