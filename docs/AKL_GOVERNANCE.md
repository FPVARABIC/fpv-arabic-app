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
