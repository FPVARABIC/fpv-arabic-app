/**
 * The judgements this system will not make on the owner's behalf.
 *
 * WHY A FILE AND NOT A LIST IN THE PANEL
 * --------------------------------------
 * Because each of these is a commercial or legal question with real
 * consequences, and the options and their costs are the work — not the button.
 * Writing them down means the reasoning survives whoever wrote it, and means
 * the panel renders a decision rather than a nag.
 *
 * WHAT MAKES SOMETHING BELONG HERE
 * --------------------------------
 * The system can see the problem and cannot resolve it, because resolving it
 * needs authority nobody gave it: choosing which real product fills a slot,
 * accepting a legal exposure, deciding whether to sell something at all. A
 * missing photograph is NOT one of these — it is work, and it is on the owner's
 * list. These are decisions.
 *
 * WHERE A RECOMMENDATION EXISTS IT IS EVIDENCE-BASED
 * --------------------------------------------------
 * `recommendedOptionId` is set only where the evidence actually points one way.
 * Where it does not — and for three of these five it does not — it is absent,
 * because a recommendation offered out of politeness is one somebody follows.
 */

export type DecisionEffect = 'safe' | 'costly' | 'risky';

export const DECISION_EFFECT_LABEL_AR: Record<DecisionEffect, string> = {
  safe: 'أثر محدود',
  costly: 'يكلّف وقتاً أو مالاً',
  risky: 'يحمل مخاطرة',
};

export interface DecisionOption {
  id: string;
  labelAr: string;
  /** What happens if this is chosen. Concrete, not «may affect the catalogue». */
  effectAr: string;
  effect: DecisionEffect;
  /**
   * What the panel does when this is picked.
   *
   * Only two actions exist, and deliberately: hiding a product is reversible
   * and needs no new data, and «leave it» is a real choice that should be
   * recordable. Anything else — swapping in a different product, splitting one
   * into variants — is a catalogue change that belongs in a reviewed commit,
   * and the panel says so rather than pretending it can do it.
   */
  action: 'unpublish' | 'keep' | 'needs-commit';
}

export interface OwnerDecision {
  id: string;
  productId: string;
  titleAr: string;
  /** What is wrong. */
  problemAr: string;
  /** Why the system cannot settle it. */
  whyNotAutomaticAr: string;
  options: DecisionOption[];
  /** Set only where evidence points one way. Absent is the honest default. */
  recommendedOptionId?: string;
  recommendationBasisAr?: string;
}

