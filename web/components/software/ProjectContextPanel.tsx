'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  readProjectSnapshot, computeFindings, sortFindings, SEVERITY_LABEL_AR,
} from '@/lib/project';
import {
  factsForBetaflightPage, findingsForBetaflightPage,
  rcFactsForEdgeTxPage, findingsForEdgeTxPage,
  rcFactsForElrsEntry, findingsForElrsEntry,
  videoFactsFor, findingsForVideoToolPage, videoFieldLabels,
  expectedLabelsFor, type ContextEntryKind,
} from '@core/data/project/context';
import type { VideoSetup } from '@core/data/project/videoSetup';
import { webHref } from '@/lib/webRoutes';

/**
 * What the reader's own build says about THIS page.
 *
 * THE RULE THIS COMPONENT EXISTS TO OBEY
 * --------------------------------------
 * "Do not show a general project panel on every page." So it asks the shared
 * context layer for the facts belonging to this specific entry — Ports gets
 * UARTs, Receiver gets the receiver and its protocol, Failsafe gets the
 * strategy and whether it was ever tested — and renders NOTHING when that set
 * is empty. A panel repeating the whole project everywhere is noise, and noise
 * is what stops people reading the one line that mattered.
 *
 * The page→fields mapping is not decided here. `context.ts` in the shared core
 * owns it, so the phone and the web surface the same facts on the same screen,
 * and a future assistant asking "what does this reader need before I answer
 * about Ports?" reads the same table.
 *
 * WHY «لم تسجّله بعد» IS A SUBTRACTION AND NOT A SECOND LIST
 * ----------------------------------------------------------
 * `rcFactsFor` returns only fields that HAVE a value — an unrecorded field is
 * simply absent. So the missing set is the entry's full expected field list
 * minus what came back. Both halves come from `context.ts`: hand-writing the
 * expected labels here would drift from the labels the fact reader returns, and
 * a label differing by one word would make a recorded field print as missing.
 *
 * WHY IT IS A CLIENT ISLAND
 * -------------------------
 * The project lives in localStorage. The page around it stays server-rendered
 * and indexable; this panel appears after hydration and never enters the HTML a
 * crawler sees — which is also the privacy property, since a public page must
 * never carry a reader's build in its source.
 */

/**
 * The video centre is the one that passes its fields explicitly.
 *
 * Its pages declare `projectFields` beside their own content instead of in a
 * map in `context.ts`, so the core cannot resolve them from an id without
 * importing the whole video registry. Modelling that difference in the props
 * rather than hiding it keeps the other three centres' call sites down to two
 * words, which is what stops anyone reaching for a general panel.
 */
export type ProjectContextProps =
  | { kind: ContextEntryKind; entryId: string; fields?: undefined }
  | { kind: 'video'; entryId: string; fields: readonly (keyof VideoSetup)[] };

export const ProjectContextPanel: React.FC<ProjectContextProps> = ({ kind, entryId, fields }) => {
  const [snapshot] = useState(() => readProjectSnapshot());

  const expectedLabelsAr = useMemo(
    () => (kind === 'video' ? videoFieldLabels(fields ?? []) : expectedLabelsFor(kind, entryId)),
    [kind, entryId, fields],
  );

  const { facts, findings } = useMemo(() => {
    if (!snapshot.exists) return { facts: [], findings: [] };
    const all = sortFindings(computeFindings(snapshot));
    if (kind === 'betaflight') {
      return {
        facts: factsForBetaflightPage(snapshot, entryId),
        findings: findingsForBetaflightPage(all, entryId),
      };
    }
    if (kind === 'edgetx') {
      return {
        facts: rcFactsForEdgeTxPage(snapshot, entryId),
        findings: findingsForEdgeTxPage(all, entryId),
      };
    }
    if (kind === 'video') {
      return {
        facts: videoFactsFor(snapshot, [...(fields ?? [])]),
        findings: findingsForVideoToolPage(all, entryId),
      };
    }
    return {
      facts: rcFactsForElrsEntry(snapshot, entryId),
      findings: findingsForElrsEntry(all, entryId),
    };
  }, [snapshot, kind, entryId, fields]);

  const recorded = new Set(facts.map(f => f.labelAr));
  const missing = expectedLabelsAr.filter(l => !recorded.has(l));

  if (!snapshot.exists) {
    // One line, only where the page HAS project-relevant fields at all.
    if (expectedLabelsAr.length === 0) return null;
    return (
      <aside className="card-sm" data-testid="project-context-none" style={{ padding: '13px 15px', marginTop: 18 }}>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.9 }}>
          لو سجّلت <Link href="/project" style={{ color: 'var(--accent-ink)' }}>مشروعك</Link>،
          ستظهر هنا قيمك أنت على هذه الصفحة تحديداً — لا المشروع كله.
        </p>
      </aside>
    );
  }

  if (facts.length === 0 && findings.length === 0 && missing.length === 0) return null;

  return (
    <aside className="card" data-testid="project-context" style={{ padding: '16px 18px', marginTop: 20 }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 900 }}>من مشروعك</h2>
      <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-dimmer)', lineHeight: 1.85 }}>
        ما يخصّ هذه الصفحة فقط.
      </p>

      {facts.length > 0 && (
        <dl className="admin-kv" data-testid="project-context-facts" style={{ marginTop: 13 }}>
          {facts.map((f, i) => (
            <div key={i}>
              <dt>{f.labelAr}</dt>
              <dd className="ltr">{f.valueAr}</dd>
            </div>
          ))}
        </dl>
      )}

      {missing.length > 0 && (
        <div style={{ marginTop: 13 }} data-testid="project-context-missing">
          <h3 style={{ margin: '0 0 7px', fontSize: 12.5, fontWeight: 900, color: 'var(--sev-warning)' }}>
            لم تسجّله بعد
          </h3>
          <ul style={{ margin: 0, paddingInlineStart: 20, display: 'grid', gap: 5 }}>
            {missing.map(l => (
              <li key={l} style={{ fontSize: 13, lineHeight: 1.9, color: 'var(--text-dim)' }}>{l}</li>
            ))}
          </ul>
        </div>
      )}

      {findings.length > 0 && (
        <div style={{ marginTop: 14 }} data-testid="project-context-findings">
          <h3 style={{ margin: '0 0 8px', fontSize: 12.5, fontWeight: 900, color: 'var(--text-dimmer)' }}>
            أحكام تخصّ هذه الصفحة
          </h3>
          <ul style={{ margin: 0, paddingInlineStart: 20, display: 'grid', gap: 7 }}>
            {findings.map(f => (
              <li key={f.id} style={{ fontSize: 13, lineHeight: 1.9 }}>
                <span className="admin-badge">{SEVERITY_LABEL_AR[f.severity]}</span>{' '}
                {f.claimAr}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p style={{ margin: '14px 0 0' }}>
        <Link
          href={webHref({ kind: 'project', view: 'findings' }).href ?? '/project'}
          className="btn-ghost"
          data-testid="project-context-open"
        >
          افتح مشروعك ←
        </Link>
      </p>
    </aside>
  );
};
