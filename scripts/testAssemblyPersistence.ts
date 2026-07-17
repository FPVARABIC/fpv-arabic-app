/**
 * Pure unit tests for Assembly build persistence (Phase 2) —
 * src/components/Assembly/utils/assemblyPersistence.ts's save/load/validate
 * logic, exercised for real rather than merely asserted against source
 * text.
 *
 * Node has no real `localStorage`, and the module under test reads it at
 * CALL time (inside each exported function), not at import time — so a
 * minimal in-memory polyfill is installed on `globalThis` before any of
 * those functions are invoked below. This lets every validation/rejection
 * path (corrupt JSON, unknown drone type, stale part id, etc.) run against
 * the real code, not a simulation of it.
 *
 * Run with: npx tsx scripts/testAssemblyPersistence.ts
 */
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null { return this.store.has(key) ? this.store.get(key)! : null; }
  setItem(key: string, value: string): void { this.store.set(key, value); }
  removeItem(key: string): void { this.store.delete(key); }
}
const memoryStorage = new MemoryStorage();
(globalThis as unknown as { localStorage: MemoryStorage }).localStorage = memoryStorage;

const {
  saveAssemblyProject, loadAndValidateAssemblyProject, clearAssemblyProject, ASSEMBLY_STORAGE_KEY,
} = await import('../src/components/Assembly/utils/assemblyPersistence');
const { gps } = await import('../src/data/assembly/parts/gps');
const { frames } = await import('../src/data/assembly/parts/frames');
const { batteries } = await import('../src/data/assembly/parts/batteries');

