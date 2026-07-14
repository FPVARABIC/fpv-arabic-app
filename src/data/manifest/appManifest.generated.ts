// AUTO-GENERATED — do not edit by hand.
// Source: scripts/buildAppManifest.ts
// Regenerate: npm run predev  (or npm run build)

export type AppResourceType =
  | 'lesson'
  | 'roadmap_step'
  | 'betaflight_section'
  | 'checklist_group'
  | 'troubleshooting_item';

export interface AppResource {
  readonly id: string;
  readonly title: string;
  readonly route: string;
  readonly type: AppResourceType;
  /** Phase 0: always empty. Populated once source data gains conceptId annotations. */
  readonly conceptIds: readonly string[];
  readonly order?: number;
}

export const appManifest: readonly AppResource[] = [
  { id: "lesson-quadcopter-intro", title: "ما هو الكوادكابتر؟", route: "/lessons/lesson-quadcopter-intro", type: 'lesson', conceptIds: ["drone_build_basics"], order: 1 },
  { id: "lesson-quadcopter-how-it-works", title: "كيف يعمل الكوادكابتر؟", route: "/lessons/lesson-quadcopter-how-it-works", type: 'lesson', conceptIds: ["drone_build_basics"], order: 2 },
  { id: "lesson-drone-parts", title: "القطع الأساسية في الدرون", route: "/lessons/lesson-drone-parts", type: 'lesson', conceptIds: ["drone_build_basics"], order: 3 },
  { id: "lesson-define-goal", title: "لا تشترِ عشوائيًا", route: "/lessons/lesson-define-goal", type: 'lesson', conceptIds: ["drone_build_basics"], order: 4 },
  { id: "lesson-drone-size", title: "اختيار حجم الدرون", route: "/lessons/lesson-drone-size", type: 'lesson', conceptIds: ["drone_build_basics"], order: 5 },
  { id: "lesson-electricity-basics", title: "أساسيات الكهرباء", route: "/lessons/lesson-electricity-basics", type: 'lesson', conceptIds: ["wiring_basics","power_battery"], order: 6 },
  { id: "lesson-lipo-batteries", title: "بطاريات LiPo للمبتدئين", route: "/lessons/lesson-lipo-batteries", type: 'lesson', conceptIds: ["power_battery","lipo_safety"], order: 7 },
  { id: "lesson-power-rails", title: "GND / 5V / VBAT", route: "/lessons/lesson-power-rails", type: 'lesson', conceptIds: ["wiring_basics"], order: 8 },
  { id: "lesson-tx-rx", title: "قاعدة TX/RX", route: "/lessons/lesson-tx-rx", type: 'lesson', conceptIds: ["tx_rx_rule"], order: 9 },
  { id: "lesson-pre-battery-safety", title: "السلامة قبل البطارية", route: "/lessons/lesson-pre-battery-safety", type: 'lesson', conceptIds: ["lipo_safety","wiring_basics"], order: 10 },
  { id: "lesson-frame-assembly", title: "تركيب الهيكل Frame", route: "/lessons/lesson-frame-assembly", type: 'lesson', conceptIds: ["drone_build_basics"], order: 11 },
  { id: "lesson-motor-install", title: "تركيب المحركات", route: "/lessons/lesson-motor-install", type: 'lesson', conceptIds: ["motor_basic"], order: 12 },
  { id: "lesson-esc-install", title: "تركيب ESC", route: "/lessons/lesson-esc-install", type: 'lesson', conceptIds: ["esc_basic"], order: 13 },
  { id: "lesson-fc-install", title: "تركيب Flight Controller", route: "/lessons/lesson-fc-install", type: 'lesson', conceptIds: ["flight_controller_basic"], order: 14 },
  { id: "lesson-receiver-install", title: "تركيب Receiver", route: "/lessons/lesson-receiver-install", type: 'lesson', conceptIds: ["receiver_basic"], order: 15 },
  { id: "lesson-video-system", title: "تركيب نظام الفيديو", route: "/lessons/lesson-video-system", type: 'lesson', conceptIds: ["vtx_basic"], order: 16 },
  { id: "build-soldering-basics", title: "أساسيات اللحام والتوصيل", route: "/roadmap", type: 'roadmap_step', conceptIds: ["wiring_basics"], order: 1 },
  { id: "build-parts-tools", title: "تجهيز القطع والأدوات", route: "/roadmap", type: 'roadmap_step', conceptIds: ["drone_build_basics"], order: 2 },
  { id: "build-frame", title: "تركيب الفريم", route: "/roadmap", type: 'roadmap_step', conceptIds: ["drone_build_basics"], order: 3 },
  { id: "build-motors", title: "تركيب المحركات", route: "/roadmap", type: 'roadmap_step', conceptIds: ["motor_basic"], order: 4 },
  { id: "build-esc", title: "تركيب ESC", route: "/roadmap", type: 'roadmap_step', conceptIds: ["esc_basic"], order: 5 },
  { id: "build-fc", title: "تركيب Flight Controller", route: "/roadmap", type: 'roadmap_step', conceptIds: ["flight_controller_basic"], order: 6 },
  { id: "build-receiver", title: "تركيب Receiver", route: "/roadmap", type: 'roadmap_step', conceptIds: ["receiver_basic","tx_rx_rule"], order: 7 },
  { id: "build-gps", title: "تركيب GPS", route: "/roadmap", type: 'roadmap_step', conceptIds: ["gps_basics"], order: 8 },
  { id: "build-vtx", title: "تركيب نظام الفيديو VTX", route: "/roadmap", type: 'roadmap_step', conceptIds: ["vtx_basic"], order: 9 },
  { id: "build-pre-battery", title: "فحص قبل البطارية / Smoke Stopper", route: "/roadmap", type: 'roadmap_step', conceptIds: ["lipo_safety","wiring_basics"], order: 10 },
  { id: "interface", title: "واجهة Betaflight", route: "/betaflight/interface", type: 'betaflight_section', conceptIds: ["betaflight_basics"] },
  { id: "firmware", title: "Firmware / تحديث", route: "/betaflight/firmware", type: 'betaflight_section', conceptIds: ["betaflight_basics"] },
  { id: "ports", title: "Ports", route: "/betaflight/ports", type: 'betaflight_section', conceptIds: ["betaflight_basics","receiver_basic"] },
  { id: "receiver", title: "Receiver", route: "/betaflight/receiver", type: 'betaflight_section', conceptIds: ["receiver_basic","betaflight_basics"] },
  { id: "modes", title: "Modes", route: "/betaflight/modes", type: 'betaflight_section', conceptIds: ["betaflight_basics"] },
  { id: "motors", title: "Motors", route: "/betaflight/motors", type: 'betaflight_section', conceptIds: ["motor_basic","betaflight_basics"] },
  { id: "failsafe", title: "Failsafe", route: "/betaflight/failsafe", type: 'betaflight_section', conceptIds: ["betaflight_basics"] },
  { id: "osd", title: "OSD", route: "/betaflight/osd", type: 'betaflight_section', conceptIds: ["betaflight_basics"] },
  { id: "blackbox", title: "Blackbox", route: "/betaflight/blackbox", type: 'betaflight_section', conceptIds: ["betaflight_basics"] },
  { id: "cli", title: "CLI", route: "/betaflight/cli", type: 'betaflight_section', conceptIds: ["betaflight_basics"] },
  { id: "pre-buy", title: "قبل الشراء", route: "/checklists", type: 'checklist_group', conceptIds: [] },
  { id: "pre-battery", title: "قبل البطارية", route: "/checklists", type: 'checklist_group', conceptIds: [] },
  { id: "pre-flight", title: "قبل أول طيران", route: "/checklists", type: 'checklist_group', conceptIds: [] },
  { id: "ts-1", title: "Betaflight لا يحفظ الإعدادات", route: "/troubleshooting", type: 'troubleshooting_item', conceptIds: [] },
  { id: "ts-2", title: "Receiver لا يظهر في Betaflight", route: "/troubleshooting", type: 'troubleshooting_item', conceptIds: [] },
  { id: "ts-3", title: "المحركات لا تدور", route: "/troubleshooting", type: 'troubleshooting_item', conceptIds: [] },
  { id: "ts-4", title: "الدرون لا يعمل Arm", route: "/troubleshooting", type: 'troubleshooting_item', conceptIds: [] },
  { id: "ts-5", title: "اتجاه المحركات خاطئ", route: "/troubleshooting", type: 'troubleshooting_item', conceptIds: [] },
  { id: "ts-6", title: "GPS لا يأخذ Fix", route: "/troubleshooting", type: 'troubleshooting_item', conceptIds: [] }
];

export const MANIFEST_RESOURCE_COUNT = 45;
