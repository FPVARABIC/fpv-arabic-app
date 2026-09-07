'use client';

import { useState } from 'react';
import Link from 'next/link';
import { roadmapData } from '@core/data/roadmapData';
import { roadmapStageContent, type RoadmapStageId } from '@core/data/roadmapStageContent';
import type { Receiver, VideoUnit, Battery, Gps } from '@core/data/assembly/types';
import type { BuildDraft } from '@/lib/build/draft';
import { draftParts } from '@/lib/build/draft';

/**
 * The guide steps — 13 (wiring), 14 (assembly order), 16 (software),
 * 20 (first flight).
 *
 * WHAT THE WIRING STEP IS AND IS NOT
 * ----------------------------------
 * It is the TOPOLOGY of the reader's own build: which of their chosen parts
 * connects to which, over what kind of link, with the documented facts the
 * catalogue holds (the battery's connector, the video unit's input-voltage
 * range) filled in. It is NOT a pinout: the platform's standing rule is
 * «لا نخترع Pinout», so every line that depends on a specific pad ends in
 * the manufacturer sentence. A wrong general diagram would be worse than
 * none.
 *
 * WHY ASSEMBLY ORDER RENDERS THE SHARED ROADMAP
 * ---------------------------------------------
 * The ten-stage practical roadmap (preparation, steps, warnings, common
 * mistakes, acceptance checks, stop conditions) already exists in the shared
 * core, reviewed. This step renders stages 1–9 — the pre-battery stage is
 * the wizard's own GATE, so it appears once, as a gate, not twice.
 */

interface WiringLine {
  fromAr: string;
  toAr: string;
  overAr: string;
  noteAr?: string;
}

export function wiringLines(draft: BuildDraft): WiringLine[] {
  const parts = draftParts(draft);
  const battery = parts.batteries as Battery | undefined;
  const receiver = parts.receivers as Receiver | undefined;
  const video = parts.videoUnits as VideoUnit | undefined;
  const gps = parts.gps as Gps | undefined;

  const lines: WiringLine[] = [];

  lines.push({
    fromAr: battery ? `البطارية (${battery.nameAr})` : 'البطارية',
    toAr: 'لوحة الطاقة في الـESC',
    overAr: battery?.specs.connector
      ? `موصل ${battery.specs.connector} — القطبية تُفحص بالـMultimeter قبل أول توصيل`
      : 'موصل البطارية — القطبية تُفحص بالـMultimeter قبل أول توصيل',
    noteAr: parts.capacitors
      ? `الـCapacitor (${parts.capacitors.nameAr}) يُلحم على نقطة دخول الطاقة نفسها، بأقصر أرجل ممكنة.`
      : 'يوصى بلحام Capacitor على نقطة دخول الطاقة لتنقية الجهد.',
  });
  lines.push({
    fromAr: 'المحركات الأربعة',
    toAr: 'أطراف الـESC',
    overAr: 'ثلاثة أسلاك لكل محرك — الترتيب بينها يحدد الاتجاه ويُصحح لاحقاً من البرنامج',
  });
  lines.push({
    fromAr: 'الـESC',
    toAr: 'الـFlight Controller',
    overAr: 'موصل الحزمة (Harness) بين اللوحتين في الـStack — إشارة وطاقة معاً',
    noteAr: 'ترتيب أطراف الموصل يختلف بين الشركات — طابِق مخطط الشركتين قبل التوصيل.',
  });
  lines.push({
    fromAr: receiver ? `الريسيفر (${receiver.nameAr})` : 'الريسيفر',
    toAr: 'منفذ UART في الـFC',
    overAr: 'TX↔RX متقاطعة + تغذية 5V وGND',
  });
  lines.push({
    fromAr: video ? `وحدة الفيديو (${video.nameAr})` : 'وحدة الفيديو',
    toAr: 'منفذ UART آخر + الطاقة',
    overAr: video?.specs.operatingVoltageRange
      ? `مدى جهد الدخل الموثق لهذه الوحدة: ${video.specs.operatingVoltageRange}`
      : 'مدى جهد الدخل غير موثق في الكتالوج — تحتاج المواصفة إلى تحقق من الشركة المصنّعة',
  });
  if (gps) {
    lines.push({
      fromAr: `الـGPS (${gps.nameAr})`,
      toAr: 'منفذ UART ثالث',
      overAr: 'TX↔RX + تغذية 5V وGND',
      noteAr: gps.specs.hasCompass
        ? 'هذه الوحدة ببوصلة — البوصلة تحتاج توصيلاً إضافياً (I2C عادة)؛ راجع دليل الشركة.'
        : undefined,
    });
  }
  if (parts.buzzers) {
    lines.push({
      fromAr: `الـBuzzer (${parts.buzzers.nameAr})`,
      toAr: 'أطراف BZ في الـFC',
      overAr: 'طرفان بقطبية صحيحة',
    });
  }
  return lines;
}

