# Bot V2 Architecture

## Status note (read first)

This document describes two things, kept clearly distinct:

1. **Current pipeline** — what is actually implemented and running in this
   repository today.
2. **Target pipeline** — the intent/context/warning upgrade proposed for
   Bot V2 (adding `intentClassifier.ts`, `sessionContext.ts`, and
   `contextualWarning.ts`). This proposal has been fully designed and
   validated in an isolated scratch copy (TypeScript, build, lint, and 60+
   real assertion tests all passing) but **has not been approved or merged
   into this repository**. Do not assume the target-pipeline modules exist
   in `src/` until that approval has happened and this note is removed.

Every module description below states which pipeline (current, target, or
both) it belongs to.

## Overall pipeline

**Current (implemented today):**

```
analyzeQuery
  ↓
lookupAklEntry
  ↓
classifyV2Risk
  ↓
selectV2Mode
  ↓
composeV2Answer
  ↓
applyRecommendations
```

**Target (proposed, not yet implemented):**

```
analyzeQuery
  ↓
intentClassifier
  ↓
sessionContext
  ↓
classifyV2Risk
  ↓
contextualWarning
  ↓
modeSelector
  ↓
composer
  ↓
recommendationLayer
```

### Responsibility of each stage

| Stage | Pipeline | Responsibility |
|---|---|---|
| `analyzeQuery` | current + target | Normalizes the raw query (diacritics, alef, taa marbuta, casing), detects FPV-domain tokens, matches a concept from `botConceptRegistry.ts`, and returns a `QueryAnalysis`. Unmodified by the target proposal. |
| `lookupAklEntry` | current | Looks up a generated knowledge-index entry (AKL) for concepts not covered by the hand-authored knowledge base. |
| `intentClassifier` | target | Assigns one of 17 `Intent` values, extracts honest entities (use case, frame size, battery voltage, component type, budget, experience level) from the current message only, and recognizes new troubleshooting vocabulary. |
| `sessionContext` | target | Resolves the current turn against the prior session context: continuation, topic switch, explicit correction, or reset. Owns the minimal, non-persisted `AssistantSessionContext`. |
| `classifyV2Risk` | current + target | Applies the strict, second-pass safety classification (critical hazard detection) on top of the concept registry's `safetyLevel`. Unmodified by the target proposal. |
| `contextualWarning` | target | The single authority for whether a warning is shown, its severity, its kind, its text, and (via deduplication) whether an identical warning repeats. |
| `selectV2Mode` / `modeSelector` | current + target | Converts the analysis, safety result, and (in the target pipeline) the resolved intent and pending clarification into one `BotV2AnswerMode`. Does not compose answer text. |
| `composeV2Answer` / `composer` | current + target | Builds the structured `BotV2Answer` (short answer, steps, chips, links) from the knowledge base, for the mode selected upstream. Never decides warnings or modes itself. |
| `applyRecommendations` | current + target | Post-answer only — attaches related-concept recommendations. Never influences upstream reasoning. |

## Single Responsibility

Each module owns exactly one concern:

**`contextualWarning.ts`** (target)
- The 8-kind warning taxonomy (`none`, `immediate_hazard`, `first_power_up`,
  `motor_test`, `lipo_charge`, `lipo_storage`, `soldering_polarity`,
  `vtx_without_antenna`).
- Warning priority ordering when multiple hazards could apply.
- Warning-repetition deduplication.
- The single shared render-decision helper (`getWarningCardProps`) that
  both UI surfaces must call — it owns whether/how a warning renders, not
  just whether one is classified.

**`intentClassifier.ts`** (target)
- Intent classification (the 17-value `Intent` taxonomy).
- Entity extraction, honestly limited to what the current message states.

**`sessionContext.ts`** (target)
- The `AssistantSessionContext` shape.
- Conversation continuation, topic switching, and reset rules.
- Progressive clarification state (`pendingClarification`).

**`composer.ts`**
- Response generation only: turning a selected mode + knowledge-base
  lookup into a structured `BotV2Answer`.

**`modeSelector.ts`**
- Answer mode selection only: choosing exactly one `BotV2AnswerMode`.

**`engine.ts`**
- Orchestration only: calling the pipeline stages in order and threading
  their outputs together. Contains no classification, warning, or
  response-generation logic of its own.

## Forbidden responsibilities

