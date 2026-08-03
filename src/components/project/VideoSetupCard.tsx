import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Video, ChevronDown, Check } from 'lucide-react';
import {
  VIDEO_LINK_CLASS_LABEL_AR, VIDEO_ECOSYSTEM_LABEL_AR, VIDEO_DEVICE_ROLE_LABEL_AR,
  VTX_CONTROL_LABEL_AR, OSD_PROTOCOL_LABEL_AR, VIDEO_RECORDING_LABEL_AR,
  VIDEO_BAND_LABEL_AR, VIDEO_POLARISATION_LABEL_AR, VIDEO_CONNECTOR_LABEL_AR,
  VIDEO_POWER_LABEL_AR, VIDEO_COOLING_LABEL_AR,
} from '../../data/video/types';
import {
  videoSetupCompleteness, hasVideoSetup, VIDEO_FIELD_INPUT_ID, type VideoSetup,
} from '../../data/project/videoSetup';
import { saveVideoSetup } from '../../data/project/store';
import { Row, Select, Text, Num, Toggle, SectionTitle } from './SetupFields';
import { optionsOf } from './setupFieldStyles';

/**
 * «نظام الفيديو» — the facts about the picture that no parts catalogue holds.
 *
 * The catalogue knows which unit the reader owns. It cannot know which channel
 * they fly on, whether their goggles are the generation that pairs with it,
 * which UART the control protocol landed on, whether the overlay was ever seen
 * working, or whether the unit sits in a sealed pod with no airflow. Those are
 * facts about THIS build, and they are precisely what the video verdicts reason
 * about.
 *
 * WHY THE ANTENNA AND THE TESTS GET THEIR OWN SECTIONS
 * ----------------------------------------------------
 * Two of the video rules are blockers rather than warnings — a transmitter with
 * no confirmed antenna, and goggles from a different ecosystem — and both are
 * answered by fields in those sections. Burying them among thirty others would
 * mean the two questions that can save someone's hardware are the two least
 * likely to be answered.
 *
 * EVERY FIELD IS OPTIONAL, AND THAT IS LOAD-BEARING
 * -------------------------------------------------
 * Most of this record can only be filled from a manufacturer's manual. A form
 * that pressured someone into guessing their polarisation or their regulator's
 * rating would produce a confident wrong verdict, which is worse than the
 * engine saying plainly that it cannot judge yet. The three-state toggles exist
 * for the same reason: «لا» and «لم أسجّله» are different answers.
 */

