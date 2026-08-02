import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import {
  Search, BookOpen, Stethoscope, Library, Cpu, ChevronLeft, Bookmark, CircleCheck, ScrollText,
  ListChecks, TrendingUp, Grid3x3, Fan, Wind,
} from 'lucide-react';
import { allKbModules } from '../data/kb/registry';
import { computeModuleCoverage } from '../data/kb/coverage';
import { allDxTrees } from '../data/kb/diagnostics/trees';
import { kbTerms } from '../data/kb/glossary/terms';
import { domainElements } from '../data/kb/domainMatrix';
import { useKbProgress } from '../hooks/useKbProgress';
import { KB_LEVEL_LABEL_AR } from '../data/kb/types';
import { getArticle } from '../data/kb/registry';

const MODULE_ICONS: Record<string, typeof Cpu> = { Cpu, Fan, Wind };

/**
 * Encyclopedia hub — the entry point for BOTH modes the spec requires:
 * learning (ordered paths inside a module) and reference (search / glossary /
 * diagnostics, reachable without passing through any path).
 */
export const KbHubView: React.FC = () => {
  const navigate = useNavigate();
  const progress = useKbProgress();

  const totalArticles = allKbModules.reduce((n, m) => n + m.articles.length, 0);
  const readCount = progress.readCountIn(allKbModules.flatMap(m => m.articles.map(a => a.id)));
  const lastArticle = progress.lastArticleId ? getArticle(progress.lastArticleId) : undefined;

  // The scope notice is DERIVED, never written by hand. An earlier version
  // named the authored and unwritten modules in prose, and every new module
  // made it quietly false — exactly the kind of stale claim the honesty rule
  // exists to prevent. Both lists now come from live data.
  const authoredTitles = allKbModules.map(m => m.titleAr);
  const unwrittenTitles = domainElements
    .filter(e => !e.moduleId && e.priority <= 2)
    .sort((a, b) => a.priority - b.priority)
    .map(e => e.titleAr);

  // `checklists` and `progress` are re-linked here on purpose: both routes
  // existed and worked but had no reachable entry point anywhere in the app
  // after the home screen became the Community feed
  // (docs/platform/00-AUDIT.md items A2/A4).
  const tools = [
    { id: 'search', label: 'بحث شامل', desc: 'ابحث في كل محتوى التطبيق بالعربية والإنجليزية', Icon: Search, route: '/search' },
    { id: 'diagnose', label: 'التشخيص', desc: `${allDxTrees.length} شجرة تشخيص قائمة على العرَض`, Icon: Stethoscope, route: '/diagnose' },
    { id: 'glossary', label: 'القاموس', desc: `${kbTerms.length} مصطلحاً تقنياً بالعربية والإنجليزية`, Icon: ScrollText, route: '/glossary' },
    { id: 'lessons', label: 'مسار المبتدئ', desc: '16 درساً تفاعلياً من الصفر حتى أول طيران', Icon: BookOpen, route: '/lessons' },
    { id: 'checklists', label: 'قوائم الفحص', desc: 'قبل الشراء وقبل الطيران', Icon: ListChecks, route: '/checklists' },
    { id: 'progress', label: 'تقدّمي', desc: 'ما أنجزته عبر كل أقسام التطبيق', Icon: TrendingUp, route: '/progress' },
    { id: 'matrix', label: 'مصفوفة التغطية', desc: 'جرد كامل للمجال وما غُطّي منه فعلاً', Icon: Grid3x3, route: '/kb/matrix' },
  ];

  return (
    <AppShell tint="blue">
      <Header title="الموسوعة" />
      <div className="fade-in" style={{ padding: '16px 16px 24px', background: '#f8fafc', minHeight: '100%' }}>

        <div
          style={{
            background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(56,189,248,0.05))',
            border: '1px solid rgba(14,165,233,0.25)', borderRadius: 18, padding: 16, marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Library size={20} style={{ color: '#0369a1' }} aria-hidden />
            <h2 style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', margin: 0 }}>موسوعة الـFPV بالعربي</h2>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.85, color: '#334155', margin: 0 }}>
            كل نظام مشروح بست طبقات: إجابة سريعة، شرح مبسّط، شرح تقني، تطبيق عملي، تشخيص، ومرجع.
            ادخل من مسار مرتّب إن كنت تتعلم، أو مباشرةً على ما تحتاجه إن كنت تعرف ما تبحث عنه.
          </p>
          <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 12, color: '#0369a1', fontWeight: 700 }}>
            <span>{totalArticles} مقالاً</span>
            <span>·</span>
            <span>{readCount} مقروء</span>
            <span>·</span>
            <span>{progress.bookmarks.length} محفوظ</span>
          </div>
        </div>

        {lastArticle && (
          <button
            type="button"
            data-testid="kb-continue"
            onClick={() => navigate(`/kb/${lastArticle.moduleId}/${lastArticle.id}`)}
            style={{
              width: '100%', textAlign: 'right', background: '#ffffff', border: '1px solid rgba(15,23,42,0.10)',
              borderRadius: 14, padding: '12px 14px', marginBottom: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>تابع من حيث توقفت</div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>{lastArticle.titleAr}</div>
            </div>
            <ChevronLeft size={18} style={{ color: '#0369a1', flexShrink: 0 }} aria-hidden />
          </button>
        )}

        <h3 style={{ fontSize: 13, fontWeight: 900, color: '#334155', margin: '0 0 10px' }}>أدوات مرجعية</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {tools.map(t => (
            <button
              key={t.id}
              type="button"
              data-testid={`kb-tool-${t.id}`}
              onClick={() => navigate(t.route)}
              style={{
                textAlign: 'right', background: '#ffffff', border: '1px solid rgba(15,23,42,0.09)',
                borderRadius: 14, padding: '12px 12px', cursor: 'pointer',
              }}
            >
              <t.Icon size={18} style={{ color: '#0369a1', marginBottom: 6 }} aria-hidden />
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{t.label}</div>
              <div style={{ fontSize: 11, lineHeight: 1.6, color: '#64748b', marginTop: 3 }}>{t.desc}</div>
            </button>
          ))}
        </div>

        <h3 style={{ fontSize: 13, fontWeight: 900, color: '#334155', margin: '0 0 10px' }}>الوحدات الموسوعية</h3>
        {allKbModules.map(mod => {
          const cov = computeModuleCoverage(mod);
          const Icon = MODULE_ICONS[mod.icon] ?? Cpu;
          const modRead = progress.readCountIn(mod.articles.map(a => a.id));
          return (
            <button
              key={mod.id}
              type="button"
              data-testid={`kb-module-${mod.id}`}
              onClick={() => navigate(`/kb/${mod.id}`)}
              style={{
                display: 'block', width: '100%', textAlign: 'right', background: '#ffffff',
                border: '1px solid rgba(15,23,42,0.10)', borderRadius: 16, padding: 14,
                marginBottom: 10, cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                <div
                  style={{
                    width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                    background: 'rgba(14,165,233,0.12)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Icon size={19} style={{ color: '#0369a1' }} aria-hidden />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <h4 style={{ fontSize: 14.5, fontWeight: 900, color: '#0f172a', margin: 0 }}>{mod.titleAr}</h4>
                    <span dir="ltr" style={{ fontSize: 11, color: '#64748b', unicodeBidi: 'isolate' }}>{mod.titleEn}</span>
                  </div>
                  <p style={{ fontSize: 12.5, lineHeight: 1.75, color: '#475569', margin: '5px 0 0' }}>{mod.summaryAr}</p>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 9 }}>
                    <span style={CHIP}>{mod.articles.length} مقالاً</span>
                    <span style={CHIP}>{mod.paths.length} مسارات</span>
                    <span style={{ ...CHIP, background: cov.complete ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.14)', color: cov.complete ? '#047857' : '#b45309' }}>
                      تغطية {cov.coveredCount}/{cov.requiredCount}
                    </span>
                    {modRead > 0 && (
                      <span style={{ ...CHIP, background: 'rgba(14,165,233,0.12)', color: '#0369a1' }}>
                        <CircleCheck size={11} style={{ verticalAlign: -1, marginInlineEnd: 3 }} aria-hidden />
                        {modRead} مقروء
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
                    المستويات: {mod.levels.map(l => KB_LEVEL_LABEL_AR[l]).join(' · ')}
                  </div>
                </div>
                <ChevronLeft size={17} style={{ color: '#94a3b8', flexShrink: 0, marginTop: 10 }} aria-hidden />
              </div>
            </button>
          );
        })}

        <div
          style={{
            marginTop: 16, border: '1px dashed rgba(245,158,11,0.5)', background: 'rgba(245,158,11,0.06)',
            borderRadius: 14, padding: '12px 14px',
          }}
          data-testid="kb-scope-notice"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
            <Bookmark size={15} style={{ color: '#b45309' }} aria-hidden />
            <strong style={{ fontSize: 12.5, color: '#b45309' }}>نطاق الموسوعة حالياً</strong>
          </div>
          <p style={{ fontSize: 12, lineHeight: 1.8, color: '#78350f', margin: 0 }}>
            الوحدات المكتوبة حتى الآن: {authoredTitles.join(' · ')}. وما زال على الخطة ولم يُكتب بعد:{' '}
            {unwrittenTitles.join(' · ')}. ما لم يُكتب يُعلَن هنا بالاسم ولا يظهر كبطاقة فارغة،
            ولوحة التغطية الكاملة في «مصفوفة التغطية».
          </p>
        </div>
      </div>
    </AppShell>
  );
};

const CHIP: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
  background: 'rgba(148,163,184,0.16)', color: '#475569',
};
