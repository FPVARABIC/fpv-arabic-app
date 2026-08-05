# النشر على Firebase — الدليل التنفيذي

> كل ما يلي تشغّله **أنت** من جهازك. لا يملك هذا البيئة اعتماداً لـFirebase
> (`firebase projects:list` يفشل على المصادقة)، ولا يستطيع الوصول إلى مزوّدي
> الاستضافة، فالنشر لا يمكن أن يتمّ من هنا.

---

## قبل كل شيء: تحقّق من الجاهزية

```bash
npx tsx scripts/preflightDeploy.ts
```

يفصل ثلاثة أنواع:

| النوع | المعنى |
| --- | --- |
| **BLOCKER** | النشر معه غير آمن أو مكسور. يوقف التنفيذ. |
| **MISSING** | قيمة أو عمل لا يملكه إلا أنت. ليس خطأً. |
| **NOTE** | معلومة صحيحة لا تعترض الطريق. |

يفحص من بين ما يفحص: أن **لا مفتاح خاص في المستودع** (١٣٨٠ ملفاً)، وأن
`FIREBASE_PRIVATE_KEY` ليست مُعلَّمة `BUILD` — لأن قيمة `BUILD` تُدمج داخل
JavaScript يقرأه أي زائر.

---

## لماذا App Hosting وليس Hosting

الموقع **ليس ساكناً**: ٢٦ صفحة `force-dynamic`، و١٤ وحدة خادمية تستعمل
Admin SDK، والدفع يعمل بـserver actions، وwebhook الدفع مسار خادمي.

`firebase deploy --only hosting` يرفع قشرةَ موقعٍ كل جزء تفاعلي فيه يعطي 404.
والـpreflight يوقفك إن ظهر `hosting` في `firebase.json`.

---

## الخطوات

### ١. اختر المشروع — مرّة واحدة

```bash
npx firebase login
npx firebase use --add
```

اختر **نفس المشروع الذي يستعمله تطبيق الهاتف**. مشروع منفصل يعني مجتمعاً
منفصلاً وحسابات منفصلة، وهو ما رفضتَه صراحةً.

يُنشئ `.firebaserc` — التزمه.

### ٢. أنشئ الأسرار — مرّة واحدة لكل سرّ

كل سطر أمر واحد. يسألك عن القيمة ولا تظهر في أي ملف ولا في أي محادثة.

```bash
npx firebase apphosting:secrets:set fpvarabic-web-api-key
npx firebase apphosting:secrets:set fpvarabic-web-auth-domain
npx firebase apphosting:secrets:set fpvarabic-project-id
npx firebase apphosting:secrets:set fpvarabic-storage-bucket
npx firebase apphosting:secrets:set fpvarabic-messaging-sender-id
npx firebase apphosting:secrets:set fpvarabic-web-app-id
npx firebase apphosting:secrets:set fpvarabic-admin-client-email
npx firebase apphosting:secrets:set fpvarabic-admin-private-key
```

#### من أين تأتي كل قيمة

**الستّة العامّة** — من: Firebase Console ← ⚙️ Project settings ← **General**
← Your apps ← Web app ← Config.

| اسم السرّ | الحقل في Console | قيمة نموذجية **غير حقيقية** |
| --- | --- | --- |
| `fpvarabic-web-api-key` | `apiKey` | `AIzaSyEXAMPLE-not-a-real-key-000000000` |
| `fpvarabic-web-auth-domain` | `authDomain` | `example-app.firebaseapp.com` |
| `fpvarabic-project-id` | `projectId` | `example-app` |
| `fpvarabic-storage-bucket` | `storageBucket` | `example-app.firebasestorage.app` |
| `fpvarabic-messaging-sender-id` | `messagingSenderId` | `000000000000` |
| `fpvarabic-web-app-id` | `appId` | `1:000000000000:web:0000000000000000000000` |

هذه الستّة **ليست أسراراً** بالمعنى الأمني — تُشحن إلى المتصفّح بالتصميم،
والحماية في `firestore.rules` و`storage.rules` لا في إخفائها. وُضعت في Secret
Manager لأن مكاناً واحداً لكل القيم أبسط من مكانين.

**الاثنان الخاصّان** — من: Firebase Console ← ⚙️ Project settings ←
**Service accounts** ← *Generate new private key* ← يُنزَّل ملف JSON.

