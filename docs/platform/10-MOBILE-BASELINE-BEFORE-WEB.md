# 10 — خط أساس تطبيق الهاتف قبل بدء منصة الويب

> **ملاحظة ترقيم:** هذا الملف يحمل الرقم 10 بطلب صريح، ويجاور
> `10-READINESS-AUDIT.md` القديم. الرقم هنا يعني «نقطة التثبيت قبل الويب»، لا
> ترتيباً زمنياً — الترتيب الزمني الحقيقي هو 13 ثم هذا الملف.

**تاريخ التثبيت:** 2026-08-03

هذه الوثيقة تثبّت الحالة التي **يبدأ منها** عمل الويب، وتصلح نقطة رجوع. كل رقم
فيها مقيس فعلياً في هذه الجلسة، لا منقول من تقرير سابق.

---

## 1. المستودع والفرع

| | |
|---|---|
| المستودع | `melyanneahmed-rgb/fpv-arabic-app` |
| `origin` | `http://local_proxy@127.0.0.1:41729/git/melyanneahmed-rgb/fpv-arabic-app` |
| الفرع | `claude/arabic-fpv-platform-u3h5zv` |
| SHA المحلي | `d34a29a99c9d8bdd3dddbb56ce8fd3e0e27b7211` |
| SHA البعيد **قبل** هذه الجلسة | `d34a29a99c9d8bdd3dddbb56ce8fd3e0e27b7211` |
| هل يتطابقان؟ | **نعم** — العمل كان مدفوعاً بالكامل قبل بدء هذا التدقيق |

### حالة شجرة العمل

```
git status --porcelain  →  (فارغ، 0 سطر)
git stash list          →  (فارغ، 0 مخبأ)
```

لا Merge ولا Rebase ولا Cherry-pick ولا Revert ولا Bisect قيد التنفيذ (لا وجود
لأي من `MERGE_HEAD`, `REBASE_HEAD`, `CHERRY_PICK_HEAD`, `REVERT_HEAD`,
`rebase-merge/`, `rebase-apply/`).

**نتيجة مهمة:** لم يوجد أي عمل محلي غير محفوظ. لم يُحذف شيء ولم يُنشأ التزام
إضافي للشيفرة، لأنه لم يكن هناك ما يُلتزم به.

### آخر الالتزامات

```
d34a29a  feat(video): close the video system — knowledge, record, verdicts, tools, diagnostics
4cfdc65  feat(video): the foundation — taxonomy, per-build record, and rules in the one engine
76494d2  feat(rc): close the control link — EdgeTX centre, the six ExpressLRS gaps, retrieval metadata
0326047  feat(rc): connect the control-link system — deep links, software-centre context, bot metadata
5962fdb  feat(project): the control link enters the build — configuration the catalogue cannot hold
a17d9ec  refactor(platform): one core for phone and web — audit, contracts, and the one move it justified
```

---

## 2. التحقق أن العمل داخل Git لا داخل مساحة العمل فقط

لم يُفترَض أن وجود `d34a29a` يعني حفظ كل شيء. عُدَّت الملفات المتتبَّعة فعلياً
في شجرة الالتزام:

| المسار | ملفات متتبَّعة عند `HEAD` |
|---|---|
| `src/data/video/` | 7 |
| `src/data/kb/modules/video/` | 7 |
| `src/data/edgetx/` | 8 |
| `src/data/expresslrs/` | 3 |
| `src/data/betaflight/` | 24 |
| `src/data/kb/modules/` (كل الوحدات السبع) | 43 |
| `src/data/project/` | 10 |
| `src/data/kb/diagnostics/` | 9 |
| `src/data/kb/search/` | 4 |
| `src/data/kb/glossary/` | 1 |
| `src/platform/` | 2 |
| `docs/platform/` | 14 |
| `scripts/` | 81 |
| `android/` | 53 |

ملفات نظام الفيديو مؤكَّدة اسماً اسماً داخل الالتزام: الأنواع، مركز البرامج
بصفحاته الثلاث، السجلّ، المصادر، المقالات الستة، وحدة المعرفة، وشجرة التشخيص.

---

## 3. فحص الأسرار

| الفحص | النتيجة |
|---|---|
| ملفات بأسماء حسّاسة متتبَّعة (`.env`, service account, `.pem`, `.jks`, keystore) | **لا شيء** |
| أنماط اعتماد داخل الملفات المتتبَّعة | لا شيء عدا مفاتيح وهمية معلنة في نصوص المحاكي: `AIzaSyDEMO0000…` في `testCommunityE2E.ts` و`testCommunityRealtime.ts` |
| ملفات `.env` في جذر المستودع | لا شيء |
| تغطية `.gitignore` | `.env`، `.env.local`، `.env.*.local` |
| مصدر إعداد Firebase | `import.meta.env.VITE_FIREBASE_*` في `src/lib/firebase.ts` — لا قيم مضمَّنة |

**لم يُرفع أي سرّ.**

---

## 4. نتائج البوابات

### TypeScript

