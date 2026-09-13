// Native visualization of Fed Rate Monitor data — replaces the iframe embed.
// Data scraped from investing.com/central-banks/fed-rate-monitor on the date below.
// Current effective target range at scrape time: 3.50–3.75%.

const SCRAPE_DATE = 'Sep 12, 2026 12:35AM EDT';
const SCRAPE_LABEL = '13 ก.ย. 2569';

interface RateBin {
  range: string;
  current: number;
  prevDay: number;
  prevWeek: number;
}

interface Meeting {
  date: string;
  label: string;
  futuresPrice: string;
  bins: RateBin[];
}

const MEETINGS: Meeting[] = [
  {
    date: '2026-09-16',
    label: 'Sep 16, 2026',
    futuresPrice: '96.268',
    bins: [
      { range: '3.50-3.75', current: 14.5, prevDay: 31.0, prevWeek: 41.6 },
      { range: '3.75-4.00', current: 85.5, prevDay: 69.0, prevWeek: 58.4 },
    ],
  },
  {
    date: '2026-10-28',
    label: 'Oct 28, 2026',
    futuresPrice: '96.140',
    bins: [
      { range: '3.50-3.75', current: 7.2, prevDay: 18.9, prevWeek: 30.1 },
      { range: '3.75-4.00', current: 49.6, prevDay: 54.2, prevWeek: 53.8 },
      { range: '4.00-4.25', current: 43.2, prevDay: 26.9, prevWeek: 16.1 },
    ],
  },
  {
    date: '2026-12-09',
    label: 'Dec 09, 2026',
    futuresPrice: '95.910',
    bins: [
      { range: '3.50-3.75', current: 2.6, prevDay: 6.5, prevWeek: 14.4 },
      { range: '3.75-4.00', current: 22.7, prevDay: 31.1, prevWeek: 41.4 },
      { range: '4.00-4.25', current: 47.3, prevDay: 44.8, prevWeek: 35.8 },
      { range: '4.25-4.50', current: 27.4, prevDay: 17.6, prevWeek: 8.4 },
    ],
  },
  {
    date: '2027-01-27',
    label: 'Jan 27, 2027',
    futuresPrice: '95.855',
    bins: [
      { range: '3.50-3.75', current: 1.6, prevDay: 3.9, prevWeek: 11.0 },
      { range: '3.75-4.00', current: 14.6, prevDay: 21.1, prevWeek: 35.0 },
      { range: '4.00-4.25', current: 37.3, prevDay: 39.2, prevWeek: 37.1 },
      { range: '4.25-4.50', current: 35.5, prevDay: 28.6, prevWeek: 14.9 },
      { range: '4.50-4.75', current: 11.1, prevDay: 7.1, prevWeek: 2.0 },
    ],
  },
  {
    date: '2027-03-17',
    label: 'Mar 17, 2027',
    futuresPrice: '95.700',
    bins: [
      { range: '3.50-3.75', current: 0.7, prevDay: 1.8, prevWeek: 6.8 },
      { range: '3.75-4.00', current: 7.1, prevDay: 11.9, prevWeek: 25.8 },
      { range: '4.00-4.25', current: 24.3, prevDay: 29.6, prevWeek: 36.3 },
      { range: '4.25-4.50', current: 36.5, prevDay: 34.3, prevWeek: 23.5 },
      { range: '4.50-4.75', current: 25.0, prevDay: 18.6, prevWeek: 7.0 },
      { range: '4.75-5.00', current: 6.3, prevDay: 3.8, prevWeek: 0.8 },
    ],
  },
  {
    date: '2027-06-09',
    label: 'Jun 09, 2027',
    futuresPrice: '95.500',
    bins: [
      { range: '3.50-3.75', current: 0.3, prevDay: 0.9, prevWeek: 4.9 },
      { range: '3.75-4.00', current: 3.8, prevDay: 6.4, prevWeek: 19.1 },
      { range: '4.00-4.25', current: 15.1, prevDay: 19.3, prevWeek: 32.1 },
      { range: '4.25-4.50', current: 28.8, prevDay: 30.1, prevWeek: 27.4 },
      { range: '4.50-4.75', current: 29.8, prevDay: 26.4, prevWeek: 12.9 },
      { range: '4.75-5.00', current: 16.8, prevDay: 13.1, prevWeek: 3.4 },
      { range: '5.00-5.25', current: 4.9, prevDay: 3.4, prevWeek: 0.5 },
      { range: '5.25-5.50', current: 0.6, prevDay: 0.4, prevWeek: 0.0 },
    ],
  },
];

const RANGE_COLORS: Record<string, string> = {
  '3.50-3.75': '#4ADE80',
  '3.75-4.00': '#38BDF8',
  '4.00-4.25': '#FBBF24',
  '4.25-4.50': '#FB923C',
  '4.50-4.75': '#F87171',
  '4.75-5.00': '#E879F9',
  '5.00-5.25': '#A78BFA',
  '5.25-5.50': '#818CF8',
};

