/**
 * Verdicts about the user's control link.
 *
 * These are the rules an article can never apply. «تأكد أن النطاق متطابق» is
 * true for everyone; «وحدتك على النطاق المنخفض ومستقبلك على 2.4 — لن يربطا
 * أبداً» is true for one person, and it is the reason they stop losing an
 * evening to a receiver that was never going to bind.
 *
 * SAME FOUR RULES AS THE REST OF THE ENGINE
 * -----------------------------------------
 * 1. Never invent a number. Sensitivity limits, pinouts and per-product band
 *    support come from the manufacturer, so where we lack them we say so.
 * 2. Silence is not approval — a rule that cannot run reports `unknown`.
 * 3. Every finding carries its reasoning and the evidence it rests on.
 * 4. `manual-required` is a first-class answer.
 *
 * A SAFETY ORDERING, NOT A CHECKLIST
 * ----------------------------------
 * Two rules here are `blocker` on purpose: a band mismatch (nothing will ever
 * work) and a hold-last-values failsafe (the aircraft flies away). Everything
 * else is a warning or an open question, because everything else costs time
 * rather than hardware or safety.
 */

import type { ProjectSnapshot, Finding } from './types';
import {
  RC_BAND_LABEL_AR, RC_SYSTEM_LABEL_AR, RC_PROTOCOL_LABEL_AR, RC_POWER_LABEL_AR,
  RC_ANTENNA_LABEL_AR, RC_FAILSAFE_LABEL_AR, RC_MODULE_LABEL_AR,
  RC_PROTOCOL_FACTS, RC_SYSTEM_BANDS,
  type RcSetup,
} from './rcSetup';

/** Devices that could be competing for the same UART, with their labels. */
function uartClaims(rc: RcSetup): { labelAr: string; index: number }[] {
  const out: { labelAr: string; index: number }[] = [];
  if (rc.uartIndex !== undefined) out.push({ labelAr: 'المستقبل', index: rc.uartIndex });
  if (rc.gpsUartIndex !== undefined) out.push({ labelAr: 'وحدة GPS', index: rc.gpsUartIndex });
  if (rc.videoUartIndex !== undefined) out.push({ labelAr: 'وحدة الفيديو', index: rc.videoUartIndex });
  return out;
}

