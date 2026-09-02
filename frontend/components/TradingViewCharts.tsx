function TVChart({ src, label }: { src: string; label: string }) {
  return (
    <div className="card p-4">
      <h3 className="text-lg font-bold mb-3 text-highlight">{label}</h3>
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
        <iframe
          src={src}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
          allowFullScreen
        />
      </div>
    </div>
  );
}

export default function TradingViewCharts() {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4 text-highlight">กราฟราคาสด (TradingView)</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TVChart
          src="https://th.tradingview.com/chart/BTCUSDT/4GFg4wRP/"
          label="BTC / USDT"
        />
        <TVChart
          src="https://th.tradingview.com/chart/XAUUSD/6bSOoSjX/"
          label="GOLD / USD (XAUUSD)"
        />
      </div>
    </div>
  );
}
