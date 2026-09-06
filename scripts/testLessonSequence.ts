/**
 * The order of the path, enforced.
 *
 * WHAT THIS EXISTS TO CATCH
 * -------------------------
 * Lessons are pure data, so any of them can be edited alone — and the failure
 * this guards against is not a broken lesson but a broken ORDER. A propeller
 * lesson that drifts ahead of the motor test, a first flight that stops
 * depending on a failsafe test, a KV number used two lessons before KV is
 * introduced: each one leaves every individual lesson correct and the path
 * unsafe or unlearnable.
 *
 * THE ORDER THIS FILE HOLDS DOWN
 * ------------------------------
 *   power-up  →  configure + motor test WITHOUT propellers  →  fit propellers
 *             →  first flight
 * It is not reversible. Every assertion below is a way that order could break.
 */
import assert from 'node:assert/strict';
import { lessonsData, TOTAL_LESSONS } from '../src/data/lessonsData';
import { getLessonJourneyDefinition, LESSON_JOURNEY_IDS } from '../src/data/lessons/journeyRegistry';
import { LESSON_TRACKS, groupLessonsByTrack } from '../src/data/lessons/lessonTracks';
import type { CheckpointStage, InteractiveDiagramStage } from '../src/types/lessonJourney';

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

const byId = (id: string) => lessonsData.find(l => l.id === id)!;
const numberOf = (id: string) => byId(id).number;
const textOf = (id: string) => JSON.stringify(getLessonJourneyDefinition(id)!);

