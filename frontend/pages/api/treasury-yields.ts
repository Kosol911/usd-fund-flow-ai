import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';

const KNPLAB_API_KEY = process.env.KNPLAB_API_KEY || '';
const KNPLAB_BASE_URL = 'https://devmain.knplabai.com';
const AI_MODEL = process.env.BRIEF_AI_MODEL || 'deepseek-v4.1-flash';

let cache: { data: any; ts: number } | null = null;
let inFlight: Promise<any> | null = null;
const CACHE_TTL = 20 * 3600 * 1000; // 20 hours
const CACHE_FILE = '/tmp/usd-treasury-yields.json';

function readFileCache(): { data: any; ts: number } | null {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.ts && Date.now() - parsed.ts < CACHE_TTL) return parsed;
  } catch {}
  return null;
}
function writeFileCache(data: any) {
  try { fs.writeFileSync(CACHE_FILE, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

/* ── Yahoo Finance fetch with N-day history ── */
async function fetchYahooSeries(symbol: string, days: number = 35) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const from = now - days * 86400;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${from}&period2=${now}&interval=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const r = json?.chart?.result?.[0];
    if (!r) return null;
    const timestamps: number[] = r.timestamp || [];
    const closes: (number | null)[] = r.indicators?.quote?.[0]?.close || [];
    // Build daily series — filter nulls
    const bars: { date: string; close: number }[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] == null) continue;
      const d = new Date(timestamps[i] * 1000);
      bars.push({
        date: d.toISOString().slice(0, 10),
        close: closes[i] as number,
      });
    }
    if (bars.length === 0) return null;
    const latest = bars[bars.length - 1];
    const prev = bars.length >= 2 ? bars[bars.length - 2] : latest;
    // 1-week ago (~5 trading days)
    const w1 = bars.length >= 6 ? bars[bars.length - 6] : bars[0];
    // 1-month ago (~22 trading days)
    const m1 = bars.length >= 22 ? bars[bars.length - 22] : bars[0];
    return {
      latest: latest.close,
      latestDate: latest.date,
      prev: prev.close,
      change1d: latest.close - prev.close,
      change1dPct: ((latest.close - prev.close) / prev.close) * 100,
      week1Ago: w1.close,
      change1w: latest.close - w1.close,
      month1Ago: m1.close,
      change1m: latest.close - m1.close,
      bars, // full series for computation
    };
  } catch (e) {
    console.error(`Yahoo ${symbol} failed:`, e);
    return null;
  }
}

