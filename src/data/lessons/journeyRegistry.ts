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

const journeysByLessonId: Record<string, LessonJourneyDefinition> = {
  [lesson01JourneyDefinition.lessonId]: lesson01JourneyDefinition,
  [lesson02JourneyDefinition.lessonId]: lesson02JourneyDefinition,
  [lesson03JourneyDefinition.lessonId]: lesson03JourneyDefinition,
};

export function getLessonJourneyDefinition(lessonId: string): LessonJourneyDefinition | undefined {
  return journeysByLessonId[lessonId];
}
