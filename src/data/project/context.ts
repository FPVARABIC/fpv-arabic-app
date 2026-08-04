/**
 * The link between what the user is reading and what the user owns.
 *
 * This is the piece that makes the encyclopedia stop being an encyclopedia. An
 * article about ESC current ratings is the same article for everyone; the fact
 * that YOUR ESC is rated 55 A, that we could not verify your motor's draw
 * against it, and that this exact question is open on your build — that is not
 * in any article, and it is what turns reading into progress.
 *
 * Two directions are resolved here, both from data that already exists:
 *
 *   module → your parts      a declared mapping, because "which parts is this
 *                            module about" is an editorial judgement, not
 *                            something to infer from text
 *   article ← your findings  computed, because every finding already carries
 *                            the links it considered relevant; reversing that
 *                            index cannot invent a connection that the verdict
 *                            engine did not already assert
 *
 * Nothing here fabricates relevance. A module with no mapped slots, or an
 * article no finding points at, simply produces nothing — and the UI renders
 * nothing rather than an empty heading.
 */

import type { BasePart } from '../assembly/types';
import {
  RC_BAND_LABEL_AR, RC_SYSTEM_LABEL_AR, RC_PROTOCOL_LABEL_AR, RC_POWER_LABEL_AR,
  RC_ANTENNA_LABEL_AR, RC_FAILSAFE_LABEL_AR, RC_MODULE_LABEL_AR,
  type RcSetup,
} from './rcSetup';
import {
  VIDEO_LINK_CLASS_LABEL_AR, VIDEO_ECOSYSTEM_LABEL_AR, VIDEO_DEVICE_ROLE_LABEL_AR,
  VTX_CONTROL_LABEL_AR, OSD_PROTOCOL_LABEL_AR, VIDEO_RECORDING_LABEL_AR,
  VIDEO_BAND_LABEL_AR, VIDEO_POLARISATION_LABEL_AR, VIDEO_CONNECTOR_LABEL_AR,
  VIDEO_POWER_LABEL_AR, VIDEO_COOLING_LABEL_AR,
} from '../video/types';
import type { VideoSetup } from './videoSetup';
import type { Finding, ProjectSnapshot } from './types';

/** A part slot on the snapshot, with the label the user sees for it. */
interface PartSlot {
  key: keyof ProjectSnapshot;
  labelAr: string;
}

const SLOT = {
  frame: { key: 'frame', labelAr: 'الهيكل' },
  motor: { key: 'motor', labelAr: 'المحركات' },
  esc: { key: 'esc', labelAr: 'الـESC' },
  flightController: { key: 'flightController', labelAr: 'متحكم الطيران' },
  battery: { key: 'battery', labelAr: 'البطارية' },
  propeller: { key: 'propeller', labelAr: 'المراوح' },
  receiver: { key: 'receiver', labelAr: 'المستقبل' },
  videoUnit: { key: 'videoUnit', labelAr: 'وحدة الفيديو' },
  gps: { key: 'gps', labelAr: 'وحدة GPS' },
} as const satisfies Record<string, PartSlot>;

/**
 * Which of the user's parts each knowledge module is about.
 *
 * Deliberately more than one slot per module where the subject genuinely spans
 * parts: the ESC module reasons about the motors it drives and the battery it
 * switches, and showing only the ESC would hide half of what the reader needs
 * to apply the article to their own build. It is deliberately NOT every part —
 * a list of everything the user owns on every page is noise, and noise is what
 * makes people stop reading these panels at all.
 */
export const MODULE_PART_SLOTS: Record<string, PartSlot[]> = {
  'flight-controller': [SLOT.flightController, SLOT.receiver, SLOT.videoUnit, SLOT.gps],
  esc: [SLOT.esc, SLOT.motor, SLOT.battery],
  motors: [SLOT.motor, SLOT.propeller, SLOT.battery],
  propellers: [SLOT.propeller, SLOT.motor, SLOT.frame],
  'power-battery': [SLOT.battery, SLOT.esc],
  // The link ends at the flight controller's serial port, so the board the
  // reader owns is as much a part of this subject as the receiver itself:
  // which UART is free and whether it inverts decides whether the wiring in
  // these articles will work at all on their build.
  'rc-link': [SLOT.receiver, SLOT.flightController],
  // The video chain ends at a serial port too, and on most builds the camera is
  // powered from the board. So the reader's flight controller is as much part of
  // this subject as the video unit itself — and leaving it out would hide the
  // half of every video wiring decision that is actually a board decision.
  video: [SLOT.videoUnit, SLOT.flightController],
};

