/**
 * The link between what the user is reading and what the user owns.
 *
 * This is the piece that makes the encyclopedia stop being an encyclopedia. An
 * article about ESC current ratings is the same article for everyone; the fact
 * that YOUR ESC is rated 55 A, that we could not verify your motor's draw
 * against it, and that this exact question is open on your build — that is not
 * in any article, and it is what turns reading into progress.
 *
 * Two directions are resolved here, both from data that already exists:
 *
 *   module → your parts      a declared mapping, because "which parts is this
 *                            module about" is an editorial judgement, not
 *                            something to infer from text
 *   article ← your findings  computed, because every finding already carries
 *                            the links it considered relevant; reversing that
 *                            index cannot invent a connection that the verdict
 *                            engine did not already assert
 *
 * Nothing here fabricates relevance. A module with no mapped slots, or an
 * article no finding points at, simply produces nothing — and the UI renders
 * nothing rather than an empty heading.
 */

import type { BasePart } from '../assembly/types';
import type { Finding, ProjectSnapshot } from './types';

/** A part slot on the snapshot, with the label the user sees for it. */
interface PartSlot {
  key: keyof ProjectSnapshot;
  labelAr: string;
}

const SLOT = {
  frame: { key: 'frame', labelAr: 'الهيكل' },
  motor: { key: 'motor', labelAr: 'المحركات' },
  esc: { key: 'esc', labelAr: 'الـESC' },
  flightController: { key: 'flightController', labelAr: 'متحكم الطيران' },
  battery: { key: 'battery', labelAr: 'البطارية' },
  propeller: { key: 'propeller', labelAr: 'المراوح' },
  receiver: { key: 'receiver', labelAr: 'المستقبل' },
  videoUnit: { key: 'videoUnit', labelAr: 'وحدة الفيديو' },
  gps: { key: 'gps', labelAr: 'وحدة GPS' },
} as const satisfies Record<string, PartSlot>;

/**
 * Which of the user's parts each knowledge module is about.
 *
 * Deliberately more than one slot per module where the subject genuinely spans
 * parts: the ESC module reasons about the motors it drives and the battery it
 * switches, and showing only the ESC would hide half of what the reader needs
 * to apply the article to their own build. It is deliberately NOT every part —
 * a list of everything the user owns on every page is noise, and noise is what
 * makes people stop reading these panels at all.
 */
export const MODULE_PART_SLOTS: Record<string, PartSlot[]> = {
  'flight-controller': [SLOT.flightController, SLOT.receiver, SLOT.videoUnit, SLOT.gps],
  esc: [SLOT.esc, SLOT.motor, SLOT.battery],
  motors: [SLOT.motor, SLOT.propeller, SLOT.battery],
  propellers: [SLOT.propeller, SLOT.motor, SLOT.frame],
  'power-battery': [SLOT.battery, SLOT.esc],
  // The link ends at the flight controller's serial port, so the board the
  // reader owns is as much a part of this subject as the receiver itself:
  // which UART is free and whether it inverts decides whether the wiring in
  // these articles will work at all on their build.
  'rc-link': [SLOT.receiver, SLOT.flightController],
};

export interface ProjectPartRef {
  labelAr: string;
  part: BasePart;
}

/** The user's parts that this module is actually about, in declared order. */
export function projectPartsForModule(p: ProjectSnapshot, moduleId: string): ProjectPartRef[] {
  if (!p.exists) return [];
  const slots = MODULE_PART_SLOTS[moduleId];
  if (!slots) return [];
  const out: ProjectPartRef[] = [];
  for (const s of slots) {
    const part = p[s.key] as BasePart | undefined;
    if (part) out.push({ labelAr: s.labelAr, part });
  }
  return out;
}

/**
 * The findings that named this article as worth reading.
 *
 * The relationship is asserted by the verdict engine, not guessed here: a
 * finding appears on an article only because that finding's own author decided
 * this article explains it.
 */
export function findingsForArticle(findings: Finding[], articleId: string): Finding[] {
  return findings.filter(f =>
    f.links.some(l => l.kind === 'article' && l.targetId === articleId));
}

/** True when there is genuinely something project-specific to show. */
export function hasProjectContext(parts: ProjectPartRef[], findings: Finding[]): boolean {
  return parts.length > 0 || findings.length > 0;
}
