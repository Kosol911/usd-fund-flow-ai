// Fed Rate Path — replaces FedWatchLive + FedDotPlot
// Card-based design: 1 card per FOMC meeting, shows probability bars (ขึ้น/คง/ลด)
// Data: scraped from CME FedWatch via Investing.com on Sep 12 (before Sep 16 hike)
// Sep 16 CONFIRMED: hiked +0.25pp → 3.75-4.00% (IORB 3.90%)

interface Meeting {
  date: string;
  label: string;
  labelShort: string;
  hasDotPlot: boolean;
  isNext: boolean;
  cut: number;   // prob rate goes BELOW 3.75-4.00%
  hold: number;  // prob rate stays AT 3.75-4.00%
  hike: number;  // prob rate goes ABOVE 4.00%
  mostLikelyRange: string;
}

const CURRENT_RATE = '3.75–4.00%';
const CURRENT_IORB = '3.90%';
const NEXT_MEETING_LABEL = '28 ต.ค. 2569';
const SCRAPE_LABEL = '13 ก.ย. 2569 · ⚠️ pre-hike odds — อัปเดตหลัง Sep 16 confirmed hike';

const MEETINGS: Meeting[] = [
  {
    date: '2026-10-28', label: '28 ต.ค. 2569', labelShort: 'ต.ค.',
    hasDotPlot: false, isNext: true,
    cut: 7.2, hold: 49.6, hike: 43.2,
    mostLikelyRange: '3.75–4.00%',
  },
  {
    date: '2026-12-09', label: '9 ธ.ค. 2569', labelShort: 'ธ.ค.',
    hasDotPlot: true, isNext: false,
    cut: 2.6, hold: 22.7, hike: 74.7,
    mostLikelyRange: '4.00–4.25%',
  },
  {
    date: '2027-01-27', label: '27 ม.ค. 2570', labelShort: 'ม.ค.',
    hasDotPlot: false, isNext: false,
    cut: 1.6, hold: 14.6, hike: 84.0,
    mostLikelyRange: '4.00–4.25%+',
  },
  {
    date: '2027-03-17', label: '17 มี.ค. 2570', labelShort: 'มี.ค.',
    hasDotPlot: true, isNext: false,
    cut: 0.7, hold: 7.1, hike: 92.2,
    mostLikelyRange: '4.25–4.50%+',
  },
  {
    date: '2027-06-09', label: '9 มิ.ย. 2570', labelShort: 'มิ.ย.',
    hasDotPlot: true, isNext: false,
    cut: 0.3, hold: 3.8, hike: 95.6,
    mostLikelyRange: '4.50%+',
  },
];

const BAR_MAX_W = 100; // px

