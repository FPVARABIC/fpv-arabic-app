# نشر FPVARABIC على Netlify — نسخة Staging كاملة

الهدف المعلن: **لا يُعدّ النشر ناجحاً إذا عملت الرئيسية وتعطّل المجتمع.**
هذا الملف مكتوب حول تلك الجملة، لأن الإعداد الذي أعطيتَه كان سيُنتج بالضبط تلك
النتيجة — مرّتين، ولسببين مختلفين تماماً.

كلاهما مثبت بالتشغيل في آخر الملف، لا بالقراءة.

---

## صفر: لماذا كانت الصفحة بيضاء — السبب الجذري

**`netlify.toml` في جذر المستودع لم يُقرأ أصلاً.**

عندما يُضبط **Base directory** من لوحة Netlify، يبحث Netlify عن `netlify.toml`
**داخل ذلك المجلد**. أنت ضبطتَه على `web`، ولم يكن هناك `web/netlify.toml` —
فسقط كل ما في الملف الجذري: تثبيت تبعيات الجذر، وplugin الـNext، واستثناء فاحص
الأسرار.

فنُفِّذت إعدادات اللوحة الخام: `npm run build` داخل `web/` بتبعيات `web` وحدها.
وهذا يفشل — وقد أثبتُّه بإخفاء `node_modules` الجذري:

```
Error: Turbopack build failed with 10 errors:
  Cannot find module 'tailwindcss'
  Module not found: Can't resolve 'browser-image-compression'
  Module not found: Can't resolve 'firebase/app'
```

والبناء الفاشل **لا ينشر شيئاً**، فيبقى الموقع يخدم النشر السابق له — وهو
النشر الذي أنتجه Netlify يوم أنشأتَ الموقع، حين اكتشف تلقائياً تطبيق **Vite في
جذر المستودع**. ذاك التطبيق هو واجهة الهاتف (Android)، وعند تقديمه كموقع بلا
قيم `VITE_FIREBASE_*` يعرض شاشة بيضاء تماماً:

```ts
// src/lib/firebase.ts — على نطاق الوحدة، لا داخل دالة
export const firebaseApp  = initializeApp(cfg);
export const firebaseAuth = getAuth(firebaseApp);   // ← يرمي هنا
```

مثبت بالتشغيل:

```
initializeApp  : OK (لا يتحقّق من القيم)
getAuth        : THREW — FirebaseError: Firebase: Error (auth/invalid-api-key)
```

الرمية تحدث أثناء تقييم الوحدات، أي **قبل** `createRoot`. فلا يُركَّب React،
ويبقى `<div id="root"></div>` فارغاً. لا رسالة، لا خطأ ظاهر — صفحة بيضاء.

**ولم يكن تطبيق Next مسؤولاً عن ذلك إطلاقاً.** شغّلتُ دالة Netlify المولَّدة
فعلياً وطلبتُ منها `/`:

```
STATUS   : 200
BODYBYTES: 70444
BODYHEAD : <!DOCTYPE html><html lang="ar" dir="rtl">…
```

### الإصلاح

1. `web/netlify.toml` — النسخة التي يقرؤها موقع قاعدته `web`. بلا `base` (فهو
   بالفعل داخله؛ إعلانه ثانيةً يعطي `web/web`).
2. `netlify.toml` الجذري بقي — وهو ما يُقرأ إن كانت خانة Base فارغة، ويعلن
   `base = "web"` فيصحّح نفسه.
3. `index.html` الجذري صار يشخّص نفسه: إن بقي `#root` فارغاً بعد التحميل، يعرض
   سبب التوقّف ونصّ الخطأ بدل لا شيء. الشاشة البيضاء الصامتة لم تعد ممكنة.
4. `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` و`PUPPETEER_SKIP_DOWNLOAD` — تثبيت الجذر
   يسحب `playwright` (تبعية إنتاج بسبب سكربتات مراجعة الواجهة)، وتنزيل
   المتصفّحات وحده كان يمكن أن يُفشل البناء.

### الدورة الثانية: خطأ MIME

بعد الإصلاح الأول ظهر في الـConsole:

