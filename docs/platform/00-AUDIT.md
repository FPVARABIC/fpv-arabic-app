# 1. تقرير حالة التطبيق الحالية (تدقيق كامل)

**تاريخ التدقيق:** 2026-08-02
**النقطة المرجعية (HEAD عند بدء الجلسة):** `be1afee091a6b8cf8e1ea78a12c2bddbb47e779e`
**الفرع:** `claude/arabic-fpv-platform-u3h5zv`
**حالة البناء قبل أي تعديل:** ناجحة — `npm run build` → `✓ built in 3.47s` (الدليل الخام في نهاية هذا الملف).

هذا التقرير مبني على قراءة فعلية للملفات وتنفيذ فعلي للأوامر، لا على تقدير أو ذاكرة.

---

## 1.1 الأرقام الأساسية

| المقياس | القيمة |
|---|---|
| عدد ملفات `.ts` / `.tsx` في `src/` | 289 ملفاً |
| مجموع أسطر الكود في `src/` | 51,354 سطراً |
| عدد المسارات (Routes) المسجّلة في `App.tsx` | 22 مساراً |
| عدد الدروس | 16 |
| عدد رحلات الدروس التفاعلية (Journeys) | 16 / 16 (كلها مسجّلة) |
| صفحات Betaflight الموصوفة رسمياً | 26 مدخلاً في السجل، منها **19 بمحتوى `reviewed`** و7 `not-started` |
| مفاهيم AKL (YAML) | 43 مفهوماً |
| فصول قاعدة المعرفة (`knowledge/chapters`) | 18 فصلاً |
| مراحل قسم التجميع | 18 مرحلة |
| فئات القطع في التجميع | 13 فئة / 67 قطعة |
| مراحل خريطة البناء (Roadmap) | 10 مراحل |
| بنود التشخيص (Troubleshooting) | **6 بنود فقط** |
| قوائم الفحص (Checklists) | 3 مجموعات |
| مصطلحات قاموس Betaflight | 7 مصطلحات |
| سكربتات الاختبار | 60 سكربتاً (منطق + Playwright UI) |
| حجم حزمة JS النهائية | 2,435 KB (‏630 KB مضغوطة) — **حزمة واحدة بلا تقسيم** |

---

## 1.2 خريطة الأقسام كما هي فعلياً اليوم

### شريط التنقل السفلي (5 تبويبات)

| التبويب | المسار | ما يعرضه فعلياً |
|---|---|---|
| الرئيسية | `/home` | **ليست لوحة تعليمية** — هي واجهة المجتمع (Community) بالكامل: تغذية المنشورات، البحث في المنشورات، الملفات الشخصية، الإشعارات، المحفوظات، لوحة الإدارة |
| البناء | `/roadmap` | 10 مراحل بناء + قوائم فحص لكل مرحلة |
| الدروس | `/lessons` | 16 درساً في 3 مجموعات |
| البرمجة | `/programming` | 4 بطاقات: Betaflight (متاح)، ExpressLRS (متاح)، Binding (قريباً)، INAV (قريباً) |
| التجميع | `/assembly` | معالج اختيار قطع من 18 مرحلة + تقرير توافق نهائي |

### الأنظمة الفرعية الكبرى

1. **نظام رحلات الدروس** (`src/data/lessons/`, `src/types/lessonJourney.ts`, `lessonJourneyEngine.ts`)
   محرك عام مدفوع بالبيانات، 9 أنواع مراحل (`orientation`, `explanation`, `comparison`, `worked_example`, `checkpoint`, `interactive_diagram`, `glossary`, `recall`, `completion`)، مع بوابة جاهزية (readiness gate) تمنع إنهاء الدرس قبل استيفاء المتطلبات. **هذا أفضل جزء في التطبيق معمارياً.**

