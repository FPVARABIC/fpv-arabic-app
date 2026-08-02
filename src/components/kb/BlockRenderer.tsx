import React from 'react';
import { AlertTriangle, Info, Lightbulb, ShieldAlert, OctagonAlert, ChevronDown } from 'lucide-react';
import type { KbBlock, KbSafetyLevel } from '../../data/kb/types';
import { RichText } from './Term';
import { EducationalDiagram } from '../EducationalDiagram';

/**
 * Generic renderer for every KB content block.
 *
 * This component must never know what an article is about. Adding a subject —
 * motors, batteries, video systems — must require zero changes here. Any time a
 * block type needs a subject-specific branch, the block model is wrong, not the
 * renderer.
 */

const CALLOUT_STYLE: Record<
  NonNullable<Extract<KbBlock, { type: 'callout' }>['tone']>,
  { bg: string; border: string; color: string; Icon: typeof Info }
> = {
  note:    { bg: 'rgba(56,189,248,0.08)',  border: 'rgba(56,189,248,0.35)',  color: '#0369a1', Icon: Info },
  tip:     { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.35)',  color: '#047857', Icon: Lightbulb },
  warning: { bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.45)',  color: '#b45309', Icon: AlertTriangle },
  danger:  { bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.45)',   color: '#b91c1c', Icon: OctagonAlert },
  safety:  { bg: 'rgba(217,70,239,0.08)',  border: 'rgba(217,70,239,0.35)',  color: '#a21caf', Icon: ShieldAlert },
};

const STEP_SAFETY_LABEL: Record<KbSafetyLevel, string> = {
  info: 'ملاحظة',
  caution: 'انتبه',
  warning: 'تحذير',
  critical: 'خطر',
};

const STEP_SAFETY_COLOR: Record<KbSafetyLevel, string> = {
  info: '#0369a1',
  caution: '#b45309',
  warning: '#c2410c',
  critical: '#b91c1c',
};

const ScrollBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', margin: '0 -4px', padding: '0 4px' }}>
    {children}
  </div>
);

const TABLE_CELL: React.CSSProperties = {
  border: '1px solid rgba(15,23,42,0.10)',
  padding: '8px 10px',
  fontSize: 12.5,
  lineHeight: 1.7,
  verticalAlign: 'top',
  textAlign: 'right',
};

const TABLE_HEAD: React.CSSProperties = {
  ...TABLE_CELL,
  background: 'rgba(14,165,233,0.08)',
  fontWeight: 700,
  whiteSpace: 'nowrap',
};