- `composer.ts` must never classify warnings — it only spreads the
  already-computed `ContextualWarningResult` into its returned answer.
- `modeSelector.ts` must never generate response text — it returns a mode
  and a reason string only.
- `intentClassifier.ts` must never decide UI rendering or compose answer
  text.
- `sessionContext.ts` must never call the knowledge base or compose
  answers — it only reduces (query, intent, prior context) into
  (resolved intent, next context).
- UI components (`BotV2Overlay.tsx`, `BotV2AssistantView.tsx`) must never
  decide warning visibility, severity, or color independently — they must
  call `getWarningCardProps()` and render exactly what it returns.
- No module may re-implement or duplicate another module's decision logic
  "for convenience" — if a decision is needed, call the module that owns
  it.

## Design principles

- **Deterministic behavior** — identical inputs (query + prior context)
  always produce identical outputs. No network calls, no randomness, no
  wall-clock-dependent branching.
- **No duplicated logic** — every decision (intent, mode, warning kind,
  warning visibility) is made in exactly one place and consumed everywhere
  else.
- **Single source of truth** — one module owns each concern (see Single
  Responsibility above); nothing downstream re-derives what an upstream
  module already computed.
- **Pure functions whenever possible** — `classifyIntent`, `resolveTurn`,
  `classifyContextualWarning`, `applyWarningDeduplication`, `selectV2Mode`,
  and `composeV2Answer` are all pure functions of their arguments; the only
  stateful piece is the `AssistantSessionContext` held in React state by
  the caller, which is passed in and returned, never mutated in place.
- **Minimal shared state** — `AssistantSessionContext` holds only the
  handful of scalar/enum fields actually consumed downstream (no history
  array, no unused fields); it is never persisted outside the React
  component's lifetime.

## Future extension rules

**Adding a new Intent:**
1. Add the value to the `Intent` union in `intentClassifier.ts`.
2. Add its detection logic to `classifyIntent()` (reusing existing signal
   detection where the same phrases already exist elsewhere, e.g. warning
   signals, rather than duplicating a phrase list).
3. If it belongs to an existing family (`planning`, `action`,
   `troubleshooting`, `other`) for topic-switch purposes, add it to the
   corresponding `Set` in `sessionContext.ts`; otherwise decide whether a
   new family is warranted.
4. If it needs a distinct answer mode, add mode-selection logic in
   `modeSelector.ts`; otherwise map it onto an existing mode.
5. Add real assertion tests covering the new intent's classification and
   its interaction with session context.
6. Verify all new vocabulary is Modern Standard Arabic per
   `BOT_LANGUAGE_POLICY.md` before merging.

**Adding a new Warning kind:**
1. Add the value to `ContextualWarningKind` in `contextualWarning.ts`.
2. Add its signal detection and priority position in
   `classifyContextualWarning()` — never skip the fixed priority ordering.
3. Add its MSA warning text to `CONTEXTUAL_WARNING_TEXT`.
4. Do not add any UI-side warning-rendering logic — `getWarningCardProps()`
   already generalizes to any kind/severity.
5. Add tests for: correct kind selection, correct priority against
   existing kinds, and correct deduplication behavior.

**Adding a new Answer Mode:**
1. Add the value to `BotV2AnswerMode` in `types.ts`.
2. Add its selection condition to `selectV2Mode()`/`modeSelector.ts`, in
   the correct priority position relative to existing rules.
3. Add its composition branch to `composeV2Answer()`/`composer.ts` — it
   must still spread the passed-in `contextualWarning` result rather than
   deciding its own warning.
4. Update both UI files only if the new mode needs presentation not
   already covered by the existing generic answer rendering (steps, chips,
   links, warning card) — do not add mode-specific rendering branches
   unless strictly necessary.
5. Add tests covering mode selection and composed-answer shape.

## Out of scope

Bot V2 intentionally has no involvement with, and must never be extended
to touch:

- Firestore (rules, indexes, or direct reads/writes).
- Authentication.
- Community feed.
- Posts / comments.
- Public profiles / `ProfileSheet`.
- Bottom navigation.
- Any other application screen not directly part of the assistant UI
  (`BotV2Overlay.tsx`, `BotV2AssistantView.tsx`) or its supporting
  `src/data/knowledge/botV2/` and `src/data/knowledge/` modules.
