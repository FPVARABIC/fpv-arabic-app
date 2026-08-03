/**
 * The video system, as THIS build has it.
 *
 * WHY A SECOND SETUP RECORD RATHER THAN MORE FIELDS ON `RcSetup`
 * --------------------------------------------------------------
 * `RcSetup` already carries `videoUartIndex`, and it stays there — it is a fact
 * about UART allocation, which is the control link's own business because that
 * is where the conflict is detected. Everything else about video is a different
 * subject with a different completeness, a different editor and a different set
 * of rules, and folding it into `RcSetup` would have produced a record where
 * "how complete is my setup?" had no meaningful answer.
 *
 * WHAT THE CATALOGUE CANNOT HOLD
 * ------------------------------
 * The parts catalogue knows the reader owns "DJI O4 Air Unit". It cannot know
 * which channel they fly on, whether the goggles are the matching generation,
 * which UART the control protocol landed on, whether the OSD was ever actually
 * seen working, or whether the unit sits in a sealed 3D-printed pod with no
 * airflow. Those are facts about THIS build, and they are exactly the facts the
 * verdicts need.
 *
 * THE RULE THAT SHAPES EVERY FIELD
 * --------------------------------
 * Every field is optional, and `unknown` is a first-class value rather than a
 * gap to be filled by inference. A form that pressures someone into guessing
 * their polarisation produces a confident wrong verdict, which is worse than no
 * verdict — so the engine treats an absent field as absent and says so.
 *
 * NO INVENTED REGULATION
 * ----------------------
 * `powerMw` is recorded as a number the reader read off their own equipment. The
 * platform never states what power is legal where: that is jurisdiction-specific
 * law, it changes, and inventing it would be inventing regulation. What the
 * rules do is notice when power was never recorded, and when a high recorded
 * power sits next to an untested control link.
 */

import type {
  VideoBand, VideoConnector, VideoCooling, VideoDeviceRole, VideoEcosystem,
  VideoLinkClass, VideoPolarisation, VideoPowerSource, VideoRecording,
  OsdProtocol, VtxControlProtocol,
} from '../video/types';

// ── The record ───────────────────────────────────────────────────────────────

/**
 * Everything the platform knows about this build's video system.
 *
 * Grouped the way the mismatches actually happen: the system chosen, the air
 * side, the ground side, the wiring, the overlay, the RF, and what was proven
 * by testing rather than assumed.
 */
export interface VideoSetup {
  // ── The system ────────────────────────────────────────────────────────────
  ecosystem?: VideoEcosystem;
  /** Recorded rather than derived: `other` has no derivable class. */
  linkClass?: VideoLinkClass;

  // ── The air side ──────────────────────────────────────────────────────────
  /** What the air-side box actually is — a bare VTX is not an air unit. */
  airDeviceRole?: VideoDeviceRole;
  airUnitModel?: string;
  airUnitFirmware?: string;
  cameraModel?: string;
  /** True when the camera is built into the air unit and cannot be swapped. */
  cameraIntegrated?: boolean;

  // ── The ground side ───────────────────────────────────────────────────────
  gogglesModel?: string;
  gogglesFirmware?: string;
  /** The ecosystem the GOGGLES belong to — the field the match rule compares. */
  gogglesEcosystem?: VideoEcosystem;
  /** A receiver module fitted into the goggles, when there is one. */
  vrxModule?: string;
  trueDiversity?: boolean;

  // ── Wiring and power ──────────────────────────────────────────────────────
  /** How the flight controller changes channel and power. */
  vtxControlProtocol?: VtxControlProtocol;
  /** The UART carrying that control protocol, when it needs one. */
  vtxControlUartIndex?: number;
  powerSource?: VideoPowerSource;
  /** Rated current of the rail feeding it, in milliamps, when the reader knows it. */
  becCurrentMa?: number;
  cameraPowerSource?: VideoPowerSource;
  /** True when the reader confirmed a shared ground between camera, VTX and board. */
  sharedGroundConfirmed?: boolean;

  // ── The overlay ───────────────────────────────────────────────────────────
  osdProtocol?: OsdProtocol;
  /** The UART carrying the overlay, when the protocol needs one. */
  osdUartIndex?: number;

  // ── RF ────────────────────────────────────────────────────────────────────
  band?: VideoBand;
  /** Free text: band letter and channel as printed on the reader's own gear. */
  channel?: string;
  /** Output power in milliwatts, as read from the reader's own equipment. */
  powerMw?: number;
  txAntennaPolarisation?: VideoPolarisation;
  rxAntennaPolarisation?: VideoPolarisation;
  txAntennaConnector?: VideoConnector;
  /** True when the reader confirmed the antenna is fitted before power-up. */
  antennaFittedConfirmed?: boolean;