```
Failed to load module script: Expected a JavaScript-or-Wasm module script
but the server responded with a MIME type of "application/octet-stream".
```

الملف المرفوض هو `/src/main.tsx` — وهو **ملف مصدر**، لا يوجد في أي مخرجات
بناء، بل في المستودع وحده. أي أن Netlify كان ينشر **المستودع نفسه بلا بناء**:
`index.html` الخام الذي يطلب `/src/main.tsx`، وهو ما لا ينفّذه أي متصفّح.

فأُضيف حارس يمنع ذلك من المستودع نفسه:

**`web/netlify/plugins/verify-publish/`** — إضافة Netlify محلّية تعمل بعد
البناء، تفحص المجلد الذي **سيُنشر فعلاً**، وتُفشل البناء إن لم يكن تطبيق Next.
والبناء الفاشل يُبقي النشر السابق حيّاً، وهو أفضل من نشر موقع لا يعمل.

ترفض:

| الحالة | الرسالة |
|---|---|
| لا يوجد `_next/static/` | ليس بناء Next أصلاً |
| أي ملف `.ts` / `.tsx` / `.jsx` | مصدر يُقدَّم للمتصفّح بنوع يرفض تنفيذه |
| `src/main.tsx` | تطبيق Vite يُنشر كموقع |
| HTML يشير إلى `.tsx` | الغلاف الخاطئ |
| `package.json` أو `.env` في المنشور | ملفات مستودع لا يجوز تنزيلها |

مثبت بالضبطين: يرفض إعادة بناء الحالة الحيّة (خمسة أسباب، منها `src/main.tsx`
وغياب `_next/static`)، ويقبل مجلد النشر الحقيقي (56 أصلاً). وشُغِّل داخل خطّ
Netlify الحقيقي حتى النهاية:

```
[verify-publish] checking .next
[verify-publish] 160 file(s), 56 under _next/static, 0 html, 0 source file(s)
[verify-publish] OK — this is the Next.js app, with no source files
Netlify Build Complete    EXIT=0
```

### إثبات أيّ تطبيق أجاب

أُضيف رأس مؤقّت. سطر واحد يكفي:

```bash
curl -sI https://<اسمك>.netlify.app/ | grep -i x-fpvarabic
# X-FPVARABIC-Surface: next-web
```

ظهوره يعني أن تطبيق Next أجاب. غيابه يعني أن شيئاً آخر يُقدَّم. قل لي عند
التأكّد وأحذفه — هو مُعلَّم في كلا ملفَّي `netlify.toml` بسطر واحد.

### موقع جديد إن لزم

إن بقي الموقع الحالي عالقاً بإعدادات قديمة: أنشئ موقعاً جديداً، اختر المستودع،
والفرع `claude/web-platform-foundation`، ثم **Deploy** — **ولا تملأ أي خانة**.
`netlify.toml` الجذري يعلن `base = "web"` وكل ما يلزم، فيصحّح الموقع نفسه.

### ما عليك فعله الآن

**Deploys → Trigger deploy → Clear cache and deploy site.** ضغطة واحدة، لا
غير: ملفات الإعداد تتجاوز إعدادات اللوحة في الحالتين — الخانة فارغة أو `web`.

---

## أولاً: العطلان اللذان كانا سيقتلان المجتمع

### 1. البناء نفسه كان سيفشل عند المجتمع بالذات

`Base directory: web` يجعل Netlify يثبّت `web/package.json` **وحده**. لكن
`firebase` — حزمة العميل — غير موجودة فيه عمداً؛ هي في `package.json` الجذري،
والسطح الويبي والنواة المشتركة يصلان إليها بالصعود إلى `node_modules` الجذري.
السبب موثّق في `web/next.config.ts`: نسخة ثانية تحت `web/node_modules` لا
تفهمها النسخة الأولى، فيُبنى مقبض Storage بإحداهما ولا تتعرّف عليه الأخرى،
ويرمي أول رفع صورة `Cannot read properties of undefined (reading 'path')` بعد
أن ينجح الـtypecheck والـlint والبناء كلها.

