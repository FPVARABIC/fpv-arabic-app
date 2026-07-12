import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { SafetyWarning } from '../components/SafetyWarning';
import { analyzeAndComposeBotV2Answer, createEmptyContext, type AssistantSessionContext } from '../data/knowledge/botV2/engine';
import type { BotV2Answer, BotV2Chip, BotV2RiskLevel } from '../data/knowledge/botV2/types';
import { getWarningCardProps } from '../data/knowledge/botV2/contextualWarning';
import { Send, ChevronLeft, FlaskConical } from 'lucide-react';

// ── Quadcopter avatar (inline SVG, top-down view) ─────────────────────────────

const QuadcopterAvatar: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 10.5L6 5.5"   stroke="currentColor" strokeWidth="2"   strokeLinecap="round"/>
    <path d="M12 10.5L18 5.5"  stroke="currentColor" strokeWidth="2"   strokeLinecap="round"/>
    <path d="M12 13.5L6 18.5"  stroke="currentColor" strokeWidth="2"   strokeLinecap="round"/>
    <path d="M12 13.5L18 18.5" stroke="currentColor" strokeWidth="2"   strokeLinecap="round"/>
    <rect x="9.5" y="9.5" width="5" height="5" rx="1.5" fill="currentColor"/>
    <circle cx="6"  cy="5.5"  r="2.5" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15"/>
    <circle cx="18" cy="5.5"  r="2.5" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15"/>
    <circle cx="6"  cy="18.5" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15"/>
    <circle cx="18" cy="18.5" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15"/>
  </svg>
);

// ── Risk presentation ─────────────────────────────────────────────────────────

const RISK_BADGE_CLS: Record<BotV2RiskLevel, string | undefined> = {
  none:     undefined,
  low:      'bg-cyan-400/10 border border-cyan-400/20 text-cyan-400',
  medium:   'bg-amber-500/10 border border-amber-500/30 text-amber-400',
  critical: 'bg-red-500/10 border border-red-500/30 text-red-400',
};

const RISK_LABEL: Record<BotV2RiskLevel, string | undefined> = {
  none:     undefined,
  low:      'تنبيه',
  medium:   'تحذير',
  critical: 'خطر',
};

// ── Starter suggestions (shown before first query) ────────────────────────────

const SUGGESTIONS: readonly string[] = [
  'كيف أبني درون FPV؟',
  'ما هو Flight Controller؟',
  'كيف أوصّل الـ ESC؟',
  'مشكلة في Betaflight',
];

// ── Thread message type ───────────────────────────────────────────────────────

interface ThreadMsg {
  id: string;
  from: 'user' | 'bot';
  text?: string;
  answer?: BotV2Answer;
}

// ── Main view ─────────────────────────────────────────────────────────────────

