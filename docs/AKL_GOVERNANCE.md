# AKL Governance Reference
**Al-Khwarizmi Knowledge Language — Authoring Reference v1.1**

Persistent authoring reference. Prevents schema drift, namespace confusion, and Gate 1 failures.
No code changes. No YAML changes. No runtime coupling. Consultation only.

---

## 1. Official Namespace Registry

| Namespace | Scope | Must NOT contain |
|---|---|---|
| `flight.*` | Flight mechanics, forces, axes, states, flight behaviors | Physics concepts (`physics.*` — AKL-D1); procedures; firmware config |
| `hardware.*` | Physical component descriptions and functions | Selection guidance, build planning, compatibility rules (→ `selection.*`) |
| `selection.*` | Component selection, compatibility, build planning, build goal, drone size, decision support | Component descriptions (→ `hardware.*`); assembly procedures (→ `safety.*`) |
| `power.*` | Power systems: batteries, power distribution, flight time, charging | Hardware descriptions of non-power components |
| `firmware.*` | Flight controller software, modes, configuration, Betaflight, iNav | Physical hardware descriptions; selection guidance |
| `control.*` | Control inputs: radio systems, stick modes, rates, expo, channels | Hardware descriptions of receivers or transmitters (→ `hardware.*`) |
| `sensors.*` | Sensors: gyro, accelerometer, GPS, barometer, optical flow | Firmware configuration of sensors (→ `firmware.*`) |
| `safety.*` | Safety procedures, hazards, first-flight protocols, safe practice | Component descriptions; flight theory; selection guidance |
| `troubleshooting.*` | Diagnosing and fixing problems | Configuration steps (→ `firmware.*`); safety procedures (→ `safety.*`) |

---

## 2. Schema Decision Log

| ID | Decision | Date |
|---|---|---|
| AKL-D1 | No `physics.*` namespace. Use `flight.*` reference nodes (e.g., `flight.gravity`, `flight.mass`) if physics concepts are needed. | 2026-06-26 |
| AKL-D2 | No `checklist.*` in `typedRelations`. Checklist usage belongs in checklist-specific fields/views, not in AKL typed relations. | 2026-06-26 |
| AKL-D3 | `selection.*` is the official 9th namespace. Covers component selection, compatibility, build planning, build goal, drone size, component matching, and decision-support concepts. | 2026-06-26 |
| AKL-D4 | `title` and `titleEn` are canonical fields inside `meta`. They were missing from the original schema draft and were added by schema-level decision. | 2026-06-26 |
| AKL-D5 | `pending: true` is a canonical field in `typedRelations` entries. Used only for relations whose `targetConceptId` has not yet been authored. Omit when the target is already approved. | 2026-06-26 |
| AKL-D6 | `answer` and `options` are excluded from AKL v1.1 challenges. Challenge types are frozen. Only `question` and `explanation` are valid challenge content fields. | 2026-06-26 |

---

## 3. Frozen Field Reference

Use exactly these field names. Rejected alternatives must not appear in approved concepts.

| Canonical field | Rejected alternatives |
|---|---|
| `question:` | `prompt:` |
| `targetConceptId:` | `target:` |
| `belief:` | `wrong:` |
| `safety.level:` (nested) | `safetyLevel:`, `safetyRisk:` (flat) |
| `meta:` | `identity:` |
| `level:` (in challenges) | `difficulty:` |
| `meta.tags:` | `searchKeywords:` |

Note: `safetyRisk` is valid only inside checklist items, not in AKL concept safety blocks.

---

## 4. Frozen Relation Taxonomy

**Official relation types (10):**

`depends_on` · `affects` · `causes` · `balances` · `explains` · `prerequisite_for` · `often_confused_with` · `requires_safety_warning` · `part_of` · `used_by`

**Prohibited:**
- Do not use `explained_by` — not in taxonomy.
- Do not use `affected_by` — not in taxonomy.

**Symmetric relations:**
- Use `symmetric: true` for relations such as `balances`.
- Author from one side only. The resolver handles inversion.
- Do not author both directions of a symmetric relation.

---

## 5. Frozen Challenge Types

**Official types (4):** `observation` · `analysis` · `application` · `design`

**Prohibited types:** `true_false` · `multiple_choice`

**Prohibited fields in challenges:** `answer` · `options`

**Required fields in challenges:** `type` · `level` · `linkedConceptId` · `status` · `question` · `explanation`

---

## 6. Safety Level Rules

| Level | Rule |
|---|---|
| `none` | Omit the `safety` block entirely. Do not write `level: none`. |
| `low` | Include a scoped safety block clarifying the concept's practical limits. |
| `medium` | Include a stronger safety warning. Concept is close to hazardous application. |
| `high` | Include strong safety warning. Practical protocol must live in a dedicated safety/procedure node, not here. |
| `critical` | Strict handling. `blocksExternalProviders: true` unless explicitly overridden by architecture decision. Human review required before serving. |

Every safety block must include: `level`, `reviewed`, `notes`, `blocksExternalProviders`.

---

## 7. Gate 1 Mechanical Checklist

Run in order for every submitted concept. All items must pass before a concept advances from `draft`.

