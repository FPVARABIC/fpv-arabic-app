'use server';

import { revalidatePath } from 'next/cache';
import { getSession, sessionCan } from '@/lib/server/session';
import { mergeProjectOverride, listProjectOverrides, isServiceConfigured } from '@/lib/backend/supabase/adminData';
import { actorFromSession, logAudit, markAuditResult, newRequestId } from '@/lib/server/audit';
import type { ProjectSeed } from '@core/data/projects/types';
import { getProject } from '@core/data/projects/registry';
import { resolvedProject } from '@/lib/server/projects';
import { isKnownRef, PLANNED_SECTIONS } from '@/lib/projectRefOptions';
import { isSafeExternalUrl } from '@/lib/webRoutes';
import {
  PROJECT_CATEGORIES,
} from '@core/data/projects/types';
import type {
  Project, PlatformRef, PlatformSectionAr,
  ProjectDifficulty, ProjectCategoryId,
} from '@core/data/projects/types';

/**
 * Writing a project without a deployment.
 *
 * WHY THIS SCREEN EXISTS AT ALL
 * -----------------------------
 * The brief was «لا تجعل أي شيء ثابتاً داخل الشيفرة». The ten reviewed projects
 * are seeds, not the truth: the truth is the merge in `lib/server/projects.ts`,
 * where a document in Firestore beats its seed field by field and a document
 * with no seed is simply a new project. This action is the only thing that
 * writes those documents.
 *
 * WHAT IT REFUSES, AND WHY EACH REFUSAL IS HERE RATHER THAN IN THE FORM
 * ---------------------------------------------------------------------
 *   - A reference to something that does not exist. The panel offers a list of
 *     real ids; this checks the id that actually arrived, because a `<select>`
 *     is a courtesy and a POST body is a claim. Without this check, one typo in
 *     a rebuilt form is a dead link on a published page — the exact failure the
 *     three layers were added to prevent.
 *   - An empty required section. A project with no parts, no stages or no
 *     challenges is the «thin project» the model was shaped to forbid, and the
 *     forbidding has to survive contact with the admin panel.
 *   - A `hintAr` on a term that HAS an encyclopedia entry. That is the
 *     no-duplication rule, enforced rather than requested.
 *   - `http://` anywhere. Every reference URL is a claim about a source; one
 *     fetched over plain HTTP is a claim anybody on the path can rewrite.
 *
 * WHY PUBLISHING IS A SEPARATE ACTION
 * -----------------------------------
 * Same reason as the shop's: hiding something is a decision made in a hurry,
 * usually because it is wrong, and it must not require filling in a form.
 */

const COLLECTION = 'projects';

export type ProjectActionResult = { ok: true; id?: string } | { ok: false; errorAr: string };

/* ── The wire shapes ─────────────────────────────────────────────────────── */

/** A reference as the form submits it: a kind plus one of two payloads. */
export interface RefInput {
  to: string;
  /** For the id-carrying kinds. */
  id: string;
  /** For `planned`. */
  sectionAr: string;
  /** For `elsewhere`. */
  whereAr: string;
}

export interface SaveProjectInput {
  projectId: string;
  titleAr: string;
  titleEn: string;
  summaryAr: string;
  definitionAr: string;
  ideaAr: string;
  purposeAr: string;
  /** One per line, as typed. */
  outcomesText: string;
  skillsText: string;
  applicationsText: string;
  futureText: string;
  architectureIntroAr: string;
  dataFlowAr: string;
  difficulty: string;
  categoryIds: string[];
  weeksMin: string;
  weeksMax: string;
  prerequisites: {
    titleAr: string; titleEn: string; whyAr: string; essential: boolean; ref: RefInput;
  }[];
  glossary: { termAr: string; termEn: string; hintAr: string; ref: RefInput }[];
  parts: { nameAr: string; nameEn: string; whyAr: string; critical: boolean; ref: RefInput }[];
  software: { nameEn: string; roleAr: string; url: string; ref: RefInput }[];
  components: { nameAr: string; roleAr: string }[];
  stages: { titleAr: string; bodyAr: string }[];
  challenges: { titleAr: string; bodyAr: string; mitigationAr: string }[];
  references: { titleAr: string; url: string; kind: string; licence: string; noteAr: string }[];
  videoUrl: string;
  githubUrl: string;
}

