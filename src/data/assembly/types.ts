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
  priceRangeUSD?: [number, number];
  imagePath?: string;
  placeholderIcon?: string;
  protocolOrSystem?: string;   // 'ELRS'|'Crossfire' for receivers; 'DJI'|'Walksnail'|'HDZero'|'Analog' for video systems/units; undefined elsewhere
  whyChoose?: string;          // "لماذا هذه القطعة؟"
  notFor?: string;             // "متى لا تختارها؟ / أشهر خطأ شائع"
  upgradePath?: string;        // "أفضل بديل عند الترقية لاحقاً" — free-text, not necessarily a valid part id
  lastReviewed?: string;       // "تاريخ آخر مراجعة", e.g. "2026-07"
  confidence?: 'مؤكد' | 'تجربة مجتمع' | 'رأي أولي';
  compatibilityTags: CompatibilityTags;
}

// ---- Drone type ----

// primaryName is the ONLY field any UI component may use to display a drone
// type's name. Never read .nameAr or .nameEn directly for display anywhere
// in the app — they are optional supplementary metadata only.
export interface DroneType {
  id: string;
  primaryName: string;
  nameAr?: string;
  nameEn?: string;
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
  imagePath?: string;
  placeholderIcon?: string;
}

// ---- Frame ----

// wheelbaseMm/armThicknessMm/material: no source column exists for these in the
// merged data (case b, structurally out of scope). weightG: source column exists
// but content is non-standardizable prose per entry (case c); see buildNotes instead.
export interface FrameSpec {
  sizeInch: number;
  wheelbaseMm?: number;
  armThicknessMm?: number;
  material?: string;
  weightG?: number;
  stackSizeMm?: string; // e.g. '30.5x30.5 / 25.5x25.5 / 20x20' — FC/ESC stack mounting pattern(s) this frame supports
}
export interface Frame extends BasePart {
  specs: FrameSpec;
}

// ---- Motor ----

// weightG: optional, source has no dedicated column — weight only appears as
// caveated prose inside whyChoose (with/without wire, seller variance); see
// buildNotes. shaftDiameterMm/maxThrustG: optional, no source column and no
// mention anywhere in the sheet for this category — structurally out of scope.
export interface MotorSpec {
  kv: number;
  statorSize: string; // e.g. '2207'
  weightG?: number;
  shaftDiameterMm?: number;
  maxThrustG?: number;
  compatibleVoltages: number[]; // S counts this motor's KV is rated for
}
export interface Motor extends BasePart {
  specs: MotorSpec;
}

// ---- ESC ----

// burstCurrentRatingA: optional, source has a real column but one SKU (premium
// tier) genuinely lacks a stated burst value. firmware: optional because one
// entry has a genuine dual-firmware ambiguity (BLHeli_32 vs AM32 depending on
// SKU) that can't honestly resolve to a single value; see buildNotes/notFor.
// weightG: no source data anywhere for this category (case b, not caveated
// prose like frames/motors — genuinely absent).
export interface EscSpec {
  currentRatingA: number;
  burstCurrentRatingA?: number;
  firmware?: string;
  channels: number;
  weightG?: number;
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

// frequencyGHz: optional because dual-band protocols (e.g. Crossfire 868/915MHz)
// don't reduce to one GHz value; see buildNotes for those entries instead.
// hasTelemetry: derived from protocol (CRSF is telemetry-capable by design), not a
// directly-stated source cell.
export interface ReceiverSpec {
  protocol: string;
  frequencyGHz?: number;
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

// chipset: optional because 2 source rows (Flywoo GOKU GM10 Nano V3, budget/mid)
// have a column-shift in the source data — the cell that should hold a clean
// chipset name instead holds descriptive text, not a real part identifier; see
// buildNotes for the raw source text on those two entries.
export interface GpsSpec {
  chipset?: string;
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
