import React from 'react';

interface StageNavigationProps {
  canGoPrev: boolean;
  canGoNext: boolean;
  isLastStage: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export const StageNavigation: React.FC<StageNavigationProps> = ({ canGoPrev, canGoNext, isLastStage, onPrev, onNext }) => (
  <div style={{ display: 'flex', gap: 8, padding: '8px 16px 12px' }}>
    <button
      onClick={onPrev}
      disabled={!canGoPrev}
      style={{
        flex: 1, padding: 10, borderRadius: 10, border: '1px solid #D4A574',
        background: '#ffffff', color: canGoPrev ? '#3a2e1f' : '#c9bfa8',
        fontWeight: 700, fontSize: 13, cursor: canGoPrev ? 'pointer' : 'not-allowed',
      }}
    >
      السابق
    </button>
    <button
      onClick={onNext}
      disabled={!canGoNext}
      style={{
        flex: 1, padding: 10, borderRadius: 10, border: 'none',
        background: canGoNext ? '#D4A574' : '#e5ddcf', color: canGoNext ? '#3a2e1f' : '#a89a80',
        fontWeight: 700, fontSize: 13, cursor: canGoNext ? 'pointer' : 'not-allowed',
      }}
    >
      {isLastStage ? 'إنهاء' : 'التالي'}
    </button>
  </div>
);