2. **نظام Betaflight** (`src/data/betaflight/`)
   نموذج بيانات على مستوى الحقل الواحد: `BfPage` → `BfGroup` → `BfField` مع `englishLabel` رسمي مُتحقَّق منه، `arabicMeaning`، `arabicExplanation`، `range`، `scope`، `safetyLevel`، `requiresSave`، `requiresReboot`، و`BfSourceRef` كامل (repo path + commit + firmware version + app version + تاريخ المراجعة). **هذا هو النموذج الذي يجب تعميمه على كل التطبيق.**

3. **نظام ExpressLRS** (`src/data/expresslrs/`) — خطوات إعداد + 699 سطراً من بنود التشخيص.

4. **نظام التجميع** (`src/data/assembly/`) — 67 قطعة حقيقية موثّقة بحقول `whyChoose` / `notFor` / `upgradePath` / `lastReviewed` / `confidence`، و4 مدققات توافق حية.

5. **المساعد Bot V2** (`src/data/knowledge/botV2/`) — مصنّف نوايا + محلل استعلام + مؤلف إجابة + تحذير سياقي، يقرأ من فهرس AKL المولَّد.

6. **المجتمع** (`src/components/Community/`, Firebase) — نظام كامل: تغذية بترتيب خوارزمي، تعليقات، إعجابات، متابعة، إشعارات، بلاغات، إشراف، لوحة إدارة، مصادقة بالبريد، صور رمزية.

---

## 1.3 نقاط القوة التي يجب البناء عليها (لا المساس بها)

| # | القوة | الدليل |
|---|---|---|
| 1 | فصل المحتوى عن الواجهة مطبَّق فعلاً في Betaflight والدروس | `betaflight/pages/*.ts` بيانات خام + `BetaflightPageRenderer.tsx` عام |
| 2 | توثيق المصدر والإصدار وتاريخ المراجعة موجود في `BfSourceRef` | `src/data/betaflight/types.ts:45-56` |
| 3 | محرك رحلات عام غير مربوط بدرس بعينه | `lessonJourneyEngine.ts` + `scripts/testLessonJourneyEngine.ts` |
| 4 | ثقافة اختبارات قوية: اختبار منطق + اختبار UI حقيقي بـ Playwright لكل ميزة | 60 سكربت اختبار |
| 5 | قواعد هندسية مكتوبة ومبنية على حوادث حقيقية | `docs/ENGINEERING_RULES.md` |
| 6 | RTL وواجهة عربية طبيعية، وعمود 390px متسق | `AppShell.tsx` |
| 7 | نظام تصميم CSS متماسك (`glass-card`, `btn-*`, `warning-card`, `chip`, `card-*`) | `src/index.css` — 421 سطراً |
| 8 | حفظ التقدم يعمل عبر `localStorage` مع تصفية معرّفات ميتة | `useProgress.ts` |
| 9 | 16 مخططاً تعليمياً SVG تفاعلياً مكتوباً يدوياً | `src/components/diagrams/` |
| 10 | صدق التوثيق في `docs/KNOWN_ISSUES.md` — يذكر ما لم يُنفَّذ بدل ادّعاء الاكتمال | ملف موجود ومُحدَّث |

---

## 1.4 نقاط الضعف والفجوات المُتحقَّق منها

### أ) فجوات حرجة (تفقد وظائف كانت تعمل)

