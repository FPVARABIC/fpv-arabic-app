/**
 * The tab bar's contents — the web's copy of the phone app's `mainNav`.
 *
 * WHY THIS IS ITS OWN FILE AND NOT PART OF `siteNav.ts`
 * -----------------------------------------------------
 * `siteNav.ts` is the site MAP: every destination, with its blurb, its auth
 * requirement and its role. This is the TAB BAR: the seven places a person
 * navigates between constantly, in the order the phone app puts them, with the
 * icon the phone app uses. They are different lists with different jobs, and
 * merging them is how the tab bar ends up with eleven entries.
 *
 * WHAT IS COPIED AND WHAT IS NOT
 * ------------------------------
 * Order, labels and icons are copied from `src/components/BottomNavigation.tsx`
 * exactly, because that recognition is the entire point of this work: somebody
 * with the app open must not have to read the bar to use it.
 *
 * One entry differs, and it is the one the shop's owner asked for. The phone's
 * seventh tab is «التجميع» — a step-by-step assembly flow built around a phone
 * held in one hand while the other holds a soldering iron. The web's seventh
 * tab is «المتجر». Nothing else moves.
 *
 * `activeMatch` mirrors the app's `activeMatchPrefixes`: the encyclopedia tab
 * stays lit while you are in search, the glossary or diagnostics, because those
 * are the encyclopedia as far as a reader is concerned.
 */

import {
  House, Hammer, Wrench, BookOpen, Library, CircuitBoard, Store,
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
  { id: 'project', labelAr: 'مشروعي', href: '/project', Icon: Hammer },
  { id: 'programming', labelAr: 'البرامج', href: '/programming', Icon: CircuitBoard,
    activeMatch: ['/programming', '/betaflight'] },
  { id: 'kb', labelAr: 'الموسوعة', href: '/kb', Icon: Library,
    activeMatch: ['/kb', '/glossary', '/diagnose'] },
  { id: 'search', labelAr: 'البحث', href: '/search', Icon: BookOpen },
  { id: 'community', labelAr: 'المجتمع', href: '/community', Icon: Wrench },
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
