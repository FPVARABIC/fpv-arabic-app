# صور المتجر — ما الذي يجب تصويره ورفعه

> **مولَّد آلياً** من `scripts/buildImageManifest.ts` اعتماداً على الكتالوج الحقيقي.
> لا تحرّر هذا الملف يدوياً — عدّل `src/data/store/imageSlots.ts` وأعد التوليد.

## الخلاصة

| البند | العدد |
| --- | ---: |
| منتجات | 70 |
| خدمات (بلا صور) | 7 |
| خيارات (Variants) | 113 |
| مجلدات ستُرفع إليها | 98 |
| صور إلزامية (`01-main`) | 98 |
| صور اختيارية | 290 |
| المجموع المقترح | 388 |

## المواصفات

- الصيغة: `webp`
- النسبة: `1:1`
- المقاس المفضّل: `1600×1600`
- الحد الأدنى: `1000×1000`
- الحجم الأقصى: `400KB`
- مكان الرفع: `web/public/assets/store/<product-id>/<variant-id>/`

### أسماء الملفات — ثابتة على كل المنتجات

| الملف | الوظيفة |
| --- | --- |
| `01-main.webp` | الصورة الرئيسية: المنتج كاملاً على خلفية بيضاء أو فاتحة، بلا قصّ لأي طرف. هذه التي تظهر في بطاقة المتجر. |
| `02-front.webp` | من الأمام مباشرة: تُظهر الكاميرا والهوائيات وترتيب المراوح. |
| `03-side.webp` | من الجانب: تُظهر الارتفاع وترتيب الطبقات والمنافذ. |
| `04-back.webp` | من الخلف: تُظهر المنافذ والمخارج وموضع البطارية. |
| `05-top.webp` | من الأعلى: تُظهر التخطيط العام وأماكن التثبيت. |
| `06-box.webp` | محتويات الصندوق كما تصل فعلاً — لا صورة دعائية. |
| `07-accessories.webp` | ما يُضاف أو يُستبدل: بطاريات، مراوح، هوائيات، أسلاك. |

الرقم مرتبط بالوظيفة لا بالترتيب: صورة الصندوق اسمها `06-box.webp` على كل
منتج، سواء طلب ثلاث صور أو سبعاً. تتعلّم سبعة أسماء مرّة واحدة.

## المنتجات، حسب القسم

### تايني ووب — `tiny-whoop`

#### طقم تدريب كامل للمبتدئ

- `productId`: `betafpv-cetus-pro`
- الاسم الأصلي: `BetaFPV Cetus Pro Kit` — BetaFPV
- الحالة: **مسودة**
- النطاق: **صورة مستقلة لكل خيار**
- الخيارات (2): `betafpv-cetus-pro:rtf` (الطقم الكامل — طائرة وجهاز تحكّم ونظّارة)، `betafpv-cetus-pro:bnf` (الطائرة وحدها — لمن يملك جهازاً ونظّارة)
- الصور المطلوبة: 5 لكل مجلد · المجموع 10

```text
web/public/assets/store/betafpv-cetus-pro/rtf/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

```text
web/public/assets/store/betafpv-cetus-pro/bnf/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

#### ووب تناظري للطيران الحرّ داخل البيت

- `productId`: `betafpv-meteor75-pro`
- الاسم الأصلي: `BetaFPV Meteor75 Pro` — BetaFPV
- الحالة: **مسودة**
- النطاق: **صورة مستقلة لكل خيار**
- الخيارات (2): `betafpv-meteor75-pro:elrs-analog` (ExpressLRS + فيديو تماثلي)، `betafpv-meteor75-pro:elrs-hd` (ExpressLRS + فيديو رقمي)
- الصور المطلوبة: 5 لكل مجلد · المجموع 10

```text
web/public/assets/store/betafpv-meteor75-pro/elrs-analog/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

```text
web/public/assets/store/betafpv-meteor75-pro/elrs-hd/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

#### ووب اقتصادي واسع الانتشار

- `productId`: `happymodel-mobula7`
- الاسم الأصلي: `HappyModel Mobula7` — HappyModel
- الحالة: **مسودة**
- النطاق: **صورة مستقلة لكل خيار**
- الخيارات (2): `happymodel-mobula7:elrs-bnf` (ExpressLRS مع مستقبِل — تماثلي)، `happymodel-mobula7:pnp` (بلا مستقبِل — تركّب مستقبِلك)
- الصور المطلوبة: 5 لكل مجلد · المجموع 10

```text
web/public/assets/store/happymodel-mobula7/elrs-bnf/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

```text
web/public/assets/store/happymodel-mobula7/pnp/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

### مقاس 2 إنش — `size-2`

#### سينيووب صغير مبني حول وحدة فيديو رقمية تشتريها معه

- `productId`: `betafpv-pavo-pico`
- الاسم الأصلي: `BetaFPV Pavo Pico` — BetaFPV
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `betafpv-pavo-pico:standard` (الخيار الوحيد)
- الصور المطلوبة: 5 لكل مجلد · المجموع 5

