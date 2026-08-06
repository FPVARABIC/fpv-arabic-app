# صور المشاريع — قائمة الرفع

> **مولَّد آلياً** من `src/data/projects/registry.ts` عبر
> `npm run gen:project-images`. لا تحرّره بيدك — أي تعديل يُمحى عند
> إعادة التوليد، وقيمته الوحيدة أنه لا يستطيع أن يخالف الكتالوج.

## المواصفات

| البند | القيمة |
|---|---|
| الصيغة | `.webp` |
| النسبة | 16:9 |
| المفضّل | 1920px عرضاً |
| الحدّ الأدنى | 1280px عرضاً |
| الحجم الأقصى | 500 كيلوبايت |

**ممنوع**: الصور المولّدة بالذكاء الاصطناعي، والصور المؤقتة، وأي صورة
منسوخة بلا حقّ استخدام. المشروع بلا صورة يعرض حالة واضحة تقول ذلك —
وهذا أفضل من صورة لا تخصّه.

## الأدوار الأربعة

| الدور | الملف | إلزامية؟ | ماذا تصوّر |
|---|---|---|---|
| `cover` | `01-cover.webp` | **نعم** | الصورة الرئيسية. تظهر في بطاقة المشروع وأعلى صفحته. أوضح صورة تُظهر الطائرة أو المنظومة كاملة. |
| `build` | `02-build.webp` | لا | التجميع: القطع مركّبة، أو لقطة أثناء البناء تُظهر كيف تتصل ببعضها. |
| `result` | `03-result.webp` | لا | الناتج: ما ينتجه المشروع فعلاً — خريطة، أو شاشة كشف، أو مسار طيران. |
| `diagram` | `04-diagram.webp` | لا | مخطّط: رسم للتوصيل أو لتدفّق البيانات. مرسوم بيدك أو ببرنامج رسم — لا صورة مولّدة. |

## كيف ترفع

1. صوّر أو اجمع الصورة بحقّ استخدام واضح.
2. حوّلها إلى `.webp` بنسبة 16:9.
3. تأكّد أن عرضها ≥ 1280px وحجمها ≤ 500KB.
4. سمّها بالاسم المكتوب في الجدول أدناه بالضبط — الرقم والدور معاً.
5. ارفعها إلى مجلد المشروع (المجلدات كلها جاهزة في المستودع).
6. ادفع. لا يوجد ملف بيانات تعدّله — الصفحة تقرأ الملف من مكانه.
7. شغّل `npm run test:project-images` للتأكّد.

## المشاريع

10 مشروعاً · 40 صورة ممكنة · **10 إلزامية**

### تتبّع هدف متحرّك بصرياً من طائرة مسيّرة

`visual-target-tracking` · متقدّم · منشور

| الدور | المسار الكامل | النص البديل | إلزامية؟ |
|---|---|---|---|
| `cover` | `web/public/assets/projects/visual-target-tracking/01-cover.webp` | مشروع تتبّع هدف متحرّك بصرياً من طائرة مسيّرة | **نعم** |
| `build` | `web/public/assets/projects/visual-target-tracking/02-build.webp` | تجميع مشروع تتبّع هدف متحرّك بصرياً من طائرة مسيّرة | لا |
| `result` | `web/public/assets/projects/visual-target-tracking/03-result.webp` | ناتج مشروع تتبّع هدف متحرّك بصرياً من طائرة مسيّرة | لا |
| `diagram` | `web/public/assets/projects/visual-target-tracking/04-diagram.webp` | مخطّط مشروع تتبّع هدف متحرّك بصرياً من طائرة مسيّرة | لا |

### الطيران بلا GPS: تحديد الموضع بالرؤية والقصور الذاتي

`gps-denied-vio` · بحثي · منشور

