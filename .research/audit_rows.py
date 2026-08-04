# -*- coding: utf-8 -*-
"""Rewrite the audit rows for every product reviewed in batch two."""
import re, io, sys

PATH = 'src/data/store/audit.ts'
src = io.open(PATH, encoding='utf-8').read()

# productId -> (kind, sources, supply, imagesLicensable, fitsCategory, decision, launchSet, note)
ROWS = {
 'happymodel-mobula8': ('real-product','official','moderate','unknown',True,'approve',True,
   'رُفع التأجيل. Happymodel تنشر صفحة لكل نسخة، وقد قُرئت: 85 مم، 43 غراماً، '
   'محرّكات EX1103 بسرعة 11000. أُضيفت أربع نسخ شراء لأن المستقبِل هنا قرار شراء '
   'لا إعداد — لوحة FlySky المدمجة لن تربط جهاز ExpressLRS أبداً.'),
 'betafpv-pavo25': ('needs-rename','official','easy','unknown',True,'approve',True,
   'الاسم كان جيلاً كاملاً وراء الواقع: BetaFPV تبيع Pavo25 V2 بمحرّكات LAVA 1506 '
   'ومتحكّم F722. وصُحّح ما هو أهمّ: يُباع بلا نظام فيديو، وهذا لم يكن مكتوباً.'),
 'geprc-cinebot25': ('needs-rename','official','moderate','unknown',True,'approve',True,
   'الجيل الحالي Cinebot25 V2 بوحدة DJI O4 Air Unit Pro ووزن 219 غراماً. '
   'صُحّح الاسم وأُضيفت نسختا الفيديو، وسُجّلت مواصفاته من صفحة الشركة.'),
 'geprc-cinelog30': ('needs-rename','official','moderate','unknown',True,'approve',True,
   'كان جيلين وراء الواقع: GEPRC تبيع Cinelog30 V3. نقل مواصفات V3 تحت الاسم '
   'القديم كان سيكون الخطأ الذي وُجدت هذه المراجعة لالتقاطه.'),
 'geprc-cinelog35': ('needs-rename','official','moderate','unknown',True,'approve',True,
   'الجيل الحالي CineLog35 V3 بوحدة DJI O4 Air Unit Pro تسجّل 4K عند 120 إطاراً. '
   'صُحّح الاسم ونظام الفيديو — كان مسجَّلاً تماثلياً وهو رقمي.'),
 'geprc-cinebot30': ('wrong-category','official','moderate','unknown',True,'approve',True,
   'كان في قسم 3.5 إنش وهو يدور مراوح HQProp T76mm — أي ثلاث إنشات. صُنّف بالرقم '
   'في اسمه لا بالمروحة التي يحملها. نُقل إلى قسم الثلاث إنشات وأُضيفت نسخه الثلاث.'),
 'geprc-crocodile7': ('needs-rename','official','moderate','unknown',True,'approve',True,
   'الاسم الرسمي «Crocodile 7 PRO». سُجّلت مواصفاته: 315 مم بين المحرّكات، '
   'ومحرّكات GR2306 بسرعة 1600، وزمن طيران معلَن سبع دقائق ببطارية 6S سعة 2200.'),
 'iflight-nazgul-evoque-f4': ('needs-variants','official','moderate','unknown',True,'approve',True,
   'حقيقي — وهو الوحيد من عائلة Evoque الذي كان في الكتالوج بالاسم الصحيح. '
   'قطره 185 مم ويُباع بهيكلَين: F4X على شكل X وF4D على شكل DeadCat يُبعد المراوح '
   'عن الكاميرا. أُضيفا كخيارَي شراء، وصُحّح نظام فيديوه إلى الرقمي.'),
 'iflight-chimera7-pro': ('needs-rename','official','moderate','unknown',True,'approve',True,
   'الجيل الحالي Chimera7 Pro V2. سُجّلت أرقامه: 327 مم، وXING2 2809 بسرعة 1250، '
   'و725 غراماً بلا بطارية. أُضيفت ثلاث نسخ فيديو.'),
 'iflight-chimera7-eco': ('needs-variants','official','moderate','unknown',True,'approve',True,
   'الاسم الرسمي «Chimera7 ECO 6S». الاكتشاف المهمّ: وحدة تحديد الموقع لا تأتي '
   'مركّبة وتُطلب مسبقاً — وطائرة مدى طويل بلا GPS مشكلة سلامة لا نقص ميزة. '
   'كُتب ذلك في محتوى الصندوق وفي «لا يناسبك».'),
 'tbs-source-one-v5': ('duplicate','official','easy','unknown',True,'defer',False,
   'ظهر دليل جديد يغيّر قرارك المعلَّق: TBS تبيع فعلاً منتجَين مختلفَين — الهيكل '
   'مفرداً، وطقم RTF/BNF مبنيّاً. فالسجلّان قد لا يكونان تكراراً أصلاً. سُجّل هذا '
   'في صفحة قراراتك ولم يُحسم. الاسم الرسمي V5.1 ولا يوجد «V5» مجرَّد.'),
 'tbs-source-one-v5-frame': ('needs-rename','official','easy','unknown',True,'approve',True,
   'الاسم الرسمي «V5.1»، وهناك V6 يخلفه. سُجّل الاثنان. هذا السجلّ هو الهيكل '
   'مفرداً، وسجلّ قسم الخمس إنشات هو الطقم المبنيّ — راجع قرارك المعلَّق.'),
 'emax-tinyhawk-3-rtf': ('aging','official','easy','unknown',True,'approve',True,
   'قُرئت صفحته: F4 بمسرّع 5A، ومحرّكات 15000، وكاميرا RunCam Nano 4. كُتب الفرق '
   'الحقيقي عن أطقم BetaFPV صراحةً: بروتوكول FrSky D8 لا ExpressLRS. '
   'ملاحظة: EMAX تعرض الآن Tinyhawk III Plus بنسخة ExpressLRS.'),
 'betafpv-cetus-lite': ('real-product','official','easy','unknown',True,'approve',True,
   'قُرئت صفحته. أُضيف ما كان ناقصاً وهو جوهري: محرّكاته مكنَّسة لا عديمة المكانس. '
   'هذا يفسّر السعر ويفسّر أنه يُستهلك — وإخفاؤه بيعٌ ناقص المعلومة.'),
 'radiomaster-pocket-combo': ('bundle','none','easy','unknown',False,'unpublish',False,
   'لم يتغيّر: لا يبيع أحد «جهاز ومحاكي» كصندوق واحد. جهاز Pocket موجود مفرداً '
   'في قسم الأجهزة، والمحاكي برنامج لا يُشحن. القرار قرارك وهو في صفحتها.'),
 'walksnail-avatar-hd-x': ('real-product','official','moderate','unknown',True,'approve',True,
   'قُرئت صفحته: 1080p عند مئة إطار، وزاوية 50 درجة، و290 غراماً، ومدخل HDMI. '
   'رُبط بوحدة الطائرة من نظامه لأن النظام مغلق والربط هنا ليس اقتراحاً بل شرطاً.'),
 'hdzero-goggles': ('needs-rename','official','moderate','unknown',True,'approve',True,
   '«HDZero Goggles» فئة لا منتج. المنتج هو «HDZero Goggle 2»، وفيه مستقبِل '
   'تماثلي مدمج يجعله يقرأ الطائرات القديمة — وهذه ميزة شراء لم تكن مكتوبة.'),
 'walksnail-avatar-hd-pro': ('real-product','official','moderate','unknown',True,'approve',True,
   'قُرئت صفحته: مستشعر Sony Starvis II مقاس 1/1.8 إنش، وتأخير 22 مللي ثانية، '
   'وتسجيل داخلي 8 غيغابايت.'),
 'hdzero-freestyle-v2': ('real-product','official','moderate','unknown',True,'approve',True,
   'قُرئت صفحته، وفيها أمران يغيّران قرار الشراء: الكاميرا ليست في الصندوق، '
   'والوحدة محدودة عند 200 ميلي واط من المصنع لا 1 واط. كُتب الاثنان صراحةً.'),
 'holybro-kakute-h7': ('needs-rename','official','moderate','unknown',True,'approve',True,
   'الجيل الحالي Kakute H7 V2. وسُجّل تفصيل عملي: أحد منافذ UART الستّة مشغول '
   'بالبلوتوث، فالمتاح خمسة — وهذا هو الرقم الذي يبني عليه المشتري.'),
 'speedybee-bls-50a': ('aging','official','easy','unknown',True,'approve',True,
   'الاسم الرسمي يحمل بادئة F405. لم يُستبدل: ما زال يُباع، وسُجّل أن نسخة '
   '60 أمبير هي الأحدث في الخطّ بدل حذفه.'),
 'hobbywing-xrotor-g2': ('needs-rename','official','moderate','unknown',True,'approve',True,
   'الاسم القديم «XRotor Micro G2» دمج خطَّين مختلفَين عند Hobbywing: «XRotor Micro» '
   'و«XRotor FPV G2». المقصود هو الثاني، وله ورقة بيانات منشورة — وهذا نادر. '
   'أُضيفت نسختا 45 و65 أمبير كخيارَي شراء، والفرق بينهما ليس القوّة بل مخرج الجهد.'),
 'tmotor-f55a-pro-ii': ('real-product','official','moderate','unknown',True,'approve',True,
   'قُرئت صفحته: 55 أمبير مستمر و75 ذروة ومخرج 10 فولت. تعارض مسجَّل: عنوان '
   'الصفحة يقول AM32 ونصّها يقول BLHeli32 — سُجّل التعارض ولم يُعتمد أيّهما.'),
 'emax-eco-ii-2306': ('needs-variants','official','easy','unknown',True,'approve',True,
   'سرعات الدوران الثلاث أُضيفت كخيارات شراء، لأن 2400 لبطارية 4S و1700 لـ6S — '
   'واختيار الرقم الأكبر على الجهد الأعلى يحرق المسرّعات. سُجّل أن ECO III أحدث.'),
 'tmotor-f60-pro-v': ('real-product','official','moderate','unknown',True,'approve',True,
   'الاسم الرسمي «F60PRO V» بمقاس 2207.5. سُجّل وزنه ونسخته الأخفّ LV.'),
 'iflight-xing2-2207': ('needs-variants','official','easy','unknown',True,'approve',True,
   'صفحته تنشر جدولاً كاملاً بجيلَين: القديم 1855 و2755، والحالي 1750 و2050 و2750. '
   'أُضيفت سرعات الجيل الحالي كخيارات شراء.'),
 'armattan-marmotte': ('not-dropshippable','official','hard','unknown',True,'approve',True,
   'قُرئت صفحته على المتجر الرسمي — وهو armattanquads.com لا armattanproductions. '
   '236 مم، و115 غراماً، ولوح 4 مم. الضمان حقيقي ومكتوب. يبقى صعب الشحن المباشر، '
   'وهذا سبب تجاري لا سبب جودة.'),
 'impulserc-apex': ('needs-rename','official','hard','unknown',True,'approve',True,
   'خطّ Apex انتقل إلى EVO. بيع «Apex» مجرَّداً بيعُ جيل تجاوزته الشركة. '
   'صُحّح إلى ApexDC EVO مقاس 5 إنش. يبقى صعب الشحن المباشر.'),
 'cnhl-black-series-4s': ('needs-variants','official','easy','unknown',True,'approve',True,
   'البطارية ليست منتجاً واحداً: السعة والموصّل يختلفان. أُضيفت السعتان الشائعتان '
   'كخيارَي شراء، وكُتب أن سعة 5000 بموصّل XT90 لا XT60. النسخة الثانية 130C.'),
 'cnhl-black-series-6s': ('needs-variants','official','easy','unknown',True,'approve',True,
   'ثلاث سعات كخيارات شراء. وكُتب تحذير عملي: سعة 5000 لا تدخل هيكل خمس إنشات عادياً.'),
 'tattu-r-line-v5-6s': ('needs-variants','official','moderate','unknown',True,'approve',True,
   'الاسم الرسمي «Version 5.0». الأوزان المنشورة تُظهر لماذا السعة ليست تفصيلاً: '
   '145 غراماً عند 850 و346 عند 2200. أُضيفت ثلاث سعات كخيارات شراء.'),
 'isdt-q6-charger': ('real-product','official','easy','unknown',True,'approve',True,
   'قُرئ دليله الرسمي: 200 واط بدخل من 10 إلى 24 فولت. أُضيف ما كان ناقصاً: '
   'يحتاج مصدر طاقة خارجياً، فهو ليس قطعة واحدة كالشاحن الآخر.'),
 'isdt-608ac': ('real-product','official','easy','unknown',True,'approve',True,
   'قُرئ دليله الرسمي، وفيه فرق كان مخفياً: 50 واط من الكهرباء مباشرة و200 واط '
   'من مصدر مستمرّ. بيعه بـ«200 واط» دون هذا التفصيل تضليل.'),
 'hota-d6-pro': ('real-product','none','moderate','unknown',True,'defer',False,
   'المنتج حقيقي ويُباع في كل مكان، لكن لم يُعثر على صفحة رسمية للشركة لهذا الطراز '
   '— وما عند الباعة معلومة تجارية لا مواصفة. تُرك بلا مواصفات، وكُتب ذلك على '
   'صفحته صراحةً بدل نقل أرقام غير موثّقة.'),
 'runcam-phoenix-2': ('real-product','official','easy','unknown',True,'approve',True,
   'قُرئت صفحته ودليله: مستشعر 1/2 إنش، و1000 خط، و9 غرامات، ومن 5 إلى 36 فولت. '
   'من أكمل الصفحات التي قُرئت في هذه الدفعة.'),
 'foxeer-razer-micro': ('needs-rename','official','easy','unknown',True,'approve',True,
   'ترتيب الكلمات كان خاطئاً: الاسم الرسمي «Foxeer Micro Razer» لا «Razer Micro». '
   'الترتيب يهمّ لأن «Razer Mini» و«Razer Nano» منتجات أخرى. سُجّل أن خطّ '
   'Razer Mini أحدث منه.'),
 'rush-tank-ultimate': ('needs-rename','official','moderate','unknown',True,'approve',True,
   'موقع الشركة rushfpv.net لا rushfpv.com، ولا يوجد منتج اسمه «Rush Tank Ultimate» '
   'مجرَّداً: الخطّ هو TANK II و TANK III ULTIMATE وULTIMATE PLUS وMINI II. '
   'صُحّح إلى TANK II ULTIMATE وسُجّل أن الثالث متاح.'),
 'tbs-unify-pro32-nano': ('needs-rename','official','easy','unknown',True,'approve',True,
   'الاسم الرسمي يحمل «5G8 V1.1». سُجّلت مستويات الطاقة الأربعة ومخرج 5 فولت '
   'بتيّار أمبيرين — وهو سبب شراء لم يكن مكتوباً.'),
 'foxeer-reaper-extreme': ('needs-variants','official','moderate','unknown',True,'approve',True,
   'كان اسماً بلا نسخة، وFoxeer تبيع خمس نسخ بطاقات ونطاقات مختلفة. صُحّح إلى V3 '
   'وسُجّلت النسخ. وكُتب تحذير النطاق الممتدّ: ليس مسموحاً في كل مكان.'),
 'holybro-m10-gps': ('wrong-category','official','moderate','unknown',True,'approve',True,
   '«M10 GPS» عند Holybro وحدة طيّار آلي: فيها صافرة ومفتاح أمان وكابل عشاري '
   'لا يستعملها متحكّم Betaflight. المنتج الصحيح لهذا المتجر «Micro M10 GPS». صُحّح.'),
 'flywoo-goku-gm10-pro': ('needs-rename','official','easy','unknown',True,'approve',True,
   'الاسم الرسمي يحمل V3. صفحته من أكمل ما قُرئ: الشريحة والبوصلة والوزن والأبعاد '
   'والحساسية ومعدّل التحديث كلّها منشورة.'),
 'radiomaster-rp1': ('needs-rename','official','easy','unknown',True,'approve',True,
   'الجيل الحالي «RP1 V2». أُضيفت ميزة عملية لم تكن مكتوبة: واي فاي مدمج يُحدَّث '
   'ويُضبط من المتصفّح بلا فكّ الطائرة.'),
 'happymodel-ep1-elrs': ('real-product','official','easy','unknown',True,'approve',True,
   'قُرئت صفحته: 0.41 غرام بلا هوائي، و10 × 10 × 6 مم، ومعدّل من 25 إلى 500 هرتز. '
   'سُجّل أخواه EP2 وEP1 Dual لأنهما إجابتان مختلفتان لسؤالين مختلفين.'),
 'betafpv-superd-elrs': ('needs-variants','official','moderate','unknown',True,'approve',True,
   'صُحّح الوصف: هذا تنوّع حقيقي بسلسلتَي استقبال كاملتين، لا مبدّل بين هوائيين — '
   'وكان مكتوباً أنه «يختار بينهما». أُضيف النطاقان كخيارَي شراء لأنهما لا يرتبطان.'),
 'truerc-x-air': ('wrong-category','official','moderate','unknown',True,'approve',True,
   'أخطر تصنيف في هذه الدفعة: كان معروضاً كهوائي عام «لكل بناء تماثلي أو رقمي». '
   'وهو هوائي استقبال اتجاهي بكسب عشرة ديسيبل وحزمة 120 درجة، تصنّفه الشركة نفسها '
   'ضمن هوائيات الاستقبال. تركيبه على طائرة يفقد الصورة كلّما ابتعدت بزاوية. صُحّح.'),
 'lumenier-axii-2': ('needs-variants','official','easy','unknown',True,'approve',True,
   'الموصّل والاستقطاب خياران يجب أن يُختارا قبل الطلب لا بعده. أُضيفت أربعة '
   'خيارات شراء، وكُتب صراحةً أن الاستقطاب يجب أن يطابق الطرف الآخر.'),
 'foxeer-lollipop-4': ('real-product','official','easy','unknown',True,'approve',True,
   'قُرئت صفحته: كسب 2.6 ديسيبل ومتعدّد الاتجاهات. صُحّح محتوى الصندوق إلى هوائيَين '
   'لأنه يُباع بعبوة زوجية.'),
 'gemfan-hurricane-51466': ('needs-rename','official','easy','unknown',True,'approve',True,
   'الطراز الحالي «51466 V2». صفحته تنشر كل ما يلزم: ثلاث شفرات، وخطوة 3.6 إنش، '
   'وقرص 131.8 مم، و4.2 غرام، وفتحة M5. وكُتب أن المحرّك يجب أن يكون 2207 فما فوق.'),
 'lipo-safe-bag': ('category-placeholder','none','easy','unknown',True,'replace',False,
   'لم يتغيّر: «حقيبة ليبو» فئة لا منتج، ولا مصنّع ولا طراز. القرار قرارك وهو في '
   'صفحة القرارات — إمّا اختيار طراز بعينه أو حجبه.'),
 'battery-strap-set': ('category-placeholder','none','easy','unknown',True,'replace',False,
   'لم يتغيّر: «طقم أحزمة» فئة لا منتج. القرار قرارك وهو في صفحة القرارات.'),
}

