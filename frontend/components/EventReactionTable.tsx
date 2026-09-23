import { useState } from 'react';

type Asset = 'BTC' | 'GOLD' | 'DXY';

interface ReactionWindow {
  label: string;
  key: string;
}

const WINDOWS: ReactionWindow[] = [
  { label: '-60m', key: 'pre60' },
  { label: '+15m', key: 'post15' },
  { label: '+1h',  key: 'post1h' },
  { label: '+4h',  key: 'post4h' },
  { label: '+1d',  key: 'post1d' },
  { label: '+5d',  key: 'post5d' },
];

interface EventRow {
  date: string;
  name: string;
  surprise: string;
  zScore: number | null;
  reactions: Record<string, Record<Asset, number | null>>;
}

const PAST_EVENTS: EventRow[] = [
  {
    date: '4 ก.ย. 2569',
    name: 'NFP ส.ค.',
    surprise: '+106K (คาด 56K ออก 162K)',
    zScore: 2.5,
    reactions: {},
  },
  {
    date: '10 ก.ย. 2569',
    name: 'CPI ส.ค. (YoY)',
    surprise: '0.0 (ตรงคาด 3.4%)',
    zScore: 0.0,
    reactions: {},
  },
  {
    date: '17 ก.ย. 2569',
    name: 'FOMC ก.ย. — Hike +25bps',
    surprise: 'ตามคาด (hike 68%)',
    zScore: null,
    reactions: {},
  },
  {
    date: '28 ส.ค. 2569',
    name: 'PCE ก.ค. (YoY)',
    surprise: '+0.1pp (คาด 3.7% ออก 3.8%)',
    zScore: 0.8,
    reactions: {},
  },
  {
    date: '12 ส.ค. 2569',
    name: 'CPI ก.ค. (YoY)',
    surprise: '+0.2pp (คาด 3.9% ออก 4.1%)',
    zScore: 1.4,
    reactions: {},
  },
  {
    date: '7 ส.ค. 2569',
    name: 'NFP ก.ค.',
    surprise: '+20K (คาด 165K ออก 185K)',
    zScore: 0.5,
    reactions: {},
  },
  {
    date: '10 ก.ค. 2569',
    name: 'CPI มิ.ย. (YoY)',
    surprise: '+0.2pp (คาด 3.7% ออก 3.9%)',
    zScore: 1.4,
    reactions: {},
  },
  {
    date: '3 ก.ค. 2569',
    name: 'NFP มิ.ย.',
    surprise: '+18K (คาด 160K ออก 178K)',
    zScore: 0.4,
    reactions: {},
  },
];

function fZ(z: number | null): string {
  if (z === null) return '—';
  return `${z > 0 ? '+' : ''}${z.toFixed(1)}σ`;
}

function zColor(z: number | null): string {
  if (z === null) return '#6B7280';
  const abs = Math.abs(z);
  if (abs >= 2) return z > 0 ? '#4ADE80' : '#F87171';
  if (abs >= 1) return z > 0 ? '#86EFAC' : '#FB923C';
  return '#9CA3AF';
}

export default function EventReactionTable() {
  const [asset, setAsset] = useState<Asset>('BTC');

  return (
    <div className="card p-6 mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h2 className="text-2xl font-bold text-highlight">
          Event Reaction — ราคาขยับอย่างไรหลังประกาศ
        </h2>
        <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-0.5">
          {(['BTC', 'GOLD', 'DXY'] as Asset[]).map((a) => (
            <button
              key={a}
              onClick={() => setAsset(a)}
              className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
                asset === a
                  ? 'bg-sky-700/60 text-sky-100'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        ดูว่า {asset} เคลื่อนไหวอย่างไรรอบ ๆ อีเวนต์สำคัญ · หน้าต่างเวลา: ก่อน 60 นาที → หลัง 5 วัน
      </p>

      <div className="rounded-lg bg-amber-900/15 border border-amber-700/25 p-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-amber-400">
          <span>🔧</span>
          <span className="font-semibold">Infrastructure Ready — รอเชื่อมต่อ OHLCV API</span>
        </div>
        <p className="text-xs text-amber-500/70 mt-1 pl-6">
          โครงสร้างพร้อมแล้ว · ต้อง OHLCV data (BTC: CoinGecko/Binance, Gold: stooq, DXY: FRED)
          เพื่อคำนวณ % เปลี่ยนแปลงในแต่ละ window · ขณะนี้แสดง framework เปล่า
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-700/60 text-xs uppercase tracking-wide">
              <th className="pb-2 pr-3 pl-3 font-medium">วันที่</th>
              <th className="pb-2 pr-3 font-medium">อีเวนต์</th>
              <th className="pb-2 pr-3 font-medium">Surprise</th>
              <th className="pb-2 pr-2 text-center font-medium">z</th>
              {WINDOWS.map((w) => (
                <th key={w.key} className="pb-2 px-2 text-center font-medium whitespace-nowrap">
                  {w.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PAST_EVENTS.map((ev, i) => (
              <tr
                key={i}
                className="border-b border-gray-800/40 hover:bg-white/3 transition-colors"
              >
                <td className="py-2 pr-3 pl-3 whitespace-nowrap text-gray-400 text-xs font-mono">
                  {ev.date}
                </td>
                <td className="py-2 pr-3 text-gray-300 font-medium text-sm">
                  {ev.name}
                </td>
                <td className="py-2 pr-3 text-xs text-gray-400 max-w-[200px]">
                  {ev.surprise}
                </td>
                <td className="py-2 px-2 text-center">
                  <span
                    className="font-mono text-xs font-bold"
                    style={{ color: zColor(ev.zScore) }}
                  >
                    {fZ(ev.zScore)}
                  </span>
                </td>
                {WINDOWS.map((w) => (
                  <td key={w.key} className="py-2 px-2 text-center">
                    <span className="text-gray-700 font-mono text-xs">—</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 px-4 py-3 rounded-lg bg-gray-800/30 border border-gray-700/30 text-xs text-gray-400">
        <span className="text-white font-semibold">วิธีอ่าน:</span>{' '}
        แต่ละ column แสดง % เปลี่ยนแปลงของ {asset} ในหน้าต่างเวลานั้นรอบอีเวนต์ ·{' '}
        <span className="text-green-400">+%</span> = ราคาขึ้น ·{' '}
        <span className="text-red-400">−%</span> = ราคาลง ·{' '}
        เปรียบเทียบกับ z-score เพื่อดูว่า surprise ขนาดใดกระทบราคาแค่ไหน
      </div>

      <p className="text-[10px] text-gray-600 mt-2">
        ⚠️ ข้อมูลย้อนหลังไม่รวม slippage / ค่าธรรมเนียม · สำหรับวิจัยเท่านั้น ไม่ใช่คำแนะนำลงทุน
      </p>
    </div>
  );
}
