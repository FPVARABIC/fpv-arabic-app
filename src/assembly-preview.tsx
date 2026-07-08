import '@fontsource-variable/cairo/index.css';
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AssemblyLayout } from './components/Assembly/AssemblyLayout';
import { AssemblyHome } from './components/Assembly/AssemblyHome';
import { BuildFlow } from './components/Assembly/BuildFlow';
import { FinalReportScreen } from './components/Assembly/FinalReportScreen';
import { frames } from './data/assembly/parts/frames';
import { motors } from './data/assembly/parts/motors';
import { escs } from './data/assembly/parts/escs';
import { batteries } from './data/assembly/parts/batteries';
import { propellers } from './data/assembly/parts/propellers';
import type { BasePart } from './data/assembly/types';

type Screen =
  | { name: 'home' }
  | { name: 'flow'; droneTypeId: string }
  | { name: 'report'; preset: 'compatible' | 'mismatch' };

// Deterministic demo presets for FinalReportScreen — reproducible on every
// load via the toggle buttons below, not ad-hoc manual selection.
const COMPATIBLE_PRESET: Record<string, BasePart> = {
  frames: frames.find(p => p.id === 'frame-freestyle5-mid')!,
  motors: motors.find(p => p.id === 'motor-2207-mid')!,
  escs: escs.find(p => p.id === 'esc-4in1-mid')!,
  batteries: batteries.find(p => p.id === 'battery-4s-1500-mid')!,
  propellers: propellers.find(p => p.id === 'propeller-5in-mid')!,
};

// Deliberate mismatch: motor-2207-premium is 6S-only, paired with a 4S-only
// battery — forces a visible compatibility failure.
const MISMATCH_PRESET: Record<string, BasePart> = {
  frames: frames.find(p => p.id === 'frame-freestyle5-mid')!,
  motors: motors.find(p => p.id === 'motor-2207-premium')!,
  escs: escs.find(p => p.id === 'esc-4in1-mid')!,
  batteries: batteries.find(p => p.id === 'battery-4s-1500-mid')!,
  propellers: propellers.find(p => p.id === 'propeller-5in-mid')!,
};

const PreviewApp = () => {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  return (
    <div className="min-h-screen flex justify-center" style={{ background: '#f0ebe0' }}>
      <div style={{ width: '100%', maxWidth: '390px', minHeight: '100vh' }}>
        <AssemblyLayout>
          <div style={{ display: 'flex', gap: 8, padding: 8, borderBottom: '1px solid #e5ddcf', flexWrap: 'wrap' }}>
            <button onClick={() => setScreen({ name: 'home' })} style={{ fontSize: 11, padding: '4px 8px' }}>
              الرئيسية
            </button>
            <button onClick={() => setScreen({ name: 'report', preset: 'compatible' })} style={{ fontSize: 11, padding: '4px 8px' }}>
              تقرير متوافق
            </button>
            <button onClick={() => setScreen({ name: 'report', preset: 'mismatch' })} style={{ fontSize: 11, padding: '4px 8px' }}>
              تقرير غير متوافق
            </button>
          </div>

          {screen.name === 'home' && (
            <AssemblyHome onSelectType={droneTypeId => setScreen({ name: 'flow', droneTypeId })} />
          )}
          {screen.name === 'flow' && (
            <BuildFlow droneTypeId={screen.droneTypeId} onChangeType={() => setScreen({ name: 'home' })} />
          )}
          {screen.name === 'report' && (
            <FinalReportScreen
              selections={screen.preset === 'compatible' ? COMPATIBLE_PRESET : MISMATCH_PRESET}
              onBack={() => setScreen({ name: 'home' })}
            />
          )}
        </AssemblyLayout>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PreviewApp />
  </StrictMode>,
);
