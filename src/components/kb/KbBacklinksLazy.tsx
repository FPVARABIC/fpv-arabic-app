import React, { Suspense, lazy } from 'react';
import type { KbLinkKind } from '../../data/kb/types';

/**
 * Lazy wrapper around `KbBacklinks`.
 *
 * WHY THIS INDIRECTION EXISTS — it is not ceremony.
 * `KbBacklinks` reaches the KB registry, which pulls in every authored article.
 * Importing it directly from `LessonDetailView` / `BetaflightDetailView` (both
 * eagerly loaded) put ~410 KB of encyclopedia prose into the app's initial
 * bundle, measured as a +275 KB regression against the pre-change baseline even
 * for a user who never opens a lesson.
 *
 * Deferring the import moves that cost to the moment a lesson or Betaflight
 * page is actually rendered. The fallback is deliberately `null`: this is a
 * supplementary "read more" strip at the bottom of an already-complete page, so
 * a spinner there would be noise, and it simply appears once loaded.
 */
const Inner = lazy(() => import('./KbBacklinks').then(m => ({ default: m.KbBacklinks })));

export const KbBacklinksLazy: React.FC<{ kind: KbLinkKind; targetId: string; tone?: 'light' | 'dark' }> = props => (
  <Suspense fallback={null}>
    <Inner {...props} />
  </Suspense>
);
