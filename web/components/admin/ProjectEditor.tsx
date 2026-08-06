'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PROJECT_CATEGORIES, DIFFICULTY_LABEL_AR } from '@core/data/projects/types';
import type { Project, ProjectDifficulty } from '@core/data/projects/types';
import type { RefOptionGroup } from '@/lib/projectRefOptions';
import { saveProject, type SaveProjectInput } from '@/app/admin/projects/actions';
import { RefPicker, blankRef, refToInput } from './RefPicker';
import { ProjectImageField } from './ProjectImageField';

/**
 * Writing one project.
 *
 * WHY THE THREE LINKED SECTIONS SIT TOGETHER IN THE MIDDLE
 * --------------------------------------------------------
 * Prerequisites, parts, programs and terms are the four places a project
 * touches the rest of the platform, and they are the four places somebody in a
 * hurry would leave empty. Putting them in one run — each with a picker that
 * only offers real targets — makes «where does this connect?» a question the
 * form asks rather than one the reviewer has to remember to ask.
 *
 * WHAT THIS FORM DOES NOT DECIDE
 * ------------------------------
 * Publication. It has its own button on the list, gated on `content.publish`,
 * because deciding a project is ready is a different act from writing it — and
 * the server refuses to publish one with empty sections whatever this form
 * submitted.
 *
 * WHY VALIDATION MESSAGES COME FROM THE SERVER
 * --------------------------------------------
 * There is exactly one set of rules, in `actions.ts`, and it is the one that
 * binds. Mirroring them here would produce a second set that drifts — a form
 * that accepts what the server rejects, or worse, one that rejects what the
 * server would have accepted and quietly stops somebody working.
 */
