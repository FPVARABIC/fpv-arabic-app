import React, { useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { roadmapData } from '../data/roadmapData';
import { getRoadmapStageContent } from '../data/roadmapStageContent';
import { useProgressContext } from '../contexts/ProgressContext';
import { CheckSquare, Square, ChevronDown, ChevronUp, Package, Wrench, Cpu, Zap, Shield, Settings, Activity, Wind, CheckCircle2, BookOpen } from 'lucide-react';

const iconMap: Record<string, React.FC<{size?: number; className?: string}>> = {
  Package, Wrench, Cpu, Zap, Shield, Settings, Activity, Wind,
};

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

export const BuildRoadmapView: React.FC = () => {
  const navigate = useNavigate();
  const { completedRoadmapSteps, getRoadmapStepProgress, toggleRoadmapChecklistItem, isRoadmapItemDone, completeRoadmapStep, setLastOpenedRoadmapStep } = useProgressContext();
  const [openStep, setOpenStep] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);
  const activeStageRef = useRef<HTMLDivElement>(null);

  const stageIds = roadmapData.map(s => s.id);
  const openIndex = openStep ? stageIds.indexOf(openStep) : -1;
  const canGoPrevStage = openIndex > 0;
  const canGoNextStage = openIndex >= 0 && openIndex < stageIds.length - 1;

  // Opens a stage and records it as last-opened — shared by direct header
  // taps and by Previous/Next so both go through the exact same persistence
  // call.
  const openStage = (id: string) => {
    setOpenStep(id);
    setLastOpenedRoadmapStep(id);
  };

  const toggleStep = (id: string) => {
    if (openStep === id) {
      setOpenStep(null);
    } else {
      openStage(id);
    }
  };

  const goToPrevStage = () => { if (canGoPrevStage) openStage(stageIds[openIndex - 1]); };
  const goToNextStage = () => { if (canGoNextStage) openStage(stageIds[openIndex + 1]); };

  // Keyed only to which stage is open — direct header taps and Previous/Next
  // both change openStep, so the newly revealed stage always opens at its
  // own top. Checklist toggles, safety content, and the completion button
  // never touch openStep, so they never re-trigger this. Mirrors the proven
  // pattern already used in ExpressLrsSetupView.tsx / BotV2Overlay.tsx —
  // scrollIntoView transparently handles whichever ancestor is actually
  // scrollable (on this page that is window/document, confirmed in a real
  // browser: <main> itself never overflows internally here).
  useLayoutEffect(() => {
    if (openStep) activeStageRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
  }, [openStep]);

  return (
    <AppShell tint="cyan">
      <Header title="خريطة البناء"/>
      <div className="px-4 py-4 fade-in" style={{ backgroundImage: 'radial-gradient(rgba(34,211,238,0.025) 1px, transparent 1px)', backgroundSize: '22px 22px' }}>
        <div className="mb-5">
          <p className="text-sm text-slate-400"><span className="text-cyan-300 font-bold">{completedRoadmapSteps.length}</span> من {roadmapData.length} مراحل مكتملة</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(34,211,238,0.45)' }}>ابنِ درونك خطوة بخطوة</p>
        </div>
        <div className="relative space-y-3 pr-10">
          {/* dashed timeline line */}
          <div className="absolute right-[18px] top-3 bottom-3 w-0.5 border-r-2 border-dashed border-cyan-400/50"/>
          {roadmapData.map(step => {
            const Icon = iconMap[step.icon] || Package;
            const done = completedRoadmapSteps.includes(step.id);
            const pct = getRoadmapStepProgress(step.id, step.checklist.length);
            const active = openStep === step.id;
            const checklistDoneCount = step.checklist.filter((_, i) => isRoadmapItemDone(step.id, i)).length;
            const materials = stageMaterials[step.id];
            const safety = stageSafety[step.id];
            const links = stageLearningLinks[step.id] || [];
            const imgSrc = stageImages[step.id];
            const content = getRoadmapStageContent(step.id);
            const panelId = `roadmap-stage-panel-${step.id}`;
            return (
              <div key={step.id} className="relative" ref={active ? activeStageRef : undefined}>
                {/* timeline node */}
                <div className={`absolute right-[-30px] top-4 z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-extrabold text-sm ${done ? 'bg-green-400/25 border border-green-400/50 text-green-300' : active ? 'bg-cyan-400/25 border border-cyan-400/55 text-cyan-200 pulse-glow' : 'bg-slate-800 border border-cyan-400/30 text-cyan-300'}`}>
                  {done ? <CheckCircle2 size={18} className="text-green-300"/> : step.number}
                </div>
                <div
                  className={`card-feature transition-all ${done ? 'border-green-400/30' : active ? 'border-cyan-400/50' : ''}`}
                  style={active
                    ? { boxShadow: '0 0 0 1px rgba(34,211,238,0.15), 0 4px 24px rgba(34,211,238,0.07)', background: 'rgba(5,16,28,0.98)' }
                    : { background: 'rgba(7,16,28,0.78)' }
                  }
                >
                  <button
                    className="w-full p-4 flex items-center gap-3 text-right"
                    onClick={() => toggleStep(step.id)}
                    aria-expanded={active}
                    aria-controls={panelId}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-400/20' : 'bg-cyan-400/10'}`}>
                      {done ? <CheckCircle2 size={20} className="text-green-400"/> : <Icon size={20} className="text-cyan-400"/>}
                    </div>
                    <div className="flex-1 text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">المرحلة {step.number}</span>
                        {done && <span className="text-xs bg-green-400/10 text-green-400 px-1.5 rounded-full border border-green-400/20">مكتمل</span>}
                      </div>
                      <h3 className="font-semibold text-white text-sm">{step.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 rounded-full bg-white/5">
                          <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 transition-all" style={{width: `${pct}%`}}/>
                        </div>
                        <span className="text-xs text-slate-500">{checklistDoneCount}/{step.checklist.length}</span>
                      </div>
                    </div>
                    {active ? <ChevronUp size={16} className="text-cyan-400 flex-shrink-0"/> : <ChevronDown size={16} className="text-slate-500 flex-shrink-0"/>}
                  </button>

                  {active && (
                    <div id={panelId} className="px-4 pb-4 space-y-3.5 border-t border-cyan-400/20 pt-3" style={{ background: 'rgba(34,211,238,0.012)' }}>

                      {/* 2. Existing educational image */}
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
                            <p className="text-center text-[10px] text-cyan-400/60 py-1.5">اضغط للتكبير</p>
                          </div>
                        </button>
                      )}

                      {/* 3. ماذا ستنجز؟ */}
                      <div className="rounded-xl px-3 py-2.5 text-right" style={{ background: 'rgba(24,230,230,0.06)', borderTop: '1px solid rgba(34,211,238,0.12)', borderLeft: '1px solid rgba(34,211,238,0.12)', borderBottom: '1px solid rgba(34,211,238,0.12)', borderRight: '2px solid rgba(34,211,238,0.38)' }}>
                        <p className="text-[10px] text-cyan-400 font-bold mb-1">🎯 ماذا ستنجز؟</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{stageGoals[step.id]}</p>
                      </div>

                      {/* 4. قبل أن تبدأ (existing parts/tools chips + new immediate preparation) */}
                      <div className="rounded-xl px-3 py-2.5 text-right" style={{ background: 'rgba(148,163,184,0.05)', border: '1px solid rgba(148,163,184,0.15)' }}>
                        <p className="text-[10px] text-slate-400 font-bold mb-1.5">📋 قبل أن تبدأ</p>
                        {materials && (materials.parts.length > 0 || materials.tools.length > 0) && (
                          <div className="flex flex-wrap gap-1.5 justify-end mb-2">
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
                              <li key={i} className="text-xs text-slate-300 leading-relaxed">• {item}</li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* 5. خطوات التنفيذ */}
                      {content.practicalSteps.length > 0 && (
                        <div className="rounded-xl px-3 py-2.5 text-right" style={{ background: 'rgba(251,191,36,0.05)', borderTop: '1px solid rgba(251,191,36,0.1)', borderLeft: '1px solid rgba(251,191,36,0.1)', borderBottom: '1px solid rgba(251,191,36,0.1)', borderRight: '2px solid rgba(251,191,36,0.35)' }}>
                          <p className="text-[10px] text-amber-400 font-bold mb-1.5">🛠 خطوات التنفيذ</p>
                          <ol className="space-y-1.5">
                            {content.practicalSteps.map((s, i) => (
                              <li key={i} className="text-xs text-slate-300 leading-relaxed flex gap-2">
                                <span className="text-amber-400 font-bold flex-shrink-0">{i + 1}.</span>
                                <span>{s}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* 6. انتبه */}
                      {content.warnings.length > 0 && (
                        <div className="rounded-xl px-3 py-2.5 text-right" style={{ background: 'rgba(251,191,36,0.08)', borderTop: '1px solid rgba(251,191,36,0.2)', borderLeft: '1px solid rgba(251,191,36,0.2)', borderBottom: '1px solid rgba(251,191,36,0.2)', borderRight: '3px solid rgba(251,191,36,0.55)' }}>
                          <p className="text-[10px] font-bold mb-1 text-amber-400">⚠ انتبه</p>
                          <ul className="space-y-1">
                            {content.warnings.map((w, i) => (
                              <li key={i} className="text-xs text-amber-200/90 leading-relaxed">• {w}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Existing safety callout — kept adjacent to انتبه, same visual convention */}
                      {safety && (
                        <div
                          className="rounded-xl px-3 py-2.5 text-right"
                          style={safety.level === 'danger'
                            ? { background: 'rgba(248,113,113,0.08)', borderTop: '1px solid rgba(248,113,113,0.2)', borderLeft: '1px solid rgba(248,113,113,0.2)', borderBottom: '1px solid rgba(248,113,113,0.2)', borderRight: '3px solid rgba(248,113,113,0.6)' }
                            : { background: 'rgba(251,191,36,0.08)', borderTop: '1px solid rgba(251,191,36,0.2)', borderLeft: '1px solid rgba(251,191,36,0.2)', borderBottom: '1px solid rgba(251,191,36,0.2)', borderRight: '3px solid rgba(251,191,36,0.55)' }
                          }
                        >
                          <p className={`text-[10px] font-bold mb-1 ${safety.level === 'danger' ? 'text-red-400' : 'text-amber-400'}`}>
                            {safety.level === 'danger' ? '🔴 تحذير' : '⚠ تنبيه'}
                          </p>
                          <p className={`text-xs leading-relaxed ${safety.level === 'danger' ? 'text-red-200/90' : 'text-amber-200/90'}`}>{safety.text}</p>
                        </div>
                      )}

                      {/* 7. أخطاء شائعة */}
                      {content.commonMistakes.length > 0 && (
                        <div className="rounded-xl px-3 py-2.5 text-right" style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)' }}>
                          <p className="text-[10px] font-bold mb-1 text-red-300">🚫 أخطاء شائعة</p>
                          <ul className="space-y-1">
                            {content.commonMistakes.map((m, i) => (
                              <li key={i} className="text-xs text-red-200/80 leading-relaxed">• {m}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 8. كيف تتأكد أن كل شيء صحيح؟ */}
                      {content.acceptanceChecks.length > 0 && (
                        <div className="rounded-xl px-3 py-2.5 text-right" style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.18)' }}>
                          <p className="text-[10px] font-bold mb-1.5 text-green-300">✅ كيف تتأكد أن كل شيء صحيح؟</p>
                          <ul className="space-y-1">
                            {content.acceptanceChecks.map((c, i) => (
                              <li key={i} className="text-xs text-slate-300 leading-relaxed">• {c}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 9. توقف ولا تكمل إذا... */}
                      <div className="rounded-xl px-3 py-2.5 text-right" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)' }}>
                        <p className="text-[10px] font-bold mb-1.5 text-red-400">⛔ توقف ولا تكمل إذا...</p>
                        {content.stopConditions.length > 0 ? (
                          <ul className="space-y-1">
                            {content.stopConditions.map((s, i) => (
                              <li key={i} className="text-xs text-red-200/90 leading-relaxed">• {s}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-400 leading-relaxed">لا توجد حالة توقف إضافية لهذه المرحلة بخلاف ما ورد أعلاه في "انتبه".</p>
                        )}
                      </div>

                      {/* 10. Learning links */}
                      {links.length > 0 && (
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500 font-bold mb-1.5 flex items-center justify-end gap-1"><BookOpen size={10}/>راجع بسرعة:</p>
                          <div className="flex flex-wrap gap-1.5 justify-end">
                            {links.map(link => (
                              <button
                                key={link.lessonId}
                                onClick={() => navigate(`/lessons/${link.lessonId}`)}
                                className="text-[11px] px-2.5 py-0.5 rounded-full transition-all hover:opacity-80"
                                style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)', color: '#93c5fd' }}
                              >
                                {link.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 11. Checklist */}
                      <div className="rounded-xl p-3" style={{ background: 'rgba(34,211,238,0.025)', border: '1px solid rgba(34,211,238,0.1)' }}>
                        <p className="text-[10px] font-bold mb-2 text-right" style={{ color: 'rgba(34,211,238,0.65)' }}>قائمة التحقق</p>
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

                      {/* 12. Complete stage / done */}
                      {!done && checklistDoneCount === step.checklist.length && checklistDoneCount > 0 && (
                        <button className="btn-primary w-full text-sm py-2" onClick={() => completeRoadmapStep(step.id)}>
                          <CheckCircle2 size={16}/> إتمام المرحلة
                        </button>
                      )}
                      {done && <div className="success-card text-center text-sm text-green-400 font-semibold flex items-center justify-center gap-2"><CheckCircle2 size={16}/>المرحلة مكتملة</div>}

                      {/* 13. Previous / Next navigation */}
                      <div className="flex items-center gap-2.5 pt-1">
                        <button
                          type="button"
                          data-testid={`roadmap-stage-prev-${step.id}`}
                          disabled={!canGoPrevStage}
                          aria-label={canGoPrevStage ? `المرحلة السابقة: ${roadmapData[openIndex - 1].title}` : 'لا توجد مرحلة سابقة'}
                          onClick={goToPrevStage}
                          className="flex-1 py-2.5 rounded-xl font-bold text-sm"
                          style={canGoPrevStage
                            ? { background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid rgba(148,163,184,0.25)' }
                            : { background: 'rgba(255,255,255,0.03)', color: '#475569', border: '1px solid rgba(148,163,184,0.12)', cursor: 'not-allowed' }}
                        >
                          السابق
                        </button>
                        <button
                          type="button"
                          data-testid={`roadmap-stage-next-${step.id}`}
                          disabled={!canGoNextStage}
                          aria-label={canGoNextStage ? `المرحلة التالية: ${roadmapData[openIndex + 1].title}` : 'لا توجد مرحلة تالية'}
                          onClick={goToNextStage}
                          className="flex-1 py-2.5 rounded-xl font-bold text-sm"
                          style={canGoNextStage
                            ? { background: '#0891b2', color: '#ffffff' }
                            : { background: 'rgba(255,255,255,0.03)', color: '#475569', border: '1px solid rgba(148,163,184,0.12)', cursor: 'not-allowed' }}
                        >
                          التالي
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Final completion state — shown once all 10 stages are complete.
            Does not auto-navigate; only offers currently-available destinations. */}
        {completedRoadmapSteps.length >= roadmapData.length && (
          <div
            data-testid="roadmap-final-completion"
            className="mt-5 rounded-2xl p-4 text-right"
            style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.25)' }}
          >
            <div className="flex items-center gap-2 justify-end mb-2">
              <h2 className="font-bold text-green-300 text-sm">تم إكمال التجميع المادي للدرون</h2>
              <CheckCircle2 size={18} className="text-green-400 flex-shrink-0"/>
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed mb-1">⚠ الدرون ليس جاهزًا للطيران بعد.</p>
            <p className="text-xs text-slate-300 leading-relaxed mb-1">يجب أن تبقى المراوح غير مركبة.</p>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">المرحلة التالية هي البرمجة والإعداد والاختبارات الآمنة.</p>
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                data-testid="roadmap-final-completion-programming"
                onClick={() => navigate('/programming')}
                className="btn-primary text-sm py-2 px-4"
              >
                الانتقال إلى البرمجة
              </button>
              <button
                type="button"
                data-testid="roadmap-final-completion-expresslrs"
                onClick={() => navigate('/programming/expresslrs')}
                className="text-sm py-2 px-4 rounded-xl font-bold"
                style={{ background: 'rgba(167,139,250,0.12)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.3)' }}
              >
                إعداد ExpressLRS (اختياري)
              </button>
            </div>
          </div>
        )}
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