export interface ProjectPartRef {
  labelAr: string;
  part: BasePart;
}

/** The user's parts that this module is actually about, in declared order. */
export function projectPartsForModule(p: ProjectSnapshot, moduleId: string): ProjectPartRef[] {
  if (!p.exists) return [];
  const slots = MODULE_PART_SLOTS[moduleId];
  if (!slots) return [];
  const out: ProjectPartRef[] = [];
  for (const s of slots) {
    const part = p[s.key] as BasePart | undefined;
    if (part) out.push({ labelAr: s.labelAr, part });
  }
  return out;
}

/**
 * The findings that named this article as worth reading.
 *
 * The relationship is asserted by the verdict engine, not guessed here: a
 * finding appears on an article only because that finding's own author decided
 * this article explains it.
 */
export function findingsForArticle(findings: Finding[], articleId: string): Finding[] {
  return findings.filter(f =>
    f.links.some(l => l.kind === 'article' && l.targetId === articleId));
}

/** True when there is genuinely something project-specific to show. */
export function hasProjectContext(parts: ProjectPartRef[], findings: Finding[]): boolean {
  return parts.length > 0 || findings.length > 0;
}

// ── The software centre, applied to the reader's own build ───────────────────

/**
 * Which recorded control-link facts each Betaflight page is actually about.
 *
 * A page a user opens while configuring their aircraft should show what THEY
 * recorded, not a generic description. The mapping is declared rather than
 * inferred because "which settings does this screen own" is an editorial
 * judgement — and a wrong inference here would show someone their GPS port on
 * the failsafe page, which is worse than showing nothing.
 *
 * Pages absent from this map show no panel at all. That is deliberate: the PID
 * tuning screen has nothing to say about a receiver, and a panel that appears
 * everywhere stops being read anywhere.
 */
export const BF_PAGE_RC_FIELDS: Record<string, (keyof RcSetup)[]> = {
  ports: ['uartIndex', 'gpsUartIndex', 'videoUartIndex', 'serialProtocol'],
  receiver: ['serialProtocol', 'rxModel', 'rxSystem', 'txSystem', 'modelMatch', 'packetRateHz'],
  failsafe: ['failsafeStrategy', 'failsafeTestedOn'],
  gps: ['gpsUartIndex'],
  vtx: ['videoUartIndex'],
};

/** Human labels for the recorded values, so a page can render them directly. */
export interface RcFactRef {
  field: keyof RcSetup;
  labelAr: string;
  valueAr: string;
}

const RC_FIELD_LABEL_AR: Partial<Record<keyof RcSetup, string>> = {
  radioModel: 'جهاز التحكم',
  moduleKind: 'نوع الوحدة',
  txSystem: 'النظام على جهة الإرسال',
  txBand: 'النطاق على جهة الإرسال',
  txFirmware: 'إصدار وحدة الإرسال',
  txRegulatoryDomain: 'النطاق التنظيمي للإرسال',
  rxModel: 'المستقبل',
  rxSystem: 'النظام على المستقبل',
  rxBand: 'النطاق على المستقبل',
  rxFirmware: 'إصدار المستقبل',
  rxTarget: 'الـTarget',
  rxRegulatoryDomain: 'النطاق التنظيمي للمستقبل',
  rxVoltage: 'تغذية المستقبل',
  antennaCount: 'عدد الهوائيات',
  antennaPlacement: 'وضع الهوائي',
  trueDiversity: 'تنويع حقيقي',
  serialProtocol: 'البروتوكول التسلسلي',
  uartIndex: 'منفذ المستقبل',
  gpsUartIndex: 'منفذ الـGPS',
  videoUartIndex: 'منفذ الفيديو',
  packetRateHz: 'معدل الرزم',
  telemetryRatio: 'نسبة التليمتري',
  dynamicPower: 'قدرة ديناميكية',
  modelMatch: 'مطابقة النموذج',
  failsafeStrategy: 'سلوك فقد الإشارة',
  failsafeTestedOn: 'آخر اختبار لفقد الإشارة',
  rangeTestedOn: 'آخر اختبار مدى',
};

