# صور المتجر — ما أحتاج رفعه

> **هذا الملف مولَّد.** لا تحرّره بيدك — عدّل `src/data/store/imageSlots.ts`
> ثم شغّل `npx tsx scripts/buildImageManifest.ts`.

---

## أين أرفع الصور

```text
web/public/assets/store/<معرّف المنتج>/<الخيار>/<الرقم>-<الدور>.webp
```

المسار كامل مذكور أمام كل صورة أدناه، فانسخه كما هو. أسماء الملفات
مبنيّة على **المعرّفات لا على الأسماء**، فتغيير اسم عربي لا يفصل المنتج عن صوره.

## المقاسات

| | |
|---|---|
| النسبة | مربّعة 1:1 |
| المقاس المفضّل | 1600 × 1600 بكسل |
| الحدّ الأدنى | 1000 × 1000 بكسل |
| الصيغة | WebP |
| أقصى حجم للملف | 400 كيلوبايت |
| المصغّرة | 600 × 600 بكسل (تُولَّد آلياً، لا ترفعها) |

## أدوار الصور

- **`main`** — الصورة الرئيسية: المنتج كاملاً على خلفية بيضاء أو فاتحة، بلا قصّ لأي طرف. هذه التي تظهر في بطاقات المتجر.
- **`front`** — من الأمام مباشرة: تُظهر الكاميرا والهوائيات وترتيب المراوح.
- **`side`** — من الجانب: تُظهر الارتفاع وترتيب الطبقات والمنافذ.
- **`box`** — محتويات الصندوق كما تصل فعلاً — لا صورة دعائية.
- **`accessories`** — ما يُضاف أو يُستبدل: بطاريات، مراوح، هوائيات.

**الصورة الرئيسية (`01-main`) وحدها إلزامية.** المنتج بلا صورة رئيسية
يبقى مسودّة ولا يُنشر — هذا مفروض باختبار، لا بالاتفاق.

## الحقوق

كل صورة تحتاج أساس استخدام موثّقاً قبل النشر: صورة الشركة الصانعة بإذن،
أو صورة المورّد المسموح بها للبائعين، أو صورتك أنت. **لا صور ذكاء اصطناعي،
ولا صور منسوخة بلا إذن.** صورتك الخاصة هي دائماً الخيار الأسلم.

---

## الإجمالي: 402 صورة · 113 منها إلزامية

70 منتجاً · 113 خياراً


## تايني ووب

### طقم تدريب كامل للمبتدئ

- **المعرّف:** `betafpv-cetus-pro`
- **الاسم كما تكتبه الشركة:** BetaFPV Cetus Pro Kit
- **الشركة:** BetaFPV
- **القسم:** تايني ووب (`tiny-whoop`)
- **عدد الصور:** 5 لكل خيار

#### الطقم الكامل — طائرة وجهاز تحكّم ونظّارة

`betafpv-cetus-pro:rtf`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/betafpv-cetus-pro/rtf/01-main.webp` | طقم تدريب كامل للمبتدئ — الطقم الكامل — طائرة وجهاز تحكّم ونظّارة |
| 2 | `front` | `web/public/assets/store/betafpv-cetus-pro/rtf/02-front.webp` | طقم تدريب كامل للمبتدئ — الطقم الكامل — طائرة وجهاز تحكّم ونظّارة، من الأمام |
| 3 | `side` | `web/public/assets/store/betafpv-cetus-pro/rtf/03-side.webp` | طقم تدريب كامل للمبتدئ — الطقم الكامل — طائرة وجهاز تحكّم ونظّارة، من الجانب |
| 4 | `box` | `web/public/assets/store/betafpv-cetus-pro/rtf/04-box.webp` | محتويات صندوق طقم تدريب كامل للمبتدئ — الطقم الكامل — طائرة وجهاز تحكّم ونظّارة |
| 5 | `accessories` | `web/public/assets/store/betafpv-cetus-pro/rtf/05-accessories.webp` | ملحقات طقم تدريب كامل للمبتدئ — الطقم الكامل — طائرة وجهاز تحكّم ونظّارة |

#### الطائرة وحدها — لمن يملك جهازاً ونظّارة

`betafpv-cetus-pro:bnf`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/betafpv-cetus-pro/bnf/01-main.webp` | طقم تدريب كامل للمبتدئ — الطائرة وحدها — لمن يملك جهازاً ونظّارة |
| 2 | `front` | `web/public/assets/store/betafpv-cetus-pro/bnf/02-front.webp` | طقم تدريب كامل للمبتدئ — الطائرة وحدها — لمن يملك جهازاً ونظّارة، من الأمام |
| 3 | `side` | `web/public/assets/store/betafpv-cetus-pro/bnf/03-side.webp` | طقم تدريب كامل للمبتدئ — الطائرة وحدها — لمن يملك جهازاً ونظّارة، من الجانب |
| 4 | `box` | `web/public/assets/store/betafpv-cetus-pro/bnf/04-box.webp` | محتويات صندوق طقم تدريب كامل للمبتدئ — الطائرة وحدها — لمن يملك جهازاً ونظّارة |
| 5 | `accessories` | `web/public/assets/store/betafpv-cetus-pro/bnf/05-accessories.webp` | ملحقات طقم تدريب كامل للمبتدئ — الطائرة وحدها — لمن يملك جهازاً ونظّارة |


### ووب تناظري للطيران الحرّ داخل البيت

- **المعرّف:** `betafpv-meteor75-pro`
- **الاسم كما تكتبه الشركة:** BetaFPV Meteor75 Pro
- **الشركة:** BetaFPV
- **القسم:** تايني ووب (`tiny-whoop`)
- **عدد الصور:** 5 لكل خيار

#### ExpressLRS + فيديو تماثلي

`betafpv-meteor75-pro:elrs-analog`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/betafpv-meteor75-pro/elrs-analog/01-main.webp` | ووب تناظري للطيران الحرّ داخل البيت — ExpressLRS + فيديو تماثلي |
| 2 | `front` | `web/public/assets/store/betafpv-meteor75-pro/elrs-analog/02-front.webp` | ووب تناظري للطيران الحرّ داخل البيت — ExpressLRS + فيديو تماثلي، من الأمام |
| 3 | `side` | `web/public/assets/store/betafpv-meteor75-pro/elrs-analog/03-side.webp` | ووب تناظري للطيران الحرّ داخل البيت — ExpressLRS + فيديو تماثلي، من الجانب |
| 4 | `box` | `web/public/assets/store/betafpv-meteor75-pro/elrs-analog/04-box.webp` | محتويات صندوق ووب تناظري للطيران الحرّ داخل البيت — ExpressLRS + فيديو تماثلي |
| 5 | `accessories` | `web/public/assets/store/betafpv-meteor75-pro/elrs-analog/05-accessories.webp` | ملحقات ووب تناظري للطيران الحرّ داخل البيت — ExpressLRS + فيديو تماثلي |

#### ExpressLRS + فيديو رقمي

`betafpv-meteor75-pro:elrs-hd`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/betafpv-meteor75-pro/elrs-hd/01-main.webp` | ووب تناظري للطيران الحرّ داخل البيت — ExpressLRS + فيديو رقمي |
| 2 | `front` | `web/public/assets/store/betafpv-meteor75-pro/elrs-hd/02-front.webp` | ووب تناظري للطيران الحرّ داخل البيت — ExpressLRS + فيديو رقمي، من الأمام |
| 3 | `side` | `web/public/assets/store/betafpv-meteor75-pro/elrs-hd/03-side.webp` | ووب تناظري للطيران الحرّ داخل البيت — ExpressLRS + فيديو رقمي، من الجانب |
| 4 | `box` | `web/public/assets/store/betafpv-meteor75-pro/elrs-hd/04-box.webp` | محتويات صندوق ووب تناظري للطيران الحرّ داخل البيت — ExpressLRS + فيديو رقمي |
| 5 | `accessories` | `web/public/assets/store/betafpv-meteor75-pro/elrs-hd/05-accessories.webp` | ملحقات ووب تناظري للطيران الحرّ داخل البيت — ExpressLRS + فيديو رقمي |


### ووب اقتصادي واسع الانتشار

- **المعرّف:** `happymodel-mobula7`
- **الاسم كما تكتبه الشركة:** HappyModel Mobula7
- **الشركة:** HappyModel
- **القسم:** تايني ووب (`tiny-whoop`)
- **عدد الصور:** 5 لكل خيار

#### ExpressLRS مع مستقبِل — تماثلي

`happymodel-mobula7:elrs-bnf`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/happymodel-mobula7/elrs-bnf/01-main.webp` | ووب اقتصادي واسع الانتشار — ExpressLRS مع مستقبِل — تماثلي |
| 2 | `front` | `web/public/assets/store/happymodel-mobula7/elrs-bnf/02-front.webp` | ووب اقتصادي واسع الانتشار — ExpressLRS مع مستقبِل — تماثلي، من الأمام |
| 3 | `side` | `web/public/assets/store/happymodel-mobula7/elrs-bnf/03-side.webp` | ووب اقتصادي واسع الانتشار — ExpressLRS مع مستقبِل — تماثلي، من الجانب |
| 4 | `box` | `web/public/assets/store/happymodel-mobula7/elrs-bnf/04-box.webp` | محتويات صندوق ووب اقتصادي واسع الانتشار — ExpressLRS مع مستقبِل — تماثلي |
| 5 | `accessories` | `web/public/assets/store/happymodel-mobula7/elrs-bnf/05-accessories.webp` | ملحقات ووب اقتصادي واسع الانتشار — ExpressLRS مع مستقبِل — تماثلي |

#### بلا مستقبِل — تركّب مستقبِلك

`happymodel-mobula7:pnp`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/happymodel-mobula7/pnp/01-main.webp` | ووب اقتصادي واسع الانتشار — بلا مستقبِل — تركّب مستقبِلك |
| 2 | `front` | `web/public/assets/store/happymodel-mobula7/pnp/02-front.webp` | ووب اقتصادي واسع الانتشار — بلا مستقبِل — تركّب مستقبِلك، من الأمام |
| 3 | `side` | `web/public/assets/store/happymodel-mobula7/pnp/03-side.webp` | ووب اقتصادي واسع الانتشار — بلا مستقبِل — تركّب مستقبِلك، من الجانب |
| 4 | `box` | `web/public/assets/store/happymodel-mobula7/pnp/04-box.webp` | محتويات صندوق ووب اقتصادي واسع الانتشار — بلا مستقبِل — تركّب مستقبِلك |
| 5 | `accessories` | `web/public/assets/store/happymodel-mobula7/pnp/05-accessories.webp` | ملحقات ووب اقتصادي واسع الانتشار — بلا مستقبِل — تركّب مستقبِلك |


## مقاس 2 إنش

### سينيووب صغير مبني حول وحدة فيديو رقمية تشتريها معه

- **المعرّف:** `betafpv-pavo-pico`
- **الاسم كما تكتبه الشركة:** BetaFPV Pavo Pico
- **الشركة:** BetaFPV
- **القسم:** مقاس 2 إنش (`size-2`)
- **عدد الصور:** 5 لكل خيار

#### الخيار الوحيد

`betafpv-pavo-pico:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/betafpv-pavo-pico/standard/01-main.webp` | سينيووب صغير مبني حول وحدة فيديو رقمية تشتريها معه — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/betafpv-pavo-pico/standard/02-front.webp` | سينيووب صغير مبني حول وحدة فيديو رقمية تشتريها معه — الخيار الوحيد، من الأمام |
| 3 | `side` | `web/public/assets/store/betafpv-pavo-pico/standard/03-side.webp` | سينيووب صغير مبني حول وحدة فيديو رقمية تشتريها معه — الخيار الوحيد، من الجانب |
| 4 | `box` | `web/public/assets/store/betafpv-pavo-pico/standard/04-box.webp` | محتويات صندوق سينيووب صغير مبني حول وحدة فيديو رقمية تشتريها معه — الخيار الوحيد |
| 5 | `accessories` | `web/public/assets/store/betafpv-pavo-pico/standard/05-accessories.webp` | ملحقات سينيووب صغير مبني حول وحدة فيديو رقمية تشتريها معه — الخيار الوحيد |


## مقاس 2.5 إنش

### سينيووب 2.5 إنش للتصوير الناعم

- **المعرّف:** `geprc-cinelog25`
- **الاسم كما تكتبه الشركة:** GEPRC Cinelog25
- **الشركة:** GEPRC
- **القسم:** مقاس 2.5 إنش (`size-2-5`)
- **عدد الصور:** 5 لكل خيار

#### تماثلي

`geprc-cinelog25:analog`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/geprc-cinelog25/analog/01-main.webp` | سينيووب 2.5 إنش للتصوير الناعم — تماثلي |
| 2 | `front` | `web/public/assets/store/geprc-cinelog25/analog/02-front.webp` | سينيووب 2.5 إنش للتصوير الناعم — تماثلي، من الأمام |
| 3 | `side` | `web/public/assets/store/geprc-cinelog25/analog/03-side.webp` | سينيووب 2.5 إنش للتصوير الناعم — تماثلي، من الجانب |
| 4 | `box` | `web/public/assets/store/geprc-cinelog25/analog/04-box.webp` | محتويات صندوق سينيووب 2.5 إنش للتصوير الناعم — تماثلي |
| 5 | `accessories` | `web/public/assets/store/geprc-cinelog25/analog/05-accessories.webp` | ملحقات سينيووب 2.5 إنش للتصوير الناعم — تماثلي |

#### رقمي بوحدة DJI O3

`geprc-cinelog25:hd-o3`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/geprc-cinelog25/hd-o3/01-main.webp` | سينيووب 2.5 إنش للتصوير الناعم — رقمي بوحدة DJI O3 |
| 2 | `front` | `web/public/assets/store/geprc-cinelog25/hd-o3/02-front.webp` | سينيووب 2.5 إنش للتصوير الناعم — رقمي بوحدة DJI O3، من الأمام |
| 3 | `side` | `web/public/assets/store/geprc-cinelog25/hd-o3/03-side.webp` | سينيووب 2.5 إنش للتصوير الناعم — رقمي بوحدة DJI O3، من الجانب |
| 4 | `box` | `web/public/assets/store/geprc-cinelog25/hd-o3/04-box.webp` | محتويات صندوق سينيووب 2.5 إنش للتصوير الناعم — رقمي بوحدة DJI O3 |
| 5 | `accessories` | `web/public/assets/store/geprc-cinelog25/hd-o3/05-accessories.webp` | ملحقات سينيووب 2.5 إنش للتصوير الناعم — رقمي بوحدة DJI O3 |

#### رقمي بنظام Walksnail

`geprc-cinelog25:hd-wasp`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/geprc-cinelog25/hd-wasp/01-main.webp` | سينيووب 2.5 إنش للتصوير الناعم — رقمي بنظام Walksnail |
| 2 | `front` | `web/public/assets/store/geprc-cinelog25/hd-wasp/02-front.webp` | سينيووب 2.5 إنش للتصوير الناعم — رقمي بنظام Walksnail، من الأمام |
| 3 | `side` | `web/public/assets/store/geprc-cinelog25/hd-wasp/03-side.webp` | سينيووب 2.5 إنش للتصوير الناعم — رقمي بنظام Walksnail، من الجانب |
| 4 | `box` | `web/public/assets/store/geprc-cinelog25/hd-wasp/04-box.webp` | محتويات صندوق سينيووب 2.5 إنش للتصوير الناعم — رقمي بنظام Walksnail |
| 5 | `accessories` | `web/public/assets/store/geprc-cinelog25/hd-wasp/05-accessories.webp` | ملحقات سينيووب 2.5 إنش للتصوير الناعم — رقمي بنظام Walksnail |