export const WiringStep: React.FC<{ draft: BuildDraft }> = ({ draft }) => {
  const lines = wiringLines(draft);
  return (
    <div data-testid="build-wiring">
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {lines.map((l, i) => (
          <li key={i} className="card-sm" style={{ padding: '12px 14px' }}>
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, lineHeight: 1.9 }}>
              {l.fromAr} ← {l.toAr}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.9 }}>
              {l.overAr}
            </p>
            {l.noteAr && (
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-dimmer)', lineHeight: 1.9 }}>
                {l.noteAr}
              </p>
            )}
          </li>
        ))}
      </ol>
      <p role="note" className="card-sm" style={{
        marginTop: 12, padding: '12px 14px', fontSize: 12.5,
        color: 'var(--sev-warning)', lineHeight: 1.95,
      }}>
        هذا مخطط علاقات، لا مخطط أرجل (Pinout): مواضع اللحام الدقيقة تختلف بين
        اللوحات، ومرجعها الوحيد دليل الشركة المصنّعة لقطعتك أنت. المنصة لا تخترع
        Pinout — وأساسيات اللحام والتوصيل مشروحة في{' '}
        <Link href="/kb" style={{ color: 'var(--accent-ink)', fontWeight: 700 }}>الموسوعة</Link>.
      </p>
    </div>
  );
};

/** Stages 1–9 of the shared practical roadmap, pre-battery excluded (it is the gate). */
export const AssemblyStep: React.FC = () => {
  const stages = roadmapData.filter(s => s.id !== 'build-pre-battery');
  const [open, setOpen] = useState<string | null>(stages[0]?.id ?? null);
  return (
    <div data-testid="build-assembly">
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {stages.map(stage => {
          const content = roadmapStageContent[stage.id as RoadmapStageId];
          const isOpen = open === stage.id;
          return (
            <li key={stage.id} className="card-sm" style={{ padding: '12px 14px' }}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : stage.id)}
                aria-expanded={isOpen}
                data-testid={`assembly-stage-${stage.id}`}
                style={{
                  display: 'flex', gap: 10, width: '100%', alignItems: 'baseline',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  textAlign: 'start', padding: 0,
                }}
              >
                <span dir="ltr" style={{ fontSize: 12, fontWeight: 900, color: 'var(--accent-ink)' }}>
                  {stage.number}
                </span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 900 }}>{stage.title}</span>
                <span aria-hidden style={{ fontSize: 12, color: 'var(--text-dimmer)' }}>
                  {isOpen ? '−' : '+'}
                </span>
              </button>
              {isOpen && (
                <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.95 }}>
                    {stage.description}
                  </p>
                  {content && (
                    <>
                      <GuideList titleAr="التحضير" items={content.preparation} />
                      <GuideList titleAr="الخطوات العملية" items={content.practicalSteps} ordered />
                      <GuideList titleAr="تحذيرات" items={content.warnings} tone="warn" />
                      <GuideList titleAr="أخطاء شائعة" items={content.commonMistakes} />
                      <GuideList titleAr="فحوص القبول" items={content.acceptanceChecks} />
                      <GuideList titleAr="توقف إذا" items={content.stopConditions} tone="warn" />
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export const SoftwareStep: React.FC<{ draft: BuildDraft }> = ({ draft }) => {
  const parts = draftParts(draft);
  const receiver = parts.receivers as Receiver | undefined;
  const video = parts.videoUnits as VideoUnit | undefined;
  return (
    <div data-testid="build-software" style={{ display: 'grid', gap: 10 }}>
      <div className="card-sm" style={{ padding: '13px 15px' }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 900 }}>Betaflight — الإعداد الأساسي</h4>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.95 }}>
          المنافذ (Ports)، ثم الريسيفر، ثم الأوضاع — بهذا الترتيب. صفحات الإعداد في
          مركز البرامج مكتوبة خطوة خطوة، ومربوطة بقطعك حين تسجلها في «مشروعي».
        </p>
        <Link href="/programming" className="btn-ghost" style={{ marginTop: 9, fontSize: 12.5 }}>
          افتح مركز البرامج ←
        </Link>
      </div>

      <div className="card-sm" style={{ padding: '13px 15px' }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 900 }}>ربط الريسيفر</h4>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.95 }}>
          {receiver
            ? <>ريسيفرك يعمل ببروتوكول <b dir="ltr">{receiver.specs.protocol}</b> — اربطه بجهاز تحكمك ثم سجّل إعداد الربط في سجل التحكم داخل «مشروعي» لتقرأه صفحات الإعداد والتشخيص.</>
            : 'لم تختر ريسيفراً بعد — عد إلى الخطوة 8 أولاً.'}
        </p>
        <Link href="/project?view=rc" className="btn-ghost" style={{ marginTop: 9, fontSize: 12.5 }}>
          سجل التحكم في مشروعي ←
        </Link>
      </div>

      <div className="card-sm" style={{ padding: '13px 15px' }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 900 }}>نظام الفيديو</h4>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.95 }}>
          {video
            ? <>وحدتك: <b>{video.nameAr}</b>{video.protocolOrSystem ? <> من منظومة <b dir="ltr">{video.protocolOrSystem}</b></> : null}. اربطها بالنظارة وسجّل إعداد الفيديو في «مشروعي».</>
            : 'لم تختر وحدة فيديو بعد — عد إلى الخطوة 9 أولاً.'}
        </p>
        <Link href="/project?view=video" className="btn-ghost" style={{ marginTop: 9, fontSize: 12.5 }}>
          سجل الفيديو في مشروعي ←
        </Link>
      </div>
    </div>
  );
};