/** Renders one recorded value into Arabic, using the closed-set labels. */
function rcValueAr(field: keyof RcSetup, rc: RcSetup): string | undefined {
  const v = rc[field];
  if (v === undefined || v === '') return undefined;
  switch (field) {
    case 'txBand': case 'rxBand': return RC_BAND_LABEL_AR[v as keyof typeof RC_BAND_LABEL_AR];
    case 'txSystem': case 'rxSystem': return RC_SYSTEM_LABEL_AR[v as keyof typeof RC_SYSTEM_LABEL_AR];
    case 'moduleKind': return RC_MODULE_LABEL_AR[v as keyof typeof RC_MODULE_LABEL_AR];
    case 'serialProtocol': return RC_PROTOCOL_LABEL_AR[v as keyof typeof RC_PROTOCOL_LABEL_AR];
    case 'rxVoltage': return RC_POWER_LABEL_AR[v as keyof typeof RC_POWER_LABEL_AR];
    case 'antennaPlacement': return RC_ANTENNA_LABEL_AR[v as keyof typeof RC_ANTENNA_LABEL_AR];
    case 'failsafeStrategy': return RC_FAILSAFE_LABEL_AR[v as keyof typeof RC_FAILSAFE_LABEL_AR];
    case 'uartIndex': case 'gpsUartIndex': case 'videoUartIndex': return `UART ${v}`;
    case 'trueDiversity': case 'dynamicPower': case 'modelMatch': return v ? 'نعم' : 'لا';
    default: return String(v);
  }
}

/**
 * The recorded facts relevant to a given set of fields, skipping anything the
 * user has not filled in. An absent value produces no row rather than an empty
 * one — a list of blanks teaches nothing and reads as a broken screen.
 */
export function rcFactsFor(p: ProjectSnapshot, fields: (keyof RcSetup)[]): RcFactRef[] {
  const rc = p.rcSetup;
  if (!p.exists || !rc) return [];
  const out: RcFactRef[] = [];
  for (const field of fields) {
    const valueAr = rcValueAr(field, rc);
    const labelAr = RC_FIELD_LABEL_AR[field];
    if (valueAr && labelAr) out.push({ field, labelAr, valueAr });
  }
  return out;
}

/** The recorded facts a specific Betaflight page is about. */
export function rcFactsForBetaflightPage(p: ProjectSnapshot, pageId: string): RcFactRef[] {
  return rcFactsFor(p, BF_PAGE_RC_FIELDS[pageId] ?? []);
}

/**
 * The findings that named this Betaflight page as where to act.
 *
 * The mirror of `findingsForArticle`: the relationship is asserted by the
 * verdict engine's own links, so a page can never claim a finding that did not
 * point at it.
 */
export function findingsForBetaflightPage(findings: Finding[], pageId: string): Finding[] {
  return findings.filter(f =>
    f.links.some(l => l.kind === 'betaflight' && l.targetId === pageId));
}

/**
 * The control-link facts worth showing beside a knowledge-base article.
 *
 * Keyed by module rather than by article: every article in the control-link
 * module benefits from knowing the reader's band, system and protocol, and
 * keying it per-article would mean a new mapping entry for every article
 * written — exactly the manual upkeep this design exists to avoid.
 */
export const MODULE_RC_FIELDS: Record<string, (keyof RcSetup)[]> = {
  'rc-link': [
    'txSystem', 'txBand', 'rxSystem', 'rxBand', 'rxTarget',
    'txFirmware', 'rxFirmware', 'serialProtocol', 'uartIndex',
    'antennaPlacement', 'failsafeStrategy',
  ],
};

