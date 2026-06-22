import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { botResponses } from '../data/botResponses';
import type { BotResponse } from '../types';
import { Bot, Send, ChevronLeft } from 'lucide-react';

interface Message { id: string; from: 'user' | 'bot'; text?: string; response?: BotResponse; }

export const BotAssistantView: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([{
    id: '0', from: 'bot',
    text: 'مرحبًا! أنا مساعد FPV. اختر أحد الأسئلة أو اكتب سؤالك:',
  }]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleQuickOption = (response: BotResponse) => {
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), from: 'user', text: response.label },
      { id: (Date.now()+1).toString(), from: 'bot', response },
    ]);
  };

  return (
    <AppShell>
      <Header title="مساعد FPV"/>
      <div className="flex flex-col h-[calc(100vh-9rem)]">
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 fade-in">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-start' : 'justify-end'}`}>
              {msg.from === 'bot' ? (
                <div className="flex gap-2 max-w-xs">
                  <div className="w-8 h-8 rounded-full bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot size={16} className="text-cyan-400"/>
                  </div>
                  <div className="space-y-2">
                    {msg.text && <div className="glass-card-sm p-3"><p className="text-sm text-slate-200">{msg.text}</p></div>}
                    {msg.response && (
                      <div className="glass-card-sm p-3 space-y-2">
                        <p className="text-sm text-slate-200">{msg.response.answer}</p>
                        <ol className="space-y-1">
                          {msg.response.steps.map((s, i) => <li key={i} className="text-xs text-slate-400 flex gap-1"><span className="text-cyan-400 flex-shrink-0">{i+1}.</span>{s}</li>)}
                        </ol>
                        {msg.response.actions.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {msg.response.actions.map((action, i) => (
                              <button key={i} className="btn-secondary text-xs py-1 px-2" onClick={() => navigate(action.route)}>
                                <ChevronLeft size={12}/> {action.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="max-w-xs">
                  <div className="bg-cyan-400/10 border border-cyan-400/20 rounded-2xl px-3 py-2">
                    <p className="text-sm text-cyan-300">{msg.text}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={endRef}/>
        </div>

        <div className="px-4 py-3 border-t border-cyan-400/10">
          <p className="text-xs text-slate-500 mb-2 text-center">اختر سؤالاً:</p>
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
            {botResponses.map(response => (
              <button key={response.id} className="text-right text-sm text-slate-300 bg-white/5 hover:bg-white/10 border border-cyan-400/10 hover:border-cyan-400/30 rounded-xl px-3 py-2 transition-all flex items-center justify-between gap-2" onClick={() => handleQuickOption(response)}>
                <span>{response.label}</span>
                <Send size={12} className="text-cyan-400 flex-shrink-0"/>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
};
