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

// Looks up a preset part by id and throws immediately (loud, at module-load
// time) if the id no longer matches anything in the real data file, instead
// of silently producing `undefined` (the previous find-then-assert-non-null
// pattern hid this from TypeScript, but at runtime it made every preset
// part vanish from FinalReportScreen with zero indication why — confirmed
// live in a browser during the Assembly Corner audit). A stale id here
// must fail obviously, not quietly render an empty report.
function requirePart<T extends BasePart>(list: T[], id: string): T {
  const found = list.find(p => p.id === id);
  if (!found) {
    throw new Error(
      `[assembly-preview] Preset part id "${id}" was not found in its data file. ` +
      `The preset is stale and must be updated to a current, real part id.`,
    );
  }
  return found;
}

// Deterministic demo presets for FinalReportScreen — reproducible on every
// load via the toggle buttons below, not ad-hoc manual selection. IDs
// verified against the real parts/*.ts files (2026-07) and cross-checked
// against compatibility/validators.ts: frame-aos5-evo-mid (freestyle,
// 5.1") + motor-iflight-xing2-2207-mid (freestyle, frameSizeInch 5, 6S)
// pass validateFrameMotor's 0.15" tolerance; the 6S motor + esc-tmotor-
// f55a-pro-ii-mid (3-6S) + battery-gnb-1100-6s-mid (6S) pass
// validateMotorBattery/validateEscBattery; propeller-hqprop-ethix-s5-mid
// (5", freestyle) fits frame-aos5-evo-mid's implicit maxPropSizeInch
// (falls back to its own 5.1" sizeInch). All 4 checks compatible.
const COMPATIBLE_PRESET: Record<string, BasePart> = {
  frames: requirePart(frames, 'frame-aos5-evo-mid'),
  motors: requirePart(motors, 'motor-iflight-xing2-2207-mid'),
  escs: requirePart(escs, 'esc-tmotor-f55a-pro-ii-mid'),
  batteries: requirePart(batteries, 'battery-gnb-1100-6s-mid'),
  propellers: requirePart(propellers, 'propeller-hqprop-ethix-s5-mid'),
};

// Deliberate mismatch: identical build to COMPATIBLE_PRESET except the
// battery is swapped to a 4S-only pack — motor-iflight-xing2-2207-mid's
// specs.compatibleVoltages is [6] only, so validateMotorBattery fails
// while the other 3 checks (frame-motor, esc-battery, frame-propeller)
// still pass, producing a real, visible, partial compatibility failure
// rather than an all-or-nothing result.
const MISMATCH_PRESET: Record<string, BasePart> = {
  ...COMPATIBLE_PRESET,
  batteries: requirePart(batteries, 'battery-tattu-rline-1550-4s-budget'),
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