Netlify لا يُنشئ `node_modules` الجذري لأن لا شيء طلب منه ذلك. أخفيتُ المجلد
الجذري وشغّلتُ أمر البناء الذي أعطيتَه:

```
$ npm run build          # داخل web/ بلا node_modules جذري
Error: Turbopack build failed with 10 errors:
  Cannot find module 'tailwindcss'
  Module not found: Can't resolve 'browser-image-compression'
  Module not found: Can't resolve 'firebase/app'          ← web/lib/firebaseClient.ts
EXIT=1
```

الملفات التي تستورد هذه الحزم هي: `web/components/auth/SignInForm.tsx` و
`web/lib/communityWrites.ts` و`web/lib/firebaseClient.ts` وكامل
`src/components/Community/` — أي **تسجيل الدخول والنشر والتعليق والوسائط**.
الصفحات الثابتة كانت ستُبنى بلا مشكلة.

**الحل**: ملف `netlify.toml` في جذر المستودع. وجوده يتجاوز إعدادات اللوحة،
ويحتفظ بنفس قيمك مضافاً إليها تثبيت الجذر:

```toml
[build]
  base    = "web"
  command = "(cd .. && npm ci --no-audit --no-fund) && npm run build"
  publish = ".next"
```

نفس الأمر بالضبط، من جذر نظيف، ينجح في **73 ثانية**.

### 2. الأسرار الخادمية ثلاثة، لا اثنان

طلبتَ قيمتين خادميتين: `client email` و`private key`. لكن `firebaseAdmin.ts`
لا يبني الاعتماد إلا إذا توفّرت **الثلاثة**:

```ts
(projectId && clientEmail && privateKey) ? initializeApp({ credential: cert(…) })
                                         : initializeApp();   // ADC
```

وعلى Netlify لا يوجد ADC. فإن أضفتَ اثنين فقط، تصير `isAdminConfigured()` تساوي
`false`، وهذه نتيجتها المباشرة في الشيفرة:

| الملف | السطر | ما يحدث |
|---|---|---|
| `web/lib/server/session.ts` | `if (!isAdminConfigured()) return null` | **لا أحد يُسجَّل دخوله على الخادم أبداً** |
| `web/lib/server/community.ts` | نفس الحارس | **المجتمع يعرض صفر منشور** رغم امتلاء Firestore |
| `web/lib/server/communitySearch.ts:68` | `return []` | البحث في المجتمع لا يجد شيئاً |
| `web/lib/server/projects.ts:36` | `return {}` | حالة نشر المشاريع تختفي |

أي: الرئيسية تعمل، والموسوعة تعمل، والمجتمع ميت. **`FIREBASE_PROJECT_ID` ليس
اختيارياً.**

---

## ثانياً: المتغيّرات — تسعة، واحداً واحداً

`Netlify → Project configuration → Environment variables → Add a variable`

الأسماء أدناه هي التي تقرؤها الشيفرة حرفياً (مستخرَجة من `process.env.*`)، ولم
أغيّر منها شيئاً.

### أ. القيم العامة — مسموح لها بالمتصفّح

الستة تأتي كلها من مكان واحد:
**Console → ⚙ Project settings → General → Your apps → تطبيق الويب → Config**

إن لم يكن هناك تطبيق ويب مسجَّل: في نفس اللوحة اضغط `</>` وسجّل تطبيقاً باسم
`FPVARABIC Web`. **هذا لا يُنشئ مشروعاً جديداً ولا قاعدة بيانات جديدة** — هو
تسجيل واجهة إضافية على نفس المشروع، وهو ما يجعل الهاتف والويب يقرآن نفس
Firestore.

| الاسم | الحقل في Config | مثال للصيغة |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` | `AIzaSy…` (39 محرفاً) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` | `<project>.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` | `<project>` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `storageBucket` | `<project>.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` | 12 رقماً |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `appId` | `1:…:web:…` |

> **هذه ليست أسراراً، وظهورها في حزمة المتصفّح مقصود.** المتصفّح يحتاجها ليفتح
> اتصالاً أصلاً؛ الحماية في `firestore.rules` و`storage.rules`، لا في إخفاء
> مفتاح يراه كل زائر. لهذا `netlify.toml` يستثنيها من فاحص أسرار Netlify
> بالاسم — ستّة أسماء مذكورة واحداً واحداً، **لا** بنمط عام، لأن النمط العام
> كان سيستثني معه المفتاح الخاص.