```text
web/public/assets/store/betafpv-pavo-pico/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

#### طقم كامل بمقاس إنشين للانتقال بعد الووب

- `productId`: `betafpv-cetus-x`
- الاسم الأصلي: `BetaFPV Cetus X` — BetaFPV
- الحالة: **مسودة**
- النطاق: **صورة مستقلة لكل خيار**
- الخيارات (3): `betafpv-cetus-x:elrs` (طقم ExpressLRS — تماثلي)، `betafpv-cetus-x:frsky` (طقم FrSky D8 — تماثلي)، `betafpv-cetus-x:hd` (طقم HD — فيديو رقمي)
- الصور المطلوبة: 5 لكل مجلد · المجموع 15

```text
web/public/assets/store/betafpv-cetus-x/elrs/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

```text
web/public/assets/store/betafpv-cetus-x/frsky/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

```text
web/public/assets/store/betafpv-cetus-x/hd/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

#### ووب 85 مم يقبل بطارية 1S أو 2S

- `productId`: `happymodel-mobula8`
- الاسم الأصلي: `HappyModel Mobula8` — HappyModel
- الحالة: **مسودة**
- النطاق: **صورة مستقلة لكل خيار**
- الخيارات (4): `happymodel-mobula8:elrs-uart` (مستقبِل ExpressLRS عبر UART)، `happymodel-mobula8:elrs-spi` (مستقبِل ExpressLRS مدمج من نوع SPI)، `happymodel-mobula8:flysky-spi` (مستقبِل FlySky مدمج من نوع SPI)، `happymodel-mobula8:hd` (نسخة رقمية — تُطلب بوحدة الفيديو التي تناسب نظّارتك)
- الصور المطلوبة: 5 لكل مجلد · المجموع 20

```text
web/public/assets/store/happymodel-mobula8/elrs-uart/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

```text
web/public/assets/store/happymodel-mobula8/elrs-spi/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

```text
web/public/assets/store/happymodel-mobula8/flysky-spi/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

```text
web/public/assets/store/happymodel-mobula8/hd/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

### مقاس 2.5 إنش — `size-2-5`

#### سينيووب 2.5 إنش للتصوير الناعم

- `productId`: `geprc-cinelog25`
- الاسم الأصلي: `GEPRC Cinelog25` — GEPRC
- الحالة: **مسودة**
- النطاق: **صورة مستقلة لكل خيار**
- الخيارات (3): `geprc-cinelog25:analog` (تماثلي)، `geprc-cinelog25:hd-o3` (رقمي بوحدة DJI O3)، `geprc-cinelog25:hd-wasp` (رقمي بنظام Walksnail)
- الصور المطلوبة: 5 لكل مجلد · المجموع 15

```text
web/public/assets/store/geprc-cinelog25/analog/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

```text
web/public/assets/store/geprc-cinelog25/hd-o3/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

```text
web/public/assets/store/geprc-cinelog25/hd-wasp/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

#### سينيووب 2.5 إنش يُباع بلا نظام فيديو

- `productId`: `betafpv-pavo25`
- الاسم الأصلي: `BetaFPV Pavo25 V2` — BetaFPV
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `betafpv-pavo25:standard` (الخيار الوحيد)
- الصور المطلوبة: 5 لكل مجلد · المجموع 5

```text
web/public/assets/store/betafpv-pavo25/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

#### سينيووب 2.5 إنش بوحدة DJI O4 Air Unit Pro

- `productId`: `geprc-cinebot25`
- الاسم الأصلي: `GEPRC Cinebot25 V2` — GEPRC
- الحالة: **مسودة**
- النطاق: **صورة مستقلة لكل خيار**
- الخيارات (2): `geprc-cinebot25:o4-pro` (نسخة DJI O4 Air Unit Pro)، `geprc-cinebot25:wtfpv` (نسخة WTFPV)
- الصور المطلوبة: 5 لكل مجلد · المجموع 10

```text
web/public/assets/store/geprc-cinebot25/o4-pro/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

```text
web/public/assets/store/geprc-cinebot25/wtfpv/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

### مقاس 3 إنش — `size-3`

#### سينيووب 3 إنش بزمن طيران معلَن يتجاوز ثماني دقائق

- `productId`: `geprc-cinelog30`
- الاسم الأصلي: `GEPRC Cinelog30 V3` — GEPRC
- الحالة: **مسودة**
- النطاق: **صورة مستقلة لكل خيار**
- الخيارات (2): `geprc-cinelog30:o4-pro` (نسخة DJI O4 Air Unit Pro)، `geprc-cinelog30:wtfpv` (نسخة WTFPV)
- الصور المطلوبة: 5 لكل مجلد · المجموع 10

```text
web/public/assets/store/geprc-cinelog30/o4-pro/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

```text
web/public/assets/store/geprc-cinelog30/wtfpv/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

#### طائرة تصوير 3 إنش بمراوح مكشوفة

- `productId`: `geprc-cinebot30`
- الاسم الأصلي: `GEPRC Cinebot30` — GEPRC
- الحالة: **مسودة**
- النطاق: **صورة مستقلة لكل خيار**
- الخيارات (3): `geprc-cinebot30:analog` (نسخة تماثلية)، `geprc-cinebot30:hd-o3` (نسخة DJI O3)، `geprc-cinebot30:hd-wasp` (نسخة RunCam Link Wasp)
- الصور المطلوبة: 5 لكل مجلد · المجموع 15

