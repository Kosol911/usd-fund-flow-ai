import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';

const KNPLAB_API_KEY = process.env.KNPLAB_API_KEY || '';
const KNPLAB_BASE_URL = 'https://devmain.knplabai.com';
const AI_MODEL = process.env.KNPLAB_AI_MODEL || 'deepseek-v4.1-flash';

let cache: { data: any; ts: number } | null = null;
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

// ── Binance: BTC price ──
async function fetchBTC(): Promise<{ price: number; change7d: number } | null> {
  try {
    const [tickerRes, klineRes] = await Promise.all([
      fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT'),
      fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=8'),
    ]);
    if (!tickerRes.ok || !klineRes.ok) return null;
    const ticker = await tickerRes.json();
    const klines: any[] = await klineRes.json();
    const price = parseFloat(ticker.price);
    const openPrice7d = parseFloat(klines[0]?.[1] || '0');
    const change7d = openPrice7d ? ((price - openPrice7d) / openPrice7d) * 100 : 0;
    const dailyCloses = klines.map((k: any) => ({
      date: new Date(k[0]).toISOString().slice(0, 10),
      close: parseFloat(k[4]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      volume: parseFloat(k[5]),
    }));
    return { price, change7d, ...{ dailyCloses } };
  } catch {
    return null;
  }
}

// ── Yahoo Finance: Gold / DXY ──
async function fetchYahoo(symbol: string): Promise<{ price: number; change5d: number } | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const from = now - 10 * 86400;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${from}&period2=${now}&interval=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;
    const closes: number[] = result.indicators?.quote?.[0]?.close || [];
    const timestamps: number[] = result.timestamp || [];
    const validCloses = closes.filter((c: any) => c != null);
    if (validCloses.length < 2) return null;
    const price = validCloses[validCloses.length - 1];
    const price5dAgo = validCloses.length >= 6 ? validCloses[validCloses.length - 6] : validCloses[0];
    const change5d = ((price - price5dAgo) / price5dAgo) * 100;
    const dailyData = timestamps.map((ts: number, i: number) => ({
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      close: closes[i],
    })).filter((d: any) => d.close != null);
    return { price, change5d, ...{ dailyData } };
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

// ── AI Analysis ──
async function analyzeWithAI(rawData: {
  btc: any;
  gold: any;
  dxy: any;
  etfFlows: string;
  newsHeadlines: string;
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

ข้อมูล: BTC=${JSON.stringify(rawData.btc)} | Gold=${JSON.stringify(rawData.gold)} | DXY=${JSON.stringify(rawData.dxy)}
ETF: ${rawData.etfFlows.substring(0, 500)}
ข่าว: ${rawData.newsHeadlines.substring(0, 800)}

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
    {"date":"DD เดือน พ.ศ.","time":"HH:MM น. ICT","event":"ชื่อ","consensus":"ค่าคาด","watch":"วิเคราะห์สั้น 1-2 บรรทัด ▸ scenario"}
  ],
  "sources": [{"name":"ชื่อ","url":"URL","use":"ใช้ดูอะไร"}]
}

กฎ: ภาษาไทย | 3 sections x 3-4 bullets | forwardEvents 3-5 รายการ | sources 3-4 | ปี พ.ศ. | เวลา ICT | ห้ามแนะนำลงทุน | ตัวเลขจากข้อมูลดิบเท่านั้น`;

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
      max_tokens: 4000,
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

  return JSON.parse(cleaned);
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

  // Check caches first (both browser and cron requests)
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

  // Only generate new data when explicitly requested (cron job)
  if (!forceRefresh) {
    return res.status(200).json({
      error: 'no_cache',
      message: 'ยังไม่มีข้อมูลสัปดาห์ รอ cron generate',
      _model: AI_MODEL,
    });
  }

  try {
    const [btc, gold, dxy, etfFlows, newsHeadlines] = await Promise.all([
      fetchBTC(),
      fetchYahoo('GC=F'),
      fetchYahoo('DX-Y.NYB'),
      fetchETFFlows(),
      fetchNewsHeadlines(),
    ]);

    const rawData = { btc, gold, dxy, etfFlows, newsHeadlines };

    let analysis: any;
    let lastErr: any;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        analysis = await analyzeWithAI(rawData);
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (!analysis) throw lastErr;

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