  // ── Physical ──────────────────────────────────────────────────────────────
  cooling?: VideoCooling;
  /** Free text: where the unit sits, e.g. «تحت اللوحة العلوية». */
  mountingNote?: string;
  recording?: VideoRecording;

  // ── What was actually proven ──────────────────────────────────────────────
  /** ISO date the reader last saw a live picture on the bench. */
  imageTestedOn?: string;
  /** ISO date the reader last confirmed the overlay renders. */
  osdTestedOn?: string;
  /** ISO date of the last real video range test. */
  rangeTestedOn?: string;
  /** ISO date of the last thermal check after a sustained ground run. */
  thermalTestedOn?: string;
}

export const EMPTY_VIDEO_SETUP: VideoSetup = {};

/** True when the user has recorded anything at all. */
export function hasVideoSetup(s: VideoSetup | undefined): boolean {
  return !!s && Object.values(s).some(v => v !== undefined && v !== '');
}

/**
 * The fields that actually drive verdicts.
 *
 * Deliberately not every field: `mountingNote` is useful to a human and drives
 * nothing, and counting it would make the completeness figure a measure of
 * typing rather than of how much the engine can reason about.
 */
export function videoSetupCompleteness(s: VideoSetup | undefined): { filled: number; total: number } {
  const driving: (keyof VideoSetup)[] = [
    'ecosystem', 'linkClass', 'airDeviceRole', 'gogglesEcosystem',
    'vtxControlProtocol', 'osdProtocol', 'powerSource', 'band',
    'txAntennaPolarisation', 'rxAntennaPolarisation', 'cooling',
    'imageTestedOn', 'osdTestedOn', 'rangeTestedOn',
  ];
  const filled = driving.filter(k => {
    const v = s?.[k];
    return v !== undefined && v !== '';
  }).length;
  return { filled, total: driving.length };
}

// ── Validation, for the store ────────────────────────────────────────────────

const ECOSYSTEMS: VideoEcosystem[] = ['analog-58', 'dji', 'walksnail', 'hdzero', 'other'];
const LINK_CLASSES: VideoLinkClass[] = ['analog', 'digital'];
const ROLES: VideoDeviceRole[] = [
  'camera', 'vtx', 'air-unit', 'aio-camera-vtx', 'goggles', 'vrx-module', 'ground-station',
];
const VTX_CONTROLS: VtxControlProtocol[] = ['none', 'smartaudio', 'tramp', 'msp', 'system-native'];
const OSD_PROTOCOLS: OsdProtocol[] = ['none', 'analog-chip', 'msp-displayport', 'canvas-mode', 'system-native'];
const BANDS: VideoBand[] = ['5.8ghz', '2.4ghz', '1.3ghz', 'other'];
const POLARISATIONS: VideoPolarisation[] = ['linear', 'rhcp', 'lhcp', 'unknown'];
const CONNECTORS: VideoConnector[] = ['sma', 'rp-sma', 'mmcx', 'ufl', 'other', 'unknown'];
const POWER_SOURCES: VideoPowerSource[] = ['fc-5v', 'fc-9v', 'fc-10v', 'vbat', 'external-bec', 'unknown'];
const COOLINGS: VideoCooling[] = ['airflow-only', 'heatsink', 'heatsink-and-airflow', 'enclosed', 'unknown'];
const RECORDINGS: VideoRecording[] = ['none', 'goggles-dvr', 'onboard', 'both'];

const str = (v: unknown, max = 80): string | undefined =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= max ? v.trim() : undefined;
const int = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : undefined;
const oneOf = <T extends string>(v: unknown, set: T[]): T | undefined =>
  typeof v === 'string' && (set as string[]).includes(v) ? (v as T) : undefined;
const bool = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined);

/**
 * Accepts a stored or imported setup, dropping any field that is not valid.
 *
 * Field-by-field rather than all-or-nothing, for the same reason the control
 * link validates this way: one corrupt value must not discard a record the
 * reader spent real time on. A dropped field simply becomes unknown again, and
 * the engine already knows how to say "I do not have this".
 */