```text
web/public/assets/store/geprc-cinebot30/analog/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

```text
web/public/assets/store/geprc-cinebot30/hd-o3/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

```text
web/public/assets/store/geprc-cinebot30/hd-wasp/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

#### أوّل ووب دافع بمقاس ثلاث إنشات

- `productId`: `betafpv-pavo30`
- الاسم الأصلي: `BetaFPV Pavo30` — BetaFPV
- الحالة: **مسودة**
- النطاق: **صورة مستقلة لكل خيار**
- الخيارات (2): `betafpv-pavo30:analog` (نسخة تماثلية)، `betafpv-pavo30:hd` (نسخة رقمية)
- الصور المطلوبة: 5 لكل مجلد · المجموع 10

```text
web/public/assets/store/betafpv-pavo30/analog/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

```text
web/public/assets/store/betafpv-pavo30/hd/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

### مقاس 3.5 – 4 إنش — `size-3-5`

#### فريستايل تحت 250 غراماً

- `productId`: `geprc-smart35`
- الاسم الأصلي: `GEPRC SMART35` — GEPRC
- الحالة: **مسودة**
- النطاق: **صورة مستقلة لكل خيار**
- الخيارات (2): `geprc-smart35:analog` (نسخة تماثلية بطاقة 600 ميلي واط)، `geprc-smart35:hd` (نسخة رقمية)
- الصور المطلوبة: 5 لكل مجلد · المجموع 10

```text
web/public/assets/store/geprc-smart35/analog/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

```text
web/public/assets/store/geprc-smart35/hd/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

#### سينيووب 3.5 إنش بنظام رقمي من الجيل الرابع

- `productId`: `geprc-cinelog35`
- الاسم الأصلي: `GEPRC CineLog35 V3` — GEPRC
- الحالة: **مسودة**
- النطاق: **صورة مستقلة لكل خيار**
- الخيارات (2): `geprc-cinelog35:o4-pro` (نسخة DJI O4 Air Unit Pro)، `geprc-cinelog35:wtfpv` (نسخة WTFPV)
- الصور المطلوبة: 5 لكل مجلد · المجموع 10

```text
web/public/assets/store/geprc-cinelog35/o4-pro/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

```text
web/public/assets/store/geprc-cinelog35/wtfpv/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

#### فريستايل 3.6 إنش بمحرّكات مقاس الخمسة

- `productId`: `geprc-domain36`
- الاسم الأصلي: `GEPRC DoMain3.6` — GEPRC
- الحالة: **مسودة**
- النطاق: **صورة مستقلة لكل خيار**
- الخيارات (3): `geprc-domain36:analog` (نسخة تماثلية بكاميرا RunCam Phoenix 2)، `geprc-domain36:hd-o3` (نسخة DJI O3)، `geprc-domain36:wtfpv` (نسخة WTFPV)
- الصور المطلوبة: 5 لكل مجلد · المجموع 15

```text
web/public/assets/store/geprc-domain36/analog/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

```text
web/public/assets/store/geprc-domain36/hd-o3/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

```text
web/public/assets/store/geprc-domain36/wtfpv/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

#### أربع إنشات بهيكلَين مختلفَين — X أو DeadCat

- `productId`: `iflight-nazgul-evoque-f4`
- الاسم الأصلي: `iFlight Nazgul Evoque F4` — iFlight
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (2): `iflight-nazgul-evoque-f4:f4x-o3` (هيكل F4X — X مضغوط، وحدة DJI O3)، `iflight-nazgul-evoque-f4:f4d-o3` (هيكل F4D — DeadCat، وحدة DJI O3)
- الصور المطلوبة: 5 لكل مجلد · المجموع 5

```text
web/public/assets/store/iflight-nazgul-evoque-f4/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

### مقاس 5 إنش — `size-5`

#### خمس إنشات جاهزة للفريستايل

- `productId`: `iflight-nazgul5-v3`
- الاسم الأصلي: `iFlight Nazgul5 V3` — iFlight
- الحالة: **مسودة**
- النطاق: **صورة مستقلة لكل خيار**
- الخيارات (3): `iflight-nazgul5-v3:elrs-analog` (ExpressLRS + فيديو تماثلي)، `iflight-nazgul5-v3:crossfire-analog` (Crossfire + فيديو تماثلي)، `iflight-nazgul5-v3:pnp` (بلا مستقبِل)
- الصور المطلوبة: 5 لكل مجلد · المجموع 15

```text
web/public/assets/store/iflight-nazgul5-v3/elrs-analog/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

```text
web/public/assets/store/iflight-nazgul5-v3/crossfire-analog/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

```text
web/public/assets/store/iflight-nazgul5-v3/pnp/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

#### خمس إنشات بهيكل يسهل إصلاحه