export async function saveProject(input: SaveProjectInput): Promise<ProjectActionResult> {
  const gate = await authorise();
  if ('errorAr' in gate) return { ok: false, errorAr: gate.errorAr };

  const id = normaliseId(input.projectId);
  if (!id) {
    return {
      ok: false,
      errorAr: 'المعرّف يجب أن يكون حروفاً لاتينية صغيرة وأرقاماً وشرطات، بطول ٣ إلى ٦٤ حرفاً.',
    };
  }

  const built = buildProject(id, input);
  if ('errorAr' in built) return { ok: false, errorAr: built.errorAr };

  // Whether this document already decides its own visibility. A brand-new
  // project is written hidden: nothing reaches readers because somebody pressed
  // «حفظ» while still writing it.
  const existing = await readPublished(id);

  const doc: Partial<ProjectSeed> = {
    ...built.value,
    published: existing ?? false,
    lastReviewed: monthStamp(),
    // Not `imageUrl`. It has its own action, so saving a typo in the definition
    // cannot wipe a photograph somebody just uploaded.
  };

  const entryId = await logAudit(actorFromSession(gate.session), newRequestId(), {
    action: 'project.edit',
    targetType: 'project',
    targetId: id,
    after: `parts=${built.value.parts?.length ?? 0} prereq=${built.value.prerequisites?.length ?? 0} `
      + `terms=${built.value.glossary?.length ?? 0}`,
  });

  try {
    await mergeProjectOverride(id, doc as Record<string, unknown>, gate.session.uid);
    await markAuditResult(entryId, 'ok');
  } catch {
    await markAuditResult(entryId, 'error', 'write failed');
    return { ok: false, errorAr: 'تعذّر الحفظ. حاول مرة أخرى.' };
  }

  refresh(id);
  return { ok: true, id };
}

/**
 * Showing or hiding a project.
 *
 * Unlike the shop, publishing is not gated on a completeness check — a project
 * has no price and no stock, so there is no external condition that decides
 * readiness, only an editor's judgement. What IS checked is that the merged
 * project actually has the load-bearing sections, because publishing a document
 * whose seed never existed and whose form was half-filled would put an empty
 * page in front of a reader.
 */
export async function setProjectPublished(
  projectId: string, published: boolean,
): Promise<ProjectActionResult> {
  const gate = await authorise();
  if ('errorAr' in gate) return { ok: false, errorAr: gate.errorAr };
  if (!sessionCan(gate.session, 'content.publish')) {
    return { ok: false, errorAr: 'لا تملك صلاحية نشر المحتوى.' };
  }

  const merged = await resolvedProject(projectId);
  if (!merged) return { ok: false, errorAr: 'لا يوجد مشروع بهذا المعرّف.' };

  // Never gate hiding. The moment you need something off the site is not the
  // moment to be told it is incomplete.
  if (published) {
    const missing = incompleteSections(merged);
    if (missing.length > 0) {
      return { ok: false, errorAr: `لا يمكن نشره وفيه أقسام فارغة: ${missing.join('، ')}.` };
    }
  }

  const entryId = await logAudit(actorFromSession(gate.session), newRequestId(), {
    action: 'project.publish',
    targetType: 'project',
    targetId: projectId,
    after: published ? 'published' : 'hidden',
  });

  try {
    await mergeProjectOverride(projectId, {
      published,
      lastReviewed: monthStamp(),
    }, gate.session.uid);
    await markAuditResult(entryId, 'ok');
  } catch {
    await markAuditResult(entryId, 'error', 'write failed');
    return { ok: false, errorAr: 'تعذّر الحفظ. حاول مرة أخرى.' };
  }

  refresh(projectId);
  return { ok: true };
}

/** Attaching or removing the cover photograph. Separate action, separate risk. */
export async function setProjectImage(
  projectId: string, imageUrl: string | null,
): Promise<ProjectActionResult> {
  const gate = await authorise();
  if ('errorAr' in gate) return { ok: false, errorAr: gate.errorAr };

  if (imageUrl !== null && !isSafeExternalUrl(imageUrl)) {
    return { ok: false, errorAr: 'رابط الصورة غير صالح.' };
  }

  const entryId = await logAudit(actorFromSession(gate.session), newRequestId(), {
    action: 'project.edit',
    targetType: 'project',
    targetId: projectId,
    after: imageUrl ? 'image set' : 'image cleared',
  });

  try {
    await mergeProjectOverride(projectId, {
      imageUrl: imageUrl ?? null,
    }, gate.session.uid);
    await markAuditResult(entryId, 'ok');
  } catch {
    await markAuditResult(entryId, 'error', 'write failed');
    return { ok: false, errorAr: 'تعذّر حفظ الصورة. حاول مرة أخرى.' };
  }

  refresh(projectId);
  return { ok: true };
}

