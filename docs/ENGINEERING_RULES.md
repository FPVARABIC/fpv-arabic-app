# Permanent Engineering Process Rules — fpv-arabic-app

Adopted after the Bot V2 migration. Every rule below is tied to a specific incident that actually happened in this project — none are generic best-practice filler. This document governs all future work on `claude/wizardly-noether-xdxg2x` unless explicitly amended in writing.

---

## Rule 0A — Verify, never assume (facts)

**Rule:** If implementation depends on a checkable fact about current project state, which implementation is currently authoritative, or a prior decision/approval — and that fact has not been directly verified within this session — verify it first. Never proceed on memory of an earlier session, an agent's own prior claim, or general likelihood.

This is deliberately scoped to checkable, contextual facts (state, identity of the current implementation, prior approvals) — not every assumption inherent in writing code. Rules 1, 6, and 8 below are specific, mandatory instances of this umbrella principle, not separate concerns.

**Why:** recurring root cause across this project — wrong assumptions about which branch/server/implementation was current, and about whether a decision had actually been approved versus merely described as approved.

## Rule 0B — Confirm the objective, not just the facts

**Rule:** Before implementation begins, the task's intended end state must be stated explicitly and confirmed by the project owner in his own words — not inferred, not assumed from context. The plan required by Rule 4 must name, as its own field, what existing behavior is expected to remain **unchanged** — not only what will change. A plan that only describes the fix in isolation has not satisfied this rule.

This is a different failure mode from Rule 0A, and it needs a different kind of evidence. Rule 0A is settled with a command and raw output — a hash, a diff, a file's content. There is no command that proves an objective is correct; the only valid evidence here is the project owner's explicit confirmation that the stated target is what he actually wants. "I presented a plan and got no objection" does not satisfy this — the plan must affirmatively name the objective and its boundaries, or there is nothing concrete to agree or disagree with.

**Why:** this is the foundational failure of the entire Bot V2 migration, and it predates every other rule in this document. The original migration report's own root-cause diagnosis was that major project components were developed on separate branches "without a clear integration plan from the start" — nobody had stated, in writing, what the single converged end state was supposed to be before work began on either piece. Every rule above was earned fixing a downstream symptom of that one upstream gap.

## 1. Capture HEAD at session start — don't pin a hash in this document

**Rule:** At the start of every work session, before touching any file:

```
git branch --show-current
git rev-parse HEAD
git fetch origin && git rev-parse origin/<branch>
git status
```

Write down the resulting HEAD explicitly. That captured value — not a hash hardcoded in a long-lived document — is the only valid baseline for the rest of that session. If HEAD drifts from the captured baseline mid-session (e.g. local vs. origin mismatch), stop and report before continuing.

**Why:** a literal hash frozen into a process document goes stale the moment any approved work lands. The mechanism worth keeping is drift detection, not the specific number.

## 2. Every task declares its own explicit allowlist

**Rule:** There is no permanent fixed file list. Every task states its own allowlist before editing begins. An allowlist may include a component's own co-located stylesheet if directly required to compile. Shared/global files — `tailwind.config.js`, any app-wide theme or design-token file, any file imported by more than the component being touched — are **out of scope by default**, at any point in the task (investigation or implementation).

If evidence at any point shows one of these is the actual root cause, or that a fix confined to the allowlist is genuinely insufficient: stop, present that evidence — including specifically why a scoped fix won't work, not just that touching the shared file would also help — and wait for explicit approval before touching it. This is not a loophole; the approval path always existed, this wording just makes it unambiguous rather than readable as an absolute ban.

**Why:** "co-located theme file" is a loophole large enough to justify editing the global color palette while "fixing" one component — exactly the kind of scope creep this rule exists to prevent. At the same time, an absolute ban with no approval path would block fixing a genuine shared-file root cause, forcing a worse local workaround instead.

## 3. Never replace an existing Wizardly implementation with another one

**Rule:**

