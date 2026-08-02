/**
 * Arabic language + terminology review, run over EVERY authored string.
 *
 * The product spec asks for "مراجعة لغوية مستقلة لكل محتوى عربي قبل اعتباره
 * مكتملاً" and "دليل موحد للمصطلحات". A human pass does not scale across a
 * growing encyclopedia and silently degrades as modules are added, so the parts
 * of that review that CAN be mechanised are mechanised here and fail the build.
 *
 * What this cannot check — meaning, accuracy, tone — stays a human
 * responsibility and is tracked in docs/platform/06-TERMINOLOGY.md.
 *
 * Run: npx tsx scripts/testKbLanguage.ts
 */
import assert from 'node:assert/strict';

import { allKbModules } from '../src/data/kb/registry';
import { articleTextStrings } from '../src/data/kb/coverage';
import { kbTerms } from '../src/data/kb/glossary/terms';
import { allDxTrees } from '../src/data/kb/diagnostics/trees';
import { allEdgeTxPages } from '../src/data/edgetx/registry';
import { setupSteps } from '../src/data/expresslrs/setupSteps';
import { troubleshootingIssues } from '../src/data/expresslrs/troubleshootingIssues';
import { canonicalTerms, styleRules, TERM_EXPLANATION_EXEMPT, KEEP_IN_LATIN } from '../src/data/kb/style/terminology';
import { normalizeText } from '../src/data/kb/search/normalize';

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

// ── Collect every authored string with a traceable origin ────────────────────

interface Authored { origin: string; text: string }

const corpus: Authored[] = [];

for (const mod of allKbModules) {
  corpus.push({ origin: `module:${mod.id}/summary`, text: mod.summaryAr });
  corpus.push({ origin: `module:${mod.id}/title`, text: mod.titleAr });
  for (const p of mod.paths) {
    corpus.push({ origin: `path:${p.id}/title`, text: p.titleAr });
    corpus.push({ origin: `path:${p.id}/audience`, text: p.audienceAr });
    corpus.push({ origin: `path:${p.id}/outcome`, text: p.outcomeAr });
  }
  for (const a of mod.articles) {
    corpus.push({ origin: `article:${a.id}/title`, text: a.titleAr });
    for (const s of articleTextStrings(a)) corpus.push({ origin: `article:${a.id}`, text: s });
    for (const q of a.quiz ?? []) {
      corpus.push({ origin: `article:${a.id}/quiz:${q.id}`, text: q.question });
      for (const o of q.options) {
        corpus.push({ origin: `article:${a.id}/quiz:${q.id}/${o.id}`, text: o.text });
        corpus.push({ origin: `article:${a.id}/quiz:${q.id}/${o.id}/feedback`, text: o.feedback });
      }
    }
    for (const l of a.links) {
      corpus.push({ origin: `article:${a.id}/link`, text: l.label });
      if (l.reason) corpus.push({ origin: `article:${a.id}/link/reason`, text: l.reason });
    }
  }
}

for (const t of kbTerms) {
  corpus.push({ origin: `term:${t.id}/ar`, text: t.ar });
  corpus.push({ origin: `term:${t.id}/short`, text: t.short });
  if (t.technical) corpus.push({ origin: `term:${t.id}/technical`, text: t.technical });
  for (const c of t.confusedWith) corpus.push({ origin: `term:${t.id}/confusedWith`, text: c.note });
  for (const e of t.examples ?? []) corpus.push({ origin: `term:${t.id}/example`, text: e });
}

for (const tree of allDxTrees) {
  corpus.push({ origin: `dx:${tree.id}/title`, text: tree.titleAr });
  corpus.push({ origin: `dx:${tree.id}/symptom`, text: tree.symptomAr });
  for (const q of tree.quickChecks) corpus.push({ origin: `dx:${tree.id}/quickCheck`, text: q });
  for (const s of tree.stopConditions) corpus.push({ origin: `dx:${tree.id}/stop`, text: s });
  for (const n of tree.nodes) {
    corpus.push({ origin: `dx:${tree.id}/${n.id}/question`, text: n.question });
    corpus.push({ origin: `dx:${tree.id}/${n.id}/how`, text: n.how });
    corpus.push({ origin: `dx:${tree.id}/${n.id}/expected`, text: n.expected });
    if (n.safetyNote) corpus.push({ origin: `dx:${tree.id}/${n.id}/safety`, text: n.safetyNote });
    for (const o of n.outcomes) {
      corpus.push({ origin: `dx:${tree.id}/${n.id}/${o.id}/label`, text: o.label });
      corpus.push({ origin: `dx:${tree.id}/${n.id}/${o.id}/meaning`, text: o.meaning });
      if (o.conclusion) corpus.push({ origin: `dx:${tree.id}/${n.id}/${o.id}/conclusion`, text: o.conclusion });
      for (const act of o.actions ?? []) corpus.push({ origin: `dx:${tree.id}/${n.id}/${o.id}/action`, text: act });
    }
  }
}

