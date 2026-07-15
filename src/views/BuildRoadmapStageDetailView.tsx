import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { roadmapData } from '../data/roadmapData';
import { getRoadmapStageContent } from '../data/roadmapStageContent';
import { useProgressContext } from '../contexts/ProgressContext';
import {
  CheckCircle2, CheckSquare, Square, ArrowRight, ChevronLeft, ChevronRight,
  Target, ClipboardList, ListOrdered, AlertTriangle, ShieldAlert, XOctagon, Ban, BookOpen,
} from 'lucide-react';

interface StageSafety { level: 'warning' | 'danger'; text: string; }
interface StageLearningLink { label: string; lessonId: string; }

const stageGoals: Record<string, string> = {
  'build-soldering-basics': 'قبل أن تلمس أي سلك، فهم أساسيات اللحام الآمن هو ما يمنع الأخطاء الكهربائية طوال عملية البناء.',
  'build-parts-tools': 'تأكد أن كل القطع والأدوات أمامك قبل البدء — التوقف لشراء قطعة ناقصة يكسر التركيز ويطيل وقت البناء.',
  'build-frame': 'الفريم هو أساس كل شيء — أي تركيب مرخي هنا يؤثر على استقرار الدرون في الهواء.',
  'build-motors': 'اتجاه دوران كل محرك وطول براغيه يُحدَّدان الآن — الخطأ هنا يتلف الموتور أو يُعطل الطيران.',
  'build-esc': 'تهوية ESC وإدارة الأسلاك يحددان عمر المنظّم وسهولة اللحام لاحقاً.',
  'build-fc': 'اتجاه FC وعزله عن الاهتزاز يحددان دقة الجيروسكوب وجودة الطيران.',
  'build-receiver': 'التوصيل الصحيح لـ TX/RX وموقع الهوائي يحددان قوة الإشارة وسلامة الاتصال.',
  'build-gps': 'ارتفاع GPS وبُعده عن التشويش يحددان دقة الإشارة وسرعة Lock.',
  'build-vtx': 'جهد VTX الصحيح وتهويته يمنعان الاحتراق ويضمنان وضوح الصورة.',
  'build-pre-battery': 'هذه آخر بوابة أمان — لا تتجاوزها قبل إكمال جميع الفحوصات.',
};

const stageMaterials: Record<string, { parts: string[]; tools: string[] }> = {
  'build-soldering-basics': { parts: ['قصدير (Solder)', 'Flux', 'أسلاك للتدريب'], tools: ['كاوي لحام', 'Multimeter', 'قاطع أسلاك', 'ملقط'] },
  'build-parts-tools': { parts: ['الفريم', 'محركات (4x)', 'ESC', 'Flight Controller', 'Receiver', 'LiPo', 'VTX/كاميرا'], tools: ['Smoke Stopper', 'Multimeter', 'كاوي لحام', 'مفكات', 'قصدير / Flux'] },
  'build-frame': { parts: ['هيكل الفريم', 'الأذرع', 'براغي التثبيت'], tools: ['مفك Allen', 'مفتاح ربط'] },
  'build-motors': { parts: ['محركات (4x)', 'براغي الموتور (M3)'], tools: ['مفك Allen صغير'] },
  'build-esc': { parts: ['ESC', 'cable ties', 'Grommets (إن كان 4-in-1)'], tools: ['مفك', 'قاطع cable ties'] },
  'build-fc': { parts: ['Flight Controller', 'Grommets مطاطية', 'standoffs'], tools: ['مفك صغير'] },
  'build-receiver': { parts: ['Receiver', 'هوائيات', 'أسلاك توصيل'], tools: ['كاوي لحام', 'قصدير / Flux', 'قاطع أسلاك'] },
  'build-gps': { parts: ['GPS module', 'حامل GPS', 'كابل GPS'], tools: ['مفك', 'cable ties'] },
  'build-vtx': { parts: ['FPV كاميرا', 'VTX', 'هوائي VTX', 'كابل توصيل'], tools: ['مفك صغير', 'كاوي لحام', 'قصدير / Flux', 'cable ties'] },
  'build-pre-battery': { parts: ['Smoke Stopper', 'LiPo'], tools: ['Multimeter'] },
};

