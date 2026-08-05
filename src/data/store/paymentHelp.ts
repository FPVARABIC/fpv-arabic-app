/**
 * What to do when a payment does not end the way it should.
 *
 * WHY THIS IS CONTENT AND NOT COPY INSIDE THE RESULT PAGE
 * -------------------------------------------------------
 * The result page answers «what happened to THIS order» and must stay short:
 * a person who has just watched a payment fail is not reading a manual. This
 * answers the general question — «فشل الدفع، ماذا أفعل» — which is asked from
 * the search box, days later, and from a different device.
 *
 * It also has to be reachable from the ONE search, and search indexes content,
 * not component strings.
 *
 * WHAT IT REFUSES TO SAY
 * ----------------------
 * Why the bank declined. We do not know: the provider returns a status, not a
 * reason, and the reason a card is refused is between the customer and their
 * issuer. Every guess we could offer — «تأكّد من رصيدك» — is a guess that is
 * wrong most of the time and insulting some of the time.
 *
 * So each state says three things only: what is true right now, whether money
 * has left the account, and the single next step. That is the whole of what we
 * can honestly promise.
 *
 * WHY «تم الخصم ولم يُؤكَّد الطلب» IS ITS OWN ENTRY
 * ------------------------------------------------
 * Because it is the one that frightens people, it is the one where the wrong
 * advice is expensive, and it maps to no single `PaymentStatus` — it is what a
 * customer SEES when a webhook is late or an attempt succeeded at the provider
 * and has not reached us yet. A page organised only by our internal statuses
 * would have no room for it, which is exactly why it is written by SYMPTOM.
 */

export interface PaymentHelpCase {
  id: string;
  /** The state as the customer would describe it, not as we store it. */
  titleAr: string;
  /** What is actually true. One or two sentences. */
  meaningAr: string;
  /** Has money left their account? The first thing they want to know. */
  moneyAr: string;
  /** The single next step. Never a list of things to try. */
  nextStepAr: string;
  /** Set when the answer is «wait», so the page can say how long. */
  waitAr?: string;
}

