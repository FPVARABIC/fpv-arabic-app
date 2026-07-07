# Expert Rules — Unmapped Reference Material

22 real, sourced expert-rule insights gathered during A2's part-category
research (`17-قواعد الخبير-التجميع` in the source workbook) that do not
currently map onto any of the 5 rules declared in
`src/data/assembly/compatibility/rules.ts`. Kept here as documented
reference material — not built into new `CompatibilityRuleId`/validator code.

Forbidden-term substitutions already applied throughout: the Condition column
and the Valid/Invalid Example columns have each been checked and rephrased
where the source used a locked drone-type or skill-level term (spelled out in
full or as a community abbreviation), so no such term appears anywhere below.

| # | Condition / Scenario | Category | Explanation | Valid Example | Invalid Example |
|---|---|---|---|---|---|
| 1 | 5-inch 6S build with motor 2207/2306 | ESC | لبناء 5 إنش 6S بمحركات 2207/2306 استخدم عملياً ESC 45A فأعلى، ويفضل 55A للبناء القوي. | 2207 1750KV + 55A ESC | 2207 قوي + 35A ESC |
| 2 | High pitch prop + hot motors | المراوح / المحركات | إذا سخنت المحركات بعد تغيير المراوح، ابدأ بخفض pitch أو وزن المروحة قبل تغيير كل النظام. | Ethix S5 5x4x3 | 51466 مع محرك يسخن |
| 3 | 6S battery + capacitor voltage < 35V | المكثف / البطارية | في 6S لا تستخدم مكثفاً أقل من 35V؛ و50V أفضل كهامش في builds قوية. | 6S + 1000uF 35V/50V | 6S + 25V capacitor |
| 4 | Capacitor installed far from ESC pads | المكثف / ESC | المكثف يصبح أقل فعالية كلما ابتعد عن Pads البطارية في ESC؛ اجعله قريباً وبأسلاك قصيرة. | Capacitor on ESC battery pads | Capacitor at end of long pigtail |
| 5 | Battery connector must match ESC/pigtail | البطارية / ESC | لا تستخدم بطارية بموصل مختلف عن موصل الـESC/pigtail إلا مع محول مناسب وبتيار يتحمل الحمل؛ في 5 إنش غالباً XT60 هو الاختيار العملي. | 6S XT60 + ESC XT60 pigtail | Battery XT30 + 5-inch high-current ESC via adapter ضعيف |
| 6 | New pilot + aggressive prop | المراوح / المبتدئ | للمبتدئ اختر مروحة أقل pitch وأكثر نعومة قبل مروحة عدوانية؛ التحكم أسهل والحرارة أقل. | Gemfan F3S or Ethix S5 | مروحة سباق حادة في أول طيران |
| 7 | DJI/O4 + FC UART availability | FC / نظام الفيديو | النظام الرقمي يحتاج UART/MSP مناسب؛ لا تستهلك كل UART قبل تخطيط الريسيفر/GPS/video. | Kakute H7 with spare UARTs | F4 limited UARTs + GPS + ELRS + DJI unplanned |
| 8 | Motor screws too long | المحركات / الإطار | براغي محرك طويلة قد تلمس ملفات المحرك وتحرقه؛ افحص الطول قبل التشغيل. | M3 screw length matched to arm | Long screw through motor windings |
| 9 | Battery weight too high for agile flying | البطارية / الإطار | بطارية أثقل لا تعني دائماً طيراناً أفضل؛ الوزن الزائد يقتل الرشاقة ويزيد التحميل على المحركات. | 6S 1100-1300mAh on 5 inch | 6S 1800mAh لطيران حر عدواني |
| 10 | Receiver protocol = CRSF | FC / Receiver | ELRS وCrossfire يستخدمان CRSF عبر UART؛ يجب ضبط Serial RX وReceiver protocol بشكل صحيح. | ELRS RX TX↔RX على UART + CRSF | توصيل SBUS setting مع ELRS CRSF |
| 11 | Receiver voltage = 5V only | Receiver / Wiring | كثير من ELRS receivers تعمل على 5V فقط؛ توصيلها على VBAT قد يحرقها. | RP1 على 5V/GND/UART | RP1 على VBAT 6S |
| 12 | DJI O4 requires MSP UART | Video / FC | وحدات DJI الرقمية تحتاج UART مخصص لـ MSP/DisplayPort حسب الإعداد؛ تأكد من توفر UART حر. | FC مع UART للـ RX وUART للـ O4 | FC محدود UART مع GPS+RX+O4 بدون تخطيط |
| 13 | Digital VTX on bench without airflow | Video / Safety | DJI/Walksnail/HDZero VTX يمكن أن تسخن بسرعة على الطاولة بلا تبريد. | استخدم مروحة أثناء الإعداد | ترك O4 يعمل 10 دقائق بلا airflow |
| 14 | Analog VTX without antenna | Analog VTX | تشغيل VTX analog بدون هوائي يمكن أن يضر مرحلة الإرسال RF. | ركّب الهوائي قبل التشغيل | تشغيل Tank Solo بلا هوائي |
| 15 | GPS Rescue enabled without testing | GPS / Safety | GPS Rescue/RTH ليس زر نجاة مضموناً؛ يجب اختباره على ارتفاع ومساحة آمنة. | اختبار Rescue في مكان مفتوح | مسافات طويلة بلا اختبار failsafe |
| 16 | Compass near power leads | GPS/Compass | الـ compass يتأثر بالتيار والمغناطيسية؛ ضعه بعيداً عن أسلاك البطارية وESC. | Compass على mast بعيد | Compass فوق ESC وأسلاك XT60 |
| 17 | Buzzer self-powered for lost model | Buzzer / Safety | البازر العادي يتوقف إذا انفصلت البطارية؛ self-powered buzzer مفيد جداً للعثور على الدرون. | VIFLY Finder 2 على 5 إنش | Generic buzzer فقط في عشب كثيف |
| 18 | Charger power vs battery size | Charger / Battery | الشاحن AC الضعيف سيشحن 6S ببطء؛ احسب القدرة قبل شراء الشاحن. | HOTA D6 Pro لعدة 6S | شاحن 50W لشحن عدة بطاريات 6S بسرعة |
| 19 | LiPo charging unattended | Battery / Charger | لا تشحن LiPo دون مراقبة أو على سطح قابل للاشتعال. | شحن بمتابعة وفي حقيبة آمنة | شحن ليلاً أثناء النوم |
| 20 | Radio ecosystem before receiver | Radio / Receiver | اختر الراديو والريسيفر ضمن نفس النظام: ELRS مع ELRS، Crossfire مع Crossfire. | Boxer ELRS + RP1 | Radio ELRS + Crossfire Nano RX بلا module |
| 21 | Analog camera voltage 5-36V does not mean VBAT always wise | Camera / Wiring | حتى لو قبلت الكاميرا 5-36V، تغذية نظيفة من BEC قد تعطي صورة أفضل من VBAT noisy. | تغذية من 5V نظيف | VBAT noisy يسبب خطوط بالصورة |
| 22 | Extended-range flights require GPS + buzzer + failsafe | Build profile | أي build مخصص للمدى الطويل يجب أن يجمع GPS وفهم failsafe وبازر/وسيلة العثور. | 7 inch مدى طويل مع GPS/Buzzer/Failsafe | 5 inch مدى طويل بلا GPS ولا buzzer |
