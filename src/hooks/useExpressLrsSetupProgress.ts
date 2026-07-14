import { useLocalStorage } from './useLocalStorage';
import { STORAGE_KEYS } from '../utils/storageKeys';
import type {
  FlightControllerSoftware, FrequencyBand, OnboardingAnswers, ReceiverArchitecture, SetupIntent, TxModuleLocation,
} from '../data/expresslrs/types';
import { setupSteps } from '../data/expresslrs/setupSteps';

interface ExpressLrsSetupProgressState {
  onboarding: OnboardingAnswers;
  onboardingCompleted: boolean;
  currentStepId: string;
  completedStepIds: string[];
  completedChecklistItemIds: string[];
  lastReviewedAt?: string;
}

const defaultOnboarding: OnboardingAnswers = {
  receiverArchitecture: null,
  txModuleLocation: null,
  frequencyBand: null,
  setupIntent: null,
  fcSoftware: null,
};

const initialState: ExpressLrsSetupProgressState = {
  onboarding: defaultOnboarding,
  onboardingCompleted: false,
  currentStepId: setupSteps[0].id,
  completedStepIds: [],
  completedChecklistItemIds: [],
};

const VALID_STEP_IDS = new Set(setupSteps.map(s => s.id));
const VALID_CHECKLIST_IDS = new Set(setupSteps.flatMap(s => s.checklist.map(c => c.id)));

const isReceiverArchitecture = (v: unknown): v is ReceiverArchitecture => v === 'uart' || v === 'spi' || v === 'unknown';
const isTxModuleLocation = (v: unknown): v is TxModuleLocation => v === 'internal' || v === 'external' || v === 'unknown';
const isFrequencyBand = (v: unknown): v is FrequencyBand => v === '2.4' || v === '900' || v === 'unknown';
const isSetupIntent = (v: unknown): v is SetupIntent =>
  v === 'new' || v === 'bound-not-moving' || v === 'update-existing' || v === 'replace-receiver';
const isFcSoftware = (v: unknown): v is FlightControllerSoftware => v === 'betaflight' || v === 'other' || v === 'unknown';

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function normalizeOnboarding(raw: unknown): OnboardingAnswers {
  const obj = asRecord(raw);
  return {
    receiverArchitecture: isReceiverArchitecture(obj.receiverArchitecture) ? obj.receiverArchitecture : null,
    txModuleLocation: isTxModuleLocation(obj.txModuleLocation) ? obj.txModuleLocation : null,
    frequencyBand: isFrequencyBand(obj.frequencyBand) ? obj.frequencyBand : null,
    setupIntent: isSetupIntent(obj.setupIntent) ? obj.setupIntent : null,
    fcSoftware: isFcSoftware(obj.fcSoftware) ? obj.fcSoftware : null,
  };
}

function normalizeIdArray(raw: unknown, validIds: Set<string>): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === 'string' && validIds.has(id));
}

function normalizeTimestamp(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  return Number.isNaN(Date.parse(raw)) ? undefined : raw;
}

/**
 * Defends against every shape of untrustworthy persisted data: a missing
 * key entirely, a legacy/partial object from an older schema, wrong
 * primitive types, and ids that no longer exist in setupSteps (e.g. after
 * content edits). Invalid fields are discarded and replaced with their
 * default rather than allowed to propagate — useLocalStorage's `as T` cast
 * only guarantees the value is *some* parsed JSON, not that it matches this
 * shape, so every field is re-validated here before use.
 */
function normalizeProgressState(raw: unknown): ExpressLrsSetupProgressState {
  const obj = asRecord(raw);
  return {
    onboarding: normalizeOnboarding(obj.onboarding),
    onboardingCompleted: typeof obj.onboardingCompleted === 'boolean' ? obj.onboardingCompleted : initialState.onboardingCompleted,
    currentStepId: typeof obj.currentStepId === 'string' && VALID_STEP_IDS.has(obj.currentStepId)
      ? obj.currentStepId
      : initialState.currentStepId,
    completedStepIds: normalizeIdArray(obj.completedStepIds, VALID_STEP_IDS),
    completedChecklistItemIds: normalizeIdArray(obj.completedChecklistItemIds, VALID_CHECKLIST_IDS),
    lastReviewedAt: normalizeTimestamp(obj.lastReviewedAt),
  };
}

/**
 * Progress for the ExpressLRS setup guide is deliberately isolated from
 * useProgress()/ProgressContext — it is not a lesson, it does not count
 * toward the 16-lesson total or any lesson achievement.
 */
export function useExpressLrsSetupProgress() {
  const [rawState, setRawState] = useLocalStorage<unknown>(STORAGE_KEYS.EXPRESSLRS_SETUP_PROGRESS, initialState);
  const state = normalizeProgressState(rawState);

  // Every write re-normalizes `prev` first, so a corrupt/partial value that
  // somehow reached storage is never spread forward into a fresh update.
  const setState = (updater: (prev: ExpressLrsSetupProgressState) => ExpressLrsSetupProgressState) =>
    setRawState((prev: unknown) => updater(normalizeProgressState(prev)));

  const setOnboardingAnswer = <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => {
    setState(prev => ({ ...prev, onboarding: { ...prev.onboarding, [key]: value } }));
  };

  const completeOnboarding = () => setState(prev => ({ ...prev, onboardingCompleted: true }));
  const editOnboarding = () => setState(prev => ({ ...prev, onboardingCompleted: false }));

  const goToStep = (stepId: string) => setState(prev => ({ ...prev, currentStepId: stepId }));

  const toggleStepComplete = (stepId: string) => setState(prev => ({
    ...prev,
    completedStepIds: prev.completedStepIds.includes(stepId)
      ? prev.completedStepIds.filter(id => id !== stepId)
      : [...prev.completedStepIds, stepId],
    lastReviewedAt: new Date().toISOString(),
  }));

  const toggleChecklistItem = (itemId: string) => setState(prev => ({
    ...prev,
    completedChecklistItemIds: prev.completedChecklistItemIds.includes(itemId)
      ? prev.completedChecklistItemIds.filter(id => id !== itemId)
      : [...prev.completedChecklistItemIds, itemId],
  }));

  const isChecklistItemDone = (itemId: string) => state.completedChecklistItemIds.includes(itemId);
  const isStepDone = (stepId: string) => state.completedStepIds.includes(stepId);

  const resetProgress = () => setRawState(initialState);

  return {
    onboarding: state.onboarding,
    onboardingCompleted: state.onboardingCompleted,
    currentStepId: state.currentStepId,
    completedStepIds: state.completedStepIds,
    completedChecklistItemIds: state.completedChecklistItemIds,
    lastReviewedAt: state.lastReviewedAt,
    setOnboardingAnswer,
    completeOnboarding,
    editOnboarding,
    goToStep,
    toggleStepComplete,
    toggleChecklistItem,
    isChecklistItemDone,
    isStepDone,
    resetProgress,
  };
}

export type UseExpressLrsSetupProgressReturn = ReturnType<typeof useExpressLrsSetupProgress>;
