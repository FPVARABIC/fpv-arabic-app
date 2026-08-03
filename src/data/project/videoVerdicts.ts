/**
 * Verdicts about the user's video system.
 *
 * These run inside the ONE engine — `computeFindings` calls this file exactly
 * the way it calls `computeRcFindings`. There is no second engine, no second
 * report, and no way for the workspace and a page to disagree.
 *
 * THE RULE THIS FILE EXISTS TO REPLACE
 * ------------------------------------
 * Before this, the platform's only video judgement was `video-fc-support` in
 * `verdicts.ts`, which decided whether a unit was a DJI unit by running
 * `/dji|o4|o3/i` over its DISPLAY NAME. A product name is marketing text, not a
 * specification: it renames between generations, it is translated, and it says
 * nothing about what the device actually needs. That rule now reads the
 * ecosystem the user recorded, and falls back to saying it does not know.
 *
 * THE FOUR RULES, UNCHANGED
 * -------------------------
 * 1. Never invent a number. Pinouts, BEC ratings, per-product firmware
 *    compatibility and above all legal transmit power come from the
 *    manufacturer and from local law — where we lack them we say so.
 * 2. Silence is not approval. A rule that cannot run reports `unknown`.
 * 3. Every finding carries its reasoning and the evidence it rests on.
 * 4. `manual-required` is a first-class answer.
 *
 * WHAT IS A BLOCKER HERE, AND WHY
 * -------------------------------
 * Four things, all of which destroy hardware or make the system impossible:
 *   · goggles from a different digital ecosystem — will never show a picture
 *   · a transmitter powered up with no antenna fitted — damages the output stage
 *   · a mismatched antenna connector — the same failure, wearing a disguise
 *   · a digital air unit fed from a rail that cannot carry it
 * Everything else costs time, not hardware, and is a warning or an open question.
 */

import type { ProjectSnapshot, Finding } from './types';
import {
  VIDEO_ECOSYSTEM_LABEL_AR, VIDEO_ECOSYSTEM_CLASS, VIDEO_ECOSYSTEM_CROSS_VENDOR,
  VIDEO_LINK_CLASS_LABEL_AR, VIDEO_DEVICE_ROLE_LABEL_AR, VIDEO_POLARISATION_LABEL_AR,
  VIDEO_CONNECTOR_LABEL_AR, VIDEO_CONNECTOR_LOOKALIKES, VIDEO_POWER_LABEL_AR,
  VIDEO_COOLING_LABEL_AR, VIDEO_BAND_LABEL_AR,
  VTX_CONTROL_LABEL_AR, VTX_CONTROL_FACTS,
  OSD_PROTOCOL_LABEL_AR, OSD_PROTOCOL_FACTS,
} from '../video/types';
import type { VideoSetup } from './videoSetup';

/** Every declared UART consumer, so a collision can be named rather than guessed. */
function uartClaims(p: ProjectSnapshot, v: VideoSetup): { labelAr: string; index: number }[] {
  const out: { labelAr: string; index: number }[] = [];
  const rc = p.rcSetup;
  if (rc?.uartIndex !== undefined) out.push({ labelAr: 'المستقبل', index: rc.uartIndex });
  if (rc?.gpsUartIndex !== undefined) out.push({ labelAr: 'وحدة GPS', index: rc.gpsUartIndex });
  if (rc?.videoUartIndex !== undefined) out.push({ labelAr: 'وحدة الفيديو', index: rc.videoUartIndex });
  if (v.vtxControlUartIndex !== undefined) out.push({ labelAr: 'التحكم بوحدة الفيديو', index: v.vtxControlUartIndex });
  if (v.osdUartIndex !== undefined) out.push({ labelAr: 'طبقة المعلومات', index: v.osdUartIndex });
  return out;
}

