import { useLocalStorage } from './useLocalStorage';
import { STORAGE_KEYS } from '../utils/storageKeys';
import type { LastOpenedState } from '../types';
import { TOTAL_LESSONS } from '../data/lessonsData';
import { TOTAL_ROADMAP_STEPS, ROADMAP_STEP_IDS } from '../data/roadmapData';
import { TOTAL_CHECKLIST_ITEMS } from '../data/checklistsData';

/**
 * @deprecated Use useProgressContext() from contexts/ProgressContext instead.
 * This hook is the internal implementation called by ProgressProvider.
 * Direct use creates isolated state that does not sync across components.
 */
export function useProgress() {
  const [completedLessons, setCompletedLessons] = useLocalStorage<string[]>(STORAGE_KEYS.PROGRESS_LESSONS, []);
  const [completedRoadmapSteps, setCompletedRoadmapSteps] = useLocalStorage<string[]>(STORAGE_KEYS.PROGRESS_ROADMAP, []);
  const [checklists, setChecklists] = useLocalStorage<Record<string, string[]>>(STORAGE_KEYS.CHECKLISTS, {});
  const [lastOpened, setLastOpened] = useLocalStorage<LastOpenedState>(STORAGE_KEYS.LAST_OPENED, {});
  const [safetySeen, setSafetySeen] = useLocalStorage<boolean>(STORAGE_KEYS.SAFETY_SEEN, false);
  const [hasStarted, setHasStarted] = useLocalStorage<boolean>(STORAGE_KEYS.HAS_STARTED, false);

  const validCompletedRoadmapSteps = completedRoadmapSteps.filter(id => ROADMAP_STEP_IDS.has(id));
  const lessonPct = TOTAL_LESSONS > 0 ? (completedLessons.length / TOTAL_LESSONS) * 100 : 0;
  const roadmapPct = TOTAL_ROADMAP_STEPS > 0 ? (validCompletedRoadmapSteps.length / TOTAL_ROADMAP_STEPS) * 100 : 0;
  const completedChecklistItems = Object.values(checklists).reduce((s, items) => s + items.length, 0);
  const checklistPct = TOTAL_CHECKLIST_ITEMS > 0 ? (completedChecklistItems / TOTAL_CHECKLIST_ITEMS) * 100 : 0;
  const overallProgress = Math.round(lessonPct * 0.4 + roadmapPct * 0.4 + checklistPct * 0.2);

  const completeLesson = (id: string) => setCompletedLessons(prev => prev.includes(id) ? prev : [...prev, id]);
  const completeRoadmapStep = (id: string) => setCompletedRoadmapSteps(prev => prev.includes(id) ? prev : [...prev, id]);
  const toggleChecklistItem = (groupId: string, itemId: string) => {
    setChecklists(prev => {
      const g = prev[groupId] || [];
      return { ...prev, [groupId]: g.includes(itemId) ? g.filter(i => i !== itemId) : [...g, itemId] };
    });
  };
  const isChecklistItemDone = (groupId: string, itemId: string) => (checklists[groupId] || []).includes(itemId);
  const getChecklistGroupProgress = (groupId: string, total: number) => {
    const done = (checklists[groupId] || []).length;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };
  const getRoadmapStepProgress = (stepId: string, totalItems: number) => {
    // Progress based on checklist for this roadmap step
    const done = (checklists[`roadmap-${stepId}`] || []).length;
    return totalItems > 0 ? Math.round((done / totalItems) * 100) : 0;
  };
  const toggleRoadmapChecklistItem = (stepId: string, itemIndex: number) => {
    const key = `roadmap-${stepId}`;
    const itemId = `item-${itemIndex}`;
    setChecklists(prev => {
      const g = prev[key] || [];
      return { ...prev, [key]: g.includes(itemId) ? g.filter(i => i !== itemId) : [...g, itemId] };
    });
  };
  const isRoadmapItemDone = (stepId: string, itemIndex: number) => {
    return (checklists[`roadmap-${stepId}`] || []).includes(`item-${itemIndex}`);
  };
  const setLastOpenedLesson = (id: string) => setLastOpened(prev => ({ ...prev, lessonId: id }));
  const setLastOpenedRoadmapStep = (id: string) => setLastOpened(prev => ({ ...prev, roadmapStepId: id }));
  const resetLessons = () => setCompletedLessons([]);
  const resetRoadmap = () => setCompletedRoadmapSteps([]);
  const resetChecklists = () => setChecklists({});
  const resetContactMessages = () => {
    try { localStorage.removeItem(STORAGE_KEYS.CONTACT_MESSAGES); } catch { /* localStorage unavailable */ }
  };
  const resetAll = () => {
    setCompletedLessons([]);
    setCompletedRoadmapSteps([]);
    setChecklists({});
    setLastOpened({});
    resetContactMessages();
  };

  return {
    completedLessons, completedRoadmapSteps: validCompletedRoadmapSteps, checklists, lastOpened,
    safetySeen, hasStarted,
    overallProgress,
    lessonProgress: Math.round(lessonPct), roadmapProgress: Math.round(roadmapPct), checklistProgress: Math.round(checklistPct),
    totalLessons: TOTAL_LESSONS, totalRoadmapSteps: TOTAL_ROADMAP_STEPS,
    totalChecklistItems: TOTAL_CHECKLIST_ITEMS, completedChecklistItems,
    completeLesson, completeRoadmapStep, toggleChecklistItem, isChecklistItemDone, getChecklistGroupProgress,
    getRoadmapStepProgress, toggleRoadmapChecklistItem, isRoadmapItemDone,
    setLastOpenedLesson, setLastOpenedRoadmapStep,
    setSafetySeen, setHasStarted, resetLessons, resetRoadmap, resetChecklists, resetContactMessages, resetAll,
  };
}

export type UseProgressReturn = ReturnType<typeof useProgress>;
