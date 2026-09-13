'use client';

import React from 'react';
import type { ProposedBuild, SelectionSource } from '@core/data/assembly/recommendation/types';
import { PART_CATEGORY_MAP } from '@core/data/project/store';
import { PART_VOCAB } from '@/lib/build/labels';
import { arabicNumber } from './arabicCount';
import { partFacts } from './partFacts';
import { reviewView, type ReviewLine } from './reviewModel';
import { PROPOSAL, REVIEW } from './copy';
import { Ltr } from './ProposalCategoryCard';

/**
 * «مراجعة البناء» — WHERE CHOOSING PARTS ENDS
 * ===========================================
 *
 * A SUMMARY, not a second catalogue. The reader has already met every one of
 * these parts on a card with its reasons, its compatibility evidence and its
 * alternatives; repeating all of that here would make the ending heavier than
 * the journey. So each row is one line: what it is, what it is called, two or
 * three facts, and WHO CHOSE IT.
 *
 * WHAT THIS SCREEN IS CAREFUL NOT TO SAY
 * --------------------------------------
 * Everything on it is a claim about PARTS. The headline says the eight are
 * settled and, in the same breath, that this is not readiness — because
 * «اكتمل اختيار القطع» is one short step from «I am done» in a reader's head,
 * and the gap between those two is a drone with props on it.
 *
 * The manual checks arrive open and leave open. Reaching an end screen is not
 * evidence about hardware, and there is deliberately no control here that lets
 * a reader mark one passed: that confirmation belongs to the assembly phase,
 * against the real parts, and a checkbox here would only record that somebody
 * clicked a checkbox.
 *
 * The price is a RANGE over the documented entries and a COUNT of the rest.
 * The next phase is named and visibly shut. The only real action goes back.
 */

/** Who chose it — the domain's four answers, kept four. */
const provenanceAr = (source: SelectionSource, status: ReviewLine['status']): string => {
  if (source === 'user-selected') return REVIEW.provenance.selected;
  if (source === 'user-owned') return REVIEW.provenance.owned;
  return status === 'only-compatible'
    ? REVIEW.provenance.onlyCompatible
    : REVIEW.provenance.recommended;
};

const ExtrasSection: React.FC<{
  testId: string;
  title: string;
  lead: string;
  categories: readonly { category: string; stocked: number }[];
}> = ({ testId, title, lead, categories }) => (
  /*
   * Subordinate on purpose: smaller type, no cards, no product names. These
   * are CATEGORIES the reader has not bought into, and the engine ranks none
   * of them — so naming a specific capacitor here would be the screen making a
   * recommendation the domain refused to make.
   */
  <section data-testid={testId} style={{ display: 'grid', gap: 6 }}>
    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 900 }}>{title}</h3>
    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.85 }}>{lead}</p>
    <ul style={{ margin: 0, paddingInlineStart: 18, display: 'grid', gap: 3 }}>
      {categories.map(c => (
        <li key={c.category} data-testid={`${testId}-${c.category}`}
          style={{ fontSize: 12.5, lineHeight: 1.85 }}>
          <span style={{ fontWeight: 700 }}>{PART_VOCAB[c.category]?.ar ?? c.category}</span>
          <span style={{ color: 'var(--text-dimmer)' }}> — {REVIEW.extrasNotChosen}</span>
        </li>
      ))}
    </ul>
  </section>
);

