'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  readProjectSnapshot, computeFindings, sortFindings, countFindings, computeNextStep,
  selectedPartCount, droneTypes, clearAssemblyProject, exportAssemblyProject,
  importAssemblyProject, saveAssemblyProject, SCHEMA_VERSION,
  SEVERITY_LABEL_AR, SEVERITY_ORDER,
  type ProjectSnapshot, type Finding, type FindingSeverity,
} from '@/lib/project';
import { FindingCard } from './FindingCard';
import { ProjectParts } from './ProjectParts';
import { ProjectReport } from './ProjectReport';
import { BuildStages } from './BuildStages';

/**
 * The project workspace.
 *
 * WHY EVERYTHING IS COMPUTED FROM ONE SNAPSHOT, ONCE
 * --------------------------------------------------
 * `readProjectSnapshot()` produces the state; `computeFindings` turns it into
 * verdicts; `computeNextStep` picks the single most important thing to do.
 * All three come from the shared core, and all three run in ONE memo keyed on
 * the snapshot. Nothing in this file compares a voltage, ranks a severity or
 * decides what is blocking — it renders what the engine already decided.
 *
 * The memo also answers the performance requirement honestly: the verdicts are
 * recomputed when the project changes and at no other time, so filtering,
 * expanding a card or switching tabs costs nothing.
 *
 * WHY THE PROJECT IS READ DURING RENDER AND NOT IN AN EFFECT
 * ----------------------------------------------------------
 * This component is loaded with `ssr: false`, so it never runs on the server
 * and localStorage is already there on its very first render. Reading it in a
 * lazy `useState` initializer is therefore both correct and cheaper than an
 * effect: no extra render pass, no flash of an empty project, and none of the
 * cascading-render pattern React 19 warns about.
 *
 * Re-reads after a mutation go through `reload()`, which calls the store again
 * rather than patching a local copy — the store's validator is what decides
 * what a project IS, and a patched copy could drift from it.
 */

type Tab = 'findings' | 'parts' | 'stages' | 'report';

