import React, { createContext, useCallback, useContext } from 'react';
import { useProgress, type UseProgressReturn } from '../hooks/useProgress';

type ProgressContextValue = UseProgressReturn & {
  isReady: boolean;
  isLoading: boolean;
  mergeGuestProgress: (userId: string) => Promise<void>;
};

const ProgressContext = createContext<ProgressContextValue | undefined>(undefined);

export const ProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const progress = useProgress();

  const mergeGuestProgress = useCallback((_userId: string): Promise<void> => {
    // Phase 3: read fpv_progress_* from localStorage, write to Firestore under userId, then clear local storage keys.
    console.warn(
      '[ProgressContext] mergeGuestProgress called but not yet implemented. ' +
      'Implement in Phase 3 (Firebase integration).'
    );
    return Promise.resolve();
  }, []);

  const value: ProgressContextValue = {
    ...progress,
    isReady: true,
    isLoading: false,
    mergeGuestProgress,
  };

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
};

export const useProgressContext = (): ProgressContextValue => {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgressContext must be used within ProgressProvider');
  return ctx;
};

export type { ProgressContextValue };
