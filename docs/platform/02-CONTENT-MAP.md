# 3–4. الخريطة الموسوعية وتصنيف الأنظمة والقطع والبرامج

هذه هي شجرة المعرفة الكاملة التي تحدد نطاق المنصة. كل عقدة هنا هي **وحدة معرفية (Module)** أو **مقال (Article)** داخل وحدة، وليست عنواناً شكلياً.

## 3.1 المستويات (Levels)

سبعة مستويات بدل مستويين:

| المعرّف | الاسم العربي | من هو المستخدم |
|---|---|---|
| `zero` | من الصفر | لا يعرف ما الدرون |
| `beginner` | مبتدئ | يعرف المصطلحات، لم يبنِ شيئاً |
| `basic` | أساسي | بنى أو يبني أول طائرة |
| `intermediate` | متوسط | يطير ويريد تطوير المهارة والضبط |
| `advanced` | متقدم | يفهم الأنظمة ويريد العمق الهندسي |
| `pro` | احترافي | مرجع تقني سريع، لا شرح تمهيدي |
| `specialist` | تخصصي | مسار محدد (سباق/سينمائي/مدى طويل/ملاحة ذاتية) |

## 3.2 أنواع المحتوى (Content Kinds)

`concept` · `system` · `component` · `protocol` · `procedure` · `howto` · `reference` · `comparison` · `diagnostic` · `project` · `safety` · `glossary`

## 3.3 طبقات العرض (Layers) — إلزامية في كل مقال

| الطبقة | المعرّف | الغرض |
|---|---|---|
| سريعة | `quick` | إجابة مباشرة في 1–3 أسطر |
| مبسطة | `simple` | شرح للمبتدئ بلا مصطلحات غير مشروحة |
| تقنية | `technical` | كيف يعمل النظام فعلاً، الأرقام، البنية الداخلية |
| تطبيقية | `practical` | التركيب، التوصيل، الإعداد، الاختبار |
| تشخيصية | `diagnostic` | الأعراض ← الأسباب ← الفحوص ← النتائج |
| مرجعية | `reference` | جداول، مقارنات، مواصفات، pinout |

## 3.4 محاور مصفوفة التغطية (28 محوراً)

كل مقال يعلن صراحةً أي محاور يغطيها فعلاً. الوحدة لا تُعتبر مكتملة إلا بتغطية كل محور منطبق:

`definition` · `principle` · `components` · `types` · `comparison` · `compatibility` · `power` · `protocols` · `installation` · `wiring` · `configuration` · `testing` · `performance` · `safety` · `failures` · `diagnostics` · `maintenance` · `applications` · `beginner` · `intermediate` · `advanced` · `pro` · `terminology` · `sources` · `internalLinks` · `search` · `assessment` · `updatability`

**قاعدة الصدق:** المحور غير المغطى يظهر للمستخدم كنقص صريح في صفحة الوحدة، ولا يُخفى خلف تصميم أو نسبة تقدّم وهمية.

---

## 3.5 الشجرة الموسوعية الكاملة

### المجال 1 — أساسيات الطيران (`flight-principles`)
كيف يطير الدرون · توليد الرفع · القوى الأربع · الدفع مقابل الوزن (T/W) · الجاذبية · مقاومة الهواء · مركز الثقل · عزم الدوران · القصور الذاتي · محاور Roll/Pitch/Yaw · Throttle · مزج المحركات (Mixer) · اتجاهات الدوران وإلغاء العزم · الاستقرار · التحكم المفتوح والمغلق · تأثير الرياح · كثافة الهواء والارتفاع والحرارة · الاهتزاز والرنين · Propwash · سلوك التسارع والتوقف والانعطاف

### المجال 2 — الديناميكا الهوائية (`aerodynamics`)
شكل المروحة · زاوية الهجوم · Pitch · سرعة الطرف · الاضطراب · الكفاءة · الدفع والسحب · عدد الشفرات · وزن وصلابة المروحة · حجم الهيكل · توزيع الكتلة · الحمولة · أثر الحرارة والارتفاع

### المجال 3 — الكهرباء والإلكترونيات (`electrical`)
الجهد · التيار · المقاومة · القدرة · الطاقة · قانون أوم · التوالي والتوازي · خطوط الجهد (3.3V/5V/9V/10V/VBAT) · Ground والأرضي المشترك · BEC وUBEC والمنظّمات · المكثف · الملف · الديود · الفيوز · حساس التيار وحساس الجهد وADC · الضوضاء الكهربائية · Ground Loop · Voltage Sag · Ripple · قياس الاستمرارية · فحص القصر · الملتيميتر · Smoke Stopper · أسلاك الطاقة والإشارة ومقاساتها

