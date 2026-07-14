/**
 * Betaflight Arabic companion — Phase 1 architecture types.
 *
 * These types model one official Betaflight App page/tab as verified
 * against the real Configurator source (see sourceHelpers.ts for the
 * exact repo/commit this was derived from). They intentionally do not
 * live inside any JSX/view file — content is data, rendering is generic.
 */

export type BfContentStatus = 'not-started' | 'architecture-preview' | 'reviewed';

export type BfConnectionState = 'connected' | 'disconnected';

export type BfSafetyLevel = 'informational' | 'caution' | 'warning' | 'critical';

export type BfContentLevel = 'basic' | 'advanced' | 'expert';

export type BfControlType =
  | 'toggle'
  | 'select'
  | 'number'
  | 'text'
  | 'button'
  | 'table'
  | 'graph'
  | 'status'
  | 'action';

/**
 * Why a page/field only sometimes applies. 'universal' means always true
 * for the documented baseline; every other value requires a `conditions`
 * note explaining what gates it.
 */
export type BfScope =
  | 'universal'
  | 'version-dependent'
  | 'hardware-dependent'
  | 'feature-dependent'
  | 'target-dependent'
  | 'sensor-dependent'
  | 'expert-only'
  | 'app-only'
  | 'firmware-only';

export interface BfSourceRef {
  title: string;
  url: string;
  /** Path inside the source repo this was verified against, e.g. 'src/tabs/setup.html'. */
  repoPath?: string;
  /** Git commit hash or tag the verification was performed against. */
  commit?: string;
  reviewedAt: string;
  firmwareVersion: string;
  appVersion: string;
  applicability: BfScope;
}

export interface BfFieldRange {
  min?: number;
  max?: number;
  default?: string | number | boolean;
  unit?: string;
  options?: string[];
}

export interface BfField {
  /** Stable local ID, unique within the page. */
  id: string;
  /** Exact official English label, verified against source/locale strings. */
  englishLabel: string;
  arabicMeaning: string;
  arabicExplanation: string;
  group: string;
  controlType: BfControlType;
  range?: BfFieldRange;
  scope: BfScope;
  /** Free-text note explaining the condition, required whenever scope !== 'universal'. */
  conditionNote?: string;
  dependsOnFieldIds?: string[];
  beginnerGuidance?: string;
  advancedGuidance?: string;
  safetyLevel: BfSafetyLevel;
  requiresSave: boolean;
  requiresReboot: boolean;
  source: BfSourceRef;
  deprecatedNote?: string;
}

export interface BfGroup {
  id: string;
  officialTitle?: string;
  titleAr: string;
  level: BfContentLevel;
  order: number;
  fields: BfField[];
}

/**
 * A version-specific patch applied on top of a BfPage at render time.
 * Only confirmed differences belong here — never speculative placeholders.
 */
export interface BfVersionOverlay {
  versionRange: string;
  note: string;
  fieldOverrides?: Partial<Record<string, Partial<BfField>>>;
}

export interface BfPage {
  /** Stable local ID — never reused for a different page once published. */
  id: string;
  /** Official internal tab ID from the Configurator source (e.g. 'setup', 'onboard_logging'). */
  officialId: string;
  officialTitle: string;
  titleAr: string;
  /** Position in the official registry — see pageRegistry.ts. */
  officialOrder: number;
  summaryAr: string;
  connectionState: BfConnectionState;
  contentStatus: BfContentStatus;
  firmwareVersionRange: string;
  appVersionRange: string;
  reviewedAt: string;
  source: BfSourceRef;
  expertRequired: boolean;
  scope: BfScope;
  conditionNote?: string;
  featureRequirements?: string[];
  hardwareRequirements?: string[];
  safetyLevel: BfSafetyLevel;
  groups: BfGroup[];
  relatedPageIds?: string[];
  glossaryTermIds?: string[];
  versionOverlays?: BfVersionOverlay[];
}

export interface BfGlossaryTerm {
  id: string;
  en: string;
  ar: string;
  explanation: string;
  relatedTerms?: string[];
  relatedPageIds?: string[];
}

/**
 * One entry in the ordered official page registry. Deliberately smaller
 * than BfPage — the registry is the map of "what pages exist and in what
 * order," independent of whether full field content has been authored yet.
 */
export interface BfRegistryEntry {
  id: string;
  officialId: string;
  officialTitle: string;
  titleAr: string;
  officialOrder: number;
  connectionState: BfConnectionState;
  scope: BfScope;
  conditionNote?: string;
  safetyLevel: BfSafetyLevel;
  contentStatus: BfContentStatus;
  /** Present only once contentStatus is 'architecture-preview' or 'reviewed'. */
  page?: BfPage;
}

export interface BfVersionContext {
  firmwareVersion: string;
  appVersion: string;
  releaseLine: string;
  stability: 'stable' | 'rc' | 'development';
  reviewedAt: string;
}

/** Maps a legacy (pre-Phase-1) local section ID to its new registry ID. */
export interface BfCompatibilityMapping {
  oldId: string;
  newId: string;
  /** Why the mapping exists — direct rename, split, or deliberate overview redirect. */
  kind: 'direct' | 'split' | 'overview';
  note: string;
}
