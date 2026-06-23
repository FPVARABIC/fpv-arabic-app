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
import { chapter10EnergyBatteryElectricalLimits } from './chapter10_energy_battery_electrical_limits';
import { chapter11CalibrationTestingSafety } from './chapter11_calibration_testing_safety';
import { chapter12FlightModesHighLevelControl } from './chapter12_flight_modes_high_level_control';
import { chapter13FlightLogsPerformanceAnalysis } from './chapter13_flight_logs_performance_analysis';
import { chapter14IntegratedDesignMethodology } from './chapter14_integrated_design_methodology';
import { chapter15UnifiedPhysicalReferenceModel } from './chapter15_unified_physical_reference_model';
import { chapter16ExternalPayloads } from './chapter16_external_payloads';
import { chapter17ComponentSelection } from './chapter17_component_selection';
import { chapter18BetaflightPractical } from './chapter18_betaflight_practical';

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
  chapter10EnergyBatteryElectricalLimits,
  chapter11CalibrationTestingSafety,
  chapter12FlightModesHighLevelControl,
  chapter13FlightLogsPerformanceAnalysis,
  chapter14IntegratedDesignMethodology,
  chapter15UnifiedPhysicalReferenceModel,
  chapter16ExternalPayloads,
  chapter17ComponentSelection,
  chapter18BetaflightPractical,
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
  ...chapter10EnergyBatteryElectricalLimits,
  ...chapter11CalibrationTestingSafety,
  ...chapter12FlightModesHighLevelControl,
  ...chapter13FlightLogsPerformanceAnalysis,
  ...chapter14IntegratedDesignMethodology,
  ...chapter15UnifiedPhysicalReferenceModel,
  ...chapter16ExternalPayloads,
  ...chapter17ComponentSelection,
  ...chapter18BetaflightPractical,
];
