/**
 * Central registry of lessons that have an approved interactive
 * LessonJourneyDefinition. LessonDetailView looks lessons up here instead of
 * scattering `lesson.id === '...'` checks — adding a journey for another
 * lesson later means registering it here, not touching the view.
 */
import type { LessonJourneyDefinition } from '../../types/lessonJourney';
import { lesson01JourneyDefinition } from './lesson01Journey.definition';
import { lesson02JourneyDefinition } from './lesson02Journey.definition';
import { lesson03JourneyDefinition } from './lesson03Journey.definition';
import { lesson04JourneyDefinition } from './lesson04Journey.definition';
import { lesson05JourneyDefinition } from './lesson05Journey.definition';
import { lesson06JourneyDefinition } from './lesson06Journey.definition';
import { lesson07JourneyDefinition } from './lesson07Journey.definition';
import { lesson08JourneyDefinition } from './lesson08Journey.definition';
import { lesson09JourneyDefinition } from './lesson09Journey.definition';
import { lesson10JourneyDefinition } from './lesson10Journey.definition';
import { lesson11JourneyDefinition } from './lesson11Journey.definition';
import { lesson12JourneyDefinition } from './lesson12Journey.definition';
import { lesson13JourneyDefinition } from './lesson13Journey.definition';
import { lesson14JourneyDefinition } from './lesson14Journey.definition';
import { lesson15JourneyDefinition } from './lesson15Journey.definition';
import { lesson16JourneyDefinition } from './lesson16Journey.definition';
import { lesson17JourneyDefinition } from './lesson17Journey.definition';

const journeysByLessonId: Record<string, LessonJourneyDefinition> = {
  [lesson01JourneyDefinition.lessonId]: lesson01JourneyDefinition,
  [lesson02JourneyDefinition.lessonId]: lesson02JourneyDefinition,
  [lesson03JourneyDefinition.lessonId]: lesson03JourneyDefinition,
  [lesson04JourneyDefinition.lessonId]: lesson04JourneyDefinition,
  [lesson05JourneyDefinition.lessonId]: lesson05JourneyDefinition,
  [lesson06JourneyDefinition.lessonId]: lesson06JourneyDefinition,
  [lesson07JourneyDefinition.lessonId]: lesson07JourneyDefinition,
  [lesson08JourneyDefinition.lessonId]: lesson08JourneyDefinition,
  [lesson09JourneyDefinition.lessonId]: lesson09JourneyDefinition,
  [lesson10JourneyDefinition.lessonId]: lesson10JourneyDefinition,
  [lesson11JourneyDefinition.lessonId]: lesson11JourneyDefinition,
  [lesson12JourneyDefinition.lessonId]: lesson12JourneyDefinition,
  [lesson13JourneyDefinition.lessonId]: lesson13JourneyDefinition,
  [lesson14JourneyDefinition.lessonId]: lesson14JourneyDefinition,
  [lesson15JourneyDefinition.lessonId]: lesson15JourneyDefinition,
  [lesson16JourneyDefinition.lessonId]: lesson16JourneyDefinition,
  [lesson17JourneyDefinition.lessonId]: lesson17JourneyDefinition,
};

export function getLessonJourneyDefinition(lessonId: string): LessonJourneyDefinition | undefined {
  return journeysByLessonId[lessonId];
}

/**
 * Every lesson id, in registry order.
 *
 * Exported so a surface that needs to OFFER a lesson — the projects admin
 * panel, where a prerequisite may point at one — can list them without
 * importing the map and reading its keys. A caller that reads the keys is a
 * caller that could also write to it.
 */
export const LESSON_JOURNEY_IDS: readonly string[] = Object.keys(journeysByLessonId);
