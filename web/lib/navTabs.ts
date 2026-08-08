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
 * held in one hand while the other holds a soldering iron. The web's tab is
 * «المتجر».
 *
 * THE ORDER, AND WHY IT IS NOT THE PHONE'S
 * ----------------------------------------
 * «البناء» is second, by instruction: the community section was retired from
 * the web experience and its slot — the platform's second position — now
 * belongs to the thing this platform actually walks a person through,
 * building a drone. The store closes the bar, also by instruction:
 *
 *   الرئيسية · البناء · البرامج · الموسوعة · المشاريع · المتجر
 *
 * The encyclopedia stays mid-bar deliberately. It is the largest section, and
 * being largest is exactly why it kept reading as the whole product — the brief
 * was «لا تجعل الموسوعة تهيمن بصرياً على بقية المنصة». Nothing was removed from
 * it; it simply stops being the first thing every surface points at.
 *
 * WHY THERE IS NO SEARCH TAB
 * --------------------------
 * There was one, and it duplicated the field in the header — two controls, one
 * destination, on a bar where every slot is contested. Search is a TOOL, not a
 * section: it is reachable from every page through the header field, which is
 * now a real field on a phone too rather than an icon. Removing the tab also
 * buys the remaining six tabs ~11% more width each at 390px.
 *
 * `activeMatch` mirrors the app's `activeMatchPrefixes`: the encyclopedia tab
 * stays lit while you are in the glossary or diagnostics, because those are the
 * encyclopedia as far as a reader is concerned. `/search` deliberately lights
 * nothing — it belongs to no section, and the results page carries the query in
 * its own prominent field, so there is no doubt about where you are.
 */

import {
  House, Hammer, Wrench, Library, CircuitBoard, Store,
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
  { id: 'build', labelAr: 'البناء', href: '/build', Icon: Wrench,
    // «مشروعي» — the reader's OWN build — keeps its route and lights THIS tab:
    // the wizard writes the same one project store the workspace reads, so as
    // far as a reader is concerned /project IS the build section's workspace.
    // It is not deleted and not merged — it simply belongs here now.
    activeMatch: ['/build', '/project'] },
  { id: 'programming', labelAr: 'البرامج', href: '/programming', Icon: CircuitBoard,
    activeMatch: ['/programming', '/betaflight'] },
  { id: 'kb', labelAr: 'الموسوعة', href: '/kb', Icon: Library,
    activeMatch: ['/kb', '/glossary', '/diagnose'] },
  { id: 'projects', labelAr: 'المشاريع', href: '/projects', Icon: Hammer },
  // Last by instruction: the shop closes the bar rather than leading it.
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
