import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import { EVENTS, keyScenarios } from '../../lib/econEvents';
import type { KeyScenario } from '../../lib/econEvents';

function todayIct(): string {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function calendarText(from: string, days: number): string {
  const end = new Date(from + 'T00:00:00Z');
  end.setUTCDate(end.getUTCDate() + days);
  const endIso = end.toISOString().slice(0, 10);
  const rows = EVENTS
    .filter((e) => e.actual == null && e.date >= from && e.date <= endIso)
    .map((e) => `${e.date} ${e.time} ICT | ${e.nameTh} | consensus ${e.forecast ?? '—'}${e.unit ? ' ' + e.unit : ''} | ก่อนหน้า ${e.prev ?? '—'}`);
  return rows.join('\n') || 'ไม่มี event ในปฏิทิน';
}

const FALLBACK_EFFECT = {
  good: 'ออกฝั่ง dovish → แรงกดดันขึ้นดอกเบี้ยลด DXY มีแนวโน้มอ่อน หนุน Gold และ BTC',
  normal: 'ใกล้เคียงคาด ตลาดรับรู้ไปแล้ว ผลกระทบจำกัด',
  bad: 'ออกฝั่ง hawkish → โอกาส Fed เข้มงวดเพิ่ม DXY มีแนวโน้มแข็ง กดดัน Gold และ BTC',
};

const KNPLAB_API_KEY = process.env.KNPLAB_API_KEY || '';
const KNPLAB_BASE_URL = 'https://devmain.knplabai.com';
const AI_MODEL = process.env.KNPLAB_AI_MODEL || 'deepseek-v4.1-flash';

let cache: { data: any; ts: number } | null = null;
// Concurrent requests on one instance share a single generation
let inFlight: Promise<any> | null = null;
const CACHE_TTL = 7 * 24 * 3600 * 1000; // 7 days
const CACHE_FILE = '/tmp/usd-weekly-summary.json';

function readFileCache(): { data: any; ts: number } | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.ts && Date.now() - parsed.ts < CACHE_TTL) return parsed;
    return null;
  } catch { return null; }
}

function writeFileCache(data: any) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ data, ts: Date.now() }), 'utf-8');
  } catch {}
}

// Derive weekly OHLC and nearby support/resistance from daily bars.
// Returns the latest closed week (if today isn't the week close) plus the
// prior week for WoW %, and the two nearest pivot low/high levels.
function deriveWeekly(bars: { date: string; close: number; high: number; low: number; volume?: number }[]) {
  if (!bars.length) return null;
  // Group by ISO week starting Monday
  const weeks = new Map<string, { open: number; close: number; high: number; low: number; volume: number; days: number }>();
  for (const b of bars) {
    const d = new Date(b.date + 'T00:00:00Z');
    const dow = d.getUTCDay();
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - (dow === 0 ? 6 : dow - 1));
    const key = monday.toISOString().slice(0, 10);
    const w = weeks.get(key);
    if (!w) {
      weeks.set(key, { open: b.close, close: b.close, high: b.high, low: b.low, volume: b.volume || 0, days: 1 });
    } else {
      w.close = b.close;
      w.high = Math.max(w.high, b.high);
      w.low = Math.min(w.low, b.low);
      w.volume += b.volume || 0;
      w.days += 1;
    }
  }
  const ordered = Array.from(weeks.entries()).sort(([a], [b]) => a < b ? -1 : 1);
  if (ordered.length < 2) return null;
  const latest = ordered[ordered.length - 1][1];
  const prev = ordered[ordered.length - 2][1];
  const wowPct = ((latest.close - prev.close) / prev.close) * 100;
  const avgVolume = latest.days ? latest.volume / latest.days : 0;

  // Pivot lows/highs: a bar is a pivot low if its low is <= 2 neighbors each side
  const highs = bars.map(b => b.high);
  const lows = bars.map(b => b.low);
  const price = bars[bars.length - 1].close;
  const pivotHighs: number[] = [];
  const pivotLows: number[] = [];
  for (let i = 2; i < bars.length - 2; i++) {
    if (highs[i] >= highs[i - 1] && highs[i] >= highs[i - 2] && highs[i] >= highs[i + 1] && highs[i] >= highs[i + 2]) pivotHighs.push(highs[i]);
    if (lows[i] <= lows[i - 1] && lows[i] <= lows[i - 2] && lows[i] <= lows[i + 1] && lows[i] <= lows[i + 2]) pivotLows.push(lows[i]);
  }
  // Resistance: pivot highs above current price, sorted ascending; Support: pivot lows below, descending
  const resistances = Array.from(new Set(pivotHighs.filter(h => h > price).map(h => Math.round(h)))).sort((a, b) => a - b).slice(0, 2);
  const supports = Array.from(new Set(pivotLows.filter(l => l < price).map(l => Math.round(l)))).sort((a, b) => b - a).slice(0, 2);

  // EMA21 (daily) for trend reference
  let ema21: number | null = null;
  if (bars.length >= 21) {
    const k = 2 / 22;
    let e = bars.slice(0, 21).reduce((s, b) => s + b.close, 0) / 21;
    for (let i = 21; i < bars.length; i++) e = bars[i].close * k + e * (1 - k);
    ema21 = e;
  }

  // Weekly RSI(14) on closes
  let rsi: number | null = null;
  const weekCloses = ordered.map(([, w]) => w.close);
  if (weekCloses.length >= 15) {
    let gains = 0, losses = 0;
    for (let i = 1; i <= 14; i++) {
      const d = weekCloses[i] - weekCloses[i - 1];
      if (d >= 0) gains += d; else losses -= d;
    }
    let avgG = gains / 14, avgL = losses / 14;
    for (let i = 15; i < weekCloses.length; i++) {
      const d = weekCloses[i] - weekCloses[i - 1];
      avgG = (avgG * 13 + Math.max(d, 0)) / 14;
      avgL = (avgL * 13 + Math.max(-d, 0)) / 14;
    }
    const rs = avgL === 0 ? 100 : avgG / avgL;
    rsi = 100 - 100 / (1 + rs);
  }

  return {
    close: latest.close,
    high: latest.high,
    low: latest.low,
    wowPct,
    avgVolume,
    supports,
    resistances,
    ema21,
    rsi,
  };
}

