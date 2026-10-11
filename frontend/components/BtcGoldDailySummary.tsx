import { useState, useEffect } from 'react';

interface SnapshotAsset {
  price: number;
  change24h?: number;
  change1d?: number;
  high24h?: number;
  high?: number;
  low24h?: number;
  low?: number;
}

interface DeepAnalysis {
  whatHappened: string;
  whyMatters: string;
  direction: string;
  confidence: string;
}

interface WatchItem {
  time: string;
  event: string;
  why: string;
}

interface BriefData {
  dateLabel: string;
  updatedISO: string;
  updatedTime: string;
  snapshot: {
    btc: SnapshotAsset | null;
    gold: SnapshotAsset | null;
    dxy: { price: number; change1d: number } | null;
    us10y: { price: number; change1d: number } | null;
  };
  tldr: string[];
  catalyst48h: string[];
  goldAnalysis: DeepAnalysis;
  btcAnalysis: DeepAnalysis;
  crossAsset: string;
  watchList: WatchItem[];
  triggerLevels: {
    goldBull?: string;
    goldBear?: string;
    btcBull?: string;
    btcBear?: string;
  };
  riskLevel: 'low' | 'medium' | 'high';
  limitations: string;
}

const RISK_STYLE: Record<string, { label: string; color: string; icon: string }> = {
  low: { label: 'ต่ำ', color: '#4ade80', icon: '🟢' },
  medium: { label: 'ปานกลาง', color: '#fbbf24', icon: '🟡' },
  high: { label: 'สูง', color: '#f87171', icon: '🔴' },
};

const DIR_STYLE: Record<string, { color: string; label: string }> = {
  'เชิงบวก': { color: '#4ade80', label: '▲ เชิงบวก' },
  'เชิงลบ': { color: '#f87171', label: '▼ เชิงลบ' },
  'ผันผวน': { color: '#fbbf24', label: '◆ ผันผวน' },
};

function fmtPrice(n: number | undefined | null, decimals = 2): string {
  if (n == null) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtChange(n: number | undefined | null): string {
  if (n == null) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function changeColor(n: number | undefined | null): string {
  if (n == null) return '#9ca3af';
  if (n > 0) return '#4ade80';
  if (n < 0) return '#f87171';
  return '#9ca3af';
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-5">
      <span style={{ fontSize: 16 }}>{icon}</span>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#60a5fa', margin: 0 }}>{title}</h3>
    </div>
  );
}

function DeepDive({ analysis, label, icon }: { analysis: DeepAnalysis; label: string; icon: string }) {
  const dir = DIR_STYLE[analysis.direction] || DIR_STYLE['ผันผวน'];
  return (
    <div style={{ background: '#111c30', border: '1px solid #1e3050', borderRadius: 10, padding: '16px 18px' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 20 }}>{icon}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 11, color: dir.color, fontWeight: 600, background: `${dir.color}15`, padding: '2px 8px', borderRadius: 4 }}>
            {dir.label}
          </span>
          <span style={{ fontSize: 10, color: '#7a90b4' }}>
            ความมั่นใจ: {analysis.confidence}
          </span>
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 600, marginBottom: 3 }}>What Happened</div>
        <div style={{ fontSize: 13, color: '#c8d6e5', lineHeight: 1.6 }}>{analysis.whatHappened}</div>
      </div>
      <div style={{ borderTop: '1px solid #1a2740', paddingTop: 10 }}>
        <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600, marginBottom: 3 }}>Why it Matters</div>
        <div style={{ fontSize: 13, color: '#c8d6e5', lineHeight: 1.6 }}>{analysis.whyMatters}</div>
      </div>
    </div>
  );
}

const DAILY_CACHE_KEY = 'usd-daily-brief';
const DAILY_CACHE_TTL = 24 * 3600 * 1000; // 24 hours — brief is generated once a day

function readLocalCache(key: string, ttl: number): { data: any; model: string } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.ts && Date.now() - parsed.ts < ttl) return parsed;
  } catch {}
  return null;
}

function writeLocalCache(key: string, data: any, model: string) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, model, ts: Date.now() }));
  } catch {}
}