## مقاس 3.5 – 4 إنش

### فريستايل تحت 250 غراماً

- **المعرّف:** `geprc-smart35`
- **الاسم كما تكتبه الشركة:** GEPRC SMART35
- **الشركة:** GEPRC
- **القسم:** مقاس 3.5 – 4 إنش (`size-3-5`)
- **عدد الصور:** 5 لكل خيار

#### نسخة تماثلية بطاقة 600 ميلي واط

`geprc-smart35:analog`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/geprc-smart35/analog/01-main.webp` | فريستايل تحت 250 غراماً — نسخة تماثلية بطاقة 600 ميلي واط |
| 2 | `front` | `web/public/assets/store/geprc-smart35/analog/02-front.webp` | فريستايل تحت 250 غراماً — نسخة تماثلية بطاقة 600 ميلي واط، من الأمام |
| 3 | `side` | `web/public/assets/store/geprc-smart35/analog/03-side.webp` | فريستايل تحت 250 غراماً — نسخة تماثلية بطاقة 600 ميلي واط، من الجانب |
| 4 | `box` | `web/public/assets/store/geprc-smart35/analog/04-box.webp` | محتويات صندوق فريستايل تحت 250 غراماً — نسخة تماثلية بطاقة 600 ميلي واط |
| 5 | `accessories` | `web/public/assets/store/geprc-smart35/analog/05-accessories.webp` | ملحقات فريستايل تحت 250 غراماً — نسخة تماثلية بطاقة 600 ميلي واط |

#### نسخة رقمية

`geprc-smart35:hd`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/geprc-smart35/hd/01-main.webp` | فريستايل تحت 250 غراماً — نسخة رقمية |
| 2 | `front` | `web/public/assets/store/geprc-smart35/hd/02-front.webp` | فريستايل تحت 250 غراماً — نسخة رقمية، من الأمام |
| 3 | `side` | `web/public/assets/store/geprc-smart35/hd/03-side.webp` | فريستايل تحت 250 غراماً — نسخة رقمية، من الجانب |
| 4 | `box` | `web/public/assets/store/geprc-smart35/hd/04-box.webp` | محتويات صندوق فريستايل تحت 250 غراماً — نسخة رقمية |
| 5 | `accessories` | `web/public/assets/store/geprc-smart35/hd/05-accessories.webp` | ملحقات فريستايل تحت 250 غراماً — نسخة رقمية |


### سينيووب 3.5 إنش بنظام رقمي من الجيل الرابع

- **المعرّف:** `geprc-cinelog35`
- **الاسم كما تكتبه الشركة:** GEPRC CineLog35 V3
- **الشركة:** GEPRC
- **القسم:** مقاس 3.5 – 4 إنش (`size-3-5`)
- **عدد الصور:** 5 لكل خيار

#### نسخة DJI O4 Air Unit Pro

`geprc-cinelog35:o4-pro`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/geprc-cinelog35/o4-pro/01-main.webp` | سينيووب 3.5 إنش بنظام رقمي من الجيل الرابع — نسخة DJI O4 Air Unit Pro |
| 2 | `front` | `web/public/assets/store/geprc-cinelog35/o4-pro/02-front.webp` | سينيووب 3.5 إنش بنظام رقمي من الجيل الرابع — نسخة DJI O4 Air Unit Pro، من الأمام |
| 3 | `side` | `web/public/assets/store/geprc-cinelog35/o4-pro/03-side.webp` | سينيووب 3.5 إنش بنظام رقمي من الجيل الرابع — نسخة DJI O4 Air Unit Pro، من الجانب |
| 4 | `box` | `web/public/assets/store/geprc-cinelog35/o4-pro/04-box.webp` | محتويات صندوق سينيووب 3.5 إنش بنظام رقمي من الجيل الرابع — نسخة DJI O4 Air Unit Pro |
| 5 | `accessories` | `web/public/assets/store/geprc-cinelog35/o4-pro/05-accessories.webp` | ملحقات سينيووب 3.5 إنش بنظام رقمي من الجيل الرابع — نسخة DJI O4 Air Unit Pro |

#### نسخة WTFPV

`geprc-cinelog35:wtfpv`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/geprc-cinelog35/wtfpv/01-main.webp` | سينيووب 3.5 إنش بنظام رقمي من الجيل الرابع — نسخة WTFPV |
| 2 | `front` | `web/public/assets/store/geprc-cinelog35/wtfpv/02-front.webp` | سينيووب 3.5 إنش بنظام رقمي من الجيل الرابع — نسخة WTFPV، من الأمام |
| 3 | `side` | `web/public/assets/store/geprc-cinelog35/wtfpv/03-side.webp` | سينيووب 3.5 إنش بنظام رقمي من الجيل الرابع — نسخة WTFPV، من الجانب |
| 4 | `box` | `web/public/assets/store/geprc-cinelog35/wtfpv/04-box.webp` | محتويات صندوق سينيووب 3.5 إنش بنظام رقمي من الجيل الرابع — نسخة WTFPV |
| 5 | `accessories` | `web/public/assets/store/geprc-cinelog35/wtfpv/05-accessories.webp` | ملحقات سينيووب 3.5 إنش بنظام رقمي من الجيل الرابع — نسخة WTFPV |


## مقاس 5 إنش

### خمس إنشات جاهزة للفريستايل

- **المعرّف:** `iflight-nazgul5-v3`
- **الاسم كما تكتبه الشركة:** iFlight Nazgul5 V3
- **الشركة:** iFlight
- **القسم:** مقاس 5 إنش (`size-5`)
- **عدد الصور:** 5 لكل خيار

#### ExpressLRS + فيديو تماثلي

`iflight-nazgul5-v3:elrs-analog`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/iflight-nazgul5-v3/elrs-analog/01-main.webp` | خمس إنشات جاهزة للفريستايل — ExpressLRS + فيديو تماثلي |
| 2 | `front` | `web/public/assets/store/iflight-nazgul5-v3/elrs-analog/02-front.webp` | خمس إنشات جاهزة للفريستايل — ExpressLRS + فيديو تماثلي، من الأمام |
| 3 | `side` | `web/public/assets/store/iflight-nazgul5-v3/elrs-analog/03-side.webp` | خمس إنشات جاهزة للفريستايل — ExpressLRS + فيديو تماثلي، من الجانب |
| 4 | `box` | `web/public/assets/store/iflight-nazgul5-v3/elrs-analog/04-box.webp` | محتويات صندوق خمس إنشات جاهزة للفريستايل — ExpressLRS + فيديو تماثلي |
| 5 | `accessories` | `web/public/assets/store/iflight-nazgul5-v3/elrs-analog/05-accessories.webp` | ملحقات خمس إنشات جاهزة للفريستايل — ExpressLRS + فيديو تماثلي |

#### Crossfire + فيديو تماثلي

`iflight-nazgul5-v3:crossfire-analog`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/iflight-nazgul5-v3/crossfire-analog/01-main.webp` | خمس إنشات جاهزة للفريستايل — Crossfire + فيديو تماثلي |
| 2 | `front` | `web/public/assets/store/iflight-nazgul5-v3/crossfire-analog/02-front.webp` | خمس إنشات جاهزة للفريستايل — Crossfire + فيديو تماثلي، من الأمام |
| 3 | `side` | `web/public/assets/store/iflight-nazgul5-v3/crossfire-analog/03-side.webp` | خمس إنشات جاهزة للفريستايل — Crossfire + فيديو تماثلي، من الجانب |
| 4 | `box` | `web/public/assets/store/iflight-nazgul5-v3/crossfire-analog/04-box.webp` | محتويات صندوق خمس إنشات جاهزة للفريستايل — Crossfire + فيديو تماثلي |
| 5 | `accessories` | `web/public/assets/store/iflight-nazgul5-v3/crossfire-analog/05-accessories.webp` | ملحقات خمس إنشات جاهزة للفريستايل — Crossfire + فيديو تماثلي |

#### بلا مستقبِل

`iflight-nazgul5-v3:pnp`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/iflight-nazgul5-v3/pnp/01-main.webp` | خمس إنشات جاهزة للفريستايل — بلا مستقبِل |
| 2 | `front` | `web/public/assets/store/iflight-nazgul5-v3/pnp/02-front.webp` | خمس إنشات جاهزة للفريستايل — بلا مستقبِل، من الأمام |
| 3 | `side` | `web/public/assets/store/iflight-nazgul5-v3/pnp/03-side.webp` | خمس إنشات جاهزة للفريستايل — بلا مستقبِل، من الجانب |
| 4 | `box` | `web/public/assets/store/iflight-nazgul5-v3/pnp/04-box.webp` | محتويات صندوق خمس إنشات جاهزة للفريستايل — بلا مستقبِل |
| 5 | `accessories` | `web/public/assets/store/iflight-nazgul5-v3/pnp/05-accessories.webp` | ملحقات خمس إنشات جاهزة للفريستايل — بلا مستقبِل |


### خمس إنشات بهيكل يسهل إصلاحه

- **المعرّف:** `geprc-mark5`
- **الاسم كما تكتبه الشركة:** GEPRC MARK5
- **الشركة:** GEPRC
- **القسم:** مقاس 5 إنش (`size-5`)
- **عدد الصور:** 5 لكل خيار

#### ExpressLRS 2.4 + فيديو تماثلي

`geprc-mark5:elrs24-analog`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/geprc-mark5/elrs24-analog/01-main.webp` | خمس إنشات بهيكل يسهل إصلاحه — ExpressLRS 2.4 + فيديو تماثلي |
| 2 | `front` | `web/public/assets/store/geprc-mark5/elrs24-analog/02-front.webp` | خمس إنشات بهيكل يسهل إصلاحه — ExpressLRS 2.4 + فيديو تماثلي، من الأمام |
| 3 | `side` | `web/public/assets/store/geprc-mark5/elrs24-analog/03-side.webp` | خمس إنشات بهيكل يسهل إصلاحه — ExpressLRS 2.4 + فيديو تماثلي، من الجانب |
| 4 | `box` | `web/public/assets/store/geprc-mark5/elrs24-analog/04-box.webp` | محتويات صندوق خمس إنشات بهيكل يسهل إصلاحه — ExpressLRS 2.4 + فيديو تماثلي |
| 5 | `accessories` | `web/public/assets/store/geprc-mark5/elrs24-analog/05-accessories.webp` | ملحقات خمس إنشات بهيكل يسهل إصلاحه — ExpressLRS 2.4 + فيديو تماثلي |

#### ExpressLRS 915 + فيديو تماثلي

`geprc-mark5:elrs915-analog`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/geprc-mark5/elrs915-analog/01-main.webp` | خمس إنشات بهيكل يسهل إصلاحه — ExpressLRS 915 + فيديو تماثلي |
| 2 | `front` | `web/public/assets/store/geprc-mark5/elrs915-analog/02-front.webp` | خمس إنشات بهيكل يسهل إصلاحه — ExpressLRS 915 + فيديو تماثلي، من الأمام |
| 3 | `side` | `web/public/assets/store/geprc-mark5/elrs915-analog/03-side.webp` | خمس إنشات بهيكل يسهل إصلاحه — ExpressLRS 915 + فيديو تماثلي، من الجانب |
| 4 | `box` | `web/public/assets/store/geprc-mark5/elrs915-analog/04-box.webp` | محتويات صندوق خمس إنشات بهيكل يسهل إصلاحه — ExpressLRS 915 + فيديو تماثلي |
| 5 | `accessories` | `web/public/assets/store/geprc-mark5/elrs915-analog/05-accessories.webp` | ملحقات خمس إنشات بهيكل يسهل إصلاحه — ExpressLRS 915 + فيديو تماثلي |

#### بلا مستقبِل

`geprc-mark5:pnp`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/geprc-mark5/pnp/01-main.webp` | خمس إنشات بهيكل يسهل إصلاحه — بلا مستقبِل |
| 2 | `front` | `web/public/assets/store/geprc-mark5/pnp/02-front.webp` | خمس إنشات بهيكل يسهل إصلاحه — بلا مستقبِل، من الأمام |
| 3 | `side` | `web/public/assets/store/geprc-mark5/pnp/03-side.webp` | خمس إنشات بهيكل يسهل إصلاحه — بلا مستقبِل، من الجانب |
| 4 | `box` | `web/public/assets/store/geprc-mark5/pnp/04-box.webp` | محتويات صندوق خمس إنشات بهيكل يسهل إصلاحه — بلا مستقبِل |
| 5 | `accessories` | `web/public/assets/store/geprc-mark5/pnp/05-accessories.webp` | ملحقات خمس إنشات بهيكل يسهل إصلاحه — بلا مستقبِل |


### خمس إنشات مبنيّة على هيكل مفتوح المصدر

- **المعرّف:** `tbs-source-one-v5`
- **الاسم كما تكتبه الشركة:** TBS Source One V5.1 RTF/BNF Set
- **الشركة:** Team BlackSheep
- **القسم:** مقاس 5 إنش (`size-5`)
- **عدد الصور:** 5 لكل خيار

#### الخيار الوحيد