### المجال 4 — البطاريات والطاقة (`power-battery`)
LiPo · Li-ion · LiHV · عدد الخلايا · الجهد الاسمي/الكامل/التخزين · السعة · C Rating · المقاومة الداخلية · Voltage Sag · التوازن · الشحن · التخزين · التفريغ · الموصلات · اختيار البطارية · حساب الاستهلاك · تقدير زمن الطيران · الحرارة · الانتفاخ · التلف · السلامة · النقل والتخزين · الشواحن

### المجال 5 — المحركات (`motors`)
البنية (Stator/Rotor/Magnets/Bearings/Windings) · معنى KV · ترميز الحجم (2207/2306) · قطر وارتفاع Stator · العزم مقابل السرعة · الكفاءة · الحرارة والتبريد · عدد الأقطاب · اتجاه الدوران · التوافق مع البطارية/المروحة/ESC · اختيار المحرك حسب نوع الطيران · الأعطال (Bearing/ملفات/مغناطيس/الجرس) · اختبار المحرك

### المجال 6 — المراوح (`propellers`)
القطر · Pitch · عدد الشفرات · عرض وشكل الشفرة والأطراف · المادة والصلابة والوزن · اتجاه الدوران · الدفع والكفاءة واستهلاك التيار · الاستجابة · الضجيج · الاهتزاز والتوازن · التلف · Propwash · القابلة للطي · ثنائية/ثلاثية/رباعية الشفرات · الاختيار ضمن النظام الكامل

### المجال 7 — ESC (`esc`)
الوظيفة · MOSFET · Gate Driver · MCU · منفصل مقابل 4-in-1 مقابل مدمج في AIO · BLHeli_S / BLHeli_32 / AM32 · البروتوكولات (PWM/OneShot/MultiShot/DShot150/300/600) · Bidirectional DShot · RPM Telemetry وRPM Filtering · التيار المستمر والذروة · Active Braking · Demag Compensation · Motor Timing · Startup Power · الاتجاه · تحديث Firmware · ESC Telemetry · الأعطال والاحتراق والتشخيص

### المجال 8 — متحكم الطيران (`flight-controller`) ← **النموذج الرأسي الأول**
انظر التفصيل الكامل في `03-ARCHITECTURE.md` §5.

### المجال 9 — أنظمة التحكم (`radio-control`)
جهاز الإرسال · المستقبل · ExpressLRS · TBS Crossfire · Tracer · Ghost · SBUS · IBUS · CRSF · PWM · PPM · الترددات (2.4GHz / 868 / 915MHz) · Binding وBinding Phrase وUID · Packet Rate · Telemetry Ratio · LQ وRSSI وSNR · Dynamic Power · Failsafe · Model Match · وضع الهوائي وDiversity وTrue Diversity · تحديث Firmware · تشخيص الاتصال والمدى

### المجال 10 — أنظمة الفيديو (`video`)
Analog · DJI · Walksnail · HDZero · الكاميرا · VTX · Air Unit · النظارات · مستقبل الفيديو · الهوائيات (Omni/Patch/RHCP/LHCP/Linear) · التردد والقنوات والنطاقات · القدرة والتبريد · SmartAudio وTramp · MSP DisplayPort وCanvas Mode · OSD تناظري ورقمي · الكمون · جودة الصورة · DVR · المدى · التداخل · التشخيص

### المجال 11 — الملاحة والحساسات (`navigation-sensors`)
GPS وGNSS (GPS/GLONASS/Galileo/BeiDou) · عدد الأقمار · HDOP · Fix · Home Position · Compass والتداخل المغناطيسي · Barometer · Optical Flow · Rangefinder وLiDAR · Position Hold · Altitude Hold · GPS Rescue · RTH · Waypoints · تخطيط المهام · القيود وحالات الفشل والاختبارات الآمنة

### المجال 12 — الهياكل والبناء الميكانيكي (`frames`)
هندسة الهيكل · True X · Wide X · Squashed X · Deadcat · Stretch X · Whoop · Cinewhoop · Toothpick · Long Range · سماكة الذراع · ألياف الكربون · الرنين والصلابة والوزن · التثبيت والتثبيت المرن · حماية الكاميرا · توزيع المكونات · مركز الثقل · الصيانة ومقاومة الحوادث

### المجال 13 — اللحام والتوصيل (`soldering-wiring`)
الأدوات · درجة الحرارة · Flux · القصدير · Tinning · مقاس السلك · أسلاك الطاقة والإشارة · Pads وThrough Holes · Ground والأرضي المشترك · منع الجسور · تنظيف اللوحة · فحص القصر · حماية المكونات · عزل الأسلاك · إدارة الكابلات · تثبيت المكثف · توصيل الحساسات · التشغيل الأول