export function rcFactsForModule(p: ProjectSnapshot, moduleId: string): RcFactRef[] {
  return rcFactsFor(p, MODULE_RC_FIELDS[moduleId] ?? []);
}

// ── EdgeTX, applied to the reader's own radio ────────────────────────────────

/**
 * Which recorded facts each EdgeTX topic is actually about.
 *
 * Same rule as the Betaflight map, and the same reason for it: a panel that
 * appears on every page stops being read on any page. Most EdgeTX topics are
 * absent from this map on purpose — the mixer screen has nothing to say about
 * which UART carries the receiver, and a panel there would be noise dressed as
 * personalisation.
 *
 * The pages that ARE here are the ones where the reader's own recorded setup
 * changes what the page means: the module they own, the system and band they
 * run, whether Model Match is on, what failsafe strategy they chose.
 */
export const EDGETX_PAGE_RC_FIELDS: Record<string, (keyof RcSetup)[]> = {
  'model-setup': ['radioModel', 'moduleKind', 'txSystem', 'txBand'],
  'internal-module': ['radioModel', 'moduleKind', 'txSystem', 'txBand', 'txFirmware'],
  'external-module': ['radioModel', 'moduleKind', 'txSystem', 'txBand', 'txFirmware'],
  'rf-system': ['txSystem', 'txBand', 'rxSystem', 'rxBand', 'rxModel'],
  crsf: ['serialProtocol', 'uartIndex', 'packetRateHz'],
  'channel-range': ['packetRateHz', 'serialProtocol'],
  'telemetry-sensors': ['telemetryRatio', 'serialProtocol', 'rxModel'],
  'discover-sensors': ['telemetryRatio', 'rxModel'],
  'lua-scripts': ['txFirmware', 'rxFirmware', 'moduleKind'],
  'model-match': ['modelMatch', 'rxModel', 'rxSystem'],
  failsafe: ['failsafeStrategy', 'failsafeTestedOn', 'rxModel'],
  'firmware-update': ['radioModel', 'txFirmware'],
  'problem-module-missing': ['radioModel', 'moduleKind', 'txSystem'],
  'problem-lua': ['txFirmware', 'rxFirmware'],
  'problem-telemetry': ['telemetryRatio', 'serialProtocol', 'uartIndex'],
  'problem-model-match': ['modelMatch', 'rxModel'],
  'problem-firmware-files': ['radioModel', 'txFirmware'],
};

/**
 * What the EdgeTX hub shows about the reader's radio before they pick a topic.
 *
 * Deliberately the six facts that decide which topics are even relevant: the
 * radio, the module, the system, the band, Model Match and telemetry. Not the
 * whole record — the hub is a place to choose from, not a place to read from.
 */
export const EDGETX_HUB_RC_FIELDS: (keyof RcSetup)[] = [
  'radioModel', 'moduleKind', 'txSystem', 'txBand', 'rxModel', 'modelMatch', 'telemetryRatio',
];

export function rcFactsForEdgeTxHub(p: ProjectSnapshot): RcFactRef[] {
  return rcFactsFor(p, EDGETX_HUB_RC_FIELDS);
}

/** The recorded facts a specific EdgeTX topic is about. */
export function rcFactsForEdgeTxPage(p: ProjectSnapshot, pageId: string): RcFactRef[] {
  return rcFactsFor(p, EDGETX_PAGE_RC_FIELDS[pageId] ?? []);
}

/**
 * The findings that named this EdgeTX topic as where to act.
 *
 * The third mirror of the same rule: the verdict engine's own links decide, so
 * a topic can never claim a finding that did not point at it.
 */
export function findingsForEdgeTxPage(findings: Finding[], pageId: string): Finding[] {
  return findings.filter(f =>
    f.links.some(l => l.kind === 'edgetx' && l.targetId === pageId));
}

// ── ExpressLRS, applied to the reader's own hardware ─────────────────────────

/**
 * Which recorded facts each ExpressLRS step and issue is about.
 *
 * The fourth application of the same rule. Note what is deliberately absent:
 * the LED-behaviour issues, the safety closer, the packet-rate explainer. None
 * of them changes meaning based on the reader's recorded Target, so none of
 * them gets a panel — and that is what keeps the panel worth reading on the
 * pages that do have one.
 */
