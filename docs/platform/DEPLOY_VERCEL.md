# نشر الويب على Vercel — دليل المالك

هذا هو ملف النشر الوحيد للويب. بديلا Netlify وApp Hosting أُزيلا في المرحلة
السادسة مع كل ملفاتهما واختباراتهما — Vercel هي منصة النشر الوحيدة بقرارك
النهائي الملزم.

## ما لا أستطيع فعله من بيئتي

بوّابة الشبكة هنا ترفض الاتصال بـ`vercel.com` وبـ`supabase.com` (مُثبت عملياً:
`CONNECT 403`). فلا أستطيع النشر ولا إنشاء Preview ولا تطبيق الهجرات. الخطوات
أدناه تُنفَّذ من لوحتيك أنت، وكلها نقرات لا أسرار تُلصق في محادثة.

## الخطوة ١ — Supabase: طبّق الهجرات

Supabase → SQL Editor → شغّل ملفات `supabase/migrations/` **بالترتيب**:

| الملف | ماذا يفعل |
|---|---|
| `0001_schema.sql` | الجداول كلها، مع RLS مفعّلاً ومفروضاً وبلا سياسات (رفض كامل) |
| `0002_rls_policies.sql` | السياسات، باباً باباً — 79 تأكيداً خلفها |
| `0003_storage.sql` | أربعة Buckets وسياساتها — 59 تأكيداً |
| `0004_order_fulfilment.sql` | محور التنفيذ للطلبات |
| `0005_profile_trigger.sql` | ملف تعريف لكل حساب، تكتبه القاعدة نفسها |
| `0006_community_web.sql` | البحث، العدّادات، فترات الانتظار، حصر الأعمدة |
| `0007_store_documents.sql` | وثائق المتجر والطلبات والدفعات |

ثم Authentication → Providers: فعّل Email، وGoogle إن أردت
(Redirect URL يظهر في اللوحة نفسها).

## الخطوة ٢ — Vercel: أنشئ المشروع

1. Import من GitHub: `melyanneahmed-rgb/fpv-arabic-app`.
2. **Root Directory = `web`** — هذا هو السطر الذي يجعل كل شيء يعمل.
3. Framework: Next.js (يُكتشف تلقائياً).
4. Environment Variables (كل البيئات Production·Preview·Development):
   - `NEXT_PUBLIC_SUPABASE_URL` — من Supabase → Settings → Data API
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — من المكان نفسه
   - `SUPABASE_SECRET_KEY` — **بلا** بادئة `NEXT_PUBLIC_`، للخادم فقط.
     الخادم يحتاجه فعلاً الآن: تجميد أسعار الكتالوج، الطلبات، السجلّ، لوحة
     الإدارة كلها تمرّ به.
5. Deploy. رابط الـPreview يظهر في اللوحة فور اكتمال البناء.

`web/vercel.json` في المستودع يحمل الترويسات الأمنية وCSP الذي يسمح
بـSupabase فقط — لا تحتاج لمسه.

## الخطوة ٣ — تحقّق

- `/` تفتح، و«نسخة تجريبية» ظاهرة (لأن `NEXT_PUBLIC_SITE_URL` غير مضبوط —
  هذا صحيح ومقصود حتى يوم الربط بالنطاق).
- `/community` تعرض «قيد التجهيز» لا خطأً — قاعدة فارغة حالة سليمة.
- `/signin` ينشئ حساباً حقيقياً ويدخل به.
- `/admin` يرفض مستخدماً عادياً (403 قبل أي عرض).

## ملاحظات

- **noindex** سارٍ على كل صفحة حتى تضبط `NEXT_PUBLIC_SITE_URL` إلى
  `https://fpv-arabic.com` — لا تفعل ذلك قبل قرار الإعلان.
- **الدفع مطفأ** افتراضياً: لا `PAYMENT_PROVIDER` في البيئة = لا دفع، ويُثبت
  الـpreflight ذلك في كل تشغيل.
- **حساب المشرف الأول**: بعد إنشاء حسابك من الواجهة، في SQL Editor:
  `update public.profiles set role = 'owner' where id = '<uid من لوحة Auth>';`
  — هذا هو Bootstrap الوحيد؛ بعده كل تعيين دور يمرّ عبر اللوحة ويُسجَّل.
