'use client';

import dynamic from 'next/dynamic';

/**
 * The wizard's client boundary — same pattern, same reasons, as
 * `ProjectClient.tsx`: the draft and the project live in localStorage, so
 * rendering the wizard on the server would paint an empty build and swap in
 * the real one after hydration. `ssr: false` may only be declared from a
 * client component, and this file exists to be that component.
 */
const BuildWizard = dynamic(
  () => import('./BuildWizard').then(m => ({ default: m.BuildWizard })),
  {
    ssr: false,
    loading: () => (
      <p className="card-sm" data-testid="build-wizard-loading" style={{ padding: '18px 20px' }}>
        جارٍ فتح مسار البناء…
      </p>
    ),
  },
);

export const BuildWizardClient: React.FC = () => <BuildWizard />;
