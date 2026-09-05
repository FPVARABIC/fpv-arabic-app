import React from 'react';
import { DiagramFrame, DiagramInfo, DiagramWarn, C, useReveal } from './_shared';

/**
 * Mounting a motor on the arm, with the one detail that destroys motors:
 * screw length. The two comparison columns are tappable; each explains what
 * the learner is looking at, and `onScrewExplore` reports which was opened so
 * Lesson 12 can require both be read.
 */
const CASES = {
  correct: {
    title: '✓ صحيح',
    sub: 'لا يصل للملفات',
    detail: 'طول المسمار الصحيح = سُمك الذراع + عمق القاعدة في المحرك، بلا زيادة. يثبّت المحرك بإحكام ولا يقترب من الملفات. القاعدة العملية: 6–8 مم لذراع كربون بسُمك 4–5 مم، وتحقّق دائماً من دليل المحرك.',
  },
  wrong: {
    title: '✗ خطأ',
    sub: 'يلمس الملفات → يحترق',
    detail: 'مسمار أطول بمليمترَين يعبر القاعدة ويلمس الملفات النحاسية. قد لا تلاحظ شيئاً على الطاولة — الملف يقصر عند الدوران تحت الحمل، فيحترق المحرك أو الـESC في أول طيران. المسمار «الأطول للأمان» هو أخطر خيار على المحرك.',
  },
} as const;

export type ScrewCase = keyof typeof CASES;

export interface MotorMountProps {
  /** Fired each time a learner opens a comparison column — lets a lesson require both. */
  onScrewExplore?: (which: ScrewCase) => void;
}

export const MotorMount: React.FC<MotorMountProps> = ({ onScrewExplore }) => {
  const { sel, toggle } = useReveal<ScrewCase>();
  const pick = (c: ScrewCase) => {
    toggle(c);
    onScrewExplore?.(c);
  };
  const colClass = (c: ScrewCase) =>
    `flex-1 flex flex-col items-center gap-1.5 rounded-xl p-2 border transition-all press ${sel === c ? 'border-cyan-400/50 bg-cyan-400/10' : 'border-white/5 bg-white/3'}`;

  return (
    <DiagramFrame title="تركيب المحرك على الذراع" hint="طول المسمار حاسم — لا يلمس ملفات الموتور. اضغط كل حالة لتعرف لماذا">
      <svg viewBox="0 0 280 160" className="w-full">
        <rect x="20" y="95" width="160" height="22" rx="6" fill={C.frame} stroke={C.stroke} strokeWidth="1.4" />
        <text x="60" y="135" fill="#64748b" fontSize="10">ذراع الفريم (كربون)</text>
        <ellipse cx="180" cy="70" rx="34" ry="14" fill="rgba(24,230,230,0.08)" stroke={C.cyan} strokeWidth="1.4" />
        <rect x="150" y="55" width="60" height="30" rx="6" fill="rgba(24,230,230,0.06)" stroke={C.cyan} strokeWidth="1.2" />
        <text x="180" y="44" textAnchor="middle" fill="#7fe9e9" fontSize="10">Motor</text>
        <text x="180" y="74" textAnchor="middle" fill="#64748b" fontSize="8">ملفات داخلية</text>
        <g>
          <line x1="165" y1="117" x2="165" y2="92" stroke={C.green} strokeWidth="3" />
          <circle cx="165" cy="120" r="3.5" fill={C.green} />
          <text x="120" y="150" fill={C.green} fontSize="9">✓ مسمار بطول مناسب (6–8mm)</text>
        </g>
      </svg>

      <div className="rounded-xl p-3 mt-1" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[10px] text-slate-500 text-center mb-3">قارن: المسمار الصحيح والخاطئ — اضغط أيّهما</p>
        <div className="flex items-end gap-3">

          <button type="button" onClick={() => pick('correct')} aria-pressed={sel === 'correct'} data-testid="motor-mount-case-correct" className={colClass('correct')}>
            <svg viewBox="0 0 110 110" className="w-full">
              <rect x="18" y="4" width="74" height="48" rx="5" fill="rgba(24,230,230,0.06)" stroke={C.cyan} strokeWidth="1.2" />
              <text x="55" y="14" textAnchor="middle" fill="#7fe9e9" fontSize="8" fontWeight="bold">Motor</text>
              <rect x="26" y="18" width="58" height="26" rx="3" fill="rgba(74,222,128,0.06)" stroke="rgba(74,222,128,0.25)" strokeWidth="1" />
              <text x="55" y="34" textAnchor="middle" fill="#64748b" fontSize="7">ملفات</text>
              <rect x="8" y="57" width="94" height="14" rx="3" fill={C.frame} stroke={C.stroke} strokeWidth="1.2" />
              <text x="55" y="67" textAnchor="middle" fill="#64748b" fontSize="7">ذراع</text>
              <line x1="55" y1="77" x2="55" y2="50" stroke={C.green} strokeWidth="3" strokeLinecap="round" />
              <circle cx="55" cy="81" r="4" fill={C.green} />
              <circle cx="55" cy="50" r="2.5" fill={C.green} />
            </svg>
            <span className="text-[9px] font-bold" style={{ color: C.green }}>{CASES.correct.title}</span>
            <span className="text-[9px] text-slate-500 text-center leading-tight">{CASES.correct.sub}</span>
          </button>

          <button type="button" onClick={() => pick('wrong')} aria-pressed={sel === 'wrong'} data-testid="motor-mount-case-wrong" className={colClass('wrong')}>
            <svg viewBox="0 0 110 110" className="w-full">
              <rect x="18" y="4" width="74" height="48" rx="5" fill="rgba(24,230,230,0.06)" stroke={C.cyan} strokeWidth="1.2" />
              <text x="55" y="14" textAnchor="middle" fill="#7fe9e9" fontSize="8" fontWeight="bold">Motor</text>
              <rect x="26" y="18" width="58" height="26" rx="3" fill="rgba(248,113,113,0.2)" stroke="rgba(248,113,113,0.6)" strokeWidth="1" />
              <text x="55" y="30" textAnchor="middle" fill={C.red} fontSize="7" fontWeight="bold">ملفات</text>
              <text x="55" y="40" textAnchor="middle" fill={C.red} fontSize="9">⚡</text>
              <rect x="8" y="57" width="94" height="14" rx="3" fill={C.frame} stroke={C.stroke} strokeWidth="1.2" />
              <text x="55" y="67" textAnchor="middle" fill="#64748b" fontSize="7">ذراع</text>
              <line x1="55" y1="77" x2="55" y2="29" stroke={C.red} strokeWidth="3" strokeLinecap="round" />
              <circle cx="55" cy="81" r="4" fill={C.red} />
              <circle cx="55" cy="29" r="5" fill={C.red} opacity="0.85" />
              <text x="55" y="33" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">✕</text>
            </svg>
            <span className="text-[9px] font-bold" style={{ color: C.red }}>{CASES.wrong.title}</span>
            <span className="text-[9px] text-slate-500 text-center leading-tight">{CASES.wrong.sub}</span>
          </button>

        </div>
      </div>

      <DiagramInfo text={sel ? CASES[sel].detail : null} placeholder="اضغط الحالة الصحيحة ثم الخاطئة" />
      <DiagramWarn>✗ مسمار طويل يلمس الملفات = احتراق الموتور عند الدوران</DiagramWarn>
    </DiagramFrame>
  );
};