`tbs-source-one-v5:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/tbs-source-one-v5/standard/01-main.webp` | خمس إنشات مبنيّة على هيكل مفتوح المصدر — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/tbs-source-one-v5/standard/02-front.webp` | خمس إنشات مبنيّة على هيكل مفتوح المصدر — الخيار الوحيد، من الأمام |
| 3 | `side` | `web/public/assets/store/tbs-source-one-v5/standard/03-side.webp` | خمس إنشات مبنيّة على هيكل مفتوح المصدر — الخيار الوحيد، من الجانب |
| 4 | `box` | `web/public/assets/store/tbs-source-one-v5/standard/04-box.webp` | محتويات صندوق خمس إنشات مبنيّة على هيكل مفتوح المصدر — الخيار الوحيد |
| 5 | `accessories` | `web/public/assets/store/tbs-source-one-v5/standard/05-accessories.webp` | ملحقات خمس إنشات مبنيّة على هيكل مفتوح المصدر — الخيار الوحيد |


## مقاس 7 إنش

### سبع إنشات بقطر 327 مم لرحلات طويلة

- **المعرّف:** `iflight-chimera7-pro`
- **الاسم كما تكتبه الشركة:** iFlight Chimera7 Pro V2
- **الشركة:** iFlight
- **القسم:** مقاس 7 إنش (`size-7`)
- **عدد الصور:** 5 لكل خيار

#### نسخة تماثلية بمرسل BLITZ Whoop

`iflight-chimera7-pro:analog`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/iflight-chimera7-pro/analog/01-main.webp` | سبع إنشات بقطر 327 مم لرحلات طويلة — نسخة تماثلية بمرسل BLITZ Whoop |
| 2 | `front` | `web/public/assets/store/iflight-chimera7-pro/analog/02-front.webp` | سبع إنشات بقطر 327 مم لرحلات طويلة — نسخة تماثلية بمرسل BLITZ Whoop، من الأمام |
| 3 | `side` | `web/public/assets/store/iflight-chimera7-pro/analog/03-side.webp` | سبع إنشات بقطر 327 مم لرحلات طويلة — نسخة تماثلية بمرسل BLITZ Whoop، من الجانب |
| 4 | `box` | `web/public/assets/store/iflight-chimera7-pro/analog/04-box.webp` | محتويات صندوق سبع إنشات بقطر 327 مم لرحلات طويلة — نسخة تماثلية بمرسل BLITZ Whoop |
| 5 | `accessories` | `web/public/assets/store/iflight-chimera7-pro/analog/05-accessories.webp` | ملحقات سبع إنشات بقطر 327 مم لرحلات طويلة — نسخة تماثلية بمرسل BLITZ Whoop |

#### نسخة DJI O3

`iflight-chimera7-pro:o3`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/iflight-chimera7-pro/o3/01-main.webp` | سبع إنشات بقطر 327 مم لرحلات طويلة — نسخة DJI O3 |
| 2 | `front` | `web/public/assets/store/iflight-chimera7-pro/o3/02-front.webp` | سبع إنشات بقطر 327 مم لرحلات طويلة — نسخة DJI O3، من الأمام |
| 3 | `side` | `web/public/assets/store/iflight-chimera7-pro/o3/03-side.webp` | سبع إنشات بقطر 327 مم لرحلات طويلة — نسخة DJI O3، من الجانب |
| 4 | `box` | `web/public/assets/store/iflight-chimera7-pro/o3/04-box.webp` | محتويات صندوق سبع إنشات بقطر 327 مم لرحلات طويلة — نسخة DJI O3 |
| 5 | `accessories` | `web/public/assets/store/iflight-chimera7-pro/o3/05-accessories.webp` | ملحقات سبع إنشات بقطر 327 مم لرحلات طويلة — نسخة DJI O3 |

#### نسخة DJI O4

`iflight-chimera7-pro:o4`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/iflight-chimera7-pro/o4/01-main.webp` | سبع إنشات بقطر 327 مم لرحلات طويلة — نسخة DJI O4 |
| 2 | `front` | `web/public/assets/store/iflight-chimera7-pro/o4/02-front.webp` | سبع إنشات بقطر 327 مم لرحلات طويلة — نسخة DJI O4، من الأمام |
| 3 | `side` | `web/public/assets/store/iflight-chimera7-pro/o4/03-side.webp` | سبع إنشات بقطر 327 مم لرحلات طويلة — نسخة DJI O4، من الجانب |
| 4 | `box` | `web/public/assets/store/iflight-chimera7-pro/o4/04-box.webp` | محتويات صندوق سبع إنشات بقطر 327 مم لرحلات طويلة — نسخة DJI O4 |
| 5 | `accessories` | `web/public/assets/store/iflight-chimera7-pro/o4/05-accessories.webp` | ملحقات سبع إنشات بقطر 327 مم لرحلات طويلة — نسخة DJI O4 |


## جاهزة للطيران

### طقم جاهز ببروتوكول FrSky D8

- **المعرّف:** `emax-tinyhawk-3-rtf`
- **الاسم كما تكتبه الشركة:** EMAX Tinyhawk III RTF Kit
- **الشركة:** EMAX
- **القسم:** جاهزة للطيران (`rtf`)
- **عدد الصور:** 5 لكل خيار

#### الخيار الوحيد

`emax-tinyhawk-3-rtf:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/emax-tinyhawk-3-rtf/standard/01-main.webp` | طقم جاهز ببروتوكول FrSky D8 — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/emax-tinyhawk-3-rtf/standard/02-front.webp` | طقم جاهز ببروتوكول FrSky D8 — الخيار الوحيد، من الأمام |
| 3 | `side` | `web/public/assets/store/emax-tinyhawk-3-rtf/standard/03-side.webp` | طقم جاهز ببروتوكول FrSky D8 — الخيار الوحيد، من الجانب |
| 4 | `box` | `web/public/assets/store/emax-tinyhawk-3-rtf/standard/04-box.webp` | محتويات صندوق طقم جاهز ببروتوكول FrSky D8 — الخيار الوحيد |
| 5 | `accessories` | `web/public/assets/store/emax-tinyhawk-3-rtf/standard/05-accessories.webp` | ملحقات طقم جاهز ببروتوكول FrSky D8 — الخيار الوحيد |


## أجهزة التحكم

### جهاز تحكم اقتصادي كامل الوظائف

- **المعرّف:** `radiomaster-pocket`
- **الاسم كما تكتبه الشركة:** RadioMaster Pocket
- **الشركة:** RadioMaster
- **القسم:** أجهزة التحكم (`radios`)
- **عدد الصور:** 3 لكل خيار

#### نسخة ExpressLRS

`radiomaster-pocket:elrs`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/radiomaster-pocket/elrs/01-main.webp` | جهاز تحكم اقتصادي كامل الوظائف — نسخة ExpressLRS |
| 2 | `front` | `web/public/assets/store/radiomaster-pocket/elrs/02-front.webp` | جهاز تحكم اقتصادي كامل الوظائف — نسخة ExpressLRS، من الأمام |
| 3 | `box` | `web/public/assets/store/radiomaster-pocket/elrs/03-box.webp` | محتويات صندوق جهاز تحكم اقتصادي كامل الوظائف — نسخة ExpressLRS |

#### نسخة متعدّدة البروتوكولات (CC2500)

`radiomaster-pocket:cc2500`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/radiomaster-pocket/cc2500/01-main.webp` | جهاز تحكم اقتصادي كامل الوظائف — نسخة متعدّدة البروتوكولات (CC2500) |
| 2 | `front` | `web/public/assets/store/radiomaster-pocket/cc2500/02-front.webp` | جهاز تحكم اقتصادي كامل الوظائف — نسخة متعدّدة البروتوكولات (CC2500)، من الأمام |
| 3 | `box` | `web/public/assets/store/radiomaster-pocket/cc2500/03-box.webp` | محتويات صندوق جهاز تحكم اقتصادي كامل الوظائف — نسخة متعدّدة البروتوكولات (CC2500) |


### جهاز التحكم المتوسط الموصى به

- **المعرّف:** `radiomaster-boxer`
- **الاسم كما تكتبه الشركة:** RadioMaster Boxer
- **الشركة:** RadioMaster
- **القسم:** أجهزة التحكم (`radios`)
- **عدد الصور:** 3 لكل خيار

#### نسخة ExpressLRS

`radiomaster-boxer:elrs`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/radiomaster-boxer/elrs/01-main.webp` | جهاز التحكم المتوسط الموصى به — نسخة ExpressLRS |
| 2 | `front` | `web/public/assets/store/radiomaster-boxer/elrs/02-front.webp` | جهاز التحكم المتوسط الموصى به — نسخة ExpressLRS، من الأمام |
| 3 | `box` | `web/public/assets/store/radiomaster-boxer/elrs/03-box.webp` | محتويات صندوق جهاز التحكم المتوسط الموصى به — نسخة ExpressLRS |

#### نسخة متعدّدة البروتوكولات (4-in-1)

`radiomaster-boxer:multi`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/radiomaster-boxer/multi/01-main.webp` | جهاز التحكم المتوسط الموصى به — نسخة متعدّدة البروتوكولات (4-in-1) |
| 2 | `front` | `web/public/assets/store/radiomaster-boxer/multi/02-front.webp` | جهاز التحكم المتوسط الموصى به — نسخة متعدّدة البروتوكولات (4-in-1)، من الأمام |
| 3 | `box` | `web/public/assets/store/radiomaster-boxer/multi/03-box.webp` | محتويات صندوق جهاز التحكم المتوسط الموصى به — نسخة متعدّدة البروتوكولات (4-in-1) |


### جهاز التحكم الاحترافي

- **المعرّف:** `radiomaster-tx16s-mk2`
- **الاسم كما تكتبه الشركة:** RadioMaster TX16S MKII
- **الشركة:** RadioMaster
- **القسم:** أجهزة التحكم (`radios`)
- **عدد الصور:** 3 لكل خيار

#### نسخة ExpressLRS

`radiomaster-tx16s-mk2:elrs`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/radiomaster-tx16s-mk2/elrs/01-main.webp` | جهاز التحكم الاحترافي — نسخة ExpressLRS |
| 2 | `front` | `web/public/assets/store/radiomaster-tx16s-mk2/elrs/02-front.webp` | جهاز التحكم الاحترافي — نسخة ExpressLRS، من الأمام |
| 3 | `box` | `web/public/assets/store/radiomaster-tx16s-mk2/elrs/03-box.webp` | محتويات صندوق جهاز التحكم الاحترافي — نسخة ExpressLRS |

#### نسخة متعدّدة البروتوكولات (4-in-1)

`radiomaster-tx16s-mk2:multi`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/radiomaster-tx16s-mk2/multi/01-main.webp` | جهاز التحكم الاحترافي — نسخة متعدّدة البروتوكولات (4-in-1) |
| 2 | `front` | `web/public/assets/store/radiomaster-tx16s-mk2/multi/02-front.webp` | جهاز التحكم الاحترافي — نسخة متعدّدة البروتوكولات (4-in-1)، من الأمام |
| 3 | `box` | `web/public/assets/store/radiomaster-tx16s-mk2/multi/03-box.webp` | محتويات صندوق جهاز التحكم الاحترافي — نسخة متعدّدة البروتوكولات (4-in-1) |


## النظارات

### نظارة رقمية من منظومة DJI

- **المعرّف:** `dji-goggles-n3`
- **الاسم كما تكتبه الشركة:** DJI Goggles N3
- **الشركة:** DJI
- **القسم:** النظارات (`goggles`)
- **عدد الصور:** 3 لكل خيار

#### الخيار الوحيد

`dji-goggles-n3:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/dji-goggles-n3/standard/01-main.webp` | نظارة رقمية من منظومة DJI — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/dji-goggles-n3/standard/02-front.webp` | نظارة رقمية من منظومة DJI — الخيار الوحيد، من الأمام |
| 3 | `box` | `web/public/assets/store/dji-goggles-n3/standard/03-box.webp` | محتويات صندوق نظارة رقمية من منظومة DJI — الخيار الوحيد |


### نظّارة رقمية بوزن 290 غراماً ومدخل HDMI

- **المعرّف:** `walksnail-avatar-hd-x`
- **الاسم كما تكتبه الشركة:** Walksnail Avatar HD Goggles X
- **الشركة:** Walksnail
- **القسم:** النظارات (`goggles`)
- **عدد الصور:** 3 لكل خيار

#### الخيار الوحيد

`walksnail-avatar-hd-x:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/walksnail-avatar-hd-x/standard/01-main.webp` | نظّارة رقمية بوزن 290 غراماً ومدخل HDMI — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/walksnail-avatar-hd-x/standard/02-front.webp` | نظّارة رقمية بوزن 290 غراماً ومدخل HDMI — الخيار الوحيد، من الأمام |
| 3 | `box` | `web/public/assets/store/walksnail-avatar-hd-x/standard/03-box.webp` | محتويات صندوق نظّارة رقمية بوزن 290 غراماً ومدخل HDMI — الخيار الوحيد |


### نظّارة رقمية بتأخير 3 مللي ثانية

- **المعرّف:** `hdzero-goggles`
- **الاسم كما تكتبه الشركة:** HDZero Goggle 2
- **الشركة:** HDZero
- **القسم:** النظارات (`goggles`)
- **عدد الصور:** 3 لكل خيار

#### الخيار الوحيد

`hdzero-goggles:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/hdzero-goggles/standard/01-main.webp` | نظّارة رقمية بتأخير 3 مللي ثانية — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/hdzero-goggles/standard/02-front.webp` | نظّارة رقمية بتأخير 3 مللي ثانية — الخيار الوحيد، من الأمام |
| 3 | `box` | `web/public/assets/store/hdzero-goggles/standard/03-box.webp` | محتويات صندوق نظّارة رقمية بتأخير 3 مللي ثانية — الخيار الوحيد |


## البطاريات

### بطارية 6S — اختر السعة بمكان بطاريتك

- **المعرّف:** `cnhl-black-series-6s`
- **الاسم كما تكتبه الشركة:** CNHL Black Series 6S
- **الشركة:** CNHL
- **القسم:** البطاريات (`batteries`)
- **عدد الصور:** 3 لكل خيار

#### 1100 ميلي أمبير/ساعة — 100C

`cnhl-black-series-6s:mah1100`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/cnhl-black-series-6s/mah1100/01-main.webp` | بطارية 6S — اختر السعة بمكان بطاريتك — 1100 ميلي أمبير/ساعة — 100C |
| 2 | `front` | `web/public/assets/store/cnhl-black-series-6s/mah1100/02-front.webp` | بطارية 6S — اختر السعة بمكان بطاريتك — 1100 ميلي أمبير/ساعة — 100C، من الأمام |
| 3 | `box` | `web/public/assets/store/cnhl-black-series-6s/mah1100/03-box.webp` | محتويات صندوق بطارية 6S — اختر السعة بمكان بطاريتك — 1100 ميلي أمبير/ساعة — 100C |

#### 1500 ميلي أمبير/ساعة — 130C

`cnhl-black-series-6s:mah1500`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/cnhl-black-series-6s/mah1500/01-main.webp` | بطارية 6S — اختر السعة بمكان بطاريتك — 1500 ميلي أمبير/ساعة — 130C |
| 2 | `front` | `web/public/assets/store/cnhl-black-series-6s/mah1500/02-front.webp` | بطارية 6S — اختر السعة بمكان بطاريتك — 1500 ميلي أمبير/ساعة — 130C، من الأمام |
| 3 | `box` | `web/public/assets/store/cnhl-black-series-6s/mah1500/03-box.webp` | محتويات صندوق بطارية 6S — اختر السعة بمكان بطاريتك — 1500 ميلي أمبير/ساعة — 130C |

