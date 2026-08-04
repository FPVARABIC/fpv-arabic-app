'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { webHref } from '@/lib/webRoutes';

/**
 * Answers `?topic=` on a centre's index by sending the reader to the topic.
 *
 * WHY THIS IS A REDIRECT RATHER THAN A SECOND WAY TO RENDER THE PAGE
 * ------------------------------------------------------------------
 * A topic already has an address: `/programming/edgetx/model-setup`, which is
 * what `resolveDestination` returns and what every card on the index links to.
 * If `?topic=` ALSO rendered content, one screen would have two URLs, a crawler
 * would index both, and a reader sharing the one they happened to have would
 * spread whichever they got. So `?topic=` is accepted — people write it by hand
 * and paste it into chat — and immediately replaced with the canonical path.
 *
 * `router.replace` rather than `push`: the query form is not a place anybody
 * meant to be, and leaving it in history means the back button walks through a
 * redirect.
 *
 * WHY A SETTING ID WORKS TOO
 * --------------------------
 * The topic index is flat over both screens and the individual settings inside
 * them, so `?topic=subtrim` lands on that row's anchor rather than on a page of
 * fourteen rows with no clue which one was meant. An unknown topic is left
 * alone: the reader stays on the index, which is a complete answer to "I do not
 * know what that is", where a 404 is not.
 */
export const TopicRedirect: React.FC<{
  param: string;
  entries: { id: string; pageId: string; anchor?: string }[];
}> = ({ param, entries }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get(param);

  useEffect(() => {
    if (!requested) return;
    const match = entries.find(e => e.id === requested);
    if (!match) return;
    const base = webHref({ kind: 'edgetx', id: match.pageId }).href;
    if (!base) return;
    router.replace(match.anchor ? `${base}#${match.anchor}` : base);
  }, [requested, entries, router]);

  return null;
};
