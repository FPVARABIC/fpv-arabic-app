import React, { useState } from 'react';
import type { BasePart, Frame, Motor, Esc, Battery, Propeller } from '../../data/assembly/types';
import { droneTypes } from '../../data/assembly/droneTypes';
import { buildCompatibilityReport } from './utils/buildReport';

const DEFAULT_REPORT_ICON = '🚁';

interface FinalReportScreenProps {
  selections: Record<string, BasePart>;
  droneTypeId?: string;
  onBack: () => void;
}

export const FinalReportScreen: React.FC<FinalReportScreenProps> = ({ selections, droneTypeId, onBack }) => {
  const [imageFailed, setImageFailed] = useState(false);
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
