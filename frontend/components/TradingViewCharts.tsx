import { useState } from 'react';

// TradingView Advanced Chart Widget iframe URL builder
function tvWidgetUrl(symbol: string, interval: string) {
  const params = new URLSearchParams({
    symbol,
    interval,
    theme: 'dark',
    locale: 'th',
    toolbar_bg: '#0d1117',
    enable_publishing: 'false',
    hide_side_toolbar: 'false',
    allow_symbol_change: 'false',
    save_image: 'false',
    calendar: 'false',
    hide_volume: 'false',
    studies: 'MASimple@tv-basicstudies,MASimple@tv-basicstudies',
    // EMA 12 + EMA 26 approximated via MASimple
  });
  return `https://s3.tradingview.com/widgetembed/?frameElementId=tv_chart&${params.toString()}`;
}

function ChartBlock({
  label,
  snapshotUrl,
  ideaUrl,
  tvSymbol,
  tvInterval,
}: {
  label: string;
  snapshotUrl: string;
  ideaUrl: string;
  tvSymbol: string;
  tvInterval: string;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-highlight">{label}</h3>
        <a
          href={ideaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-highlight hover:underline"
        >
          เปิด Analysis ↗
        </a>
      </div>

      {!imgError ? (
        <a href={ideaUrl} target="_blank" rel="noopener noreferrer">
          <img
            src={snapshotUrl}
            alt={`${label} analysis`}
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
        // Fallback: TradingView live widget iframe
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-amber-400/70 bg-amber-900/20 px-1.5 py-0.5 rounded">
              Live Chart (snapshot ไม่พร้อม)
            </span>
            <a
              href={ideaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-sky-400 hover:underline"
            >
              ดู Analysis พร้อม CDC zones ↗
            </a>
          </div>
          <iframe
            src={tvWidgetUrl(tvSymbol, tvInterval)}
            style={{
              width: '100%',
              height: '450px',
              border: '1px solid #1e3050',
              borderRadius: '8px',
              display: 'block',
            }}
            allowTransparency={true}
            frameBorder="0"
            scrolling="no"
            allowFullScreen={true}
          />
        </div>
      )}
    </div>
  );
}

export default function TradingViewCharts() {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4 text-highlight">กราฟราคาสด (TradingView)</h2>
      <div className="grid grid-cols-1 gap-6">
        <ChartBlock
          label="GOLD — Day CDC System (4,000–4,700 Sideway)"
          snapshotUrl="https://s3.tradingview.com/4/4H5STjbm_big.png"
          ideaUrl="https://www.tradingview.com/chart/GC1!/4H5STjbm-GOLD-Day-4000-4700-sideway-with-CDC-system/"
          tvSymbol="COMEX:GC1!"
          tvInterval="D"
        />
        <ChartBlock
          label="BTC WEEK — 82,500 Main Support/Resistance"
          snapshotUrl="https://s3.tradingview.com/j/J1GcCSAO_big.png"
          ideaUrl="https://www.tradingview.com/chart/BTCUSD/J1GcCSAO-BTC-WEEK-82500-Main-support-resistant/"
          tvSymbol="BINANCE:BTCUSDT"
          tvInterval="W"
        />
      </div>
    </div>
  );
}