| اسم السرّ | الحقل في ملف JSON | قيمة نموذجية **غير حقيقية** |
| --- | --- | --- |
| `fpvarabic-admin-client-email` | `client_email` | `firebase-adminsdk-xxxxx@example-app.iam.gserviceaccount.com` |
| `fpvarabic-admin-private-key` | `private_key` | `-----BEGIN PRIVATE KEY-----\nMIIE…\n-----END PRIVATE KEY-----\n` |

> **هذا المفتاح يتجاوز كل قواعد Firestore وStorage بالتصميم. هو مفتاح رئيسي.**
> لا ترفع ملف JSON إلى المستودع. لا تلصقه في محادثة. إن تسرّب: أبطِله من نفس
> الشاشة وأنشئ غيره.

احتفظ بـ`\n` كما هي — الشيفرة تحوّلها.

### ٣. الدفع — لاحقاً

`PAYMENT_PROVIDER=fake` في `apphosting.yaml`. المتجر يشغّل رحلة الشراء كاملةً
بـ`FakeProvider` ويقول ذلك على الشاشة، بدل أن يفشل عند الدفع.

حين تريد Mollie:

```bash
npx firebase apphosting:secrets:set fpvarabic-mollie-test-key   # test_… فقط
```

ثم غيّر `PAYMENT_PROVIDER` إلى `mollie` في `apphosting.yaml`.

| السرّ | من أين | قيمة نموذجية غير حقيقية |
| --- | --- | --- |
| `fpvarabic-mollie-test-key` | Mollie ← Developers ← API keys ← **Test** | `test_EXAMPLE0000000000000000000000` |

**لا تضع مفتاح `live_` في Staging.** والـpreflight يرفض `live_` في أي ملف.

### ٤. انشر القواعد — قبل التطبيق

```bash
npx firebase deploy --only firestore:rules,storage:rules,firestore:indexes
```

القواعد أوّلاً دائماً. تطبيق حيّ أمام قواعد قديمة نافذةٌ مفتوحة بحجم الفارق
بينهما.

### ٥. أنشئ الواجهة الخلفية — مرّة واحدة

```bash
npx firebase apphosting:backends:create --project <project-id> --location europe-west4
```

- اختر المستودع `melyanneahmed-rgb/fpv-arabic-app` والفرع.
- اجعل **جذر التطبيق** `web`.
- `europe-west4` لأن المتجر أوروبي والزبائن هولنديون وبلجيكيون وألمان.

### ٦. انشر

```bash
npx firebase deploy --only apphosting
```

أو ادفع إلى الفرع المربوط ويبني تلقائياً.

### ٧. تحقّق بعد النشر

- افتح `/` — يجب أن تعمل بلا JavaScript.
- افتح `/search?q=فشل الدفع` — يجب أن تصل صفحة مساعدة الدفع أوّلاً.
- افتح `/admin` بحساب غير مسؤول — يجب أن تُحوَّل إلى `/`.
- افتح `/store` — سيكون فارغاً حتى تُدخل الأسعار. هذا صحيح لا عطل.

---

## ما سيظهر فعلاً في أول نشر

| القسم | الحالة |
| --- | --- |
| الموسوعة · التشخيص · القاموس | **كاملة** — لا تحتاج مفتاحاً ولا صورة |
| مركز البرامج (Betaflight · ExpressLRS · EdgeTX · الفيديو) | **كامل** |
| المشاريع (١٠) | **كاملة** |
| البحث العام | **يعمل** على كل ما سبق |
| صفحة مساعدة الدفع | **تعمل** |
| المجتمع | يعمل **بعد** الخطوة ٢ (يحتاج Firebase) |
| الحساب وتسجيل الدخول | يعمل **بعد** الخطوة ٢ |
| المتجر | **فارغ** — ٠ من ٧٠ منتجاً منشور، لأن النشر مشروط بسعر مسجَّل |
| صور المنتجات | **٠ من ٣٨٨** — كل بطاقة تعرض العنصر النائب |

المتجر فارغ **بالتصميم لا بعطل**: المنتج لا يُنشر حتى تُسجَّل تكلفته
والهامش، لأن متجراً يخترع رقماً ليملأ فراغاً هو متجر يتصرّف الزبون بناءً عليه.

---

## Staging أوّلاً — إن أردت

`web/apphosting.staging.yaml` جاهز: `STAGING=1` يشغّل شارة «نسخة تجريبية»
وترويسة `noindex`، والمجال مختلف، والدفع مثبَّت على مفتاح الاختبار.

```bash
npx firebase apphosting:backends:create --project <project-id> --location europe-west4
# سمِّه staging، واجعل config = apphosting.staging.yaml
```