export const ProjectWorkspace: React.FC = () => {
  const [snapshot, setSnapshot] = useState<ProjectSnapshot>(() => readProjectSnapshot());

  /**
   * A `project:` destination carries a view, and the reader arrived here
   * BECAUSE of it — a verdict said "open your control-link record" and this is
   * where that lands. Ignoring the parameter would drop them on the default tab
   * and make them hunt for the thing they clicked to see.
   *
   * `rc` and `video` both live in the parts panel, which is where those records
   * are shown, so both map onto it.
   */
  const params = useSearchParams();
  const requested = params.get('view');
  const initialTab: Tab =
    requested === 'findings' ? 'findings'
    : requested === 'rc' || requested === 'video' ? 'parts'
    : 'findings';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [notice, setNotice] = useState<string | null>(null);

  const { findings, counts, nextStep } = useMemo(() => {
    const list = sortFindings(computeFindings(snapshot));
    return {
      findings: list,
      counts: countFindings(list),
      nextStep: computeNextStep(snapshot, list),
    };
  }, [snapshot]);

  const reload = () => setSnapshot(readProjectSnapshot());

  if (!snapshot.exists) return <EmptyProject onCreated={reload} />;
  const droneType = droneTypes.find(d => d.id === snapshot.droneTypeId);

  return (
    <div data-testid="project-workspace">
      {notice && (
        <p role="status" data-testid="project-notice" className="admin-badge admin-badge-ok"
          style={{ display: 'block', padding: '10px 14px', marginBottom: 14 }}>
          {notice}
        </p>
      )}

      {/* ── The headline: worst severity, never an average ──────────────── */}
      <ProjectStatus counts={counts} nextStep={nextStep} />

      <dl className="admin-kv card-sm" data-testid="project-identity" style={{ padding: '15px 17px', marginTop: 16 }}>
        <div><dt>نوع الدرون</dt><dd>{snapshot.droneTypeName ?? droneType?.primaryName ?? '— غير محدد'}</dd></div>
        <div><dt>الحجم</dt><dd>{snapshot.sizeInch ? <><span dir="ltr">{snapshot.sizeInch}</span> إنش</> : '— غير محدد'}</dd></div>
        <div><dt>فولتية البطارية</dt><dd>{snapshot.cellCount ? <><span dir="ltr">{snapshot.cellCount}S</span></> : '— غير محدد'}</dd></div>
        <div><dt>القطع المسجّلة</dt><dd dir="ltr">{selectedPartCount(snapshot)}</dd></div>
        <div><dt>إصدار المخطط</dt><dd dir="ltr">v{SCHEMA_VERSION}</dd></div>
      </dl>

      <nav className="admin-filters" role="tablist" aria-label="أقسام المشروع" style={{ marginTop: 18 }}>
        {([
          ['findings', `أحكام التوافق (${findings.length})`],
          ['parts', 'القطع والإعدادات'],
          ['stages', 'مراحل البناء'],
          ['report', 'التقرير'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            data-testid={`project-tab-${id}`}
            className={tab === id ? 'admin-nav-link is-active' : 'admin-nav-link'}
            onClick={() => setTab(id)}
            style={{ cursor: 'pointer', background: 'none', fontFamily: 'inherit' }}
          >
            {label}
          </button>
        ))}
      </nav>

      <div style={{ marginTop: 18 }}>
        {tab === 'findings' && <FindingsPanel findings={findings} />}
        {tab === 'parts' && <ProjectParts snapshot={snapshot} onChanged={reload} />}
        {tab === 'stages' && <BuildStages snapshot={snapshot} findings={findings} />}
        {tab === 'report' && <ProjectReport snapshot={snapshot} findings={findings} counts={counts} nextStep={nextStep} />}
      </div>

      <ProjectData snapshot={snapshot} onChanged={reload} onNotice={setNotice} />
    </div>
  );
};

/**
 * The project's overall state.
 *
 * FOLLOWS THE WORST VERDICT, NOT AN AVERAGE
 * -----------------------------------------
 * A percentage would let nine confirmed checks bury one blocker, and a blocker
 * is not "a bit of a problem" — it means proceeding damages hardware or cannot
 * work. So the headline is the worst severity present, and the counts beside it
 * are absolute numbers rather than a proportion.
 */
const ProjectStatus: React.FC<{
  counts: ReturnType<typeof countFindings>;
  nextStep: ReturnType<typeof computeNextStep>;
}> = ({ counts, nextStep }) => {
  const worst: FindingSeverity =
    counts.blocker > 0 ? 'blocker'
    : counts.warning > 0 ? 'warning'
    : counts.unknown > 0 ? 'unknown'
    : 'ok';

  const HEADLINE: Record<FindingSeverity, string> = {
    blocker: 'المشروع غير جاهز للمتابعة — يوجد مانع',
    warning: 'يمكن المتابعة بحذر — توجد تحذيرات',
    unknown: 'لا يمكن الحكم بعد — بيانات ناقصة',
    ok: 'كل ما نستطيع فحصه سليم',
  };

  return (
    <section
      className="card"
      data-testid="project-status"
      data-worst={worst}
      // aria-live so a reader using a screen reader is told when the headline
      // changes after a part is added or removed, rather than having to go and
      // look for it.
      aria-live="polite"
      style={{ padding: '18px 20px' }}
    >
      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900 }} data-testid="project-headline">
        {HEADLINE[worst]}
      </h2>

      <div className="admin-stats" style={{ marginTop: 14 }}>
        {SEVERITY_ORDER.map(sev => (
          <div key={sev} className="admin-stat" data-testid={`project-count-${sev}`}>
            <div className="admin-stat-value" dir="ltr">{counts[sev]}</div>
            <div className="admin-stat-label">{SEVERITY_LABEL_AR[sev]}</div>
          </div>
        ))}
      </div>

      <div className="card-sm" style={{ padding: '13px 15px', marginTop: 14 }}>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dimmer)', fontWeight: 800 }}>الخطوة التالية</p>
        <p style={{ margin: '6px 0 0', fontSize: 14.5, fontWeight: 800 }} data-testid="project-next-step">
          {nextStep.titleAr}
        </p>
        <p style={{ margin: '5px 0 0', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.9 }}>
          {nextStep.reasonAr}
        </p>
      </div>
    </section>
  );
};

