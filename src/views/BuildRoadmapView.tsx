import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { roadmapData } from '../data/roadmapData';
import { useProgressContext } from '../contexts/ProgressContext';
import { CheckCircle2, ChevronLeft, Package, Wrench, Cpu, Zap, Shield, Settings, Activity, Wind, AlertTriangle } from 'lucide-react';

const iconMap: Record<string, React.FC<{size?: number; className?: string}>> = {
  Package, Wrench, Cpu, Zap, Shield, Settings, Activity, Wind,
};

/**
 * Stage index for the Build Roadmap — a scannable list of all 10 stages,
 * each pushing to its own /roadmap/:stageId detail page (BuildRoadmapStageDetailView),
 * mirroring the list->detail pattern already established by Lessons and
 * Betaflight rather than the previous inline-accordion.
 */
export const BuildRoadmapView: React.FC = () => {
  const navigate = useNavigate();
  const { completedRoadmapSteps, getRoadmapStepProgress, isRoadmapItemDone, setLastOpenedRoadmapStep } = useProgressContext();

  const openStage = (id: string) => {
    setLastOpenedRoadmapStep(id);
    navigate(`/roadmap/${id}`);
  };

  return (
    <AppShell tint="cyan">
      <Header title="خريطة البناء"/>
      <div className="px-4 py-4 space-y-3 fade-in roadmap-shell">
        <div className="mb-2">
          <p className="text-sm text-slate-300"><span className="text-cyan-300 font-bold">{completedRoadmapSteps.length}</span> من {roadmapData.length} مراحل مكتملة</p>
          <p className="text-xs mt-0.5 text-cyan-400/60">ابنِ درونك خطوة بخطوة</p>
          <div className="h-1.5 rounded-full mt-2.5 bg-white/5">
            <div
              className="h-full rounded-full transition-all bg-gradient-to-r from-cyan-400 to-blue-400"
              style={{ width: `${(completedRoadmapSteps.length / roadmapData.length) * 100}%` }}
            />
          </div>
        </div>

        {roadmapData.map(step => {
          const Icon = iconMap[step.icon] || Package;
          const done = completedRoadmapSteps.includes(step.id);
          const pct = getRoadmapStepProgress(step.id, step.checklist.length);
          const checklistDoneCount = step.checklist.filter((_, i) => isRoadmapItemDone(step.id, i)).length;
          return (
            <button
              key={step.id}
              type="button"
              data-testid={`roadmap-stage-card-${step.id}`}
              onClick={() => openStage(step.id)}
              className={`card-feature w-full p-4 text-right press transition-all ${done ? 'border-green-400/30' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-extrabold text-sm ${done ? 'bg-green-400/20 text-green-300' : 'bg-cyan-400/10 text-cyan-300'}`}>
                  {done ? <CheckCircle2 size={20} className="text-green-400"/> : <Icon size={18}/>}
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">المرحلة {step.number}</span>
                    {done && <span className="text-xs bg-green-400/10 text-green-400 px-1.5 rounded-full border border-green-400/20">مكتمل</span>}
                  </div>
                  <h3 className="font-semibold text-white text-sm">{step.title}</h3>
                  <p className="text-xs text-cyan-300/70 mt-0.5 truncate">{step.description}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1 rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 transition-all" style={{width: `${pct}%`}}/>
                    </div>
                    <span className="text-xs text-slate-500">{checklistDoneCount}/{step.checklist.length}</span>
                  </div>
                </div>
                <ChevronLeft size={18} className="text-cyan-400/70 flex-shrink-0"/>
              </div>
            </button>
          );
        })}

        {/* Final completion state — shown once all 10 stages are complete.
            Does not auto-navigate; only offers currently-available destinations. */}
        {completedRoadmapSteps.length >= roadmapData.length && (
          <div
            data-testid="roadmap-final-completion"
            className="mt-2 rounded-2xl p-4 text-right"
            style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.25)' }}
          >
            <div className="flex items-center gap-2 justify-end mb-2">
              <h2 className="font-bold text-green-300 text-sm">تم إكمال التجميع المادي للدرون</h2>
              <CheckCircle2 size={18} className="text-green-400 flex-shrink-0"/>
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed mb-1 flex items-center gap-1.5 justify-end"><AlertTriangle size={13} className="flex-shrink-0"/>الدرون ليس جاهزًا للطيران بعد.</p>
            <p className="text-xs text-slate-300 leading-relaxed mb-1">يجب أن تبقى المراوح غير مركبة.</p>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">المرحلة التالية هي البرمجة والإعداد والاختبارات الآمنة.</p>
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                data-testid="roadmap-final-completion-programming"
                onClick={() => navigate('/programming')}
                className="btn-primary text-sm py-2 px-4"
              >
                الانتقال إلى البرمجة
              </button>
              <button
                type="button"
                data-testid="roadmap-final-completion-expresslrs"
                onClick={() => navigate('/programming/expresslrs')}
                className="text-sm py-2 px-4 rounded-xl font-bold"
                style={{ background: 'rgba(167,139,250,0.12)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.3)' }}
              >
                إعداد ExpressLRS (اختياري)
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};