export function validateVideoSetup(raw: unknown): VideoSetup | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const r = raw as Record<string, unknown>;

  const out: VideoSetup = {
    ecosystem: oneOf(r.ecosystem, ECOSYSTEMS),
    linkClass: oneOf(r.linkClass, LINK_CLASSES),

    airDeviceRole: oneOf(r.airDeviceRole, ROLES),
    airUnitModel: str(r.airUnitModel, 60),
    airUnitFirmware: str(r.airUnitFirmware, 40),
    cameraModel: str(r.cameraModel, 60),
    cameraIntegrated: bool(r.cameraIntegrated),

    gogglesModel: str(r.gogglesModel, 60),
    gogglesFirmware: str(r.gogglesFirmware, 40),
    gogglesEcosystem: oneOf(r.gogglesEcosystem, ECOSYSTEMS),
    vrxModule: str(r.vrxModule, 60),
    trueDiversity: bool(r.trueDiversity),

    vtxControlProtocol: oneOf(r.vtxControlProtocol, VTX_CONTROLS),
    vtxControlUartIndex: int(r.vtxControlUartIndex, 1, 12),
    powerSource: oneOf(r.powerSource, POWER_SOURCES),
    becCurrentMa: int(r.becCurrentMa, 1, 20000),
    cameraPowerSource: oneOf(r.cameraPowerSource, POWER_SOURCES),
    sharedGroundConfirmed: bool(r.sharedGroundConfirmed),

    osdProtocol: oneOf(r.osdProtocol, OSD_PROTOCOLS),
    osdUartIndex: int(r.osdUartIndex, 1, 12),

    band: oneOf(r.band, BANDS),
    channel: str(r.channel, 20),
    powerMw: int(r.powerMw, 0, 5000),
    txAntennaPolarisation: oneOf(r.txAntennaPolarisation, POLARISATIONS),
    rxAntennaPolarisation: oneOf(r.rxAntennaPolarisation, POLARISATIONS),
    txAntennaConnector: oneOf(r.txAntennaConnector, CONNECTORS),
    antennaFittedConfirmed: bool(r.antennaFittedConfirmed),

    cooling: oneOf(r.cooling, COOLINGS),
    mountingNote: str(r.mountingNote, 120),
    recording: oneOf(r.recording, RECORDINGS),

    imageTestedOn: str(r.imageTestedOn, 20),
    osdTestedOn: str(r.osdTestedOn, 20),
    rangeTestedOn: str(r.rangeTestedOn, 20),
    thermalTestedOn: str(r.thermalTestedOn, 20),
  };

  for (const k of Object.keys(out) as (keyof VideoSetup)[]) {
    if (out[k] === undefined) delete out[k];
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Which input on the video form edits which field.
 *
 * Same contract as `RC_FIELD_INPUT_ID`: it is what lets «سجّل نظام نظارتك» be an
 * action that opens the field itself rather than a sentence pointing at a form
 * of thirty. Kept in the data layer so the resolver, the tests and any future
 * web editor agree without importing React.
 */
export const VIDEO_FIELD_INPUT_ID: Partial<Record<keyof VideoSetup, string>> = {
  ecosystem: 'video-ecosystem',
  linkClass: 'video-link-class',
  airDeviceRole: 'video-air-role',
  airUnitModel: 'video-air-model',
  airUnitFirmware: 'video-air-firmware',
  cameraModel: 'video-camera-model',
  cameraIntegrated: 'video-camera-integrated',
  gogglesModel: 'video-goggles-model',
  gogglesFirmware: 'video-goggles-firmware',
  gogglesEcosystem: 'video-goggles-ecosystem',
  vrxModule: 'video-vrx-module',
  trueDiversity: 'video-true-diversity',
  vtxControlProtocol: 'video-vtx-control',
  vtxControlUartIndex: 'video-vtx-uart',
  powerSource: 'video-power-source',
  becCurrentMa: 'video-bec-current',
  cameraPowerSource: 'video-camera-power',
  sharedGroundConfirmed: 'video-shared-ground',
  osdProtocol: 'video-osd-protocol',
  osdUartIndex: 'video-osd-uart',
  band: 'video-band',
  channel: 'video-channel',
  powerMw: 'video-power-mw',
  txAntennaPolarisation: 'video-tx-polarisation',
  rxAntennaPolarisation: 'video-rx-polarisation',
  txAntennaConnector: 'video-tx-connector',
  antennaFittedConfirmed: 'video-antenna-fitted',
  cooling: 'video-cooling',
  mountingNote: 'video-mounting-note',
  recording: 'video-recording',
  imageTestedOn: 'video-image-tested',
  osdTestedOn: 'video-osd-tested',
  rangeTestedOn: 'video-range-tested',
  thermalTestedOn: 'video-thermal-tested',
};
