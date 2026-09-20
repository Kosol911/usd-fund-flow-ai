// BTC & Gold weekly market summary — updated every Saturday morning
// To update: change WEEKLY_DATA below; all rendering is automatic

interface SectionItem {
  id: number;
  title: string;
  bullets: { label?: string; text: string; sub?: string }[];
}

interface ForwardEvent {
  date: string;
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
  weekLabel: '14–20 กันยายน 2569',
  updatedISO: '2026-09-20',
  context:
    'ช่วงสัปดาห์นี้ทั้ง Bitcoin และทองคำเผชิญกับแรงกดดันพร้อมกันจากสองทิศทางหลัก คือการขึ้นดอกเบี้ยของ Fed วันพุธ 16 ก.ย. และแรงเทขายเฉพาะของ BTC จากการล้มเหลวทางนิติบัญญัติ (CLARITY Act) ก่อนที่ทั้งคู่จะทยอยฟื้นตัวในช่วงปลายสัปดาห์ Gold บันทึกกำไรสัปดาห์แรกในรอบ 4 สัปดาห์ ขณะที่ BTC ฟื้นจากต่ำกว่า $76K กลับมาแถว $81K ภายในเวลาไม่กี่วัน',

  sections: [
    {
      id: 1,
      title: 'กระแสเงินทุน ETF และความต้องการลงทุน',
      bullets: [
        {
          label: 'BTC ETF (สัปดาห์)',
          text: 'Net outflow รวม -$6.2M — แต่มีความผันผวนภายในสัปดาห์สูงมาก',
        },
        {
          label: '14 ก.ย.',
          text: 'inflow +$160M (ก่อนข่าว)',
          sub: 'Demand ยังมีก่อนเหตุการณ์',
        },
        {
          label: '15 ก.ย.',
          text: 'outflow -$450M หลัง CLARITY Act ตกในวุฒิสภา',
          sub: 'ARKB -$141.9M · GBTC -$62.3M คือกองทุนที่ถอนเงินมากสุด',
        },
        {
          label: '16 ก.ย.',
          text: 'outflow -$296M วัน Fed hike',
        },
        {
          label: 'นัยสำคัญ',
          text: 'ปิดสัปดาห์ net ใกล้ศูนย์ = สถาบันไม่ได้ถอนทุนขนาดใหญ่ แม้มีข่าวลบสองชิ้นพร้อมกัน — demand ยังทรงตัว',
        },
        {
          label: 'Gold ETF',
          text: 'ข้อมูล GLD/IAU weekly flow ยังไม่ชัดเจน แต่ราคาฟื้นตัว +0.92% WoW บ่งชี้ demand รองรับ downside ได้',
        },
      ],
    },
    {
      id: 2,
      title: 'นโยบาย Fed, เงินเฟ้อ, ดอลลาร์ และ Bond Yield',
      bullets: [
        {
          label: 'FOMC 16 ก.ย.',
          text: 'มีมติเป็นเอกฉันท์ขึ้นดอกเบี้ย +0.25pp → 3.75–4.00% (IORB=3.90% มีผล 17 ก.ย.)',
        },
        {
          label: 'CPI 13 ก.ย.',
          text: 'เกิดจริง 3.4% — ออกก่อนการประชุม ไม่ได้เปลี่ยนทิศ hike',
        },
        {
          label: 'DXY',
          text: 'แข็งค่าทันทีหลัง hike — สร้างแรงต้านต่อ Gold และ BTC',
        },
        {
          label: 'Real Yield',
          text: 'ปรับขึ้นตาม nominal yield — กดดันสินทรัพย์ที่ไม่มีดอกเบี้ยทั้งคู่',
        },
        {
          label: 'Gold',
          text: 'ร่วงแตะต่ำสุด 6 สัปดาห์วันพุธ → ฟื้น +2% วันพฤหัสฯ เมื่อ DXY เริ่มอ่อนค่า · ปิดสัปดาห์ ~$4,378/oz',
        },
        {
          label: 'BTC',
          text: 'ดิ่งต่ำกว่า $76K วันพุธ → ฟื้นกลับ $81K ปลายสัปดาห์ — ฟื้นเร็วกว่า Gold สัดส่วน',
        },
      ],
    },
    {
      id: 3,
      title: 'สถานการณ์ภูมิรัฐศาสตร์ / ความเสี่ยงตลาด',
      bullets: [
        {
          label: 'ตะวันออกกลาง',
          text: 'ความตึงเครียดยังอยู่ในระดับที่ตลาดจับตา — เม็ดเงิน safe-haven ไหลเข้า Gold เป็นระยะ ช่วยรองรับ downside',
        },
        {
          label: 'De-dollarization',
          text: 'กระแส emerging market สะสม Gold แทน USD reserves ยังเป็นโครงสร้างระยะยาว — กรณีทรัพย์สินธนาคารกลางรัสเซียถูกอายัดปี 2022 ยังเป็น motivation',
        },
        {
          label: 'BTC vs Gold',
          text: 'BTC ยังตอบสนองในฐานะ risk-on สัปดาห์นี้ ไม่ใช่ safe-haven — ดิ่งและฟื้นพร้อมกับ sentiment ตลาดมากกว่าจะไหลตาม geopolitical flow',
        },
      ],
    },
    {
      id: 4,
      title: 'ปัจจัยเฉพาะ Bitcoin',
      bullets: [
        {
          label: 'CLARITY Act ล้ม',
          text: 'วุฒิสภาสหรัฐฯ ลงมติไม่ถึงเกณฑ์ 60 เสียง — กลุ่ม Democrat ส่วนหนึ่งขัดขวางเพราะประเด็นจริยธรรมเรื่องทรัพย์สินดิจิทัลของประธานาธิบดี Trump',
          sub: 'ผลทันที: BTC ดิ่ง -$450M ETF outflow วันเดียวกัน / อุตสาหกรรมมองว่า CLARITY ตายในปีนี้',
        },
        {
          label: 'CFTC Rulemaking',
          text: 'CFTC ส่งแพ็คเกจกฎระเบียบ crypto ไปให้ White House พิจารณา หลัง CLARITY ล้ม',
        },
        {
          label: 'SEC',
          text: 'เสนอ "Regulation Crypto Assets" — กรอบเสนอขายใหม่ มีช่องยกเว้น startup ≤$5M, fundraising ≤$75M',
        },
        {
          label: 'ภาพรวม',
          text: 'BTC แสดง resilience สูง — ดิ่งหนัก ฟื้นเร็ว ปิด $81K แม้มีข่าวลบขนาดใหญ่สองชิ้นพร้อมกัน',
        },
      ],
    },
    {
      id: 5,
      title: 'ปัจจัยเฉพาะทองคำ',
      bullets: [
        {
          label: 'ธนาคารกลาง Q2/2026',
          text: 'ซื้อรวม 289 ตัน (+62–74% YoY) — ซื้อเพิ่มตอนราคาร่วง ไม่ถอยออก · WGC คาดทั้งปี ~850 ตัน',
        },
        {
          label: 'ผู้ซื้อนำ',
          text: 'Poland +20 ตัน (มากสุด) เป้าระยะยาว 700 ตัน · หลายประเทศ emerging market สะสมต่อเนื่อง',
        },
        {
          label: 'ผู้ขาย',
          text: 'Russia & Turkey เป็นผู้ขายสุทธิ — Russia เพราะแรงกดดันงบประมาณจากสงครามและมาตรการคว่ำบาตร',
        },
        {
          label: 'ราคาปิดสัปดาห์',
          text: '~$4,378/oz · กำไรสัปดาห์แรกในรอบ 4 สัปดาห์ (+0.92% WoW)',
          sub: 'ยังเหนือ $4,000 floor ที่ central bank demand รองรับ',
        },
        {
          label: 'HSBC',
          text: 'ปรับเพิ่ม Gold price forecast เพราะความตึงเครียดภูมิรัฐศาสตร์',
        },
      ],
    },
  ],

