import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import {
  Wrench, ChevronLeft, ChevronDown, ArrowLeft, CircleAlert, TriangleAlert,
  CircleHelp, CircleCheck, Layers, BookOpen, Stethoscope,
} from 'lucide-react';
import { readProjectSnapshot } from '../data/project/snapshot';
import { computeFindings, countFindings } from '../data/project/verdicts';
import { computeNextStep } from '../data/project/nextStep';
import {
  SEVERITY_LABEL_AR, CONFIDENCE_LABEL_AR,
  type Finding, type FindingSeverity,
} from '../data/project/types';
import { resolveLinkRoute } from '../data/kb/registry';
import { RichText } from '../components/kb/Term';

const SEV: Record<FindingSeverity, { bg: string; fg: string; border: string; Icon: typeof CircleAlert }> = {
  blocker: { bg: 'rgba(239,68,68,0.10)', fg: '#b91c1c', border: 'rgba(239,68,68,0.30)', Icon: CircleAlert },
  warning: { bg: 'rgba(245,158,11,0.12)', fg: '#b45309', border: 'rgba(245,158,11,0.32)', Icon: TriangleAlert },
  unknown: { bg: 'rgba(100,116,139,0.12)', fg: '#475569', border: 'rgba(100,116,139,0.28)', Icon: CircleHelp },
  ok: { bg: 'rgba(16,185,129,0.10)', fg: '#047857', border: 'rgba(16,185,129,0.28)', Icon: CircleCheck },
};

/**
 * «مشروعي» — the workspace.
 *
 * This screen is the platform's answer to the one question no article on the
 * internet can answer: *what is wrong with MY build, right now?*
 *
 * Everything on it is derived from the user's actual saved selections at render
 * time. There is no score, deliberately — a percentage would average a
 * voltage mismatch that burns hardware together with a missing spec sheet, and
 * both would disappear behind a number that feels like progress.
 */
