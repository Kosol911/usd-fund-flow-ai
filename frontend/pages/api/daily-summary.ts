import type { NextApiRequest, NextApiResponse } from 'next';

const KNPLAB_API_KEY = process.env.KNPLAB_API_KEY || '';
const KNPLAB_BASE_URL = 'https://devmain.knplabai.com';
const AI_MODEL = process.env.WEEKLY_AI_MODEL || 'deepseek-v4-flash';

let cache: { data: any; ts: number } | null = null;
const CACHE_TTL = 4 * 3600 * 1000; // 4 hours

async function fetchBTC24h() {
  try {
    const tickerRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT', {
      signal: AbortSignal.timeout(10000),
    });
    if (!tickerRes.ok) throw new Error(`Binance 24hr: ${tickerRes.status}`);
    const ticker = await tickerRes.json();
    return {
      price: parseFloat(ticker.lastPrice),
      change24h: parseFloat(ticker.priceChangePercent),
      high24h: parseFloat(ticker.highPrice),
      low24h: parseFloat(ticker.lowPrice),
      volume24h: parseFloat(ticker.quoteVolume),
    };
  } catch {
    try {
      const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return null;
      const json = await res.json();
      return { price: parseFloat(json.price), change24h: 0, high24h: 0, low24h: 0, volume24h: 0 };
    } catch {
      return null;
    }
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

วันนี้คือ: ${dayLabel}

## ข้อมูลดิบ

### BTC (Binance 24h)
${rawData.btc ? JSON.stringify(rawData.btc, null, 2) : 'ข้อมูล BTC ไม่พร้อมใช้งาน — ถ้าไม่มีข้อมูลให้ใส่ null ใน btc field'}

### Gold - XAUUSD (Yahoo Finance)
${rawData.gold ? JSON.stringify(rawData.gold, null, 2) : 'ข้อมูล Gold ไม่พร้อมใช้งาน'}

### DXY (Yahoo Finance)
${rawData.dxy ? JSON.stringify(rawData.dxy, null, 2) : 'ข้อมูล DXY ไม่พร้อมใช้งาน'}

### ข่าวล่าสุด
${rawData.news}

## คำสั่ง

สร้าง JSON ตาม format นี้เท่านั้น (ตอบ JSON เท่านั้น ไม่ต้อง markdown ไม่ต้อง code fence):

- ถ้าข้อมูล BTC ไม่พร้อม → ใส่ "btc": null
- ถ้าข้อมูล Gold ไม่พร้อม → ใส่ "gold": null
- ห้ามตอบ error object หรือโครงสร้างอื่น ต้องตอบ format นี้เสมอ

{
  "btc": {
    "sentiment": "bullish" | "bearish" | "neutral",
    "keyDriver": "ปัจจัยขับเคลื่อนหลักของวัน 1 ประโยค ภาษาไทย",
    "outlook": "มุมมองระยะสั้น 1-2 ประโยค ภาษาไทย"
  },
  "gold": {
    "sentiment": "bullish" | "bearish" | "neutral",
    "keyDriver": "ปัจจัยขับเคลื่อนหลักของวัน 1 ประโยค ภาษาไทย",
    "outlook": "มุมมองระยะสั้น 1-2 ประโยค ภาษาไทย"
  },
  "correlation": "อธิบายความสัมพันธ์ BTC/Gold/DXY วันนี้ 1-2 ประโยค ภาษาไทย",
  "headlines": [
    "ข่าวสำคัญที่สุด 3-5 ข่าวที่กระทบ BTC/Gold วันนี้ ภาษาไทย สั้นๆ"
  ],
  "riskLevel": "low" | "medium" | "high"
}

## กฎ
- ทุกข้อความ user-facing ต้องเป็นภาษาไทย
- ตัวเลขราคาจะถูกเพิ่มเข้าไปในตัว response ที่ฝั่ง server อย่าใส่ตัวเลขราคาเอง
- เวลาแสดงเป็น ICT (UTC+7) เสมอ
- ปี พ.ศ. (ค.ศ. + 543)
- ห้ามมีคำแนะนำลงทุน ราคาเป้าหมาย หรือเทคนิคอล
- headlines ต้องเป็นข่าวจริงจากข้อมูลที่ให้ ห้ามแต่งเอง
- ห้ามตอบเป็น error/missing_data object ต้องตอบ format ข้างบนเท่านั้น`;

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

    let ai: any;
    let lastErr: any;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        ai = await analyzeDaily(rawData);
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (!ai) throw lastErr;

    const now = new Date();
    const ict = new Date(now.getTime() + 7 * 3600 * 1000);
    const thaiMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
      'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    const hh = String(ict.getUTCHours()).padStart(2, '0');
    const mm = String(ict.getUTCMinutes()).padStart(2, '0');

    const result: any = {
      dateLabel: `${ict.getUTCDate()} ${thaiMonths[ict.getUTCMonth()]} ${ict.getUTCFullYear() + 543}`,
      updatedISO: now.toISOString().slice(0, 10),
      updatedTime: `${hh}:${mm} น. ICT`,
      btc: btc ? {
        price: btc.price,
        change24h: btc.change24h,
        high24h: btc.high24h,
        low24h: btc.low24h,
        sentiment: ai.btc?.sentiment || 'neutral',
        keyDriver: ai.btc?.keyDriver || 'ไม่มีข้อมูลเพียงพอ',
        outlook: ai.btc?.outlook || 'รอข้อมูลเพิ่มเติม',
      } : null,
      gold: gold ? {
        price: gold.price,
        change1d: gold.change1d,
        high: gold.high,
        low: gold.low,
        sentiment: ai.gold?.sentiment || 'neutral',
        keyDriver: ai.gold?.keyDriver || 'ไม่มีข้อมูลเพียงพอ',
        outlook: ai.gold?.outlook || 'รอข้อมูลเพิ่มเติม',
      } : null,
      dxy: dxy ? { price: dxy.price, change1d: dxy.change1d } : { price: 0, change1d: 0 },
      correlation: ai.correlation || '',
      headlines: ai.headlines || [],
      riskLevel: ai.riskLevel || 'medium',
    };

    cache = { data: result, ts: Date.now() };

    return res.status(200).json({
      ...result,
      _cached: false,
      _model: AI_MODEL,
      _generatedAt: now.toISOString(),
    });
  } catch (err: any) {
    console.error('Daily summary error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to generate daily summary',
      _model: AI_MODEL,
    });
  }
}
