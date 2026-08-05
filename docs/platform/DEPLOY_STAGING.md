# نشر نسخة Staging حيّة على Firebase App Hosting

هذه هي الأوامر التي تُنفَّذ **من جهازك**، لا من داخل بيئة العمل الآلية.
السبب في آخر الملف، وهو سبب واحد لا يمكن تجاوزه من هنا.

كل ما لا يحتاج إلى حسابك جاهز ومختبَر في المستودع: إعدادات الـBackend، شارة
«نسخة تجريبية»، الـnoindex على كل المسارات، تعطيل الدفع، وحالة المتجر الفارغ.

---

## قبل أن تبدأ — ما تحتاجه

| ما هو | من أين |
|---|---|
| Node 20 أو أحدث | `node -v` |
| حساب Google نفسه المالك لمشروع Firebase الخاص بتطبيق Android | — |
| خطة Blaze على المشروع | App Hosting لا يعمل على Spark. Console → ⚙ → Usage and billing |

استنسخ الفرع وثبّت الحزم:

```bash
git clone https://github.com/melyanneahmed-rgb/fpv-arabic-app.git
cd fpv-arabic-app
git checkout claude/web-platform-foundation
npm ci
npm ci --prefix web
```

---

## 1. تسجيل الدخول واختيار المشروع الصحيح

```bash
npx firebase login
npx firebase use --add
```

`firebase use --add` يعرض قائمة مشاريعك. **اختر نفس المشروع الذي يستخدمه تطبيق
Android**، وليس مشروعاً جديداً. إن لم تكن متأكداً أيّها هو:

```bash
grep project_id android/app/google-services.json
```

أعطِ الاسم المستعار `default` عندما يسأل.

ينتج عن هذا ملف `.firebaserc`. **احفظه في المستودع** — هو الملف الوحيد الذي
يربط الشيفرة بمشروعك، وغيابه هو البند الأول في تقرير `npm run preflight`:

```bash
git add .firebaserc && git commit -m "chore: bind the repository to the Firebase project"
```

تحقّق أنك على المشروع الصحيح:

```bash
npx firebase use
```

---

## 2. الأسرار الثمانية

App Hosting يقرأ كل `secret:` **قبل** أن يبدأ البناء. اسم واحد ناقص = فشل
الإطلاق كاملاً دون نشر أي شيء. لذلك تُضاف الثمانية أولاً.

الأمر واحد لكل سر، ويفتح محرّراً تلصق فيه القيمة **في طرفيّتك، لا في محادثة**:

```bash
npx firebase apphosting:secrets:set <اسم السر>
```

| اسم السر | من أين تأتي القيمة |
|---|---|
| `fpvarabic-web-api-key` | Console → ⚙ Project settings → General → Your apps → Web app → `apiKey` |
| `fpvarabic-web-auth-domain` | نفس اللوحة → `authDomain` (بصيغة `<project>.firebaseapp.com`) |
| `fpvarabic-project-id` | نفس اللوحة → `projectId` |
| `fpvarabic-storage-bucket` | نفس اللوحة → `storageBucket` |
| `fpvarabic-messaging-sender-id` | نفس اللوحة → `messagingSenderId` |
| `fpvarabic-web-app-id` | نفس اللوحة → `appId` |
| `fpvarabic-admin-client-email` | Console → ⚙ → Service accounts → Generate new private key → الحقل `client_email` داخل ملف JSON |
| `fpvarabic-admin-private-key` | نفس ملف JSON → الحقل `private_key` كاملاً |

**إن لم يكن هناك تطبيق ويب مسجَّل بعد** (الستة الأولى غير موجودة): Console → ⚙
Project settings → General → Your apps → أيقونة `</>` → سجّل تطبيق ويب باسم
`FPVARABIC Web`. هذا **لا ينشئ مشروعاً جديداً** ولا قاعدة بيانات جديدة — هو
تسجيل واجهة إضافية على نفس المشروع، وهو المطلوب بالضبط حتى يقرأ الهاتف والويب
نفس Firestore.

### تحذيران

