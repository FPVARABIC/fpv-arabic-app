import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Cpu, Radio, Link2, Navigation, ChevronLeft } from 'lucide-react';

interface ProgrammingCard {
  id: string;
  title: string;
  description: string;
  icon: React.FC<{ size?: number; className?: string }>;
  accentKey: 'betaflight' | 'expresslrs' | 'binding' | 'inav';
  available: boolean;
  route?: string;
}

const cards: ProgrammingCard[] = [
  {
    id: 'betaflight',
    title: 'Betaflight',
    description: 'إعداد المتحكم، المنافذ، المستقبل، والأنظمة الأساسية للطيران.',
    icon: Cpu,
    accentKey: 'betaflight',
    available: true,
    route: '/betaflight',
  },
  {
    id: 'expresslrs',
    title: 'ExpressLRS',
    description: 'إعداد وربط نظام ExpressLRS والتحكم في إعدادات الاتصال.',
    icon: Radio,
    accentKey: 'expresslrs',
    available: true,
    route: '/programming/expresslrs',
  },
  {
    id: 'binding',
    title: 'Binding',
    description: 'ربط جهاز الإرسال بالمستقبل والتحقق من الاتصال.',
    icon: Link2,
    accentKey: 'binding',
    available: false,
  },
  {
    id: 'inav',
    title: 'INAV',
    description: 'إعداد نظام INAV للملاحة والمهام المتقدمة.',
    icon: Navigation,
    accentKey: 'inav',
    available: false,
  },
];

export const ProgrammingView: React.FC = () => {
  const navigate = useNavigate();
  const availableCount = cards.filter(c => c.available).length;
  const comingSoonCount = cards.length - availableCount;

  return (
    <AppShell tint="purple">
      <div className="programming-shell fade-in min-h-screen">
        <div className="programming-header px-4 pt-5 pb-4">
          <h1 className="text-xl font-extrabold text-white">البرمجة</h1>
          <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">اختر النظام الذي تريد إعداده أو تعلّمه.</p>
          <p className="text-xs text-slate-500 mt-2">{availableCount} أنظمة متاحة · {comingSoonCount} قريبًا</p>
        </div>

        <div className="px-4 pb-4 space-y-3">
          {cards.map(card => {
            const Icon = card.icon;

            if (card.available) {
              return (
                <button
                  key={card.id}
                  type="button"
                  data-testid={`programming-card-${card.id}`}
                  onClick={() => navigate(card.route!)}
                  className={`programming-card programming-card--${card.accentKey} press text-right`}
                >
                  <div className="flex items-center gap-3">
                    <div className="programming-card-icon">
                      <Icon size={22} aria-hidden/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white" dir="ltr">{card.title}</h3>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{card.description}</p>
                    </div>
                    <ChevronLeft size={18} className="text-slate-400 flex-shrink-0" aria-hidden/>
                  </div>
                </button>
              );
            }

            return (
              <button
                key={card.id}
                type="button"
                disabled
                data-testid={`programming-card-${card.id}`}
                aria-label={`${card.title} — قريبًا، غير متاح حاليًا`}
                className={`programming-card programming-card--${card.accentKey} programming-card--disabled text-right relative`}
              >
                <span
                  data-testid={`programming-badge-${card.id}`}
                  className="programming-status absolute top-3 left-3"
                >
                  قريبًا
                </span>
                <div className="flex items-center gap-3">
                  <div className="programming-card-icon">
                    <Icon size={22} aria-hidden/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-200" dir="ltr">{card.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{card.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
};
