import { useState } from 'react';

function ChartBlock({
  label,
  snapshotUrl,
  ideaUrl,
}: {
  label: string;
  snapshotUrl: string;
  ideaUrl: string;
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
          เปิดบน TradingView ↗
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
  );
}

export default function TradingViewCharts() {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4 text-highlight">กราฟราคาสด (TradingView)</h2>
      <div className="grid grid-cols-1 gap-6">
        <ChartBlock
          label="GOLD — Day CDC System (4,000–4,700 Sideway)"
          snapshotUrl="https://s3.tradingview.com/s/4H5STjbm_big.png"
          ideaUrl="https://www.tradingview.com/chart/GC1!/4H5STjbm-GOLD-Day-4000-4700-sideway-with-CDC-system/"
        />
        <ChartBlock
          label="BTC WEEK — 82,500 Main Support/Resistance"
          snapshotUrl="https://s3.tradingview.com/j/J1GcCSAO_big.png"
          ideaUrl="https://www.tradingview.com/chart/BTCUSD/J1GcCSAO-BTC-WEEK-82500-Main-support-resistant/"
        />
      </div>
    </div>
  );
}
