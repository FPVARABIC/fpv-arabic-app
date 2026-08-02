/**
 * Data model for the ExpressLRS setup guide (src/views/ExpressLrsSetupView.tsx).
 * The renderer must not contain device-specific technical content — every
 * fact, table, and warning lives here so the guide can be updated without
 * touching component code.
 */

import type { KbBotMeta, KbLink } from '../kb/types';

export type ReceiverArchitecture = 'uart' | 'spi' | 'unknown';
export type TxModuleLocation = 'internal' | 'external' | 'unknown';
export type FrequencyBand = '2.4' | '900' | 'unknown';
export type SetupIntent = 'new' | 'bound-not-moving' | 'update-existing' | 'replace-receiver';
export type FlightControllerSoftware = 'betaflight' | 'other' | 'unknown';
export type WarningLevel = 'info' | 'warning' | 'danger';

export interface OnboardingAnswers {
  receiverArchitecture: ReceiverArchitecture | null;
  txModuleLocation: TxModuleLocation | null;
  frequencyBand: FrequencyBand | null;
  setupIntent: SetupIntent | null;
  fcSoftware: FlightControllerSoftware | null;
}

export interface SourceRef {
  label: string;
  url: string;
}

export interface TerminologyEntry {
  term: string;
  definition: string;
}

export interface StepWarning {
  level: WarningLevel;
  message: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
}

export interface AdvancedDisclosure {
  title: string;
  body: string[];
}

export interface SetupStepContent {
  id: string;
  order: number;
  title: string;
  summary: string;
  estimatedMinutes: number;
  goal: string;
  prerequisites: string[];
  terminology: TerminologyEntry[];
  /** Lines may carry a "[UART] " or "[SPI] " prefix to mark a hardware-specific branch. */
  actions: string[];
  expectedResult: string[];
  ifNotSeen: string[];
  commonMistakes: string[];
  warnings: StepWarning[];
  checklist: ChecklistItem[];
  sources: SourceRef[];
  reviewedAt: string;
  applicableHardware: ReceiverArchitecture[];
  applicableModuleLocation: TxModuleLocation[];
  applicableBands: FrequencyBand[];
  applicableMajorVersions: string[];
  versionNotes: string[];
  troubleshootingLinks: string[];
  advancedDisclosures: AdvancedDisclosure[];
  /**
   * Retrieval metadata, shared with the encyclopedia rather than reinvented.
   *
   * Importing `KbBotMeta` here rather than declaring a parallel shape is the
   * point: the answering layer must be able to rank an ExpressLRS step against
   * a KB article without knowing they came from different modules.
   */
  bot?: KbBotMeta;
}

export const RECEIVER_ARCHITECTURE_LABELS: Record<ReceiverArchitecture, string> = {
  uart: 'مستقبل خارجي (UART)',
  spi: 'مستقبل مدمج (SPI)',
  unknown: 'لا أعرف',
};

export const TX_MODULE_LOCATION_LABELS: Record<TxModuleLocation, string> = {
  internal: 'ExpressLRS داخلية',
  external: 'ExpressLRS خارجية',
  unknown: 'لا أعرف',
};

export const FREQUENCY_BAND_LABELS: Record<FrequencyBand, string> = {
  '2.4': '2.4GHz',
  '900': '900MHz',
  unknown: 'لا أعرف',
};

export const SETUP_INTENT_LABELS: Record<SetupIntent, string> = {
  new: 'إعداد جديد',
  'bound-not-moving': 'تم الربط لكن القنوات لا تتحرك',
  'update-existing': 'تحديث نظام موجود',
  'replace-receiver': 'استبدال المستقبل',
};

export const FC_SOFTWARE_LABELS: Record<FlightControllerSoftware, string> = {
  betaflight: 'Betaflight',
  other: 'نظام آخر',
  unknown: 'لا أعرف',
};

/**
 * Data model for the ExpressLRS troubleshooting guide
 * (src/views/ExpressLrsTroubleshootingView.tsx). Kept in this shared
 * expresslrs/types.ts module (the domain's single type source) but the
 * troubleshooting *data* itself lives in its own file, separate from
 * setupSteps.ts.
 */

/** Tri-state outcome of a single diagnostic check. */
export type CheckOutcome = 'not-checked' | 'passed' | 'failed';

/** Which receiver architecture(s) an issue applies to. */
export type IssueApplicability = 'uart' | 'spi' | 'both';

export interface DiagnosticCheck {
  id: string;
  instruction: string;
  expectedResult: string;
  /** What to do next if this specific check fails. */
  ifFailed: string;
}

export interface TroubleshootingIssue {
  id: string;
  order: number;
  category: string;
  title: string;
  symptom: string;
  applicability: IssueApplicability;
  safetyWarning?: StepWarning;
  likelyCauses: string[];
  /** Ordered — must be worked through in sequence, one change at a time. */
  checks: DiagnosticCheck[];
  resolvedWhen: string;
  nextIfUnresolved: string;
  sources: SourceRef[];
  reviewedAt: string;
  /**
   * Destinations this issue can hand the reader off to, resolved through the
   * platform's one route resolver. `sources` are where the FACTS came from;
   * these are where the reader GOES — the Ports page, their own project, the
   * EdgeTX topic that owns the radio side.
   */
  links?: KbLink[];
  bot?: KbBotMeta;
}
