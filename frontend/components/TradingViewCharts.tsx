import { useEffect, useRef } from 'react';

// Official TradingView embeddable "Advanced Real-Time Chart" widget.
// Free, publisher-sanctioned embed (https://www.tradingview.com/widget/advanced-chart/) —
// does not replicate a saved personal layout or its private indicators.
function TVChart({ symbol, label, containerId }: { symbol: string; label: string; containerId: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      // @ts-ignore - injected by tv.js
      if (window.TradingView && ref.current) {
        // @ts-ignore
        new window.TradingView.widget({
          width: '100%',
          height: 420,
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

    return () => {
      script.remove();
    };
  }, [symbol, containerId]);

  return (
    <div className="card p-4">
      <h3 className="text-lg font-bold mb-3 text-highlight">{label}</h3>
      <div id={containerId} ref={ref} />
    </div>
  );
}

export default function TradingViewCharts() {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4 text-highlight">กราฟราคาสด (TradingView)</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TVChart symbol="BINANCE:BTCUSDT" label="BTC / USDT" containerId="tv_btc_chart" />
        <TVChart symbol="OANDA:XAUUSD" label="GOLD / USD (XAUUSD)" containerId="tv_gold_chart" />
      </div>
    </div>
  );
}