const stageSafety: Record<string, StageSafety> = {
  'build-soldering-basics': { level: 'warning', text: 'لا توصل أي سلك بالبطارية أثناء التدريب على اللحام. احرص على أن مكان العمل خالٍ من المواد القابلة للاشتعال.' },
  'build-receiver': { level: 'warning', text: 'TX يُوصل بـ RX والعكس — التوصيل المعكوس شائع جداً ويمنع عمل Receiver كلياً.' },
  'build-gps': { level: 'warning', text: 'تأكد من جهد GPS المناسب (3.3V أو 5V) قبل التوصيل. الجهد الخاطئ يتلف GPS فوراً.' },
  'build-vtx': { level: 'warning', text: 'جهد VTX ثلاثة خيارات (5V/9V/12V) — وصّل للـ pad الصحيح. VTX بجهد خاطئ يحترق في ثوانٍ.' },
  'build-pre-battery': { level: 'danger', text: 'لا توصل LiPo قبل فحص القطبية والتأكد من عدم وجود قصر. القصر مع LiPo يسبب حريقاً فورياً.' },
};

const stageImages: Record<string, string> = {
  'build-soldering-basics': '/build-images/build-stage-01-soldering-wiring.png',
  'build-parts-tools': '/build-images/build-stage-02-parts-tools.png',
  'build-frame': '/build-images/build-stage-03-frame-assembly.png',
  'build-motors': '/build-images/build-stage-04-motor-mounting.png',
  'build-esc': '/build-images/build-stage-05-esc-mounting.png',
  'build-fc': '/build-images/build-stage-06-flight-controller-mounting.png',
  'build-receiver': '/build-images/build-stage-07-receiver-installation.png',
  'build-gps': '/build-images/build-stage-08-gps-installation.png',
  'build-vtx': '/build-images/build-stage-09-vtx-video-system.png',
  'build-pre-battery': '/build-images/build-stage-10-pre-battery-check.png',
};

const stageLearningLinks: Record<string, StageLearningLink[]> = {
  'build-soldering-basics': [
    { label: 'GND / 5V / VBAT', lessonId: 'lesson-power-rails' },
    { label: 'TX/RX', lessonId: 'lesson-tx-rx' },
    { label: 'السلامة قبل البطارية', lessonId: 'lesson-pre-battery-safety' },
  ],
  'build-parts-tools': [
    { label: 'ESC', lessonId: 'lesson-esc-install' },
    { label: 'Flight Controller', lessonId: 'lesson-fc-install' },
    { label: 'LiPo', lessonId: 'lesson-lipo-batteries' },
    { label: 'Receiver', lessonId: 'lesson-receiver-install' },
  ],
  'build-frame': [
    { label: 'تركيب الفريم', lessonId: 'lesson-frame-assembly' },
  ],
  'build-motors': [
    { label: 'تركيب المحركات', lessonId: 'lesson-motor-install' },
  ],
  'build-esc': [
    { label: 'ESC', lessonId: 'lesson-esc-install' },
  ],
  'build-fc': [
    { label: 'Flight Controller', lessonId: 'lesson-fc-install' },
  ],
  'build-receiver': [
    { label: 'Receiver', lessonId: 'lesson-receiver-install' },
    { label: 'TX/RX', lessonId: 'lesson-tx-rx' },
  ],
  'build-vtx': [
    { label: 'نظام الفيديو', lessonId: 'lesson-video-system' },
  ],
  'build-pre-battery': [
    { label: 'LiPo', lessonId: 'lesson-lipo-batteries' },
    { label: 'السلامة قبل البطارية', lessonId: 'lesson-pre-battery-safety' },
    { label: 'GND / 5V / VBAT', lessonId: 'lesson-power-rails' },
  ],
};

/**
 * Stage detail — one full-screen page per build stage, reached from the
 * BuildRoadmapView list (list -> detail), mirroring LessonDetailView.tsx's
 * and BetaflightDetailView.tsx's established navigation pattern rather than
 * the previous inline accordion.
 */