- Do not replace an existing component with another implementation simply because a different version exists elsewhere in the repository.
- Always improve the current Wizardly implementation in place.
- Never transplant another UI implementation without explicit, separate approval — improving ≠ replacing.
- Preserve existing UX unless the task explicitly requests a change to it.
- **Disclosure requirement:** every file outside the declared allowlist that appears in any diff must be named, diffed, and justified in the *same* completion report — never left for the reviewer to discover and request separately.

**Why:** directly evidenced by this project. The post-migration investigation found three non-bot-subsystem view files in the diff; only one (`HomeView.tsx`) was ever explained. The other two were never identified. That gap should never have reached a "complete" report.

## 4. Mandatory plan before editing

**Rule:** Before writing any code, state in writing:

- root cause,
- implementation strategy,
- the explicit allowlist (per Rule 2) this strategy requires,
- **what existing behavior must remain unchanged**, what is expected to change, and what the finished result should look/behave like (per Rule 0B — this field is mandatory, not optional framing; it is what makes a misunderstood objective visible before any code is written).

Wait for explicit approval — approval of the stated objective and its boundaries specifically, not just the mechanics of the fix. Only then start editing.

**Why:** this is already how every successful step of the Bot V2 migration worked. Formalizing it prevents regression to "just fix it and show me," and the added unchanged/changed field is what was missing the one time this project's biggest mistake happened (see Rule 0B).

## 5. Build success is not implementation success

**Rule:** A clean compile, a passing type check, or a successful build is never sufficient evidence that a task is correct. Visual behavior, existing UX, accepted application behavior, and existing content must all be confirmed preserved — through actual inspection, not inferred from build exit codes.

Separately: technical checks (build, types) and visual checks (screenshots, manual review) are two different verification categories, and neither substitutes for a third — whether a design/semantic decision baked into the code is itself correct. A change can compile, build, look right, and even behave plausibly in a smoke test, while the underlying decision it encodes is still wrong in a way no build or UI check can detect.

**Why:** demonstrated three separate times in this exact project — `tsc --noEmit` passing did not catch a broken `npm run build`; a successful build did not catch the bottom-nav clipping; neither caught that a viewed screenshot came from a stale server. The semantic-correctness gap is evidenced separately by the Bot V2 conceptId mapping, which compiled, built, and produced plausible smoke-test responses while being explicitly flagged as "the highest-risk artifact, not independently reviewed" — a correctness question no technical or visual check could have caught.

---

## New rules — gaps exposed during this project, not previously written down

## 6. Raw evidence only — no narrated summaries

**Rule:** Any claim of success, completeness, or correctness must be accompanied by the literal, pasted, raw output of the command or test that supports it. A narrative description ("TypeScript clean", "all tests pass", "manifest regenerated") without the underlying raw output attached is treated as unverified, not as evidence.

**Why:** this was the single most-invoked principle throughout the entire Bot V2 migration review — applied manually, every time, because it was never written down as a standing rule until now.

## 7. Nothing requested may silently disappear

**Rule:** Every verification item explicitly requested must be answered with evidence, or explicitly flagged as skipped along with a reason. It may never simply be absent from the next report with no acknowledgment.

**Why:** the requested illustration/asset integrity check was dropped without comment in a later report and had to be re-requested. Silent omission, not an explained gap, is the failure mode this rule targets.

## 8. Visual verification must come from a fresh, known state

**Rule:** Any visual/UI verification must be performed against a freshly started server process, confirmed to be running the expected HEAD (per Rule 1), opened in a hard-refreshed or incognito browser window — never assumed correct from a tab or process that may have been left open from an earlier session.

**Why:** a stale dev-server tab caused a full extra investigation round, including re-litigating conclusions that were actually still correct.

## 9. An approval must be the principal's own words

**Rule:** An approval gate is only satisfied by the project owner's own explicit written statement. An agent's description of its own decision as "approved" or "acknowledged" does not satisfy an approval requirement, no matter how reasonable the underlying decision is.

**Why:** happened twice in this project — a product-scope decision was described as "Approved as v1 product decision" by the agent before the owner had actually said so in his own words.