**`fpvarabic-admin-private-key`** هو مفتاح حساب الخدمة. هذا المفتاح يتجاوز كل
قواعد Firestore وStorage بحكم تصميمه — لا تلصقه في أي محادثة، ولا في أي ملف
داخل المستودع. الأمر أعلاه يضعه في Secret Manager مباشرة.

**الصيغة**: القيمة تبدأ بـ`-----BEGIN PRIVATE KEY-----` وتنتهي بـ
`-----END PRIVATE KEY-----`. الصقها كما هي بأسطرها، لا تحوّل أسطرها إلى `\n`
يدوياً — المحرّر الذي يفتحه الأمر يقبل الأسطر الحقيقية.

بعد إضافة الثمانية:

```bash
npx firebase apphosting:secrets:describe fpvarabic-web-api-key
```

---

## 3. إنشاء الـBackend

```bash
npx firebase apphosting:backends:create \
  --primary-region us-central1 \
  --root-dir web \
  --backend fpvarabic-staging
```

عندما يسأل:

| السؤال | الإجابة |
|---|---|
| Repository | `melyanneahmed-rgb/fpv-arabic-app` (يطلب ربط GitHub أول مرة) |
| Branch | `claude/web-platform-foundation` |
| Automatic rollouts | `No` — أنت من يقرّر متى يُنشر |

> **الجذر هو `web` وليس جذر المستودع.** ملف `apphosting.yaml` يُقرأ من هذا
> المجلد، وهناك يوجد.

---

## 4. النشر

```bash
npx firebase apphosting:rollouts:create fpvarabic-staging \
  --git-branch claude/web-platform-foundation
```

البناء يستغرق عادة من 6 إلى 12 دقيقة. عند نجاحه يطبع الرابط بالصيغة:

```
https://fpvarabic-staging--<project-id>.us-central1.hosted.app
```

**هذا هو الرابط الحي.**

### لماذا لا يوجد خيار لاختيار ملف Staging

`apphosting:rollouts:create` لا يملك خيار `--config`؛ خياراته الوحيدة هي
`--git-branch` و`--git-commit` و`--force`. الـbackend يقرأ `apphosting.yaml`،
وملف `apphosting.<اسم البيئة>.yaml` يُدمج **فوقه** مفتاحاً بمفتاح عند ضبط اسم
بيئة للـbackend من الـConsole.

وهذا لا يهمّك في هذا الإطلاق: **`apphosting.yaml` وحده يُنتج نسخة Staging
كاملة وآمنة**، لأن `NEXT_PUBLIC_SITE_URL` غير معرَّف فيه بعد. النتيجة:

* الشارة «نسخة تجريبية» تظهر (متغيّر غير معرَّف = نسخة تجريبية، وهذا هو
  الاتجاه الآمن المقصود).
* `noindex` على كل مسار، وrobots.txt يمنع كل زاحف.
* الدفع معطَّل لأنه لا يوجد مفتاح.

يوجد `apphosting.staging.yaml` لتثبيت هذه الخيارات صراحةً إن أنشأت لاحقاً
backend دائماً للـStaging بجانب الإنتاج. لا تحتاجه اليوم.

الملف `scripts/testStaging.ts` يثبّت هذا السلوك بأربع تأكيدات تقرأ
`apphosting.yaml` نفسه وتمرّر قيمه إلى الدوال الحقيقية.

---

## 5. خطوة إلزامية واحدة قبل أن يعمل تسجيل الدخول

Firebase Authentication يرفض أي نطاق غير مُصرَّح به، وسيفشل تسجيل الدخول
برسالة `auth/unauthorized-domain` حتى تُضاف:

**Console → Authentication → Settings → Authorized domains → Add domain**

أضف النطاق **بدون** `https://`:

```
fpvarabic-staging--<project-id>.us-central1.hosted.app
```

---

## 6. التحقق من أن كل شيء يعمل

بدّل `$URL` برابطك.

