import type { NextApiRequest, NextApiResponse } from 'next';

const KNPLAB_API_KEY = process.env.KNPLAB_API_KEY || '';
const KNPLAB_BASE_URL = 'https://devmain.knplabai.com';
const AI_MODEL = process.env.WEEKLY_AI_MODEL || 'deepseek-v4-flash';

let cache: { data: any; ts: number } | null = null;
const CACHE_TTL = 4 * 3600 * 1000; // 4 hours

async function fetchBTC24h() {
  try {
    const [tickerRes, klineRes] = await Promise.all([
      fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT'),
      fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=24'),
    ]);
    if (!tickerRes.ok || !klineRes.ok) return null;
    const ticker = await tickerRes.json();
    const klines: any[] = await klineRes.json();
    return {
      price: parseFloat(ticker.lastPrice),
      change24h: parseFloat(ticker.priceChangePercent),
      high24h: parseFloat(ticker.highPrice),
      low24h: parseFloat(ticker.lowPrice),
      volume24h: parseFloat(ticker.quoteVolume),
      hourlyCandles: klines.map((k: any) => ({
        time: new Date(k[0]).toISOString(),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      })),
    };
  } catch {
    return null;
  }
}

async function fetchGoldDXY(symbol: string) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const from = now - 5 * 86400;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${from}&period2=${now}&interval=1d`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;
    const closes: number[] = result.indicators?.quote?.[0]?.close || [];
    const opens: number[] = result.indicators?.quote?.[0]?.open || [];
    const highs: number[] = result.indicators?.quote?.[0]?.high || [];
    const lows: number[] = result.indicators?.quote?.[0]?.low || [];
    const valid = closes.filter((c: any) => c != null);
    if (valid.length < 1) return null;
    const price = valid[valid.length - 1];
    const prevClose = valid.length >= 2 ? valid[valid.length - 2] : price;
    const change1d = ((price - prevClose) / prevClose) * 100;
    return {
      price,
      change1d,
      high: highs[highs.length - 1],
      low: lows[lows.length - 1],
      prevClose,
    };
  } catch {
    return null;
  }
}

async function fetchNewsHeadlines(): Promise<string> {
  const feeds = [
    { label: 'Crypto', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
    { label: 'Markets', url: 'https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines' },
  ];
  const all: string[] = [];
  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      const res = await fetch(feed.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; USDFundFlowAI/1.0)' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      const xml = await res.text();
      const titles = xml.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/gi) || [];
      const items = titles.slice(1, 6).map((t) =>
        t.replace(/<\/?title>/gi, '').replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim()
      ).filter((t) => t.length > 10);
      return items.length ? `[${feed.label}]\n${items.join('\n')}` : null;
    })
  );
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) all.push(r.value);
  }
  return all.join('\n\n') || 'ไม่สามารถดึงข่าวได้';
}

async function analyzeDaily(rawData: { btc: any; gold: any; dxy: any; news: string }) {
  const now = new Date();
  const ict = new Date(now.getTime() + 7 * 3600 * 1000);
  const thaiMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const dayLabel = `${ict.getUTCDate()} ${thaiMonths[ict.getUTCMonth()]} ${ict.getUTCFullYear() + 543}`;

  const prompt = `คุณเป็นนักวิเคราะห์ macro finance ระดับสูง วิเคราะห์ข้อมูลราคา BTC และ Gold วันนี้แล้วสร้าง JSON สำหรับ daily dashboard

## ข้อมูลดิบ

### BTC (Binance 24h)
${JSON.stringify(rawData.btc, null, 2)}

### Gold - XAUUSD (Yahoo Finance)
${JSON.stringify(rawData.gold, null, 2)}

### DXY (Yahoo Finance)
${JSON.stringify(rawData.dxy, null, 2)}

### ข่าวล่าสุด
${rawData.news}

## คำสั่ง

