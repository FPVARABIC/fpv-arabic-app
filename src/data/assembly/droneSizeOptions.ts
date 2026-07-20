import { CATEGORY_ICON_PATH } from './categoryIcons';

export interface DroneSizeOption {
  sizeInch: number;
  labelAr: string;
  imagePath?: string;
  placeholderIcon?: string;
}

// 3.5" was removed (2026-07-17): the real frame catalog has no frame within
// frameMatchesSize's tolerance of 3.5", so offering it here only led to a
// guaranteed dead end at the frame stage. Re-add it only once a real 3.5"
// frame exists in src/data/assembly/parts/frames.ts.
//
// imagePath reuses the existing frames category icon — same reasoning as
// droneTypes.ts: no dedicated per-size artwork exists, and a frame's size is
// literally what this card lets the user choose, so the frames icon is a
// more honest fallback than the generic 📏 emoji this used to render as.
export const droneSizeOptions: DroneSizeOption[] = [
  { sizeInch: 5,   labelAr: '5 إنش', imagePath: CATEGORY_ICON_PATH.frames },
  { sizeInch: 7,   labelAr: '7 إنش', imagePath: CATEGORY_ICON_PATH.frames },
];
