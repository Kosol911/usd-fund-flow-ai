// ปฏิทินเศรษฐกิจ — ย้อนหลัง 4 เดือน / ล่วงหน้า 4 เดือน
// เวลา ICT (UTC+7) รูปแบบ 24 ชั่วโมง
// อัปเดตทุกสัปดาห์ (เพิ่ม actual หลังประกาศ, เพิ่ม event ล่วงหน้า)

import { useState } from 'react';

type Impact = 'critical' | 'high' | 'medium';
type Cat = 'FOMC' | 'inflation' | 'employment' | 'gdp' | 'other';

interface EconEvent {
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
}

// ──────────────────────────────────────────────────────────────────────────────
// DATA (อัปเดตทุกสัปดาห์)
// EDT = UTC-4 → 08:30 EDT = 19:30 ICT, 14:00 EDT = 01:00 ICT วันถัดไป
// EST = UTC-5 (หลัง 2 พ.ย. 2569) → 08:30 EST = 20:30 ICT, 14:00 EST = 02:00 ICT
// ──────────────────────────────────────────────────────────────────────────────
const EVENTS: EconEvent[] = [
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
    date: '2026-07-25', time: '19:30', nameTh: 'PCE มิ.ย. (YoY)', nameEn: 'PCE YoY',
    period: 'มิ.ย. 2569', impact: 'critical', cat: 'inflation', unit: '% YoY',
    forecast: '3.6', actual: '3.7', prev: '3.5', beat: true, note: 'ร้อนกว่าคาด — เพิ่มโอกาส hike ก.ย.',
  },
  {
    date: '2026-07-25', time: '19:30', nameTh: 'Core PCE มิ.ย. (YoY)', nameEn: 'Core PCE YoY',
    period: 'มิ.ย. 2569', impact: 'critical', cat: 'inflation', unit: '% YoY',
    forecast: '3.2', actual: '3.3', prev: '3.1', beat: true,
  },
  {
    date: '2026-07-30', time: '01:00', nameTh: 'FOMC ก.ค. — มติดอกเบี้ย', nameEn: 'FOMC Decision',
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
    date: '2026-08-22', time: '20:00', nameTh: 'Jackson Hole — Powell กล่าวสุนทรพจน์', nameEn: 'Jackson Hole Symposium',
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
    date: '2026-09-04', time: '19:30', nameTh: 'ADP จ้างงาน ส.ค.', nameEn: 'ADP Employment',
    period: 'ส.ค. 2569', impact: 'medium', cat: 'employment', unit: 'K',
    forecast: '160', actual: '148', prev: '158', beat: false,
  },
  {
    date: '2026-09-05', time: '19:30', nameTh: 'NFP จ้างงานนอกภาคเกษตร ส.ค.', nameEn: 'Nonfarm Payrolls',
    period: 'ส.ค. 2569', impact: 'critical', cat: 'employment', unit: 'K',
    forecast: '170', actual: '162', prev: '185', beat: false, note: 'ชะลอลงจาก 185K — แต่ยังแข็งแกร่ง',
  },
  {
    date: '2026-09-05', time: '19:30', nameTh: 'อัตราว่างงาน ส.ค.', nameEn: 'Unemployment Rate',
    period: 'ส.ค. 2569', impact: 'high', cat: 'employment', unit: '%',
    forecast: '3.9', actual: '4.0', prev: '3.9', beat: false,
  },
  {
    date: '2026-09-10', time: '19:30', nameTh: 'CPI ส.ค. (YoY)', nameEn: 'CPI YoY',
    period: 'ส.ค. 2569', impact: 'critical', cat: 'inflation', unit: '% YoY',
    forecast: '4.1', actual: '4.0', prev: '4.1', beat: false, note: 'ต่ำกว่าคาดเล็กน้อย แต่ยังสูง',
  },
  {
    date: '2026-09-10', time: '19:30', nameTh: 'Core CPI ส.ค. (YoY)', nameEn: 'Core CPI YoY',
    period: 'ส.ค. 2569', impact: 'high', cat: 'inflation', unit: '% YoY',
    forecast: '3.5', actual: '3.4', prev: '3.5', beat: false,
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
  // ─── TODAY: 21 กันยายน 2569 ───────────────────────────────
  {
    date: '2026-09-26', time: '19:30', nameTh: 'PCE ส.ค. (YoY) ← ตัวชี้วัดหลัก Fed', nameEn: 'PCE YoY',
    period: 'ส.ค. 2569', impact: 'critical', cat: 'inflation', unit: '% YoY',
    forecast: '3.7', prev: '3.8',
    note: '▸ > 3.7% = แรงกดดัน hike ต.ค. ทันที · ▸ ≤ 3.4% = ตลาด re-price hike ลด',
  },
  {
    date: '2026-09-26', time: '19:30', nameTh: 'Core PCE ส.ค. (YoY)', nameEn: 'Core PCE YoY',
    period: 'ส.ค. 2569', impact: 'critical', cat: 'inflation', unit: '% YoY',
    forecast: '3.3', prev: '3.4',
  },

  // ═══════════════════════════════════════════════════════
  // ตุลาคม 2026 / 2569  (อนาคต — EDT → EST หลัง 1 พ.ย.)
  // ═══════════════════════════════════════════════════════
  {
    date: '2026-10-01', time: '19:30', nameTh: 'ADP จ้างงาน ก.ย.', nameEn: 'ADP Employment',
    period: 'ก.ย. 2569', impact: 'medium', cat: 'employment', unit: 'K',
    forecast: '155', prev: '148',
  },
  {
    date: '2026-10-02', time: '19:30', nameTh: 'NFP จ้างงานนอกภาคเกษตร ก.ย.', nameEn: 'Nonfarm Payrolls',
    period: 'ก.ย. 2569', impact: 'critical', cat: 'employment', unit: 'K',
    forecast: '162', prev: '162',
    note: '▸ > 200K = ร้อนเกิน → hike ต.ค. odds พุ่ง · ▸ < 100K = Fed อาจ hold',
  },
  {
    date: '2026-10-02', time: '19:30', nameTh: 'อัตราว่างงาน ก.ย.', nameEn: 'Unemployment Rate',
    period: 'ก.ย. 2569', impact: 'high', cat: 'employment', unit: '%',
    forecast: '4.2', prev: '4.0',
  },
  {
    date: '2026-10-09', time: '19:30', nameTh: 'CPI ก.ย. (YoY)', nameEn: 'CPI YoY',
    period: 'ก.ย. 2569', impact: 'critical', cat: 'inflation', unit: '% YoY',
    forecast: '3.9', prev: '4.0',
  },
  {
    date: '2026-10-09', time: '19:30', nameTh: 'Core CPI ก.ย. (YoY)', nameEn: 'Core CPI YoY',
    period: 'ก.ย. 2569', impact: 'high', cat: 'inflation', unit: '% YoY',
    forecast: '3.4', prev: '3.4',
  },
  {
    date: '2026-10-14', time: '19:30', nameTh: 'PPI ก.ย. (YoY)', nameEn: 'PPI YoY',
    period: 'ก.ย. 2569', impact: 'high', cat: 'inflation', unit: '% YoY',
    forecast: '3.2', prev: '3.2',
  },
  {
    date: '2026-10-16', time: '19:30', nameTh: 'Retail Sales ก.ย. (MoM)', nameEn: 'Retail Sales',
    period: 'ก.ย. 2569', impact: 'medium', cat: 'gdp', unit: '% MoM',
    forecast: '0.3', prev: '0.4',
  },
  {
    date: '2026-10-29', time: '01:00', nameTh: 'FOMC ต.ค. — มติดอกเบี้ย (ประชุม 28–29 ต.ค.) ไม่มี Dot Plot', nameEn: 'FOMC Decision',
    period: 'ต.ค. 2569', impact: 'critical', cat: 'FOMC', unit: '%',
    forecast: 'hold 49.6% · hike 43.2%', prev: '3.75–4.00%',
    note: '▸ hike → 4.00–4.25% | ▸ hold → คง 3.75–4.00% · ไม่มี Dot Plot + SEP ในรอบนี้',
  },
  {
    date: '2026-10-30', time: '19:30', nameTh: 'PCE ก.ย. (YoY)', nameEn: 'PCE YoY',
    period: 'ก.ย. 2569', impact: 'critical', cat: 'inflation', unit: '% YoY',
    forecast: '3.7', prev: '3.8',
  },
  {
    date: '2026-10-30', time: '19:30', nameTh: 'GDP Q3 2026 (Advance)', nameEn: 'GDP Q3 Advance',
    period: 'Q3/2569', impact: 'high', cat: 'gdp', unit: '% QoQ ann.',
    forecast: '1.9', prev: '2.3',
  },

  // ═══════════════════════════════════════════════════════
  // พฤศจิกายน 2026 / 2569  (อนาคต — EST หลัง 1 พ.ย. → 20:30 ICT)
  // ═══════════════════════════════════════════════════════
  {
    date: '2026-11-05', time: '20:30', nameTh: 'ADP จ้างงาน ต.ค.', nameEn: 'ADP Employment',
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
    date: '2026-11-14', time: '20:30', nameTh: 'PPI ต.ค. (YoY)', nameEn: 'PPI YoY',
    period: 'ต.ค. 2569', impact: 'high', cat: 'inflation', unit: '% YoY',
    forecast: '3.1', prev: '3.2',
  },
  {
    date: '2026-11-19', time: '20:30', nameTh: 'Retail Sales ต.ค. (MoM)', nameEn: 'Retail Sales',
    period: 'ต.ค. 2569', impact: 'medium', cat: 'gdp', unit: '% MoM',
    forecast: '0.3', prev: '0.3',
  },
  {
    date: '2026-11-25', time: '20:30', nameTh: 'PCE ต.ค. (YoY)', nameEn: 'PCE YoY',
    period: 'ต.ค. 2569', impact: 'critical', cat: 'inflation', unit: '% YoY',
    forecast: '3.6', prev: '3.7',
  },
  {
    date: '2026-11-25', time: '20:30', nameTh: 'Core PCE ต.ค. (YoY)', nameEn: 'Core PCE YoY',
    period: 'ต.ค. 2569', impact: 'critical', cat: 'inflation', unit: '% YoY',
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
    date: '2026-12-10', time: '02:00', nameTh: 'FOMC ธ.ค. — มติดอกเบี้ย + Dot Plot + SEP (ประชุม 9–10 ธ.ค.)', nameEn: 'FOMC Decision',
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
    date: '2026-12-12', time: '20:30', nameTh: 'PPI พ.ย. (YoY)', nameEn: 'PPI YoY',
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
    period: 'Q3/2569', impact: 'medium', cat: 'gdp', unit: '% QoQ ann.',
    forecast: '1.9', prev: '1.9',
  },
  {
    date: '2026-12-24', time: '20:30', nameTh: 'PCE พ.ย. (YoY)', nameEn: 'PCE YoY',
    period: 'พ.ย. 2569', impact: 'critical', cat: 'inflation', unit: '% YoY',
    forecast: '3.5', prev: '3.6',
  },
  {
    date: '2026-12-24', time: '20:30', nameTh: 'Core PCE พ.ย. (YoY)', nameEn: 'Core PCE YoY',
    period: 'พ.ย. 2569', impact: 'critical', cat: 'inflation', unit: '% YoY',
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
    date: '2027-01-16', time: '20:30', nameTh: 'Retail Sales ธ.ค. (MoM)', nameEn: 'Retail Sales',
    period: 'ธ.ค. 2569', impact: 'medium', cat: 'gdp', unit: '% MoM',
    forecast: '0.5', prev: '0.4', note: 'เทศกาลคริสต์มาส/ปีใหม่ — ค้าปลีกมักดีในธ.ค.',
  },
  {
    date: '2027-01-29', time: '20:30', nameTh: 'PCE ธ.ค. (YoY)', nameEn: 'PCE YoY',
    period: 'ธ.ค. 2569', impact: 'critical', cat: 'inflation', unit: '% YoY',
    forecast: '3.4', prev: '3.5',
  },
];

