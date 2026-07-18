import React, { useState } from 'react';
import type { BasePart, Frame, Motor, Esc, Battery, Propeller } from '../../data/assembly/types';
import { droneTypes } from '../../data/assembly/droneTypes';
import { buildStages } from '../../data/assembly/buildStages';
import { buildCompatibilityReport } from './utils/buildReport';
import { FallbackImage } from './FallbackImage';

const DEFAULT_REPORT_ICON = '🚁';
// Same fallback convention as PartCard.tsx — per-category custom icons are
// a dedicated future task there too; no part currently sets placeholderIcon.
const DEFAULT_PART_ICON = '⚙️';

// Arabic labels per category, taken from the stage titles' own terminology
// (buildStages titleAr minus the leading verb) — no new naming invented.
const CATEGORY_LABELS_AR: Record<string, string> = {
  videoUnits: 'نظام الفيديو (VTX)',
  frames: 'الإطار (Frame)',
  motors: 'المحركات (Motors)',
  escs: 'الـESC',
  flightControllers: 'الـFlight Controller',
  receivers: 'الـReceiver',
  gps: 'GPS',
  buzzers: 'الـBuzzer',
  capacitors: 'الـCapacitor',
  propellers: 'المراوح (Props)',
  batteries: 'البطارية (LiPo)',
  tools: 'الأدوات',
};

interface FinalReportScreenProps {
  selections: Record<string, BasePart>;
  droneTypeId?: string;
  onBack: () => void;
}

