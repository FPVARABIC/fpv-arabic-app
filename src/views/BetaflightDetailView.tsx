import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { SafetyWarning } from '../components/SafetyWarning';
import { betaflightData } from '../data/betaflightData';
import { ArrowRight, Star } from 'lucide-react';

export const BetaflightDetailView: React.FC = () => {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const section = betaflightData.find(s => s.id === sectionId);
  if (!section) return <div className="p-8 text-center text-slate-400">القسم غير موجود</div>;

  return (
    <AppShell>
      <div className="fade-in">
        <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-cyan-400/10">
          <button onClick={() => navigate('/betaflight')} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
            <ArrowRight size={18} className="text-slate-400"/>
          </button>
          <h1 className="text-base font-bold text-white flex-1">{section.title}</h1>
        </div>
        <div className="px-4 py-4 space-y-4">
          <p className="text-sm text-slate-400">{section.description}</p>
          <div className="glass-card p-4">
            <h2 className="text-sm font-semibold text-cyan-400 mb-2">الشرح</h2>
            <p className="text-sm text-slate-200 leading-relaxed">{section.explanation}</p>
          </div>
          <div className="glass-card p-4 space-y-2">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Star size={14} className="text-cyan-400"/>نقاط مهمة</h2>
            {section.importantPoints.map((pt, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-cyan-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-cyan-400 text-xs">{i+1}</span>
                </div>
                <p className="text-sm text-slate-300">{pt}</p>
              </div>
            ))}
          </div>
          {section.warning && <SafetyWarning message={section.warning} type={section.id === 'motors' ? 'danger' : 'warning'}/>}
          <button onClick={() => navigate('/betaflight')} className="btn-secondary w-full">العودة إلى Betaflight</button>
        </div>
      </div>
    </AppShell>
  );
};
