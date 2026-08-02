/**
 * The radio-control setup the user actually has.
 *
 * WHY THIS IS NOT PART SELECTION
 * ------------------------------
 * The parts catalogue can tell us which receiver someone bought. It cannot tell
 * us which band that receiver is, which firmware version it runs, which UART it
 * was soldered to, or whether the failsafe was ever tested — and those are
 * exactly the facts that decide whether a build flies or walks away. They are
 * per-build configuration, not per-product specification, so they are recorded
 * here and nowhere else.
 *
 * EVERY FIELD IS OPTIONAL, AND THAT IS THE POINT
 * ----------------------------------------------
 * A half-filled setup must produce useful verdicts about what IS known and
 * honest `unknown` findings about what is not. A model that demanded completion
 * would push people to guess, and a guessed band is worse than an absent one.
 *
 * WHY ENUMS RATHER THAN FREE TEXT
 * -------------------------------
 * A band written as «2.4» or «2.4GHz» or «2g4» cannot be compared. Anything the
 * engine reasons about is a closed set; anything it only displays back (firmware
 * version, target name, antenna note) stays a string, because inventing a closed
 * set for those would force users to lie.
 */

// ── Closed sets the engine reasons about ─────────────────────────────────────

/** The radio band. Two systems on different bands can never talk. */
export type RcBand = '2.4ghz' | 'sub-ghz';

export const RC_BAND_LABEL_AR: Record<RcBand, string> = {
  '2.4ghz': '2.4 جيجاهرتز',
  'sub-ghz': 'نطاق منخفض (868/915 ميجاهرتز)',
};

/** The radio system — what happens in the air. */
export type RcSystem = 'elrs' | 'crossfire' | 'tracer' | 'ghost' | 'frsky' | 'other';

export const RC_SYSTEM_LABEL_AR: Record<RcSystem, string> = {
  elrs: 'ExpressLRS',
  crossfire: 'Crossfire',
  tracer: 'Tracer',
  ghost: 'Ghost',
  frsky: 'FrSky',
  other: 'نظام آخر',
};

/**
 * Which bands each system can actually run on.
 *
 * This is the one table the band rule rests on, so it is deliberately
 * conservative: it records what a system is *capable* of, not what a particular
 * product is. A user who owns a 2.4 GHz-only Crossfire variant is still asked to
 * confirm against the manual, because product-level detail is not ours to assert.
 */
export const RC_SYSTEM_BANDS: Record<RcSystem, RcBand[]> = {
  elrs: ['2.4ghz', 'sub-ghz'],
  crossfire: ['sub-ghz'],
  tracer: ['2.4ghz'],
  ghost: ['2.4ghz'],
  frsky: ['2.4ghz', 'sub-ghz'],
  other: ['2.4ghz', 'sub-ghz'],
};

/** Where the transmitting radio lives. */
export type RcModuleKind = 'internal' | 'external';

export const RC_MODULE_LABEL_AR: Record<RcModuleKind, string> = {
  internal: 'وحدة داخلية مدمجة',
  external: 'وحدة خارجية في الفتحة',
};

/** The serial language the receiver speaks to the flight controller. */
export type RcSerialProtocol = 'crsf' | 'sbus' | 'ibus' | 'pwm' | 'ppm' | 'other';

export const RC_PROTOCOL_LABEL_AR: Record<RcSerialProtocol, string> = {
  crsf: 'CRSF',
  sbus: 'SBUS',
  ibus: 'IBUS',
  pwm: 'PWM (قناة لكل سلك)',
  ppm: 'PPM (نظام قديم)',
  other: 'بروتوكول آخر',
};

/** What each protocol needs from the board, and what it gives back. */
export interface RcProtocolFacts {
  /** Does it occupy a UART? PWM and PPM do not. */
  needsUart: boolean;
  /** Does the signal arrive inverted, needing a port that can invert it? */
  inverted: boolean;
  /** Can telemetry come back on the same link with no extra wiring? */
  telemetryOnSameLink: boolean;
  /** Historical protocols we do not recommend for a new build. */
  legacy: boolean;
  noteAr: string;
}

