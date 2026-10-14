// ปฏิทินเศรษฐกิจ — ข้อมูลกลาง ใช้ร่วมกันระหว่าง EconCalendar และ API
// อัปเดตทุกสัปดาห์ (เพิ่ม actual หลังประกาศ, เพิ่ม event ล่วงหน้า)

export type Impact = 'critical' | 'high' | 'medium';
export type Cat = 'FOMC' | 'inflation' | 'employment' | 'gdp' | 'other';

export interface EconEvent {
  date: string;       // YYYY-MM-DD (วันที่ใน ICT)
  time: string;       // HH:MM (ICT 24h) — '—' ถ้าไม่ทราบเวลาแน่ชัด
  nameTh: string;     // ชื่อภาษาไทย
  nameEn: string;     // ชื่อภาษาอังกฤษ (ย่อ)
  period: string;     // ข้อมูลของเดือนไหน เช่น "ส.ค. 2569"
  impact: Impact;
  cat: Cat;
  unit?: string;      // หน่วย เช่น "% YoY" "K" "pp"
  forecast?: string;  // คาดการณ์ consensus
  actual?: string;    // ผลจริง (ใส่หลังประกาศ)
  prev?: string;      // ครั้งก่อน
  beat?: boolean;     // true=ดีกว่าคาด, false=แย่กว่าคาด, undefined=รอข้อมูล
  note?: string;      // หมายเหตุพิเศษ เช่น "HIKED +0.25pp ✅"
  marketImpact?: { asset: string; effect: string; reason: string }[];
  impactSummary?: string[];
}

