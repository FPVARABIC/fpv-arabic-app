# الانتقال إلى Supabase + Vercel — المرحلة صفر: الجرد الكامل

هذا ناتج **المرحلة صفر**: جرد كل اعتماد على Firebase وNetlify في المستودع،
وخريطة «الوظيفة → موقعها → بديلها». مقيس آلياً على **1180 ملفاً**، لا مكتوب من
الذاكرة.

---

## الأرقام

```
ملفات تلمس Firebase          106
ملفات تلمس Netlify            15

استيراد firebase (عميل)       53 ملفاً
استيراد firebase-admin        10
استيراد firebase-functions     1
@firebase/rules-unit-testing  11
أوامر emulators:exec          14
قواعد Firestore/Storage       16
متغيّرات FIREBASE_*           22
متغيّرات NEXT_PUBLIC_FIREBASE_ 17
متغيّرات VITE_FIREBASE_       10
google-services                5
```

**توزيع ملفات Firebase**

| المنطقة | عدد |
|---|---|
| `src/` (الهاتف + النواة المشتركة) | 39 |
| `scripts/` (الاختبارات والهجرات) | 33 |
| `web/` | 13 |
| الجذر | 7 |
| `docs/` | 7 |
| `functions/` | 5 |
| `android/` | 2 |

---

## الخريطة: الوظيفة → موقعها → بديلها في Supabase

### الهوية والصلاحيات

| الوظيفة | موقعها الآن | البديل |
|---|---|---|
| تسجيل الدخول بـGoogle والبريد | `web/components/auth/SignInForm.tsx` · `src/contexts/AuthContext.tsx` | Supabase Auth (OAuth + email) |
| جلسة SSR بكوكي | `web/lib/server/session.ts` (`verifySessionCookie`) | `@supabase/ssr` — كوكي يُحدَّث خادمياً |
| الدور والحالة | Firestore `users.role` / `users.status` | جدول `profiles` (نوع `platform_role`) |
| الملف الشخصي | Firestore `users` | `profiles` |
| قدرات الأدوار | `src/platform/roles` + `web/lib/server/admin.ts` | نفس الجدول + سياسات RLS |

### المجتمع

| الوظيفة | موقعها الآن | البديل |
|---|---|---|
| المنشورات | Firestore `posts` | جدول `posts` |
| التعليقات | مجموعة فرعية `posts/{id}/comments` | جدول `comments` بمفتاح أجنبي |
| الإعجابات | Firestore `likes` + Cloud Functions | `post_likes` / `comment_likes` (مفتاح مركّب = منع التكرار) |
| البلاغات | Firestore `reports` | `reports` |
| الحذف الناعم | حقل `status` | `content_status` |
| الوقت الحقيقي | `onSnapshot` | Supabase Realtime |
| ترتيب الخلاصة | `feedScore` + `recomputeFeedScores` | عمود `feed_score` + مهمّة مجدولة |
| تحديد المعدّل | Firestore `rateLimits` | `rate_limits` |

### الإدارة

| الوظيفة | موقعها الآن | البديل |
|---|---|---|
| لوحة الإدارة | `web/lib/server/admin.ts` (12 دالة) · `adminRead.ts` (5) | Server Adapter + RLS |
| سجل التدقيق | Firestore `auditLog` | `audit_log` — **مغلق كلياً على العملاء** |

### المتجر

| الوظيفة | موقعها الآن | البديل |
|---|---|---|
| المنتجات | بذور في الشيفرة + Firestore `storeProducts` | `store_products` |
| المتغيّرات | داخل وثيقة المنتج | `store_variants` |
| **المورّد والتكلفة والهامش** | Firestore `storeSupply` | `store_supply` — **بلا أي سياسة عميل** |
| قرارات الكتالوج | Firestore `storeDecisions` | `store_decisions` |
| الإعدادات | `web/lib/server/storeSettings.ts` | `store_settings` |
| الشحن | `web/lib/server/storeShipping.ts` | `shipping_regions` |
| الطلبات | `web/lib/server/storeOrders.ts` | `orders` + `order_items` |
| محاولات الدفع | `web/lib/server/payments/` | `payment_attempts` |

### المشاريع

| الوظيفة | موقعها الآن | البديل |
|---|---|---|
| تعديلات الإدارة | `web/lib/server/projects.ts` | `project_overrides` (بذور في الشيفرة + دمج) |