/**
 * The verdict list, with the filters a dense report needs.
 *
 * Filtering is presentation only — it narrows what is displayed and never what
 * was computed, so a hidden blocker is still counted in the headline above.
 */
const FindingsPanel: React.FC<{ findings: Finding[] }> = ({ findings }) => {
  const [severity, setSeverity] = useState<FindingSeverity | 'all'>('all');
  const [query, setQuery] = useState('');
  const [missingOnly, setMissingOnly] = useState(false);

  const shown = findings.filter(f => {
    if (severity !== 'all' && f.severity !== severity) return false;
    if (missingOnly && f.missingAr.length === 0) return false;
    if (query.trim()) {
      const q = query.trim();
      const hay = `${f.claimAr} ${f.whyAr} ${f.evidenceAr.join(' ')} ${f.id}`;
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <label htmlFor="finding-q" className="sr-only">ابحث في الأحكام</label>
        <input
          id="finding-q"
          data-testid="finding-search"
          className="admin-field"
          style={{ maxWidth: 320 }}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="ابحث في الأحكام: اسم قطعة، أو نظام، أو سبب"
        />
        <label style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 12.5, color: 'var(--text-dim)' }}>
          <input
            type="checkbox"
            data-testid="finding-missing-only"
            checked={missingOnly}
            onChange={e => setMissingOnly(e.target.checked)}
          />
          البيانات الناقصة فقط
        </label>
      </div>

      <div className="admin-filters" role="group" aria-label="تصفية حسب الخطورة">
        {(['all', ...SEVERITY_ORDER] as const).map(s => (
          <button
            key={s}
            type="button"
            data-testid={`finding-filter-${s}`}
            className={severity === s ? 'admin-nav-link is-active' : 'admin-nav-link'}
            aria-pressed={severity === s}
            onClick={() => setSeverity(s)}
            style={{ cursor: 'pointer', background: 'none', fontFamily: 'inherit' }}
          >
            {s === 'all' ? 'الكل' : SEVERITY_LABEL_AR[s]}
          </button>
        ))}
      </div>

      <p aria-live="polite" style={{ fontSize: 12.5, color: 'var(--text-dimmer)', margin: '0 0 12px' }}>
        <span dir="ltr" data-testid="finding-shown-count">{shown.length}</span> من{' '}
        <span dir="ltr">{findings.length}</span> حكماً
      </p>

      {shown.length === 0 ? (
        <p className="card-sm admin-empty" data-testid="findings-empty">
          لا أحكام مطابقة لهذه التصفية.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }} data-testid="findings-list">
          {shown.map(f => <FindingCard key={f.id} finding={f} />)}
        </div>
      )}
    </div>
  );
};

/**
 * Starting a project.
 *
 * Deliberately asks for the minimum that makes the engine useful — the drone
 * type — and nothing more. Size and voltage are offered but skippable, because
 * a forced guess becomes a fact the verdicts then reason from, and a wrong
 * premise is worse than a declared gap.
 */
