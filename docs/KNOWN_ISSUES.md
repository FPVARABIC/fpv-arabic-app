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

## Video system / video unit cross-check — resolved by the Stage 3 merge, not by wiring a validator

**Found during:** Assembly Part B evidence review (2026-07-07), while
reconciling A2's expert-rules research with the compatibility engine.
**Corrected:** Phase 4 GPS/cleanup pass (2026-07-17) — the entry below
originally described `validateVideoSystemVideoUnit()` as an existing,
correct, but unwired validator with a 3-step wiring plan. That function no
longer exists at all, so that plan no longer applies; this entry now
describes what actually happened instead.

**Original concern:** A user could select an "Analog" video system at the
old, separate stage-3 and then a DJI/Walksnail/HDZero-protocol video unit at
the old stage-10 (or any other cross-protocol combination) with zero
warning anywhere in the app.

**What actually resolved it:** the two-stage split (a conceptual
`videoSystems` pick, then a separate concrete `videoUnits` pick) was merged
into a single stage-3 that selects a concrete video unit directly — see
`src/data/assembly/buildStages.ts`'s own comment on stage-3. There is no
longer a separate `videoSystems` selection to cross-check against a
`videoUnits` selection, so `validateVideoSystemVideoUnit()` was removed
entirely (not merely left unwired) — confirmed via
`src/data/assembly/compatibility/validators.ts`'s own trailing comment.
The original goggles-must-match-system guidance was preserved, just moved:
it now lives directly in stage-3's `descriptionAr` product copy ("يجب أن
تكون من نفس نظام نظارتك... فالأنظمة غير متوافقة مع بعضها"), read by the
user at the moment of selection instead of being cross-checked after the
fact in the final report.

**Status:** Resolved by design, not by implementation. The other 4
validators (`validateFrameMotor`, `validateMotorBattery`,
`validateEscBattery`, `validateFramePropeller`) remain genuinely wired in
via `buildCompatibilityReport()`/`FinalReportScreen.tsx`. No wiring work
remains for video system/unit — there is nothing left to wire.

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

---

## Comment creation temporarily reverted to a direct client write (Blaze billing bridge)

**Found during:** Temporary revert task (2026-07-18), prompted by the Firebase Blaze plan
billing issue blocking Cloud Functions deployment/invocation.

**What changed:** `comments/{commentId}` create in `firestore.rules`, and
`useCommentComposer.ts`, were reverted from the Phase 6 Cloud-Function-only design
(`createComment` in `functions/src/index.ts`) back to a direct, Rules-validated client
write — the pre-Phase-6 shape, but with a shortened 5s (not 15s) global-per-user
cooldown on `users/{uid}.lastCommentAt`, so the original disclosed bug (blocking a
user's next DISTINCT comment on any post for a full 15s) is not reintroduced.

**Known gap while reverted:** duplicate-content collapse (the fingerprint-based
retry-collapse `createComment` provided) has no equivalent here — a flaky network
retry can now create a genuine duplicate comment instead of being silently collapsed.
Accepted as a temporary trade-off.

**Status:** TEMPORARY. `createComment`/`toggleCommentLike`/`togglePostLike`'s
Function code is untouched and remains the intended permanent design. Re-migrate by:
restoring `allow create: if false;` in `firestore.rules`, removing the added
`lastCommentAt` branch from `users/{uid}`'s update rule, reverting
`useCommentComposer.ts` to call the `createComment` callable (reference
implementation: commit `b60405d`), and deleting `COMMENT_RATE_LIMIT_SECONDS`/
`commentRateLimitMessage` from `rateLimit.ts` — once Firebase Blaze billing is
restored and Functions are deployable again.

---

## Post/comment likes temporarily reverted to direct client writes (Blaze billing bridge)

**Found during:** Temporary revert task (2026-07-18), same Firebase Blaze plan billing
issue that prompted the comment-creation revert.

**What changed:** `posts/{postId}/likes/{likerUid}` and `comments/{commentId}/likes/{likerUid}`
in `firestore.rules`, plus `usePostLike.ts`/`useCommentLike.ts`, were reverted from the
Cloud-Function-only design (`togglePostLike`/`toggleCommentLike` in
`functions/src/index.ts`) to direct, Rules-validated client writes — a paired batch
(like-doc create/delete + `likesCount` ±1 on the parent), the same accepted-risk shape
already used for `commentsCount` (shape-validated, not cryptographically bound to a real
paired document write, since Rules cannot see across documents/batches). Unlike
comments, no prior direct-write version of likes ever existed (confirmed via
`git log -p`) — this is a new design, not a restoration.

**Known gap while reverted:** a genuine double-toggle race (not the common single-click
case, which client-side `toggling` state already guards) now surfaces as a denied write
and a visible error, instead of the Cloud Function's transaction giving a silent
idempotent no-op. Rules deny it outright (an already-existing like doc can never be
"created" again, and batch atomicity denies the paired count change alongside it), so
`likesCount` can never be double-counted — but the UX degrades from silent-success to
an error message in that rare race.

**Status:** TEMPORARY. `togglePostLike`/`toggleCommentLike` Function code is untouched
and remains the intended permanent design. Re-migrate by: restoring
`allow create, update, delete: if false;` on both `likes/{likerUid}` blocks, removing the
added `likesCount` branches from the `posts/{postId}` and `comments/{commentId}` update
rules, and reverting `usePostLike.ts`/`useCommentLike.ts` to call their respective
callables (reference implementations: commits `82b79ce` and `b60405d`) — once Firebase
Blaze billing is restored and Functions are deployable again.

---

## Composer image upload temporarily disabled (Blaze billing blocker)

**Found during:** Bug-fix task (2026-07-21), same Firebase Blaze plan billing issue as
the comment-creation and likes bridges above — Storage's billing-gated features block
the upload pipeline from being reliably usable right now.

**What changed:** `PostComposer.tsx`'s "صورة" (image) button now renders the same
disabled, badged "قريباً" treatment already used for the reserved video-upload slot,
gated behind a single named constant, `IMAGE_UPLOAD_TEMPORARILY_DISABLED` (top of
`PostComposer.tsx`). No upload code was removed: `MediaUploader.tsx`, `handleImagePick`,
the hidden file input, and `useComposer.ts`'s `imageFile`/`uploadMedia` plumbing are all
untouched and still fully wired — the constant just prevents the button from ever being
reached. Already-published posts with images are unaffected (`PostCard.tsx`/
`PostDetail.tsx`'s `post.mediaType === 'image' && post.thumbnailURL` rendering path is
separate from the composer and was not touched).

**Status:** TEMPORARY. Flip `IMAGE_UPLOAD_TEMPORARILY_DISABLED` to `false` in
`PostComposer.tsx` to restore the real upload button — once Firebase Blaze billing is
restored, with no other code changes needed.