  forwardEvents: [
    {
      date: '~26 ก.ย. 2569',
      event: 'PCE ส.ค.',
      consensus: '~3.7%',
      watch: 'ตัวเลขที่ Fed ใช้จริง — สูงกว่าคาด = กดดัน Gold + BTC พร้อมกัน · ต่ำกว่าคาด = ลด hawkish pressure',
    },
    {
      date: '~2 ต.ค. 2569',
      event: 'NFP ก.ย.',
      consensus: '~162K',
      watch: 'ตลาดแรงงานยังแข็งแกร่ง = หนุน Fed hike ต่อที่ 28 ต.ค. · อ่อนแอกว่าคาด = ลด hike odds',
    },
    {
      date: 'ต่อเนื่อง',
      event: 'CFTC / SEC Crypto Rulemaking',
      watch: 'ถ้า White House อนุมัติ CFTC package เร็ว — ตลาดอาจตีความเป็น regulatory clarity ทดแทน CLARITY Act',
    },
    {
      date: 'ต่อเนื่อง',
      event: 'DXY Trajectory หลัง Fed hike',
      watch: 'ถ้า DXY อ่อนค่าต่อ → หนุน Gold ทดสอบ $4,400+ · DXY แข็ง → กดดัน Gold ต่อ',
    },
    {
      date: '28 ต.ค. 2569',
      event: 'FOMC (ไม่มี Dot Plot)',
      consensus: 'ตลาดคาด hike 43.2%',
      watch: 'ข้อมูล PCE+NFP ที่จะออกก่อนหน้า จะกำหนด positioning ก่อนการประชุม',
    },
  ],

