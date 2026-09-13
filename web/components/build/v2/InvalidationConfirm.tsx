'use client';

import React, { useEffect, useRef } from 'react';
import { INVALIDATION } from './copy';

/**
 * THE QUESTION THAT HAS TO BE ASKED BEFORE THE WORK IS THROWN AWAY
 * ================================================================
 *
 * One decision, on one surface, with a real way out.
 *
 * NOT `window.confirm`. The native dialog cannot be styled, cannot be read in
 * Arabic in the page's own direction, cannot show a list, and on a phone it
 * arrives as an OS alert with the site's hostname attached — which reads as
 * something going wrong rather than as a question the journey is asking.
 *
 * NOT A CLICKABLE DIV EITHER
 * --------------------------
 * `role="dialog"` + a labelled heading + a description, and two REAL buttons.
 * A screen-reader user arriving here has to be told this is a question and
 * what it is about, and a keyboard user has to be able to answer it without a
 * mouse — including with Escape, which everybody expects to mean «no».
 *
 * WHY FOCUS IS MOVED, AND WHY PUTTING IT BACK IS THE CALLER'S JOB
 * ---------------------------------------------------------------
 * The reader pressed a card. If focus stays there while a dialog opens, a
 * screen reader is describing a dialog the user is not in and Tab walks the
 * page behind it. So focus enters the dialog on open.
 *
 * Putting it back is NOT done here, and the first attempt that tried failed
 * for an instructive reason: this surface REPLACES the question it is about,
 * so the control that opened it is unmounted while the dialog is up. Holding a
 * reference to that node and calling `.focus()` on cancel focuses a detached
 * element — silently, with no error, and the reader lands on `<body>`.
 *
 * So the caller is told WHICH control to restore, by its stable test id, and
 * restores it after the question has been re-rendered. `BuildV2Preview` owns
 * that because it owns the re-render.
 *
 * A NON-MODAL DIALOG, AND IT SAYS SO
 * ----------------------------------
 * There is no focus TRAP here, and none is wanted. A trap that is wrong is
 * worse than none — it strands a keyboard user in a box they cannot leave —
 * and this surface already has three exits (both buttons and Escape). Nor is
 * the rest of the page `inert`: this is a panel IN THE FLOW that replaces the
 * question it is about, not an overlay floating above a still-live page.
 *
 * So it must not carry `aria-modal="true"`, and an earlier version did.
 *
 * That attribute is not decoration. It tells assistive technology that
 * everything outside this element is unavailable — and here it was false in
 * the plainest way: Shift+Tab out of «إلغاء» lands on the preview's own link,
 * outside the dialog, exactly as it should for a panel in the flow. A screen
 * reader that trusts `aria-modal` may confine its virtual cursor to the
 * dialog, so the reader is told the page behind is gone while their keyboard
 * walks straight into it. Claiming a behaviour and not implementing it is
 * worse than claiming nothing: it makes the page's own description of itself
 * something the reader cannot rely on.
 *
 * `role="dialog"` without `aria-modal` is exactly right for this — it is
 * announced as a dialog, named and described, and nothing is promised about
 * the rest of the page. `BuildWizard` reached the same conclusion for its own
 * in-flow confirmation and writes `aria-modal="false"`.
 *
 * `scripts/testBuildV2E2E.ts` holds the line in the only way that means
 * anything: it measures that focus CAN leave this surface, and asserts the
 * attribute agrees. The claim and the behaviour are checked against each
 * other, so re-adding the attribute fails until the behaviour changes too.
 */
export interface DroppedLine {
  /** Stable key and machine hook. Never rendered. */
  category: string;
  /** The category's Arabic name — always present; the model refuses otherwise. */
  categoryAr: string;
  /** The part's Arabic name, when the id still resolves in the catalogue. */
  partAr?: string;
}

export const InvalidationConfirm: React.FC<{
  lines: readonly DroppedLine[];
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ lines, onConfirm, onCancel }) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    /*
     * «إلغاء» takes focus, not «متابعة».
     *
     * The destructive answer must never be one Enter away from a reader who is
     * moving quickly. Opening on the safe answer means a stray keypress costs
     * nothing, which is the whole reason this dialog exists.
     */
    cancelRef.current?.focus();
  }, []);

  return (
    <div
      role="dialog"
      aria-labelledby="v2-invalidation-title"
      aria-describedby="v2-invalidation-lead"
      data-testid="v2-invalidation-confirm"
      onKeyDown={e => {
        if (e.key === 'Escape') { e.stopPropagation(); onCancel(); }
      }}
      className="card-sm"
      style={{
        // A panel in the flow, not a fixed overlay. At 390px a centred modal
        // with its own scroll container is how horizontal overflow gets built;
        // this is the same column everything else on the screen lives in.
        display: 'grid', gap: 11, padding: '15px 16px',
        borderColor: 'var(--sev-warning)',
        maxWidth: '100%',
      }}
    >
      <strong id="v2-invalidation-title" data-testid="v2-invalidation-title"
        style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--sev-warning)' }}>
        {INVALIDATION.title}
      </strong>

      <p id="v2-invalidation-lead" style={{
        margin: 0, fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.9,
      }}>
        {INVALIDATION.lead}
      </p>

      {/*
        THE PARTS, BY NAME.

        «سيُلغى اختيارك» with nothing under it asks the reader to remember what
        they picked in order to judge whether they mind. Every row names the
        category and the part, so the decision can be made from the screen.
      */}
      <ul data-testid="v2-invalidation-list"
        style={{ margin: 0, paddingInlineStart: 18, display: 'grid', gap: 5 }}>
        {lines.map(l => (
          <li key={l.category} data-testid={`v2-invalidation-line-${l.category}`}
            style={{ fontSize: 13, lineHeight: 1.85 }}>
            <span style={{ color: 'var(--text-dim)' }}>{l.categoryAr}: </span>
            <span style={{ fontWeight: 800 }}>{l.partAr ?? INVALIDATION.unnamedPart}</span>
          </li>
        ))}
      </ul>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {/*
          Cancel is FIRST in the DOM, so it is first in the tab order and first
          under a thumb at 390px. The ordering is the same argument as the
          initial focus above: the answer that costs nothing should be the
          easiest one to reach.
        */}
        <button
          ref={cancelRef}
          type="button"
          className="btn-ghost"
          data-testid="v2-invalidation-cancel"
          onClick={onCancel}
          style={{ minHeight: 44, padding: '11px 20px', fontSize: 14, fontWeight: 800 }}
        >
          {INVALIDATION.cancel}
        </button>
        <button
          type="button"
          className="btn-primary"
          data-testid="v2-invalidation-confirm-button"
          onClick={onConfirm}
          style={{ minHeight: 44, padding: '11px 20px', fontSize: 14, fontWeight: 800 }}
        >
          {INVALIDATION.confirm}
        </button>
      </div>
    </div>
  );
};
