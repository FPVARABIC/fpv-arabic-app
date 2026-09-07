'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { loadDraft } from '@/lib/build/draft';
import { loadAndValidateAssemblyProject } from '@core/data/project/store';
import { TOTAL_BUILD_STEPS } from '@/lib/build/path';

/**
 * «تابع من حيث توقفت» — shown on the /build landing only when there is
 * genuinely something to continue.
 *
 * The landing IS server-rendered (public, indexable), and the server cannot
 * know what a browser has saved — so the server snapshot is always «nothing»,
 * and `useSyncExternalStore` swaps in the browser's real answer after
 * hydration without a mismatch and without the setState-in-effect cascade
 * the lint rule rightly rejects. The snapshot is a primitive string so the
 * store never loops on a fresh object identity.
 */
const noSubscription = () => () => {};
function readResumeStatus(): string {
  const draft = loadDraft();
  if (draft && (draft.droneTypeId || draft.mode)) return `resume:${draft.stepIndex + 1}`;
  return loadAndValidateAssemblyProject() ? 'fromApp' : 'none';
}

export const BuildResume: React.FC = () => {
  const status = useSyncExternalStore(noSubscription, readResumeStatus, () => 'none');
  const resume = status.startsWith('resume:')
    ? { stepNumber: Number(status.slice('resume:'.length)) }
    : null;
  const fromApp = status === 'fromApp';

  if (!resume && !fromApp) return null;

  return (
    <div className="card" data-testid="build-resume" style={{
      padding: '16px 18px', marginTop: 18,
      display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
    }}>
      <p style={{ margin: 0, flex: 1, minWidth: 220, fontSize: 13.5, lineHeight: 1.9 }}>
        {resume
          ? <>لديك بناء قيد التنفيذ — توقفت عند الخطوة <b dir="ltr">{resume.stepNumber}</b> من <span dir="ltr">{TOTAL_BUILD_STEPS}</span>. اختياراتك محفوظة.</>
          : <>وجدنا مشروع بناء محفوظاً من التطبيق — يمكنك المتابعة من هنا بنفس القطع.</>}
      </p>
      <Link href="/build/wizard" className="btn-primary" data-testid="build-resume-cta"
        style={{ fontSize: 13 }}>
        تابع البناء ←
      </Link>
    </div>
  );
};
