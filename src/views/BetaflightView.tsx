import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { betaflightData } from '../data/betaflightData';
import { AlertCircle, ChevronLeft } from 'lucide-react';

export const BetaflightView: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AppShell>
      <Header title="Betaflight بالعربي"/>
      <div className="px-4 py-4 space-y-4 fade-in">
        <div className="glass-card-sm p-3 flex items-start gap-2">
          <AlertCircle size={14} className="text-blue-400 flex-shrink-0 mt-0.5"/>
          <p className="text-xs text-blue-300">دليل تعليمي غير رسمي للمبتدئين. التطبيق غير تابع لـ Betaflight ولا يستخدم شعاره الرسمي.</p>
        </div>
        {betaflightData.map(section => (
          <div key={section.id} className="glass-card p-4 hover:border-cyan-400/40 transition-all cursor-pointer" onClick={() => navigate(`/betaflight/${section.id}`)}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-white">{section.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{section.description}</p>
                {section.warning && (
                  <div className="flex items-center gap-1 mt-2">
                    <AlertCircle size={11} className="text-amber-400"/>
                    <span className="text-xs text-amber-400">يحتوي على تحذير مهم</span>
                  </div>
                )}
              </div>
              <ChevronLeft size={18} className="text-cyan-400 flex-shrink-0 mr-2"/>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
};
