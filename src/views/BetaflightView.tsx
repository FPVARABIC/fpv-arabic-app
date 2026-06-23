import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { betaflightData } from '../data/betaflightData';
import { BetaflightVisual } from '../components/BetaflightVisual';
import { AlertCircle, ChevronLeft, Monitor, Download, Plug, Radio, ToggleRight, Zap, ShieldAlert, Eye, Database, Terminal, Cpu } from 'lucide-react';

const meta: Record<string, { icon: React.FC<{size?: number; className?: string}>; color: string; accent: string }> = {
  interface: { icon: Monitor, color: 'text-cyan-300', accent: '#18E6E6' },
  firmware: { icon: Download, color: 'text-blue-300', accent: '#60a5fa' },
  ports: { icon: Plug, color: 'text-teal-300', accent: '#2dd4bf' },
  receiver: { icon: Radio, color: 'text-green-300', accent: '#4ade80' },
  modes: { icon: ToggleRight, color: 'text-purple-300', accent: '#a78bfa' },
  motors: { icon: Zap, color: 'text-red-300', accent: '#f87171' },
  failsafe: { icon: ShieldAlert, color: 'text-amber-300', accent: '#fbbf24' },
  osd: { icon: Eye, color: 'text-pink-300', accent: '#f472b6' },
  blackbox: { icon: Database, color: 'text-indigo-300', accent: '#818cf8' },
  cli: { icon: Terminal, color: 'text-emerald-300', accent: '#34d399' },
};

export const BetaflightView: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AppShell tint="purple">
      <Header title="Betaflight بالعربي"/>
      <div className="px-4 py-4 space-y-3.5 fade-in">
        <div className="card-subtle p-3 flex items-start gap-2">
          <AlertCircle size={14} className="text-blue-400 flex-shrink-0 mt-0.5"/>
          <p className="text-xs text-blue-300">دليل تعليمي غير رسمي للمبتدئين. التطبيق غير تابع لـ Betaflight ولا يستخدم شعاره الرسمي.</p>
        </div>
        {betaflightData.map(section => {
          const m = meta[section.id] || { icon: Cpu, color: 'text-cyan-300', accent: '#18E6E6' };
          const Icon = m.icon;
          return (
            <div key={section.id} className="card-feature p-4 cursor-pointer press overflow-hidden relative" onClick={() => navigate(`/betaflight/${section.id}`)}
              style={{ borderRight: `3px solid ${m.accent}` }}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${m.accent}22`, border: `1px solid ${m.accent}44` }}>
                  <Icon size={22} className={m.color}/>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white">{section.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{section.description}</p>
                </div>
                <ChevronLeft size={18} className="text-slate-400 flex-shrink-0"/>
              </div>
              <BetaflightVisual id={section.id}/>
              {section.warning && (
                <div className="flex items-center gap-1.5 mt-2.5">
                  <AlertCircle size={12} className="text-amber-400"/>
                  <span className="text-xs text-amber-400 font-semibold">يحتوي على تحذير مهم</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
};
