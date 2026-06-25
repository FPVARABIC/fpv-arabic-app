import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { roadmapData } from '../data/roadmapData';
import { useProgress } from '../hooks/useProgress';
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

const stageGuidance: Record<string, string> = {
  'build-soldering-basics': 'نقطة اللحام الجيدة لامعة وملساء كالتلة الصغيرة. نقطة اللحام الباهتة أو الحبيبية سيئة — درّب نفسك على لوح احتياطي قبل اللحام على القطع الحقيقية.',
  'build-parts-tools': 'افتح الكراتين وتحقق من كل قطعة. القطعة المكسورة أو الناقصة اكتشفها الآن لا في منتصف البناء.',
  'build-frame': 'ركّب الأذرع بالترتيب الصحيح حسب تعليمات الفريم. لا تشد البراغي نهائياً حتى تتأكد من محاذاة كل الأذرع — تغيير الاتجاه لاحقاً أصعب.',
  'build-motors': 'تأكد من اتجاه دوران كل محرك (CW/CCW) قبل التثبيت. مسامير الموتور لا يجب أن تدخل أعمق من المحدد — إذا لمست الملفات تتلف الموتور فوراً.',
  'build-esc': 'اترك الأسلاك بطول كافٍ للوصول للمحركات والـ FC دون شد. الأسلاك المشدودة تنكسر عند أول اهتزاز.',
  'build-fc': 'سهم FC يشير للأمام دائماً — هذا يحدد كيف يفهم Betaflight اتجاهات الطيران. الجيروسكوب حساس للاهتزاز لذلك Grommets ليست اختيارية.',
  'build-receiver': 'TX من طرف يذهب إلى RX في الطرف الآخر — هذا التقاطع ضروري وأكثر خطأ شائع للمبتدئين. هوائي داخل الفريم يضعف الإشارة بشكل كبير.',
  'build-gps': 'GPS في أعلى نقطة ممكنة بعيداً عن ESC والأسلاك الرئيسية. الحرارة والتشويش الإلكتروني من ESC يضعفان دقة GPS.',
  'build-vtx': 'تحقق من الجهد المطلوب للـ VTX قبل التوصيل — 5V أو 9V أو 12V. جهد خاطئ يحرق VTX فوراً ولا يمكن إصلاحه.',
  'build-pre-battery': 'لا توصل LiPo مباشرة في أول مرة — الـ Smoke Stopper يحميك من القصر غير المرئي. إذا اشتعل الضوء الأحمر افصل فوراً وابحث عن الخطأ.',
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
    { label: 'GND / 5V / VBAT', lessonId: 'lesson-8' },
    { label: 'TX/RX', lessonId: 'lesson-9' },
    { label: 'السلامة قبل البطارية', lessonId: 'lesson-10' },
  ],
  'build-parts-tools': [
    { label: 'ESC', lessonId: 'lesson-13' },
    { label: 'Flight Controller', lessonId: 'lesson-14' },
    { label: 'LiPo', lessonId: 'lesson-7' },
    { label: 'Receiver', lessonId: 'lesson-15' },
  ],
  'build-frame': [
    { label: 'تركيب الفريم', lessonId: 'lesson-11' },
  ],
  'build-motors': [
    { label: 'تركيب المحركات', lessonId: 'lesson-12' },
  ],
  'build-esc': [
    { label: 'ESC', lessonId: 'lesson-13' },
  ],
  'build-fc': [
    { label: 'Flight Controller', lessonId: 'lesson-14' },
  ],
  'build-receiver': [
    { label: 'Receiver', lessonId: 'lesson-15' },
    { label: 'TX/RX', lessonId: 'lesson-9' },
  ],
  'build-vtx': [
    { label: 'نظام الفيديو', lessonId: 'lesson-16' },
  ],
  'build-pre-battery': [
    { label: 'LiPo', lessonId: 'lesson-7' },
    { label: 'السلامة قبل البطارية', lessonId: 'lesson-10' },
    { label: 'GND / 5V / VBAT', lessonId: 'lesson-8' },
  ],
};