#### 2000 ميلي أمبير/ساعة — 100C

`cnhl-black-series-6s:mah2000`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/cnhl-black-series-6s/mah2000/01-main.webp` | بطارية 6S — اختر السعة بمكان بطاريتك — 2000 ميلي أمبير/ساعة — 100C |
| 2 | `front` | `web/public/assets/store/cnhl-black-series-6s/mah2000/02-front.webp` | بطارية 6S — اختر السعة بمكان بطاريتك — 2000 ميلي أمبير/ساعة — 100C، من الأمام |
| 3 | `box` | `web/public/assets/store/cnhl-black-series-6s/mah2000/03-box.webp` | محتويات صندوق بطارية 6S — اختر السعة بمكان بطاريتك — 2000 ميلي أمبير/ساعة — 100C |


### بطارية 4S للمقاسات الصغيرة

- **المعرّف:** `cnhl-black-series-4s`
- **الاسم كما تكتبه الشركة:** CNHL Black Series 4S
- **الشركة:** CNHL
- **القسم:** البطاريات (`batteries`)
- **عدد الصور:** 3 لكل خيار

#### 1100 ميلي أمبير/ساعة — 100C بموصّل XT60

`cnhl-black-series-4s:mah1100`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/cnhl-black-series-4s/mah1100/01-main.webp` | بطارية 4S للمقاسات الصغيرة — 1100 ميلي أمبير/ساعة — 100C بموصّل XT60 |
| 2 | `front` | `web/public/assets/store/cnhl-black-series-4s/mah1100/02-front.webp` | بطارية 4S للمقاسات الصغيرة — 1100 ميلي أمبير/ساعة — 100C بموصّل XT60، من الأمام |
| 3 | `box` | `web/public/assets/store/cnhl-black-series-4s/mah1100/03-box.webp` | محتويات صندوق بطارية 4S للمقاسات الصغيرة — 1100 ميلي أمبير/ساعة — 100C بموصّل XT60 |

#### 1500 ميلي أمبير/ساعة — 130C بموصّل XT60

`cnhl-black-series-4s:mah1500`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/cnhl-black-series-4s/mah1500/01-main.webp` | بطارية 4S للمقاسات الصغيرة — 1500 ميلي أمبير/ساعة — 130C بموصّل XT60 |
| 2 | `front` | `web/public/assets/store/cnhl-black-series-4s/mah1500/02-front.webp` | بطارية 4S للمقاسات الصغيرة — 1500 ميلي أمبير/ساعة — 130C بموصّل XT60، من الأمام |
| 3 | `box` | `web/public/assets/store/cnhl-black-series-4s/mah1500/03-box.webp` | محتويات صندوق بطارية 4S للمقاسات الصغيرة — 1500 ميلي أمبير/ساعة — 130C بموصّل XT60 |


## الشواحن

### شاحن موازنة بطاقة 200 واط

- **المعرّف:** `isdt-q6-charger`
- **الاسم كما تكتبه الشركة:** ISDT Q6 Nano
- **الشركة:** ISDT
- **القسم:** الشواحن (`chargers`)
- **عدد الصور:** 3 لكل خيار

#### الخيار الوحيد

`isdt-q6-charger:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/isdt-q6-charger/standard/01-main.webp` | شاحن موازنة بطاقة 200 واط — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/isdt-q6-charger/standard/02-front.webp` | شاحن موازنة بطاقة 200 واط — الخيار الوحيد، من الأمام |
| 3 | `box` | `web/public/assets/store/isdt-q6-charger/standard/03-box.webp` | محتويات صندوق شاحن موازنة بطاقة 200 واط — الخيار الوحيد |


## المستقبلات

### مستقبِل ExpressLRS يُضبط من المتصفّح

- **المعرّف:** `radiomaster-rp1`
- **الاسم كما تكتبه الشركة:** RadioMaster RP1 V2
- **الشركة:** RadioMaster
- **القسم:** المستقبلات (`receivers`)
- **عدد الصور:** 2 لكل خيار

#### الخيار الوحيد

`radiomaster-rp1:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/radiomaster-rp1/standard/01-main.webp` | مستقبِل ExpressLRS يُضبط من المتصفّح — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/radiomaster-rp1/standard/02-front.webp` | مستقبِل ExpressLRS يُضبط من المتصفّح — الخيار الوحيد، من الأمام |


## الهوائيات

### هوائي نظّارة عالي الكسب — لا هوائي طائرة

- **المعرّف:** `truerc-x-air`
- **الاسم كما تكتبه الشركة:** TrueRC X-AIR 5.8 MK II
- **الشركة:** TrueRC
- **القسم:** الهوائيات (`antennas`)
- **عدد الصور:** 2 لكل خيار

#### الخيار الوحيد

`truerc-x-air:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/truerc-x-air/standard/01-main.webp` | هوائي نظّارة عالي الكسب — لا هوائي طائرة — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/truerc-x-air/standard/02-front.webp` | هوائي نظّارة عالي الكسب — لا هوائي طائرة — الخيار الوحيد، من الأمام |


## المحركات

### محرّك خمس إنشات اقتصادي بثلاث سرعات

- **المعرّف:** `emax-eco-ii-2306`
- **الاسم كما تكتبه الشركة:** EMAX ECO II 2306
- **الشركة:** EMAX
- **القسم:** المحركات (`motors`)
- **عدد الصور:** 2 لكل خيار

#### 1700KV — لبطارية 6S

`emax-eco-ii-2306:kv1700`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/emax-eco-ii-2306/kv1700/01-main.webp` | محرّك خمس إنشات اقتصادي بثلاث سرعات — 1700KV — لبطارية 6S |
| 2 | `front` | `web/public/assets/store/emax-eco-ii-2306/kv1700/02-front.webp` | محرّك خمس إنشات اقتصادي بثلاث سرعات — 1700KV — لبطارية 6S، من الأمام |

#### 1900KV — لبطارية 6S

`emax-eco-ii-2306:kv1900`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/emax-eco-ii-2306/kv1900/01-main.webp` | محرّك خمس إنشات اقتصادي بثلاث سرعات — 1900KV — لبطارية 6S |
| 2 | `front` | `web/public/assets/store/emax-eco-ii-2306/kv1900/02-front.webp` | محرّك خمس إنشات اقتصادي بثلاث سرعات — 1900KV — لبطارية 6S، من الأمام |

#### 2400KV — لبطارية 4S

`emax-eco-ii-2306:kv2400`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/emax-eco-ii-2306/kv2400/01-main.webp` | محرّك خمس إنشات اقتصادي بثلاث سرعات — 2400KV — لبطارية 4S |
| 2 | `front` | `web/public/assets/store/emax-eco-ii-2306/kv2400/02-front.webp` | محرّك خمس إنشات اقتصادي بثلاث سرعات — 2400KV — لبطارية 4S، من الأمام |


### محرّك 2207.5 بأربع سرعات دوران

- **المعرّف:** `tmotor-f60-pro-v`
- **الاسم كما تكتبه الشركة:** T-Motor F60 PRO V
- **الشركة:** T-Motor
- **القسم:** المحركات (`motors`)
- **عدد الصور:** 2 لكل خيار

#### الخيار الوحيد

`tmotor-f60-pro-v:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/tmotor-f60-pro-v/standard/01-main.webp` | محرّك 2207.5 بأربع سرعات دوران — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/tmotor-f60-pro-v/standard/02-front.webp` | محرّك 2207.5 بأربع سرعات دوران — الخيار الوحيد، من الأمام |


## متحكّمات الطيران

### طقم متحكّم وESC للخمس إنشات

- **المعرّف:** `speedybee-f405-v4-stack`
- **الاسم كما تكتبه الشركة:** SpeedyBee F405 V4 Stack
- **الشركة:** SpeedyBee
- **القسم:** متحكّمات الطيران (`flight-controllers`)
- **عدد الصور:** 2 لكل خيار

#### الخيار الوحيد

`speedybee-f405-v4-stack:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/speedybee-f405-v4-stack/standard/01-main.webp` | طقم متحكّم وESC للخمس إنشات — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/speedybee-f405-v4-stack/standard/02-front.webp` | طقم متحكّم وESC للخمس إنشات — الخيار الوحيد، من الأمام |


## وحدات ESC

### وحدة ESC أربعة في واحد بمقاس 30.5 مم

- **المعرّف:** `speedybee-bls-50a`
- **الاسم كما تكتبه الشركة:** SpeedyBee F405 BLS 50A 4-in-1
- **الشركة:** SpeedyBee
- **القسم:** وحدات ESC (`escs`)
- **عدد الصور:** 2 لكل خيار

#### الخيار الوحيد

`speedybee-bls-50a:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/speedybee-bls-50a/standard/01-main.webp` | وحدة ESC أربعة في واحد بمقاس 30.5 مم — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/speedybee-bls-50a/standard/02-front.webp` | وحدة ESC أربعة في واحد بمقاس 30.5 مم — الخيار الوحيد، من الأمام |


## الهياكل

### هيكل خمس إنشات بضمان يغطّي الكربون والمعدن

- **المعرّف:** `armattan-marmotte`
- **الاسم كما تكتبه الشركة:** Armattan Marmotte 5"
- **الشركة:** Armattan
- **القسم:** الهياكل (`frames`)
- **عدد الصور:** 2 لكل خيار

#### الخيار الوحيد

`armattan-marmotte:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/armattan-marmotte/standard/01-main.webp` | هيكل خمس إنشات بضمان يغطّي الكربون والمعدن — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/armattan-marmotte/standard/02-front.webp` | هيكل خمس إنشات بضمان يغطّي الكربون والمعدن — الخيار الوحيد، من الأمام |


## الكاميرات

### كاميرا تناظرية قوية في الضوء المنخفض

- **المعرّف:** `caddx-ratel-2`
- **الاسم كما تكتبه الشركة:** Caddx Ratel 2
- **الشركة:** Caddx
- **القسم:** الكاميرات (`cameras`)
- **عدد الصور:** 2 لكل خيار

#### الخيار الوحيد

`caddx-ratel-2:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/caddx-ratel-2/standard/01-main.webp` | كاميرا تناظرية قوية في الضوء المنخفض — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/caddx-ratel-2/standard/02-front.webp` | كاميرا تناظرية قوية في الضوء المنخفض — الخيار الوحيد، من الأمام |


## وحدات البث

### مرسل تماثلي بخمسة مستويات طاقة حتى 800 ميلي واط

- **المعرّف:** `rush-tank-ultimate`
- **الاسم كما تكتبه الشركة:** RushFPV TANK II ULTIMATE
- **الشركة:** RushFPV
- **القسم:** وحدات البث (`vtx`)
- **عدد الصور:** 2 لكل خيار

#### الخيار الوحيد

`rush-tank-ultimate:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/rush-tank-ultimate/standard/01-main.webp` | مرسل تماثلي بخمسة مستويات طاقة حتى 800 ميلي واط — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/rush-tank-ultimate/standard/02-front.webp` | مرسل تماثلي بخمسة مستويات طاقة حتى 800 ميلي واط — الخيار الوحيد، من الأمام |


## وحدات الطائرة الرقمية

### وحدة طائرة رقمية من DJI

- **المعرّف:** `dji-o3-air-unit`
- **الاسم كما تكتبه الشركة:** DJI O3 Air Unit
- **الشركة:** DJI
- **القسم:** وحدات الطائرة الرقمية (`air-units`)
- **عدد الصور:** 3 لكل خيار

#### الخيار الوحيد

`dji-o3-air-unit:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/dji-o3-air-unit/standard/01-main.webp` | وحدة طائرة رقمية من DJI — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/dji-o3-air-unit/standard/02-front.webp` | وحدة طائرة رقمية من DJI — الخيار الوحيد، من الأمام |
| 3 | `box` | `web/public/assets/store/dji-o3-air-unit/standard/03-box.webp` | محتويات صندوق وحدة طائرة رقمية من DJI — الخيار الوحيد |


## وحدات GPS

### وحدة GPS صغيرة للمدى الطويل

- **المعرّف:** `matek-m10-gps`
- **الاسم كما تكتبه الشركة:** Matek M10 GPS
- **الشركة:** Matek
- **القسم:** وحدات GPS (`gps`)
- **عدد الصور:** 2 لكل خيار

#### الخيار الوحيد

`matek-m10-gps:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/matek-m10-gps/standard/01-main.webp` | وحدة GPS صغيرة للمدى الطويل — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/matek-m10-gps/standard/02-front.webp` | وحدة GPS صغيرة للمدى الطويل — الخيار الوحيد، من الأمام |


## الإكسسوارات

### حقيبة شحن وتخزين مقاوِمة للحريق

- **المعرّف:** `lipo-safe-bag`
- **الاسم كما تكتبه الشركة:** LiPo Safe Bag
- **الشركة:** عام
- **القسم:** الإكسسوارات (`accessories`)
- **عدد الصور:** 2 لكل خيار

#### الخيار الوحيد

`lipo-safe-bag:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/lipo-safe-bag/standard/01-main.webp` | حقيبة شحن وتخزين مقاوِمة للحريق — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/lipo-safe-bag/standard/02-front.webp` | حقيبة شحن وتخزين مقاوِمة للحريق — الخيار الوحيد، من الأمام |


## مقاس 2 إنش

### طقم كامل بمقاس إنشين للانتقال بعد الووب

- **المعرّف:** `betafpv-cetus-x`
- **الاسم كما تكتبه الشركة:** BetaFPV Cetus X
- **الشركة:** BetaFPV
- **القسم:** مقاس 2 إنش (`size-2`)
- **عدد الصور:** 5 لكل خيار

#### طقم ExpressLRS — تماثلي

