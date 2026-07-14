# FPV بالعربي

تطبيق تعليمي شامل لتعلم طائرات FPV (First Person View) باللغة العربية — من الصفر حتى الطيران الأول. لا يتطلب اتصالاً بالإنترنت بعد التثبيت.

## المميزات

- **16 درسًا تفاعليًا** بمخططات SVG تعليمية قابلة للنقر
- **مساعد FPV العائم** — يظهر في كل صفحة للوصول السريع (FloatingAssistant)
- **Betaflight بالعربي** — شرح مرئي لكل قسم من أقسام Betaflight Configurator
- **خريطة البناء** — خطوات مرتبة من الصفر حتى الطيران
- **Checklists** — قوائم فحص قبل الشراء وقبل الطيران
- **تتبع التقدم** — يحفظ الدروس المكتملة محليًا عبر localStorage
- **استكشاف الأعطال** — حلول للمشاكل الأكثر شيوعًا
- **تصميم RTL** — واجهة عربية كاملة من اليمين إلى اليسار

## التشغيل المحلي

```bash
npm install
npm run dev
# ثم افتح http://localhost:5173
```

## البناء للنشر

```bash
npm run build
# الملفات الجاهزة في dist/
```

## بنية البيانات

| الملف | المحتوى |
|---|---|
| `src/data/lessonsData.ts` | 16 درساً مع حقل `diagramType` لكل درس |
| `src/data/betaflightData.ts` | 10 أقسام Betaflight مع شرح ونقاط مهمة |
| `src/data/botResponses.ts` | ردود المساعد الذكي (11 سؤالاً شائعاً) |
| `src/data/checklistsData.ts` | قوائم الفحص قبل الشراء والطيران |
| `src/data/roadmapData.ts` | مراحل خريطة البناء |
| `src/utils/storageKeys.ts` | مفاتيح localStorage |

## مخططات الدروس

الملفات في `src/components/diagrams/` — واحد لكل درس:

| الدرس | DiagramType | المكوّن |
|---|---|---|
| 1 | quad-x-layout | QuadXLayout |
| 2 | signal-flow | SignalFlow |
| 3 | parts-map | PartsMap |
| 4 | parts-compatibility | PartsCompatibility |
| 5 | size-comparison | SizeComparison |
| 6 | electricity-basics | ElectricityBasics |
| 7 | lipo-cells | LipoCells |
| 8 | gnd-5v-vbat | GndFiveVbat |
| 9 | tx-rx-cross | TxRxCross |
| 10 | safety-before-battery | SafetyBeforeBattery |
| 11 | frame-assembly | FrameAssembly |
| 12 | motor-mount | MotorMount |
| 13 | esc-placement | EscPlacement |
| 14 | fc-orientation | FcOrientation |
| 15 | receiver-uart | ReceiverUart |
| 16 | camera-vtx | CameraVtx |
| 17 | motor-test | MotorTest |
| 18 | first-flight | FirstFlight |

## مفاتيح localStorage

| المفتاح | القيمة |
|---|---|
| `fpv_has_started` | boolean — هل تم تجاوز شاشة Splash |
| `fpv_safety_seen` | boolean — هل تم قبول تحذيرات السلامة |
| `fpv_progress_lessons` | string[] — معرّفات الدروس المكتملة |
| `fpv_progress_roadmap` | string[] — مراحل البناء المكتملة |
| `fpv_checklists` | object — حالة قوائم الفحص |
| `fpv_last_opened` | string — آخر درس تم فتحه |
| `fpv_settings` | object — إعدادات التطبيق |

## ملاحظات

- لا يستخدم شعار Betaflight الرسمي — المحتوى تعليمي مستقل
- لا يستخدم صور خارجية — كل الرسوم SVG مخصصة
- لا يوجد خادم أو قاعدة بيانات — كل البيانات محلية
