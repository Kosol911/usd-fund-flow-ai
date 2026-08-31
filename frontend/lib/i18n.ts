// Thai localization helpers for USD Fund Flow AI dashboard

export function translateRegime(regime: string): string {
  const map: Record<string, string> = {
    STRONGLY_EXPANDING: 'ขยายตัวแรง',
    EXPANDING: 'ขยายตัว',
    NEUTRAL: 'เป็นกลาง',
    CONTRACTING: 'หดตัว',
    STRONGLY_CONTRACTING: 'หดตัวแรง',
  };
  return map[regime] || regime.replace(/_/g, ' ');
}

export function regimeExplain(regime: string): string {
  if (regime.includes('EXPANDING')) {
    return 'เงินไหลเข้าระบบ — เป็นบวกต่อสินทรัพย์เสี่ยง (หุ้น, คริปโต, ทองคำ)';
  }
  if (regime.includes('CONTRACTING')) {
    return 'เงินไหลออกจากระบบ — กดดันสินทรัพย์เสี่ยง ระวังความผันผวน';
  }
  return 'สภาพคล่องสมดุล ยังไม่มีสัญญาณชัดเจนไปทางใดทางหนึ่ง';
}

export function translateBias(bias: string): string {
  const map: Record<string, string> = {
    VERY_BULLISH: 'ขาขึ้นแรง',
    BULLISH: 'ขาขึ้น',
    NEUTRAL: 'เป็นกลาง',
    BEARISH: 'ขาลง',
    VERY_BEARISH: 'ขาลงแรง',
  };
  return map[bias] || bias.replace(/_/g, ' ');
}

export function translateComponentLabel(key: string): string {
  const map: Record<string, string> = {
    tga_score: 'TGA (บัญชีคลัง)',
    rrp_score: 'RRP (เงินฝากข้ามคืน)',
    fed_bs_score: 'งบดุล Fed',
    reserves_score: 'เงินสำรองธนาคาร',
    m2_score: 'ปริมาณเงิน M2',
  };
  return map[key] || key.replace(/_/g, ' ');
}

export const COMPONENT_EXPLAIN: Record<string, string> = {
  tga_score:
    'บัญชีเงินสดของกระทรวงการคลังสหรัฐฯ ที่ Fed — ลง แปลว่ารัฐบาลใช้จ่ายเงินเข้าสู่ระบบ',
  rrp_score:
    'เงินส่วนเกินที่ธนาคาร/กองทุนพักไว้กับ Fed ข้ามคืน — ลง แปลว่าเงินถูกดึงไปลงทุนที่อื่น',
  fed_bs_score:
    'มูลค่าสินทรัพย์รวมที่ Fed ถือครอง — ขึ้น แปลว่า Fed กำลังอัดฉีดสภาพคล่อง (QE)',
  reserves_score:
    'เงินสำรองที่ธนาคารพาณิชย์ฝากไว้กับ Fed — ยิ่งสูง ธนาคารยิ่งมีกระสุนปล่อยสินเชื่อมาก',
  m2_score:
    'ปริมาณเงินในระบบเศรษฐกิจ (เงินสด + เงินฝาก) — การเติบโตสะท้อนเงินใหม่เข้าสู่ระบบ',
};

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export function thaiMonthName(monthNumber: number): string {
  return THAI_MONTHS_FULL[monthNumber - 1] || '';
}

export function formatThaiFullDate(dateStr: string): string {
  const date = new Date(dateStr);
  const weekdays = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
  return `${weekdays[date.getDay()]}ที่ ${date.getDate()} ${thaiMonthName(date.getMonth() + 1)} ${date.getFullYear() + 543}`;
}

export function formatThaiShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getDate()} ${thaiMonthName(date.getMonth() + 1)} ${date.getFullYear() + 543}`;
}

export function formatThaiTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

export function formatRelativeDayThai(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'วันนี้';
  if (diffDays === 1) return 'พรุ่งนี้';
  if (diffDays === -1) return 'เมื่อวาน';
  if (diffDays > 1 && diffDays < 14) return `อีก ${diffDays} วัน`;
  if (diffDays < -1 && diffDays > -14) return `ผ่านมาแล้ว ${Math.abs(diffDays)} วัน`;
  return formatThaiShortDate(dateStr);
}

export function isPastDate(dateStr: string): boolean {
  return new Date(dateStr).getTime() < Date.now();
}

export function isFedHighlightEvent(eventName: string): boolean {
  return /FOMC|Jackson Hole|Fed Chair/i.test(eventName);
}

export function importanceLabel(importance: number): string {
  if (importance >= 9) return 'สำคัญที่สุด';
  if (importance >= 8) return 'สำคัญมาก';
  if (importance >= 6) return 'สำคัญ';
  return 'ทั่วไป';
}