// ── Binance (primary) with CoinGecko/Yahoo fallback for Vercel edges Binance blocks ──
async function fetchBTC(): Promise<any | null> {
  // Try Binance first
  try {
    const [tickerRes, klineRes] = await Promise.all([
      fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', { signal: AbortSignal.timeout(6000) }),
      fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=200', { signal: AbortSignal.timeout(6000) }),
    ]);
    if (tickerRes.ok && klineRes.ok) {
      const ticker = await tickerRes.json();
      const klines: any[] = await klineRes.json();
      const price = parseFloat(ticker.price);
      const bars = klines.map((k: any) => ({
        date: new Date(k[0]).toISOString().slice(0, 10),
        close: parseFloat(k[4]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        volume: parseFloat(k[7]),
      }));
      return { price, derived: deriveWeekly(bars), bars };
    }
  } catch {}
  // Fallback: Yahoo BTC-USD (200 days)
  return fetchYahoo('BTC-USD', 200);
}

// ── Yahoo Finance: Gold / DXY (default 200 days for weekly RSI) ──
async function fetchYahoo(symbol: string, days = 200): Promise<any | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const from = now - days * 86400;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${from}&period2=${now}&interval=1d`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;
    const q = result.indicators?.quote?.[0] || {};
    const closes: number[] = q.close || [];
    const highs: number[] = q.high || [];
    const lows: number[] = q.low || [];
    const timestamps: number[] = result.timestamp || [];
    const bars = timestamps.map((ts: number, i: number) => ({
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      close: closes[i],
      high: highs[i],
      low: lows[i],
    })).filter((d: any) => d.close != null && d.high != null && d.low != null);
    if (!bars.length) return null;
    const price = bars[bars.length - 1].close;
    return { price, derived: deriveWeekly(bars), bars };
  } catch {
    return null;
  }
}

// ── Farside: BTC ETF flows ──
async function fetchETFFlows(): Promise<string> {
  try {
    const res = await fetch('https://farside.co.uk/btc/', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return 'ไม่สามารถดึงข้อมูล ETF flows ได้';
    const html = await res.text();
    const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    const lastRows = rows.slice(-6);
    const texts = lastRows.map((r) =>
      r.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    );
    return texts.join('\n') || 'ไม่พบข้อมูล ETF flows';
  } catch {
    return 'ไม่สามารถดึงข้อมูล ETF flows ได้';
  }
}

// ── News Headlines (multiple RSS sources) ──
async function fetchNewsHeadlines(): Promise<string> {
  const feeds: { label: string; url: string }[] = [
    { label: 'Crypto', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
    { label: 'Crypto 2', url: 'https://cointelegraph.com/rss' },
    { label: 'Markets', url: 'https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines' },
    { label: 'Economy', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories' },
  ];

  const allHeadlines: string[] = [];

  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      const res = await fetch(feed.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; USDFundFlowAI/1.0)' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      const xml = await res.text();
      // match both CDATA and plain title tags
      const titles = xml.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/gi) || [];
      const items = titles.slice(1, 8).map((t) =>
        t.replace(/<\/?title>/gi, '').replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim()
      ).filter((t) => t.length > 10);
      return items.length ? `[${feed.label}]\n${items.join('\n')}` : null;
    })
  );

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) allHeadlines.push(r.value);
  }

  return allHeadlines.join('\n\n') || 'ไม่สามารถดึงข่าวได้';
}

// Salvage a response the model cut off mid-array: drop the partial tail,
// then close whatever brackets are still open.
function repairTruncatedJson(s: string): string {
  let lastComplete = -1;
  let depth = 0;
  let inStr = false;
  let esc = false;
  const stack: string[] = [];

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{' || c === '[') { stack.push(c); depth++; }
    else if (c === '}' || c === ']') { stack.pop(); depth--; if (depth > 0) lastComplete = i; }
    else if (c === ',' && depth > 0) lastComplete = i - 1;
  }

  let out = lastComplete > 0 ? s.substring(0, lastComplete + 1) : s;

  // Recompute open brackets on the trimmed string and close them.
  const open: string[] = [];
  inStr = false;
  esc = false;
  for (let i = 0; i < out.length; i++) {
    const c = out[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{' || c === '[') open.push(c);
    else if (c === '}' || c === ']') open.pop();
  }
  if (inStr) out += '"';
  while (open.length) out += open.pop() === '{' ? '}' : ']';
  return out;
}

// ── AI Analysis ──
async function analyzeWithAI(rawData: {
  btc: any;
  gold: any;
  dxy: any;
  etfFlows: string;
  newsHeadlines: string;
  scenarios: KeyScenario[];
  calendar: string;
}): Promise<any> {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const thaiMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const monDay = monday.getDate();
  const sunDay = sunday.getDate();
  const month = thaiMonths[sunday.getMonth()];
  const yearBE = sunday.getFullYear() + 543;
  const weekLabel = `${monDay}–${sunDay} ${month} ${yearBE}`;

  const prompt = `วิเคราะห์ตลาด BTC/Gold/DXY สัปดาห์นี้ ตอบ JSON เท่านั้น

ข้อมูล (ส่งเฉพาะที่ AI ต้องใช้ ตัว bars 60 วันไม่ส่ง):
BTC: price=${rawData.btc?.price} derived=${JSON.stringify(rawData.btc?.derived)}
Gold: price=${rawData.gold?.price} derived=${JSON.stringify(rawData.gold?.derived)}
DXY: price=${rawData.dxy?.price} derived=${JSON.stringify(rawData.dxy?.derived)}
ETF: ${rawData.etfFlows.substring(0, 500)}
ข่าว: ${rawData.newsHeadlines.substring(0, 800)}

ปฏิทินเศรษฐกิจ 3 สัปดาห์ข้างหน้า (consensus จริง ใช้ค่านี้ในช่อง consensus):
${rawData.calendar}

Event สำคัญที่สุด พร้อมกรอบตัวเลขที่คำนวณไว้แล้ว ("ดี" = ฝั่ง dovish ดีต่อ Gold/BTC):
${rawData.scenarios.map((s, i) => `${i}. ${s.date} ${s.time} ${s.nameTh} | ${s.basis} | ${s.bands.map(b => `${b.label}: ${b.range}`).join(' / ')}`).join('\n')}

ตอบ JSON format นี้:
{
  "weekLabel": "${weekLabel}",
  "updatedISO": "${today.toISOString().slice(0, 10)}",
  "context": "สรุปภาพรวม 2 ประโยค ภาษาไทย",
  "sections": [
    {"id":1,"title":"BTC & ETF Flows","bullets":[{"label":"หัวข้อ","text":"รายละเอียด"}]},
    {"id":2,"title":"Gold, Fed & DXY","bullets":[...]},
    {"id":3,"title":"ภูมิรัฐศาสตร์ & ความเสี่ยง","bullets":[...]}
  ],
  "forwardEvents": [
    {"date":"DD เดือน พ.ศ.","time":"HH:MM น. ICT","event":"ชื่อ event","consensus":"ค่าที่ตลาดคาด","watch":"อธิบายว่าตัวชี้วัดนี้คืออะไร 1 บรรทัด\\n▸ ถ้าออก > X = ผลต่อ Fed/DXY/Gold/BTC\\n▸ ถ้าออกตรงคาด = ผล\\n▸ ถ้าออก < X = ผล\\n▸ เชื่อมโยงงวดก่อนหน้า"}
  ],
  "sources": [{"name":"ชื่อ","url":"URL","use":"ใช้ดูอะไร"}],
  "scenarioEffects": [
    {"good":"ผลถ้าออกกรอบดี 1 บรรทัด ระบุ Fed/DXY/Gold/BTC","normal":"ผลถ้าออกกรอบปกติ","bad":"ผลถ้าออกกรอบแย่"}
  ]
}

กฎ:
- scenarioEffects ต้องมีจำนวนและลำดับตรงกับรายการ "Event สำคัญที่สุด" ข้างบนทุกตัว ห้ามเปลี่ยนตัวเลขกรอบ เขียนเฉพาะผลกระทบ
- ช่อง consensus ใน forwardEvents ใช้ค่าจากปฏิทินเท่านั้น ถ้าไม่มีให้เขียน "—"
- ภาษาไทย | ปี พ.ศ. | เวลา ICT | ห้ามแนะนำลงทุน | ตัวเลขจากข้อมูลดิบเท่านั้น
- 3 sections x 3 bullets (text สั้น ไม่เกิน 25 คำ)
- forwardEvents 4 รายการ เรียงตามวันที่ — ทุกรายการต้องมี scenario 3 ทาง (สูงกว่าคาด / ตรงคาด / ต่ำกว่าคาด) พร้อมระบุผลต่อ Fed, DXY, Gold, BTC
- watch ใช้ \\n ขึ้นบรรทัด และ ▸ นำหน้าแต่ละ scenario
- sources 3 รายการ
- ตอบ JSON สมบูรณ์เท่านั้น ห้ามตัดกลางคัน`;

  const res = await fetch(`${KNPLAB_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${KNPLAB_API_KEY}`,
    },
    signal: AbortSignal.timeout(45000),
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a JSON API. Respond with ONLY valid JSON. No markdown.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 6000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`KNPLAB API error ${res.status}: ${errText}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content || '';

  let cleaned = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Extract JSON object if model returned extra text
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    return JSON.parse(repairTruncatedJson(cleaned.substring(cleaned.indexOf('{'))));
  }
}

