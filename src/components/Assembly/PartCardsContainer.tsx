import React from 'react';
import { PartCard } from './PartCard';
import type { BasePart } from '../../data/assembly/types';

interface PartCardsContainerProps {
  parts: BasePart[];
  selectedId?: string;
  onSelect: (part: BasePart) => void;
}

export const PartCardsContainer: React.FC<PartCardsContainerProps> = ({ parts, selectedId, onSelect }) => (
  <div style={{ padding: '4px 16px' }}>
    {parts.map(part => (
      <PartCard key={part.id} part={part} selected={part.id === selectedId} onSelect={() => onSelect(part)} />
    ))}
  </div>
);
