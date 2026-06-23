import type { KnowledgeEntry } from '../types';
import { chapter01FlightBasics } from './chapter01_flight_basics';
import { chapter02CoordinateFrames } from './chapter02_coordinate_frames';
import { chapter03ForcesTorques } from './chapter03_forces_torques';

export {
  chapter01FlightBasics,
  chapter02CoordinateFrames,
  chapter03ForcesTorques,
};

// Combined knowledge base — grows as chapters are populated in Phase K2+.
export const allKnowledgeEntries: KnowledgeEntry[] = [
  ...chapter01FlightBasics,
  ...chapter02CoordinateFrames,
  ...chapter03ForcesTorques,
];
