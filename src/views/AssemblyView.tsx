import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { AssemblyLayout } from '../components/Assembly/AssemblyLayout';
import { AssemblyHome } from '../components/Assembly/AssemblyHome';
import { BuildFlow } from '../components/Assembly/BuildFlow';
import { loadAndValidateAssemblyProject, type RestoredAssemblyProject } from '../data/project/store';

// Persistence (Phase 2): a valid saved project (see
// components/Assembly/utils/assemblyPersistence.ts) is restored once, here,
// at the initial screen-state decision — read synchronously in the
// useState lazy initializer below, so a page refresh (or simply navigating
// back to التجميع via the bottom nav) lands the user directly back inside
// their in-progress build instead of AssemblyHome. An invalid/corrupt/
// stale save (see that file's validation) resolves to `null` here, which
// falls through to the same clean AssemblyHome start as a brand-new user.
//
// The "تغيير نوع الدرون" link inside BuildFlow calls onChangeType below to
// return here directly, without relying on stage-index navigation (which
// still can't represent "go to AssemblyHome" — see BuildFlow.tsx's fixed
// stage-1 dead-end, now bypassed rather than fixed at its root). It also
// clears the persisted project itself (see BuildFlow.tsx's
// handleChangeType), so returning here never leaves stale progress behind.

type Screen =
  | { name: 'home' }
  | { name: 'flow'; droneTypeId: string; restored?: RestoredAssemblyProject };

export const AssemblyView: React.FC = () => {
  // Navigation lives here, not inside BuildFlow/FinalReportScreen: both are
  // also mounted by assembly-preview.tsx outside the router, where a
  // useNavigate() call would throw.
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>(() => {
    const restored = loadAndValidateAssemblyProject();
    return restored ? { name: 'flow', droneTypeId: restored.droneTypeId, restored } : { name: 'home' };
  });

  return (
    <AppShell tint="cyan">
      <AssemblyLayout>
        {screen.name === 'home' && (
          <AssemblyHome onSelectType={droneTypeId => setScreen({ name: 'flow', droneTypeId })} />
        )}
        {screen.name === 'flow' && (
          <BuildFlow
            droneTypeId={screen.droneTypeId}
            restoredProject={screen.restored}
            onChangeType={() => setScreen({ name: 'home' })}
            onOpenProject={() => navigate('/project')}
          />
        )}
      </AssemblyLayout>
    </AppShell>
  );
};
