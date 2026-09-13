type Verdict = 'win' | 'none' | 'derived';

interface Source {
  name: string;
  mae: string;
  detail: string;
  winner?: boolean;
}

interface Indicator {
  key: string;
  title: string;
  winner: string;
  verdict: Verdict;
  sample: string;
  sources: Source[];
  why: string;
  caution: string;
}

const INDICATORS: Indicator[] = [
  {
    key: 'CPI',
    title: 'CPI',
    winner: 'Street Consensus',
    verdict: 'win',
    sample: 'ทดสอบย้อนหลัง มี.ค.–ส.ค. 2026 · ตารางเต็ม 44 งวด',
    sources: [
      { name: 'Street Consensus', mae: '0.067pp', detail: 'ใกล้สุด 6/6 เดือน', winner: true },
      { name: 'Cleveland Fed', mae: '0.127pp', detail: 'ใกล้สุด 0/6 เดือน' },
      { name: 'Nowflation', mae: '0.183pp', detail: 'ใกล้สุด 0/6 เดือน' },
    ],
    why: 'Street ชนะทุกเดือนไม่ใช่แค่ชนะค่าเฉลี่ย และตารางเต็ม 44 งวดที่ Nowflation จัดทำเองก็เรียงลำดับเดียวกัน (Street 0.086 · Cleveland 0.104 · Kalshi 0.132 · Nowflation 0.159) การที่เขาเผยแพร่สถิติที่ตัวเองรั้งท้ายทำให้ข้อมูลชุดนี้น่าเชื่อถือ',
    caution: 'แม่นที่สุดไม่เท่ากับทำกำไรได้ — Street คือ consensus ตัวมันเอง ราคาตลาด price in ไว้หมดแล้ว เดือน มิ.ย. จริง 3.5% แต่ทุกแหล่งคาด 3.8–4.0% ผิดไปทางเดียวกันหมด ไม่มีใครเตือนล่วงหน้าได้',
  },
  {
    key: 'PCE',
    title: 'PCE',
    winner: 'CPI + PPI ที่ออกไปแล้ว',
    verdict: 'derived',
    sample: 'Street MAE 0.13pp จาก 3 งวดล่าสุดในระบบ',
    sources: [
      { name: 'คำนวณจาก CPI + PPI', mae: 'แม่นสุด', detail: 'รู้ก่อนประกาศ 2-3 สัปดาห์', winner: true },
      { name: 'Street Consensus', mae: '0.13pp', detail: '+0.2 / −0.1 / −0.1' },
      { name: 'Cleveland Fed', mae: 'ไม่มีข้อมูล 2026', detail: 'อ้างชนะ survey ปี 1999–2022' },
    ],
    why: 'PCE ส่วนใหญ่ถูกกำหนดโดย CPI กับ PPI ที่ประกาศไปก่อนแล้ว รอบ ส.ค. เห็นชัด — พอ Core CPI ออก 0.3% (สูงกว่าคาด 0.2%) Barclays, Goldman Sachs, BofA, TD และ Nomura ปรับ Core PCE ขึ้นพร้อมกันทันที ทั้งห้าแบงก์ไม่ได้พยากรณ์ แต่คำนวณกลับจากข้อมูลที่มีแล้ว',
    caution: 'Cleveland Fed ยอมรับเองว่าชนะแค่ headline PCE ส่วน Core PCE ซึ่งเป็นตัวที่ Fed ดูจริงนั้นแค่สูสี และข้ออ้างทำนองเดียวกันของเขาเรื่อง CPI เพิ่งแพ้ Street ทั้ง 6 เดือนในข้อมูลสด 2026',
  },
  {
    key: 'NFP',
    title: 'Nonfarm Payrolls',
    winner: 'ไม่มีผู้ชนะ',
    verdict: 'none',
    sample: 'Street 8 เดือน 2026 · โมเดล 24 งวด walk-forward',
    sources: [
      { name: 'Nowflation model', mae: '90.3K', detail: 'ชนะ naive แค่ 54% ของเดือน' },
      { name: 'Street Consensus', mae: '91K', detail: 'พลาดหนักสุด 151K' },
      { name: 'naive momentum', mae: '95.9K', detail: 'เกณฑ์เปรียบเทียบ' },
    ],
    why: 'ต่างกัน 0.7K จาก MAE ระดับ 90K คือไม่ต่างเลยในทางปฏิบัติ และวัดคนละช่วงคนละขนาดตัวอย่าง โมเดลเฉพาะทางชนะเกณฑ์พื้นฐานแค่ 54% ของเดือน ซึ่งแทบเป็นเหรียญโยน',
    caution: 'Claims สัปดาห์สำรวจก็ช่วยไม่ได้ — ทดสอบแล้วได้ corr +0.51 ทั้งที่ทฤษฎีต้องติดลบ เพราะ claims นับเฉพาะคนถูกเลิกจ้าง มองไม่เห็นการจ้างใหม่ซึ่งเป็นช่องทางที่ตลาดแรงงานปี 2026 อ่อนแออยู่',
  },
];

