'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { readProjectSnapshot, computeFindings, sortFindings } from '@/lib/project';
import { retrieve, type ProjectContextInput } from '@core/platform/retrieval';
import { PART_CATEGORY_LABEL_AR } from '@core/data/project/store';
import { rcFactsFor, ALL_RC_FACT_FIELDS } from '@core/data/project/context';

import { webHref } from '@/lib/webRoutes';
import { topReasons } from '@/lib/searchView';

/**
 * The reader's own build, in their own search results.
 *
 * WHY THIS RUNS IN THE BROWSER AND NOT ON THE SERVER
 * --------------------------------------------------
 * The project lives in localStorage. Rendering it server-side would require
 * sending it to the server, and a public, cacheable search page carrying one
 * person's aircraft in its HTML is the exact leak the whole project design has
 * avoided since it was built. So the same `retrieve()` runs here instead, over
 * the project only, on the side of the wire where the data already is.
 *
 * The E2E suite asserts the negative: the served HTML for a search that WOULD
 * match a seeded project contains none of it.
 *
 * WHY IT IS THE SAME FUNCTION
 * ---------------------------
 * Because the alternative is a second matcher with its own idea of what counts
 * as a match, and «UART» finding the article on the server but not the reader's
 * own recorded UART in the browser is the kind of inconsistency nobody ever
 * tracks down. One contract, two call sites, no second engine.
 */
export const ProjectResults: React.FC<{ query: string }> = ({ query }) => {
  const [snapshot] = useState(() => readProjectSnapshot());

  const results = useMemo(() => {
    if (!snapshot.exists || query.trim().length < 2) return [];

    // Narrow the snapshot to what retrieval is allowed to see. Passing the
    // whole record would hand a matching layer more than it needs, and this
    // shape is the contract's own — no second model of a project.
    const context: ProjectContextInput = {
      exists: true,
      parts: Object.entries(PART_CATEGORY_LABEL_AR)
        .map(([category, labelAr]) => {
          const part = (snapshot as unknown as Record<string, { id: string; name: string } | undefined>)[category];
          return part ? { category, labelAr, id: part.id, nameAr: part.name } : null;
        })
        .filter((p): p is NonNullable<typeof p> => !!p),
      findings: sortFindings(computeFindings(snapshot)).map(f => ({
        id: f.id,
        severity: f.severity,
        confidence: f.confidence,
        claimAr: f.claimAr,
        missingAr: f.missingAr,
        links: f.links,
      })),
      facts: rcFactsFor(snapshot, ALL_RC_FACT_FIELDS),
    };

    return retrieve(query, { project: context, limit: 0 }).project;
  }, [snapshot, query]);

  if (results.length === 0) return null;

  return (
    <section aria-labelledby="project-results-h" data-testid="search-project"
      style={{ marginTop: 24 }}>
      <h2 id="project-results-h" style={{ fontSize: 15, fontWeight: 900, margin: '0 0 4px' }}>
        من مشروعك
      </h2>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text-dimmer)', lineHeight: 1.9 }}>
        قيمك أنت وأحكام بنائك. تظهر لك وحدك في هذا المتصفح، ولا تُرسَل إلى أي خادم.
      </p>

      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
        {results.map(r => {
          const href = r.destination ? webHref(r.destination).href : null;
          const reasons = topReasons(r.reasons, 1);
          const body = (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 10.5, fontWeight: 800, color: 'var(--sev-warning)',
                  border: '1px solid rgba(252,211,77,0.35)', borderRadius: 999, padding: '2px 9px',
                }}>
                  {r.type === 'project-finding' ? 'حكم في مشروعك' : 'من مشروعك'}
                </span>
                <h3 style={{ fontSize: 14.5, fontWeight: 800, margin: 0, minWidth: 0 }}>{r.titleAr}</h3>
              </div>
              {r.summaryAr && (
                <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '7px 0 0', lineHeight: 1.85 }}>
                  {r.summaryAr}
                </p>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {reasons.map(c => (
                  <span key={c.kind} style={{ fontSize: 10.5, color: 'var(--text-dimmer)' }}>
                    {c.labelAr}
                  </span>
                ))}
                {/* Confidence, only where the notion applies — never invented. */}
                {r.confidence && (
                  <span style={{ fontSize: 10.5, color: 'var(--text-dimmer)' }}>
                    · {CONFIDENCE_LABEL_AR[r.confidence]}
                  </span>
                )}
              </div>
            </>
          );
          return (
            <li key={r.id}>
              {href ? (
                <Link href={href} className="card-sm" data-testid={`search-project-${r.id}`}
                  style={{ display: 'block', padding: '14px 16px' }}>
                  {body}
                </Link>
              ) : (
                <div className="card-sm" style={{ padding: '14px 16px' }}>{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
};

/** How a verdict was reached. Comes from the verdict engine, never computed here. */
const CONFIDENCE_LABEL_AR: Record<string, string> = {
  'typed-spec': 'من مواصفات مُدخلة',
  derived: 'مستنتَج',
  'manual-required': 'يحتاج تأكيداً من الدليل',
};