| الدور | المسار الكامل | النص البديل | إلزامية؟ |
|---|---|---|---|
| `cover` | `web/public/assets/projects/gps-denied-vio/01-cover.webp` | مشروع الطيران بلا GPS: تحديد الموضع بالرؤية والقصور الذاتي | **نعم** |
| `build` | `web/public/assets/projects/gps-denied-vio/02-build.webp` | تجميع مشروع الطيران بلا GPS: تحديد الموضع بالرؤية والقصور الذاتي | لا |
| `result` | `web/public/assets/projects/gps-denied-vio/03-result.webp` | ناتج مشروع الطيران بلا GPS: تحديد الموضع بالرؤية والقصور الذاتي | لا |
| `diagram` | `web/public/assets/projects/gps-denied-vio/04-diagram.webp` | مخطّط مشروع الطيران بلا GPS: تحديد الموضع بالرؤية والقصور الذاتي | لا |

### الهبوط الذاتي الدقيق على علامة بصرية

`precision-landing-marker` · متوسّط · منشور

| الدور | المسار الكامل | النص البديل | إلزامية؟ |
|---|---|---|---|
| `cover` | `web/public/assets/projects/precision-landing-marker/01-cover.webp` | مشروع الهبوط الذاتي الدقيق على علامة بصرية | **نعم** |
| `build` | `web/public/assets/projects/precision-landing-marker/02-build.webp` | تجميع مشروع الهبوط الذاتي الدقيق على علامة بصرية | لا |
| `result` | `web/public/assets/projects/precision-landing-marker/03-result.webp` | ناتج مشروع الهبوط الذاتي الدقيق على علامة بصرية | لا |
| `diagram` | `web/public/assets/projects/precision-landing-marker/04-diagram.webp` | مخطّط مشروع الهبوط الذاتي الدقيق على علامة بصرية | لا |

### تجنّب العوائق باستشعار العمق

`depth-obstacle-avoidance` · متقدّم · منشور

| الدور | المسار الكامل | النص البديل | إلزامية؟ |
|---|---|---|---|
| `cover` | `web/public/assets/projects/depth-obstacle-avoidance/01-cover.webp` | مشروع تجنّب العوائق باستشعار العمق | **نعم** |
| `build` | `web/public/assets/projects/depth-obstacle-avoidance/02-build.webp` | تجميع مشروع تجنّب العوائق باستشعار العمق | لا |
| `result` | `web/public/assets/projects/depth-obstacle-avoidance/03-result.webp` | ناتج مشروع تجنّب العوائق باستشعار العمق | لا |
| `diagram` | `web/public/assets/projects/depth-obstacle-avoidance/04-diagram.webp` | مخطّط مشروع تجنّب العوائق باستشعار العمق | لا |

### رسم خرائط ثلاثية الأبعاد بالليزر و SLAM

`lidar-slam-mapping` · بحثي · منشور

| الدور | المسار الكامل | النص البديل | إلزامية؟ |
|---|---|---|---|
| `cover` | `web/public/assets/projects/lidar-slam-mapping/01-cover.webp` | مشروع رسم خرائط ثلاثية الأبعاد بالليزر و SLAM | **نعم** |
| `build` | `web/public/assets/projects/lidar-slam-mapping/02-build.webp` | تجميع مشروع رسم خرائط ثلاثية الأبعاد بالليزر و SLAM | لا |
| `result` | `web/public/assets/projects/lidar-slam-mapping/03-result.webp` | ناتج مشروع رسم خرائط ثلاثية الأبعاد بالليزر و SLAM | لا |
| `diagram` | `web/public/assets/projects/lidar-slam-mapping/04-diagram.webp` | مخطّط مشروع رسم خرائط ثلاثية الأبعاد بالليزر و SLAM | لا |

### سرب طائرات متناسق

`multi-drone-swarm` · بحثي · منشور

| الدور | المسار الكامل | النص البديل | إلزامية؟ |
|---|---|---|---|
| `cover` | `web/public/assets/projects/multi-drone-swarm/01-cover.webp` | مشروع سرب طائرات متناسق | **نعم** |
| `build` | `web/public/assets/projects/multi-drone-swarm/02-build.webp` | تجميع مشروع سرب طائرات متناسق | لا |
| `result` | `web/public/assets/projects/multi-drone-swarm/03-result.webp` | ناتج مشروع سرب طائرات متناسق | لا |
| `diagram` | `web/public/assets/projects/multi-drone-swarm/04-diagram.webp` | مخطّط مشروع سرب طائرات متناسق | لا |