/* ── Building and validating ─────────────────────────────────────────────── */

type Built<T> = { value: T } | { errorAr: string };

/*
 * The admin panel edits the SEED shape — a phase's title and its paragraph.
 *
 * The plan (goal, steps, exit condition) is authored in
 * `src/data/projects/buildPlans.ts` and merged in the registry, because all ten
 * plans must stay in the same shape and that is only reviewable when they sit
 * in one file. An editor that let one project's phases drift into a different
 * shape would undo exactly what this batch fixed.
 */
function buildProject(id: string, i: SaveProjectInput): Built<Partial<ProjectSeed>> {
  const titleAr = i.titleAr.trim();
  if (titleAr.length < 8) return { errorAr: 'العنوان العربي قصير جداً.' };
  const titleEn = i.titleEn.trim();
  if (!titleEn) return { errorAr: 'اكتب العنوان الإنجليزي — هو ما يُبحث به.' };

  const summaryAr = i.summaryAr.trim();
  if (summaryAr.length < 40) return { errorAr: 'الملخّص قصير جداً — سطر واحد يوضّح ما هذا المشروع.' };

  const definitionAr = i.definitionAr.trim();
  if (definitionAr.length < 300) {
    return { errorAr: 'التعريف قصير جداً. المطلوب فقرة تكفي لاتّخاذ قرار، لا سطران.' };
  }
  if (definitionAr.length > 1400) {
    return { errorAr: 'التعريف طويل جداً. الشرح المطوّل مكانه الأقسام التالية.' };
  }

  const ideaAr = i.ideaAr.trim();
  const purposeAr = i.purposeAr.trim();
  if (ideaAr.length < 40 || purposeAr.length < 40) {
    return { errorAr: 'اكتب «الفكرة» و«لماذا بُني» — كلاهما مطلوب.' };
  }

  const difficulty = i.difficulty.trim();
  if (!isDifficulty(difficulty)) return { errorAr: 'اختر مستوى صعوبة صحيحاً.' };

  const categoryIds = i.categoryIds.filter(isCategoryId);
  if (categoryIds.length === 0) return { errorAr: 'اختر تصنيفاً واحداً على الأقل.' };

  const weeksMin = Number(i.weeksMin);
  const weeksMax = Number(i.weeksMax);
  if (!Number.isInteger(weeksMin) || !Number.isInteger(weeksMax)
    || weeksMin < 1 || weeksMax < weeksMin || weeksMax > 104) {
    return { errorAr: 'المدّة: عددان صحيحان بالأسابيع، والأدنى لا يتجاوز الأعلى.' };
  }

  const learningOutcomesAr = lines(i.outcomesText, 12);
  if (learningOutcomesAr.length < 3) {
    return { errorAr: '«ماذا سيتعلّم المستخدم» يحتاج ثلاثة بنود على الأقل — قائمة لا جملة.' };
  }
  const skillsAr = lines(i.skillsText, 12);
  if (skillsAr.length === 0) return { errorAr: 'اكتب التقنيات المستخدمة، بنداً في كل سطر.' };

  const applicationsAr = lines(i.applicationsText, 12);
  if (applicationsAr.length === 0) return { errorAr: 'اكتب تطبيقاً عملياً واحداً على الأقل.' };
  const futureAr = lines(i.futureText, 12);
  if (futureAr.length === 0) return { errorAr: 'اكتب اتّجاه تطوير واحداً على الأقل.' };

  /* Prerequisites — the second layer. */
  const prerequisites: Project['prerequisites'] = [];
  for (const [n, q] of i.prerequisites.entries()) {
    const t = q.titleAr.trim();
    if (!t) continue;
    if (q.whyAr.trim().length < 25) {
      return { errorAr: `المتطلّب «${t}»: اكتب لماذا يحتاجه هذا المشروع تحديداً، لا وصفاً عاماً للمهارة.` };
    }
    const ref = parseRef(q.ref);
    if ('errorAr' in ref) return { errorAr: `المتطلّب ${n + 1}: ${ref.errorAr}` };
    prerequisites.push({
      titleAr: t.slice(0, 120),
      ...(q.titleEn.trim() ? { titleEn: q.titleEn.trim().slice(0, 60) } : {}),
      whyAr: q.whyAr.trim().slice(0, 600),
      essential: q.essential,
      ref: ref.value,
    });
  }
  if (prerequisites.length < 2) {
    return { errorAr: '«ما الذي يجب أن تتعلّمه أوّلاً» يحتاج متطلّبَين على الأقل.' };
  }
  if (!prerequisites.some(q => q.essential)) {
    return { errorAr: 'حدّد متطلّباً أساسياً واحداً على الأقل — «كلّه مفيد» ليس إجابة.' };
  }

  /* Glossary — the third layer, and the no-duplication rule. */
  const glossary: Project['glossary'] = [];
  for (const [n, g] of i.glossary.entries()) {
    const termAr = g.termAr.trim();
    if (!termAr) continue;
    if (!g.termEn.trim()) return { errorAr: `المصطلح «${termAr}»: اكتب الاسم الإنجليزي أيضاً.` };
    const ref = parseRef(g.ref);
    if ('errorAr' in ref) return { errorAr: `المصطلح ${n + 1}: ${ref.errorAr}` };
    const hintAr = g.hintAr.trim();
    // THE RULE. A term the encyclopedia explains gets a link and nothing else.
    if (hintAr && ref.value.to !== 'planned' && ref.value.to !== 'elsewhere') {
      return {
        errorAr: `المصطلح «${termAr}»: لا تكتب شرحاً لمصطلح تشرحه الموسوعة — اربط به فقط. `
          + 'السطر التوضيحي مسموح فقط للمصطلحات التي لم تُكتب بعد.',
      };
    }
    if (hintAr.length > 160) {
      return { errorAr: `المصطلح «${termAr}»: السطر التوضيحي أطول من سطر. الشرح المطوّل مكانه الموسوعة.` };
    }
    glossary.push({
      termAr: termAr.slice(0, 80),
      termEn: g.termEn.trim().slice(0, 80),
      ref: ref.value,
      ...(hintAr ? { hintAr } : {}),
    });
  }

  /* Parts — the store link. */
  const parts: Project['parts'] = [];
  for (const [n, p] of i.parts.entries()) {
    const nameAr = p.nameAr.trim();
    if (!nameAr) continue;
    if (!p.nameEn.trim()) {
      return { errorAr: `القطعة «${nameAr}»: اكتب الاسم كما تُباع ويُبحث عنه.` };
    }
    if (p.whyAr.trim().length < 25) {
      return { errorAr: `القطعة «${nameAr}»: اكتب لماذا هي مطلوبة. قائمة قطع بلا أسباب لا تسمح باستبدال ذكي.` };
    }
    const ref = parseRef(p.ref);
    if ('errorAr' in ref) return { errorAr: `القطعة ${n + 1}: ${ref.errorAr}` };
    parts.push({
      nameAr: nameAr.slice(0, 120),
      nameEn: p.nameEn.trim().slice(0, 120),
      whyAr: p.whyAr.trim().slice(0, 600),
      critical: p.critical,
      ref: ref.value,
    });
  }
  if (parts.length < 3) return { errorAr: 'اكتب ثلاث قطع على الأقل.' };

  /* Software — the hub link. */
  const software: Project['software'] = [];
  for (const [n, s] of i.software.entries()) {
    const nameEn = s.nameEn.trim();
    if (!nameEn) continue;
    if (s.roleAr.trim().length < 15) {
      return { errorAr: `البرنامج «${nameEn}»: اكتب دوره في هذا المشروع.` };
    }
    const url = s.url.trim();
    if (url && !/^https:\/\//.test(url)) {
      return { errorAr: `البرنامج «${nameEn}»: رابط التوثيق يجب أن يبدأ بـhttps.` };
    }
    const ref = parseRef(s.ref);
    if ('errorAr' in ref) return { errorAr: `البرنامج ${n + 1}: ${ref.errorAr}` };
    software.push({
      nameEn: nameEn.slice(0, 120),
      roleAr: s.roleAr.trim().slice(0, 400),
      ...(url ? { url: url.slice(0, 500) } : {}),
      ref: ref.value,
    });
  }
  if (software.length === 0) return { errorAr: 'اكتب برنامجاً واحداً على الأقل.' };

  const components = i.components
    .map(c => ({ nameAr: c.nameAr.trim(), roleAr: c.roleAr.trim() }))
    .filter(c => c.nameAr && c.roleAr)
    .slice(0, 12);
  if (components.length === 0) return { errorAr: 'اكتب مكوّناً واحداً على الأقل في مخطّط البناء.' };
  if (i.architectureIntroAr.trim().length < 40 || i.dataFlowAr.trim().length < 80) {
    return { errorAr: 'اكتب مقدّمة مخطّط البناء وشرح طريقة العمل.' };
  }

  const stages = i.stages
    .map(s => ({ titleAr: s.titleAr.trim(), bodyAr: s.bodyAr.trim() }))
    .filter(s => s.titleAr && s.bodyAr)
    .slice(0, 12);
  if (stages.length < 3) return { errorAr: 'اكتب ثلاث مراحل تنفيذ على الأقل.' };

  const challenges: Project['challenges'] = [];
  for (const c of i.challenges) {
    const titleAr = c.titleAr.trim();
    if (!titleAr) continue;
    if (!c.bodyAr.trim() || !c.mitigationAr.trim()) {
      return {
        errorAr: `التحدّي «${titleAr}»: اكتب الشرح وكيفية التعامل معه معاً. `
          + 'قائمة صعوبات بلا حلول تثبيط لا معلومة.',
      };
    }
    challenges.push({
      titleAr: titleAr.slice(0, 160),
      bodyAr: c.bodyAr.trim().slice(0, 800),
      mitigationAr: c.mitigationAr.trim().slice(0, 800),
    });
    if (challenges.length >= 10) break;
  }
  if (challenges.length < 2) return { errorAr: 'اكتب تحدّيَين على الأقل، ولكلٍّ منهما طريقة تعامل.' };

  const references: Project['references'] = [];
  for (const r of i.references) {
    const url = r.url.trim();
    if (!url) continue;
    if (!/^https:\/\//.test(url)) {
      return { errorAr: `المرجع «${r.titleAr.trim() || url}»: الروابط يجب أن تبدأ بـhttps.` };
    }
    if (!isReferenceKind(r.kind)) {
      return { errorAr: `المرجع «${r.titleAr.trim() || url}»: اختر نوعاً صحيحاً.` };
    }
    // A repository without its licence is the mistake this section exists to
    // prevent: «مبنيّ على مشروع مفتوح» means something different under GPL.
    if (r.kind === 'repo' && !r.licence.trim()) {
      return { errorAr: `المرجع «${r.titleAr.trim() || url}»: اكتب رخصة المستودع.` };
    }
    references.push({
      titleAr: (r.titleAr.trim() || url).slice(0, 200),
      url: url.slice(0, 500),
      kind: r.kind,
      ...(r.licence.trim() ? { licence: r.licence.trim().slice(0, 40) } : {}),
      ...(r.noteAr.trim() ? { noteAr: r.noteAr.trim().slice(0, 400) } : {}),
    });
    if (references.length >= 12) break;
  }
  if (references.length === 0) return { errorAr: 'اكتب مصدراً واحداً على الأقل.' };

  const videoUrl = i.videoUrl.trim();
  if (videoUrl && !/^https:\/\//.test(videoUrl)) {
    return { errorAr: 'رابط الفيديو يجب أن يبدأ بـhttps.' };
  }
  const githubUrl = i.githubUrl.trim();
  if (githubUrl && !/^https:\/\/(www\.)?(github|gitlab)\.com\//.test(githubUrl)) {
    return { errorAr: 'رابط المستودع يجب أن يكون على GitHub أو GitLab.' };
  }

  return {
    value: {
      id, titleAr, titleEn, summaryAr, definitionAr, ideaAr, purposeAr,
      learningOutcomesAr, prerequisites, glossary,
      difficulty, categoryIds,
      estimatedWeeks: { min: weeksMin, max: weeksMax },
      skillsAr, parts, software,
      architectureIntroAr: i.architectureIntroAr.trim(),
      components,
      dataFlowAr: i.dataFlowAr.trim(),
      stages, applicationsAr, challenges, futureAr, references,
      ...(videoUrl ? { videoUrl } : { videoUrl: undefined }),
      ...(githubUrl ? { githubUrl } : { githubUrl: undefined }),
    },
  };
}