| # | المشكلة | الدليل | الأثر |
|---|---|---|---|
| A1 | **قسم "المشاكل والحلول" غير قابل للوصول** | الرابط الوحيد إليه في `HomeDashboardLegacy.tsx:16`، وهذا المكوّن لا يُعرض أبداً لأن `RENDER_COMMUNITY = true` في `HomeView.tsx:23,245` | 6 بنود تشخيص مكتوبة لا يراها أي مستخدم |
| A2 | **قسم "Checklist" غير قابل للوصول** | نفس السبب — `HomeDashboardLegacy.tsx:15` | 3 مجموعات فحص معطّلة |
| A3 | **زر معطوب في الإعدادات** | `SettingsView.tsx:27` ينتقل إلى `/safety`، والمسار **معطَّل بالتعليق** في `App.tsx:34` → يسقط على `NotFoundView` | زر ظاهر يؤدي إلى صفحة خطأ |
| A4 | **`/progress` و`/contact` يتيمان** | مسجَّلان في `App.tsx:48,52` ولا يوجد أي رابط إليهما في أي مكوّن | شاشتان كاملتان لا تُرى |
| A5 | **18 فصلاً من قاعدة المعرفة محتوى ميت** | `grep` على `allKnowledgeEntries` و`data/knowledge/chapters` خارج مجلدها → **صفر نتائج**. والملف نفسه يعترف: "Not imported anywhere in the app yet" (`knowledge/index.ts:2`) | ~5,000 سطر محتوى مؤلَّف لا يُعرض |

### ب) فجوات في العمق (جوهر طلبك)

| # | المشكلة | الدليل |
|---|---|---|
| B1 | **الدروس سطحية بمقياس طلبك** | الدرس 1 "ما هو الكوادكابتر؟" = فقرة واحدة (`explanation`) + 3 نقاط + خطأ شائع. لا يوجد فيه: مركز الثقل، نسبة الدفع للوزن، القصور الذاتي، Propwash، سلوك الرياح، الاهتزاز، الفرق بين أوضاع الطيران — كلها مطلوبة في مواصفتك |
| B2 | **بنية الدروس أحادية المستوى** | `Lesson.level` يقبل قيمتين فقط: `'مبتدئ' \| 'متوسط'` (`types/index.ts:8`). لا وجود لمتقدم/احترافي/تخصصي |
| B3 | **لا يوجد وضع مرجعي** | لا طريقة للدخول المباشر على قطعة/بروتوكول/إعداد/عرَض عطل. المسار الوحيد للمحتوى هو التسلسل الخطي للدروس |
| B4 | **التشخيص = قائمة مسطّحة من 6 بنود** | `troubleshootingData.ts` — لا أشجار قرار، لا درجة خطر، لا "هل أفصل البطارية؟"، لا نتائج متوقعة لكل فحص، لا روابط للدروس |
| B5 | **قسم البناء = قوائم فحص ثابتة** | `roadmapData.ts` — نصوص ثابتة، لا ملف مشروع، لا حسابات، لا مخطط توصيل، لا سجل قرارات |
| B6 | **قسم البرمجة يغطي نظامين من ~20** | `ProgrammingView.tsx` — Betaflight وExpressLRS متاحان، INAV وBinding "قريباً". لا وجود لـ ArduPilot، BLHeli، AM32، EdgeTX، Blackbox Explorer، أدوات DJI/Walksnail/HDZero، DFU، Zadig |
| B7 | **القاموس شبه معدوم** | 7 مصطلحات في `betaflight/glossary.ts`، و`knowledge/glossary.ts` غير مستخدم |
| B8 | **مدققات التوافق 4 فقط** | `validators.ts` — فريم↔محرك، محرك↔بطارية، ESC↔بطارية، فريم↔مروحة. لا مدقق جهد، ولا تيار، ولا UART، ولا بروتوكولات (و22 قاعدة خبير موثّقة في `EXPERT_RULES_UNMAPPED.md` غير مبنية في الكود) |

### ج) فجوات بنيوية