  sources: [
    { name: 'Farside Investors — BTC ETF Flow', url: 'https://farside.co.uk/btc/', use: 'BTC ETF net flow รายวัน (อัปเดตทุกวันทำการ)' },
    { name: 'CoinGlass ETF', url: 'https://www.coinglass.com/etf/bitcoin', use: 'Open Interest, Liquidation map, ETF holdings รวม' },
    { name: 'TradingView XAUUSD', url: 'https://www.tradingview.com/symbols/XAUUSD/', use: 'Gold spot + BTC/Gold ratio (BTCXAU)' },
    { name: 'Gold.org Central Banks', url: 'https://www.gold.org/goldhub/research/gold-demand-trends/gold-demand-trends-q2-2026/central-banks', use: 'ข้อมูล Central bank buying/selling quarterly' },
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
  const d = WEEKLY_DATA;
  const updatedDate = new Date(d.updatedISO);
  const updatedLabel = `${updatedDate.getDate()} ${['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'][updatedDate.getMonth()]} ${updatedDate.getFullYear() + 543}`;

  return (
    <div className="card p-6 mb-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2 mb-1">
        <h2 className="text-2xl font-bold text-highlight">
          ₿ BTC & 🥇 Gold — สรุปสัปดาห์
        </h2>
        <div className="text-xs text-gray-500 font-mono bg-gray-800/60 px-2 py-1 rounded">
          อัปเดต {updatedLabel}
        </div>
      </div>
      <div className="text-sm text-orange-300 font-semibold mb-1">
        สัปดาห์ที่ {d.weekLabel}
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
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-bold bg-amber-800/60 text-amber-300 px-2 py-0.5 rounded font-mono">07</span>
          <h3 className="text-sm font-bold text-white">คาดการณ์ปัจจัยสำคัญ 3 สัปดาห์ข้างหน้า</h3>
          <span className="text-xs text-gray-600">(ไม่ทำนายราคา)</span>
        </div>
        <div className="space-y-2 pl-8">
          {d.forwardEvents.map((ev, i) => (
            <div key={i} className="flex gap-3 text-sm p-2.5 rounded-lg bg-amber-900/10 border border-amber-800/20">
              <div className="shrink-0 text-amber-400 font-mono text-xs pt-0.5 min-w-[110px]">{ev.date}</div>
              <div className="flex-1">
                <div className="font-semibold text-white text-sm">
                  {ev.event}
                  {ev.consensus && <span className="text-gray-400 font-normal ml-2 text-xs">consensus: {ev.consensus}</span>}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{ev.watch}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
