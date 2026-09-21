// CDC Action Zone signals — BTC & Gold Daily (EMA12/EMA26)
// Data fetched live from backend /api/cdc on every page load
// Cache: 30 minutes server-side (stale data still served while refreshing)

import { useEffect, useState } from 'react';

interface CdcAsset {
  asset: string;
  price: number | null;
  ema12: number | null;
  ema26: number | null;
  zone: number | null;
  label: string;
  color: string;
  last_zone_change_days_ago: number | null;
  history: {
    idx: number;
    close: number;
    ema12: number;
    ema26: number;
    zone: number;
    label: string;
    color: string;
  }[];
  fetched_utc: string;
  error: string | null;
}

interface CdcResponse {
  btc: CdcAsset;
  gold: CdcAsset;
  timeframe: string;
  ema_periods: number[];
}

const ZONE_BG: Record<number, string> = {
  1: 'bg-green-500/10 border-green-500/30',
  2: 'bg-emerald-500/10 border-emerald-500/30',
  3: 'bg-orange-500/10 border-orange-500/30',
  4: 'bg-red-500/10 border-red-500/30',
};

const ZONE_EMOJI: Record<number, string> = {
  1: '▲▲',
  2: '▲',
  3: '▼',
  4: '▼▼',
};

function fmt(v: number | null, dec = 2): string {
  if (v === null || v === undefined) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function PriceDot({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <div className="flex items-center justify-between text-xs py-1 border-b border-gray-800/50">
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }} />
        <span className="text-gray-400">{label}</span>
      </span>
      <span className="font-mono font-semibold text-gray-200">{fmt(value)}</span>
    </div>
  );
}