export const ELRS_ENTRY_RC_FIELDS: Record<string, (keyof RcSetup)[]> = {
  // Setup steps.
  'identify-hardware': ['rxModel', 'rxSystem', 'rxBand', 'moduleKind'],
  'prepare-radio': ['radioModel', 'moduleKind', 'txSystem'],
  'configurator-target': ['rxModel', 'rxTarget', 'rxBand', 'rxRegulatoryDomain'],
  'device-category': ['rxModel', 'rxTarget', 'rxBand'],
  'build-options': ['rxTarget', 'txRegulatoryDomain', 'rxRegulatoryDomain', 'modelMatch'],
  'update-tx': ['txFirmware', 'txSystem', 'moduleKind'],
  'update-rx': ['rxFirmware', 'rxTarget', 'rxModel'],
  binding: ['txSystem', 'rxSystem', 'txFirmware', 'rxFirmware', 'modelMatch'],
  'receiver-wiring': ['uartIndex', 'serialProtocol', 'rxVoltage'],
  'configure-betaflight': ['serialProtocol', 'uartIndex'],
  'lua-webui': ['txFirmware', 'packetRateHz', 'telemetryRatio', 'dynamicPower'],
  'final-verification': ['failsafeStrategy', 'failsafeTestedOn', 'rangeTestedOn'],

  // Troubleshooting issues.
  'tx-not-detected': ['radioModel', 'moduleKind', 'txSystem'],
  'no-bind': ['txSystem', 'rxSystem', 'txBand', 'rxBand', 'txFirmware', 'rxFirmware'],
  'binding-phrase-mismatch': ['txFirmware', 'rxFirmware', 'modelMatch'],
  'firmware-incompatibility': ['txFirmware', 'rxFirmware'],
  'wrong-regulatory-domain': ['txRegulatoryDomain', 'rxRegulatoryDomain', 'txBand', 'rxBand'],
  'model-match-blocks': ['modelMatch', 'rxModel'],
  'low-rssi-lq': ['antennaPlacement', 'packetRateHz', 'rangeTestedOn'],
  'unstable-short-range': ['antennaPlacement', 'trueDiversity', 'rangeTestedOn'],
  'wrong-uart': ['uartIndex', 'serialProtocol'],
  'uart-conflict': ['uartIndex', 'gpsUartIndex', 'videoUartIndex', 'serialProtocol'],
  'serial-rx-not-enabled': ['uartIndex', 'serialProtocol'],
  'telemetry-missing': ['telemetryRatio', 'serialProtocol'],
  'failsafe-incorrect': ['failsafeStrategy', 'failsafeTestedOn'],
  'build-failure': ['rxTarget', 'rxFirmware'],
  'passthrough-failure': ['uartIndex', 'serialProtocol', 'rxTarget'],
  'wifi-upload-interrupted': ['rxFirmware', 'rxModel'],
  'wrong-target-selected': ['rxTarget', 'rxModel'],
  'recovery-after-bad-flash': ['rxTarget', 'rxFirmware'],
};

/** The recorded facts a specific ExpressLRS step or issue is about. */
export function rcFactsForElrsEntry(p: ProjectSnapshot, entryId: string): RcFactRef[] {
  return rcFactsFor(p, ELRS_ENTRY_RC_FIELDS[entryId] ?? []);
}

/** The findings that named this ExpressLRS step or issue as where to act. */
export function findingsForElrsEntry(findings: Finding[], entryId: string): Finding[] {
  return findings.filter(f => f.links.some(
    l => (l.kind === 'elrs-setup' || l.kind === 'elrs-issue') && l.targetId === entryId));
}

// ── The video system, applied to the reader's own build ──────────────────────