### ب. القيم الخادمية — ثلاثة، سرّية

من: **Console → ⚙ Project settings → Service accounts → Generate new private key**
(يُنزِّل ملف JSON — لا ترفعه إلى أي مستودع ولا تلصقه في أي محادثة)

| الاسم | الحقل في ملف JSON |
|---|---|
| `FIREBASE_PROJECT_ID` | `project_id` |
| `FIREBASE_CLIENT_EMAIL` | `client_email` |
| `FIREBASE_PRIVATE_KEY` | `private_key` كاملاً |

**عن `FIREBASE_PRIVATE_KEY`**: الصقه كما هو من ملف JSON. الشيفرة تفعل
`.replace(/\\n/g, '\n')`، فتقبل الصيغتين — الأسطر الحقيقية أو `\n` النصّية.
يبدأ بـ`-----BEGIN PRIVATE KEY-----` وينتهي بـ`-----END PRIVATE KEY-----`.

**هذا المفتاح يتجاوز كل قواعد Firestore وStorage بحكم تصميمه.** تسريبه هو
اختراق كامل لبيانات المشروع.

### ج. النطاقات (Scopes)

إن أظهرت لوحتك خانة **Scopes** لكل متغيّر:

| المجموعة | المطلوب | لماذا |
|---|---|---|
| الستة `NEXT_PUBLIC_*` | **Builds** + **Functions** | تُدمَج في الحزمة وقت البناء، ويقرؤها الخادم أيضاً |
| الثلاثة الخادمية | **Functions** فقط | نصف Next الخادمي يعمل كـFunctions على Netlify. لا تمنحها Builds إن استطعت — كلّما قلّ المكان الذي تمرّ به قلّت فرص التسريب |

إن لم تظهر الخانة (الخطة المجانية)، فكل المتغيّرات متاحة لكل النطاقات، وهذا
مقبول: `scripts/testClientBundleSecrets.ts` يثبت أن القيم الخادمية لا تصل إلى
المتصفّح بغضّ النظر عن النطاق.

### د. ما يجب ألّا تضيفه

| المتغيّر | لماذا لا |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | ضبطه على النطاق الرسمي يجعل النسخة تُفهرَس. اتركه غائباً ← `noindex` |
| `MOLLIE_API_KEY` | غيابه هو مفتاح الإطفاء. الدفع معطَّل برسالة «الدفع غير مفعّل» |
| `STAGING` و`PAYMENT_PROVIDER` | مضبوطان في `netlify.toml` — مراجَعان في الـdiff بدل أن يكونا شيئين تتذكّرهما |

---

## ثالثاً: بعد أول نشر ناجح — خطوة إلزامية

انسخ اسم النطاق **بدون** `https://` وبدون شرطة مائلة، مثل:

```
fpvarabic.netlify.app
```

وأضفه في: **Firebase Console → Authentication → Settings → Authorized domains**

بدونها يفشل كل تسجيل دخول بـ`auth/unauthorized-domain`. أضِف أيضاً نطاق
المعاينات إن أردت اختبار فروع: `deploy-preview--<site>.netlify.app`.

---

## رابعاً: الاختبارات الاثنا عشر

### ما يمكن التحقق منه من سطر الأوامر

```bash
URL=https://<اسمك>.netlify.app

curl -sS -o /dev/null -w "%{http_code}\n" "$URL"            # 200
curl -sSI "$URL"     | grep -i x-robots-tag                 # noindex, nofollow, noarchive   (12)
curl -sSI "$URL/kb"  | grep -i x-robots-tag                 # نفسها على كل مسار
curl -sS  "$URL/robots.txt"                                 # Disallow: /
curl -sS  "$URL" | grep -o 'نسخة تجريبية[^<]*'               # الشارة                        (12)
curl -sS -o /dev/null -w "%{http_code}\n" "$URL/admin"      # 307 إلى /signin               (8)
curl -sS  "$URL/store" | grep -o 'المتجر قيد التجهيز'         # حالة تجهيز لا خطأ
```

