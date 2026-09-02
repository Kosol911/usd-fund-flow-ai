import { useEffect, useRef, useState } from 'react';

function ChartBlock({
  symbol,
  label,
  containerId,
  snapshotUrl,
  ideaUrl,
}: {
  symbol: string;
  label: string;
  containerId: string;
  snapshotUrl: string;
  ideaUrl: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = `<div id="${containerId}" style="height:380px"></div>`;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      if (window.TradingView) {
        // @ts-ignore
        new window.TradingView.widget({
          autosize: true,
          height: 380,
          symbol,
          interval: '240',
          timezone: 'Asia/Bangkok',
          theme: 'dark',
          style: '1',
          locale: 'th',
          toolbar_bg: '#0f3460',
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          container_id: containerId,
        });
      }
    };
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [symbol, containerId]);

  return (
    <div className="card p-4">
      <h3 className="text-lg font-bold mb-3 text-highlight">{label}</h3>

      {/* ── การวิเคราะห์ (Snapshot) ─────────────── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wider text-gray-400">
            📊 การวิเคราะห์ (Trendline)
          </span>
          <a
            href={ideaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-highlight hover:underline"
          >
            เปิดบน TradingView ↗
          </a>
        </div>
        {!imgError ? (
          <a href={ideaUrl} target="_blank" rel="noopener noreferrer">
            <img
              src={snapshotUrl}
              alt={`${label} analysis snapshot`}
              onError={() => setImgError(true)}
              style={{
                width: '100%',
                borderRadius: '8px',
                border: '1px solid #1e3050',
                display: 'block',
              }}
            />
          </a>
        ) : (
          <div style={{
            padding: '20px',
            background: '#111c30',
            border: '1px solid #1e3050',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#7a90b4',
            fontSize: '13px',
          }}>
            ยังไม่สามารถโหลด snapshot ได้ —
            <a href={ideaUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#4a9eff', marginLeft: 6 }}>
              คลิกเปิดบน TradingView
            </a>
          </div>
        )}
      </div>

      {/* ── ราคาสด (Live Widget) ─────────────────── */}
      <div>
        <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">
          ⚡ ราคาสด Real-Time
        </div>
        <div ref={ref} style={{ minHeight: 380 }} />
      </div>
    </div>
  );
}

export default function TradingViewCharts() {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4 text-highlight">กราฟราคาสด (TradingView)</h2>
      <div className="grid grid-cols-1 gap-6">
        <ChartBlock
          symbol="BINANCE:BTCUSDT"
          label="BTC / USDT"
          containerId="tv_btc_chart"
          snapshotUrl="https://s3.tradingview.com/o/OQ48Orn3_big.png"
          ideaUrl="https://www.tradingview.com/chart/BTCUSD/OQ48Orn3-BTC-4-HR-CDC-trend/"
        />
        <ChartBlock
          symbol="OANDA:XAUUSD"
          label="GOLD / USD (XAUUSD)"
          containerId="tv_gold_chart"
          snapshotUrl="https://s3.tradingview.com/r/rzTvbd0A_big.png"
          ideaUrl="https://www.tradingview.com/chart/XAUUSD/rzTvbd0A-GOLD-CDC-System-4-Hr/"
        />
      </div>
    </div>
  );
}
