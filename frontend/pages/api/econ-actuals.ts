import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';

/**
 * Auto-fetch actual economic data from BLS Public Data API (v1 — no key needed)
 *
 * Series:
 *   CUSR0000SA0      — CPI-U All Items (SA) index → compute YoY%
 *   CUSR0000SA0L1E   — CPI-U Core (less food & energy, SA) index → compute YoY%
 *   CES0000000001    — Total Nonfarm Employment (SA, thousands) → compute MoM change
 *   LNS14000000      — Unemployment Rate (SA, %) → use directly
 *
 * Returns: array of { nameEn, period, actual, prev, beat } for events that have released
 */

const CACHE_FILE = '/tmp/usd-econ-actuals.json';
const CACHE_TTL = 12 * 3600 * 1000; // 12 hours

interface BLSObservation {
  year: string;
  period: string; // M01..M12
  value: string;
}

interface ActualEntry {
  nameEn: string;
  period: string;      // e.g. "2026-09" (YYYY-MM)
  actual: string;
  prev?: string;
  beat?: boolean;
  source: string;
}

// Month labels in BLS format → human
const BLS_MONTHS: Record<string, number> = {
  M01: 1, M02: 2, M03: 3, M04: 4, M05: 5, M06: 6,
  M07: 7, M08: 8, M09: 9, M10: 10, M11: 11, M12: 12,
};