- `productId`: `geprc-mark5`
- الاسم الأصلي: `GEPRC MARK5` — GEPRC
- الحالة: **مسودة**
- النطاق: **صورة مستقلة لكل خيار**
- الخيارات (3): `geprc-mark5:elrs24-analog` (ExpressLRS 2.4 + فيديو تماثلي)، `geprc-mark5:elrs915-analog` (ExpressLRS 915 + فيديو تماثلي)، `geprc-mark5:pnp` (بلا مستقبِل)
- الصور المطلوبة: 5 لكل مجلد · المجموع 15

```text
web/public/assets/store/geprc-mark5/elrs24-analog/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

```text
web/public/assets/store/geprc-mark5/elrs915-analog/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

```text
web/public/assets/store/geprc-mark5/pnp/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

#### خمس إنشات مبنيّة على هيكل مفتوح المصدر

- `productId`: `tbs-source-one-v5`
- الاسم الأصلي: `TBS Source One V5.1 RTF/BNF Set` — Team BlackSheep
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `tbs-source-one-v5:standard` (الخيار الوحيد)
- الصور المطلوبة: 5 لكل مجلد · المجموع 5

```text
web/public/assets/store/tbs-source-one-v5/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

### مقاس 7 إنش — `size-7`

#### سبع إنشات بقطر 327 مم لرحلات طويلة

- `productId`: `iflight-chimera7-pro`
- الاسم الأصلي: `iFlight Chimera7 Pro V2` — iFlight
- الحالة: **مسودة**
- النطاق: **صورة مستقلة لكل خيار**
- الخيارات (3): `iflight-chimera7-pro:analog` (نسخة تماثلية بمرسل BLITZ Whoop)، `iflight-chimera7-pro:o3` (نسخة DJI O3)، `iflight-chimera7-pro:o4` (نسخة DJI O4)
- الصور المطلوبة: 5 لكل مجلد · المجموع 15

```text
web/public/assets/store/iflight-chimera7-pro/analog/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

```text
web/public/assets/store/iflight-chimera7-pro/o3/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

```text
web/public/assets/store/iflight-chimera7-pro/o4/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

#### سبع إنشات بمسافة 315 مم بين المحرّكات

- `productId`: `geprc-crocodile7`
- الاسم الأصلي: `GEPRC Crocodile 7 PRO` — GEPRC
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `geprc-crocodile7:standard` (الخيار الوحيد)
- الصور المطلوبة: 5 لكل مجلد · المجموع 5

```text
web/public/assets/store/geprc-crocodile7/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

#### سبع إنشات اقتصادية — بلا GPS افتراضياً

- `productId`: `iflight-chimera7-eco`
- الاسم الأصلي: `iFlight Chimera7 ECO 6S` — iFlight
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `iflight-chimera7-eco:standard` (الخيار الوحيد)
- الصور المطلوبة: 5 لكل مجلد · المجموع 5

```text
web/public/assets/store/iflight-chimera7-eco/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

### جاهزة للطيران — `rtf`

#### طقم جاهز ببروتوكول FrSky D8

- `productId`: `emax-tinyhawk-3-rtf`
- الاسم الأصلي: `EMAX Tinyhawk III RTF Kit` — EMAX
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `emax-tinyhawk-3-rtf:standard` (الخيار الوحيد)
- الصور المطلوبة: 5 لكل مجلد · المجموع 5

```text
web/public/assets/store/emax-tinyhawk-3-rtf/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

#### أرخص طقم كامل — بمحرّكات مكنَّسة

- `productId`: `betafpv-cetus-lite`
- الاسم الأصلي: `BetaFPV Cetus Lite FPV Kit` — BetaFPV
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `betafpv-cetus-lite:standard` (الخيار الوحيد)
- الصور المطلوبة: 5 لكل مجلد · المجموع 5

```text
web/public/assets/store/betafpv-cetus-lite/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

#### جهاز تحكّم ومحاكي — الطريق الأرخص للتعلّم

- `productId`: `radiomaster-pocket-combo`
- الاسم الأصلي: `RadioMaster Pocket + Simulator` — RadioMaster
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `radiomaster-pocket-combo:standard` (الخيار الوحيد)
- الصور المطلوبة: 5 لكل مجلد · المجموع 5

```text
web/public/assets/store/radiomaster-pocket-combo/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  03-side.webp
  05-top.webp
  06-box.webp
```

### أجهزة التحكم — `radios`

#### جهاز تحكم اقتصادي كامل الوظائف

- `productId`: `radiomaster-pocket`
- الاسم الأصلي: `RadioMaster Pocket` — RadioMaster
- الحالة: **مسودة**
- النطاق: **صورة مستقلة لكل خيار**
- الخيارات (2): `radiomaster-pocket:elrs` (نسخة ExpressLRS)، `radiomaster-pocket:cc2500` (نسخة متعدّدة البروتوكولات (CC2500))
- الصور المطلوبة: 3 لكل مجلد · المجموع 6

```text
web/public/assets/store/radiomaster-pocket/elrs/
  01-main.webp   ← إلزامية
  02-front.webp
  06-box.webp
```

```text
web/public/assets/store/radiomaster-pocket/cc2500/
  01-main.webp   ← إلزامية
  02-front.webp
  06-box.webp