`betafpv-cetus-x:elrs`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/betafpv-cetus-x/elrs/01-main.webp` | طقم كامل بمقاس إنشين للانتقال بعد الووب — طقم ExpressLRS — تماثلي |
| 2 | `front` | `web/public/assets/store/betafpv-cetus-x/elrs/02-front.webp` | طقم كامل بمقاس إنشين للانتقال بعد الووب — طقم ExpressLRS — تماثلي، من الأمام |
| 3 | `side` | `web/public/assets/store/betafpv-cetus-x/elrs/03-side.webp` | طقم كامل بمقاس إنشين للانتقال بعد الووب — طقم ExpressLRS — تماثلي، من الجانب |
| 4 | `box` | `web/public/assets/store/betafpv-cetus-x/elrs/04-box.webp` | محتويات صندوق طقم كامل بمقاس إنشين للانتقال بعد الووب — طقم ExpressLRS — تماثلي |
| 5 | `accessories` | `web/public/assets/store/betafpv-cetus-x/elrs/05-accessories.webp` | ملحقات طقم كامل بمقاس إنشين للانتقال بعد الووب — طقم ExpressLRS — تماثلي |

#### طقم FrSky D8 — تماثلي

`betafpv-cetus-x:frsky`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/betafpv-cetus-x/frsky/01-main.webp` | طقم كامل بمقاس إنشين للانتقال بعد الووب — طقم FrSky D8 — تماثلي |
| 2 | `front` | `web/public/assets/store/betafpv-cetus-x/frsky/02-front.webp` | طقم كامل بمقاس إنشين للانتقال بعد الووب — طقم FrSky D8 — تماثلي، من الأمام |
| 3 | `side` | `web/public/assets/store/betafpv-cetus-x/frsky/03-side.webp` | طقم كامل بمقاس إنشين للانتقال بعد الووب — طقم FrSky D8 — تماثلي، من الجانب |
| 4 | `box` | `web/public/assets/store/betafpv-cetus-x/frsky/04-box.webp` | محتويات صندوق طقم كامل بمقاس إنشين للانتقال بعد الووب — طقم FrSky D8 — تماثلي |
| 5 | `accessories` | `web/public/assets/store/betafpv-cetus-x/frsky/05-accessories.webp` | ملحقات طقم كامل بمقاس إنشين للانتقال بعد الووب — طقم FrSky D8 — تماثلي |

#### طقم HD — فيديو رقمي

`betafpv-cetus-x:hd`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/betafpv-cetus-x/hd/01-main.webp` | طقم كامل بمقاس إنشين للانتقال بعد الووب — طقم HD — فيديو رقمي |
| 2 | `front` | `web/public/assets/store/betafpv-cetus-x/hd/02-front.webp` | طقم كامل بمقاس إنشين للانتقال بعد الووب — طقم HD — فيديو رقمي، من الأمام |
| 3 | `side` | `web/public/assets/store/betafpv-cetus-x/hd/03-side.webp` | طقم كامل بمقاس إنشين للانتقال بعد الووب — طقم HD — فيديو رقمي، من الجانب |
| 4 | `box` | `web/public/assets/store/betafpv-cetus-x/hd/04-box.webp` | محتويات صندوق طقم كامل بمقاس إنشين للانتقال بعد الووب — طقم HD — فيديو رقمي |
| 5 | `accessories` | `web/public/assets/store/betafpv-cetus-x/hd/05-accessories.webp` | ملحقات طقم كامل بمقاس إنشين للانتقال بعد الووب — طقم HD — فيديو رقمي |


### ووب 85 مم يقبل بطارية 1S أو 2S

- **المعرّف:** `happymodel-mobula8`
- **الاسم كما تكتبه الشركة:** HappyModel Mobula8
- **الشركة:** HappyModel
- **القسم:** مقاس 2 إنش (`size-2`)
- **عدد الصور:** 5 لكل خيار

#### مستقبِل ExpressLRS عبر UART

`happymodel-mobula8:elrs-uart`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/happymodel-mobula8/elrs-uart/01-main.webp` | ووب 85 مم يقبل بطارية 1S أو 2S — مستقبِل ExpressLRS عبر UART |
| 2 | `front` | `web/public/assets/store/happymodel-mobula8/elrs-uart/02-front.webp` | ووب 85 مم يقبل بطارية 1S أو 2S — مستقبِل ExpressLRS عبر UART، من الأمام |
| 3 | `side` | `web/public/assets/store/happymodel-mobula8/elrs-uart/03-side.webp` | ووب 85 مم يقبل بطارية 1S أو 2S — مستقبِل ExpressLRS عبر UART، من الجانب |
| 4 | `box` | `web/public/assets/store/happymodel-mobula8/elrs-uart/04-box.webp` | محتويات صندوق ووب 85 مم يقبل بطارية 1S أو 2S — مستقبِل ExpressLRS عبر UART |
| 5 | `accessories` | `web/public/assets/store/happymodel-mobula8/elrs-uart/05-accessories.webp` | ملحقات ووب 85 مم يقبل بطارية 1S أو 2S — مستقبِل ExpressLRS عبر UART |

#### مستقبِل ExpressLRS مدمج من نوع SPI

`happymodel-mobula8:elrs-spi`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/happymodel-mobula8/elrs-spi/01-main.webp` | ووب 85 مم يقبل بطارية 1S أو 2S — مستقبِل ExpressLRS مدمج من نوع SPI |
| 2 | `front` | `web/public/assets/store/happymodel-mobula8/elrs-spi/02-front.webp` | ووب 85 مم يقبل بطارية 1S أو 2S — مستقبِل ExpressLRS مدمج من نوع SPI، من الأمام |
| 3 | `side` | `web/public/assets/store/happymodel-mobula8/elrs-spi/03-side.webp` | ووب 85 مم يقبل بطارية 1S أو 2S — مستقبِل ExpressLRS مدمج من نوع SPI، من الجانب |
| 4 | `box` | `web/public/assets/store/happymodel-mobula8/elrs-spi/04-box.webp` | محتويات صندوق ووب 85 مم يقبل بطارية 1S أو 2S — مستقبِل ExpressLRS مدمج من نوع SPI |
| 5 | `accessories` | `web/public/assets/store/happymodel-mobula8/elrs-spi/05-accessories.webp` | ملحقات ووب 85 مم يقبل بطارية 1S أو 2S — مستقبِل ExpressLRS مدمج من نوع SPI |

#### مستقبِل FlySky مدمج من نوع SPI

`happymodel-mobula8:flysky-spi`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/happymodel-mobula8/flysky-spi/01-main.webp` | ووب 85 مم يقبل بطارية 1S أو 2S — مستقبِل FlySky مدمج من نوع SPI |
| 2 | `front` | `web/public/assets/store/happymodel-mobula8/flysky-spi/02-front.webp` | ووب 85 مم يقبل بطارية 1S أو 2S — مستقبِل FlySky مدمج من نوع SPI، من الأمام |
| 3 | `side` | `web/public/assets/store/happymodel-mobula8/flysky-spi/03-side.webp` | ووب 85 مم يقبل بطارية 1S أو 2S — مستقبِل FlySky مدمج من نوع SPI، من الجانب |
| 4 | `box` | `web/public/assets/store/happymodel-mobula8/flysky-spi/04-box.webp` | محتويات صندوق ووب 85 مم يقبل بطارية 1S أو 2S — مستقبِل FlySky مدمج من نوع SPI |
| 5 | `accessories` | `web/public/assets/store/happymodel-mobula8/flysky-spi/05-accessories.webp` | ملحقات ووب 85 مم يقبل بطارية 1S أو 2S — مستقبِل FlySky مدمج من نوع SPI |

#### نسخة رقمية — تُطلب بوحدة الفيديو التي تناسب نظّارتك

`happymodel-mobula8:hd`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/happymodel-mobula8/hd/01-main.webp` | ووب 85 مم يقبل بطارية 1S أو 2S — نسخة رقمية — تُطلب بوحدة الفيديو التي تناسب نظّارتك |
| 2 | `front` | `web/public/assets/store/happymodel-mobula8/hd/02-front.webp` | ووب 85 مم يقبل بطارية 1S أو 2S — نسخة رقمية — تُطلب بوحدة الفيديو التي تناسب نظّارتك، من الأمام |
| 3 | `side` | `web/public/assets/store/happymodel-mobula8/hd/03-side.webp` | ووب 85 مم يقبل بطارية 1S أو 2S — نسخة رقمية — تُطلب بوحدة الفيديو التي تناسب نظّارتك، من الجانب |
| 4 | `box` | `web/public/assets/store/happymodel-mobula8/hd/04-box.webp` | محتويات صندوق ووب 85 مم يقبل بطارية 1S أو 2S — نسخة رقمية — تُطلب بوحدة الفيديو التي تناسب نظّارتك |
| 5 | `accessories` | `web/public/assets/store/happymodel-mobula8/hd/05-accessories.webp` | ملحقات ووب 85 مم يقبل بطارية 1S أو 2S — نسخة رقمية — تُطلب بوحدة الفيديو التي تناسب نظّارتك |


## مقاس 2.5 إنش

### سينيووب 2.5 إنش يُباع بلا نظام فيديو

- **المعرّف:** `betafpv-pavo25`
- **الاسم كما تكتبه الشركة:** BetaFPV Pavo25 V2
- **الشركة:** BetaFPV
- **القسم:** مقاس 2.5 إنش (`size-2-5`)
- **عدد الصور:** 5 لكل خيار

#### الخيار الوحيد

`betafpv-pavo25:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/betafpv-pavo25/standard/01-main.webp` | سينيووب 2.5 إنش يُباع بلا نظام فيديو — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/betafpv-pavo25/standard/02-front.webp` | سينيووب 2.5 إنش يُباع بلا نظام فيديو — الخيار الوحيد، من الأمام |
| 3 | `side` | `web/public/assets/store/betafpv-pavo25/standard/03-side.webp` | سينيووب 2.5 إنش يُباع بلا نظام فيديو — الخيار الوحيد، من الجانب |
| 4 | `box` | `web/public/assets/store/betafpv-pavo25/standard/04-box.webp` | محتويات صندوق سينيووب 2.5 إنش يُباع بلا نظام فيديو — الخيار الوحيد |
| 5 | `accessories` | `web/public/assets/store/betafpv-pavo25/standard/05-accessories.webp` | ملحقات سينيووب 2.5 إنش يُباع بلا نظام فيديو — الخيار الوحيد |


### سينيووب 2.5 إنش بوحدة DJI O4 Air Unit Pro

- **المعرّف:** `geprc-cinebot25`
- **الاسم كما تكتبه الشركة:** GEPRC Cinebot25 V2
- **الشركة:** GEPRC
- **القسم:** مقاس 2.5 إنش (`size-2-5`)
- **عدد الصور:** 5 لكل خيار

#### نسخة DJI O4 Air Unit Pro

`geprc-cinebot25:o4-pro`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/geprc-cinebot25/o4-pro/01-main.webp` | سينيووب 2.5 إنش بوحدة DJI O4 Air Unit Pro — نسخة DJI O4 Air Unit Pro |
| 2 | `front` | `web/public/assets/store/geprc-cinebot25/o4-pro/02-front.webp` | سينيووب 2.5 إنش بوحدة DJI O4 Air Unit Pro — نسخة DJI O4 Air Unit Pro، من الأمام |
| 3 | `side` | `web/public/assets/store/geprc-cinebot25/o4-pro/03-side.webp` | سينيووب 2.5 إنش بوحدة DJI O4 Air Unit Pro — نسخة DJI O4 Air Unit Pro، من الجانب |
| 4 | `box` | `web/public/assets/store/geprc-cinebot25/o4-pro/04-box.webp` | محتويات صندوق سينيووب 2.5 إنش بوحدة DJI O4 Air Unit Pro — نسخة DJI O4 Air Unit Pro |
| 5 | `accessories` | `web/public/assets/store/geprc-cinebot25/o4-pro/05-accessories.webp` | ملحقات سينيووب 2.5 إنش بوحدة DJI O4 Air Unit Pro — نسخة DJI O4 Air Unit Pro |

#### نسخة WTFPV

`geprc-cinebot25:wtfpv`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/geprc-cinebot25/wtfpv/01-main.webp` | سينيووب 2.5 إنش بوحدة DJI O4 Air Unit Pro — نسخة WTFPV |
| 2 | `front` | `web/public/assets/store/geprc-cinebot25/wtfpv/02-front.webp` | سينيووب 2.5 إنش بوحدة DJI O4 Air Unit Pro — نسخة WTFPV، من الأمام |
| 3 | `side` | `web/public/assets/store/geprc-cinebot25/wtfpv/03-side.webp` | سينيووب 2.5 إنش بوحدة DJI O4 Air Unit Pro — نسخة WTFPV، من الجانب |
| 4 | `box` | `web/public/assets/store/geprc-cinebot25/wtfpv/04-box.webp` | محتويات صندوق سينيووب 2.5 إنش بوحدة DJI O4 Air Unit Pro — نسخة WTFPV |
| 5 | `accessories` | `web/public/assets/store/geprc-cinebot25/wtfpv/05-accessories.webp` | ملحقات سينيووب 2.5 إنش بوحدة DJI O4 Air Unit Pro — نسخة WTFPV |


## مقاس 3 إنش

### سينيووب 3 إنش بزمن طيران معلَن يتجاوز ثماني دقائق

- **المعرّف:** `geprc-cinelog30`
- **الاسم كما تكتبه الشركة:** GEPRC Cinelog30 V3
- **الشركة:** GEPRC
- **القسم:** مقاس 3 إنش (`size-3`)
- **عدد الصور:** 5 لكل خيار

#### نسخة DJI O4 Air Unit Pro

`geprc-cinelog30:o4-pro`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/geprc-cinelog30/o4-pro/01-main.webp` | سينيووب 3 إنش بزمن طيران معلَن يتجاوز ثماني دقائق — نسخة DJI O4 Air Unit Pro |
| 2 | `front` | `web/public/assets/store/geprc-cinelog30/o4-pro/02-front.webp` | سينيووب 3 إنش بزمن طيران معلَن يتجاوز ثماني دقائق — نسخة DJI O4 Air Unit Pro، من الأمام |
| 3 | `side` | `web/public/assets/store/geprc-cinelog30/o4-pro/03-side.webp` | سينيووب 3 إنش بزمن طيران معلَن يتجاوز ثماني دقائق — نسخة DJI O4 Air Unit Pro، من الجانب |
| 4 | `box` | `web/public/assets/store/geprc-cinelog30/o4-pro/04-box.webp` | محتويات صندوق سينيووب 3 إنش بزمن طيران معلَن يتجاوز ثماني دقائق — نسخة DJI O4 Air Unit Pro |
| 5 | `accessories` | `web/public/assets/store/geprc-cinelog30/o4-pro/05-accessories.webp` | ملحقات سينيووب 3 إنش بزمن طيران معلَن يتجاوز ثماني دقائق — نسخة DJI O4 Air Unit Pro |

#### نسخة WTFPV

`geprc-cinelog30:wtfpv`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/geprc-cinelog30/wtfpv/01-main.webp` | سينيووب 3 إنش بزمن طيران معلَن يتجاوز ثماني دقائق — نسخة WTFPV |
| 2 | `front` | `web/public/assets/store/geprc-cinelog30/wtfpv/02-front.webp` | سينيووب 3 إنش بزمن طيران معلَن يتجاوز ثماني دقائق — نسخة WTFPV، من الأمام |
| 3 | `side` | `web/public/assets/store/geprc-cinelog30/wtfpv/03-side.webp` | سينيووب 3 إنش بزمن طيران معلَن يتجاوز ثماني دقائق — نسخة WTFPV، من الجانب |
| 4 | `box` | `web/public/assets/store/geprc-cinelog30/wtfpv/04-box.webp` | محتويات صندوق سينيووب 3 إنش بزمن طيران معلَن يتجاوز ثماني دقائق — نسخة WTFPV |
| 5 | `accessories` | `web/public/assets/store/geprc-cinelog30/wtfpv/05-accessories.webp` | ملحقات سينيووب 3 إنش بزمن طيران معلَن يتجاوز ثماني دقائق — نسخة WTFPV |


