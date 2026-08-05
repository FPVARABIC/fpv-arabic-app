/**
 * المشاريع — the project library's model.
 *
 * WHY THIS IS NOT THE ENCYCLOPEDIA'S MODEL
 * ----------------------------------------
 * An encyclopedia article explains ONE idea and is finished when the reader
 * understands it. A project is a thing somebody builds: it has a difficulty, a
 * bill of parts, a software stack, a sequence of stages, and a set of problems
 * that will bite them at 2am. Those fields have no meaning for an article, and
 * an article's `layers` have no meaning here.
 *
 * They also have different failure modes. An article that is thin is merely
 * unhelpful; a project that is thin is a person who bought €400 of hardware for
 * a build that was never going to work. So this model makes the expensive
 * fields — parts, skills, challenges — REQUIRED rather than optional, and the
 * suite refuses a project that leaves them empty.
 *
 * WHY IT IS NOT «مشروعي» EITHER
 * -----------------------------
 * `src/data/project/` is the reader's OWN build: their parts, their compatibility
 * verdicts, stored in their browser. This is a curated library of builds to
 * learn from. One is personal and private, the other is editorial and public,
 * and merging them would give the reader a page that is half their data and half
 * ours.
 */

/* ── Pointing at the rest of the platform ────────────────────────────────── */

/**
 * The sections a reader can be sent to, spelled the way they are labelled.
 *
 * A closed union rather than a free string so «سيضاف لاحقاً في قسم البرامج»
 * cannot be written for a section that is not called that. The labels here are
 * the ones on the tab bar, and if a tab is renamed this list is what fails.
 */
export type PlatformSectionAr =
  | 'الموسوعة'
  | 'مركز البرامج'
  | 'الدروس'
  | 'المتجر'
  | 'المشاريع'
  | 'التشخيص';

/**
 * A pointer at something that already exists SOMEWHERE ELSE in FPVARABIC.
 *
 * WHY THIS IS AN IDENTITY AND NOT A URL
 * -------------------------------------
 * Same reason `Destination` is: a project written today must still link
 * correctly after the store's routes change, and a path typed into a data file
 * is a second routing table that nothing can audit. The web turns these into
 * hrefs in exactly one place — `web/lib/projectLinks.ts` — and that resolver
 * verifies the target exists before it returns a link.
 *
 * WHY THE LAST TWO CASES EXIST
 * ----------------------------
 * Because the honest answer is often «we do not have that yet», and the brief
 * was explicit that the honest answer must be VISIBLE and must not be a link:
 * «إذا لم يوجد المحتوى بعد، فاعرضه بوضوح على أنه "سيضاف لاحقاً" ولا تنشئ رابطاً
 * ميتاً».
 *
 * They are two different absences and they read differently to a person:
 *
 *   `planned`   — we intend to cover this, in that section, and do not yet.
 *   `elsewhere` — this is genuinely outside what this platform does or sells,
 *                 and here is where it actually comes from.
 *
 * Collapsing them would turn «Raspberry Pi is not something we stock» into
 * «Raspberry Pi is coming to our shop», which is a promise nobody made.
 */
export type PlatformRef =
  /* Live targets. Each is verified against its registry before it renders. */
  | { to: 'kb-article'; id: string }
  | { to: 'kb-module'; id: string }
  | { to: 'glossary'; id: string }
  | { to: 'dx'; id: string }
  /** A `web/lib/softwareHub.ts` entry id — including ones the hub covers only as scope. */
  | { to: 'software'; id: string }
  | { to: 'store-product'; id: string }
  | { to: 'store-category'; id: string }
  | { to: 'project'; id: string }
  | { to: 'lesson'; id: string }
  /* Honest absences. Never rendered as a link. */
  | { to: 'planned'; sectionAr: PlatformSectionAr }
  | { to: 'elsewhere'; whereAr: string };

/** Whether this reference can ever become a link. */
export function refIsLinkable(ref: PlatformRef): boolean {
  return ref.to !== 'planned' && ref.to !== 'elsewhere';
}

