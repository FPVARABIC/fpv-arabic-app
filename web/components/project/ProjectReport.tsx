'use client';

import Link from 'next/link';
import { webHref } from '@/lib/webRoutes';
import { kbLinkToDestination } from '@core/data/kb/registry';
import {
  SEVERITY_LABEL_AR, SEVERITY_ORDER, selectedPartCount,
  type ProjectSnapshot, type Finding, type FindingCounts, type NextStep,
} from '@/lib/project';

/**
 * The readiness report.
 *
 * IT READS THE SAME VERDICTS, IT DOES NOT RE-DERIVE THEM
 * ------------------------------------------------------
 * Every number and every sentence below comes from the findings the engine
 * already produced. A report computed separately from the thing it reports on
 * is a report that will eventually disagree with it, and the reader will
 * believe whichever one they saw last.
 *
 * «جاهز» IS A HIGH BAR, DELIBERATELY
 * ----------------------------------
 * It is withheld while ANY blocker exists, while any check could not be made
 * for want of data, and while the two irreversible safety tests — failsafe and
 * a props-off motor test — are unrecorded. A first flight is not the moment to
 * discover that a link loss does nothing, so an unrecorded failsafe test is
 * treated as an untested one rather than an assumed-good one.
 */
export const ProjectReport: React.FC<{
  snapshot: ProjectSnapshot;
  findings: Finding[];
  counts: FindingCounts;
  nextStep: NextStep;
}> = ({ snapshot, findings, counts, nextStep }) => {
  const blockers = findings.filter(f => f.severity === 'blocker');
  const warnings = findings.filter(f => f.severity === 'warning');
  const missing = findings.filter(f => f.missingAr.length > 0);
  const manual = findings.filter(f => f.manualCheckAr);

  const rc = snapshot.rcSetup;
  const failsafeTested = !!rc?.failsafeTestedOn;
  const rangeTested = !!rc?.rangeTestedOn;
  const videoSeen = !!snapshot.videoSetup?.imageTestedOn;

  const untested: string[] = [];
  if (!failsafeTested) untested.push('اختبار Failsafe غير مسجَّل');
  if (!rangeTested) untested.push('اختبار المدى غير مسجَّل');
  if (!videoSeen) untested.push('لم يُسجَّل أنك رأيت صورة فعلية من نظام الفيديو');

  const ready = counts.blocker === 0 && counts.unknown === 0 && untested.length === 0;

  return (
    <div data-testid="project-report">
      <section
        className="card"
        data-testid="report-verdict"
        data-ready={ready ? 'yes' : 'no'}
        style={{ padding: '18px 20px' }}
      >
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>
          {ready ? 'المشروع جاهز للمتابعة بحسب ما نستطيع فحصه' : 'المشروع غير جاهز بعد'}
        </h2>
        <p style={{ margin: '9px 0 0', fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.95 }}>
          {ready
            ? 'لا مانع، ولا حكم متوقّف على بيانات ناقصة، والاختبارات الحرجة مسجَّلة. هذا ليس ضماناً بالطيران السليم — إنه يعني أن كل ما تملك المنصة بيانات لفحصه قد فُحص.'
            : 'الأسباب مذكورة أدناه بالترتيب. «غير جاهز» هنا لا تعني أن البناء خاطئ، بل أن شيئاً يمنع الحكم أو يمنع المتابعة الآمنة.'}
        </p>
      </section>

      <Group titleAr="الموانع" testId="report-blockers" tone="danger"
        emptyAr="لا موانع." items={blockers.map(f => f.claimAr)} />

      <Group titleAr="التحذيرات" testId="report-warnings"
        emptyAr="لا تحذيرات." items={warnings.map(f => f.claimAr)} />

      <Group titleAr="البيانات الناقصة" testId="report-missing"
        emptyAr="لا بيانات ناقصة فيما فحصناه."
        items={missing.flatMap(f => f.missingAr.map(m => `${f.claimAr} — ${m}`))} />

      <Group titleAr="ما يحتاج دليل الشركة" testId="report-manual"
        emptyAr="لا شيء يحتاج مراجعة دليل الشركة فيما فحصناه."
        items={manual.map(f => f.manualCheckAr!)} />

      <Group titleAr="اختبارات غير منفّذة" testId="report-untested"
        tone="danger"
        emptyAr="الاختبارات الحرجة مسجَّلة." items={untested} />

      <section className="admin-section" data-testid="report-next">
        <h2>الإجراء التالي</h2>
        <div className="card-sm" style={{ padding: '14px 16px' }}>
          <p style={{ margin: 0, fontSize: 14.5, fontWeight: 800 }}>{nextStep.titleAr}</p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.95 }}>
            {nextStep.reasonAr}
          </p>
          {/* Every action carries a real destination, resolved through the one
              adapter — never a sentence the reader has to act on themselves. */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {blockers.flatMap((f, fi) => f.links.slice(0, 2).map((l, li) => {
              const dest = kbLinkToDestination(l);
              const target = dest ? webHref(dest) : { href: null };
              return target.href ? (
                <Link key={`${fi}-${li}`} href={target.href} className="btn-ghost"
                  data-testid={`report-action-${fi}-${li}`}>
                  {l.label} ←
                </Link>
              ) : null;
            }))}
          </div>
        </div>
      </section>

      <dl className="admin-kv card-sm" data-testid="report-summary" style={{ padding: '15px 17px', marginTop: 20 }}>
        <div><dt>القطع المسجّلة</dt><dd dir="ltr">{selectedPartCount(snapshot)}</dd></div>
        <div><dt>أحكام فُحصت</dt><dd dir="ltr">{findings.length}</dd></div>
        {/* The order comes from the core, not retyped here — a second ordering
            is how «مانع» eventually stops being listed first. */}
        {SEVERITY_ORDER.map(s => (
          <div key={s}><dt>{SEVERITY_LABEL_AR[s]}</dt><dd dir="ltr">{counts[s]}</dd></div>
        ))}
      </dl>
    </div>
  );
};

const Group: React.FC<{
  titleAr: string; items: string[]; emptyAr: string; testId: string; tone?: 'danger';
}> = ({ titleAr, items, emptyAr, testId, tone }) => (
  <section className="admin-section" data-testid={testId}>
    <h2>{titleAr} <span dir="ltr" style={{ color: 'var(--text-dimmer)', fontWeight: 700 }}>({items.length})</span></h2>
    {items.length === 0 ? (
      <p className="card-sm admin-empty" style={{ margin: 0 }}>{emptyAr}</p>
    ) : (
      <ul className="card-sm" style={{
        margin: 0, padding: '13px 15px 13px 34px', paddingInlineStart: 34,
        fontSize: 13.5, lineHeight: 1.95, display: 'grid', gap: 6,
        color: tone === 'danger' ? 'var(--sev-blocker)' : 'var(--text-dim)',
      }}>
        {items.map((t, i) => <li key={i}>{t}</li>)}
      </ul>
    )}
  </section>
);
