/**
 * The verdict engine — the platform's unfair advantage over reading an article.
 *
 * An article can tell you "check that the voltage is within the motor's range".
 * Only this can tell you "your motor is rated to 4S and your battery is 6S —
 * this will burn it". Every rule here exists because it answers a question
 * about THE USER'S OWN PARTS that no general text can answer.
 *
 * THE RULES OF THIS FILE
 * ----------------------
 * 1. Never invent a number. If a spec is absent from the catalogue, the honest
 *    output is an `unknown` finding naming exactly what is missing and where
 *    to get it — not silence, and never a guess dressed as a check.
 * 2. Silence is not approval. A rule that cannot run must say so, because a
 *    user who sees no warning reasonably concludes there is nothing to warn
 *    about.
 * 3. Every finding states its reasoning and the evidence it rests on, so the
 *    user can disagree with us on the merits.
 * 4. `manual-required` is a first-class answer. Pinouts, current ratings under
 *    load, and torque figures live in the manufacturer's documentation; saying
 *    "go read it" is more useful than a confident fabrication.
 *
 * ONE ENGINE, NOT TWO
 * -------------------
 * Four of these rules already existed as booleans in
 * `assembly/compatibility/validators.ts`, wired into the assembly section's
 * final report. Those four are CALLED here rather than reimplemented: this
 * file adds the reasoning, evidence, confidence and severity layer on top of
 * them, and `components/Assembly/utils/buildReport.ts` now reads its items
 * back out of this engine. So a user cannot be told "متوافق" on one screen and
 * "مانع" on another about the same two parts — there is a single place where
 * each judgement is made, and a single place where each threshold lives.
 */

import {
  validateFrameMotor,
  validateMotorBattery,
  validateEscBattery,
  validateFramePropeller,
} from '../assembly/compatibility/validators';
import { computeRcFindings } from './rcVerdicts';
import type { ProjectSnapshot, Finding } from './types';
import { SEVERITY_ORDER } from './types';

/** Devices that each consume one UART on the flight controller. */
interface UartConsumer {
  labelAr: string;
  present: boolean;
  /** Some devices can avoid a UART on some boards; those are counted as "likely". */
  certain: boolean;
}

/**
 * Parses a frame's stack-size string (e.g. '30.5x30.5 / 20x20') into the
 * mounting patterns it supports, in millimetres.
 *
 * The field is authored prose because frames genuinely advertise several
 * patterns at once, so this tolerates separators and stray spacing rather than
 * demanding a format the data does not have.
 */
export function parseStackSizes(raw: string | undefined): number[] {
  if (!raw) return [];
  const out: number[] = [];
  for (const m of raw.matchAll(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/gu)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    // Only square patterns are meaningful as a mounting size.
    if (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 0.01) out.push(a);
  }
  return Array.from(new Set(out));
}

/** Motor mounting tolerance, matching the frame/motor size tolerance already in use. */
const STACK_TOLERANCE_MM = 0.6;

