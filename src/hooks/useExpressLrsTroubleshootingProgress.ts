import { useLocalStorage } from './useLocalStorage';
import { STORAGE_KEYS } from '../utils/storageKeys';
import type { CheckOutcome } from '../data/expresslrs/types';
import { troubleshootingIssues } from '../data/expresslrs/troubleshootingIssues';

interface TroubleshootingProgressState {
  currentIssueId: string | null;
  checkOutcomes: Record<string, CheckOutcome>;
  lastViewedAt?: string;
}

const initialState: TroubleshootingProgressState = {
  currentIssueId: null,
  checkOutcomes: {},
};

const VALID_ISSUE_IDS = new Set(troubleshootingIssues.map(i => i.id));
const VALID_CHECK_IDS = new Set(troubleshootingIssues.flatMap(i => i.checks.map(c => c.id)));

const isCheckOutcome = (v: unknown): v is CheckOutcome => v === 'not-checked' || v === 'passed' || v === 'failed';

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function normalizeCheckOutcomes(raw: unknown): Record<string, CheckOutcome> {
  const obj = asRecord(raw);
  const result: Record<string, CheckOutcome> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (VALID_CHECK_IDS.has(key) && isCheckOutcome(value)) result[key] = value;
  }
  return result;
}

function normalizeTimestamp(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  return Number.isNaN(Date.parse(raw)) ? undefined : raw;
}

/**
 * Same defensive-normalization approach used for the setup guide's progress
 * hook: raw storage is treated as unknown and every field is re-validated
 * before use, so a missing key, a legacy/partial object, wrong primitive
 * types, or ids that no longer exist in troubleshootingIssues can never
 * crash the view. Entirely isolated from EXPRESSLRS_SETUP_PROGRESS — a
 * dedicated storage key, a dedicated hook, no shared state.
 */
function normalizeProgressState(raw: unknown): TroubleshootingProgressState {
  const obj = asRecord(raw);
  return {
    currentIssueId: typeof obj.currentIssueId === 'string' && VALID_ISSUE_IDS.has(obj.currentIssueId)
      ? obj.currentIssueId
      : null,
    checkOutcomes: normalizeCheckOutcomes(obj.checkOutcomes),
    lastViewedAt: normalizeTimestamp(obj.lastViewedAt),
  };
}

export function useExpressLrsTroubleshootingProgress() {
  const [rawState, setRawState] = useLocalStorage<unknown>(STORAGE_KEYS.EXPRESSLRS_TROUBLESHOOTING_PROGRESS, initialState);
  const state = normalizeProgressState(rawState);

  const setState = (updater: (prev: TroubleshootingProgressState) => TroubleshootingProgressState) =>
    setRawState((prev: unknown) => updater(normalizeProgressState(prev)));

  const goToIssue = (issueId: string) => setState(prev => ({ ...prev, currentIssueId: issueId, lastViewedAt: new Date().toISOString() }));

  const setCheckOutcome = (checkId: string, outcome: CheckOutcome) => setState(prev => ({
    ...prev,
    checkOutcomes: { ...prev.checkOutcomes, [checkId]: outcome },
  }));

  const getCheckOutcome = (checkId: string): CheckOutcome => state.checkOutcomes[checkId] ?? 'not-checked';

  const resetIssue = (checkIds: string[]) => setState(prev => {
    const nextOutcomes = { ...prev.checkOutcomes };
    for (const id of checkIds) delete nextOutcomes[id];
    return { ...prev, checkOutcomes: nextOutcomes };
  });

  const resetAll = () => setRawState(initialState);

  return {
    currentIssueId: state.currentIssueId,
    lastViewedAt: state.lastViewedAt,
    goToIssue,
    setCheckOutcome,
    getCheckOutcome,
    resetIssue,
    resetAll,
  };
}

export type UseExpressLrsTroubleshootingProgressReturn = ReturnType<typeof useExpressLrsTroubleshootingProgress>;
