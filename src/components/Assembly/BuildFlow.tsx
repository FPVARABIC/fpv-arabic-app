import React, { useEffect } from 'react';
import { batteryVoltageOptions } from '../../data/assembly/batteryVoltageOptions';
import { buildStages, visibleStageCount } from '../../data/assembly/buildStages';
import { StageHeader } from './StageHeader';
import { PartCardsContainer } from './PartCardsContainer';
import { StageNavigation } from './StageNavigation';
import { FinalReportScreen } from './FinalReportScreen';
import { FallbackImage } from './FallbackImage';
import { useAssemblyBuild } from './hooks/useAssemblyBuild';
import { PART_CATEGORY_MAP, clearAssemblyProject, type RestoredAssemblyProject } from './utils/assemblyPersistence';
import { frameMatchesSize, getAvailableSizeOptions } from './utils/frameSizeMatch';
import type { Frame } from '../../data/assembly/types';

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
  testId?: string;
}

// Compact icon-card shared by Stage 2 (size) and Stage 4 (battery voltage) —
// same fixed-4:3-container + emoji-fallback pattern used everywhere else.
// disabled mirrors AssemblyHome's locked-type cards (dimmed + "قريباً"
// badge) — genuinely data-driven (voltageHasFullCoverage), never a
// hardcoded per-option flag; whichever voltage a drone type's real part
// data doesn't yet cover end-to-end renders disabled, exactly like any
// other not-yet-buildable option elsewhere in Assembly.
// Exported (visibility change only, no behavior change) solely so
// assembly-preview.tsx's dev-only QA harness can mount it directly with
// controlled imagePath fixtures — real size options now DO have an
// imagePath (droneSizeOptions.ts reuses the frames category icon), but
// voltage options still don't, so this harness remains the only way to
// exercise the voltage card's FallbackImage wiring with a real
// success/failure image load in a real browser.
export const OptionCard: React.FC<OptionCardProps> = ({ label, selected, onClick, iconKind, imagePath, placeholderIcon, disabled, testId }) => (
  <button
    type="button"
    data-testid={testId}
    disabled={disabled}
    onClick={() => !disabled && onClick()}
    aria-pressed={selected}
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
      <FallbackImage
        key={imagePath}
        imagePath={imagePath}
        fallback={<span>{placeholderIcon ?? OPTION_ICON_DEFAULTS[iconKind]}</span>}
      />
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
  // Present only when AssemblyView restored a saved project matching this
  // exact droneTypeId (see AssemblyView.tsx); undefined for a fresh manual
  // drone-type selection from AssemblyHome, which always starts clean.
  restoredProject?: RestoredAssemblyProject | null;
}

