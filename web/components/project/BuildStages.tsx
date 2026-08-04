'use client';

import { useState } from 'react';
import Link from 'next/link';
import { roadmapData } from '@core/data/roadmapData';
import { roadmapStageContent } from '@core/data/roadmapStageContent';
import { checklistsData } from '@core/data/checklistsData';
import { webHref } from '@/lib/webRoutes';
import type { ProjectSnapshot, Finding } from '@/lib/project';

/**
 * The build lifecycle: what to do, in what order, and what must not be skipped.
 *
 * NOT A CHECKLIST OF TITLES
 * -------------------------
 * Each stage renders the whole record the shared core holds for it —
 * preparation, the practical steps, the warnings, the common mistakes, the
 * acceptance checks, and the stop conditions. The stop conditions matter most:
 * they are the "do not continue past here" rules, and a stage list that showed
 * only titles would be exactly the shallow checklist the requirement rejected.
 *
 * SAFETY IS NEVER COLLAPSED INTO A TICK
 * -------------------------------------
 * The warnings and stop conditions are always visible for the OPEN stage, not
 * hidden behind a disclosure — the rule about never spinning motors with props
 * fitted, or connecting a battery before a smoke-stopper check, is not
 * supplementary detail.
 *
 * WHY THE STAGES ARE READ AND NOT WRITTEN
 * ---------------------------------------
 * Per-stage completion is tracked in the phone app. Adding a second, web-only
 * completion record would create two answers to "have I done the short check",
 * and this batch's storage contract has no place for it. So the web shows the
 * work and the order; it does not claim to know what you have finished.
 */
export const BuildStages: React.FC<{
  snapshot: ProjectSnapshot;
  findings: Finding[];
}> = ({ snapshot, findings }) => {
  const [open, setOpen] = useState<string | null>(roadmapData[0]?.id ?? null);

  // A blocker is a reason not to move on, wherever the reader is in the build.
  const blockers = findings.filter(f => f.severity === 'blocker');

  return (
    <div data-testid="project-stages">
      {blockers.length > 0 && (
        <p role="alert" data-testid="stages-blocked" className="card-sm" style={{
          padding: '13px 15px', margin: '0 0 16px', fontSize: 13.5,
          color: 'var(--sev-blocker)', lineHeight: 1.95,
        }}>
          يوجد <span dir="ltr">{blockers.length}</span> مانع في مشروعك. عالجها قبل
          الوصول إلى مرحلة التشغيل الأول — المانع يعني أن المتابعة تُتلف قطعاً أو
          لا تعمل أصلاً، لا أنها أصعب.
        </p>
      )}

      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
        {roadmapData.map(step => {
          const content = roadmapStageContent[step.id as keyof typeof roadmapStageContent];
          const isOpen = open === step.id;
          return (
            <li key={step.id} className="card-sm" data-testid={`stage-${step.id}`} style={{ padding: '14px 16px' }}>
              <button
                type="button"
                aria-expanded={isOpen}
                data-testid={`stage-toggle-${step.id}`}
                onClick={() => setOpen(isOpen ? null : step.id)}
                style={{
                  width: '100%', textAlign: 'start', background: 'none', border: 'none',
                  cursor: 'pointer', fontFamily: 'inherit', color: 'inherit', padding: 0,
                }}
              >
                <span style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span className="admin-badge admin-badge-role" dir="ltr">{step.number}</span>
                  <span style={{ fontSize: 15, fontWeight: 900, flex: 1 }}>{step.title}</span>
                </span>
                <span style={{ display: 'block', fontSize: 13, color: 'var(--text-dim)', marginTop: 6, lineHeight: 1.9 }}>
                  {step.description}
                </span>
              </button>

              {isOpen && content && (
                <div data-testid={`stage-detail-${step.id}`} style={{ marginTop: 14, display: 'grid', gap: 13 }}>
                  {content.warnings.length > 0 && (
                    <Block titleAr="تحذيرات" tone="danger" items={content.warnings} testId={`stage-warnings-${step.id}`} />
                  )}
                  {content.stopConditions.length > 0 && (
                    <Block titleAr="متى تتوقف ولا تُكمل" tone="danger" items={content.stopConditions} testId={`stage-stop-${step.id}`} />
                  )}
                  {content.preparation.length > 0 && (
                    <Block titleAr="التحضير" items={content.preparation} />
                  )}
                  {content.practicalSteps.length > 0 && (
                    <Block titleAr="الخطوات العملية" items={content.practicalSteps} />
                  )}
                  {content.acceptanceChecks.length > 0 && (
                    <Block titleAr="كيف تعرف أنها نجحت" items={content.acceptanceChecks} testId={`stage-accept-${step.id}`} />
                  )}
                  {content.commonMistakes.length > 0 && (
                    <Block titleAr="أخطاء شائعة" items={content.commonMistakes} />
                  )}
                  {step.checklist.length > 0 && (
                    <Block titleAr="قائمة المرحلة" items={step.checklist} />
                  )}

                  <StageParts snapshot={snapshot} />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* The test-and-fly phase. These live in the shared checklist data rather
          than the roadmap, and the requirement named them explicitly, so they
          are rendered here rather than left to the phone. */}
      <section className="admin-section" aria-labelledby="checklists-h" data-testid="project-checklists">
        <h2 id="checklists-h">قوائم الفحص</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {checklistsData.map(group => (
            <section key={group.id} className="card-sm" data-testid={`checklist-${group.id}`} style={{ padding: '14px 16px' }}>
              <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 900 }}>{group.title}</h3>
              <ul style={LIST}>
                {group.items.map(i => <li key={i.id}>{i.text}</li>)}
              </ul>
            </section>
          ))}
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-dimmer)', lineHeight: 1.9, margin: '12px 0 0' }}>
          تتبّع ما أنجزته من هذه القوائم متاح في تطبيق الهاتف؛ الويب يعرض العمل
          وترتيبه ولا يدّعي معرفة ما أتممته.
        </p>
      </section>

      <p style={{ marginTop: 18, fontSize: 13 }}>
        <Link href={webHref({ kind: 'diagnose' }).href ?? '/diagnose'} className="btn-ghost" data-testid="stages-to-diagnose">
          شيء لا يعمل؟ ابدأ من التشخيص ←
        </Link>
      </p>
    </div>
  );
};

const LIST: React.CSSProperties = {
  margin: '8px 0 0', paddingInlineStart: 20, fontSize: 13.5,
  lineHeight: 1.95, color: 'var(--text-dim)', display: 'grid', gap: 4,
};

const Block: React.FC<{
  titleAr: string; items: string[]; tone?: 'danger'; testId?: string;
}> = ({ titleAr, items, tone, testId }) => (
  <div data-testid={testId}>
    <h4 style={{
      margin: 0, fontSize: 12, fontWeight: 900,
      color: tone === 'danger' ? 'var(--sev-blocker)' : 'var(--text-dimmer)',
    }}>
      {titleAr}
    </h4>
    <ul style={{ ...LIST, color: tone === 'danger' ? 'var(--sev-blocker)' : 'var(--text-dim)' }}>
      {items.map((t, i) => <li key={i}>{t}</li>)}
    </ul>
  </div>
);

/** Which of the reader's own parts this stage is about. */
const StageParts: React.FC<{ snapshot: ProjectSnapshot }> = ({ snapshot }) => {
  const names = Object.values(snapshot.parts).map(p => p.nameAr);
  if (names.length === 0) return null;
  return (
    <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-dimmer)', lineHeight: 1.9 }}>
      قطعك المسجَّلة: {names.join('، ')}
    </p>
  );
};
