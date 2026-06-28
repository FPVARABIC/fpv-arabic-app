import React, { createContext, useContext, useState, useCallback } from 'react';

interface BotOverlayContextValue {
  isOpen: boolean;
  openBot: () => void;
  closeBot: () => void;
  toggleBot: () => void;
}

const BotOverlayContext = createContext<BotOverlayContextValue | undefined>(undefined);

export const BotOverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openBot  = useCallback(() => setIsOpen(true), []);
  const closeBot = useCallback(() => setIsOpen(false), []);
  const toggleBot = useCallback(() => setIsOpen(o => !o), []);

  return (
    <BotOverlayContext.Provider value={{ isOpen, openBot, closeBot, toggleBot }}>
      {children}
    </BotOverlayContext.Provider>
  );
};

export const useBotOverlay = (): BotOverlayContextValue => {
  const ctx = useContext(BotOverlayContext);
  if (!ctx) throw new Error('useBotOverlay must be used within BotOverlayProvider');
  return ctx;
};
