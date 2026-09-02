import { useEffect, useRef } from 'react';

function TVChart({
  symbol,
  label,
  containerId,
  chartId,
}: {
  symbol: string;
  label: string;
  containerId: string;
  chartId: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = `<div id="${containerId}" style="height:420px"></div>`;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      if (window.TradingView) {
        // @ts-ignore
        new window.TradingView.widget({
          autosize: true,
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
          chart: chartId,
          container_id: containerId,
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [symbol, containerId, chartId]);

  return (
    <div className="card p-4">
      <h3 className="text-lg font-bold mb-3 text-highlight">{label}</h3>
      <div ref={ref} style={{ minHeight: 420 }} />
    </div>
  );
}

export default function TradingViewCharts() {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4 text-highlight">กราฟราคาสด (TradingView)</h2>
      <div className="grid grid-cols-1 gap-6">
        <TVChart
          symbol="BINANCE:BTCUSDT"
          label="BTC / USDT"
          containerId="tv_btc_chart"
          chartId="4GFg4wRP"
        />
        <TVChart
          symbol="OANDA:XAUUSD"
          label="GOLD / USD (XAUUSD)"
          containerId="tv_gold_chart"
          chartId="6bSOoSjX"
        />
      </div>
    </div>
  );
}
