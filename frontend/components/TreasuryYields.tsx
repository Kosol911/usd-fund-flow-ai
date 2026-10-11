import { useState, useEffect } from 'react';

/* ── Types ── */
interface YieldPoint {
  value: number;
  change1d: number;
  change1w: number;
  change1m: number;
}

interface ImpactRow {
  asset: string;
  bullish: string;
  bearish: string;
  netView: string;
  confidence: string;
}

interface Scenario {
  title: string;
  description: string;
  trigger: string;
  invalidation: string;
}

interface WatchItem {
  event: string;
  date: string;
  why: string;
}

interface KeyDataRow {
  variable: string;
  value: string;
  change: string;
  meaning: string;
}

interface TreasuryData {
  dateLabel: string;
  updatedTime: string;
  yieldSnapshot: {
    y5?: YieldPoint;
    y10?: YieldPoint;
    y30?: YieldPoint;
  };
  spread10y5y: { latest: number; change1d: number; change1w: number } | null;
  contextSnapshot: {
    dxy: { value: number; change1dPct: number } | null;
    gold: { value: number; change1dPct: number } | null;
    btc: { value: number; change1dPct: number } | null;
    spx: { value: number; change1dPct: number } | null;
    ndx: { value: number; change1dPct: number } | null;
  };
  summary: string[];
  keyDataTable: KeyDataRow[];
  mechanism: string;
  impactTable: ImpactRow[];
  shortTerm: string;
  mediumTerm: string;
  scenarios: {
    base: Scenario;
    riskOn: Scenario;
    riskOff: Scenario;
  };
  watchNext: WatchItem[];
  yieldUsdQuadrant: string;
  curveSignal: string;
  limitations: string;
  _cached?: boolean;
  _stale?: boolean;
}

/* ── Helpers ── */
const CACHE_KEY = 'usd-treasury-yields';
const CACHE_TTL = 24 * 3600 * 1000;

function bps(val: number): string {
  const b = val * 100;
  return `${b >= 0 ? '+' : ''}${b.toFixed(1)} bps`;
}

function pctBadge(val: number): string {
  return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
}

const QUADRANT_LABEL: Record<string, { label: string; color: string; icon: string }> = {
  tighten: { label: 'ตึงตัว (Yield↑ USD↑)', color: '#f87171', icon: '🔴' },
  ease: { label: 'ผ่อนคลาย (Yield↓ USD↓)', color: '#4ade80', icon: '🟢' },
  flight_to_safety: { label: 'หาความปลอดภัย (Yield↓ USD↑)', color: '#fbbf24', icon: '🟡' },
  mixed: { label: 'สัญญาณผสม (Yield↑ USD↓)', color: '#a78bfa', icon: '🟣' },
};

const CURVE_LABEL: Record<string, string> = {
  steepening: '📈 Steepening — ด้านยาวขึ้นเร็วกว่าด้านสั้น',
  flattening: '📉 Flattening — ด้านยาวลงหรือด้านสั้นขึ้นเร็วกว่า',
  stable: '➡️ Stable — ไม่เปลี่ยนแปลงมีนัย',
};

const CONFIDENCE_COLOR: Record<string, string> = {
  สูง: '#4ade80',
  ปานกลาง: '#fbbf24',
  ต่ำ: '#f87171',
};

const SCENARIO_STYLE: Record<string, { bg: string; border: string; label: string }> = {
  base: { bg: 'rgba(148,163,184,0.08)', border: '#64748b', label: '⚖️ Base Case' },
  riskOn: { bg: 'rgba(74,222,128,0.08)', border: '#4ade80', label: '🟢 Risk-On' },
  riskOff: { bg: 'rgba(248,113,113,0.08)', border: '#f87171', label: '🔴 Risk-Off' },
};

