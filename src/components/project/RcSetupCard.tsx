import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Radio, ChevronDown, Check } from 'lucide-react';
import {
  RC_BAND_LABEL_AR, RC_SYSTEM_LABEL_AR, RC_MODULE_LABEL_AR, RC_PROTOCOL_LABEL_AR,
  RC_POWER_LABEL_AR, RC_ANTENNA_LABEL_AR, RC_FAILSAFE_LABEL_AR,
  rcSetupCompleteness, hasRcSetup, RC_FIELD_INPUT_ID, type RcSetup,
} from '../../data/project/rcSetup';
import { saveRcSetup } from '../../data/project/store';

/**
 * «نظام التحكم» — where the user records the facts no catalogue can hold.
 *
 * Band, firmware version, which UART the receiver was soldered to, whether the
 * failsafe was ever actually tested: these are properties of THIS build, and
 * they are what the control-link verdicts reason about. Without them the engine
 * can only report unknowns; with them it can tell someone their module and
 * receiver are on different bands before they lose an evening to it.
 *
 * Every field is optional on purpose. A form that demanded completion would
 * push people to guess, and a guessed band produces a confident wrong verdict —
 * which is worse than no verdict at all.
 *
 * The component holds only draft state and layout. Validation, storage and
 * judgement all live in the data layer, so a future web client can offer a much
 * richer editor over exactly the same model without re-implementing any of it.
 */

type Option<T extends string> = { value: T; label: string };

function optionsOf<T extends string>(labels: Record<T, string>): Option<T>[] {
  return (Object.keys(labels) as T[]).map(value => ({ value, label: labels[value] }));
}

const LABEL: React.CSSProperties = { fontSize: 11, color: '#64748b', marginBottom: 3, display: 'block' };
const FIELD: React.CSSProperties = {
  width: '100%', fontSize: 12.5, padding: '8px 9px', borderRadius: 9,
  border: '1px solid rgba(15,23,42,0.15)', background: '#fff', color: '#0f172a',
};

const Row: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 9 }}>{children}</div>
);

