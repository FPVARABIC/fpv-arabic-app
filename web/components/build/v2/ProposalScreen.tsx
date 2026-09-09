'use client';

import React, { useMemo } from 'react';
import type { BasePart } from '@core/data/assembly/types';
import type { ProposedBuild } from '@core/data/assembly/recommendation/types';
import { PART_CATEGORY_MAP } from '@core/data/project/store';
import { PROPOSAL } from './copy';
import { arabicCount, CHOICE_NOUN } from './arabicCount';
import { proposalBurdenAr, proposalView, type DecisionGroup } from './proposalModel';
import { ProposalCategoryCard } from './ProposalCategoryCard';

/**
 * «هذا البناء المقترح لك» — THE FIRST TIME V2 SHOWS A PART
 * ========================================================
 *
 * The engine has been able to return these decisions since Phase 2A. What was
 * missing was a way to show them that does not become the thing this journey
 * replaced: eight equally loud cards, every spec key, a green tick per rule,
 * and a «complete» claim over the top.
 *
 * So the screen is ordered by what the reader has to DO. The categories that
 * need them come first and open; the ones the system settled are compact rows
 * that expand. The counts in the headline are derived, the reasons are the
 * engine's, and the candidate lists carry no selection at all — see
 * `proposalModel.ts` for why that last one is a domain limit rather than an
 * omission.
 */

/** Candidate ids resolve against the same catalogue the engine ranked. */
function useCatalogue(): Readonly<Record<string, BasePart>> {
  return useMemo(() => {
    const byId: Record<string, BasePart> = {};
    for (const list of Object.values(PART_CATEGORY_MAP)) {
      for (const p of list) byId[p.id] = p;
    }
    return byId;
  }, []);
}

const GROUP_ORDER: readonly DecisionGroup[] = ['needs-you', 'system-decided', 'yours', 'problem'];

/**
 * WHEN AN OPEN DECISION SHOWS ITS OPTIONS WITHOUT BEING ASKED.
 *
 * Measured rather than guessed. Freestyle with «لا تفضيل» leaves all eight
 * categories open; expanding every list put 31 candidate rows on one screen —
 * 5.12 phone viewports, which is exactly the V1 wizard step this journey
 * exists to replace.
 *
 * So a list opens by default only when it is genuinely short AND the reader is
 * not facing a pile of other decisions. Anything else collapses behind a
 * button that names how many are inside, so the count is still visible without
 * the rows.
 */
const SHORT_LIST = 4;
const LIGHT_LOAD = 3;
const expandsByDefault = (candidateCount: number, openDecisions: number) =>
  candidateCount <= SHORT_LIST && openDecisions <= LIGHT_LOAD;

export const ProposalScreen: React.FC<{ build: ProposedBuild }> = ({ build }) => {
  const view = useMemo(() => proposalView(build), [build]);
  const partsById = useCatalogue();

  /*
   * A proven build with an unavailable REQUIRED category is a contradiction.
   * Rather than draw a normal card over it, the screen refuses — an
   * inconsistency the reader can see is recoverable; one hidden inside a
   * plausible-looking proposal is not.
   */
  if (view.consistencyError) {
    return (
      <section data-testid="v2-proposal" data-quality="inconsistent"
        style={{ display: 'grid', gap: 12 }}>
        <p role="alert" data-testid="v2-proposal-inconsistent"
          style={{ margin: 0, fontSize: 13.5, color: 'var(--sev-warning)', lineHeight: 1.9 }}>
          {PROPOSAL.consistencyError}
        </p>
      </section>
    );
  }

  const proposed = view.quality === 'proposed';

  return (
    <section data-testid="v2-proposal" data-quality={view.quality}
      style={{ display: 'grid', gap: 18 }}>
      <header style={{ display: 'grid', gap: 7 }}>
        <h2 data-testid="v2-proposal-title"
          style={{ margin: 0, fontSize: 21, fontWeight: 900, lineHeight: 1.55 }}>
          {proposed ? PROPOSAL.titleProposed : PROPOSAL.titleAllOpen}
        </h2>
        {/*
          The decision burden, in one sentence, from real counts — «حسمنا ٦
          اختيارات، ونحتاج رأيك في اختيارين.» Nothing here is a template with a
          digit in it; the engine returns anything from 0 to 8 on either side
          and Arabic needs a different form for almost all of them.
        */}
        <p data-testid="v2-proposal-burden"
          style={{ margin: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.9 }}>
          {proposalBurdenAr(view.counts, PROPOSAL.burden, n => arabicCount(n, CHOICE_NOUN))}
        </p>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.9 }}>
          {proposed ? PROPOSAL.leadProposed : PROPOSAL.leadAllOpen}
        </p>
      </header>

      {/*
        MANUAL CHECKS COME BEFORE THE PARTS.
        While one is open the build is not «متوافق بالكامل», and burying that
        under eight cards is how it stops being read. The wording is the
        catalogue's own; no amp margin is computed here.
      */}
      {view.manualChecks.length > 0 && (
        <aside className="card-sm" data-testid="v2-proposal-manual"
          style={{ padding: '13px 15px', display: 'grid', gap: 5 }}>
          <strong style={{ fontSize: 13.5, color: 'var(--sev-warning)' }}>
            {PROPOSAL.manual.title}
          </strong>
          <span style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.85 }}>
            {PROPOSAL.manual.lead}
          </span>
          <ul style={{ margin: 0, paddingInlineStart: 18, display: 'grid', gap: 4 }}>
            {view.manualChecks.map(id => (
              <li key={id} data-testid={`v2-manual-${id}`}
                style={{ fontSize: 12.5, lineHeight: 1.85 }}>
                {PROPOSAL.manual.labels[id] ?? id}
              </li>
            ))}
          </ul>
        </aside>
      )}

      {GROUP_ORDER.map(g => {
        const decisions = view.groups[g];
        if (decisions.length === 0) return null;
        const copy = PROPOSAL.groups[g];
        return (
          <section key={g} data-testid={`v2-group-${g}`} style={{ display: 'grid', gap: 9 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900 }}>{copy.title}</h3>
            {copy.note && (
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.85 }}>
                {copy.note}
              </p>
            )}
            <ul style={{ margin: 0, padding: 0, display: 'grid', gap: 9 }}>
              {decisions.map(d => (
                <ProposalCategoryCard
                  key={d.category}
                  decision={d}
                  parts={build.parts}
                  partsById={partsById}
                  // Settled categories collapse. The ones needing the reader do
                  // not — that decision is why they opened this screen.
                  compact={g === 'system-decided' || g === 'yours'}
                  expandCandidates={expandsByDefault(
                    d.candidateIds.length, view.counts.choiceRequired,
                  )}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </section>
  );
};
