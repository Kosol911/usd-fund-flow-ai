import type { NextApiRequest, NextApiResponse } from 'next';

const KNPLAB_API_KEY = process.env.KNPLAB_API_KEY || '';
const KNPLAB_BASE_URL = 'https://devmain.knplabai.com';
const AI_MODEL = process.env.WEEKLY_AI_MODEL || 'deepseek-v4-flash';

let cache: { data: any; ts: number } | null = null;
const CACHE_TTL = 7 * 24 * 3600 * 1000; // 7 days

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
    });
    if (!res.ok) return 'ไม่สามารถดึงข้อมูล ETF flows ได้';
    const html = await res.text();
    const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    const lastRows = rows.slice(-10);
    const texts = lastRows.map((r) =>
      r.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    );
    return texts.join('\n') || 'ไม่พบข้อมูล ETF flows';
  } catch {
    return 'ไม่สามารถดึงข้อมูล ETF flows ได้';
  }
}

// ── AI Analysis ──
async function analyzeWithAI(rawData: {
  btc: any;
  gold: any;
  dxy: any;
  etfFlows: string;
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

  const prompt = `คุณเป็นนักวิเคราะห์ macro finance ระดับสูง วิเคราะห์ข้อมูลตลาดสัปดาห์นี้แล้วสร้าง JSON สำหรับ dashboard

## ข้อมูลดิบ

### BTC (Binance)
${JSON.stringify(rawData.btc, null, 2)}

### Gold - XAUUSD (Yahoo Finance)
${JSON.stringify(rawData.gold, null, 2)}

### DXY (Yahoo Finance)
${JSON.stringify(rawData.dxy, null, 2)}

### BTC ETF Flows (Farside)
${rawData.etfFlows}

## คำสั่ง

สร้าง JSON ตาม format นี้ (ตอบ JSON เท่านั้น ไม่ต้อง markdown ไม่ต้อง code fence):

{
  "weekLabel": "${weekLabel}",
  "updatedISO": "${today.toISOString().slice(0, 10)}",
  "context": "สรุปภาพรวม 2-3 ประโยค ภาษาไทย เชื่อมโยง BTC/Gold/DXY/ETF เข้าด้วยกัน",
  "sections": [
    {
      "id": 1,
      "title": "กระแสเงินทุน ETF และความต้องการลงทุน",
      "bullets": [
        { "label": "หัวข้อย่อย", "text": "รายละเอียด", "sub": "หมายเหตุเพิ่มเติม (optional)" }
      ]
    },
    {
      "id": 2,
      "title": "นโยบาย Fed, เงินเฟ้อ, ดอลลาร์ และ Bond Yield",
      "bullets": [...]
    },
    {
      "id": 3,
      "title": "สถานการณ์ภูมิรัฐศาสตร์ / ความเสี่ยงตลาด",
      "bullets": [...]
    },
    {
      "id": 4,
      "title": "ปัจจัยเฉพาะ Bitcoin",
      "bullets": [...]
    },
    {
      "id": 5,
      "title": "ปัจจัยเฉพาะทองคำ",
      "bullets": [...]
    }
  ],
  "forwardEvents": [
    {
      "date": "DD เดือน ปี พ.ศ.",
      "time": "HH:MM น. ICT",
      "event": "ชื่อ event",
      "consensus": "ค่าที่ตลาดคาด (ถ้ามี)",
      "watch": "วิเคราะห์ว่าจะส่งผลอย่างไร ใช้ \\n สำหรับขึ้นบรรทัดใหม่ และ ▸ สำหรับ bullet"
    }
  ],
  "sources": [
    { "name": "ชื่อแหล่ง", "url": "URL", "use": "ใช้ดูอะไร" }
  ]
}

## กฎ
- ทุกข้อความ user-facing ต้องเป็นภาษาไทย
- ตัวเลขทุกตัวต้องมาจากข้อมูลดิบที่ให้ไป ห้ามสร้างขึ้นเอง
- แต่ละ section ต้องมี 3-6 bullets
- forwardEvents ต้องมี 3-5 events สำคัญใน 2-3 สัปดาห์ข้างหน้า
  - เชื่อมโยงข้อมูลสัปดาห์นี้กับ outlook เช่น "ETF flow +$2B สัปดาห์นี้ ถ้า PCE ออกต่ำกว่าคาด flow อาจเร่งขึ้นอีก"
  - ใส่ scenario analysis: ถ้า > X จะเกิด Y / ถ้า < X จะเกิด Z
  - watch field ใช้ \\n สำหรับขึ้นบรรทัดใหม่ และ ▸ นำหน้า scenario
- sources ใส่ 5-6 แหล่งที่ใช้จริง
- ใส่ปี พ.ศ. (ค.ศ. + 543)
- เวลาแสดงเป็น ICT (UTC+7) เสมอ
- ห้ามมีคำแนะนำลงทุน ราคาเป้าหมาย หรือเทคนิคอล`;

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
          content: 'You are a JSON API. You MUST respond with ONLY valid JSON. No text before or after the JSON. No markdown. No explanation. Start your response with { and end with }.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 16000,
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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
    const [btc, gold, dxy, etfFlows] = await Promise.all([
      fetchBTC(),
      fetchYahoo('GC=F'),
      fetchYahoo('DX-Y.NYB'),
      fetchETFFlows(),
    ]);

    const rawData = { btc, gold, dxy, etfFlows };

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
