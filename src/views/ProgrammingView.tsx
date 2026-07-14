import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { Cpu, Radio, Link2, Navigation, ChevronLeft } from 'lucide-react';

interface ProgrammingCard {
  id: string;
  title: string;
  description: string;
  icon: React.FC<{ size?: number; className?: string }>;
  colorClass: string;
  accent: string;
  available: boolean;
  route?: string;
}

const cards: ProgrammingCard[] = [
  {
    id: 'betaflight',
    title: 'Betaflight',
    description: 'إعداد المتحكم، المنافذ، المستقبل، والأنظمة الأساسية للطيران.',
    icon: Cpu,
    colorClass: 'text-cyan-300',
    accent: '#18E6E6',
    available: true,
    route: '/betaflight',
  },
  {
    id: 'expresslrs',
    title: 'ExpressLRS',
    description: 'إعداد وربط نظام ExpressLRS والتحكم في إعدادات الاتصال.',
    icon: Radio,
    colorClass: 'text-purple-300',
    accent: '#a78bfa',
    available: true,
    route: '/programming/expresslrs',
  },
  {
    id: 'binding',
    title: 'Binding',
    description: 'ربط جهاز الإرسال بالمستقبل والتحقق من الاتصال.',
    icon: Link2,
    colorClass: 'text-green-300',
    accent: '#4ade80',
    available: false,
  },
  {
    id: 'inav',
    title: 'INAV',
    description: 'إعداد نظام INAV للملاحة والمهام المتقدمة.',
    icon: Navigation,
    colorClass: 'text-amber-300',
    accent: '#fbbf24',
    available: false,
  },
];

export const ProgrammingView: React.FC = () => {
  const navigate = useNavigate();

  return (
    <AppShell tint="purple">
      <Header title="البرمجة"/>
      <div className="px-4 py-4 space-y-3.5 fade-in">
        <p className="text-sm text-slate-400">اختر النظام الذي تريد إعداده أو تعلّمه.</p>

        {cards.map(card => {
          const Icon = card.icon;

          if (card.available) {
            return (
              <button
                key={card.id}
                type="button"
                data-testid={`programming-card-${card.id}`}
                onClick={() => navigate(card.route!)}
                className="card-feature p-4 press w-full text-right block"
                style={{ borderRight: `3px solid ${card.accent}` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${card.accent}22`, border: `1px solid ${card.accent}44` }}>
                    <Icon size={22} className={card.colorClass}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white">{card.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{card.description}</p>
                  </div>
                  <ChevronLeft size={18} className="text-slate-400 flex-shrink-0"/>
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
              className="card-subtle p-4 w-full text-right block relative"
              style={{ opacity: 0.55, cursor: 'not-allowed', borderRight: `3px solid ${card.accent}` }}
            >
              <span
                data-testid={`programming-badge-${card.id}`}
                className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(251,191,36,0.16)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.35)' }}
              >
                قريبًا
              </span>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${card.accent}18`, border: `1px solid ${card.accent}33` }}>
                  <Icon size={22} className={`${card.colorClass} opacity-70`}/>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-300">{card.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{card.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </AppShell>
  );
};
