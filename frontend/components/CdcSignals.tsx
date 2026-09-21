// CDC Action Zone + Weekly Price Summary — BTC & Gold Daily (EMA12/EMA26)
// Dynamic data: prices, H/L, % WoW, RSI, Fear&Greed, DXY, US10Y, correlation — fetched on load
// Static notes: key events + support/resistance — update WEEKLY_NOTES every Saturday

import { useEffect, useState } from 'react';

// ─── STATIC WEEKLY NOTES (update every Saturday) ──────────────────────────────
const WEEKLY_NOTES = {
  weekLabel: '14–20 กันยายน 2569',
  btc: {
    events: [
      'Fed hike 16 ก.ย. → DXY แข็ง → BTC ร่วง -5% ในคืน hike',
      'ฟื้นตัวกลับ +9% ใน 3 วัน (short squeeze + ETF inflow)',
      'CLARITY Act ตกวุฒิสภา — outflow -$450M วันเดียว ก่อนฟื้น',
      'On-chain: Exchange outflow สุทธิ +18,400 BTC',
    ],
    support: ['~$80,500 (EMA21W)', '~$76,000 (แนวรับหลัก)'],
    resistance: ['~$83,500 (weekly high)', '~$90,000 (ATH zone)'],
  },
  gold: {
    events: [
      'Fed hike กดดัน real yield → Gold ร่วงแตะต่ำสุด 6 สัปดาห์',
      'DXY แข็งระยะสั้น จากนั้นอ่อนค่า → Gold เด้งกลับ +2%',
      'Central bank buying ยังต่อเนื่อง — Poland นำ +20t ปีนี้',
    ],
    support: ['~$4,300 (EMA21D)', '~$4,150 (แนวรับสำคัญ)'],
    resistance: ['~$4,420 (weekly high)'],
  },
  watchNext: [
    {
      date: '~26 ก.ย. 2569',
      time: '19:30 น. ICT',
      event: 'PCE ส.ค.',
      consensus: '3.7% YoY',
      detail:
        'PCE (Personal Consumption Expenditures) คือตัวชี้วัดเงินเฟ้อหลักที่ Fed ใช้กำหนดนโยบายดอกเบี้ย — แม่นกว่า CPI เพราะวัดจากฝั่งต้นทุนจริงของผู้บริโภค\n' +
        '▸ > 3.7% = แรงกดดัน hike ต่อ 28 ต.ค. ทันที → real yield เพิ่ม → Gold ร่วง, BTC ปรับลงตาม risk-off\n' +
        '▸ ≤ 3.4% = ตลาด re-price hike odds ลด → DXY อ่อน → หนุน Gold และ BTC ฟื้น\n' +
        '▸ เป็น "ก้าวแรก" กำหนด positioning ก่อน NFP และ FOMC 28 ต.ค.',
    },
    {
      date: '~2 ต.ค. 2569',
      time: '19:30 น. ICT',
      event: 'NFP ก.ย.',
      consensus: '162K',
      detail:
        'NFP (Nonfarm Payrolls) คือตัวชี้วัดตลาดแรงงานที่ Fed ใช้ควบคู่ PCE — ตลาดแรงงาน "ร้อน" = Fed ต้อง hike ต่อ\n' +
        '▸ > 200K = ร้อนเกิน → hike ต.ค. odds พุ่ง → กดดัน BTC + Gold ระยะสั้น\n' +
        '▸ 120–160K = ใกล้คาด ตลาดรอ PCE ยืนยัน\n' +
        '▸ < 100K = ตลาดแรงงานชะลอ → Fed อาจ hold → risk-on กลับมา\n' +
        '▸ ดูควบคู่: Unemployment Rate (consensus 4.2%) + Avg Hourly Earnings (ชี้เงินเฟ้อ service-side)',
    },
    {
      date: 'ต่อเนื่อง',
      time: '—',
      event: 'CFTC / SEC Crypto Rulemaking',
      consensus: undefined,
      detail:
        'หลัง CLARITY Act ล้มเหลว ทำเนียบขาวผลักดัน CFTC มีอำนาจกำกับ spot crypto ผ่าน Executive Order ทางเลือก\n' +
        '▸ EO ออกภายใน 2–3 สัปดาห์ = regulatory clarity แม้ไม่ใช่กฎหมาย → BTC ETF demand ฟื้น\n' +
        '▸ SEC ออก Guidance เรื่อง crypto custody = หนุน institutional confidence\n' +
        '▸ ไม่มีอะไรออกมา = CLARITY Act failure ยังกดดัน sentiment ต่อเนื่อง\n' +
        '▸ ติดตาม: crypto.news · SEC.gov daily filing · White House briefing',
    },
    {
      date: 'ต่อเนื่อง',
      time: '—',
      event: 'DXY Trajectory หลัง Fed hike',
      consensus: undefined,
      detail:
        'DXY (US Dollar Index) เป็น inverse ของ Gold + BTC ระยะกลาง — หลัง hike 16 ก.ย. DXY พุ่งสั้นแล้วอ่อนผิดปกติ บ่งชี้ตลาดอาจมองว่า Fed ใกล้สิ้นสุด cycle\n' +
        '▸ DXY < 102 = เงื่อนไขดี Gold ทดสอบ ATH ใหม่ + BTC ได้แรงหนุน\n' +
        '▸ DXY > 104 = real yield กดดัน → Gold มีแรงเทขาย ระวัง\n' +
        '▸ ตัวชี้วัดที่ต้องดู: US10Y yield movement, PCE surprise, Fed speech ก่อน blackout (21 ต.ค.–28 ต.ค.)',
    },
    {
      date: '28 ต.ค. 2569',
      time: '01:00 น. ICT (29 ต.ค.)',
      event: 'FOMC (ไม่มี Dot Plot)',
      consensus: 'hike 43.2% · hold 49.6%',
      detail:
        'ครั้งนี้ไม่มี SEP / Dot Plot — ตลาดฟังเฉพาะ statement + แถลงข่าว Powell หาก hike กับ hold "ใกล้เคียงกัน" (43% vs 50%) นับว่า tension สูงมาก\n' +
        '▸ hike + Powell ส่งสัญญาณยังขึ้นต่อ = real yield พุ่ง → Gold ร่วงสั้น แต่ถ้าเป็น "last hike" ตลาดอาจ sell-news-buy-dip ใน 24–48 ชม.\n' +
        '▸ hold + พูดถึง data-dependency = risk-on กลับมา → Gold + BTC ฟื้น\n' +
        '▸ PCE 26 ก.ย. และ NFP 2 ต.ค. จะกำหนดว่า odds เอียงไปทางใดก่อนประชุม',
    },
  ],
};
// ─────────────────────────────────────────────────────────────────────────────

