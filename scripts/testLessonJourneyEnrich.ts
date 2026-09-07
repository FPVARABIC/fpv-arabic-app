/**
 * Enrichment: the authored lesson fields reach the journey, for every lesson.
 *
 * The gap this guards against is the one the lessons review found: 48 key
 * points, 16 common mistakes, 16 objectives and 6 safety warnings rendered in
 * a branch no learner reached. These assertions run against ALL lessons in
 * `lessonsData`, so a lesson added later cannot quietly opt out.
 */
import assert from 'node:assert/strict';
import { lessonsData } from '../src/data/lessonsData';
import { getLessonJourneyDefinition } from '../src/data/lessons/journeyRegistry';
import { enrichJourneyDefinition, ENRICHED_STAGE_IDS } from '../src/data/lessons/lessonJourneyEnrich';
import { createInitialSessionState, getReadinessRequirements } from '../src/data/lessons/lessonJourneyEngine';
import type { CalloutStage, KeyPointsStage, OrientationStage } from '../src/types/lessonJourney';

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

console.log('\n[1] Every lesson: objective, key points and common mistake reach the journey');
{
  let warnings = 0;
  for (const lesson of lessonsData) {
    const base = getLessonJourneyDefinition(lesson.id)!;
    const e = enrichJourneyDefinition(base, lesson);

    const orientation = e.stages.find((s): s is OrientationStage => s.type === 'orientation');
    ok(`${lesson.id}: orientation carries the objective`, !!orientation && orientation.objective === lesson.objective);

    const kp = e.stages.find((s): s is KeyPointsStage => s.id === ENRICHED_STAGE_IDS.keyPoints);
    ok(`${lesson.id}: key points stage carries all ${lesson.importantPoints.length} points`,
      !!kp && JSON.stringify(kp.points) === JSON.stringify(lesson.importantPoints));

    const mistake = e.stages.find((s): s is CalloutStage => s.id === ENRICHED_STAGE_IDS.commonMistake);
    ok(`${lesson.id}: common mistake is a warn callout right before completion`,
      !!mistake && mistake.tone === 'warn' && mistake.body === lesson.commonMistake
      && e.stages[e.stages.indexOf(mistake) + 1]?.type === 'completion');

    const warning = e.stages.find((s): s is CalloutStage => s.id === ENRICHED_STAGE_IDS.warning);
    if (lesson.warning) {
      warnings++;
      const idx = e.stages.indexOf(warning!);
      ok(`${lesson.id}: safety warning is a danger callout right after the lesson explanation`,
        !!warning && warning.tone === 'danger' && warning.body === lesson.warning
        && e.stages[idx - 1]?.type === 'explanation' && (e.stages[idx - 1] as { body?: string }).body === 'lesson-explanation');
    } else {
      ok(`${lesson.id}: no warning authored, none invented`, !warning);
    }

    ok(`${lesson.id}: enriched stage ids are unique`, new Set(e.stages.map(s => s.id)).size === e.stages.length);
    ok(`${lesson.id}: original stage order is preserved`, (() => {
      const ids = e.stages.map(s => s.id).filter(id => base.stages.some(s => s.id === id));
      return JSON.stringify(ids) === JSON.stringify(base.stages.map(s => s.id));
    })());
  }
  ok('ten lessons carry a safety warning (the original seven plus the three setup/propeller lessons)', warnings === 10);
}

console.log('\n[2] Enrichment adds no requirement and is idempotent');
{
  for (const lesson of lessonsData) {
    const base = getLessonJourneyDefinition(lesson.id)!;
    const idsBefore = base.stages.map(s => s.id).join('|');
    const e = enrichJourneyDefinition(base, lesson);
    const reqBase = getReadinessRequirements(base, createInitialSessionState(base)).map(r => r.id);
    const reqE = getReadinessRequirements(e, createInitialSessionState(e)).map(r => r.id);
    ok(`${lesson.id}: readiness requirements unchanged`, JSON.stringify(reqBase) === JSON.stringify(reqE));
    const twice = enrichJourneyDefinition(e, lesson);
    ok(`${lesson.id}: enriching twice adds nothing`, twice.stages.length === e.stages.length);
    // Compares the input's own stage list before and after, rather than
    // asserting «the input has no key_points stage» — which stopped being a
    // proxy for mutation the moment Lesson 17 authored a numbered checklist
    // of its own. This is the stronger check: nothing was inserted, removed
    // or reordered, and no enriched id leaked into the source definition.
    ok(`${lesson.id}: the input definition was not mutated`,
      base.stages.map(s => s.id).join('|') === idsBefore
      && base.stages.every(s => !s.id.startsWith('enriched-')));
  }
}

console.log('\n[3] The whole section, counted');
{
  const enriched = lessonsData.map(l => enrichJourneyDefinition(getLessonJourneyDefinition(l.id)!, l));
  const stages = enriched.reduce((n, d) => n + d.stages.length, 0);
  const callouts = enriched.reduce((n, d) => n + d.stages.filter(s => s.type === 'callout').length, 0);
  // Counted by the ENRICHED stage's id rather than by stage type: Lesson 17
  // authors a key_points stage of its own (the pre-flight checklist), and this
  // assertion is about enrichment surfacing every authored importantPoint —
  // not about how many numbered lists the section happens to contain.
  const points = enriched.reduce((n, d) => n + d.stages.filter((s): s is KeyPointsStage => s.id === ENRICHED_STAGE_IDS.keyPoints).reduce((m, s) => m + s.points.length, 0), 0);
  console.log(`      stages=${stages} callouts=${callouts} keyPoints=${points}`);
  ok('every lesson has at least one interactive stage', enriched.every(d => d.stages.some(s => s.type === 'interactive_diagram')));
  ok('all 60 authored key points are shown (20 lessons × 3)', points === 60);
  ok('at least 30 callouts across the section (20 mistakes + 10 warnings, plus authored ones)', callouts >= 30);
}

console.log(`\nAll ${passed} assertions passed.`);