export const RC_PROTOCOL_FACTS: Record<RcSerialProtocol, RcProtocolFacts> = {
  crsf: {
    needsUart: true, inverted: false, telemetryOnSameLink: true, legacy: false,
    noteAr: 'ثنائي الاتجاه على سلكين: القنوات تصعد والتليمتري ينزل بلا أسلاك إضافية.',
  },
  sbus: {
    needsUart: true, inverted: true, telemetryOnSameLink: false, legacy: false,
    noteAr: 'إشارة معكوسة على سلك واحد؛ تحتاج منفذاً يدعم العكس، والتليمتري يحتاج مساراً منفصلاً.',
  },
  ibus: {
    needsUart: true, inverted: false, telemetryOnSameLink: false, legacy: false,
    noteAr: 'غير معكوس، والتليمتري فيه يستخدم خطاً منفصلاً في أغلب التركيبات.',
  },
  pwm: {
    needsUart: false, inverted: false, telemetryOnSameLink: false, legacy: true,
    noteAr: 'سلك مستقل لكل قناة. لا يُستعمل في الكوادكابتر الحديث إلا في حالات نادرة جداً.',
  },
  ppm: {
    needsUart: false, inverted: false, telemetryOnSameLink: false, legacy: true,
    noteAr: 'نظام تاريخي يجمع القنوات على سلك واحد بنبضات؛ دقّته وزمن استجابته أسوأ من البدائل الرقمية.',
  },
  other: {
    needsUart: true, inverted: false, telemetryOnSameLink: false, legacy: false,
    noteAr: 'بروتوكول غير مصنّف عندنا — راجع دليل مستقبلك ومخطط لوحتك.',
  },
};

/** What the receiver is fed from. */
export type RcPowerSource = 'fc-5v' | 'fc-9v' | 'fc-vbat' | 'separate-bec' | 'unknown';

export const RC_POWER_LABEL_AR: Record<RcPowerSource, string> = {
  'fc-5v': 'مسار 5 فولت من متحكم الطيران',
  'fc-9v': 'مسار 9 فولت من متحكم الطيران',
  'fc-vbat': 'جهد البطارية مباشرةً',
  'separate-bec': 'منظّم جهد منفصل',
  unknown: 'غير معروف',
};

/** How the antennas are placed. */
export type RcAntennaPlacement = 'outside-perpendicular' | 'outside-parallel' | 'inside-frame' | 'unknown';

export const RC_ANTENNA_LABEL_AR: Record<RcAntennaPlacement, string> = {
  'outside-perpendicular': 'خارج الهيكل ومتعامدان',
  'outside-parallel': 'خارج الهيكل ومتوازيان',
  'inside-frame': 'داخل الهيكل أو ملامسان للكربون',
  unknown: 'غير محدد',
};

/** What the aircraft is set to do when the link stops. */
export type RcFailsafeStrategy = 'drop-disarm' | 'hold-last' | 'gps-return' | 'unknown';

export const RC_FAILSAFE_LABEL_AR: Record<RcFailsafeStrategy, string> = {
  'drop-disarm': 'نزع التسليح فوراً',
  'hold-last': 'تثبيت آخر القيم المستلمة',
  'gps-return': 'عودة تلقائية بالملاحة',
  unknown: 'غير مضبوط أو غير معروف',
};

// ── The record itself ────────────────────────────────────────────────────────

/**
 * Everything the platform knows about this build's control link.
 *
 * Split into what the user holds, what flies, and how it was set up — because
 * that is how the mismatches happen: a radio bought for one band, a receiver
 * bought for another.
 */
export interface RcSetup {
  // The transmitting side
  radioModel?: string;
  moduleKind?: RcModuleKind;
  txSystem?: RcSystem;
  txBand?: RcBand;
  txFirmware?: string;
  txRegulatoryDomain?: string;

  // The receiving side
  rxModel?: string;
  rxSystem?: RcSystem;
  rxBand?: RcBand;
  rxFirmware?: string;
  rxTarget?: string;
  rxRegulatoryDomain?: string;
  rxVoltage?: RcPowerSource;
  antennaCount?: number;
  antennaPlacement?: RcAntennaPlacement;
  trueDiversity?: boolean;

  // The wiring
  serialProtocol?: RcSerialProtocol;
  uartIndex?: number;
  /** Other declared consumers of UARTs, so conflicts can be seen. */
  gpsUartIndex?: number;
  videoUartIndex?: number;

  // The link settings
  packetRateHz?: number;
  telemetryRatio?: string;
  dynamicPower?: boolean;
  modelMatch?: boolean;

