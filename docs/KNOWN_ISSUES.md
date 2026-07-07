# Known Issues — fpv-arabic-app

Pre-existing or cross-cutting issues discovered during feature work, tracked
here so they aren't lost or rediscovered from scratch later. Not tied to any
one feature branch or phase.

---

## ProfileSheet GuestAvatar bleeds behind BottomNavigation

**Found during:** Community Phase 1 evidence review (2026-07-04).

**Symptom:** When `ProfileSheet` is closed, its `GuestAvatar` illustration can
visually bleed through `BottomNavigation`'s translucent, blurred background,
appearing as a faint circular shape behind the rightmost nav tab.

**Root cause (verified via DOM/computed-style inspection, not guessed):**
`ProfileSheet.tsx` positions itself with `position: fixed; bottom: 80px` and
hides via `transform: translateY(100%)` — `100%` of its own height, not the
viewport. On builds where the sheet's rendered height is large enough, the
"closed" top edge lands only a few pixels above `BottomNavigation`'s `<nav>`
top edge, and since that nav has a ~6%-opacity background with a blur filter
rather than a solid one, the sheet's top content (including `GuestAvatar`)
shows through softly instead of being fully hidden.

**Confirmed NOT Community-specific:** identical `GuestAvatar` bounding-box
coordinates appear on both `/community-preview` and the real `/home` route.
`CommunityPreviewView` mounts `ProfileSheet` with the exact same `open`/
`onClose` pattern `HomeView.tsx` already uses — this is pre-existing,
`ProfileSheet`-rooted, not introduced by any Community code. It's simply
easier to notice on `/community-preview` because no nav tab is active there,
so there's no competing bright cyan active-tab glow overlapping the same
spot to mask it (which is what happens on `/home`).

**Status:** Deferred. Not fixed as part of Community work. Suspected fix
scope (not yet approved or attempted): `ProfileSheet.tsx`'s closed-position
transform math — out of scope for whoever picks this up until scoped and
approved on its own, separate from any feature branch.

---

## validateVideoSystemVideoUnit exists but is not wired to any UI

**Found during:** Assembly Part B evidence review (2026-07-07), while
reconciling A2's expert-rules research with the compatibility engine.

**Symptom:** A user can select an "Analog" video system at stage 3 and then a
DJI/Walksnail/HDZero-protocol video unit at stage 10 (or any other
cross-protocol combination) with zero warning anywhere in the app — the
final compatibility check (stage 17) never flags this mismatch.

**Root cause (verified by tracing the actual call graph, not guessed):**
`src/data/assembly/compatibility/validators.ts` has a correct
`validateVideoSystemVideoUnit()` function (compares `protocolOrSystem` on the
selected `VideoSystem`/`VideoUnit` for equality), but it has zero call sites.
`src/components/Assembly/utils/buildReport.ts`'s `ReportableSelections`
interface only has `frame?/motor?/esc?/battery?/propeller?` — no
`videoSystem`/`videoUnit` fields — and `buildCompatibilityReport()` never
calls the new validator. `FinalReportScreen.tsx` (the real, live stage-17
screen) only passes `frame/motor/esc/battery/propeller` into the report
builder. The other 4 validators (`validateFrameMotor`, `validateMotorBattery`,
`validateEscBattery`, `validateFramePropeller`) are genuinely wired in and
visible to users today via this same path — only the video-system/video-unit
one is missing from it.

**Status:** Deferred. The validator itself is correct and already committed;
wiring it in requires three specific changes, none done yet: (1) add
`videoSystem?`/`videoUnit?` to `ReportableSelections`, (2) call
`validateVideoSystemVideoUnit` inside `buildCompatibilityReport()`, (3) pass
`selections.videoSystems`/`selections.videoUnits` from `FinalReportScreen.tsx`.
Treated as a genuine new scope decision deserving its own review round, not
rushed in at the end of an already long session.