### السباق الذاتي: طيران عالي السرعة عبر بوّابات

`autonomous-drone-racing` · بحثي · منشور

| الدور | المسار الكامل | النص البديل | إلزامية؟ |
|---|---|---|---|
| `cover` | `web/public/assets/projects/autonomous-drone-racing/01-cover.webp` | مشروع السباق الذاتي: طيران عالي السرعة عبر بوّابات | **نعم** |
| `build` | `web/public/assets/projects/autonomous-drone-racing/02-build.webp` | تجميع مشروع السباق الذاتي: طيران عالي السرعة عبر بوّابات | لا |
| `result` | `web/public/assets/projects/autonomous-drone-racing/03-result.webp` | ناتج مشروع السباق الذاتي: طيران عالي السرعة عبر بوّابات | لا |
| `diagram` | `web/public/assets/projects/autonomous-drone-racing/04-diagram.webp` | مخطّط مشروع السباق الذاتي: طيران عالي السرعة عبر بوّابات | لا |

### مسح صحّة المحاصيل بالتصوير متعدّد الأطياف

`crop-health-ndvi` · متوسّط · منشور

| الدور | المسار الكامل | النص البديل | إلزامية؟ |
|---|---|---|---|
| `cover` | `web/public/assets/projects/crop-health-ndvi/01-cover.webp` | مشروع مسح صحّة المحاصيل بالتصوير متعدّد الأطياف | **نعم** |
| `build` | `web/public/assets/projects/crop-health-ndvi/02-build.webp` | تجميع مشروع مسح صحّة المحاصيل بالتصوير متعدّد الأطياف | لا |
| `result` | `web/public/assets/projects/crop-health-ndvi/03-result.webp` | ناتج مشروع مسح صحّة المحاصيل بالتصوير متعدّد الأطياف | لا |
| `diagram` | `web/public/assets/projects/crop-health-ndvi/04-diagram.webp` | مخطّط مشروع مسح صحّة المحاصيل بالتصوير متعدّد الأطياف | لا |

### البحث والإنقاذ: كشف الأشخاص حرارياً وبصرياً

`thermal-search-rescue` · متقدّم · منشور

| الدور | المسار الكامل | النص البديل | إلزامية؟ |
|---|---|---|---|
| `cover` | `web/public/assets/projects/thermal-search-rescue/01-cover.webp` | مشروع البحث والإنقاذ: كشف الأشخاص حرارياً وبصرياً | **نعم** |
| `build` | `web/public/assets/projects/thermal-search-rescue/02-build.webp` | تجميع مشروع البحث والإنقاذ: كشف الأشخاص حرارياً وبصرياً | لا |
| `result` | `web/public/assets/projects/thermal-search-rescue/03-result.webp` | ناتج مشروع البحث والإنقاذ: كشف الأشخاص حرارياً وبصرياً | لا |
| `diagram` | `web/public/assets/projects/thermal-search-rescue/04-diagram.webp` | مخطّط مشروع البحث والإنقاذ: كشف الأشخاص حرارياً وبصرياً | لا |

### بناء طائرة صغيرة كاملة على ESP32

`esp32-mini-drone` · مبتدئ · منشور

| الدور | المسار الكامل | النص البديل | إلزامية؟ |
|---|---|---|---|
| `cover` | `web/public/assets/projects/esp32-mini-drone/01-cover.webp` | مشروع بناء طائرة صغيرة كاملة على ESP32 | **نعم** |
| `build` | `web/public/assets/projects/esp32-mini-drone/02-build.webp` | تجميع مشروع بناء طائرة صغيرة كاملة على ESP32 | لا |
| `result` | `web/public/assets/projects/esp32-mini-drone/03-result.webp` | ناتج مشروع بناء طائرة صغيرة كاملة على ESP32 | لا |
| `diagram` | `web/public/assets/projects/esp32-mini-drone/04-diagram.webp` | مخطّط مشروع بناء طائرة صغيرة كاملة على ESP32 | لا |