  // The safety posture
  failsafeStrategy?: RcFailsafeStrategy;
  /** ISO date of the last real bench failsafe test, when the user recorded one. */
  failsafeTestedOn?: string;
  /** ISO date of the last real range test. */
  rangeTestedOn?: string;
}

export const EMPTY_RC_SETUP: RcSetup = {};

/** True when the user has recorded anything at all. */
export function hasRcSetup(s: RcSetup | undefined): boolean {
  return !!s && Object.values(s).some(v => v !== undefined && v !== '');
}

/** How many of the fields that drive verdicts are filled. */
export function rcSetupCompleteness(s: RcSetup | undefined): { filled: number; total: number } {
  const driving: (keyof RcSetup)[] = [
    'txSystem', 'txBand', 'rxSystem', 'rxBand', 'serialProtocol', 'uartIndex',
    'rxVoltage', 'antennaPlacement', 'failsafeStrategy', 'txFirmware', 'rxFirmware',
    'txRegulatoryDomain', 'rxRegulatoryDomain',
  ];
  const filled = driving.filter(k => {
    const v = s?.[k];
    return v !== undefined && v !== '';
  }).length;
  return { filled, total: driving.length };
}

// ── Validation, for the store ────────────────────────────────────────────────

const BANDS: RcBand[] = ['2.4ghz', 'sub-ghz'];
const SYSTEMS: RcSystem[] = ['elrs', 'crossfire', 'tracer', 'ghost', 'frsky', 'other'];
const MODULES: RcModuleKind[] = ['internal', 'external'];
const PROTOCOLS: RcSerialProtocol[] = ['crsf', 'sbus', 'ibus', 'pwm', 'ppm', 'other'];
const POWER: RcPowerSource[] = ['fc-5v', 'fc-9v', 'fc-vbat', 'separate-bec', 'unknown'];
const ANTENNA: RcAntennaPlacement[] = ['outside-perpendicular', 'outside-parallel', 'inside-frame', 'unknown'];
const FAILSAFE: RcFailsafeStrategy[] = ['drop-disarm', 'hold-last', 'gps-return', 'unknown'];

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
 * Deliberately field-by-field rather than all-or-nothing: unlike a part id, a
 * bad packet rate says nothing about whether the recorded band is right, and
 * discarding the whole setup over one stale field would lose real user work.
 */
export function validateRcSetup(raw: unknown): RcSetup | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const r = raw as Record<string, unknown>;

  const out: RcSetup = {
    radioModel: str(r.radioModel),
    moduleKind: oneOf(r.moduleKind, MODULES),
    txSystem: oneOf(r.txSystem, SYSTEMS),
    txBand: oneOf(r.txBand, BANDS),
    txFirmware: str(r.txFirmware, 40),
    txRegulatoryDomain: str(r.txRegulatoryDomain, 40),

    rxModel: str(r.rxModel),
    rxSystem: oneOf(r.rxSystem, SYSTEMS),
    rxBand: oneOf(r.rxBand, BANDS),
    rxFirmware: str(r.rxFirmware, 40),
    rxTarget: str(r.rxTarget, 60),
    rxRegulatoryDomain: str(r.rxRegulatoryDomain, 40),
    rxVoltage: oneOf(r.rxVoltage, POWER),
    antennaCount: int(r.antennaCount, 1, 4),
    antennaPlacement: oneOf(r.antennaPlacement, ANTENNA),
    trueDiversity: bool(r.trueDiversity),

    serialProtocol: oneOf(r.serialProtocol, PROTOCOLS),
    uartIndex: int(r.uartIndex, 1, 12),
    gpsUartIndex: int(r.gpsUartIndex, 1, 12),
    videoUartIndex: int(r.videoUartIndex, 1, 12),

    packetRateHz: int(r.packetRateHz, 1, 1000),
    telemetryRatio: str(r.telemetryRatio, 20),
    dynamicPower: bool(r.dynamicPower),
    modelMatch: bool(r.modelMatch),

    failsafeStrategy: oneOf(r.failsafeStrategy, FAILSAFE),
    failsafeTestedOn: str(r.failsafeTestedOn, 20),
    rangeTestedOn: str(r.rangeTestedOn, 20),
  };

  // Drop undefined keys so the stored payload stays small and readable.
  for (const k of Object.keys(out) as (keyof RcSetup)[]) {
    if (out[k] === undefined) delete out[k];
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