export function computeFindings(p: ProjectSnapshot): Finding[] {
  const f: Finding[] = [];
  if (!p.exists) return f;

  // ── 1. Battery voltage against the motor's rated range ────────────────────
  if (p.motor && p.battery) {
    const ok = validateMotorBattery(p.motor, p.battery).isCompatible;
    f.push({
      id: 'voltage-motor',
      severity: ok ? 'ok' : 'blocker',
      confidence: 'typed-spec',
      claimAr: ok
        ? 'جهد بطاريتك ضمن النطاق الذي صُمِّم له محركك.'
        : 'جهد بطاريتك خارج النطاق الذي صُمِّم له محركك.',
      whyAr: ok
        ? 'سرعة دوران المحرك تساوي ثابت KV مضروباً في الجهد. ما دام الجهد ضمن النطاق المعلن، تبقى السرعة والتيار ضمن ما بُني المحرك لتحمّله.'
        : 'سرعة الدوران تساوي ثابت KV مضروباً في الجهد، فجهد أعلى من المصمَّم له يرفع السرعة وسحب التيار ارتفاعاً حاداً. النتيجة المعتادة حرارة شديدة خلال ثوانٍ ثم احتراق المحرك أو الـESC أو كليهما.',
      evidenceAr: [
        `المحرك «${p.motor.nameAr}» مصنّف لـ: ${p.motor.specs.compatibleVoltages.map(v => `${v}S`).join(' · ')}`,
        `البطارية «${p.battery.nameAr}»: ${p.battery.specs.sCount}S`,
      ],
      actionsAr: ok ? [] : [
        'غيّر البطارية إلى عدد خلايا ضمن نطاق المحرك، أو غيّر المحرك إلى واحد يقبل جهدك',
        'لا تشغّل المنظومة بهذه التركيبة ولو لثوانٍ للتجربة',
      ],
      missingAr: [],
      links: [
        { kind: 'article', targetId: 'motor-kv', label: 'مقال: ثابت KV والجهد' },
        { kind: 'article', targetId: 'battery-selection', label: 'مقال: اختيار البطارية' },
      ],
    });
  }

  // ── 2. Battery voltage against the ESC's rated range ──────────────────────
  if (p.esc && p.battery) {
    const ok = validateEscBattery(p.esc, p.battery).isCompatible;
    f.push({
      id: 'voltage-esc',
      severity: ok ? 'ok' : 'blocker',
      confidence: 'typed-spec',
      claimAr: ok
        ? 'جهد بطاريتك ضمن نطاق الـESC.'
        : 'جهد بطاريتك خارج نطاق الـESC.',
      whyAr: ok
        ? 'نطاق جهد الـESC يتعلق بحدود انهيار مكوّناته، وما دمت داخله فالمفاتيح تعمل ضمن تصميمها.'
        : 'نطاق الجهد ليس اقتراحاً بل حدّ انهيار للمكوّنات. تجاوزه لا يعطي أداءً أعلى مقابل حرارة، بل قد يتلف مفاتيح القدرة أو قائد البوابات فوراً وبلا إنذار.',
      evidenceAr: [
        `الـESC «${p.esc.nameAr}» مصنّف لـ: ${p.esc.specs.compatibleVoltages.map(v => `${v}S`).join(' · ')}`,
        `البطارية «${p.battery.nameAr}»: ${p.battery.specs.sCount}S`,
      ],
      actionsAr: ok ? [] : [
        'غيّر البطارية أو الـESC بحيث يقع الجهد داخل النطاق المعلن',
        'انتبه أيضاً إلى أن الكبح النشط يرفع الجهد لحظياً فوق جهد البطارية',
      ],
      missingAr: [],
      links: [
        { kind: 'article', targetId: 'esc-ratings', label: 'مقال: تصنيفات الـESC' },
        { kind: 'dx', targetId: 'dx-power-short', label: 'تشخيص: قصر أو حرارة عند التوصيل' },
      ],
    });
  }

  // ── 3. The design voltage chosen at the size stage vs the battery bought ──
  if (p.cellCount && p.battery && p.cellCount !== p.battery.specs.sCount) {
    f.push({
      id: 'voltage-design-mismatch',
      severity: 'warning',
      confidence: 'typed-spec',
      claimAr: 'البطارية التي اخترتها تختلف عن جهد التصميم الذي بنيت عليه المشروع.',
      whyAr: 'كل قرار سابق في هذا المشروع — المحرك وثابت KV والمروحة — اتُّخذ على أساس جهد التصميم. تغيير الجهد بعدها يغيّر سرعة الدوران والتيار، فتصبح تلك القرارات مبنية على فرض لم يعد قائماً.',
      evidenceAr: [
        `جهد التصميم المختار: ${p.cellCount}S`,
        `البطارية «${p.battery.nameAr}»: ${p.battery.specs.sCount}S`,
      ],
      actionsAr: [
        'إما أن ترجع إلى بطارية بجهد التصميم، أو تعيد مراجعة اختيار المحرك والمروحة على الجهد الجديد',
        'راقب حرارة المحركات والـESC بعد أول رحلة قصيرة إن أبقيت على هذا التغيير',
      ],
      missingAr: [],
      links: [{ kind: 'article', targetId: 'motor-kv', label: 'مقال: ثابت KV والجهد' }],
    });
  }

  // ── 4. ESC channel count against a quadcopter's four motors ───────────────
  if (p.esc) {
    const enough = p.esc.specs.channels >= 4;
    f.push({
      id: 'esc-channels',
      severity: enough ? 'ok' : 'blocker',
      confidence: 'typed-spec',
      claimAr: enough
        ? 'عدد قنوات الـESC يكفي محركات الكوادكابتر الأربعة.'
        : 'عدد قنوات الـESC لا يكفي أربعة محركات.',
      whyAr: enough
        ? 'كل محرك يحتاج قناة قدرة مستقلة، والكوادكابتر أربعة محركات.'
        : 'كل محرك يحتاج قناة قدرة مستقلة بمفاتيحها الستة. لا يمكن تقاسم قناة بين محركين ولا تشغيل محرك بلا قناة.',
      evidenceAr: [`الـESC «${p.esc.nameAr}»: ${p.esc.specs.channels} قنوات`],
      actionsAr: enough ? [] : ['اختر لوحة رباعية القنوات، أو أكمل العدد بوحدات منفردة'],
      missingAr: [],
      links: [{ kind: 'article', targetId: 'esc-form-factors', label: 'مقال: بنى الـESC' }],
    });
  }

  // ── 5. Current headroom — the rule we CANNOT run, said plainly ────────────
  if (p.esc && p.motor) {
    f.push({
      id: 'current-headroom',
      severity: 'unknown',
      confidence: 'manual-required',
      claimAr: 'لا نستطيع الحكم على هامش التيار بين محركك والـESC — البيانات اللازمة ليست عندنا.',
      whyAr: 'هامش التيار يُحسب من سحب المحرك الفعلي مع مروحتك على جهدك، وهذا الرقم لا يُستنتج من حجم المحرك ولا من ثابت KV. مصدره الوحيد الموثوق هو جدول اختبار الدفع الذي تنشره شركة المحرك لاقتران محدد، أو قياسك أنت بحساس تيار معاير. لا نخمّنه لأن الخطأ هنا يحترق.',
      evidenceAr: [
        `الـESC «${p.esc.nameAr}» مصنّف عند ${p.esc.specs.currentRatingA} أمبير مستمر لكل قناة`,
        `المحرك «${p.motor.nameAr}» — لا يوجد سحب تيار موثّق في بياناتنا`,
      ],
      actionsAr: [
        'افتح صفحة محركك لدى الشركة وابحث عن جدول اختبار الدفع لاقترانه مع مروحتك وجهدك',
        `قارن أقصى سحب لمحرك واحد بتصنيف الـESC (${p.esc.specs.currentRatingA} أمبير) واترك هامشاً واضحاً`,
        'أو عاير حساس التيار في طائرتك وقِس السحب الفعلي بعد أول رحلة',
      ],
      missingAr: [
        'سحب التيار الأقصى للمحرك مع المروحة والجهد المختارَين',
        'شروط قياس تصنيف الـESC (درجة الحرارة والتهوية)',
      ],
      manualCheckAr: 'جدول اختبار الدفع من شركة المحرك هو المرجع — لا نستطيع استبداله بتقدير.',
      links: [
        { kind: 'article', targetId: 'esc-ratings', label: 'مقال: التيار المستمر مقابل الذروة' },
        { kind: 'article', targetId: 'prop-pitch', label: 'مقال: الميل وأثره على التيار' },
      ],
    });
  }

  // ── 6. Flight-controller mounting pattern against the frame ───────────────
  if (p.frame && p.flightController) {
    const supported = parseStackSizes(p.frame.specs.stackSizeMm);
    const fcSize = p.flightController.specs.mountingSizeMm;

    if (fcSize === undefined || supported.length === 0) {
      f.push({
        id: 'stack-mount',
        severity: 'unknown',
        confidence: 'manual-required',
        claimAr: 'لا نستطيع تأكيد أن مقاس تثبيت متحكم الطيران يطابق هيكلك.',
        whyAr: 'مقاس التثبيت قيد ميكانيكي مطلق: إما تتطابق الثقوب أو لا تُركَّب اللوحة. أحد الرقمين غير موثّق في بياناتنا، وبعض اللوحات تختلف مقاساتها بين نسخ الطراز نفسه — فالتخمين هنا يعني شراء قطعة لا تُركَّب.',
        evidenceAr: [
          p.frame.specs.stackSizeMm
            ? `الهيكل «${p.frame.nameAr}» يدعم: ${p.frame.specs.stackSizeMm}`
            : `الهيكل «${p.frame.nameAr}» — لا مقاس تثبيت موثّق في بياناتنا`,
          fcSize !== undefined
            ? `متحكم الطيران «${p.flightController.nameAr}»: ${fcSize} مم`
            : `متحكم الطيران «${p.flightController.nameAr}» — لا مقاس تثبيت موثّق في بياناتنا`,
        ],
        actionsAr: [
          'اقرأ مقاس التثبيت في صفحة المنتج لكل من الهيكل واللوحة قبل الشراء',
          'تحقّق أيضاً من الارتفاع الكلي بعد التركيب ومن موضع منفذ USB',
        ],
        missingAr: [
          fcSize === undefined ? 'مقاس تثبيت متحكم الطيران' : '',
          supported.length === 0 ? 'مقاسات التثبيت التي يدعمها الهيكل' : '',
        ].filter(Boolean),
        manualCheckAr: 'صفحة المنتج لدى الشركة تذكر المقاس صراحةً — وهي المرجع الملزم.',
        links: [{ kind: 'article', targetId: 'fc-form-factors', label: 'مقال: البنى ومقاسات التثبيت' }],
      });
    } else {
      const matches = supported.some(s => Math.abs(s - fcSize) <= STACK_TOLERANCE_MM);
      f.push({
        id: 'stack-mount',
        severity: matches ? 'ok' : 'blocker',
        confidence: 'typed-spec',
        claimAr: matches
          ? 'مقاس تثبيت متحكم الطيران مدعوم في هيكلك.'
          : 'مقاس تثبيت متحكم الطيران غير مدعوم في هيكلك.',
        whyAr: matches
          ? 'نمط ثقوب اللوحة يطابق أحد الأنماط التي يوفّرها الهيكل، فالتثبيت مباشر بلا حلول ارتجالية.'
          : 'نمط الثقوب لا يطابق أياً مما يوفّره الهيكل. التركيب عندها يحتاج حلولاً ارتجالية تضرّ بالعزل عن الاهتزاز، والعزل السيئ يظهر لاحقاً كضجيج في الجيروسكوب وحرارة في المحركات.',
        evidenceAr: [
          `الهيكل «${p.frame.nameAr}» يدعم: ${supported.map(s => `${s}×${s}`).join(' · ')} مم`,
          `متحكم الطيران «${p.flightController.nameAr}»: ${fcSize}×${fcSize} مم`,
        ],
        actionsAr: matches ? [] : [
          'اختر لوحة بمقاس يدعمه هيكلك، أو هيكلاً يدعم مقاس لوحتك',
          'لا تعتمد على محوّلات مطبوعة أو حلول لاصقة في مسار التثبيت',
        ],
        missingAr: [],
        links: [
          { kind: 'article', targetId: 'fc-form-factors', label: 'مقال: البنى ومقاسات التثبيت' },
          { kind: 'article', targetId: 'fc-mounting', label: 'مقال: التثبيت والعزل عن الاهتزاز' },
        ],
      });
    }
  }

  // ── 7. UART budget — a real constraint nobody checks until it is too late ──
  if (p.flightController) {
    const consumers: UartConsumer[] = [
      { labelAr: 'المستقبل', present: !!p.receiver, certain: true },
      { labelAr: 'وحدة GPS', present: !!p.gps, certain: true },
      { labelAr: 'وحدة الفيديو الرقمية', present: !!p.videoUnit, certain: false },
    ];
    const used = consumers.filter(c => c.present);
    const certainCount = used.filter(c => c.certain).length;
    const maxCount = used.length;
    const available = p.flightController.specs.uartCount;

    if (maxCount > 0) {
      const tight = maxCount > available;
      const noSpare = !tight && maxCount === available;
      f.push({
        id: 'uart-budget',
        severity: tight ? 'blocker' : noSpare ? 'warning' : 'ok',
        confidence: 'derived',
        claimAr: tight
          ? 'عدد منافذ UART على لوحتك أقل مما تحتاجه أجهزتك.'
          : noSpare
            ? 'منافذ UART ستُستهلك بالكامل بلا منفذ احتياطي.'
            : 'منافذ UART كافية مع بقاء منفذ احتياطي.',
        whyAr: 'كل جهاز تسلسلي يحتاج منفذ UART مستقلاً، ولا يمكن تقاسم منفذ بين جهازين. النقص هنا لا يُكتشف إلا بعد اللحام، حين لا يبقى مكان لتوصيل آخر جهاز — ولهذا يُحسب قبل الشراء لا بعده.',
        evidenceAr: [
          `متحكم الطيران «${p.flightController.nameAr}»: ${available} منافذ UART`,
          `أجهزة تحتاج منفذاً: ${used.map(c => c.labelAr).join(' · ')}`,
          certainCount < maxCount
            ? 'وحدة الفيديو الرقمية قد تعمل على منفذ مخصص في بعض اللوحات — تحقّق من مخطط لوحتك'
            : '',
        ].filter(Boolean),
        actionsAr: tight
          ? [
            'اختر لوحة بعدد منافذ أكبر، أو استغنِ عن أحد الأجهزة',
            'راجع مخطط لوحتك: بعض المنافذ مخصّصة مسبقاً لأجهزة بعينها ولا تُستعمل بحرية',
          ]
          : noSpare
            ? ['اترك منفذاً احتياطياً إن أمكن — إضافة أي جهاز لاحقاً ستتطلب فكّ الطائرة']
            : [],
        missingAr: [
          'أي المنافذ مخصّصة مسبقاً على لوحتك تحديداً',
          'هل تنوي إضافة تليمتري الـESC — وهو يستهلك منفذاً إضافياً',
        ],
        manualCheckAr: 'مخطط لوحتك يحدد أي منفذ متاح فعلاً وأيها محجوز — عدد المنافذ وحده لا يكفي.',
        links: [
          { kind: 'article', targetId: 'fc-ports', label: 'مقال: المنافذ ونواقل البيانات' },
          { kind: 'betaflight', targetId: 'ports', label: 'Betaflight — المنافذ' },
        ],
      });
    }
  }

  // ── 8. Propeller clearance in the frame ───────────────────────────────────
  if (p.frame && p.propeller) {
    const maxSize = p.frame.specs.maxPropSizeInch ?? p.frame.specs.sizeInch;
    const fits = validateFramePropeller(p.frame, p.propeller).isCompatible;
    f.push({
      id: 'prop-clearance',
      severity: fits ? 'ok' : 'blocker',
      confidence: p.frame.specs.maxPropSizeInch !== undefined ? 'typed-spec' : 'derived',
      claimAr: fits
        ? 'مقاس مروحتك يدخل في هيكلك.'
        : 'مقاس مروحتك أكبر مما يسمح به هيكلك.',
      whyAr: fits
        ? 'قطر المروحة ضمن الخلوص الذي يوفّره الهيكل، فلا تلامس بين المراوح ولا مع أجزاء الهيكل.'
        : 'القطر قيد ميكانيكي لا تفضيل. تجاوزه يعني تلامس مروحتين متجاورتين أو ارتطام المروحة بالهيكل، وكلاهما يدمّر القطعة فوراً وقد يسقط الطائرة.',
      evidenceAr: [
        p.frame.specs.maxPropSizeInch !== undefined
          ? `الهيكل «${p.frame.nameAr}»: أقصى مروحة موثّقة ${maxSize} بوصة`
          : `الهيكل «${p.frame.nameAr}»: لا يوجد حد مروحة موثّق — استُعمل مقاسه الاسمي ${maxSize} بوصة كتقدير`,
        `المروحة «${p.propeller.nameAr}»: ${p.propeller.specs.sizeInch} بوصة`,
      ],
      actionsAr: fits ? [] : ['اختر مروحة ضمن الحد، أو هيكلاً يتسع لمروحتك'],
      missingAr: p.frame.specs.maxPropSizeInch === undefined
        ? ['الحد الأقصى الموثّق لقطر المروحة في هذا الهيكل']
        : [],
      links: [{ kind: 'article', targetId: 'prop-sizing', label: 'مقال: قراءة ترميز المروحة' }],
    });
  }

  // ── 9. Frame size against the motor's class ───────────────────────────────
  if (p.frame && p.motor) {
    const nominal = p.motor.compatibilityTags.frameSizeInch;
    // A motor with no declared class gives us nothing to compare against, and
    // `validateFrameMotor` answers "compatible" in that case only because it
    // has no grounds to refuse. Reporting that as a verified pass would be a
    // fabricated approval, so the rule simply does not run.
    if (nominal !== undefined) {
      const ok = validateFrameMotor(p.frame, p.motor).isCompatible;
      f.push({
        id: 'frame-motor-class',
        severity: ok ? 'ok' : 'warning',
        confidence: 'derived',
        claimAr: ok
          ? 'فئة المحرك تناسب حجم هيكلك.'
          : 'فئة المحرك لا تناسب حجم هيكلك.',
        whyAr: ok
          ? 'حجم الجزء الثابت في المحرك يقع في الفئة التي بُني لها هذا الحجم من الهياكل، فالعزم والوزن متناسبان مع المروحة التي يتسع لها.'
          : 'حجم الجزء الثابت يحدد العزم الذي يستطيع المحرك تقديمه وحجم المروحة التي يحرّكها. محرك أصغر من فئة الهيكل يعني عزماً غير كافٍ وسحباً عالياً، وأكبر منها يعني وزناً زائداً وقصوراً ذاتياً يبطئ الاستجابة.',
        evidenceAr: [
          `الهيكل «${p.frame.nameAr}»: ${p.frame.specs.sizeInch} بوصة`,
          `المحرك «${p.motor.nameAr}»: فئة ${nominal} بوصة${p.motor.specs.maxFrameSizeInch !== undefined ? ` (حد موثّق حتى ${p.motor.specs.maxFrameSizeInch} بوصة)` : ''}`,
        ],
        actionsAr: ok ? [] : [
          'راجع فئة المحرك مقابل حجم هيكلك قبل الشراء',
          'إن أصررت على هذه التركيبة، راقب حرارة المحركات وسحب التيار بعد أول رحلة',
        ],
        missingAr: p.motor.specs.maxFrameSizeInch === undefined
          ? ['الحد الأقصى الموثّق لحجم الهيكل لهذا المحرك']
          : [],
        links: [{ kind: 'article', targetId: 'motor-sizing', label: 'مقال: قراءة ترميز المحرك' }],
      });
    }
  }

  // ── 10. Digital video unit against flight-controller support ──────────────
  if (p.videoUnit && p.flightController) {
    const supports = p.flightController.specs.supportsDjiO4;
    const looksDji = /dji|o4|o3/i.test(`${p.videoUnit.nameEn} ${p.videoUnit.nameAr}`);
    if (looksDji && supports === false) {
      f.push({
        id: 'video-fc-support',
        severity: 'warning',
        confidence: 'typed-spec',
        claimAr: 'وحدة الفيديو التي اخترتها قد لا تكون مدعومة مباشرةً على لوحتك.',
        whyAr: 'وحدات الفيديو الرقمية الحديثة تحتاج موصلاً وجهداً ودعماً في الـFirmware معاً. غياب أحدها يعني توصيلاً يدوياً أعقد، وأحياناً حاجة إلى منظّم خارجي أو منفذ إضافي.',
        evidenceAr: [
          `متحكم الطيران «${p.flightController.nameAr}»: لا يعلن دعماً مباشراً لهذه الفئة`,
          `وحدة الفيديو «${p.videoUnit.nameAr}»`,
        ],
        actionsAr: [
          'راجع مخطط لوحتك ومتطلبات جهد وحدة الفيديو قبل اللحام',
          'تحقّق من توفّر منفذ UART ومن جهد التغذية المطلوب',
        ],
        missingAr: ['متطلبات التوصيل الدقيقة لهذه الوحدة على هذه اللوحة تحديداً'],
        manualCheckAr: 'دليل اللوحة ودليل وحدة الفيديو معاً — التوافق هنا لا يُستنتج من الاسم.',
        links: [{ kind: 'article', targetId: 'fc-outputs', label: 'مقال: المخارج وعرض المعلومات' }],
      });
    }
  }

  // The control-link rules live in their own file because they reason about
  // per-build CONFIGURATION rather than about catalogue specs — but they are
  // the same engine, sorted into the same single ordering, so a screen can
  // never show one set without the other.
  f.push(...computeRcFindings(p));

  return sortFindings(f);
}

/** Blockers first, then warnings, then unknowns, then verified. */
export function sortFindings(list: Finding[]): Finding[] {
  return [...list].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );
}

export interface FindingCounts {
  blocker: number;
  warning: number;
  unknown: number;
  ok: number;
}

export function countFindings(list: Finding[]): FindingCounts {
  return {
    blocker: list.filter(x => x.severity === 'blocker').length,
    warning: list.filter(x => x.severity === 'warning').length,
    unknown: list.filter(x => x.severity === 'unknown').length,
    ok: list.filter(x => x.severity === 'ok').length,
  };
}
