import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ExternalLink } from 'lucide-react';
import type { BfPage, BfField } from '../../data/betaflight/types';
import { bfGlossary } from '../../data/betaflight/glossary';
import { SafetyBadge, LevelBadge, ConditionBadge, ContentStatusBadge } from './BfBadges';

const CONTROL_TYPE_LABEL_AR: Record<BfField['controlType'], string> = {
  toggle: 'مفتاح تشغيل/إيقاف',
  select: 'قائمة اختيار',
  number: 'رقم',
  text: 'نص',
  button: 'زر',
  table: 'جدول',
  graph: 'رسم بياني',
  status: 'عرض حالة فقط',
  action: 'إجراء',
};

const FieldRow: React.FC<{ field: BfField }> = ({ field }) => (
  <div className="card-subtle p-3.5 space-y-2">
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-sm font-bold text-white" dir="ltr">
          {field.englishLabel}
        </p>
        <p className="text-xs text-cyan-300">{field.arabicMeaning}</p>
      </div>
      <SafetyBadge level={field.safetyLevel} />
    </div>
    <p className="text-sm text-slate-200 leading-relaxed">{field.arabicExplanation}</p>
    <div className="flex flex-wrap gap-1.5 pt-1">
      <span className="text-[10px] text-slate-500 px-2 py-0.5 rounded-full border border-white/8">{CONTROL_TYPE_LABEL_AR[field.controlType]}</span>
      {field.conditionNote && <ConditionBadge note={field.conditionNote} />}
      {field.requiresSave && <span className="text-[10px] text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">يتطلب حفظ</span>}
      {field.requiresReboot && <span className="text-[10px] text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">يتطلب إعادة تشغيل</span>}
    </div>
    {field.beginnerGuidance && (
      <p className="text-xs text-slate-400 leading-relaxed pt-1 border-t border-white/5">{field.beginnerGuidance}</p>
    )}
  </div>
);

export const BetaflightPageRenderer: React.FC<{ page: BfPage; backTo?: string }> = ({ page, backTo = '/betaflight' }) => {
  const navigate = useNavigate();
  const glossaryTerms = (page.glossaryTermIds ?? [])
    .map(id => bfGlossary.find(t => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  return (
    <div className="fade-in">
      <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-cyan-400/10">
        <button onClick={() => navigate(backTo)} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center press" aria-label="العودة">
          <ArrowRight size={18} className="text-slate-400" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-extrabold text-white" dir="ltr">
            {page.officialTitle}
          </h1>
          <p className="text-xs text-cyan-300">{page.titleAr}</p>
        </div>
        <SafetyBadge level={page.safetyLevel} />
      </div>

      <div className="px-4 py-4 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <ContentStatusBadge status={page.contentStatus} />
          {page.expertRequired && <span className="text-[10px] text-purple-300 px-2 py-0.5 rounded-full border border-purple-400/30">يتطلب وضع الخبير</span>}
          {page.conditionNote && <ConditionBadge note={page.conditionNote} />}
        </div>

        <p className="text-sm text-slate-200 leading-relaxed">{page.summaryAr}</p>

        <div className="card-subtle p-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
          <span>الفيرموير: {page.firmwareVersionRange}</span>
          <span>التطبيق: {page.appVersionRange}</span>
          <span>تمت المراجعة: {page.reviewedAt}</span>
        </div>

        {page.contentStatus === 'architecture-preview' && (
          <div className="warning-strip">
            <p className="text-sm font-bold text-amber-100">
              هذه معاينة معمارية لإثبات أن العارض يعمل بمحتوى حقيقي موثّق — وليست صفحة نهائية أو كاملة.
            </p>
          </div>
        )}

        {page.groups.map(group => (
          <div key={group.id} className="space-y-2.5">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white accent-head">{group.titleAr}</h2>
              <LevelBadge level={group.level} />
            </div>
            {group.fields.map(field => (
              <FieldRow key={field.id} field={field} />
            ))}
          </div>
        ))}

        {glossaryTerms.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-white accent-head">مصطلحات مرتبطة</h2>
            <div className="grid grid-cols-1 gap-2">
              {glossaryTerms.map(term => (
                <div key={term.id} className="card-subtle p-3">
                  <p className="text-xs font-bold text-cyan-300" dir="ltr">
                    {term.en}
                  </p>
                  <p className="text-xs text-slate-300">{term.ar}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{term.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <a
          href={page.source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="card-subtle p-3 flex items-center justify-between text-xs text-cyan-300"
        >
          <span>المصدر الرسمي: {page.source.title}</span>
          <ExternalLink size={14} />
        </a>

        <button onClick={() => navigate(backTo)} className="btn-primary w-full mt-2">
          <ArrowRight size={18} /> العودة إلى Betaflight
        </button>
      </div>
    </div>
  );
};
