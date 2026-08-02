import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { betaflightData } from '../data/betaflightData';
import { BetaflightDetailVisual } from '../components/BetaflightDetailVisual';
import { ArrowRight, Star, ShieldAlert, AlertTriangle } from 'lucide-react';
import { bfPageRegistry } from '../data/betaflight/pageRegistry';
import { BF_VERSION_CONTEXT } from '../data/betaflight/sourceHelpers';
import { BetaflightPageRenderer } from '../components/betaflight/BetaflightPageRenderer';
import { BetaflightNotStartedPage } from '../components/betaflight/BetaflightNotStartedPage';
import { KbBacklinksLazy } from '../components/kb/KbBacklinksLazy';

export const BetaflightDetailView: React.FC = () => {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();

  // New-architecture pages (Phase 1 fixtures: 'setup' and 'ports') take
  // priority over the legacy ten-article lookup below.
  const registryEntry = bfPageRegistry.find(e => e.id === sectionId);
  if (registryEntry?.page) {
    return (
      <AppShell tint="purple">
        <BetaflightPageRenderer page={registryEntry.page} backTo="/betaflight" />
        {/* Reverse links into the encyclopedia — a settings page can now reach
            the article explaining the hardware the setting actually controls.
            Renders nothing when no KB content references this page. */}
        <div style={{ padding: '0 16px 20px' }}>
          <KbBacklinksLazy kind="betaflight" targetId={registryEntry.id} tone="dark" />
        </div>
      </AppShell>
    );
  }

  // Several registry IDs (receiver/modes/motors/failsafe/osd/cli) intentionally
  // share their ID with one of the original ten legacy articles; those are
  // already handled above via registryEntry.page (reviewed). Any remaining
  // registry entry here has no `.page`, i.e. it is honestly not-started —
  // that must win over a legacy-article collision (e.g. 'blackbox' exists in
  // both places, but the registry's not-started status is the source of
  // truth for the live 26-page hub). A legacy-only ID with no registry
  // counterpart at all (e.g. 'interface', 'firmware') still falls through to
  // the legacy branch below.
  if (registryEntry) {
    return (
      <AppShell tint="purple">
        <BetaflightNotStartedPage entry={registryEntry} versionContext={BF_VERSION_CONTEXT} backTo="/betaflight" />
      </AppShell>
    );
  }

  const section = betaflightData.find(s => s.id === sectionId);
  if (!section) return <div className="p-8 text-center text-slate-400">القسم غير موجود</div>;

  const danger = section.id === 'motors';

  return (
    <AppShell tint="purple">
      <div className="fade-in">
        <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-cyan-400/10">
          <button onClick={() => navigate('/betaflight')} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center press">
            <ArrowRight size={18} className="text-slate-400"/>
          </button>
          <h1 className="text-lg font-extrabold text-white flex-1">{section.title}</h1>
        </div>
        <div className="px-4 py-4 space-y-5">
          <p className="text-sm text-slate-400 leading-relaxed">{section.description}</p>

          {/* visual FIRST, full width */}
          <BetaflightDetailVisual id={section.id}/>

          {section.warning && (
            <div className={danger ? 'danger-strip' : 'warning-strip'}>
              {danger ? <ShieldAlert size={20} className="text-red-300 flex-shrink-0"/> : <AlertTriangle size={20} className="text-amber-300 flex-shrink-0"/>}
              <p className={`text-sm font-bold ${danger ? 'text-red-100' : 'text-amber-100'}`}>{section.warning}</p>
            </div>
          )}

          <div className="pull-quote">
            <h2 className="text-xs font-bold text-cyan-300 mb-2">الشرح</h2>
            <p className="text-[15px] text-slate-100 leading-loose">{section.explanation}</p>
          </div>

          <div className="space-y-2.5">
            <h2 className="text-sm font-bold text-white accent-head flex items-center gap-2"><Star size={15} className="text-cyan-300"/>نقاط مهمة</h2>
            {section.importantPoints.map((pt, i) => (
              <div key={i} className="card-subtle p-3.5 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, rgba(24,230,230,0.25), rgba(0,160,255,0.15))', border: '1px solid rgba(34,211,238,0.35)' }}>
                  <span className="text-cyan-200 text-xs font-extrabold">{i+1}</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed pt-0.5">{pt}</p>
              </div>
            ))}
          </div>

          <button onClick={() => navigate('/betaflight')} className="btn-primary w-full mt-2">
            <ArrowRight size={18}/> العودة إلى Betaflight
          </button>
        </div>
      </div>
    </AppShell>
  );
};
