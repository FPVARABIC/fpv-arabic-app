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
  { id: "lesson-1", title: "ما هو الكوادكابتر؟", route: "/lessons/lesson-1", type: 'lesson', conceptIds: ["drone_build_basics"], order: 1 },
  { id: "lesson-2", title: "كيف يعمل الكوادكابتر؟", route: "/lessons/lesson-2", type: 'lesson', conceptIds: ["drone_build_basics"], order: 2 },
  { id: "lesson-3", title: "القطع الأساسية في الدرون", route: "/lessons/lesson-3", type: 'lesson', conceptIds: ["drone_build_basics"], order: 3 },
  { id: "lesson-4", title: "لا تشترِ عشوائيًا", route: "/lessons/lesson-4", type: 'lesson', conceptIds: ["drone_build_basics"], order: 4 },
  { id: "lesson-5", title: "اختيار حجم الدرون", route: "/lessons/lesson-5", type: 'lesson', conceptIds: ["drone_build_basics"], order: 5 },
  { id: "lesson-6", title: "أساسيات الكهرباء", route: "/lessons/lesson-6", type: 'lesson', conceptIds: ["wiring_basics","power_battery"], order: 6 },
  { id: "lesson-7", title: "بطاريات LiPo للمبتدئين", route: "/lessons/lesson-7", type: 'lesson', conceptIds: ["power_battery","lipo_safety"], order: 7 },
  { id: "lesson-8", title: "GND / 5V / VBAT", route: "/lessons/lesson-8", type: 'lesson', conceptIds: ["wiring_basics"], order: 8 },
  { id: "lesson-9", title: "قاعدة TX/RX", route: "/lessons/lesson-9", type: 'lesson', conceptIds: ["tx_rx_rule"], order: 9 },
  { id: "lesson-10", title: "السلامة قبل البطارية", route: "/lessons/lesson-10", type: 'lesson', conceptIds: ["lipo_safety","wiring_basics"], order: 10 },
  { id: "lesson-11", title: "تركيب الهيكل Frame", route: "/lessons/lesson-11", type: 'lesson', conceptIds: ["drone_build_basics"], order: 11 },
  { id: "lesson-12", title: "تركيب المحركات", route: "/lessons/lesson-12", type: 'lesson', conceptIds: ["motor_basic"], order: 12 },
  { id: "lesson-13", title: "تركيب ESC", route: "/lessons/lesson-13", type: 'lesson', conceptIds: ["esc_basic"], order: 13 },
  { id: "lesson-14", title: "تركيب Flight Controller", route: "/lessons/lesson-14", type: 'lesson', conceptIds: ["flight_controller_basic"], order: 14 },
  { id: "lesson-15", title: "تركيب Receiver", route: "/lessons/lesson-15", type: 'lesson', conceptIds: ["receiver_basic"], order: 15 },
  { id: "lesson-16", title: "تركيب نظام الفيديو", route: "/lessons/lesson-16", type: 'lesson', conceptIds: ["vtx_basic"], order: 16 },
  { id: "lesson-17", title: "اختبار المحركات بدون مراوح", route: "/lessons/lesson-17", type: 'lesson', conceptIds: ["motor_basic","betaflight_basics"], order: 17 },
  { id: "lesson-18", title: "أول طيران آمن", route: "/lessons/lesson-18", type: 'lesson', conceptIds: ["betaflight_basics"], order: 18 },
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

export const MANIFEST_RESOURCE_COUNT = 47;