// ──────────────────────────────────────────────────────────────────────────────
// DATA (อัปเดตทุกสัปดาห์)
// EDT = UTC-4 → 08:30 EDT = 19:30 ICT, 14:00 EDT = 01:00 ICT วันถัดไป
// EST = UTC-5 (หลัง 2 พ.ย. 2569) → 08:30 EST = 20:30 ICT, 14:00 EST = 02:00 ICT
// ──────────────────────────────────────────────────────────────────────────────
export const EVENTS: EconEvent[] = [
  // ═══════════════════════════════════════════════════════
  // มิถุนายน 2026 / 2569  (ผ่านแล้ว — EDT)
  // ═══════════════════════════════════════════════════════
  {
    date: '2026-06-04', time: '19:30', nameTh: 'ADP จ้างงานนอกภาคเกษตร พ.ค.', nameEn: 'ADP Employment',
    period: 'พ.ค. 2569', impact: 'medium', cat: 'employment', unit: 'K',
    forecast: '158', actual: '143', prev: '163', beat: false,
  },
  {
    date: '2026-06-05', time: '19:30', nameTh: 'NFP จ้างงานนอกภาคเกษตร พ.ค.', nameEn: 'Nonfarm Payrolls',
    period: 'พ.ค. 2569', impact: 'critical', cat: 'employment', unit: 'K',
    forecast: '158', actual: '165', prev: '172', beat: true,
  },
  {
    date: '2026-06-05', time: '19:30', nameTh: 'อัตราว่างงาน พ.ค.', nameEn: 'Unemployment Rate',
    period: 'พ.ค. 2569', impact: 'high', cat: 'employment', unit: '%',
    forecast: '4.2', actual: '4.1', prev: '4.2', beat: true,
  },
  {
    date: '2026-06-11', time: '19:30', nameTh: 'ดัชนีราคาผู้บริโภค CPI พ.ค. (YoY)', nameEn: 'CPI YoY',
    period: 'พ.ค. 2569', impact: 'critical', cat: 'inflation', unit: '% YoY',
    forecast: '3.9', actual: '3.8', prev: '4.1', beat: false, note: 'ต่ำกว่าคาด ตลาดตีความว่าเงินเฟ้อ cool',
  },
  {
    date: '2026-06-11', time: '19:30', nameTh: 'ดัชนีราคาผู้บริโภค CPI พ.ค. (MoM)', nameEn: 'CPI MoM',
    period: 'พ.ค. 2569', impact: 'high', cat: 'inflation', unit: '% MoM',
    forecast: '0.3', actual: '0.2', prev: '0.4', beat: false,
  },
  {
    date: '2026-06-12', time: '19:30', nameTh: 'ดัชนีราคาผู้ผลิต PPI พ.ค. (YoY)', nameEn: 'PPI YoY',
    period: 'พ.ค. 2569', impact: 'high', cat: 'inflation', unit: '% YoY',
    forecast: '3.1', actual: '3.2', prev: '3.5', beat: true,
  },
  {
    date: '2026-06-19', time: '01:00', nameTh: 'FOMC มิ.ย. — มติดอกเบี้ย + Dot Plot + SEP', nameEn: 'FOMC Decision',
    period: 'มิ.ย. 2569', impact: 'critical', cat: 'FOMC', unit: '%',
    forecast: 'hike 62% · hold 35%', actual: '3.50–3.75%', prev: '3.25–3.50%', beat: undefined,
    note: 'HIKED +0.25pp ✅ → 3.50–3.75% (IORB 3.65%) · มีผล 20 มิ.ย. · Dot Plot ส่งสัญญาณ hike อีก 2 ครั้งในปีนี้',
  },
  {
    date: '2026-06-26', time: '19:30', nameTh: 'PCE ราคาผู้บริโภคส่วนตัว พ.ค. (YoY)', nameEn: 'PCE YoY',
    period: 'พ.ค. 2569', impact: 'critical', cat: 'inflation', unit: '% YoY',
    forecast: '3.6', actual: '3.5', prev: '3.8', beat: false,
  },
  {
    date: '2026-06-26', time: '19:30', nameTh: 'Core PCE พ.ค. (YoY)', nameEn: 'Core PCE YoY',
    period: 'พ.ค. 2569', impact: 'critical', cat: 'inflation', unit: '% YoY',
    forecast: '3.2', actual: '3.1', prev: '3.4', beat: false,
  },

  // ═══════════════════════════════════════════════════════
  // กรกฎาคม 2026 / 2569  (ผ่านแล้ว — EDT)
  // ═══════════════════════════════════════════════════════
  {
    date: '2026-07-02', time: '19:30', nameTh: 'ADP จ้างงาน มิ.ย.', nameEn: 'ADP Employment',
    period: 'มิ.ย. 2569', impact: 'medium', cat: 'employment', unit: 'K',
    forecast: '155', actual: '142', prev: '143', beat: false,
  },
  {
    date: '2026-07-03', time: '19:30', nameTh: 'NFP จ้างงานนอกภาคเกษตร มิ.ย.', nameEn: 'Nonfarm Payrolls',
    period: 'มิ.ย. 2569', impact: 'critical', cat: 'employment', unit: 'K',
    forecast: '160', actual: '178', prev: '165', beat: true,
  },
  {
    date: '2026-07-03', time: '19:30', nameTh: 'อัตราว่างงาน มิ.ย.', nameEn: 'Unemployment Rate',
    period: 'มิ.ย. 2569', impact: 'high', cat: 'employment', unit: '%',
    forecast: '4.1', actual: '4.0', prev: '4.1', beat: true,
  },
  {
    date: '2026-07-10', time: '19:30', nameTh: 'CPI มิ.ย. (YoY)', nameEn: 'CPI YoY',
    period: 'มิ.ย. 2569', impact: 'critical', cat: 'inflation', unit: '% YoY',
    forecast: '3.7', actual: '3.9', prev: '3.8', beat: true, note: 'ร้อนกว่าคาด — กดดัน hike ต่อ',
  },
  {
    date: '2026-07-10', time: '19:30', nameTh: 'Core CPI มิ.ย. (YoY)', nameEn: 'Core CPI YoY',
    period: 'มิ.ย. 2569', impact: 'high', cat: 'inflation', unit: '% YoY',
    forecast: '3.3', actual: '3.4', prev: '3.3', beat: true,
  },
  {
    date: '2026-07-15', time: '19:30', nameTh: 'PPI มิ.ย. (YoY)', nameEn: 'PPI YoY',
    period: 'มิ.ย. 2569', impact: 'high', cat: 'inflation', unit: '% YoY',
    forecast: '3.0', actual: '3.1', prev: '3.2', beat: true,
  },
  {
    date: '2026-07-24', time: '19:30', nameTh: 'PCE มิ.ย. (YoY)', nameEn: 'PCE YoY',
    period: 'มิ.ย. 2569', impact: 'critical', cat: 'inflation', unit: '% YoY',
    forecast: '3.6', actual: '3.7', prev: '3.5', beat: true, note: 'ร้อนกว่าคาด — เพิ่มโอกาส hike ก.ย.',
  },
  {
    date: '2026-07-24', time: '19:30', nameTh: 'Core PCE มิ.ย. (YoY)', nameEn: 'Core PCE YoY',
    period: 'มิ.ย. 2569', impact: 'critical', cat: 'inflation', unit: '% YoY',
    forecast: '3.2', actual: '3.3', prev: '3.1', beat: true,
  },
  {
    date: '2026-07-31', time: '01:00', nameTh: 'FOMC ก.ค. — มติดอกเบี้ย', nameEn: 'FOMC Decision',
    period: 'ก.ค. 2569', impact: 'critical', cat: 'FOMC', unit: '%',
    forecast: 'hold 70% · hike 28%', actual: '3.50–3.75%', prev: '3.50–3.75%', beat: undefined,
    note: 'HELD ✅ — คง 3.50–3.75% มติ 9:2 · ส่งสัญญาณ "data-dependent" รอ PCE + CPI ก.ย.',
  },
  {
    date: '2026-07-30', time: '19:30', nameTh: 'GDP Q2 2026 (Advance)', nameEn: 'GDP Q2 Advance',
    period: 'Q2/2569', impact: 'high', cat: 'gdp', unit: '% QoQ ann.',
    forecast: '2.1', actual: '2.3', prev: '1.8', beat: true,
  },

  // ═══════════════════════════════════════════════════════
  // สิงหาคม 2026 / 2569  (ผ่านแล้ว — EDT)
  // ═══════════════════════════════════════════════════════
  {
    date: '2026-08-06', time: '19:30', nameTh: 'ADP จ้างงาน ก.ค.', nameEn: 'ADP Employment',
    period: 'ก.ค. 2569', impact: 'medium', cat: 'employment', unit: 'K',
    forecast: '150', actual: '158', prev: '142', beat: true,
  },
  {
    date: '2026-08-07', time: '19:30', nameTh: 'NFP จ้างงานนอกภาคเกษตร ก.ค.', nameEn: 'Nonfarm Payrolls',
    period: 'ก.ค. 2569', impact: 'critical', cat: 'employment', unit: 'K',
    forecast: '165', actual: '185', prev: '178', beat: true, note: 'แรงงานยังร้อน — กดดัน hike ก.ย.',
  },
  {
    date: '2026-08-07', time: '19:30', nameTh: 'อัตราว่างงาน ก.ค.', nameEn: 'Unemployment Rate',
    period: 'ก.ค. 2569', impact: 'high', cat: 'employment', unit: '%',
    forecast: '4.0', actual: '3.9', prev: '4.0', beat: true,
  },
  {
    date: '2026-08-12', time: '19:30', nameTh: 'CPI ก.ค. (YoY)', nameEn: 'CPI YoY',
    period: 'ก.ค. 2569', impact: 'critical', cat: 'inflation', unit: '% YoY',
    forecast: '3.9', actual: '4.1', prev: '3.9', beat: true, note: 'ร้อนที่สุดในรอบ 4 เดือน — ผนึก hike ก.ย.',
  },
  {
    date: '2026-08-12', time: '19:30', nameTh: 'Core CPI ก.ค. (YoY)', nameEn: 'Core CPI YoY',
    period: 'ก.ค. 2569', impact: 'high', cat: 'inflation', unit: '% YoY',
    forecast: '3.4', actual: '3.5', prev: '3.4', beat: true,
  },
  {
    date: '2026-08-13', time: '19:30', nameTh: 'PPI ก.ค. (YoY)', nameEn: 'PPI YoY',
    period: 'ก.ค. 2569', impact: 'high', cat: 'inflation', unit: '% YoY',
    forecast: '3.2', actual: '3.3', prev: '3.1', beat: true,
  },
  {
    date: '2026-08-21', time: '21:00', nameTh: 'Jackson Hole — Powell กล่าวสุนทรพจน์', nameEn: 'Jackson Hole Symposium',
    period: 'ส.ค. 2569', impact: 'critical', cat: 'FOMC', unit: '—',
    actual: 'ยืนยัน "data-dependent" · เปิดทาง hike ก.ย. หาก CPI+PCE ยังสูง', beat: undefined,
    note: 'ตลาดรับรู้ว่า hike ก.ย. เป็นไปได้สูง · DXY แข็ง, Gold ร่วงระยะสั้น',
  },
  {
    date: '2026-08-28', time: '19:30', nameTh: 'PCE ก.ค. (YoY)', nameEn: 'PCE YoY',
    period: 'ก.ค. 2569', impact: 'critical', cat: 'inflation', unit: '% YoY',
    forecast: '3.7', actual: '3.8', prev: '3.7', beat: true,
  },
  {
    date: '2026-08-28', time: '19:30', nameTh: 'Core PCE ก.ค. (YoY)', nameEn: 'Core PCE YoY',
    period: 'ก.ค. 2569', impact: 'critical', cat: 'inflation', unit: '% YoY',
    forecast: '3.3', actual: '3.4', prev: '3.3', beat: true,
  },

  // ═══════════════════════════════════════════════════════
  // กันยายน 2026 / 2569  (ผ่านบางส่วน — EDT)
  // ═══════════════════════════════════════════════════════
  {
    date: '2026-09-02', time: '19:30', nameTh: 'ADP จ้างงาน ส.ค.', nameEn: 'ADP Employment',
    period: 'ส.ค. 2569', impact: 'medium', cat: 'employment', unit: 'K',
    forecast: '160', actual: '148', prev: '158', beat: false,
  },
  {
    date: '2026-09-04', time: '19:30', nameTh: 'NFP จ้างงานนอกภาคเกษตร ส.ค.', nameEn: 'Nonfarm Payrolls',
    period: 'ส.ค. 2569', impact: 'critical', cat: 'employment', unit: 'K',
    forecast: '56', actual: '162', prev: '185', beat: true, note: 'Massive beat! คาด 56K ออกมา 162K (+106K) — แรงงานร้อนเกินคาด หนุน hike ก.ย.',
  },
  {
    date: '2026-09-04', time: '19:30', nameTh: 'อัตราว่างงาน ส.ค.', nameEn: 'Unemployment Rate',
    period: 'ส.ค. 2569', impact: 'high', cat: 'employment', unit: '%',
    forecast: '3.9', actual: '4.0', prev: '3.9', beat: false,
  },
  {
    date: '2026-09-10', time: '19:30', nameTh: 'CPI ส.ค. (YoY)', nameEn: 'CPI YoY',
    period: 'ส.ค. 2569', impact: 'critical', cat: 'inflation', unit: '% YoY',
    forecast: '3.4', actual: '3.4', prev: '4.1', beat: undefined, note: 'ตรงคาดพอดี — สัญญาณเงินเฟ้อชะลอ',
  },
  {
    date: '2026-09-10', time: '19:30', nameTh: 'Core CPI ส.ค. (YoY)', nameEn: 'Core CPI YoY',
    period: 'ส.ค. 2569', impact: 'high', cat: 'inflation', unit: '% YoY',
    forecast: '3.4', actual: '3.4', prev: '3.5', beat: undefined,
  },
  {
    date: '2026-09-11', time: '19:30', nameTh: 'PPI ส.ค. (YoY)', nameEn: 'PPI YoY',
    period: 'ส.ค. 2569', impact: 'high', cat: 'inflation', unit: '% YoY',
    forecast: '3.3', actual: '3.2', prev: '3.3', beat: false,
  },
  {
    date: '2026-09-17', time: '01:00', nameTh: 'FOMC ก.ย. — มติดอกเบี้ย (ประชุม 16–17 ก.ย.)', nameEn: 'FOMC Decision',
    period: 'ก.ย. 2569', impact: 'critical', cat: 'FOMC', unit: '%',
    forecast: 'hike 68% · hold 28%', actual: '3.75–4.00%', prev: '3.50–3.75%', beat: undefined,
    note: 'HIKED +0.25pp ✅ → 3.75–4.00% (IORB 3.90%) · มติเป็นเอกฉันท์ · มีผล 17 ก.ย. 2569',
  },
  // ─── GDP Q2 Final ประกาศ 24 ก.ย. 2569 (ผ่านแล้ว) ──────────
  {
    date: '2026-09-30', time: '19:30', nameTh: 'Final GDP Q2 (q/q) ← ตัวเลขสุดท้าย', nameEn: 'Final GDP q/q',
    period: 'Q2/2569', impact: 'critical', cat: 'gdp', unit: '% QoQ ann.',
    forecast: '1.5', actual: '2.2', prev: '1.5', beat: true,
    note: 'Beat มาก! คาด 1.5% ออก 2.2% — เศรษฐกิจ Q2 แข็งกว่าคาดมาก หนุน hike sentiment',
  },
  // ─── PCE ส.ค. ประกาศ 30 ก.ย. 2569 (ผ่านแล้ว) ──────────────
  {
    date: '2026-09-30', time: '19:30', nameTh: 'Core PCE Price Index ส.ค. (m/m) ← ตัวชี้วัดหลัก Fed', nameEn: 'Core PCE m/m',
    period: 'ส.ค. 2569', impact: 'critical', cat: 'inflation', unit: '% m/m',
    forecast: '0.3', actual: '0.2', prev: '0.1', beat: false,
    note: 'ต่ำกว่าคาด! คาด 0.3% ออก 0.2% — เงินเฟ้อชะลอตัว สอดคล้องกับ Core CPI ส.ค.',
  },
  {
    date: '2026-09-30', time: '19:30', nameTh: 'Core PCE Price Index ส.ค. (YoY)', nameEn: 'Core PCE YoY',
    period: 'ส.ค. 2569', impact: 'high', cat: 'inflation', unit: '% YoY',
    forecast: '3.5', actual: '3.3', prev: '3.4', beat: false,
  },
  {
    date: '2026-09-30', time: '19:30', nameTh: 'PCE Price Index ส.ค. (m/m)', nameEn: 'PCE m/m',
    period: 'ส.ค. 2569', impact: 'high', cat: 'inflation', unit: '% m/m',
    forecast: '0.2', actual: '0.1', prev: '0.2', beat: false,
  },

  // ═══════════════════════════════════════════════════════
  // ตุลาคม 2026 / 2569  (อนาคต — EDT → EST หลัง 1 พ.ย.)
  // ═══════════════════════════════════════════════════════
  {
    date: '2026-10-01', time: '19:30', nameTh: 'ADP จ้างงาน ก.ย.', nameEn: 'ADP Employment',
    period: 'ก.ย. 2569', impact: 'medium', cat: 'employment', unit: 'K',
    forecast: '68', actual: '90', prev: '36', beat: true,
    note: 'Beat คาด — 90K vs คาด 68K; ส.ค. ปรับลงแรงจาก 148K เหลือ 36K',
  },
  {
    date: '2026-10-02', time: '19:30', nameTh: 'NFP จ้างงานนอกภาคเกษตร ก.ย.', nameEn: 'Nonfarm Payrolls',
    period: 'ก.ย. 2569', impact: 'critical', cat: 'employment', unit: 'K',
    forecast: '120', prev: '162', actual: '29', beat: false,
    note: '29K vs คาด 120K = miss หนักมาก (-91K) — ตลาดแรงงานเย็นลงแรงสุดในรอบหลายเดือน',
    marketImpact: [
      { asset: 'USD/DXY', effect: 'Bearish', reason: 'yield expectation ลด เพราะ Fed ไม่มีเหตุ hike' },
      { asset: 'Gold', effect: 'Bullish', reason: 'real yield ลดรับ + safe-haven demand เมื่อเศรษฐกิจชะลอ' },
      { asset: 'BTC', effect: 'Bullish ระยะสั้น', reason: 'risk-on ถ้า Fed dovish; แต่ถ้าตีความเป็น recession fear อาจกลับลง' },
      { asset: 'Bond Yield', effect: 'ลดลง', reason: 'ตลาดปรับลด hike odds → Treasury rally' },
    ],
    impactSummary: [
      'ยืนยันว่า NFP ส.ค. (+162K) เป็น outlier — ก.ย. กลับมาอ่อนแรง',
      'Fed hold ต.ค. odds พุ่ง — ไม่มีเหตุผลขึ้นดอกเบี้ยเมื่อจ้างงานแค่ 29K',
      'ต้องรอยืนยัน: CPI ก.ย. (14 ต.ค.) + Core PCE (30 ต.ค.) — ถ้าเงินเฟ้อชะลอด้วย = Gold/BTC bullish ต่อ ถ้าเงินเฟ้อยังร้อน = stagflation fear',
    ],
  },
  {
    date: '2026-10-02', time: '19:30', nameTh: 'อัตราว่างงาน ก.ย.', nameEn: 'Unemployment Rate',
    period: 'ก.ย. 2569', impact: 'high', cat: 'employment', unit: '%',
    forecast: '4.1', actual: '4.2', prev: '4.1', beat: false,
    note: 'เพิ่มขึ้นเล็กน้อย 4.1% → 4.2% ตลาดแรงงานเย็นลงสอดคล้องกับ NFP 29K',
  },
  {
    date: '2026-10-14', time: '19:30', nameTh: 'CPI ก.ย. (YoY)', nameEn: 'CPI YoY',
    period: 'ก.ย. 2569', impact: 'critical', cat: 'inflation', unit: '% YoY',
    forecast: '3.7', prev: '3.4',
  },
  {
    date: '2026-10-14', time: '19:30', nameTh: 'Core CPI ก.ย. (YoY)', nameEn: 'Core CPI YoY',
    period: 'ก.ย. 2569', impact: 'high', cat: 'inflation', unit: '% YoY',
    forecast: '3.4', prev: '3.4',
  },
  {
    date: '2026-10-15', time: '19:30', nameTh: 'PPI ก.ย. (YoY)', nameEn: 'PPI YoY',
    period: 'ก.ย. 2569', impact: 'high', cat: 'inflation', unit: '% YoY',
    forecast: '3.2', prev: '3.2',
  },
  {
    date: '2026-10-16', time: '19:30', nameTh: 'Retail Sales ก.ย. (MoM)', nameEn: 'Retail Sales',
    period: 'ก.ย. 2569', impact: 'medium', cat: 'gdp', unit: '% MoM',
    forecast: '0.3', prev: '0.4',
  },
  {
    date: '2026-10-30', time: '01:00', nameTh: 'FOMC ต.ค. — มติดอกเบี้ย (ประชุม 28–29 ต.ค.) ไม่มี Dot Plot', nameEn: 'FOMC Decision',
    period: 'ต.ค. 2569', impact: 'critical', cat: 'FOMC', unit: '%',
    forecast: 'hold 49.6% · hike 43.2%', prev: '3.75–4.00%',
    note: '▸ hike → 4.00–4.25% | ▸ hold → คง 3.75–4.00% · ไม่มี Dot Plot + SEP ในรอบนี้',
  },
  {
    date: '2026-10-30', time: '19:30', nameTh: 'Core PCE Price Index ก.ย. (m/m) ← ตัวชี้วัดหลัก Fed', nameEn: 'Core PCE m/m',
    period: 'ก.ย. 2569', impact: 'critical', cat: 'inflation', unit: '% m/m',
    forecast: '0.2', prev: '0.2',
    note: 'ตัวชี้วัดเงินเฟ้อหลักที่สุดของ Fed (สำคัญกว่า CPI)\n▸ ถ้า > 0.3% m/m → Fed ชะลอลดดอกเบี้ย, Dollar แข็งมาก (อาจทะลุ 102.5), ทองคำและ BTC กดดันหนัก\n▸ ถ้า ≤ 0.1% m/m → Fed อาจเร่งลดดอกเบี้ย 0.50% ในประชุมหน้า, Dollar อ่อน, ทองคำฟื้น, BTC rally\n▸ เชื่อมโยง: ทองคำร่วงจาก dollar strength สัปดาห์ก่อน ถ้า PCE ออกต่ำ flow อาจกลับเข้าแรง',
  },
  {
    date: '2026-10-30', time: '19:30', nameTh: 'Core PCE Price Index ก.ย. (YoY)', nameEn: 'Core PCE YoY',
    period: 'ก.ย. 2569', impact: 'high', cat: 'inflation', unit: '% YoY',
    forecast: '2.6', prev: '3.3',
  },
  {
    date: '2026-10-30', time: '19:30', nameTh: 'PCE Price Index ก.ย. (YoY)', nameEn: 'PCE YoY',
    period: 'ก.ย. 2569', impact: 'high', cat: 'inflation', unit: '% YoY',
    forecast: '3.7', prev: '3.8',
  },
  {
    date: '2026-10-30', time: '19:30', nameTh: 'GDP Q3 2026 (Advance)', nameEn: 'GDP Q3 Advance',
    period: 'Q3/2569', impact: 'critical', cat: 'gdp', unit: '% QoQ ann.',
    forecast: '1.9', prev: '2.3',
  },

  // ═══════════════════════════════════════════════════════
  // พฤศจิกายน 2026 / 2569  (อนาคต — EST หลัง 1 พ.ย. → 20:30 ICT)
  // ═══════════════════════════════════════════════════════
  {
    date: '2026-11-04', time: '20:30', nameTh: 'ADP จ้างงาน ต.ค.', nameEn: 'ADP Employment',
    period: 'ต.ค. 2569', impact: 'medium', cat: 'employment', unit: 'K',
    forecast: '150', prev: '155', note: '⚠️ หลัง 1 พ.ย. → เวลาเปลี่ยนเป็น EST (20:30 ICT)',
  },
  {
    date: '2026-11-06', time: '20:30', nameTh: 'NFP จ้างงานนอกภาคเกษตร ต.ค.', nameEn: 'Nonfarm Payrolls',
    period: 'ต.ค. 2569', impact: 'critical', cat: 'employment', unit: 'K',
    forecast: '155', prev: '162',
  },
  {
    date: '2026-11-06', time: '20:30', nameTh: 'อัตราว่างงาน ต.ค.', nameEn: 'Unemployment Rate',
    period: 'ต.ค. 2569', impact: 'high', cat: 'employment', unit: '%',
    forecast: '4.2', prev: '4.2',
  },
  {
    date: '2026-11-13', time: '20:30', nameTh: 'CPI ต.ค. (YoY)', nameEn: 'CPI YoY',
    period: 'ต.ค. 2569', impact: 'critical', cat: 'inflation', unit: '% YoY',
    forecast: '3.8', prev: '3.9',
  },
  {
    date: '2026-11-13', time: '20:30', nameTh: 'Core CPI ต.ค. (YoY)', nameEn: 'Core CPI YoY',
    period: 'ต.ค. 2569', impact: 'high', cat: 'inflation', unit: '% YoY',
    forecast: '3.3', prev: '3.4',
  },
  {
    date: '2026-11-12', time: '20:30', nameTh: 'PPI ต.ค. (YoY)', nameEn: 'PPI YoY',
    period: 'ต.ค. 2569', impact: 'high', cat: 'inflation', unit: '% YoY',
    forecast: '3.1', prev: '3.2',
  },
  {
    date: '2026-11-19', time: '20:30', nameTh: 'Retail Sales ต.ค. (MoM)', nameEn: 'Retail Sales',
    period: 'ต.ค. 2569', impact: 'medium', cat: 'gdp', unit: '% MoM',
    forecast: '0.3', prev: '0.3',
  },
  {
    date: '2026-11-25', time: '20:30', nameTh: 'Core PCE Price Index ต.ค. (m/m)', nameEn: 'Core PCE m/m',
    period: 'ต.ค. 2569', impact: 'critical', cat: 'inflation', unit: '% m/m',
    forecast: '0.2', prev: '0.2',
    note: 'Core PCE m/m คือตัวชี้วัดเงินเฟ้อหลักที่ Fed ให้น้ำหนักสูงสุด',
  },
  {
    date: '2026-11-25', time: '20:30', nameTh: 'PCE Price Index ต.ค. (YoY)', nameEn: 'PCE YoY',
    period: 'ต.ค. 2569', impact: 'high', cat: 'inflation', unit: '% YoY',
    forecast: '3.6', prev: '3.7',
  },
  {
    date: '2026-11-25', time: '20:30', nameTh: 'Core PCE Price Index ต.ค. (YoY)', nameEn: 'Core PCE YoY',
    period: 'ต.ค. 2569', impact: 'high', cat: 'inflation', unit: '% YoY',
    forecast: '3.2', prev: '3.3',
  },
  {
    date: '2026-11-25', time: '20:30', nameTh: 'GDP Q3 2026 (Second)', nameEn: 'GDP Q3 Second Est.',
    period: 'Q3/2569', impact: 'medium', cat: 'gdp', unit: '% QoQ ann.',
    forecast: '1.9', prev: '1.9',
  },

  // ═══════════════════════════════════════════════════════
  // ธันวาคม 2026 / 2569  (อนาคต — EST)
  // ═══════════════════════════════════════════════════════
  {
    date: '2026-12-03', time: '20:30', nameTh: 'ADP จ้างงาน พ.ย.', nameEn: 'ADP Employment',
    period: 'พ.ย. 2569', impact: 'medium', cat: 'employment', unit: 'K',
    forecast: '148', prev: '150',
  },
  {
    date: '2026-12-04', time: '20:30', nameTh: 'NFP จ้างงานนอกภาคเกษตร พ.ย.', nameEn: 'Nonfarm Payrolls',
    period: 'พ.ย. 2569', impact: 'critical', cat: 'employment', unit: 'K',
    forecast: '150', prev: '155',
  },
  {
    date: '2026-12-04', time: '20:30', nameTh: 'อัตราว่างงาน พ.ย.', nameEn: 'Unemployment Rate',
    period: 'พ.ย. 2569', impact: 'high', cat: 'employment', unit: '%',
    forecast: '4.2', prev: '4.2',
  },
  {
    date: '2026-12-11', time: '02:00', nameTh: 'FOMC ธ.ค. — มติดอกเบี้ย + Dot Plot + SEP (ประชุม 9–10 ธ.ค.)', nameEn: 'FOMC Decision',
    period: 'ธ.ค. 2569', impact: 'critical', cat: 'FOMC', unit: '%',
    forecast: 'hike 74.7% · hold 22.7%', prev: '3.75–4.00% (หรือ 4.00–4.25%)',
    note: '▸ Dot Plot + SEP รอบใหม่ · คาดตลาด hike สูง 74.7% · มี.ค. 2570 = Dot Plot ถัดไป',
  },
  {
    date: '2026-12-11', time: '20:30', nameTh: 'CPI พ.ย. (YoY)', nameEn: 'CPI YoY',
    period: 'พ.ย. 2569', impact: 'critical', cat: 'inflation', unit: '% YoY',
    forecast: '3.7', prev: '3.8',
  },
  {
    date: '2026-12-11', time: '20:30', nameTh: 'Core CPI พ.ย. (YoY)', nameEn: 'Core CPI YoY',
    period: 'พ.ย. 2569', impact: 'high', cat: 'inflation', unit: '% YoY',
    forecast: '3.2', prev: '3.3',
  },
  {
    date: '2026-12-11', time: '20:30', nameTh: 'PPI พ.ย. (YoY)', nameEn: 'PPI YoY',
    period: 'พ.ย. 2569', impact: 'high', cat: 'inflation', unit: '% YoY',
    forecast: '3.0', prev: '3.1',
  },
  {
    date: '2026-12-17', time: '20:30', nameTh: 'Retail Sales พ.ย. (MoM)', nameEn: 'Retail Sales',
    period: 'พ.ย. 2569', impact: 'medium', cat: 'gdp', unit: '% MoM',
    forecast: '0.4', prev: '0.3',
  },
  {
    date: '2026-12-23', time: '20:30', nameTh: 'GDP Q3 2026 (Third/Final)', nameEn: 'GDP Q3 Final',
    period: 'Q3/2569', impact: 'critical', cat: 'gdp', unit: '% QoQ ann.',
    forecast: '1.9', prev: '1.9',
  },
  {
    date: '2026-12-24', time: '20:30', nameTh: 'Core PCE Price Index พ.ย. (m/m)', nameEn: 'Core PCE m/m',
    period: 'พ.ย. 2569', impact: 'critical', cat: 'inflation', unit: '% m/m',
    forecast: '0.2', prev: '0.2',
    note: 'Core PCE m/m คือตัวชี้วัดเงินเฟ้อหลักที่ Fed ให้น้ำหนักสูงสุด',
  },
  {
    date: '2026-12-24', time: '20:30', nameTh: 'PCE Price Index พ.ย. (YoY)', nameEn: 'PCE YoY',
    period: 'พ.ย. 2569', impact: 'high', cat: 'inflation', unit: '% YoY',
    forecast: '3.5', prev: '3.6',
  },
  {
    date: '2026-12-24', time: '20:30', nameTh: 'Core PCE Price Index พ.ย. (YoY)', nameEn: 'Core PCE YoY',
    period: 'พ.ย. 2569', impact: 'high', cat: 'inflation', unit: '% YoY',
    forecast: '3.1', prev: '3.2',
  },

  // ═══════════════════════════════════════════════════════
  // มกราคม 2027 / 2570  (อนาคต ถึง 21 ม.ค. — EST)
  // ═══════════════════════════════════════════════════════
  {
    date: '2027-01-07', time: '20:30', nameTh: 'ADP จ้างงาน ธ.ค.', nameEn: 'ADP Employment',
    period: 'ธ.ค. 2569', impact: 'medium', cat: 'employment', unit: 'K',
    forecast: '145', prev: '148',
  },
  {
    date: '2027-01-08', time: '20:30', nameTh: 'NFP จ้างงานนอกภาคเกษตร ธ.ค.', nameEn: 'Nonfarm Payrolls',
    period: 'ธ.ค. 2569', impact: 'critical', cat: 'employment', unit: 'K',
    forecast: '145', prev: '150',
  },
  {
    date: '2027-01-08', time: '20:30', nameTh: 'อัตราว่างงาน ธ.ค.', nameEn: 'Unemployment Rate',
    period: 'ธ.ค. 2569', impact: 'high', cat: 'employment', unit: '%',
    forecast: '4.3', prev: '4.2',
  },
  {
    date: '2027-01-14', time: '20:30', nameTh: 'CPI ธ.ค. (YoY)', nameEn: 'CPI YoY',
    period: 'ธ.ค. 2569', impact: 'critical', cat: 'inflation', unit: '% YoY',
    forecast: '3.6', prev: '3.7',
  },
  {
    date: '2027-01-14', time: '20:30', nameTh: 'Core CPI ธ.ค. (YoY)', nameEn: 'Core CPI YoY',
    period: 'ธ.ค. 2569', impact: 'high', cat: 'inflation', unit: '% YoY',
    forecast: '3.1', prev: '3.2',
  },
  {
    date: '2027-01-15', time: '20:30', nameTh: 'PPI ธ.ค. (YoY)', nameEn: 'PPI YoY',
    period: 'ธ.ค. 2569', impact: 'high', cat: 'inflation', unit: '% YoY',
    forecast: '2.9', prev: '3.0',
  },
  {
    date: '2027-01-15', time: '20:30', nameTh: 'Retail Sales ธ.ค. (MoM)', nameEn: 'Retail Sales',
    period: 'ธ.ค. 2569', impact: 'medium', cat: 'gdp', unit: '% MoM',
    forecast: '0.5', prev: '0.4', note: 'เทศกาลคริสต์มาส/ปีใหม่ — ค้าปลีกมักดีในธ.ค.',
  },
  {
    date: '2027-01-29', time: '20:30', nameTh: 'Core PCE Price Index ธ.ค. (m/m)', nameEn: 'Core PCE m/m',
    period: 'ธ.ค. 2569', impact: 'critical', cat: 'inflation', unit: '% m/m',
    forecast: '0.2', prev: '0.2',
    note: 'Core PCE m/m คือตัวชี้วัดเงินเฟ้อหลักที่ Fed ให้น้ำหนักสูงสุด',
  },
  {
    date: '2027-01-29', time: '20:30', nameTh: 'PCE Price Index ธ.ค. (YoY)', nameEn: 'PCE YoY',
    period: 'ธ.ค. 2569', impact: 'high', cat: 'inflation', unit: '% YoY',
    forecast: '3.4', prev: '3.5',
  },
];