function MeetingSnapshot({ meeting, isNext }: { meeting: Meeting; isNext: boolean }) {
  const maxBin = meeting.bins.reduce((a, b) => (b.current > a.current ? b : a));

  return (
    <div className={`rounded-xl border ${isNext ? 'border-sky-500/60 bg-sky-950/30' : 'border-gray-700/60 bg-gray-900/40'} p-4`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isNext && (
            <span className="text-[10px] font-bold bg-sky-500 text-black px-1.5 py-0.5 rounded">NEXT</span>
          )}
          <span className="text-base font-bold text-white">{meeting.label}</span>
        </div>
        <span className="text-xs text-gray-500 font-mono">Futures: {meeting.futuresPrice}</span>
      </div>

      {/* Stacked bar */}
      <div className="rounded-lg overflow-hidden h-10 flex mb-2 bg-gray-800">
        {meeting.bins.map((bin) => (
          <div
            key={bin.range}
            className="h-full flex items-center justify-center relative overflow-hidden transition-all"
            style={{
              width: `${Math.max(bin.current, 1.5)}%`,
              backgroundColor: RANGE_COLORS[bin.range] || '#6B7280',
              opacity: bin.current < 2 ? 0.5 : 1,
            }}
          >
            {bin.current >= 8 && (
              <span className="text-[11px] font-bold text-black/80 whitespace-nowrap">
                {bin.current}%
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Bin labels below bar */}
      <div className="flex mb-3 gap-0.5">
        {meeting.bins.map((bin) => (
          <div
            key={bin.range}
            className="text-center"
            style={{ width: `${Math.max(bin.current, 1.5)}%`, minWidth: 0 }}
          >
            {bin.current >= 5 && (
              <span className="text-[9px] text-gray-400 font-mono leading-none">{bin.range}</span>
            )}
          </div>
        ))}
      </div>

      {/* Most likely outcome */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-3 h-3 rounded-sm"
          style={{ backgroundColor: RANGE_COLORS[maxBin.range] || '#6B7280' }}
        />
        <span className="text-sm text-gray-300">
          ช่วงที่มีโอกาสสูงสุด: <span className="font-bold text-white">{maxBin.range}%</span>
          <span className="text-gray-500 ml-1">({maxBin.current}%)</span>
        </span>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-700/50">
              <th className="text-left font-normal py-1 pr-2">อัตราเป้าหมาย</th>
              <th className="text-right font-normal py-1 px-1">ปัจจุบัน</th>
              <th className="text-right font-normal py-1 px-1">เมื่อวาน</th>
              <th className="text-right font-normal py-1 pl-1">สัปดาห์ก่อน</th>
            </tr>
          </thead>
          <tbody>
            {meeting.bins.map((bin) => {
              const dayDiff = bin.current - bin.prevDay;
              const weekDiff = bin.current - bin.prevWeek;
              return (
                <tr key={bin.range} className="border-b border-gray-800/40">
                  <td className="py-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-sm shrink-0"
                        style={{ backgroundColor: RANGE_COLORS[bin.range] || '#6B7280' }}
                      />
                      <span className="font-mono text-gray-300">{bin.range}</span>
                    </div>
                  </td>
                  <td className="py-1 px-1 text-right font-bold text-white">{bin.current}%</td>
                  <td className="py-1 px-1 text-right">
                    <span className="text-gray-500">{bin.prevDay}%</span>
                    <span className={`ml-1 text-[10px] ${dayDiff > 0 ? 'text-green-400' : dayDiff < 0 ? 'text-red-400' : 'text-gray-600'}`}>
                      {dayDiff > 0 ? '+' : ''}{dayDiff.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-1 pl-1 text-right">
                    <span className="text-gray-500">{bin.prevWeek}%</span>
                    <span className={`ml-1 text-[10px] ${weekDiff > 0 ? 'text-green-400' : weekDiff < 0 ? 'text-red-400' : 'text-gray-600'}`}>
                      {weekDiff > 0 ? '+' : ''}{weekDiff.toFixed(1)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function FedWatchLive() {
  return (
    <div className="card p-6 mb-8">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <h2 className="text-2xl font-bold text-highlight">
          Fed Rate Monitor — ความน่าจะเป็นอัตราดอกเบี้ย 6 รอบประชุมถัดไป
        </h2>
      </div>

      <p className="text-sm text-gray-400 mb-1">
        อ้างอิงจากราคาสัญญาฟิวเจอร์ส Fed Fund 30 วัน สะท้อนความคาดหวังของตลาดต่อการเปลี่ยนแปลงอัตราดอกเบี้ย ·
        อัตราปัจจุบัน (ก่อนประชุม Sep 16): <span className="font-bold text-green-400">3.50–3.75%</span>
      </p>
      <p className="text-xs text-teal-300 font-semibold mb-1">
        ✅ ข้อมูลจริงจาก Investing.com Fed Rate Monitor Tool — ดึงเมื่อ {SCRAPE_LABEL} (ภาพนิ่ง ณ ขณะดึง)
      </p>
      <div className="flex gap-3 text-xs mb-4">
        <a
          href="https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-300 hover:text-sky-200 underline"
        >
          CME FedWatch (ต้นทาง) ↗
        </a>
        <a
          href="https://www.investing.com/central-banks/fed-rate-monitor"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-300 hover:text-sky-200 underline"
        >
          Investing.com (ข้อมูลสด) ↗
        </a>
      </div>

      {/* Color legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-4 text-[10px]">
        {Object.entries(RANGE_COLORS).map(([range, color]) => (
          <div key={range} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-gray-400 font-mono">{range}%</span>
          </div>
        ))}
      </div>

      {/* Meeting grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-3">
        {MEETINGS.map((m, i) => (
          <MeetingSnapshot key={m.date} meeting={m} isNext={i === 0} />
        ))}
      </div>

      <p className="text-[10px] text-gray-500 text-right">
        อัปเดตข้อมูล: {SCRAPE_DATE} · แหล่งข้อมูล: CME Group → Investing.com Fed Rate Monitor Tool
      </p>
    </div>
  );
}