let passCount = 0;
let failCount = 0;
function record(label: string, ok: boolean, detail?: string) {
  if (ok) { console.log(`  PASS  ${label}`); passCount++; }
  else { console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`); failCount++; }
}

function rawSet(value: string) {
  memoryStorage.setItem(ASSEMBLY_STORAGE_KEY, value);
}

console.log('\n=== 1. Save then load round-trips a real, valid build (including a selected GPS part) ===');
{
  const gpsPart = gps[0];
  const framePart = frames.find(f => f.id === 'frame-aos5-evo-mid')!;
  saveAssemblyProject({
    droneTypeId: 'freestyle',
    stageIndex: 9, // stage-10, GPS
    sizeInch: 5,
    batteryVoltage: 6,
    parts: { frames: framePart, gps: gpsPart },
  });
  const restored = loadAndValidateAssemblyProject();
  record('R1 a valid save is restored (not null)', restored !== null);
  record('R2 droneTypeId round-trips exactly', restored?.droneTypeId === 'freestyle');
  record('R3 stageIndex round-trips exactly', restored?.stageIndex === 9);
  record('R4 sizeInch round-trips exactly', restored?.sizeInch === 5);
  record('R5 batteryVoltage round-trips exactly', restored?.batteryVoltage === 6);
  record('R6 the selected GPS part is restored as the real, identical part object (by id)', restored?.parts.gps?.id === gpsPart.id);
  record('R7 the selected frame part is restored correctly alongside GPS', restored?.parts.frames?.id === framePart.id);
}

console.log('\n=== 2. clearAssemblyProject genuinely removes the saved project ===');
{
  clearAssemblyProject();
  record('C1 nothing is restored after an explicit clear', loadAndValidateAssemblyProject() === null);
  record('C2 the raw storage key itself is gone, not merely empty', memoryStorage.getItem(ASSEMBLY_STORAGE_KEY) === null);
}

console.log('\n=== 3. Fails safe on corrupted/malformed/stale saved data — never crashes, always returns null ===');
{
  rawSet('{this is not valid JSON');
  record('M1 malformed JSON -> null, no throw', loadAndValidateAssemblyProject() === null);

  rawSet('null');
  record('M2 a bare JSON null -> null (not a plain object)', loadAndValidateAssemblyProject() === null);

  rawSet('[1,2,3]');
  record('M3 a JSON array (not an object) -> null', loadAndValidateAssemblyProject() === null);

  rawSet(JSON.stringify({ version: 999, droneTypeId: 'freestyle', stageIndex: 1, partIds: {} }));
  record('M4 an unknown/future schema version -> null (never guessed at)', loadAndValidateAssemblyProject() === null);

  rawSet(JSON.stringify({ version: 1, droneTypeId: 'not-a-real-drone-type', stageIndex: 1, partIds: {} }));
  record('M5 an unknown droneTypeId -> null', loadAndValidateAssemblyProject() === null);

  rawSet(JSON.stringify({ version: 1, droneTypeId: 'freestyle', stageIndex: -1, partIds: {} }));
  record('M6 a negative stageIndex -> null', loadAndValidateAssemblyProject() === null);

  rawSet(JSON.stringify({ version: 1, droneTypeId: 'freestyle', stageIndex: 999, partIds: {} }));
  record('M7 an out-of-range (too large) stageIndex -> null', loadAndValidateAssemblyProject() === null);

  rawSet(JSON.stringify({ version: 1, droneTypeId: 'freestyle', stageIndex: 1.5, partIds: {} }));
  record('M8 a non-integer stageIndex -> null', loadAndValidateAssemblyProject() === null);

  rawSet(JSON.stringify({ version: 1, droneTypeId: 'freestyle', stageIndex: 1, sizeInch: 'five', partIds: {} }));
  record('M9 a wrong-typed sizeInch (string instead of number) -> null', loadAndValidateAssemblyProject() === null);

  rawSet(JSON.stringify({ version: 1, droneTypeId: 'freestyle', stageIndex: 1, partIds: { batteries: 'battery-that-does-not-exist' } }));
  record('M10 a stale/unknown part id -> null (whole snapshot rejected, not partially trusted)', loadAndValidateAssemblyProject() === null);

  rawSet(JSON.stringify({ version: 1, droneTypeId: 'freestyle', stageIndex: 1, partIds: { totallyMadeUpCategory: 'whatever' } }));
  record('M11 an unknown part category -> null', loadAndValidateAssemblyProject() === null);

  rawSet(JSON.stringify({ version: 1, droneTypeId: 'freestyle', stageIndex: 1, partIds: { batteries: 12345 } }));
  record('M12 a non-string part id value -> null', loadAndValidateAssemblyProject() === null);

  memoryStorage.removeItem(ASSEMBLY_STORAGE_KEY);
  record('M13 no saved key at all -> null (fresh user, not an error)', loadAndValidateAssemblyProject() === null);
}

console.log('\n=== 4. A subsequent valid save still works correctly after prior corrupted/rejected reads ===');
{
  const batteryPart = batteries[0];
  saveAssemblyProject({ droneTypeId: 'long-range', stageIndex: 4, batteryVoltage: 6, parts: { batteries: batteryPart } });
  const restored = loadAndValidateAssemblyProject();
  record('F1 a fresh valid save after prior bad data is restored correctly', restored?.droneTypeId === 'long-range' && restored?.parts.batteries?.id === batteryPart.id);
}

console.log('\n=== 5. Stage 2 size <-> frame validation on restore (Phase 3) ===');
{
  const matchingFrame = frames.find(f => f.id === 'frame-aos5-evo-mid')!; // real sizeInch 5.1
  const mismatchedFrame = frames.find(f => f.id === 'frame-geprc-moz7-v2-premium')!; // real sizeInch 7

  saveAssemblyProject({ droneTypeId: 'freestyle', stageIndex: 4, sizeInch: 5, parts: { frames: matchingFrame } });
  const restoredMatching = loadAndValidateAssemblyProject();
  record('S1 a restored frame that matches the restored sizeInch is kept', restoredMatching?.parts.frames?.id === matchingFrame.id);

  saveAssemblyProject({ droneTypeId: 'freestyle', stageIndex: 4, sizeInch: 5, parts: { frames: mismatchedFrame, gps: gps[0] } });
  const restoredMismatch = loadAndValidateAssemblyProject();
  record('S2 a restored frame that does NOT match the restored sizeInch is invalidated (not null, just that one field dropped)', restoredMismatch !== null);
  record('S3 the mismatched frame itself is genuinely gone from the restored parts', restoredMismatch?.parts.frames === undefined);
  record('S4 everything else in the same snapshot survives the frame-only invalidation (droneTypeId, stageIndex, sizeInch, other parts)',
    restoredMismatch?.droneTypeId === 'freestyle' && restoredMismatch?.stageIndex === 4 && restoredMismatch?.sizeInch === 5 && restoredMismatch?.parts.gps?.id === gps[0].id);

  // No sizeInch at all yet (e.g. saved before Stage 2 was reached) — a
  // frame can't be validated against a size that was never chosen, so it
  // must be trusted as-is rather than treated as a mismatch.
  saveAssemblyProject({ droneTypeId: 'freestyle', stageIndex: 4, parts: { frames: mismatchedFrame } });
  const restoredNoSize = loadAndValidateAssemblyProject();
  record('S5 a restored frame is NOT invalidated when no sizeInch was ever saved (nothing to validate it against)', restoredNoSize?.parts.frames?.id === mismatchedFrame.id);
}

console.log('\n=== 6. Old/stale 3.5-inch persisted state (pre-launch correction) — handled safely, never crashes ===');
{
  // A save shaped exactly like what an old client (before 3.5" was removed
  // from droneSizeOptions.ts) could have written: sizeInch 3.5, no frame
  // selected yet (3.5" never had a matching frame to select in the first
  // place, so this is the realistic old shape).
  rawSet(JSON.stringify({ version: 1, droneTypeId: 'freestyle', stageIndex: 4, sizeInch: 3.5, partIds: {} }));
  const restoredNoFrame = loadAndValidateAssemblyProject();
  record('O1 an old 3.5" save with no frame selected restores without crashing (not null)', restoredNoFrame !== null);
  record('O2 the stale 3.5" size itself is not restored (no longer a live option)', restoredNoFrame?.sizeInch === undefined);
  record('O3 everything else in that same snapshot still restores correctly', restoredNoFrame?.droneTypeId === 'freestyle' && restoredNoFrame?.stageIndex === 4);

  // A save that also carries a real frame id alongside the stale 3.5" size
  // (a hand-edited/corrupted or hypothetical older-client shape) — the
  // frame must still be invalidated by the existing size/frame check, not
  // resurrected just because the size field itself got dropped.
  const aFrame = frames.find(f => f.id === 'frame-aos5-evo-mid')!;
  rawSet(JSON.stringify({ version: 1, droneTypeId: 'freestyle', stageIndex: 4, sizeInch: 3.5, partIds: { frames: aFrame.id } }));
  const restoredWithFrame = loadAndValidateAssemblyProject();
  record('O4 an old 3.5" save paired with a real frame id still restores without crashing', restoredWithFrame !== null);
  record('O5 the paired frame is invalidated (it never matched 3.5", so it must not survive)', restoredWithFrame?.parts.frames === undefined);
  record('O6 the stale 3.5" size is dropped here too', restoredWithFrame?.sizeInch === undefined);
}

console.log('\n=== 7. Restored sizeInch is validated per drone type (pre-launch correction) — not just against the flat global size list ===');
{
  const longRangeFrame = frames.find(f => f.id === 'frame-geprc-moz7-v2-premium')!; // long-range, real sizeInch 7
  const freestyleFrame = frames.find(f => f.id === 'frame-aos5-evo-mid')!; // freestyle, real sizeInch 5.1
  const cinematicFrame = frames.find(f => f.id === 'frame-aos5-v51-premium')!; // cinematic, real sizeInch 5
  const racingFrame = frames.find(f => f.id === 'frame-aos-5r-v5-race-mid')!; // racing, real sizeInch 5
  const aBattery = batteries[0];

  // long-range + 7 (its one genuinely reachable size): restores normally,
  // frame and unrelated fields all intact.
  saveAssemblyProject({ droneTypeId: 'long-range', stageIndex: 4, sizeInch: 7, batteryVoltage: 6, parts: { frames: longRangeFrame, batteries: aBattery } });
  const lr7 = loadAndValidateAssemblyProject();
  record('P1 long-range + 7" (reachable) restores with sizeInch intact', lr7?.sizeInch === 7);
  record('P2 long-range + 7" keeps its matching frame', lr7?.parts.frames?.id === longRangeFrame.id);
  record('P3 long-range + 7" keeps unrelated fields (droneTypeId, stageIndex, batteryVoltage, battery part)', lr7?.droneTypeId === 'long-range' && lr7?.stageIndex === 4 && lr7?.batteryVoltage === 6 && lr7?.parts.batteries?.id === aBattery.id);

  // long-range + 5 (NOT reachable — long-range's only real frame is 7"):
  // corrected safely — size dropped, and since the persisted frame (7")
  // can't match a recorded 5" anyway, it's also invalidated by the existing
  // frame-vs-size check. Unrelated fields survive.
  saveAssemblyProject({ droneTypeId: 'long-range', stageIndex: 4, sizeInch: 5, batteryVoltage: 6, parts: { frames: longRangeFrame, batteries: aBattery } });
  const lr5 = loadAndValidateAssemblyProject();
  record('P4 long-range + 5" (unreachable for this type) restores without crashing', lr5 !== null);
  record('P5 long-range + 5" drops the invalid size (sizeInch undefined, not trusted as 5)', lr5?.sizeInch === undefined);
  record('P6 long-range + 5" clears the incompatible saved frame (7" frame never matched a recorded 5")', lr5?.parts.frames === undefined);
  record('P7 long-range + 5" still keeps unrelated fields intact (droneTypeId, stageIndex, batteryVoltage, battery part)', lr5?.droneTypeId === 'long-range' && lr5?.stageIndex === 4 && lr5?.batteryVoltage === 6 && lr5?.parts.batteries?.id === aBattery.id);

  // freestyle / cinematic / racing + 5 (their one genuinely reachable size)
  // restore normally.
  for (const [droneTypeId, frame] of [['freestyle', freestyleFrame], ['cinematic', cinematicFrame], ['racing', racingFrame]] as const) {
    saveAssemblyProject({ droneTypeId, stageIndex: 4, sizeInch: 5, parts: { frames: frame } });
    const restored = loadAndValidateAssemblyProject();
    record(`P8 ${droneTypeId} + 5" (reachable) restores with sizeInch and frame intact`, restored?.sizeInch === 5 && restored?.parts.frames?.id === frame.id);
  }

  // freestyle / cinematic / racing + 7 (NOT reachable — none of their real
  // frames are anywhere near 7") are corrected safely: size dropped, and
  // the persisted ~5" frame (which can't match a recorded 7") is cleared
  // by the existing frame-vs-size check too.
  for (const [droneTypeId, frame] of [['freestyle', freestyleFrame], ['cinematic', cinematicFrame], ['racing', racingFrame]] as const) {
    saveAssemblyProject({ droneTypeId, stageIndex: 4, sizeInch: 7, parts: { frames: frame } });
    const restored = loadAndValidateAssemblyProject();
    record(`P9 ${droneTypeId} + 7" (unreachable for this type) restores without crashing`, restored !== null);
    record(`P10 ${droneTypeId} + 7" drops the invalid size`, restored?.sizeInch === undefined);
    record(`P11 ${droneTypeId} + 7" clears the incompatible saved frame`, restored?.parts.frames === undefined);
  }
}

console.log(`\n=== Results: ${passCount} passed, ${failCount} failed (${passCount + failCount} total) ===\n`);
process.exit(failCount > 0 ? 1 : 0);