/* ── Repair truncated JSON from AI ── */
function repairTruncatedJson(s: string): string {
  let lastComplete = -1;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') { depth--; if (depth > 0) lastComplete = i; }
    else if (c === ',' && depth > 0) lastComplete = i - 1;
  }
  let out = lastComplete > 0 ? s.substring(0, lastComplete + 1) : s;
  const open: string[] = [];
  inStr = false; esc = false;
  for (let i = 0; i < out.length; i++) {
    const c = out[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{' || c === '[') open.push(c);
    else if (c === '}' || c === ']') open.pop();
  }
  if (inStr) out += '"';
  while (open.length) out += open.pop() === '{' ? '}' : ']';
  return out;
}

/* ── Fetch all market data in parallel ── */
async function fetchAllData() {
  const [y5, y10, y30, dxy, gold, btc, spx, ndx] = await Promise.all([
    fetchYahooSeries('%5EFVX'),   // 5Y yield
    fetchYahooSeries('%5ETNX'),   // 10Y yield
    fetchYahooSeries('%5ETYX'),   // 30Y yield
    fetchYahooSeries('DX-Y.NYB'), // DXY
    fetchYahooSeries('GC=F'),     // Gold
    fetchYahooSeries('BTC-USD'),  // BTC
    fetchYahooSeries('%5EGSPC'),  // S&P 500
    fetchYahooSeries('%5EIXIC'),  // Nasdaq
  ]);

  // Compute spreads
  const spread10y5y = (y10 && y5) ? {
    latest: +(y10.latest - y5.latest).toFixed(3),
    change1d: +(y10.change1d - y5.change1d).toFixed(3),
    change1w: +(y10.change1w - y5.change1w).toFixed(3),
  } : null;

  const spread10y30y = (y10 && y30) ? {
    latest10y: y10.latest,
    latest30y: y30.latest,
    spread: +(y30.latest - y10.latest).toFixed(3),
  } : null;

  return {
    yields: { y5, y10, y30 },
    spread10y5y,
    spread10y30y,
    context: { dxy, gold, btc, spx, ndx },
  };
}

/* ── Build prompt for KNPLAB AI ── */
function buildPrompt(data: Awaited<ReturnType<typeof fetchAllData>>) {
  const { yields, spread10y5y, context } = data;
  const { y5, y10, y30 } = yields;
  const { dxy, gold, btc, spx, ndx } = context;

  const now = new Date();
  const ict = new Date(now.getTime() + 7 * 3600 * 1000);
  const thaiMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const dayLabel = `${ict.getUTCDate()} ${thaiMonths[ict.getUTCMonth()]} ${ict.getUTCFullYear() + 543}`;

  function fmtYield(name: string, d: any) {
    if (!d) return `${name}: ไม่พร้อม`;
    return `${name}: ${d.latest.toFixed(3)}% (1d: ${d.change1d >= 0 ? '+' : ''}${(d.change1d * 100).toFixed(1)} bps, 1w: ${d.change1w >= 0 ? '+' : ''}${(d.change1w * 100).toFixed(1)} bps, 1m: ${d.change1m >= 0 ? '+' : ''}${(d.change1m * 100).toFixed(1)} bps)`;
  }
  function fmtAsset(name: string, d: any) {
    if (!d) return `${name}: ไม่พร้อม`;
    return `${name}: ${d.latest.toFixed(2)} (1d: ${d.change1dPct >= 0 ? '+' : ''}${d.change1dPct.toFixed(2)}%, 1w: ${((d.latest - d.week1Ago) / d.week1Ago * 100).toFixed(2)}%)`;
  }

  const systemPrompt = `คุณเป็น Global Macro & Cross-Asset Analyst ผู้เชี่ยวชาญด้านพันธบัตรรัฐบาลสหรัฐฯ ค่าเงินดอลลาร์ Bitcoin ทองคำ และตลาดหุ้นสหรัฐฯ

## กรอบวิเคราะห์ Yield–USD (ห้ามเบี่ยงเบนจากกรอบนี้)

หลักสำคัญ: อย่าดูแค่ว่า Yield ขึ้นหรือลง ให้ถามว่า "เปลี่ยนเพราะอะไร" และ "USD ยืนยันหรือขัดแย้งกับภาพนั้น"

### สาเหตุที่ Yield เปลี่ยน:
- ขึ้นเพราะเศรษฐกิจแข็งแรง → หุ้นบางกลุ่มยังขึ้นได้
- ขึ้นเพราะเงินเฟ้อสูงกว่าคาด → มักกดดัน BTC และหุ้น; ทองขึ้นกับ Real Yield
- ขึ้นเพราะ Term Premium/อุปทานพันธบัตร → มักไม่เอื้อต่อหุ้นมูลค่าแพง
- ลงเพราะเงินเฟ้อชะลอแต่เศรษฐกิจยังดี → เอื้อ BTC หุ้น ทอง
- ลงเพราะกลัวถดถอย → หุ้นและ BTC อาจลง; ทองได้แรงหนุน

### จับคู่ Yield กับ USD (4 ภาพ):
- Yield↑/USD↑ = ภาวะการเงินตึงขึ้น → BTC/หุ้นถูกกดดัน
- Yield↓/USD↓ = ผ่อนคลาย → BTC/หุ้นมักได้แรงหนุน
- Yield↓/USD↑ = หาความปลอดภัยหรือดอลลาร์ขาดแคลน → ระวังลดความเสี่ยง
- Yield↑/USD↓ = สัญญาณผสม อาจเกี่ยวกับเงินเฟ้อหรือ Term Premium

### Logic รายสินทรัพย์:
- BTC: ต้นทุนเงิน + ความต้องการรับความเสี่ยง + ETF flows (ไม่ใช่สินทรัพย์ปลอดภัยเสมอ)
- GOLD: Real Yield + USD + ความต้องการป้องกันความเสี่ยง + แรงซื้อธนาคารกลาง
- S&P 500: กำไรบริษัท vs อัตราคิดลด
- Nasdaq: ไวต่อดอกเบี้ยมากกว่า แต่ดูกำไรร่วมด้วย

### กฎวิเคราะห์:
- แยก Correlation ออกจาก Causation
- ห้ามสรุปว่า "Yield ขึ้น สินทรัพย์เสี่ยงต้องลง" เสมอ
- พิจารณาว่าข่าวตลาดรับรู้ไปแล้วมากน้อยเพียงใด
- ห้ามกำหนดราคาเป้าหมายหรือความน่าจะเป็นโดยไม่มีวิธีรองรับ
- ข้อมูลต่างตลาดอาจมีเวลาอัปเดตไม่ตรงกัน ต้องแจ้งข้อจำกัด
- แสดง Yield เป็น basis points (bps) โดย 1 bps = 0.01%
- ห้ามสร้างตัวเลขขึ้นเอง ใช้จากข้อมูลดิบเท่านั้น
- แยกข้อเท็จจริง สมมติฐาน และข้อวิเคราะห์ให้ชัดเจน
- ไม่รับประกันผลตอบแทน นำเสนอเป็นการวิเคราะห์เพื่อการศึกษา

You are a JSON API. Respond with ONLY valid JSON. No text before or after. No markdown. Start with { and end with }.`;

  const userPrompt = `วันนี้คือ: ${dayLabel}

## ข้อมูลดิบ US Treasury Yields (จาก Yahoo Finance — ข้อมูลรายวัน อาจล่าช้ากว่าราคาตลาด)

${fmtYield('5Y Yield (^FVX)', y5)}
${fmtYield('10Y Yield (^TNX)', y10)}
${fmtYield('30Y Yield (^TYX)', y30)}
${spread10y5y ? `Spread 10Y−5Y: ${(spread10y5y.latest * 100).toFixed(1)} bps (1d: ${spread10y5y.change1d >= 0 ? '+' : ''}${(spread10y5y.change1d * 100).toFixed(1)} bps, 1w: ${spread10y5y.change1w >= 0 ? '+' : ''}${(spread10y5y.change1w * 100).toFixed(1)} bps)` : 'Spread: ไม่พร้อม'}

## ข้อมูลบริบท (Yahoo Finance)

${fmtAsset('DXY', dxy)}
${fmtAsset('Gold (XAU/USD)', gold)}
${fmtAsset('BTC/USD', btc)}
${fmtAsset('S&P 500', spx)}
${fmtAsset('Nasdaq', ndx)}

## หมายเหตุ
- ข้อมูล 2Y Yield ไม่มีจาก Yahoo Finance (ไม่มี ticker ^TWO หรือเทียบเท่า) ให้ใช้ 5Y เป็น proxy สำหรับด้านสั้นของ curve
- Real Yield (TIPS) ไม่มีข้อมูลโดยตรง ให้วิเคราะห์จากภาพรวม Nominal Yield ร่วมกับบริบทเงินเฟ้อ
- ข้อมูลจาก Yahoo Finance เป็นราคาปิดรายวัน ไม่ใช่ราคาสดระหว่างวัน

## คำสั่ง

วิเคราะห์ตามกรอบ Yield–USD ข้างต้น แล้วตอบ JSON ตาม format นี้:

{
  "summary": ["บรรทัด 1 (ภาพรวม Yield + USD)", "บรรทัด 2 (สาเหตุหลักที่ Yield เปลี่ยน)", "บรรทัด 3 (จับคู่ Yield/USD เป็นภาพไหน)", "บรรทัด 4 (ผลกระทบหลักต่อสินทรัพย์)", "บรรทัด 5 (ระบุสิ่งที่ยังไม่ชัดเจน/ข้อจำกัด)"],
  "keyDataTable": [
    {"variable": "ชื่อตัวแปร", "value": "ค่าล่าสุด", "change": "เปลี่ยนจากช่วงไหน +/- bps หรือ %", "meaning": "ความหมายสั้นๆ"}
  ],
  "mechanism": "อธิบายกลไกเป็นลำดับ: ข้อมูลเศรษฐกิจ → คาดการณ์ Fed → Yield/USD → สินทรัพย์ (3-5 ประโยค)",
  "impactTable": [
    {"asset": "BTC", "bullish": "ปัจจัยหนุน", "bearish": "ปัจจัยกดดัน", "netView": "มุมมองสุทธิ", "confidence": "สูง|ปานกลาง|ต่ำ"},
    {"asset": "Gold", "bullish": "...", "bearish": "...", "netView": "...", "confidence": "..."},
    {"asset": "S&P 500", "bullish": "...", "bearish": "...", "netView": "...", "confidence": "..."},
    {"asset": "Nasdaq", "bullish": "...", "bearish": "...", "netView": "...", "confidence": "..."}
  ],
  "shortTerm": "วิเคราะห์ 1–5 วัน (2-3 ประโยค)",
  "mediumTerm": "วิเคราะห์ 1–3 เดือน (2-3 ประโยค)",
  "scenarios": {
    "base": {"title": "ชื่อสั้น", "description": "รายละเอียด", "trigger": "เงื่อนไขที่ทำให้เกิด", "invalidation": "สิ่งที่ทำให้ใช้ไม่ได้"},
    "riskOn": {"title": "ชื่อสั้น", "description": "...", "trigger": "...", "invalidation": "..."},
    "riskOff": {"title": "ชื่อสั้น", "description": "...", "trigger": "...", "invalidation": "..."}
  },
  "watchNext": [
    {"event": "ชื่อเหตุการณ์/ข้อมูล", "date": "วันที่หรือช่วงเวลา", "why": "ทำไมสำคัญ"}
  ],
  "yieldUsdQuadrant": "tighten|ease|flight_to_safety|mixed",
  "curveSignal": "steepening|flattening|stable",
  "limitations": "ข้อจำกัดของข้อมูล เช่น ไม่มี 2Y, ไม่มี Real Yield, ETF flow ไม่ได้ดึง"
}

## กฎเหล็ก
- ทุกข้อความเป็นภาษาไทย (ศัพท์การเงินคงอังกฤษได้)
- ห้ามแต่งตัวเลขราคา ใช้จากข้อมูลดิบเท่านั้น
- Yield ต้องแสดงเป็น bps (basis points)
- ห้ามมีคำแนะนำลงทุนหรือราคาเป้าหมาย
- ตอบ JSON เท่านั้น`;

  return { systemPrompt, userPrompt };
}

/* ── Call KNPLAB AI ── */
async function analyzeYields(data: Awaited<ReturnType<typeof fetchAllData>>) {
  const { systemPrompt, userPrompt } = buildPrompt(data);

  const res = await fetch(`${KNPLAB_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${KNPLAB_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
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
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
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

export const config = { maxDuration: 60 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!KNPLAB_API_KEY) {
    return res.status(500).json({ error: 'KNPLAB_API_KEY not configured' });
  }

  const forceRefresh = req.query.refresh === 'true';

  if (!forceRefresh) {
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return res.status(200).json({ ...cache.data, _cached: true, _model: AI_MODEL });
    }
    const fc = readFileCache();
    if (fc) {
      cache = fc;
      return res.status(200).json({ ...fc.data, _cached: true, _model: AI_MODEL });
    }
  }

  try {
    if (!inFlight) {
      inFlight = (async () => {
        const marketData = await fetchAllData();
        const ai = await analyzeYields(marketData);
        return { ai, marketData };
      })().finally(() => { inFlight = null; });
    }
    const { ai, marketData } = await inFlight;

    const now = new Date();
    const ict = new Date(now.getTime() + 7 * 3600 * 1000);
    const thaiMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
      'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    const hh = String(ict.getUTCHours()).padStart(2, '0');
    const mm = String(ict.getUTCMinutes()).padStart(2, '0');

    // Flatten yield data for frontend
    const { yields, spread10y5y, context } = marketData;
    const yieldSnapshot: Record<string, any> = {};
    if (yields.y5) yieldSnapshot.y5 = { value: yields.y5.latest, change1d: yields.y5.change1d, change1w: yields.y5.change1w, change1m: yields.y5.change1m };
    if (yields.y10) yieldSnapshot.y10 = { value: yields.y10.latest, change1d: yields.y10.change1d, change1w: yields.y10.change1w, change1m: yields.y10.change1m };
    if (yields.y30) yieldSnapshot.y30 = { value: yields.y30.latest, change1d: yields.y30.change1d, change1w: yields.y30.change1w, change1m: yields.y30.change1m };

    const result = {
      dateLabel: `${ict.getUTCDate()} ${thaiMonths[ict.getUTCMonth()]} ${ict.getUTCFullYear() + 543}`,
      updatedTime: `${hh}:${mm} น. ICT`,
      updatedISO: now.toISOString(),
      yieldSnapshot,
      spread10y5y,
      contextSnapshot: {
        dxy: context.dxy ? { value: context.dxy.latest, change1dPct: context.dxy.change1dPct } : null,
        gold: context.gold ? { value: context.gold.latest, change1dPct: context.gold.change1dPct } : null,
        btc: context.btc ? { value: context.btc.latest, change1dPct: context.btc.change1dPct } : null,
        spx: context.spx ? { value: context.spx.latest, change1dPct: context.spx.change1dPct } : null,
        ndx: context.ndx ? { value: context.ndx.latest, change1dPct: context.ndx.change1dPct } : null,
      },
      // AI analysis
      ...ai,
      _model: AI_MODEL,
    };

    const payload = { data: result, ts: Date.now() };
    cache = payload;
    writeFileCache(result);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('Treasury yields error:', err);
    // Serve stale cache on error
    const stale = cache || readFileCache();
    if (stale) {
      return res.status(200).json({ ...stale.data, _cached: true, _stale: true, _model: AI_MODEL });
    }
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