| # | المشكلة | الدليل |
|---|---|---|
| C1 | **لا يوجد بحث داخل التطبيق إطلاقاً** | البحث الوحيد (`Community/Search/SearchScreen.tsx`) يبحث في **منشورات المجتمع ومستخدميه عبر Firestore فقط**. لا يمكن البحث عن درس أو قطعة أو إعداد أو مصطلح |
| C2 | **6 نماذج محتوى متوازية غير مترابطة** | `Lesson` / `LessonJourneyDefinition` / `KnowledgeEntry` / AKL YAML / `BfPage` / `BasePart` — لكل منها معرّفاته وتصنيفه ومستوياته الخاصة، ولا جسر بينها |
| C3 | **لا ترابط بين الأقسام** | لا يمكن الانتقال من درس FC إلى صفحة Betaflight المقابلة، ولا من قطعة في التجميع إلى الدرس الذي يشرحها |
| C4 | **حزمة واحدة 2.4 ميغابايت** | مخرجات البناء أعلاه — تحذير Vite صريح، لا `lazy()` في أي مكان |
| C5 | **الملف الشخصي للتقدم لا يعرف إلا 3 أنواع** | `ProgressState` = دروس + مراحل + قوائم فحص فقط (`types/index.ts:80-84`) |

---

## 1.5 التكرار والتعارض المُكتشَف

| التكرار | الموقع |
|---|---|
| قسمان للبناء بمنطقين مختلفين | `/roadmap` (10 مراحل تنفيذ) مقابل `/assembly` (18 مرحلة اختيار قطع) — لا رابط بينهما ولا تدفّق موحّد |
| ثلاثة قواميس | `betaflight/glossary.ts` (7) + `knowledge/glossary.ts` (غير مستخدم) + `Community/utils/fpvDictionary.ts` |
| نظاما معرفة للبوت | `knowledge/chapters` (ميت) مقابل `lkb/akl` (حي) |
| محتوى FC مكرر في 4 أماكن | `lessonsData` درس 14، `assembly/parts/flightControllers.ts`، `betaflight/pages/setup.ts`، `akl/selection/flight_controller.yaml` — بلا مصدر واحد للحقيقة |

---

## 1.6 فحص RTL

- الاتجاه مضبوط عالمياً (`index.html` → `dir="rtl"`, `lang="ar"`).
- المصطلحات الإنجليزية داخل النص العربي **تُعرض بلا `dir="ltr"` في أغلب المواضع**، ما يكسر ترتيب العرض عند اجتماع رقم ورمز (مثل `2207 1750KV`).
- أيقونة "التالي" تستخدم `ChevronLeft` بشكل صحيح (اليسار = للأمام في RTL).
- عمود ثابت 390px مطبَّق في كل الشاشات عبر `AppShell`.

**الحكم:** RTL سليم بنيوياً، ويحتاج معالجة منهجية لعرض المصطلحات الأجنبية (سيُحل بمكوّن `Term` مخصص).

---

## 1.7 فحص الاختبارات

60 سكربتاً، بنمط ثابت وممتاز: لكل ميزة اختبار منطق نقي (`testXJourney.ts`) + اختبار UI حقيقي بـ Playwright ضد بناء إنتاجي (`testXJourneyUI.ts`).
**الفجوة:** لا يوجد سكربت واحد يُشغَّل عبر `package.json` لكل الاختبارات دفعة واحدة — لا `npm test` جامع. الاختبارات تُستدعى فردياً.

---

## 1.8 الدليل الخام — بناء خط الأساس

```
$ npm run build

> fpv-arabic-app@0.0.0 build
> tsc -b && vite build

vite v8.0.16 building client environment for production...
transforming...✓ 2022 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                             0.47 kB │ gzip:   0.32 kB
dist/assets/cairo-latin-ext-wght-normal-at8nfxId.woff2     16.64 kB
dist/assets/cairo-arabic-wght-normal-CJWMIGCx.woff2        30.89 kB
dist/assets/cairo-latin-wght-normal-PfPtmrPZ.woff2         33.82 kB
dist/assets/index-3caMc8qB.css                             38.10 kB │ gzip:   9.15 kB
dist/assets/index-u7NU3kPa.js                           2,435.07 kB │ gzip: 630.22 kB

(!) Some chunks are larger than 500 kB after minification.
✓ built in 3.47s
```

```
$ git rev-parse HEAD
be1afee091a6b8cf8e1ea78a12c2bddbb47e779e

$ git status --short
(فارغ — شجرة عمل نظيفة)
```
