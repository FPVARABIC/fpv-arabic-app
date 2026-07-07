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

// gyro/hasBuiltInOsd: optional, no source data anywhere for this category
// (case b, structurally out of scope). mountingSizeMm: optional, no dedicated
// column exists and the one row that touches it (Foxeer F722 V4) flags it as
// SKU-variant-dependent (30x30 vs mini), not a confirmed single number; see
// notFor. supportsDjiO4: optional only because it's a newly-added field, not
// because the value is ever genuinely unknown in this category — every entry
// has a real, confirmed true/false answer (caveats about wiring difficulty
// are practical nuance, preserved in buildNotes/notFor, not typed-value
// uncertainty). Candidate field for a future Part B compatibility rule
// (FC ↔ DJI O4 video-unit selection).
export interface FlightControllerSpec {
  mcu: string;
  gyro?: string;
  mountingSizeMm?: number;
  uartCount: number;
  hasBuiltInOsd?: boolean;
  supportsDjiO4?: boolean;
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

// maxPowerMw/latencyMs: optional, zero source data anywhere for this category
// (case b) — every row only gives qualitative "low-latency" prose, never a
// number. frequencyBand: optional, only one row's product name states a band
// (5.8GHz); the other 3 (digital systems) never state one. Resolution/format
// data ("المواصفة الأساسية 2") is deliberately NOT modeled here — it belongs
// to VideoUnitSpec (the camera/unit's actual output), not the system choice;
// preserved as buildNotes prose in this category only.
export interface VideoSystemSpec {
  systemType: 'analog' | 'digital';
  maxPowerMw?: number;
  frequencyBand?: string;
  latencyMs?: number;
}
export interface VideoSystem extends BasePart {
  specs: VideoSystemSpec;
}

// ---- Video unit (camera) ----

// sensorType/resolution: optional — only genuine camera+VTX bundles (DJI O4/
// O4 Pro/O3 Air Units, Walksnail Avatar HD Pro Kit) have real sensor/
// resolution data; pure-VTX transmitters (HDZero Freestyle V2, TBS Unify
// Pro32, RushFPV Tank Solo) have none — they pair with a separate camera,
// covered under the pilotGear domain, not this stage. resolution is further
// thin even among camera-bundle rows: only Walksnail states one explicitly.
// fovDegrees: optional, zero source data anywhere (case b). weightG:
// optional — one row (Walksnail) has a column-shift where "weight" actually
// holds a voltage range instead; no real weight stated for that entry.
// operatingVoltageRange: new, real per-product input-voltage range (string,
// since it's inherently a min-max range, not a single number) — distinct
// from VideoSystemSpec.frequencyBand/maxPowerMw, which describe the
// conceptual category choice (stage 3, mostly-empty numbers) rather than
// this stage's real purchased product (stage 10, real numbers) — same
// relationship as batteryVoltageOptions (conceptual) vs. batteries.ts (real
// product).
export interface VideoUnitSpec {
  sensorType?: string;
  resolution?: string;
  fovDegrees?: number;
  weightG?: number;
  operatingVoltageRange?: string;
}
export interface VideoUnit extends BasePart {
  specs: VideoUnitSpec;
}

// ---- Battery ----

// burstCRating: optional, source has a real column but only one row (CNHL
// Black Series V2, budget) states an explicit burst value separate from
// continuous — same pattern as ESC's burstCurrentRatingA. weightG: optional,
// no dedicated column — 2 of 4 rows lack a single clean value (one genuine
// dual-chemistry split, one narrow unresolved range); see buildNotes for
// both.
export interface BatterySpec {
  sCount: number;
  capacityMah: number;
  cRating: number;
  burstCRating?: number;
  connector: string;
  weightG?: number;
}
export interface Battery extends BasePart {
  specs: BatterySpec;
}

// ---- Propeller ----

// material: optional, no dedicated column exists — only rows that mention "PC"
// in whyChoose prose have a known material; the other rows have none stated,
// not fabricated. weightG: new field, real clean data across all 4 rows (no
// gaps, no caveats) — unlike prior categories' weight situations.
export interface PropellerSpec {
  sizeInch: number;
  pitchInch: number;
  bladeCount: number;
  material?: string;
  weightG?: number;
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

// volumeDb: optional — only VIFLY Finder 2 mentions this at all, and it's a
// genuine range ("105-110dB تقريباً"), not a single value; per the
// established consistency principle (same treatment as batteries' narrow-
// range case), omitted and preserved in buildNotes rather than approximated.
// Ends up unpopulated for all 3 entries in this transcription. weightG:
// optional, only VIFLY Finder 2 states a real weight (~5g); the other two
// rows have only qualitative descriptions ("very light," "smaller than
// Finder 2"), no numbers.
export interface BuzzerSpec {
  hasBuiltInBattery: boolean;
  volumeDb?: number;
  weightG?: number;
}
export interface Buzzer extends BasePart {
  specs: BuzzerSpec;
}

// ---- Capacitor ----

// weightG: optional, no source data anywhere for this category (case b,
// structurally out of scope — no column, no prose mention in any row).
export interface CapacitorSpec {
  capacitanceUf: number;
  voltageRating: number;
  weightG?: number;
}
export interface Capacitor extends BasePart {
  specs: CapacitorSpec;
}

// ---- Tools ----

// isMandatory: true for all 3 kit-bundle entries reflects the ORIGINAL
// locked Assembly master design (every builder needs at least one tool
// kit) — not derived from this research sheet, which has no
// mandatory/optional column at all for tools. usedForStages: ['stage-16']
// for all 3 — kits serve the whole Tools stage collectively, not one
// granular sub-task; this is an honest broad statement, not fabricated
// per-tool stage precision the source doesn't provide.
export interface ToolSpec {
  isMandatory: boolean;
  usedForStages: string[];
}
export interface Tool extends BasePart {
  specs: ToolSpec;
}