function ProbRow({
  label,
  value,
  color,
  bgColor,
  isBest,
}: {
  label: string;
  value: number;
  color: string;
  bgColor: string;
  isBest: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 py-1 rounded px-1 ${isBest ? bgColor : ''}`}>
      {/* Label */}
      <span
        className={`text-xs w-6 font-semibold shrink-0 ${isBest ? '' : 'text-gray-500'}`}
        style={{ color: isBest ? color : undefined }}
      >
        {label}
      </span>
      {/* Bar */}
      <div className="flex-1 h-3 bg-gray-800/60 rounded overflow-hidden">
        <div
          className="h-full rounded transition-all"
          style={{
            width: `${Math.max(value, 1)}%`,
            backgroundColor: color,
            opacity: isBest ? 1 : 0.4,
          }}
        />
      </div>
      {/* % */}
      <span
        className={`text-xs font-mono w-10 text-right shrink-0 ${isBest ? 'font-bold' : 'text-gray-500'}`}
        style={{ color: isBest ? color : undefined }}
      >
        {value.toFixed(1)}%
      </span>
    </div>
  );
}

function MeetingCard({ m }: { m: Meeting }) {
  const best = m.hike >= m.hold && m.hike >= m.cut ? 'hike'
    : m.hold >= m.hike && m.hold >= m.cut ? 'hold'
    : 'cut';

  const bestPct = best === 'hike' ? m.hike : best === 'hold' ? m.hold : m.cut;
  const bestLabel = best === 'hike' ? 'ขึ้น' : best === 'hold' ? 'คง' : 'ลด';
  const bestColor = best === 'hike' ? '#F87171' : best === 'hold' ? '#38BDF8' : '#4ADE80';

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        m.isNext
          ? 'border-sky-500/60 bg-sky-950/30'
          : 'border-gray-700/50 bg-gray-900/30'
      }`}
    >
      {/* Date header */}
      <div className="flex items-center gap-2 mb-3">
        {m.isNext && (
          <span className="text-[10px] font-bold bg-sky-500 text-black px-1.5 py-0.5 rounded shrink-0">
            NEXT ▶
          </span>
        )}
        <span className="font-bold text-white text-sm">{m.label}</span>
        {m.hasDotPlot && (
          <span className="text-[9px] text-amber-400/70 bg-amber-900/20 px-1 rounded">Dot Plot</span>
        )}
      </div>

      {/* Most likely outcome highlight */}
      <div
        className="flex items-center gap-3 mb-3 px-3 py-2 rounded-lg"
        style={{ backgroundColor: bestColor + '15', border: `1px solid ${bestColor}40` }}
      >
        <span className="text-[36px] font-black font-mono leading-none" style={{ color: bestColor }}>
          {bestPct.toFixed(1)}%
        </span>
        <div>
          <div className="text-base font-bold" style={{ color: bestColor }}>
            {bestLabel}ดอกเบี้ย
          </div>
          <div className="text-[20px] font-bold text-yellow-300 leading-tight">{m.mostLikelyRange}</div>
        </div>
      </div>

      {/* Probability bars */}
      <div className="space-y-0">
        <ProbRow
          label="ขึ้น" value={m.hike} color="#F87171" bgColor="bg-red-900/20" isBest={best === 'hike'}
        />
        <ProbRow
          label="คง" value={m.hold} color="#38BDF8" bgColor="bg-sky-900/20" isBest={best === 'hold'}
        />
        <ProbRow
          label="ลด" value={m.cut} color="#4ADE80" bgColor="bg-green-900/20" isBest={best === 'cut'}
        />
      </div>

      {/* Sanity check total */}
      {Math.abs(m.hike + m.hold + m.cut - 100) > 1 && (
        <div className="text-[9px] text-gray-600 text-right mt-1">
          ∑ {(m.hike + m.hold + m.cut).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

// Visual timeline showing rate path direction
function RatePathTimeline() {
  const steps = [
    { label: 'ก.ย.', value: '4.00%', done: true, hike: true },
    ...MEETINGS.map((m) => {
      const isHike = m.hike > m.hold && m.hike > m.cut;
      const parts = m.mostLikelyRange.split('–');
      const displayValue = isHike
        ? (parts[1] ?? parts[0])    // upper bound of hiked range
        : 'HOLD';
      return { label: m.labelShort, value: displayValue, done: false, hike: isHike };
    }),
  ];

  return (
    <div className="flex items-center gap-0 mb-6 overflow-x-auto pb-2">
      {/* Current */}
      <div className="flex flex-col items-center shrink-0">
        <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center font-bold text-black text-xl border-4 border-blue-300">
          NOW
        </div>
        <div className="text-[20px] text-blue-300 mt-2 font-mono font-bold">3.90%</div>
        <div className="text-[18px] text-gray-500">IORB</div>
      </div>

      {steps.map((s, i) => (
        <div key={i} className="flex items-center shrink-0">
          {/* Arrow */}
          <div className="w-16 h-1 relative mx-1" style={{ backgroundColor: s.hike ? '#F87171' : '#38BDF8' }}>
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0"
              style={{
                borderLeft: `12px solid ${s.hike ? '#F87171' : '#38BDF8'}`,
                borderTop: '8px solid transparent',
                borderBottom: '8px solid transparent',
              }}
            />
          </div>
          {/* Node */}
          <div className="flex flex-col items-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-xl border-4"
              style={{
                backgroundColor: s.done ? '#4ADE8020' : (s.hike ? '#F8717120' : '#38BDF820'),
                borderColor: s.done ? '#4ADE80' : (s.hike ? '#F87171' : '#38BDF8'),
                color: s.done ? '#4ADE80' : (s.hike ? '#F87171' : '#38BDF8'),
              }}
            >
              {s.label}
            </div>
            <div
              className="text-[20px] mt-2 font-mono font-bold"
              style={{ color: s.done ? '#4ADE80' : (s.hike ? '#F87171' : '#38BDF8') }}
            >
              {s.value}
            </div>
            <div className="text-[18px] text-gray-600">{s.hike ? 'คาดขึ้น' : 'คาดคง'}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FedRatePath() {
  return (
    <div className="card p-6 mb-8">
      {/* ── Header ── */}
      <h2 className="text-2xl font-bold text-highlight mb-1">
        Fed Rate Path — โอกาสปรับดอกเบี้ยรายการประชุม
      </h2>
      <p className="text-xs text-gray-500 mb-4">
        อิงความน่าจะเป็นจากตลาด Futures (CME FedWatch via Investing.com) ·
        ข้อมูลภาพนิ่งเมื่อ {SCRAPE_LABEL} ·
        <a href="https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html"
          target="_blank" rel="noopener noreferrer"
          className="text-sky-400 hover:text-sky-300 underline ml-1">ดูสด CME ↗</a>
      </p>

      {/* ── Current Rate (hero) ── */}
      <div className="flex flex-wrap items-center gap-6 mb-5 px-4 py-3 rounded-xl bg-blue-900/20 border border-blue-700/40">
        <div>
          <div className="text-[10px] text-blue-400/70 uppercase tracking-widest mb-0.5">
            ดอกเบี้ยตอนนี้ (IORB)
          </div>
          <div className="text-4xl font-black font-mono text-blue-200">{CURRENT_IORB}</div>
          <div className="text-sm text-blue-300/70">กรอบเป้าหมาย {CURRENT_RATE}</div>
        </div>
        <div className="text-sm text-gray-400 border-l border-blue-700/40 pl-6">
          <div className="text-orange-300 font-semibold mb-1">✅ FOMC 16 ก.ย. 2569</div>
          <div>มีมติเป็นเอกฉันท์ขึ้น <span className="text-white font-bold">+0.25pp</span></div>
          <div className="text-gray-500 text-xs mt-0.5">จาก 3.50–3.75% → {CURRENT_RATE} · มีผล 17 ก.ย.</div>
        </div>
        <div className="text-sm text-gray-400 border-l border-blue-700/40 pl-6">
          <div className="text-gray-500 text-xs mb-0.5">ประชุมถัดไป</div>
          <div className="text-white font-bold">{NEXT_MEETING_LABEL}</div>
          <div className="text-gray-500 text-xs">(ไม่มี Dot Plot)</div>
        </div>
      </div>

      {/* ── Rate Path Timeline ── */}
      <div className="mb-2">
        <div className="text-xs text-gray-500 mb-2">เส้นทางดอกเบี้ยที่ตลาดคาดไว้ (consensus)</div>
        <RatePathTimeline />
      </div>

      {/* ── Legend ── */}
      <div className="flex gap-5 text-xs mb-4">
        {[
          { color: '#F87171', label: 'ขึ้น — อัตราสูงกว่า 4.00%' },
          { color: '#38BDF8', label: 'คง — อัตรายังที่ 3.75–4.00%' },
          { color: '#4ADE80', label: 'ลด — อัตราต่ำกว่า 3.75%' },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: row.color }} />
            <span className="text-gray-400">{row.label}</span>
          </div>
        ))}
      </div>

      {/* ── Meeting cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {MEETINGS.map((m) => <MeetingCard key={m.date} m={m} />)}
      </div>

      {/* ── Reading guide ── */}
      <div className="mt-4 px-4 py-3 rounded-lg bg-gray-800/30 border border-gray-700/30 text-xs text-gray-400">
        <span className="text-white font-semibold">วิธีอ่าน:</span>{' '}
        ตัวเลข % ที่เด่นสุดในแต่ละ card = consensus ตลาด ณ วันที่ดึงข้อมูล ·
        ยิ่งใกล้ 100% = ตลาดยิ่งมั่นใจ ·
        <span className="text-amber-300"> Dot Plot</span> = มีรายงาน SEP ประกอบ (มี.ค., มิ.ย., ก.ย., ธ.ค.)
      </div>

      <p className="text-[10px] text-gray-600 mt-2">
        ⚠️ ข้อมูลความน่าจะเป็นถ่ายเมื่อ {SCRAPE_LABEL} — ตัวเลขเปลี่ยนทุกวันตามตลาด ·
        ไม่ใช่คำแนะนำลงทุน
      </p>
    </div>
  );
}
