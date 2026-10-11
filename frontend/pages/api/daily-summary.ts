import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';

const KNPLAB_API_KEY = process.env.KNPLAB_API_KEY || '';
const KNPLAB_BASE_URL = 'https://devmain.knplabai.com';
const BRIEF_MODEL = process.env.BRIEF_AI_MODEL || 'claude-sonnet-5-5';

let cache: { data: any; ts: number } | null = null;
const CACHE_TTL = 20 * 3600 * 1000; // 20 hours — generate once per day
const CACHE_FILE = '/tmp/usd-daily-summary.json';

function readFileCache(): { data: any; ts: number } | null {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.ts && Date.now() - parsed.ts < CACHE_TTL) return parsed;
  } catch {}
  return null;
}

function writeFileCache(data: any) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

async function fetchBTC24h() {
  // Try Binance first
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const tickerRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT', {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    clearTimeout(timer);
    if (tickerRes.ok) {
      const ticker = await tickerRes.json();
      return {
        price: parseFloat(ticker.lastPrice),
        change24h: parseFloat(ticker.priceChangePercent),
        high24h: parseFloat(ticker.highPrice),
        low24h: parseFloat(ticker.lowPrice),
        volume24h: parseFloat(ticker.quoteVolume),
      };
    }
  } catch (e) {
    console.error('Binance 24hr failed:', e);
  }
  // Fallback: CoinGecko
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false', {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    clearTimeout(timer);
    if (res.ok) {
      const json = await res.json();
      const md = json.market_data;
      return {
        price: md?.current_price?.usd ?? 0,
        change24h: md?.price_change_percentage_24h ?? 0,
        high24h: md?.high_24h?.usd ?? 0,
        low24h: md?.low_24h?.usd ?? 0,
        volume24h: md?.total_volume?.usd ?? 0,
      };
    }
  } catch (e) {
    console.error('CoinGecko BTC failed:', e);
  }
  // Fallback: Yahoo Finance BTC-USD
  try {
    const now = Math.floor(Date.now() / 1000);
    const from = now - 3 * 86400;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?period1=${from}&period2=${now}&interval=1d`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    clearTimeout(timer);
    if (res.ok) {
      const json = await res.json();
      const result = json?.chart?.result?.[0];
      const closes: number[] = result?.indicators?.quote?.[0]?.close || [];
      const highs: number[] = result?.indicators?.quote?.[0]?.high || [];
      const lows: number[] = result?.indicators?.quote?.[0]?.low || [];
      const valid = closes.filter((c: any) => c != null);
      if (valid.length >= 1) {
        const price = valid[valid.length - 1];
        const prev = valid.length >= 2 ? valid[valid.length - 2] : price;
        return {
          price,
          change24h: ((price - prev) / prev) * 100,
          high24h: highs[highs.length - 1] ?? price,
          low24h: lows[lows.length - 1] ?? price,
          volume24h: 0,
        };
      }
    }
  } catch (e) {
    console.error('Yahoo BTC failed:', e);
  }
  return null;
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

async function analyzeDaily(rawData: { btc: any; gold: any; dxy: any; us10y: any; news: string }) {
  const now = new Date();
  const ict = new Date(now.getTime() + 7 * 3600 * 1000);
  const thaiMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const dayLabel = `${ict.getUTCDate()} ${thaiMonths[ict.getUTCMonth()]} ${ict.getUTCFullYear() + 543}`;

  const prompt = `คุณเป็นนักวิเคราะห์ตลาด macro finance ระดับสูง เขียนรายงาน Gold & Bitcoin Morning Brief เป็นภาษาไทย

วันนี้คือ: ${dayLabel}

## ข้อมูลดิบ (ดึงจาก API แล้ว ห้ามแต่งตัวเลขเอง)

### BTC (Binance 24h)
${rawData.btc ? JSON.stringify(rawData.btc, null, 2) : 'ไม่พร้อม'}

### Gold - XAUUSD (Yahoo Finance)
${rawData.gold ? JSON.stringify(rawData.gold, null, 2) : 'ไม่พร้อม'}

### DXY (Yahoo Finance)
${rawData.dxy ? JSON.stringify(rawData.dxy, null, 2) : 'ไม่พร้อม'}

### US 10Y Treasury Yield
${rawData.us10y ? JSON.stringify(rawData.us10y, null, 2) : 'ไม่พร้อม'}

### ข่าวล่าสุด (RSS feeds)
${rawData.news}

## คำสั่ง

วิเคราะห์ข้อมูลข้างต้นแล้วตอบเป็น JSON ตาม format ด้านล่าง:

{
  "tldr": ["bullet 1 สั้น 15-20 คำ", "bullet 2", "bullet 3", "ประโยคสรุปภาพรวมตลาด"],
  "catalyst48h": ["ไทม์ไลน์เหตุการณ์ที่กระทบ 48 ชม. เรียงตามเวลา 3-5 บรรทัด"],
  "goldAnalysis": {
    "whatHappened": "เกิดอะไรกับทองคำ 2-3 ประโยค เน้นข่าว→กลไก→ราคา",
    "whyMatters": "ทำไมถึงสำคัญ 2-3 ประโยค",
    "direction": "เชิงบวก|เชิงลบ|ผันผวน",
    "confidence": "สูง|ปานกลาง|ต่ำ"
  },
  "btcAnalysis": {
    "whatHappened": "เกิดอะไรกับ BTC 2-3 ประโยค เน้น ETF flows, สภาพคล่อง, กฎระเบียบ",
    "whyMatters": "ทำไมถึงสำคัญ 2-3 ประโยค",
    "direction": "เชิงบวก|เชิงลบ|ผันผวน",
    "confidence": "สูง|ปานกลาง|ต่ำ"
  },
  "crossAsset": "เปรียบเทียบว่าทำไมทองกับ BTC ตอบ macro ต่างกัน 2-3 ประโยค",
  "watchList": [
    {"time": "เวลา ICT", "event": "ชื่อเหตุการณ์", "why": "ทำไมสำคัญ สั้นๆ"}
  ],
  "triggerLevels": {
    "goldBull": "ระดับราคาทอง bullish trigger",
    "goldBear": "ระดับราคาทอง bearish trigger",
    "btcBull": "ระดับราคา BTC bullish trigger",
    "btcBear": "ระดับราคา BTC bearish trigger"
  },
  "riskLevel": "low|medium|high",
  "limitations": "ข้อจำกัดของข้อมูล เช่น ETF flow ไม่มี, Fed odds ไม่ได้ดึง"
}

## กฎเหล็ก
- ทุกข้อความต้องเป็นภาษาไทย (ศัพท์การเงินคงอังกฤษได้)
- ห้ามแต่งตัวเลขราคา ใช้ตัวเลขจากข้อมูลดิบเท่านั้น
- ถ้าข้อมูลไม่พอ ให้ระบุข้อจำกัดใน limitations
- ห้ามมีคำแนะนำลงทุน ราคาเป้าหมาย
- headlines ต้องอิงข่าวจริงจาก RSS ห้ามแต่งเอง
- เวลา ICT (UTC+7) เสมอ · ปี พ.ศ.
- triggerLevels เป็นระดับราคา support/resistance สำคัญที่เห็นจากข้อมูล ไม่ใช่คำแนะนำ
- ตอบ JSON เท่านั้น ห้าม markdown ห้าม code fence`;

  const res = await fetch(`${KNPLAB_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${KNPLAB_API_KEY}`,
    },
    body: JSON.stringify({
      model: BRIEF_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a JSON API. You MUST respond with ONLY valid JSON. No text before or after. No markdown. Start with { and end with }.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
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

  // Check in-memory cache first
  if (cache && !forceRefresh && Date.now() - cache.ts < CACHE_TTL) {
    return res.status(200).json({
      ...cache.data,
      _cached: true,
      _cachedAt: new Date(cache.ts).toISOString(),
      _model: BRIEF_MODEL,
    });
  }

  // Check file cache (survives cold starts)
  if (!forceRefresh) {
    const fileCache = readFileCache();
    if (fileCache) {
      cache = fileCache;
      return res.status(200).json({
        ...fileCache.data,
        _cached: true,
        _cachedAt: new Date(fileCache.ts).toISOString(),
        _model: BRIEF_MODEL,
      });
    }
  }

  try {
    const [btc, gold, dxy, us10y, news] = await Promise.all([
      fetchBTC24h(),
      fetchGoldDXY('GC=F'),
      fetchGoldDXY('DX-Y.NYB'),
      fetchGoldDXY('%5ETNX'),
      fetchNewsHeadlines(),
    ]);

    const rawData = { btc, gold, dxy, us10y, news };

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
      snapshot: {
        btc: btc ? { price: btc.price, change24h: btc.change24h, high24h: btc.high24h, low24h: btc.low24h } : null,
        gold: gold ? { price: gold.price, change1d: gold.change1d, high: gold.high, low: gold.low } : null,
        dxy: dxy ? { price: dxy.price, change1d: dxy.change1d } : null,
        us10y: us10y ? { price: us10y.price, change1d: us10y.change1d } : null,
      },
      tldr: ai.tldr || [],
      catalyst48h: ai.catalyst48h || [],
      goldAnalysis: ai.goldAnalysis || { whatHappened: '', whyMatters: '', direction: 'ผันผวน', confidence: 'ต่ำ' },
      btcAnalysis: ai.btcAnalysis || { whatHappened: '', whyMatters: '', direction: 'ผันผวน', confidence: 'ต่ำ' },
      crossAsset: ai.crossAsset || '',
      watchList: ai.watchList || [],
      triggerLevels: ai.triggerLevels || {},
      riskLevel: ai.riskLevel || 'medium',
      limitations: ai.limitations || '',
    };

    cache = { data: result, ts: Date.now() };
    writeFileCache(result);

    return res.status(200).json({
      ...result,
      _cached: false,
      _model: BRIEF_MODEL,
      _generatedAt: now.toISOString(),
    });
  } catch (err: any) {
    console.error('Daily summary error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to generate daily summary',
      _model: BRIEF_MODEL,
    });
  }
}