export const FirstFlightStep: React.FC = () => (
  <div data-testid="build-firstflight" style={{ display: 'grid', gap: 10 }}>
    <div className="card-sm" style={{ padding: '13px 15px' }}>
      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 900 }}>أول تشغيل</h4>
      <ul style={{ margin: '8px 0 0', paddingInlineStart: 18, fontSize: 13, lineHeight: 2, color: 'var(--text-dim)', display: 'grid', gap: 4 }}>
        <li>مكان مفتوح، بلا أشخاص في نطاق الحركة، وبعيد عن أي منطقة يمنع فيها الطيران.</li>
        <li>وضع Angle، وعصا الغاز في أدنى نقطة قبل الـArm.</li>
        <li>حوّم على ارتفاع متر واحد ثوانيَ قليلة ثم اهبط — هذه هي الرحلة الأولى كلها.</li>
        <li>افصل البطارية، والمس المحركات بحذر: سخونة زائدة تعني مشكلة تُشخّص قبل البطارية الثانية.</li>
      </ul>
    </div>
    <div className="card-sm" style={{ padding: '13px 15px' }}>
      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 900 }}>بعد أول بطارية ناجحة</h4>
      <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.95 }}>
        إذا ظهر سلوك غريب فابدأ من شجرة التشخيص المناسبة، لا من تغيير الإعدادات
        عشوائياً. وحين يستقر الطيران، المشاريع المفتوحة هي الخطوة التالية الطبيعية.
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 9, flexWrap: 'wrap' }}>
        <Link href="/diagnose" className="btn-ghost" style={{ fontSize: 12.5 }}>التشخيص ←</Link>
        <Link href="/projects" className="btn-ghost" style={{ fontSize: 12.5 }}>المشاريع ←</Link>
        <Link href="/project" className="btn-ghost" style={{ fontSize: 12.5 }}>بناءي (مشروعي) ←</Link>
      </div>
    </div>
    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dimmer)', lineHeight: 1.9 }}>
      الطيران مسؤوليتك، والتزام أنظمة بلدك واجب — نفس القاعدة المثبتة في أسفل كل صفحة.
    </p>
  </div>
);

const GuideList: React.FC<{
  titleAr: string;
  items: readonly string[];
  ordered?: boolean;
  tone?: 'warn';
}> = ({ titleAr, items, ordered, tone }) => {
  if (items.length === 0) return null;
  const style: React.CSSProperties = {
    margin: 0, paddingInlineStart: 18, fontSize: 12.5, lineHeight: 1.95,
    color: tone === 'warn' ? 'var(--sev-warning)' : 'var(--text-dim)',
    display: 'grid', gap: 3,
  };
  return (
    <div>
      <h5 style={{ margin: '0 0 4px', fontSize: 11.5, fontWeight: 900, color: 'var(--text-dimmer)' }}>
        {titleAr}
      </h5>
      {ordered
        ? <ol style={style}>{items.map((t, i) => <li key={i}>{t}</li>)}</ol>
        : <ul style={style}>{items.map((t, i) => <li key={i}>{t}</li>)}</ul>}
    </div>
  );
};
