import type { BfRegistryEntry } from './types';
import { setupPage } from './pages/setup';
import { portsPage } from './pages/ports';
import { motorsPage } from './pages/motors';
import { failsafePage } from './pages/failsafe';
import { powerPage } from './pages/power';
import { modesPage } from './pages/modes';
import { configurationPage } from './pages/configuration';
import { receiverPage } from './pages/receiver';

/**
 * Official page/tab registry — verified directly against the cloned
 * Configurator source (tag 2025.12.2), not from memory or secondary
 * sources:
 *
 *   - Disconnected-state tabs: src/js/gui.js, `defaultAllowedTabsWhenDisconnected`
 *   - Connected-state tabs: src/js/gui.js, `defaultAllowedTabs`
 *   - Feature/hardware-conditional tabs: src/js/gui.js, `defaultCloudBuildTabOptions`
 *     (only appear if the connected firmware build includes that feature)
 *   - Official English titles: locales/en/messages.json, the `tab*` keys
 *     matching each tab's internal ID
 *
 * One entry from the source array was NOT carried in: `defaultAllowedTabs`
 * also lists the literal string "modes". `.tab-modes` does appear in
 * src/css/main.less, but only inside a long defensive/shared CSS selector
 * list alongside `.tab-auxiliary` and every other tab class — no real
 * HTML/Vue template anywhere in the source tree applies `class="tab-modes"`
 * (auxiliary.html's root element is `class="tab-auxiliary"`). The real
 * "Modes" page uses the internal ID `auxiliary` (official title "Modes").
 * "modes" is a stale/orphaned registration token in that array and is not
 * represented here as a page.
 *
 * Two additional pages were found in source but are NOT included in this
 * registry pending further verification of their menu placement:
 *   - `setup_osd` (locale title "OSD Setup", src/tabs/setup_osd.html) —
 *     unclear whether this is a standalone top-level tab or a sub-flow
 *     reached from within Setup/OSD.
 *   - `map` (src/js/tabs/map.js) — no corresponding src/tabs/map.html or
 *     locale `tabMap` key was found; unclear whether this is a standalone
 *     tab or an internal sub-widget (e.g. embedded in Setup's GPS box).
 *
 * On-screen menu ORDER was not independently verified beyond the order
 * each ID appears in the three source arrays above (no dedicated
 * menu/order file was found this session) — `officialOrder` below reflects
 * that best-available approximation, not a confirmed rendered order.
 */