```

#### جهاز التحكم المتوسط الموصى به

- `productId`: `radiomaster-boxer`
- الاسم الأصلي: `RadioMaster Boxer` — RadioMaster
- الحالة: **مسودة**
- النطاق: **صورة مستقلة لكل خيار**
- الخيارات (2): `radiomaster-boxer:elrs` (نسخة ExpressLRS)، `radiomaster-boxer:multi` (نسخة متعدّدة البروتوكولات (4-in-1))
- الصور المطلوبة: 3 لكل مجلد · المجموع 6

```text
web/public/assets/store/radiomaster-boxer/elrs/
  01-main.webp   ← إلزامية
  02-front.webp
  06-box.webp
```

```text
web/public/assets/store/radiomaster-boxer/multi/
  01-main.webp   ← إلزامية
  02-front.webp
  06-box.webp
```

#### جهاز التحكم الاحترافي

- `productId`: `radiomaster-tx16s-mk2`
- الاسم الأصلي: `RadioMaster TX16S MKII` — RadioMaster
- الحالة: **مسودة**
- النطاق: **صورة مستقلة لكل خيار**
- الخيارات (2): `radiomaster-tx16s-mk2:elrs` (نسخة ExpressLRS)، `radiomaster-tx16s-mk2:multi` (نسخة متعدّدة البروتوكولات (4-in-1))
- الصور المطلوبة: 3 لكل مجلد · المجموع 6

```text
web/public/assets/store/radiomaster-tx16s-mk2/elrs/
  01-main.webp   ← إلزامية
  02-front.webp
  06-box.webp
```

```text
web/public/assets/store/radiomaster-tx16s-mk2/multi/
  01-main.webp   ← إلزامية
  02-front.webp
  06-box.webp
```

### النظارات — `goggles`

#### نظارة رقمية من منظومة DJI

- `productId`: `dji-goggles-n3`
- الاسم الأصلي: `DJI Goggles N3` — DJI
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `dji-goggles-n3:standard` (الخيار الوحيد)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/dji-goggles-n3/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  06-box.webp
```

#### نظّارة رقمية بوزن 290 غراماً ومدخل HDMI

- `productId`: `walksnail-avatar-hd-x`
- الاسم الأصلي: `Walksnail Avatar HD Goggles X` — Walksnail
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `walksnail-avatar-hd-x:standard` (الخيار الوحيد)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/walksnail-avatar-hd-x/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  06-box.webp
```

#### نظّارة رقمية بتأخير 3 مللي ثانية

- `productId`: `hdzero-goggles`
- الاسم الأصلي: `HDZero Goggle 2` — HDZero
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `hdzero-goggles:standard` (الخيار الوحيد)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/hdzero-goggles/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  06-box.webp
```

### المحركات — `motors`

#### محرّك خمس إنشات اقتصادي بثلاث سرعات

- `productId`: `emax-eco-ii-2306`
- الاسم الأصلي: `EMAX ECO II 2306` — EMAX
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (3): `emax-eco-ii-2306:kv1700` (1700KV — لبطارية 6S)، `emax-eco-ii-2306:kv1900` (1900KV — لبطارية 6S)، `emax-eco-ii-2306:kv2400` (2400KV — لبطارية 4S)
- الصور المطلوبة: 2 لكل مجلد · المجموع 2

```text
web/public/assets/store/emax-eco-ii-2306/_shared/
  01-main.webp   ← إلزامية
  03-side.webp
```

#### محرّك 2207.5 بأربع سرعات دوران

- `productId`: `tmotor-f60-pro-v`
- الاسم الأصلي: `T-Motor F60 PRO V` — T-Motor
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `tmotor-f60-pro-v:standard` (الخيار الوحيد)
- الصور المطلوبة: 2 لكل مجلد · المجموع 2

```text
web/public/assets/store/tmotor-f60-pro-v/_shared/
  01-main.webp   ← إلزامية
  03-side.webp
```

#### محرّك خمس إنشات — اختر سرعة الدوران بجهد بطاريتك

- `productId`: `iflight-xing2-2207`
- الاسم الأصلي: `iFlight XING2 2207` — iFlight
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (3): `iflight-xing2-2207:kv1750` (1750KV — لبطارية 6S)، `iflight-xing2-2207:kv2050` (2050KV — لبطارية 6S)، `iflight-xing2-2207:kv2750` (2750KV — لبطارية 4S)
- الصور المطلوبة: 2 لكل مجلد · المجموع 2

```text
web/public/assets/store/iflight-xing2-2207/_shared/
  01-main.webp   ← إلزامية
  03-side.webp
```

### متحكّمات الطيران — `flight-controllers`

#### طقم متحكّم وESC للخمس إنشات

- `productId`: `speedybee-f405-v4-stack`
- الاسم الأصلي: `SpeedyBee F405 V4 Stack` — SpeedyBee
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `speedybee-f405-v4-stack:standard` (الخيار الوحيد)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/speedybee-f405-v4-stack/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  04-back.webp
```

#### متحكّم طيران مفرد بلا مسرّعات

- `productId`: `speedybee-f7-v3-fc`
- الاسم الأصلي: `SpeedyBee F7 V3` — SpeedyBee
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `speedybee-f7-v3-fc:standard` (الخيار الوحيد)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/speedybee-f7-v3-fc/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  04-back.webp
```

