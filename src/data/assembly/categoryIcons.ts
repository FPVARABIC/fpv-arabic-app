// One SVG icon per PART_CATEGORY_MAP key (see assemblyPersistence.ts) — the
// per-category fallback tier PartCard.tsx uses when a part has no own
// imagePath, before falling back further to part.placeholderIcon/emoji.
export const CATEGORY_ICON_PATH: Record<string, string> = {
  frames: '/assets/assembly/category-icons/frames.svg',
  motors: '/assets/assembly/category-icons/motors.svg',
  escs: '/assets/assembly/category-icons/escs.svg',
  flightControllers: '/assets/assembly/category-icons/flightControllers.svg',
  receivers: '/assets/assembly/category-icons/receivers.svg',
  videoUnits: '/assets/assembly/category-icons/videoUnits.svg',
  gps: '/assets/assembly/category-icons/gps.svg',
  buzzers: '/assets/assembly/category-icons/buzzers.svg',
  capacitors: '/assets/assembly/category-icons/capacitors.svg',
  propellers: '/assets/assembly/category-icons/propellers.svg',
  batteries: '/assets/assembly/category-icons/batteries.svg',
  tools: '/assets/assembly/category-icons/tools.svg',
};
