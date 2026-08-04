# صور المتجر

ارفع الصور هنا بالأسماء المذكورة في `docs/store/PRODUCT_IMAGE_MANIFEST.md`.

البنية:

```text
web/public/assets/store/<معرّف المنتج>/<الخيار>/<الرقم>-<الدور>.webp
```

مثال:

```text
web/public/assets/store/geprc-cinelog35/o4-pro/01-main.webp
```

المجلّد فارغ عمداً — لا تُضاف صور قبل أن يرفعها صاحب المتجر، ولا صور
مولَّدة بالذكاء الاصطناعي ولا منسوخة بلا إذن.

`scripts/testStoreImages.ts` يفشل إذا وُجد ملف لا ينتمي إلى أي منتج، أو
اسم لا تعرفه القائمة، أو منتج منشور بلا صورة رئيسية.