/**
 * What a reader must already be able to do before starting.
 *
 * WHY EACH ONE CARRIES A REFERENCE
 * --------------------------------
 * A prerequisite list with no route out of it is a wall. The brief asked that
 * every prerequisite point at where it is taught INSIDE this platform — Python
 * at the lessons, Betaflight at the software centre, a protocol at the
 * encyclopedia — so that «I am not ready for this» becomes «here is the next
 * thing to read» in one click.
 *
 * `whyAr` is required and is about THIS project, not about the skill in
 * general. «تحتاج Python» tells a reader nothing; «تكتب حلقة معالجة تقرأ إطاراً
 * وترسل أمراً كل 30 ملي ثانية» tells them whether their Python is enough.
 */
export interface ProjectPrerequisite {
  titleAr: string;
  /** The name as it is searched and installed. Absent for purely Arabic skills. */
  titleEn?: string;
  whyAr: string;
  ref: PlatformRef;
  /** False for «سيساعدك» rather than «لن تبدأ بدونه». */
  essential: boolean;
}

/**
 * A term the project's own text uses and the reader may not know.
 *
 * WHY A SHORT HINT IS ALLOWED AND A PARAGRAPH IS NOT
 * --------------------------------------------------
 * The rule is «لا تكرر المحتوى — اربط به», and it is right: a term the
 * encyclopedia explains gets a link and nothing else, because a second
 * explanation here is a second thing to keep correct.
 *
 * But a term the encyclopedia does NOT yet explain cannot be duplicated — there
 * is nothing to duplicate — and leaving a reader with a bare «VIO» and a
 * promise is not honest either. So an unlinked term may carry one line, capped
 * hard by the suite, which is enough to keep reading and far too little to
 * become a shadow encyclopedia. A term that HAS an article carries no hint at
 * all, and the suite fails the build if one appears.
 */
export interface ProjectTerm {
  termAr: string;
  termEn: string;
  ref: PlatformRef;
  /** One line. Permitted only when `ref` is `planned` or `elsewhere`. */
  hintAr?: string;
}

/** How hard this is to actually finish. */
export type ProjectDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'research';

export const DIFFICULTY_LABEL_AR: Record<ProjectDifficulty, string> = {
  beginner: 'مبتدئ',
  intermediate: 'متوسّط',
  advanced: 'متقدّم',
  research: 'بحثي',
};

/**
 * What each level actually means, so it is a promise rather than a vibe.
 *
 * Written as «what you must already be able to do», because that is the
 * question a reader is really asking — «is this for me» — and «متقدّم» alone
 * answers it for nobody.
 */
export const DIFFICULTY_MEANS_AR: Record<ProjectDifficulty, string> = {
  beginner:
    'تستطيع تركيب قطع جاهزة ورفع برنامج على لوحة، ولا تحتاج خبرة برمجة عميقة. '
    + 'النتيجة تطير أو تعمل في أول أسبوع.',
  intermediate:
    'تكتب Python أو C++ بثقة، وتعرف طرفية لينكس، وسبق أن ضبطت متحكّم طيران. '
    + 'توقّع أسابيع لا أياماً.',
  advanced:
    'تفهم أنظمة الإحداثيات وتدفّق الرسائل بين الحاسوب المرافق ومتحكّم الطيران، '
    + 'وتستطيع تشخيص عطل لا رسالة خطأ له. توقّع شهوراً وقطعاً محترقة.',
  research:
    'لا توجد وصفة كاملة. المشروع مبنيّ على أوراق بحثية ومستودعات قد لا تعمل معاً '
    + 'من أوّل مرّة، وجزء من العمل هو اكتشاف ما لا يعمل ولماذا.',
};

/** The section a project is filed under. A project may sit in several. */
export type ProjectCategoryId =
  | 'ai'
  | 'computer-vision'
  | 'autonomous-flight'
  | 'fpv'
  | 'raspberry-pi'
  | 'jetson'
  | 'esp32'
  | 'ros'
  | 'open-source'
  | 'research'
  | 'education';

