'use client';

import React, { useId, useState } from 'react';
import type { BasePart } from '@core/data/assembly/types';
import type { CategoryDecision } from '@core/data/assembly/recommendation/types';
import { partLabelAr } from '@/lib/build/labels';
import { PROPOSAL } from './copy';
import { arabicNumber } from './arabicCount';
import { compatRuleLabelAr } from './compatLabels';
import { partFacts, partNoteTag, partWhyTag } from './partFacts';

/** A product name is Latin text inside an Arabic sentence. Isolate it. */
const Ltr: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <bdi dir="ltr" style={{ unicodeBidi: 'isolate' }}>{children}</bdi>
);

/**
 * A real button, an `aria-expanded`, and a caret that is not the only signal.
 *
 * Every disclosure on this screen goes through here so none of them can end up
 * a clickable `<div>` — which is what the audit found on V1's spec rows.
 */
const Disclose: React.FC<{
  label: string; testId: string; children: React.ReactNode; defaultOpen?: boolean;
}> = ({ label, testId, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <button
        type="button"
        data-testid={testId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(o => !o)}
        style={{
          justifySelf: 'start', minHeight: 44, padding: '10px 2px',
          background: 'none', border: 'none', font: 'inherit', color: 'var(--accent-ink)',
          fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <span aria-hidden>{open ? '▾' : '▸'}</span>
        <span>{label}</span>
      </button>
      <div id={panelId} hidden={!open}>{children}</div>
    </div>
  );
};

/** The badge says what kind of answer this is — in words, never in colour. */
const StatusBadge: React.FC<{ decision: CategoryDecision }> = ({ decision }) => {
  const text = decision.status === 'recommended' ? PROPOSAL.recommendedBadge
    : decision.status === 'only-compatible' ? PROPOSAL.onlyCompatibleBadge
      : decision.status === 'user-locked' ? PROPOSAL.ownedBadge
        : decision.status === 'unavailable' ? PROPOSAL.unavailableBadge
          : null;
  if (!text) return null;
  return (
    <span className="admin-badge" data-testid={`v2-badge-${decision.category}`}
      style={{ fontSize: 10.5 }}>
      {text}
    </span>
  );
};

/**
 * WHY THIS PART — IN THE ENGINE'S WORDS.
 *
 * `decision.reasons` already carries a reader-facing Arabic sentence per
 * reason, tagged with what kind of claim it is. Nothing is composed here from
 * rule ids or enum names: turning `frame-motor-class` into prose by string
 * formatting is how a UI starts asserting compatibility it did not compute.
 *
 * A reason resting on the reader's own answer is labelled as such, because
 * «because you chose متوازن» is a different kind of statement from «because
 * the frame fits».
 */
const Reasons: React.FC<{ decision: CategoryDecision }> = ({ decision }) => {
  if (decision.reasons.length === 0) return null;
  return (
    <div style={{ display: 'grid', gap: 5 }}>
      <strong style={{ fontSize: 12.5 }}>
        {decision.status === 'choice-required' ? PROPOSAL.whyTieTitle : PROPOSAL.whyTitle}
      </strong>
      <ul data-testid={`v2-why-${decision.category}`}
        style={{ margin: 0, paddingInlineStart: 18, display: 'grid', gap: 4 }}>
        {decision.reasons.map((r, i) => (
          <li key={`${r.kind}-${i}`} style={{ fontSize: 12.5, lineHeight: 1.85 }}>
            {r.ar}
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * COMPATIBILITY: ONE LINE, THEN THE DETAIL IF YOU WANT IT.
 *
 * A beginner does not need four green ticks; they need to know the checks ran.
 * And only the rules the engine ACTUALLY evaluated for this decision appear —
 * a rule that never ran must never render as a pass, which is the failure mode
 * a «compatibility report» screen invites.
 */
const Compat: React.FC<{ decision: CategoryDecision }> = ({ decision }) => {
  const ev = decision.compatibility;
  if (ev.length === 0) {
    return (
      <p data-testid={`v2-compat-${decision.category}`}
        style={{ margin: 0, fontSize: 12, color: 'var(--text-dimmer)', lineHeight: 1.85 }}>
        {PROPOSAL.compat.none}
      </p>
    );
  }
  const headline = ev.some(e => e.status === 'violated') ? PROPOSAL.compat.someViolated
    : ev.some(e => e.status === 'unknown') ? PROPOSAL.compat.someUnknown
      : PROPOSAL.compat.allPass;
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <p data-testid={`v2-compat-${decision.category}`}
        style={{ margin: 0, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.85 }}>
        {headline}
      </p>
      <Disclose label={PROPOSAL.compat.disclose} testId={`v2-compat-more-${decision.category}`}>
        {/*
          THE RULE'S NAME, NOT ITS KEY.

          This rendered `frame-size` — an English kebab-cased database
          identifier, inside a disclosure where it was easy to miss, in a
          product written for someone who has never built a drone. The label
          is an exhaustive map over `CompatRuleId`, so a new rule cannot reach
          this list without someone writing the sentence a reader will see.
        */}
        <ul style={{ margin: 0, paddingInlineStart: 18, display: 'grid', gap: 3 }}>
          {ev.map(e => (
            <li key={e.ruleId} data-rule={e.ruleId}
              style={{ fontSize: 12, lineHeight: 1.8 }}>
              {compatRuleLabelAr(e.ruleId)}
              {' — '}
              {PROPOSAL.compat.status[e.status]}
            </li>
          ))}
        </ul>
      </Disclose>
    </div>
  );
};

/** The part itself: name, the shop name, two or three facts, one why-line. */
const PartBody: React.FC<{ category: string; part: BasePart }> = ({ category, part }) => {
  const facts = partFacts(category, part);
  const why = partWhyTag(part);
  const note = partNoteTag(part);
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 15, fontWeight: 800 }} data-testid={`v2-part-name-${category}`}>
        {part.nameAr}
      </span>
      <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
        <Ltr>{part.brand ? `${part.brand} · ${part.nameEn}` : part.nameEn}</Ltr>
      </span>
      {facts.length > 0 && (
        <dl data-testid={`v2-facts-${category}`}
          style={{ margin: 0, display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
          {facts.map(f => (
            <div key={f.labelAr} style={{ display: 'flex', gap: 5, fontSize: 12 }}>
              <dt style={{ color: 'var(--text-dimmer)' }}>{f.labelAr}</dt>
              <dd style={{ margin: 0, fontWeight: 700 }}><Ltr>{f.value}</Ltr></dd>
            </div>
          ))}
        </dl>
      )}
      {why && (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.85 }}>
          {why}
        </p>
      )}
      {note && (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dimmer)', lineHeight: 1.8 }}>
          {note}
        </p>
      )}
    </div>
  );
};

/**
 * ONE CATEGORY.
 *
 * A settled category is a compact row that opens; an open one is a card that
 * shows its options straight away, because that is the decision the reader is
 * actually here to make.
 */
export const ProposalCategoryCard: React.FC<{
  decision: CategoryDecision;
  parts: Readonly<Record<string, BasePart>>;
  partsById: Readonly<Record<string, BasePart>>;
  /** Settled categories collapse; the ones needing the reader do not. */
  compact: boolean;
  /**
   * Whether this category's candidate list opens straight away.
   *
   * Decided by the SCREEN, not here, because it depends on how much else is
   * open — a short list is worth showing when it is the only decision left and
   * is noise when it is one of eight.
   */
  expandCandidates: boolean;
}> = ({ decision, parts, partsById, compact, expandCandidates }) => {
  const part = decision.partId ? parts[decision.category] : undefined;
  const label = partLabelAr(decision.category);

  const details = (
    <div style={{ display: 'grid', gap: 10, paddingTop: 4 }}>
      {part && <PartBody category={decision.category} part={part} />}
      {decision.status === 'only-compatible' && (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dimmer)', lineHeight: 1.8 }}>
          {PROPOSAL.onlyCompatibleNote}
        </p>
      )}
      <Reasons decision={decision} />
      <Compat decision={decision} />
    </div>
  );

  return (
    <li className="card-sm" data-testid={`v2-cat-${decision.category}`}
      data-status={decision.status}
      style={{ padding: '13px 15px', display: 'grid', gap: 8, listStyle: 'none' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <h4 style={{ margin: 0, fontSize: 13, color: 'var(--text-dimmer)', fontWeight: 700 }}>
          {label}
        </h4>
        <StatusBadge decision={decision} />
      </div>

      {compact ? (
        <>
          {part && (
            <span style={{ fontSize: 14.5, fontWeight: 800 }}
              data-testid={`v2-part-name-${decision.category}`}>
              {part.nameAr}
            </span>
          )}
          <Disclose label={PROPOSAL.whyTitle} testId={`v2-more-${decision.category}`}>
            {details}
          </Disclose>
        </>
      ) : details}

      {/*
        THE OPEN DECISION. Every surviving candidate, in the catalogue's own
        order, with NONE marked. `candidateIds[0]` is not a winner and the
        `provenPath` member is not a pick — that path proves a complete build
        exists, and it broke each tie arbitrarily to do so. Presenting either
        as «the system's choice» would manufacture a recommendation the engine
        deliberately refused to make.
      */}
      {decision.status === 'choice-required' && (
        <Candidates
          decision={decision}
          partsById={partsById}
          defaultOpen={expandCandidates}
        />
      )}
    </li>
  );
};

/**
 * The surviving options, in the catalogue's order, with none preferred.
 *
 * Split out so the list can collapse without the disclosure state leaking into
 * the card, and so the «none is selected» rule lives in one readable place.
 */
const Candidates: React.FC<{
  decision: CategoryDecision;
  partsById: Readonly<Record<string, BasePart>>;
  defaultOpen: boolean;
}> = ({ decision, partsById, defaultOpen }) => {
  const list = (
        <div style={{ display: 'grid', gap: 7 }}>
          <ul data-testid={`v2-candidates-${decision.category}`}
            style={{ margin: 0, padding: 0, display: 'grid', gap: 6, listStyle: 'none' }}>
            {/*
              NO `?? id` FALLBACK. A candidate the catalogue cannot resolve is
              an integrity defect that refuses the whole proposal upstream, so
              every id here is known to resolve. The non-null assertion is that
              guarantee written down — if it ever breaks, the reader gets a
              refusal, not a database key wearing a product's clothes.
            */}
            {decision.candidateIds.map(id => {
              const c = partsById[id]!;
              return (
                <li key={id} data-testid={`v2-candidate-${id}`} data-selected="false"
                  style={{
                    padding: '9px 11px', border: '1px solid var(--border-soft)',
                    borderRadius: 8, display: 'grid', gap: 3,
                  }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>{c.nameAr}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--text-dimmer)' }}>
                    <Ltr>{c.brand ? `${c.brand} · ${c.nameEn}` : c.nameEn}</Ltr>
                  </span>
                </li>
              );
            })}
          </ul>
          <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-dimmer)', lineHeight: 1.8 }}>
            {PROPOSAL.candidates.readOnly}
          </p>
        </div>
  );

  const label = `${PROPOSAL.candidates.show} (${arabicNumber(decision.candidateIds.length)})`;
  return (
    <div style={{ display: 'grid', gap: 7 }}>
      <strong style={{ fontSize: 12.5 }}>{PROPOSAL.candidates.title}</strong>
      {defaultOpen ? list : (
        <Disclose label={label} testId={`v2-show-candidates-${decision.category}`}>
          {list}
        </Disclose>
      )}
    </div>
  );
};