**التحقّق من عدم تسريب الأسرار (11)** — الفحص الحقيقي محلي، لأنه يفحص كل ملف
تبنيه الحزمة لا الصفحة الأولى فقط:

```bash
npm run test:bundle-secrets
```

يبني `web/` بقيم طُعم فريدة ثم يفحص **2531 ملفاً** يصل إلى المتصفّح
(51 حزمة JS + 260 صفحة HTML بحمولة RSC). يؤكّد الاتجاهين: القيم العامة الستّ
**موجودة** (وهذا هو الضابط — بدونه «لم أجد أسراراً» قد تعني «لم أفحص شيئاً»)،
والقيم الخادمية **غائبة تماماً**، ولا ترويسة PEM ولا عنوان حساب خدمة ولا مفتاح
Mollie في أي منها.

### ما يتطلّب متصفّحاً وحسابات حقيقية

| # | الاختبار | كيف |
|---|---|---|
| 1 | دخول مستخدم حقيقي | بنفس حسابك من تطبيق Android — Google والبريد |
| 2 | ظهور منشورات التطبيق | افتح `/community` وقارن العدد بالتطبيق |
| 3 | منشور من الويب يظهر في التطبيق | انشر ثم حدّث التطبيق |
| 4 | تعليق من الويب يظهر في التطبيق | علّق ثم افتح المنشور في التطبيق |
| 5 | رفع صورة وقواعد Storage | أرفق صورة بمنشور |
| 6 | رفض الكتابة باسم مستخدم آخر | تُفرض في `firestore.rules`، ومغطّاة بـ`npm run test:community-rules` على المحاكي |
| 7 | وصول الإدارة | بحساب دوره `admin` أو `owner` |
| 8 | رفض المستخدم العادي | بحساب عادي على `/admin` |
| 9 | البحث في المجتمع | من حقل البحث في الترويسة |
| 10 | الخروج وإبطال الجلسة | سجّل خروجاً ثم أعد تحميل صفحة محمية |

---

## خامساً: ما لم أستطع تنفيذه، وسببه الدقيق

**لم أنشر بنفسي.** `api.netlify.com` لا يُستجيب من داخل هذه الحاوية:

```
$ curl -o /dev/null -w "%{http_code}" https://api.netlify.com/api/v1/sites
000
```

و`netlify-cli` يحتاج رمز وصول شخصياً على أي حال — وهو ما طلبتَ ألّا يمرّ عبر
المحادثة. لذلك الاختبارات 1–5 و7–10 تحتاج متصفّحك وحساباتك؛ لا يمكن لأحد
تنفيذها نيابة عنك دون اعتمادك.

**ما تحقّقت منه فعلاً بالتشغيل، لا بالقراءة:**

| ما | النتيجة |
|---|---|
| أمر بناء `netlify.toml` من جذر نظيف | نجح في 73 ثانية |
| أمر البناء الذي أعطيتَه بلا `netlify.toml` | فشل بعشرة أخطاء، أوّلها `firebase/app` |
| القيم الخادمية في حزمة المتصفّح | صفر — عبر 2531 ملفاً، مع ضابط موجب |
| الشارة على الصفحات المبنية | 259/259 (الاستثناء الوحيد صفحة خطأ Next نفسها، وهي تستبدل الـlayout الجذري بحكم التصميم) |
| `noindex` في مخرجات البناء | ثلاث طبقات: ترويسة، `<meta>`، `robots.txt` |
| الدفع | معطَّل بالغياب — لا مفتاح Mollie في أي ملف |

**خطر واحد لا أستطيع نفيه من هنا**: هذا المشروع على Next 16.2.12، وهي إصدارة
حديثة. لا أستطيع التحقّق من أن `@netlify/plugin-nextjs` المثبَّت لدى Netlify
يدعمها، لأن الشبكة لا تصل إليهم. إن فشل البناء برسالة تخصّ الـplugin أو ظهرت
الصفحات ثابتة والأجزاء التفاعلية 404، فذلك سببه — أرسل لي سجلّ البناء وأعالجه.