export function computeSurpriseStats(events: EconEvent[]) {
  const groups: Record<string, number[]> = {};
  events.forEach((e) => {
    if (e.actual == null || e.forecast == null || e.cat === 'FOMC') return;
    const a = parseFloat(e.actual);
    const f = parseFloat(e.forecast);
    if (isNaN(a) || isNaN(f)) return;
    if (!groups[e.nameEn]) groups[e.nameEn] = [];
    groups[e.nameEn].push(a - f);
  });
  const stats: Record<string, { mean: number; sd: number }> = {};
  for (const [name, surprises] of Object.entries(groups)) {
    if (surprises.length < 2) continue;
    const mean = surprises.reduce((s, v) => s + v, 0) / surprises.length;
    const variance = surprises.reduce((s, v) => s + (v - mean) ** 2, 0) / (surprises.length - 1);
    const sd = Math.sqrt(variance);
    if (sd > 0) stats[name] = { mean, sd };
  }
  return stats;
}
// ──────────────────────────────────────────────────────────────────────────────
// Key-event scenarios: ดี / ปกติ / แย่ — มองจากมุม BTC/Gold
// "ดี" = ออกฝั่ง dovish (หนุนสินทรัพย์เสี่ยงและทอง)
// กรอบ "ปกติ" = consensus ± SD ของ surprise ย้อนหลังของตัวเลขชุดเดียวกัน
// ──────────────────────────────────────────────────────────────────────────────