const POWER_UP = 'lesson-first-power-up';
const BETAFLIGHT = 'lesson-betaflight-minimum';
const PROPELLERS = 'lesson-propellers';
const FIRST_FLIGHT = 'lesson-stick-control-first-flight';

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[1] The curriculum is twenty lessons, counted every way it is counted');
{
  ok('TOTAL_LESSONS is 20', TOTAL_LESSONS === 20);
  ok('lessonsData holds 20 lessons', lessonsData.length === 20);
  ok('the registry holds a journey for each', LESSON_JOURNEY_IDS.length === 20);
  ok('every lesson resolves to a journey', lessonsData.every(l => !!getLessonJourneyDefinition(l.id)));
  ok('numbers run 1..20 with no gap and no repeat',
    JSON.stringify(lessonsData.map(l => l.number)) === JSON.stringify([...Array(20)].map((_, i) => i + 1)));
  ok('array order matches lesson number', lessonsData.every((l, i) => l.number === i + 1));
  ok('lesson ids are unique', new Set(lessonsData.map(l => l.id)).size === 20);
  ok('every lesson belongs to a declared track', lessonsData.every(l => LESSON_TRACKS.some(t => t.id === l.track)));
  ok('no track is empty', LESSON_TRACKS.every(t => groupLessonsByTrack(lessonsData).some(g => g.id === t.id && g.lessons.length > 0)));
  ok('grouping loses no lesson', groupLessonsByTrack(lessonsData).reduce((n, g) => n + g.lessons.length, 0) === 20);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2] THE SAFETY SEQUENCE — power-up, then motor test props-off, then propellers, then flight');
{
  ok('first power-up comes before the configuration lesson', numberOf(POWER_UP) < numberOf(BETAFLIGHT));
  ok('the motor test comes before the propeller lesson', numberOf(BETAFLIGHT) < numberOf(PROPELLERS));
  ok('the propeller lesson comes before the first flight', numberOf(PROPELLERS) < numberOf(FIRST_FLIGHT));
  ok('and the first flight is last', numberOf(FIRST_FLIGHT) === TOTAL_LESSONS);

  // The inversion this whole phase exists to prevent: propellers taught before
  // the tests that spin motors.
  ok('NO lesson teaches propeller fitting before the motor test',
    lessonsData.filter(l => /تركيب المروحة|تركّب مروحة على|صامولة/.test(textOf(l.id)))
      .every(l => l.number >= numberOf(BETAFLIGHT)));

  // …and its mirror: the motor test must not drift after the propellers.
  const motorTestLessons = lessonsData.filter(l => (getLessonJourneyDefinition(l.id)!.stages
    .filter((s): s is InteractiveDiagramStage => s.type === 'interactive_diagram'))
    .some(s => s.diagramType === 'motor-test-check'));
  ok('exactly one lesson runs the motor test', motorTestLessons.length === 1);
  ok('and it is before the propeller lesson', motorTestLessons[0].number < numberOf(PROPELLERS));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3] PROPS OFF is stated by every lesson that can spin a motor — and only after it is needed');
{
  for (const id of [POWER_UP, BETAFLIGHT]) {
    const lesson = byId(id);
    ok(`${id}: the lesson-level warning names propeller removal`, /مراوح.{0,14}منزوعة|أزل جميع المراوح|لا تُركّب مروحة/.test(lesson.warning ?? ''));
    ok(`${id}: a danger callout carries the rule too`,
      getLessonJourneyDefinition(id)!.stages.some(s => s.type === 'callout' && s.tone === 'danger' && /مراوح/.test(s.body)));
  }
  // The propeller lesson is where they finally go on — so its rule is the
  // opposite one: fit them at the field, take them off for bench work.
  ok('the propeller lesson moves the rule rather than dropping it',
    /تُنزع قبل أي عمل على الطاولة/.test(textOf(PROPELLERS)));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[4] FIRST FLIGHT depends on what the new lessons proved');
{
  const flight = textOf(FIRST_FLIGHT);
  // Lesson 20 was renumbered, not rewritten — these references existed before
  // and were dangling. They must now resolve to real, EARLIER lessons.
  ok('the first-flight lesson still references the motors tab', /تبويب Motors/.test(flight));
  ok('…and a lesson that teaches it now exists earlier', /تبويب المحركات/.test(textOf(BETAFLIGHT)) && numberOf(BETAFLIGHT) < numberOf(FIRST_FLIGHT));
  ok('the first-flight lesson still references a failsafe test', /failsafe|الـfailsafe/i.test(flight));
  ok('…and the failsafe test is taught earlier, on the ground', /أطفئ جهاز الإرسال/.test(textOf(BETAFLIGHT)) && numberOf(BETAFLIGHT) < numberOf(FIRST_FLIGHT));
  ok('the first-flight lesson still says propellers go on last', /المراوح/.test(flight));
  ok('…and the propeller lesson is earlier', numberOf(PROPELLERS) < numberOf(FIRST_FLIGHT));
  ok('arming is set up before the lesson that uses it', /مفتاح/.test(textOf(BETAFLIGHT)) && numberOf(BETAFLIGHT) < numberOf(FIRST_FLIGHT));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[5] KV: introduced once, then practised, retrieved and applied — in that order');
{
  const KV_LESSONS = lessonsData.filter(l => /KV/.test(textOf(l.id)) || /KV/.test(l.explanation));
  const numbers = KV_LESSONS.map(l => l.number).sort((a, b) => a - b);
  console.log(`      KV appears in lessons: ${numbers.join(', ')}`);

  const INTRODUCE = 4, PRACTISE = 5, RETRIEVE = 12, APPLY = 19;
  ok('KV is introduced in lesson 4', numbers.includes(INTRODUCE));
  ok('KV is never used before it is introduced', Math.min(...numbers) === INTRODUCE);
  // The per-volt definition belongs to lesson 4, and lesson 12 repeats it on
  // purpose — retrieval means meeting it again on a part in your hand. What
  // must NOT happen is the apply lesson re-teaching it: at that point the
  // learner uses KV inside a decision, and a fourth definition would mean the
  // spiral never actually left the first step.
  const defines = lessonsData.filter(l => /لكل فولت/.test(textOf(l.id))).map(l => l.number);
  ok('lesson 4 states the per-volt definition', defines.includes(INTRODUCE));
  ok('lesson 12 restates it on a real motor — that is what retrieval is', defines.includes(RETRIEVE));
  ok('the apply lesson does NOT re-define it', !defines.includes(APPLY));
  ok('and nothing before lesson 4 defines it', Math.min(...defines) === INTRODUCE);
  ok('lesson 5 practises it', numbers.includes(PRACTISE));
  ok('lesson 12 retrieves it off a real motor', numbers.includes(RETRIEVE) && /مطبوع عليه/.test(textOf('lesson-motor-install')));
  ok('lesson 19 applies it inside a decision', numbers.includes(APPLY));
  ok('the four steps are in ascending order', [INTRODUCE, PRACTISE, RETRIEVE, APPLY].every((n, i, a) => i === 0 || a[i - 1] < n));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[6] Progress survives the renumbering: identity is the id, never the number');
{
  ok('no lesson id contains its own number', lessonsData.every(l => !new RegExp(`\\b${l.number}\\b`).test(l.id)));
  ok('the renumbered lesson kept its id', byId(FIRST_FLIGHT).id === 'lesson-stick-control-first-flight');
  ok('…and its journey kept every stage id', (() => {
    const def = getLessonJourneyDefinition(FIRST_FLIGHT)!;
    return def.stages.some(s => s.id === 'orientation') && def.stages.some(s => s.id === 'completion')
      && def.stages.some(s => s.id === 'preFlightChecklist');
  })());

  // A learner who finished it as lesson 17 stored its ID. Simulate that.
  const storedBeforeRenumber = ['lesson-quadcopter-intro', 'lesson-stick-control-first-flight'];
  ok('a progress record written before the renumbering still resolves',
    storedBeforeRenumber.every(id => !!lessonsData.find(l => l.id === id)));
  ok('…and still resolves to a journey', storedBeforeRenumber.every(id => !!getLessonJourneyDefinition(id)));
  ok('the completion percentage moves with the new total, not the old one',
    Math.round((storedBeforeRenumber.length / TOTAL_LESSONS) * 100) === 10);

  // Every checkpoint id in the section is unique, so a stored answer can never
  // be read back against a different question.
  const cpIds = lessonsData.flatMap(l => getLessonJourneyDefinition(l.id)!.stages
    .filter((s): s is CheckpointStage => s.type === 'checkpoint').map(s => s.checkpoint.id));
  ok(`all ${cpIds.length} checkpoint ids are unique across the whole section`, new Set(cpIds).size === cpIds.length);
  const stageIds = lessonsData.flatMap(l => getLessonJourneyDefinition(l.id)!.stages.map(s => s.id));
  ok('stage ids are unique WITHIN each lesson', lessonsData.every(l => {
    const ids = getLessonJourneyDefinition(l.id)!.stages.map(s => s.id);
    return new Set(ids).size === ids.length;
  }));
  ok(`the section has ${stageIds.length} stages in total`, stageIds.length > 0);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[7] The five stations read in path order');
{
  const groups = groupLessonsByTrack(lessonsData);
  ok('five stations', groups.length === 5);
  ok('stations are in path order',
    JSON.stringify(groups.map(g => g.id)) === JSON.stringify(['basics', 'power-safety', 'assembly', 'setup', 'flight']));
  ok('the setup station holds the two lessons between building and flying',
    JSON.stringify(groups[3].lessons.map(l => l.id)) === JSON.stringify([POWER_UP, BETAFLIGHT]));
  ok('the flight station holds the propellers and the first flight',
    JSON.stringify(groups[4].lessons.map(l => l.id)) === JSON.stringify([PROPELLERS, FIRST_FLIGHT]));
  ok('every station\'s lessons are in ascending number order',
    groups.every(g => g.lessons.every((l, i, a) => i === 0 || a[i - 1].number < l.number)));
}

console.log(`\nAll ${passed} assertions passed.`);
