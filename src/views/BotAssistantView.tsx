import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { botResponses } from '../data/botResponses';
import type { BotResponse } from '../types';
import { buildKnowledgeAnswer } from '../data/knowledge/searchKnowledge';
import type { KnowledgeBotAnswer } from '../data/knowledge/searchKnowledge';
import { Bot, Send, ChevronLeft, Sparkles, AlertTriangle, BookOpen } from 'lucide-react';

interface Message {
  id: string;
  from: 'user' | 'bot';
  text?: string;
  response?: BotResponse;
  knowledgeAnswer?: KnowledgeBotAnswer;
}

const confidenceLabel: Record<KnowledgeBotAnswer['confidence'], string> = {
  high: 'إجابة موثوقة',
  medium: 'إجابة جزئية',
  low: 'لم أجد إجابة مؤكدة',
};

const confidenceColor: Record<KnowledgeBotAnswer['confidence'], string> = {
  high: 'text-cyan-400',
  medium: 'text-amber-400',
  low: 'text-slate-500',
};

export const BotAssistantView: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([{
    id: '0', from: 'bot',
    text: 'مرحبًا! أنا مساعد FPV. اختر أحد الأسئلة أو اكتب سؤالك:',
  }]);
  const [inputValue, setInputValue] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleQuickOption = (response: BotResponse) => {
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), from: 'user', text: response.label },
      { id: (Date.now()+1).toString(), from: 'bot', response },
    ]);
  };

  const handleTextSubmit = () => {
    const query = inputValue.trim();
    if (!query) return;
    const knowledgeAnswer = buildKnowledgeAnswer(query);
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), from: 'user', text: query },
      { id: (Date.now()+1).toString(), from: 'bot', knowledgeAnswer },
    ]);
    setInputValue('');
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleTextSubmit();
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
                    {msg.text && (
                      <div className="glass-card-sm p-3">
                        <p className="text-sm text-slate-200">{msg.text}</p>
                      </div>
                    )}
                    {msg.response && (
                      <div className="glass-card-sm p-3 space-y-2">
                        <p className="text-sm text-slate-200">{msg.response.answer}</p>
                        <ol className="space-y-1">
                          {msg.response.steps.map((s, i) => (
                            <li key={i} className="text-xs text-slate-400 flex gap-1">
                              <span className="text-cyan-400 flex-shrink-0">{i+1}.</span>{s}
                            </li>
                          ))}
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
                    {msg.knowledgeAnswer && (
                      <div className="glass-card-sm p-3 space-y-2 max-w-xs">
                        {/* Confidence badge */}
                        <span className={`text-xs font-semibold ${confidenceColor[msg.knowledgeAnswer.confidence]}`}>
                          {confidenceLabel[msg.knowledgeAnswer.confidence]}
                        </span>
                        {/* Main answer */}
                        <p className="text-sm text-slate-200">{msg.knowledgeAnswer.answer}</p>
                        {/* Steps */}
                        {msg.knowledgeAnswer.steps.length > 0 && (
                          <ol className="space-y-1">
                            {msg.knowledgeAnswer.steps.map((s, i) => (
                              <li key={i} className="text-xs text-slate-400 flex gap-1">
                                <span className="text-cyan-400 flex-shrink-0">{i+1}.</span>{s}
                              </li>
                            ))}
                          </ol>
                        )}
                        {/* Safety note — clearly visible */}
                        {msg.knowledgeAnswer.safetyNote && (
                          <div className="flex gap-2 rounded-xl p-2.5 mt-1"
                            style={{ background: 'rgba(251,146,60,0.10)', border: '1px solid rgba(251,146,60,0.35)' }}>
                            <AlertTriangle size={13} className="text-orange-400 flex-shrink-0 mt-0.5"/>
                            <p className="text-xs text-orange-300 leading-relaxed">{msg.knowledgeAnswer.safetyNote}</p>
                          </div>
                        )}
                        {/* Sources */}
                        {msg.knowledgeAnswer.sources.length > 0 && (
                          <div className="pt-1 space-y-0.5">
                            {msg.knowledgeAnswer.sources.map(src => (
                              <div key={src.id} className="flex items-center gap-1.5">
                                <BookOpen size={10} className="text-slate-500 flex-shrink-0"/>
                                <span className="text-xs text-slate-500">
                                  الباب {src.chapter} — {src.title}
                                </span>
                              </div>
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

        <div className="px-4 pt-3 pb-2 border-t border-cyan-400/10 space-y-3">
          {/* Free-text input */}
          <div className="flex gap-2 items-center">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب سؤالك هنا..."
              dir="rtl"
              className="flex-1 rounded-2xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(34,211,238,0.2)',
              }}
            />
            <button
              onClick={handleTextSubmit}
              disabled={!inputValue.trim()}
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-40"
              style={{
                background: 'linear-gradient(135deg, #0a93b8, #06b6d4)',
                border: '1px solid rgba(34,211,238,0.4)',
              }}
              aria-label="إرسال">
              <Send size={15} className="text-white"/>
            </button>
          </div>
          {/* Quick chips */}
          <p className="text-xs text-cyan-400 text-center font-semibold flex items-center justify-center gap-1.5">
            <Sparkles size={13}/> اختر مشكلة وسأرشدك خطوة بخطوة
          </p>
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto no-scrollbar justify-center">
            {botResponses.map(response => (
              <button key={response.id} className="chip" onClick={() => handleQuickOption(response)}>
                {response.label}
                <Send size={11} className="flex-shrink-0"/>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
};