export const BuildRoadmapView: React.FC = () => {
  const navigate = useNavigate();
  const { completedRoadmapSteps, getRoadmapStepProgress, toggleRoadmapChecklistItem, isRoadmapItemDone, completeRoadmapStep, setLastOpenedRoadmapStep } = useProgress();
  const [openStep, setOpenStep] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);

  const toggleStep = (id: string) => {
    const next = openStep === id ? null : id;
    setOpenStep(next);
    if (next) setLastOpenedRoadmapStep(id);
  };

  return (
    <AppShell tint="cyan">
      <Header title="خريطة البناء"/>
      <div className="px-4 py-4 fade-in">
        <p className="text-sm text-slate-400 mb-5"><span className="text-cyan-300 font-bold">{completedRoadmapSteps.length}</span> من {roadmapData.length} مراحل مكتملة</p>
        <div className="relative space-y-3 pr-10">
          {/* dashed timeline line */}
          <div className="absolute right-[18px] top-3 bottom-3 w-0.5 border-r-2 border-dashed border-cyan-400/35"/>
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
            return (
              <div key={step.id} className="relative">
                {/* timeline node */}
                <div className={`absolute right-[-30px] top-4 z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-extrabold text-sm ${done ? 'bg-green-400/25 border border-green-400/50 text-green-300' : active ? 'bg-cyan-400/25 border border-cyan-400/55 text-cyan-200 pulse-glow' : 'bg-slate-800 border border-cyan-400/30 text-cyan-300'}`}>
                  {done ? <CheckCircle2 size={18} className="text-green-300"/> : step.number}
                </div>
                <div className={`card-feature transition-all ${done ? 'border-green-400/30' : active ? 'border-cyan-400/50' : ''}`}>
                  <button className="w-full p-4 flex items-center gap-3 text-right" onClick={() => toggleStep(step.id)}>
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
                    <div className="px-4 pb-4 space-y-3.5 border-t border-cyan-400/10 pt-3">

                      {/* 0. Educational image */}
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

                      {/* 1. Goal card */}
                      <div className="rounded-xl px-3 py-2.5 text-right" style={{ background: 'rgba(24,230,230,0.06)', borderTop: '1px solid rgba(34,211,238,0.12)', borderLeft: '1px solid rgba(34,211,238,0.12)', borderBottom: '1px solid rgba(34,211,238,0.12)', borderRight: '2px solid rgba(34,211,238,0.38)' }}>
                        <p className="text-[10px] text-cyan-400 font-bold mb-1">🎯 هدف المرحلة</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{stageGoals[step.id]}</p>
                      </div>

                      {/* 2. Parts / tools chips */}
                      {materials && (materials.parts.length > 0 || materials.tools.length > 0) && (
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500 font-bold mb-1.5">القطع والأدوات</p>
                          <div className="flex flex-wrap gap-1.5 justify-end">
                            {materials.parts.map(p => (
                              <span key={p} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(24,230,230,0.08)', border: '1px solid rgba(34,211,238,0.2)', color: '#cbd5e1' }}>{p}</span>
                            ))}
                            {materials.tools.map(t => (
                              <span key={t} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.22)', color: '#fbbf24' }}>{t}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 3. Practical guidance */}
                      <div className="rounded-xl px-3 py-2.5 text-right" style={{ background: 'rgba(251,191,36,0.05)', borderTop: '1px solid rgba(251,191,36,0.1)', borderLeft: '1px solid rgba(251,191,36,0.1)', borderBottom: '1px solid rgba(251,191,36,0.1)', borderRight: '2px solid rgba(251,191,36,0.35)' }}>
                        <p className="text-[10px] text-amber-400 font-bold mb-1">⚡ ماذا تفعل هنا؟</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{stageGuidance[step.id]}</p>
                      </div>

                      {/* 4. Learning links */}
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

                      {/* 5. Safety callout */}
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

                      {/* 6. Checklist */}
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold mb-2 text-right">قائمة التحقق</p>
                        <div className="space-y-1.5">
                          {step.checklist.map((item, i) => {
                            const itemDone = isRoadmapItemDone(step.id, i);
                            return (
                              <button key={i} className="w-full flex items-center gap-3 text-right hover:bg-white/3 rounded-lg p-1 transition-all" onClick={() => toggleRoadmapChecklistItem(step.id, i)}>
                                {itemDone ? <CheckSquare size={18} className="text-cyan-400 flex-shrink-0"/> : <Square size={18} className="text-slate-500 flex-shrink-0"/>}
                                <span className={`text-sm ${itemDone ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{item}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 7. Help action */}
                      <button
                        onClick={() => navigate('/bot')}
                        className="w-full rounded-xl py-2 text-xs text-slate-400 hover:text-cyan-300 transition-colors"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        💬 واجهت مشكلة؟ اسأل المساعد
                      </button>

                      {/* 8. Complete stage / done */}
                      {!done && checklistDoneCount === step.checklist.length && checklistDoneCount > 0 && (
                        <button className="btn-primary w-full text-sm py-2" onClick={() => completeRoadmapStep(step.id)}>
                          <CheckCircle2 size={16}/> إتمام المرحلة
                        </button>
                      )}
                      {done && <div className="success-card text-center text-sm text-green-400 font-semibold flex items-center justify-center gap-2"><CheckCircle2 size={16}/>المرحلة مكتملة</div>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