interface WeeklyStat {
  open: number | null;
  close: number | null;
  high: number | null;
  low: number | null;
  pct_wow: number | null;
  volume_avg_daily_usd: number | null;
}

interface CdcAsset {
  asset: string;
  price: number | null;
  ema12: number | null;
  ema26: number | null;
  zone: number | null;
  label: string;
  color: string;
  last_zone_change_days_ago: number | null;
  history: { idx: number; close: number; ema12: number; ema26: number; zone: number; label: string; color: string }[];
  weekly: WeeklyStat | null;
  rsi_14: number | null;
  fetched_utc: string;
  error: string | null;
}

interface CdcContext {
  fear_greed: { value: number; label: string } | null;
  dxy: { close: number; pct_wow: number | null } | null;
  us10y: { close: number; change_bps: number } | null;
  btc_gold_corr_4w: number | null;
}

interface CdcResponse {
  btc: CdcAsset;
  gold: CdcAsset;
  context: CdcContext;
  timeframe: string;
  ema_periods: number[];
}

const ZONE_COLORS: Record<number, string> = {
  1: '#4ADE80', 2: '#86EFAC', 3: '#FB923C', 4: '#F87171',
};
const ZONE_BG: Record<number, string> = {
  1: 'border-green-500/40 bg-green-500/5',
  2: 'border-emerald-400/40 bg-emerald-500/5',
  3: 'border-orange-500/40 bg-orange-500/5',
  4: 'border-red-500/40 bg-red-500/5',
};
const ZONE_EMOJI: Record<number, string> = { 1: '▲▲', 2: '▲', 3: '▼', 4: '▼▼' };