### طائرة تصوير 3 إنش بمراوح مكشوفة

- **المعرّف:** `geprc-cinebot30`
- **الاسم كما تكتبه الشركة:** GEPRC Cinebot30
- **الشركة:** GEPRC
- **القسم:** مقاس 3 إنش (`size-3`)
- **عدد الصور:** 5 لكل خيار

#### نسخة تماثلية

`geprc-cinebot30:analog`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/geprc-cinebot30/analog/01-main.webp` | طائرة تصوير 3 إنش بمراوح مكشوفة — نسخة تماثلية |
| 2 | `front` | `web/public/assets/store/geprc-cinebot30/analog/02-front.webp` | طائرة تصوير 3 إنش بمراوح مكشوفة — نسخة تماثلية، من الأمام |
| 3 | `side` | `web/public/assets/store/geprc-cinebot30/analog/03-side.webp` | طائرة تصوير 3 إنش بمراوح مكشوفة — نسخة تماثلية، من الجانب |
| 4 | `box` | `web/public/assets/store/geprc-cinebot30/analog/04-box.webp` | محتويات صندوق طائرة تصوير 3 إنش بمراوح مكشوفة — نسخة تماثلية |
| 5 | `accessories` | `web/public/assets/store/geprc-cinebot30/analog/05-accessories.webp` | ملحقات طائرة تصوير 3 إنش بمراوح مكشوفة — نسخة تماثلية |

#### نسخة DJI O3

`geprc-cinebot30:hd-o3`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/geprc-cinebot30/hd-o3/01-main.webp` | طائرة تصوير 3 إنش بمراوح مكشوفة — نسخة DJI O3 |
| 2 | `front` | `web/public/assets/store/geprc-cinebot30/hd-o3/02-front.webp` | طائرة تصوير 3 إنش بمراوح مكشوفة — نسخة DJI O3، من الأمام |
| 3 | `side` | `web/public/assets/store/geprc-cinebot30/hd-o3/03-side.webp` | طائرة تصوير 3 إنش بمراوح مكشوفة — نسخة DJI O3، من الجانب |
| 4 | `box` | `web/public/assets/store/geprc-cinebot30/hd-o3/04-box.webp` | محتويات صندوق طائرة تصوير 3 إنش بمراوح مكشوفة — نسخة DJI O3 |
| 5 | `accessories` | `web/public/assets/store/geprc-cinebot30/hd-o3/05-accessories.webp` | ملحقات طائرة تصوير 3 إنش بمراوح مكشوفة — نسخة DJI O3 |

#### نسخة RunCam Link Wasp

`geprc-cinebot30:hd-wasp`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/geprc-cinebot30/hd-wasp/01-main.webp` | طائرة تصوير 3 إنش بمراوح مكشوفة — نسخة RunCam Link Wasp |
| 2 | `front` | `web/public/assets/store/geprc-cinebot30/hd-wasp/02-front.webp` | طائرة تصوير 3 إنش بمراوح مكشوفة — نسخة RunCam Link Wasp، من الأمام |
| 3 | `side` | `web/public/assets/store/geprc-cinebot30/hd-wasp/03-side.webp` | طائرة تصوير 3 إنش بمراوح مكشوفة — نسخة RunCam Link Wasp، من الجانب |
| 4 | `box` | `web/public/assets/store/geprc-cinebot30/hd-wasp/04-box.webp` | محتويات صندوق طائرة تصوير 3 إنش بمراوح مكشوفة — نسخة RunCam Link Wasp |
| 5 | `accessories` | `web/public/assets/store/geprc-cinebot30/hd-wasp/05-accessories.webp` | ملحقات طائرة تصوير 3 إنش بمراوح مكشوفة — نسخة RunCam Link Wasp |


### أوّل ووب دافع بمقاس ثلاث إنشات

- **المعرّف:** `betafpv-pavo30`
- **الاسم كما تكتبه الشركة:** BetaFPV Pavo30
- **الشركة:** BetaFPV
- **القسم:** مقاس 3 إنش (`size-3`)
- **عدد الصور:** 5 لكل خيار

#### نسخة تماثلية

`betafpv-pavo30:analog`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/betafpv-pavo30/analog/01-main.webp` | أوّل ووب دافع بمقاس ثلاث إنشات — نسخة تماثلية |
| 2 | `front` | `web/public/assets/store/betafpv-pavo30/analog/02-front.webp` | أوّل ووب دافع بمقاس ثلاث إنشات — نسخة تماثلية، من الأمام |
| 3 | `side` | `web/public/assets/store/betafpv-pavo30/analog/03-side.webp` | أوّل ووب دافع بمقاس ثلاث إنشات — نسخة تماثلية، من الجانب |
| 4 | `box` | `web/public/assets/store/betafpv-pavo30/analog/04-box.webp` | محتويات صندوق أوّل ووب دافع بمقاس ثلاث إنشات — نسخة تماثلية |
| 5 | `accessories` | `web/public/assets/store/betafpv-pavo30/analog/05-accessories.webp` | ملحقات أوّل ووب دافع بمقاس ثلاث إنشات — نسخة تماثلية |

#### نسخة رقمية

`betafpv-pavo30:hd`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/betafpv-pavo30/hd/01-main.webp` | أوّل ووب دافع بمقاس ثلاث إنشات — نسخة رقمية |
| 2 | `front` | `web/public/assets/store/betafpv-pavo30/hd/02-front.webp` | أوّل ووب دافع بمقاس ثلاث إنشات — نسخة رقمية، من الأمام |
| 3 | `side` | `web/public/assets/store/betafpv-pavo30/hd/03-side.webp` | أوّل ووب دافع بمقاس ثلاث إنشات — نسخة رقمية، من الجانب |
| 4 | `box` | `web/public/assets/store/betafpv-pavo30/hd/04-box.webp` | محتويات صندوق أوّل ووب دافع بمقاس ثلاث إنشات — نسخة رقمية |
| 5 | `accessories` | `web/public/assets/store/betafpv-pavo30/hd/05-accessories.webp` | ملحقات أوّل ووب دافع بمقاس ثلاث إنشات — نسخة رقمية |


## مقاس 3.5 – 4 إنش

### فريستايل 3.6 إنش بمحرّكات مقاس الخمسة

- **المعرّف:** `geprc-domain36`
- **الاسم كما تكتبه الشركة:** GEPRC DoMain3.6
- **الشركة:** GEPRC
- **القسم:** مقاس 3.5 – 4 إنش (`size-3-5`)
- **عدد الصور:** 5 لكل خيار

#### نسخة تماثلية بكاميرا RunCam Phoenix 2

`geprc-domain36:analog`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/geprc-domain36/analog/01-main.webp` | فريستايل 3.6 إنش بمحرّكات مقاس الخمسة — نسخة تماثلية بكاميرا RunCam Phoenix 2 |
| 2 | `front` | `web/public/assets/store/geprc-domain36/analog/02-front.webp` | فريستايل 3.6 إنش بمحرّكات مقاس الخمسة — نسخة تماثلية بكاميرا RunCam Phoenix 2، من الأمام |
| 3 | `side` | `web/public/assets/store/geprc-domain36/analog/03-side.webp` | فريستايل 3.6 إنش بمحرّكات مقاس الخمسة — نسخة تماثلية بكاميرا RunCam Phoenix 2، من الجانب |
| 4 | `box` | `web/public/assets/store/geprc-domain36/analog/04-box.webp` | محتويات صندوق فريستايل 3.6 إنش بمحرّكات مقاس الخمسة — نسخة تماثلية بكاميرا RunCam Phoenix 2 |
| 5 | `accessories` | `web/public/assets/store/geprc-domain36/analog/05-accessories.webp` | ملحقات فريستايل 3.6 إنش بمحرّكات مقاس الخمسة — نسخة تماثلية بكاميرا RunCam Phoenix 2 |

#### نسخة DJI O3

`geprc-domain36:hd-o3`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/geprc-domain36/hd-o3/01-main.webp` | فريستايل 3.6 إنش بمحرّكات مقاس الخمسة — نسخة DJI O3 |
| 2 | `front` | `web/public/assets/store/geprc-domain36/hd-o3/02-front.webp` | فريستايل 3.6 إنش بمحرّكات مقاس الخمسة — نسخة DJI O3، من الأمام |
| 3 | `side` | `web/public/assets/store/geprc-domain36/hd-o3/03-side.webp` | فريستايل 3.6 إنش بمحرّكات مقاس الخمسة — نسخة DJI O3، من الجانب |
| 4 | `box` | `web/public/assets/store/geprc-domain36/hd-o3/04-box.webp` | محتويات صندوق فريستايل 3.6 إنش بمحرّكات مقاس الخمسة — نسخة DJI O3 |
| 5 | `accessories` | `web/public/assets/store/geprc-domain36/hd-o3/05-accessories.webp` | ملحقات فريستايل 3.6 إنش بمحرّكات مقاس الخمسة — نسخة DJI O3 |

#### نسخة WTFPV

`geprc-domain36:wtfpv`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/geprc-domain36/wtfpv/01-main.webp` | فريستايل 3.6 إنش بمحرّكات مقاس الخمسة — نسخة WTFPV |
| 2 | `front` | `web/public/assets/store/geprc-domain36/wtfpv/02-front.webp` | فريستايل 3.6 إنش بمحرّكات مقاس الخمسة — نسخة WTFPV، من الأمام |
| 3 | `side` | `web/public/assets/store/geprc-domain36/wtfpv/03-side.webp` | فريستايل 3.6 إنش بمحرّكات مقاس الخمسة — نسخة WTFPV، من الجانب |
| 4 | `box` | `web/public/assets/store/geprc-domain36/wtfpv/04-box.webp` | محتويات صندوق فريستايل 3.6 إنش بمحرّكات مقاس الخمسة — نسخة WTFPV |
| 5 | `accessories` | `web/public/assets/store/geprc-domain36/wtfpv/05-accessories.webp` | ملحقات فريستايل 3.6 إنش بمحرّكات مقاس الخمسة — نسخة WTFPV |


### أربع إنشات بهيكلَين مختلفَين — X أو DeadCat

- **المعرّف:** `iflight-nazgul-evoque-f4`
- **الاسم كما تكتبه الشركة:** iFlight Nazgul Evoque F4
- **الشركة:** iFlight
- **القسم:** مقاس 3.5 – 4 إنش (`size-3-5`)
- **عدد الصور:** 5 لكل خيار

#### هيكل F4X — X مضغوط، وحدة DJI O3

`iflight-nazgul-evoque-f4:f4x-o3`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/iflight-nazgul-evoque-f4/f4x-o3/01-main.webp` | أربع إنشات بهيكلَين مختلفَين — X أو DeadCat — هيكل F4X — X مضغوط، وحدة DJI O3 |
| 2 | `front` | `web/public/assets/store/iflight-nazgul-evoque-f4/f4x-o3/02-front.webp` | أربع إنشات بهيكلَين مختلفَين — X أو DeadCat — هيكل F4X — X مضغوط، وحدة DJI O3، من الأمام |
| 3 | `side` | `web/public/assets/store/iflight-nazgul-evoque-f4/f4x-o3/03-side.webp` | أربع إنشات بهيكلَين مختلفَين — X أو DeadCat — هيكل F4X — X مضغوط، وحدة DJI O3، من الجانب |
| 4 | `box` | `web/public/assets/store/iflight-nazgul-evoque-f4/f4x-o3/04-box.webp` | محتويات صندوق أربع إنشات بهيكلَين مختلفَين — X أو DeadCat — هيكل F4X — X مضغوط، وحدة DJI O3 |
| 5 | `accessories` | `web/public/assets/store/iflight-nazgul-evoque-f4/f4x-o3/05-accessories.webp` | ملحقات أربع إنشات بهيكلَين مختلفَين — X أو DeadCat — هيكل F4X — X مضغوط، وحدة DJI O3 |

#### هيكل F4D — DeadCat، وحدة DJI O3

`iflight-nazgul-evoque-f4:f4d-o3`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/iflight-nazgul-evoque-f4/f4d-o3/01-main.webp` | أربع إنشات بهيكلَين مختلفَين — X أو DeadCat — هيكل F4D — DeadCat، وحدة DJI O3 |
| 2 | `front` | `web/public/assets/store/iflight-nazgul-evoque-f4/f4d-o3/02-front.webp` | أربع إنشات بهيكلَين مختلفَين — X أو DeadCat — هيكل F4D — DeadCat، وحدة DJI O3، من الأمام |
| 3 | `side` | `web/public/assets/store/iflight-nazgul-evoque-f4/f4d-o3/03-side.webp` | أربع إنشات بهيكلَين مختلفَين — X أو DeadCat — هيكل F4D — DeadCat، وحدة DJI O3، من الجانب |
| 4 | `box` | `web/public/assets/store/iflight-nazgul-evoque-f4/f4d-o3/04-box.webp` | محتويات صندوق أربع إنشات بهيكلَين مختلفَين — X أو DeadCat — هيكل F4D — DeadCat، وحدة DJI O3 |
| 5 | `accessories` | `web/public/assets/store/iflight-nazgul-evoque-f4/f4d-o3/05-accessories.webp` | ملحقات أربع إنشات بهيكلَين مختلفَين — X أو DeadCat — هيكل F4D — DeadCat، وحدة DJI O3 |


## مقاس 7 إنش

### سبع إنشات بمسافة 315 مم بين المحرّكات

- **المعرّف:** `geprc-crocodile7`
- **الاسم كما تكتبه الشركة:** GEPRC Crocodile 7 PRO
- **الشركة:** GEPRC
- **القسم:** مقاس 7 إنش (`size-7`)
- **عدد الصور:** 5 لكل خيار

#### الخيار الوحيد

