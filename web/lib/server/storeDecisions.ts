import 'server-only';
import { adminDb, isAdminConfigured } from './firebaseAdmin';

/** An answer already given, so the panel stops asking. */
export interface RecordedDecision {
  decisionId: string;
  optionId: string;
  optionLabelAr: string;
  action: string;
  decidedByName: string | null;
  decidedAt: string;
}

export async function recordedDecisions(): Promise<Record<string, RecordedDecision>> {
  if (!isAdminConfigured()) return {};
  try {
    const snap = await adminDb().collection('storeDecisions').get();
    const out: Record<string, RecordedDecision> = {};
    for (const d of snap.docs) out[d.id] = d.data() as RecordedDecision;
    return out;
  } catch {
    return {};
  }
}