export interface ProjectCategory {
  id: ProjectCategoryId;
  titleAr: string;
  titleEn: string;
  blurbAr: string;
}

/**
 * A part the build needs.
 *
 * `whyAr` is not decoration: the commonest expensive mistake in a build like
 * these is buying the wrong version of the right thing — a Pi that cannot run
 * the model, a camera with a rolling shutter where a global one was needed. The
 * reason is what lets somebody substitute intelligently.
 */
export interface ProjectPart {
  nameAr: string;
  /** The name as it is actually sold and searched. Never translated. */
  nameEn: string;
  whyAr: string;
  /** True when a cheaper or different part genuinely will not do. */
  critical: boolean;
  /**
   * Where this part is bought — our shop, or honestly somewhere else.
   *
   * Required rather than optional. The whole point of the layer is that a
   * reader never meets a part name with no answer to «فمن أين أشتريه», and an
   * optional field is one that gets left out on the tenth project.
   */
  ref: PlatformRef;
}

/** A program, framework or firmware the build runs on. */
export interface ProjectSoftware {
  nameEn: string;
  roleAr: string;
  /** Where its own documentation lives. Verified, never guessed. */
  url?: string;
  /**
   * Where this platform covers it — the software centre, or an honest absence.
   *
   * A project's stack is mostly tools the FPV software centre has never needed
   * to document (OpenCV, ROS 2, PyTorch), so most of these are `planned`. That
   * is not a gap being papered over: it is the backlog, written down where the
   * person who has to fill it can count it.
   */
  ref: PlatformRef;
}

/** One stage of the build. Not every screw — the shape of the work. */
export interface ProjectStage {
  titleAr: string;
  bodyAr: string;
}

/** A part of the architecture, explained rather than merely drawn. */
export interface ProjectComponent {
  nameAr: string;
  roleAr: string;
}

/**
 * A problem that will actually happen.
 *
 * Paired with `mitigationAr` because a list of difficulties with no answers is
 * discouragement, not information.
 */
export interface ProjectChallenge {
  titleAr: string;
  bodyAr: string;
  mitigationAr: string;
}

/**
 * Where a claim comes from.
 *
 * `licenceAr` is recorded for open-source references because the brief asked
 * for the licence to be respected — and because «مبني على مشروع مفتوح» means
 * something different under GPL than under BSD, which is exactly the thing a
 * student is about to get wrong.
 */
export interface ProjectReference {
  titleAr: string;
  url: string;
  kind: 'docs' | 'repo' | 'paper' | 'article';
  /** e.g. `GPL-3.0`, `BSD-3-Clause`. Absent when it is not a code repository. */
  licence?: string;
  noteAr?: string;
}

export interface Project {
  id: string;
  /** A full title, not an abbreviation. */
  titleAr: string;
  titleEn: string;
  /** One line for a card. */
  summaryAr: string;

  /**
   * The definition: enough to decide whether to read on, and no more.
   *
   * Deliberately a paragraph rather than two lines or an essay — the brief was
   * explicit, and it is the right shape: a reader deciding whether to spend a
   * month on something needs to know what it is, not a teaser and not a manual.
   */
  definitionAr: string;
  /** What the project is trying to achieve. */
  ideaAr: string;
  /** Why it was built, and what the reader gains. */
  purposeAr: string;
  /**
   * What the reader will be able to DO afterwards.
   *
   * A list, never a sentence, and never a restatement of the summary. This is
   * the section somebody uses to choose between two projects, so each line has
   * to name a transferable capability — «كيفية ربط MAVLink مع الحاسوب المرافق»
   * — rather than a feeling about the subject.
   */
  learningOutcomesAr: string[];

  /**
   * What must already be true about the reader.
   *
   * The mirror of `learningOutcomesAr`: one says what you leave with, the other
   * says what you arrive with. Together they are the only honest answer to «هل
   * هذا المشروع لي».
   */
  prerequisites: ProjectPrerequisite[];

  /** Terms the project's own text uses, each pointed at where it is explained. */
  glossary: ProjectTerm[];

