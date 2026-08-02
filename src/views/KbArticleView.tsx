import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import {
  ArrowRight, Bookmark, BookmarkCheck, CircleCheck, Circle, ChevronLeft, ChevronRight,
  Link2, BookOpenCheck, FileText, NotebookPen, AlertTriangle,
} from 'lucide-react';
import { getArticle, getModule, articleNeighbours, resolveLinkRoute } from '../data/kb/registry';
import { getTerm } from '../data/kb/glossary/terms';
import { useKbProgress } from '../hooks/useKbProgress';
import { BlockList } from '../components/kb/BlockRenderer';
import { RichText } from '../components/kb/Term';
import {
  KB_LAYER_LABEL_AR, KB_LAYER_ORDER, KB_LEVEL_LABEL_AR, KB_KIND_LABEL_AR,
  type KbLayerId,
} from '../data/kb/types';

/**
 * Article page.
 *
 * The layer tabs are the mechanism that lets one article serve a complete
 * beginner and a working professional at once, which is what the spec demands
 * instead of splitting depth across separate "beginner" and "advanced" pages.
 * Only layers the article actually has are rendered — an empty tab would be the
 * "عنوان بلا محتوى" the spec explicitly forbids.
 */
export const KbArticleView: React.FC = () => {
  const { moduleId, articleId } = useParams<{ moduleId: string; articleId: string }>();
  const navigate = useNavigate();
  const progress = useKbProgress();

  const article = articleId ? getArticle(articleId) : undefined;
  const mod = moduleId ? getModule(moduleId) : undefined;

  const availableLayers = useMemo<KbLayerId[]>(
    () => (article ? KB_LAYER_ORDER.filter(l => (article.layers[l]?.length ?? 0) > 0) : []),
    [article],
  );

  const [layer, setLayer] = useState<KbLayerId | null>(availableLayers[0] ?? null);
  const [noteDraft, setNoteDraft] = useState(() => (article ? progress.notes[article.id] ?? '' : ''));
  const [noteOpen, setNoteOpen] = useState(false);
  const [renderedArticleId, setRenderedArticleId] = useState(article?.id);

  // Reset per-article view state when the route target changes, so opening a
  // related article does not inherit the previous one's tab or note draft.
  //
  // Adjusted DURING RENDER rather than in an effect: this is derived-state
  // resynchronisation, not synchronisation with an external system. React
  // documents this exact pattern, and it avoids the extra commit-then-rerender
  // an effect would cause — which would visibly flash the previous article's
  // layer for one frame.
  if (article && article.id !== renderedArticleId) {
    setRenderedArticleId(article.id);
    setLayer(KB_LAYER_ORDER.find(l => (article.layers[l]?.length ?? 0) > 0) ?? null);
    setNoteDraft(progress.notes[article.id] ?? '');
    setNoteOpen(false);
  }

  // Genuinely external: scroll position and the persisted "last opened" marker.
  useEffect(() => {
    if (!article) return;
    progress.setLastArticle(article.id);
    window.scrollTo(0, 0);
    // setLastArticle is a stable useCallback; `progress` itself is a fresh
    // literal every render, so depending on it would re-fire this every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article?.id]);

  if (!article || !mod) {
    return (
      <AppShell tint="blue">
        <Header title="الموسوعة" />
        <div style={{ padding: 20 }}>
          <p style={{ fontSize: 14, color: '#334155' }}>هذا المقال غير موجود.</p>
          <button className="btn-secondary" onClick={() => navigate('/kb')}>العودة إلى الموسوعة</button>
        </div>
      </AppShell>
    );
  }

  const { prev, next } = articleNeighbours(article.id);
  const blocks = layer ? article.layers[layer] ?? [] : [];
  const isRead = progress.isRead(article.id);
  const isBookmarked = progress.isBookmarked(article.id);

  return (
    <AppShell tint="blue">
      <Header
        title={mod.titleAr}
        rightAction={
          <button
            onClick={() => navigate(`/kb/${mod.id}`)}
            aria-label="رجوع"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0f172a', display: 'flex' }}
          >
            <ArrowRight size={20} />
          </button>
        }
      />

      <div className="fade-in" style={{ background: '#f8fafc', minHeight: '100%', paddingBottom: 28 }}>
        {/* ── Title block ─────────────────────────────────────────── */}
        <div style={{ padding: '14px 16px 0' }}>
          <h1 data-testid="kb-article-title" style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.6 }}>
            {article.titleAr}
          </h1>
          {article.titleEn && (
            <div dir="ltr" style={{ fontSize: 12, color: '#64748b', marginTop: 3, unicodeBidi: 'isolate' }}>
              {article.titleEn}
            </div>
          )}

          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 9 }}>
            <span style={CHIP}>{KB_KIND_LABEL_AR[article.kind]}</span>
            {article.levels.map(l => <span key={l} style={CHIP}>{KB_LEVEL_LABEL_AR[l]}</span>)}
            <span style={CHIP}>آخر مراجعة {article.lastReviewed}</span>
            {article.safetyLevel === 'critical' && (
              <span style={{ ...CHIP, background: 'rgba(239,68,68,0.12)', color: '#b91c1c' }}>
                <AlertTriangle size={10} style={{ verticalAlign: -1, marginInlineEnd: 3 }} aria-hidden />
                سلامة حرجة
              </span>
            )}
          </div>

          {/* Quick answer — always visible, never behind a tab. */}
          <div
            data-testid="kb-article-summary"
            style={{
              marginTop: 12, background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.28)',
              borderRadius: 14, padding: '12px 14px',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: '#0369a1', marginBottom: 5 }}>إجابة سريعة</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.9, color: '#0f172a' }}>
              <RichText text={article.summaryAr} idKey="sum" />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              type="button"
              data-testid="kb-toggle-read"
              onClick={() => progress.toggleRead(article.id)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '9px 8px', borderRadius: 11, cursor: 'pointer', fontSize: 12, fontWeight: 800,
                border: '1px solid ' + (isRead ? 'rgba(16,185,129,0.45)' : 'rgba(15,23,42,0.12)'),
                background: isRead ? 'rgba(16,185,129,0.10)' : '#ffffff',
                color: isRead ? '#047857' : '#475569',
              }}
            >
              {isRead ? <CircleCheck size={14} aria-hidden /> : <Circle size={14} aria-hidden />}
              {isRead ? 'مقروء' : 'وضع كمقروء'}
            </button>
            <button
              type="button"
              data-testid="kb-toggle-bookmark"
              onClick={() => progress.toggleBookmark(article.id)}
              aria-label={isBookmarked ? 'إزالة من المحفوظات' : 'حفظ'}
              style={{
                width: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '9px 8px', borderRadius: 11, cursor: 'pointer',
                border: '1px solid ' + (isBookmarked ? 'rgba(217,70,239,0.45)' : 'rgba(15,23,42,0.12)'),
                background: isBookmarked ? 'rgba(217,70,239,0.10)' : '#ffffff',
                color: isBookmarked ? '#a21caf' : '#475569',
              }}
            >
              {isBookmarked ? <BookmarkCheck size={15} aria-hidden /> : <Bookmark size={15} aria-hidden />}
            </button>
            <button
              type="button"
              data-testid="kb-toggle-note"
              onClick={() => setNoteOpen(o => !o)}
              aria-label="ملاحظتي"
              style={{
                width: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '9px 8px', borderRadius: 11, cursor: 'pointer',
                border: '1px solid rgba(15,23,42,0.12)', background: '#ffffff', color: '#475569',
              }}
            >
              <NotebookPen size={15} aria-hidden />
            </button>
          </div>

          {noteOpen && (
            <div style={{ marginTop: 10 }}>
              <textarea
                data-testid="kb-note-input"
                value={noteDraft}
                onChange={e => setNoteDraft(e.target.value)}
                onBlur={() => progress.setNote(article.id, noteDraft)}
                placeholder="ملاحظتك على هذا المقال — تُحفظ على جهازك"
                rows={3}
                style={{
                  width: '100%', border: '1px solid rgba(15,23,42,0.14)', borderRadius: 11,
                  padding: '9px 11px', fontSize: 13, lineHeight: 1.8, fontFamily: 'inherit', resize: 'vertical',
                }}
              />
            </div>
          )}
        </div>

        {/* ── Objectives & prerequisites ──────────────────────────── */}
        <div style={{ padding: '14px 16px 0' }}>
          {article.prerequisiteIds.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#64748b', marginBottom: 5 }}>المتطلبات السابقة</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {article.prerequisiteIds.map(pid => {
                  const p = getArticle(pid);
                  if (!p) return null;
                  return (
                    <button
                      key={pid}
                      type="button"
                      data-testid={`kb-prereq-${pid}`}
                      onClick={() => navigate(`/kb/${p.moduleId}/${p.id}`)}
                      style={LINK_CHIP}
                    >
                      {p.titleAr}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div
            style={{
              background: '#ffffff', border: '1px solid rgba(15,23,42,0.09)',
              borderRadius: 14, padding: '11px 13px', marginBottom: 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <BookOpenCheck size={14} style={{ color: '#0369a1' }} aria-hidden />
              <strong style={{ fontSize: 12.5, color: '#0f172a' }}>ماذا ستتعلم</strong>
            </div>
            <ul style={{ margin: 0, paddingInlineStart: 18 }}>
              {article.objectives.map((o, i) => (
                <li key={i} style={{ fontSize: 12.5, lineHeight: 1.85, color: '#334155', marginBottom: 3 }}>
                  <RichText text={o} idKey={`obj${i}`} />
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Layer tabs ──────────────────────────────────────────── */}
        <div
          role="tablist"
          aria-label="طبقات الشرح"
          style={{
            display: 'flex', gap: 6, overflowX: 'auto', padding: '14px 16px 10px',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {availableLayers.map(l => (
            <button
              key={l}
              role="tab"
              aria-selected={layer === l}
              data-testid={`kb-layer-${l}`}
              onClick={() => setLayer(l)}
              style={{
                flexShrink: 0, padding: '7px 13px', borderRadius: 999, cursor: 'pointer',
                fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap',
                border: '1px solid ' + (layer === l ? 'rgba(14,165,233,0.5)' : 'rgba(15,23,42,0.10)'),
                background: layer === l ? 'rgba(14,165,233,0.14)' : '#ffffff',
                color: layer === l ? '#0369a1' : '#475569',
              }}
            >
              {KB_LAYER_LABEL_AR[l]}
            </button>
          ))}
        </div>

        {/* ── Layer content ───────────────────────────────────────── */}
        <div data-testid="kb-layer-content" style={{ padding: '0 16px' }}>
          <BlockList blocks={blocks} idKey={`${article.id}-${layer}`} />
        </div>

        {/* ── Glossary terms ──────────────────────────────────────── */}
        {article.glossaryIds.length > 0 && (
          <div style={{ padding: '4px 16px 0' }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: '#64748b', marginBottom: 6 }}>مصطلحات هذا المقال</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {article.glossaryIds.map(tid => {
                const t = getTerm(tid);
                if (!t) return null;
                return (
                  <button
                    key={tid}
                    type="button"
                    data-testid={`kb-term-${tid}`}
                    onClick={() => navigate(`/glossary?term=${encodeURIComponent(tid)}`)}
                    style={LINK_CHIP}
                  >
                    {t.ar} <span dir="ltr" style={{ opacity: 0.65, unicodeBidi: 'isolate' }}>({t.abbr ?? t.en})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Quiz ────────────────────────────────────────────────── */}
        {article.quiz && article.quiz.length > 0 && (
          <div style={{ padding: '18px 16px 0' }} data-testid="kb-quiz">
            <h3 style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', margin: '0 0 10px' }}>أسئلة فهم</h3>
            {article.quiz.map(q => {
              const chosen = progress.getQuizAnswer(article.id, q.id);
              return (
                <div
                  key={q.id}
                  style={{
                    background: '#ffffff', border: '1px solid rgba(15,23,42,0.09)',
                    borderRadius: 14, padding: 13, marginBottom: 10,
                  }}
                >
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', lineHeight: 1.8, marginBottom: 9 }}>
                    <RichText text={q.question} idKey={`q-${q.id}`} />
                  </div>
                  {q.options.map(o => {
                    const picked = chosen === o.id;
                    const revealed = chosen !== undefined;
                    return (
                      <div key={o.id} style={{ marginBottom: 6 }}>
                        <button
                          type="button"
                          data-testid={`kb-quiz-${q.id}-${o.id}`}
                          onClick={() => progress.answerQuiz(article.id, q.id, o.id)}
                          style={{
                            width: '100%', textAlign: 'right', padding: '9px 11px', borderRadius: 10,
                            cursor: 'pointer', fontSize: 12.5, lineHeight: 1.7,
                            border: '1px solid ' + (
                              !revealed ? 'rgba(15,23,42,0.10)'
                                : o.correct ? 'rgba(16,185,129,0.5)'
                                  : picked ? 'rgba(239,68,68,0.5)' : 'rgba(15,23,42,0.08)'
                            ),
                            background: !revealed ? '#ffffff'
                              : o.correct ? 'rgba(16,185,129,0.08)'
                                : picked ? 'rgba(239,68,68,0.07)' : '#ffffff',
                            color: '#1e293b',
                          }}
                        >
                          <RichText text={o.text} idKey={`o-${q.id}-${o.id}`} />
                        </button>
                        {revealed && picked && (
                          <div
                            data-testid={`kb-quiz-feedback-${q.id}`}
                            style={{
                              fontSize: 12, lineHeight: 1.8, color: o.correct ? '#047857' : '#b91c1c',
                              padding: '6px 11px 0',
                            }}
                          >
                            <RichText text={o.feedback} idKey={`f-${q.id}-${o.id}`} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Tasks ───────────────────────────────────────────────── */}
        {article.tasks && article.tasks.length > 0 && (
          <div style={{ padding: '10px 16px 0' }}>
            <div
              style={{
                background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.28)',
                borderRadius: 14, padding: '12px 14px',
              }}
            >
              <strong style={{ fontSize: 13, color: '#047857', display: 'block', marginBottom: 7 }}>مهام تطبيقية</strong>
              <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                {article.tasks.map((t, i) => (
                  <li key={i} style={{ fontSize: 12.5, lineHeight: 1.85, color: '#1e293b', marginBottom: 4 }}>
                    <RichText text={t} idKey={`task${i}`} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ── Cross-links ─────────────────────────────────────────── */}
        {(article.links.length > 0 || article.relatedArticleIds.length > 0) && (
          <div style={{ padding: '18px 16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
              <Link2 size={15} style={{ color: '#0369a1' }} aria-hidden />
              <h3 style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', margin: 0 }}>روابط مرتبطة</h3>
            </div>
            {article.links.map((l, i) => {
              const route = resolveLinkRoute(l);
              if (!route) return null;
              const external = l.kind === 'external';
              return (
                <button
                  key={i}
                  type="button"
                  data-testid={`kb-link-${l.kind}-${l.targetId}`}
                  onClick={() => { if (external) window.open(route, '_blank', 'noopener'); else navigate(route); }}
                  style={{
                    width: '100%', textAlign: 'right', display: 'flex', alignItems: 'center', gap: 9,
                    background: '#ffffff', border: '1px solid rgba(15,23,42,0.09)', borderRadius: 12,
                    padding: '10px 12px', marginBottom: 7, cursor: 'pointer',
                  }}
                >
                  <FileText size={14} style={{ color: '#0369a1', flexShrink: 0 }} aria-hidden />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                      <RichText text={l.label} idKey={`ln${i}`} />
                    </span>
                    {l.reason && (
                      <span style={{ display: 'block', fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        <RichText text={l.reason} idKey={`lr${i}`} />
                      </span>
                    )}
                  </span>
                  <ChevronLeft size={15} style={{ color: '#94a3b8', flexShrink: 0 }} aria-hidden />
                </button>
              );
            })}
          </div>
        )}

        {/* ── Sources ─────────────────────────────────────────────── */}
        <div style={{ padding: '18px 16px 0' }}>
          <details
            data-testid="kb-sources"
            style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.09)', borderRadius: 14, padding: '11px 13px' }}
          >
            <summary style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', cursor: 'pointer' }}>
              المصادر ({article.sources.length})
            </summary>
            <ul style={{ margin: '9px 0 0', paddingInlineStart: 18 }}>
              {article.sources.map((s, i) => (
                <li key={i} style={{ fontSize: 12, lineHeight: 1.8, color: '#475569', marginBottom: 6 }}>
                  <strong style={{ color: '#0f172a' }}>{s.title}</strong>
                  <span dir="ltr" style={{ unicodeBidi: 'isolate' }}> — {s.version}</span>
                  <span> · روجعت {s.reviewedAt}</span>
                  {s.generalPrinciple && (
                    <div style={{ color: '#b45309', marginTop: 2 }}>
                      مبدأ عام — راجع دليل لوحتك للأرقام الخاصة بها.
                    </div>
                  )}
                  {s.url && (
                    <div>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" dir="ltr" style={{ color: '#0369a1', unicodeBidi: 'isolate' }}>
                        {s.url}
                      </a>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </details>
        </div>

        {/* ── Prev / next ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, padding: '18px 16px 0' }}>
          <button
            type="button"
            data-testid="kb-prev"
            disabled={!prev}
            onClick={() => prev && navigate(`/kb/${prev.moduleId}/${prev.id}`)}
            style={{ ...NAV_BTN, opacity: prev ? 1 : 0.4, cursor: prev ? 'pointer' : 'default' }}
          >
            <ChevronRight size={15} aria-hidden />
            <span style={{ flex: 1, textAlign: 'right' }}>{prev ? prev.titleAr : 'لا يوجد سابق'}</span>
          </button>
          <button
            type="button"
            data-testid="kb-next"
            disabled={!next}
            onClick={() => next && navigate(`/kb/${next.moduleId}/${next.id}`)}
            style={{ ...NAV_BTN, opacity: next ? 1 : 0.4, cursor: next ? 'pointer' : 'default' }}
          >
            <span style={{ flex: 1, textAlign: 'right' }}>{next ? next.titleAr : 'لا يوجد تالٍ'}</span>
            <ChevronLeft size={15} aria-hidden />
          </button>
        </div>
      </div>
    </AppShell>
  );
};

const CHIP: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
  background: 'rgba(148,163,184,0.16)', color: '#475569',
};

const LINK_CHIP: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 700, padding: '5px 10px', borderRadius: 999,
  background: 'rgba(14,165,233,0.10)', color: '#0369a1',
  border: '1px solid rgba(14,165,233,0.28)', cursor: 'pointer',
};

const NAV_BTN: React.CSSProperties = {
  flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '10px 11px',
  borderRadius: 12, border: '1px solid rgba(15,23,42,0.10)', background: '#ffffff',
  fontSize: 11.5, fontWeight: 700, color: '#334155', minWidth: 0,
};
