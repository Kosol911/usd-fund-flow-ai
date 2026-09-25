import { useEffect, useState } from 'react';

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
  id: string;
  date: string;
  name: string;
  surprise: string;
  zScore: number | null;
}

const PAST_EVENTS: EventRow[] = [
  { id: 'nfp_aug',  date: '4 ก.ย. 2569', name: 'NFP ส.ค.',              surprise: '+106K (คาด 56K ออก 162K)',        zScore: 2.5 },
  { id: 'cpi_aug',  date: '10 ก.ย. 2569', name: 'CPI ส.ค. (YoY)',       surprise: '0.0 (ตรงคาด 3.4%)',              zScore: 0.0 },
  { id: 'fomc_sep', date: '17 ก.ย. 2569', name: 'FOMC ก.ย. — Hike +25bps', surprise: 'ตามคาด (hike 68%)',           zScore: null },
  { id: 'pce_jul',  date: '28 ส.ค. 2569', name: 'PCE ก.ค. (YoY)',       surprise: '+0.1pp (คาด 3.7% ออก 3.8%)',    zScore: 0.8 },
  { id: 'cpi_jul',  date: '12 ส.ค. 2569', name: 'CPI ก.ค. (YoY)',       surprise: '+0.2pp (คาด 3.9% ออก 4.1%)',    zScore: 1.4 },
  { id: 'nfp_jul',  date: '7 ส.ค. 2569',  name: 'NFP ก.ค.',              surprise: '+20K (คาด 165K ออก 185K)',       zScore: 0.5 },
  { id: 'cpi_jun',  date: '10 ก.ค. 2569', name: 'CPI มิ.ย. (YoY)',      surprise: '+0.2pp (คาด 3.7% ออก 3.9%)',    zScore: 1.4 },
  { id: 'nfp_jun',  date: '3 ก.ค. 2569',  name: 'NFP มิ.ย.',             surprise: '+18K (คาด 160K ออก 178K)',       zScore: 0.4 },
];

type Reactions = Record<string, Record<string, Record<Asset, number | null>>>;
type Sources = Record<Asset, string | null>;

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

function reactionColor(v: number | null): string {
  if (v === null) return '#374151';
  if (Math.abs(v) < 0.05) return '#6B7280';
  return v > 0 ? '#4ADE80' : '#F87171';
}

function fReaction(v: number | null): string {
  if (v === null) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}%`;
}

export default function EventReactionTable() {
  const [asset, setAsset] = useState<Asset>('BTC');
  const [reactions, setReactions] = useState<Reactions | null>(null);
  const [sources, setSources] = useState<Sources | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/event-reactions');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setReactions(json.reactions);
          setSources(json.sources);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'โหลดไม่สำเร็จ');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const hasData = reactions && Object.keys(reactions).length > 0;
  const assetSource = sources?.[asset];

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

      {/* Status banner */}
      {loading && (
        <div className="rounded-lg bg-sky-900/15 border border-sky-700/25 p-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-sky-400">
            <span className="animate-pulse">⏳</span>
            <span className="font-semibold">กำลังดึงข้อมูล OHLCV…</span>
          </div>
          <p className="text-xs text-sky-500/70 mt-1 pl-6">
            BTC: Binance · Gold: stooq · DXY: stooq
          </p>
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-amber-900/15 border border-amber-700/25 p-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-amber-400">
            <span>⚠️</span>
            <span className="font-semibold">ดึงข้อมูลไม่สำเร็จ — {error}</span>
          </div>
          <p className="text-xs text-amber-500/70 mt-1 pl-6">
            แสดง framework เปล่า · รีเฟรชหน้าเพื่อลองใหม่
          </p>
        </div>
      )}
      {hasData && !loading && (
        <div className="rounded-lg bg-green-900/15 border border-green-700/25 p-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-green-400">
            <span>✅</span>
            <span className="font-semibold">Live Data</span>
            <span className="text-xs text-gray-500 font-normal">
              BTC: {sources?.BTC ?? '—'} · Gold: {sources?.GOLD ?? '—'} · DXY: {sources?.DXY ?? '—'}
            </span>
          </div>
          {(asset === 'GOLD' || asset === 'DXY') && (
            <p className="text-xs text-gray-500 mt-1 pl-6">
              {asset} ใช้ข้อมูลรายวัน → แสดงได้เฉพาะ +1d และ +5d
            </p>
          )}
        </div>
      )}

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
            {PAST_EVENTS.map((ev, i) => {
              const evReactions = reactions?.[ev.id];
              return (
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
                  {WINDOWS.map((w) => {
                    const val = evReactions?.[w.key]?.[asset] ?? null;
                    return (
                      <td key={w.key} className="py-2 px-2 text-center">
                        <span
                          className="font-mono text-xs font-bold"
                          style={{ color: reactionColor(val) }}
                        >
                          {fReaction(val)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
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
        ⚠️ ข้อมูลย้อนหลังไม่รวม slippage / ค่าธรรมเนียม · BTC ใช้ 1h candle (±15m ไม่แม่นยำ) · Gold/DXY ใช้ราคาปิดรายวัน · สำหรับวิจัยเท่านั้น ไม่ใช่คำแนะนำลงทุน
      </p>
    </div>
  );
}
