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