export const VideoSetupCard: React.FC<{
  initial: VideoSetup | undefined;
  /** Called after a successful save so the workspace can recompute its verdicts. */
  onSaved: () => void;
  /**
   * A field the reader was sent here to fill in — «سجّل منظومة نظارتك».
   * Opens the form and focuses that input, so an action that asks for one fact
   * lands on that fact rather than on a form of thirty-four fields.
   */
  focusField?: keyof VideoSetup;
}> = ({ initial, onSaved, focusField }) => {
  const [open, setOpen] = useState(() => !hasVideoSetup(initial) || !!focusField);
  const rootRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<VideoSetup>(initial ?? {});
  const [saved, setSaved] = useState(false);

  const completeness = useMemo(() => videoSetupCompleteness(draft), [draft]);
  const set = <K extends keyof VideoSetup>(k: K, v: VideoSetup[K]) => {
    setDraft(d => ({ ...d, [k]: v }));
    setSaved(false);
  };

  // Focus the requested input once the form is open. Runs after paint so the
  // element exists; an unknown field is silently ignored, which is the right
  // behaviour for a link written before that field existed.
  useEffect(() => {
    if (!focusField || !open) return;
    const id = VIDEO_FIELD_INPUT_ID[focusField];
    if (!id) return;
    const el = rootRef.current?.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'auto' });
    el.focus({ preventScroll: true });
  }, [focusField, open]);

  const handleSave = () => {
    saveVideoSetup(draft);
    setSaved(true);
    onSaved();
  };

  return (
    <div
      ref={rootRef}
      data-testid="video-setup-card"
      data-focus-field={focusField ?? ''}
      style={{
        background: '#fff', border: '1px solid rgba(15,23,42,0.09)', borderRadius: 15,
        padding: '13px 14px', marginBottom: 12,
      }}
    >
      <button
        type="button"
        data-testid="video-setup-toggle"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8, textAlign: 'right',
        }}
      >
        <Video size={16} style={{ color: '#7c3aed', flexShrink: 0 }} aria-hidden />
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 900, color: '#0f172a' }}>نظام الفيديو</span>
        <span
          data-testid="video-setup-completeness"
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
          المنظومة والنظارة والقناة والاستقطاب والمنفذ والتبريد — هذه لا توجد في مواصفات أي قطعة،
          وهي ما يسمح لنا بالحكم على نظام الفيديو عندك أنت.
        </p>
      )}

      {open && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 11.5, lineHeight: 1.85, color: '#64748b', margin: '0 0 12px' }}>
            كل حقل اختياري. اترك ما لا تعرفه فارغاً — أغلب هذه البيانات لا تُعرف إلا من دليل الشركة
            المصنّعة، وسنقول لك بوضوح ما الذي يمنعنا من الحكم بدلاً من تخمينه.
          </p>

          <SectionTitle accent="#7c3aed">المنظومة</SectionTitle>
          <Row>
            <Select label="منظومة الفيديو" value={draft.ecosystem} options={optionsOf(VIDEO_ECOSYSTEM_LABEL_AR)} onChange={v => set('ecosystem', v)} testid="video-ecosystem" />
            <Select label="نوع الرابط" value={draft.linkClass} options={optionsOf(VIDEO_LINK_CLASS_LABEL_AR)} onChange={v => set('linkClass', v)} testid="video-link-class" />
          </Row>

          <SectionTitle accent="#7c3aed">على الطائرة</SectionTitle>
          <Row>
            <Select label="نوع الجهاز على الطائرة" value={draft.airDeviceRole} options={optionsOf(VIDEO_DEVICE_ROLE_LABEL_AR)} onChange={v => set('airDeviceRole', v)} testid="video-air-role" />
            <Text label="طراز الوحدة" value={draft.airUnitModel} onChange={v => set('airUnitModel', v)} testid="video-air-model" placeholder="TBS Unify Pro32" dirLtr />
          </Row>
          <Row>
            <Text label="إصدار برنامج الوحدة" value={draft.airUnitFirmware} onChange={v => set('airUnitFirmware', v)} testid="video-air-firmware" placeholder="1.2.0" dirLtr />
            <Text label="طراز الكاميرا" value={draft.cameraModel} onChange={v => set('cameraModel', v)} testid="video-camera-model" placeholder="Foxeer Razer Micro" dirLtr />
          </Row>
          <Row>
            <Toggle label="الكاميرا مدمجة في الوحدة" value={draft.cameraIntegrated} onChange={v => set('cameraIntegrated', v)} testid="video-camera-integrated" />
            <div />
          </Row>

          <SectionTitle accent="#7c3aed">على الأرض</SectionTitle>
          <Row>
            <Text label="طراز النظارة" value={draft.gogglesModel} onChange={v => set('gogglesModel', v)} testid="video-goggles-model" placeholder="Skyzone Cobra X" dirLtr />
            <Select label="منظومة النظارة" value={draft.gogglesEcosystem} options={optionsOf(VIDEO_ECOSYSTEM_LABEL_AR)} onChange={v => set('gogglesEcosystem', v)} testid="video-goggles-ecosystem" />
          </Row>
          <Row>
            <Text label="إصدار برنامج النظارة" value={draft.gogglesFirmware} onChange={v => set('gogglesFirmware', v)} testid="video-goggles-firmware" placeholder="1.4.2" dirLtr />
            <Text label="وحدة الاستقبال في النظارة" value={draft.vrxModule} onChange={v => set('vrxModule', v)} testid="video-vrx-module" placeholder="RapidFire" dirLtr />
          </Row>
          <Row>
            <Toggle label="تنويع حقيقي في الاستقبال" value={draft.trueDiversity} onChange={v => set('trueDiversity', v)} testid="video-true-diversity" />
            <Select label="التسجيل" value={draft.recording} options={optionsOf(VIDEO_RECORDING_LABEL_AR)} onChange={v => set('recording', v)} testid="video-recording" />
          </Row>

          <SectionTitle accent="#7c3aed">التوصيل والتغذية</SectionTitle>
          <Row>
            <Select label="بروتوكول التحكم بالوحدة" value={draft.vtxControlProtocol} options={optionsOf(VTX_CONTROL_LABEL_AR)} onChange={v => set('vtxControlProtocol', v)} testid="video-vtx-control" />
            <Num label="منفذ UART للتحكم" value={draft.vtxControlUartIndex} onChange={v => set('vtxControlUartIndex', v)} testid="video-vtx-uart" min={1} max={12} />
          </Row>
          <Row>
            <Select label="بروتوكول طبقة المعلومات" value={draft.osdProtocol} options={optionsOf(OSD_PROTOCOL_LABEL_AR)} onChange={v => set('osdProtocol', v)} testid="video-osd-protocol" />
            <Num label="منفذ UART لطبقة المعلومات" value={draft.osdUartIndex} onChange={v => set('osdUartIndex', v)} testid="video-osd-uart" min={1} max={12} />
          </Row>
          <Row>
            <Select label="مصدر تغذية الوحدة" value={draft.powerSource} options={optionsOf(VIDEO_POWER_LABEL_AR)} onChange={v => set('powerSource', v)} testid="video-power-source" />
            <Num label="سعة المصدر (mA)" value={draft.becCurrentMa} onChange={v => set('becCurrentMa', v)} testid="video-bec-current" min={0} max={20000} />
          </Row>
          <Row>
            <Select label="مصدر تغذية الكاميرا" value={draft.cameraPowerSource} options={optionsOf(VIDEO_POWER_LABEL_AR)} onChange={v => set('cameraPowerSource', v)} testid="video-camera-power" />
            <Toggle label="أرضي مشترك مؤكَّد" value={draft.sharedGroundConfirmed} onChange={v => set('sharedGroundConfirmed', v)} testid="video-shared-ground" />
          </Row>

          <SectionTitle accent="#7c3aed">الإرسال والهوائي</SectionTitle>
          <Row>
            <Select label="النطاق" value={draft.band} options={optionsOf(VIDEO_BAND_LABEL_AR)} onChange={v => set('band', v)} testid="video-band" />
            <Text label="القناة كما هي مكتوبة على جهازك" value={draft.channel} onChange={v => set('channel', v)} testid="video-channel" placeholder="R1" dirLtr />
          </Row>
          <Row>
            <Num label="قدرة الإرسال (mW)" value={draft.powerMw} onChange={v => set('powerMw', v)} testid="video-power-mw" min={0} max={5000} />
            <Select label="موصل هوائي الطائرة" value={draft.txAntennaConnector} options={optionsOf(VIDEO_CONNECTOR_LABEL_AR)} onChange={v => set('txAntennaConnector', v)} testid="video-tx-connector" />
          </Row>
          <Row>
            <Select label="استقطاب هوائي الطائرة" value={draft.txAntennaPolarisation} options={optionsOf(VIDEO_POLARISATION_LABEL_AR)} onChange={v => set('txAntennaPolarisation', v)} testid="video-tx-polarisation" />
            <Select label="استقطاب هوائي النظارة" value={draft.rxAntennaPolarisation} options={optionsOf(VIDEO_POLARISATION_LABEL_AR)} onChange={v => set('rxAntennaPolarisation', v)} testid="video-rx-polarisation" />
          </Row>
          <Row>
            <Toggle label="الهوائي مركّب قبل التشغيل" value={draft.antennaFittedConfirmed} onChange={v => set('antennaFittedConfirmed', v)} testid="video-antenna-fitted" />
            <div />
          </Row>
          <p style={{ fontSize: 11, lineHeight: 1.85, color: '#b45309', margin: '0 0 10px' }}>
            القدرة المسموح بها تختلف بين الدول ولا نفترضها عنك. سجّل ما تبثّ به فعلاً، والتزم
            بأنظمة بلدك.
          </p>

          <SectionTitle accent="#7c3aed">الموضع والتبريد</SectionTitle>
          <Row>
            <Select label="حالة التبريد" value={draft.cooling} options={optionsOf(VIDEO_COOLING_LABEL_AR)} onChange={v => set('cooling', v)} testid="video-cooling" />
            <Text label="موضع الوحدة" value={draft.mountingNote} onChange={v => set('mountingNote', v)} testid="video-mounting-note" placeholder="تحت اللوحة العلوية" />
          </Row>

          <SectionTitle accent="#7c3aed">ما أثبتّه بالاختبار</SectionTitle>
          <Row>
            <Text label="تاريخ اختبار الصورة" value={draft.imageTestedOn} onChange={v => set('imageTestedOn', v)} testid="video-image-tested" placeholder="2026-08-01" dirLtr />
            <Text label="تاريخ اختبار طبقة المعلومات" value={draft.osdTestedOn} onChange={v => set('osdTestedOn', v)} testid="video-osd-tested" placeholder="2026-08-01" dirLtr />
          </Row>
          <Row>
            <Text label="تاريخ اختبار المدى" value={draft.rangeTestedOn} onChange={v => set('rangeTestedOn', v)} testid="video-range-tested" placeholder="2026-08-01" dirLtr />
            <Text label="تاريخ الاختبار الحراري" value={draft.thermalTestedOn} onChange={v => set('thermalTestedOn', v)} testid="video-thermal-tested" placeholder="2026-08-01" dirLtr />
          </Row>

          <button
            type="button"
            data-testid="video-setup-save"
            onClick={handleSave}
            style={{
              width: '100%', marginTop: 6, padding: '11px 12px', borderRadius: 11,
              border: 'none', background: '#7c3aed', color: '#fff',
              fontSize: 13, fontWeight: 800, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {saved ? <Check size={15} aria-hidden /> : null}
            {saved ? 'حُفظ — الأحكام محدَّثة' : 'احفظ نظام الفيديو'}
          </button>
        </div>
      )}
    </div>
  );
};
