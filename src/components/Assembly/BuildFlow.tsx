import React from 'react';
import { droneSizeOptions } from '../../data/assembly/droneSizeOptions';
import { batteryVoltageOptions } from '../../data/assembly/batteryVoltageOptions';
import { frames } from '../../data/assembly/parts/frames';
import { motors } from '../../data/assembly/parts/motors';
import { escs } from '../../data/assembly/parts/escs';
import { flightControllers } from '../../data/assembly/parts/flightControllers';
import { receivers } from '../../data/assembly/parts/receivers';
import { videoSystems } from '../../data/assembly/parts/videoSystems';
import { videoUnits } from '../../data/assembly/parts/videoUnits';
import { gps } from '../../data/assembly/parts/gps';
import { buzzers } from '../../data/assembly/parts/buzzers';
import { capacitors } from '../../data/assembly/parts/capacitors';
import { propellers } from '../../data/assembly/parts/propellers';
import { batteries } from '../../data/assembly/parts/batteries';
import { tools } from '../../data/assembly/parts/tools';
import { StageHeader } from './StageHeader';
import { PartCardsContainer } from './PartCardsContainer';
import { StageNavigation } from './StageNavigation';
import { FinalReportScreen } from './FinalReportScreen';
import { useAssemblyBuild } from './hooks/useAssemblyBuild';
import type { BasePart } from '../../data/assembly/types';

const PART_CATEGORY_MAP: Record<string, BasePart[]> = {
  frames, motors, escs, flightControllers, receivers, videoSystems, videoUnits,
  gps, buzzers, capacitors, propellers, batteries, tools,
};

const OPTION_ICON_DEFAULTS = { size: '📏', voltage: '🔋' } as const;

interface OptionCardProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  iconKind: keyof typeof OPTION_ICON_DEFAULTS;
  imagePath?: string;
  placeholderIcon?: string;
}

// Compact icon-card shared by Stage 2 (size) and Stage 4 (battery voltage) —
// same fixed-4:3-container + emoji-fallback pattern used everywhere else.
const OptionCard: React.FC<OptionCardProps> = ({ label, selected, onClick, iconKind, imagePath, placeholderIcon }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      padding: 8, borderRadius: 10, textAlign: 'center', cursor: 'pointer',
      border: selected ? '2px solid #D4A574' : '1px solid #e5ddcf',
      background: selected ? '#fffbf7' : '#ffffff',
    }}
  >
    <div style={{
      width: '100%', aspectRatio: '4 / 3', borderRadius: 8, background: '#f5f1e8',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, overflow: 'hidden',
    }}>
      {imagePath ? (
        <img src={imagePath} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span>{placeholderIcon ?? OPTION_ICON_DEFAULTS[iconKind]}</span>
      )}
    </div>
    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#3a2e1f' }}>{label}</span>
  </button>
);

interface BuildFlowProps {
  droneTypeId: string;
}

// Starts at stage index 1 (Stage 2 — Size): Stage 1 (drone type) is already
// resolved by AssemblyHome before BuildFlow mounts.
export const BuildFlow: React.FC<BuildFlowProps> = ({ droneTypeId }) => {
  const { stage, stageIndex, totalStages, selections, goNext, goPrev, selectSize, selectBatteryVoltage, selectPart } =
    useAssemblyBuild(1);

  if (stage.id === 'stage-17') {
    return <FinalReportScreen selections={selections.parts} droneTypeId={droneTypeId} onBack={goPrev} />;
  }

  if (stage.id === 'stage-18' || stage.id === 'stage-19') {
    return (
      <div>
        <StageHeader stageNumber={stage.number} totalStages={totalStages} titleAr={stage.titleAr} descriptionAr={stage.descriptionAr} />
        <p style={{ padding: '0 16px', fontSize: 13, color: '#7a6a52' }}>هذه الميزة قيد التطوير — قريباً</p>
        <StageNavigation
          canGoPrev
          canGoNext={stageIndex < totalStages - 1}
          isLastStage={stage.id === 'stage-19'}
          onPrev={goPrev}
          onNext={goNext}
        />
      </div>
    );
  }

  if (stage.id === 'stage-2') {
    return (
      <div>
        <StageHeader stageNumber={stage.number} totalStages={totalStages} titleAr={stage.titleAr} descriptionAr={stage.descriptionAr} />
        <div style={{ padding: '4px 16px', display: 'flex', gap: 8 }}>
          {droneSizeOptions.map(opt => (
            <OptionCard
              key={opt.sizeInch}
              label={opt.labelAr}
              selected={selections.sizeInch === opt.sizeInch}
              onClick={() => selectSize(opt.sizeInch)}
              iconKind="size"
              imagePath={opt.imagePath}
              placeholderIcon={opt.placeholderIcon}
            />
          ))}
        </div>
        <StageNavigation canGoPrev canGoNext={selections.sizeInch !== undefined} isLastStage={false} onPrev={goPrev} onNext={goNext} />
      </div>
    );
  }

  if (stage.id === 'stage-4') {
    return (
      <div>
        <StageHeader stageNumber={stage.number} totalStages={totalStages} titleAr={stage.titleAr} descriptionAr={stage.descriptionAr} />
        <div style={{ padding: '4px 16px', display: 'flex', gap: 8 }}>
          {batteryVoltageOptions.map(opt => (
            <OptionCard
              key={opt.sCount}
              label={opt.labelAr}
              selected={selections.batteryVoltage === opt.sCount}
              onClick={() => selectBatteryVoltage(opt.sCount)}
              iconKind="voltage"
              imagePath={opt.imagePath}
              placeholderIcon={opt.placeholderIcon}
            />
          ))}
        </div>
        <StageNavigation canGoPrev canGoNext={selections.batteryVoltage !== undefined} isLastStage={false} onPrev={goPrev} onNext={goNext} />
      </div>
    );
  }

  const category = stage.partCategory;
  const parts = category ? (PART_CATEGORY_MAP[category] ?? []) : [];
  const relevantParts = parts.filter(p =>
    p.compatibilityTags.droneTypes.includes(droneTypeId) &&
    (!selections.batteryVoltage || p.compatibilityTags.batteryVoltages.includes(selections.batteryVoltage)),
  );
  const selectedPart = category ? selections.parts[category] : undefined;

  return (
    <div>
      <StageHeader stageNumber={stage.number} totalStages={totalStages} titleAr={stage.titleAr} descriptionAr={stage.descriptionAr} />
      <PartCardsContainer
        parts={relevantParts}
        selectedId={selectedPart?.id}
        onSelect={part => category && selectPart(category, part)}
      />
      <StageNavigation
        canGoPrev
        canGoNext={!!selectedPart || category === 'gps'}
        isLastStage={false}
        onPrev={goPrev}
        onNext={goNext}
      />
    </div>
  );
};