```
npx tsc --noEmit  →  PASS (بلا مخرجات)
```

### ESLint

```
✖ 28 problems (27 errors, 1 warning)
```

**هذا هو خط الأساس المعتمد.** كل المشكلات من نوع
`react-refresh/only-export-components` في ملفات سياقات ومكوّنات قديمة
(`BotOverlayContext`, `ProgressContext`, `diagrams/_shared.tsx`, …) وخطأ واحد
`no-unused-vars` في `ProgressContext`. لا واحدة منها في شيفرة نظام الفيديو أو
التحكم. **أي رقم أعلى من 28 لاحقاً هو انحدار.**

### اختبارات Node

| البوابة | النتيجة |
|---|---|
| `testPlatformCore` | ✅ 51 |
| `testKbModel` | ✅ 1132 |
| `testKbSearch` | ✅ 69 |
| `testKbDiagnostics` | ✅ 1423 |
| `testKbLanguage` | ✅ 16 (على 17,030 نصاً عربياً) |
| `testProject` | ✅ 114 |
| `testVideo` | ✅ 597 |
| `testEdgeTx` | ✅ 2288 |
| `testAssembly` | ✅ 206 |
| `testAssemblyPersistence` | ✅ 53 |
| `testFrameSizeMatch` | ✅ 20 |
| `testExpressLrsSetup` | ✅ 200 |
| `testExpressLrsTroubleshooting` | ✅ 555 |
| `testBuildRoadmap` | ✅ 179 |
| `testCommunity` | ✅ 386 |
| `testBetaflightArchitecture` | ❌ فشل — انظر أدناه |
| `testExpressLrsHub` | ❌ فشل — انظر أدناه |

### اختبارات المتصفح الحقيقي (390 بكسل، RTL، حزمة إنتاج مخدَّمة عبر HTTP)

| البوابة | النتيجة |
|---|---|
| `testKbUI` | ✅ 73 |
| `testProjectUI` | ✅ 73 |
| `testVideoUI` | ✅ 62 |
| `testNavigationRegression` | ✅ 30 |

**المجموع الأخضر: 7,509 تأكيداً.**

---

## 5. تصنيف الفشلين — كلاهما سابق لهذه الجلسة

طُلب لكل فشل تحديد: أهو جديد؟ أكان في خط الأساس؟ أهو خطأ شيفرة أم قيد بيئي؟ أيمنع
الدفع؟

الإجابة أُثبتت **تجريبياً** لا استنتاجاً: أُنشئت شجرة عمل مؤقتة عند الالتزام
`0326047` — أي **قبل** كل عمل نظام التحكم ونظام الفيديو — وشُغّل الاختباران هناك.

```
git worktree add --detach <tmp> 0326047
testExpressLrsHub               FAIL at 0326047
testBetaflightArchitecture      FAIL at 0326047
```

الفشل نفسه، بالرسالة نفسها، قبل أي سطر من هذا العمل. (أُزيلت شجرة العمل المؤقتة
بعد الإثبات، والشجرة الأصلية بقيت نظيفة.)

### `testBetaflightArchitecture`

```
FAILED: official-source cross-check: read-only audit clone exists at
        /tmp/betaflight-official-audit/configurator
```

| | |
|---|---|
| جديد؟ | **لا** |
| في خط الأساس؟ | **نعم** — يفشل عند `0326047` |
| السبب | **قيد بيئي**: يطلب نسخة قراءة فقط من مستودع Betaflight الرسمي في `/tmp`، وقد استُرجعت الحاوية منذ إنشائها |
| خطأ شيفرة؟ | لا |
| يمنع الدفع؟ | **لا** |

### `testExpressLrsHub`

```
FAILED: BetaflightView.tsx still navigates to /betaflight/${section.id}
        for each of the 10 sections
```

| | |
|---|---|
| جديد؟ | **لا** |
| في خط الأساس؟ | **نعم** — يفشل عند `0326047` |
| السبب | تأكيد على `src/views/BetaflightView.tsx`، وآخر تعديل لهذا الملف في `2271d91` بتاريخ **2026-07-18**، أي قبل كل عمل هذه السلسلة. الملف لم يُمَسّ في `0326047` ولا `76494d2` ولا `4cfdc65` ولا `d34a29a`. |
| خطأ شيفرة؟ | تأكيد قديم لم يعد يطابق شكل الشاشة — دَين موثَّق لا انحدار |
| يمنع الدفع؟ | **لا** |

**لا فشل جديد وغير مفسَّر أُضيف.**

---

## 6. البناء والحزمة

### `vite build`

```
✓ built in 3.33s   →  PASS
```

| الحزمة | الحجم | مضغوطة |
|---|---|---|
| `index-*.js` (الحزمة الفورية) | **1,682.13 kB** | 460.30 kB |
| `index-*.css` | 39.01 kB | 9.31 kB |
| `registry-*.js` (الموسوعة، كسول) | 1,416.94 kB | 346.00 kB |
| `pageRegistry-*.js` (Betaflight، كسول) | 417.26 kB | 88.18 kB |
| `trees-*.js` (التشخيص، كسول) | 331.21 kB | 74.51 kB |
| `registry-*.js` (EdgeTX/الفيديو، كسول) | 190.49 / 119.60 kB | 41.86 / 26.60 kB |