/**
 * One submitted reference, checked against what exists.
 *
 * The single most important validation on this screen. Everything else here
 * protects quality; this protects the promise the section is built on — that a
 * reader never meets a link that goes nowhere.
 */
function parseRef(r: RefInput): Built<PlatformRef> {
  const to = r.to.trim();

  if (to === 'planned') {
    const sectionAr = r.sectionAr.trim() as PlatformSectionAr;
    if (!PLANNED_SECTIONS.includes(sectionAr)) {
      return { errorAr: 'اختر القسم الذي سيُضاف إليه المحتوى.' };
    }
    return { value: { to: 'planned', sectionAr } };
  }

  if (to === 'elsewhere') {
    const whereAr = r.whereAr.trim();
    if (whereAr.length < 8) {
      return { errorAr: 'اكتب من أين يأتي هذا فعلاً. «غير متوفّر» وحدها لا تفيد القارئ.' };
    }
    return { value: { to: 'elsewhere', whereAr: whereAr.slice(0, 200) } };
  }

  const id = r.id.trim();
  if (!id) return { errorAr: 'اختر هدف الرابط.' };

  const candidate = { to, id } as PlatformRef;
  if (!isRefKind(to) || !isKnownRef(candidate)) {
    return {
      errorAr: 'الهدف المختار غير موجود في المنصّة. اختر من القائمة، '
        + 'أو علّمه «سيضاف لاحقاً» بدل إنشاء رابط ميت.',
    };
  }
  return { value: candidate };
}