const VERDICT_STYLE: Record<Verdict, { label: string; bg: string; color: string }> = {
  win: { label: 'มีผู้ชนะชัดเจน', bg: '#0f2e1f', color: '#4ade80' },
  derived: { label: 'คำนวณได้ ไม่ต้องเดา', bg: '#12283f', color: '#60a5fa' },
  none: { label: 'พยากรณ์ไม่ได้', bg: '#3a1d1d', color: '#f87171' },
};

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 6, borderRadius: 3, background: '#0c1626', flex: 1, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
    </div>
  );
}

function IndicatorCard({ ind }: { ind: Indicator }) {
  const v = VERDICT_STYLE[ind.verdict];
  return (
    <div style={{ background: '#111c30', border: '1px solid #1e3050', borderRadius: 8, padding: 16 }}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-bold text-highlight">{ind.title}</h3>
        <span style={{ fontSize: 11, background: v.bg, color: v.color, padding: '3px 9px', borderRadius: 6, fontWeight: 500 }}>
          {v.label}
        </span>
      </div>

      <div style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 3 }}>
        ผู้ชนะ: <span style={{ color: v.color, fontWeight: 600 }}>{ind.winner}</span>
      </div>
      <div style={{ fontSize: 11, color: '#5a6f94', marginBottom: 12 }}>{ind.sample}</div>

      {ind.sources.map((s, i) => (
        <div key={s.name} className="flex items-center" style={{ gap: 9, padding: '5px 0', fontSize: 12 }}>
          <span style={{ width: 128, color: s.winner ? '#e2e8f0' : '#7a90b4', fontWeight: s.winner ? 500 : 400 }}>
            {s.name}
          </span>
          <Bar pct={[36, 70, 100][i]} color={s.winner ? '#4ade80' : i === 1 ? '#fbbf24' : '#f87171'} />
          <span style={{ minWidth: 62, textAlign: 'right', fontWeight: 500, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
            {s.mae}
          </span>
        </div>
      ))}
      <div style={{ fontSize: 11, color: '#5a6f94', marginTop: 4, marginBottom: 12 }}>
        {ind.sources.map((s) => `${s.name}: ${s.detail}`).join(' · ')}
      </div>

      <div style={{ fontSize: 12, color: '#a8bdd9', lineHeight: 1.65, paddingTop: 10, borderTop: '1px solid #1a2740' }}>
        {ind.why}
      </div>
      <div style={{ marginTop: 9, padding: '8px 11px', background: '#1a2333', borderRadius: 6, fontSize: 12, color: '#fbbf24', lineHeight: 1.6 }}>
        <strong style={{ fontWeight: 600 }}>ข้อควรระวัง — </strong>{ind.caution}
      </div>
    </div>
  );
}

export default function ForecastSourceGuide() {
  return (
    <div className="card p-6 mb-8">
      <h2 className="text-2xl font-bold mb-2 text-highlight">แหล่งคาดการณ์ไหนแม่นที่สุด</h2>
      <p className="text-sm text-gray-400 mb-5">
        ทดสอบย้อนหลังกับตัวเลขที่ประกาศจริง ใช้อ่านช่อง &ldquo;คาดการณ์&rdquo; ในปฏิทินด้านล่างว่าเชื่อได้แค่ไหน —
        ค่าที่แสดงคือความคลาดเคลื่อนเฉลี่ย (ยิ่งต่ำยิ่งแม่น)
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {INDICATORS.map((ind) => (
          <IndicatorCard key={ind.key} ind={ind} />
        ))}
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: '#5a6f94', lineHeight: 1.6 }}>
        ที่มา: Nowflation CPI Forecast Scoreboard (44 งวด) · Nowflation Jobs Report Track Record · ตัวเลขที่ประกาศจริงในระบบ ·
        Cleveland Fed Nowcasting Working Paper · ข้อมูล ณ 13 ก.ย. 2026
      </div>
    </div>
  );
}