export const PAYMENT_HELP_CASES: PaymentHelpCase[] = [
  {
    id: 'pending',
    titleAr: 'الدفع ما زال مفتوحاً',
    meaningAr:
      'بدأت عملية الدفع ولم تكتمل بعد. تحدث حين تُغلق نافذة الدفع قبل نهايتها، '
      + 'أو حين ينتظر مزوّد الدفع تأكيداً من مصرفك.',
    moneyAr: 'لم يُخصم شيء بعد. وإن كان مصرفك قد حجز المبلغ مؤقّتاً فسيعود تلقائياً.',
    nextStepAr:
      'أعِد فتح صفحة حالة الطلب وأكمل الدفع من الزرّ نفسه. لا تبدأ طلباً جديداً — '
      + 'سينتج عن ذلك طلبان.',
    waitAr: 'تبقى العملية مفتوحة مدّة يحدّدها مزوّد الدفع، ثم تُغلق من تلقائها.',
  },
  {
    id: 'requires-action',
    titleAr: 'يطلب منك المصرف خطوة إضافية',
    meaningAr:
      'وافق مزوّد الدفع على المتابعة، ويطلب مصرفك تأكيداً منك — رمزاً، أو موافقة '
      + 'داخل تطبيق المصرف.',
    moneyAr: 'لم يُخصم شيء حتى تُنهي هذه الخطوة.',
    nextStepAr: 'افتح تطبيق مصرفك أو رسالته وأكمل التأكيد، ثم عُد إلى صفحة حالة الطلب.',
  },
  {
    id: 'failed',
    titleAr: 'فشل الدفع',
    meaningAr:
      'رفض مزوّد الدفع أو مصرفك العملية. لا يصلنا سبب الرفض — يبقى بينك وبين '
      + 'مصرفك — ولذلك لا نستطيع أن نقول لك لماذا.',
    moneyAr: 'لم يُخصم شيء. المحاولة الفاشلة لا تسحب مالاً.',
    nextStepAr:
      'أعِد المحاولة من صفحة حالة الطلب، ويفضَّل بوسيلة دفع أخرى. إن تكرّر الرفض '
      + 'فالجواب عند مصرفك لا عندنا.',
  },
  {
    id: 'cancelled',
    titleAr: 'أُلغيت العملية',
    meaningAr: 'أُغلقت صفحة الدفع أو ضُغط «إلغاء» قبل إتمامها.',
    moneyAr: 'لم يُخصم شيء.',
    nextStepAr: 'طلبك محفوظ. افتح صفحة حالته وابدأ الدفع من جديد متى شئت.',
  },
  {
    id: 'expired',
    titleAr: 'انتهت مهلة العملية',
    meaningAr:
      'تُغلق عملية الدفع من تلقائها إذا طالت بلا إكمال. هذا إجراء أمان من مزوّد '
      + 'الدفع لا عقوبة.',
    moneyAr: 'لم يُخصم شيء.',
    nextStepAr: 'ابدأ دفعةً جديدة لنفس الطلب من صفحة حالته. الطلب لم يُلغَ.',
  },
  {
    id: 'debited-unconfirmed',
    titleAr: 'خُصم المبلغ والطلب ما زال غير مؤكَّد',
    meaningAr:
      'الحالة التي تقلق فعلاً. تحدث حين ينجح الدفع عند المزوّد ولم يصلنا تأكيده '
      + 'بعد، أو حين يحجز مصرفك المبلغ قبل أن تكتمل العملية عنده.',
    moneyAr:
      'قد يكون المبلغ محجوزاً لا مخصوماً. الحجز يعود تلقائياً إن لم تكتمل العملية، '
      + 'والمدّة يحدّدها مصرفك.',
    // The most important sentence on the page.
    nextStepAr:
      'لا تدفع مرّة ثانية. أعِد تحميل صفحة حالة الطلب بعد قليل؛ فإن بقيت الحالة '
      + 'على ما هي بعد ساعة، تواصل معنا برقم الطلب ونحن نتحقّق من المزوّد مباشرةً.',
    waitAr: 'التأكيد يصل عادةً خلال دقائق. لا نطلب منك الانتظار أكثر من ساعة قبل مراسلتنا.',
  },
  {
    id: 'paid-no-email',
    titleAr: 'نجح الدفع ولم تصلك رسالة',
    meaningAr:
      'حالة الطلب في صفحته هي المرجع، لا البريد. الرسالة قد تتأخّر أو تقع في '
      + 'مجلّد غير المرغوب فيه.',
    moneyAr: 'خُصم المبلغ، والطلب مؤكَّد.',
    nextStepAr: 'افتح صفحة حالة الطلب للتأكّد. إن كانت «مدفوع» فلا شيء عليك فعله.',
  },
  {
    id: 'refund',
    titleAr: 'الاسترجاع',
    meaningAr:
      'الاسترجاع يُنفَّذ من طرفنا عبر مزوّد الدفع نفسه، ويعود إلى وسيلة الدفع التي '
      + 'استُعملت — لا إلى وسيلة أخرى.',
    moneyAr: 'يظهر المبلغ في حسابك بعد أيام يحدّدها مصرفك، لا نحن.',
    nextStepAr: 'راسلنا برقم الطلب وسبب الطلب، وتظهر حالة الاسترجاع في صفحة الطلب فور تنفيذه.',
  },
];

/**
 * The rules that hold whatever the state, stated once at the top of the page.
 *
 * Deliberately three, and deliberately first: they answer the panic before the
 * reader finds their specific case, and two of them prevent an expensive
 * mistake — paying twice, and treating a browser redirect as proof.
 */
export const PAYMENT_HELP_RULES_AR: string[] = [
  'لا تدفع مرّتين. إن لم تكن الحالة واضحة فراسلنا — التحقّق أسرع من الاسترجاع.',
  'صفحة حالة الطلب هي المرجع الوحيد. عودة المتصفّح إلى صفحة «تم» ليست إثباتاً '
  + 'للدفع، ونحن لا نعتبرها كذلك أيضاً: نتحقّق من المزوّد مباشرةً في كل مرّة.',
  'لا نرى بيانات بطاقتك ولا نحتفظ بها. تتم العملية كاملةً عند مزوّد الدفع.',
];

/** When to write to us rather than wait. */
export const PAYMENT_HELP_CONTACT_AR =
  'راسلنا إذا خُصم مبلغ ولم تتغيّر حالة الطلب خلال ساعة، أو إذا ظهر خصمان لطلب '
  + 'واحد، أو إذا كنت تطلب استرجاعاً. اذكر رقم الطلب — يظهر في صفحة حالة الطلب — '
  + 'ولا ترسل بيانات بطاقتك في أي رسالة.';
