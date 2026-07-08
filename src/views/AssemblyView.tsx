import React, { useState } from 'react';
import { AppShell } from '../components/AppShell';
import { AssemblyLayout } from '../components/Assembly/AssemblyLayout';
import { AssemblyHome } from '../components/Assembly/AssemblyHome';
import { BuildFlow } from '../components/Assembly/BuildFlow';

// KNOWN GAP: useAssemblyBuild.ts currently holds build progress in memory
// only (no localStorage persistence despite the originally-planned
// 'fpv-assembly-project-v1' key). Navigating away from التجميع via the
// bottom nav resets any in-progress selection. Fixing this requires a
// serialization/rehydration strategy for selections.parts (full BasePart
// objects) — a separate, dedicated task, not bundled into this integration.
//
// The "تغيير نوع الدرون" link inside BuildFlow calls onChangeType below to
// return here directly, without relying on stage-index navigation (which
// still can't represent "go to AssemblyHome" — see BuildFlow.tsx's fixed
// stage-1 dead-end, now bypassed rather than fixed at its root).

type Screen = { name: 'home' } | { name: 'flow'; droneTypeId: string };

export const AssemblyView: React.FC = () => {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  return (
    <AppShell tint="cyan">
      <AssemblyLayout>
        {screen.name === 'home' && (
          <AssemblyHome onSelectType={droneTypeId => setScreen({ name: 'flow', droneTypeId })} />
        )}
        {screen.name === 'flow' && (
          <BuildFlow droneTypeId={screen.droneTypeId} onChangeType={() => setScreen({ name: 'home' })} />
        )}
      </AssemblyLayout>
    </AppShell>
  );
};
