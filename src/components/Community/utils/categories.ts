import { ALL_CATEGORY_IDS, type PostCategory } from '../types';

export { ALL_CATEGORY_IDS };
export type { PostCategory };

// Arabic display labels for ALL nine ids. The four originally-locked ones are
// final. The five schema-ready-only ones carry provisional labels — they
// render nowhere in V1 UI since they never appear in VISIBLE_CATEGORY_IDS.
export const CATEGORY_LABELS: Record<PostCategory, string> = {
  questions: 'أسئلة ومشاكل',
  parts: 'قطع ومعدات',
  projects: 'مشاريع',
  flights: 'رحلات وتجارب',
  betaflight: 'Betaflight', // TODO: Ahmed will confirm Arabic label when activated
  electronics: 'إلكترونيات', // TODO: Ahmed will confirm Arabic label when activated
  'long-range': 'مدى طويل', // TODO: Ahmed will confirm Arabic label when activated
  cinematic: 'Cinematic', // TODO: Ahmed will confirm Arabic label when activated
  freestyle: 'Freestyle', // TODO: Ahmed will confirm Arabic label when activated
};

// The ONLY categories selectable in PostComposer and shown as CategoryChips in
// V1. "الكل" is added by CategoryChips itself as a filter-only pseudo-value —
// never stored as a category (see Post.category in types.ts).
// Activating a new category later = adding its id to this one list.
export const VISIBLE_CATEGORY_IDS = ['questions', 'parts', 'projects', 'flights'] as const satisfies readonly PostCategory[];

type VisibleCategoryId = (typeof VISIBLE_CATEGORY_IDS)[number];

// Card tints (D12) — defined only for the currently visible four. Tints for
// the five schema-ready-only categories are deliberately not invented here;
// they'll be designed alongside whichever category is activated next.
export const CATEGORY_TINTS: Record<VisibleCategoryId, { bg: string; text: string }> = {
  questions: { bg: '#fdf1e3', text: '#9a6217' },
  flights: { bg: '#e8f3ec', text: '#2e7d4f' },
  parts: { bg: '#eef2f6', text: '#5a6b7c' },
  projects: { bg: '#eef2f6', text: '#5a6b7c' },
};
