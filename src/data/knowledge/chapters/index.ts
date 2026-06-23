import type { KnowledgeEntry } from '../types';
import { chapter01FlightBasics } from './chapter01_flight_basics';
import { chapter02CoordinateFrames } from './chapter02_coordinate_frames';
import { chapter03ForcesTorques } from './chapter03_forces_torques';
import { chapter04SimplifiedMathematicalModel } from './chapter04_simplified_mathematical_model';
import { chapter05ControlLoops } from './chapter05_control_loops';
import { chapter06MixerMotorCommands } from './chapter06_mixer_motor_commands';
import { chapter07PidPractical } from './chapter07_pid_practical';
import { chapter08Filtering } from './chapter08_filtering';
import { chapter09ImuVibrationIsolation } from './chapter09_imu_vibration_isolation';

export {
  chapter01FlightBasics,
  chapter02CoordinateFrames,
  chapter03ForcesTorques,
  chapter04SimplifiedMathematicalModel,
  chapter05ControlLoops,
  chapter06MixerMotorCommands,
  chapter07PidPractical,
  chapter08Filtering,
  chapter09ImuVibrationIsolation,
};

// Combined knowledge base — grows as chapters are populated in Phase K2+.
export const allKnowledgeEntries: KnowledgeEntry[] = [
  ...chapter01FlightBasics,
  ...chapter02CoordinateFrames,
  ...chapter03ForcesTorques,
  ...chapter04SimplifiedMathematicalModel,
  ...chapter05ControlLoops,
  ...chapter06MixerMotorCommands,
  ...chapter07PidPractical,
  ...chapter08Filtering,
  ...chapter09ImuVibrationIsolation,
];
