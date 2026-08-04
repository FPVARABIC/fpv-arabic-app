import React from 'react';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { Logo } from '../components/Logo';
import { Shield, AlertCircle, Info } from 'lucide-react';

export const AboutView: React.FC = () => (
  <AppShell>
    <Header title="حول التطبيق"/>
    <div className="px-4 py-6 space-y-5 fade-in">
      <div className="flex justify-center"><Logo size="lg"/></div>

      <div className="glass-card p-5 space-y-3">
        <h2 className="text-lg font-bold text-white">ما هو FPVARABIC؟</h2>
        <p className="text-sm text-slate-300 leading-relaxed">FPVARABIC هو تطبيق تعليمي عربي يساعد المبتدئين على فهم وبناء أول كوادكابتر FPV خطوة بخطوة. يوفر التطبيق دروسًا تفصيلية، خريطة بناء تفاعلية، مساعدًا ذكيًا، وقوائم فحص شاملة.</p>
      </div>

      <div className="warning-card space-y-1">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-amber-400"/>
          <p className="text-sm font-semibold text-amber-300">تنبيه مهم</p>
        </div>
        <p className="text-xs text-amber-300/80">التطبيق لا يغني عن قراءة كتيبات القطع الرسمية أو الالتزام بقوانين الطيران المحلية في بلدك.</p>
      </div>

      <div className="glass-card-sm p-4 space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle size={14} className="text-blue-400"/>
          <p className="text-sm font-semibold text-blue-300">إخلاء مسؤولية</p>
        </div>
        <p className="text-xs text-slate-400">هذا التطبيق لا يستخدم شعارات رسمية ولا يدّعي الانتماء إلى Betaflight أو أي شركة مصنّعة. جميع الأسماء التقنية (ESC، FC، ELRS...) هي مصطلحات صناعية شائعة.</p>
      </div>

      <div className="glass-card-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info size={14} className="text-cyan-400"/>
          <p className="text-sm font-semibold text-cyan-300">ميزات التطبيق</p>
        </div>
        <ul className="space-y-1">
          {['18 درسًا تعليميًا باللغة العربية', '8 مراحل بناء تفاعلية مع Checklist', 'مساعد FPV بأسئلة وأجوبة عملية', 'قوائم فحص تفاعلية تُحفظ محلياً', 'دليل Betaflight للمبتدئين', 'استكشاف الأعطال الشائعة', 'تتبع التقدم والإنجازات'].map((f, i) => (
            <li key={i} className="text-xs text-slate-300 flex items-center gap-2"><span className="text-cyan-400">✓</span>{f}</li>
          ))}
        </ul>
      </div>
    </div>
  </AppShell>
);
