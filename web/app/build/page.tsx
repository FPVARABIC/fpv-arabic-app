import type { Metadata } from 'next';
import Link from 'next/link';
import { roadmapData } from '@core/data/roadmapData';
import { buildStages } from '@core/data/assembly/buildStages';
import type { ProjectSnapshot } from '@core/data/project/types';
import { BuildStages } from '@/components/project/BuildStages';

export const metadata: Metadata = {
  title: 'البناء',
  description:
    'مراحل بناء الطائرة بالترتيب: التحضير، الخطوات العملية، التحذيرات، ومتى تتوقف ولا تُكمل — ثم قوائم الفحص قبل أول تشغيل.',
  alternates: { canonical: '/build' },
};

/**
 * «البناء» — the build guide, as a section of its own.
 *
 * WHY THIS ROUTE HAD TO EXIST
 * ---------------------------
 * The build stages are not new content and this page does not write any. The
 * whole record — `roadmapData`, `roadmapStageContent`, `checklistsData` — has
 * been on the web since the project batch, rendered by `BuildStages`. What it
 * did NOT have was a door.
 *
 * `BuildStages` was mounted in exactly one place: the `stages` tab inside
 * `/project`. That page is «مشروعي» — a PRIVATE workspace, `robots: noindex`,
 * behind an `ssr: false` island, and it renders `<EmptyProject/>` instead of
 * the workspace until the reader has created a project in this browser. So a
 * beginner who had not registered any parts could not reach a single build
 * stage, and «البناء» — a tab in the phone app — had no counterpart anywhere in
 * the web's navigation. That is why it read as missing: not deleted, undoorway.
 *
 * WHY IT IS NOT A DUPLICATE ROUTE
 * -------------------------------
 * There was no build route on the web to duplicate. `/roadmap` and `/assembly`
 * are PHONE routes, and `webRoutes.PHONE_ONLY_KINDS` still declares their deep
 * links phone-only — a link to one specific stage still has no web address, and
 * this page does not invent one. This is the section INDEX, and it renders the
 * same component `/project` renders, from the same data. Nothing is copied.
 *
 * WHY IT IS SERVER-RENDERED WITH NO PROJECT
 * -----------------------------------------
 * The guide is public: the order of the work, the warnings and the stop
 * conditions are true before anyone owns a part. So the page passes an empty
 * snapshot and no findings, which is exactly what `BuildStages` already handles
 * — `StageParts` renders nothing without parts, and the blockers banner needs a
 * finding to appear. The reader's OWN parts and their compatibility verdicts
 * stay where they belong, in «مشروعي», and this page links there.
 *
 * The consequence worth having: the whole guide is in the HTML. No JavaScript,
 * no localStorage, no empty page for a crawler or for a reader on a slow phone.
 */

/**
 * A project nobody has started.
 *
 * Written as a literal rather than read through `readProjectSnapshot()` because
 * this is a server component: the reader's project lives in localStorage, which
 * the server cannot see, and calling the reader would return this same value by
 * a longer road while pulling the assembly store into the server bundle.
 */
const NO_PROJECT: ProjectSnapshot = {
  exists: false,
  stageIndex: 0,
  totalStages: buildStages.length,
  parts: {},
};

export default function BuildPage() {
  return (
    <div className="shell" style={{ paddingTop: 30, paddingBottom: 44, maxWidth: 1100 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span> البناء
      </nav>

      <h1 style={{ fontSize: 27, fontWeight: 900, margin: '14px 0 8px' }}>البناء</h1>
      <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 2, margin: '0 0 10px', maxWidth: 760 }}>
        <span dir="ltr" style={{ fontWeight: 900, color: 'var(--accent-ink)' }}>{roadmapData.length}</span>
        {' '}مراحل بالترتيب الذي تُنفَّذ به فعلاً — التحضير، الخطوات العملية، التحذيرات،
        وأخطاء شائعة، وكيف تعرف أن المرحلة نجحت. ومع كل مرحلة «متى تتوقف ولا تُكمل»:
        شروط المتابعة بعدها تُتلف قطعاً، لا شروط تجعلها أصعب.
      </p>
      <p style={{ fontSize: 13, color: 'var(--text-dimmer)', lineHeight: 1.95, margin: '0 0 24px', maxWidth: 760 }}>
        هذه الصفحة تعرض العمل وترتيبه للجميع. أما قطعك أنت وأحكام التوافق المحسوبة
        منها فمكانها{' '}
        <Link href="/project" data-testid="build-to-project">مشروعي</Link>.
      </p>

      <BuildStages snapshot={NO_PROJECT} findings={[]} />
    </div>
  );
}