### المجال 14 — الصيانة والإصلاح (`maintenance`)
الفحص بعد الحوادث · استبدال الذراع والمحرك · فحص ESC والأسلاك والموصلات · التنظيف · الماء والرطوبة والصدأ · تخزين البطاريات · تحديث البرامج · النسخ الاحتياطي · سجل الصيانة · القطع الاستهلاكية

### المجال 15 — السلامة والقوانين (`safety`)
سلامة البطاريات والمراوح · اختبارات الطاولة · نزع المراوح · التشغيل الأول · Smoke Stopper · القصر وعكس القطبية · البطاريات التالفة · مكان الطيران · الأشخاص والممتلكات · Failsafe · حدود GPS Rescue وRTH · مسؤولية المستخدم · معلومات قانونية عامة مع تنبيه اختلافها بالدولة والتاريخ

### المجال 16 — البرامج والـFirmware (`software`)
مصنَّفة حسب الوظيفة لا حسب الاسم:

| الفئة | البرامج |
|---|---|
| متحكم الطيران | Betaflight · INAV · ArduPilot |
| محطات التحكم الأرضية | Mission Planner · QGroundControl |
| ESC | BLHeliSuite · BLHeli Configurator · ESC Configurator · AM32 Configurator |
| المستقبل | ExpressLRS Configurator · أدوات Crossfire/Agent |
| الراديو | EdgeTX · OpenTX (تاريخي) |
| الفيديو | أدوات DJI Assistant · Walksnail · HDZero |
| تحليل السجلات | Betaflight Blackbox Explorer · أدوات تحليل السجلات |
| التعريف والاستعادة | DFU · Zadig · ImpulseRC Driver Fixer · STM32 Bootloader |
| المحاكاة | محاكيات التدريب |

### المجال 17 — الضبط والأداء (`tuning`)
PID · Rates · Filters · Feedforward · Anti-Gravity · Dynamic Idle · D-Term · RPM Filtering · قراءة Blackbox · تشخيص الاهتزاز · ضبط الاستجابة

### المجال 18 — المشاريع (`projects`)
أول درون FPV · Freestyle · Racing · Cinematic · Cinewhoop · Long Range · Whoop · Toothpick · تدريبي · تصوير · ملاحة · تفقّد · ذاتي · مخصص

---

## 3.6 تصنيف القطع (Component Taxonomy)

```
هيكلي:      Frame · Arms · Standoffs · TPU Mounts · Camera Cage
دفع:        Motors · Propellers · Screws · Bearings
تحكم:       Flight Controller · ESC · PDB · AIO Stack
طاقة:       Battery · Charger · BEC/UBEC · Capacitor · Connectors · Wires · Current Sensor
تحكم لاسلكي: Radio TX · TX Module · Receiver · Antennas
فيديو:      Camera · VTX · Air Unit · Goggles · VRX · Video Antennas
ملاحة:      GPS · Compass · Barometer · Optical Flow · Rangefinder
مساعدات:    Buzzer · LED Strip · GPS Tracker · Smoke Stopper
أدوات:      Soldering Iron · Multimeter · Hex Drivers · Prop Tool · LiPo Bag
```

## 3.7 تصنيف البروتوكولات

```
تحكم:       CRSF · SBUS · IBUS · FPort · PPM · PWM · ELRS · Crossfire · Tracer · Ghost
محركات:     PWM · OneShot125 · MultiShot · DShot150/300/600/1200 · Bidirectional DShot · ProShot
تليمتري:    CRSF Telemetry · SmartPort · ESC Telemetry (KISS/BLHeli) · MSP
عرض/فيديو:  SmartAudio · IRC Tramp · MSP DisplayPort · MSP-VTX · Canvas Mode
لوحة:       UART · I2C · SPI · CAN · MSP · DFU · Softserial
ملاحة:      UBX · NMEA · MAVLink
```

## 3.8 العلاقات بين العناصر (Relationship Types)

| العلاقة | مثال |
|---|---|
| `requires` | GPS Rescue يتطلب GPS + Barometer |
| `configuredIn` | Receiver يُعدّ في صفحة Ports وReceiver في Betaflight |
| `connectsTo` | Receiver ↔ UART على FC |
| `powers` | BEC يُغذّي VTX |
| `conflictsWith` | Compass بجوار أسلاك الطاقة |
| `diagnosedBy` | "المحركات لا تدور" ← شجرة تشخيص `dx-motors-no-spin` |
| `taughtBy` | مفهوم UART ← درس/مقال |
| `selectedIn` | Flight Controller ← مرحلة 8 في التجميع |
| `alternativeTo` | AM32 بديل لـ BLHeli_32 |
| `supersedes` | ELRS يحل محل استخدام SBUS في بناء جديد |
