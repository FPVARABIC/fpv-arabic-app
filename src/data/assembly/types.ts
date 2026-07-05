// Assembly ("التجميع") data model — shared types for all part categories,
// drone types, build stages, and the compatibility engine.

export type PartTier = 'budget' | 'mid' | 'premium';

export interface PartNotes {
  beginnerNotes: string[];
  safetyNotes: string[];
  buildNotes: string[];
}

export interface CompatibilityTags {
  droneTypes: string[];
  batteryVoltages: number[]; // LiPo cell (S) counts this part supports, e.g. [4, 6]
  frameSizeInch?: number;
}

export interface BasePart extends PartNotes {
  id: string;
  tier: PartTier;
  nameAr: string;
  nameEn: string;
  brand?: string;
  priceRangeEGP?: [number, number];
  compatibilityTags: CompatibilityTags;
}

// ---- Drone type ----

export interface DroneType {
  id: string;
  nameAr: string;
  nameEn: string;
  frameSizeInch: number;
  description: string;
  recommendedBatteryVoltages: number[];
  imagePath: string;
}

// ---- Build stages (19-stage build journey) ----

export interface BuildStage {
  id: string;
  number: number;
  titleAr: string;
  descriptionAr: string;
  partCategory: string | null; // which parts/*.ts category this stage selects from, if any
}

// ---- Battery voltage options ----

export interface BatteryVoltageOption {
  sCount: number; // e.g. 4 for 4S, 6 for 6S
  nominalVoltage: number;
  maxVoltage: number;
  minVoltage: number;
  labelAr: string;
}

// ---- Frame ----

export interface FrameSpec {
  sizeInch: number;
  wheelbaseMm: number;
  armThicknessMm: number;
  material: string;
  weightG: number;
}
export interface Frame extends BasePart {
  specs: FrameSpec;
}

// ---- Motor ----

export interface MotorSpec {
  kv: number;
  statorSize: string; // e.g. '2207'
  weightG: number;
  shaftDiameterMm: number;
  maxThrustG: number;
  compatibleVoltages: number[]; // S counts this motor's KV is rated for
}
export interface Motor extends BasePart {
  specs: MotorSpec;
}

// ---- ESC ----

export interface EscSpec {
  currentRatingA: number;
  firmware: string;
  channels: number;
  weightG: number;
  compatibleVoltages: number[];
}
export interface Esc extends BasePart {
  specs: EscSpec;
}

// ---- Flight Controller ----

export interface FlightControllerSpec {
  mcu: string;
  gyro: string;
  mountingSizeMm: number;
  uartCount: number;
  hasBuiltInOsd: boolean;
}
export interface FlightController extends BasePart {
  specs: FlightControllerSpec;
}

// ---- Receiver ----

export interface ReceiverSpec {
  protocol: string;
  frequencyGHz: number;
  weightG: number;
  hasTelemetry: boolean;
}
export interface Receiver extends BasePart {
  specs: ReceiverSpec;
}

// ---- Video system (VTX) ----

export interface VideoSystemSpec {
  systemType: 'analog' | 'digital';
  maxPowerMw: number;
  frequencyBand: string;
  latencyMs: number;
}
export interface VideoSystem extends BasePart {
  specs: VideoSystemSpec;
}

// ---- Video unit (camera) ----

export interface VideoUnitSpec {
  sensorType: string;
  resolution: string;
  fovDegrees: number;
  weightG: number;
}
export interface VideoUnit extends BasePart {
  specs: VideoUnitSpec;
}

// ---- Battery ----

export interface BatterySpec {
  sCount: number;
  capacityMah: number;
  cRating: number;
  connector: string;
  weightG: number;
}
export interface Battery extends BasePart {
  specs: BatterySpec;
}

// ---- Propeller ----

export interface PropellerSpec {
  sizeInch: number;
  pitchInch: number;
  bladeCount: number;
  material: string;
}
export interface Propeller extends BasePart {
  specs: PropellerSpec;
}

// ---- GPS ----

export interface GpsSpec {
  chipset: string;
  hasCompass: boolean;
  weightG: number;
}
export interface Gps extends BasePart {
  specs: GpsSpec;
}

// ---- Buzzer ----

export interface BuzzerSpec {
  hasBuiltInBattery: boolean;
  volumeDb: number;
  weightG: number;
}
export interface Buzzer extends BasePart {
  specs: BuzzerSpec;
}

// ---- Capacitor ----

export interface CapacitorSpec {
  capacitanceUf: number;
  voltageRating: number;
  weightG: number;
}
export interface Capacitor extends BasePart {
  specs: CapacitorSpec;
}

// ---- Tools ----

export interface ToolSpec {
  isMandatory: boolean;
  usedForStages: string[];
}
export interface Tool extends BasePart {
  specs: ToolSpec;
}