export const ProjectEditor: React.FC<{
  /** The merged project, or a blank shell when creating. */
  project: Partial<Project> & { id: string };
  isNew: boolean;
  groups: RefOptionGroup[];
  plannedSections: readonly string[];
}> = ({ project, isNew, groups, plannedSections }) => {
  const router = useRouter();

  const [projectId, setProjectId] = useState(isNew ? '' : project.id);
  const [categoryIds, setCategoryIds] = useState<string[]>(project.categoryIds ?? []);
  const [prerequisites, setPrerequisites] = useState(
    (project.prerequisites ?? []).map(q => ({
      titleAr: q.titleAr, titleEn: q.titleEn ?? '', whyAr: q.whyAr,
      essential: q.essential, ref: refToInput(q.ref),
    })),
  );
  const [glossary, setGlossary] = useState(
    (project.glossary ?? []).map(g => ({
      termAr: g.termAr, termEn: g.termEn, hintAr: g.hintAr ?? '', ref: refToInput(g.ref),
    })),
  );
  const [parts, setParts] = useState(
    (project.parts ?? []).map(p => ({
      nameAr: p.nameAr, nameEn: p.nameEn, whyAr: p.whyAr,
      critical: p.critical, ref: refToInput(p.ref),
    })),
  );
  const [software, setSoftware] = useState(
    (project.software ?? []).map(s => ({
      nameEn: s.nameEn, roleAr: s.roleAr, url: s.url ?? '', ref: refToInput(s.ref),
    })),
  );
  const [components, setComponents] = useState(
    (project.components ?? []).map(c => ({ nameAr: c.nameAr, roleAr: c.roleAr })),
  );
  // `bodyAr` became optional on a merged stage — the plan carries the phase and
  // the paragraph is context beneath it, so a phase may legitimately have none.
  // The editor still edits a seed, where the paragraph is the whole field, so
  // an absent one becomes an empty textarea rather than `undefined`.
  const [stages, setStages] = useState(
    (project.stages ?? []).map(s => ({ titleAr: s.titleAr, bodyAr: s.bodyAr ?? '' })),
  );
  const [challenges, setChallenges] = useState(
    (project.challenges ?? []).map(c => ({
      titleAr: c.titleAr, bodyAr: c.bodyAr, mitigationAr: c.mitigationAr,
    })),
  );
  const [references, setReferences] = useState(
    (project.references ?? []).map(r => ({
      titleAr: r.titleAr, url: r.url, kind: r.kind as string,
      licence: r.licence ?? '', noteAr: r.noteAr ?? '',
    })),
  );

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  return (
    <form
      data-testid="project-editor"
      onSubmit={async e => {
        e.preventDefault();
        setPending(true);
        setError(null);
        setSaved(false);
        const fd = new FormData(e.currentTarget);
        const input: SaveProjectInput = {
          projectId: (isNew ? projectId : project.id).trim(),
          titleAr: str(fd, 'titleAr'),
          titleEn: str(fd, 'titleEn'),
          summaryAr: str(fd, 'summaryAr'),
          definitionAr: str(fd, 'definitionAr'),
          ideaAr: str(fd, 'ideaAr'),
          purposeAr: str(fd, 'purposeAr'),
          outcomesText: str(fd, 'outcomes'),
          skillsText: str(fd, 'skills'),
          applicationsText: str(fd, 'applications'),
          futureText: str(fd, 'future'),
          architectureIntroAr: str(fd, 'architectureIntroAr'),
          dataFlowAr: str(fd, 'dataFlowAr'),
          difficulty: str(fd, 'difficulty'),
          categoryIds,
          weeksMin: str(fd, 'weeksMin'),
          weeksMax: str(fd, 'weeksMax'),
          prerequisites, glossary, parts, software,
          components, stages, challenges, references,
          videoUrl: str(fd, 'videoUrl'),
          githubUrl: str(fd, 'githubUrl'),
        };
        const r = await saveProject(input);
        setPending(false);
        if (!r.ok) { setError(r.errorAr); return; }
        setSaved(true);
        if (isNew && r.id) router.push(`/admin/projects/${r.id}`);
        else router.refresh();
      }}
    >
      {/* ── Identity ─────────────────────────────────────────────────────── */}
      <section className="admin-section">
        <h2>الهويّة</h2>
        {isNew && (
          <label className="pe-field">
            <span>المعرّف (يظهر في الرابط)</span>
            <input
              type="text" dir="ltr" required value={projectId}
              data-testid="project-id-input"
              placeholder="thermal-mapping-uav"
              onChange={e => setProjectId(e.target.value)}
            />
            <small>حروف لاتينية صغيرة وأرقام وشرطات. لا يمكن تغييره بعد الحفظ.</small>
          </label>
        )}
        <label className="pe-field">
          <span>العنوان بالعربية</span>
          <input name="titleAr" type="text" required defaultValue={project.titleAr ?? ''} />
        </label>
        <label className="pe-field">
          <span>العنوان بالإنجليزية</span>
          <input name="titleEn" type="text" dir="ltr" required defaultValue={project.titleEn ?? ''} />
        </label>
        <label className="pe-field">
          <span>الملخّص — سطر واحد يظهر على البطاقة</span>
          <textarea name="summaryAr" rows={2} required defaultValue={project.summaryAr ?? ''} />
        </label>
        <label className="pe-field">
          <span>التعريف — فقرة تكفي لاتّخاذ قرار</span>
          <textarea name="definitionAr" rows={7} required defaultValue={project.definitionAr ?? ''} />
          <small>بين ٣٠٠ و١٤٠٠ حرف. لا سطران، ولا مقال.</small>
        </label>
      </section>

      {/* ── The idea ─────────────────────────────────────────────────────── */}
      <section className="admin-section">
        <h2>الفكرة والهدف</h2>
        <label className="pe-field">
          <span>الفكرة</span>
          <textarea name="ideaAr" rows={3} required defaultValue={project.ideaAr ?? ''} />
        </label>
        <label className="pe-field">
          <span>لماذا بُني</span>
          <textarea name="purposeAr" rows={4} required defaultValue={project.purposeAr ?? ''} />
        </label>
      </section>

      {/* ── Layer one ────────────────────────────────────────────────────── */}
      <section className="admin-section">
        <h2>ماذا سيتعلّم المستخدم من هذا المشروع؟</h2>
        <label className="pe-field">
          <span>بند في كل سطر — ثلاثة على الأقل</span>
          <textarea
            name="outcomes" rows={7} required
            data-testid="project-outcomes-input"
            defaultValue={(project.learningOutcomesAr ?? []).join('\n')}
          />
          <small>
            اكتب قدرةً قابلة للنقل: «كيفية ربط MAVLink مع الحاسوب المرافق»، لا
            «التعرّف على عالم الطائرات». هذه القائمة هي ما يختار به القارئ بين مشروعين.
          </small>
        </label>
      </section>

      {/* ── Layer two ────────────────────────────────────────────────────── */}
      <section className="admin-section">
        <h2>ما الذي يجب أن تتعلّمه قبل تنفيذ هذا المشروع؟</h2>
        <p className="pe-hint">
          كل متطلّب يشير إلى مكانه داخل المنصّة. وما لم يُكتب بعد يُعلَّم «سيضاف
          لاحقاً» — القائمة لا تسمح بكتابة هدف غير موجود.
        </p>
        <Rows
          items={prerequisites}
          setItems={setPrerequisites}
          blank={() => ({ titleAr: '', titleEn: '', whyAr: '', essential: true, ref: blankRef() })}
          addLabelAr="أضف متطلّباً"
          testId="prereq"
          render={(q, set) => (
            <>
              <label className="pe-field">
                <span>ما يجب أن يعرفه</span>
                <input type="text" value={q.titleAr} onChange={e => set({ ...q, titleAr: e.target.value })} />
              </label>
              <label className="pe-field">
                <span>الاسم الإنجليزي (اختياري)</span>
                <input type="text" dir="ltr" value={q.titleEn} onChange={e => set({ ...q, titleEn: e.target.value })} />
              </label>
              <label className="pe-field">
                <span>لماذا يحتاجه هذا المشروع تحديداً</span>
                <textarea rows={3} value={q.whyAr} onChange={e => set({ ...q, whyAr: e.target.value })} />
              </label>
              <label className="pe-check">
                <input
                  type="checkbox" checked={q.essential}
                  onChange={e => set({ ...q, essential: e.target.checked })}
                />
                <span>أساسي — لن يبدأ بدونه</span>
              </label>
              <RefPicker
                labelAr="أين يتعلّمه داخل المنصّة"
                value={q.ref} groups={groups} plannedSections={plannedSections}
                onChange={ref => set({ ...q, ref })}
              />
            </>
          )}
        />
      </section>

      {/* ── Difficulty and technologies ──────────────────────────────────── */}
      <section className="admin-section">
        <h2>الصعوبة والتقنيات</h2>
        <label className="pe-field">
          <span>مستوى الصعوبة</span>
          <select name="difficulty" defaultValue={project.difficulty ?? 'intermediate'}>
            {(['beginner', 'intermediate', 'advanced', 'research'] as ProjectDifficulty[]).map(d => (
              <option key={d} value={d}>{DIFFICULTY_LABEL_AR[d]}</option>
            ))}
          </select>
        </label>
        <div className="pe-duo">
          <label className="pe-field">
            <span>المدّة من (أسابيع)</span>
            <input name="weeksMin" type="number" dir="ltr" min={1} required
              defaultValue={project.estimatedWeeks?.min ?? 4} />
          </label>
          <label className="pe-field">
            <span>إلى</span>
            <input name="weeksMax" type="number" dir="ltr" min={1} required
              defaultValue={project.estimatedWeeks?.max ?? 10} />
          </label>
        </div>

        <fieldset className="pe-field">
          <legend>التصنيفات</legend>
          <div className="pe-checks">
            {PROJECT_CATEGORIES.map(c => (
              <label key={c.id} className="pe-check">
                <input
                  type="checkbox"
                  checked={categoryIds.includes(c.id)}
                  onChange={e => setCategoryIds(prev =>
                    e.target.checked ? [...prev, c.id] : prev.filter(x => x !== c.id))}
                />
                <span>{c.titleAr}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="pe-field">
          <span>التقنيات المستخدمة — واحدة في كل سطر</span>
          <textarea name="skills" rows={5} required defaultValue={(project.skillsAr ?? []).join('\n')} />
        </label>
      </section>

      {/* ── Layer three, part one: the shop ──────────────────────────────── */}
      <section className="admin-section">
        <h2>القطع المطلوبة — مرتبطة بالمتجر</h2>
        <p className="pe-hint">
          ما نبيعه يُربط بصفحة المنتج أو بقسمه. وما لا نبيعه يُكتب من أين يُشترى
          فعلاً — لا «سيضاف لاحقاً إلى المتجر» ما لم يكن ذلك صحيحاً.
        </p>
        <Rows
          items={parts}
          setItems={setParts}
          blank={() => ({ nameAr: '', nameEn: '', whyAr: '', critical: false, ref: blankRef() })}
          addLabelAr="أضف قطعة"
          testId="part"
          render={(p, set) => (
            <>
              <label className="pe-field">
                <span>الاسم بالعربية</span>
                <input type="text" value={p.nameAr} onChange={e => set({ ...p, nameAr: e.target.value })} />
              </label>
              <label className="pe-field">
                <span>الاسم كما تُباع ويُبحث عنه</span>
                <input type="text" dir="ltr" value={p.nameEn} onChange={e => set({ ...p, nameEn: e.target.value })} />
              </label>
              <label className="pe-field">
                <span>لماذا هذه القطعة</span>
                <textarea rows={3} value={p.whyAr} onChange={e => set({ ...p, whyAr: e.target.value })} />
              </label>
              <label className="pe-check">
                <input type="checkbox" checked={p.critical}
                  onChange={e => set({ ...p, critical: e.target.checked })} />
                <span>لا بديل عنها</span>
              </label>
              <RefPicker
                labelAr="من أين تُشترى"
                value={p.ref} groups={groups} plannedSections={plannedSections}
                onChange={ref => set({ ...p, ref })}
              />
            </>
          )}
        />
      </section>

      {/* ── Layer three, part two: the software centre ───────────────────── */}
      <section className="admin-section">
        <h2>البرامج المطلوبة — مرتبطة بمركز البرامج</h2>
        <Rows
          items={software}
          setItems={setSoftware}
          blank={() => ({ nameEn: '', roleAr: '', url: '', ref: blankRef() })}
          addLabelAr="أضف برنامجاً"
          testId="software"
          render={(s, set) => (
            <>
              <label className="pe-field">
                <span>الاسم</span>
                <input type="text" dir="ltr" value={s.nameEn} onChange={e => set({ ...s, nameEn: e.target.value })} />
              </label>
              <label className="pe-field">
                <span>دوره في هذا المشروع</span>
                <textarea rows={2} value={s.roleAr} onChange={e => set({ ...s, roleAr: e.target.value })} />
              </label>
              <label className="pe-field">
                <span>رابط توثيقه الرسمي (اختياري)</span>
                <input type="url" dir="ltr" value={s.url} onChange={e => set({ ...s, url: e.target.value })} />
              </label>
              <RefPicker
                labelAr="أين يُغطّى داخل المنصّة"
                value={s.ref} groups={groups} plannedSections={plannedSections}
                onChange={ref => set({ ...s, ref })}
              />
            </>
          )}
        />
      </section>

      {/* ── Layer three, part three: the encyclopedia ────────────────────── */}
      <section className="admin-section">
        <h2>المصطلحات المهمّة — مرتبطة بالموسوعة</h2>
        <p className="pe-hint">
          مصطلح تشرحه الموسوعة يُربط بها ولا يُشرح هنا — النموذج يرفض الشرح
          المكرّر. والسطر التوضيحي مسموح فقط لمصطلح لم يُكتب بعد.
        </p>
        <Rows
          items={glossary}
          setItems={setGlossary}
          blank={() => ({ termAr: '', termEn: '', hintAr: '', ref: blankRef() })}
          addLabelAr="أضف مصطلحاً"
          testId="term"
          render={(g, set) => (
            <>
              <label className="pe-field">
                <span>المصطلح بالعربية</span>
                <input type="text" value={g.termAr} onChange={e => set({ ...g, termAr: e.target.value })} />
              </label>
              <label className="pe-field">
                <span>بالإنجليزية</span>
                <input type="text" dir="ltr" value={g.termEn} onChange={e => set({ ...g, termEn: e.target.value })} />
              </label>
              <RefPicker
                labelAr="أين يُشرح"
                value={g.ref} groups={groups} plannedSections={plannedSections}
                onChange={ref => set({ ...g, ref })}
              />
              <label className="pe-field">
                <span>سطر توضيحي — للمصطلحات غير المشروحة بعد فقط</span>
                <input
                  type="text" maxLength={160} value={g.hintAr}
                  onChange={e => set({ ...g, hintAr: e.target.value })}
                />
              </label>
            </>
          )}
        />
      </section>

      {/* ── Architecture and flow ────────────────────────────────────────── */}
      <section className="admin-section">
        <h2>مخطّط البناء وطريقة العمل</h2>
        <label className="pe-field">
          <span>مقدّمة المخطّط</span>
          <textarea name="architectureIntroAr" rows={3} required
            defaultValue={project.architectureIntroAr ?? ''} />
        </label>
        <Rows
          items={components}
          setItems={setComponents}
          blank={() => ({ nameAr: '', roleAr: '' })}
          addLabelAr="أضف مكوّناً"
          testId="component"
          render={(c, set) => (
            <>
              <label className="pe-field">
                <span>المكوّن</span>
                <input type="text" value={c.nameAr} onChange={e => set({ ...c, nameAr: e.target.value })} />
              </label>
              <label className="pe-field">
                <span>دوره</span>
                <textarea rows={2} value={c.roleAr} onChange={e => set({ ...c, roleAr: e.target.value })} />
              </label>
            </>
          )}
        />
        <label className="pe-field">
          <span>طريقة العمل — كيف تتحرّك البيانات ويُتّخذ القرار</span>
          <textarea name="dataFlowAr" rows={7} required defaultValue={project.dataFlowAr ?? ''} />
        </label>
      </section>

      {/* ── Stages, applications, challenges, future ─────────────────────── */}
      <section className="admin-section">
        <h2>مراحل التنفيذ</h2>
        <Rows
          items={stages}
          setItems={setStages}
          blank={() => ({ titleAr: '', bodyAr: '' })}
          addLabelAr="أضف مرحلة"
          testId="stage"
          render={(s, set) => (
            <>
              <label className="pe-field">
                <span>عنوان المرحلة</span>
                <input type="text" value={s.titleAr} onChange={e => set({ ...s, titleAr: e.target.value })} />
              </label>
              <label className="pe-field">
                <span>ماذا يحدث فيها</span>
                <textarea rows={3} value={s.bodyAr} onChange={e => set({ ...s, bodyAr: e.target.value })} />
              </label>
            </>
          )}
        />
      </section>

      <section className="admin-section">
        <h2>التطبيقات العملية</h2>
        <label className="pe-field">
          <span>تطبيق في كل سطر</span>
          <textarea name="applications" rows={5} required
            defaultValue={(project.applicationsAr ?? []).join('\n')} />
        </label>
      </section>

      <section className="admin-section">
        <h2>التحدّيات</h2>
        <p className="pe-hint">
          لكل تحدٍّ طريقة تعامل. النموذج يرفض تحدّياً بلا حلّ — قائمة صعوبات بلا
          أجوبة تثبيط لا معلومة.
        </p>
        <Rows
          items={challenges}
          setItems={setChallenges}
          blank={() => ({ titleAr: '', bodyAr: '', mitigationAr: '' })}
          addLabelAr="أضف تحدّياً"
          testId="challenge"
          render={(c, set) => (
            <>
              <label className="pe-field">
                <span>التحدّي</span>
                <input type="text" value={c.titleAr} onChange={e => set({ ...c, titleAr: e.target.value })} />
              </label>
              <label className="pe-field">
                <span>ما الذي يحدث</span>
                <textarea rows={3} value={c.bodyAr} onChange={e => set({ ...c, bodyAr: e.target.value })} />
              </label>
              <label className="pe-field">
                <span>كيف تتعامل معه</span>
                <textarea rows={3} value={c.mitigationAr}
                  onChange={e => set({ ...c, mitigationAr: e.target.value })} />
              </label>
            </>
          )}
        />
      </section>

      <section className="admin-section">
        <h2>التطوير المستقبلي</h2>
        <label className="pe-field">
          <span>اتّجاه في كل سطر</span>
          <textarea name="future" rows={5} required defaultValue={(project.futureAr ?? []).join('\n')} />
        </label>
      </section>

      {/* ── References ───────────────────────────────────────────────────── */}
      <section className="admin-section">
        <h2>المصادر</h2>
        <p className="pe-hint">
          مستودع بلا رخصة مرفوض. «مبنيّ على مشروع مفتوح» تعني شيئاً مختلفاً تحت
          GPL عمّا تعنيه تحت BSD، وهذا بالضبط ما يخطئ فيه الطالب.
        </p>
        <Rows
          items={references}
          setItems={setReferences}
          blank={() => ({ titleAr: '', url: '', kind: 'docs', licence: '', noteAr: '' })}
          addLabelAr="أضف مصدراً"
          testId="reference"
          render={(r, set) => (
            <>
              <label className="pe-field">
                <span>العنوان</span>
                <input type="text" value={r.titleAr} onChange={e => set({ ...r, titleAr: e.target.value })} />
              </label>
              <label className="pe-field">
                <span>الرابط</span>
                <input type="url" dir="ltr" value={r.url} onChange={e => set({ ...r, url: e.target.value })} />
              </label>
              <label className="pe-field">
                <span>النوع</span>
                <select value={r.kind} onChange={e => set({ ...r, kind: e.target.value })}>
                  <option value="docs">توثيق رسمي</option>
                  <option value="repo">مستودع شيفرة</option>
                  <option value="paper">ورقة بحثية</option>
                  <option value="article">مقال</option>
                </select>
              </label>
              <label className="pe-field">
                <span>الرخصة (مطلوبة للمستودعات)</span>
                <input type="text" dir="ltr" value={r.licence}
                  onChange={e => set({ ...r, licence: e.target.value })} />
              </label>
              <label className="pe-field">
                <span>ملاحظة (اختيارية)</span>
                <textarea rows={2} value={r.noteAr} onChange={e => set({ ...r, noteAr: e.target.value })} />
              </label>
            </>
          )}
        />
      </section>

      {/* ── Media ────────────────────────────────────────────────────────── */}
      <section className="admin-section">
        <h2>الوسائط والروابط</h2>
        <label className="pe-field">
          <span>رابط فيديو (اختياري)</span>
          <input name="videoUrl" type="url" dir="ltr" defaultValue={project.videoUrl ?? ''} />
        </label>
        <label className="pe-field">
          <span>مستودع المشروع على GitHub أو GitLab (اختياري)</span>
          <input name="githubUrl" type="url" dir="ltr" defaultValue={project.githubUrl ?? ''} />
        </label>
        {!isNew && (
          <ProjectImageField projectId={project.id} imageUrl={project.imageUrl ?? null} />
        )}
        {isNew && (
          <p className="pe-hint">
            رفع الصورة متاح بعد الحفظ الأوّل، لأن الملف يُخزَّن تحت معرّف المشروع.
          </p>
        )}
      </section>

      {error && (
        <p role="alert" data-testid="project-editor-error" className="pe-error">{error}</p>
      )}
      {saved && !error && (
        <p role="status" data-testid="project-editor-saved" className="pe-ok">حُفظ.</p>
      )}

      <p style={{ marginTop: 18 }}>
        <button type="submit" className="btn-primary" disabled={pending} data-testid="project-editor-save">
          {pending ? 'يحفظ…' : 'احفظ'}
        </button>
      </p>
      {!isNew && (
        <p className="pe-hint" style={{ marginTop: 10 }}>
          الحفظ لا ينشر. النشر زرّ منفصل في قائمة المشاريع، ويرفض النشر إن بقي
          قسم مطلوب فارغاً.
        </p>
      )}
    </form>
  );
};

/**
 * A repeating group of rows.
 *
 * One component for all eight lists on this form, because eight hand-written
 * add/remove implementations is eight places for «the remove button removes the
 * wrong row» to live — and that bug is invisible until somebody loses an hour
 * of writing.
 */
function Rows<T>({
  items, setItems, blank, render, addLabelAr, testId,
}: {
  items: T[];
  setItems: (next: T[]) => void;
  blank: () => T;
  render: (item: T, set: (next: T) => void) => React.ReactNode;
  addLabelAr: string;
  testId: string;
}) {
  return (
    <>
      <ol className="pe-rows">
        {items.map((item, i) => (
          // Rows have no stable id until saved, and reordering is not offered.
          <li key={i} className="pe-row" data-testid={`project-${testId}-row`}>
            {render(item, next => setItems(items.map((x, j) => (j === i ? next : x))))}
            <button
              type="button"
              className="admin-danger"
              data-testid={`project-${testId}-remove`}
              onClick={() => setItems(items.filter((_, j) => j !== i))}
              style={{ fontSize: 12 }}
            >
              احذف هذا السطر
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="btn-ghost"
        data-testid={`project-${testId}-add`}
        onClick={() => setItems([...items, blank()])}
      >
        {addLabelAr}
      </button>
    </>
  );
}

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? '');
}
