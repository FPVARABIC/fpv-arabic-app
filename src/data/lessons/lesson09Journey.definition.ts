/**
 * Lesson 09 — the ninth LessonJourneyDefinition (Modern Standard Arabic).
 * Pure data, no React, no state — plugs into the generic
 * lessonJourneyEngine.ts and InteractiveLessonJourney.tsx renderer.
 *
 * Uses only stage types already defined in src/types/lessonJourney.ts —
 * no engine, renderer, or stage-system change was needed for this lesson.
 *
 * Unlike Lessons 01, 03, and 05-08, this lesson has NO interactive_diagram
 * stage: its existing diagram (TxRxCross.tsx) is entirely passive (no
 * useReveal, no click handlers, no state, no callback extension point), and
 * inventing new interaction for it would violate the standing rule against
 * adding interactivity to a diagram that doesn't already have any. The
 * correct-vs-wrong wiring contrast the diagram illustrates is instead taught
 * through a `comparison` stage (see `wiringComparisonStage` below), which
 * mirrors the diagram's own two-panel layout in text form. TxRxCross.tsx is
 * therefore left completely untouched and becomes an unreferenced (retained,
 * not deleted) dead-code candidate once this lesson is journey-routed.
 */
import type { LessonJourneyDefinition } from '../../types/lessonJourney';

