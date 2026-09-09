'use client';

import React, { useSyncExternalStore } from 'react';
import { BUILD_V2_PREVIEW_PARAM, isBuildV2Preview } from '@/lib/build/v2/previewFlag';
import { BuildV2Preview } from './BuildV2Preview';

/**
 * THE ONE PLACE V2 CAN REPLACE V1 — AND ONLY WHEN ASKED BY NAME.
 *
 * `/build` stays exactly what it is. This wraps the page's existing content as
 * `children` and renders it unchanged unless the reader explicitly passed
 * `?buildV2=1`. Nothing links here: not the nav, not the home page, not the
 * site map. A visitor reaches the preview only by typing the flag.
 *
 * WHY NOT `useSearchParams`
 * ------------------------
 * It was the obvious choice and was measurably wrong here. `/build` is
 * STATICALLY PRERENDERED, so that hook makes the subtree bail out to client
 * rendering: React replaced the server-rendered V1 landing with the Suspense
 * fallback until hydration finished, and a browser test caught an EMPTY
 * `/build` — no doors, no links — on the normal, unflagged page. A blank flash
 * on the real product, to serve a preview nobody has been shown yet.
 *
 * WHY `useSyncExternalStore` AND NOT AN EFFECT
 * --------------------------------------------
 * The query string is browser state that React does not own, which is exactly
 * what this hook is for. `getServerSnapshot` returns `false`, so the server
 * renders V1 and hydration matches it byte for byte; the real query is read
 * immediately afterwards, and only then — and only for the one person who
 * typed the flag — does anything swap.
 *
 * The first version did this with `useEffect` + `setState`, which works and
 * which the React lint rule correctly objects to: a state write in an effect
 * body is a cascading render, and here it was standing in for a subscription
 * that the platform already offers.
 *
 * The trade is unchanged: the preview paints a frame after hydration. For a
 * hidden, temporary preview that is the correct side to be slow on.
 *
 * TEMPORARY. See `lib/build/v2/previewFlag.ts` for what to delete at cutover.
 */

/**
 * The flag never changes without a navigation, and `popstate` is the only one
 * that can change it without remounting this component — back and forward
 * between `/build` and `/build?buildV2=1`.
 */
const subscribe = (onChange: () => void) => {
  window.addEventListener('popstate', onChange);
  return () => window.removeEventListener('popstate', onChange);
};

const readFlag = () =>
  isBuildV2Preview(new URLSearchParams(window.location.search).get(BUILD_V2_PREVIEW_PARAM));

/** On the server, and during hydration, there is no preview. There is V1. */
const noPreview = () => false;

export const BuildV2PreviewGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const showPreview = useSyncExternalStore(subscribe, readFlag, noPreview);
  return showPreview ? <BuildV2Preview /> : <>{children}</>;
};
