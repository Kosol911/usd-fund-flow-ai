import type { NextApiRequest, NextApiResponse } from 'next';

// CDC Action Zone: EMA12/EMA26 crossover system for BTC & Gold (daily)

let cache: { data: any; ts: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 min

// ── EMA calculation ──
function ema(closes: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [closes[0]];
  for (let i = 1; i < closes.length; i++) {
    result.push(closes[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

function rsi14(closes: number[]): number | null {
  if (closes.length < 15) return null;
  const recent = closes.slice(-15);
  let gains = 0, losses = 0;
  for (let i = 1; i < recent.length; i++) {
    const diff = recent[i] - recent[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / 14;
  const avgLoss = losses / 14;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function cdcZone(price: number, ema12: number, ema26: number): { zone: number; label: string; color: string } {
  if (price > ema12 && ema12 > ema26) return { zone: 1, label: 'Strong Buy', color: '#4ADE80' };
  if (ema12 > price && price > ema26) return { zone: 2, label: 'Buy', color: '#86EFAC' };
  if (price > ema12 && ema12 < ema26) return { zone: 3, label: 'Sell', color: '#FB923C' };
  return { zone: 4, label: 'Strong Sell', color: '#F87171' };
}

// ── BTC daily: try Binance first, fallback to CoinGecko ──
async function fetchBtcDaily(): Promise<{ dates: string[]; closes: number[]; highs: number[]; lows: number[]; volumes: number[] } | null> {
  // Try Binance first
  try {
    const res = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=40', {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const rows: any[] = await res.json();
      if (rows.length >= 26) {
        return {
          dates: rows.map(r => new Date(r[0]).toISOString().slice(0, 10)),
          closes: rows.map(r => parseFloat(r[4])),
          highs: rows.map(r => parseFloat(r[2])),
          lows: rows.map(r => parseFloat(r[3])),
          volumes: rows.map(r => parseFloat(r[5]) * parseFloat(r[4])),
        };
      }
    }
  } catch { /* fall through to CoinGecko */ }

  // Fallback: CoinGecko (free, no key, 45 days)
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=45&interval=daily',
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; USDFundFlowAI/1.0)' }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const prices: [number, number][] = json.prices || [];
    if (prices.length < 26) return null;
    return {
      dates: prices.map(p => new Date(p[0]).toISOString().slice(0, 10)),
      closes: prices.map(p => p[1]),
      highs: prices.map(p => p[1]),   // CoinGecko daily doesn't give H/L, approximate
      lows: prices.map(p => p[1]),
      volumes: (json.total_volumes || []).map((v: [number, number]) => v[1]),
    };
  } catch { return null; }
}

// ── Yahoo Finance: Gold daily ──
async function fetchGoldDaily(): Promise<{ dates: string[]; closes: number[]; highs: number[]; lows: number[] } | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const from = now - 50 * 86400;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/GC=F?period1=${from}&period2=${now}&interval=1d`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; USDFundFlowAI/1.0)' } });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;
    const ts: number[] = result.timestamp || [];
    const q = result.indicators?.quote?.[0];
    const closes: (number | null)[] = q?.close || [];
    const highs: (number | null)[] = q?.high || [];
    const lows: (number | null)[] = q?.low || [];
    const valid: { date: string; close: number; high: number; low: number }[] = [];
    for (let i = 0; i < ts.length; i++) {
      if (closes[i] != null && highs[i] != null && lows[i] != null) {
        valid.push({
          date: new Date(ts[i] * 1000).toISOString().slice(0, 10),
          close: closes[i]!, high: highs[i]!, low: lows[i]!,
        });
      }
    }
    return {
      dates: valid.map(v => v.date),
      closes: valid.map(v => v.close),
      highs: valid.map(v => v.high),
      lows: valid.map(v => v.low),
    };
  } catch { return null; }
}

// ── Yahoo Finance: single symbol latest ──
async function fetchYahooLatest(symbol: string): Promise<{ close: number; prevClose: number } | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const from = now - 15 * 86400;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${from}&period2=${now}&interval=1d`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; USDFundFlowAI/1.0)' } });
    if (!res.ok) return null;
    const json = await res.json();
    const closes: (number | null)[] = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
    const valid = closes.filter((c): c is number => c != null);
    if (valid.length < 2) return null;
    return { close: valid[valid.length - 1], prevClose: valid.length >= 6 ? valid[valid.length - 6] : valid[0] };
  } catch { return null; }
}

// ── Fear & Greed Index ──
async function fetchFearGreed(): Promise<{ value: number; label: string } | null> {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1');
    if (!res.ok) return null;
    const json = await res.json();
    const d = json?.data?.[0];
    return d ? { value: parseInt(d.value), label: d.value_classification } : null;
  } catch { return null; }
}

function buildAsset(
  name: string,
  data: { dates: string[]; closes: number[]; highs: number[]; lows: number[]; volumes?: number[] } | null
) {
  if (!data || data.closes.length < 26) {
    return {
      asset: name, price: null, ema12: null, ema26: null, zone: null,
      label: 'ข้อมูลไม่พร้อม', color: '#6B7280',
      last_zone_change_days_ago: null, history: [], weekly: null,
      rsi_14: null, fetched_utc: new Date().toISOString(), error: 'insufficient data',
    };
  }

  const closes = data.closes;
  const ema12arr = ema(closes, 12);
  const ema26arr = ema(closes, 26);
  const lastIdx = closes.length - 1;
  const price = closes[lastIdx];
  const e12 = ema12arr[lastIdx];
  const e26 = ema26arr[lastIdx];
  const { zone, label, color } = cdcZone(price, e12, e26);

  // history: last 10 days
  const history = [];
  for (let i = Math.max(0, lastIdx - 9); i <= lastIdx; i++) {
    const z = cdcZone(closes[i], ema12arr[i], ema26arr[i]);
    history.push({
      idx: i, close: closes[i], ema12: ema12arr[i], ema26: ema26arr[i],
      zone: z.zone, label: z.label, color: z.color,
    });
  }

  // last zone change
  let lastZoneChangeDaysAgo: number | null = null;
  for (let i = lastIdx - 1; i >= Math.max(0, lastIdx - 30); i--) {
    const prevZone = cdcZone(closes[i], ema12arr[i], ema26arr[i]).zone;
    if (prevZone !== zone) {
      lastZoneChangeDaysAgo = lastIdx - i;
      break;
    }
  }

  // weekly stats (last 7 entries)
  const weekSlice = Math.max(0, closes.length - 7);
  const weekCloses = closes.slice(weekSlice);
  const weekHighs = data.highs.slice(weekSlice);
  const weekLows = data.lows.slice(weekSlice);
  const weekVols = data.volumes?.slice(weekSlice);
  const weekly = {
    open: weekCloses[0],
    close: weekCloses[weekCloses.length - 1],
    high: Math.max(...weekHighs),
    low: Math.min(...weekLows),
    pct_wow: weekCloses[0] ? ((weekCloses[weekCloses.length - 1] - weekCloses[0]) / weekCloses[0]) * 100 : null,
    volume_avg_daily_usd: weekVols ? weekVols.reduce((a, b) => a + b, 0) / weekVols.length : null,
  };

  return {
    asset: name, price, ema12: e12, ema26: e26, zone, label, color,
    last_zone_change_days_ago: lastZoneChangeDaysAgo, history, weekly,
    rsi_14: rsi14(closes),
    fetched_utc: new Date().toISOString(), error: null,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return res.status(200).json(cache.data);
  }

  try {
    const [btcData, goldData, dxy, us10y, fearGreed] = await Promise.all([
      fetchBtcDaily(),
      fetchGoldDaily(),
      fetchYahooLatest('DX-Y.NYB'),
      fetchYahooLatest('^TNX'),
      fetchFearGreed(),
    ]);

    const btc = buildAsset('BTC', btcData);
    const gold = buildAsset('GOLD', goldData ? { ...goldData, volumes: undefined } : null);

    // BTC-Gold correlation (last 20 trading days)
    let btcGoldCorr: number | null = null;
    if (btcData && goldData) {
      const minLen = Math.min(btcData.closes.length, goldData.closes.length, 20);
      if (minLen >= 10) {
        const btcSlice = btcData.closes.slice(-minLen);
        const goldSlice = goldData.closes.slice(-minLen);
        // returns from day-to-day
        const btcRet = btcSlice.slice(1).map((v, i) => (v - btcSlice[i]) / btcSlice[i]);
        const goldRet = goldSlice.slice(1).map((v, i) => (v - goldSlice[i]) / goldSlice[i]);
        const n = Math.min(btcRet.length, goldRet.length);
        const mB = btcRet.slice(0, n).reduce((a, b) => a + b, 0) / n;
        const mG = goldRet.slice(0, n).reduce((a, b) => a + b, 0) / n;
        let cov = 0, vB = 0, vG = 0;
        for (let i = 0; i < n; i++) {
          const db = btcRet[i] - mB;
          const dg = goldRet[i] - mG;
          cov += db * dg;
          vB += db * db;
          vG += dg * dg;
        }
        const denom = Math.sqrt(vB * vG);
        if (denom > 0) btcGoldCorr = cov / denom;
      }
    }

    const result = {
      btc,
      gold,
      context: {
        fear_greed: fearGreed,
        dxy: dxy ? { close: dxy.close, pct_wow: dxy.prevClose ? ((dxy.close - dxy.prevClose) / dxy.prevClose) * 100 : null } : null,
        us10y: us10y ? { close: us10y.close, change_bps: us10y.prevClose ? Math.round((us10y.close - us10y.prevClose) * 100) : 0 } : null,
        btc_gold_corr_4w: btcGoldCorr,
      },
      timeframe: 'D1',
      ema_periods: [12, 26],
    };

    cache = { data: result, ts: Date.now() };
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'CDC computation failed' });
  }
}
