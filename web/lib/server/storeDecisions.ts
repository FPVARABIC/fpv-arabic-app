import 'server-only';
import { listStoreDocs, isServiceConfigured } from '../backend/supabase/adminData';

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
  if (!isServiceConfigured()) return {};
  try {
    const docs = await listStoreDocs('storeDecisions');
    const out: Record<string, RecordedDecision> = {};
    for (const [id, doc] of Object.entries(docs)) out[id] = doc as unknown as RecordedDecision;
    return out;
  } catch {
    return {};
  }
}
