import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';

interface ExpressLrsSection {
  id: string;
  title: string;
  description: string;
  supportingLabel: string;
  route?: string;
}

const sections: ExpressLrsSection[] = [
  {
    id: 'setup',
    title: 'الإعداد والبرمجة',
    description: 'ابدأ من تحديث الأجهزة، ثم الربط، ثم إعداد Betaflight، ثم التحقق النهائي.',
    supportingLabel: '10 خطوات عملية',
    route: '/programming/expresslrs/setup',
  },
  {
    id: 'troubleshooting',
    title: 'حل المشاكل',
    description: 'إذا واجهت مشكلة، ابدأ من هنا وشخّص السبب خطوة بخطوة.',
    supportingLabel: 'تشخيص منظم',
    route: '/programming/expresslrs/troubleshooting',
  },
];

export const ExpressLrsView: React.FC = () => {
  const navigate = useNavigate();

  return (
    <AppShell tint="purple">
      <Header title="ExpressLRS"/>
      {/* Opaque light wrapper — fully overrides AppShell's dark background for
          this page only (no global CSS/theme change). Same minHeight/negative-
          marginBottom/clearance-spacer technique already proven in
          Assembly/AssemblyLayout.tsx, so short content still reaches the
          bottom of the frame with no dark strip showing through AppShell's
          own <main> padding, and tall content still clears the fixed bottom
          nav. Not imported from there directly since that component is
          Assembly-domain-named; only the technique is reused. */}
      <div
        data-expresslrs-frame="true"
        className="relative flex flex-col"
        style={{ minHeight: 'calc(100% + 6rem)', background: '#f8fafc', marginBottom: '-6rem' }}
      >
        <div className="px-4 py-4 space-y-5 fade-in">
          {/* The page's one semantic <h1> ("ExpressLRS") is already rendered by
              <Header/> above — repeating it here would produce two <h1>
              elements, the same convention ProgrammingView.tsx/BetaflightView.tsx
              already follow (Header owns the title, body starts at the subtitle). */}
          <div className="space-y-1.5">
            <p className="text-sm font-semibold" style={{ color: '#334155' }}>إعداد وربط نظام ExpressLRS خطوة بخطوة</p>
            <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>كل ما تحتاجه لإعداد ExpressLRS من تحديث الأجهزة وحتى حل المشاكل.</p>
          </div>

          <div className="space-y-3">
            {sections.map(section => {
              const content = (
                <>
                  <h2 className="font-bold" style={{ color: '#0f172a' }}>{section.title}</h2>
                  <p className="text-sm mt-1 leading-relaxed" style={{ color: '#64748b' }}>{section.description}</p>
                  <span
                    data-testid={`expresslrs-label-${section.id}`}
                    className="inline-block text-xs font-semibold mt-2.5 px-2.5 py-1 rounded-full"
                    style={{ background: '#f1f5f9', color: '#475569' }}
                  >
                    {section.supportingLabel}
                  </span>
                </>
              );

              if (section.route) {
                return (
                  <button
                    key={section.id}
                    type="button"
                    data-testid={`expresslrs-section-${section.id}`}
                    onClick={() => navigate(section.route!)}
                    className="p-4 rounded-2xl shadow-sm w-full text-right block press"
                    style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}
                  >
                    {content}
                  </button>
                );
              }

              return (
                <div
                  key={section.id}
                  data-testid={`expresslrs-section-${section.id}`}
                  className="p-4 rounded-2xl shadow-sm"
                  style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ height: 112 }} aria-hidden />
      </div>
    </AppShell>
  );
};
