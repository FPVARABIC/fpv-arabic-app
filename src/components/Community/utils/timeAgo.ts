import type { Timestamp } from '../types';

// Arabic relative time with Western digits (D12 — no Eastern Arabic numerals
// anywhere in Community UI, even though Arabic labels surround the number).
//
// The Timestamp here is Community's own structural one, not Firestore's class.
// It has to be: the fields on a post now carry the structural type, and the
// class demands `isEqual` and `toJSON` on top of it, so the class type would
// reject every real caller. The structural type is the WIDER contract — a
// genuine Firestore Timestamp satisfies it — so both kinds of value are
// accepted here, and `.toMillis()`, the only member this function touches, is
// present on both.

const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const WEEK = DAY * 7;
const MONTH = DAY * 30;
const YEAR = DAY * 365;

export const timeAgo = (timestamp: Timestamp, now: Date = new Date()): string => {
  const seconds = Math.max(0, Math.floor((now.getTime() - timestamp.toMillis()) / 1000));

  if (seconds < MINUTE) return 'الآن';
  if (seconds < HOUR) return `منذ ${Math.floor(seconds / MINUTE)} دقيقة`;
  if (seconds < DAY) return `منذ ${Math.floor(seconds / HOUR)} ساعة`;
  if (seconds < WEEK) return `منذ ${Math.floor(seconds / DAY)} يوم`;
  if (seconds < MONTH) return `منذ ${Math.floor(seconds / WEEK)} أسبوع`;
  if (seconds < YEAR) return `منذ ${Math.floor(seconds / MONTH)} شهر`;
  return `منذ ${Math.floor(seconds / YEAR)} سنة`;
};
