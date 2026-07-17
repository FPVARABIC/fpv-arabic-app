# Pre-Launch Checklist — fpv-arabic-app

Items deliberately deferred during feature work because they are not
release blockers at the current stage (single internal tester, tiny data
volume), but must be addressed before the conditions that make them real
risks actually occur. Each item states its own trigger condition — do not
treat this as a generic "nice to have" backlog.

---

## Community feed pagination-mutation E2E test

**Deferred from:** Community feed ranking Phase 2 (2026-07-17). See
`docs/KNOWN_ISSUES.md` — "Community feed pagination can skip a post whose
feedScore changes mid-session" — for the full root-cause analysis.

**Trigger condition:** Before inviting multiple real users, OR when the
"all" feed approaches more than 30 active posts (whichever comes first —
30 is `CANDIDATE_PAGE_SIZE`, the point at which a single-page session stops
being guaranteed to see the entire feed in one fetch).

**What the test must prove:** Simulate a feed session spanning at least
two page fetches (`refresh()` then `loadMore()`) where a post's `feedScore`
is mutated (via a direct Admin SDK write, or by driving
`recomputeFeedScoresBatch`) between the two fetches, then assert:

1. No post ID appears twice across the concatenated pages of the session
   (this half is already mitigated by `seenIdsRef` — the test should
   confirm the mitigation holds, not just assume it).
2. Document explicitly whether the "skip" case (a post that becomes newly
   high-scoring after the cursor has passed it) is reproduced, and if so,
   whether it's acceptable to ship with a documented limitation or whether
   it now needs a real fix (live re-ranking within a session, or a
   different cursor strategy — both real design decisions, not a small
   patch).

**Status:** Not started. Intentionally not built during Phase 2 per
explicit product decision — not a blocker while there is one tester and
~2 posts and no realistic multi-page session exists to trigger it.

---
