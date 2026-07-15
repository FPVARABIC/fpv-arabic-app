import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { bfPageRegistry } from '../data/betaflight/pageRegistry';
import { BF_VERSION_CONTEXT } from '../data/betaflight/sourceHelpers';
import { BetaflightHubRenderer } from '../components/betaflight/BetaflightHubRenderer';

/**
 * Live Betaflight hub — a thin wrapper around `BetaflightHubRenderer`,
 * driven by the real 26-page `bfPageRegistry` (not the legacy 10-article
 * `betaflightData` array, which now only backs old deep-linked URLs that
 * `BetaflightDetailView.tsx` still honors for compatibility).
 */
export const BetaflightView: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AppShell tint="purple">
      <Header title="Betaflight بالعربي" />
      <BetaflightHubRenderer
        entries={bfPageRegistry}
        versionContext={BF_VERSION_CONTEXT}
        onOpenPage={id => navigate(`/betaflight/${id}`)}
      />
    </AppShell>
  );
};
