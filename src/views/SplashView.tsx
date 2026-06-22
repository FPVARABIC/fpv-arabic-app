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
    <div className="min-h-screen tech-grid flex flex-col items-center justify-center px-6 py-12">
      <div className="fade-in flex flex-col items-center gap-8 max-w-sm w-full">
        <div className="flex flex-col items-center gap-4">
          <Logo size="lg"/>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mt-2">من الصفر إلى أول كوادكابتر</h1>
            <p className="text-slate-400 mt-2">تعلّم بناء درون FPV خطوة بخطوة وبأمان</p>
          </div>
        </div>

        <div className="glass-card p-5 w-full text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-cyan-400 text-sm font-semibold">
            <span>18 درسًا تعليميًا</span>
            <span className="text-slate-600">•</span>
            <span>8 مراحل بناء</span>
            <span className="text-slate-600">•</span>
            <span>مساعد ذكي</span>
          </div>
          <p className="text-slate-300 text-sm">دليلك العربي الشامل لبناء أول كوادكابتر FPV</p>
        </div>

        <button className="btn-primary w-full text-lg py-4" onClick={handleStart}>
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