export const BuildRoadmapStageDetailView: React.FC = () => {
  const { stageId } = useParams<{ stageId: string }>();
  const navigate = useNavigate();
  const { completedRoadmapSteps, toggleRoadmapChecklistItem, isRoadmapItemDone, completeRoadmapStep, setLastOpenedRoadmapStep } = useProgressContext();
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);

  const stepIndex = roadmapData.findIndex(s => s.id === stageId);
  const step = stepIndex >= 0 ? roadmapData[stepIndex] : undefined;
  const effectiveStepId = step?.id;

  // Same fix already proven in LessonDetailView.tsx: setLastOpenedRoadmapStep
  // is recreated on every render of useProgress() (not memoized there, and
  // this must not touch ProgressContext/useProgress), so depending on it
  // directly would re-fire this effect on any unrelated progress change
  // elsewhere in the app while a stage page stays mounted.
  const setLastOpenedRoadmapStepRef = React.useRef(setLastOpenedRoadmapStep);
  useEffect(() => {
    setLastOpenedRoadmapStepRef.current = setLastOpenedRoadmapStep;
  });
  useEffect(() => {
    if (effectiveStepId) setLastOpenedRoadmapStepRef.current(effectiveStepId);
  }, [effectiveStepId]);

  // Opening a new stage should reveal its own beginning, not wherever the
  // previous stage happened to be scrolled to.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [effectiveStepId]);

  // Escape dismisses the zoom overlay, matching the close button and backdrop
  // click. Only attached while an image is actually zoomed, so no listener is
  // ever left behind between openings.
  useEffect(() => {
    if (!zoomedImage) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomedImage(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [zoomedImage]);

  if (!step) {
    return (
      <AppShell tint="cyan">
        <div className="fade-in roadmap-shell min-h-screen flex flex-col">
          <div className="px-4 pt-4 pb-3 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(34,211,238,0.14)' }}>
            <button onClick={() => navigate('/roadmap')} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center press" aria-label="العودة">
              <ArrowRight size={18} className="text-slate-300"/>
            </button>
            <h1 className="text-lg font-extrabold text-white">المرحلة غير موجودة</h1>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-sm text-slate-400">تعذّر العثور على هذه المرحلة. قد يكون الرابط قديمًا أو غير صحيح.</p>
            <button type="button" onClick={() => navigate('/roadmap')} className="btn-primary text-sm py-2 px-5">
              العودة إلى خريطة البناء
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  const done = completedRoadmapSteps.includes(step.id);
  const checklistDoneCount = step.checklist.filter((_, i) => isRoadmapItemDone(step.id, i)).length;
  const materials = stageMaterials[step.id];
  const safety = stageSafety[step.id];
  const links = stageLearningLinks[step.id] || [];
  const imgSrc = stageImages[step.id];
  const content = getRoadmapStageContent(step.id);
  const prevStep = stepIndex > 0 ? roadmapData[stepIndex - 1] : null;
  const nextStep = stepIndex < roadmapData.length - 1 ? roadmapData[stepIndex + 1] : null;

  const goToStage = (id: string) => navigate(`/roadmap/${id}`);

  return (
    <AppShell tint="cyan">
      <div className="fade-in roadmap-shell">
        <div className="px-4 pt-4 pb-3 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(34,211,238,0.14)' }}>
          <button onClick={() => navigate('/roadmap')} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center press" aria-label="العودة">
            <ArrowRight size={18} className="text-slate-300"/>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-slate-500">المرحلة {step.number} من {roadmapData.length}</p>
            <h1 className="text-lg font-extrabold text-white truncate">{step.title}</h1>
          </div>
          {done && <span className="text-xs bg-green-400/10 text-green-400 px-2 py-1 rounded-full border border-green-400/20 flex-shrink-0">مكتمل</span>}
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Hero image */}
          {imgSrc && (
            <button
              className="w-full focus:outline-none"
              onClick={() => setZoomedImage({ src: imgSrc, alt: `صورة تعليمية: ${step.title}` })}
              aria-label={`عرض الصورة بحجم أكبر: ${step.title}`}
            >
              <div className="rounded-xl overflow-hidden" style={{ background: '#0a1a24', border: '1px solid rgba(34,211,238,0.25)', boxShadow: '0 0 14px rgba(34,211,238,0.07)' }}>
                <img
                  src={imgSrc}
                  alt={`صورة تعليمية: ${step.title}`}
                  className="w-full block"
                  style={{ maxHeight: '320px', objectFit: 'contain' }}
                />
                <p className="text-center text-[11px] text-cyan-400/60 py-1.5">اضغط للتكبير</p>
              </div>
            </button>
          )}

          {/* Overview */}
          <div className="pull-quote">
            <h2 className="text-xs font-bold mb-2 text-cyan-300 flex items-center gap-1.5"><Target size={13}/>ماذا ستنجز؟</h2>
            <p className="text-[15px] text-slate-100 leading-loose">{stageGoals[step.id]}</p>
          </div>

          {/* Before you start */}
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-white accent-head flex items-center gap-2"><ClipboardList size={15} className="text-slate-300"/>قبل أن تبدأ</h2>
            <div className="card-subtle p-3.5">
              {materials && (materials.parts.length > 0 || materials.tools.length > 0) && (
                <div className="flex flex-wrap gap-1.5 justify-end mb-2.5">
                  {materials.parts.map(p => (
                    <span key={p} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(24,230,230,0.08)', border: '1px solid rgba(34,211,238,0.2)', color: '#cbd5e1' }}>{p}</span>
                  ))}
                  {materials.tools.map(t => (
                    <span key={t} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.22)', color: '#fbbf24' }}>{t}</span>
                  ))}
                </div>
              )}
              {content.preparation.length > 0 && (
                <ul className="space-y-1">
                  {content.preparation.map((item, i) => (
                    <li key={i} className="text-sm text-slate-300 leading-relaxed">• {item}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Steps */}
          {content.practicalSteps.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-white accent-head flex items-center gap-2"><ListOrdered size={15} className="text-cyan-300"/>خطوات التنفيذ</h2>
              <div className="card-subtle p-3.5">
                <ol className="space-y-1.5">
                  {content.practicalSteps.map((s, i) => (
                    <li key={i} className="text-sm text-slate-300 leading-relaxed flex gap-2">
                      <span className="text-cyan-300 font-bold flex-shrink-0">{i + 1}.</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {/* Warnings — merged: practical warnings + the safety callout, one chapter */}
          {(content.warnings.length > 0 || safety) && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-white accent-head flex items-center gap-2"><AlertTriangle size={15} className="text-amber-400"/>تحذيرات</h2>
              {content.warnings.length > 0 && (
                <div className="warning-card">
                  <ul className="space-y-1">
                    {content.warnings.map((w, i) => (
                      <li key={i} className="text-sm text-amber-100/90 leading-relaxed">• {w}</li>
                    ))}
                  </ul>
                </div>
              )}
              {safety && (
                <div className={safety.level === 'danger' ? 'danger-card' : 'warning-card'}>
                  <p className={`text-xs font-bold mb-1 flex items-center gap-1.5 ${safety.level === 'danger' ? 'text-red-300' : 'text-amber-300'}`}>
                    {safety.level === 'danger' ? <ShieldAlert size={14}/> : <AlertTriangle size={14}/>}
                    {safety.level === 'danger' ? 'تحذير' : 'تنبيه'}
                  </p>
                  <p className={`text-sm leading-relaxed ${safety.level === 'danger' ? 'text-red-100/90' : 'text-amber-100/90'}`}>{safety.text}</p>
                </div>
              )}
            </div>
          )}

          {/* Common mistakes */}
          {content.commonMistakes.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-white accent-head flex items-center gap-2"><XOctagon size={15} className="text-red-300"/>أخطاء شائعة</h2>
              <div className="card-subtle p-3.5" style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)' }}>
                <ul className="space-y-1">
                  {content.commonMistakes.map((m, i) => (
                    <li key={i} className="text-sm text-red-200/80 leading-relaxed">• {m}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Verify */}
          {content.acceptanceChecks.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-white accent-head flex items-center gap-2"><CheckCircle2 size={15} className="text-green-300"/>كيف تتأكد أن كل شيء صحيح؟</h2>
              <div className="success-card">
                <ul className="space-y-1">
                  {content.acceptanceChecks.map((c, i) => (
                    <li key={i} className="text-sm text-slate-200 leading-relaxed">• {c}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Stop conditions */}
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-white accent-head flex items-center gap-2"><Ban size={15} className="text-red-400"/>توقف ولا تكمل إذا...</h2>
            <div className="danger-card">
              {content.stopConditions.length > 0 ? (
                <ul className="space-y-1">
                  {content.stopConditions.map((s, i) => (
                    <li key={i} className="text-sm text-red-100/90 leading-relaxed">• {s}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-red-100/70 leading-relaxed">لا توجد حالة توقف إضافية لهذه المرحلة بخلاف ما ورد أعلاه في "تحذيرات".</p>
              )}
            </div>
          </div>

          {/* Related lessons */}
          {links.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-slate-500 font-bold flex items-center justify-end gap-1"><BookOpen size={12}/>راجع بسرعة:</p>
              <div className="flex flex-wrap gap-1.5 justify-end">
                {links.map(link => (
                  <button key={link.lessonId} onClick={() => navigate(`/lessons/${link.lessonId}`)} className="chip">
                    {link.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Checklist */}
          <div className="card-subtle p-3">
            <p className="text-xs font-bold mb-2 text-right text-cyan-300/70">قائمة التحقق</p>
            <div className="space-y-1.5">
              {step.checklist.map((item, i) => {
                const itemDone = isRoadmapItemDone(step.id, i);
                return (
                  <button key={i} className="w-full flex items-center gap-3 text-right hover:bg-cyan-400/5 rounded-lg p-1 transition-all" onClick={() => toggleRoadmapChecklistItem(step.id, i)}>
                    {itemDone ? <CheckSquare size={18} className="text-cyan-400 flex-shrink-0"/> : <Square size={18} className="text-slate-500 flex-shrink-0"/>}
                    <span className={`text-sm ${itemDone ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{item}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Complete stage / done */}
          {!done && checklistDoneCount === step.checklist.length && checklistDoneCount > 0 && (
            <button className="btn-primary w-full text-sm py-2" onClick={() => completeRoadmapStep(step.id)}>
              <CheckCircle2 size={16}/> إتمام المرحلة
            </button>
          )}
          {done && <div className="success-card text-center text-sm text-green-400 font-semibold flex items-center justify-center gap-2"><CheckCircle2 size={16}/>المرحلة مكتملة</div>}

          {/* Previous / Next */}
          {(prevStep || nextStep) && (
            <div className="flex gap-2">
              {prevStep ? (
                <button
                  type="button"
                  data-testid={`roadmap-stage-prev-${step.id}`}
                  onClick={() => goToStage(prevStep.id)}
                  className="flex-1 flex items-center gap-2 rounded-xl px-3 py-3 bg-white/3 border border-white/8 hover:bg-white/6 transition-all press"
                >
                  <ChevronRight size={15} className="text-slate-400 flex-shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-500 leading-none mb-0.5">السابق</p>
                    <p className="text-xs text-slate-300 truncate leading-tight">{prevStep.title}</p>
                  </div>
                </button>
              ) : <div className="flex-1"/>}
              {nextStep ? (
                <button
                  type="button"
                  data-testid={`roadmap-stage-next-${step.id}`}
                  onClick={() => goToStage(nextStep.id)}
                  className="flex-1 flex items-center gap-2 rounded-xl px-3 py-3 transition-all press"
                  style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.25)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] leading-none mb-0.5" style={{ color: 'rgba(34,211,238,0.65)' }}>التالي</p>
                    <p className="text-xs font-semibold truncate leading-tight" style={{ color: '#a5f3fc' }}>{nextStep.title}</p>
                  </div>
                  <ChevronLeft size={15} style={{ color: '#22d3ee' }} className="flex-shrink-0"/>
                </button>
              ) : <div className="flex-1"/>}
            </div>
          )}

          <button className="w-full text-slate-400 text-sm py-2 hover:text-white transition-colors" onClick={() => navigate('/roadmap')}>العودة إلى خريطة البناء</button>
        </div>
      </div>

      {/* Zoom image overlay */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(4,6,20,0.94)' }}
          onClick={() => setZoomedImage(null)}
        >
          <button
            className="absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center text-white text-lg font-bold"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)' }}
            onClick={e => { e.stopPropagation(); setZoomedImage(null); }}
            aria-label="إغلاق المعاينة"
          >
            ✕
          </button>
          <img
            src={zoomedImage.src}
            alt={zoomedImage.alt}
            className="rounded-xl"
            style={{ maxWidth: '100%', maxHeight: '88vh', objectFit: 'contain' }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </AppShell>
  );
};
