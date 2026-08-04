'use client';

import Link from 'next/link';
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
 * AND IT SHRINKS TO A LINK
 * ------------------------
 * At 390px the header already carries a logo, five nav links and an account
 * control; a text field on top of that pushed the page into horizontal
 * scrolling. Below 620px it becomes a labelled icon link to the search page
 * instead — same destination, no width pressure, and a plain anchor needs no
 * ARIA to be announced properly.
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
    <>
    <Link
      href={SECTION_ROUTES.search}
      className="header-search-compact"
      data-testid="header-search-compact"
      aria-label="ابحث في المنصة"
      style={{
        flexShrink: 0, alignItems: 'center', justifyContent: 'center',
        width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border)',
        color: 'var(--text-dim)', fontSize: 15,
      }}
    >
      <span aria-hidden>⌕</span>
    </Link>

    <form
      role="search"
      className="header-search-full"
      data-testid="header-search"
      onSubmit={e => {
        e.preventDefault();
        const q = value.trim();
        if (q.length >= 2) router.push(`${SECTION_ROUTES.search}?q=${encodeURIComponent(q)}`);
      }}
      style={{ flexShrink: 0, alignItems: 'center' }}
    >
      <label htmlFor="header-q" className="sr-only">ابحث في المنصة</label>
      <input
        id="header-q"
        ref={inputRef}
        type="search"
        name="q"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="ابحث…"
        data-testid="header-search-input"
        autoComplete="off"
        style={{
          width: 'clamp(90px, 18vw, 200px)', minWidth: 0,
          padding: '7px 11px', borderRadius: 9,
          border: '1px solid var(--border)', background: 'var(--surface-2)',
          color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
        }}
      />
      <button type="submit" className="sr-only">ابحث</button>
    </form>
    </>
  );
};