export const bfPageRegistry: BfRegistryEntry[] = [
  // ── Disconnected-state tabs ──
  { id: 'landing', officialId: 'landing', officialTitle: 'Welcome', titleAr: 'مرحبًا', officialOrder: 1, connectionState: 'disconnected', scope: 'universal', safetyLevel: 'informational', contentStatus: 'not-started' },
  { id: 'firmware-flasher', officialId: 'firmware_flasher', officialTitle: 'Firmware Flasher', titleAr: 'محدّث الفيرموير', officialOrder: 2, connectionState: 'disconnected', scope: 'universal', safetyLevel: 'critical', contentStatus: 'not-started' },
  { id: 'privacy-policy', officialId: 'privacy_policy', officialTitle: 'Privacy Policy', titleAr: 'سياسة الخصوصية (Betaflight)', officialOrder: 3, connectionState: 'disconnected', scope: 'universal', safetyLevel: 'informational', contentStatus: 'not-started' },
  { id: 'options', officialId: 'options', officialTitle: 'Options', titleAr: 'خيارات التطبيق', officialOrder: 4, connectionState: 'disconnected', scope: 'universal', safetyLevel: 'informational', contentStatus: 'not-started' },
  { id: 'help', officialId: 'help', officialTitle: 'Documentation & Support', titleAr: 'التوثيق والدعم', officialOrder: 5, connectionState: 'disconnected', scope: 'universal', safetyLevel: 'informational', contentStatus: 'not-started' },

  // ── Connected-state tabs (always available once connected) ──
  { id: 'setup', officialId: 'setup', officialTitle: 'Setup', titleAr: 'الإعداد الأولي', officialOrder: 6, connectionState: 'connected', scope: 'universal', safetyLevel: 'caution', contentStatus: 'reviewed', page: setupPage },
  { id: 'failsafe', officialId: 'failsafe', officialTitle: 'Failsafe', titleAr: 'الحماية عند فقدان الإشارة', officialOrder: 7, connectionState: 'connected', scope: 'universal', safetyLevel: 'critical', contentStatus: 'reviewed', page: failsafePage },
  { id: 'power', officialId: 'power', officialTitle: 'Power & Battery', titleAr: 'الطاقة والبطارية', officialOrder: 8, connectionState: 'connected', scope: 'universal', safetyLevel: 'warning', contentStatus: 'reviewed', page: powerPage },
  { id: 'adjustments', officialId: 'adjustments', officialTitle: 'Adjustments', titleAr: 'التعديلات أثناء التحكم', officialOrder: 9, connectionState: 'connected', scope: 'universal', safetyLevel: 'caution', contentStatus: 'not-started' },
  { id: 'modes', officialId: 'auxiliary', officialTitle: 'Modes', titleAr: 'أوضاع التشغيل', officialOrder: 10, connectionState: 'connected', scope: 'universal', safetyLevel: 'warning', contentStatus: 'reviewed', page: modesPage },
  { id: 'presets', officialId: 'presets', officialTitle: 'Presets', titleAr: 'الإعدادات الجاهزة', officialOrder: 11, connectionState: 'connected', scope: 'universal', safetyLevel: 'caution', contentStatus: 'not-started' },
  { id: 'cli', officialId: 'cli', officialTitle: 'CLI', titleAr: 'سطر الأوامر', officialOrder: 12, connectionState: 'connected', scope: 'universal', safetyLevel: 'critical', contentStatus: 'not-started' },
  { id: 'configuration', officialId: 'configuration', officialTitle: 'Configuration', titleAr: 'الإعدادات العامة', officialOrder: 13, connectionState: 'connected', scope: 'universal', safetyLevel: 'warning', contentStatus: 'reviewed', page: configurationPage },
  { id: 'tethered-logging', officialId: 'logging', officialTitle: 'Tethered Logging', titleAr: 'التسجيل المباشر عبر USB', officialOrder: 14, connectionState: 'connected', scope: 'universal', safetyLevel: 'informational', contentStatus: 'not-started' },
  { id: 'blackbox', officialId: 'onboard_logging', officialTitle: 'Blackbox', titleAr: 'صندوق التسجيل الأسود', officialOrder: 15, connectionState: 'connected', scope: 'universal', safetyLevel: 'caution', contentStatus: 'not-started' },
  { id: 'motors', officialId: 'motors', officialTitle: 'Motors', titleAr: 'المحركات', officialOrder: 16, connectionState: 'connected', scope: 'universal', safetyLevel: 'critical', contentStatus: 'reviewed', page: motorsPage },
  { id: 'pid-tuning', officialId: 'pid_tuning', officialTitle: 'PID Tuning', titleAr: 'ضبط PID', officialOrder: 17, connectionState: 'connected', scope: 'universal', safetyLevel: 'warning', contentStatus: 'not-started' },
  { id: 'ports', officialId: 'ports', officialTitle: 'Ports', titleAr: 'المنافذ', officialOrder: 18, connectionState: 'connected', scope: 'universal', safetyLevel: 'warning', contentStatus: 'reviewed', page: portsPage },
  { id: 'receiver', officialId: 'receiver', officialTitle: 'Receiver', titleAr: 'المستقبل', officialOrder: 19, connectionState: 'connected', scope: 'universal', safetyLevel: 'warning', contentStatus: 'reviewed', page: receiverPage },
  { id: 'sensors', officialId: 'sensors', officialTitle: 'Sensors', titleAr: 'الحساسات', officialOrder: 20, connectionState: 'connected', scope: 'universal', safetyLevel: 'caution', contentStatus: 'not-started' },

  // ── Feature/hardware-conditional tabs (cloud-build gated) ──
  { id: 'gps', officialId: 'gps', officialTitle: 'GPS', titleAr: 'نظام تحديد المواقع', officialOrder: 21, connectionState: 'connected', scope: 'feature-dependent', conditionNote: 'يظهر فقط إذا كانت نسخة الفيرموير المبنية تتضمن ميزة GPS.', safetyLevel: 'caution', contentStatus: 'not-started' },
  { id: 'led-strip', officialId: 'led_strip', officialTitle: 'LED Strip', titleAr: 'شريط الإضاءة', officialOrder: 22, connectionState: 'connected', scope: 'feature-dependent', conditionNote: 'يظهر فقط إذا كانت نسخة الفيرموير المبنية تتضمن ميزة LED_STRIP.', safetyLevel: 'informational', contentStatus: 'not-started' },
  { id: 'osd', officialId: 'osd', officialTitle: 'OSD', titleAr: 'عرض المعلومات على الشاشة', officialOrder: 23, connectionState: 'connected', scope: 'feature-dependent', conditionNote: 'يظهر فقط إذا كانت نسخة الفيرموير المبنية تتضمن دعم OSD.', safetyLevel: 'caution', contentStatus: 'not-started' },
  { id: 'servos', officialId: 'servos', officialTitle: 'Servos', titleAr: 'المحركات الخادمة', officialOrder: 24, connectionState: 'connected', scope: 'feature-dependent', conditionNote: 'يظهر فقط مع نوع خلط (Mixer) يستخدم Servos، مثل الطائرات ثابتة الجناح.', safetyLevel: 'caution', contentStatus: 'not-started' },
  { id: 'transponder', officialId: 'transponder', officialTitle: 'Race Transponder', titleAr: 'جهاز إرسال السباق', officialOrder: 25, connectionState: 'connected', scope: 'feature-dependent', conditionNote: 'يظهر فقط إذا كانت نسخة الفيرموير المبنية تتضمن ميزة Transponder.', safetyLevel: 'informational', contentStatus: 'not-started' },
  { id: 'vtx', officialId: 'vtx', officialTitle: 'Video Transmitter', titleAr: 'جهاز إرسال الفيديو', officialOrder: 26, connectionState: 'connected', scope: 'feature-dependent', conditionNote: 'يظهر فقط إذا كانت نسخة الفيرموير المبنية تتضمن التحكم بجهاز الفيديو (SmartAudio/Tramp/MSP-VTX).', safetyLevel: 'warning', contentStatus: 'not-started' },
];