/** Which sections a merged project is missing. Named in Arabic for the message. */
function incompleteSections(p: Project): string[] {
  const out: string[] = [];
  if (!p.definitionAr?.trim()) out.push('التعريف');
  if (!(p.learningOutcomesAr?.length >= 3)) out.push('ماذا سيتعلّم المستخدم');
  if (!(p.prerequisites?.length >= 2)) out.push('ما الذي يجب أن تتعلّمه أوّلاً');
  if (!(p.parts?.length >= 3)) out.push('القطع');
  if (!(p.software?.length >= 1)) out.push('البرامج');
  if (!(p.stages?.length >= 3)) out.push('مراحل التنفيذ');
  if (!(p.challenges?.length >= 2)) out.push('التحدّيات');
  if (!(p.references?.length >= 1)) out.push('المصادر');
  return out;
}

/* ── The gate and the plumbing ───────────────────────────────────────────── */

type Gate = { session: NonNullable<Awaited<ReturnType<typeof getSession>>> } | { errorAr: string };

/**
 * `content.edit`, not a new capability.
 *
 * A project library is teaching content. The role that already exists for it —
 * `editor` — is precisely «may write and publish content, has no power over
 * people», which is the right authority here and needs no new grant. Minting
 * `projects.edit` would mean an unused capability nobody remembers the meaning
 * of, granted carelessly the first time somebody is in a hurry.
 */
