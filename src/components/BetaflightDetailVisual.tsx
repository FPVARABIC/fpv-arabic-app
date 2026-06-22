import React from 'react';

const C = {
  cyan: '#22d3ee', amber: '#fbbf24', red: '#f87171', green: '#4ade80',
  blue: '#60a5fa', purple: '#a78bfa', slate: '#94a3b8', bg: 'rgba(255,255,255,0.03)',
};

interface Props { id: string; }

export const BetaflightDetailVisual: React.FC<Props> = ({ id }) => {
  switch (id) {
    case 'interface': return <InterfaceVisual />;
    case 'firmware': return <FirmwareVisual />;
    case 'ports': return <PortsVisual />;
    case 'receiver': return <ReceiverVisual />;
    case 'modes': return <ModesVisual />;
    case 'motors': return <MotorsVisual />;
    case 'failsafe': return <FailsafeVisual />;
    case 'osd': return <OsdVisual />;
    case 'blackbox': return <BlackboxVisual />;
    case 'cli': return <CliVisual />;
    default: return null;
  }
};

/* ─── Interface ─── */
function InterfaceVisual() {
  const tabs = ['Setup', 'Ports', 'Configuration', 'Receiver', 'Modes', 'Motors', 'OSD', 'CLI'];
  return (
    <div className="mt-4 rounded-2xl overflow-hidden" style={{ border: `1px solid rgba(34,211,238,0.15)`, background: 'rgba(4,12,22,0.9)' }}>
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/5">
        {['#f87171','#fbbf24','#4ade80'].map((c,i) => <div key={i} className="w-2.5 h-2.5 rounded-full" style={{background:c}}/>)}
        <span className="text-xs text-slate-400 mr-2">Betaflight Configurator</span>
      </div>
      <div className="flex">
        {/* Sidebar */}
        <div className="w-24 border-l border-white/5 p-1 space-y-0.5">
          {tabs.map((t, i) => (
            <div key={t} className="px-2 py-1.5 rounded-lg text-xs text-right"
              style={{
                background: i === 0 ? 'rgba(34,211,238,0.15)' : 'transparent',
                color: i === 0 ? C.cyan : C.slate,
                borderRight: i === 0 ? `2px solid ${C.cyan}` : '2px solid transparent',
              }}>
              {t}
            </div>
          ))}
        </div>
        {/* Main panel */}
        <div className="flex-1 p-3">
          <p className="text-xs text-slate-400 mb-2">Setup — حركة الطائرة الحية</p>
          <div className="flex items-center justify-center h-20">
            <svg viewBox="0 0 100 80" width="140">
              {/* Quad outline */}
              <rect x="38" y="33" width="24" height="18" rx="3" fill="none" stroke={C.cyan} strokeWidth="1.5"/>
              {[[-14,-14],[14,-14],[-14,14],[14,14]].map(([dx,dy],i)=>(
                <circle key={i} cx={50+dx} cy={40+dy} r="7" fill="none" stroke={C.cyan} strokeWidth="1" strokeDasharray="3,2"/>
              ))}
              {/* Roll/Pitch arrows */}
              <path d="M22 40 Q12 30 22 20" stroke={C.amber} strokeWidth="1.5" fill="none" strokeDasharray="3,2"/>
              <polygon points="22,20 18,26 26,24" fill={C.amber}/>
              <text x="50" y="76" textAnchor="middle" fill={C.slate} fontSize="7">Pitch / Roll Live</text>
            </svg>
          </div>
          <div className="flex gap-2 mt-2">
            <div className="flex-1 rounded-lg p-2 text-center" style={{background:'rgba(34,211,238,0.08)',border:`1px solid rgba(34,211,238,0.15)`}}>
              <p className="text-xs text-cyan-400 font-bold">Save</p>
              <p className="text-[10px] text-slate-400">احفظ دائمًا</p>
            </div>
            <div className="flex-1 rounded-lg p-2 text-center" style={{background:'rgba(251,191,36,0.08)',border:`1px solid rgba(251,191,36,0.15)`}}>
              <p className="text-xs text-amber-400 font-bold">Connect</p>
              <p className="text-[10px] text-slate-400">USB أولاً</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Firmware ─── */
function FirmwareVisual() {
  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-2xl p-4" style={{background:'rgba(4,12,22,0.9)', border:'1px solid rgba(34,211,238,0.15)'}}>
        <div className="flex items-center gap-4">
          {/* FC chip */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{background:'rgba(34,211,238,0.08)',border:`1px solid ${C.cyan}40`}}>
              <svg viewBox="0 0 40 40" width="36">
                <rect x="8" y="8" width="24" height="24" rx="2" fill="none" stroke={C.cyan} strokeWidth="1.5"/>
                <rect x="13" y="13" width="14" height="14" rx="1" fill={`${C.cyan}20`}/>
                {[8,16,24].map(y=><line key={y} x1="2" y1={y} x2="8" y2={y} stroke={C.cyan} strokeWidth="1"/>)}
                {[8,16,24].map(y=><line key={y} x1="32" y1={y} x2="38" y2={y} stroke={C.cyan} strokeWidth="1"/>)}
              </svg>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">FC</p>
          </div>

          {/* USB cable */}
          <svg viewBox="0 0 60 20" width="70">
            <line x1="0" y1="10" x2="50" y2="10" stroke={C.cyan} strokeWidth="2" strokeDasharray="4,2"/>
            <rect x="50" y="5" width="10" height="10" rx="2" fill={C.cyan} opacity="0.7"/>
            <text x="30" y="7" textAnchor="middle" fill={C.slate} fontSize="6">USB</text>
          </svg>

          {/* PC */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{background:'rgba(96,165,250,0.08)',border:`1px solid ${C.blue}40`}}>
              <svg viewBox="0 0 40 40" width="36">
                <rect x="5" y="6" width="30" height="20" rx="2" fill="none" stroke={C.blue} strokeWidth="1.5"/>
                <line x1="20" y1="26" x2="20" y2="32" stroke={C.blue} strokeWidth="1.5"/>
                <rect x="12" y="32" width="16" height="2" rx="1" fill={C.blue} opacity="0.7"/>
                <rect x="8" y="9" width="24" height="14" rx="1" fill={`${C.blue}20`}/>
              </svg>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Configurator</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>Flashing Firmware...</span>
            <span style={{color:C.green}}>✓ Complete</span>
          </div>
          <div className="h-2 rounded-full bg-white/5">
            <div className="h-2 rounded-full" style={{width:'100%', background:`linear-gradient(90deg, ${C.cyan}, ${C.green})`}}/>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-3 flex items-start gap-2" style={{background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)'}}>
        <span className="text-red-400 text-sm mt-0.5">⚠</span>
        <p className="text-xs text-red-300">لا تقطع USB أثناء Flash — قد يحتاج DFU mode للإصلاح</p>
      </div>
    </div>
  );
}

/* ─── Ports ─── */
function PortsVisual() {
  const uarts = [
    { id: 'UART1', use: 'TX1/RX1', device: 'Receiver (CRSF)', color: C.cyan, active: true },
    { id: 'UART2', use: 'TX2/RX2', device: 'GPS', color: C.green, active: true },
    { id: 'UART3', use: 'TX3/RX3', device: 'VTX Digital', color: C.purple, active: true },
    { id: 'UART4', use: 'TX4/RX4', device: '— غير مستخدم —', color: C.slate, active: false },
  ];
  return (
    <div className="mt-4 rounded-2xl overflow-hidden" style={{border:'1px solid rgba(34,211,238,0.15)', background:'rgba(4,12,22,0.9)'}}>
      <div className="px-3 py-2 border-b border-white/5">
        <p className="text-xs font-semibold" style={{color:C.cyan}}>Ports — تعيين UART</p>
      </div>
      <div className="p-3 space-y-2">
        {uarts.map(u => (
          <div key={u.id} className="flex items-center gap-3 p-2 rounded-xl" style={{background: u.active ? `${u.color}10` : 'rgba(255,255,255,0.02)', border: `1px solid ${u.active ? u.color+'30' : 'rgba(255,255,255,0.05)'}`}}>
            <div className="w-12 text-center">
              <p className="text-[10px] font-bold" style={{color: u.active ? u.color : C.slate}}>{u.id}</p>
              <p className="text-[9px] text-slate-500">{u.use}</p>
            </div>
            <div className="flex-1 h-px" style={{background: u.active ? `${u.color}40` : 'rgba(255,255,255,0.05)'}}/>
            <p className="text-xs" style={{color: u.active ? u.color : C.slate}}>{u.device}</p>
          </div>
        ))}
        <p className="text-[10px] text-amber-400 text-center pt-1">⚠ لا تفعّل Serial RX على أكثر من UART واحد</p>
      </div>
    </div>
  );
}

/* ─── Receiver ─── */
function ReceiverVisual() {
  const channels = [
    { name: 'Roll',     val: 60 },
    { name: 'Pitch',    val: 55 },
    { name: 'Throttle', val: 10 },
    { name: 'Yaw',      val: 50 },
    { name: 'AUX1',     val: 100 },
    { name: 'AUX2',     val: 0 },
  ];
  return (
    <div className="mt-4 rounded-2xl p-4" style={{border:'1px solid rgba(34,211,238,0.15)', background:'rgba(4,12,22,0.9)'}}>
      <p className="text-xs font-semibold mb-3" style={{color:C.cyan}}>Receiver — قنوات الـ RC</p>
      <div className="space-y-2">
        {channels.map(ch => (
          <div key={ch.name} className="flex items-center gap-3">
            <p className="text-[10px] text-slate-400 w-14 text-right">{ch.name}</p>
            <div className="flex-1 h-3 rounded-full bg-white/5">
              <div className="h-3 rounded-full transition-all" style={{width:`${ch.val}%`, background:`linear-gradient(90deg, ${C.cyan}80, ${C.cyan})`}}/>
            </div>
            <p className="text-[10px] font-mono w-8" style={{color:C.cyan}}>{Math.round(1000 + ch.val*10)}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{background:C.green}}/>
        <p className="text-[10px]" style={{color:C.green}}>Binding صحيح — الأرقام تتحرك</p>
      </div>
    </div>
  );
}

/* ─── Modes ─── */
function ModesVisual() {
  const modes = [
    { name: 'ARM', aux: 'AUX1', range: [1700, 2100], color: C.green },
    { name: 'ANGLE', aux: 'AUX2', range: [900, 1300], color: C.cyan },
    { name: 'BEEPER', aux: 'AUX3', range: [1700, 2100], color: C.amber },
    { name: 'FAILSAFE', aux: 'AUX4', range: [1700, 2100], color: C.red },
  ];
  return (
    <div className="mt-4 rounded-2xl p-4" style={{border:'1px solid rgba(34,211,238,0.15)', background:'rgba(4,12,22,0.9)'}}>
      <p className="text-xs font-semibold mb-3" style={{color:C.cyan}}>Modes — أوضاع التشغيل</p>
      <div className="space-y-3">
        {modes.map(m => (
          <div key={m.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px]" style={{color:m.color}}>{m.name}</span>
              <span className="text-[10px] text-slate-500">{m.aux}</span>
            </div>
            {/* Range bar 900–2100 */}
            <div className="relative h-5 rounded-lg bg-white/5">
              <div className="absolute h-5 rounded-lg opacity-40"
                style={{
                  left: `${(m.range[0]-900)/12}%`,
                  width: `${(m.range[1]-m.range[0])/12}%`,
                  background: m.color,
                }}/>
              {/* Switch indicator at center */}
              <div className="absolute top-0.5 bottom-0.5 w-2 rounded bg-white/60"
                style={{left:`${(m.range[0]-900)/12 + (m.range[1]-m.range[0])/24}%`}}/>
              <div className="absolute top-0 right-1 bottom-0 flex items-center">
                <span className="text-[9px] text-slate-500">2100</span>
              </div>
              <div className="absolute top-0 left-1 bottom-0 flex items-center">
                <span className="text-[9px] text-slate-500">900</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Motors ─── */
function MotorsVisual() {
  const motors = [
    { label: 'M1', pos: [25, 25] },
    { label: 'M2', pos: [75, 25] },
    { label: 'M3', pos: [75, 75] },
    { label: 'M4', pos: [25, 75] },
  ];
  return (
    <div className="mt-4 space-y-3">
      {/* Big warning */}
      <div className="rounded-2xl p-4 flex items-center gap-3" style={{background:'rgba(248,113,113,0.12)', border:'2px solid rgba(248,113,113,0.5)'}}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'rgba(248,113,113,0.2)'}}>
          <span className="text-2xl">🛑</span>
        </div>
        <div>
          <p className="text-sm font-bold text-red-400">أزل جميع المراوح</p>
          <p className="text-xs text-red-300">قبل اختبار المحركات — خطر الإصابة</p>
        </div>
      </div>

      {/* Motor sliders */}
      <div className="rounded-2xl p-4" style={{border:'1px solid rgba(34,211,238,0.15)', background:'rgba(4,12,22,0.9)'}}>
        <div className="flex items-center gap-4">
          {/* Top-view quad */}
          <svg viewBox="0 0 100 100" width="90" height="90" className="flex-shrink-0">
            <line x1="30" y1="30" x2="70" y2="70" stroke={`${C.cyan}40`} strokeWidth="3"/>
            <line x1="70" y1="30" x2="30" y2="70" stroke={`${C.cyan}40`} strokeWidth="3"/>
            <rect x="42" y="42" width="16" height="16" rx="3" fill={`${C.cyan}20`} stroke={C.cyan} strokeWidth="1.5"/>
            {motors.map(m => (
              <g key={m.label}>
                <circle cx={m.pos[0]} cy={m.pos[1]} r="11" fill={`${C.cyan}15`} stroke={C.cyan} strokeWidth="1.5"/>
                <text x={m.pos[0]} y={m.pos[1]+4} textAnchor="middle" fill={C.cyan} fontSize="8" fontWeight="bold">{m.label}</text>
              </g>
            ))}
          </svg>
          {/* Sliders */}
          <div className="flex-1 space-y-2">
            {motors.map((m, i) => {
              const vals = [35, 0, 0, 0];
              return (
                <div key={m.label} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold w-5 text-right" style={{color:C.cyan}}>{m.label}</span>
                  <div className="flex-1 h-3 rounded-full bg-white/5 relative">
                    {vals[i] > 0 && <div className="h-3 rounded-full" style={{width:`${vals[i]}%`, background:`linear-gradient(90deg, ${C.amber}, ${C.red})`}}/>}
                  </div>
                  <span className="text-[10px] font-mono w-8 text-left" style={{color: vals[i]>0 ? C.amber : C.slate}}>{vals[i] > 0 ? vals[i]+'%' : 'OFF'}</span>
                </div>
              );
            })}
            <p className="text-[10px] text-amber-400 text-center pt-1">اسحب الـ Slider لتشغيل موتور</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Failsafe ─── */
function FailsafeVisual() {
  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-2xl p-4" style={{border:'1px solid rgba(34,211,238,0.15)', background:'rgba(4,12,22,0.9)'}}>
        <p className="text-xs font-semibold mb-4 text-center" style={{color:C.cyan}}>Failsafe — ماذا يحدث عند فقدان الإشارة؟</p>
        <div className="flex items-center justify-center gap-2">
          {/* TX */}
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{background:`${C.cyan}10`, border:`1px solid ${C.cyan}30`}}>
              <svg viewBox="0 0 32 32" width="28">
                <rect x="6" y="10" width="20" height="14" rx="2" fill="none" stroke={C.cyan} strokeWidth="1.5"/>
                <line x1="10" y1="24" x2="8" y2="28" stroke={C.cyan} strokeWidth="1.5"/>
                <line x1="22" y1="24" x2="24" y2="28" stroke={C.cyan} strokeWidth="1.5"/>
                <circle cx="16" cy="17" r="3" fill={`${C.cyan}40`}/>
              </svg>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">TX</p>
          </div>

          {/* Signal line with X */}
          <div className="flex flex-col items-center flex-1">
            <svg viewBox="0 0 80 30" width="80">
              <line x1="0" y1="15" x2="80" y2="15" stroke={C.red} strokeWidth="1.5" strokeDasharray="4,3"/>
              <circle cx="40" cy="15" r="10" fill={`${C.red}20`} stroke={C.red} strokeWidth="1.5"/>
              <line x1="35" y1="10" x2="45" y2="20" stroke={C.red} strokeWidth="2"/>
              <line x1="45" y1="10" x2="35" y2="20" stroke={C.red} strokeWidth="2"/>
            </svg>
            <p className="text-[10px]" style={{color:C.red}}>إشارة مقطوعة</p>
          </div>

          {/* Drone stopped */}
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{background:`${C.amber}10`, border:`1px solid ${C.amber}30`}}>
              <svg viewBox="0 0 32 32" width="28">
                <rect x="12" y="12" width="8" height="8" rx="1" fill={`${C.amber}40`} stroke={C.amber} strokeWidth="1.5"/>
                {[[-7,-7],[7,-7],[-7,7],[7,7]].map(([dx,dy],i)=>(
                  <circle key={i} cx={16+dx} cy={16+dy} r="4" fill="none" stroke={`${C.amber}60`} strokeWidth="1"/>
                ))}
              </svg>
            </div>
            <p className="text-[10px]" style={{color:C.amber}}>Drop / Stop</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {['Stage 1: تأخير 0.5s','Stage 2: خفض الـ Throttle','Stage 3: إيقاف كامل'].map((s,i)=>(
            <div key={i} className="p-2 rounded-xl" style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)'}}>
              <p className="text-[9px] text-slate-400">{s}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-3 flex items-start gap-2" style={{background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.25)'}}>
        <span className="text-amber-400 text-sm">⚠</span>
        <p className="text-xs text-amber-300">اختبر Failsafe دائمًا قبل أول رحلة — أوقف Tx وانظر هل تتوقف المحركات</p>
      </div>
    </div>
  );
}

/* ─── OSD ─── */
function OsdVisual() {
  return (
    <div className="mt-4 rounded-2xl overflow-hidden" style={{border:'1px solid rgba(34,211,238,0.15)', background:'rgba(4,12,22,0.95)'}}>
      {/* Goggles frame */}
      <div className="relative" style={{aspectRatio:'16/9', background:'#000'}}>
        {/* Fake FPV view */}
        <div className="absolute inset-0 flex items-center justify-center" style={{background:'linear-gradient(180deg, #0a1628 0%, #0d2040 60%, #071020 100%)'}}>
          <div className="text-xs text-slate-600">— FPV View —</div>
          {/* Horizon line */}
          <div className="absolute w-full h-px top-1/2" style={{background:'rgba(255,255,255,0.1)'}}/>
        </div>

        {/* OSD elements */}
        {/* Top-right: battery */}
        <div className="absolute top-2 right-2 font-mono text-yellow-400 text-xs font-bold">15.6V</div>
        {/* Top-left: RSSI */}
        <div className="absolute top-2 left-2 font-mono text-green-400 text-xs">RSSI 92%</div>
        {/* Bottom-left: mAh */}
        <div className="absolute bottom-2 left-2 font-mono text-cyan-400 text-xs">450mAh</div>
        {/* Bottom-center: timer */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-white text-xs">02:34</div>
        {/* Bottom-right: throttle */}
        <div className="absolute bottom-2 right-2 font-mono text-slate-300 text-xs">THR 45%</div>
        {/* Center crosshair */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20">
            <line x1="10" y1="3" x2="10" y2="7" stroke="white" strokeWidth="1" opacity="0.6"/>
            <line x1="10" y1="13" x2="10" y2="17" stroke="white" strokeWidth="1" opacity="0.6"/>
            <line x1="3" y1="10" x2="7" y2="10" stroke="white" strokeWidth="1" opacity="0.6"/>
            <line x1="13" y1="10" x2="17" y2="10" stroke="white" strokeWidth="1" opacity="0.6"/>
            <circle cx="10" cy="10" r="2" fill="none" stroke="white" strokeWidth="1" opacity="0.6"/>
          </svg>
        </div>
      </div>
      <div className="px-3 py-2">
        <p className="text-[10px] text-slate-400 text-center">OSD — عناصر تظهر على شاشة النظارة أثناء الطيران</p>
      </div>
    </div>
  );
}

/* ─── Blackbox ─── */
function BlackboxVisual() {
  const points = [50,45,55,40,60,35,55,65,50,45,40,50,55,60,45,50];
  const path = points.map((y, i) => `${i===0?'M':'L'}${i*(100/15)},${y}`).join(' ');
  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-2xl p-4" style={{border:'1px solid rgba(34,211,238,0.15)', background:'rgba(4,12,22,0.9)'}}>
        <div className="flex items-center gap-4 mb-4">
          {/* SD chip */}
          <div className="flex flex-col items-center">
            <div className="w-12 h-14 rounded-lg flex items-center justify-center" style={{background:'rgba(96,165,250,0.1)', border:`1px solid ${C.blue}40`}}>
              <svg viewBox="0 0 30 36" width="28">
                <path d="M0,6 L6,0 L30,0 L30,36 L0,36 Z" fill="none" stroke={C.blue} strokeWidth="1.5"/>
                {[8,12,16,20].map(y=><line key={y} x1="4" y1={y} x2="26" y2={y} stroke={`${C.blue}40`} strokeWidth="1"/>)}
                <text x="15" y="30" textAnchor="middle" fill={C.blue} fontSize="6">SD</text>
              </svg>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">SD Card</p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-400 mb-1">بيانات الطيران المسجلة</p>
            {/* Mini graph */}
            <svg viewBox="0 0 100 70" width="100%" height="60">
              <text x="2" y="8" fill={C.slate} fontSize="5">Gyro Roll</text>
              <path d={path} fill="none" stroke={C.cyan} strokeWidth="1.5"/>
              {/* Axes */}
              <line x1="0" y1="70" x2="100" y2="70" stroke={`${C.slate}30`} strokeWidth="0.5"/>
              <line x1="0" y1="0" x2="0" y2="70" stroke={`${C.slate}30`} strokeWidth="0.5"/>
            </svg>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {['Gyro Data','Motor RPM','RC Input'].map(l=>(
            <div key={l} className="py-1 px-2 rounded-lg text-[10px]" style={{background:`${C.cyan}10`, color:C.cyan, border:`1px solid ${C.cyan}20`}}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── CLI ─── */
function CliVisual() {
  const lines = [
    { text: '# Betaflight / STM32F7X2', color: C.slate },
    { text: '> diff all', color: C.cyan },
    { text: 'feature -RX_PARALLEL_PWM', color: C.green },
    { text: 'set motor_pwm_protocol = DSHOT600', color: C.green },
    { text: 'set acc_calibration = ...', color: C.green },
    { text: '> save', color: C.cyan },
    { text: 'Saving...', color: C.amber },
    { text: 'Rebooting.', color: C.amber },
  ];
  return (
    <div className="mt-4 rounded-2xl overflow-hidden" style={{border:'1px solid rgba(34,211,238,0.15)'}}>
      <div className="flex items-center gap-1.5 px-3 py-2" style={{background:'rgba(4,12,22,0.95)'}}>
        {['#f87171','#fbbf24','#4ade80'].map((c,i) => <div key={i} className="w-2.5 h-2.5 rounded-full" style={{background:c}}/>)}
        <span className="text-xs text-slate-500 mr-2">CLI — Command Line Interface</span>
      </div>
      <div className="p-4 font-mono space-y-1" style={{background:'rgba(2,8,18,0.98)'}}>
        {lines.map((l, i) => (
          <div key={i} className="flex items-start gap-2">
            {l.text.startsWith('>') && <span style={{color:C.cyan}} className="text-xs select-none">{'>'}</span>}
            <p className="text-xs" style={{color: l.color, marginLeft: l.text.startsWith('>') ? 0 : 12}}>
              {l.text.startsWith('>') ? l.text.slice(2) : l.text}
            </p>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <span className="text-xs" style={{color:C.cyan}}>{'>'}</span>
          <span className="text-xs" style={{color:C.cyan}}>_</span>
          <div className="w-1.5 h-3.5 animate-pulse" style={{background:C.cyan, borderRadius:1}}/>
        </div>
      </div>
      <div className="px-3 py-2 border-t border-white/5" style={{background:'rgba(4,12,22,0.95)'}}>
        <p className="text-[10px] text-amber-400 text-center">⚠ استخدم diff all لحفظ إعداداتك — ثم save لتطبيقها</p>
      </div>
    </div>
  );
}
