// Preset avatar picker (Part C) — original, abstract, drone/tech-themed
// icons, no custom upload (Blaze-blocked, see docs/KNOWN_ISSUES.md). Every
// `path` here MUST exactly match the preset-path allow-list hardcoded in
// firestore.rules' users/{uid} update rule (Rules can't import this file —
// duplication is an accepted trade-off, same as other shape checks there).
export interface AvatarOption {
  id: string;
  path: string;
  label: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'racing-quad',      path: '/assets/avatars/racing-quad.svg',      label: 'الطائرة السباقة' },
  { id: 'fpv-eye',          path: '/assets/avatars/fpv-eye.svg',          label: 'عين FPV' },
  { id: 'cinewhoop',        path: '/assets/avatars/cinewhoop.svg',        label: 'الدوامة الهادئة' },
  { id: 'lightning',        path: '/assets/avatars/lightning.svg',        label: 'البرق' },
  { id: 'satellite',        path: '/assets/avatars/satellite.svg',        label: 'القمر الصناعي' },
  { id: 'controller',       path: '/assets/avatars/controller.svg',       label: 'جهاز التحكم' },
  { id: 'shield',           path: '/assets/avatars/shield.svg',           label: 'درع الإشارة' },
  { id: 'night-flyer',      path: '/assets/avatars/night-flyer.svg',      label: 'طائر الليل' },
  { id: 'spark',            path: '/assets/avatars/spark.svg',            label: 'الشرارة' },
  { id: 'propeller-swirl',  path: '/assets/avatars/propeller-swirl.svg',  label: 'دوامة المروحة' },
];

export const AVATAR_PATHS: ReadonlySet<string> = new Set(AVATAR_OPTIONS.map(a => a.path));