/**
 * Which recorded video facts each Betaflight page is actually about.
 *
 * The same declared-not-inferred rule as `BF_PAGE_RC_FIELDS`, and deliberately
 * a SEPARATE map rather than more entries in that one: the two records have
 * different owners and different shapes, and merging them would have meant a
 * single map whose value type was a union nobody could read.
 *
 * `ports` appears in both maps on purpose. It is the one screen where the
 * control link and the video system genuinely compete for the same resource, so
 * the reader needs both sets of numbers side by side to see the conflict at all
 * — which is exactly what the merged `factsForBetaflightPage` below produces.
 */
export const BF_PAGE_VIDEO_FIELDS: Record<string, (keyof VideoSetup)[]> = {
  ports: ['vtxControlProtocol', 'vtxControlUartIndex', 'osdProtocol', 'osdUartIndex'],
  osd: ['osdProtocol', 'osdUartIndex', 'linkClass', 'ecosystem', 'osdTestedOn'],
  vtx: [
    'ecosystem', 'airDeviceRole', 'airUnitModel', 'vtxControlProtocol',
    'vtxControlUartIndex', 'band', 'channel', 'powerMw',
  ],
  power: ['powerSource', 'becCurrentMa', 'cameraPowerSource'],
  configuration: ['linkClass', 'osdProtocol'],
};

/** Human labels for the recorded video values, so a page can render them directly. */
export interface VideoFactRef {
  field: keyof VideoSetup;
  labelAr: string;
  valueAr: string;
}

const VIDEO_FIELD_LABEL_AR: Partial<Record<keyof VideoSetup, string>> = {
  ecosystem: 'منظومة الفيديو',
  linkClass: 'نوع الرابط',
  airDeviceRole: 'دور الجهاز على الطائرة',
  airUnitModel: 'وحدة الطائرة',
  airUnitFirmware: 'إصدار وحدة الطائرة',
  cameraModel: 'الكاميرا',
  cameraIntegrated: 'كاميرا مدمجة',
  gogglesModel: 'النظارة',
  gogglesFirmware: 'إصدار النظارة',
  gogglesEcosystem: 'منظومة النظارة',
  vrxModule: 'وحدة الاستقبال في النظارة',
  trueDiversity: 'تنويع حقيقي',
  vtxControlProtocol: 'بروتوكول التحكم بالوحدة',
  vtxControlUartIndex: 'منفذ التحكم بالوحدة',
  powerSource: 'مصدر تغذية الوحدة',
  becCurrentMa: 'سعة المصدر',
  cameraPowerSource: 'مصدر تغذية الكاميرا',
  sharedGroundConfirmed: 'أرضي مشترك مؤكَّد',
  osdProtocol: 'بروتوكول طبقة المعلومات',
  osdUartIndex: 'منفذ طبقة المعلومات',
  band: 'النطاق',
  channel: 'القناة',
  powerMw: 'قدرة الإرسال',
  txAntennaPolarisation: 'استقطاب هوائي الطائرة',
  rxAntennaPolarisation: 'استقطاب هوائي النظارة',
  txAntennaConnector: 'موصل هوائي الطائرة',
  antennaFittedConfirmed: 'الهوائي مركّب ومؤكَّد',
  cooling: 'حالة التبريد',
  mountingNote: 'موضع الوحدة',
  recording: 'التسجيل',
  imageTestedOn: 'آخر اختبار صورة',
  osdTestedOn: 'آخر اختبار لطبقة المعلومات',
  rangeTestedOn: 'آخر اختبار مدى للفيديو',
  thermalTestedOn: 'آخر اختبار حراري',
};