export interface ScenarioBand { label: 'ดี' | 'ปกติ' | 'แย่'; range: string }
export interface KeyScenario {
  date: string;
  time: string;
  nameTh: string;
  nameEn: string;
  impact: Impact;
  unit?: string;
  forecast?: string;
  prev?: string;
  basis: string;           // อธิบายว่ากรอบมาจากไหน
  bands: ScenarioBand[];   // เรียง ดี → ปกติ → แย่
}

const IMPACT_RANK: Record<Impact, number> = { critical: 0, high: 1, medium: 2 };

// ตัวเลขที่ "สูงกว่าคาด = dovish" มีแค่อัตราว่างงาน ที่เหลือต่ำกว่าคาด = dovish
const HIGHER_IS_DOVISH = new Set(['Unemployment Rate']);

function decimalsOf(s: string): number {
  const m = s.match(/\.(\d+)/);
  return m ? m[1].length : 0;
}

function fmtNum(n: number, dec: number, unit?: string): string {
  const v = n.toFixed(dec);
  if (!unit) return v;
  if (unit === 'K') return `${v}K`;
  return `${v}${unit.startsWith('%') ? unit : ' ' + unit}`;
}

function numericBands(ev: EconEvent, sd: number | undefined, samples: number): KeyScenario | null {
  const f = parseFloat(ev.forecast || '');
  if (isNaN(f)) return null;
  const dec = decimalsOf(ev.forecast!);
  const step = dec === 0 ? 1 : Math.pow(10, -dec);
  const fallback = ev.unit === 'K' ? 40 : step;
  let w = sd && sd > 0 ? sd : fallback;
  w = Math.max(step, Math.round(w / step) * step);
  const lo = f - w;
  const hi = f + w;
  const below = `< ${fmtNum(lo, dec, ev.unit)}`;
  const mid = `${lo.toFixed(dec)}–${fmtNum(hi, dec, ev.unit)}`;
  const above = `> ${fmtNum(hi, dec, ev.unit)}`;
  const higherDovish = HIGHER_IS_DOVISH.has(ev.nameEn);
  const half = w.toFixed(dec);
  const basis = sd && samples >= 2
    ? `consensus ${ev.forecast} ± ${half} (SD ของ surprise ย้อนหลัง ${samples} งวด)`
    : samples >= 2
      ? `consensus ${ev.forecast} ± ${half} (surprise ย้อนหลัง ${samples} งวดเท่ากันหมด ใช้ขั้นต่ำ)`
      : `consensus ${ev.forecast} ± ${half} (ข้อมูลย้อนหลังไม่พอ ใช้ขั้นต่ำ)`;
  return {
    date: ev.date, time: ev.time, nameTh: ev.nameTh, nameEn: ev.nameEn,
    impact: ev.impact, unit: ev.unit, forecast: ev.forecast, prev: ev.prev, basis,
    bands: [
      { label: 'ดี', range: higherDovish ? above : below },
      { label: 'ปกติ', range: mid },
      { label: 'แย่', range: higherDovish ? below : above },
    ],
  };
}

