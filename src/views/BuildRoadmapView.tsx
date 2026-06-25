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
  'step-1': 'قبل أن تبدأ، تأكد أن كل القطع والأدوات الأساسية أمامك حتى لا تتوقف أثناء البناء.',
  'step-2': 'تثبيت الهيكل والمحركات بشكل صحيح دون ضغط زائد أو براغي خاطئة.',
  'step-3': 'وضع الإلكترونيات الأساسية في مكانها الصحيح مع مراعاة الاتجاه والعزل.',
  'step-4': 'تجهيز التوصيلات الأساسية بهدوء ونظافة قبل أي توصيل للبطارية.',
  'step-5': 'التأكد من عدم وجود قصر أو خطأ خطير قبل أول تشغيل.',
  'step-6': 'ضبط الإعدادات الأساسية فقط حتى يتعرف الدرون على الريسيفر والموتورات بأمان.',
  'step-7': 'اختبار اتجاه واستجابة المحركات بدون مراوح وبأقل خطر ممكن.',
  'step-8': 'تنفيذ أول Hover بسيط في مكان آمن دون استعجال أو مخاطرة.',
};

const stageMaterials: Record<string, { parts: string[]; tools: string[] }> = {
  'step-1': { parts: ['الفريم', 'محركات (4x)', 'ESC', 'Flight Controller', 'Receiver', 'LiPo'], tools: ['Smoke Stopper', 'Multimeter', 'كاوي لحام', 'قصدير / Flux', 'مفكات'] },
  'step-2': { parts: ['الفريم', 'محركات (4x)', 'براغي التثبيت'], tools: ['مفكات', 'مفتاح ربط'] },
  'step-3': { parts: ['Flight Controller', 'ESC', 'Grommets'], tools: ['مفكات', 'أسلاك توصيل'] },
  'step-4': { parts: ['ESC', 'Flight Controller', 'Receiver', 'موصل البطارية'], tools: ['كاوي لحام', 'قصدير / Flux', 'Multimeter'] },
  'step-5': { parts: ['Smoke Stopper', 'LiPo'], tools: ['Multimeter'] },
  'step-6': { parts: ['Flight Controller', 'Receiver', 'كابل USB'], tools: ['Betaflight Configurator'] },
  'step-7': { parts: ['FC', 'ESC', 'محركات', 'LiPo'], tools: [] },
  'step-8': { parts: ['الدرون الكاملة', 'LiPo مشحونة', 'المراوح'], tools: ['جهاز التحكم (TX)'] },
};

const stageGuidance: Record<string, string> = {
  'step-1': 'تأكد أن كل القطع أمامك قبل البدء. التوقف لشراء قطعة ناقصة يُعطّل تركيزك ويُطيل وقت البناء.',
  'step-2': 'ركّب الأذرع أولاً ثم ثبّت المحركات. تأكد أن مسامير الموتور لا تلمس ملفاته الداخلية — ذلك يتلف الموتور فوراً.',
  'step-3': 'ثبّت ESC مع توفير تهوية جيدة. ثبّت FC باستخدام Grommets لعزل الاهتزاز عن الجيروسكوب — بدونها تتأثر جودة الطيران.',
  'step-4': 'اعمل ببطء وهدوء. تأكد من كل وصلة قبل الانتقال للتالية. الوصلة السيئة تسبب عطلاً يصعب تتبعه لاحقاً.',
  'step-5': 'لا توصل البطارية مباشرة. افحص القطبية بالـ Multimeter أولاً، ثم استخدم Smoke Stopper في أول توصيل لتجنب الضرر.',
  'step-6': 'وصّل FC بالكمبيوتر فقط — بدون بطارية. فعّل الإعدادات المطلوبة فقط ولا تغيّر ما لا تفهمه. اضغط Save بعد كل تغيير.',
  'step-7': 'تأكد أن لا مراوح مركّبة قبل الاختبار. أدر المحركات عبر Betaflight واحداً واحداً للتحقق من الترتيب والاتجاه.',
  'step-8': 'ابدأ بارتفاع نصف متر في مكان مفتوح. تعوّد على ردة فعل الدرون قبل أي مناورة أو رفع في الارتفاع.',
};

const stageSafety: Record<string, StageSafety> = {
  'step-4': { level: 'warning', text: 'لا توصل البطارية أثناء اللحام. افصل الطاقة كلياً قبل لحام أي سلك جديد.' },
  'step-5': { level: 'danger', text: 'لا توصل LiPo قبل فحص القطبية والتأكد من عدم وجود قصر. القصر مع LiPo قد يسبب حريقاً فورياً.' },
  'step-7': { level: 'danger', text: 'لا تركّب المراوح أبداً أثناء اختبار المحركات. المحرك بمروحة متحرك أداة قطع خطيرة.' },
  'step-8': { level: 'danger', text: 'لا تطر فوق الناس أو بالقرب منهم. تأكد من Failsafe ومن أن Angle Mode مفعّل قبل الـ Arm.' },
};

const stageLearningLinks: Record<string, StageLearningLink[]> = {
  'step-1': [
    { label: 'ESC', lessonId: 'lesson-13' },
    { label: 'Flight Controller', lessonId: 'lesson-14' },
    { label: 'LiPo', lessonId: 'lesson-7' },
    { label: 'Smoke Stopper', lessonId: 'lesson-10' },
  ],
  'step-3': [
    { label: 'Flight Controller', lessonId: 'lesson-14' },
    { label: 'ESC', lessonId: 'lesson-13' },
  ],
  'step-4': [
    { label: 'GND / 5V / VBAT', lessonId: 'lesson-8' },
    { label: 'TX/RX', lessonId: 'lesson-9' },
  ],
  'step-5': [
    { label: 'LiPo', lessonId: 'lesson-7' },
    { label: 'Smoke Stopper', lessonId: 'lesson-10' },
    { label: 'GND / 5V / VBAT', lessonId: 'lesson-8' },
  ],
  'step-6': [
    { label: 'Receiver', lessonId: 'lesson-15' },
    { label: 'TX/RX', lessonId: 'lesson-9' },
    { label: 'Flight Controller', lessonId: 'lesson-14' },
  ],
  'step-7': [
    { label: 'Motor Test', lessonId: 'lesson-17' },
    { label: 'ESC', lessonId: 'lesson-13' },
  ],
  'step-8': [
    { label: 'First Flight', lessonId: 'lesson-18' },
    { label: 'TX/RX', lessonId: 'lesson-9' },
  ],
};

export const BuildRoadmapView: React.FC = () => {
  const navigate = useNavigate();
  const { completedRoadmapSteps, getRoadmapStepProgress, toggleRoadmapChecklistItem, isRoadmapItemDone, completeRoadmapStep, setLastOpenedRoadmapStep } = useProgress();
  const [openStep, setOpenStep] = useState<string | null>(null);

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
    </AppShell>
  );
};
