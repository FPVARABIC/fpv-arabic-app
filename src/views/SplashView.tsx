import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useProgress } from '../hooks/useProgress';
import { ArrowLeft, AlertCircle, Sparkles } from 'lucide-react';

export const SplashView: React.FC = () => {
  const navigate = useNavigate();
  const { hasStarted, setHasStarted } = useProgress();

  const handleStart = () => {
    setHasStarted(true);
    navigate('/home');
  };

  React.useEffect(() => {
    if (hasStarted) navigate('/home');
  }, []);

  const stats: [string, string][] = [['18', 'درسًا تفاعليًا'], ['8', 'مراحل بناء'], ['∞', 'مساعد ذكي']];

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center px-6 py-12 overflow-hidden">
      {/* full-screen ambient glow, no grid */}
      <div className="orbs" aria-hidden>
        <div className="orb orb-1"/>
        <div className="orb orb-2"/>
        <div className="orb orb-3"/>
      </div>
      <div className="fixed inset-0 pointer-events-none" aria-hidden
        style={{ background: 'radial-gradient(80% 50% at 50% 30%, rgba(24,230,230,0.10), transparent 70%)' }}/>

      <div className="fade-in flex flex-col items-center gap-8 max-w-sm w-full relative z-10">
        <div className="flex flex-col items-center gap-6">
          <div className="float-soft">
            <Logo size="lg"/>
          </div>
          <div className="text-center">
            <div className="chip mx-auto mb-4"><Sparkles size={13}/> دليلك العربي الشامل</div>
            <h1 className="text-[26px] font-extrabold leading-tight">
              <span className="text-gradient">من الصفر</span><br/>
              <span className="text-white">إلى أول كوادكابتر</span>
            </h1>
            <p className="text-slate-400 mt-3 text-[15px] leading-relaxed">تعلّم بناء درون FPV خطوة بخطوة وبأمان — برسوم تعليمية تفاعلية</p>
          </div>
        </div>

        {/* glowing stat pills */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {stats.map(([n, l]) => (
            <div key={l} className="pill-stat">
              <span className="text-xl font-extrabold text-gradient">{n}</span>
              <span className="text-[11px] text-slate-300 font-medium">{l}</span>
            </div>
          ))}
        </div>

        <button className="btn-primary w-full text-lg py-4" onClick={handleStart}>
          ابدأ رحلتك <ArrowLeft size={20}/>
        </button>

        <div className="warning-card w-full">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5"/>
            <p className="text-xs text-amber-300 leading-relaxed">التطبيق تعليمي للمبتدئين ولا يغني عن قراءة دليل القطع الرسمية أو الالتزام بالقوانين المحلية.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