export default function TreasuryYields() {
  const [data, setData] = useState<TreasuryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Try localStorage cache first
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached && cached.ts && Date.now() - cached.ts < CACHE_TTL) {
          setData(cached.data);
          setLoading(false);
          return;
        }
      }
    } catch {}

    fetch('/api/treasury-yields')
      .then(async (res) => {
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const json = await res.json();
        setData(json);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data: json, ts: Date.now() }));
        } catch {}
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4 text-highlight">🏛️ US Treasury Yields — วิเคราะห์ผลกระทบ</h2>
        <div className="text-blue-300/60 animate-pulse">กำลังโหลดข้อมูล Yield...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4 text-highlight">🏛️ US Treasury Yields — วิเคราะห์ผลกระทบ</h2>
        <div className="text-red-400">ไม่สามารถโหลดข้อมูลได้: {error || 'ข้อมูลว่าง'}</div>
      </div>
    );
  }

  const q = QUADRANT_LABEL[data.yieldUsdQuadrant] || QUADRANT_LABEL.mixed;
  const curveText = CURVE_LABEL[data.curveSignal] || CURVE_LABEL.stable;

  return (
    <div className="card p-6 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl font-bold text-highlight">🏛️ US Treasury Yields — วิเคราะห์ผลกระทบ</h2>
        {data._stale && <span className="text-xs text-yellow-400/80 ml-2">⚠ ข้อมูลเก่า</span>}
      </div>
      <div className="text-xs text-blue-400/60 mb-4">
        อัปเดต {data.dateLabel} · {data.updatedTime}
        {data._cached && <span className="ml-2">(cached)</span>}
      </div>

      {/* ── Yield Snapshot Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {(['y5', 'y10', 'y30'] as const).map((k) => {
          const labels: Record<string, string> = { y5: '5Y', y10: '10Y', y30: '30Y' };
          const y = data.yieldSnapshot[k];
          if (!y) return null;
          return (
            <div key={k} className="rounded-lg p-3" style={{ background: 'rgba(30,58,138,0.25)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div className="text-xs text-blue-300/60 mb-1">{labels[k]} Yield</div>
              <div className="text-xl font-bold text-blue-100">{y.value.toFixed(3)}%</div>
              <div className="text-xs mt-1" style={{ color: y.change1d >= 0 ? '#4ade80' : '#f87171' }}>
                1d: {bps(y.change1d)}
              </div>
              <div className="text-xs" style={{ color: y.change1w >= 0 ? '#4ade80' : '#f87171' }}>
                1w: {bps(y.change1w)}
              </div>
            </div>
          );
        })}
        {/* Spread card */}
        {data.spread10y5y && (
          <div className="rounded-lg p-3" style={{ background: 'rgba(30,58,138,0.25)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <div className="text-xs text-blue-300/60 mb-1">10Y−5Y Spread</div>
            <div className="text-xl font-bold text-blue-100">{(data.spread10y5y.latest * 100).toFixed(1)} bps</div>
            <div className="text-xs mt-1" style={{ color: data.spread10y5y.change1d >= 0 ? '#4ade80' : '#f87171' }}>
              1d: {bps(data.spread10y5y.change1d)}
            </div>
            <div className="text-xs" style={{ color: data.spread10y5y.change1w >= 0 ? '#4ade80' : '#f87171' }}>
              1w: {bps(data.spread10y5y.change1w)}
            </div>
          </div>
        )}
      </div>

      {/* ── Context Assets mini-row ── */}
      <div className="flex flex-wrap gap-3 mb-5 text-xs">
        {[
          { label: 'DXY', d: data.contextSnapshot.dxy },
          { label: 'Gold', d: data.contextSnapshot.gold },
          { label: 'BTC', d: data.contextSnapshot.btc },
          { label: 'S&P 500', d: data.contextSnapshot.spx },
          { label: 'Nasdaq', d: data.contextSnapshot.ndx },
        ].map(({ label, d }) =>
          d ? (
            <span key={label} className="px-2 py-1 rounded" style={{ background: 'rgba(30,58,138,0.2)' }}>
              {label}: <span className="text-blue-100 font-medium">{d.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>{' '}
              <span style={{ color: d.change1dPct >= 0 ? '#4ade80' : '#f87171' }}>{pctBadge(d.change1dPct)}</span>
            </span>
          ) : null
        )}
      </div>

      {/* ── Quadrant + Curve Badges ── */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="px-3 py-2 rounded-lg text-sm font-medium" style={{ background: `${q.color}15`, border: `1px solid ${q.color}40`, color: q.color }}>
          {q.icon} ภาวะการเงิน: {q.label}
        </div>
        <div className="px-3 py-2 rounded-lg text-sm text-blue-200" style={{ background: 'rgba(30,58,138,0.2)', border: '1px solid rgba(59,130,246,0.15)' }}>
          Yield Curve: {curveText}
        </div>
      </div>

      {/* ── 1. Summary ── */}
      {data.summary && data.summary.length > 0 && (
        <div className="mb-5 p-4 rounded-lg" style={{ background: 'rgba(30,58,138,0.15)', borderLeft: '3px solid #3b82f6' }}>
          <div className="text-xs text-blue-400/60 font-semibold mb-2">สรุปภาพรวม</div>
          {data.summary.map((line, i) => (
            <p key={i} className="text-sm text-blue-100 mb-1">• {line}</p>
          ))}
        </div>
      )}

      {/* ── 2. Key Data Table ── */}
      {data.keyDataTable && data.keyDataTable.length > 0 && (
        <div className="mb-5 overflow-x-auto">
          <div className="text-xs text-blue-400/60 font-semibold mb-2">ตารางข้อมูลสำคัญ</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-blue-300/60 border-b border-blue-800/40">
                <th className="text-left py-1 pr-2">ตัวแปร</th>
                <th className="text-right py-1 px-2">ค่าล่าสุด</th>
                <th className="text-right py-1 px-2">เปลี่ยนแปลง</th>
                <th className="text-left py-1 pl-2">ความหมาย</th>
              </tr>
            </thead>
            <tbody>
              {data.keyDataTable.map((row, i) => (
                <tr key={i} className="border-b border-blue-900/20">
                  <td className="py-1.5 pr-2 text-blue-200 font-medium">{row.variable}</td>
                  <td className="py-1.5 px-2 text-right text-blue-100 font-mono">{row.value}</td>
                  <td className="py-1.5 px-2 text-right font-mono" style={{
                    color: row.change?.startsWith('+') ? '#4ade80' : row.change?.startsWith('-') ? '#f87171' : '#94a3b8'
                  }}>{row.change}</td>
                  <td className="py-1.5 pl-2 text-blue-300/80">{row.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 3. Mechanism Chain ── */}
      {data.mechanism && (
        <div className="mb-5 p-4 rounded-lg" style={{ background: 'rgba(30,58,138,0.1)' }}>
          <div className="text-xs text-blue-400/60 font-semibold mb-2">กลไกเชิงเหตุผล</div>
          <p className="text-sm text-blue-200 leading-relaxed">{data.mechanism}</p>
        </div>
      )}

      {/* ── 4. Impact Table ── */}
      {data.impactTable && data.impactTable.length > 0 && (
        <div className="mb-5 overflow-x-auto">
          <div className="text-xs text-blue-400/60 font-semibold mb-2">ผลกระทบรายสินทรัพย์</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-blue-300/60 border-b border-blue-800/40">
                <th className="text-left py-1 pr-2">สินทรัพย์</th>
                <th className="text-left py-1 px-2">ปัจจัยหนุน</th>
                <th className="text-left py-1 px-2">ปัจจัยกดดัน</th>
                <th className="text-left py-1 px-2">มุมมอง</th>
                <th className="text-center py-1 pl-2">ความเชื่อมั่น</th>
              </tr>
            </thead>
            <tbody>
              {data.impactTable.map((row, i) => (
                <tr key={i} className="border-b border-blue-900/20">
                  <td className="py-2 pr-2 text-blue-100 font-semibold">{row.asset}</td>
                  <td className="py-2 px-2 text-green-400/90">{row.bullish}</td>
                  <td className="py-2 px-2 text-red-400/90">{row.bearish}</td>
                  <td className="py-2 px-2 text-blue-200">{row.netView}</td>
                  <td className="py-2 pl-2 text-center">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{
                      color: CONFIDENCE_COLOR[row.confidence] || '#94a3b8',
                      background: `${CONFIDENCE_COLOR[row.confidence] || '#94a3b8'}20`
                    }}>{row.confidence}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 5. Timeframe Analysis ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {data.shortTerm && (
          <div className="p-3 rounded-lg" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
            <div className="text-xs text-blue-400 font-semibold mb-1">⏱ ระยะสั้น 1–5 วัน</div>
            <p className="text-sm text-blue-200 leading-relaxed">{data.shortTerm}</p>
          </div>
        )}
        {data.mediumTerm && (
          <div className="p-3 rounded-lg" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
            <div className="text-xs text-purple-400 font-semibold mb-1">📅 ระยะกลาง 1–3 เดือน</div>
            <p className="text-sm text-blue-200 leading-relaxed">{data.mediumTerm}</p>
          </div>
        )}
      </div>

      {/* ── 6. 3 Scenarios ── */}
      {data.scenarios && (
        <div className="mb-5">
          <div className="text-xs text-blue-400/60 font-semibold mb-2">3 ฉากทัศน์</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['base', 'riskOn', 'riskOff'] as const).map((key) => {
              const s = data.scenarios[key];
              const style = SCENARIO_STYLE[key];
              if (!s) return null;
              return (
                <div key={key} className="rounded-lg p-3" style={{ background: style.bg, border: `1px solid ${style.border}30` }}>
                  <div className="text-sm font-bold mb-1" style={{ color: style.border }}>{style.label}</div>
                  <div className="text-xs text-blue-100 font-medium mb-1">{s.title}</div>
                  <p className="text-xs text-blue-200/80 mb-2">{s.description}</p>
                  <div className="text-[10px] text-blue-300/60 mb-0.5">
                    <span className="font-semibold">เงื่อนไข:</span> {s.trigger}
                  </div>
                  <div className="text-[10px] text-red-300/50">
                    <span className="font-semibold">ใช้ไม่ได้ถ้า:</span> {s.invalidation}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 7. Watch Next ── */}
      {data.watchNext && data.watchNext.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-blue-400/60 font-semibold mb-2">📌 ข้อมูล/เหตุการณ์ที่ควรติดตาม</div>
          <div className="space-y-1.5">
            {data.watchNext.map((w, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="text-blue-400/60 whitespace-nowrap">{w.date}</span>
                <span className="text-blue-100 font-medium">{w.event}</span>
                <span className="text-blue-300/60">— {w.why}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Limitations ── */}
      {data.limitations && (
        <div className="text-[10px] text-blue-400/40 mt-3 pt-3 border-t border-blue-900/20">
          ⚠ ข้อจำกัด: {data.limitations}
        </div>
      )}

      <div className="text-[10px] text-blue-400/30 mt-1">
        การวิเคราะห์นี้เป็นเพื่อการศึกษา ไม่ใช่คำแนะนำลงทุนเฉพาะบุคคล · Model: deepseek-v4.1-flash
      </div>
    </div>
  );
}
