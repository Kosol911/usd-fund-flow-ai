import { useState, useEffect } from 'react';

interface AssetData {
  price: number;
  change24h?: number;
  change1d?: number;
  high24h?: number;
  high?: number;
  low24h?: number;
  low?: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  keyDriver: string;
  outlook: string;
}

interface DailyData {
  dateLabel: string;
  updatedISO: string;
  updatedTime: string;
  btc: AssetData;
  gold: AssetData;
  dxy: { price: number; change1d: number };
  correlation: string;
  headlines: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

const SENTIMENT_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  bullish: { label: 'Bullish', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  bearish: { label: 'Bearish', color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  neutral: { label: 'Neutral', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
};

const RISK_STYLE: Record<string, { label: string; color: string; icon: string }> = {
  low: { label: 'ต่ำ', color: '#4ade80', icon: '🟢' },
  medium: { label: 'ปานกลาง', color: '#fbbf24', icon: '🟡' },
  high: { label: 'สูง', color: '#f87171', icon: '🔴' },
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

function AssetCard({ asset, label, icon }: { asset: AssetData; label: string; icon: string }) {
  const change = asset.change24h ?? asset.change1d ?? 0;
  const high = asset.high24h ?? asset.high;
  const low = asset.low24h ?? asset.low;
  const sent = SENTIMENT_STYLE[asset.sentiment] || SENTIMENT_STYLE.neutral;

  return (
    <div style={{ background: '#111c30', border: '1px solid #1e3050', borderRadius: 10, padding: '18px 20px' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 24 }}>{icon}</span>
          <span className="text-base font-bold text-white">{label}</span>
        </div>
        <span
          style={{
            fontSize: 11,
            background: sent.bg,
            color: sent.color,
            padding: '3px 10px',
            borderRadius: 6,
            fontWeight: 600,
          }}
        >
          {sent.label}
        </span>
      </div>

      <div className="flex items-baseline gap-3 mb-2">
        <span
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#e2e8f0',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.1,
          }}
        >
          ${fmtPrice(asset.price)}
        </span>
        <span
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: changeColor(change),
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {fmtChange(change)}
        </span>
      </div>

      <div className="flex gap-4 mb-3" style={{ fontSize: 12, color: '#7a90b4' }}>
        <span>
          H: <span style={{ color: '#e2e8f0', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>${fmtPrice(high)}</span>
        </span>
        <span>
          L: <span style={{ color: '#e2e8f0', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>${fmtPrice(low)}</span>
        </span>
      </div>

      <div style={{ borderTop: '1px solid #1a2740', paddingTop: 10, marginTop: 2 }}>
        <div style={{ fontSize: 12, color: '#60a5fa', fontWeight: 600, marginBottom: 3 }}>
          ปัจจัยขับเคลื่อน
        </div>
        <div style={{ fontSize: 13, color: '#a8bdd9', lineHeight: 1.6 }}>{asset.keyDriver}</div>
      </div>

      <div style={{ borderTop: '1px solid #1a2740', paddingTop: 10, marginTop: 10 }}>
        <div style={{ fontSize: 12, color: '#fbbf24', fontWeight: 600, marginBottom: 3 }}>
          มุมมองระยะสั้น
        </div>
        <div style={{ fontSize: 13, color: '#a8bdd9', lineHeight: 1.6 }}>{asset.outlook}</div>
      </div>
    </div>
  );
}

export default function BtcGoldDailySummary() {
  const [data, setData] = useState<DailyData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [model, setModel] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load(attempt = 0) {
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
        setData(rest as DailyData);
        setStatus('ok');
        setModel(_model || '');
      } catch {
        if (cancelled) return;
        if (attempt < 1) {
          setTimeout(() => load(attempt + 1), 3000);
        } else {
          setStatus('error');
        }
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
            <h2 className="text-xl font-bold text-highlight">สรุป BTC & Gold รายวัน</h2>
            <p className="text-sm text-yellow-400 animate-pulse mt-1">AI กำลังวิเคราะห์ข้อมูลวันนี้...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error' || !data) {
    return (
      <div className="card p-6 mb-8">
        <h2 className="text-xl font-bold text-highlight mb-2">สรุป BTC & Gold รายวัน</h2>
        <div className="rounded-lg bg-amber-900/20 border border-amber-700/30 p-4">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span className="text-amber-400 font-semibold text-sm">ไม่สามารถโหลดข้อมูลรายวันได้</span>
          </div>
          <p className="text-xs text-amber-500/70 mt-1 pl-6">
            KNPLAB API อาจไม่พร้อม · รีเฟรชหน้าเพื่อลองใหม่
          </p>
        </div>
      </div>
    );
  }

  const risk = RISK_STYLE[data.riskLevel] || RISK_STYLE.medium;

  return (
    <div className="card p-6 mb-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-highlight">
            ₿ BTC & Gold — สรุปรายวัน
          </h2>
          <div className="text-lg text-orange-300 font-semibold mt-1">{data.dateLabel}</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-green-400 font-mono bg-green-900/30 px-2 py-1 rounded">
            🤖 AI ({model})
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

      {/* DXY bar */}
      <div
        className="flex items-center gap-3 mb-4 px-4 py-2 rounded-lg"
        style={{ background: '#0c1626', border: '1px solid #1a2740' }}
      >
        <span style={{ fontSize: 13, color: '#7a90b4' }}>DXY</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
          {fmtPrice(data.dxy.price, 2)}
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: changeColor(data.dxy.change1d), fontVariantNumeric: 'tabular-nums' }}>
          {fmtChange(data.dxy.change1d)}
        </span>
        <span style={{ fontSize: 12, color: '#5a6f94', flex: 1, textAlign: 'right' }}>{data.correlation}</span>
      </div>

      {/* Asset cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {data.btc ? (
          <AssetCard asset={data.btc} label="Bitcoin (BTC)" icon="₿" />
        ) : (
          <div style={{ background: '#111c30', border: '1px solid #1e3050', borderRadius: 10, padding: '18px 20px' }}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ fontSize: 24 }}>₿</span>
              <span className="text-base font-bold text-white">Bitcoin (BTC)</span>
            </div>
            <div className="text-sm text-amber-400">ไม่สามารถดึงข้อมูล BTC จาก Binance ได้</div>
          </div>
        )}
        {data.gold ? (
          <AssetCard asset={data.gold} label="Gold (XAU/USD)" icon="🥇" />
        ) : (
          <div style={{ background: '#111c30', border: '1px solid #1e3050', borderRadius: 10, padding: '18px 20px' }}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ fontSize: 24 }}>🥇</span>
              <span className="text-base font-bold text-white">Gold (XAU/USD)</span>
            </div>
            <div className="text-sm text-amber-400">ไม่สามารถดึงข้อมูล Gold จาก Yahoo Finance ได้</div>
          </div>
        )}
      </div>

      {/* Headlines */}
      {data.headlines && data.headlines.length > 0 && (
        <div style={{ background: '#0c1626', border: '1px solid #1a2740', borderRadius: 8, padding: '14px 18px' }}>
          <div style={{ fontSize: 12, color: '#60a5fa', fontWeight: 600, marginBottom: 8 }}>
            ข่าวสำคัญวันนี้
          </div>
          <div className="space-y-1.5">
            {data.headlines.map((h, i) => (
              <div key={i} style={{ fontSize: 13, color: '#a8bdd9', lineHeight: 1.5 }}>
                <span style={{ color: '#fbbf24', marginRight: 6 }}>▸</span>
                {h}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-600 mt-3">
        ข้อมูล BTC: Binance · Gold/DXY: Yahoo Finance · วิเคราะห์โดย AI อัตโนมัติ · ไม่ใช่คำแนะนำลงทุน · อัปเดตทุก 4 ชม.
      </p>
    </div>
  );
}