export function computeVideoFindings(p: ProjectSnapshot): Finding[] {
  const v = p.videoSetup;
  const f: Finding[] = [];
  if (!p.exists || !v) return f;

  // ── 1. Goggles against the system — the one mismatch nothing works around ──
  if (v.ecosystem && v.gogglesEcosystem) {
    const same = v.ecosystem === v.gogglesEcosystem;
    const crossVendorOk = VIDEO_ECOSYSTEM_CROSS_VENDOR[v.ecosystem]
      && VIDEO_ECOSYSTEM_CROSS_VENDOR[v.gogglesEcosystem];
    const ok = same || crossVendorOk;
    f.push({
      id: 'video-goggles-system',
      severity: ok ? 'ok' : 'blocker',
      confidence: 'typed-spec',
      claimAr: ok
        ? 'النظارة والوحدة الجوية من منظومة واحدة.'
        : 'النظارة والوحدة الجوية من منظومتين مختلفتين.',
      whyAr: ok
        ? (same
          ? 'المنظومة الواحدة شرط أول لا يكفي وحده: يبقى أن تتحقق من أن الجيلين والإصدارين متوافقان فعلاً حسب توثيق الشركة.'
          : 'النظام التناظري هو الاستثناء الوحيد: الإشارة نفسها هي المعيار، فأي مستقبل تناظري على النطاق نفسه يستطيع فك أي مرسل تناظري.')
        : 'الأنظمة الرقمية مغلقة: كل واحدة تشفّر صورتها بطريقتها الخاصة، ولا توجد نظارة تفكّ تشفير نظام آخر. هذا ليس ضعف إشارة يُحسَّن بهوائي ولا إعداداً يُضبط — لن تظهر صورة أبداً. الحل الوحيد هو أن يكون الطرفان من المنظومة نفسها.',
      evidenceAr: [
        `الوحدة الجوية: ${VIDEO_ECOSYSTEM_LABEL_AR[v.ecosystem]}`,
        `النظارة: ${VIDEO_ECOSYSTEM_LABEL_AR[v.gogglesEcosystem]}`,
      ],
      actionsAr: ok ? [] : [
        'راجع أي الطرفين تريد الاحتفاظ به، فالطرف الآخر يجب أن يوافقه',
        'لا تشترِ محوّلاً — لا يوجد محوّل بين منظومتين رقميتين',
      ],
      missingAr: ok && same ? ['توافق الجيل والإصدار بين هذين المنتجين تحديداً'] : [],
      manualCheckAr: same
        ? 'الاسم التجاري الواحد لا يعني التوافق: توثيق الشركة لكل منتج هو ما يذكر الأجيال والإصدارات التي يعمل معها.'
        : undefined,
      links: [
        { kind: 'betaflight', targetId: 'vtx', label: 'Betaflight — صفحة جهاز الفيديو' },
        { kind: 'project', targetId: 'gogglesEcosystem', label: 'سجّل منظومة نظارتك' },
      ],
    });
  } else if (v.ecosystem && VIDEO_ECOSYSTEM_CLASS[v.ecosystem] === 'digital') {
    f.push({
      id: 'video-goggles-unknown',
      severity: 'unknown',
      confidence: 'manual-required',
      claimAr: 'سجّلت نظاماً رقمياً دون تسجيل منظومة النظارة.',
      whyAr: 'في الأنظمة الرقمية تطابق المنظومة بين الطرفين هو الشرط الذي لا بديل عنه، وهو أول ما يجب التحقق منه قبل أي فحص آخر. بلا معرفة نظارتك لا نستطيع أن نقول لك إن كان إعدادك قابلاً للعمل أصلاً.',
      evidenceAr: [`الوحدة الجوية: ${VIDEO_ECOSYSTEM_LABEL_AR[v.ecosystem]}`, 'منظومة النظارة غير مسجَّلة'],
      actionsAr: ['سجّل منظومة نظارتك وطرازها'],
      missingAr: ['منظومة النظارة', 'طراز النظارة'],
      links: [{ kind: 'project', targetId: 'gogglesEcosystem', label: 'سجّل منظومة نظارتك' }],
    });
  }

  // ── 2. Link class against the ecosystem ───────────────────────────────────
  if (v.ecosystem && v.linkClass) {
    const derived = VIDEO_ECOSYSTEM_CLASS[v.ecosystem];
    if (derived !== 'unknown' && derived !== v.linkClass) {
      f.push({
        id: 'video-class-mismatch',
        severity: 'warning',
        confidence: 'typed-spec',
        claimAr: 'نوع الرابط المسجَّل لا يطابق المنظومة المسجَّلة.',
        whyAr: 'المنظومة تحدد نوع الرابط: التناظري يتدهور تدريجياً إلى ثلج، والرقمي يثبت ثم يتكسّر. تسجيل غير متطابق يعني أن أحد الحقلين خطأ، وكل حكم لاحق سيُبنى على أساس خاطئ.',
        evidenceAr: [
          `المنظومة: ${VIDEO_ECOSYSTEM_LABEL_AR[v.ecosystem]}`,
          `نوع الرابط المسجَّل: ${VIDEO_LINK_CLASS_LABEL_AR[v.linkClass]}`,
          `نوع الرابط المتوقع: ${VIDEO_LINK_CLASS_LABEL_AR[derived]}`,
        ],
        actionsAr: ['صحّح أحد الحقلين ليطابق عتادك الفعلي'],
        missingAr: [],
        links: [{ kind: 'project', targetId: 'linkClass', label: 'صحّح نوع الرابط' }],
      });
    }
  }

  // ── 3. The antenna, before anything is powered ────────────────────────────
  if (v.antennaFittedConfirmed === false) {
    f.push({
      id: 'video-antenna-missing',
      severity: 'blocker',
      confidence: 'typed-spec',
      claimAr: 'سجّلت أن الهوائي غير مركّب على وحدة الإرسال.',
      whyAr: 'وحدة إرسال بلا هوائي لا تجد للقدرة مخرجاً، فتنعكس إلى مرحلة الخرج فيها. الضرر قد يقع في ثوانٍ، وقد يكون دائماً، وقد لا يظهر فوراً بل كضعف مدى غامض لاحقاً. هذه ليست مخاطرة محسوبة — لا يوجد سبب يبرّر تشغيل مرسل بلا هوائي ولو لحظة.',
      evidenceAr: ['الهوائي: غير مركّب حسب تسجيلك'],
      actionsAr: [
        'ركّب الهوائي وأحكم ربطه قبل توصيل البطارية',
        'إن كنت شغّلتها بلا هوائي، اختبر المدى قبل الاعتماد عليها',
      ],
      missingAr: [],
      links: [{ kind: 'project', targetId: 'antennaFittedConfirmed', label: 'حدّث حالة الهوائي' }],
    });
  }

  // ── 4. Connector lookalikes ───────────────────────────────────────────────
  if (v.txAntennaConnector && v.txAntennaConnector !== 'unknown') {
    const lookalike = VIDEO_CONNECTOR_LOOKALIKES
      .find(([a, b]) => a === v.txAntennaConnector || b === v.txAntennaConnector);
    if (lookalike) {
      const other = lookalike[0] === v.txAntennaConnector ? lookalike[1] : lookalike[0];
      f.push({
        id: 'video-connector-lookalike',
        severity: 'unknown',
        confidence: 'manual-required',
        claimAr: `الموصل المسجَّل (${VIDEO_CONNECTOR_LABEL_AR[v.txAntennaConnector]}) له شبيه يسهل الخلط به.`,
        whyAr: `${VIDEO_CONNECTOR_LABEL_AR[v.txAntennaConnector]} و${VIDEO_CONNECTOR_LABEL_AR[other]} يتشابهان في الشكل ويختلفان في التركيب الداخلي، فيلتفّان معاً بلا اتصال فعلي. النتيجة أن الوحدة تعمل عملياً بلا هوائي، وهو أخطر ما يمكن أن يحدث لها — والعرَض يبدو ضعف مدى لا عطلاً واضحاً.`,
        evidenceAr: [`موصل هوائي الإرسال: ${VIDEO_CONNECTOR_LABEL_AR[v.txAntennaConnector]}`],
        actionsAr: [
          'قارن موصل الوحدة بموصل الهوائي بالنظر قبل التركيب',
          'تأكد أن الهوائي يستقر ويشدّ فعلاً ولا يدور بحرية',
        ],
        missingAr: ['نوع موصل الهوائي نفسه'],
        manualCheckAr: 'نوع الموصل على وحدتك وعلى هوائيك مذكور في توثيق كل منهما — لا يُحدَّد بالنظر وحده بثقة.',
        links: [{ kind: 'project', targetId: 'txAntennaConnector', label: 'راجع الموصل المسجَّل' }],
      });
    }
  }

  // ── 5. Polarisation ───────────────────────────────────────────────────────
  if (v.txAntennaPolarisation && v.rxAntennaPolarisation
    && v.txAntennaPolarisation !== 'unknown' && v.rxAntennaPolarisation !== 'unknown') {
    const tx = v.txAntennaPolarisation;
    const rx = v.rxAntennaPolarisation;
    const bothCircular = tx !== 'linear' && rx !== 'linear';
    const opposedCircular = bothCircular && tx !== rx;
    const mixed = (tx === 'linear') !== (rx === 'linear');
    const ok = !opposedCircular && !mixed;
    f.push({
      id: 'video-polarisation',
      severity: opposedCircular ? 'warning' : mixed ? 'warning' : 'ok',
      confidence: 'typed-spec',
      claimAr: ok
        ? 'استقطاب هوائيي الإرسال والاستقبال متوافق.'
        : opposedCircular
          ? 'هوائيا الإرسال والاستقبال دائريان في اتجاهين متعاكسين.'
          : 'أحد الهوائيين خطّي والآخر دائري.',
      whyAr: ok
        ? 'توافق الاستقطاب يعني أن أغلب القدرة المرسلة تصل فعلاً إلى المستقبل بدل أن تُهدر في عدم التوافق.'
        : opposedCircular
          ? 'الاستقطاب الدائري المتعاكس يرفض جزءاً كبيراً من الإشارة رفضاً مقصوداً — وهي الخاصية نفسها التي تجعله جيداً ضد الانعكاسات. النتيجة خسارة كبيرة في المدى بلا أي مقابل، وهي خسارة لا تُعوَّض برفع القدرة.'
          : 'خلط الخطّي بالدائري يُفقد جزءاً ثابتاً من الإشارة مهما اقتربت. الخسارة أقل من التعاكس الدائري لكنها دائمة، والأسوأ أنها تبدو كضعف عتاد بينما هي عدم توافق بسيط.',
      evidenceAr: [
        `هوائي الإرسال: ${VIDEO_POLARISATION_LABEL_AR[tx]}`,
        `هوائي الاستقبال: ${VIDEO_POLARISATION_LABEL_AR[rx]}`,
      ],
      actionsAr: ok ? [] : ['وحّد الاستقطاب على الطرفين قبل أي محاولة لتحسين المدى برفع القدرة'],
      missingAr: [],
      links: [{ kind: 'project', targetId: 'rxAntennaPolarisation', label: 'راجع استقطاب هوائياتك' }],
    });
  }

  // ── 6. Power source for a digital air unit ────────────────────────────────
  if (v.powerSource && v.linkClass === 'digital') {
    const risky = v.powerSource === 'fc-5v';
    const unknown = v.powerSource === 'unknown';
    f.push({
      id: 'video-power-source',
      severity: risky ? 'warning' : unknown ? 'unknown' : 'ok',
      confidence: unknown ? 'manual-required' : 'typed-spec',
      claimAr: risky
        ? 'وحدة رقمية مسجَّلة على خط 5 فولت من متحكم الطيران.'
        : unknown
          ? 'مصدر تغذية وحدة الفيديو غير مسجَّل.'
          : `وحدة الفيديو مسجَّلة على ${VIDEO_POWER_LABEL_AR[v.powerSource]}.`,
      whyAr: risky
        ? 'الوحدات الرقمية تسحب تياراً أعلى بكثير من الكاميرا التناظرية، وكثير منها يتطلب خطاً أعلى جهداً أو تغذية من البطارية عبر منظّم مخصص. خط 5 فولت على اللوحة مشترك عادةً مع المستقبل وGPS، فتحميله فوق طاقته يسقطها كلها معاً — والعرَض يبدو عطلاً في المستقبل لا في الفيديو.'
        : unknown
          ? 'تغذية وحدة الفيديو هي أشيع سبب لانهيار المستقبل وGPS في الجو، لأن الحمل الزائد يظهر على خط مشترك. بلا معرفة المصدر لا نستطيع الحكم.'
          : 'المصدر المسجَّل مناسب مبدئياً، ويبقى التحقق من أن التيار المتاح يكفي ما تسحبه وحدتك فعلاً.',
      evidenceAr: [
        `نوع الرابط: ${VIDEO_LINK_CLASS_LABEL_AR.digital}`,
        v.powerSource === 'unknown' ? 'المصدر: غير مسجَّل' : `المصدر: ${VIDEO_POWER_LABEL_AR[v.powerSource]}`,
        v.becCurrentMa !== undefined ? `تيار الخط المسجَّل: ${v.becCurrentMa} مللي أمبير` : 'تيار الخط غير مسجَّل',
      ],
      actionsAr: risky ? [
        'راجع جهد التغذية الذي تتطلبه وحدتك في توثيقها',
        'إن كانت تتطلب خطاً أعلى، استخدم الخط المخصص على لوحتك أو منظّماً خارجياً',
        'لا تعتمد على أن الوحدة «اشتغلت على الطاولة» — الحمل الكامل يظهر في الطيران',
      ] : unknown ? ['سجّل مصدر التغذية وتيار الخط من دليل لوحتك'] : [],
      missingAr: v.becCurrentMa === undefined
        ? ['التيار الذي يستطيع الخط تقديمه', 'التيار الذي تسحبه وحدتك فعلاً']
        : ['التيار الذي تسحبه وحدتك فعلاً'],
      manualCheckAr: 'قدرة كل خط على لوحتك مذكورة في دليل اللوحة، وسحب وحدتك مذكور في توثيقها. لا يُستنتج أيّهما من الاسم ولا من الشكل.',
      links: [
        { kind: 'article', targetId: 'power-rails', label: 'مقال: خطوط الجهد' },
        { kind: 'project', targetId: 'powerSource', label: 'سجّل مصدر التغذية' },
      ],
    });
  }

  // ── 7. BEC headroom, when both numbers were recorded ──────────────────────
  if (v.becCurrentMa !== undefined && v.linkClass === 'digital') {
    // Deliberately NOT a pass/fail: we do not know this unit's draw. What we can
    // say is whether the rail is small enough that the question must be asked.
    const small = v.becCurrentMa < 1000;
    f.push({
      id: 'video-bec-headroom',
      severity: small ? 'warning' : 'unknown',
      confidence: 'manual-required',
      claimAr: small
        ? 'الخط المسجَّل صغير نسبياً لوحدة رقمية.'
        : 'لا نستطيع الحكم على كفاية الخط دون معرفة سحب وحدتك.',
      whyAr: small
        ? 'الوحدات الرقمية تسحب ذروة تيار عند الإقلاع وعند رفع القدرة أعلى من متوسطها بكثير. خط بهذا الحجم قد يكفي المتوسط ويسقط عند الذروة، والسقوط يظهر كإعادة تشغيل للوحدة أو لكل ما يشاركها الخط.'
        : 'كفاية الخط مسألة رقمين: ما يقدّمه الخط وما تسحبه الوحدة عند الذروة. الأول سجّلته، والثاني في توثيق وحدتك — ولا نخمّنه.',
      evidenceAr: [`تيار الخط المسجَّل: ${v.becCurrentMa} مللي أمبير`],
      actionsAr: [
        'اقرأ سحب وحدتك عند الذروة من توثيقها لا من متوسطها',
        'إن اقترب السحب من حدّ الخط، انقل الوحدة إلى منظّم مستقل',
      ],
      missingAr: ['سحب وحدة الفيديو عند الذروة'],
      manualCheckAr: 'سحب الذروة رقم يذكره المصنّع، ولا يُستنتج من الوزن ولا من الحجم ولا من السعر.',
      links: [{ kind: 'article', targetId: 'power-rails', label: 'مقال: خطوط الجهد' }],
    });
  }

  // ── 8. Shared ground ──────────────────────────────────────────────────────
  if (v.sharedGroundConfirmed === false) {
    f.push({
      id: 'video-shared-ground',
      severity: 'warning',
      confidence: 'typed-spec',
      claimAr: 'سجّلت أن الأرضي المشترك غير مؤكَّد بين الكاميرا ووحدة الإرسال واللوحة.',
      whyAr: 'إشارة الفيديو تُقاس بالنسبة إلى الأرضي. إن لم يكن الأرضي مشتركاً فعلياً بين الأطراف الثلاثة، فما يقيسه المستقبل ليس ما أرسلته الكاميرا — والنتيجة صورة بخطوط أو بتموّج أو غياب صورة كامل رغم سلامة كل قطعة على حدة.',
      evidenceAr: ['الأرضي المشترك: غير مؤكَّد حسب تسجيلك'],
      actionsAr: [
        'تتبّع سلك الأرضي من الكاميرا ومن الوحدة إلى اللوحة بالنظر',
        'إن كانت الوحدة تُغذّى من مصدر منفصل، فالأرضي يجب أن يُوصَل باللوحة أيضاً',
      ],
      missingAr: [],
      links: [
        { kind: 'article', targetId: 'power-noise', label: 'مقال: الضجيج والمكثفات' },
        { kind: 'dx', targetId: 'dx-power-noise', label: 'تشخيص: خطوط في الصورة' },
      ],
    });
  }

  // ── 9. UART collisions across the whole build ─────────────────────────────
  {
    const claims = uartClaims(p, v);
    if (claims.length >= 2) {
      const byIndex = new Map<number, string[]>();
      for (const c of claims) {
        byIndex.set(c.index, [...(byIndex.get(c.index) ?? []), c.labelAr]);
      }
      const clashes = [...byIndex.entries()].filter(([, labels]) => labels.length > 1);
      const clash = clashes.length > 0;
      f.push({
        id: 'video-uart-conflict',
        severity: clash ? 'blocker' : 'ok',
        confidence: 'typed-spec',
        claimAr: clash
          ? 'جهازان مسجَّلان على منفذ تسلسلي واحد.'
          : 'كل جهاز تسلسلي مسجَّل على منفذ مستقل.',
        whyAr: clash
          ? 'المنفذ التسلسلي لا يُقتسم بين وظيفتين. العرَض المميز أن أحدهما يعمل والآخر لا، أو أن أحدهما يعمل فترة ثم يسقط — وكل قطعة تبدو سليمة وحدها، وهو ما يجعل هذا العطل من أطول الأعطال تشخيصاً.'
          : 'كل وظيفة تسلسلية على منفذها الخاص، وهذا محقق في تسجيلك. يبقى أن تتحقق من مخطط لوحتك أن المنافذ المستخدمة غير محجوزة لوظائف داخلية.',
        evidenceAr: clash
          ? clashes.map(([idx, labels]) => `UART ${idx}: ${labels.join(' + ')}`)
          : claims.map(c => `${c.labelAr}: UART ${c.index}`),
        actionsAr: clash ? [
          'انقل إحدى الوظيفتين إلى منفذ آخر حرّ',
          'راجع صفحة المنافذ في برنامج الإعداد بعد النقل',
          'راجع مخطط لوحتك: بعض المنافذ محجوزة مسبقاً ولا تظهر كخيار حرّ',
        ] : [],
        missingAr: ['أي المنافذ محجوزة مسبقاً على لوحتك تحديداً'],
        manualCheckAr: 'المنافذ المحجوزة داخلياً مذكورة في مخطط لوحتك، ولا تظهر دائماً في واجهة الإعداد.',
        links: [
          { kind: 'betaflight', targetId: 'ports', label: 'Betaflight — صفحة المنافذ' },
          { kind: 'elrs-issue', targetId: 'uart-conflict', label: 'إجراء: المنفذ مستخدم من طرف آخر' },
          { kind: 'project', targetId: 'findings', label: 'افتح تقرير التعارض' },
        ],
      });
    }
  }

  // ── 10. The control protocol needs a port, and the port must be recorded ──
  if (v.vtxControlProtocol) {
    const facts = VTX_CONTROL_FACTS[v.vtxControlProtocol];
    const missingPort = facts.needsUart && v.vtxControlUartIndex === undefined;
    f.push({
      id: 'video-vtx-control',
      severity: missingPort ? 'unknown' : 'ok',
      confidence: missingPort ? 'manual-required' : 'typed-spec',
      claimAr: missingPort
        ? `بروتوكول التحكم المسجَّل (${VTX_CONTROL_LABEL_AR[v.vtxControlProtocol]}) يحتاج منفذاً تسلسلياً لم تسجّله.`
        : `بروتوكول التحكم المسجَّل: ${VTX_CONTROL_LABEL_AR[v.vtxControlProtocol]}.`,
      whyAr: missingPort
        ? 'بلا منفذ مخصص ومفعَّل لن يستطيع متحكم الطيران تغيير القناة ولا القدرة، وسيبدو الأمر عطلاً في الوحدة بينما هو وظيفة لم تُفعَّل أصلاً. تسجيل المنفذ هو أيضاً ما يسمح لنا باكتشاف تعارضه مع المستقبل أو GPS.'
        : facts.noteAr,
      evidenceAr: [
        `البروتوكول: ${VTX_CONTROL_LABEL_AR[v.vtxControlProtocol]}`,
        facts.needsUart ? 'يحتاج منفذاً تسلسلياً' : 'لا يحتاج منفذاً تسلسلياً',
        v.vtxControlUartIndex !== undefined ? `المنفذ المسجَّل: UART ${v.vtxControlUartIndex}` : 'لم يُسجَّل منفذ',
      ],
      actionsAr: missingPort
        ? ['فعّل الوظيفة على منفذ حرّ في صفحة المنافذ، ثم سجّل رقمه هنا']
        : [],
      missingAr: missingPort ? ['رقم المنفذ المستخدم للتحكم بوحدة الفيديو'] : [],
      manualCheckAr: facts.versioned
        ? 'إصدار البروتوكول الذي تدعمه وحدتك مذكور في توثيقها، ويحدد ما تستطيع ضبطه فعلياً — لا يُستنتج من شكل الوحدة.'
        : undefined,
      links: [
        { kind: 'betaflight', targetId: 'ports', label: 'Betaflight — صفحة المنافذ' },
        { kind: 'betaflight', targetId: 'vtx', label: 'Betaflight — صفحة جهاز الفيديو' },
      ],
    });
  }

  // ── 11. The overlay protocol against the system ───────────────────────────
  if (v.osdProtocol) {
    const facts = OSD_PROTOCOL_FACTS[v.osdProtocol];
    const missingPort = facts.needsUart && v.osdUartIndex === undefined;
    const analogChipOnDigital = v.osdProtocol === 'analog-chip' && v.linkClass === 'digital';
    f.push({
      id: 'video-osd-protocol',
      severity: analogChipOnDigital ? 'warning' : missingPort ? 'unknown' : 'ok',
      confidence: analogChipOnDigital ? 'derived' : missingPort ? 'manual-required' : 'typed-spec',
      claimAr: analogChipOnDigital
        ? 'سجّلت طبقة معلومات تناظرية على نظام رقمي.'
        : missingPort
          ? `طبقة المعلومات المسجَّلة (${OSD_PROTOCOL_LABEL_AR[v.osdProtocol]}) تحتاج منفذاً لم تسجّله.`
          : `طبقة المعلومات: ${OSD_PROTOCOL_LABEL_AR[v.osdProtocol]}.`,
      whyAr: analogChipOnDigital
        ? 'شريحة الرسم التناظرية ترسم على إشارة فيديو مركّبة، والنظام الرقمي لا يمرّ بتلك الإشارة أصلاً. النتيجة صورة سليمة تماماً بلا أي طبقة معلومات — وهو بالضبط العرَض الذي يقود الناس إلى فحص الكاميرا والوحدة بلا فائدة.'
        : missingPort
          ? `${facts.noteAr} وبلا منفذ مسجَّل لا نستطيع اكتشاف تعارضه مع بقية الأجهزة.`
          : facts.noteAr,
      evidenceAr: [
        `البروتوكول: ${OSD_PROTOCOL_LABEL_AR[v.osdProtocol]}`,
        `من يرسم الطبقة: ${facts.drawnByAr}`,
        v.linkClass ? `نوع الرابط: ${VIDEO_LINK_CLASS_LABEL_AR[v.linkClass]}` : 'نوع الرابط غير مسجَّل',
      ],
      actionsAr: analogChipOnDigital
        ? ['راجع البروتوكول الذي يدعمه نظامك الرقمي فعلاً، وفعّله على منفذ حرّ']
        : missingPort ? ['فعّل الوظيفة على منفذ حرّ ثم سجّل رقمه هنا'] : [],
      missingAr: missingPort ? ['رقم المنفذ المستخدم لطبقة المعلومات'] : [],
      manualCheckAr: 'البروتوكول الذي يدعمه نظامك، وإصدار متحكم الطيران الذي يتطلبه، مذكوران في توثيق النظام — ويختلفان بين الأجيال.',
      links: [
        { kind: 'betaflight', targetId: 'osd', label: 'Betaflight — صفحة عرض المعلومات' },
        { kind: 'article', targetId: 'fc-outputs', label: 'مقال: المخارج وعرض المعلومات' },
      ],
    });
  }

  // ── 12. Cooling ───────────────────────────────────────────────────────────
  if (v.cooling) {
    const sealed = v.cooling === 'enclosed';
    const unknown = v.cooling === 'unknown';
    f.push({
      id: 'video-cooling',
      severity: sealed ? 'warning' : unknown ? 'unknown' : 'ok',
      confidence: unknown ? 'manual-required' : 'derived',
      claimAr: sealed
        ? 'وحدة الفيديو مسجَّلة في حيّز مغلق بلا تهوية.'
        : unknown
          ? 'حالة تبريد وحدة الفيديو غير مسجَّلة.'
          : `التبريد المسجَّل: ${VIDEO_COOLING_LABEL_AR[v.cooling]}.`,
      whyAr: sealed
        ? 'وحدات الإرسال تحوّل جزءاً كبيراً من طاقتها إلى حرارة، والحرارة تتراكم بلا تدفق هواء. النتيجة إما خفض تلقائي للقدرة فيبدو المدى ضعيفاً بلا سبب، أو إيقاف حراري فتختفي الصورة فجأة في الجو، أو تلف دائم. والخطر الأكبر على الطاولة: هناك لا تدفق هواء إطلاقاً.'
        : unknown
          ? 'التبريد يقرر هل تستطيع تشغيل الوحدة على الطاولة أصلاً، وهو أول ما يُسأل عنه عند اختفاء الصورة بعد دقائق من الطيران.'
          : 'التبريد المسجَّل معقول، ويبقى أن تتحقق منه عملياً بلمس الوحدة بعد تشغيل أرضي مطوّل.',
      evidenceAr: [
        `التبريد: ${VIDEO_COOLING_LABEL_AR[v.cooling]}`,
        v.mountingNote ? `الموضع: ${v.mountingNote}` : 'موضع الوحدة غير مسجَّل',
        v.thermalTestedOn ? `آخر فحص حراري: ${v.thermalTestedOn}` : 'لا يوجد فحص حراري مسجَّل',
      ],
      actionsAr: sealed ? [
        'افتح مساراً للهواء، أو انقل الوحدة إلى موضع مكشوف',
        'لا تشغّلها على الطاولة بقدرة عالية إلا لثوانٍ ومع مراقبة الحرارة',
      ] : unknown ? ['سجّل كيف تُبرَّد وحدتك وأين تجلس'] : [],
      missingAr: v.thermalTestedOn ? [] : ['فحص حراري فعلي بعد تشغيل أرضي مطوّل'],
      manualCheckAr: 'حدود الحرارة الآمنة ومتطلبات التهوية مذكورة في توثيق وحدتك.',
      links: [{ kind: 'project', targetId: 'cooling', label: 'سجّل حالة التبريد' }],
    });
  }

  // ── 13. Transmit power against an untested control link ───────────────────
  if (v.powerMw !== undefined && v.powerMw > 0) {
    const rcTested = !!p.rcSetup?.rangeTestedOn;
    f.push({
      id: 'video-power-vs-rc',
      severity: rcTested ? 'ok' : 'unknown',
      confidence: 'manual-required',
      claimAr: rcTested
        ? 'قدرة إرسال الفيديو مسجَّلة، ورابط التحكم مُختبَر.'
        : 'قدرة إرسال الفيديو مسجَّلة ورابط التحكم غير مُختبَر.',
      whyAr: rcTested
        ? 'رفع قدرة الفيديو يزيد الضجيج قرب مستقبل التحكم. اختبارك المسجَّل للمدى هو ما يجعل هذا الرقم قابلاً للتفسير بدل أن يكون تخميناً.'
        : 'قدرة الفيديو العالية هي أشيع سبب لفقدان رابط التحكم على مسافة أقصر بكثير من المتوقع، لأن المرسل يجلس على بعد سنتيمترات من هوائي المستقبل. بلا اختبار مدى مسجَّل لا تعرف أين تبدأ المشكلة، وستكتشفها في الجو.',
      evidenceAr: [
        `القدرة المسجَّلة: ${v.powerMw} مللي واط`,
        v.band ? `النطاق: ${VIDEO_BAND_LABEL_AR[v.band]}` : 'النطاق غير مسجَّل',
        rcTested ? `آخر اختبار مدى للتحكم: ${p.rcSetup?.rangeTestedOn}` : 'لا يوجد اختبار مدى مسجَّل لرابط التحكم',
      ],
      actionsAr: [
        'أجرِ اختبار مدى لرابط التحكم بقدرة الفيديو التي تطير بها فعلاً، لا بأقل منها',
        'ابدأ بأقل قدرة تكفيك؛ القدرة الأعلى ليست تحسيناً مجانياً',
      ],
      missingAr: ['حدود القدرة المسموح بها قانونياً في بلدك'],
      manualCheckAr: 'القدرة المسموح بها قانوناً تختلف بين الدول وبين النطاقات، وهذا الدليل لا يقدّم نصيحة قانونية ولا يفرض حداً — راجع الأنظمة المعمول بها عندك.',
      links: [
        { kind: 'dx', targetId: 'dx-rc-range', label: 'تشخيص: ضعف مدى التحكم' },
        { kind: 'project', targetId: 'rangeTestedOn', label: 'سجّل اختبار المدى' },
      ],
    });
  }

  // ── 14. Was a picture ever actually seen? ─────────────────────────────────
  if (v.ecosystem && !v.imageTestedOn) {
    f.push({
      id: 'video-image-untested',
      severity: 'unknown',
      confidence: 'manual-required',
      claimAr: 'لا يوجد اختبار صورة مسجَّل لهذا الإعداد.',
      whyAr: 'الصورة هي الاختبار الوحيد الذي يثبت أن سلسلة كاملة تعمل: الكاميرا والتغذية والوحدة والهوائي والقناة والنظارة. تركيب الطائرة بالكامل قبل رؤية صورة واحدة يعني أن أي عطل سيُكتشف بعد أن يصير الوصول إليه صعباً.',
      evidenceAr: ['لا تاريخ اختبار صورة مسجَّل في المشروع'],
      actionsAr: [
        'شغّل السلسلة كاملة على الطاولة والمراوح منزوعة، وتأكد من ظهور صورة قبل إغلاق الهيكل',
        'سجّل تاريخ الاختبار هنا',
      ],
      missingAr: ['تاريخ اختبار صورة فعلي'],
      links: [{ kind: 'project', targetId: 'imageTestedOn', label: 'سجّل اختبار الصورة' }],
    });
  }

  // ── 15. Was the overlay ever actually seen? ───────────────────────────────
  if (v.osdProtocol && v.osdProtocol !== 'none' && !v.osdTestedOn) {
    f.push({
      id: 'video-osd-untested',
      severity: 'unknown',
      confidence: 'manual-required',
      claimAr: 'طبقة المعلومات مضبوطة ولم تُختبَر.',
      whyAr: 'الطبقة تفشل مستقلة عن الصورة: قد تكون صورتك مثالية والطبقة غائبة تماماً. وهي ليست زينة — منها تعرف جهد بطاريتك ومتى تعود، فغيابها المكتشَف في الجو يعني رحلة بلا أي إنذار.',
      evidenceAr: [
        `البروتوكول المضبوط: ${OSD_PROTOCOL_LABEL_AR[v.osdProtocol]}`,
        'لا تاريخ اختبار مسجَّل',
      ],
      actionsAr: [
        'تحقق من ظهور الطبقة وقيمها الحيّة على الطاولة قبل الطيران',
        'سجّل تاريخ الاختبار هنا',
      ],
      missingAr: ['تاريخ اختبار فعلي لطبقة المعلومات'],
      links: [
        { kind: 'betaflight', targetId: 'osd', label: 'Betaflight — صفحة عرض المعلومات' },
        { kind: 'project', targetId: 'osdTestedOn', label: 'سجّل اختبار الطبقة' },
      ],
    });
  }

  // ── 16. The air-side device role, when it was never recorded ──────────────
  if (v.ecosystem && !v.airDeviceRole) {
    f.push({
      id: 'video-air-role-unknown',
      severity: 'unknown',
      confidence: 'manual-required',
      claimAr: 'لم تسجّل نوع الجهاز على متن الطائرة.',
      whyAr: 'الفرق بين وحدة إرسال مجرّدة ووحدة جوية متكاملة يغيّر كل شيء لاحقاً: هل تحتاج كاميرا منفصلة، وهل يوجد طرف فيديو تلحم عليه، وأي بروتوكول تحكم ينطبق. بلا هذه المعلومة سنعطيك إرشادات قد لا تنطبق على عتادك.',
      evidenceAr: [`المنظومة: ${VIDEO_ECOSYSTEM_LABEL_AR[v.ecosystem]}`, 'نوع الجهاز الجوي غير مسجَّل'],
      actionsAr: ['سجّل نوع الجهاز: وحدة إرسال، أم وحدة جوية، أم كاميرا ومرسل معاً'],
      missingAr: ['نوع الجهاز الجوي'],
      links: [{ kind: 'project', targetId: 'airDeviceRole', label: 'سجّل نوع جهازك الجوي' }],
    });
  }

  // ── 17. Camera, when the air unit does not integrate one ──────────────────
  if (v.airDeviceRole === 'vtx' && v.cameraIntegrated !== true && !v.cameraModel) {
    f.push({
      id: 'video-camera-missing',
      severity: 'warning',
      confidence: 'derived',
      claimAr: 'سجّلت وحدة إرسال بلا كاميرا مدمجة، ولم تسجّل كاميرا.',
      whyAr: `وحدة الإرسال تبثّ إشارة تُعطى لها؛ هي لا تولّدها. ${VIDEO_DEVICE_ROLE_LABEL_AR.vtx} بلا كاميرا تعني بثّاً بلا صورة — وهو ما يظهر في النظارة كشاشة سوداء أو ثلج رغم أن الوحدة تعمل وتسخن فعلاً.`,
      evidenceAr: [
        `الجهاز الجوي: ${VIDEO_DEVICE_ROLE_LABEL_AR.vtx}`,
        'لا كاميرا مسجَّلة',
      ],
      actionsAr: ['سجّل طراز الكاميرا التي ستغذّي الوحدة، وتحقق من توافق جهدها'],
      missingAr: ['طراز الكاميرا', 'جهد تشغيل الكاميرا'],
      manualCheckAr: 'نطاق جهد الكاميرا وتوافقها مع خرج وحدتك مذكوران في توثيق كل منهما.',
      links: [{ kind: 'project', targetId: 'cameraModel', label: 'سجّل كاميرتك' }],
    });
  }

  return f;
}
