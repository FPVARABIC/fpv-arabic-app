import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgressContext } from '../contexts/ProgressContext';
import { Shield, CheckCircle2, ArrowLeft } from 'lucide-react';

const safetyPoints = [
  'لا تركّب المراوح أثناء الاختبار أبدًا',
  'لا توصل البطارية قبل فحص اللحام بالـ Multimeter',
  'استخدم Smoke Stopper عند أول تشغيل دائمًا',
  'تأكد من القطبية + و - قبل كل توصيل',
  'افحص continuity بين VBAT و GND قبل البطارية',
  'بطاريات LiPo خطيرة إذا استُخدمت بشكل خاطئ',
  'لا تعتمد على التخمين في التوصيل - تحقق دائمًا',
  'افصل البطارية عند تعديل أي أسلاك',
];

export const SafetyGateView: React.FC = () => {
  const navigate = useNavigate();
  const { setSafetySeen } = useProgressContext();

  const handleContinue = () => {
    setSafetySeen(true);
    navigate('/home');
  };

  return (
    <div className="min-h-screen tech-grid flex flex-col justify-center px-4 py-8">
      <div className="max-w-sm mx-auto w-full fade-in space-y-5">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mx-auto">
            <Shield size={32} className="text-amber-400"/>
          </div>
          <h1 className="text-2xl font-bold text-white">قبل أن تبدأ</h1>
          <p className="text-slate-400 text-sm">اقرأ تعليمات السلامة بعناية قبل الانتقال للتطبيق</p>
        </div>

        <div className="glass-card p-4 space-y-3">
          {safetyPoints.map((point, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-amber-400 text-xs font-bold">{i + 1}</span>
              </div>
              <p className="text-sm text-slate-200">{point}</p>
            </div>
          ))}
        </div>

        <div className="danger-card">
          <p className="text-sm text-red-300 text-center font-semibold">السلامة أولاً — دائمًا وأبدًا</p>
        </div>

        <button className="btn-primary w-full py-4" onClick={handleContinue}>
          <CheckCircle2 size={20}/> فهمت، أريد المتابعة <ArrowLeft size={16}/>
        </button>
      </div>
    </div>
  );
};
