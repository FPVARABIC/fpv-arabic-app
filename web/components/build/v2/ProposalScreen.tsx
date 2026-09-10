'use client';

import React, { useMemo } from 'react';
import type { BasePart } from '@core/data/assembly/types';
import type { ProposedBuild } from '@core/data/assembly/recommendation/types';
import { PART_CATEGORY_MAP } from '@core/data/project/store';
import { PROPOSAL } from './copy';
import { arabicCount, CHOICE_NOUN } from './arabicCount';
import {
  proposalBurdenAr, proposalView, type DecisionGroup, type ProposalDefectKind,
} from './proposalModel';
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

/**
 * The catalogue, INDEXED BY CATEGORY — not flattened into one id map.
 *
 * The flat version answered «does this id exist», which is not the question
 * the screen needs answered. A `receivers` decision naming a frame's id got a
 * part back and rendered it. Keeping the shelves apart makes the wrong shelf
 * an error instead of a lookup that happens to succeed.
 */
interface Catalogue {
  byCategory: Readonly<Record<string, Readonly<Record<string, BasePart>>>>;
  allIds: ReadonlySet<string>;
}

function useCatalogue(): Catalogue {
  return useMemo(() => {
    const byCategory: Record<string, Record<string, BasePart>> = {};
    const allIds = new Set<string>();
    for (const [category, list] of Object.entries(PART_CATEGORY_MAP)) {
      byCategory[category] = {};
      for (const p of list) {
        byCategory[category][p.id] = p;
        allIds.add(p.id);
      }
    }
    return { byCategory, allIds };
  }, []);
}

const GROUP_ORDER: readonly DecisionGroup[] = ['needs-you', 'system-decided', 'yours', 'problem'];

/** Typed against the defect union, so a new kind cannot ship without wording. */
const CONSISTENCY_KINDS: Record<ProposalDefectKind, string> = PROPOSAL.consistency.kinds;

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
  const catalogue = useCatalogue();
  /*
   * The integrity context: what the model needs to check that everything the
   * screen is about to name exists IN THE CATEGORY IT IS SHOWN UNDER. Passed
   * in rather than imported by the model, so a test can hand it a deliberately
   * broken catalogue.
   */
  const view = useMemo(() => proposalView(build, {
    resolvePart: (category, id) => catalogue.byCategory[category]?.[id],
    existsInAnyCategory: id => catalogue.allIds.has(id),
    hasManualLabel: id => id in PROPOSAL.manual.labels,
  }), [build, catalogue]);

  /*
   * ANYTHING THE SCREEN CANNOT HONESTLY RENDER STOPS IT.
   *
   * A proven build with an unavailable required category is a contradiction; so
   * is a decision naming a part the catalogue does not have, or a card about to
   * show a different part from the one the decision selected. Each of those
   * once had a fallback that printed the id.
   *
   * The reasons are listed IN KIND. `data-defects` carries the kinds for tests;
   * the ids reach no visible string.
   */
  if (view.consistencyError) {
    const kinds = [...new Set(view.defects.map(d => d.kind))];
    return (
      <section data-testid="v2-proposal" data-quality="inconsistent"
        data-defects={kinds.join(' ')} style={{ display: 'grid', gap: 10 }}>
        <h2 role="alert" data-testid="v2-proposal-inconsistent"
          style={{ margin: 0, fontSize: 17, fontWeight: 900,
            color: 'var(--sev-warning)', lineHeight: 1.7 }}>
          {PROPOSAL.consistency.title}
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.9 }}>
          {PROPOSAL.consistency.lead}
        </p>
        <ul style={{ margin: 0, paddingInlineStart: 18, display: 'grid', gap: 4 }}>
          {kinds.map(k => (
            <li key={k} data-testid={`v2-defect-${k}`}
              style={{ fontSize: 12.5, lineHeight: 1.85 }}>
              {CONSISTENCY_KINDS[k]}
            </li>
          ))}
        </ul>
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
              /*
                No `?? id` fallback. An unlabelled manual check is a defect
                that refuses the whole proposal above, so by the time this
                renders the label is guaranteed to exist — and if that
                guarantee ever breaks, the reader gets a refusal rather than a
                finding id presented as a safety instruction.
              */
              <li key={id} data-testid={`v2-manual-${id}`}
                style={{ fontSize: 12.5, lineHeight: 1.85 }}>
                {PROPOSAL.manual.labels[id]}
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
                  categoryParts={catalogue.byCategory[d.category] ?? {}}
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