export const ProjectView: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState<string | null>(null);

  const project = useMemo(() => readProjectSnapshot(), []);
  const findings = useMemo(() => computeFindings(project), [project]);
  const counts = useMemo(() => countFindings(findings), [findings]);
  const next = useMemo(() => computeNextStep(project, findings), [project, findings]);

  const partRows = useMemo(() => ([
    { labelAr: 'الهيكل', part: project.frame },
    { labelAr: 'المحركات', part: project.motor },
    { labelAr: 'الـESC', part: project.esc },
    { labelAr: 'متحكم الطيران', part: project.flightController },
    { labelAr: 'البطارية', part: project.battery },
    { labelAr: 'المراوح', part: project.propeller },
    { labelAr: 'المستقبل', part: project.receiver },
    { labelAr: 'وحدة الفيديو', part: project.videoUnit },
    { labelAr: 'وحدة GPS', part: project.gps },
  ].filter(r => r.part)), [project]);

  return (
    <AppShell tint="blue">
      <Header title="مشروعي" />

      <div className="fade-in" style={{ background: '#f8fafc', minHeight: '100%', padding: '14px 16px 28px' }}>

        {/* ── The next action. Always first, always exactly one. ─────────── */}
        <div
          data-testid="project-next-step"
          data-blocked={next.isBlocked ? 'true' : 'false'}
          style={{
            background: next.isBlocked
              ? 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))'
              : 'linear-gradient(135deg, rgba(14,165,233,0.13), rgba(56,189,248,0.05))',
            border: `1px solid ${next.isBlocked ? 'rgba(239,68,68,0.28)' : 'rgba(14,165,233,0.25)'}`,
            borderRadius: 18, padding: 16, marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
            <Wrench size={17} style={{ color: next.isBlocked ? '#b91c1c' : '#0369a1' }} aria-hidden />
            <span style={{ fontSize: 11.5, fontWeight: 800, color: next.isBlocked ? '#b91c1c' : '#0369a1' }}>
              {next.isBlocked ? 'أوقف الشراء — هناك مانع' : 'خطوتك التالية'}
            </span>
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', margin: '0 0 6px' }}>
            {next.titleAr}
          </h2>
          <p style={{ fontSize: 12.5, lineHeight: 1.85, color: '#334155', margin: '0 0 12px' }}>
            <RichText text={next.reasonAr} idKey="next-reason" />
          </p>
          <button
            type="button"
            data-testid="project-next-cta"
            onClick={() => navigate(next.route)}
            style={{
              background: next.isBlocked ? '#b91c1c' : '#0369a1', color: '#fff', border: 'none',
              borderRadius: 11, padding: '10px 16px', fontSize: 13, fontWeight: 800,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            {next.ctaAr}
            <ArrowLeft size={15} aria-hidden />
          </button>
        </div>

        {!project.exists ? (
          <EmptyState navigate={navigate} />
        ) : (
          <>
            {/* ── What the project is ─────────────────────────────────────── */}
            <Section title="طائرتي">
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: partRows.length ? 10 : 0 }}>
                {project.droneTypeName && <Chip>{project.droneTypeName}</Chip>}
                {project.sizeInch !== undefined && <Chip>{project.sizeInch} بوصة</Chip>}
                {project.cellCount !== undefined && <Chip>{project.cellCount}S</Chip>}
                <Chip>المرحلة {project.stageIndex + 1} من {project.totalStages}</Chip>
              </div>
              {partRows.map(r => (
                <div
                  key={r.labelAr}
                  data-testid={`project-part-${r.part!.id}`}
                  style={{
                    display: 'flex', gap: 8, alignItems: 'baseline', padding: '7px 0',
                    borderTop: '1px solid rgba(15,23,42,0.06)',
                  }}
                >
                  <span style={{ fontSize: 11.5, color: '#64748b', minWidth: 92 }}>{r.labelAr}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', flex: 1 }}>
                    {r.part!.nameAr}
                  </span>
                </div>
              ))}
            </Section>

            {/* ── The verdicts ────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7, marginBottom: 12 }}>
              <Tile n={counts.blocker} labelAr="مانع" sev="blocker" testid="project-count-blocker" />
              <Tile n={counts.warning} labelAr="تحذير" sev="warning" testid="project-count-warning" />
              <Tile n={counts.unknown} labelAr="ناقص" sev="unknown" testid="project-count-unknown" />
              <Tile n={counts.ok} labelAr="تحقّق" sev="ok" testid="project-count-ok" />
            </div>

            {findings.length === 0 ? (
              <Section title="الفحوص">
                <p style={{ fontSize: 12.5, lineHeight: 1.85, color: '#475569', margin: 0 }}>
                  لم تختر بعد قطعاً تكفي لإجراء أي فحص. كل فحص يحتاج قطعتين على الأقل ليقارن بينهما —
                  اختر المحرك والبطارية مثلاً وسيظهر فحص الجهد فوراً.
                </p>
              </Section>
            ) : (
              <div data-testid="project-findings">
                {findings.map(x => (
                  <FindingCard
                    key={x.id}
                    f={x}
                    open={open === x.id}
                    onToggle={() => setOpen(open === x.id ? null : x.id)}
                    navigate={navigate}
                  />
                ))}
              </div>
            )}

            {/* ── Contextual doorways: the same content, filtered to this build ── */}
            <Section title="من مشروعك إلى بقية المنصة">
              <p style={{ fontSize: 11.5, lineHeight: 1.8, color: '#64748b', margin: '0 0 10px' }}>
                هذه المداخل تنطلق من قطعك أنت لا من محتوى عام.
              </p>
              <Doorway
                Icon={Layers} labelAr="أكمل البناء خطوة بخطوة" onClick={() => navigate('/assembly')}
                testid="project-door-assembly"
              />
              <Doorway
                Icon={BookOpen} labelAr="افهم الأنظمة التي اخترتها" onClick={() => navigate('/kb')}
                testid="project-door-kb"
              />
              <Doorway
                Icon={Stethoscope} labelAr="شخّص عطلاً في هذه الطائرة" onClick={() => navigate('/diagnose')}
                testid="project-door-diagnose"
              />
            </Section>
          </>
        )}
      </div>
    </AppShell>
  );
};

// ── pieces ───────────────────────────────────────────────────────────────────