export const BotV2AssistantView: React.FC = () => {
  const navigate = useNavigate();
  const [msgs, setMsgs] = useState<ThreadMsg[]>([{
    id: '0', from: 'bot',
    text: 'مرحبًا! أنا مساعد FPV الذكي. اكتب سؤالك بالعربي أو الإنجليزي وسأجيبك:',
  }]);
  const [input, setInput] = useState('');
  const [sessionContext, setSessionContext] = useState<AssistantSessionContext>(createEmptyContext());
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollAreaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  const sendQuery = (query: string) => {
    const q = query.trim();
    if (!q) return;
    let answer: BotV2Answer;
    try {
      const turn = analyzeAndComposeBotV2Answer(q, sessionContext);
      answer = turn.answer;
      setSessionContext(turn.nextContext);
    } catch {
      setMsgs(prev => [...prev,
        { id: Date.now().toString(), from: 'user', text: q },
        { id: (Date.now() + 1).toString(), from: 'bot', text: 'حدث خطأ. حاول مرة أخرى.' },
      ]);
      return;
    }
    setMsgs(prev => [...prev,
      { id: Date.now().toString(), from: 'user', text: q },
      { id: (Date.now() + 1).toString(), from: 'bot', answer },
    ]);
  };

  const handleChip = (chip: BotV2Chip) => {
    if (chip.route) { navigate(chip.route); return; }
    if (chip.query) sendQuery(chip.query);
  };

  return (
    <AppShell>
      <Header
        title="مساعد FPV"
        rightAction={
          <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-1 rounded-full">
            <FlaskConical size={11}/> تجريبي
          </span>
        }
      />
      <div
        className="flex flex-col h-[calc(100vh-9rem)]"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(2,8,15,0.88) 0%, rgba(2,8,15,0.72) 40%, rgba(2,8,15,0.65) 100%), url('/assets/bot-chat-background.png')`,
          backgroundSize: 'auto, cover',
          backgroundPosition: 'center center, center 35%',
          backgroundRepeat: 'no-repeat, no-repeat',
        }}
      >

        {/* Message thread — scrolls internally, input stays fixed below */}
        <div
          ref={scrollAreaRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar"
        >
          {msgs.map(msg => (
            <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-start' : 'justify-end'}`}>
              {msg.from === 'bot' ? (
                <div className="flex flex-row-reverse gap-2 max-w-[88%]">
                  <div className="w-8 h-8 rounded-full bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center flex-shrink-0 mt-1 text-cyan-400">
                    <QuadcopterAvatar/>
                  </div>
                  <div className="space-y-2 min-w-0">
                    {msg.text && (
                      <div className="glass-card-sm p-3">
                        <p className="text-sm text-slate-200">{msg.text}</p>
                      </div>
                    )}
                    {msg.answer && (
                      <BotV2Bubble
                        answer={msg.answer}
                        onChip={handleChip}
                        onLink={r => navigate(r)}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="max-w-[75%]">
                  <div className="bg-cyan-400/10 border border-cyan-400/20 rounded-2xl px-3 py-2">
                    <p className="text-sm text-cyan-300">{msg.text}</p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Starter suggestions — disappear after the first query is sent */}
          {msgs.length === 1 && (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-slate-500 text-center">اسأل مثلاً:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map(q => (
                  <button key={q} className="chip text-xs" onClick={() => sendQuery(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="px-4 pt-3 pb-5 border-t border-cyan-400/10">
          <form
            onSubmit={e => {
              e.preventDefault();
              const q = input.trim();
              if (!q) return;
              setInput('');
              sendQuery(q);
            }}
            className="flex gap-2 items-center"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="اكتب سؤالك..."
              dir="auto"
              className="flex-1 bg-[rgba(13,24,38,0.8)] border border-cyan-400/20 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50 transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-11 h-11 rounded-full bg-cyan-400/10 border border-cyan-400/25 flex items-center justify-center text-cyan-400 hover:bg-cyan-400/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
            >
              <Send size={16}/>
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
};

// ── Answer bubble ─────────────────────────────────────────────────────────────

interface BubbleProps {
  answer: BotV2Answer;
  onChip: (chip: BotV2Chip) => void;
  onLink: (route: string) => void;
}

const BotV2Bubble: React.FC<BubbleProps> = ({ answer, onChip, onLink }) => {
  const badgeCls = RISK_BADGE_CLS[answer.riskLevel];
  const badgeLabel = RISK_LABEL[answer.riskLevel];

  return (
    <div className="glass-card-sm p-3 space-y-2.5">

      {badgeCls && badgeLabel && (
        <div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${badgeCls}`}>
            {badgeLabel}
          </span>
        </div>
      )}

      {(() => {
        const warningCard = getWarningCardProps(answer);
        return warningCard && <SafetyWarning message={warningCard.message} type={warningCard.type} />;
      })()}

      <p className="text-sm text-slate-200 leading-relaxed">{answer.shortAnswer}</p>

      {answer.steps && answer.steps.length > 0 && (
        <ol className="space-y-1.5 pt-0.5">
          {answer.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-cyan-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-cyan-400 text-xs font-bold">{i + 1}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{step}</p>
            </li>
          ))}
        </ol>
      )}

      {answer.chips.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-0.5">
          {answer.chips.map((chip, i) => (
            <button key={i} className="chip" onClick={() => onChip(chip)}>
              {chip.label}
              {chip.route && <ChevronLeft size={11}/>}
            </button>
          ))}
        </div>
      )}

      {answer.links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {answer.links.map((link, i) => (
            <button key={i} className="btn-secondary text-xs py-1 px-3" onClick={() => onLink(link.route)}>
              <ChevronLeft size={12}/>{link.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
