# الإطلاق التجريبي — ما أحتاجه منك

كل ما يمكنني بناؤه مبنيّ. ما يلي قيم **لا أستطيع إنشاءها**، لأنها تخصّ حسابك.

> **لا تلصق أي قيمة منها في المحادثة.** المفتاح الذي يمرّ في محادثة يجب اعتباره
> محروقاً وتدويره فوراً. كل قيمة تُضاف في مكانها المذكور أدناه ولا تُرسل إليّ.

---

## لماذا لا أستطيع النشر بنفسي

بوّابة الشبكة في بيئتي ترفض الاتصال بكل مزوّدي الاستضافة — Vercel وNetlify
وCloudflare وRender وFly وRailway وKoyeb — بردّ 403. خدمات Google مفتوحة، لكن
`firebase login:list` يقول «No authorized accounts»: لا اعتماد لدي.

وهذا حدّ **أمني** لا عائق هندسي: الرمز الذي ينشر إلى حسابك يجب أن يأتي منك، وإلا
لاستطاع غيري الحصول عليه بالطريقة نفسها.

---

## الخطوات — واحدة لكل سرّ

### ١. رمز النشر

| | |
|---|---|
| **الاسم** | `VERCEL_TOKEN` |
| **من أين** | <https://vercel.com/account/tokens> ← Create Token |
| **أين يُضاف** | مستودعك ← Settings ← Secrets and variables ← Actions ← New repository secret |
| **الصيغة** | `abcdefGHIJKL1234567890mnop` — سلسلة واحدة بلا بادئة |

بعدها: تبويب **Actions** ← **Deploy** ← **Run workflow**، والرابط يظهر في ملخّص
التشغيل. لا تفعّل خيار `production` — نريد Preview.

### ٢. عنوان النسخة التجريبية

| | |
|---|---|
| **الاسم** | `NEXT_PUBLIC_SITE_URL` |
| **أين يُضاف** | Vercel ← Project ← Settings ← Environment Variables ← **Preview** |
| **الصيغة** | `https://fpvarabic-abc123.vercel.app` |
| **مثال غير حقيقي** | `https://example-preview.vercel.app` |

**إلزامي للدفع**: Mollie تحتاج عنواناً تصل إليه لإرسال الـWebhook.

> ما دامت هذه القيمة **ليست** `https://fpvarabic.com`، يعتبر النظام النسخة
> تجريبية تلقائياً: الشارة تظهر، والفهرسة `noindex`، ومفتاح الإنتاج مرفوض.

### ٣. مفتاح Mollie التجريبي

| | |
|---|---|
| **الاسم** | `MOLLIE_API_KEY` |
| **من أين** | Mollie ← Developers ← API keys ← **Test API key** |
| **أين يُضاف** | Vercel ← Settings ← Environment Variables ← **Preview** |
| **الصيغة** | `test_` ثم ٣٠ حرفاً |
| **مثال غير حقيقي** | `test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |

**مفتاح `live_` سيُرفض على نسخة Staging** — النظام يرمي خطأً صريحاً بدل أن يقبله.

### ٤. Firebase — الاتصال بالمشروع نفسه

نفس مشروع التطبيق، حتى تظهر الحسابات والمنشورات والتعليقات نفسها. **لا تنشئ
مشروعاً جديداً.**

**أ. القيم العامة** (ستّ، غير سرّية، تُشحن إلى المتصفّح):

| الاسم | من أين |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase ← Project settings ← General ← Your apps ← Web app |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | نفس الشاشة |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | نفس الشاشة |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | نفس الشاشة |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | نفس الشاشة |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | نفس الشاشة |

**ب. حساب الخدمة** (ثلاث قيم — **مفاتيح رئيسية**):

| الاسم | الصيغة |
|---|---|
| `FIREBASE_PROJECT_ID` | `fpv-arabic-app` |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-xxxxx@<project>.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\nMIIE…\n-----END PRIVATE KEY-----\n` |

من: Firebase ← Project settings ← **Service accounts** ← Generate new private key.

> هذه الثلاث **تتجاوز كل قواعد Firestore وStorage**. لا تضعها في المستودع أبداً،
> ولا في متغيّر يبدأ بـ`NEXT_PUBLIC_`. عند لصق المفتاح الخاص في Vercel أبقِ
> `\n` كما هي.

### ٥. نطاق النسخة التجريبية في Firebase Auth

خطوة واحدة تُنسى دائماً فيفشل تسجيل الدخول بلا سبب واضح:

Firebase ← Authentication ← Settings ← **Authorized domains** ← Add domain ←
الصق نطاق `*.vercel.app` الخاص بنسختك.

---

## ما يحدث بعد أن تضيفها

أشغّل بنفسي، وأعطيك النتائج:

1. النشر والتحقّق من أن الرابط يفتح.
2. `npx tsx scripts/seedStaging.ts` — منتج تجريبي بـ€12.99 وأربع مناطق شحن بأسعار
   تجريبية. يرفض العمل على الإنتاج، ويُحذف كلّه بـ`--teardown`.
3. `npx tsx scripts/testMollieLive.ts` — اختبار Mollie الحقيقي.
4. رحلة شراء كاملة من المتصفّح على ٣٩٠ و٨٢٠ و١٤٤٠ بكسل.
5. Webhook حقيقي، ثم Refund كامل وجزئي، ثم سجلّ التدقيق.

---

## ما هو مضمون في النسخة التجريبية

- **`noindex`** على كل صفحة ما دام `NEXT_PUBLIC_SITE_URL` ليس النطاق الرسمي.
- **شارة «نسخة تجريبية»** فوق الترويسة في كل صفحة، غير قابلة للإغلاق.
- **رفض مفتاح `live_`** — خطأ صريح لا تعطيل صامت.
- **لا طلب حقيقي إلى مورّد**: المتجر لا يتصل بأي مورّد؛ الطلب صفّ في قاعدة
  بياناتك وحدها.
- **بيانات المورّد والهامش لا تغادر الخادم** — مفروض باختبار.
