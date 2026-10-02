import { useState, useEffect } from 'react';

interface SectionItem {
  id: number;
  title: string;
  bullets: { label?: string; text: string; sub?: string }[];
}

interface ForwardEvent {
  date: string;
  time?: string;
  event: string;
  consensus?: string;
  watch: string;
}

interface SourceItem {
  name: string;
  url: string;
  use: string;
}

interface WeeklyData {
  weekLabel: string;       // e.g. '14–20 กันยายน 2569'
  updatedISO: string;      // ISO date of Saturday update
  context: string;         // 2-3 sentence intro
  sections: SectionItem[];
  forwardEvents: ForwardEvent[];
  sources: SourceItem[];
}

const WEEKLY_DATA: WeeklyData = {
  weekLabel: '21–27 กันยายน 2569',
  updatedISO: '2026-09-27',
  context:
    'สัปดาห์นี้ BTC พุ่งแรงจาก $81K → $84.5K (+4.3% WoW) ด้วยแรงซื้อ ETF มหาศาล +$2,385.8M ใน 5 วัน — มากสุดในรอบหลายเดือน ขณะที่ Gold ร่วง -2.1% สู่ ~$4,285/oz จากแรงกดดัน rate hike expectations ที่เพิ่มขึ้น DXY แข็งค่าต่อเนื่องแตะ 101.0 สัปดาห์นี้ BTC กับ Gold เดินสวนทางกันชัดเจน — BTC ตอบรับ institutional demand ส่วน Gold ถูกกด real yield',

  sections: [
    {
      id: 1,
      title: 'กระแสเงินทุน ETF และความต้องการลงทุน',
      bullets: [
        {
          label: 'BTC ETF (สัปดาห์)',
          text: 'Net inflow รวม +$2,385.8M — สัปดาห์ที่ดีที่สุดในรอบหลายเดือน inflow ทุกวันไม่มีวันติดลบ',
        },
        {
          label: '21 ก.ย.',
          text: 'inflow +$999.0M (เกือบ $1B วันเดียว)',
          sub: 'IBIT +$381M · FBTC +$239M · ARKB +$289M — สถาบันกลับมาซื้อพร้อมกันหลายกอง',
        },
        {
          label: '22 ก.ย.',
          text: 'inflow +$714.7M ต่อเนื่อง',
          sub: 'IBIT +$350M · FBTC +$257M · MSBT +$99M — Fidelity + BlackRock ยังซื้อหนัก',
        },
        {
          label: '23–25 ก.ย.',
          text: 'inflow ชะลอลง +$347M → +$191M → +$135M แต่ยังเป็นบวกทุกวัน',
        },
        {
          label: 'นัยสำคัญ',
          text: 'BTC ETF cumulative flows กลับมาเป็นบวก +$800M YTD หลังลบ -$5.8B ณ กลาง ก.ค. — ลบล้าง deficit ทั้งหมดแล้ว',
        },
        {
          label: 'Gold',
          text: 'ราคาร่วง -2.1% WoW สู่ ~$4,285/oz จาก rate hike bets ที่เพิ่มขึ้น — Gold ETF flow ยังไม่ชัดเจนแต่ราคาบ่งชี้แรงขายเหนือกว่า',
        },
      ],
    },
    {
      id: 2,
      title: 'นโยบาย Fed, เงินเฟ้อ, ดอลลาร์ และ Bond Yield',
      bullets: [
        {
          label: 'Fed Speech',
          text: 'Cleveland Fed Hammack เตือน "inflationary mindset could start to set in" หลังเงินเฟ้อเหนือเป้ามากกว่า 5 ปี — สัญญาณ hawkish ต่อเนื่อง',
        },
        {
          label: 'Bond Volatility',
          text: 'ความผันผวนตลาดพันธบัตรพุ่งสูงสุดตั้งแต่ มี.ค. ขณะที่ BTC VIX ยังอยู่ใกล้ต่ำสุดของปี — divergence ชัดเจน',
        },
        {
          label: 'DXY',
          text: 'แข็งค่าต่อเนื่อง +0.78% WoW → 101.0 — Morgan Stanley ปรับมุมมอง bullish USD ส่งสัญญาณ dollar squeeze ยาวไปถึง 2027',
        },
        {
          label: 'Real Yield',
          text: 'ยังอยู่สูง rate hike expectations ค้ำ — เป็นแรงกดดันหลักต่อ Gold',
        },
        {
          label: 'Gold',
          text: 'ร่วง -2.17% สู่ ~$4,285/oz — ขาดทุนสัปดาห์ที่ 2 จาก 3 สัปดาห์ หลัง rate hike bets เพิ่ม',
        },
        {
          label: 'BTC',
          text: 'พุ่งจาก $81K → $84.5K (+4.3% WoW) — ETF demand ดัน BTC ขึ้นแม้ DXY แข็ง แสดงว่า institutional flow แยกจาก macro',
        },
      ],
    },
    {
      id: 3,
      title: 'สถานการณ์ภูมิรัฐศาสตร์ / ความเสี่ยงตลาด',
      bullets: [
        {
          label: 'ตะวันออกกลาง',
          text: 'มีรายงานจาก Axios/CBS ว่าการเจรจา US-Iran มีความคืบหน้าเชิงบวก — น้ำมันร่วง Gold ถูกกดเพิ่มจาก safe-haven premium ที่ลดลง',
        },
        {
          label: 'Trump-Xi',
          text: 'ประธานาธิบดี Trump พบ Xi Jinping — สัญญาณ trade de-escalation เบื้องต้น แม้ยังไม่มีข้อตกลงชัดเจน',
        },
        {
          label: 'BTC vs Gold',
          text: 'สัปดาห์นี้ BTC กับ Gold เดินสวนทางชัดเจน — BTC +4.3% vs Gold -2.1% · BTC ถูกขับเคลื่อนด้วย ETF flow ไม่ใช่ macro risk',
        },
      ],
    },
    {
      id: 4,
      title: 'ปัจจัยเฉพาะ Bitcoin',
      bullets: [
        {
          label: 'ETF Milestone',
          text: 'BTC ETF cumulative flows กลับมาเป็นบวก YTD (+$800M) หลังลบ -$5.8B ณ กลาง ก.ค. — sentiment สถาบันพลิกกลับ',
        },
        {
          label: 'Hester Peirce',
          text: 'SEC Commissioner "Crypto Mom" ประกาศลาออก 2 ต.ค. — สูญเสียผู้สนับสนุนคริปโตในคณะกรรมการ SEC',
        },
        {
          label: 'CLARITY Act',
          text: 'ถือว่าตายสนิท — Blockchain Association เปลี่ยนผู้นำกลับมาใช้ CEO เดิม Kristin Smith หลัง Summer Mersinger ออก',
          sub: 'CFTC ยังเดินหน้าออกกฎเองผ่าน 8 rulemaking items ตั้งแต่ มิ.ย. — ไม่รอ Congress',
        },
        {
          label: '21 Banks Stablecoin',
          text: '21 ธนาคารใหญ่ (BofA, Citi, Goldman, Deutsche, UBS) ประกาศตั้งบริษัท stablecoin ร่วม เปิดตัว H1/2027 — แข่ง USDC/USDT โดยตรง',
        },
        {
          label: 'Bitget Hack',
          text: 'Bitget ถูกแฮ็ก $352M ผ่าน spoofed transfers — Circle/Tether freeze ได้บางส่วน แต่ส่วนใหญ่เป็น ETH ที่ freeze ไม่ได้',
        },
      ],
    },
    {
      id: 5,
      title: 'ปัจจัยเฉพาะทองคำ',
      bullets: [
        {
          label: 'Rate Hike Bets',
          text: 'ตลาดยังคาดว่า Fed อาจขึ้นดอกเบี้ยอีก — กดดัน Gold ผ่าน real yield ที่สูง · Reuters ชี้ "weekly loss in sight for gold"',
        },
        {
          label: 'DXY แข็ง',
          text: 'DXY ขึ้นสู่ 101.0 (+0.78% WoW) — Morgan Stanley ปรับมุมมอง bullish USD ยาว เป็นลมต้านหลักของ Gold',
        },
        {
          label: 'Oil ร่วง',
          text: 'น้ำมันร่วงจากความคืบหน้าเจรจา US-Iran — ลด inflation expectation ทางอ้อม ลด safe-haven premium ของ Gold',
        },
        {
          label: 'ราคาปิดสัปดาห์',
          text: '~$4,285/oz · ขาดทุน -2.1% WoW จาก ~$4,378 สัปดาห์ก่อน',
          sub: 'ยังเหนือ $4,000 floor ที่ central bank demand รองรับ — แต่ momentum ระยะสั้นเป็นขาลง',
        },
        {
          label: 'ธนาคารกลาง',
          text: 'Demand ระยะยาวจาก emerging market ยังเป็นฐานรองรับ Gold — Q2/2026 ซื้อรวม 289 ตัน ส่วนใหญ่ซื้อเพิ่มตอนราคาร่วง',
        },
      ],
    },
  ],

  forwardEvents: [
    {
      date: '2 ต.ค. 2569',
      time: '19:30 น. ICT',
      event: 'NFP ก.ย.',
      consensus: '120K',
      watch:
        'NFP คือตัวชี้วัดตลาดแรงงานที่ Fed ใช้ควบคู่ PCE — ตลาดแรงงาน "ร้อน" = Fed ต้อง hike ต่อ\n▸ > 200K = ตลาดแรงงานร้อนเกิน → hike ต.ค. odds พุ่ง → กดดัน BTC + Gold ระยะสั้น\n▸ 100–160K = ใกล้เคียงคาด ตลาดรอ CPI/PCE ยืนยัน\n▸ < 100K = ชะลอตัวชัดเจน → Fed อาจ hold → risk-on กลับมา Gold + BTC ฟื้น\n▸ ดูควบคู่: Unemployment Rate (consensus 4.2%) + Avg Hourly Earnings ซึ่งชี้เงินเฟ้อ service-side\n▸ เชื่อมโยง: NFP ส.ค. beat มหาศาล (คาด 56K ออก 162K) — ถ้า ก.ย. ชะลอแรง จะเป็นสัญญาณว่า ส.ค. เป็น outlier',
    },
    {
      date: '14 ต.ค. 2569',
      time: '19:30 น. ICT',
      event: 'CPI ก.ย. (YoY)',
      consensus: '3.7%',
      watch:
        'CPI เป็นข้อมูลเงินเฟ้อตัวแรกที่ออก — กำหนดทิศทาง market expectation ก่อน PCE\n▸ > 3.8% = เงินเฟ้อกลับมาร้อน → hike ต.ค. แทบแน่นอน → DXY พุ่ง, Gold/BTC กดดัน\n▸ 3.5–3.7% = ตรงคาด ตลาด wait-and-see รอ PCE ยืนยัน\n▸ < 3.4% = เงินเฟ้อชะลอชัด → hike odds ลดฮวบ → Gold/BTC rally\n▸ CPI ส.ค. ออกตรงคาด 3.4% — ถ้า ก.ย. เร่งตัวกลับ 3.7% จะสร้างแรงกดดัน hike',
    },
    {
      date: '30 ต.ค. 2569',
      time: '19:30 น. ICT',
      event: 'Core PCE Price Index ก.ย. (m/m)',
      consensus: '0.2% m/m, 2.6% YoY',
      watch:
        'Core PCE m/m คือตัวชี้วัดเงินเฟ้อหลักที่สุดของ Fed (สำคัญกว่า CPI) — วัดจากฝั่งต้นทุนจริงของผู้บริโภค\n▸ > 0.3% m/m → Fed ชะลอลดดอกเบี้ย, Dollar แข็งมาก (อาจทะลุ 102.5), ทองคำและ BTC กดดันหนัก\n▸ ≤ 0.1% m/m → Fed อาจเร่งลดดอกเบี้ย 0.50% ในประชุมหน้า, Dollar อ่อน, ทองคำฟื้น, BTC rally\n▸ เชื่อมโยง: Core PCE ส.ค. ออก 0.2% (ต่ำกว่าคาด 0.3%) → ถ้า ก.ย. ต่ำอีก จะเป็น trend ชะลอตัวชัด\n▸ เป็นตัวเลขสุดท้ายก่อน FOMC — กำหนด positioning ทั้งตลาด',
    },
    {
      date: '30 ต.ค. 2569',
      time: '19:30 น. ICT',
      event: 'GDP Q3 Advance',
      consensus: '1.9% QoQ ann.',
      watch:
        'GDP Advance คือตัวเลขแรกของเศรษฐกิจ Q3 — สำคัญเพราะชี้ว่า Fed hike ทำเศรษฐกิจชะลอแค่ไหน\n▸ > 2.5% = เศรษฐกิจยังแข็ง Fed ไม่มีเหตุผลหยุด hike → กดดัน Gold/BTC\n▸ 1.5–2.0% = ชะลอพอดี soft landing narrative → risk-on\n▸ < 1.0% = ชะลอแรง recession fear → safe-haven Gold ขึ้น, BTC อาจร่วงตาม risk-off\n▸ เชื่อมโยง: Final GDP Q2 ออก 2.2% (beat คาด 1.5%) → ถ้า Q3 ชะลอจาก 2.2% → 1.9% แสดงว่า hike เริ่มกัด',
    },
    {
      date: '29 ต.ค. 2569',
      time: '01:00 น. ICT',
      event: 'FOMC ต.ค. (ไม่มี Dot Plot)',
      consensus: 'hold 49.6% · hike 43.2%',
      watch:
        'ครั้งนี้ไม่มี SEP / Dot Plot — ตลาดฟังเฉพาะ statement + แถลงข่าว Powell\n▸ hike → 4.00–4.25% + Powell ส่งสัญญาณยังขึ้นต่อ = real yield พุ่ง → Gold ร่วง, BTC กดดัน\n▸ hold + พูดถึง data-dependency = risk-on กลับมา → Gold + BTC ฟื้น\n▸ NFP (2 ต.ค.) + CPI (14 ต.ค.) + Core PCE (30 ต.ค.) จะกำหนดว่า odds เอียงไปทางใดก่อนประชุม\n▸ hike กับ hold "ใกล้เคียงกัน" (43% vs 50%) นับว่า tension สูงมาก',
    },
  ],

  sources: [
    { name: 'Farside Investors — BTC ETF Flow', url: 'https://farside.co.uk/btc/', use: 'BTC ETF net flow รายวัน (อัปเดตทุกวันทำการ)' },
    { name: 'CoinGlass ETF', url: 'https://www.coinglass.com/etf/bitcoin', use: 'Open Interest, Liquidation map, ETF holdings รวม' },
    { name: 'TradingView XAUUSD', url: 'https://www.tradingview.com/symbols/XAUUSD/', use: 'Gold spot + BTC/Gold ratio (BTCXAU)' },
    { name: 'CoinDesk', url: 'https://www.coindesk.com/', use: 'ข่าว BTC ETF flows, regulation, institutional adoption' },
    { name: 'crypto.news Regulation Tracker', url: 'https://crypto.news/us/', use: 'สถานะกฎหมายคริปโตฯ สหรัฐฯ ทุก bill' },
    { name: 'CME FedWatch', url: 'https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html', use: 'ความน่าจะเป็น FOMC rate path สด' },
  ],
};

