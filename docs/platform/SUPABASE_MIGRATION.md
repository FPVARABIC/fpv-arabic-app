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
| 2 — RLS والسياسات | التالية. لا تحتاج وصولاً حيّاً — SQL في المستودع |
| 3 — Buckets وسياساتها | تليها. SQL كذلك |
| 4 — Backend Adapter | شيفرة، بلا وصول حيّ |
| 5 — نقل الويب | 13 ملفاً في `web/` + 33 اختباراً |
| 6 — نقل Android | 39 ملفاً في `src/` |
| 7 — البيانات | **محجوبة**: تحتاج اعتماد Firebase وSupabase معاً |
| Vercel | **محجوبة**: تحتاج وصولاً |
| إزالة Netlify | بعد نجاح Vercel، في Commit مستقل كما طلبت |

**لم أحذف شيئاً من Firebase ولا Netlify في هذه الدفعة**، ولم أنشر على أي منصّة،
ولم ألمس المتجر ولا الدفع ولا البوت ولا صور المنتجات.
