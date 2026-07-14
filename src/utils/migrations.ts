import { STORAGE_KEYS } from './storageKeys';

const LESSON_ID_MAP: Readonly<Record<string, string>> = {
  'lesson-1':  'lesson-quadcopter-intro',
  'lesson-2':  'lesson-quadcopter-how-it-works',
  'lesson-3':  'lesson-drone-parts',
  'lesson-4':  'lesson-define-goal',
  'lesson-5':  'lesson-drone-size',
  'lesson-6':  'lesson-electricity-basics',
  'lesson-7':  'lesson-lipo-batteries',
  'lesson-8':  'lesson-power-rails',
  'lesson-9':  'lesson-tx-rx',
  'lesson-10': 'lesson-pre-battery-safety',
  'lesson-11': 'lesson-frame-assembly',
  'lesson-12': 'lesson-motor-install',
  'lesson-13': 'lesson-esc-install',
  'lesson-14': 'lesson-fc-install',
  'lesson-15': 'lesson-receiver-install',
  'lesson-16': 'lesson-video-system',
};

function migrateId(id: string): string {
  return LESSON_ID_MAP[id] ?? id;
}

export function runMigrations(): void {
  try {
    if (localStorage.getItem(STORAGE_KEYS.MIGRATION_V1) === 'true') return;
  } catch {
    return;
  }

  // Migrate fpv_progress_lessons
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROGRESS_LESSONS);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const migrated = (parsed as string[]).map(migrateId);
        localStorage.setItem(STORAGE_KEYS.PROGRESS_LESSONS, JSON.stringify(migrated));
      }
    }
  } catch {
    console.warn('[migrations] v1: failed to parse fpv_progress_lessons — skipping');
  }

  // Migrate fpv_last_opened
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LAST_OPENED);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed !== null && typeof parsed === 'object') {
        const obj = parsed as { lessonId?: string; roadmapStepId?: string };
        if (typeof obj.lessonId === 'string') {
          obj.lessonId = migrateId(obj.lessonId);
        }
        localStorage.setItem(STORAGE_KEYS.LAST_OPENED, JSON.stringify(obj));
      }
    }
  } catch {
    console.warn('[migrations] v1: failed to parse fpv_last_opened — skipping');
  }

  localStorage.setItem(STORAGE_KEYS.MIGRATION_V1, 'true');
  console.info('[migrations] v1: lesson IDs migrated to semantic format');
}