```bash
URL=https://fpvarabic-staging--<project-id>.us-central1.hosted.app

# الموقع يفتح
curl -sS -o /dev/null -w "%{http_code}\n" "$URL"                    # 200

# noindex على كل مسار — وليس على /admin فقط
curl -sSI "$URL"            | grep -i x-robots-tag                  # noindex, nofollow, noarchive
curl -sSI "$URL/kb"         | grep -i x-robots-tag                  # نفسها
curl -sS   "$URL/robots.txt"                                        # Disallow: /

# شارة «نسخة تجريبية» على كل صفحة
curl -sS "$URL" | grep -o 'نسخة تجريبية[^<]*'

# الإدارة محميّة من زائر غير مسجَّل
curl -sS -o /dev/null -w "%{http_code}\n" "$URL/admin"              # 307 إلى /signin
```

ثم في المتصفّح:

| ما تختبره | ما يجب أن تراه |
|---|---|
| تسجيل الدخول | نفس حسابك من تطبيق الهاتف يعمل — نفس المشروع، نفس المستخدمين |
| المجتمع | نفس المنشورات التي تراها في التطبيق (نفس Firestore) |
| التعليقات | تعليق تكتبه هنا يظهر في التطبيق، والعكس |
| `/admin` بحساب عادي | تحويل أو رفض — لا وصول |
| `/admin` بحساب إداري | اللوحة تفتح |
| المتجر | «المتجر قيد التجهيز» — وهذا صحيح، لا خطأ |
| السلة والـCheckout | تعمل حتى خطوة الدفع، وهناك «الدفع غير مفعّل» |
| البحث والموسوعة والبرامج والمشاريع | كاملة — لا تحتاج صورة ولا سعر |

---

## ما هو معطَّل عمداً في هذه النسخة

| الشيء | الحالة | لماذا |
|---|---|---|
| الفهرسة في Google | مغلقة على كل مسار | ثلاث طبقات: ترويسة `X-Robots-Tag`، و`robots.txt`، ووسم `<meta name="robots">` |
| الدفع | معطَّل | لا يوجد `MOLLIE_API_KEY` في الإعداد إطلاقاً. الغياب هو المفتاح — لا متغيّر يمكن ضبطه خطأً |
| Mollie Production | مستحيل | `paymentProvider()` يرمي خطأً إن بدأ المفتاح بـ`live_` والنسخة Staging |
| المنتجات | صفر منشور | النشر مشروط بسعر مسجَّل، ولا توجد تكاليف موردين بعد |
| الصور | صفر من 388 | المجلدات جاهزة تحت `web/public/assets/store` |

---

## ما تبقّى قبل الإعلان العام

1. رفع صور المنتجات (`docs/store/PRODUCT_IMAGE_MANIFEST.md`).
2. إدخال تكاليف الموردين ثم نشر المنتجات.
3. إضافة مفتاح Mollie `test_` وتجربة طلب كامل.
4. ربط النطاق `fpvarabic.com` والنشر بـ`apphosting.yaml` بدل ملف Staging.
5. ضبط `NEXT_PUBLIC_SITE_URL` على النطاق النهائي — هو وحده ما يسمح بالفهرسة.

---

## لماذا لا تُنفَّذ هذه الأوامر من بيئة العمل الآلية

ليست مشكلة شبكة: نطاقات Google تستجيب من داخل الحاوية.

```
firebase.googleapis.com          → 200/404 (يصل)
secretmanager.googleapis.com     → 200/404 (يصل)
```

المشكلة أن `firebase-tools` غير مسجَّل دخول، وليس هناك أي اعتماد يمكنه استخدامه:

```
$ npx firebase login:list
⚠  No authorized accounts, run "firebase login"

$ npx firebase projects:list
Failed to authenticate, have you run firebase login?

$ env | grep -E 'FIREBASE_TOKEN|GOOGLE_APPLICATION_CREDENTIALS'
(لا شيء)
```

و`firebase login` يتطلّب متصفّحاً وموافقة OAuth بشرية. البديل الوحيد هو تمرير
رمز أو مفتاح حساب خدمة إلى الحاوية — وهذا يعني منح وصول كامل ودائم إلى مشروع
Firebase عبر المحادثة، وهو ما طلبتَ صراحةً ألّا يحدث.

لذلك: الأوامر أعلاه قصيرة ومحدّدة، وكل ما لا يحتاج إلى حسابك مُنجَز ومختبَر
داخل المستودع.
