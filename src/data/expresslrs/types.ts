/**
 * Data model for the ExpressLRS setup guide (src/views/ExpressLrsSetupView.tsx).
 * The renderer must not contain device-specific technical content — every
 * fact, table, and warning lives here so the guide can be updated without
 * touching component code.
 */

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