export default function BtcGoldDailySummary() {
  const [data, setData] = useState<BriefData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [model, setModel] = useState('');

  useEffect(() => {
    const cached = readLocalCache(DAILY_CACHE_KEY, DAILY_CACHE_TTL);
    if (cached) {
      setData(cached.data as BriefData);
      setModel(cached.model);
      setStatus('ok');
      return;
    }

    let cancelled = false;
    async function load() {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30000);
        const r = await fetch('/api/daily-summary', { signal: controller.signal });
        clearTimeout(timer);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = await r.json();
        if (json.error) throw new Error(json.error);
        if (cancelled) return;
        const { _cached, _cachedAt, _model, _generatedAt, error, ...rest } = json;
        setData(rest as BriefData);
        setStatus('ok');
        setModel(_model || '');
        writeLocalCache(DAILY_CACHE_KEY, rest, _model || '');
      } catch {
        if (cancelled) return;
        setStatus('error');
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (status === 'loading') {
    return (
      <div className="card p-6 mb-8">
        <div className="flex items-center gap-3">
          <span className="text-2xl animate-pulse">⏳</span>
          <div>
            <h2 className="text-xl font-bold text-highlight">Gold & Bitcoin Morning Brief</h2>
            <p className="text-sm text-yellow-400 animate-pulse mt-1">Sonnet 5.5 กำลังวิเคราะห์ข้อมูลวันนี้...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error' || !data) {
    return (
      <div className="card p-6 mb-8">
        <h2 className="text-xl font-bold text-highlight mb-2">Gold & Bitcoin Morning Brief</h2>
        <div className="rounded-lg bg-amber-900/20 border border-amber-700/30 p-4">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span className="text-amber-400 font-semibold text-sm">ไม่สามารถโหลดข้อมูลรายวันได้</span>
          </div>
          <p className="text-xs text-amber-500/70 mt-1 pl-6">
            ข้อมูลจะถูก generate อัตโนมัติทุก 06:00 น. ICT · ลองใหม่ในภายหลัง
          </p>
        </div>
      </div>
    );
  }

  const risk = RISK_STYLE[data.riskLevel] || RISK_STYLE.medium;
  const snap = data.snapshot;

  return (
    <div className="card p-6 mb-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-highlight">
            ₿ Gold & Bitcoin — Morning Brief
          </h2>
          <div className="text-lg text-orange-300 font-semibold mt-1">{data.dateLabel}</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-green-400 font-mono bg-green-900/30 px-2 py-1 rounded">
            🤖 {model}
          </span>
          {data.updatedTime && (
            <span className="text-xs text-gray-500 font-mono bg-gray-800/60 px-2 py-1 rounded">
              อัปเดต {data.updatedTime}
            </span>
          )}
          <span style={{ fontSize: 11, color: risk.color, fontWeight: 600 }}>
            {risk.icon} ความเสี่ยง: {risk.label}
          </span>
        </div>
      </div>

      {/* TL;DR */}
      {data.tldr && data.tldr.length > 0 && (
        <div style={{ background: '#0c1626', border: '1px solid #1a2740', borderRadius: 8, padding: '14px 18px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#fbbf24', fontWeight: 700, marginBottom: 8 }}>
            สรุปสั้น (TL;DR)
          </div>
          <div className="space-y-1.5">
            {data.tldr.map((b, i) => (
              <div key={i} style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.6 }}>
                <span style={{ color: '#60a5fa', marginRight: 6 }}>•</span>
                {b}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market Snapshot Table */}
      <SectionHeader icon="📊" title="Market Snapshot" />
      <div style={{ overflowX: 'auto', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1e3050' }}>
              {['Asset', 'Price', 'Change', 'High', 'Low'].map(h => (
                <th key={h} style={{ padding: '8px 10px', color: '#7a90b4', fontWeight: 600, textAlign: 'left', fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {snap.gold && (
              <tr style={{ borderBottom: '1px solid #111c30' }}>
                <td style={{ padding: '8px 10px', color: '#fbbf24', fontWeight: 600 }}>🥇 Gold</td>
                <td style={{ padding: '8px 10px', color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>${fmtPrice(snap.gold.price)}</td>
                <td style={{ padding: '8px 10px', color: changeColor(snap.gold.change1d), fontVariantNumeric: 'tabular-nums' }}>{fmtChange(snap.gold.change1d)}</td>
                <td style={{ padding: '8px 10px', color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>${fmtPrice(snap.gold.high)}</td>
                <td style={{ padding: '8px 10px', color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>${fmtPrice(snap.gold.low)}</td>
              </tr>
            )}
            {snap.btc && (
              <tr style={{ borderBottom: '1px solid #111c30' }}>
                <td style={{ padding: '8px 10px', color: '#f7931a', fontWeight: 600 }}>₿ BTC</td>
                <td style={{ padding: '8px 10px', color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>${fmtPrice(snap.btc.price)}</td>
                <td style={{ padding: '8px 10px', color: changeColor(snap.btc.change24h), fontVariantNumeric: 'tabular-nums' }}>{fmtChange(snap.btc.change24h)}</td>
                <td style={{ padding: '8px 10px', color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>${fmtPrice(snap.btc.high24h)}</td>
                <td style={{ padding: '8px 10px', color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>${fmtPrice(snap.btc.low24h)}</td>
              </tr>
            )}
            {snap.us10y && (
              <tr style={{ borderBottom: '1px solid #111c30' }}>
                <td style={{ padding: '8px 10px', color: '#818cf8', fontWeight: 600 }}>📈 10Y Yield</td>
                <td style={{ padding: '8px 10px', color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>{fmtPrice(snap.us10y.price, 3)}%</td>
                <td style={{ padding: '8px 10px', color: changeColor(snap.us10y.change1d), fontVariantNumeric: 'tabular-nums' }}>{fmtChange(snap.us10y.change1d)}</td>
                <td style={{ padding: '8px 10px' }}>—</td>
                <td style={{ padding: '8px 10px' }}>—</td>
              </tr>
            )}
            {snap.dxy && (
              <tr>
                <td style={{ padding: '8px 10px', color: '#38bdf8', fontWeight: 600 }}>💵 DXY</td>
                <td style={{ padding: '8px 10px', color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>{fmtPrice(snap.dxy.price, 2)}</td>
                <td style={{ padding: '8px 10px', color: changeColor(snap.dxy.change1d), fontVariantNumeric: 'tabular-nums' }}>{fmtChange(snap.dxy.change1d)}</td>
                <td style={{ padding: '8px 10px' }}>—</td>
                <td style={{ padding: '8px 10px' }}>—</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 48-Hour Catalyst */}
      {data.catalyst48h && data.catalyst48h.length > 0 && (
        <>
          <SectionHeader icon="⏱️" title="แกนเหตุผล 48 ชม. (The 48-Hour Catalyst)" />
          <div style={{ background: '#0c1626', border: '1px solid #1a2740', borderRadius: 8, padding: '14px 18px', marginBottom: 16 }}>
            <div className="space-y-2">
              {data.catalyst48h.map((c, i) => (
                <div key={i} style={{ fontSize: 13, color: '#c8d6e5', lineHeight: 1.6 }}>
                  <span style={{ color: '#fbbf24', marginRight: 6 }}>▸</span>
                  {c}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Deep dives */}
      <SectionHeader icon="🥇" title="เจาะลึกทองคำ" />
      <div style={{ marginBottom: 16 }}>
        <DeepDive analysis={data.goldAnalysis} label="Gold (XAU/USD)" icon="🥇" />
      </div>

      <SectionHeader icon="₿" title="เจาะลึก Bitcoin" />
      <div style={{ marginBottom: 16 }}>
        <DeepDive analysis={data.btcAnalysis} label="Bitcoin (BTC)" icon="₿" />
      </div>

      {/* Cross-Asset Divergence */}
      {data.crossAsset && (
        <>
          <SectionHeader icon="🔀" title="Cross-Asset Divergence" />
          <div style={{ background: '#111c30', border: '1px solid #1e3050', borderRadius: 8, padding: '14px 18px', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#c8d6e5', lineHeight: 1.7 }}>{data.crossAsset}</div>
            {data.triggerLevels && (
              <div className="grid grid-cols-2 gap-3 mt-3" style={{ borderTop: '1px solid #1a2740', paddingTop: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#7a90b4', marginBottom: 2 }}>Gold Trigger Levels</div>
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: '#4ade80' }}>▲ {data.triggerLevels.goldBull || '—'}</span>
                    {' / '}
                    <span style={{ color: '#f87171' }}>▼ {data.triggerLevels.goldBear || '—'}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#7a90b4', marginBottom: 2 }}>BTC Trigger Levels</div>
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: '#4ade80' }}>▲ {data.triggerLevels.btcBull || '—'}</span>
                    {' / '}
                    <span style={{ color: '#f87171' }}>▼ {data.triggerLevels.btcBear || '—'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Watch List */}
      {data.watchList && data.watchList.length > 0 && (
        <>
          <SectionHeader icon="👁️" title="สิ่งที่ต้องจับตา 24-48 ชม." />
          <div style={{ overflowX: 'auto', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e3050' }}>
                  <th style={{ padding: '6px 10px', color: '#7a90b4', fontWeight: 600, textAlign: 'left', fontSize: 11 }}>เวลา (ICT)</th>
                  <th style={{ padding: '6px 10px', color: '#7a90b4', fontWeight: 600, textAlign: 'left', fontSize: 11 }}>เหตุการณ์</th>
                  <th style={{ padding: '6px 10px', color: '#7a90b4', fontWeight: 600, textAlign: 'left', fontSize: 11 }}>ทำไมสำคัญ</th>
                </tr>
              </thead>
              <tbody>
                {data.watchList.map((w, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #111c30' }}>
                    <td style={{ padding: '6px 10px', color: '#fbbf24', fontWeight: 500, whiteSpace: 'nowrap' }}>{w.time}</td>
                    <td style={{ padding: '6px 10px', color: '#e2e8f0' }}>{w.event}</td>
                    <td style={{ padding: '6px 10px', color: '#9ca3af' }}>{w.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Limitations & Sources */}
      {data.limitations && (
        <div style={{ background: '#0a0f1a', border: '1px solid #1a2740', borderRadius: 6, padding: '10px 14px', marginTop: 8 }}>
          <div style={{ fontSize: 10, color: '#7a90b4', fontWeight: 600, marginBottom: 3 }}>ข้อจำกัด</div>
          <div style={{ fontSize: 11, color: '#5a6f94', lineHeight: 1.5 }}>{data.limitations}</div>
        </div>
      )}

      <p className="text-[10px] text-gray-600 mt-3">
        BTC: Binance · Gold/DXY/10Y: Yahoo Finance · วิเคราะห์โดย {model || 'AI'} · ไม่ใช่คำแนะนำลงทุน · อัปเดตวันละครั้ง 06:00 ICT
      </p>
    </div>
  );
}