### الوسائط

| الوظيفة | موقعها الآن | البديل |
|---|---|---|
| وسائط المجتمع | `community/posts/{uid}/{postId}/{file}` | Bucket `community-media` |
| صور المنتجات (رفع إداري) | `store/products/{productId}/{file}` | Bucket `store-products` |
| الصور الشخصية | Storage | Bucket `avatars` |
| **صور المتجر والمشاريع الثابتة** | `web/public/assets/{store,projects}/` | **تبقى كما هي في GitHub** |
| دورة حياة الوسائط | `cleanupPostMedia` | `media_objects` + `cleanup_runs` |

### الدوال السحابية السبع

| الدالة | البديل |
|---|---|
| `createComment` | دالة خادمية + `comments` |
| `toggleCommentLike` · `togglePostLike` | إدراج/حذف في جدول الإعجابات + trigger للعدّاد |
| `cleanupCommentLikes` · `cleanupPostLikes` | `on delete cascade` |
| `cleanupPostMedia` | مهمّة مجدولة تقرأ `media_objects` |
| `recomputeFeedScores` | مهمّة مجدولة على `feed_score` |

### الاختبارات — **12 مجموعة تعتمد على المحاكي**

`test:community-rules` · `test:community-functions` · `test:community-e2e` ·
`test:community-realtime` · `test:admin-dashboard-e2e` · `test:web-search-e2e` ·
`test:web-admin-e2e` · `test:web-community-e2e` · `test:feed-ranking-batch` ·
`seed:community-emulator` · وهجرتان.

كلها تُعاد كتابتها على قاعدة اختبار في Supabase.

---

## المرحلة الأولى — منجزة

`supabase/migrations/0001_schema.sql` — **20 جدولاً**، وRLS **مفعّل ومُجبَر على
كلها بلا أي سياسة**.

هذا ليس نقصاً: في PostgreSQL، تفعيل RLS بلا سياسة **يمنع كل صف عن كل دور**
عدا `service_role`. فالقاعدة بعد هذه الهجرة **كاملة ومغلقة تماماً** — ولا يوجد
أي نافذة زمنية يستطيع فيها مفتاح عام قراءة جدول التكاليف. كل باب يُفتح في
`0002` بسياسة واحدة ومعها اختبار.

**المعرّفات محفوظة**: `store_products.id` و`project_overrides.id` و`posts.id`
كلها `TEXT` تحمل نفس الـslugs الحالية — لأنها في الروابط، وفي manifest الصور،
وفي 236 مرجعاً متقاطعاً داخل المشاريع. مُعرّف `uuid` هنا كان سيكسرها كلها بصمت.

---

## ثلاثة عوائق تمنع إكمال المراحل 2–7 من هنا

**1. Supabase وVercel محجوبان عند البوّابة**

```
supabase.com      000        vercel.com       000
api.supabase.com  000        api.vercel.com   000
```

نفس الحجب الذي منع Netlify طوال الجلسات السابقة. فلا أستطيع: تطبيق الهجرات،
ولا إنشاء Buckets، ولا نشر على Vercel، ولا تشغيل أي اختبار حيّ.

**2. لا توجد أي بيانات اعتماد**

لا `SUPABASE_*` ولا `VERCEL_*` في البيئة، ولا `supabase` CLI مثبّت. وربط
Supabase بـGitHub لا يمنحني وصولاً من داخل هذه الحاوية — التكامل يعمل بين
Supabase وGitHub مباشرة، لا عبري.

**3. لا أملك اعتماد Firebase أصلاً**

وهذا يمنع **المرحلة السابعة** تحديداً: لا أستطيع تصدير البيانات الحالية ولا
عدّها. ولن أختلق أرقاماً «قبل وبعد» لبيانات لم أرها — طلبتَ صراحةً: «إذا لم
تكن هناك بيانات حقيقية، أثبت ذلك ولا تنشئ بيانات وهمية على أنها منقولة».

---

## القيم التي أحتاجها منك — واحدة في كل مرّة

سأطلبها بالصيغة التي حدّدتها حين يحين وقت استخدام كل منها. الأولى الوحيدة
المطلوبة الآن **ليست سرّاً**:

**1. `NEXT_PUBLIC_SUPABASE_URL`**

