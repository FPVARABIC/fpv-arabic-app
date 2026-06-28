import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Send, ChevronLeft, FlaskConical } from 'lucide-react';
import { useBotOverlay } from '../contexts/BotOverlayContext';
import { analyzeAndComposeBotV2Answer } from '../data/knowledge/botV2/engine';
import type { BotV2Answer, BotV2Chip, BotV2RiskLevel } from '../data/knowledge/botV2/types';
import { SafetyWarning } from './SafetyWarning';

// ── Avatar SVG ────────────────────────────────────────────────────────────────

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

// ── Starter suggestions ───────────────────────────────────────────────────────

const SUGGESTIONS: readonly string[] = [
  'كيف أبني درون FPV؟',
  'ما هو Flight Controller؟',
  'كيف أوصّل الـ ESC؟',
  'مشكلة في Betaflight',
];

// ── Thread types ──────────────────────────────────────────────────────────────

interface ThreadMsg {
  id: string;
  from: 'user' | 'bot';
  text?: string;
  answer?: BotV2Answer;
}

// ── Overlay ───────────────────────────────────────────────────────────────────

export const BotV2Overlay: React.FC = () => {
  const { isOpen, closeBot } = useBotOverlay();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [msgs, setMsgs] = useState<ThreadMsg[]>([{
    id: '0', from: 'bot',
    text: 'مرحبًا! أنا مساعد FPV الذكي. اكتب سؤالك بالعربي أو الإنجليزي وسأجيبك:',
  }]);
  const [input, setInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    closeBot();
  }, [pathname, closeBot]);

  useEffect(() => {
    const el = scrollAreaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  const sendQuery = (query: string) => {
    const q = query.trim();
    if (!q) return;
    let answer: BotV2Answer;
    try {
      answer = analyzeAndComposeBotV2Answer(q);
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
    if (chip.route) { closeBot(); navigate(chip.route); return; }
    if (chip.query) sendQuery(chip.query);
  };

  const handleLink = (route: string) => {
    closeBot();
    navigate(route);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: '20vh',
          background: 'rgba(2,8,18,0.6)',
          backdropFilter: 'blur(3px)',
          zIndex: 29,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
        onClick={closeBot}
        aria-hidden="true"
      />

      {/* Panel — slides up from bottom */}
      <div
        style={{
          position: 'fixed', top: '20vh', bottom: '80px', left: 0, right: 0,
          zIndex: 30,
          background: '#030a15',
          borderRadius: '22px 22px 0 0',
          border: '1px solid rgba(34,211,238,0.13)',
          borderBottom: 'none',
          transform: isOpen ? 'translateY(0)' : 'translateY(106%)',
          transition: 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
          pointerEvents: isOpen ? 'auto' : 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        role="dialog"
        aria-label="مساعد FPV"
        aria-modal={isOpen}
      >
        {/* Grab handle */}
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.12)', margin: '10px auto 0', flexShrink: 0 }}/>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', padding: '10px 16px 12px', gap: '12px',
          borderBottom: '1px solid rgba(34,211,238,0.08)', flexShrink: 0,
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '12px', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(24,230,230,0.18), rgba(0,160,255,0.12))',
            border: '1px solid rgba(34,211,238,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#22d3ee',
          }}>
            <QuadcopterAvatar/>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff' }}>مساعد FPV</p>
          </div>
          <span style={{
            fontSize: '11px', color: '#fbbf24',
            background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)',
            padding: '2px 8px', borderRadius: '9999px',
            display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0,
          }}>
            <FlaskConical size={10}/> تجريبي
          </span>
          <button
            onClick={closeBot}
            aria-label="إغلاق المساعد"
            style={{
              width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)',
              color: '#94a3b8', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16}/>
          </button>
        </div>

        {/* Message thread */}
        <div
          ref={scrollAreaRef}
          className="no-scrollbar"
          style={{
            flex: 1, minHeight: 0, overflowY: 'auto',
            padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px',
          }}
        >
          {msgs.map(msg => (
            <div key={msg.id} style={{ display: 'flex', justifyContent: msg.from === 'user' ? 'flex-start' : 'flex-end' }}>
              {msg.from === 'bot' ? (
                <div style={{ display: 'flex', gap: '8px', maxWidth: '88%' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: '4px', color: '#22d3ee',
                  }}>
                    <QuadcopterAvatar/>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                    {msg.text && (
                      <div className="glass-card-sm" style={{ padding: '10px 12px' }}>
                        <p style={{ margin: 0, fontSize: '15px', color: '#e2e8f0', lineHeight: 1.6 }}>{msg.text}</p>
                      </div>
                    )}
                    {msg.answer && (
                      <OverlayBubble answer={msg.answer} onChip={handleChip} onLink={handleLink}/>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ maxWidth: '75%' }}>
                  <div style={{
                    background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)',
                    borderRadius: '16px', padding: '8px 12px',
                  }}>
                    <p style={{ margin: 0, fontSize: '15px', color: '#67e8f9', lineHeight: 1.5 }}>{msg.text}</p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {msgs.length === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>اسأل مثلاً:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {SUGGESTIONS.map(q => (
                  <button key={q} className="chip" style={{ fontSize: '12px' }} onClick={() => sendQuery(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(34,211,238,0.08)', flexShrink: 0 }}>
          <form
            onSubmit={e => {
              e.preventDefault();
              const q = input.trim();
              if (!q) return;
              setInput('');
              sendQuery(q);
            }}
            style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="اكتب سؤالك..."
              dir="auto"
              style={{
                flex: 1,
                background: 'rgba(13,24,38,0.8)',
                border: '1px solid rgba(34,211,238,0.2)',
                borderRadius: '20px',
                padding: '10px 16px',
                fontSize: '14px',
                color: '#fff',
                outline: 'none',
              }}
              className="placeholder:text-slate-500 focus:border-cyan-400/50 transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              style={{
                width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
                background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#22d3ee', cursor: 'pointer',
              }}
              className="hover:bg-cyan-400/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Send size={15}/>
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

// ── Answer bubble ─────────────────────────────────────────────────────────────

interface BubbleProps {
  answer: BotV2Answer;
  onChip: (chip: BotV2Chip) => void;
  onLink: (route: string) => void;
}

const OverlayBubble: React.FC<BubbleProps> = ({ answer, onChip, onLink }) => {
  const badgeCls = RISK_BADGE_CLS[answer.riskLevel];
  const badgeLabel = RISK_LABEL[answer.riskLevel];

  return (
    <div className="glass-card-sm" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {badgeCls && badgeLabel && (
        <div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${badgeCls}`}>{badgeLabel}</span>
        </div>
      )}

      {answer.warning && (
        <SafetyWarning
          message={answer.warning}
          type={answer.riskLevel === 'critical' ? 'danger' : 'warning'}
        />
      )}

      <p style={{ margin: 0, fontSize: '15px', color: '#e2e8f0', lineHeight: 1.6 }}>{answer.shortAnswer}</p>

      {answer.steps && answer.steps.length > 0 && (
        <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {answer.steps.map((step, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <div style={{
                width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                background: 'rgba(34,211,238,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginTop: '2px',
              }}>
                <span style={{ color: '#22d3ee', fontSize: '11px', fontWeight: 700 }}>{i + 1}</span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6 }}>{step}</p>
            </li>
          ))}
        </ol>
      )}

      {answer.chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {answer.chips.map((chip, i) => (
            <button key={i} className="chip" style={{ fontSize: '12px' }} onClick={() => onChip(chip)}>
              {chip.label}
              {chip.route && <ChevronLeft size={10}/>}
            </button>
          ))}
        </div>
      )}

      {answer.links.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {answer.links.map((link, i) => (
            <button
              key={i}
              className="btn-secondary"
              style={{ fontSize: '12px', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={() => onLink(link.route)}
            >
              <ChevronLeft size={11}/>{link.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
