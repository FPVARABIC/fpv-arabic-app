'use client';

import Link from 'next/link';
import { useState } from 'react';
import { readProjectSnapshot } from '@/lib/project';
import { rcFactsForEdgeTxHub } from '@core/data/project/context';
import { webHref } from '@/lib/webRoutes';

/**
 * The reader's own radio, on the EdgeTX index.
 *
 * WHY THE HUB GETS A PANEL WHEN INDIVIDUAL PAGES MOSTLY DO NOT
 * ------------------------------------------------------------
 * On a topic page, the reader has already chosen — a panel there is only useful
 * if it says something about THAT screen, which is why most topics have no
 * mapped fields at all. The index is the opposite situation: the reader has not
 * chosen yet, and which topics are even relevant depends on what they own. An
 * internal-module radio and an external-module one need different pages first.
 *
 * The six facts shown are declared in the shared core (`EDGETX_HUB_RC_FIELDS`),
 * not chosen here, so the phone's EdgeTX screen shows the same six.
 *
 * Renders nothing when there is no project, and nothing when the project has
 * none of these fields — an empty box headed «من مشروعك» teaches nothing and
 * trains people to skip the box on the pages where it is full.
 */
export const EdgeTxHubContext: React.FC = () => {
  const [snapshot] = useState(() => readProjectSnapshot());
  const facts = snapshot.exists ? rcFactsForEdgeTxHub(snapshot) : [];

  if (facts.length === 0) return null;

  return (
    <aside className="card" data-testid="edgetx-hub-context" style={{ padding: '16px 18px', marginTop: 18 }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 900 }}>جهازك كما سجّلته</h2>
      <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-dimmer)', lineHeight: 1.85 }}>
        يحدّد أي الصفحات تخصّك أولاً.
      </p>
      <dl className="admin-kv" style={{ marginTop: 12 }}>
        {facts.map(f => (
          <div key={f.field}>
            <dt>{f.labelAr}</dt>
            <dd className="ltr">{f.valueAr}</dd>
          </div>
        ))}
      </dl>
      <p style={{ margin: '13px 0 0' }}>
        <Link href={webHref({ kind: 'project', view: 'rc' }).href ?? '/project'} className="btn-ghost">
          عدّل إعداد التحكم ←
        </Link>
      </p>
    </aside>
  );
};
