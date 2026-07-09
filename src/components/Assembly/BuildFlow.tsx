import React from 'react';
import { droneSizeOptions } from '../../data/assembly/droneSizeOptions';
import { batteryVoltageOptions } from '../../data/assembly/batteryVoltageOptions';
import { buildStages } from '../../data/assembly/buildStages';
import { frames } from '../../data/assembly/parts/frames';
import { motors } from '../../data/assembly/parts/motors';
import { escs } from '../../data/assembly/parts/escs';
import { flightControllers } from '../../data/assembly/parts/flightControllers';
import { receivers } from '../../data/assembly/parts/receivers';
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
  frames, motors, escs, flightControllers, receivers, videoUnits,
  gps, buzzers, capacitors, propellers, batteries, tools,
};

// Every part category a build cannot be completed without — i.e. all
// part-backed stages except GPS (stage-10), the only optional one. Stage-4
// only offers a battery voltage when EVERY one of these categories has at
// least one part tagged for the current drone type at that voltage;
// otherwise picking it would guarantee an empty, un-passable stage later
// (e.g. all researched motors are genuinely 6S-only, so 4S dead-ended at
// Motors for every type). Derived from data, so a voltage unlocks by
// itself once real parts for it land — no hardcoded per-type list.
const MANDATORY_PART_CATEGORIES = buildStages
  .map(s => s.partCategory)
  .filter((c): c is string => c !== null && c !== 'gps');

const OPTION_ICON_DEFAULTS = { size: '📏', voltage: '🔋' } as const;

interface OptionCardProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  iconKind: keyof typeof OPTION_ICON_DEFAULTS;
  imagePath?: string;
  placeholderIcon?: string;
  disabled?: boolean;
}

// Compact icon-card shared by Stage 2 (size) and Stage 4 (battery voltage) —
// same fixed-4:3-container + emoji-fallback pattern used everywhere else.
// disabled mirrors AssemblyHome's locked-type cards (dimmed + "قريباً" badge).
const OptionCard: React.FC<OptionCardProps> = ({ label, selected, onClick, iconKind, imagePath, placeholderIcon, disabled }) => (
  <button
    disabled={disabled}
    onClick={() => !disabled && onClick()}
    style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      padding: 8, borderRadius: 10, textAlign: 'center',
      cursor: disabled ? 'not-allowed' : 'pointer',
      border: selected ? '2px solid #D4A574' : '1px solid #e5ddcf',
      background: disabled ? '#f5f1e8' : selected ? '#fffbf7' : '#ffffff',
      opacity: disabled ? 0.55 : 1,
    }}
  >
    <div style={{
      position: 'relative',
      width: '100%', aspectRatio: '4 / 3', borderRadius: 8, background: '#f5f1e8',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, overflow: 'hidden',
    }}>
      {imagePath ? (
        <img src={imagePath} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span>{placeholderIcon ?? OPTION_ICON_DEFAULTS[iconKind]}</span>
      )}
      {disabled && (
        <span style={{
          position: 'absolute', top: 4, insetInlineStart: 4,
          fontSize: 9, fontWeight: 700, color: '#b08d4a',
          background: '#fff3cd', padding: '2px 6px', borderRadius: 999,
        }}>
          قريباً
        </span>
      )}
    </div>
    <span style={{ fontSize: 11.5, fontWeight: 700, color: disabled ? '#a89a80' : '#3a2e1f' }}>{label}</span>
  </button>
);

interface BuildFlowProps {
  droneTypeId: string;
  onChangeType: () => void;
}

// Starts at stage index 1 (Stage 2 — Size): Stage 1 (drone type) is already
// resolved by AssemblyHome before BuildFlow mounts.
export const BuildFlow: React.FC<BuildFlowProps> = ({ droneTypeId, onChangeType }) => {
  const { stage, stageIndex, totalStages, selections, goNext, goPrev, selectSize, selectBatteryVoltage, selectPart } =
    useAssemblyBuild(1);

  const handleChangeType = () => {
    if (window.confirm('سيتم فقدان اختياراتك الحالية في هذا البناء. هل تريد المتابعة؟')) {
      onChangeType();
    }
  };

  const ChangeTypeLink = () => (
    <button
      onClick={handleChangeType}
      style={{
        display: 'block', fontSize: 12, fontWeight: 700, color: '#0e7c86',
        background: 'transparent', border: 'none', padding: '10px 16px 0',
        textAlign: 'start', cursor: 'pointer',
      }}
    >
      ↩ تغيير نوع الدرون
    </button>
  );

  if (stage.id === 'stage-16') {
    return (
      <div>
        <ChangeTypeLink />
        <FinalReportScreen selections={selections.parts} droneTypeId={droneTypeId} onBack={goPrev} />
      </div>
    );
  }

  if (stage.id === 'stage-17' || stage.id === 'stage-18') {
    return (
      <div>
        <ChangeTypeLink />
        <StageHeader stageNumber={stage.number} totalStages={totalStages} titleAr={stage.titleAr} descriptionAr={stage.descriptionAr} />
        <p style={{ padding: '0 16px', fontSize: 13, color: '#7a6a52' }}>هذه الميزة قيد التطوير — قريباً</p>
        <StageNavigation
          canGoPrev
          canGoNext={stageIndex < totalStages - 1}
          isLastStage={stage.id === 'stage-18'}
          onPrev={goPrev}
          onNext={goNext}
        />
      </div>
    );
  }

  if (stage.id === 'stage-2') {
    return (
      <div>
        <ChangeTypeLink />
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
    const voltageHasFullCoverage = (sCount: number) =>
      MANDATORY_PART_CATEGORIES.every(cat =>
        (PART_CATEGORY_MAP[cat] ?? []).some(p =>
          p.compatibilityTags.droneTypes.includes(droneTypeId) &&
          p.compatibilityTags.batteryVoltages.includes(sCount),
        ),
      );
    return (
      <div>
        <ChangeTypeLink />
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
              disabled={!voltageHasFullCoverage(opt.sCount)}
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
      <ChangeTypeLink />
      <StageHeader stageNumber={stage.number} totalStages={totalStages} titleAr={stage.titleAr} descriptionAr={stage.descriptionAr} />
      {relevantParts.length === 0 ? (
        // Empty stage must never render as a silent blank grid. GPS is the
        // only optional stage and legitimately has no entries for some
        // types; any mandatory category hitting this is a data gap that
        // stage-4's voltage gating should have prevented upstream.
        <p style={{ padding: '8px 16px', fontSize: 13, color: '#7a6a52' }}>
          {category === 'gps'
            ? 'لا توجد خيارات GPS مخصصة لهذا النوع حالياً — هذه المرحلة اختيارية ويمكنك المتابعة مباشرة.'
            : 'لا توجد قطع متوافقة مع اختياراتك الحالية في هذه المرحلة بعد — جرّب الرجوع وتغيير الاختيارات السابقة.'}
        </p>
      ) : (
        <PartCardsContainer
          parts={relevantParts}
          selectedId={selectedPart?.id}
          onSelect={part => category && selectPart(category, part)}
        />
      )}
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