  difficulty: ProjectDifficulty;
  categoryIds: ProjectCategoryId[];
  /** Rough time to a working first version, in the reader's spare hours. */
  estimatedWeeks: { min: number; max: number };

  skillsAr: string[];
  parts: ProjectPart[];
  software: ProjectSoftware[];

  /** The architecture, named part by part and explained. */
  architectureIntroAr: string;
  components: ProjectComponent[];
  /** How data moves and how decisions get made. */
  dataFlowAr: string;

  stages: ProjectStage[];
  applicationsAr: string[];
  challenges: ProjectChallenge[];
  futureAr: string[];
  references: ProjectReference[];

  /**
   * Whether it is visible to readers.
   *
   * Stored rather than derived, unlike the store's publication gate: a project
   * has no price and no stock, so there is no external condition that decides
   * readiness — only an editor's judgement.
   */
  published: boolean;
  /** Set when the owner uploads one. Absent renders a typed placeholder. */
  imageUrl?: string;
  /** Optional media the admin panel can attach later. */
  videoUrl?: string;
  githubUrl?: string;
  lastReviewed: string;
}

export const PROJECT_CATEGORIES: ProjectCategory[] = [
  {
    id: 'ai', titleAr: 'الذكاء الاصطناعي', titleEn: 'Artificial Intelligence',
    blurbAr: 'نماذج تتعلّم من البيانات وتتّخذ قراراً على متن الطائرة.',
  },
  {
    id: 'computer-vision', titleAr: 'الرؤية الحاسوبية', titleEn: 'Computer Vision',
    blurbAr: 'استخلاص معنى من الصورة: كشف، وتتبّع، وقياس عمق، وتحديد موضع.',
  },
  {
    id: 'autonomous-flight', titleAr: 'الطيران الذاتي', titleEn: 'Autonomous Flight',
    blurbAr: 'طائرة تقرّر مسارها بنفسها بدل أن تنتظر عصا التحكّم.',
  },
  {
    id: 'fpv', titleAr: 'الطيران بالمنظور الأول', titleEn: 'FPV',
    blurbAr: 'مشاريع تبني على عتاد FPV الذي تعرفه أصلاً.',
  },
  {
    id: 'raspberry-pi', titleAr: 'Raspberry Pi', titleEn: 'Raspberry Pi',
    blurbAr: 'حاسوب مرافق رخيص وكافٍ لمهامّ كثيرة أكثر ممّا يُظنّ.',
  },
  {
    id: 'jetson', titleAr: 'NVIDIA Jetson', titleEn: 'NVIDIA Jetson',
    blurbAr: 'حين لا يكفي المعالج العام وتحتاج استدلالاً عصبياً على المتن.',
  },
  {
    id: 'esp32', titleAr: 'ESP32', titleEn: 'ESP32',
    blurbAr: 'متحكّم دقيق بثمن وجبة، يكفي لبناء طائرة كاملة.',
  },
  {
    id: 'ros', titleAr: 'ROS', titleEn: 'Robot Operating System',
    blurbAr: 'الطبقة التي تجعل عشر قطع برمجية تتحدّث بلغة واحدة.',
  },
  {
    id: 'open-source', titleAr: 'مفتوح المصدر', titleEn: 'Open Source',
    blurbAr: 'مبنيّ على مشاريع تستطيع قراءة شيفرتها وتعديلها — باحترام رخصتها.',
  },
  {
    id: 'research', titleAr: 'بحث علمي', titleEn: 'Research',
    blurbAr: 'قريب من حافة المعرفة: أوراق منشورة أكثر من وصفات جاهزة.',
  },
  {
    id: 'education', titleAr: 'تعليمي', titleEn: 'Education',
    blurbAr: 'مصمَّم ليُدرَّس ويُعاد بناؤه في صفّ أو نادٍ أو مختبر.',
  },
];

export function projectCategory(id: string): ProjectCategory | undefined {
  return PROJECT_CATEGORIES.find(c => c.id === id);
}
