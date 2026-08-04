'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Lands a `?topic=<settingId>` link on the setting itself.
 *
 * WHY THIS EXISTS SEPARATELY FROM THE HUB'S REDIRECT
 * --------------------------------------------------
 * The search index already emits `/programming/edgetx/model-setup?topic=internal-state`
 * for every individual setting — because someone searching «Subtrim» wants that
 * row, and dropping them on a screen of fourteen rows makes them search again.
 * Without this component that URL resolves to the right PAGE and then ignores
 * the parameter, which is the exact failure the per-setting indexing was built
 * to prevent.
 *
 * The hub's `TopicRedirect` answers the other shape: `?topic=` on the index,
 * where the parameter selects which page to go to at all. Same parameter name,
 * two jobs, because the index emits both forms.
 *
 * A brief outline rather than a permanent highlight: the reader needs to see
 * WHICH of fourteen rows was meant, and a marker that never fades becomes a
 * decoration they stop reading.
 */
export const SettingFocus: React.FC = () => {
  const searchParams = useSearchParams();
  const requested = searchParams.get('topic');

  useEffect(() => {
    if (!requested) return;
    const el = document.getElementById(`setting-${requested}`);
    if (!el) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    el.setAttribute('data-focused', 'true');
    const timer = window.setTimeout(() => el.removeAttribute('data-focused'), 2600);
    return () => window.clearTimeout(timer);
  }, [requested]);

  return null;
};
