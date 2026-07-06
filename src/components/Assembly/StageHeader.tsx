import React from 'react';

interface StageHeaderProps {
  stageNumber: number;
  totalStages: number;
  titleAr: string;
  descriptionAr: string;
}

export const StageHeader: React.FC<StageHeaderProps> = ({ stageNumber, totalStages, titleAr, descriptionAr }) => (
  <div style={{ padding: '10px 16px 6px' }}>
    <div dir="ltr" style={{ fontSize: 11, fontWeight: 700, color: '#b08d4a', marginBottom: 3 }}>
      {stageNumber}/{totalStages}
    </div>
    <h2 style={{ fontSize: 15, fontWeight: 800, color: '#3a2e1f', margin: '0 0 2px' }}>{titleAr}</h2>
    <p style={{ fontSize: 11.5, color: '#7a6a52', margin: 0 }}>{descriptionAr}</p>
  </div>
);