def esc(s):
    return s.replace('\\', '\\\\').replace("'", "\\'")

def arabic_lines(note, indent='      '):
    """Break a long Arabic note into concatenated string literals under 100 cols."""
    words = note.split(' ')
    lines, cur = [], ''
    for w in words:
        cand = (cur + ' ' + w).strip()
        # budget in characters of Arabic text per source line
        if len(cand) > 68 and cur:
            lines.append(cur)
            cur = w
        else:
            cur = cand
    if cur:
        lines.append(cur)
    out = []
    for i, ln in enumerate(lines):
        body = esc(ln if i == len(lines) - 1 else ln + ' ')
        if i == 0:
            out.append("%s'%s'" % (indent, body))
        else:
            out.append("%s+ '%s'" % (indent, body))
    return '\n'.join(out)

count = 0
for pid, (kind, sources, supply, img, fits, decision, launch, note) in ROWS.items():
    # match the whole object literal for this productId
    pat = re.compile(
        r"\{\s*\n\s*productId: '" + re.escape(pid) + r"',.*?\n  \},",
        re.S)
    m = pat.search(src)
    if not m:
        print('NOT FOUND:', pid); sys.exit(1)
    ls = ' launchSet: true,' if launch else ''
    new = (
        "{\n"
        "    productId: '%s', kind: '%s', sources: '%s',\n"
        "    supply: '%s', imagesLicensable: '%s', fitsCategory: %s,\n"
        "    decision: '%s',%s\n"
        "    noteAr:\n%s,\n"
        "  }," % (pid, kind, sources, supply, img, 'true' if fits else 'false',
                 decision, ls, arabic_lines(note))
    )
    src = src[:m.start()] + new + src[m.end():]
    count += 1

# the two products that were replaced outright
src = src.replace("productId: 'iflight-nazgul-evoque-f3'", "productId: 'geprc-smart35'")
src = src.replace("productId: 'iflight-nazgul-evoque-f3d'", "productId: 'geprc-domain36'")
src = src.replace("productId: 'speedybee-f405-v4-fc'", "productId: 'speedybee-f7-v3-fc'")

io.open(PATH, 'w', encoding='utf-8').write(src)
print('rewrote', count, 'rows')
