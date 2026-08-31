// Full replica of Investing.com's "Fed Rate Monitor Tool" — 3 upcoming meetings, real data
// scraped from th.investing.com/central-banks/fed-rate-monitor.
interface RateBin {
  range: string;
  current: number;
  dayBefore: number;
  weekBefore: number;
}

interface Meeting {
  title: string;
  meetingTime: string;
  futuresPrice: string;
  updated: string;
  bins: RateBin[];
}

const MEETINGS: Meeting[] = [
  {
    title: 'Sep 17, 2026',
    meetingTime: 'Sep 17, 2026 01:00 น.',
    futuresPrice: '96.305',
    updated: 'Aug 29, 2026 11:35 ICT',
    bins: [
      { range: '3.50 - 3.75', current: 44.1, dayBefore: 65.9, weekBefore: 61.0 },
      { range: '3.75 - 4.00', current: 55.9, dayBefore: 34.1, weekBefore: 39.0 },
    ],
  },
  {
    title: 'Oct 29, 2026',
    meetingTime: 'Oct 29, 2026 01:00 น.',
    futuresPrice: '96.220',
    updated: 'Aug 29, 2026 11:35 ICT',
    bins: [
      { range: '3.50 - 3.75', current: 30.0, dayBefore: 46.2, weekBefore: 47.0 },
      { range: '3.75 - 4.00', current: 52.1, dayBefore: 43.6, weekBefore: 44.1 },
      { range: '4.00 - 4.25', current: 18.0, dayBefore: 10.2, weekBefore: 9.0 },
    ],
  },
  {
    title: 'Dec 10, 2026',
    meetingTime: 'Dec 10, 2026 02:00 น.',
    futuresPrice: '96.035',
    updated: 'Aug 29, 2026 11:35 ICT',
    bins: [
      { range: '3.50 - 3.75', current: 11.6, dayBefore: 25.4, weekBefore: 28.9 },
      { range: '3.75 - 4.00', current: 38.5, dayBefore: 44.8, weekBefore: 45.2 },
      { range: '4.00 - 4.25', current: 38.9, dayBefore: 25.2, weekBefore: 22.5 },
      { range: '4.25 - 4.50', current: 11.0, dayBefore: 4.6, weekBefore: 3.5 },
    ],
  },
];

const BAR_COLORS = ['#38BDF8', '#8891a8', '#8891a8', '#8891a8'];

function MeetingCard({ meeting }: { meeting: Meeting }) {
  return (
    <div className="card-fed p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-base font-bold text-amber-300">{meeting.title}</div>
        <span className="text-gray-500 text-sm">▲</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-400 mb-3">
        <div>เวลาประชุม: <span className="text-gray-200 font-medium">{meeting.meetingTime}</span></div>
        <div>ราคาสัญญาฟิวเจอร์ส: <span className="text-gray-200 font-medium">{meeting.futuresPrice}</span></div>
      </div>

      <div className="space-y-2 mb-3">
        {meeting.bins.map((b, i) => (
          <div key={b.range} className="flex items-center gap-2">
            <div className="w-20 text-xs text-gray-400 font-mono shrink-0">{b.range}</div>
            <div className="flex-1 bg-gray-800 rounded h-5 overflow-hidden">
              <div
                className="h-full rounded"
                style={{ width: `${Math.max(b.current, 2)}%`, background: BAR_COLORS[i] || '#8891a8' }}
              />
            </div>
            <div className="w-12 text-right text-xs font-bold text-gray-100 shrink-0">{b.current}%</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-700">
              <th className="text-left font-normal py-1">อัตราเป้าหมาย</th>
              <th className="text-right font-normal py-1">ปัจจุบัน</th>
              <th className="text-right font-normal py-1">วันก่อนหน้านี้</th>
              <th className="text-right font-normal py-1">สัปดาห์ก่อนหน้านี้</th>
            </tr>
          </thead>
          <tbody>
            {meeting.bins.map((b) => (
              <tr key={b.range} className="text-gray-300">
                <td className="py-1 font-mono">{b.range}</td>
                <td className="py-1 text-right font-semibold text-sky-300">{b.current}%</td>
                <td className="py-1 text-right text-gray-500">{b.dayBefore}%</td>
                <td className="py-1 text-right text-gray-500">{b.weekBefore}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-[10px] text-gray-500 text-right mt-1">อัปเดตข้อมูล: {meeting.updated}</div>
    </div>
  );
}

export default function FedRateMonitorFull() {
  return (
    <div className="card p-6 mb-8">
      <h2 className="text-2xl font-bold mb-2 text-fed">
        เครื่องมือติดตามอัตราดอกเบี้ยเฟด (Fed Rate Monitor)
      </h2>
      <p className="text-sm text-gray-400 mb-6">
        ยึดตามราคาสัญญาฟิวเจอร์สกองทุนของธนาคารกลางสหรัฐระยะ 30 วัน สะท้อนความคาดหวังของตลาดต่อการเปลี่ยนแปลงอัตราดอกเบี้ยตามนโยบายการเงินของ Fed ใน 3 รอบประชุมถัดไป
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {MEETINGS.map((m) => (
          <MeetingCard key={m.title} meeting={m} />
        ))}
      </div>
      <div className="text-xs text-teal-300 font-semibold">
        ✅ ข้อมูลจริงจาก Investing.com Fed Rate Monitor Tool (th.investing.com/central-banks/fed-rate-monitor)
      </div>
    </div>
  );
}