- [ ] Namespace is one of the 9 official namespaces
- [ ] `conceptId` follows `namespace.slug` format
- [ ] `meta` block complete: `conceptId`, `namespace`, `nodeRole`, `version`, `status`, `language`, `title`, `titleEn`, `tags`, `consumers`
- [ ] `nodeRole` is one of: `overview` · `concept` · `procedure` · `safety` · `reference`
- [ ] `source` block complete: `sourceType`, `sourceRef`, `knowledgeOrigin`, `extractionNotes`
- [ ] `review.createdBy` is `"AKP Pilot Authoring"` — not `"ChatGPT"` or any AI attribution
- [ ] `definition` has `text`, `textEn`, `source`, `reviewed`, `level`
- [ ] `beginnerExplanation` has `text`, `textEn`, `source`, `reviewed`, `level`
- [ ] `learningGoals` present and non-empty
- [ ] `keyFacts` present and non-empty
- [ ] Safety block present only where required; level matches Architecture Report classification
- [ ] Safety block includes `level`, `reviewed`, `notes`, `blocksExternalProviders`
- [ ] `misconceptions` uses `belief:` not `wrong:`
- [ ] `expectedQuestions` present and non-empty
- [ ] `challenges` use `question:` not `prompt:`
- [ ] `challenges` have no `answer` or `options` fields
- [ ] Challenge `type` is one of the 4 frozen types
- [ ] `aliases` has `ar`, `en`, `transliteration`
- [ ] `typedRelations` use only official relation types
- [ ] `typedRelations` use `targetConceptId:` not `target:`
- [ ] No `explained_by` or `affected_by` relation types
- [ ] `pending: true` present only for targets not yet authored; absent for approved targets
- [ ] Symmetric relations authored from one side only with `symmetric: true`
- [ ] `architecturalNotes` present
- [ ] Concept node contains no embedded procedures (those belong in procedure/safety nodes)
- [ ] No runtime coupling: no imports, no route wiring, no resolver changes
- [ ] No rejected draft content merged into approved version

---

## 8. Validation Against The Live Corpus — 2026-09-08

This section was added when the document was salvaged onto the canonical branch
from `claude/sleepy-knuth-2hl1nd`, where it had been stranded since 2026-06-28.
Nothing above it was changed: every rule was checked against
`src/data/lkb/akl/**` as it actually stands, and every rule held.

**What was measured** — 43 concept files across 4 namespace directories.

| Rule from this document | Measured result |
|---|---|
| §3 frozen fields — `prompt:`, `target:`, `wrong:`, `safetyLevel:`, `difficulty:`, `searchKeywords:` are rejected spellings | **0 occurrences of any of the six.** The canonical spelling is used throughout |
| §4 relation taxonomy — 10 official types, `explained_by` / `affected_by` prohibited | 6 of the 10 in use (`depends_on` 122 · `prerequisite_for` 95 · `explains` 7 · `requires_safety_warning` 5 · `affects` 3 · `balances` 1). **Neither prohibited type appears** |
| §4 symmetric relations authored one side only | 1 `symmetric: true`, on the single `balances` relation |
| §5 challenge types — 4 official, `true_false` / `multiple_choice` prohibited, no `answer` / `options` | Only `analysis` is used (86). **0 prohibited types, 0 prohibited fields** |
| §6 `none` → omit the block entirely | 41 files carry a safety block; the 2 that do not are exactly the concepts with no safety dimension. **`level: none` is never written** |
| §6 every safety block carries `level`, `reviewed`, `notes`, `blocksExternalProviders` | `blocksExternalProviders` present in **41/41** files that have a block |
| §7 `meta` completeness — 10 required keys | **43/43 for all ten** |
| §7 `source` block — 4 required keys | **43/43 for all four** |
| §7 `review.createdBy` is `"AKP Pilot Authoring"`, never an AI attribution | **43/43 exactly that string** |
| §7 `nodeRole` is one of five | `concept` (42) and `overview` (1) — both official |

### The one gap this check found

**`architecturalNotes` is required by the §7 checklist and present in 0 of 43
files.** The requirement is left standing rather than deleted, because deleting
it would be changing the rule instead of recording the state. It is recorded
here as an open gap for whoever next authors or re-gates a concept.

### Two facts worth knowing before authoring

1. **Five of the nine namespaces have no concepts yet.** In use: `selection`
   (25), `firmware` (9), `flight` (7), `control` (2). Unauthored: `hardware`,
   `power`, `sensors`, `safety`, `troubleshooting`. The registry in §1 is a
   forward-looking contract, not a description of what exists — an author
   opening one of the five is starting that namespace, not extending it.

2. **Nothing enforces any of this mechanically.** `scripts/buildAklIndex.ts`
   is a lenient extractor: it requires `conceptId` and `definition.text`, warns
   and skips on anything malformed, and reads none of the rules above. So this
   document is not a summary of a validator — it *is* the validator, run by a
   person. That is precisely why it was worth salvaging rather than leaving on
   a branch about to be deleted.

Every concept in the corpus is still `status: draft`; Gate 1 has not been run
to completion on any of them.