export const OWNER_DECISIONS: OwnerDecision[] = [
  {
    id: 'lipo-safe-bag-is-a-category',
    productId: 'lipo-safe-bag',
    titleAr: 'حقيبة الليبو ليست منتجاً بل فئة',
    problemAr:
      'مُدرَجة باسم «LiPo Safe Bag» وشركة «عام». لا موديل محدَّد، فلا صفحة رسمية '
      + 'ولا مواصفة يمكن نقلها ولا صورة يمكن ترخيصها — ولا يمكن طلبها من مورد لأن '
      + 'المورد يسأل: أي واحدة؟',
    whyNotAutomaticAr:
      'اختيار الموديل قرار تجاري: يعتمد على مَن ستشتري منه، وبأي سعر، وأي مقاس '
      + 'يناسب بطاريات متجرك. النظام لا يعرف أياً من الثلاثة.',
    options: [
      {
        id: 'pick-model',
        labelAr: 'اختر موديلاً حقيقياً من شركة معروفة',
        effectAr: 'أعطني اسم الموديل وأكمل وصفه ومواصفاته من صفحة الشركة في الدفعة التالية.',
        effect: 'safe',
        action: 'needs-commit',
      },
      {
        id: 'hide',
        labelAr: 'احجبه حتى تقرّر',
        effectAr: 'يختفي من قسم الملحقات فوراً. لا يؤثّر على أي طلب سابق، وقابل للتراجع.',
        effect: 'safe',
        action: 'unpublish',
      },
      {
        id: 'keep-generic',
        labelAr: 'أبقِه عامّاً واشترِ ما يتوفّر',
        effectAr:
          'يبقى بلا صورة ولا مواصفة، ويصل للعميل شيء لم يره. أسرع طريق إلى شكوى.',
        effect: 'risky',
        action: 'keep',
      },
    ],
    recommendedOptionId: 'pick-model',
    recommendationBasisAr:
      'الحقيبة قطعة سلامة يشتريها الناس مرّة واحدة ويتذكّرون من باعها لهم. '
      + 'موديل محدَّد يمكن توثيقه أفضل تجارياً من فئة.',
  },
  {
    id: 'battery-strap-is-a-category',
    productId: 'battery-strap-set',
    titleAr: 'حزام البطارية ليس منتجاً بل فئة',
    problemAr: 'كسابقه: بلا شركة ولا موديل ولا مقاس محدَّد.',
    whyNotAutomaticAr: 'نفس السبب — اختيار الموديل والمورد قرار تجاري.',
    options: [
      {
        id: 'pick-model',
        labelAr: 'اختر موديلاً ومقاساً',
        effectAr: 'أكمل وصفه ومواصفاته بعد أن تحدّده.',
        effect: 'safe',
        action: 'needs-commit',
      },
      {
        id: 'hide',
        labelAr: 'احجبه',
        effectAr: 'يختفي من قسم الملحقات. قابل للتراجع.',
        effect: 'safe',
        action: 'unpublish',
      },
      {
        id: 'keep-generic',
        labelAr: 'أبقِه عامّاً',
        effectAr: 'قطعة رخيصة والمخاطرة فيها أقلّ من الحقيبة، لكنها تبقى بلا صورة.',
        effect: 'costly',
        action: 'keep',
      },
    ],
  },
  {
    id: 'source-one-duplicate',
    productId: 'tbs-source-one-v5',
    titleAr: 'Source One مرّتين — وقد تبيّن أنهما ليسا واحداً',
    // Rewritten after the second catalogue review. The original framing said
    // flatly that these were one product filed twice, and recommended
    // replacing the aircraft. Reading TBS's own shop showed that is false:
    // they list the bare frame AND a built RTF/BNF set as separate products.
    // The premise changed, so the options and the recommendation had to. What
    // did not change is that the choice stays the shop owner's.
    problemAr:
      '«TBS Source One» مُدرَج مرّتين: مرّة في قسم الخمس إنشات كطائرة، ومرّة في '
      + 'قسم الهياكل. كان مسجَّلاً هنا أن هذا تكرار وأن الأول مصنَّف خطأً — '
      + 'والمراجعة الثانية أثبتت العكس: متجر TBS نفسه يبيع الاثنين كمنتجَين '
      + 'مستقلَّين، «Source One V5.1» هيكلاً مفرداً و«Source One V5.1 RTF/BNF Set» '
      + 'طائرة مبنيّة. فالسؤال لم يعد «أيّهما نحذف» بل «هل تريد بيع الاثنين».',
    whyNotAutomaticAr:
      'بيع الطقم المبنيّ يعني مورداً آخر وسعراً آخر وخدمة ما بعد بيع مختلفة عن '
      + 'بيع ألواح كربون. وهذا قرار تجاري لا يُستنتج من صفحة المصنّع: قد لا تريد '
      + 'أن تبيع طائرة مبنيّة أصلاً في هذه المرحلة.',
    options: [
      {
        id: 'keep-both',
        labelAr: 'أبقِ الاثنين — هما منتجان مختلفان فعلاً',
        effectAr:
          'قسم الخمس إنشات يحتفظ بمدخل اقتصادي، وقسم الهياكل يحتفظ بالهيكل. '
          + 'الوصفان صُحّحا بالفعل ليقول كلٌّ منهما ما هو، فلن يظنّ المشتري أنه '
          + 'يرى الشيء نفسه مرّتين.',
        effect: 'safe',
        action: 'keep',
      },
      {
        id: 'hide-aircraft',
        labelAr: 'أبقِ الهيكل وحده واحجب الطقم المبنيّ',
        effectAr:
          'قسم الخمس إنشات ينزل إلى خيارين. مناسب إن كنت لا تريد بيع طائرات '
          + 'مبنيّة من هذا المورد في هذه المرحلة.',
        effect: 'costly',
        action: 'unpublish',
      },
      {
        id: 'replace-with-aircraft',
        labelAr: 'استبدل الطقم المبنيّ بطائرة خمس إنشات اقتصادية أخرى',
        effectAr:
          'أبحث عن طائرة موثّقة في هذه الفئة وأكملها في دفعة قادمة. '
          + 'هذا خيار إن كنت تفضّل مورداً غير TBS للطائرة الاقتصادية.',
        effect: 'safe',
        action: 'needs-commit',
      },
    ],
    // No recommendation. The evidence now says both products are real, which
    // removes the factual ground the old recommendation stood on — what
    // remains is a commercial preference, and that is not ours to state.
  },
  {
    id: 'pocket-combo-not-a-sku',
    productId: 'radiomaster-pocket-combo',
    titleAr: 'حزمة لا يبيعها أحد كصندوق واحد',
    problemAr:
      '«RadioMaster Pocket + Simulator» فكرة لا منتج: لا مورد يبيعها كوحدة، '
      + 'ولا رقم صنف لها، ولا صورة.',
    whyNotAutomaticAr:
      'تجميعها بأنفسنا يعني شراء الجهاز ثم بيعه مع رخصة محاكي أو كابل — وهذا قرار '
      + 'تجاري بهامش ومسؤولية مختلفَين عن بيع منتج جاهز.',
    options: [
      {
        id: 'hide',
        labelAr: 'احجبها',
        effectAr: 'قسم الأطقم الجاهزة ينزل إلى ثلاثة خيارات — ما يزال ضمن القاعدة.',
        effect: 'safe',
        action: 'unpublish',
      },
      {
        id: 'build-bundle',
        labelAr: 'اجعلها حزمة نجمّعها نحن',
        effectAr:
          'تحتاج تعريف محتواها بدقّة وتسعيرها كمجموع مكوّناتها، وتحمّل مسؤولية '
          + 'ما نضيفه إليها. عمل دفعة كاملة.',
        effect: 'costly',
        action: 'needs-commit',
      },
    ],
    recommendedOptionId: 'hide',
    recommendationBasisAr:
      'جهاز التحكّم نفسه معتمد وموثّق في قسم أجهزة التحكّم، فالفكرة مخدومة بالفعل.',
  },
  {
    id: 'armattan-warranty',
    productId: 'armattan-marmotte',
    titleAr: 'هيكل بضمان مدى الحياة تديره الشركة لا نحن',
    problemAr:
      'Armattan تبيع مباشرة بضمان مدى الحياة على الأذرع، ويُطالَب به عبرها. '
      + 'بيعه بالشحن المباشر يضع المشتري بيننا وبين ضمان لا نملكه ولا نستطيع تنفيذه.',
    whyNotAutomaticAr:
      'قبول هذه المسؤولية أو رفضها قرار قانوني وتجاري. النظام يستطيع أن يصف '
      + 'الوضع ولا يستطيع أن يقرّر تحمّله.',
    options: [
      {
        id: 'hide',
        labelAr: 'احجبه ولا تبِعه',
        effectAr: 'قسم الهياكل ينزل إلى خيارين حتى تضيف بديلاً.',
        effect: 'costly',
        action: 'unpublish',
      },
      {
        id: 'sell-with-disclaimer',
        labelAr: 'بِعه مع توضيح صريح أن الضمان من الشركة لا منّا',
        effectAr:
          'يحتاج نصّاً واضحاً على صفحة المنتج وفي شروط البيع. يبقى احتمال أن يطالبك '
          + 'مشترٍ بما لا تملكه.',
        effect: 'risky',
        action: 'needs-commit',
      },
      {
        id: 'keep-silent',
        labelAr: 'أبقِه بلا توضيح',
        effectAr: 'أسوأ الخيارات: مشترٍ يظنّ أن ضمانه عندك ويكتشف العكس بعد الكسر.',
        effect: 'risky',
        action: 'keep',
      },
    ],
  },
];

export function decisionsFor(productId: string): OwnerDecision[] {
  return OWNER_DECISIONS.filter(d => d.productId === productId);
}
