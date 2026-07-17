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

---

## Community feed pagination can skip a post whose feedScore changes mid-session

**Found during:** Community feed ranking Phase 2 pre-approval review (2026-07-17).

**Symptom:** `useFeed.ts`'s ranked ("all" category) feed paginates via
`startAfter(cursorSnapshot)`, where `cursorSnapshot` is the raw
`QueryDocumentSnapshot` from the tail of the previously fetched candidate
window. If a post's `feedScore` changes (a scheduled `recomputeFeedScores`
pass, or a like/comment landing) WHILE a user has an open feed session
spanning more than one page fetch, a post that becomes newly high-scoring
after the cursor has already passed its old position will not surface in
that session — it's skipped, not duplicated, until the user does a full
pull-to-refresh (which re-fetches from the top with no cursor).

**Root cause (verified by tracing the actual cursor mechanics, not
guessed):** Firestore's `startAfter(documentSnapshot)` uses the field
values frozen inside that snapshot at fetch time, never a live re-read.
`loadRankedPage` sets `cursorRef.current = snap.docs[snap.docs.length - 1]`
once per fetch and never revisits it. A separate, related risk — a post
held in `carryOverRef` (deferred by the author/category diversity cap)
being independently re-matched by a LATER fresh query if its score changed
enough to fall into that query's range, which would show it TWICE — is
**mitigated** by two layers, not one: an independent review (2026-07-17)
found that the `seenIdsRef` cross-page dedup-by-id safeguard alone did NOT
close this specific case, because a stale `carryOverRef` copy and a fresh
copy of the SAME post can both appear in the SAME call's merged candidate
stream before either has ever been added to `seenIdsRef`. The fix adds a
merge-level dedup in `loadRankedPage`: before diversity assembly, any
carry-over post whose id also appears in the freshly fetched batch is
dropped in favor of the fresh copy (which reflects live field values, not
the stale snapshot). `seenIdsRef` then continues to catch the separate
cross-page case (a post already displayed on an earlier page reappearing
on a later one) exactly as before. Together the two layers close the
duplicate-rendering risk fully; the skip-until-refresh risk below is
unrelated to either layer and remains open.

**Status:** Accepted for the current stage — a single internal tester, ~2
total posts, no realistic multi-page session exists yet to trigger this in
practice. The duplicate-rendering risk is mitigated (merge-level dedup +
`seenIdsRef`, see above); the skip-until-refresh risk is not fixed (it's a
genuinely separate problem — closing it would require either
live-re-ranking within an open session or a different cursor strategy,
both a real design decision, not a small patch). A dedicated E2E test
simulating a mid-session `feedScore` mutation across two page fetches is
deferred to `docs/PRE_LAUNCH_CHECKLIST.md` rather than built now.