`geprc-crocodile7:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/geprc-crocodile7/standard/01-main.webp` | سبع إنشات بمسافة 315 مم بين المحرّكات — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/geprc-crocodile7/standard/02-front.webp` | سبع إنشات بمسافة 315 مم بين المحرّكات — الخيار الوحيد، من الأمام |
| 3 | `side` | `web/public/assets/store/geprc-crocodile7/standard/03-side.webp` | سبع إنشات بمسافة 315 مم بين المحرّكات — الخيار الوحيد، من الجانب |
| 4 | `box` | `web/public/assets/store/geprc-crocodile7/standard/04-box.webp` | محتويات صندوق سبع إنشات بمسافة 315 مم بين المحرّكات — الخيار الوحيد |
| 5 | `accessories` | `web/public/assets/store/geprc-crocodile7/standard/05-accessories.webp` | ملحقات سبع إنشات بمسافة 315 مم بين المحرّكات — الخيار الوحيد |


### سبع إنشات اقتصادية — بلا GPS افتراضياً

- **المعرّف:** `iflight-chimera7-eco`
- **الاسم كما تكتبه الشركة:** iFlight Chimera7 ECO 6S
- **الشركة:** iFlight
- **القسم:** مقاس 7 إنش (`size-7`)
- **عدد الصور:** 5 لكل خيار

#### الخيار الوحيد

`iflight-chimera7-eco:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/iflight-chimera7-eco/standard/01-main.webp` | سبع إنشات اقتصادية — بلا GPS افتراضياً — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/iflight-chimera7-eco/standard/02-front.webp` | سبع إنشات اقتصادية — بلا GPS افتراضياً — الخيار الوحيد، من الأمام |
| 3 | `side` | `web/public/assets/store/iflight-chimera7-eco/standard/03-side.webp` | سبع إنشات اقتصادية — بلا GPS افتراضياً — الخيار الوحيد، من الجانب |
| 4 | `box` | `web/public/assets/store/iflight-chimera7-eco/standard/04-box.webp` | محتويات صندوق سبع إنشات اقتصادية — بلا GPS افتراضياً — الخيار الوحيد |
| 5 | `accessories` | `web/public/assets/store/iflight-chimera7-eco/standard/05-accessories.webp` | ملحقات سبع إنشات اقتصادية — بلا GPS افتراضياً — الخيار الوحيد |


## جاهزة للطيران

### أرخص طقم كامل — بمحرّكات مكنَّسة

- **المعرّف:** `betafpv-cetus-lite`
- **الاسم كما تكتبه الشركة:** BetaFPV Cetus Lite FPV Kit
- **الشركة:** BetaFPV
- **القسم:** جاهزة للطيران (`rtf`)
- **عدد الصور:** 5 لكل خيار

#### الخيار الوحيد

`betafpv-cetus-lite:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/betafpv-cetus-lite/standard/01-main.webp` | أرخص طقم كامل — بمحرّكات مكنَّسة — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/betafpv-cetus-lite/standard/02-front.webp` | أرخص طقم كامل — بمحرّكات مكنَّسة — الخيار الوحيد، من الأمام |
| 3 | `side` | `web/public/assets/store/betafpv-cetus-lite/standard/03-side.webp` | أرخص طقم كامل — بمحرّكات مكنَّسة — الخيار الوحيد، من الجانب |
| 4 | `box` | `web/public/assets/store/betafpv-cetus-lite/standard/04-box.webp` | محتويات صندوق أرخص طقم كامل — بمحرّكات مكنَّسة — الخيار الوحيد |
| 5 | `accessories` | `web/public/assets/store/betafpv-cetus-lite/standard/05-accessories.webp` | ملحقات أرخص طقم كامل — بمحرّكات مكنَّسة — الخيار الوحيد |


### جهاز تحكّم ومحاكي — الطريق الأرخص للتعلّم

- **المعرّف:** `radiomaster-pocket-combo`
- **الاسم كما تكتبه الشركة:** RadioMaster Pocket + Simulator
- **الشركة:** RadioMaster
- **القسم:** جاهزة للطيران (`rtf`)
- **عدد الصور:** 5 لكل خيار

#### الخيار الوحيد

`radiomaster-pocket-combo:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/radiomaster-pocket-combo/standard/01-main.webp` | جهاز تحكّم ومحاكي — الطريق الأرخص للتعلّم — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/radiomaster-pocket-combo/standard/02-front.webp` | جهاز تحكّم ومحاكي — الطريق الأرخص للتعلّم — الخيار الوحيد، من الأمام |
| 3 | `side` | `web/public/assets/store/radiomaster-pocket-combo/standard/03-side.webp` | جهاز تحكّم ومحاكي — الطريق الأرخص للتعلّم — الخيار الوحيد، من الجانب |
| 4 | `box` | `web/public/assets/store/radiomaster-pocket-combo/standard/04-box.webp` | محتويات صندوق جهاز تحكّم ومحاكي — الطريق الأرخص للتعلّم — الخيار الوحيد |
| 5 | `accessories` | `web/public/assets/store/radiomaster-pocket-combo/standard/05-accessories.webp` | ملحقات جهاز تحكّم ومحاكي — الطريق الأرخص للتعلّم — الخيار الوحيد |


## المحركات

### محرّك خمس إنشات — اختر سرعة الدوران بجهد بطاريتك

- **المعرّف:** `iflight-xing2-2207`
- **الاسم كما تكتبه الشركة:** iFlight XING2 2207
- **الشركة:** iFlight
- **القسم:** المحركات (`motors`)
- **عدد الصور:** 2 لكل خيار

#### 1750KV — لبطارية 6S

`iflight-xing2-2207:kv1750`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/iflight-xing2-2207/kv1750/01-main.webp` | محرّك خمس إنشات — اختر سرعة الدوران بجهد بطاريتك — 1750KV — لبطارية 6S |
| 2 | `front` | `web/public/assets/store/iflight-xing2-2207/kv1750/02-front.webp` | محرّك خمس إنشات — اختر سرعة الدوران بجهد بطاريتك — 1750KV — لبطارية 6S، من الأمام |

#### 2050KV — لبطارية 6S

`iflight-xing2-2207:kv2050`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/iflight-xing2-2207/kv2050/01-main.webp` | محرّك خمس إنشات — اختر سرعة الدوران بجهد بطاريتك — 2050KV — لبطارية 6S |
| 2 | `front` | `web/public/assets/store/iflight-xing2-2207/kv2050/02-front.webp` | محرّك خمس إنشات — اختر سرعة الدوران بجهد بطاريتك — 2050KV — لبطارية 6S، من الأمام |

#### 2750KV — لبطارية 4S

`iflight-xing2-2207:kv2750`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/iflight-xing2-2207/kv2750/01-main.webp` | محرّك خمس إنشات — اختر سرعة الدوران بجهد بطاريتك — 2750KV — لبطارية 4S |
| 2 | `front` | `web/public/assets/store/iflight-xing2-2207/kv2750/02-front.webp` | محرّك خمس إنشات — اختر سرعة الدوران بجهد بطاريتك — 2750KV — لبطارية 4S، من الأمام |


## متحكّمات الطيران

### متحكّم طيران مفرد بلا مسرّعات

- **المعرّف:** `speedybee-f7-v3-fc`
- **الاسم كما تكتبه الشركة:** SpeedyBee F7 V3
- **الشركة:** SpeedyBee
- **القسم:** متحكّمات الطيران (`flight-controllers`)
- **عدد الصور:** 2 لكل خيار

#### الخيار الوحيد

`speedybee-f7-v3-fc:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/speedybee-f7-v3-fc/standard/01-main.webp` | متحكّم طيران مفرد بلا مسرّعات — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/speedybee-f7-v3-fc/standard/02-front.webp` | متحكّم طيران مفرد بلا مسرّعات — الخيار الوحيد، من الأمام |


### متحكّم H7 بستّة منافذ UART

- **المعرّف:** `holybro-kakute-h7`
- **الاسم كما تكتبه الشركة:** Holybro Kakute H7 V2
- **الشركة:** Holybro
- **القسم:** متحكّمات الطيران (`flight-controllers`)
- **عدد الصور:** 2 لكل خيار

#### الخيار الوحيد

`holybro-kakute-h7:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/holybro-kakute-h7/standard/01-main.webp` | متحكّم H7 بستّة منافذ UART — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/holybro-kakute-h7/standard/02-front.webp` | متحكّم H7 بستّة منافذ UART — الخيار الوحيد، من الأمام |


## وحدات ESC

### مسرّعات رباعية بورقة بيانات منشورة

- **المعرّف:** `hobbywing-xrotor-g2`
- **الاسم كما تكتبه الشركة:** Hobbywing XRotor FPV G2 4in1
- **الشركة:** Hobbywing
- **القسم:** وحدات ESC (`escs`)
- **عدد الصور:** 2 لكل خيار

#### 45 أمبير — بلا مخرج جهد

`hobbywing-xrotor-g2:a45`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/hobbywing-xrotor-g2/a45/01-main.webp` | مسرّعات رباعية بورقة بيانات منشورة — 45 أمبير — بلا مخرج جهد |
| 2 | `front` | `web/public/assets/store/hobbywing-xrotor-g2/a45/02-front.webp` | مسرّعات رباعية بورقة بيانات منشورة — 45 أمبير — بلا مخرج جهد، من الأمام |

#### 65 أمبير — بمخرج 5 فولت

`hobbywing-xrotor-g2:a65`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/hobbywing-xrotor-g2/a65/01-main.webp` | مسرّعات رباعية بورقة بيانات منشورة — 65 أمبير — بمخرج 5 فولت |
| 2 | `front` | `web/public/assets/store/hobbywing-xrotor-g2/a65/02-front.webp` | مسرّعات رباعية بورقة بيانات منشورة — 65 أمبير — بمخرج 5 فولت، من الأمام |


### مسرّعات 55 أمبير بمخرج 10 فولت

- **المعرّف:** `tmotor-f55a-pro-ii`
- **الاسم كما تكتبه الشركة:** T-Motor F55A Pro II
- **الشركة:** T-Motor
- **القسم:** وحدات ESC (`escs`)
- **عدد الصور:** 2 لكل خيار

#### الخيار الوحيد

`tmotor-f55a-pro-ii:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/tmotor-f55a-pro-ii/standard/01-main.webp` | مسرّعات 55 أمبير بمخرج 10 فولت — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/tmotor-f55a-pro-ii/standard/02-front.webp` | مسرّعات 55 أمبير بمخرج 10 فولت — الخيار الوحيد، من الأمام |


## الهياكل

### هيكل خمس إنشات مفتوح المصدر

- **المعرّف:** `tbs-source-one-v5-frame`
- **الاسم كما تكتبه الشركة:** TBS Source One V5.1 Frame
- **الشركة:** Team BlackSheep
- **القسم:** الهياكل (`frames`)
- **عدد الصور:** 2 لكل خيار

#### الخيار الوحيد

`tbs-source-one-v5-frame:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/tbs-source-one-v5-frame/standard/01-main.webp` | هيكل خمس إنشات مفتوح المصدر — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/tbs-source-one-v5-frame/standard/02-front.webp` | هيكل خمس إنشات مفتوح المصدر — الخيار الوحيد، من الأمام |


### هيكل فريستايل بأذرع أمامية وخلفية مختلفة

- **المعرّف:** `impulserc-apex`
- **الاسم كما تكتبه الشركة:** ImpulseRC ApexDC EVO 5"
- **الشركة:** ImpulseRC
- **القسم:** الهياكل (`frames`)
- **عدد الصور:** 2 لكل خيار

#### الخيار الوحيد

`impulserc-apex:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/impulserc-apex/standard/01-main.webp` | هيكل فريستايل بأذرع أمامية وخلفية مختلفة — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/impulserc-apex/standard/02-front.webp` | هيكل فريستايل بأذرع أمامية وخلفية مختلفة — الخيار الوحيد، من الأمام |


## البطاريات

### بطارية سباق 6S بمعدّل تفريغ 150C

- **المعرّف:** `tattu-r-line-v5-6s`
- **الاسم كما تكتبه الشركة:** Tattu R-Line Version 5.0 6S
- **الشركة:** Tattu
- **القسم:** البطاريات (`batteries`)
- **عدد الصور:** 3 لكل خيار

#### 1050 ميلي أمبير/ساعة — 186 غراماً

`tattu-r-line-v5-6s:mah1050`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/tattu-r-line-v5-6s/mah1050/01-main.webp` | بطارية سباق 6S بمعدّل تفريغ 150C — 1050 ميلي أمبير/ساعة — 186 غراماً |
| 2 | `front` | `web/public/assets/store/tattu-r-line-v5-6s/mah1050/02-front.webp` | بطارية سباق 6S بمعدّل تفريغ 150C — 1050 ميلي أمبير/ساعة — 186 غراماً، من الأمام |
| 3 | `box` | `web/public/assets/store/tattu-r-line-v5-6s/mah1050/03-box.webp` | محتويات صندوق بطارية سباق 6S بمعدّل تفريغ 150C — 1050 ميلي أمبير/ساعة — 186 غراماً |

#### 1400 ميلي أمبير/ساعة

`tattu-r-line-v5-6s:mah1400`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/tattu-r-line-v5-6s/mah1400/01-main.webp` | بطارية سباق 6S بمعدّل تفريغ 150C — 1400 ميلي أمبير/ساعة |
| 2 | `front` | `web/public/assets/store/tattu-r-line-v5-6s/mah1400/02-front.webp` | بطارية سباق 6S بمعدّل تفريغ 150C — 1400 ميلي أمبير/ساعة، من الأمام |
| 3 | `box` | `web/public/assets/store/tattu-r-line-v5-6s/mah1400/03-box.webp` | محتويات صندوق بطارية سباق 6S بمعدّل تفريغ 150C — 1400 ميلي أمبير/ساعة |

#### 2200 ميلي أمبير/ساعة — 346 غراماً