export const config = {
  maxDuration: 60,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!KNPLAB_API_KEY) {
    return res.status(500).json({ error: 'KNPLAB_API_KEY not configured' });
  }

  const forceRefresh = req.query.refresh === 'true';

  if (!forceRefresh) {
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return res.status(200).json({
        ...cache.data,
        _cached: true,
        _cachedAt: new Date(cache.ts).toISOString(),
        _model: AI_MODEL,
      });
    }

    const fileCache = readFileCache();
    if (fileCache) {
      cache = fileCache;
      return res.status(200).json({
        ...fileCache.data,
        _cached: true,
        _cachedAt: new Date(fileCache.ts).toISOString(),
        _model: AI_MODEL,
      });
    }
  }

  try {
    if (!inFlight) {
      inFlight = (async () => {
        const [btc, gold, dxy, etfFlows, newsHeadlines] = await Promise.all([
          fetchBTC(),
          fetchYahoo('GC=F'),
          fetchYahoo('DX-Y.NYB'),
          fetchETFFlows(),
          fetchNewsHeadlines(),
        ]);
        const today = todayIct();
        const scenarios = keyScenarios(today);
        const calendar = calendarText(today, 21);
        const ai = await analyzeWithAI({ btc, gold, dxy, etfFlows, newsHeadlines, scenarios, calendar });
        const effects: any[] = Array.isArray(ai.scenarioEffects) ? ai.scenarioEffects : [];
        delete ai.scenarioEffects;
        const keyEvents = scenarios.map((s, i) => {
          const fx = effects[i] || {};
          const pick = (k: 'good' | 'normal' | 'bad') =>
            typeof fx[k] === 'string' && fx[k].trim() ? fx[k].trim() : FALLBACK_EFFECT[k];
          return {
            ...s,
            bands: [
              { ...s.bands[0], effect: pick('good') },
              { ...s.bands[1], effect: pick('normal') },
              { ...s.bands[2], effect: pick('bad') },
            ],
          };
        });
        const marketData = {
          btc: btc ? { price: btc.price, ...btc.derived } : null,
          gold: gold ? { price: gold.price, ...gold.derived } : null,
          dxy: dxy ? { price: dxy.price, ...dxy.derived } : null,
        };
        return { ...ai, marketData, keyEvents };
      })().finally(() => { inFlight = null; });
    }
    const analysis = await inFlight;

    cache = { data: analysis, ts: Date.now() };
    writeFileCache(analysis);

    return res.status(200).json({
      ...analysis,
      _cached: false,
      _model: AI_MODEL,
      _generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Weekly summary error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to generate summary',
      _model: AI_MODEL,
    });
  }
}