/**
 * The EdgeTX centre joins the corpus.
 *
 * WHAT IS DELIBERATELY EXCLUDED
 * -----------------------------
 * `bot.symptomsAr` and `bot.misspellingsAr` are NOT authored prose — they are
 * retrieval inputs written in the user's own words, and their whole job is to
 * contain the spellings this file forbids in prose («الريسيفر», «موديول»). They
 * belong with search/synonyms.ts, not with the writing standard, and checking
 * them here would force the two policies into direct contradiction.
 */
for (const p of allEdgeTxPages) {
  corpus.push({ origin: `edgetx:${p.id}/title`, text: p.titleAr });
  corpus.push({ origin: `edgetx:${p.id}/summary`, text: p.summaryAr });
  corpus.push({ origin: `edgetx:${p.id}/when`, text: p.whenNeededAr });
  corpus.push({ origin: `edgetx:${p.id}/where`, text: p.whereAr });
  corpus.push({ origin: `edgetx:${p.id}/revert`, text: p.revertAr });
  for (const t of p.prerequisitesAr) corpus.push({ origin: `edgetx:${p.id}/prereq`, text: t });
  for (const t of p.relationAr) corpus.push({ origin: `edgetx:${p.id}/relation`, text: t });
  for (const t of p.commonMistakesAr) corpus.push({ origin: `edgetx:${p.id}/mistake`, text: t });
  for (const t of p.verifyAr) corpus.push({ origin: `edgetx:${p.id}/verify`, text: t });
  for (const t of p.versionNotesAr) corpus.push({ origin: `edgetx:${p.id}/version`, text: t });
  for (const t of p.manualRequiredAr) corpus.push({ origin: `edgetx:${p.id}/manual`, text: t });
  for (const st of p.stepsAr) {
    corpus.push({ origin: `edgetx:${p.id}/step`, text: st.textAr });
    if (st.noteAr) corpus.push({ origin: `edgetx:${p.id}/step-note`, text: st.noteAr });
  }
  for (const t of p.troubleshootingAr ?? []) {
    corpus.push({ origin: `edgetx:${p.id}/symptom`, text: t.symptomAr });
    corpus.push({ origin: `edgetx:${p.id}/check`, text: t.checkAr });
  }
  if (p.ownsDiagnosis) corpus.push({ origin: `edgetx:${p.id}/owns`, text: p.ownsDiagnosis.reasonAr });
  if (p.canonicalDiagnosis?.reason) corpus.push({ origin: `edgetx:${p.id}/canonical`, text: p.canonicalDiagnosis.reason });
  for (const l of p.links) corpus.push({ origin: `edgetx:${p.id}/link`, text: l.label });
  for (const g of p.groups) {
    corpus.push({ origin: `edgetx:${p.id}/${g.id}/title`, text: g.titleAr });
    if (g.introAr) corpus.push({ origin: `edgetx:${p.id}/${g.id}/intro`, text: g.introAr });
    for (const st of g.settings) {
      corpus.push({ origin: `edgetx:${p.id}/${st.id}/label`, text: st.labelAr });
      corpus.push({ origin: `edgetx:${p.id}/${st.id}/what`, text: st.whatAr });
      corpus.push({ origin: `edgetx:${p.id}/${st.id}/effect`, text: st.effectAr });
      corpus.push({ origin: `edgetx:${p.id}/${st.id}/when`, text: st.whenAr });
      for (const [k, v] of [['risk', st.riskAr], ['verify', st.verifyAr], ['revert', st.revertAr],
        ['version', st.versionNoteAr], ['manual', st.manualCheckAr]] as const) {
        if (v) corpus.push({ origin: `edgetx:${p.id}/${st.id}/${k}`, text: v });
      }
    }
  }
}