#### متحكّم H7 بستّة منافذ UART

- `productId`: `holybro-kakute-h7`
- الاسم الأصلي: `Holybro Kakute H7 V2` — Holybro
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `holybro-kakute-h7:standard` (الخيار الوحيد)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/holybro-kakute-h7/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  04-back.webp
```

### وحدات ESC — `escs`

#### وحدة ESC أربعة في واحد بمقاس 30.5 مم

- `productId`: `speedybee-bls-50a`
- الاسم الأصلي: `SpeedyBee F405 BLS 50A 4-in-1` — SpeedyBee
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `speedybee-bls-50a:standard` (الخيار الوحيد)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/speedybee-bls-50a/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  04-back.webp
```

#### مسرّعات رباعية بورقة بيانات منشورة

- `productId`: `hobbywing-xrotor-g2`
- الاسم الأصلي: `Hobbywing XRotor FPV G2 4in1` — Hobbywing
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (2): `hobbywing-xrotor-g2:a45` (45 أمبير — بلا مخرج جهد)، `hobbywing-xrotor-g2:a65` (65 أمبير — بمخرج 5 فولت)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/hobbywing-xrotor-g2/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  04-back.webp
```

#### مسرّعات 55 أمبير بمخرج 10 فولت

- `productId`: `tmotor-f55a-pro-ii`
- الاسم الأصلي: `T-Motor F55A Pro II` — T-Motor
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `tmotor-f55a-pro-ii:standard` (الخيار الوحيد)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/tmotor-f55a-pro-ii/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  04-back.webp
```

### الهياكل — `frames`

#### هيكل خمس إنشات بضمان يغطّي الكربون والمعدن

- `productId`: `armattan-marmotte`
- الاسم الأصلي: `Armattan Marmotte 5"` — Armattan
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `armattan-marmotte:standard` (الخيار الوحيد)
- الصور المطلوبة: 4 لكل مجلد · المجموع 4

```text
web/public/assets/store/armattan-marmotte/_shared/
  01-main.webp   ← إلزامية
  05-top.webp
  03-side.webp
  07-accessories.webp
```

#### هيكل خمس إنشات مفتوح المصدر

- `productId`: `tbs-source-one-v5-frame`
- الاسم الأصلي: `TBS Source One V5.1 Frame` — Team BlackSheep
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `tbs-source-one-v5-frame:standard` (الخيار الوحيد)
- الصور المطلوبة: 4 لكل مجلد · المجموع 4

```text
web/public/assets/store/tbs-source-one-v5-frame/_shared/
  01-main.webp   ← إلزامية
  05-top.webp
  03-side.webp
  07-accessories.webp
```

#### هيكل فريستايل بأذرع أمامية وخلفية مختلفة

- `productId`: `impulserc-apex`
- الاسم الأصلي: `ImpulseRC ApexDC EVO 5"` — ImpulseRC
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `impulserc-apex:standard` (الخيار الوحيد)
- الصور المطلوبة: 4 لكل مجلد · المجموع 4

```text
web/public/assets/store/impulserc-apex/_shared/
  01-main.webp   ← إلزامية
  05-top.webp
  03-side.webp
  07-accessories.webp
```

### البطاريات — `batteries`

#### بطارية 6S — اختر السعة بمكان بطاريتك

- `productId`: `cnhl-black-series-6s`
- الاسم الأصلي: `CNHL Black Series 6S` — CNHL
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (3): `cnhl-black-series-6s:mah1100` (1100 ميلي أمبير/ساعة — 100C)، `cnhl-black-series-6s:mah1500` (1500 ميلي أمبير/ساعة — 130C)، `cnhl-black-series-6s:mah2000` (2000 ميلي أمبير/ساعة — 100C)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/cnhl-black-series-6s/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  06-box.webp
```

#### بطارية 4S للمقاسات الصغيرة

- `productId`: `cnhl-black-series-4s`
- الاسم الأصلي: `CNHL Black Series 4S` — CNHL
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (2): `cnhl-black-series-4s:mah1100` (1100 ميلي أمبير/ساعة — 100C بموصّل XT60)، `cnhl-black-series-4s:mah1500` (1500 ميلي أمبير/ساعة — 130C بموصّل XT60)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/cnhl-black-series-4s/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  06-box.webp
```

#### بطارية سباق 6S بمعدّل تفريغ 150C

- `productId`: `tattu-r-line-v5-6s`
- الاسم الأصلي: `Tattu R-Line Version 5.0 6S` — Tattu
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (3): `tattu-r-line-v5-6s:mah1050` (1050 ميلي أمبير/ساعة — 186 غراماً)، `tattu-r-line-v5-6s:mah1400` (1400 ميلي أمبير/ساعة)، `tattu-r-line-v5-6s:mah2200` (2200 ميلي أمبير/ساعة — 346 غراماً)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/tattu-r-line-v5-6s/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  06-box.webp
```

### الشواحن — `chargers`

#### شاحن موازنة بطاقة 200 واط

- `productId`: `isdt-q6-charger`
- الاسم الأصلي: `ISDT Q6 Nano` — ISDT
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `isdt-q6-charger:standard` (الخيار الوحيد)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/isdt-q6-charger/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  06-box.webp
```