function readCache(): { data: ActualEntry[]; ts: number } | null {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.ts && Date.now() - parsed.ts < CACHE_TTL) return parsed;
  } catch {}
  return null;
}
function writeCache(data: ActualEntry[]) {
  try { fs.writeFileSync(CACHE_FILE, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

async function fetchBLS(seriesIds: string[], startYear: number, endYear: number): Promise<Record<string, BLSObservation[]>> {
  const res = await fetch('https://api.bls.gov/publicAPI/v1/timeseries/data/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seriesid: seriesIds,
      startyear: String(startYear),
      endyear: String(endYear),
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`BLS API error ${res.status}`);
  const json = await res.json();

  if (json.status !== 'REQUEST_SUCCEEDED') {
    throw new Error(`BLS API: ${json.message?.join('; ') || 'unknown error'}`);
  }

  const result: Record<string, BLSObservation[]> = {};
  for (const series of json.Results?.series || []) {
    const id = series.seriesID;
    // BLS returns newest first — sort oldest first
    const data: BLSObservation[] = (series.data || [])
      .filter((d: any) => d.period.startsWith('M'))
      .sort((a: any, b: any) => {
        const ya = parseInt(a.year), yb = parseInt(b.year);
        if (ya !== yb) return ya - yb;
        return BLS_MONTHS[a.period] - BLS_MONTHS[b.period];
      });
    result[id] = data;
  }
  return result;
}

function computeYoY(data: BLSObservation[], monthsBack: number = 12): { period: string; yoy: number; prevYoy: number }[] {
  const results: { period: string; yoy: number; prevYoy: number }[] = [];
  for (let i = monthsBack; i < data.length; i++) {
    const cur = parseFloat(data[i].value);
    const ago = parseFloat(data[i - monthsBack].value);
    const prevCur = i > monthsBack ? parseFloat(data[i - 1].value) : cur;
    const prevAgo = i > monthsBack ? parseFloat(data[i - 1 - monthsBack].value) : ago;
    if (ago > 0 && prevAgo > 0) {
      const yoy = ((cur / ago) - 1) * 100;
      const prevYoy = ((prevCur / prevAgo) - 1) * 100;
      const year = data[i].year;
      const month = String(BLS_MONTHS[data[i].period]).padStart(2, '0');
      results.push({ period: `${year}-${month}`, yoy: Math.round(yoy * 10) / 10, prevYoy: Math.round(prevYoy * 10) / 10 });
    }
  }
  return results;
}

function computeNFPChange(data: BLSObservation[]): { period: string; change: number; prevChange: number }[] {
  const results: { period: string; change: number; prevChange: number }[] = [];
  for (let i = 1; i < data.length; i++) {
    const cur = parseFloat(data[i].value);
    const prev = parseFloat(data[i - 1].value);
    const change = Math.round(cur - prev); // already in thousands
    const prevChange = i >= 2 ? Math.round(parseFloat(data[i - 1].value) - parseFloat(data[i - 2].value)) : 0;
    const year = data[i].year;
    const month = String(BLS_MONTHS[data[i].period]).padStart(2, '0');
    results.push({ period: `${year}-${month}`, change, prevChange });
  }
  return results;
}

function getLatestUR(data: BLSObservation[]): { period: string; rate: number; prevRate: number }[] {
  const results: { period: string; rate: number; prevRate: number }[] = [];
  for (let i = 1; i < data.length; i++) {
    const rate = parseFloat(data[i].value);
    const prevRate = parseFloat(data[i - 1].value);
    const year = data[i].year;
    const month = String(BLS_MONTHS[data[i].period]).padStart(2, '0');
    results.push({ period: `${year}-${month}`, rate, prevRate });
  }
  return results;
}

// Convert YYYY-MM → Thai period label matching our EVENTS format
// e.g. "2026-09" → "ก.ย. 2569"
const THAI_MONTHS_SHORT = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function toThaiPeriod(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number);
  return `${THAI_MONTHS_SHORT[m]} ${y + 543}`;
}

async function fetchActuals(): Promise<ActualEntry[]> {
  const now = new Date();
  const year = now.getFullYear();

  // Need 2 years for YoY computation
  const blsData = await fetchBLS(
    ['CUSR0000SA0', 'CUSR0000SA0L1E', 'CES0000000001', 'LNS14000000'],
    year - 2,
    year
  );

  const entries: ActualEntry[] = [];

  // CPI YoY
  const cpiIndex = blsData['CUSR0000SA0'];
  if (cpiIndex && cpiIndex.length > 12) {
    const yoys = computeYoY(cpiIndex);
    for (const y of yoys.slice(-6)) { // last 6 months
      entries.push({
        nameEn: 'CPI YoY',
        period: toThaiPeriod(y.period),
        actual: y.yoy.toFixed(1),
        prev: y.prevYoy.toFixed(1),
        source: 'BLS CUSR0000SA0',
      });
    }
  }

  // Core CPI YoY
  const coreCpiIndex = blsData['CUSR0000SA0L1E'];
  if (coreCpiIndex && coreCpiIndex.length > 12) {
    const yoys = computeYoY(coreCpiIndex);
    for (const y of yoys.slice(-6)) {
      entries.push({
        nameEn: 'Core CPI YoY',
        period: toThaiPeriod(y.period),
        actual: y.yoy.toFixed(1),
        prev: y.prevYoy.toFixed(1),
        source: 'BLS CUSR0000SA0L1E',
      });
    }
  }

  // NFP (change in thousands)
  const nfpData = blsData['CES0000000001'];
  if (nfpData && nfpData.length > 1) {
    const changes = computeNFPChange(nfpData);
    for (const c of changes.slice(-6)) {
      entries.push({
        nameEn: 'Nonfarm Payrolls',
        period: toThaiPeriod(c.period),
        actual: String(c.change),
        prev: String(c.prevChange),
        source: 'BLS CES0000000001',
      });
    }
  }

  // Unemployment Rate
  const urData = blsData['LNS14000000'];
  if (urData && urData.length > 1) {
    const rates = getLatestUR(urData);
    for (const r of rates.slice(-6)) {
      entries.push({
        nameEn: 'Unemployment Rate',
        period: toThaiPeriod(r.period),
        actual: r.rate.toFixed(1),
        prev: r.prevRate.toFixed(1),
        source: 'BLS LNS14000000',
      });
    }
  }

  return entries;
}

export const config = { maxDuration: 30 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const forceRefresh = req.query.refresh === 'true';

  if (!forceRefresh) {
    const cached = readCache();
    if (cached) {
      return res.status(200).json({
        actuals: cached.data,
        _cached: true,
        _cachedAt: new Date(cached.ts).toISOString(),
        count: cached.data.length,
      });
    }
  }

  try {
    const actuals = await fetchActuals();
    writeCache(actuals);

    return res.status(200).json({
      actuals,
      _cached: false,
      _fetchedAt: new Date().toISOString(),
      count: actuals.length,
    });
  } catch (err: any) {
    console.error('econ-actuals error:', err);

    // Serve stale cache on error
    try {
      const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
      const cached = JSON.parse(raw);
      if (cached?.data) {
        return res.status(200).json({
          actuals: cached.data,
          _cached: true,
          _stale: true,
          count: cached.data.length,
        });
      }
    } catch {}

    return res.status(500).json({ error: err.message || 'Failed to fetch BLS data' });
  }
}