const FindingCard: React.FC<{
  f: Finding;
  open: boolean;
  onToggle: () => void;
  navigate: (to: string) => void;
}> = ({ f, open, onToggle, navigate }) => {
  const s = SEV[f.severity];
  return (
    <div
      data-testid={`project-finding-${f.id}`}
      data-severity={f.severity}
      style={{
        background: '#fff', border: `1px solid ${s.border}`, borderRadius: 14,
        padding: '12px 13px', marginBottom: 8,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          textAlign: 'right', display: 'flex', gap: 9, alignItems: 'flex-start',
        }}
      >
        <s.Icon size={17} style={{ color: s.fg, flexShrink: 0, marginTop: 1 }} aria-hidden />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 3 }}>
            <span
              style={{
                fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
                background: s.bg, color: s.fg,
              }}
            >
              {SEVERITY_LABEL_AR[f.severity]}
            </span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', lineHeight: 1.65 }}>
            <RichText text={f.claimAr} idKey={`claim-${f.id}`} />
          </div>
        </div>
        <ChevronDown
          size={16}
          style={{ color: '#94a3b8', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
          aria-hidden
        />
      </button>

      {open && (
        <div style={{ marginTop: 10 }}>
          <Field label="لماذا">
            <RichText text={f.whyAr} idKey={`why-${f.id}`} />
          </Field>

          {f.evidenceAr.length > 0 && (
            <Field label="على أي بيانات">
              {f.evidenceAr.map((e, i) => (
                <div key={i} style={LI}>• <RichText text={e} idKey={`ev-${f.id}-${i}`} /></div>
              ))}
            </Field>
          )}

          <Field label="درجة الثقة">{CONFIDENCE_LABEL_AR[f.confidence]}</Field>

          {f.missingAr.length > 0 && (
            <Field label="بيانات ناقصة">
              {f.missingAr.map((m, i) => (
                <div key={i} style={LI}>• <RichText text={m} idKey={`ms-${f.id}-${i}`} /></div>
              ))}
            </Field>
          )}

          {f.manualCheckAr && (
            <Field label="يحتاج دليل الشركة">
              <RichText text={f.manualCheckAr} idKey={`mc-${f.id}`} />
            </Field>
          )}

          {f.actionsAr.length > 0 && (
            <Field label="ما تفعله الآن">
              {f.actionsAr.map((a, i) => (
                <div key={i} style={LI}>• <RichText text={a} idKey={`ac-${f.id}-${i}`} /></div>
              ))}
            </Field>
          )}

          {f.links.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 9 }}>
              {f.links.map(l => {
                const route = resolveLinkRoute({ kind: l.kind, targetId: l.targetId, label: l.label });
                if (!route) return null;
                return (
                  <button
                    key={`${l.kind}-${l.targetId}`}
                    type="button"
                    data-testid={`project-link-${l.targetId}`}
                    onClick={() => navigate(route)}
                    style={{
                      fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 999,
                      background: 'rgba(14,165,233,0.10)', color: '#0369a1',
                      border: '1px solid rgba(14,165,233,0.25)', cursor: 'pointer',
                    }}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: 9 }}>
    <div style={{ fontSize: 10.5, fontWeight: 800, color: '#94a3b8', marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 12, lineHeight: 1.85, color: '#334155' }}>{children}</div>
  </div>
);

const LI: React.CSSProperties = { fontSize: 12, lineHeight: 1.85, color: '#334155' };

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div
    style={{
      background: '#fff', border: '1px solid rgba(15,23,42,0.09)', borderRadius: 15,
      padding: '13px 14px', marginBottom: 12,
    }}
  >
    <h3 style={{ fontSize: 13.5, fontWeight: 900, color: '#0f172a', margin: '0 0 9px' }}>{title}</h3>
    {children}
  </div>
);

const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
      background: 'rgba(14,165,233,0.10)', color: '#0369a1', border: '1px solid rgba(14,165,233,0.20)',
    }}
  >
    {children}
  </span>
);

const Tile: React.FC<{ n: number; labelAr: string; sev: FindingSeverity; testid: string }> = ({
  n, labelAr, sev, testid,
}) => {
  const s = SEV[sev];
  return (
    <div
      data-testid={testid}
      data-count={n}
      style={{
        background: n > 0 ? s.bg : 'rgba(148,163,184,0.08)',
        border: `1px solid ${n > 0 ? s.border : 'rgba(148,163,184,0.18)'}`,
        borderRadius: 12, padding: '9px 4px', textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 900, color: n > 0 ? s.fg : '#94a3b8' }}>{n}</div>
      <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 1 }}>{labelAr}</div>
    </div>
  );
};

const Doorway: React.FC<{
  Icon: typeof Layers; labelAr: string; onClick: () => void; testid: string;
}> = ({ Icon, labelAr, onClick, testid }) => (
  <button
    type="button"
    data-testid={testid}
    onClick={onClick}
    style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 9, background: 'none',
      border: 'none', borderTop: '1px solid rgba(15,23,42,0.06)', padding: '11px 0',
      cursor: 'pointer', textAlign: 'right',
    }}
  >
    <Icon size={16} style={{ color: '#0369a1', flexShrink: 0 }} aria-hidden />
    <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>{labelAr}</span>
    <ChevronLeft size={15} style={{ color: '#94a3b8' }} aria-hidden />
  </button>
);

const EmptyState: React.FC<{ navigate: (to: string) => void }> = ({ navigate }) => (
  <Section title="لماذا يستحق إنشاء مشروع">
    <p style={{ fontSize: 12.5, lineHeight: 1.9, color: '#334155', margin: '0 0 10px' }}>
      المقال على الإنترنت يستطيع أن يقول لك «تحقّق أن جهد البطارية ضمن نطاق المحرك».
      لا يستطيع أن يقول لك إن محركك يقبل حتى 4S وبطاريتك 6S. هذا الفرق هو ما يفعله
      هذا القسم: يقرأ قطعك أنت، ويحكم عليها، ويشرح سبب الحكم، ويقول لك بصراحة ما
      الذي لا نعرفه وأين تجده.
    </p>
    <Doorway
      Icon={Layers} labelAr="ابدأ من اختيار نوع الدرون" onClick={() => navigate('/assembly')}
      testid="project-door-start"
    />
  </Section>
);