สร้าง JSON ตาม format นี้ (ตอบ JSON เท่านั้น ไม่ต้อง markdown ไม่ต้อง code fence):

{
  "dateLabel": "${dayLabel}",
  "updatedISO": "${now.toISOString().slice(0, 10)}",
  "updatedTime": "HH:MM น. ICT",
  "btc": {
    "price": ราคาล่าสุด (number),
    "change24h": % เปลี่ยนแปลง 24 ชม. (number),
    "high24h": จุดสูงสุด 24 ชม. (number),
    "low24h": จุดต่ำสุด 24 ชม. (number),
    "sentiment": "bullish" | "bearish" | "neutral",
    "keyDriver": "ปัจจัยขับเคลื่อนหลักของวัน 1 ประโยค ภาษาไทย",
    "outlook": "มุมมองระยะสั้น 1-2 ประโยค ภาษาไทย"
  },
  "gold": {
    "price": ราคาล่าสุด (number),
    "change1d": % เปลี่ยนแปลง 1 วัน (number),
    "high": จุดสูงสุดวัน (number),
    "low": จุดต่ำสุดวัน (number),
    "sentiment": "bullish" | "bearish" | "neutral",
    "keyDriver": "ปัจจัยขับเคลื่อนหลักของวัน 1 ประโยค ภาษาไทย",
    "outlook": "มุมมองระยะสั้น 1-2 ประโยค ภาษาไทย"
  },
  "dxy": {
    "price": ราคาล่าสุด (number),
    "change1d": % เปลี่ยนแปลง 1 วัน (number)
  },
  "correlation": "อธิบายความสัมพันธ์ BTC/Gold/DXY วันนี้ 1-2 ประโยค ภาษาไทย",
  "headlines": [
    "ข่าวสำคัญที่สุด 3-5 ข่าวที่กระทบ BTC/Gold วันนี้ ภาษาไทย สั้นๆ"
  ],
  "riskLevel": "low" | "medium" | "high"
}

## กฎ
- ทุกข้อความ user-facing ต้องเป็นภาษาไทย
- ตัวเลขทุกตัวต้องมาจากข้อมูลดิบที่ให้ไป ห้ามสร้างขึ้นเอง
- เวลาแสดงเป็น ICT (UTC+7) เสมอ
- ปี พ.ศ. (ค.ศ. + 543)
- ห้ามมีคำแนะนำลงทุน ราคาเป้าหมาย หรือเทคนิคอล
- headlines ต้องเป็นข่าวจริงจากข้อมูลที่ให้ ห้ามแต่งเอง`;

  const res = await fetch(`${KNPLAB_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${KNPLAB_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a JSON API. You MUST respond with ONLY valid JSON. No text before or after. No markdown. Start with { and end with }.',
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
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!KNPLAB_API_KEY) {
    return res.status(500).json({ error: 'KNPLAB_API_KEY not configured' });
  }

  const forceRefresh = req.query.refresh === 'true';

  if (cache && !forceRefresh && Date.now() - cache.ts < CACHE_TTL) {
    return res.status(200).json({
      ...cache.data,
      _cached: true,
      _cachedAt: new Date(cache.ts).toISOString(),
      _model: AI_MODEL,
    });
  }

  try {
    const [btc, gold, dxy, news] = await Promise.all([
      fetchBTC24h(),
      fetchGoldDXY('GC=F'),
      fetchGoldDXY('DX-Y.NYB'),
      fetchNewsHeadlines(),
    ]);

    const rawData = { btc, gold, dxy, news };

    let analysis: any;
    let lastErr: any;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        analysis = await analyzeDaily(rawData);
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (!analysis) throw lastErr;

    cache = { data: analysis, ts: Date.now() };

    return res.status(200).json({
      ...analysis,
      _cached: false,
      _model: AI_MODEL,
      _generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Daily summary error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to generate daily summary',
      _model: AI_MODEL,
    });
  }
}