**حالة التحميل الكسول: 57 حزمة منفصلة.** الموسوعة ومرجع Betaflight وأشجار
التشخيص ومراكز البرامج كلها خارج الحزمة الفورية.

### `cap sync android`

```
✔ copy android     ✔ update android     Sync finished in 0.205s   →  PASS
```

### Android

```
./gradlew assembleDebug  →  BUILD FAILED
Could not GET 'https://dl.google.com/dl/android/maven2/com/android/tools/build/gradle/8.13.0/gradle-8.13.0.pom'
Received status code 403 from server: Forbidden
```

| | |
|---|---|
| السبب | **قيد بيئي**: وكيل الشبكة يمنع `dl.google.com`، فلا يمكن جلب Android Gradle Plugin ولا `com.google.gms:google-services` |
| خطأ شيفرة؟ | **لا** — الوضع دون اتصال يفشل بالسبب نفسه (لا نسخة مخزَّنة) |
| ماذا نُثبِت | `vite build` و`cap sync` ينجحان، فالأصول الوِبّية تصل إلى `android/app/src/main/assets/public` سليمة |
| ماذا **لا** نُثبِت | **لا ندّعي نجاح بناء APK كامل.** يحتاج جهازاً يملك وصولاً إلى مستودع Google |

### ثبات «تطبيق واحد»

```
android/app/build.gradle:21:  applicationId "com.fpvarabic.app"
وحدات android:  app/  +  capacitor-cordova-android-plugins/   (لا تطبيق ثانٍ)
```

---

## 7. ما اكتمل داخل التطبيق

| المنظومة | الحالة |
|---|---|
| الموسوعة | 7 وحدات معرفة كاملة |
| نظام التحكم اللاسلكي | مغلق رأسياً (`11-RC-SYSTEM-CLOSURE.md`) |
| EdgeTX | مركز كامل، 30 صفحة، 32 موضوعاً مطلوباً |
| ExpressLRS | 12 خطوة إعداد، 40 مشكلة |
| Betaflight | مرجع 19 صفحة بحقولها |
| نظام الفيديو | مغلق رأسياً (`13-VIDEO-SYSTEM-CLOSURE.md`) |
| مشروع المستخدم | مخطط 3، سجلّا تحكم وفيديو، محرّك أحكام واحد |
| التشخيص | 28 شجرة عبر كل الأنظمة |
| البحث | فهرس موحَّد بأنواع مستندات متعددة |
| القاموس | مصطلحات موزَّعة على مجالات |
| بيانات البوت | مملوءة عبر محتوى التحكم والفيديو |
| المجتمع | Firebase: منشورات، تعليقات، بلاغات، وسائط |
| الطبقة المشتركة | `src/platform/` — وجهات مجرَّدة وتخزين مُصدَّر |

## 8. ما لم يكتمل داخل التطبيق

1. **INAV** — غير مغطّى في مركز البرامج.
2. **الملاحة والحساسات (GPS)** — عنصر في مصفوفة المجالات بلا وحدة معرفة. النظام
   التالي في الخطة.
3. **البوت** — البيانات الوصفية جاهزة، والبوت نفسه لم يبدأ.
4. **أداة مقارنة الأنظمة** — موجودة كمحتوى في `video-choose`، لا كشاشة تفاعلية.
5. **`testExpressLrsHub`** — تأكيد قديم عن `BetaflightView.tsx` يحتاج تحديثاً.
6. **ثلاث مراجعات خصمية** لمقالات الفيديو (`osd.ts`, `practice.ts`,
   `components.ts`) فشلت بحدّ الجلسة؛ الملفات سُلّمت وتمرّ في كل البوابات لكنها
   لم تُراجَع خصمياً.

## 9. القيود البيئية المعروفة

| القيد | الأثر |
|---|---|
| `dl.google.com` محجوب (403 من الوكيل) | لا يمكن بناء APK هنا |
| `/tmp/betaflight-official-audit` غير موجود | `testBetaflightArchitecture` يفشل |
| لا Firebase Emulator يعمل افتراضياً | اختبارات القواعد تحتاج تشغيله يدوياً |
| حدود الجلسة | قد توقف وكلاء التأليف الطويلة |

---

## 10. نقطة الرجوع

**كل عمل تطبيق الهاتف محفوظ ومدفوع عند:**

```
d34a29a99c9d8bdd3dddbb56ce8fd3e0e27b7211
claude/arabic-fpv-platform-u3h5zv
```

يجب أن يتفرّع عمل الويب من هذا الـSHA بالضبط. أي عودة إلى حالة ما قبل الويب هي
`git checkout d34a29a`.

**لم يُستخدَم:** `reset`، `force push`، `amend`، أو أي إعادة كتابة للتاريخ.