export const ReviewScreen: React.FC<{
  build: ProposedBuild;
  onBack: () => void;
}> = ({ build, onBack }) => {
  const view = reviewView(build, category => (PART_CATEGORY_MAP[category] ?? []).length);
  const { price } = view;
  const priced = price.pricedCount > 0;

  return (
    <section data-testid="v2-review" style={{ display: 'grid', gap: 18 }}>
      <header style={{ display: 'grid', gap: 7 }}>
        <h2 data-testid="v2-review-title"
          style={{ margin: 0, fontSize: 21, fontWeight: 900, lineHeight: 1.55 }}>
          {REVIEW.completeTitle}
        </h2>
        {/*
          Never rendered without the line below it. The headline alone is the
          sentence a reader turns into «I am done».
        */}
        <p data-testid="v2-review-not-ready"
          style={{ margin: 0, fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.95 }}>
          {REVIEW.completeLead}
        </p>
      </header>

      {/* ── THE EIGHT ─────────────────────────────────────────────────── */}
      <section style={{ display: 'grid', gap: 9 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900 }}>{REVIEW.partsTitle}</h3>
        <ul data-testid="v2-review-parts"
          style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 7 }}>
          {view.lines.map(l => {
            const facts = partFacts(l.category, l.part);
            return (
              <li key={l.category} className="card-sm"
                data-testid={`v2-review-line-${l.category}`}
                data-source={l.source}
                data-status={l.status}
                style={{ padding: '11px 13px', display: 'grid', gap: 4 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-dimmer)', fontWeight: 700 }}>
                    {PART_VOCAB[l.category]!.ar}
                  </span>
                  {/*
                    Provenance is TEXT, not a colour or an icon. A reader who
                    cannot distinguish two greys still has to be able to tell
                    what the system decided from what they decided.
                  */}
                  <span className="admin-badge"
                    data-testid={`v2-review-provenance-${l.category}`}
                    style={{ fontSize: 10.5 }}>
                    {provenanceAr(l.source, l.status)}
                  </span>
                </div>
                <span data-testid={`v2-review-name-${l.category}`}
                  style={{ fontSize: 14.5, fontWeight: 800, lineHeight: 1.6 }}>
                  {l.part.nameAr}
                </span>
                {/* The English product name, isolated, because it is what a shop search takes. */}
                <Ltr>{l.part.brand ? `${l.part.brand} · ${l.part.nameEn}` : l.part.nameEn}</Ltr>
                {facts.length > 0 && (
                  <span data-testid={`v2-review-facts-${l.category}`}
                    style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.8 }}>
                    {facts.map(f => `${f.labelAr}: ${f.value}`).join('  ·  ')}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── PRICE ─────────────────────────────────────────────────────── */}
      <section className="card-sm" data-testid="v2-review-price"
        data-priced={String(price.pricedCount)}
        data-unpriced={String(price.unpricedCount)}
        style={{ padding: '13px 15px', display: 'grid', gap: 5 }}>
        <strong style={{ fontSize: 13.5 }}>{REVIEW.price.title}</strong>
        <span style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.85 }}>
          {REVIEW.price.lead}
        </span>
        {priced ? (
          /*
            The range, LTR-isolated because it is Latin currency inside Arabic
            prose. Never a midpoint and never a single figure: the catalogue
            documents a range and that is what is shown.
          */
          <span data-testid="v2-review-price-range"
            style={{ fontSize: 16, fontWeight: 900 }}>
            <Ltr>{`$${price.priceMinUSD}–$${price.priceMaxUSD}`}</Ltr>
          </span>
        ) : (
          /* A `$0–$0` here would read as «this build is free». */
          <span data-testid="v2-review-price-none"
            style={{ fontSize: 12.5, color: 'var(--sev-warning)', lineHeight: 1.85 }}>
            {REVIEW.price.noneDocumented}
          </span>
        )}
        {price.unpricedCount > 0 && (
          <span data-testid="v2-review-price-unpriced"
            style={{ fontSize: 12.5, color: 'var(--sev-warning)', lineHeight: 1.85 }}>
            {arabicNumber(price.unpricedCount)} {REVIEW.price.unpricedNote}
          </span>
        )}
        <span style={{ fontSize: 12, color: 'var(--text-dimmer)', lineHeight: 1.8 }}>
          {REVIEW.price.excludes}
        </span>
      </section>

      {/* ── COMPATIBILITY, IN TWO SENTENCES ───────────────────────────── */}
      <section data-testid="v2-review-compat"
        data-pass={String(view.compatibility.pass)}
        data-violated={String(view.compatibility.violated)}
        style={{ display: 'grid', gap: 4 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 900 }}>{REVIEW.compat.title}</h3>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.85 }}>
          {REVIEW.compat.noBlockers}
        </p>
        {/*
          Only when one is actually open. Saying «وتبقى فحوص يدوية» on a build
          with none would be inventing an outstanding item.
        */}
        {view.manualChecks.length > 0 && (
          <p data-testid="v2-review-compat-manual"
            style={{ margin: 0, fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.85 }}>
            {REVIEW.compat.stillManual}
          </p>
        )}
      </section>

      {/* ── MANUAL CHECKS — OPEN ON ARRIVAL, OPEN ON LEAVING ──────────── */}
      {view.manualChecks.length > 0 && (
        <aside className="card-sm" data-testid="v2-review-manual"
          style={{ padding: '13px 15px', display: 'grid', gap: 5 }}>
          <strong style={{ fontSize: 13.5, color: 'var(--sev-warning)' }}>
            {REVIEW.manual.title}
          </strong>
          <span style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.85 }}>
            {REVIEW.manual.lead}
          </span>
          <ul style={{ margin: 0, paddingInlineStart: 18, display: 'grid', gap: 4 }}>
            {view.manualChecks.map(id => (
              /*
                The catalogue's own wording, unchanged from the proposal — and
                NO control beside it. A «تم» checkbox here would record a click,
                not a measurement.
              */
              <li key={id} data-testid={`v2-review-manual-${id}`}
                style={{ fontSize: 12.5, lineHeight: 1.85 }}>
                {PROPOSAL.manual.labels[id]}
              </li>
            ))}
          </ul>
        </aside>
      )}

      <ExtrasSection
        testId="v2-review-recommended"
        title={REVIEW.recommended.title}
        lead={REVIEW.recommended.lead}
        categories={view.recommendedExtras}
      />
      <ExtrasSection
        testId="v2-review-optional"
        title={REVIEW.optional.title}
        lead={REVIEW.optional.lead}
        categories={view.optionalExtras}
      />

      {/* ── HANDOFF — NAMED, AND VISIBLY SHUT ─────────────────────────── */}
      <section className="card-sm" data-testid="v2-review-handoff"
        style={{ padding: '13px 15px', display: 'grid', gap: 4 }}>
        <strong style={{ fontSize: 13.5 }}>{REVIEW.handoff.title}</strong>
        <span style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.85 }}>
          {REVIEW.handoff.body}
        </span>
      </section>

      {/*
        THE ONLY REAL ACTION, AND IT GOES BACKWARDS.
        There is nowhere forward to go yet, and a button that admitted as much
        by being disabled would still be a button promising a destination.
      */}
      <button type="button" className="btn-primary" data-testid="v2-review-back"
        onClick={onBack}
        style={{ justifySelf: 'start', minHeight: 44, padding: '12px 22px', fontSize: 14.5, fontWeight: 800 }}>
        {REVIEW.back}
      </button>
    </section>
  );
};