export function computeRcFindings(p: ProjectSnapshot): Finding[] {
  const rc = p.rcSetup;
  const f: Finding[] = [];
  if (!p.exists || !rc) return f;

  // ── 1. Band — the one mismatch nothing can work around ───────────────────
  if (rc.txBand && rc.rxBand) {
    const ok = rc.txBand === rc.rxBand;
    f.push({
      id: 'rc-band-match',
      severity: ok ? 'ok' : 'blocker',
      confidence: 'typed-spec',
      claimAr: ok
        ? 'وحدة الإرسال والمستقبل على النطاق الترددي نفسه.'
        : 'وحدة الإرسال والمستقبل على نطاقين ترددين مختلفين.',
      whyAr: ok
        ? 'النطاق شرط أولي لا يكفي وحده لكنه لا بديل عنه: جهازان على نطاق واحد يستطيعان على الأقل أن يسمعا بعضهما.'
        : 'الراديو لا يستطيع أن يستقبل على تردد لا يعمل عليه أصلاً. هذا ليس ضعف إشارة يمكن تحسينه بهوائي أو قدرة — لن يحدث ربط مطلقاً مهما فعلت في الإعدادات، لأن الطرفين لا يشتركان في أي تردد.',
      evidenceAr: [
        `وحدة الإرسال: ${RC_BAND_LABEL_AR[rc.txBand]}`,
        `المستقبل: ${RC_BAND_LABEL_AR[rc.rxBand]}`,
      ],
      actionsAr: ok ? [] : [
        'أوقف محاولات الربط — الوقت المصروف عليها ضائع بالكامل',
        'استبدل أحد الطرفين بما يعمل على نطاق الطرف الآخر',
        'راجع صفحة المنتج لكل قطعة: كثير من الطرازات تصدر بنسختين لنطاقين مختلفين بالاسم نفسه تقريباً',
      ],
      missingAr: [],
      links: [
        { kind: 'article', targetId: 'rc-protocols', label: 'مقال: الأنظمة الراديوية والنطاقات' },
        { kind: 'dx', targetId: 'dx-rc-bind-fail', label: 'تشخيص: الربط لا يتم' },
      ],
    });
  }

  // ── 2. System — same band is not the same language ───────────────────────
  if (rc.txSystem && rc.rxSystem) {
    const ok = rc.txSystem === rc.rxSystem;
    f.push({
      id: 'rc-system-match',
      severity: ok ? 'ok' : 'blocker',
      confidence: 'typed-spec',
      claimAr: ok
        ? 'الطرفان يشغّلان النظام الراديوي نفسه.'
        : 'الطرفان يشغّلان نظامين راديويين مختلفين.',
      whyAr: ok
        ? 'النظام الواحد يعني تعديلاً واحداً ونمط رزم واحداً وطريقة ربط واحدة، وهو ما يجعل الربط ممكناً أصلاً.'
        : 'التردد المشترك لا يكفي. كل نظام يبثّ بنمط تعديل وبنية رزمة وتسلسل قفز خاصة به، فجهازان على النطاق نفسه بنظامين مختلفين يسمعان ضجيجاً لا رسالة. هذا يفسّر الحيرة الشائعة: «كلاهما 2.4 ولا يربطان».',
      evidenceAr: [
        `وحدة الإرسال: ${RC_SYSTEM_LABEL_AR[rc.txSystem]}`,
        `المستقبل: ${RC_SYSTEM_LABEL_AR[rc.rxSystem]}`,
      ],
      actionsAr: ok ? [] : [
        'وحّد النظام على الطرفين — إما بتبديل المستقبل أو بتبديل وحدة الإرسال',
        'في الأنظمة المفتوحة لا يشترط أن تكون الشركة واحدة، بل النظام والإصدار',
      ],
      missingAr: [],
      links: [
        { kind: 'article', targetId: 'rc-protocols', label: 'مقال: ما الذي يختلف بين الأنظمة' },
      ],
    });
  }

  // ── 3. Does the declared system even run on the declared band? ───────────
  for (const side of [
    { key: 'tx', system: rc.txSystem, band: rc.txBand, labelAr: 'وحدة الإرسال' },
    { key: 'rx', system: rc.rxSystem, band: rc.rxBand, labelAr: 'المستقبل' },
  ] as const) {
    if (!side.system || !side.band) continue;
    const supported = RC_SYSTEM_BANDS[side.system];
    if (supported.includes(side.band)) continue;
    f.push({
      id: `rc-system-band-${side.key}`,
      severity: 'warning',
      confidence: 'derived',
      claimAr: `النظام المسجَّل في ${side.labelAr} لا يُعرف عنه أنه يعمل على النطاق المسجَّل.`,
      whyAr: 'كل نظام راديوي بُني لنطاق أو أكثر، وقائمتنا تسجّل النطاقات المعروفة لكل نظام. عدم التطابق هنا يعني غالباً أن أحد الحقلين مسجَّل خطأً — وقد يعني أنك تملك نسخة أو طرازاً لا نعرفه، وهو احتمال حقيقي لا نستبعده.',
      evidenceAr: [
        `${side.labelAr}: ${RC_SYSTEM_LABEL_AR[side.system]} على ${RC_BAND_LABEL_AR[side.band]}`,
        `النطاقات المعروفة لهذا النظام عندنا: ${supported.map(b => RC_BAND_LABEL_AR[b]).join(' · ')}`,
      ],
      actionsAr: [
        'راجع ما سجّلته: هل النطاق صحيح فعلاً؟',
        'إن كان صحيحاً فراجع صفحة المنتج — قد يكون طرازك نسخة لا نعرفها، وحينها بياناتنا هي الناقصة لا إعدادك',
      ],
      missingAr: ['النطاقات التي يدعمها طرازك تحديداً، لا نظامه عموماً'],
      manualCheckAr: 'صفحة المنتج لدى الشركة هي المرجع الملزم لنطاق طراز بعينه.',
      links: [{ kind: 'article', targetId: 'rc-protocols', label: 'مقال: الأنظمة والنطاقات' }],
    });
  }

  // ── 4. Regulatory domain — legal, and a silent bind blocker ──────────────
  if (rc.txRegulatoryDomain && rc.rxRegulatoryDomain) {
    const ok = rc.txRegulatoryDomain.trim().toLowerCase() === rc.rxRegulatoryDomain.trim().toLowerCase();
    f.push({
      id: 'rc-domain-match',
      severity: ok ? 'ok' : 'warning',
      confidence: 'typed-spec',
      claimAr: ok
        ? 'النطاق التنظيمي مسجَّل متطابقاً على الطرفين.'
        : 'النطاق التنظيمي مختلف بين وحدة الإرسال والمستقبل.',
      whyAr: ok
        ? 'النطاق التنظيمي يحدد الترددات وحدود القدرة المسموحة، وتطابقه شرط عملي للربط إضافةً إلى كونه مسألة قانونية.'
        : 'اختلاف النطاق التنظيمي ينتج العرَض نفسه الذي ينتجه اختلاف الإصدار أو العبارة: مستقبل يضيء ولا يربط. والأهم أنه مسألة قانونية — الترددات وحدود القدرة تحددها جهة تنظيمية في بلدك.',
      evidenceAr: [
        `وحدة الإرسال: ${rc.txRegulatoryDomain}`,
        `المستقبل: ${rc.rxRegulatoryDomain}`,
      ],
      actionsAr: ok ? [] : [
        'اضبط النطاق التنظيمي المطابق لبلدك على الطرفين',
        'لا تختر نطاقاً لا يخصّك لمجرد أنه ينجح في الربط',
      ],
      missingAr: [],
      links: [{ kind: 'glossary', targetId: 'regulatory-domain', label: 'مصطلح: النطاق التنظيمي' }],
    });
  }

  // ── 5. Firmware versions — the commonest bind failure of all ─────────────
  if (rc.txFirmware && rc.rxFirmware) {
    const same = rc.txFirmware.trim() === rc.rxFirmware.trim();
    f.push({
      id: 'rc-firmware-match',
      severity: same ? 'ok' : 'warning',
      confidence: 'derived',
      claimAr: same
        ? 'الطرفان مسجَّلان على إصدار الـFirmware نفسه.'
        : 'إصدارا الـFirmware مختلفان بين وحدة الإرسال والمستقبل.',
      whyAr: same
        ? 'توحيد الإصدار يزيل السبب الأول لفشل الربط، ويجعل أي عطل لاحق أسهل تفسيراً لأن متغيراً واحداً أقل.'
        : 'اختلاف الإصدار هو السبب الأشيع لعدم الربط بفارق كبير، وخصوصاً بعد تحديث طرف واحد. بعض الإصدارات المتقاربة تتوافق فعلياً وبعضها لا — ولهذا هذا تحذير لا مانع، لكن الفحص الأول عند أي مشكلة ربط يبدأ من هنا.',
      evidenceAr: [
        `وحدة الإرسال: ${rc.txFirmware}`,
        `المستقبل: ${rc.rxFirmware}`,
      ],
      actionsAr: same ? [] : [
        'وحّد الإصدار على الطرفين، وابدأ بوحدة الإرسال',
        'حدّث بقية مستقبلاتك في الجلسة نفسها لتبقى موحّدة',
        'أعد ضبط الـFailsafe واختبره بعد أي تحديث',
      ],
      missingAr: ['جدول توافق الإصدارات لنظامك تحديداً'],
      manualCheckAr: 'توثيق نظامك يذكر أي الإصدارات تتوافق مع أيها — لا نستنتج ذلك من أرقام الإصدارات.',
      links: [
        { kind: 'dx', targetId: 'dx-rc-bind-fail', label: 'تشخيص: الربط لا يتم' },
        { kind: 'article', targetId: 'rc-elrs', label: 'مقال: تحديث النظام بأمان' },
        { kind: 'elrs-setup', targetId: 'update-tx', label: 'ExpressLRS — تحديث وحدة الإرسال' },
        { kind: 'elrs-setup', targetId: 'update-rx', label: 'ExpressLRS — تحديث المستقبل' },
      ],
    });
  }

  // ── 6. Protocol against the flight controller ────────────────────────────
  if (rc.serialProtocol) {
    const facts = RC_PROTOCOL_FACTS[rc.serialProtocol];
    const legacy = facts.legacy;
    f.push({
      id: 'rc-protocol-choice',
      severity: legacy ? 'warning' : 'ok',
      confidence: 'typed-spec',
      claimAr: legacy
        ? `البروتوكول المسجَّل (${RC_PROTOCOL_LABEL_AR[rc.serialProtocol]}) نظام قديم لا يُنصح به لبناء جديد.`
        : `البروتوكول المسجَّل (${RC_PROTOCOL_LABEL_AR[rc.serialProtocol]}) مناسب لبناء حديث.`,
      whyAr: legacy
        ? `${facts.noteAr} البدائل الرقمية الحديثة تعطي دقة أعلى وزمن استجابة أقل وتليمتري بلا أسلاك إضافية، والفارق محسوس لا نظري.`
        : facts.noteAr,
      evidenceAr: [
        `البروتوكول: ${RC_PROTOCOL_LABEL_AR[rc.serialProtocol]}`,
        facts.needsUart ? 'يحتاج منفذ UART مستقلاً' : 'لا يحتاج منفذ UART',
        facts.inverted ? 'إشارة معكوسة — تحتاج منفذاً يدعم العكس' : 'إشارة غير معكوسة',
      ],
      actionsAr: legacy
        ? ['إن كان مستقبلك يدعم بروتوكولاً رقمياً حديثاً فحوّل إليه', 'إن كنت مضطراً للبقاء عليه فتحقق من دعم لوحتك له صراحةً']
        : [],
      missingAr: [],
      links: [
        { kind: 'article', targetId: 'rc-serial-protocols', label: 'مقال: اللغة على السلك' },
        { kind: 'betaflight', targetId: 'receiver', label: 'Betaflight — صفحة المستقبل' },
      ],
    });
  }

  // ── 7. Inverted protocols need a port that inverts ───────────────────────
  if (rc.serialProtocol && RC_PROTOCOL_FACTS[rc.serialProtocol].inverted && rc.uartIndex !== undefined) {
    f.push({
      id: 'rc-inversion-support',
      severity: 'unknown',
      confidence: 'manual-required',
      claimAr: 'لا نستطيع تأكيد أن المنفذ الذي اخترته يدعم عكس الإشارة الذي يحتاجه بروتوكولك.',
      whyAr: 'الإشارة المعكوسة تحتاج منفذاً قادراً على عكسها داخلياً. الدعم يوجد على منافذ بعينها في كثير من اللوحات ولا يوجد إطلاقاً في بعضها، ولا يمكن استنتاجه من رقم المنفذ ولا من طراز اللوحة. هذا يفسّر أن يعمل المستقبل نفسه على منفذ ويصمت على آخر في اللوحة ذاتها.',
      evidenceAr: [
        `البروتوكول: ${RC_PROTOCOL_LABEL_AR[rc.serialProtocol]} — إشارة معكوسة`,
        `المنفذ المسجَّل: UART ${rc.uartIndex}`,
        p.flightController ? `اللوحة: «${p.flightController.nameAr}»` : 'لم تُسجَّل لوحة في المشروع',
      ],
      actionsAr: [
        'افتح مخطط لوحتك وابحث عن المنافذ التي تدعم العكس',
        'إن لم يدعم منفذك العكس فانقل المستقبل إلى منفذ يدعمه، أو استخدم بروتوكولاً غير معكوس إن كان مستقبلك يوفّره',
      ],
      missingAr: ['أي منافذ لوحتك تدعم عكس الإشارة'],
      manualCheckAr: 'مخطط اللوحة من الشركة هو المرجع الوحيد لهذا — لا يُستنتج من رقم المنفذ.',
      links: [
        { kind: 'article', targetId: 'fc-ports', label: 'مقال: المنافذ ونواقل البيانات' },
        { kind: 'betaflight', targetId: 'ports', label: 'Betaflight — صفحة المنافذ' },
      ],
    });
  }

  // ── 8. UART conflict — two devices, one port ─────────────────────────────
  {
    const claims = uartClaims(rc);
    const byIndex = new Map<number, string[]>();
    for (const c of claims) {
      byIndex.set(c.index, [...(byIndex.get(c.index) ?? []), c.labelAr]);
    }
    const clashes = [...byIndex.entries()].filter(([, labels]) => labels.length > 1);
    if (claims.length >= 2) {
      const clash = clashes.length > 0;
      f.push({
        id: 'rc-uart-conflict',
        severity: clash ? 'blocker' : 'ok',
        confidence: 'typed-spec',
        claimAr: clash
          ? 'جهازان مسجَّلان على منفذ UART واحد.'
          : 'كل جهاز مسجَّل على منفذ UART مستقل.',
        whyAr: clash
          ? 'المنفذ التسلسلي لا يُقتسم. جهازان على المنفذ نفسه يعني أن أحدهما لن يعمل، وغالباً يعمل أحدهما فترة ثم يسقط الآخر بلا سبب ظاهر — وهو من أصعب الأعطال تشخيصاً لأن كل قطعة تبدو سليمة وحدها.'
          : 'كل جهاز تسلسلي يحتاج منفذه الخاص، وهذا محقق في تسجيلك.',
        evidenceAr: clash
          ? clashes.map(([idx, labels]) => `UART ${idx}: ${labels.join(' + ')}`)
          : claims.map(c => `${c.labelAr}: UART ${c.index}`),
        actionsAr: clash ? [
          'انقل أحد الجهازين إلى منفذ آخر حرّ',
          'راجع مخطط لوحتك: بعض المنافذ محجوزة مسبقاً ولا تظهر كخيار حرّ',
          'أعد فحص صفحة المنافذ في برنامج الإعداد بعد النقل',
        ] : [],
        missingAr: ['أي المنافذ محجوزة مسبقاً على لوحتك تحديداً'],
        links: [
          { kind: 'betaflight', targetId: 'ports', label: 'Betaflight — صفحة المنافذ' },
          { kind: 'article', targetId: 'fc-ports', label: 'مقال: المنافذ ونواقل البيانات' },
          { kind: 'elrs-issue', targetId: 'uart-conflict', label: 'ExpressLRS — المنفذ مستخدم من طرف آخر' },
          { kind: 'project', targetId: 'findings', label: 'افتح تقرير التعارض' },
        ],
      });
    }
  }

  // ── 9. UART budget against the board's real port count ───────────────────
  if (p.flightController && rc.uartIndex !== undefined) {
    const available = p.flightController.specs.uartCount;
    const withinRange = rc.uartIndex <= available;
    f.push({
      id: 'rc-uart-exists',
      severity: withinRange ? 'ok' : 'blocker',
      confidence: 'typed-spec',
      claimAr: withinRange
        ? 'رقم المنفذ الذي سجّلته موجود على لوحتك.'
        : 'رقم المنفذ الذي سجّلته أكبر من عدد منافذ لوحتك.',
      whyAr: withinRange
        ? 'وجود المنفذ شرط أول؛ يبقى أن تتحقق من مخطط لوحتك أنه غير محجوز لوظيفة أخرى.'
        : 'لا يمكن توصيل جهاز بمنفذ غير موجود. إما أن الرقم مسجَّل خطأً، أو أن اللوحة المسجَّلة في المشروع ليست اللوحة التي تعمل عليها فعلاً.',
      evidenceAr: [
        `اللوحة «${p.flightController.nameAr}»: ${available} منافذ UART`,
        `المنفذ المسجَّل: UART ${rc.uartIndex}`,
      ],
      actionsAr: withinRange ? [] : [
        'راجع رقم المنفذ الذي لحمت عليه فعلاً',
        'تحقق أن اللوحة المسجَّلة في مشروعك هي لوحتك الحقيقية',
      ],
      missingAr: [],
      links: [{ kind: 'article', targetId: 'fc-ports', label: 'مقال: المنافذ' }],
    });
  }

  // ── 10. Receiver supply voltage ──────────────────────────────────────────
  if (rc.rxVoltage) {
    const dangerous = rc.rxVoltage === 'fc-vbat';
    const unknown = rc.rxVoltage === 'unknown';
    f.push({
      id: 'rc-rx-power',
      severity: dangerous ? 'blocker' : unknown ? 'unknown' : 'ok',
      confidence: unknown ? 'manual-required' : 'typed-spec',
      claimAr: dangerous
        ? 'المستقبل مسجَّل على جهد البطارية مباشرةً.'
        : unknown
          ? 'مصدر تغذية المستقبل غير مسجَّل، فلا نستطيع الحكم عليه.'
          : `المستقبل مسجَّل على ${RC_POWER_LABEL_AR[rc.rxVoltage]}.`,
      whyAr: dangerous
        ? 'أغلب المستقبلات الحديثة مصمَّمة لجهد منخفض، وجهد البطارية أعلى منه بأضعاف. النتيجة المعتادة تلف فوري بلا إنذار عند أول توصيل. بعض الطرازات القليلة تقبل مدى أوسع — وهذا استثناء يثبته الدليل لا افتراض يُبنى عليه.'
        : unknown
          ? 'جهد التغذية هو أول ما يقتل المستقبلات، والحكم عليه يحتاج معرفة المسار الذي لحمتَ عليه فعلاً. بدونه لا نستطيع أن نطمئنك ولا أن ننذرك.'
          : 'المسار المسجَّل ضمن ما تقبله المستقبلات الحديثة عادةً؛ يبقى تأكيد الرقم من دليل مستقبلك ومن قياس فعلي على نقطة اللحام.',
      evidenceAr: [
        `المصدر المسجَّل: ${RC_POWER_LABEL_AR[rc.rxVoltage]}`,
        rc.rxModel ? `المستقبل: ${rc.rxModel}` : 'لم يُسجَّل طراز المستقبل',
      ],
      actionsAr: dangerous ? [
        'افصل الطاقة ولا تعد التوصيل قبل التحقق',
        'اقرأ في دليل مستقبلك مدى الجهد المسموح، وقارنه بما لحمت عليه',
        'إن كان المسار خاطئاً فصحّحه، وافحص المستقبل بعد ذلك — قد يكون تضرر بالفعل',
      ] : unknown ? [
        'حدد المسار الذي لحمت عليه فعلاً وسجّله',
        'قِس الجهد على نقطة تغذية المستقبل نفسها قبل أن تثق بأي رقم',
      ] : [
        'قِس الجهد فعلياً على نقطة تغذية المستقبل قبل أول تشغيل',
      ],
      missingAr: unknown || dangerous
        ? ['مدى الجهد المسموح لطراز مستقبلك', 'الجهد المقيس فعلياً على نقطة اللحام']
        : ['الجهد المقيس فعلياً على نقطة اللحام'],
      manualCheckAr: 'دليل المستقبل يذكر مدى الجهد المسموح — وهو المرجع الوحيد، لأن الفروق بين الطرازات حقيقية.',
      links: [
        { kind: 'article', targetId: 'rc-receivers', label: 'مقال: تركيب المستقبل' },
        { kind: 'dx', targetId: 'dx-rc-no-link', label: 'تشخيص: لا يوجد اتصال' },
      ],
    });
  }

  // ── 11. Failsafe strategy — the flyaway rule ─────────────────────────────
  if (rc.failsafeStrategy) {
    const holdLast = rc.failsafeStrategy === 'hold-last';
    const unset = rc.failsafeStrategy === 'unknown';
    const gps = rc.failsafeStrategy === 'gps-return';
    f.push({
      id: 'rc-failsafe-strategy',
      severity: holdLast ? 'blocker' : unset ? 'unknown' : gps ? 'warning' : 'ok',
      confidence: unset ? 'manual-required' : 'typed-spec',
      claimAr: holdLast
        ? 'الطائرة مضبوطة على تثبيت آخر القيم عند فقد الإشارة.'
        : unset
          ? 'سلوك فقد الإشارة غير مسجَّل، فلا نستطيع الحكم عليه.'
          : gps
            ? 'الطائرة مضبوطة على عودة تلقائية بالملاحة عند فقد الإشارة.'
            : 'الطائرة مضبوطة على نزع التسليح عند فقد الإشارة.',
      whyAr: holdLast
        ? 'حين يكرر المستقبل آخر قيمة استلمها، يرى متحكم الطيران أوامر تبدو سليمة ولا يعرف أن الرابط انقطع. فتواصل الطائرة تنفيذ آخر أمر — وهو غالباً تقدّم للأمام. هذا بالضبط مصدر الطائرات التي تختفي في الأفق، وهو خطر على الناس لا على الطائرة وحدها.'
        : unset
          ? 'ما لم يكن السلوك مضبوطاً ومختبَراً، فأنت لا تعرف ما ستفعله طائرتك في أول انقطاع — والانقطاع مسألة وقت لا احتمال.'
          : gps
            ? 'العودة التلقائية تعتمد على تثبيت موقع سليم وبوصلة معايرة وارتفاع كافٍ وبطارية باقية. أيّ من هذه إن اختلّ صار الإجراء نفسه خطراً: طائرة تتجه في اتجاه خاطئ بثقة.'
            : 'نزع التسليح يُسقط الطائرة في مكانها بدل أن تطير بأمر قديم. خسارة قطعة أهون من طائرة تتحرك بلا سيطرة.',
      evidenceAr: [
        `السلوك المسجَّل: ${RC_FAILSAFE_LABEL_AR[rc.failsafeStrategy]}`,
        rc.failsafeTestedOn
          ? `آخر اختبار فعلي مسجَّل: ${rc.failsafeTestedOn}`
          : 'لا يوجد اختبار فعلي مسجَّل لهذه الطائرة',
      ],
      actionsAr: holdLast ? [
        'اضبط المستقبل على التوقف عن الإخراج عند فقد الرابط',
        'اضبط متحكم الطيران على نزع التسليح',
        'اختبر ذلك فعلياً بإطفاء جهاز الإرسال والطائرة على الطاولة وبلا مراوح',
        'لا تطر بهذه الطائرة قبل أن ترى السلوك الصحيح بعينك',
      ] : unset ? [
        'اضبط سلوك فقد الإشارة ثم سجّله هنا',
        'اختبره فعلياً بلا مراوح وسجّل تاريخ الاختبار',
      ] : gps ? [
        'أبقِ نزع التسليح خطةً أساسية ولا تعتمد على العودة وحدها',
        'اختبر العودة في مكان مفتوح وعلى ارتفاع آمن قبل الاعتماد عليها',
      ] : [
        rc.failsafeTestedOn ? 'أعد الاختبار بعد كل تحديث Firmware' : 'اختبره فعلياً وسجّل التاريخ — الإعداد المحفوظ ليس دليلاً',
      ],
      missingAr: rc.failsafeTestedOn ? [] : ['تاريخ اختبار فعلي لسلوك فقد الإشارة على هذه الطائرة'],
      links: [
        { kind: 'article', targetId: 'rc-failsafe', label: 'مقال: الـFailsafe' },
        { kind: 'betaflight', targetId: 'failsafe', label: 'Betaflight — صفحة الـFailsafe' },
        { kind: 'dx', targetId: 'dx-rc-failsafe', label: 'تشخيص: سلوك غير متوقع عند فقد الإشارة' },
        { kind: 'edgetx', targetId: 'failsafe', label: 'EdgeTX — سلوك فقد الإشارة على الجهاز' },
      ],
    });
  }

  // ── 12. Antenna placement ────────────────────────────────────────────────
  if (rc.antennaPlacement) {
    const bad = rc.antennaPlacement === 'inside-frame';
    const weak = rc.antennaPlacement === 'outside-parallel';
    const unknown = rc.antennaPlacement === 'unknown';
    f.push({
      id: 'rc-antenna-placement',
      severity: bad ? 'warning' : weak ? 'warning' : unknown ? 'unknown' : 'ok',
      confidence: unknown ? 'manual-required' : 'derived',
      claimAr: bad
        ? 'الهوائي مسجَّل داخل الهيكل أو ملامساً للكربون.'
        : weak
          ? 'الهوائيان مسجَّلان متوازيين.'
          : unknown
            ? 'وضع الهوائي غير مسجَّل.'
            : 'الهوائيان خارج الهيكل ومتعامدان — أفضل وضع عملي.',
      whyAr: bad
        ? 'ألياف الكربون موصلة كهربائياً، فالهوائي الملامس لها أو المحاط بها يفقد جزءاً كبيراً من إشعاعه. الأثر لا يظهر بجانب الطائرة ويظهر بوضوح على المسافة — وهو أرخص عطل يمكن إصلاحه، لأن كلفة الإصلاح صفر.'
        : weak
          ? 'الهوائيان المتوازيان يقعان في منطقة الضعف نفسها في اللحظة نفسها، فيضيع نصف فائدة وجود اثنين. جعلهما متعامدين يجعل أحدهما يغطي ما يضعف فيه الآخر.'
          : unknown
            ? 'وضع الهوائي من أكبر مؤثرات المدى، ولا يمكن الحكم عليه بلا معرفته.'
            : 'الطرف المشعّ خارج الهيكل يعطي إشعاعاً كاملاً، والتعامد يقلل الوقت الذي يقع فيه الهوائيان معاً في وضع سيّئ.',
      evidenceAr: [
        `الوضع المسجَّل: ${RC_ANTENNA_LABEL_AR[rc.antennaPlacement]}`,
        rc.antennaCount !== undefined ? `عدد الهوائيات: ${rc.antennaCount}` : 'لم يُسجَّل عدد الهوائيات',
      ],
      actionsAr: bad ? [
        'أخرج الطرف المشعّ خارج الهيكل تماماً',
        'أبعده عن أسلاك القدرة وعن وحدة الفيديو بأقصى ما يسمح الهيكل',
        'أعد اختبار المدى وسجّل الفرق قبل التعديل وبعده',
      ] : weak ? [
        'اجعل الهوائيين متعامدين',
        'أعد اختبار المدى بعد التعديل',
      ] : unknown ? [
        'افحص وضع هوائيك وسجّله',
      ] : [],
      missingAr: unknown ? ['وضع الهوائي الفعلي في هذه الطائرة'] : [],
      links: [
        { kind: 'article', targetId: 'rc-antennas', label: 'مقال: الهوائيات' },
        { kind: 'dx', targetId: 'dx-rc-range', label: 'تشخيص: ضعف المدى' },
      ],
    });
  }

  // ── 13. Video interference risk — a cross-system rule ────────────────────
  if (p.videoUnit && rc.antennaPlacement && rc.antennaPlacement !== 'unknown') {
    f.push({
      id: 'rc-video-interference',
      severity: 'unknown',
      confidence: 'manual-required',
      claimAr: 'لا نستطيع الحكم على التداخل بين وحدة الفيديو ورابط التحكم في هذه الطائرة.',
      whyAr: 'وحدة الفيديو تبثّ بقدرة أعلى بكثير من تليمتري التحكم، وقربها من هوائي المستقبل يرفع أرضية الضجيج عنده. أثر ذلك يعتمد على المسافة الفعلية بين الهوائيين وعلى ترتيب الأسلاك وعلى قدرة البثّ — وهي أمور لا تُقاس من بيانات القطع بل تُختبر في طائرتك.',
      evidenceAr: [
        `وحدة الفيديو: «${p.videoUnit.nameAr}»`,
        `وضع هوائي التحكم: ${RC_ANTENNA_LABEL_AR[rc.antennaPlacement]}`,
      ],
      actionsAr: [
        'أجرِ اختبار العزل: شغّل بلا وحدة فيديو وسجّل جودة الرابط، ثم شغّلها وسجّل الفرق',
        'أبعد هوائي المستقبل عن وحدة الفيديو وهوائيها بأقصى ما يسمح الهيكل',
        'اخفض قدرة بثّ الفيديو إلى ما تحتاجه فعلاً',
      ],
      missingAr: [
        'المسافة الفعلية بين هوائي الفيديو وهوائي التحكم',
        'قدرة بثّ الفيديو المستخدمة',
      ],
      manualCheckAr: 'لا يوجد رقم عام يحسم هذا — الاختبار على طائرتك هو المرجع.',
      links: [
        { kind: 'dx', targetId: 'dx-rc-range', label: 'تشخيص: ضعف المدى والتشويش' },
        { kind: 'article', targetId: 'rc-antennas', label: 'مقال: الهوائيات' },
      ],
    });
  }

  // ── 14. Model match, when more than one aircraft is plausible ────────────
  if (rc.modelMatch === false) {
    f.push({
      id: 'rc-model-match',
      severity: 'warning',
      confidence: 'typed-spec',
      claimAr: 'مطابقة النموذج غير مفعّلة.',
      whyAr: 'بلا مطابقة النموذج، أي مستقبل يحمل هوية الربط نفسها سيربط بجهازك فور تشغيله — بما فيه طائرة لم تقصدها. الخطر ليس الربط نفسه بل ما يليه: تسليح طائرة تظن أنك أطفأتها.',
      evidenceAr: [
        'الإعداد المسجَّل: مطابقة النموذج غير مفعّلة',
        rc.txSystem ? `النظام: ${RC_SYSTEM_LABEL_AR[rc.txSystem]}` : 'لم يُسجَّل النظام',
      ],
      actionsAr: [
        'فعّل مطابقة النموذج إن كان نظامك يدعمها',
        'تحقق من أنها ترفض الربط بنموذج خاطئ فعلياً قبل أن تعتمد عليها',
      ],
      missingAr: [],
      links: [
        { kind: 'glossary', targetId: 'model-match', label: 'مصطلح: مطابقة النموذج' },
        { kind: 'article', targetId: 'rc-elrs', label: 'مقال: إعدادات النظام' },
        { kind: 'edgetx', targetId: 'model-match', label: 'EdgeTX — مطابقة النموذج' },
        { kind: 'elrs-issue', targetId: 'model-match-blocks', label: 'ExpressLRS — المطابقة تمنع الاتصال' },
      ],
    });
  }

  // ── 15. Range test currency ──────────────────────────────────────────────
  if (!rc.rangeTestedOn && (rc.txSystem || rc.rxSystem)) {
    f.push({
      id: 'rc-range-test',
      severity: 'unknown',
      confidence: 'manual-required',
      claimAr: 'لا يوجد اختبار مدى مسجَّل لهذه الطائرة.',
      whyAr: 'المدى المعلن في المواصفات يُقاس في ظروف مثالية لا تشبه طائرتك: فيها وحدة فيديو تبثّ ومحركات تولّد ضجيجاً وهيكل كربوني يحيط بالهوائي. الرقم الوحيد الذي يعنيك هو الذي تقيسه بنفسك، وبدونه لا تعرف متى يجب أن تعود.',
      evidenceAr: [
        'لا تاريخ اختبار مدى مسجَّل في المشروع',
        rc.packetRateHz !== undefined ? `معدل الرزم المسجَّل: ${rc.packetRateHz}` : 'لم يُسجَّل معدل الرزم',
      ],
      actionsAr: [
        'أجرِ اختبار مدى على الأرض في اتجاهين وسجّل تاريخه',
        'سجّل قوة الإشارة عند أول انخفاض في الجودة — هذه عتبتك الشخصية للعودة',
        'أعد الاختبار بعد أي تغيير في الهوائي أو الإصدار أو معدل الرزم',
      ],
      missingAr: [
        'عتبة قوة الإشارة التي تبدأ عندها الجودة بالانخفاض في طائرتك',
        'حدّ الحساسية عند معدل الرزم المستخدم في نظامك',
      ],
      manualCheckAr: 'حدود الحساسية لكل معدل رزم منشورة في توثيق نظامك وتختلف بين إصداراته.',
      links: [
        { kind: 'article', targetId: 'rc-testing', label: 'مقال: اختبار الرابط والمدى' },
        { kind: 'article', targetId: 'rc-link-quality', label: 'مقال: قراءة أرقام الرابط' },
      ],
    });
  }

  // ── 16. The module the user actually holds ───────────────────────────────
  if (rc.moduleKind === 'external' && !rc.radioModel) {
    f.push({
      id: 'rc-module-record',
      severity: 'unknown',
      confidence: 'manual-required',
      claimAr: 'سجّلت وحدة خارجية دون تسجيل جهاز الإرسال الذي تركّب فيه.',
      whyAr: 'الوحدة الخارجية تُركَّب في فتحة قياسية، لكن ما يتاح لك من إعدادات ومن طرق تحديث يعتمد على الجهاز ونظام تشغيله. بلا معرفة الجهاز لا نستطيع أن نوجّهك إلى القوائم الصحيحة ولا أن نحكم على ما هو متاح لك.',
      evidenceAr: [`الوحدة: ${RC_MODULE_LABEL_AR[rc.moduleKind]}`, 'جهاز الإرسال غير مسجَّل'],
      actionsAr: ['سجّل طراز جهاز الإرسال وإصدار نظام تشغيله'],
      missingAr: ['طراز جهاز الإرسال', 'إصدار نظام تشغيل الجهاز'],
      manualCheckAr: 'دليل جهازك يذكر نوع الفتحة والقدرة التي تستطيع تغذيتها للوحدة الخارجية.',
      links: [
        { kind: 'article', targetId: 'rc-tx-modules', label: 'مقال: وحدات الإرسال' },
        { kind: 'edgetx', targetId: 'external-module', label: 'EdgeTX — إعداد الوحدة الخارجية' },
        { kind: 'project', targetId: 'radioModel', label: 'سجّل طراز جهاز الإرسال' },
      ],
    });
  }

  return f;
}