function Select<T extends string>({ label, value, options, onChange, testid }: {
  label: string; value: T | undefined; options: Option<T>[];
  onChange: (v: T | undefined) => void; testid: string;
}) {
  return (
    <div>
      <label style={LABEL} htmlFor={testid}>{label}</label>
      <select
        id={testid}
        data-testid={testid}
        value={value ?? ''}
        onChange={e => onChange((e.target.value || undefined) as T | undefined)}
        style={FIELD}
      >
        <option value="">— غير محدد —</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

const Text: React.FC<{
  label: string; value: string | undefined; onChange: (v: string | undefined) => void;
  testid: string; placeholder?: string; dirLtr?: boolean;
}> = ({ label, value, onChange, testid, placeholder, dirLtr }) => (
  <div>
    <label style={LABEL} htmlFor={testid}>{label}</label>
    <input
      id={testid}
      data-testid={testid}
      type="text"
      value={value ?? ''}
      placeholder={placeholder}
      dir={dirLtr ? 'ltr' : undefined}
      onChange={e => onChange(e.target.value.trim() === '' ? undefined : e.target.value)}
      style={{ ...FIELD, ...(dirLtr ? { unicodeBidi: 'isolate' as const, textAlign: 'left' as const } : {}) }}
    />
  </div>
);

const Num: React.FC<{
  label: string; value: number | undefined; onChange: (v: number | undefined) => void;
  testid: string; min: number; max: number;
}> = ({ label, value, onChange, testid, min, max }) => (
  <div>
    <label style={LABEL} htmlFor={testid}>{label}</label>
    <input
      id={testid}
      data-testid={testid}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={value ?? ''}
      dir="ltr"
      onChange={e => {
        const n = Number(e.target.value);
        onChange(e.target.value === '' || !Number.isFinite(n) ? undefined : n);
      }}
      style={{ ...FIELD, textAlign: 'left', unicodeBidi: 'isolate' }}
    />
  </div>
);

const Toggle: React.FC<{
  label: string; value: boolean | undefined; onChange: (v: boolean | undefined) => void; testid: string;
}> = ({ label, value, onChange, testid }) => (
  <div>
    <span style={LABEL}>{label}</span>
    <div style={{ display: 'flex', gap: 6 }}>
      {[
        { v: true, t: 'نعم' }, { v: false, t: 'لا' },
      ].map(o => (
        <button
          key={String(o.v)}
          type="button"
          data-testid={`${testid}-${o.v ? 'yes' : 'no'}`}
          aria-pressed={value === o.v}
          onClick={() => onChange(value === o.v ? undefined : o.v)}
          style={{
            flex: 1, fontSize: 12, fontWeight: 700, padding: '8px 4px', borderRadius: 9, cursor: 'pointer',
            border: value === o.v ? '1px solid rgba(14,165,233,0.5)' : '1px solid rgba(15,23,42,0.15)',
            background: value === o.v ? 'rgba(14,165,233,0.10)' : '#fff',
            color: value === o.v ? '#0369a1' : '#475569',
          }}
        >
          {o.t}
        </button>
      ))}
    </div>
  </div>
);

export const RcSetupCard: React.FC<{
  initial: RcSetup | undefined;
  /** Called after a successful save so the workspace can recompute its verdicts. */
  onSaved: () => void;
  /**
   * A field the reader was sent here to fill in — «سجّل الـTarget في مشروعك».
   * Opens the form and focuses that input, so an action that asks for data
   * lands on the data, not on a form of twenty-seven fields.
   */
  focusField?: keyof RcSetup;
}> = ({ initial, onSaved, focusField }) => {
  const [open, setOpen] = useState(() => !hasRcSetup(initial) || !!focusField);
  const rootRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<RcSetup>(initial ?? {});
  const [saved, setSaved] = useState(false);

  const completeness = useMemo(() => rcSetupCompleteness(draft), [draft]);
  const set = <K extends keyof RcSetup>(k: K, v: RcSetup[K]) => {
    setDraft(d => ({ ...d, [k]: v }));
    setSaved(false);
  };

  // Focus the requested input once the form is open. Runs after paint so the
  // element exists; an unknown field is silently ignored, which is the right
  // behaviour for a link written before that field existed.
  useEffect(() => {
    if (!focusField || !open) return;
    const id = RC_FIELD_INPUT_ID[focusField];
    if (!id) return;
    const el = rootRef.current?.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'auto' });
    el.focus({ preventScroll: true });
  }, [focusField, open]);

  const handleSave = () => {
    saveRcSetup(draft);
    setSaved(true);
    onSaved();
  };

  return (
    <div
      ref={rootRef}
      data-testid="rc-setup-card"
      data-focus-field={focusField ?? ''}
      style={{
        background: '#fff', border: '1px solid rgba(15,23,42,0.09)', borderRadius: 15,
        padding: '13px 14px', marginBottom: 12,
      }}
    >
      <button
        type="button"
        data-testid="rc-setup-toggle"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8, textAlign: 'right',
        }}
      >
        <Radio size={16} style={{ color: '#0369a1', flexShrink: 0 }} aria-hidden />
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 900, color: '#0f172a' }}>نظام التحكم</span>
        <span
          data-testid="rc-setup-completeness"
          data-filled={completeness.filled}
          style={{ fontSize: 11, color: '#64748b' }}
          dir="ltr"
        >
          {completeness.filled}/{completeness.total}
        </span>
        <ChevronDown
          size={16}
          style={{ color: '#94a3b8', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
          aria-hidden
        />
      </button>

      {!open && (
        <p style={{ fontSize: 11.5, lineHeight: 1.8, color: '#64748b', margin: '8px 0 0' }}>
          النطاق والنظام والإصدار والمنفذ وسلوك فقد الإشارة — هذه لا توجد في مواصفات أي قطعة،
          وهي ما يسمح لنا بالحكم على رابطك أنت.
        </p>
      )}

      {open && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 11.5, lineHeight: 1.85, color: '#64748b', margin: '0 0 12px' }}>
            كل حقل اختياري. اترك ما لا تعرفه فارغاً — سنقول لك بوضوح ما الذي يمنعنا من الحكم،
            ولن نخمّنه.
          </p>

          <SectionTitle>جهة الإرسال</SectionTitle>
          <Row>
            <Text label="طراز جهاز التحكم" value={draft.radioModel} onChange={v => set('radioModel', v)} testid="rc-radio-model" placeholder="RadioMaster TX16S" dirLtr />
            <Select label="نوع الوحدة" value={draft.moduleKind} options={optionsOf(RC_MODULE_LABEL_AR)} onChange={v => set('moduleKind', v)} testid="rc-module-kind" />
          </Row>
          <Row>
            <Select label="النظام الراديوي" value={draft.txSystem} options={optionsOf(RC_SYSTEM_LABEL_AR)} onChange={v => set('txSystem', v)} testid="rc-tx-system" />
            <Select label="النطاق الترددي" value={draft.txBand} options={optionsOf(RC_BAND_LABEL_AR)} onChange={v => set('txBand', v)} testid="rc-tx-band" />
          </Row>
          <Row>
            <Text label="إصدار الـFirmware" value={draft.txFirmware} onChange={v => set('txFirmware', v)} testid="rc-tx-firmware" placeholder="3.4.3" dirLtr />
            <Text label="النطاق التنظيمي" value={draft.txRegulatoryDomain} onChange={v => set('txRegulatoryDomain', v)} testid="rc-tx-domain" placeholder="EU CE / FCC" dirLtr />
          </Row>

          <SectionTitle>المستقبل</SectionTitle>
          <Row>
            <Text label="طراز المستقبل" value={draft.rxModel} onChange={v => set('rxModel', v)} testid="rc-rx-model" placeholder="RadioMaster RP1" dirLtr />
            <Select label="النظام الراديوي" value={draft.rxSystem} options={optionsOf(RC_SYSTEM_LABEL_AR)} onChange={v => set('rxSystem', v)} testid="rc-rx-system" />
          </Row>
          <Row>
            <Select label="النطاق الترددي" value={draft.rxBand} options={optionsOf(RC_BAND_LABEL_AR)} onChange={v => set('rxBand', v)} testid="rc-rx-band" />
            <Text label="إصدار الـFirmware" value={draft.rxFirmware} onChange={v => set('rxFirmware', v)} testid="rc-rx-firmware" placeholder="3.4.3" dirLtr />
          </Row>
          <Row>
            <Text label="الـTarget" value={draft.rxTarget} onChange={v => set('rxTarget', v)} testid="rc-rx-target" placeholder="RadioMaster RP1 2400 RX" dirLtr />
            <Text label="النطاق التنظيمي" value={draft.rxRegulatoryDomain} onChange={v => set('rxRegulatoryDomain', v)} testid="rc-rx-domain" placeholder="EU CE / FCC" dirLtr />
          </Row>
          <Row>
            <Select label="مصدر التغذية" value={draft.rxVoltage} options={optionsOf(RC_POWER_LABEL_AR)} onChange={v => set('rxVoltage', v)} testid="rc-rx-voltage" />
            <Num label="عدد الهوائيات" value={draft.antennaCount} onChange={v => set('antennaCount', v)} testid="rc-antenna-count" min={1} max={4} />
          </Row>
          <Row>
            <Select label="وضع الهوائي" value={draft.antennaPlacement} options={optionsOf(RC_ANTENNA_LABEL_AR)} onChange={v => set('antennaPlacement', v)} testid="rc-antenna-placement" />
            <Toggle label="تنويع حقيقي" value={draft.trueDiversity} onChange={v => set('trueDiversity', v)} testid="rc-true-diversity" />
          </Row>

          <SectionTitle>التوصيل</SectionTitle>
          <Row>
            <Select label="البروتوكول التسلسلي" value={draft.serialProtocol} options={optionsOf(RC_PROTOCOL_LABEL_AR)} onChange={v => set('serialProtocol', v)} testid="rc-protocol" />
            <Num label="منفذ UART للمستقبل" value={draft.uartIndex} onChange={v => set('uartIndex', v)} testid="rc-uart" min={1} max={12} />
          </Row>
          <Row>
            <Num label="منفذ UART للـGPS" value={draft.gpsUartIndex} onChange={v => set('gpsUartIndex', v)} testid="rc-gps-uart" min={1} max={12} />
            <Num label="منفذ UART للفيديو" value={draft.videoUartIndex} onChange={v => set('videoUartIndex', v)} testid="rc-video-uart" min={1} max={12} />
          </Row>

          <SectionTitle>إعدادات الرابط</SectionTitle>
          <Row>
            <Num label="معدل الرزم (هرتز)" value={draft.packetRateHz} onChange={v => set('packetRateHz', v)} testid="rc-packet-rate" min={1} max={1000} />
            <Text label="نسبة التليمتري" value={draft.telemetryRatio} onChange={v => set('telemetryRatio', v)} testid="rc-telemetry-ratio" placeholder="1:64" dirLtr />
          </Row>
          <Row>
            <Toggle label="قدرة ديناميكية" value={draft.dynamicPower} onChange={v => set('dynamicPower', v)} testid="rc-dynamic-power" />
            <Toggle label="مطابقة النموذج" value={draft.modelMatch} onChange={v => set('modelMatch', v)} testid="rc-model-match" />
          </Row>

          <SectionTitle>السلامة</SectionTitle>
          <Row>
            <Select label="سلوك فقد الإشارة" value={draft.failsafeStrategy} options={optionsOf(RC_FAILSAFE_LABEL_AR)} onChange={v => set('failsafeStrategy', v)} testid="rc-failsafe" />
            <Text label="تاريخ اختبار فقد الإشارة" value={draft.failsafeTestedOn} onChange={v => set('failsafeTestedOn', v)} testid="rc-failsafe-tested" placeholder="2026-08-01" dirLtr />
          </Row>
          <Row>
            <Text label="تاريخ اختبار المدى" value={draft.rangeTestedOn} onChange={v => set('rangeTestedOn', v)} testid="rc-range-tested" placeholder="2026-08-01" dirLtr />
            <div />
          </Row>

          <button
            type="button"
            data-testid="rc-setup-save"
            onClick={handleSave}
            style={{
              width: '100%', marginTop: 6, padding: '11px 12px', borderRadius: 11,
              border: 'none', background: '#0369a1', color: '#fff',
              fontSize: 13, fontWeight: 800, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {saved ? <Check size={15} aria-hidden /> : null}
            {saved ? 'حُفظ — الأحكام محدَّثة' : 'احفظ نظام التحكم'}
          </button>
        </div>
      )}
    </div>
  );
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontSize: 11, fontWeight: 800, color: '#0369a1', margin: '4px 0 8px',
    paddingBottom: 4, borderBottom: '1px solid rgba(14,165,233,0.18)',
  }}>
    {children}
  </div>
);
