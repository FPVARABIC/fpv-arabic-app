import type { BfCompatibilityMapping } from './types';

/**
 * Maps every pre-Phase-1 local Betaflight section ID (from
 * src/data/betaflightData.ts) to its closest new registry ID. All ten old
 * IDs must resolve to a real, current registry entry — none may be
 * silently dropped, per the approved compatibility policy.
 */
export const bfCompatibilityMap: BfCompatibilityMapping[] = [
  { oldId: 'interface', newId: 'setup', kind: 'overview', note: 'كان "واجهة Betaflight" جولة عامة في التبويبات تتضمن محتوى Setup؛ أقرب صفحة رسمية مقابلة هي Setup.' },
  { oldId: 'firmware', newId: 'firmware-flasher', kind: 'direct', note: 'إعادة تسمية فقط — نفس الصفحة الرسمية (Firmware Flasher).' },
  { oldId: 'ports', newId: 'ports', kind: 'direct', note: 'معرّف مطابق تمامًا — نفس الصفحة الرسمية (Ports).' },
  { oldId: 'receiver', newId: 'receiver', kind: 'direct', note: 'معرّف مطابق تمامًا — نفس الصفحة الرسمية (Receiver).' },
  { oldId: 'modes', newId: 'modes', kind: 'direct', note: 'معرّف مطابق تمامًا — الصفحة الرسمية المقابلة داخليًا اسمها auxiliary وعنوانها الرسمي Modes.' },
  { oldId: 'motors', newId: 'motors', kind: 'direct', note: 'معرّف مطابق تمامًا — نفس الصفحة الرسمية (Motors).' },
  { oldId: 'failsafe', newId: 'failsafe', kind: 'direct', note: 'معرّف مطابق تمامًا — نفس الصفحة الرسمية (Failsafe).' },
  { oldId: 'osd', newId: 'osd', kind: 'direct', note: 'معرّف مطابق تمامًا — نفس الصفحة الرسمية (OSD)؛ يُلاحظ أن Video Transmitter صفحة رسمية منفصلة (vtx) لم تكن ممثّلة سابقًا.' },
  { oldId: 'blackbox', newId: 'blackbox', kind: 'split', note: 'المفهوم القديم "Blackbox" يقابل رسميًا صفحة onboard_logging (العنوان الرسمي: Blackbox)؛ توجد صفحة رسمية منفصلة "Tethered Logging" (logging) لم تكن ممثّلة سابقًا.' },
  { oldId: 'cli', newId: 'cli', kind: 'direct', note: 'معرّف مطابق تمامًا — نفس الصفحة الرسمية (CLI).' },
];

export function resolveCompatibilityId(oldId: string): string | undefined {
  return bfCompatibilityMap.find(m => m.oldId === oldId)?.newId;
}