// ──────────────────────────────────────────────────────────────────────────────

const TODAY = '2026-09-21';

const MONTH_COLORS: Record<string, string> = {
  '2026-6':  '#60A5FA', // blue
  '2026-7':  '#34D399', // emerald
  '2026-8':  '#FBBF24', // amber
  '2026-9':  '#F472B6', // pink
  '2026-10': '#A78BFA', // violet
  '2026-11': '#FB923C', // orange
  '2026-12': '#2DD4BF', // teal
  '2027-1':  '#F87171', // red
};

const MONTH_LABEL: Record<string, string> = {
  '2026-6':  'มิถุนายน 2569', '2026-7':  'กรกฎาคม 2569',
  '2026-8':  'สิงหาคม 2569',  '2026-9':  'กันยายน 2569',
  '2026-10': 'ตุลาคม 2569',   '2026-11': 'พฤศจิกายน 2569',
  '2026-12': 'ธันวาคม 2569',  '2027-1':  'มกราคม 2570',
};


const IMPACT_BADGE: Record<Impact, { label: string; dot: string; bg: string; text: string }> = {
  critical: { label: 'สูงมาก', dot: '🔴', bg: 'bg-red-900/30',    text: 'text-red-300' },
  high:     { label: 'สูง',    dot: '🟠', bg: 'bg-amber-900/20',  text: 'text-amber-300' },
  medium:   { label: 'กลาง',   dot: '🟡', bg: 'bg-yellow-900/15', text: 'text-yellow-400' },
};

