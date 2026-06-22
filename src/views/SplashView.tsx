import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useProgress } from '../hooks/useProgress';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export const SplashView: React.FC = () => {
  const navigate = useNavigate();
  const { safetySeen, hasStarted, setHasStarted } = useProgress();

  const handleStart = () => {
    setHasStarted(true);
    if (!safetySeen) navigate('/safety');
    else navigate('/home');
  };

  // If already started redirect
  React.useEffect(() => {
    if (hasStarted) {
      if (!safetySeen) navigate('/safety');
      else navigate('/home');
    }
  }, []);

  return (
    <div className="min-h-screen tech-grid ambient-glow flex flex-col items-center justify-center px-6 py-12">
      <div className="fade-in flex flex-col items-center gap-7 max-w-sm w-full relative z-10">
        <div className="flex flex-col items-center gap-5">
          <div className="float-soft">
            <Logo size="lg"/>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mt-1 leading-snug">من الصفر إلى أول كوادكابتر</h1>
            <p className="text-slate-400 mt-2">تعلّم بناء درون FPV خطوة بخطوة وبأمان</p>
          </div>
        </div>

        <div className="hero-card p-5 w-full text-center space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[['18', 'درسًا تفاعليًا'], ['8', 'مراحل بناء'], ['∞', 'مساعد ذكي']].map(([n, l]) => (
              <div key={l} className="flex flex-col items-center">
                <span className="text-2xl font-bold text-gradient">{n}</span>
                <span className="text-[11px] text-slate-400 mt-0.5">{l}</span>
              </div>
            ))}
          </div>
          <div className="h-px bg-cyan-400/15"/>
          <p className="text-slate-300 text-sm">دليلك العربي الشامل لبناء أول كوادكابتر FPV — برسوم تعليمية تفاعلية</p>
        </div>

        <button className="btn-primary w-full text-lg py-4 press" onClick={handleStart}>
          ابدأ رحلتك <ArrowLeft size={20}/>
        </button>

        <div className="warning-card w-full">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5"/>
            <p className="text-xs text-amber-300">التطبيق تعليمي للمبتدئين ولا يغني عن قراءة دليل القطع الرسمية أو الالتزام بالقوانين المحلية.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