// Starts at stage index 1 (Stage 2 — Size) unless a matching restored
// project says otherwise: Stage 1 (drone type) is already resolved by
// AssemblyHome (or by persistence restoration) before BuildFlow mounts.
export const BuildFlow: React.FC<BuildFlowProps> = ({ droneTypeId, onChangeType, restoredProject }) => {
  // Defensive re-check, not just trusting the caller: only ever hydrate
  // from a restored project that genuinely belongs to THIS droneTypeId.
  const initialRestored = restoredProject && restoredProject.droneTypeId === droneTypeId ? restoredProject : null;
  const { stage, stageIndex, totalStages, selections, goNext, goPrev, selectSize, selectBatteryVoltage, selectPart } =
    useAssemblyBuild(droneTypeId, initialRestored);

  const handleChangeType = () => {
    if (window.confirm('سيتم فقدان اختياراتك الحالية في هذا البناء. هل تريد المتابعة؟')) {
      clearAssemblyProject();
      onChangeType();
    }
  };

  // Stage 1 (drone-type selection) is owned by AssemblyHome/AssemblyView, a
  // sibling screen BuildFlow never renders — BuildFlow only ever receives an
  // already-fixed droneTypeId as a prop, so it has no real content for this
  // stage id. Reachable defensively via: (a) a persisted project whose
  // stageIndex is 0 (assemblyPersistence.ts's validation allows 0 as
  // in-range) saved from an earlier session that hit this exact dead-end
  // before the Stage 2 onPrev fix below existed, or (b) any future
  // regression that decrements stageIndex past Stage 2. Always called
  // (Rules of Hooks — never inside the conditional branches below), so
  // this hands off to the real drone-type picker via onChangeType — the
  // same already-working mechanism "تغيير نوع الدرون" already uses —
  // instead of ever rendering broken/empty content, even momentarily.
  useEffect(() => {
    if (stage.id === 'stage-1') onChangeType();
  }, [stage.id, onChangeType]);

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

  // See the useEffect above — this is reached only for the instant between
  // that effect being scheduled and it actually firing (React commits the
  // render before running effects), or if onChangeType itself is somehow a
  // no-op. Rendering nothing here (rather than falling through to the
  // generic part-category branch below, category=null, the confirmed
  // dead-end) means there is never a flash of broken/empty content.
  if (stage.id === 'stage-1') return null;

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
        <StageHeader stageNumber={stage.number} totalStages={visibleStageCount} titleAr={stage.titleAr} descriptionAr={stage.descriptionAr} />
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
    // Only sizes with at least one real, reachable frame for THIS drone type
    // are offered — droneSizeOptions.ts stays the canonical label/order
    // source, but getAvailableSizeOptions (single source of truth, shared
    // with assemblyPersistence.ts's restore validation below) derives the
    // live subset from the real frame catalog, so a size that would
    // guarantee an empty frame stage is never selectable in the first place.
    const availableSizes = getAvailableSizeOptions(droneTypeId);
    return (
      <div>
        <ChangeTypeLink />
        <StageHeader stageNumber={stage.number} totalStages={visibleStageCount} titleAr={stage.titleAr} descriptionAr={stage.descriptionAr} />
        {availableSizes.length === 0 ? (
          // Defensive only — every drone type reachable from AssemblyHome
          // currently has at least one real matching frame; this covers a
          // future/data-gap drone type rather than a normal selectable path.
          <p style={{ padding: '8px 16px', fontSize: 13, color: '#7a6a52' }}>
            لا توجد أحجام إطار متاحة لهذا النوع حالياً.
          </p>
        ) : (
          <div style={{ padding: '4px 16px', display: 'flex', gap: 8 }}>
            {availableSizes.map(opt => (
              <OptionCard
                key={opt.sizeInch}
                testId={`assembly-size-${opt.sizeInch}`}
                label={opt.labelAr}
                selected={selections.sizeInch === opt.sizeInch}
                onClick={() => selectSize(opt.sizeInch)}
                iconKind="size"
                imagePath={opt.imagePath}
                placeholderIcon={opt.placeholderIcon}
              />
            ))}
          </div>
        )}
        {/* Stage 2 is the first stage BuildFlow itself renders — going
            "back" from here has nowhere else to land inside BuildFlow
            (Stage 1's drone-type picker is AssemblyHome, a sibling
            component BuildFlow doesn't own/render). Reusing
            handleChangeType (the same confirm+clear+onChangeType call
            already wired to the "تغيير نوع الدرون" link above) makes the
            ACTUAL back button correctly return to the real drone-type
            picker, instead of decrementing stageIndex to 0 and falling
            into the generic part-category branch below with an empty
            category — the confirmed dead-end this replaces. */}
        <StageNavigation canGoPrev canGoNext={selections.sizeInch !== undefined} isLastStage={false} onPrev={handleChangeType} onNext={goNext} />
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
        <StageHeader stageNumber={stage.number} totalStages={visibleStageCount} titleAr={stage.titleAr} descriptionAr={stage.descriptionAr} />
        <div style={{ padding: '4px 16px', display: 'flex', gap: 8 }}>
          {batteryVoltageOptions.map(opt => (
            <OptionCard
              key={opt.sCount}
              testId={`assembly-battery-voltage-${opt.sCount}s`}
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
        {/* Honest, general voltage facts — same content for both options
            (mirrors the "category-level option, no per-card detail action"
            presentation batteryVoltageOptions already used before this
            task; not a new product-card-style detail pattern forced onto
            it). Numbers come directly from batteryVoltageOptions.ts, not
            invented here. */}
        <div data-testid="assembly-battery-voltage-info" style={{ margin: '10px 16px 0', padding: 10, borderRadius: 10, background: '#f5f1e8' }}>
          {batteryVoltageOptions.map(opt => (
            <p key={opt.sCount} style={{ fontSize: 11, color: '#5a4e3a', margin: '2px 0' }} dir="ltr">
              {opt.sCount}S — nominal {opt.nominalVoltage}V / full charge {opt.maxVoltage}V
            </p>
          ))}
          <p style={{ fontSize: 10.5, color: '#7a6a52', margin: '6px 0 0' }}>
            يتطلب اختيار أي فولتية أن تكون المحركات والـESC والإلكترونيات المختارة لاحقاً مصممة لتحمّلها. توافق القطع يعتمد على منظومة الطاقة الكاملة، وليس فولتية البطارية وحدها — اختيار فولتية هنا لا يثبت تلقائياً توافق البناء بالكامل.
          </p>
        </div>
        <StageNavigation canGoPrev canGoNext={selections.batteryVoltage !== undefined} isLastStage={false} onPrev={goPrev} onNext={goNext} />
      </div>
    );
  }

  const category = stage.partCategory;
  const parts = category ? (PART_CATEGORY_MAP[category] ?? []) : [];
  // Stage 2's size is a real, functional constraint on the frames stage
  // specifically (Phase 3) — the same "not yet chosen -> no filter" pattern
  // already used for batteryVoltage above. No other category has a
  // sizeInch-based compatibility field of its own to check here.
  const relevantParts = parts.filter(p =>
    p.compatibilityTags.droneTypes.includes(droneTypeId) &&
    (!selections.batteryVoltage || p.compatibilityTags.batteryVoltages.includes(selections.batteryVoltage)) &&
    (category !== 'frames' || selections.sizeInch === undefined || frameMatchesSize(p as Frame, selections.sizeInch)),
  );
  const selectedPart = category ? selections.parts[category] : undefined;

  return (
    <div>
      <ChangeTypeLink />
      <StageHeader stageNumber={stage.number} totalStages={visibleStageCount} titleAr={stage.titleAr} descriptionAr={stage.descriptionAr} />
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
          category={category ?? ''}
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