async function authorise(): Promise<Gate> {
  const session = await getSession();
  if (!session || !sessionCan(session, 'content.edit')) {
    return { errorAr: 'لا تملك صلاحية تعديل المحتوى.' };
  }
  if (!isServiceConfigured()) return { errorAr: 'الاتصال بقاعدة البيانات غير متاح.' };
  return { session };
}

/** The project's stored visibility, or null when it has never been written. */
async function readPublished(projectId: string): Promise<boolean | null> {
  try {
    const all = await listProjectOverrides();
    const row = all[projectId];
    if (row) {
      const v = row.published ?? (row.patch as { published?: unknown }).published;
      if (typeof v === 'boolean') return v;
    }
  } catch { /* fall through to the seed */ }
  const seed = getProject(projectId);
  return seed ? seed.published : null;
}

function refresh(projectId: string): void {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/projects');
  revalidatePath('/admin/projects');
  revalidatePath(`/admin/projects/${projectId}`);
}

function lines(text: string, max: number): string[] {
  return text.split('\n').map(l => l.trim()).filter(Boolean).slice(0, max);
}

/**
 * The review stamp, as `YYYY-MM`.
 *
 * Written by the server rather than typed, because a hand-entered review date
 * is a date somebody forgot to change.
 */
function monthStamp(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Lowercase, hyphenated, and short enough to live in a URL without escaping. */
function normaliseId(raw: string): string | null {
  const id = raw.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(id) ? id : null;
}

function isDifficulty(v: string): v is ProjectDifficulty {
  return v === 'beginner' || v === 'intermediate' || v === 'advanced' || v === 'research';
}

function isCategoryId(v: string): v is ProjectCategoryId {
  return PROJECT_CATEGORIES.some(c => c.id === v);
}

function isReferenceKind(v: string): v is 'docs' | 'repo' | 'paper' | 'article' {
  return v === 'docs' || v === 'repo' || v === 'paper' || v === 'article';
}

function isRefKind(v: string): v is PlatformRef['to'] {
  return ['kb-article', 'kb-module', 'glossary', 'dx', 'software',
    'store-product', 'store-category', 'project', 'lesson'].includes(v);
}
