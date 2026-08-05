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
}

/** A program, framework or firmware the build runs on. */
export interface ProjectSoftware {
  nameEn: string;
  roleAr: string;
  /** Where its own documentation lives. Verified, never guessed. */
  url?: string;
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
  /** Concrete skills the reader walks away with. */
  learningOutcomesAr: string[];

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