function AssetCard({ data, ticker }: { data: CdcAsset; ticker: string }) {
  const zone = data.zone ?? 0;
  const bgClass = ZONE_BG[zone] || 'bg-gray-800/20 border-gray-700/40';

  return (
    <div className={`rounded-xl border p-4 ${bgClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">{ticker}</span>
          <span className="text-xs text-gray-500 font-mono">D1 · EMA(12,26)</span>
        </div>
        {data.error && (
          <span className="text-[10px] text-red-400 bg-red-900/30 px-1.5 py-0.5 rounded">ดึงข้อมูลไม่ได้</span>
        )}
      </div>

      {/* Zone badge */}
      <div className="flex items-center gap-3 mb-3">
        <span
          className="text-2xl font-black font-mono"
          style={{ color: data.color }}
        >
          {ZONE_EMOJI[zone] || '?'}
        </span>
        <div>
          <div className="text-base font-bold text-white leading-tight">
            Zone {zone} — {data.label}
          </div>
          {data.last_zone_change_days_ago !== null && (
            <div className="text-[11px] text-gray-500">
              เปลี่ยน zone {data.last_zone_change_days_ago === 0 ? 'วันนี้' : `${data.last_zone_change_days_ago} วันที่แล้ว`}
            </div>
          )}
        </div>
        {/* Zone bar */}
        <div className="ml-auto flex gap-1">
          {[1, 2, 3, 4].map((z) => (
            <div
              key={z}
              className={`w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center transition-all ${
                z === zone ? 'opacity-100 scale-110' : 'opacity-20'
              }`}
              style={{
                backgroundColor: ZONE_BG[z]?.match(/#[0-9A-Fa-f]{6}/)?.[0] || '#6B7280',
                color: z === zone ? '#fff' : '#9CA3AF',
                border: z === zone ? `2px solid ${data.color}` : '1px solid #374151',
              }}
            >
              {z}
            </div>
          ))}
        </div>
      </div>

      {/* Price vs EMAs */}
      <div className="mb-3">
        <PriceDot label="ราคาปัจจุบัน" value={data.price} color={data.color} />
        <PriceDot label="EMA 12" value={data.ema12} color="#38BDF8" />
        <PriceDot label="EMA 26" value={data.ema26} color="#FBBF24" />
      </div>

      {/* Price vs EMA distance */}
      {data.price && data.ema12 && (
        <div className="text-[11px] text-gray-500 mb-2">
          ราคา{data.price > data.ema12 ? 'สูงกว่า' : 'ต่ำกว่า'} EMA12 อยู่{' '}
          <span className="font-mono font-semibold" style={{ color: data.color }}>
            {fmt(Math.abs(((data.price - data.ema12) / data.ema12) * 100), 2)}%
          </span>
        </div>
      )}

      {/* History mini strip */}
      {data.history.length > 0 && (
        <div>
          <div className="text-[10px] text-gray-600 mb-1">Zone ย้อนหลัง (10 วัน ล่าสุดขวา)</div>
          <div className="flex gap-0.5">
            {data.history.map((h, i) => (
              <div
                key={i}
                className="flex-1 h-3 rounded-sm"
                style={{ backgroundColor: h.color, opacity: 0.7 + i * 0.03 }}
                title={`Zone ${h.zone}: ${h.label} | Close: ${fmt(h.close)}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CdcSignals() {
  const [data, setData] = useState<CdcResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string>('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/cdc');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: CdcResponse = await res.json();
      setData(json);
      setFetchedAt(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' }));
    } catch (e: any) {
      setError(e.message || 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="card p-6 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <h2 className="text-2xl font-bold text-highlight">
          CDC Action Zone — BTC & Gold
        </h2>
        <div className="flex items-center gap-2">
          {fetchedAt && (
            <span className="text-xs text-gray-600 font-mono">อัปเดต {fetchedAt} ICT</span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="text-xs bg-sky-800/40 hover:bg-sky-700/50 disabled:opacity-40 text-sky-300 px-3 py-1 rounded-lg transition-colors border border-sky-700/40"
          >
            {loading ? 'กำลังโหลด…' : '↻ รีเฟรช'}
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-400 mb-1">
        EMA(12, 26) Daily · โซน 1–4 จากราคาและตำแหน่ง EMA — อัปเดตอัตโนมัติทุกครั้งที่โหลดหน้า
      </p>

      {/* Zone legend */}
      <div className="flex flex-wrap gap-3 text-xs mb-5">
        {[
          { z: 1, label: 'Zone 1 Strong Buy', desc: 'ราคา > EMA12 > EMA26', color: '#4ADE80' },
          { z: 2, label: 'Zone 2 Buy',        desc: 'EMA12 > ราคา > EMA26', color: '#86EFAC' },
          { z: 3, label: 'Zone 3 Sell',       desc: 'ราคา > EMA12, EMA12 < EMA26', color: '#FB923C' },
          { z: 4, label: 'Zone 4 Strong Sell',desc: 'EMA12 < EMA26 < ราคา', color: '#F87171' },
        ].map((row) => (
          <div key={row.z} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: row.color }} />
            <span style={{ color: row.color }} className="font-semibold">{row.label}</span>
            <span className="text-gray-600">— {row.desc}</span>
          </div>
        ))}
      </div>

      {loading && (
        <div className="text-gray-400 text-center py-8 text-sm">กำลังดึงข้อมูลราคาและคำนวณ EMA…</div>
      )}

      {error && (
        <div className="text-red-400 text-sm bg-red-900/20 border border-red-800/30 rounded-lg px-4 py-3 mb-4">
          ⚠️ {error} — ลอง↻ รีเฟรชอีกครั้ง
        </div>
      )}

      {data && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AssetCard data={data.btc} ticker="₿ BTC" />
          <AssetCard data={data.gold} ticker="🥇 Gold (XAU/USD)" />
        </div>
      )}

      <p className="text-[10px] text-gray-600 mt-3">
        BTC: CoinGecko · Gold: stooq.com (XAUUSD) · Cache server-side 30 นาที · ไม่ใช่คำแนะนำลงทุน
      </p>
    </div>
  );
}