| | |
|---|---|
| **الاسم** | `NEXT_PUBLIC_SUPABASE_URL` |
| **عامة أم سرّية** | **عامة** — تصل إلى المتصفّح بحكم التصميم، والحماية في RLS لا في إخفائها |
| **أين أجدها** | Supabase → Project Settings → Data API → Project URL |
| **أين أضعها** | Vercel → Project → Settings → Environment Variables |
| **البيئات** | Production · Preview · Development |
| **لماذا الآن** | لأن اسم المشروع جزء من الـURL، وأحتاجه لكتابة إعداد العميل ولاختبار أن RLS يرفض فعلاً |

المفتاحان الآخران (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` و`SUPABASE_SECRET_KEY`)
سأطلبهما عند مرحلتيهما. **استخدم الأسماء التي تعرضها لوحتك بالضبط** — Supabase
غيّر التسميات مؤخّراً (`anon` → `publishable`، `service_role` → `secret`)،
وسأتبع ما تراه أنت لا ما أتوقّعه.

> `SUPABASE_SECRET_KEY` **لا يوضع في Vercel كمتغيّر عام أبداً**، ولا يُلصق في
> محادثة. مكانه الوحيد: Vercel → Environment Variables، بيئة الخادم فقط.

---

## ما بقي، بالترتيب

| المرحلة | الحالة |
|---|---|
| 0 — الجرد | ✅ منجزة |
| 1 — الجداول | ✅ منجزة (`0001_schema.sql`) |
| 2 — RLS والسياسات | ✅ منجزة (`0002_rls_policies.sql`) — 58 تأكيداً على PostgreSQL حقيقي |
| 3 — Buckets وسياساتها | ✅ منجزة (`0003_storage.sql`) — 59 تأكيداً |
| 4 — Backend Adapter | ✅ منجزة (`web/lib/backend/`) — 143 تأكيداً |
| 5 — نقل الويب | التالية. 13 ملفاً في `web/` + 33 اختباراً |
| 6 — نقل Android | 39 ملفاً في `src/` |
| 7 — البيانات | **محجوبة**: تحتاج اعتماد Firebase وSupabase معاً |
| تطبيق الهجرات | **محجوب**: لم تُطبَّق أي هجرة على المشروع الحقيقي بعد |
| Vercel | **محجوبة**: تحتاج وصولاً |
| إزالة Netlify | بعد نجاح Vercel، في Commit مستقل كما طلبت |

---

## المرحلتان الثالثة والرابعة — ما أُنجز بالضبط

### الثالثة: التخزين

أربعة Buckets في `supabase/migrations/0003_storage.sql`. **الأسماء اختيرت بعد
مراجعة العقود القائمة، لا قبلها**: `storage.rules` اليوم يمنح مسارين فقط —
`community/posts/{uid}/{postId}/{file}` و`store/products/{productId}/{file}` —
وكل Bucket أدناه يحفظ الشكل نفسه، فالبادئة تصير اسم Bucket والباقي يبقى حرفياً.

| Bucket | القراءة | الكتابة | الحد | الأنواع |
|---|---|---|---|---|
| `avatars` | عامة | صاحب المجلد فقط | 2 م.ب | JPEG · PNG · WebP |
| `community-media` | عامة | صاحب المجلد، بمسار `{uid}/{postId}/` بالضبط | 100 م.ب | صور + MP4 · WebM · MOV |
| `store-products` | عامة | `is_admin()` — **لا** `is_staff()` | 10 م.ب | JPEG · PNG · WebP |
| `project-images` | عامة | `is_admin()` | 10 م.ب | JPEG · PNG · WebP |

المشرف (`moderator`) **يحذف** من `community-media` ولا **يرفع** إليها: هذا
عدم تناظر مقصود — الإشراف إزالة إساءة، لا نشر محتوى.

الحدود مُعلنة على الـBucket **و** مُعاد فحصها داخل السياسات من `metadata`،
لأن الحدود المُعلنة تفرضها واجهة Storage بينما السياسات تفرضها PostgreSQL،
وواحدة فقط منهما على مسار كل وصول.

**السياسات شُغّلت فعلاً، لا قُرئت**: `npm run test:storage` يشغّل PostgreSQL 16
حقيقياً، يطبّق الهجرات الأربع، ثم يتصل بصفة كل دور ويحاول. النتيجة **59 ناجحاً،
0 راسباً**. واختبار طَفرة يثبت أنها ليست فارغة: تحويل `is_admin` إلى `is_staff`
على bucket المتجر جعل الاختبار يرسب فوراً بـ«a MODERATOR may not upload».

### الرابعة: طبقة Backend Adapter

عشرة ملفات جديدة تحت `web/lib/backend/`:

| الملف | الدور | المفتاح |
|---|---|---|
| `ports.ts` | الواجهات وحدها. **لا يستورد شيئاً على الإطلاق** | — |
| `index.ts` | يعيد تصدير `ports` فقط، لئلا يجرّ برميلٌ المفتاحَ السرّي | — |
| `supabase/env.ts` | القيمتان العامّتان | المنشور |
| `supabase/rows.ts` | تحويل الصفوف. بلا SDK، لذلك يُختبَر بمدخلات معادية | — |
| `supabase/auth.ts` | الجلسة والدور | المنشور |
| `supabase/client.ts` | كل ما يسمح به RLS للمتصفّح — قراءة وكتابة | المنشور |
| `supabase/server.ts` | **نفس** العمليات، بجلسة الطلب من الكوكيز | المنشور |
| `supabase/storage.ts` | الرفع والحذف والرابط العام | المنشور |
| `supabase/realtime.ts` | الاشتراكات — معرّف فقط، لا صف خام | المنشور |
| `supabase/admin.ts` | ما يرفضه RLS للعميل عمداً | **السرّي — `server-only`** |
| `fake/index.ts` | مزوّد كامل في الذاكرة، بلا شبكة وبلا SDK | — |

الفصل ليس «قراءة ضد كتابة» بل **أي مفتاح يحمله النداء**. `server.ts` ليس
«الأقوى» بل العكس: يبني عميلاً بالمفتاح المنشور وكوكيز الزائر، فكل استعلام
يخضع لـRLS تماماً كما يخضع في المتصفّح.

**الشرط الأهم مُنفَّذ ومُثبَت**: لا ملف واحد تحت `app/` أو `components/` يستورد
`@supabase/*`. و`SUPABASE_SECRET_KEY` يُقرأ في ملف واحد فقط، وسطره الأول
`import 'server-only'` — فأي مكوّن عميل يستورده يُفشل البناء. الاختبار يثبت
الأمرين، ويثبت أن واجهة `Backend` التي تتلقّاها الصفحة **لا تحوي `admin`**.

### ما اكتشفته الطبقة الرابعة في المخطط

`0001` أعطى `orders` عموداً واحداً للحالة، وهو محور **الدفع**. لكن لوحة
الإدارة القائمة تحرّك محوراً آخر تماماً (`ORDER_STATUS_NEXT`): وصل → مؤكَّد →
طُلب من المورد → شُحن → سُلِّم. طلب **مدفوع** قد يبقى غير مشحون أسبوعاً، وطلب
**ملغى قبل الدفع** لا يحتاج استرداداً بينما الملغى بعده يحتاجه. عمود واحد لا
يقول الأمرين.

فأُضيف `0004_order_fulfilment.sql`: عمود `fulfilment` بنوعه الخاص، وإعادة
تسمية `state` إلى `payment_state` حتى لا يُقرأ أحدهما بوصفه «الحالة». ولا
سياسة جديدة مطلوبة — سياسات `orders` تخص الصفوف لا الأعمدة، والعميل لا يملك
`UPDATE` أصلاً.

### الأرقام

```
supabase rls:      58 ناجحاً · 0 راسباً
supabase storage:  59 ناجحاً · 0 راسباً
backend adapter:  143 ناجحاً · 0 راسباً
web:typecheck      نظيف
```

أربعة اختبارات طَفرة أثبتت أن التأكيدات ليست شكلية: إضافة `admin` إلى واجهة
`Backend`، وحذف `import 'server-only'`، واستيراد SDK داخل صفحة، وإخفاء المنشور
المحذوف عن صاحبه — كلٌّ منها أسقط التأكيد المعنيّ وحده.

**لم أحذف شيئاً من Firebase ولا Netlify في هذه الدفعة**، ولم أنشر على أي منصّة،
ولم ألمس المتجر ولا الدفع ولا البوت ولا صور المنتجات.