function monthKey(date: string) {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
}
function isPast(date: string) { return date < TODAY; }
function isToday(date: string) { return date === TODAY; }

export default function EconCalendar() {
  const [impactFilter, setImpactFilter] = useState<'critical' | 'all'>('critical');
  const [showPast, setShowPast] = useState(true);

  const visible = EVENTS.filter((e) => {
    if (!showPast && isPast(e.date)) return false;
    if (impactFilter === 'critical' && e.impact !== 'critical') return false;
    return true;
  });

  // group by month
  const months: string[] = [];
  visible.forEach((e) => {
    const mk = monthKey(e.date);
    if (!months.includes(mk)) months.push(mk);
  });

  // find first upcoming event for TODAY marker
  const firstUpcomingDate = visible.find((e) => e.date > TODAY)?.date;

  return (
    <div className="card p-6 mb-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h2 className="text-2xl font-bold text-highlight">
          ปฏิทินเศรษฐกิจ — ย้อนหลัง & ล่วงหน้า 4 เดือน
        </h2>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-mono">เวลา ICT (UTC+7) รูปแบบ 24 ชม.</span>
          <span>·</span>
          <span className="text-amber-400/80">EDT → EST หลัง 1 พ.ย. 2569 (+1 ชม.)</span>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        สีเขียว = ดีกว่าคาด · สีแดง = แย่กว่าคาด (เทียบ Consensus)
        · ข้อมูลย้อนหลัง = ผลจริง · ข้อมูลล่วงหน้า = Consensus นักวิเคราะห์
      </p>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setImpactFilter('critical')}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
            impactFilter === 'critical'
              ? 'bg-red-700/60 border-red-500/70 text-red-100'
              : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:text-gray-200 hover:border-gray-600'
          }`}
        >
          🔴 สำคัญที่สุด — Fed · CPI · NFP · PCE
        </button>
        <button
          onClick={() => setImpactFilter('all')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            impactFilter === 'all'
              ? 'bg-sky-700/50 border-sky-500/60 text-sky-100'
              : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:text-gray-200 hover:border-gray-600'
          }`}
        >
          ทั้งหมด (รวม PPI · ADP · GDP · Retail)
        </button>
        <button
          onClick={() => setShowPast((v) => !v)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ml-auto ${
            showPast
              ? 'bg-gray-700/50 border-gray-600/50 text-gray-300'
              : 'bg-gray-800/40 border-gray-700/40 text-gray-500'
          }`}
        >
          {showPast ? '🙈 ซ่อนผ่านแล้ว' : '👁 แสดงผ่านแล้ว'}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-700/60 text-xs uppercase tracking-wide">
              <th className="pb-2 pr-3 pl-3 whitespace-nowrap font-medium">วันที่</th>
              <th className="pb-2 pr-3 font-medium">เวลา (ICT)</th>
              <th className="pb-2 pr-3 font-medium">อีเวนต์</th>
              <th className="pb-2 pr-3 font-medium">งวด</th>
              <th className="pb-2 pr-3 text-right font-medium">เกิดจริง</th>
              <th className="pb-2 pr-3 text-right font-medium">Consensus</th>
              <th className="pb-2 pr-3 text-right font-medium">ครั้งก่อน</th>
            </tr>
          </thead>
          <tbody>
            {months.map((mk) => {
              const monthEvents = visible.filter((e) => monthKey(e.date) === mk);
              const color = MONTH_COLORS[mk] ?? '#9CA3AF';
              const label = MONTH_LABEL[mk] ?? mk;
              const monthPast = monthEvents.every((e) => isPast(e.date));

              // Group by date within month
              const byDate: { dateKey: string; events: EconEvent[] }[] = [];
              monthEvents.forEach((e) => {
                const dk = e.date;
                let slot = byDate.find((s) => s.dateKey === dk);
                if (!slot) { slot = { dateKey: dk, events: [] }; byDate.push(slot); }
                slot.events.push(e);
              });

              return [
                // Month header
                <tr key={`hdr-${mk}`}>
                  <td colSpan={7} className="pt-7 pb-3">
                    <div className="flex items-center gap-3 pl-3" style={{ borderLeft: `5px solid ${color}` }}>
                      <span className="text-xl font-extrabold" style={{ color }}>{label}</span>
                      {monthPast && (
                        <span className="text-xs text-gray-600 font-normal bg-gray-800/50 px-2 py-0.5 rounded">ผ่านมาแล้ว</span>
                      )}
                    </div>
                  </td>
                </tr>,

                ...byDate.flatMap(({ dateKey, events }, di) => {
                  const d = new Date(dateKey);
                  const dayStr = `${d.getDate()} ${['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'][d.getMonth()]} ${d.getFullYear() + 543}`;
                  const dayOfWeek = ['อา','จ','อ','พ','พฤ','ศ','ส'][d.getDay()];
                  const isFirstUpcoming = events.some((e) => e.date === firstUpcomingDate);
                  const past = isPast(dateKey);

                  return [
                    // Spacer between day groups
                    di > 0 && <tr key={`gap-${dateKey}`}><td colSpan={7} className="py-1" /></tr>,

                    // TODAY marker
                    isFirstUpcoming && (
                      <tr key={`today-${dateKey}`}>
                        <td colSpan={7} className="py-1">
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 border border-white/30">
                            <span className="text-base font-black text-white">▶ วันนี้ — 21 ก.ย. 2569</span>
                            <span className="text-xs text-gray-400">│ อีเวนต์ด้านล่าง = ยังไม่เกิด</span>
                          </div>
                        </td>
                      </tr>
                    ),

                    // Event rows for this date
                    ...events.map((ev, ei) => {
                      const isFomc = ev.cat === 'FOMC';
                      const imp = IMPACT_BADGE[ev.impact];
                      const actualColor = ev.beat === true
                        ? 'text-green-400 font-bold'
                        : ev.beat === false
                        ? 'text-red-400 font-bold'
                        : 'text-gray-300';

                      return (
                        <tr
                          key={`${ev.date}-${ei}`}
                          className={`border-b transition-colors ${
                            isFomc
                              ? 'border-amber-700/40 bg-amber-900/10 hover:bg-amber-900/20'
                              : past
                              ? 'border-gray-800/60 hover:bg-white/3'
                              : 'border-gray-700/40 hover:bg-white/5'
                          } ${past && !isFomc ? 'opacity-55' : ''}`}
                          style={{ borderLeft: `3px solid ${isFomc ? '#F59E0B' : color}` }}
                        >
                          {/* Date (only first row of day) */}
                          <td className={`py-2 pr-3 pl-3 whitespace-nowrap ${isFomc ? 'text-amber-300 font-bold' : 'text-gray-400'}`}>
                            {ei === 0 ? (
                              <div>
                                <div className={`text-sm font-semibold ${isFomc ? 'text-amber-300' : 'text-gray-300'}`}>{dayStr}</div>
                                <div className="text-xs text-gray-600">{dayOfWeek}</div>
                              </div>
                            ) : null}
                          </td>

                          {/* Time */}
                          <td className={`py-2 pr-4 whitespace-nowrap font-mono text-sm ${isFomc ? 'text-amber-300 font-bold' : 'text-gray-400'}`}>
                            {ev.time} น.
                          </td>

                          {/* Event name */}
                          <td className="py-2 pr-4">
                            <div className="flex flex-wrap items-start gap-1.5">
                              <span className="text-base shrink-0">{imp.dot}</span>
                              <span className={`text-sm leading-snug ${isFomc ? 'font-bold text-amber-200' : past ? 'text-gray-400' : 'text-gray-200 font-medium'}`}>
                                {ev.nameTh}
                              </span>
                            </div>
                            {ev.note && (
                              <div className={`text-xs mt-1 leading-relaxed pl-5 ${isFomc ? 'text-amber-400/80' : 'text-gray-500'}`}>
                                {ev.note}
                              </div>
                            )}
                          </td>

                          {/* Period */}
                          <td className="py-2 pr-4 whitespace-nowrap text-xs text-gray-600">
                            {ev.period}
                          </td>

                          {/* Actual */}
                          <td className={`py-2 pr-4 text-right whitespace-nowrap font-mono text-sm ${actualColor}`}>
                            {ev.actual
                              ? <>{ev.actual}{ev.unit && ev.unit !== '—' ? <span className="text-xs text-gray-600 ml-0.5">{ev.unit}</span> : null}</>
                              : <span className="text-gray-700">—</span>
                            }
                          </td>

                          {/* Forecast/Consensus */}
                          <td className="py-2 pr-4 text-right whitespace-nowrap font-mono text-sm text-gray-400">
                            {ev.forecast
                              ? <>{ev.forecast}{ev.unit && ev.unit !== '—' ? <span className="text-xs text-gray-600 ml-0.5">{ev.unit}</span> : null}</>
                              : <span className="text-gray-700">—</span>
                            }
                          </td>

                          {/* Previous */}
                          <td className="py-2 pr-3 text-right whitespace-nowrap font-mono text-xs text-gray-600">
                            {ev.prev
                              ? <>{ev.prev}{ev.unit && ev.unit !== '—' ? <span className="ml-0.5">{ev.unit}</span> : null}</>
                              : '—'
                            }
                          </td>
                        </tr>
                      );
                    }),
                  ];
                }),
              ];
            })}
          </tbody>
        </table>

        {visible.length === 0 && (
          <div className="text-center text-gray-500 py-12">ไม่มีอีเวนต์ในหมวดนี้</div>
        )}
      </div>

      <p className="text-xs text-gray-600 mt-4">
        ⚠️ Consensus = ค่าเฉลี่ยนักวิเคราะห์ ณ วันที่บันทึก · อัปเดตทุกสัปดาห์ · ไม่ใช่คำแนะนำลงทุน ·
        แหล่งอ้างอิง: BLS, BEA, Fed, CME FedWatch
      </p>
    </div>
  );
}