export const FinalReportScreen: React.FC<FinalReportScreenProps> = ({ selections, droneTypeId, onBack }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const droneType = droneTypeId ? droneTypes.find(t => t.id === droneTypeId) : undefined;
  const showImage = !!droneType?.imagePath && !imageFailed;

  const report = buildCompatibilityReport({
    frame: selections.frames as Frame | undefined,
    motor: selections.motors as Motor | undefined,
    esc: selections.escs as Esc | undefined,
    battery: selections.batteries as Battery | undefined,
    propeller: selections.propellers as Propeller | undefined,
  });
  const isFullyCompatible = report.items.length > 0 && report.scorePercent === 100;

  // Selected parts in build order (buildStages order), all of them — full
  // list, no truncation; the page scrolls naturally instead.
  const selectedRows = buildStages
    .filter(s => s.partCategory && selections[s.partCategory])
    .map(s => ({ category: s.partCategory!, part: selections[s.partCategory!] }));

  // Honest total: sum over priced parts only — a missing price is never
  // silently treated as $0; the caveat below the total says exactly how
  // many parts the figure excludes (real, documented data gaps: some
  // researched parts have no confirmed price from any source).
  const priced = selectedRows.filter(r => r.part.priceRangeUSD);
  const unpricedCount = selectedRows.length - priced.length;
  const totalMin = priced.reduce((sum, r) => sum + r.part.priceRangeUSD![0], 0);
  const totalMax = priced.reduce((sum, r) => sum + r.part.priceRangeUSD![1], 0);
  const unpricedCaveat =
    unpricedCount === 1 ? 'لا يشمل قطعة واحدة بلا سعر موثق'
    : unpricedCount === 2 ? 'لا يشمل قطعتين بلا سعر موثق'
    : `لا يشمل ${unpricedCount} قطع بلا سعر موثق`;

  const buildSummaryText = () => {
    const lines = [`ملخص البناء — ${droneType?.primaryName ?? ''}`.trim()];
    for (const { category, part } of selectedRows) {
      const price = part.priceRangeUSD
        ? `${part.priceRangeUSD[0]}–${part.priceRangeUSD[1]} USD`
        : 'السعر غير متوفر';
      lines.push(`${CATEGORY_LABELS_AR[category] ?? category}: ${part.nameEn} — ${price}`);
    }
    lines.push(`الإجمالي التقريبي: ${totalMin}–${totalMax} USD`);
    if (unpricedCount > 0) lines.push(unpricedCaveat);
    return lines.join('\n');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildSummaryText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions/insecure context) — leave the
      // button state unchanged rather than showing a false "copied".
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 17, fontWeight: 800, color: '#3a2e1f', margin: '4px 0 4px' }}>فحص التوافق النهائي</h2>
      <div style={{
        width: '100%', maxWidth: 160, aspectRatio: '4 / 3', margin: '4px auto 12px', borderRadius: 12,
        background: '#f5f1e8', display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', fontSize: 40,
      }}>
        {showImage ? (
          <img
            src={droneType!.imagePath}
            alt=""
            onError={() => setImageFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span>{DEFAULT_REPORT_ICON}</span>
        )}
      </div>
      <div
        style={{
          padding: 16, borderRadius: 14, marginBottom: 16, textAlign: 'center',
          background: isFullyCompatible ? '#e8f5e9' : '#fff3cd',
        }}
      >
        <span dir="ltr" style={{ fontSize: 32, fontWeight: 800, color: isFullyCompatible ? '#4caf50' : '#b08d4a' }}>
          {report.scorePercent}%
        </span>
        <p style={{ fontSize: 13, color: '#5a4e3a', margin: '4px 0 0' }}>
          {isFullyCompatible ? 'كل القطع متوافقة' : 'يوجد تعارض في بعض القطع'}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {report.items.map((item, i) => (
          <div
            key={i}
            style={{
              padding: 12, borderRadius: 10,
              background: item.isCompatible ? '#e8f5e9' : '#fdecea',
              border: item.isCompatible ? '1px solid #4caf50' : '1px solid #e57373',
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 700, color: '#3a2e1f', margin: 0 }}>
              {item.isCompatible ? '✅' : '❌'} {item.descriptionAr}
            </p>
            {item.reasonAr && (
              <p style={{ fontSize: 12, color: '#8a3a3a', margin: '4px 0 0' }}>{item.reasonAr}</p>
            )}
          </div>
        ))}
      </div>
      {selectedRows.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#3a2e1f', margin: '0 0 8px' }}>القطع المختارة</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {selectedRows.map(({ category, part }) => (
              <div
                key={category}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                  borderRadius: 10, border: '1px solid #e5ddcf', background: '#ffffff',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 8, background: '#f5f1e8', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, overflow: 'hidden',
                }}>
                  <FallbackImage
                    key={part.imagePath}
                    imagePath={part.imagePath}
                    fallback={<span>{part.placeholderIcon ?? DEFAULT_PART_ICON}</span>}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10.5, color: '#7a6a52' }}>{CATEGORY_LABELS_AR[category] ?? category}</div>
                  <div style={{
                    fontSize: 12.5, fontWeight: 700, color: '#3a2e1f',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {part.nameEn}
                  </div>
                </div>
                {part.priceRangeUSD ? (
                  <div dir="ltr" style={{ fontSize: 11, color: '#7a6a52', flexShrink: 0 }}>
                    {part.priceRangeUSD[0]}–{part.priceRangeUSD[1]} USD
                  </div>
                ) : (
                  <div style={{ fontSize: 10.5, color: '#b08d4a', flexShrink: 0 }}>السعر غير متوفر</div>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: '#f5f1e8', textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#3a2e1f' }}>
              الإجمالي التقريبي: <span dir="ltr">{totalMin}–{totalMax} USD</span>
            </div>
            {unpricedCount > 0 && (
              <div style={{ fontSize: 11, color: '#b08d4a', marginTop: 4 }}>
                {unpricedCaveat}
              </div>
            )}
          </div>
          <button
            onClick={handleCopy}
            style={{
              width: '100%', marginTop: 10, padding: 12, borderRadius: 12,
              border: '1px solid #D4A574', background: '#fffbf7', color: '#3a2e1f',
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >
            {copied ? 'تم النسخ ✓' : 'نسخ ملخص البناء'}
          </button>
        </div>
      )}
      <button
        onClick={onBack}
        style={{
          width: '100%', marginTop: 20, padding: 12, borderRadius: 12,
          border: '1px solid #D4A574', background: '#ffffff', color: '#3a2e1f',
          fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}
      >
        رجوع
      </button>
    </div>
  );
};
