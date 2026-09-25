import type { NextApiRequest, NextApiResponse } from 'next';

type Asset = 'BTC' | 'GOLD' | 'DXY';

interface EventDef {
  id: string;
  utc: string;
}

// EDT (UTC-4): 08:30 ET = 12:30 UTC, FOMC 14:00 ET = 18:00 UTC
const EVENTS: EventDef[] = [
  { id: 'nfp_aug',  utc: '2026-09-04T12:30:00Z' },
  { id: 'cpi_aug',  utc: '2026-09-10T12:30:00Z' },
  { id: 'fomc_sep', utc: '2026-09-17T18:00:00Z' },
  { id: 'pce_jul',  utc: '2026-08-28T12:30:00Z' },
  { id: 'cpi_jul',  utc: '2026-08-12T12:30:00Z' },
  { id: 'nfp_jul',  utc: '2026-08-07T12:30:00Z' },
  { id: 'cpi_jun',  utc: '2026-07-10T12:30:00Z' },
  { id: 'nfp_jun',  utc: '2026-07-03T12:30:00Z' },
];

const WINDOW_KEYS = ['pre60', 'post15', 'post1h', 'post4h', 'post1d', 'post5d'] as const;
const WINDOW_OFFSET_MIN: Record<string, number> = {
  pre60: -60, post15: 15, post1h: 60, post4h: 240, post1d: 1440, post5d: 7200,
};

// ── Cache (survives across requests in the same serverless instance) ──
let cache: { data: any; ts: number } | null = null;
const CACHE_TTL = 6 * 3600 * 1000;

// ── Binance: BTC 1h klines ──
async function fetchBtcCandles(startMs: number, endMs: number): Promise<[number, number][]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&startTime=${startMs}&endTime=${endMs}&limit=1000`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const rows: any[] = await res.json();
  return rows.map((r) => [Number(r[0]), parseFloat(r[4])]);
}

function findClosestPrice(candles: [number, number][], targetMs: number): number | null {
  if (!candles.length) return null;
  let best: [number, number] | null = null;
  for (const c of candles) {
    if (c[0] <= targetMs) best = c;
    else break;
  }
  return best ? best[1] : null;
}

// ── Yahoo Finance: Gold (GC=F) / DXY (DX-Y.NYB) daily ──
async function fetchYahooDaily(symbol: string, startSec: number, endSec: number): Promise<Map<string, number>> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${startSec}&period2=${endSec}&interval=1d`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; USDFundFlowAI/1.0)' },
  });
  if (!res.ok) return new Map();
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) return new Map();
  const timestamps: number[] = result.timestamp ?? [];
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
  const map = new Map<string, number>();
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close === null || close === undefined) continue;
    const d = new Date(timestamps[i] * 1000);
    const key = d.toISOString().slice(0, 10);
    map.set(key, close);
  }
  return map;
}

function dailyPrice(prices: Map<string, number>, baseDate: string, offsetDays: number): number | null {
  const sorted = [...prices.keys()].sort();
  let idx = sorted.indexOf(baseDate);
  if (idx === -1) {
    idx = sorted.findIndex((d) => d >= baseDate);
    if (idx === -1) return null;
  }
  const target = sorted[idx + offsetDays];
  return target ? prices.get(target) ?? null : null;
}

function pctChange(base: number | null, target: number | null): number | null {
  if (base === null || target === null || base === 0) return null;
  return ((target - base) / base) * 100;
}

// ── Main computation ──
async function computeAll() {
  const startSec = Math.floor(new Date('2026-06-28').getTime() / 1000);
  const endSec = Math.floor(new Date('2026-09-26').getTime() / 1000);

  // Fetch BTC candles per event + Gold/DXY daily (all in parallel)
  const btcPromises = EVENTS.map((ev) => {
    const ms = new Date(ev.utc).getTime();
    return fetchBtcCandles(ms - 2 * 3600_000, ms + 6 * 86400_000).catch(() => [] as [number, number][]);
  });

  const [goldPrices, dxyPrices, ...btcSets] = await Promise.all([
    fetchYahooDaily('GC=F', startSec, endSec).catch(() => new Map<string, number>()),
    fetchYahooDaily('DX-Y.NYB', startSec, endSec).catch(() => new Map<string, number>()),
    ...btcPromises,
  ]);

  const result: Record<string, Record<string, Record<Asset, number | null>>> = {};

  EVENTS.forEach((ev, i) => {
    const eventMs = new Date(ev.utc).getTime();
    const eventDate = ev.utc.slice(0, 10);
    const btcCandles = btcSets[i];
    const btcBase = findClosestPrice(btcCandles, eventMs);
    const goldBase = dailyPrice(goldPrices, eventDate, 0);
    const dxyBase = dailyPrice(dxyPrices, eventDate, 0);

    const reactions: Record<string, Record<Asset, number | null>> = {};

    for (const wk of WINDOW_KEYS) {
      const offMin = WINDOW_OFFSET_MIN[wk];
      const targetMs = eventMs + offMin * 60_000;

      // BTC: intraday from Binance
      let btcVal: number | null = null;
      if (offMin < 0) {
        const pBefore = findClosestPrice(btcCandles, targetMs);
        btcVal = pctChange(pBefore, btcBase);
      } else {
        const pAfter = findClosestPrice(btcCandles, targetMs);
        btcVal = pctChange(btcBase, pAfter);
      }
      // post15 with 1h candles → same candle as event, not meaningful
      if (wk === 'post15') btcVal = null;

      // Gold & DXY: daily only → +1d and +5d
      let goldVal: number | null = null;
      let dxyVal: number | null = null;
      if (wk === 'post1d') {
        goldVal = pctChange(goldBase, dailyPrice(goldPrices, eventDate, 1));
        dxyVal = pctChange(dxyBase, dailyPrice(dxyPrices, eventDate, 1));
      } else if (wk === 'post5d') {
        goldVal = pctChange(goldBase, dailyPrice(goldPrices, eventDate, 5));
        dxyVal = pctChange(dxyBase, dailyPrice(dxyPrices, eventDate, 5));
      }

      reactions[wk] = { BTC: btcVal, GOLD: goldVal, DXY: dxyVal };
    }

    result[ev.id] = reactions;
  });

  return {
    reactions: result,
    sources: {
      BTC: btcSets.some((s) => s.length > 0) ? 'binance' : null,
      GOLD: goldPrices.size > 0 ? 'yahoo' : null,
      DXY: dxyPrices.size > 0 ? 'yahoo' : null,
    },
  };
}

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  if (_req.method !== 'GET') return res.status(405).end();

  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return res.status(200).json(cache.data);
  }

  try {
    const data = await computeAll();
    cache = { data, ts: Date.now() };
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'computation failed' });
  }
}