const EmptyProject: React.FC<{ onCreated: () => void }> = ({ onCreated }) => {
  const [typeId, setTypeId] = useState('');
  const [size, setSize] = useState('');
  const [cells, setCells] = useState('');
  const [busy, setBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  return (
    <section className="card" data-testid="project-empty" style={{ padding: '20px 22px' }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>لا مشروع بعد</h2>
      <p style={{ margin: '8px 0 4px', fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.95 }}>
        ابدأ بتحديد نوع الدرون. الحجم والفولتية اختياريان الآن — اتركهما فارغين
        إن لم تكن متأكداً، فالمنصة تعرض «بيانات ناقصة» بدل أن تفترض قيمة تبني
        عليها أحكاماً خاطئة.
      </p>

      {/*
        The escape hatch that was missing.

        Import used to live in `DataControls`, which renders only once a project
        EXISTS — so the one person who most needs it, somebody whose project is
        on their phone or in another browser and who is therefore looking at
        exactly this empty screen, could not reach it. The owner hit this
        directly: «قد يكون السبب أن المشروع محفوظ محلياً في متصفح أو جهاز آخر».
      */}
      <p style={{ margin: '0 0 18px', fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.95 }}>
        عندك مشروع على جهاز آخر أو في تطبيق الهاتف؟{' '}
        <label
          data-testid="project-import-empty-label"
          style={{ color: 'var(--accent-ink)', fontWeight: 800, cursor: 'pointer' }}
        >
          {importing ? 'جارٍ الاستيراد…' : 'استورد ملفه'}
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            data-testid="project-import-empty"
            disabled={importing}
            onChange={async e => {
              const file = e.target.files?.[0];
              if (!file) return;
              setImporting(true);
              setImportError(null);
              try {
                // `importAssemblyProject` takes the PARSED payload, not the
                // file's text — the same call `DataControls` makes. It
                // validates against the live part catalogue and refuses
                // anything it would not itself have written, so an edited or
                // foreign file cannot install a shape the app rejects on read.
                const parsed = JSON.parse(await file.text());
                const restored = importAssemblyProject(parsed);
                if (!restored) setImportError('الملف غير صالح أو يحمل إصداراً لا نعرفه.');
                else onCreated();
              } catch {
                setImportError('تعذّر قراءة الملف.');
              } finally {
                setImporting(false);
                e.target.value = '';
              }
            }}
          />
        </label>
        {' '}— نفس الملف الذي يصدّره التطبيق.
      </p>

      {importError && (
        <p
          role="alert"
          data-testid="project-import-empty-error"
          className="admin-badge admin-badge-bad"
          style={{ display: 'block', padding: '10px 14px', marginBottom: 16 }}
        >
          {importError}
        </p>
      )}

      <form
        data-testid="project-create-form"
        onSubmit={e => {
          e.preventDefault();
          if (!typeId || busy) return;
          setBusy(true);
          saveAssemblyProject({
            droneTypeId: typeId,
            stageIndex: 0,
            sizeInch: size ? Number(size) : undefined,
            batteryVoltage: cells ? Number(cells) : undefined,
            parts: {},
          });
          onCreated();
        }}
        style={{ display: 'grid', gap: 14, maxWidth: 460 }}
      >
        <div>
          <label htmlFor="new-type" style={LABEL}>نوع الدرون</label>
          <select id="new-type" data-testid="project-create-type" className="admin-field"
            value={typeId} onChange={e => setTypeId(e.target.value)} required>
            <option value="">— اختر —</option>
            {droneTypes.map(d => <option key={d.id} value={d.id}>{d.primaryName}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="new-size" style={LABEL}>حجم الإطار بالإنش (اختياري)</label>
          <input id="new-size" data-testid="project-create-size" className="admin-field"
            type="number" min={1} max={20} step={0.5} inputMode="decimal"
            value={size} onChange={e => setSize(e.target.value)} placeholder="اتركه فارغاً إن لم تكن متأكداً" />
        </div>

        <div>
          <label htmlFor="new-cells" style={LABEL}>عدد خلايا البطارية (اختياري)</label>
          <input id="new-cells" data-testid="project-create-cells" className="admin-field"
            type="number" min={1} max={12} step={1} inputMode="numeric"
            value={cells} onChange={e => setCells(e.target.value)} placeholder="مثال: 6" />
        </div>

        <div>
          <button type="submit" className="btn-primary" data-testid="project-create-submit" disabled={!typeId || busy}>
            أنشئ المشروع
          </button>
        </div>
      </form>

      <p style={{ margin: '18px 0 0', fontSize: 12.5, color: 'var(--text-dimmer)', lineHeight: 1.9 }}>
        مشروعك محفوظ على هذا الجهاز وحده. لا يُرفع إلى الخادم، ولا يظهر لأحد،
        ولا يُفهرس. يمكنك تصديره واستيراده من أسفل الصفحة.
      </p>
    </section>
  );
};

const LABEL: React.CSSProperties = {
  display: 'block', fontSize: 12.5, fontWeight: 800, marginBottom: 6,
};

/**
 * Export, import and delete.
 *
 * The export is the SAME payload the store persists, produced by the store's
 * own `exportAssemblyProject` — so a file written here is a file the phone's
 * importer would accept, and vice versa. That is the whole reason this batch
 * does not need a sync service to make a project portable.
 */
const ProjectData: React.FC<{
  snapshot: ProjectSnapshot;
  onChanged: () => void;
  onNotice: (m: string | null) => void;
}> = ({ onChanged, onNotice }) => {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <section className="admin-section" aria-labelledby="project-data-h" data-testid="project-data">
      <h2 id="project-data-h">بيانات المشروع</h2>
      <p style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.95, margin: '0 0 12px' }}>
        الملف المُصدَّر يحمل المعرّفات وإصدار المخطط فقط — لا أسرار ولا بيانات
        حساب. وهو نفس الشكل الذي يقرأه التطبيق، فما تصدّره هنا يمكن استيراده
        هناك.
      </p>

      {error && <p role="alert" data-testid="project-import-error" className="admin-badge admin-badge-bad"
        style={{ display: 'block', padding: '9px 13px', marginBottom: 10 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
        <button
          type="button" className="btn-ghost" data-testid="project-export"
          onClick={() => {
            const payload = exportAssemblyProject();
            if (!payload) { setError('لا مشروع صالح للتصدير'); return; }
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fpv-project-v${SCHEMA_VERSION}.json`;
            a.click();
            URL.revokeObjectURL(url);
            onNotice('صُدِّر المشروع.');
          }}
        >
          صدّر المشروع
        </button>

        <label className="btn-ghost" style={{ cursor: 'pointer' }}>
          {importing ? 'جارٍ الاستيراد…' : 'استورد ملفاً'}
          <input
            type="file" accept="application/json" hidden
            data-testid="project-import"
            onChange={async e => {
              const file = e.target.files?.[0];
              if (!file) return;
              setImporting(true);
              setError(null);
              try {
                const parsed = JSON.parse(await file.text());
                // The store's own importer validates against the live
                // catalogue and refuses anything it would not have written.
                // An edited or foreign file cannot install a shape the app
                // would reject on read.
                const restored = importAssemblyProject(parsed);
                if (!restored) {
                  setError('الملف غير صالح أو يحمل إصداراً لا نعرفه. لم يُغيَّر مشروعك.');
                } else {
                  onNotice('استُورد المشروع.');
                  onChanged();
                }
              } catch {
                setError('تعذّر قراءة الملف.');
              } finally {
                setImporting(false);
                e.target.value = '';
              }
            }}
          />
        </label>

        {!confirmClear ? (
          <button type="button" className="admin-danger" data-testid="project-clear"
            onClick={() => setConfirmClear(true)}>
            احذف المشروع
          </button>
        ) : (
          <span className="card-sm" style={{ padding: '10px 13px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--sev-blocker)' }}>
              سيُحذف المشروع من هذا الجهاز نهائياً. صدّره أولاً إن أردت الاحتفاظ به.
            </span>
            <button type="button" className="admin-danger" data-testid="project-clear-confirm"
              onClick={() => { clearAssemblyProject(); setConfirmClear(false); onNotice('حُذف المشروع.'); onChanged(); }}>
              نعم، احذف
            </button>
            <button type="button" className="btn-ghost" onClick={() => setConfirmClear(false)}>تراجع</button>
          </span>
        )}
      </div>

      <p style={{ margin: '16px 0 0', fontSize: 12.5, color: 'var(--text-dimmer)', lineHeight: 1.9 }}>
        <Link href="/kb" style={{ color: 'var(--accent-ink)' }}>الموسوعة</Link>
        {' · '}
        <Link href="/diagnose" style={{ color: 'var(--accent-ink)' }}>التشخيص</Link>
      </p>
    </section>
  );
};