// The ExpressLRS centre. Its prose was written before this checker existed and
// is now held to the same standard as everything else — the six entries added
// while closing the confirmed gaps had to pass it to be written at all.
for (const st of setupSteps) {
  corpus.push({ origin: `elrs-step:${st.id}/title`, text: st.title });
  corpus.push({ origin: `elrs-step:${st.id}/summary`, text: st.summary });
  corpus.push({ origin: `elrs-step:${st.id}/goal`, text: st.goal });
  for (const t of st.prerequisites) corpus.push({ origin: `elrs-step:${st.id}/prereq`, text: t });
  for (const t of st.actions) corpus.push({ origin: `elrs-step:${st.id}/action`, text: t });
  for (const t of st.expectedResult) corpus.push({ origin: `elrs-step:${st.id}/expected`, text: t });
  for (const t of st.ifNotSeen) corpus.push({ origin: `elrs-step:${st.id}/ifNotSeen`, text: t });
  for (const t of st.commonMistakes) corpus.push({ origin: `elrs-step:${st.id}/mistake`, text: t });
  for (const w of st.warnings) corpus.push({ origin: `elrs-step:${st.id}/warning`, text: w.message });
  for (const c of st.checklist) corpus.push({ origin: `elrs-step:${st.id}/checklist`, text: c.label });
  for (const t of st.versionNotes) corpus.push({ origin: `elrs-step:${st.id}/version`, text: t });
  for (const d of st.advancedDisclosures) {
    corpus.push({ origin: `elrs-step:${st.id}/disclosure`, text: d.title });
    for (const b of d.body) corpus.push({ origin: `elrs-step:${st.id}/disclosure-body`, text: b });
  }
  for (const tm of st.terminology) corpus.push({ origin: `elrs-step:${st.id}/term`, text: tm.definition });
}

for (const i of troubleshootingIssues) {
  corpus.push({ origin: `elrs-issue:${i.id}/title`, text: i.title });
  corpus.push({ origin: `elrs-issue:${i.id}/symptom`, text: i.symptom });
  corpus.push({ origin: `elrs-issue:${i.id}/resolved`, text: i.resolvedWhen });
  corpus.push({ origin: `elrs-issue:${i.id}/next`, text: i.nextIfUnresolved });
  if (i.safetyWarning) corpus.push({ origin: `elrs-issue:${i.id}/safety`, text: i.safetyWarning.message });
  for (const t of i.likelyCauses) corpus.push({ origin: `elrs-issue:${i.id}/cause`, text: t });
  for (const c of i.checks) {
    corpus.push({ origin: `elrs-issue:${i.id}/${c.id}/instruction`, text: c.instruction });
    corpus.push({ origin: `elrs-issue:${i.id}/${c.id}/expected`, text: c.expectedResult });
    corpus.push({ origin: `elrs-issue:${i.id}/${c.id}/ifFailed`, text: c.ifFailed });
  }
  for (const l of i.links ?? []) corpus.push({ origin: `elrs-issue:${i.id}/link`, text: l.label });
}

console.log(`\n[0] Corpus: ${corpus.length} authored strings collected`);
ok('the corpus is non-trivial', corpus.length > 800);

// ── 1. Terminology consistency ───────────────────────────────────────────────

console.log('\n[1] Terminology — one Arabic form per concept');
{
  // Glossary entries legitimately record spoken/transliterated variants (that is
  // their job), so only their *definitions* are checked, not their identifying
  // fields. Everything else is prose and must use the canonical form.
  const proseOnly = corpus.filter(c => !/^term:[^/]+\/(ar|example)$/.test(c.origin));

  // Use versus mention: a variant inside Arabic guillemets is being taught, not
  // used, and the encyclopedia must be able to say «الاسم الشائع لهذه القطعة
  // هو كذا». Quoted spans are removed before the check.
  const stripCitations = (s: string) => s.replace(/«[^»]*»/gu, ' ');

  const violations: string[] = [];
  for (const term of canonicalTerms) {
    for (const bad of term.forbiddenInProse) {
      const badNorm = normalizeText(bad);
      if (!badNorm) continue;
      // Whole-token match on normalized text so «فريم» does not fire inside
      // «الفريمات» being discussed as a quoted variant, and so diacritics and
      // alef spellings cannot smuggle a variant past the check.
      const re = new RegExp(`(^|\\s)${badNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`, 'u');
      for (const c of proseOnly) {
        if (re.test(normalizeText(stripCitations(c.text)))) {
          violations.push(`${c.origin}: «${bad}» → استخدم «${term.canonicalAr}»`);
        }
      }
    }
  }
  if (violations.length) {
    console.error('\n  terminology violations:');
    for (const v of violations.slice(0, 40)) console.error(`   - ${v}`);
    if (violations.length > 40) console.error(`   … and ${violations.length - 40} more`);
  }
  ok('no forbidden term variant appears in authored prose', violations.length === 0);

  // The canonical form must actually be reachable through search, otherwise we
  // have standardised on a word users cannot find.
  ok('every canonical term has a glossary entry or is intentionally glossary-free',
    canonicalTerms.every(t => !t.glossaryId || kbTerms.some(g => g.id === t.glossaryId)));

  // The two policies must not contradict each other. Declaring a term
  // "keep it in Latin" while ALSO mandating an Arabic prose form for it would
  // make the standard unfollowable — every author would violate one rule or the
  // other, whichever they read second.
  const keepLatin = new Set(KEEP_IN_LATIN.map(t => t.toLowerCase()));
  const contradictions = canonicalTerms
    .filter(t => keepLatin.has(t.en.toLowerCase()))
    .map(t => `${t.en}: KEEP_IN_LATIN yet canonicalAr="${t.canonicalAr}"`);
  if (contradictions.length) console.error('  policy contradictions:', contradictions);
  ok('no term is simultaneously "keep in Latin" and "must be translated"', contradictions.length === 0);
}