// ---- Rendering ----

function SectionBlock({ section }: { section: SectionItem }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs font-bold bg-sky-800/60 text-sky-300 px-2 py-0.5 rounded font-mono">
          {section.id.toString().padStart(2, '0')}
        </span>
        <h3 className="text-sm font-bold text-white">{section.title}</h3>
      </div>
      <div className="space-y-1.5 pl-8">
        {section.bullets.map((b, i) => (
          <div key={i}>
            <div className="flex gap-2 text-sm">
              {b.label && (
                <span className="text-sky-400 font-semibold shrink-0 min-w-[80px]">{b.label}:</span>
              )}
              <span className="text-gray-200">{b.text}</span>
            </div>
            {b.sub && (
              <div className="text-xs text-gray-500 ml-[88px] mt-0.5">{b.sub}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BtcGoldWeeklySummary() {
  const [aiData, setAiData] = useState<WeeklyData | null>(null);
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [aiModel, setAiModel] = useState('');

  useEffect(() => {
    setAiStatus('loading');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    fetch('/api/weekly-summary', { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        const { _cached, _cachedAt, _model, _generatedAt, ...data } = json;
        if (data.weekLabel && data.sections) {
          setAiData(data as WeeklyData);
          setAiStatus('ok');
          setAiModel(_model || '');
        } else {
          setAiStatus('error');
        }
      })
      .catch(() => setAiStatus('error'))
      .finally(() => clearTimeout(timer));
  }, []);

  const d = aiData || WEEKLY_DATA;
  const isAI = aiStatus === 'ok' && aiData != null;
  const updatedDate = new Date(d.updatedISO);
  const updatedLabel = `${updatedDate.getDate()} ${['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'][updatedDate.getMonth()]} ${updatedDate.getFullYear() + 543}`;

  return (
    <div className="card p-6 mb-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2 mb-1">
        <h2 className="text-2xl font-bold text-highlight">
          ₿ BTC & 🥇 Gold — สรุปสัปดาห์ที่ผ่านมา และคาดการณ์ล่วงหน้า 2 สัปดาห์
        </h2>
        <div className="flex items-center gap-2">
          {isAI && (
            <span className="text-xs text-green-400 font-mono bg-green-900/30 px-2 py-1 rounded">
              🤖 AI ({aiModel})
            </span>
          )}
          <span className="text-xs text-gray-500 font-mono bg-gray-800/60 px-2 py-1 rounded">
            อัปเดต {updatedLabel}
          </span>
        </div>
      </div>
      <div className="text-[42px] text-orange-300 font-semibold mb-1 leading-tight">
        สัปดาห์ที่ผ่านมา: {d.weekLabel}
      </div>
      <p className="text-sm text-gray-300 mb-1 leading-relaxed border-l-2 border-orange-500/50 pl-3">
        {d.context}
      </p>
      <p className="text-xs text-gray-600 mb-6">
        ไม่มีคำแนะนำลงทุน · ไม่มีราคาเป้าหมาย · อ้างอิงข้อมูลที่ตรวจสอบได้เท่านั้น
      </p>

      {/* Sections 1-5 in two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-0 mb-6">
        {d.sections.map((s) => (
          <SectionBlock key={s.id} section={s} />
        ))}
      </div>

      {/* Section 6: Sources */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-bold bg-sky-800/60 text-sky-300 px-2 py-0.5 rounded font-mono">06</span>
          <h3 className="text-sm font-bold text-white">แหล่งข้อมูลแม่นยำสำหรับสัปดาห์ถัดไป</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pl-8">
          {d.sources.map((src) => (
            <a
              key={src.url}
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-2.5 rounded-lg bg-gray-800/50 hover:bg-gray-700/60 border border-gray-700/50 hover:border-sky-700/50 transition-colors group"
            >
              <div className="text-xs font-semibold text-sky-400 group-hover:text-sky-300 mb-0.5 truncate">{src.name} ↗</div>
              <div className="text-[11px] text-gray-400">{src.use}</div>
            </a>
          ))}
        </div>
      </div>

      {/* Section 7: Forward Factors */}
      <div>
        <div className="flex flex-wrap items-baseline gap-3 mb-3">
          <h3 className="text-[42px] text-orange-300 font-semibold leading-tight">
            07 คาดการณ์ปัจจัยสำคัญ 3 สัปดาห์ข้างหน้า
          </h3>
          <span className="text-sm text-gray-500">(ไม่ทำนายราคา)</span>
        </div>
        <div className="space-y-3 pl-8">
          {d.forwardEvents.map((ev, i) => (
            <div key={i} className="rounded-lg bg-amber-900/10 border border-amber-800/25 p-4">
              {/* Header row: date + time + event + consensus */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xl font-mono text-amber-400 shrink-0 leading-none">{ev.date}</span>
                {ev.time && (
                  <span className="text-base font-mono text-gray-500 bg-gray-800/60 px-2 py-0.5 rounded shrink-0 leading-none">
                    🕐 {ev.time}
                  </span>
                )}
                <span className="text-[22px] font-black text-white leading-none">{ev.event}</span>
                {ev.consensus && (
                  <span className="text-base text-gray-400 bg-gray-800/50 px-2 py-0.5 rounded">
                    consensus: {ev.consensus}
                  </span>
                )}
              </div>
              {/* Expanded detail — split \n into separate lines */}
              <div className="space-y-1 pl-1">
                {ev.watch.split('\n').map((line, li) => (
                  <div
                    key={li}
                    className={`text-xl leading-relaxed ${
                      line.startsWith('▸') ? 'text-gray-400 pl-2' : 'text-gray-300'
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
  );
}