`tattu-r-line-v5-6s:mah2200`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/tattu-r-line-v5-6s/mah2200/01-main.webp` | بطارية سباق 6S بمعدّل تفريغ 150C — 2200 ميلي أمبير/ساعة — 346 غراماً |
| 2 | `front` | `web/public/assets/store/tattu-r-line-v5-6s/mah2200/02-front.webp` | بطارية سباق 6S بمعدّل تفريغ 150C — 2200 ميلي أمبير/ساعة — 346 غراماً، من الأمام |
| 3 | `box` | `web/public/assets/store/tattu-r-line-v5-6s/mah2200/03-box.webp` | محتويات صندوق بطارية سباق 6S بمعدّل تفريغ 150C — 2200 ميلي أمبير/ساعة — 346 غراماً |


## الشواحن

### شاحن يعمل من الكهرباء مباشرة

- **المعرّف:** `isdt-608ac`
- **الاسم كما تكتبه الشركة:** ISDT 608AC
- **الشركة:** ISDT
- **القسم:** الشواحن (`chargers`)
- **عدد الصور:** 3 لكل خيار

#### الخيار الوحيد

`isdt-608ac:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/isdt-608ac/standard/01-main.webp` | شاحن يعمل من الكهرباء مباشرة — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/isdt-608ac/standard/02-front.webp` | شاحن يعمل من الكهرباء مباشرة — الخيار الوحيد، من الأمام |
| 3 | `box` | `web/public/assets/store/isdt-608ac/standard/03-box.webp` | محتويات صندوق شاحن يعمل من الكهرباء مباشرة — الخيار الوحيد |


### شاحن مزدوج لبطاريتين معاً

- **المعرّف:** `hota-d6-pro`
- **الاسم كما تكتبه الشركة:** HOTA D6 Pro
- **الشركة:** HOTA
- **القسم:** الشواحن (`chargers`)
- **عدد الصور:** 3 لكل خيار

#### الخيار الوحيد

`hota-d6-pro:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/hota-d6-pro/standard/01-main.webp` | شاحن مزدوج لبطاريتين معاً — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/hota-d6-pro/standard/02-front.webp` | شاحن مزدوج لبطاريتين معاً — الخيار الوحيد، من الأمام |
| 3 | `box` | `web/public/assets/store/hota-d6-pro/standard/03-box.webp` | محتويات صندوق شاحن مزدوج لبطاريتين معاً — الخيار الوحيد |


## الكاميرات

### كاميرا تماثلية شائعة في الفريستايل

- **المعرّف:** `runcam-phoenix-2`
- **الاسم كما تكتبه الشركة:** RunCam Phoenix 2
- **الشركة:** RunCam
- **القسم:** الكاميرات (`cameras`)
- **عدد الصور:** 2 لكل خيار

#### الخيار الوحيد

`runcam-phoenix-2:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/runcam-phoenix-2/standard/01-main.webp` | كاميرا تماثلية شائعة في الفريستايل — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/runcam-phoenix-2/standard/02-front.webp` | كاميرا تماثلية شائعة في الفريستايل — الخيار الوحيد، من الأمام |


### كاميرا تماثلية اقتصادية بزمن تأخير 4 مللي ثانية

- **المعرّف:** `foxeer-razer-micro`
- **الاسم كما تكتبه الشركة:** Foxeer Micro Razer
- **الشركة:** Foxeer
- **القسم:** الكاميرات (`cameras`)
- **عدد الصور:** 2 لكل خيار

#### الخيار الوحيد

`foxeer-razer-micro:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/foxeer-razer-micro/standard/01-main.webp` | كاميرا تماثلية اقتصادية بزمن تأخير 4 مللي ثانية — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/foxeer-razer-micro/standard/02-front.webp` | كاميرا تماثلية اقتصادية بزمن تأخير 4 مللي ثانية — الخيار الوحيد، من الأمام |


## وحدات البث

### مرسل فيديو صغير بأربعة مستويات طاقة

- **المعرّف:** `tbs-unify-pro32-nano`
- **الاسم كما تكتبه الشركة:** TBS Unify Pro32 Nano 5G8 V1.1
- **الشركة:** Team BlackSheep
- **القسم:** وحدات البث (`vtx`)
- **عدد الصور:** 2 لكل خيار

#### الخيار الوحيد

`tbs-unify-pro32-nano:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/tbs-unify-pro32-nano/standard/01-main.webp` | مرسل فيديو صغير بأربعة مستويات طاقة — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/tbs-unify-pro32-nano/standard/02-front.webp` | مرسل فيديو صغير بأربعة مستويات طاقة — الخيار الوحيد، من الأمام |


### مرسل فيديو عالي الطاقة على نطاق ممتدّ

- **المعرّف:** `foxeer-reaper-extreme`
- **الاسم كما تكتبه الشركة:** Foxeer Reaper Extreme V3
- **الشركة:** Foxeer
- **القسم:** وحدات البث (`vtx`)
- **عدد الصور:** 2 لكل خيار

#### الخيار الوحيد

`foxeer-reaper-extreme:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/foxeer-reaper-extreme/standard/01-main.webp` | مرسل فيديو عالي الطاقة على نطاق ممتدّ — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/foxeer-reaper-extreme/standard/02-front.webp` | مرسل فيديو عالي الطاقة على نطاق ممتدّ — الخيار الوحيد، من الأمام |


## وحدات الطائرة الرقمية

### وحدة رقمية بمستشعر Sony Starvis II

- **المعرّف:** `walksnail-avatar-hd-pro`
- **الاسم كما تكتبه الشركة:** Walksnail Avatar HD Pro Kit
- **الشركة:** Walksnail
- **القسم:** وحدات الطائرة الرقمية (`air-units`)
- **عدد الصور:** 3 لكل خيار

#### الخيار الوحيد

`walksnail-avatar-hd-pro:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/walksnail-avatar-hd-pro/standard/01-main.webp` | وحدة رقمية بمستشعر Sony Starvis II — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/walksnail-avatar-hd-pro/standard/02-front.webp` | وحدة رقمية بمستشعر Sony Starvis II — الخيار الوحيد، من الأمام |
| 3 | `box` | `web/public/assets/store/walksnail-avatar-hd-pro/standard/03-box.webp` | محتويات صندوق وحدة رقمية بمستشعر Sony Starvis II — الخيار الوحيد |


### مرسل رقمي يُباع بلا كاميرا

- **المعرّف:** `hdzero-freestyle-v2`
- **الاسم كما تكتبه الشركة:** HDZero Freestyle V2 VTX
- **الشركة:** HDZero
- **القسم:** وحدات الطائرة الرقمية (`air-units`)
- **عدد الصور:** 3 لكل خيار

#### الخيار الوحيد

`hdzero-freestyle-v2:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/hdzero-freestyle-v2/standard/01-main.webp` | مرسل رقمي يُباع بلا كاميرا — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/hdzero-freestyle-v2/standard/02-front.webp` | مرسل رقمي يُباع بلا كاميرا — الخيار الوحيد، من الأمام |
| 3 | `box` | `web/public/assets/store/hdzero-freestyle-v2/standard/03-box.webp` | محتويات صندوق مرسل رقمي يُباع بلا كاميرا — الخيار الوحيد |


## وحدات GPS

### وحدة GPS ببوصلة وهوائي رقعة 25 مم

- **المعرّف:** `holybro-m10-gps`
- **الاسم كما تكتبه الشركة:** Holybro Micro M10 GPS
- **الشركة:** Holybro
- **القسم:** وحدات GPS (`gps`)
- **عدد الصور:** 2 لكل خيار

#### الخيار الوحيد

`holybro-m10-gps:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/holybro-m10-gps/standard/01-main.webp` | وحدة GPS ببوصلة وهوائي رقعة 25 مم — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/holybro-m10-gps/standard/02-front.webp` | وحدة GPS ببوصلة وهوائي رقعة 25 مم — الخيار الوحيد، من الأمام |


### وحدة GPS وبوصلة بوزن 7.3 غرام

- **المعرّف:** `flywoo-goku-gm10-pro`
- **الاسم كما تكتبه الشركة:** Flywoo GOKU GM10 Pro V3
- **الشركة:** Flywoo
- **القسم:** وحدات GPS (`gps`)
- **عدد الصور:** 2 لكل خيار

#### الخيار الوحيد

`flywoo-goku-gm10-pro:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/flywoo-goku-gm10-pro/standard/01-main.webp` | وحدة GPS وبوصلة بوزن 7.3 غرام — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/flywoo-goku-gm10-pro/standard/02-front.webp` | وحدة GPS وبوصلة بوزن 7.3 غرام — الخيار الوحيد، من الأمام |


## المستقبلات

### مستقبِل ExpressLRS بوزن 0.41 غرام

- **المعرّف:** `happymodel-ep1-elrs`
- **الاسم كما تكتبه الشركة:** HappyModel EP1 (ExpressLRS)
- **الشركة:** HappyModel
- **القسم:** المستقبلات (`receivers`)
- **عدد الصور:** 2 لكل خيار

#### الخيار الوحيد

`happymodel-ep1-elrs:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/happymodel-ep1-elrs/standard/01-main.webp` | مستقبِل ExpressLRS بوزن 0.41 غرام — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/happymodel-ep1-elrs/standard/02-front.webp` | مستقبِل ExpressLRS بوزن 0.41 غرام — الخيار الوحيد، من الأمام |


### مستقبِل بسلسلتَي استقبال كاملتين

- **المعرّف:** `betafpv-superd-elrs`
- **الاسم كما تكتبه الشركة:** BetaFPV SuperD (ExpressLRS)
- **الشركة:** BetaFPV
- **القسم:** المستقبلات (`receivers`)
- **عدد الصور:** 2 لكل خيار

#### نسخة 2.4 غيغاهرتز

`betafpv-superd-elrs:ghz24`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/betafpv-superd-elrs/ghz24/01-main.webp` | مستقبِل بسلسلتَي استقبال كاملتين — نسخة 2.4 غيغاهرتز |
| 2 | `front` | `web/public/assets/store/betafpv-superd-elrs/ghz24/02-front.webp` | مستقبِل بسلسلتَي استقبال كاملتين — نسخة 2.4 غيغاهرتز، من الأمام |

#### نسخة 915 أو 868 ميغاهرتز

`betafpv-superd-elrs:mhz900`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/betafpv-superd-elrs/mhz900/01-main.webp` | مستقبِل بسلسلتَي استقبال كاملتين — نسخة 915 أو 868 ميغاهرتز |
| 2 | `front` | `web/public/assets/store/betafpv-superd-elrs/mhz900/02-front.webp` | مستقبِل بسلسلتَي استقبال كاملتين — نسخة 915 أو 868 ميغاهرتز، من الأمام |


## الهوائيات

### هوائي دائري الاستقطاب — اختر الموصّل والاتجاه

- **المعرّف:** `lumenier-axii-2`
- **الاسم كما تكتبه الشركة:** Lumenier AXII 2
- **الشركة:** Lumenier
- **القسم:** الهوائيات (`antennas`)
- **عدد الصور:** 2 لكل خيار

#### موصّل SMA — استقطاب يميني

`lumenier-axii-2:sma-rhcp`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/lumenier-axii-2/sma-rhcp/01-main.webp` | هوائي دائري الاستقطاب — اختر الموصّل والاتجاه — موصّل SMA — استقطاب يميني |
| 2 | `front` | `web/public/assets/store/lumenier-axii-2/sma-rhcp/02-front.webp` | هوائي دائري الاستقطاب — اختر الموصّل والاتجاه — موصّل SMA — استقطاب يميني، من الأمام |

#### موصّل SMA — استقطاب يساري

`lumenier-axii-2:sma-lhcp`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/lumenier-axii-2/sma-lhcp/01-main.webp` | هوائي دائري الاستقطاب — اختر الموصّل والاتجاه — موصّل SMA — استقطاب يساري |
| 2 | `front` | `web/public/assets/store/lumenier-axii-2/sma-lhcp/02-front.webp` | هوائي دائري الاستقطاب — اختر الموصّل والاتجاه — موصّل SMA — استقطاب يساري، من الأمام |

#### موصّل MMCX — استقطاب يميني

`lumenier-axii-2:mmcx-rhcp`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/lumenier-axii-2/mmcx-rhcp/01-main.webp` | هوائي دائري الاستقطاب — اختر الموصّل والاتجاه — موصّل MMCX — استقطاب يميني |
| 2 | `front` | `web/public/assets/store/lumenier-axii-2/mmcx-rhcp/02-front.webp` | هوائي دائري الاستقطاب — اختر الموصّل والاتجاه — موصّل MMCX — استقطاب يميني، من الأمام |

#### موصّل U.FL — استقطاب يميني

`lumenier-axii-2:ufl-rhcp`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/lumenier-axii-2/ufl-rhcp/01-main.webp` | هوائي دائري الاستقطاب — اختر الموصّل والاتجاه — موصّل U.FL — استقطاب يميني |
| 2 | `front` | `web/public/assets/store/lumenier-axii-2/ufl-rhcp/02-front.webp` | هوائي دائري الاستقطاب — اختر الموصّل والاتجاه — موصّل U.FL — استقطاب يميني، من الأمام |


### هوائي متعدّد الاتجاهات بكسب 2.6 ديسيبل

- **المعرّف:** `foxeer-lollipop-4`
- **الاسم كما تكتبه الشركة:** Foxeer Lollipop 4
- **الشركة:** Foxeer
- **القسم:** الهوائيات (`antennas`)
- **عدد الصور:** 2 لكل خيار

#### الخيار الوحيد

`foxeer-lollipop-4:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/foxeer-lollipop-4/standard/01-main.webp` | هوائي متعدّد الاتجاهات بكسب 2.6 ديسيبل — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/foxeer-lollipop-4/standard/02-front.webp` | هوائي متعدّد الاتجاهات بكسب 2.6 ديسيبل — الخيار الوحيد، من الأمام |


## الإكسسوارات

### مراوح خمس إنشات — القطعة الأكثر استهلاكاً

- **المعرّف:** `gemfan-hurricane-51466`
- **الاسم كما تكتبه الشركة:** Gemfan Hurricane 51466 V2
- **الشركة:** Gemfan
- **القسم:** الإكسسوارات (`accessories`)
- **عدد الصور:** 2 لكل خيار

#### الخيار الوحيد

`gemfan-hurricane-51466:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/gemfan-hurricane-51466/standard/01-main.webp` | مراوح خمس إنشات — القطعة الأكثر استهلاكاً — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/gemfan-hurricane-51466/standard/02-front.webp` | مراوح خمس إنشات — القطعة الأكثر استهلاكاً — الخيار الوحيد، من الأمام |


### أحزمة تثبيت البطارية

- **المعرّف:** `battery-strap-set`
- **الاسم كما تكتبه الشركة:** Battery Strap Set
- **الشركة:** عام
- **القسم:** الإكسسوارات (`accessories`)
- **عدد الصور:** 2 لكل خيار

#### الخيار الوحيد

`battery-strap-set:standard`

| # | الدور | الملف | النص البديل |
|---|---|---|---|
| 1 | `main` **(إلزامية)** | `web/public/assets/store/battery-strap-set/standard/01-main.webp` | أحزمة تثبيت البطارية — الخيار الوحيد |
| 2 | `front` | `web/public/assets/store/battery-strap-set/standard/02-front.webp` | أحزمة تثبيت البطارية — الخيار الوحيد، من الأمام |