#### شاحن يعمل من الكهرباء مباشرة

- `productId`: `isdt-608ac`
- الاسم الأصلي: `ISDT 608AC` — ISDT
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `isdt-608ac:standard` (الخيار الوحيد)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/isdt-608ac/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  06-box.webp
```

#### شاحن مزدوج لبطاريتين معاً

- `productId`: `hota-d6-pro`
- الاسم الأصلي: `HOTA D6 Pro` — HOTA
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `hota-d6-pro:standard` (الخيار الوحيد)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/hota-d6-pro/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  06-box.webp
```

### الكاميرات — `cameras`

#### كاميرا تناظرية قوية في الضوء المنخفض

- `productId`: `caddx-ratel-2`
- الاسم الأصلي: `Caddx Ratel 2` — Caddx
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `caddx-ratel-2:standard` (الخيار الوحيد)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/caddx-ratel-2/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  04-back.webp
```

#### كاميرا تماثلية شائعة في الفريستايل

- `productId`: `runcam-phoenix-2`
- الاسم الأصلي: `RunCam Phoenix 2` — RunCam
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `runcam-phoenix-2:standard` (الخيار الوحيد)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/runcam-phoenix-2/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  04-back.webp
```

#### كاميرا تماثلية اقتصادية بزمن تأخير 4 مللي ثانية

- `productId`: `foxeer-razer-micro`
- الاسم الأصلي: `Foxeer Micro Razer` — Foxeer
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `foxeer-razer-micro:standard` (الخيار الوحيد)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/foxeer-razer-micro/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  04-back.webp
```

### وحدات البث — `vtx`

#### مرسل تماثلي بخمسة مستويات طاقة حتى 800 ميلي واط

- `productId`: `rush-tank-ultimate`
- الاسم الأصلي: `RushFPV TANK II ULTIMATE` — RushFPV
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `rush-tank-ultimate:standard` (الخيار الوحيد)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/rush-tank-ultimate/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  04-back.webp
```

#### مرسل فيديو صغير بأربعة مستويات طاقة

- `productId`: `tbs-unify-pro32-nano`
- الاسم الأصلي: `TBS Unify Pro32 Nano 5G8 V1.1` — Team BlackSheep
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `tbs-unify-pro32-nano:standard` (الخيار الوحيد)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/tbs-unify-pro32-nano/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  04-back.webp
```

#### مرسل فيديو عالي الطاقة على نطاق ممتدّ

- `productId`: `foxeer-reaper-extreme`
- الاسم الأصلي: `Foxeer Reaper Extreme V3` — Foxeer
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `foxeer-reaper-extreme:standard` (الخيار الوحيد)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/foxeer-reaper-extreme/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  04-back.webp
```

### وحدات الطائرة الرقمية — `air-units`

#### وحدة طائرة رقمية من DJI

- `productId`: `dji-o3-air-unit`
- الاسم الأصلي: `DJI O3 Air Unit` — DJI
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `dji-o3-air-unit:standard` (الخيار الوحيد)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/dji-o3-air-unit/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  06-box.webp
```

#### وحدة رقمية بمستشعر Sony Starvis II

- `productId`: `walksnail-avatar-hd-pro`
- الاسم الأصلي: `Walksnail Avatar HD Pro Kit` — Walksnail
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `walksnail-avatar-hd-pro:standard` (الخيار الوحيد)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/walksnail-avatar-hd-pro/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  06-box.webp
```

#### مرسل رقمي يُباع بلا كاميرا

- `productId`: `hdzero-freestyle-v2`
- الاسم الأصلي: `HDZero Freestyle V2 VTX` — HDZero
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `hdzero-freestyle-v2:standard` (الخيار الوحيد)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/hdzero-freestyle-v2/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  06-box.webp
```

### وحدات GPS — `gps`

#### وحدة GPS صغيرة للمدى الطويل

- `productId`: `matek-m10-gps`
- الاسم الأصلي: `Matek M10 GPS` — Matek
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `matek-m10-gps:standard` (الخيار الوحيد)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/matek-m10-gps/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  04-back.webp
```

#### وحدة GPS ببوصلة وهوائي رقعة 25 مم

- `productId`: `holybro-m10-gps`
- الاسم الأصلي: `Holybro Micro M10 GPS` — Holybro
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `holybro-m10-gps:standard` (الخيار الوحيد)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/holybro-m10-gps/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  04-back.webp
```

#### وحدة GPS وبوصلة بوزن 7.3 غرام

- `productId`: `flywoo-goku-gm10-pro`
- الاسم الأصلي: `Flywoo GOKU GM10 Pro V3` — Flywoo
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `flywoo-goku-gm10-pro:standard` (الخيار الوحيد)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/flywoo-goku-gm10-pro/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  04-back.webp
```