function fomcBands(ev: EconEvent): KeyScenario | null {
  const m = (ev.prev || '').match(/^(\d+\.\d+)\s*[–-]\s*(\d+\.\d+)%$/);
  if (!m) return null;
  const lo = parseFloat(m[1]);
  const hi = parseFloat(m[2]);
  const cur = `${lo.toFixed(2)}–${hi.toFixed(2)}%`;
  const hike = `${(lo + 0.25).toFixed(2)}–${(hi + 0.25).toFixed(2)}%`;
  return {
    date: ev.date, time: ev.time, nameTh: ev.nameTh, nameEn: ev.nameEn,
    impact: ev.impact, unit: ev.unit, forecast: ev.forecast, prev: ev.prev,
    basis: `ผลเป็นแบบไม่ต่อเนื่อง (คง / ขึ้น 25bp) · ตลาดคาด ${ev.forecast}`,
    bands: [
      { label: 'ดี', range: `คง ${cur} + โทน dovish` },
      { label: 'ปกติ', range: `คง ${cur}` },
      { label: 'แย่', range: `ขึ้นเป็น ${hike}` },
    ],
  };
}

// เลือก event สำคัญที่สุดที่ยังไม่ประกาศ: critical ทั้งหมดในกรอบเวลา (ขั้นต่ำ minCount, สูงสุด maxCount)
export function keyScenarios(todayIct: string, windowDays = 21, minCount = 2, maxCount = 4): KeyScenario[] {
  const stats = computeSurpriseStats(EVENTS);
  const samplesByName: Record<string, number> = {};
  EVENTS.forEach((e) => {
    if (e.actual != null && e.forecast != null && !isNaN(parseFloat(e.actual)) && !isNaN(parseFloat(e.forecast))) {
      samplesByName[e.nameEn] = (samplesByName[e.nameEn] || 0) + 1;
    }
  });

  const end = new Date(todayIct + 'T00:00:00Z');
  end.setUTCDate(end.getUTCDate() + windowDays);
  const endIso = end.toISOString().slice(0, 10);

  const outside = (e: EconEvent) => (e.date <= endIso ? 0 : 1);
  const upcoming = EVENTS
    .filter((e) => e.actual == null && e.date >= todayIct && e.forecast)
    .sort((a, b) =>
      outside(a) - outside(b)
      || IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact]
      || (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const build = (e: EconEvent) =>
    e.cat === 'FOMC' ? fomcBands(e) : numericBands(e, stats[e.nameEn]?.sd, samplesByName[e.nameEn] || 0);

  const out: KeyScenario[] = [];
  for (const e of upcoming) {
    if (out.length >= maxCount) break;
    // ครบขั้นต่ำแล้ว รับเพิ่มเฉพาะ critical ที่อยู่ในกรอบเวลา
    if (out.length >= minCount && (outside(e) === 1 || e.impact !== 'critical')) continue;
    const s = build(e);
    if (s) out.push(s);
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