export const BlockRenderer: React.FC<{ block: KbBlock; idKey: string }> = ({ block, idKey }) => {
  switch (block.type) {
    case 'para':
      return (
        <p style={{ fontSize: 14, lineHeight: 1.95, color: '#1e293b', margin: '0 0 12px' }}>
          <RichText text={block.text} idKey={idKey} />
        </p>
      );

    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <div style={{ margin: '0 0 14px' }}>
          {block.title && (
            <h4 style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              <RichText text={block.title} idKey={`${idKey}-t`} />
            </h4>
          )}
          <Tag style={{ paddingInlineStart: 20, margin: 0, listStyleType: block.ordered ? 'arabic-indic' : 'disc' }}>
            {block.items.map((it, i) => (
              <li key={i} style={{ fontSize: 13.5, lineHeight: 1.9, color: '#1e293b', marginBottom: 6 }}>
                <RichText text={it} idKey={`${idKey}-i${i}`} />
              </li>
            ))}
          </Tag>
        </div>
      );
    }

    case 'steps':
      return (
        <div style={{ margin: '0 0 16px' }}>
          {block.title && (
            <h4 style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>
              <RichText text={block.title} idKey={`${idKey}-t`} />
            </h4>
          )}
          <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {block.steps.map((s, i) => (
              <li
                key={i}
                style={{
                  display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start',
                  background: 'rgba(148,163,184,0.07)', borderRadius: 12, padding: '10px 12px',
                  border: s.safety ? `1px solid ${STEP_SAFETY_COLOR[s.safety]}33` : '1px solid rgba(15,23,42,0.06)',
                }}
              >
                <span
                  style={{
                    flexShrink: 0, width: 22, height: 22, borderRadius: 999,
                    background: 'rgba(14,165,233,0.14)', color: '#0369a1',
                    fontSize: 11.5, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
                  }}
                >
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, lineHeight: 1.85, color: '#1e293b' }}>
                    <RichText text={s.text} idKey={`${idKey}-s${i}`} />
                  </div>
                  {s.note && (
                    <div style={{ fontSize: 12, lineHeight: 1.75, color: '#64748b', marginTop: 4 }}>
                      <RichText text={s.note} idKey={`${idKey}-s${i}n`} />
                    </div>
                  )}
                  {s.safety && (
                    <div
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6,
                        fontSize: 11, fontWeight: 800, color: STEP_SAFETY_COLOR[s.safety],
                      }}
                    >
                      <AlertTriangle size={12} aria-hidden />
                      {STEP_SAFETY_LABEL[s.safety]}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      );

    case 'table':
      return (
        <figure style={{ margin: '0 0 16px' }}>
          {block.caption && (
            <figcaption style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
              <RichText text={block.caption} idKey={`${idKey}-c`} />
            </figcaption>
          )}
          <ScrollBox>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 480 }}>
              <thead>
                <tr>
                  {block.headers.map((h, i) => (
                    <th key={i} style={TABLE_HEAD} scope="col">
                      <RichText text={h} idKey={`${idKey}-h${i}`} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c} style={TABLE_CELL}>
                        <RichText text={cell} idKey={`${idKey}-r${r}c${c}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollBox>
        </figure>
      );

    case 'callout': {
      const s = CALLOUT_STYLE[block.tone];
      const { Icon } = s;
      return (
        <div
          style={{
            background: s.bg, border: `1px solid ${s.border}`, borderRadius: 14,
            padding: '12px 14px', margin: '0 0 14px', display: 'flex', gap: 10,
          }}
          role={block.tone === 'danger' ? 'alert' : undefined}
        >
          <Icon size={17} style={{ color: s.color, flexShrink: 0, marginTop: 2 }} aria-hidden />
          <div style={{ flex: 1, minWidth: 0 }}>
            {block.title && (
              <div style={{ fontSize: 13, fontWeight: 800, color: s.color, marginBottom: 4 }}>
                <RichText text={block.title} idKey={`${idKey}-t`} />
              </div>
            )}
            <div style={{ fontSize: 13, lineHeight: 1.85, color: '#1e293b' }}>
              <RichText text={block.text} idKey={`${idKey}-b`} />
            </div>
          </div>
        </div>
      );
    }

    case 'definition':
      return (
        <div
          style={{
            border: '1px solid rgba(14,165,233,0.30)', borderRadius: 14,
            background: 'rgba(14,165,233,0.05)', padding: '12px 14px', margin: '0 0 14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <strong style={{ fontSize: 14, color: '#0f172a' }}>{block.term}</strong>
            {block.en && (
              <span dir="ltr" style={{ fontSize: 12, color: '#0369a1', unicodeBidi: 'isolate' }}>{block.en}</span>
            )}
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.9, color: '#1e293b' }}>
            <RichText text={block.text} idKey={`${idKey}-d`} />
          </div>
        </div>
      );

    case 'keyvalue':
      return (
        <div style={{ margin: '0 0 16px' }}>
          {block.caption && (
            <h4 style={{ fontSize: 13, fontWeight: 800, color: '#334155', margin: '0 0 8px' }}>
              <RichText text={block.caption} idKey={`${idKey}-c`} />
            </h4>
          )}
          <dl style={{ margin: 0 }}>
            {block.pairs.map((p, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', gap: 10, padding: '8px 10px', alignItems: 'flex-start',
                  borderBottom: i === block.pairs.length - 1 ? 'none' : '1px solid rgba(15,23,42,0.07)',
                }}
              >
                <dt style={{ flex: '0 0 34%', fontSize: 12.5, fontWeight: 800, color: '#0f172a', lineHeight: 1.7 }}>
                  <RichText text={p.k} idKey={`${idKey}-k${i}`} />
                </dt>
                <dd style={{ flex: 1, margin: 0, fontSize: 12.5, lineHeight: 1.8, color: '#334155' }}>
                  <RichText text={p.v} idKey={`${idKey}-v${i}`} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      );

    case 'compare':
      return (
        <figure style={{ margin: '0 0 16px' }}>
          {block.caption && (
            <figcaption style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
              <RichText text={block.caption} idKey={`${idKey}-c`} />
            </figcaption>
          )}
          <ScrollBox>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 520 }}>
              <thead>
                <tr>
                  <th style={TABLE_HEAD} scope="col" />
                  {block.columns.map((c, i) => (
                    <th key={i} style={TABLE_HEAD} scope="col">
                      <RichText text={c} idKey={`${idKey}-col${i}`} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r}>
                    <th style={{ ...TABLE_CELL, fontWeight: 800, background: 'rgba(148,163,184,0.08)' }} scope="row">
                      <RichText text={row.label} idKey={`${idKey}-rl${r}`} />
                    </th>
                    {row.cells.map((cell, c) => (
                      <td key={c} style={TABLE_CELL}>
                        <RichText text={cell} idKey={`${idKey}-r${r}c${c}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollBox>
        </figure>
      );

    case 'diagram':
      return (
        <figure style={{ margin: '0 0 16px' }}>
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(15,23,42,0.08)' }}>
            <EducationalDiagram type={block.diagramType} />
          </div>
          {block.caption && (
            <figcaption style={{ fontSize: 12, color: '#64748b', marginTop: 6, textAlign: 'center' }}>
              <RichText text={block.caption} idKey={`${idKey}-c`} />
            </figcaption>
          )}
        </figure>
      );

    case 'faq':
      return (
        <div style={{ margin: '0 0 16px' }}>
          {block.items.map((it, i) => (
            <details
              key={i}
              style={{
                border: '1px solid rgba(15,23,42,0.09)', borderRadius: 12,
                padding: '10px 12px', marginBottom: 8, background: 'rgba(255,255,255,0.6)',
              }}
            >
              <summary
                style={{
                  fontSize: 13.5, fontWeight: 700, color: '#0f172a', cursor: 'pointer',
                  listStyle: 'none', display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <ChevronDown size={15} aria-hidden style={{ flexShrink: 0, color: '#0369a1' }} />
                <span style={{ flex: 1 }}><RichText text={it.q} idKey={`${idKey}-q${i}`} /></span>
              </summary>
              <div style={{ fontSize: 13, lineHeight: 1.9, color: '#334155', marginTop: 8, paddingInlineStart: 23 }}>
                <RichText text={it.a} idKey={`${idKey}-a${i}`} />
              </div>
            </details>
          ))}
        </div>
      );

    case 'checklist':
      return (
        <div
          style={{
            margin: '0 0 16px', border: '1px solid rgba(16,185,129,0.30)',
            borderRadius: 14, background: 'rgba(16,185,129,0.05)', padding: '12px 14px',
          }}
        >
          {block.title && (
            <h4 style={{ fontSize: 13, fontWeight: 800, color: '#047857', margin: '0 0 8px' }}>
              <RichText text={block.title} idKey={`${idKey}-t`} />
            </h4>
          )}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {block.items.map((it, i) => (
              <li
                key={i}
                style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                  fontSize: 13, lineHeight: 1.8, color: '#1e293b', marginBottom: 6,
                }}
              >
                <span style={{ color: '#059669', flexShrink: 0, fontWeight: 900 }} aria-hidden>☐</span>
                <span style={{ flex: 1 }}><RichText text={it} idKey={`${idKey}-c${i}`} /></span>
              </li>
            ))}
          </ul>
        </div>
      );

    default:
      return null;
  }
};

export const BlockList: React.FC<{ blocks: KbBlock[]; idKey: string }> = ({ blocks, idKey }) => (
  <>
    {blocks.map((b, i) => (
      <BlockRenderer key={`${idKey}-${i}`} block={b} idKey={`${idKey}-${i}`} />
    ))}
  </>
);