### المستقبلات — `receivers`

#### مستقبِل ExpressLRS يُضبط من المتصفّح

- `productId`: `radiomaster-rp1`
- الاسم الأصلي: `RadioMaster RP1 V2` — RadioMaster
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `radiomaster-rp1:standard` (الخيار الوحيد)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/radiomaster-rp1/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  04-back.webp
```

#### مستقبِل ExpressLRS بوزن 0.41 غرام

- `productId`: `happymodel-ep1-elrs`
- الاسم الأصلي: `HappyModel EP1 (ExpressLRS)` — HappyModel
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `happymodel-ep1-elrs:standard` (الخيار الوحيد)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/happymodel-ep1-elrs/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  04-back.webp
```

#### مستقبِل بسلسلتَي استقبال كاملتين

- `productId`: `betafpv-superd-elrs`
- الاسم الأصلي: `BetaFPV SuperD (ExpressLRS)` — BetaFPV
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (2): `betafpv-superd-elrs:ghz24` (نسخة 2.4 غيغاهرتز)، `betafpv-superd-elrs:mhz900` (نسخة 915 أو 868 ميغاهرتز)
- الصور المطلوبة: 3 لكل مجلد · المجموع 3

```text
web/public/assets/store/betafpv-superd-elrs/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
  04-back.webp
```

### الهوائيات — `antennas`

#### هوائي نظّارة عالي الكسب — لا هوائي طائرة

- `productId`: `truerc-x-air`
- الاسم الأصلي: `TrueRC X-AIR 5.8 MK II` — TrueRC
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `truerc-x-air:standard` (الخيار الوحيد)
- الصور المطلوبة: 2 لكل مجلد · المجموع 2

```text
web/public/assets/store/truerc-x-air/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
```

#### هوائي دائري الاستقطاب — اختر الموصّل والاتجاه

- `productId`: `lumenier-axii-2`
- الاسم الأصلي: `Lumenier AXII 2` — Lumenier
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (4): `lumenier-axii-2:sma-rhcp` (موصّل SMA — استقطاب يميني)، `lumenier-axii-2:sma-lhcp` (موصّل SMA — استقطاب يساري)، `lumenier-axii-2:mmcx-rhcp` (موصّل MMCX — استقطاب يميني)، `lumenier-axii-2:ufl-rhcp` (موصّل U.FL — استقطاب يميني)
- الصور المطلوبة: 2 لكل مجلد · المجموع 2

```text
web/public/assets/store/lumenier-axii-2/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
```

#### هوائي متعدّد الاتجاهات بكسب 2.6 ديسيبل

- `productId`: `foxeer-lollipop-4`
- الاسم الأصلي: `Foxeer Lollipop 4` — Foxeer
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `foxeer-lollipop-4:standard` (الخيار الوحيد)
- الصور المطلوبة: 2 لكل مجلد · المجموع 2

```text
web/public/assets/store/foxeer-lollipop-4/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
```

### الإكسسوارات — `accessories`

#### حقيبة شحن وتخزين مقاوِمة للحريق

- `productId`: `lipo-safe-bag`
- الاسم الأصلي: `LiPo Safe Bag` — عام
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `lipo-safe-bag:standard` (الخيار الوحيد)
- الصور المطلوبة: 2 لكل مجلد · المجموع 2

```text
web/public/assets/store/lipo-safe-bag/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
```

#### مراوح خمس إنشات — القطعة الأكثر استهلاكاً

- `productId`: `gemfan-hurricane-51466`
- الاسم الأصلي: `Gemfan Hurricane 51466 V2` — Gemfan
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `gemfan-hurricane-51466:standard` (الخيار الوحيد)
- الصور المطلوبة: 2 لكل مجلد · المجموع 2

```text
web/public/assets/store/gemfan-hurricane-51466/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
```

#### أحزمة تثبيت البطارية

- `productId`: `battery-strap-set`
- الاسم الأصلي: `Battery Strap Set` — عام
- الحالة: **مسودة**
- النطاق: **صورة واحدة تكفي كل الخيارات**
- الخيارات (1): `battery-strap-set:standard` (الخيار الوحيد)
- الصور المطلوبة: 2 لكل مجلد · المجموع 2

```text
web/public/assets/store/battery-strap-set/_shared/
  01-main.webp   ← إلزامية
  02-front.webp
```

## الخدمات — لا تحتاج صور منتجات

الخدمة عمل لا شيء مادي. طلب صورة لها إمّا يمنع نشرها إلى الأبد أو يدعو
إلى صورة تزيينية، وكلاهما مرفوض.

| الخدمة | `productId` | الحالة |
| --- | --- | --- |
| البرمجة والإعداد | `svc-setup-free` | منشور |
| الربط مع جهازك | `svc-binding` | منشور |
| إعداد جهاز التحكّم | `svc-edgetx` | منشور |
| إعداد نظام الفيديو | `svc-video` | منشور |
| التجميع الكامل | `svc-assembly` | منشور |
| مراجعة المشروع قبل الشراء | `svc-review` | منشور |
| اختبار وفحص | `svc-test` | منشور |

