import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import {
  ArrowRight, ChevronLeft, Stethoscope, BatteryWarning, Fan, OctagonAlert,
  CircleHelp, RotateCcw, ShieldAlert,
} from 'lucide-react';
import { allDxTrees, getDxTree } from '../data/kb/diagnostics/trees';
import { DX_RISK_LABEL_AR, DX_CHECK_CLASS_LABEL_AR, type DxNode } from '../data/kb/diagnostics/types';
import { resolveLinkRoute, getArticle } from '../data/kb/registry';
import { troubleshootingData } from '../data/troubleshootingData';
import { RichText } from '../components/kb/Term';

const RISK_COLOR: Record<string, string> = {
  low: '#047857',
  medium: '#b45309',
  high: '#c2410c',
  critical: '#b91c1c',
};

/**
 * Symptom-first diagnostics.
 *
 * Two things the old flat troubleshooting list could not do and this can:
 * the risk posture (battery out? props off?) is shown BEFORE the first step,
 * and every check branches — each outcome states what the observation *means*
 * and where it leads, rather than handing over one answer per problem.
 */
export const DiagnoseView: React.FC = () => {
  const { treeId } = useParams<{ treeId?: string }>();
  const navigate = useNavigate();
  const tree = treeId ? getDxTree(treeId) : undefined;

  const [nodeId, setNodeId] = useState<string | null>(tree ? tree.rootNodeId : null);
  const [history, setHistory] = useState<{ nodeId: string; outcomeLabel: string }[]>([]);
  const [done, setDone] = useState<{ conclusion: string; actions?: string[]; likelyDamaged?: boolean } | null>(null);
  const [started, setStarted] = useState(false);
  const [renderedTreeId, setRenderedTreeId] = useState(tree?.id);

  // Derived-state resynchronisation during render (same reasoning as
  // KbArticleView): switching to a different symptom must not inherit the
  // previous tree's position or answer history, and doing it in an effect would
  // render one frame of the old tree's state against the new tree's content.
  if (tree?.id !== renderedTreeId) {
    setRenderedTreeId(tree?.id);
    setNodeId(tree ? tree.rootNodeId : null);
    setHistory([]);
    setDone(null);
    setStarted(false);
  }

  useEffect(() => { window.scrollTo(0, 0); }, [treeId]);

  // ── Index ────────────────────────────────────────────────────────────────
  if (!treeId) {
    return (
      <AppShell tint="purple">
        <Header
          title="التشخيص"
          rightAction={
            <button
              onClick={() => navigate('/kb')}
              aria-label="رجوع"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0f172a', display: 'flex' }}
            >
              <ArrowRight size={20} />
            </button>
          }
        />
        <div className="fade-in" style={{ background: '#f8fafc', minHeight: '100%', padding: '14px 16px 28px' }}>
          <p style={{ fontSize: 13, lineHeight: 1.85, color: '#334155', margin: '0 0 14px' }}>
            اختر ما تراه أنت، لا القطعة التي تشك فيها. كل شجرة تبدأ بدرجة الخطر وإجراءات السلامة،
            ثم تنتقل من الفحص الأقل خطراً إلى الأكثر، وتشرح معنى كل نتيجة بدل إعطاء حلّ واحد.
          </p>

          {allDxTrees.map(t => (
            <button
              key={t.id}
              type="button"
              data-testid={`dx-item-${t.id}`}
              onClick={() => navigate(`/diagnose/${t.id}`)}
              style={{
                display: 'block', width: '100%', textAlign: 'right', background: '#ffffff',
                border: '1px solid rgba(15,23,42,0.10)', borderRadius: 14, padding: 13,
                marginBottom: 9, cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Stethoscope size={17} style={{ color: '#a21caf', flexShrink: 0, marginTop: 2 }} aria-hidden />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a', lineHeight: 1.6 }}>{t.titleAr}</div>
                  <div style={{ fontSize: 12, lineHeight: 1.7, color: '#64748b', marginTop: 3 }}>
                    <RichText text={t.symptomAr} idKey={`sym-${t.id}`} />
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 7 }}>
                    <span style={{ ...CHIP, background: `${RISK_COLOR[t.risk]}1a`, color: RISK_COLOR[t.risk] }}>
                      {DX_RISK_LABEL_AR[t.risk]}
                    </span>
                    <span style={CHIP}>{t.nodes.length} فحوص</span>
                  </div>
                </div>
                <ChevronLeft size={15} style={{ color: '#94a3b8', flexShrink: 0, marginTop: 5 }} aria-hidden />
              </div>
            </button>
          ))}

          <div
            style={{
              marginTop: 16, background: '#ffffff', border: '1px solid rgba(15,23,42,0.09)',
              borderRadius: 14, padding: 13,
            }}
          >
            <h3 style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', margin: '0 0 4px' }}>مشاكل وحلول سريعة</h3>
            <p style={{ fontSize: 11.5, lineHeight: 1.7, color: '#64748b', margin: '0 0 9px' }}>
              قائمة مختصرة موجودة في التطبيق منذ البداية — تُعرَض هنا لأنها كانت غير قابلة للوصول.
            </p>
            <button
              type="button"
              data-testid="dx-legacy-link"
              onClick={() => navigate('/troubleshooting')}
              style={{
                width: '100%', textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(148,163,184,0.09)', border: 'none', borderRadius: 10,
                padding: '9px 11px', cursor: 'pointer',
              }}
            >
              <CircleHelp size={14} style={{ color: '#475569', flexShrink: 0 }} aria-hidden />
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                {troubleshootingData.length} مشاكل شائعة مع خطواتها
              </span>
              <ChevronLeft size={14} style={{ color: '#94a3b8', flexShrink: 0 }} aria-hidden />
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!tree) {
    return (
      <AppShell tint="purple">
        <Header title="التشخيص" />
        <div style={{ padding: 20 }}>
          <p style={{ fontSize: 14, color: '#334155' }}>شجرة التشخيص هذه غير موجودة.</p>
          <button className="btn-secondary" onClick={() => navigate('/diagnose')}>كل الأعراض</button>
        </div>
      </AppShell>
    );
  }

  const node: DxNode | undefined = nodeId ? tree.nodes.find(n => n.id === nodeId) : undefined;

  const choose = (outcomeId: string) => {
    if (!node) return;
    const o = node.outcomes.find(x => x.id === outcomeId);
    if (!o) return;
    setHistory(h => [...h, { nodeId: node.id, outcomeLabel: o.label }]);
    if (o.next) {
      setNodeId(o.next);
      setDone(null);
    } else {
      setNodeId(null);
      setDone({ conclusion: o.conclusion ?? '', actions: o.actions, likelyDamaged: o.likelyDamaged });
    }
    window.scrollTo(0, 0);
  };

  const restart = () => {
    setNodeId(tree.rootNodeId);
    setHistory([]);
    setDone(null);
    setStarted(true);
    window.scrollTo(0, 0);
  };

  return (
    <AppShell tint="purple">
      <Header
        title="التشخيص"
        rightAction={
          <button
            onClick={() => navigate('/diagnose')}
            aria-label="رجوع"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0f172a', display: 'flex' }}
          >
            <ArrowRight size={20} />
          </button>
        }
      />

      <div className="fade-in" style={{ background: '#f8fafc', minHeight: '100%', padding: '14px 16px 28px' }}>
        <h1 data-testid="dx-title" style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.6 }}>
          {tree.titleAr}
        </h1>
        <p style={{ fontSize: 12.5, lineHeight: 1.8, color: '#475569', margin: '5px 0 0' }}>
          <RichText text={tree.symptomAr} idKey="sym" />
        </p>

        {/* Safety posture — always shown BEFORE any step. */}
        <div
          data-testid="dx-safety"
          style={{
            marginTop: 12, background: `${RISK_COLOR[tree.risk]}0f`,
            border: `1px solid ${RISK_COLOR[tree.risk]}55`, borderRadius: 14, padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            <ShieldAlert size={16} style={{ color: RISK_COLOR[tree.risk] }} aria-hidden />
            <strong style={{ fontSize: 13, color: RISK_COLOR[tree.risk] }}>{DX_RISK_LABEL_AR[tree.risk]}</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#1e293b' }}>
              <Fan size={14} style={{ color: tree.removeProps ? '#b91c1c' : '#64748b', flexShrink: 0 }} aria-hidden />
              {tree.removeProps ? 'انزع المراوح قبل البدء — إلزامي' : 'لا يتطلب نزع المراوح'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#1e293b' }}>
              <BatteryWarning size={14} style={{ color: tree.disconnectBattery ? '#b91c1c' : '#64748b', flexShrink: 0 }} aria-hidden />
              {tree.disconnectBattery ? 'افصل البطارية قبل البدء' : 'لا يتطلب فصل البطارية'}
            </div>
          </div>
        </div>

        {/* Quick checks — before entering the tree. */}
        <div style={{ marginTop: 12, background: '#ffffff', border: '1px solid rgba(15,23,42,0.09)', borderRadius: 14, padding: 13 }}>
          <strong style={{ fontSize: 12.5, color: '#0f172a', display: 'block', marginBottom: 8 }}>استبعد هذه أولاً</strong>
          <ul style={{ margin: 0, paddingInlineStart: 18 }}>
            {tree.quickChecks.map((q, i) => (
              <li key={i} style={{ fontSize: 12.5, lineHeight: 1.85, color: '#334155', marginBottom: 5 }}>
                <RichText text={q} idKey={`qc${i}`} />
              </li>
            ))}
          </ul>
        </div>

        {!started && !done && (
          <button
            type="button"
            data-testid="dx-start"
            onClick={restart}
            className="press"
            style={{
              width: '100%', marginTop: 14, padding: '12px', borderRadius: 13, cursor: 'pointer',
              background: 'linear-gradient(135deg,#a21caf,#c026d3)', color: '#ffffff',
              border: 'none', fontSize: 13.5, fontWeight: 800,
            }}
          >
            ابدأ التشخيص خطوة بخطوة
          </button>
        )}

        {/* Path so far */}
        {history.length > 0 && (
          <div style={{ marginTop: 14 }} data-testid="dx-history">
            <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 6 }}>ما فحصته حتى الآن</div>
            {history.map((h, i) => {
              const n = tree.nodes.find(x => x.id === h.nodeId);
              return (
                <div
                  key={i}
                  style={{
                    fontSize: 11.5, lineHeight: 1.7, color: '#475569', background: 'rgba(148,163,184,0.10)',
                    borderRadius: 9, padding: '7px 10px', marginBottom: 5,
                  }}
                >
                  <strong style={{ color: '#0f172a' }}>{n?.question}</strong>
                  <div style={{ color: '#a21caf', marginTop: 2 }}>← {h.outcomeLabel}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Current node */}
        {started && node && (
          <div
            data-testid={`dx-node-${node.id}`}
            style={{
              marginTop: 14, background: '#ffffff', border: '1px solid rgba(162,28,175,0.30)',
              borderRadius: 16, padding: 14,
            }}
          >
            <span style={{ ...CHIP, background: 'rgba(162,28,175,0.10)', color: '#a21caf' }}>
              {DX_CHECK_CLASS_LABEL_AR[node.checkClass]}
            </span>
            <h2 style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', margin: '9px 0 0', lineHeight: 1.7 }}>
              <RichText text={node.question} idKey={`nq-${node.id}`} />
            </h2>

            <div style={{ marginTop: 11 }}>
              <div style={LABEL}>كيف تفحص</div>
              <p style={BODY}><RichText text={node.how} idKey={`nh-${node.id}`} /></p>
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={LABEL}>النتيجة السليمة المتوقعة</div>
              <p style={BODY}><RichText text={node.expected} idKey={`ne-${node.id}`} /></p>
            </div>

            {node.safetyNote && (
              <div
                style={{
                  marginTop: 11, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.35)',
                  borderRadius: 12, padding: '10px 12px', display: 'flex', gap: 8,
                }}
                role="alert"
              >
                <OctagonAlert size={15} style={{ color: '#b91c1c', flexShrink: 0, marginTop: 1 }} aria-hidden />
                <div style={{ fontSize: 12.5, lineHeight: 1.8, color: '#7f1d1d' }}>
                  <RichText text={node.safetyNote} idKey={`ns-${node.id}`} />
                </div>
              </div>
            )}

            <div style={{ marginTop: 13 }}>
              <div style={LABEL}>ماذا رأيت؟</div>
              {node.outcomes.map(o => (
                <button
                  key={o.id}
                  type="button"
                  data-testid={`dx-outcome-${node.id}-${o.id}`}
                  onClick={() => choose(o.id)}
                  style={{
                    width: '100%', textAlign: 'right', background: 'rgba(162,28,175,0.05)',
                    border: '1px solid rgba(162,28,175,0.25)', borderRadius: 12,
                    padding: '11px 12px', marginBottom: 8, cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', lineHeight: 1.6 }}>
                    <RichText text={o.label} idKey={`ol-${o.id}`} />
                  </div>
                  <div style={{ fontSize: 11.5, lineHeight: 1.75, color: '#64748b', marginTop: 4 }}>
                    <RichText text={o.meaning} idKey={`om-${o.id}`} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conclusion */}
        {done && (
          <div
            data-testid="dx-conclusion"
            style={{
              marginTop: 14,
              background: done.likelyDamaged ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)',
              border: `1px solid ${done.likelyDamaged ? 'rgba(239,68,68,0.35)' : 'rgba(16,185,129,0.35)'}`,
              borderRadius: 16, padding: 14,
            }}
          >
            <strong style={{ fontSize: 14, color: done.likelyDamaged ? '#b91c1c' : '#047857', display: 'block', marginBottom: 7 }}>
              {done.likelyDamaged ? 'الاستنتاج: القطعة تالفة على الأرجح' : 'الاستنتاج'}
            </strong>
            <p style={{ ...BODY, marginBottom: done.actions ? 11 : 0 }}>
              <RichText text={done.conclusion} idKey="concl" />
            </p>
            {done.actions && done.actions.length > 0 && (
              <>
                <div style={LABEL}>ماذا تفعل الآن</div>
                <ol style={{ margin: 0, paddingInlineStart: 18 }}>
                  {done.actions.map((a, i) => (
                    <li key={i} style={{ fontSize: 12.5, lineHeight: 1.85, color: '#1e293b', marginBottom: 5 }}>
                      <RichText text={a} idKey={`act${i}`} />
                    </li>
                  ))}
                </ol>
              </>
            )}
            <button
              type="button"
              data-testid="dx-restart"
              onClick={restart}
              style={{
                marginTop: 13, display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
                borderRadius: 11, border: '1px solid rgba(15,23,42,0.12)', background: '#ffffff',
                fontSize: 12.5, fontWeight: 800, color: '#475569', cursor: 'pointer',
              }}
            >
              <RotateCcw size={14} aria-hidden />
              أعد التشخيص من البداية
            </button>
          </div>
        )}

        {/* Stop conditions — always visible */}
        <div
          data-testid="dx-stop"
          style={{
            marginTop: 16, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.4)',
            borderRadius: 14, padding: '12px 14px',
          }}
        >
          <strong style={{ fontSize: 12.5, color: '#b45309', display: 'block', marginBottom: 7 }}>متى تتوقف</strong>
          <ul style={{ margin: 0, paddingInlineStart: 18 }}>
            {tree.stopConditions.map((s, i) => (
              <li key={i} style={{ fontSize: 12.5, lineHeight: 1.85, color: '#78350f', marginBottom: 5 }}>
                <RichText text={s} idKey={`sc${i}`} />
              </li>
            ))}
          </ul>
        </div>

        {/* Links */}
        {tree.links.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: '#64748b', marginBottom: 8 }}>اقرأ أكثر</div>
            {tree.links.map((l, i) => {
              const route = resolveLinkRoute(l);
              if (!route) return null;
              return (
                <button
                  key={i}
                  type="button"
                  data-testid={`dx-link-${l.kind}-${l.targetId}`}
                  onClick={() => navigate(route)}
                  style={{
                    width: '100%', textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8,
                    background: '#ffffff', border: '1px solid rgba(15,23,42,0.09)', borderRadius: 11,
                    padding: '10px 12px', marginBottom: 7, cursor: 'pointer',
                  }}
                >
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                    <RichText text={l.label} idKey={`tl${i}`} />
                  </span>
                  <ChevronLeft size={14} style={{ color: '#94a3b8', flexShrink: 0 }} aria-hidden />
                </button>
              );
            })}
          </div>
        )}

        {tree.relatedArticleIds.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 11.5, color: '#64748b' }}>
            مقالات مرتبطة:{' '}
            {tree.relatedArticleIds.map((aid, i) => {
              const a = getArticle(aid);
              if (!a) return null;
              return (
                <span key={aid}>
                  {i > 0 && '، '}
                  <button
                    type="button"
                    onClick={() => navigate(`/kb/${a.moduleId}/${a.id}`)}
                    style={{ background: 'none', border: 'none', padding: 0, color: '#a21caf', cursor: 'pointer', fontSize: 11.5, fontWeight: 700 }}
                  >
                    {a.titleAr}
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
};

const CHIP: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
  background: 'rgba(148,163,184,0.16)', color: '#475569', display: 'inline-block',
};
const LABEL: React.CSSProperties = { fontSize: 11, fontWeight: 800, color: '#64748b', marginBottom: 5 };
const BODY: React.CSSProperties = { fontSize: 13, lineHeight: 1.9, color: '#1e293b', margin: 0 };