function f(v: number | null | undefined, dec = 2): string {
  if (v === null || v === undefined) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fVol(v: number | null): string {
  if (!v) return '—';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B/day`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M/day`;
  return `$${v.toFixed(0)}`;
}

function PctBadge({ v }: { v: number | null }) {
  if (v === null || v === undefined) return <span className="text-gray-500">—</span>;
  const pos = v >= 0;
  return (
    <span className={`font-mono font-bold text-sm ${pos ? 'text-green-400' : 'text-red-400'}`}>
      {pos ? '+' : ''}{v.toFixed(2)}%
    </span>
  );
}

function RsiBadge({ v }: { v: number | null }) {
  if (v === null) return <span className="text-gray-500 font-mono">—</span>;
  const color = v >= 70 ? '#F87171' : v <= 30 ? '#4ADE80' : '#FBBF24';
  const label = v >= 70 ? 'Overbought' : v <= 30 ? 'Oversold' : 'Neutral';
  return (
    <span className="font-mono font-bold text-sm" style={{ color }}>
      {v} <span className="text-xs font-normal text-gray-500">({label})</span>
    </span>
  );
}

function AssetCard({
  data,
  ticker,
  notes,
}: {
  data: CdcAsset;
  ticker: string;
  notes: { events: string[]; support: string[]; resistance: string[] };
}) {
  const zone = data.zone ?? 0;
  const bgClass = ZONE_BG[zone] || 'border-gray-700/40 bg-gray-800/20';
  const w = data.weekly;

  return (
    <div className={`rounded-xl border p-4 ${bgClass}`}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-lg font-bold text-white">{ticker}</span>
        <div className="flex items-center gap-2">
          {/* Zone pills */}
          {[1, 2, 3, 4].map((z) => (
            <div
              key={z}
              className="w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center"
              style={{
                backgroundColor: z === zone ? ZONE_COLORS[z] : 'transparent',
                border: `1.5px solid ${z === zone ? ZONE_COLORS[z] : '#374151'}`,
                color: z === zone ? '#000' : '#6B7280',
                opacity: z === zone ? 1 : 0.5,
              }}
            >
              {z}
            </div>
          ))}
        </div>
      </div>

      {/* ── Zone badge ── */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-700/40">
        <span className="text-3xl font-black font-mono" style={{ color: data.color }}>
          {ZONE_EMOJI[zone] || '?'}
        </span>
        <div>
          <div className="text-base font-bold" style={{ color: data.color }}>
            Zone {zone} — {data.label}
          </div>
          <div className="text-[11px] text-gray-500">
            {data.last_zone_change_days_ago !== null
              ? `เปลี่ยน zone ${data.last_zone_change_days_ago === 0 ? 'วันนี้' : `${data.last_zone_change_days_ago} วันที่แล้ว`}`
              : 'ข้อมูลย้อนหลังไม่พอ'}
            {' · '}EMA(12,26) D1
          </div>
        </div>
      </div>

      {/* ── Weekly price summary ── */}
      <div className="mb-3">
        <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 font-semibold">
          ราคา (สัปดาห์ที่ผ่านมา)
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">ราคาปิด</span>
            <span className="font-mono font-bold text-white">{f(data.price)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">% สัปดาห์</span>
            <PctBadge v={w?.pct_wow ?? null} />
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">High</span>
            <span className="font-mono text-gray-200">{f(w?.high ?? null)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Low</span>
            <span className="font-mono text-gray-200">{f(w?.low ?? null)}</span>
          </div>
          {w?.volume_avg_daily_usd && (
            <div className="flex justify-between col-span-2">
              <span className="text-gray-400">Volume avg</span>
              <span className="font-mono text-gray-300">{fVol(w.volume_avg_daily_usd)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── EMA levels ── */}
      <div className="mb-3 space-y-1">
        {[
          { label: 'EMA 12', v: data.ema12, color: '#38BDF8' },
          { label: 'EMA 26', v: data.ema26, color: '#FBBF24' },
        ].map((row) => (
          <div key={row.label} className="flex justify-between text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: row.color }} />
              <span className="text-gray-400">{row.label}</span>
            </span>
            <span className="font-mono font-semibold" style={{ color: row.color }}>{f(row.v)}</span>
          </div>
        ))}
        {data.price && data.ema12 && (
          <div className="text-[11px] text-gray-500 mt-1">
            ราคา{data.price > data.ema12 ? 'สูงกว่า' : 'ต่ำกว่า'} EMA12{' '}
            <span className="font-mono" style={{ color: data.color }}>
              {f(Math.abs(((data.price - data.ema12) / data.ema12) * 100), 2)}%
            </span>
          </div>
        )}
      </div>

      {/* ── RSI ── */}
      <div className="flex items-center justify-between text-xs mb-3 pb-3 border-b border-gray-700/40">
        <span className="text-gray-400">RSI (14) D1</span>
        <RsiBadge v={data.rsi_14} />
      </div>

      {/* ── Key events (static) ── */}
      <div className="mb-3">
        <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 font-semibold">
          เหตุการณ์สำคัญสัปดาห์นี้
        </div>
        <ul className="space-y-1">
          {notes.events.map((e, i) => (
            <li key={i} className="text-xs text-gray-300 flex gap-1.5">
              <span className="text-gray-600 shrink-0 mt-0.5">•</span>
              <span>{e}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Technical levels (static) ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] text-green-400/70 uppercase tracking-wide mb-1 font-semibold">แนวรับ</div>
          {notes.support.map((s, i) => (
            <div key={i} className="text-xs text-gray-400 font-mono">{s}</div>
          ))}
        </div>
        <div>
          <div className="text-[10px] text-red-400/70 uppercase tracking-wide mb-1 font-semibold">แนวต้าน</div>
          {notes.resistance.map((r, i) => (
            <div key={i} className="text-xs text-gray-400 font-mono">{r}</div>
          ))}
        </div>
      </div>

      {/* ── History strip ── */}
      {data.history.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700/40">
          <div className="text-[10px] text-gray-600 mb-1">CDC Zone ย้อนหลัง 10 วัน (ขวา = ล่าสุด)</div>
          <div className="flex gap-0.5">
            {data.history.map((h, i) => (
              <div
                key={i}
                className="flex-1 h-2.5 rounded-sm"
                style={{ backgroundColor: h.color, opacity: 0.5 + i * 0.05 }}
                title={`Zone ${h.zone}: ${h.label} | ${f(h.close)}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CdcSignals() {
  const [data, setData] = useState<CdcResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/cdc');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: CdcResponse = await res.json();
      setData(json);
      setFetchedAt(new Date().toLocaleTimeString('th-TH', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok',
      }));
    } catch (e: any) {
      setError(e.message || 'โหลดไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const ctx = data?.context;
  const fgColor = ctx?.fear_greed
    ? ctx.fear_greed.value >= 75 ? '#F87171'
      : ctx.fear_greed.value >= 55 ? '#FBBF24'
      : ctx.fear_greed.value >= 45 ? '#94A3B8'
      : ctx.fear_greed.value >= 25 ? '#86EFAC'
      : '#4ADE80'
    : '#6B7280';

  return (
    <div className="card p-6 mb-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <h2 className="text-2xl font-bold text-highlight">
          CDC Action Zone — BTC & Gold
        </h2>
        <div className="flex items-center gap-2">
          {fetchedAt && <span className="text-xs text-gray-600 font-mono">อัปเดต {fetchedAt} ICT</span>}
          <button
            onClick={load}
            disabled={loading}
            className="text-xs bg-sky-800/40 hover:bg-sky-700/50 disabled:opacity-40 text-sky-300 px-3 py-1 rounded-lg border border-sky-700/40 transition-colors"
          >
            {loading ? 'กำลังโหลด…' : '↻ รีเฟรช'}
          </button>
        </div>
      </div>
      <p className="text-sm text-orange-300/80 font-semibold mb-1">สัปดาห์ที่ {WEEKLY_NOTES.weekLabel}</p>

      {/* ── Zone legend ── */}
      <div className="flex flex-wrap gap-3 text-xs mb-5">
        {[
          { z: 1, label: 'Zone 1 Strong Buy', color: '#4ADE80', cond: 'ราคา > EMA12 > EMA26' },
          { z: 2, label: 'Zone 2 Buy',        color: '#86EFAC', cond: 'EMA12 > ราคา > EMA26' },
          { z: 3, label: 'Zone 3 Sell',       color: '#FB923C', cond: 'ราคา > EMA12, EMA12 < EMA26' },
          { z: 4, label: 'Zone 4 Strong Sell',color: '#F87171', cond: 'EMA12 < EMA26, ราคา < EMA12' },
        ].map((row) => (
          <div key={row.z} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: row.color }} />
            <span style={{ color: row.color }} className="font-semibold">{row.label}</span>
            <span className="text-gray-600 hidden sm:inline">— {row.cond}</span>
          </div>
        ))}
      </div>

      {loading && (
        <div className="text-gray-400 text-center py-8 text-sm">กำลังดึงราคาและคำนวณ EMA…</div>
      )}
      {error && (
        <div className="text-red-400 text-sm bg-red-900/20 border border-red-800/30 rounded-lg px-4 py-3 mb-4">
          ⚠️ {error} — ลองกด ↻ รีเฟรช
        </div>
      )}

      {data && !loading && (
        <>
          {/* ── Asset cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <AssetCard data={data.btc} ticker="₿ Bitcoin (BTC)" notes={WEEKLY_NOTES.btc} />
            <AssetCard data={data.gold} ticker="🥇 Gold (XAU/USD)" notes={WEEKLY_NOTES.gold} />
          </div>

          {/* ── Macro context strip ── */}
          <div className="rounded-xl border border-gray-700/40 bg-gray-800/20 p-4 mb-4">
            <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-3 font-semibold">
              🌐 Macro Context
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
              <div>
                <div className="text-[10px] text-gray-500 mb-0.5">Fed Rate (IORB)</div>
                <div className="font-mono font-bold text-blue-300">3.90%</div>
                <div className="text-[10px] text-gray-600">3.75–4.00% target</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 mb-0.5">DXY</div>
                {ctx?.dxy ? (
                  <>
                    <div className="font-mono font-bold text-white">{f(ctx.dxy.close, 3)}</div>
                    <div className="text-[10px]">
                      <PctBadge v={ctx.dxy.pct_wow} />
                      <span className="text-gray-600 ml-1">WoW</span>
                    </div>
                  </>
                ) : (
                  <div className="font-mono text-gray-500">—</div>
                )}
              </div>
              <div>
                <div className="text-[10px] text-gray-500 mb-0.5">US 10Y Yield</div>
                {ctx?.us10y ? (
                  <>
                    <div className="font-mono font-bold text-white">{f(ctx.us10y.close, 3)}%</div>
                    <div className="text-[10px] text-gray-500">
                      {ctx.us10y.change_bps > 0 ? '+' : ''}{ctx.us10y.change_bps} bps WoW
                    </div>
                  </>
                ) : (
                  <div className="font-mono text-gray-500">—</div>
                )}
              </div>
              <div>
                <div className="text-[10px] text-gray-500 mb-0.5">Fear & Greed</div>
                {ctx?.fear_greed ? (
                  <>
                    <div className="font-mono font-bold text-xl" style={{ color: fgColor }}>
                      {ctx.fear_greed.value}
                    </div>
                    <div className="text-[10px]" style={{ color: fgColor }}>{ctx.fear_greed.label}</div>
                  </>
                ) : (
                  <div className="font-mono text-gray-500">—</div>
                )}
              </div>
            </div>

            {/* Correlation */}
            {ctx?.btc_gold_corr_4w !== null && ctx?.btc_gold_corr_4w !== undefined && (
              <div className="flex items-center gap-2 text-xs border-t border-gray-700/40 pt-2 mb-2">
                <span className="text-gray-400">🔗 BTC × Gold Correlation (4W):</span>
                <span className="font-mono font-bold text-white">{ctx.btc_gold_corr_4w.toFixed(2)}</span>
                <span className="text-gray-500">
                  {Math.abs(ctx.btc_gold_corr_4w) < 0.3
                    ? '— อ่อน ทั้งคู่เดินอิสระ'
                    : Math.abs(ctx.btc_gold_corr_4w) < 0.6
                    ? '— ปานกลาง'
                    : '— แข็ง เดินไปทิศทางเดียวกัน'}
                </span>
              </div>
            )}

            {/* Section 07: คาดการณ์ปัจจัยสำคัญ 3 สัปดาห์ข้างหน้า */}
            <div className="border-t border-gray-700/40 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[20px] font-black bg-amber-800/60 text-amber-300 px-2 py-0.5 rounded font-mono leading-none">07</span>
                <div>
                  <span className="text-[18px] font-black text-amber-200 leading-tight block">คาดการณ์ปัจจัยสำคัญ 3 สัปดาห์ข้างหน้า</span>
                  <span className="text-xs text-gray-600">(ไม่ทำนายราคา)</span>
                </div>
              </div>
              <div className="space-y-3">
                {WEEKLY_NOTES.watchNext.map((w, i) => (
                  <div key={i} className="rounded-lg bg-amber-900/10 border border-amber-800/25 p-3">
                    {/* Date + time + event header */}
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-[18px] font-mono text-amber-400 shrink-0 leading-none">{w.date}</span>
                      {w.time !== '—' && (
                        <span className="text-sm font-mono text-gray-500 bg-gray-800/60 px-2 py-0.5 rounded shrink-0 leading-none">
                          🕐 {w.time}
                        </span>
                      )}
                      <span className="text-[20px] font-black text-white leading-none">{w.event}</span>
                      {w.consensus && (
                        <span className="text-sm text-gray-400 bg-gray-800/50 px-2 py-0.5 rounded">
                          consensus: {w.consensus}
                        </span>
                      )}
                    </div>
                    {/* Expanded detail — split by \n for multi-line */}
                    <div className="space-y-0.5 pl-1">
                      {w.detail.split('\n').map((line, li) => (
                        <div
                          key={li}
                          className={`text-[18px] leading-relaxed ${
                            line.startsWith('▸')
                              ? 'text-gray-400 pl-2'
                              : 'text-gray-300'
                          }`}
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <p className="text-[10px] text-gray-600">
        BTC: CoinGecko · Gold/DXY/US10Y: stooq.com · Fear&Greed: alternative.me ·
        Cache 30 นาที · ไม่ใช่คำแนะนำลงทุน
      </p>
    </div>
  );
}