/** Renders one recorded video value into Arabic, using the closed-set labels. */
function videoValueAr(field: keyof VideoSetup, v: VideoSetup): string | undefined {
  const raw = v[field];
  if (raw === undefined || raw === '') return undefined;
  switch (field) {
    case 'ecosystem': case 'gogglesEcosystem':
      return VIDEO_ECOSYSTEM_LABEL_AR[raw as keyof typeof VIDEO_ECOSYSTEM_LABEL_AR];
    case 'linkClass':
      return VIDEO_LINK_CLASS_LABEL_AR[raw as keyof typeof VIDEO_LINK_CLASS_LABEL_AR];
    case 'airDeviceRole':
      return VIDEO_DEVICE_ROLE_LABEL_AR[raw as keyof typeof VIDEO_DEVICE_ROLE_LABEL_AR];
    case 'vtxControlProtocol':
      return VTX_CONTROL_LABEL_AR[raw as keyof typeof VTX_CONTROL_LABEL_AR];
    case 'osdProtocol':
      return OSD_PROTOCOL_LABEL_AR[raw as keyof typeof OSD_PROTOCOL_LABEL_AR];
    case 'powerSource': case 'cameraPowerSource':
      return VIDEO_POWER_LABEL_AR[raw as keyof typeof VIDEO_POWER_LABEL_AR];
    case 'band':
      return VIDEO_BAND_LABEL_AR[raw as keyof typeof VIDEO_BAND_LABEL_AR];
    case 'txAntennaPolarisation': case 'rxAntennaPolarisation':
      return VIDEO_POLARISATION_LABEL_AR[raw as keyof typeof VIDEO_POLARISATION_LABEL_AR];
    case 'txAntennaConnector':
      return VIDEO_CONNECTOR_LABEL_AR[raw as keyof typeof VIDEO_CONNECTOR_LABEL_AR];
    case 'cooling':
      return VIDEO_COOLING_LABEL_AR[raw as keyof typeof VIDEO_COOLING_LABEL_AR];
    case 'recording':
      return VIDEO_RECORDING_LABEL_AR[raw as keyof typeof VIDEO_RECORDING_LABEL_AR];
    case 'vtxControlUartIndex': case 'osdUartIndex': return `UART ${raw}`;
    case 'becCurrentMa': return `${raw} mA`;
    case 'powerMw': return `${raw} mW`;
    case 'cameraIntegrated': case 'trueDiversity':
    case 'sharedGroundConfirmed': case 'antennaFittedConfirmed':
      return raw ? 'نعم' : 'لا';
    default: return String(raw);
  }
}

/**
 * The recorded video facts for a given set of fields, skipping anything absent.
 *
 * Same contract as `rcFactsFor`: a field the reader never filled in produces no
 * row. The video record is far more likely to be partly empty than the control
 * one — most of it can only be filled from a manufacturer's manual — so this
 * matters more here, not less.
 */
export function videoFactsFor(p: ProjectSnapshot, fields: (keyof VideoSetup)[]): VideoFactRef[] {
  const v = p.videoSetup;
  if (!p.exists || !v) return [];
  const out: VideoFactRef[] = [];
  for (const field of fields) {
    const valueAr = videoValueAr(field, v);
    const labelAr = VIDEO_FIELD_LABEL_AR[field];
    if (valueAr && labelAr) out.push({ field, labelAr, valueAr });
  }
  return out;
}

/** The recorded video facts a specific Betaflight page is about. */
export function videoFactsForBetaflightPage(p: ProjectSnapshot, pageId: string): VideoFactRef[] {
  return videoFactsFor(p, BF_PAGE_VIDEO_FIELDS[pageId] ?? []);
}

/**
 * Both records' facts for one Betaflight page, in one list the UI can render.
 *
 * This exists because the alternative — two panels stacked on the ports screen,
 * one headed «رابط التحكم» and one headed «الفيديو» — hides the single most
 * important thing that screen has to say: that UART 2 is claimed twice. Merging
 * them into one ordered list puts the two numbers next to each other where the
 * conflict is visible.
 *
 * Control-link facts come first because on every page in both maps they are the
 * ones that also constrain the video side, never the other way round.
 */
export type PageFactRef =
  | ({ record: 'rc' } & RcFactRef)
  | ({ record: 'video' } & VideoFactRef);

export function factsForBetaflightPage(p: ProjectSnapshot, pageId: string): PageFactRef[] {
  return [
    ...rcFactsForBetaflightPage(p, pageId).map(f => ({ record: 'rc' as const, ...f })),
    ...videoFactsForBetaflightPage(p, pageId).map(f => ({ record: 'video' as const, ...f })),
  ];
}

/**
 * The video facts worth showing beside a knowledge-base article.
 *
 * Keyed by module for the same reason `MODULE_RC_FIELDS` is: every article in
 * the video module is improved by knowing which system the reader actually
 * runs, and per-article keys would be upkeep with no editorial gain.
 */
