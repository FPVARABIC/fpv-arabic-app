// One icon per PART_CATEGORY_MAP key (see assemblyPersistence.ts) — the
// per-category fallback tier PartCard.tsx uses when a part has no own
// imagePath, before falling back further to part.placeholderIcon/emoji.
// The files themselves are uploaded manually (outside any Claude Code
// session) directly to this path via the GitHub web UI — until each one
// exists, PartCard's <img onError> swaps to the emoji tier, same as any
// other missing/failed image.
// batteries/buzzers/capacitors/tools are .webp, not .png — the uploaded
// files were actually WebP-encoded despite the requested .png extension;
// renamed to match their real byte content rather than served with a
// mismatched extension.
export const CATEGORY_ICON_PATH: Record<string, string> = {
  frames: '/assets/assembly/category-icons/frames.png',
  motors: '/assets/assembly/category-icons/motors.png',
  escs: '/assets/assembly/category-icons/escs.png',
  flightControllers: '/assets/assembly/category-icons/flightControllers.png',
  receivers: '/assets/assembly/category-icons/receivers.png',
  videoUnits: '/assets/assembly/category-icons/videoUnits.png',
  gps: '/assets/assembly/category-icons/gps.png',
  buzzers: '/assets/assembly/category-icons/buzzers.webp',
  capacitors: '/assets/assembly/category-icons/capacitors.webp',
  propellers: '/assets/assembly/category-icons/propellers.png',
  batteries: '/assets/assembly/category-icons/batteries.webp',
  tools: '/assets/assembly/category-icons/tools.webp',
};
