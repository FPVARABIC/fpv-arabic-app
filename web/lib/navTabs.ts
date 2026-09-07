/**
 * The tab bar's contents — the web's copy of the phone app's `mainNav`.
 *
 * WHY THIS IS ITS OWN FILE AND NOT PART OF `siteNav.ts`
 * -----------------------------------------------------
 * `siteNav.ts` is the site MAP: every destination, with its blurb, its auth
 * requirement and its role. This is the TAB BAR: the six places a person
 * navigates between constantly, with the icon the phone app uses. They are
 * different lists with different jobs, and merging them is how the tab bar ends
 * up with eleven entries.
 *
 * THE ORDER, AND WHO DECIDED IT
 * -----------------------------
 * Fixed by the owner, and it is the whole point of this list:
 *
 *   الرئيسية · الدروس · الموسوعة · البناء · المشاريع · المتجر
 *
 * It reads as the arc a person actually walks: learn the path, look a thing up,
 * build the aircraft, see what others built with it, buy what is missing. The
 * order is identical on the header bar and the phone bar because both render
 * from THIS array through one component — there is no second list that could
 * drift, and `scripts/testNavOrder.ts` pins the sequence id by id.
 *
 * «البناء» IS BACK, AND WHY IT WAS GONE
 * -------------------------------------
 * The phone app has carried «البناء» in its bottom bar all along (`/roadmap`).
 * The web never had a build route: the stages were rendered only inside
 * `/project` — «مشروعي» — as one tab of a private, `noindex`, client-only
 * workspace that shows nothing at all until the reader has created a project.
 * So the section existed, the content existed, and there was no door. There is
 * one now: `/build`, which renders the same component from the same data. It
 * sits directly after «الموسوعة» and before «المشاريع», by instruction.
 *
 * WHAT IS NOT ON THIS BAR, AND IS NOT DELETED
 * -------------------------------------------
 * «المجتمع» and «البرامج» are not tabs. That is a NAVIGATION decision and
 * nothing more — `/community` and `/programming` still exist, still build,
 * still carry every page they carried, are still in `siteNav.ts`, and are still
 * reached from search, from the encyclopedia's links and from their own routes.
 * Nothing about either section was removed, so putting either back is one line
 * in this array. The bar is six entries because the owner named six.
 *
 * WHY THERE IS NO SEARCH TAB
 * --------------------------
 * There was one, and it duplicated the field in the header — two controls, one
 * destination, on a bar where every slot is contested. Search is a TOOL, not a
 * section: it is reachable from every page through the header field, which is
 * a real field on a phone too rather than an icon.
 *
 * `activeMatch` mirrors the app's `activeMatchPrefixes`: the encyclopedia tab
 * stays lit while you are in the glossary or diagnostics, because those are the
 * encyclopedia as far as a reader is concerned. `/search` deliberately lights
 * nothing — it belongs to no section, and the results page carries the query in
 * its own prominent field, so there is no doubt about where you are.
 */

import {
  House, BookOpen, Hammer, Wrench, Library, Store,
  type LucideIcon,
} from 'lucide-react';

export interface NavTab {
  id: string;
  labelAr: string;
  href: string;
  Icon: LucideIcon;
  /**
   * Extra path prefixes that should light this tab.
   *
   * Without it, a reader who searches from the encyclopedia watches the lit tab
   * go out and no other come on — which reads as «you have left the app».
   */
  activeMatch?: string[];
}

export const NAV_TABS: NavTab[] = [
  { id: 'home', labelAr: 'الرئيسية', href: '/', Icon: House },
  /*
   * «الدروس», right after home.
   *
   * Added in the lessons rebuild (docs/LESSONS-REBUILD-PLAN.md). The first
   * tester's first note was that the lessons and their quizzes had vanished
   * from the new site; they had — the phone app carried them and nothing
   * deployed the phone app. The tab uses the phone's icon so a returning
   * learner recognises it without reading.
   */
  { id: 'lessons', labelAr: 'الدروس', href: '/lessons', Icon: BookOpen },
  { id: 'kb', labelAr: 'الموسوعة', href: '/kb', Icon: Library,
    activeMatch: ['/kb', '/glossary', '/diagnose'] },
  /*
   * «البناء» — the build guide, restored as a section of its own.
   *
   * `Wrench` is the phone app's own icon for this tab (`BottomNavigation.tsx`),
   * kept so somebody with the app open recognises the bar without reading it.
   */
  { id: 'build', labelAr: 'البناء', href: '/build', Icon: Wrench },
  { id: 'projects', labelAr: 'المشاريع', href: '/projects', Icon: Hammer,
    // «مشروعي» — the reader's OWN build — keeps its route and is reachable from
    // the home page and the account rail. It is not deleted and not merged: one
    // is a private workspace holding their parts, the other is a public library
    // of builds to learn from, and a tab bar with both is a tab bar that makes
    // somebody read it.
    activeMatch: ['/projects', '/project'] },
  { id: 'store', labelAr: 'المتجر', href: '/store', Icon: Store },
];

/**
 * Whether a tab owns the current path.
 *
 * Exported so the header, the bottom bar and the test all decide this the same
 * way. Two components answering «am I active» with two slightly different rules
 * is how a bar ends up with two tabs lit at once.
 */
export function isTabActive(tab: NavTab, pathname: string): boolean {
  if (tab.href === '/') return pathname === '/';
  const prefixes = tab.activeMatch ?? [tab.href];
  return prefixes.some(p => pathname === p || pathname.startsWith(`${p}/`));
}
