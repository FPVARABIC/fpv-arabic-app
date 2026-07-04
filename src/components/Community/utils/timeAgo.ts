import type { Timestamp } from 'firebase/firestore';

// Arabic relative time with Western digits (D12 — no Eastern Arabic numerals
// anywhere in Community UI, even though Arabic labels surround the number).

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
