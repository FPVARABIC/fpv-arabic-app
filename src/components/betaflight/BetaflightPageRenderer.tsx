import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ExternalLink,
  Layers,
  ToggleLeft,
  ListFilter,
  Hash,
  Type,
  MousePointerClick,
  Table2,
  LineChart,
  Eye,
  Zap,
} from 'lucide-react';
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

const CONTROL_TYPE_ICON: Record<BfField['controlType'], React.FC<{ size?: number; className?: string }>> = {
  toggle: ToggleLeft,
  select: ListFilter,
  number: Hash,
  text: Type,
  button: MousePointerClick,
  table: Table2,
  graph: LineChart,
  status: Eye,
  action: Zap,
};

const FieldRow: React.FC<{ field: BfField }> = ({ field }) => {
  const ControlIcon = CONTROL_TYPE_ICON[field.controlType];
  return (
    <div className="bf-panel p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-white" dir="ltr">
            {field.englishLabel}
          </p>
          <p className="text-xs text-cyan-300 mt-0.5">{field.arabicMeaning}</p>
        </div>
        <SafetyBadge level={field.safetyLevel} />
      </div>
      <p className="text-sm text-slate-200 leading-relaxed">{field.arabicExplanation}</p>
      <div className="flex flex-wrap gap-1.5 pt-1">
        <span className="inline-flex items-center gap-1 text-[11px] text-slate-300 px-2.5 py-1 rounded-full border border-white/12 bg-white/[0.03]">
          <ControlIcon size={12} />
          {CONTROL_TYPE_LABEL_AR[field.controlType]}
        </span>
        {field.conditionNote && <ConditionBadge note={field.conditionNote} />}
        {field.requiresSave && <span className="text-[11px] text-amber-200 px-2.5 py-1 rounded-full border border-amber-400/35 bg-amber-500/10">يتطلب حفظ</span>}
        {field.requiresReboot && <span className="text-[11px] text-amber-200 px-2.5 py-1 rounded-full border border-amber-400/35 bg-amber-500/10">يتطلب إعادة تشغيل</span>}
      </div>
      {field.beginnerGuidance && (
        <p className="text-xs text-slate-300 leading-relaxed pt-2 border-t border-white/8">{field.beginnerGuidance}</p>
      )}
    </div>
  );
};

export const BetaflightPageRenderer: React.FC<{ page: BfPage; backTo?: string }> = ({ page, backTo = '/betaflight' }) => {
  const navigate = useNavigate();
  const glossaryTerms = (page.glossaryTermIds ?? [])
    .map(id => bfGlossary.find(t => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  return (
    <div className="fade-in bf-shell">
      <div className="bf-header px-4 pt-4 pb-3.5 flex items-center gap-3">
        <button onClick={() => navigate(backTo)} className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center press" aria-label="العودة">
          <ArrowRight size={18} className="text-slate-200" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-extrabold text-white tracking-tight" dir="ltr">
            {page.officialTitle}
          </h1>
          <p className="text-[13px] text-cyan-300 font-medium mt-0.5">{page.titleAr}</p>
        </div>
        <SafetyBadge level={page.safetyLevel} />
      </div>

      <div className="px-4 py-4 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <ContentStatusBadge status={page.contentStatus} />
          {page.expertRequired && <span className="text-[11px] text-purple-200 px-2.5 py-1 rounded-full border border-purple-400/35 bg-purple-500/12">يتطلب وضع الخبير</span>}
          {page.conditionNote && <ConditionBadge note={page.conditionNote} />}
        </div>

        <p className="text-[15px] text-slate-100 leading-relaxed">{page.summaryAr}</p>

        <div className="bf-panel-quiet p-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-slate-300">
          <span>الفيرموير: {page.firmwareVersionRange}</span>
          <span>التطبيق: {page.appVersionRange}</span>
          <span>تمت المراجعة: {page.reviewedAt}</span>
        </div>

        {page.contentStatus === 'architecture-preview' && (
          <div className="bf-warning-strip">
            <p className="text-sm font-bold text-amber-100">
              هذه معاينة معمارية لإثبات أن العارض يعمل بمحتوى حقيقي موثّق — وليست صفحة نهائية أو كاملة.
            </p>
          </div>
        )}

        {page.groups.map(group => (
          <div key={group.id} className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <span className="bf-accent-chip" aria-hidden>
                <Layers size={14} />
              </span>
              <h2 className="text-[15px] font-bold text-white flex-1">{group.titleAr}</h2>
              <LevelBadge level={group.level} />
            </div>
            {group.fields.map(field => (
              <FieldRow key={field.id} field={field} />
            ))}
          </div>
        ))}

        {glossaryTerms.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <span className="bf-accent-chip" aria-hidden>
                <Layers size={14} />
              </span>
              <h2 className="text-[15px] font-bold text-white flex-1">مصطلحات مرتبطة</h2>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {glossaryTerms.map(term => (
                <div key={term.id} className="bf-panel-quiet p-3.5">
                  <p className="text-xs font-bold text-cyan-300" dir="ltr">
                    {term.en}
                  </p>
                  <p className="text-xs text-slate-200 mt-1">{term.ar}</p>
                  <p className="text-[11px] text-slate-400 mt-1.5">{term.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <a
          href={page.source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="bf-panel-quiet p-3.5 flex items-center justify-between text-[13px] text-cyan-200 font-medium"
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
