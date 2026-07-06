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
// KNOWN GAP (pre-existing, Phase 1): BuildFlow has no in-flow way back to
// AssemblyHome's drone-type selection screen. Pressing "back" past stage-2
// decrements to stage-1, which BuildFlow doesn't special-case — it falls
// through to the generic part-category renderer with zero parts, showing
// an empty dead-end screen rather than AssemblyHome's real six-type grid.
// Leaving the تجميع tab and returning is the only way back to AssemblyHome,
// which (per the gap above) also resets progress.

type Screen = { name: 'home' } | { name: 'flow'; droneTypeId: string };

export const AssemblyView: React.FC = () => {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  return (
    <AppShell tint="cyan">
      <AssemblyLayout>
        {screen.name === 'home' && (
          <AssemblyHome onSelectType={droneTypeId => setScreen({ name: 'flow', droneTypeId })} />
        )}
        {screen.name === 'flow' && <BuildFlow droneTypeId={screen.droneTypeId} />}
      </AssemblyLayout>
    </AppShell>
  );
};
