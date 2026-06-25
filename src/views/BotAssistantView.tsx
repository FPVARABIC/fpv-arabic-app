import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { botResponses } from '../data/botResponses';
import type { BotResponse } from '../types';
import { buildKnowledgeAnswer } from '../data/knowledge/searchKnowledge';
import type { KnowledgeBotAnswer } from '../data/knowledge/searchKnowledge';
import { outOfDomainMessage } from '../data/knowledge/botKnowledgeRules';
import { fetchTrustedWebSearch } from '../services/webSearch';
import type { WebSearchResult } from '../services/webSearch';
import { Bot, Send, ChevronLeft, AlertTriangle, BookOpen, Globe, ExternalLink } from 'lucide-react';

interface Message {
  id: string;
  from: 'user' | 'bot';
  text?: string;
  response?: BotResponse;
  knowledgeAnswer?: KnowledgeBotAnswer;
  webResults?: WebSearchResult[];
  webLoading?: boolean;
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

const SAFETY_TITLE_WORDS = ['سلامة', 'خطر', 'معايرة', 'تحذير', 'أمان'];
function getSuggestionPrefix(id: string, title: string): string {
  if (SAFETY_TITLE_WORDS.some(w => title.includes(w))) return 'مهم للسلامة';
  const m = id.match(/^ch(\d+)/);
  const n = m ? parseInt(m[1]) : 10;
  if (n <= 2) return 'ابدأ هنا';
  if (n === 18) return 'خطوة لاحقة';
  return 'اقرأ أيضاً';
}

const CHAPTER_DISPLAY_MAP: [RegExp, string][] = [
  [/في هذا الباب/g, 'في هذا الجزء'],
  [/هذا الباب/g, 'هذا الجزء'],
  [/الأبواب/g, 'الأجزاء'],
  [/الباب/g, 'الجزء'],
  // Only replace standalone "باب" — not when embedded inside Arabic words (e.g. أسباب, شباب).
  // Lookbehind/lookahead on the full Arabic unicode block ؀-ۿ prevents false matches.
  [/(?<![؀-ۿ])باب(?![؀-ۿ])/g, 'جزء'],
];
function formatBotDisplayText(text: string): string {
  return CHAPTER_DISPLAY_MAP.reduce((t, [re, rep]) => t.replace(re, rep), text);
}

export const BotAssistantView: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const webSearchAbortRef = useRef<AbortController | null>(null);

  const isWelcome = messages.length === 0;

  useEffect(() => {
    if (!isWelcome) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isWelcome]);

