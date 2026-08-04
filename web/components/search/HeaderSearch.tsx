'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SECTION_ROUTES } from '@/lib/webRoutes';

/**
 * Search, reachable from every page.
 *
 * WHY A FORM AND NOT A COMMAND PALETTE
 * ------------------------------------
 * A palette was considered and rejected for this batch. Doing one properly
 * means a live result list, which means either shipping the index to the
 * browser — 1.7 MB of tokens on every page load, for a feature most visitors
 * never use — or a request per keystroke. Both are worse than a form that
 * submits to a page which already ranks well and explains itself.
 *
 * What it keeps from the palette idea is the part that actually helps: a
 * keyboard shortcut that puts the cursor in the box from anywhere, without
 * touching the mouse.
 *
 * ACCESSIBILITY IS THE REASON THIS IS SMALL
 * -----------------------------------------
 * The requirement was explicit: do not add a shortcut or an interface that is
 * not reachable by keyboard and screen reader. A plain labelled input inside a
 * form with `role="search"` is reachable by construction — it is a text field
 * and a submit button, announced correctly with no ARIA at all. Every widget
 * that would have needed `aria-activedescendant` to be usable is a widget this
 * page does not have.
 *
 * The shortcut never steals a keystroke from someone who is typing: it is
 * ignored while focus is in any field, and `/` is only a shortcut when it is
 * not being typed INTO something.
 *
 * IT IS NOW THE ONLY WAY IN, SO IT IS A FIELD EVERYWHERE
 * ------------------------------------------------------
 * There used to be three doors to one room: this field, an icon that replaced
 * it below 620px, and a «البحث» tab in the navigation bar. The tab is gone and
 * the icon with it — a magnifier glyph is not «حقل بحث واضح», and on a phone,
 * where searching matters most, the clear control was the one that got dropped.
 *
 * The width problem that icon solved was real, so it is solved differently: on
 * a narrow screen the field wraps onto its OWN full-width row under the
 * wordmark instead of competing for the first row. The tabs are not in the
 * header at that size — they are in the bottom bar — so the row is free. See
 * `.header-search-full` in globals.css.
 *
 * A GET form, not a router push, so it works before hydration and in a static
 * copy: the query lands in the URL either way, which is what makes a result
 * page shareable.
 */
export const HeaderSearch: React.FC = () => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      );

      // Escape returns focus to the page, from inside the field only.
      if (e.key === 'Escape' && target === inputRef.current) {
        inputRef.current?.blur();
        return;
      }
      if (typing) return;

      // «/» is the convention every developer already has in their fingers, and
      // Ctrl/Cmd-K is the one everyone else does.
      if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <form
      role="search"
      // A real action + method, so submitting works with no JavaScript at all —
      // the handler below is an enhancement, not the mechanism.
      action={SECTION_ROUTES.search}
      method="get"
      className="header-search-full"
      data-testid="header-search"
      onSubmit={e => {
        const q = value.trim();
        if (q.length < 2) return; // let the browser's own submit do nothing useful
        e.preventDefault();
        router.push(`${SECTION_ROUTES.search}?q=${encodeURIComponent(q)}`);
      }}
    >
      <label htmlFor="header-q" className="sr-only">ابحث في المنصة</label>
      <span aria-hidden className="header-search-icon">⌕</span>
      <input
        id="header-q"
        ref={inputRef}
        type="search"
        name="q"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="ابحث في المنصّة…"
        data-testid="header-search-input"
        autoComplete="off"
        className="header-search-input"
      />
      <button type="submit" className="header-search-go" data-testid="header-search-go">
        ابحث
      </button>
    </form>
  );
};