export const MODULE_VIDEO_FIELDS: Record<string, (keyof VideoSetup)[]> = {
  video: [
    'ecosystem', 'linkClass', 'airDeviceRole', 'airUnitModel', 'gogglesModel',
    'gogglesEcosystem', 'vtxControlProtocol', 'osdProtocol', 'powerSource',
    'band', 'channel', 'txAntennaPolarisation', 'cooling',
  ],
};

export function videoFactsForModule(p: ProjectSnapshot, moduleId: string): VideoFactRef[] {
  return videoFactsFor(p, MODULE_VIDEO_FIELDS[moduleId] ?? []);
}

/**
 * The findings that named this video-software topic as where to act.
 *
 * The fifth mirror of the same rule, and the last one: the verdict engine's own
 * links decide, so a topic can never claim a finding that did not point at it.
 */
export function findingsForVideoToolPage(findings: Finding[], pageId: string): Finding[] {
  return findings.filter(f =>
    f.links.some(l => l.kind === 'video' && l.targetId === pageId));
}

/**
 * Labels for an explicit field list.
 *
 * The video software pages differ from the other three centres in one way: each
 * page carries its OWN `projectFields`, declared beside its content rather than
 * in a map here. That is the better arrangement for them — the fields are part
 * of what the page is about — but it means this module cannot look them up
 * without importing the video registry, which would drag the whole centre into
 * every bundle that needs a label. So the caller passes the fields and this
 * returns their labels, from the same table `videoFactsFor` renders with.
 */
export function videoFieldLabels(fields: readonly (keyof VideoSetup)[]): string[] {
  return fields.map(f => VIDEO_FIELD_LABEL_AR[f]).filter((l): l is string => !!l);
}

/** The findings that named this diagnostic tree as where to act. */
export function findingsForDxTree(findings: Finding[], treeId: string): Finding[] {
  return findings.filter(f =>
    f.links.some(l => l.kind === 'dx' && l.targetId === treeId));
}

// ── What an entry is ABOUT, regardless of what the reader recorded ───────────

/**
 * The Arabic labels of every field an entry is about — recorded or not.
 *
 * `rcFactsFor` and `videoFactsFor` return only fields that HAVE values, which is
 * the correct contract for them: the core must never invent a value. But it
 * leaves a UI unable to distinguish "this page has nothing to do with UARTs"
 * from "this page is about UARTs and you never recorded yours" — and those two
 * deserve very different screens. Naming the full expected set is the missing
 * half, and it belongs here rather than in a renderer: a surface that hand-wrote
 * its own copy of these labels would drift from the ones `rcFactsFor` returns,
 * and a label that differs by one word makes a recorded field read as missing.
 *
 * Derived from the same maps the fact readers use, so a field added to a page
 * appears in both results at once with no second edit.
 */
export type ContextEntryKind = 'betaflight' | 'edgetx' | 'elrs';

function rcLabels(fields: (keyof RcSetup)[] | undefined): string[] {
  return (fields ?? []).map(f => RC_FIELD_LABEL_AR[f]).filter((l): l is string => !!l);
}

function videoLabels(fields: (keyof VideoSetup)[] | undefined): string[] {
  return (fields ?? []).map(f => VIDEO_FIELD_LABEL_AR[f]).filter((l): l is string => !!l);
}

export function expectedLabelsFor(kind: ContextEntryKind, entryId: string): string[] {
  switch (kind) {
    case 'betaflight':
      return [
        ...rcLabels(BF_PAGE_RC_FIELDS[entryId]),
        ...videoLabels(BF_PAGE_VIDEO_FIELDS[entryId]),
      ];
    case 'edgetx':
      return rcLabels(EDGETX_PAGE_RC_FIELDS[entryId]);
    case 'elrs':
      return rcLabels(ELRS_ENTRY_RC_FIELDS[entryId]);
  }
}

/** Whether an entry has any project-relevant fields at all. */
export function hasProjectFields(kind: ContextEntryKind, entryId: string): boolean {
  return expectedLabelsFor(kind, entryId).length > 0;
}