  const handleQuickOption = (response: BotResponse) => {
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), from: 'user', text: response.label },
      { id: (Date.now() + 1).toString(), from: 'bot', response },
    ]);
  };

  const handleTextSubmit = () => {
    const query = inputValue.trim();
    if (!query) return;

    // Abort any previous in-flight web search so stale results never attach
    // to the wrong message.
    webSearchAbortRef.current?.abort();
    webSearchAbortRef.current = null;

    // Local answer is always synchronous and always comes first.
    const knowledgeAnswer = buildKnowledgeAnswer(query);

    // Web search fires only when:
    //   • the query is within the FPV/drone domain
    //   • local confidence is not already high (OR user explicitly asked for sources)
    //   • no safety note is present (safety-critical topics stay local-only)
    //   • the response is not a clarification menu (those don't need web context)
    const isOutOfDomain = knowledgeAnswer.answer === outOfDomainMessage;
    const isExplicitSourceRequest = knowledgeAnswer.nluIntent === 'brave_source_request';
    const shouldWebSearch =
      !isOutOfDomain &&
      (knowledgeAnswer.confidence !== 'high' || isExplicitSourceRequest) &&
      !knowledgeAnswer.safetyNote &&
      !knowledgeAnswer.clarificationMenu;

    const now = Date.now();
    const botMsgId = (now + 1).toString();

    setMessages(prev => [
      ...prev,
      { id: now.toString(), from: 'user', text: query },
      { id: botMsgId, from: 'bot', knowledgeAnswer, webLoading: shouldWebSearch },
    ]);
    setInputValue('');
    inputRef.current?.blur();

    if (!shouldWebSearch) return;

    // Start the async web search.
    const controller = new AbortController();
    webSearchAbortRef.current = controller;

    fetchTrustedWebSearch(query, { signal: controller.signal })
      .then(res => {
        // If another message arrived while this was in flight, ignore the result.
        if (webSearchAbortRef.current !== controller) return;

        const safeResults = res.results
          .filter(r => r.safeToDisplay)
          .slice(0, 3);

        setMessages(prev =>
          prev.map(m =>
            m.id === botMsgId
              ? { ...m, webLoading: false, webResults: safeResults }
              : m,
          ),
        );
      })
      .catch(() => {
        // fetchTrustedWebSearch never throws, but clear loading state defensively.
        if (webSearchAbortRef.current !== controller) return;
        setMessages(prev =>
          prev.map(m =>
            m.id === botMsgId
              ? { ...m, webLoading: false, webResults: [] }
              : m,
          ),
        );
      });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleTextSubmit();
  };

  // Navigation chips open app sections instead of querying the bot.
  const NAVIGATION_CHIPS: Record<string, string> = {
    'افتح قسم البناء': '/roadmap',
    'افتح قسم الدروس': '/lessons',
    'افتح قسم Betaflight': '/betaflight',
    'افتح قسم التقدم': '/progress',
    'افتح قسم المساعد': '/bot',
  };

  const handleChipSelect = (text: string) => {
    // Navigation chips go straight to a route.
    if (NAVIGATION_CHIPS[text]) {
      navigate(NAVIGATION_CHIPS[text]);
      return;
    }

    webSearchAbortRef.current?.abort();
    webSearchAbortRef.current = null;

    const knowledgeAnswer = buildKnowledgeAnswer(text);
    const isOutOfDomain = knowledgeAnswer.answer === outOfDomainMessage;
    const isExplicitSourceRequest = knowledgeAnswer.nluIntent === 'brave_source_request';
    // Skip web search when the response itself is a clarification menu or safety note.
    const shouldWebSearch =
      !isOutOfDomain &&
      (knowledgeAnswer.confidence !== 'high' || isExplicitSourceRequest) &&
      !knowledgeAnswer.safetyNote &&
      !knowledgeAnswer.clarificationMenu;

    const now = Date.now();
    const botMsgId = (now + 1).toString();

    setMessages(prev => [
      ...prev,
      { id: now.toString(), from: 'user', text },
      { id: botMsgId, from: 'bot', knowledgeAnswer, webLoading: shouldWebSearch },
    ]);

    if (!shouldWebSearch) return;

    const controller = new AbortController();
    webSearchAbortRef.current = controller;

    fetchTrustedWebSearch(text, { signal: controller.signal })
      .then(res => {
        if (webSearchAbortRef.current !== controller) return;
        const safeResults = res.results.filter(r => r.safeToDisplay).slice(0, 3);
        setMessages(prev =>
          prev.map(m =>
            m.id === botMsgId ? { ...m, webLoading: false, webResults: safeResults } : m,
          ),
        );
      })
      .catch(() => {
        if (webSearchAbortRef.current !== controller) return;
        setMessages(prev =>
          prev.map(m =>
            m.id === botMsgId ? { ...m, webLoading: false, webResults: [] } : m,
          ),
        );
      });
  };

  const BotCard = ({ msg }: { msg: Message }) => (
    <div className="flex gap-2 max-w-[88%]">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
        style={{ background: 'rgba(34,211,238,0.10)', border: '1px solid rgba(34,211,238,0.18)' }}>
        <Bot size={13} className="text-cyan-400" />
      </div>
      <div className="space-y-2 min-w-0">
        {msg.text && (
          <div className="glass-card-sm p-3">
            <p className="text-sm text-slate-200">{msg.text}</p>
          </div>
        )}
        {msg.response && (
          <div className="glass-card-sm p-3 space-y-2">
            <p className="text-sm text-slate-200">{formatBotDisplayText(msg.response.answer)}</p>
            <ol className="space-y-1">
              {msg.response.steps.map((s, i) => (
                <li key={i} className="text-xs text-slate-400 flex gap-1">
                  <span className="text-cyan-400 flex-shrink-0">{i + 1}.</span>{formatBotDisplayText(s)}
                </li>
              ))}
            </ol>
            {msg.response.actions.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {msg.response.actions.map((action, i) => (
                  <button key={i} className="btn-secondary text-xs py-1 px-2"
                    onClick={() => navigate(action.route)}>
                    <ChevronLeft size={12} /> {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {msg.knowledgeAnswer && (
          <div className="glass-card-sm p-3 space-y-2">
            <span className={`text-xs font-semibold ${confidenceColor[msg.knowledgeAnswer.confidence]}`}>
              {confidenceLabel[msg.knowledgeAnswer.confidence]}
            </span>
            <p className="text-sm text-slate-200">{formatBotDisplayText(msg.knowledgeAnswer.answer)}</p>
            {msg.knowledgeAnswer.steps.length > 0 && (
              <ol className="space-y-1">
                {msg.knowledgeAnswer.steps.map((s, i) => (
                  <li key={i} className="text-xs text-slate-400 flex gap-1">
                    <span className="text-cyan-400 flex-shrink-0">{i + 1}.</span>{formatBotDisplayText(s)}
                  </li>
                ))}
              </ol>
            )}
            {msg.knowledgeAnswer.safetyNote && (
              <div className="flex gap-2 rounded-xl p-2.5"
                style={{ background: 'rgba(251,146,60,0.10)', border: '1px solid rgba(251,146,60,0.35)' }}>
                <AlertTriangle size={13} className="text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-orange-300 leading-relaxed">{formatBotDisplayText(msg.knowledgeAnswer.safetyNote)}</p>
              </div>
            )}
            {msg.knowledgeAnswer.sources.length > 0 && (
              <div className="pt-1 space-y-1">
                <p className="text-xs text-slate-600 font-medium">اقتراحات داخل التطبيق</p>
                {msg.knowledgeAnswer.sources.slice(0, 3).map(src => (
                  <div key={src.id} className="flex items-start gap-1.5">
                    <BookOpen size={10} className="text-slate-500 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-400 leading-snug">
                      <span className="text-cyan-500/70">{getSuggestionPrefix(src.id, src.title)}:</span>
                      {' '}{formatBotDisplayText(src.title)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Clarification chips — interactive choices for vague / broad queries */}
        {msg.knowledgeAnswer?.clarificationMenu && (
          <div className="rounded-2xl p-3 space-y-2"
            style={{ background: 'rgba(34,211,238,0.04)', border: '1px solid rgba(34,211,238,0.12)' }}>
            <p className="text-xs text-cyan-400/70 font-medium text-right leading-relaxed">
              {msg.knowledgeAnswer.clarificationMenu.title}
            </p>
            <div className="flex flex-wrap gap-1.5 justify-end">
              {msg.knowledgeAnswer.clarificationMenu.choices.map((choice, i) => (
                <button
                  key={i}
                  onClick={() => handleChipSelect(choice)}
                  className="text-xs text-slate-300 rounded-xl px-3 py-1.5 text-right transition-colors active:scale-95"
                  style={{
                    background: 'rgba(34,211,238,0.08)',
                    border: '1px solid rgba(34,211,238,0.20)',
                  }}>
                  {choice}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up suggestion chips */}
        {msg.knowledgeAnswer?.followUpSuggestions && msg.knowledgeAnswer.followUpSuggestions.length > 0 && !msg.knowledgeAnswer.clarificationMenu && (
          <div className="flex flex-wrap gap-1.5 justify-end">
            {msg.knowledgeAnswer.followUpSuggestions.map((chip, i) => (
              <button
                key={i}
                onClick={() => handleChipSelect(chip)}
                className="text-[10px] text-slate-400 rounded-xl px-2.5 py-1 transition-colors active:scale-95"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Zone D — Trusted external web results (secondary, clearly labelled) */}
        {msg.knowledgeAnswer && (msg.webLoading || (msg.webResults && msg.webResults.length > 0)) && (
          <div className="rounded-2xl p-3 space-y-2"
            style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.12)' }}>

            {/* Section header */}
            <div className="flex items-center gap-1.5">
              <Globe size={11} className="text-amber-400/60 flex-shrink-0" />
              <p className="text-xs font-semibold text-amber-400/70">مصادر خارجية موثوقة</p>
            </div>

            {/* Loading state */}
            {msg.webLoading && (
              <p className="text-xs text-slate-500 text-right">أبحث في مصادر FPV موثوقة...</p>
            )}

            {/* Results */}
            {!msg.webLoading && msg.webResults && msg.webResults.length > 0 && (
              <>
                <p className="text-[10px] text-slate-600 leading-relaxed text-right">
                  نتائج من مواقع FPV موثوقة للاطلاع، وليست بديلاً عن قواعد السلامة داخل التطبيق.
                </p>
                <div className="space-y-2">
                  {msg.webResults.slice(0, 3).map((result, i) => (
                    <div key={i} className="rounded-xl p-2.5"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="text-xs font-medium text-slate-300 leading-snug mb-1">{result.title}</p>
                      {result.snippet && (
                        <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">{result.snippet}</p>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-cyan-700/60 font-mono truncate">{result.domain}</span>
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-cyan-500/70 hover:text-cyan-400 transition-colors flex-shrink-0"
                        >
                          فتح المصدر
                          <ExternalLink size={9} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <AppShell>
      <Header title="مساعد FPV" />
      <div className="flex flex-col h-[calc(100vh-9rem)]"
        style={{ background: [
          'radial-gradient(ellipse 70% 38% at 50% 0%, rgba(6,182,212,0.13) 0%, transparent 70%)',
          'radial-gradient(ellipse 38% 22% at 12% 96%, rgba(34,211,238,0.07) 0%, transparent 60%)',
          'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(34,211,238,0.035) 40px)',
          'repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(34,211,238,0.035) 40px)',
        ].join(', ') }}>

        {isWelcome ? (
          /* ── Welcome state: input is the main focus ─────────── */
          <div className="flex flex-col flex-1 overflow-y-auto px-4">

            {/* Bot persona */}
            <div className="flex items-center gap-3 pt-5 pb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(34,211,238,0.16), rgba(6,182,212,0.08))',
                  border: '1px solid rgba(34,211,238,0.22)',
                }}>
                <Bot size={20} className="text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">مساعد FPV</p>
                <p className="text-xs text-slate-500">يعرف كل شيء عن البناء والإعداد</p>
              </div>
            </div>

            {/* Friendly intro */}
            <div className="rounded-2xl px-4 py-3 mb-5"
              style={{
                background: 'rgba(34,211,238,0.05)',
                border: '1px solid rgba(34,211,238,0.10)',
              }}>
              <p className="text-sm text-slate-300 leading-relaxed text-right">
                أنا هنا لأساعدك خطوة بخطوة. اكتب سؤالك أو اختر اقتراحاً بسيطاً للبدء.
              </p>
            </div>

            {/* Input — main focus */}
            <div className="mb-1">
              <div className="flex gap-2 items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="اكتب سؤالك هنا..."
                  dir="rtl"
                  className="flex-1 rounded-2xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(34,211,238,0.28)',
                    boxShadow: '0 0 18px rgba(34,211,238,0.05)',
                  }}
                />
                <button
                  onClick={handleTextSubmit}
                  disabled={!inputValue.trim()}
                  className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-35"
                  style={{
                    background: 'linear-gradient(135deg, #0a93b8, #06b6d4)',
                    border: '1px solid rgba(34,211,238,0.4)',
                  }}
                  aria-label="إرسال">
                  <Send size={15} className="text-white" />
                </button>
              </div>
              <p className="text-xs text-slate-600 text-right mt-1.5 px-1">
                اسألني بحرية عن البناء، التوصيل، Betaflight، البطارية أو المشاكل.
              </p>
            </div>

            {/* Optional suggestions — clearly secondary */}
            <div className="mt-5 pb-4">
              <p className="text-xs text-slate-600 font-medium mb-2 text-right">اقتراحات اختيارية</p>
              <div className="flex flex-wrap gap-1.5">
                {botResponses.map(response => (
                  <button
                    key={response.id}
                    onClick={() => handleQuickOption(response)}
                    className="text-xs text-slate-400 rounded-xl px-3 py-1.5 transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}>
                    {response.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

        ) : (
          /* ── Active chat state ───────────────────────────────── */
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 fade-in">
              {messages.map(msg => (
                <div key={msg.id}
                  className={`flex ${msg.from === 'user' ? 'justify-start' : 'justify-end'}`}>
                  {msg.from === 'bot'
                    ? <BotCard msg={msg} />
                    : (
                      <div className="max-w-[80%]">
                        <div className="bg-cyan-400/10 border border-cyan-400/20 rounded-2xl px-3 py-2">
                          <p className="text-sm text-cyan-300">{msg.text}</p>
                        </div>
                      </div>
                    )}
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {/* Input bar */}
            <div className="px-4 pt-3 pb-2 border-t border-white/5 space-y-2">
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
                    border: '1px solid rgba(34,211,238,0.18)',
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
                  <Send size={15} className="text-white" />
                </button>
              </div>
              {/* Compact suggestion pills in active chat */}
              <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto no-scrollbar items-center">
                <span className="text-xs text-slate-700 flex-shrink-0">اقتراحات:</span>
                {botResponses.map(response => (
                  <button
                    key={response.id}
                    onClick={() => handleQuickOption(response)}
                    className="text-xs text-slate-500 rounded-xl px-2.5 py-1 flex-shrink-0"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                    {response.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

      </div>
    </AppShell>
  );
};