// ── 2. Mechanical Arabic style ───────────────────────────────────────────────

console.log('\n[2] Arabic style rules');
{
  for (const rule of styleRules) {
    const hits: string[] = [];
    for (const c of corpus) {
      if (!rule.pattern.test(c.text)) continue;
      if (rule.allowIfContains?.some(a => c.text.includes(a))) continue;
      const m = rule.pattern.exec(c.text);
      hits.push(`${c.origin}: …${c.text.slice(Math.max(0, (m?.index ?? 0) - 30), (m?.index ?? 0) + 40)}…`);
    }
    if (hits.length) {
      console.error(`\n  [${rule.id}] ${rule.problemAr} — ${rule.fixAr}`);
      for (const h of hits.slice(0, 25)) console.error(`   - ${h}`);
      if (hits.length > 25) console.error(`   … and ${hits.length - 25} more`);
    }
    ok(`style rule "${rule.id}" has no violations`, hits.length === 0);
  }
}

// ── 3. English term is shown alongside its Arabic explanation ────────────────

console.log('\n[3] English terms are surfaced, not hidden behind translations');
{
  // The spec requires the English term to stay visible so the reader can find it
  // inside real software and datasheets. Concretely: if an article leans on a
  // glossary concept (its English form or abbreviation appears repeatedly), that
  // glossary entry must be linked from the article.
  const REPEAT_THRESHOLD = 3;
  const exempt = new Set(TERM_EXPLANATION_EXEMPT.map(t => t.toLowerCase()));

  const missing: string[] = [];
  for (const mod of allKbModules) {
    for (const a of mod.articles) {
      const text = articleTextStrings(a).join(' \n ');
      for (const term of kbTerms) {
        if (a.glossaryIds.includes(term.id)) continue;
        for (const form of [term.abbr, term.en].filter((f): f is string => !!f)) {
          if (exempt.has(form.toLowerCase())) continue;
          if (form.length < 3) continue;
          const re = new RegExp(`(^|[^A-Za-z0-9])${form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9])`, 'gu');
          const count = (text.match(re) ?? []).length;
          if (count >= REPEAT_THRESHOLD) {
            missing.push(`${a.id}: uses "${form}" ${count}× but does not link glossary term "${term.id}"`);
            break;
          }
        }
      }
    }
  }
  if (missing.length) {
    console.error('\n  unlinked repeated terms:');
    for (const m of missing.slice(0, 30)) console.error(`   - ${m}`);
    if (missing.length > 30) console.error(`   … and ${missing.length - 30} more`);
  }
  ok('every heavily-used English term is linked to its glossary entry', missing.length === 0);
}

// ── 4. Glossary quality ──────────────────────────────────────────────────────

console.log('\n[4] Glossary entries meet the writing standard');
{
  const shortDefs = kbTerms.filter(t => t.short.trim().length < 40);
  if (shortDefs.length) console.error('  too-short definitions:', shortDefs.map(t => t.id));
  ok('every plain-language definition is a real sentence', shortDefs.length === 0);

  const sameText = kbTerms.filter(t => t.technical && t.technical.trim() === t.short.trim());
  ok('the technical definition never duplicates the plain one', sameText.length === 0);

  const noEnglish = kbTerms.filter(t => !/[A-Za-z]/.test(t.en));
  ok('every term carries its real English form', noEnglish.length === 0);
}

console.log(`\n✅ testKbLanguage: ${passed} assertions passed over ${corpus.length} strings\n`);