export const lesson09JourneyDefinition: LessonJourneyDefinition = {
  lessonId: 'lesson-tx-rx',
  readinessOrder: [
    'checkpoint-txConnectsToRxReasoning',
    'txRxCrossDiagram',
    'checkpoint-correctMappingIdentification',
    'checkpoint-communicationFailureNotDamage',
    'checkpoint-sharedGndStillRequired',
    'recall',
  ],
  stages: [
    {
      id: 'orientation',
      type: 'orientation',
      title: 'أهلًا بك في رحلة الدرس التاسع',
      body:
        'في الدرس السابق تعلّمتَ أن VBAT و5V وGND ثلاثة مسارات مختلفة للطاقة، وأن الخلط بينها قد يُتلف جهازك. اليوم ' +
        'الموضوع مختلف تمامًا: لن نتحدث عن الطاقة، بل عن الإشارة — كيف يتحدث Flight Controller (FC) وReceiver مع ' +
        'بعضهما عبر منفذي TX وRX. هذا الدرس لا يعلّمك كيفية إعداد بروتوكول الاستقبال أو ضبط إعدادات البرمجيات — هذا ' +
        'لاحقًا — بل يعلّمك فقط اتجاه الإشارة، ولماذا يجب أن يتقاطع توصيل TX وRX. كالعادة، لا بأس إن أخطأت في ' +
        'الأسئلة — كل خطأ يأتي بشرح واضح.',
    },
    {
      id: 'overview',
      type: 'explanation',
      title: 'قاعدة TX/RX: نظرة عامة',
      body: 'lesson-explanation',
    },
    {
      id: 'txMeaningExplanation',
      type: 'explanation',
      title: 'TX تعني: إشارة صادرة',
      body:
        'TX اختصار لكلمة Transmit، أي (يُرسِل). أي منفذ يحمل اسم TX على أي جهاز هو المنفذ الذي يُرسِل الإشارة إلى ' +
        'الخارج، ولا يستقبل شيئًا بنفسه. عندما ترى TX على FC أو على Receiver، فهذا يعني: هذا الطرف يتحدث، ولا يستمع.',
    },
    {
      id: 'rxMeaningExplanation',
      type: 'explanation',
      title: 'RX تعني: إشارة واردة',
      body:
        'RX اختصار لكلمة Receive، أي (يستقبل). أي منفذ يحمل اسم RX هو المنفذ الذي يستمع للإشارة القادمة من الطرف ' +
        'الآخر، ولا يُرسِل شيئًا بنفسه. بما أن TX يتحدث وRX يستمع، فإن القاعدة المنطقية الوحيدة الممكنة هي: منفذ TX ' +
        'في أي جهاز يجب أن يتصل بمنفذ RX في الجهاز الآخر — لأن من يتحدث يجب أن يصل صوته لمن يستمع، وليس لمتحدث آخر ' +
        'لا يستمع أصلاً.',
    },
    {
      id: 'crossingReasoningCheckpoint',
      type: 'checkpoint',
      title: 'تأكد من فهمك: لماذا التقاطع؟',
      checkpoint: {
        id: 'txConnectsToRxReasoning',
        question: 'لماذا يجب أن يتصل منفذ TX في جهاز بمنفذ RX في الجهاز الآخر، وليس بمنفذ TX آخر؟',
        options: [
          {
            id: 'a', correct: false,
            text: 'لأن هذه قاعدة تقليدية متعارف عليها، دون سبب فني حقيقي.',
            feedback: 'القاعدة ليست تقليدًا فقط، بل نتيجة مباشرة لمعنى TX وRX: طرف يرسل يجب أن يصل لطرف يستمع.',
          },
          {
            id: 'b', correct: true,
            text: 'لأن TX يرسل وRX يستمع؛ توصيل TX بـTX يترك طرفين يتحدثان ولا أحد يستمع، فلا تصل أي إشارة.',
            feedback: 'صحيح تمامًا! الاتصال يحتاج طرفًا يرسل وطرفًا يستقبل؛ توصيل مرسِل بمرسِل آخر لا يترك أي طرف يستمع فعليًا.',
          },
          {
            id: 'c', correct: false,
            text: 'لأن TX وRX لهما جهد مختلف، والتوصيل الصحيح فقط لتفادي تلف الجهاز.',
            feedback: 'هذا الدرس لا يتعلق بجهد أو تلف كهربائي كما في الدرس السابق، بل باتجاه الإشارة نفسها؛ التوصيل الخاطئ هنا لا يتعلق بالجهد بل بغياب طرف يستمع.',
          },
          {
            id: 'd', correct: false,
            text: 'لا فرق فعليًا؛ أي توصيل بين المنفذين ينقل البيانات بطريقة أو بأخرى.',
            feedback: 'التوصيل غير المتقاطع لا ينقل أي بيانات فعليًا؛ اتجاه الإشارة يحدد ما إذا كان الاتصال ممكنًا أصلاً.',
          },
        ],
      },
    },
    {
      id: 'workedExampleFcTxToReceiverRx',
      type: 'worked_example',
      title: 'مثال عملي: منفذ TX في FC يتصل بمنفذ RX في Receiver',
      body:
        'تخيّل أن FC يحتاج إرسال أمر أو بيانات تهيئة إلى Receiver. FC يُرسِل هذه البيانات عبر منفذه TX. لكي تصل هذه ' +
        'البيانات فعليًا، يجب توصيلها بمنفذ RX في Receiver — المنفذ المخصص للاستماع. لو وصّلتَ منفذ TX في FC بمنفذ ' +
        'TX في Receiver بدلاً من ذلك، فلن يستمع أي طرف للبيانات المرسلة، ولن تصل أبدًا.',
    },
    {
      id: 'workedExampleFcRxToReceiverTx',
      type: 'worked_example',
      title: 'مثال عملي: منفذ RX في FC يتصل بمنفذ TX في Receiver',
      body:
        'بالمثل، يحتاج Receiver إرسال بيانات القنوات (Channels) إلى FC. Receiver يُرسِل هذه البيانات عبر منفذه TX. ' +
        'لتصل هذه البيانات، يجب توصيلها بمنفذ RX في FC — الطرف المخصص للاستماع لدى FC. هذا التوصيل عكس اتجاه المثال ' +
        'السابق تمامًا، لكنه يتبع نفس المبدأ: من يرسل يجب أن يصل لمن يستمع.',
    },
    {
      id: 'wiringComparisonStage',
      type: 'comparison',
      title: 'التوصيل الصحيح مقابل الخطأ الشائع',
      items: [
        {
          label: 'الصحيح — التوصيل المتقاطع',
          body:
            'FC TX يتصل بـ Receiver RX، وFC RX يتصل بـ Receiver TX، مع GND مشترك بين الجهازين. كل طرف مرسِل متصل ' +
            'بطرف مستمع، فتصل البيانات في الاتجاهين.',
        },
        {
          label: 'الخطأ الشائع — التوصيل المتطابق',
          body:
            'TX يتصل بـTX، وRX يتصل بـRX — تبدو الأسماء متطابقة، لكن هذا يعني أن كل طرف يتحدث دون أن يستمع له أحد. ' +
            'النتيجة المعتادة هي عدم وجود اتصال إطلاقًا، وليس تلفًا في الجهاز — على عكس أخطاء مسارات الطاقة في ' +
            'الدرس الثامن.',
        },
      ],
      footer:
        'الفرق بين التوصيلين ليس في المظهر (تسميات متطابقة قد تبدو "منظمة")، بل في اتجاه الإشارة الفعلي؛ التوصيل ' +
        'الصحيح يتبع اتجاه الإرسال والاستقبال، وليس تطابق الأسماء.',
    },
    {
      // Added for the lessons rebuild: TxRxCross.tsx gained an explore
      // callback, so both wirings are opened by the learner rather than only
      // looked at.
      id: 'txRxCrossDiagram',
      type: 'interactive_diagram',
      title: 'افتح الحالتَين على المخطّط: لماذا تعمل الأولى ولا تعمل الثانية',
      diagramType: 'tx-rx-cross',
      instructions:
        'اضغط «لماذا؟» على التوصيل الصحيح ثم على الخاطئ. الخطأ لا يُحرق شيئاً — وهذا بالضبط ما يجعله أول ما تفحصه حين «لا يستجيب الراديو».',
      requiredVariants: ['correct', 'wrong'],
      requirementLabel: 'فتح الحالتَين على المخطّط: الصحيحة والخاطئة',
      hints: {
        none: 'ابدأ بالتوصيل الصحيح — اقرأ لماذا تتقاطع الأسلاك.',
        partial: {
          correct: 'قرأتَ الصحيح. افتح الخاطئ الآن لتعرف كيف يبدو الفشل الصامت.',
          wrong: 'قرأتَ الخاطئ. افتح الصحيح لتعرف القاعدة التي تمنعه.',
        },
      },
    },
    {
      id: 'correctMappingCheckpoint',
      type: 'checkpoint',
      title: 'طبّق ما تعلّمته: أي توصيل صحيح؟',
      checkpoint: {
        id: 'correctMappingIdentification',
        question: 'أي توصيل بين FC وReceiver صحيح؟',
        options: [
          {
            id: 'a', correct: true,
            text: 'FC TX يتصل بـ Receiver RX، وFC RX يتصل بـ Receiver TX.',
            feedback: 'صحيح تمامًا! هذا التوصيل يتبع اتجاه الإشارة: كل طرف مرسِل متصل بطرف مستمع في الجهاز الآخر.',
          },
          {
            id: 'b', correct: false,
            text: 'FC TX يتصل بـ Receiver TX، وFC RX يتصل بـ Receiver RX، لأن الأسماء المتطابقة تدل على التوصيل الصحيح.',
            feedback: 'الأسماء المتطابقة لا تدل على التوصيل الصحيح هنا؛ التوصيل الصحيح متقاطع وليس متطابقًا.',
          },
          {
            id: 'c', correct: false,
            text: 'أي توصيل يعمل طالما الأسلاك موصولة فعليًا بين الجهازين.',
            feedback: 'الاتصال الفعلي للأسلاك لا يكفي؛ يجب أن يتبع التوصيل اتجاه الإرسال والاستقبال الصحيح ليعمل.',
          },
          {
            id: 'd', correct: false,
            text: 'التوصيل الصحيح يعتمد على لون السلك المستخدم فقط.',
            feedback: 'لون السلك لا علاقة له بصحة التوصيل؛ ما يهم هو أي منفذ متصل بأي منفذ، وليس لون العزل الخارجي.',
          },
        ],
      },
    },
    {
      id: 'miswireConsequenceExplanation',
      type: 'explanation',
      title: 'ماذا يحدث فعليًا عند توصيل TX مع TX أو RX مع RX؟',
      body:
        'على عكس أخطاء مسارات الطاقة (VBAT/5V) في الدرس السابق، توصيل TX مع TX أو RX مع RX لا يُتلف الجهاز عادة. ' +
        'السبب أن منفذي TX وRX يعملان بجهد إشارة منخفض ومتوافق عادة بين الجهازين، وليس بجهد طاقة عالٍ. النتيجة ' +
        'المعتادة هي ببساطة عدم وجود أي اتصال بينهما إطلاقًا — لا بيانات تصل، لا قنوات تعمل — لكن دون ضرر فعلي في ' +
        'الدوائر الداخلية لأي من الجهازين.',
    },
    {
      id: 'consequenceCheckpoint',
      type: 'checkpoint',
      title: 'تأكد من فهمك: فشل اتصال أم عطل فعلي؟',
      checkpoint: {
        id: 'communicationFailureNotDamage',
        question: 'وصّلتَ TX مع TX عن طريق الخطأ بين FC وReceiver. ما الذي يحدث عادة؟',
        options: [
          {
            id: 'a', correct: false,
            text: 'الجهازان يُتلفان فورًا، تمامًا كما في خطأ توصيل VBAT بمسار 5V.',
            feedback: 'خطأ TX/RX يختلف عن أخطاء مسارات الطاقة؛ لا يُتلف الجهاز عادة، بل ببساطة لا يعمل الاتصال.',
          },
          {
            id: 'b', correct: true,
            text: 'غالبًا لا يحدث اتصال بينهما إطلاقًا، دون تلف فعلي في أي من الجهازين.',
            feedback: 'صحيح تمامًا! هذا خطأ في اتجاه الإشارة وليس في مستوى الجهد؛ النتيجة المعتادة فشل الاتصال فقط، دون ضرر كهربائي.',
          },
          {
            id: 'c', correct: false,
            text: 'الاتصال يعمل لكن ببطء أكبر من المعتاد.',
            feedback: 'التوصيل غير المتقاطع لا ينتج عنه اتصال أبطأ؛ ببساطة لا يحدث اتصال على الإطلاق.',
          },
          {
            id: 'd', correct: false,
            text: 'لا يمكن معرفة النتيجة؛ قد يحدث أي شيء.',
            feedback: 'النتيجة معروفة ومتوقعة: فشل في الاتصال دون تلف كهربائي، وليست عشوائية.',
          },
        ],
      },
    },
    {
      id: 'groundReminderExplanation',
      type: 'explanation',
      title: 'تذكير: GND المشترك ما زال ضروريًا',
      body:
        'حتى لو صحّحتَ توصيل TX وRX تمامًا، فإن الاتصال بين FC وReceiver لن يعمل دون GND مشترك بينهما — تمامًا كما ' +
        'تعلّمت في الدرس السابق. GND هو المرجع الذي تُقاس عنده الإشارة نفسها؛ فحتى توصيل TX/RX الصحيح لا يُغني عن ' +
        'GND مشترك.',
    },
    {
      id: 'groundStillRequiredCheckpoint',
      type: 'checkpoint',
      title: 'تأكد من فهمك: هل التوصيل الصحيح لـTX/RX كافٍ وحده؟',
      checkpoint: {
        id: 'sharedGndStillRequired',
        question: 'صحّحتَ توصيل TX وRX بين FC وReceiver تمامًا، لكن الاتصال ما زال لا يعمل. ما السبب المحتمل؟',
        options: [
          {
            id: 'a', correct: false,
            text: 'لا يوجد سبب محتمل؛ توصيل TX/RX الصحيح كافٍ دائمًا لعمل الاتصال.',
            feedback: 'توصيل TX/RX الصحيح ضروري لكنه غير كافٍ وحده؛ GND مشترك شرط منفصل تمامًا، كما تعلّمت في الدرس الثامن.',
          },
          {
            id: 'b', correct: true,
            text: 'على الأرجح ينقص GND المشترك؛ فصحّة توصيل TX/RX وحدها لا تكفي.',
            feedback: 'صحيح تمامًا! GND هو المرجع الذي تُقاس عنده الإشارة؛ بدونه، حتى التوصيل الصحيح لـTX/RX لا يكفي لعمل الاتصال.',
          },
          {
            id: 'c', correct: false,
            text: 'المشكلة في جهد TX أو RX نفسه، ويجب رفعه.',
            feedback: 'رفع الجهد لن يحل مشكلة GND مفقود؛ المشكلة هنا في المرجع المشترك، وليس في مقدار الجهد.',
          },
          {
            id: 'd', correct: false,
            text: 'GND ضروري فقط لمسارات الطاقة، وليس له علاقة بإشارات TX/RX.',
            feedback: 'GND ضروري لكل إشارة تُنقل بين الجهازين، وليس فقط لمسارات الطاقة؛ فهو المرجع الذي يُقاس عنده أي إشارة صادرة أو واردة.',
          },
        ],
      },
    },
    {
      id: 'glossary',
      type: 'glossary',
      title: 'قاموس مصغّر: اختبر نفسك في كل مصطلح',
      intro: 'حاول تذكّر معنى كل مصطلح بنفسك أولاً، ثم اضغط "اعرض التعريف" للتأكد.',
      terms: [
        { term: 'TX', definition: 'اختصار Transmit (يُرسِل)؛ المنفذ الذي يُرسِل الإشارة إلى الخارج ولا يستقبل شيئًا بنفسه.' },
        { term: 'RX', definition: 'اختصار Receive (يستقبل)؛ المنفذ الذي يستمع للإشارة القادمة من الطرف الآخر ولا يُرسِل شيئًا بنفسه.' },
        { term: 'التوصيل المتقاطع', definition: 'مبدأ توصيل منفذ TX في جهاز بمنفذ RX في الجهاز الآخر، والعكس؛ هو التوصيل الصحيح الوحيد بين FC وReceiver.' },
        { term: 'اتجاه الإشارة', definition: 'المبدأ العام الذي يحدد أي منفذ يرسل وأي منفذ يستقبل؛ فهمه يمنع الاعتماد على تطابق الأسماء فقط.' },
        { term: 'فشل الاتصال', definition: 'النتيجة المعتادة لتوصيل TX مع TX أو RX مع RX: لا تصل أي بيانات، دون تلف كهربائي فعلي في أي من الجهازين.' },
        { term: 'GND كمرجع للإشارة', definition: 'ضرورة وجود GND مشترك بين FC وReceiver حتى تُقاس إشارات TX/RX بمرجع واحد، تمامًا كما في مسارات الطاقة.' },
      ],
    },
    {
      id: 'recall',
      type: 'recall',
      title: 'اختبر استرجاعك قبل أن ننهي الدرس',
      intro:
        'حاول الإجابة بكلماتك الخاصة أولاً في ذهنك، ثم اضغط "اعرض الإجابة" لمقارنة إجابتك — هذه ليست اختبارًا مُقيّمًا، ' +
        'بل تدريب على الاسترجاع.',
      requirementLabel: 'مراجعة أسئلة الاسترجاع النهائي الثلاثة',
      prompts: [
        {
          id: 'whyCrossNotMatch',
          question: 'بكلماتك الخاصة: لماذا يجب أن يكون توصيل TX وRX متقاطعًا وليس متطابقًا؟',
          modelAnswer:
            'لأن TX يُرسِل الإشارة وRX يستمع لها؛ توصيل منفذ يرسل بمنفذ آخر يرسل أيضًا يعني أن لا أحد يستمع فعليًا، ' +
            'فلا تصل أي بيانات. التوصيل المتقاطع فقط يضمن أن كل طرف مرسِل متصل بطرف مستمع.',
        },
        {
          id: 'whyNoDamageUsually',
          question: 'لماذا لا يُتلف توصيل TX مع TX أو RX مع RX الجهاز عادة، على عكس خطأ مسارات الطاقة في الدرس الثامن؟',
          modelAnswer:
            'لأن TX وRX يعملان بجهد إشارة منخفض ومتوافق بين الجهازين، وليس بجهد طاقة عالٍ كما في VBAT؛ لذلك النتيجة ' +
            'المعتادة هي فشل الاتصال فقط دون ضرر كهربائي فعلي.',
        },
        {
          id: 'whyGndStillNeeded',
          question: 'لماذا لا يكفي توصيل TX وRX الصحيح وحده لضمان عمل الاتصال؟',
          modelAnswer:
            'لأن الإشارة تحتاج مرجعًا مشتركًا لتُقاس عنده، وهو GND؛ بدون GND مشترك بين FC وReceiver، حتى التوصيل ' +
            'الصحيح لـTX/RX لا يكفي لعمل الاتصال.',
        },
      ],
    },
    {
      id: 'completion',
      type: 'completion',
      title: 'ملخص الدرس والانتقال إلى الدرس التالي',
      summary:
        'أصبحتَ الآن تفهم أن TX يعني إشارة صادرة وRX يعني إشارة واردة، وأن التوصيل الصحيح بين FC وReceiver يجب أن ' +
        'يكون متقاطعًا: TX مع RX، وRX مع TX. وتعرف أن توصيل TX مع TX أو RX مع RX يسبب عادة فشلًا في الاتصال فقط، دون ' +
        'تلف كهربائي — على عكس أخطاء مسارات الطاقة. وتعلّمتَ أن GND المشترك يبقى ضروريًا حتى بعد تصحيح توصيل TX/RX.',
      nextLessonBridge: (nextLesson) =>
        `عرفتَ الآن كيف يتحدث FC وReceiver عبر التوصيل الصحيح لـTX/RX. في الدرس التالي، "${nextLesson.title}"، ` +
        `ستتعرف على ${nextLesson.description}.`,
    },
  ],
};
