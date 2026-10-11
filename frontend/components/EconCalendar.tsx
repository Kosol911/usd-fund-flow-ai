// ปฏิทินเศรษฐกิจ — ย้อนหลัง 4 เดือน / ล่วงหน้า 4 เดือน
// เวลา ICT (UTC+7) รูปแบบ 24 ชั่วโมง
// อัปเดตทุกสัปดาห์ (เพิ่ม actual หลังประกาศ, เพิ่ม event ล่วงหน้า)

import { useState } from 'react';

import { EVENTS, computeSurpriseStats } from '../lib/econEvents';
import type { EconEvent, Impact } from '../lib/econEvents';

// ──────────────────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);


function getSurpriseZ(ev: EconEvent, stats: Record<string, { mean: number; sd: number }>): number | null {
  if (ev.actual == null || ev.forecast == null || ev.cat === 'FOMC') return null;
  const a = parseFloat(ev.actual);
  const f = parseFloat(ev.forecast);
  if (isNaN(a) || isNaN(f)) return null;
  const s = stats[ev.nameEn];
  if (!s) return null;
  return (a - f) / s.sd;
}

function ZBadge({ z }: { z: number | null }) {
  if (z === null) return null;
  const absZ = Math.abs(z);
  if (absZ < 0.5) return null;
  const color = absZ >= 2 ? (z > 0 ? '#4ADE80' : '#F87171')
    : absZ >= 1 ? (z > 0 ? '#86EFAC' : '#FB923C')
    : '#9CA3AF';
  const label = absZ >= 2 ? 'Extreme' : absZ >= 1 ? 'Notable' : '';
  return (
    <span
      className="inline-flex items-center gap-0.5 ml-1 px-1.5 py-0 rounded text-[10px] font-bold font-mono"
      style={{ color, backgroundColor: color + '15', border: `1px solid ${color}40` }}
      title={`Surprise z-score: ${z > 0 ? '+' : ''}${z.toFixed(2)}σ${label ? ` (${label})` : ''}`}
    >
      {z > 0 ? '+' : ''}{z.toFixed(1)}σ
    </span>
  );
}

const SURPRISE_STATS = computeSurpriseStats(EVENTS);

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
        · <span className="font-mono text-gray-400">±Nσ</span> = surprise z-score (ขนาดความเซอร์ไพรส์เทียบค่าเฉลี่ย)
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
          🔴 สำคัญที่สุด — Fed · CPI · NFP · PCE · GDP
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
        <table className="w-full border-collapse text-base">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-700/60 text-sm uppercase tracking-wide">
              <th className="pb-3 pr-4 pl-3 whitespace-nowrap font-semibold">วันที่</th>
              <th className="pb-3 pr-4 font-semibold">เวลา (ICT)</th>
              <th className="pb-3 pr-4 font-semibold">อีเวนต์</th>
              <th className="pb-3 pr-4 font-semibold">งวด</th>
              <th className="pb-3 pr-4 text-right font-semibold">เกิดจริง</th>
              <th className="pb-3 pr-4 text-right font-semibold">Consensus</th>
              <th className="pb-3 pr-4 text-right font-semibold">ครั้งก่อน</th>
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
                            <span className="text-lg font-black text-white">▶ วันนี้ — {(() => { const t = new Date(); return `${t.getDate()} ${['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'][t.getMonth()]} ${t.getFullYear() + 543}`; })()}</span>
                            <span className="text-sm text-gray-400">│ อีเวนต์ด้านล่าง = ยังไม่เกิด</span>
                          </div>
                        </td>
                      </tr>
                    ),

                    // Event rows for this date
                    ...events.flatMap((ev, ei) => {
                      const isFomc = ev.cat === 'FOMC';
                      const imp = IMPACT_BADGE[ev.impact];
                      const actualColor = ev.beat === true
                        ? 'text-green-400 font-bold'
                        : ev.beat === false
                        ? 'text-red-400 font-bold'
                        : 'text-gray-300';

                      return [
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
                          <td className={`py-3 pr-4 pl-3 whitespace-nowrap ${isFomc ? 'text-amber-300 font-bold' : 'text-gray-400'}`}>
                            {ei === 0 ? (
                              <div>
                                <div className={`text-base font-semibold ${isFomc ? 'text-amber-300' : 'text-gray-300'}`}>{dayStr}</div>
                                <div className="text-sm text-gray-500">{dayOfWeek}</div>
                              </div>
                            ) : null}
                          </td>

                          {/* Time */}
                          <td className={`py-3 pr-4 whitespace-nowrap font-mono text-base ${isFomc ? 'text-amber-300 font-bold' : 'text-gray-400'}`}>
                            {ev.time} น.
                          </td>

                          {/* Event name */}
                          <td className="py-3 pr-4">
                            <div className="flex flex-wrap items-start gap-1.5">
                              <span className="text-lg shrink-0">{imp.dot}</span>
                              <span className={`text-base leading-snug ${isFomc ? 'font-bold text-amber-200' : past ? 'text-gray-400' : 'text-gray-200 font-medium'}`}>
                                {ev.nameTh}
                              </span>
                            </div>
                            {ev.note && (
                              <div className={`text-sm mt-1.5 leading-relaxed pl-6 ${isFomc ? 'text-amber-400/80' : 'text-gray-500'}`}>
                                {ev.note}
                              </div>
                            )}
                          </td>

                          {/* Period */}
                          <td className="py-3 pr-4 whitespace-nowrap text-sm text-gray-500">
                            {ev.period}
                          </td>

                          {/* Actual + surprise z-score */}
                          <td className={`py-3 pr-4 text-right whitespace-nowrap font-mono text-base ${actualColor}`}>
                            {ev.actual
                              ? <>
                                  {ev.actual}{ev.unit && ev.unit !== '—' ? <span className="text-sm text-gray-500 ml-0.5">{ev.unit}</span> : null}
                                  <ZBadge z={getSurpriseZ(ev, SURPRISE_STATS)} />
                                </>
                              : <span className="text-gray-700">—</span>
                            }
                          </td>

                          {/* Forecast/Consensus */}
                          <td className="py-3 pr-4 text-right whitespace-nowrap font-mono text-base text-gray-400">
                            {ev.forecast
                              ? <>{ev.forecast}{ev.unit && ev.unit !== '—' ? <span className="text-sm text-gray-500 ml-0.5">{ev.unit}</span> : null}</>
                              : <span className="text-gray-700">—</span>
                            }
                          </td>

                          {/* Previous */}
                          <td className="py-3 pr-4 text-right whitespace-nowrap font-mono text-sm text-gray-500">
                            {ev.prev
                              ? <>{ev.prev}{ev.unit && ev.unit !== '—' ? <span className="ml-0.5">{ev.unit}</span> : null}</>
                              : '—'
                            }
                          </td>
                        </tr>,
                        ev.marketImpact && ev.marketImpact.length > 0 && (
                          <tr key={`${ev.date}-${ei}-impact`} className="border-b border-gray-800/30">
                            <td colSpan={7} className="px-4 py-3">
                              <div style={{
                                background: '#0a1628',
                                border: '1px solid #1a2d4a',
                                borderRadius: 10,
                                padding: '16px 20px',
                                maxWidth: 700,
                              }}>
                                <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>
                                  {ev.nameEn} — ผลต่อราคา
                                </div>

                                {/* Impact table — responsive: stacked on mobile */}
                                <div className="hidden sm:block">
                                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                      <tr style={{ borderBottom: '1px solid #1e3050' }}>
                                        <th style={{ textAlign: 'left', padding: '6px 12px 6px 0', fontSize: 12, color: '#7a90b4', fontWeight: 600 }}>สินทรัพย์</th>
                                        <th style={{ textAlign: 'left', padding: '6px 12px 6px 0', fontSize: 12, color: '#7a90b4', fontWeight: 600 }}>ผลกระทบ</th>
                                        <th style={{ textAlign: 'left', padding: '6px 0', fontSize: 12, color: '#7a90b4', fontWeight: 600 }}>เหตุผล</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {ev.marketImpact.map((row, ri) => (
                                        <tr key={ri} style={{ borderBottom: '1px solid #111c30' }}>
                                          <td style={{ padding: '8px 12px 8px 0', fontSize: 14, color: '#e2e8f0', fontWeight: 600, whiteSpace: 'nowrap' }}>{row.asset}</td>
                                          <td style={{
                                            padding: '8px 12px 8px 0', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap',
                                            color: row.effect.includes('Bullish') ? '#4ade80' :
                                                   row.effect.includes('Bearish') || row.effect.includes('ลดลง') ? '#f87171' : '#fbbf24',
                                          }}>{row.effect}</td>
                                          <td style={{ padding: '8px 0', fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{row.reason}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Mobile: stacked cards */}
                                <div className="flex flex-col gap-2 sm:hidden">
                                  {ev.marketImpact.map((row, ri) => (
                                    <div key={ri} style={{
                                      background: '#111c30',
                                      borderRadius: 8,
                                      padding: '10px 12px',
                                    }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <span style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 600 }}>{row.asset}</span>
                                        <span style={{
                                          fontSize: 13, fontWeight: 700,
                                          color: row.effect.includes('Bullish') ? '#4ade80' :
                                                 row.effect.includes('Bearish') || row.effect.includes('ลดลง') ? '#f87171' : '#fbbf24',
                                        }}>{row.effect}</span>
                                      </div>
                                      <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{row.reason}</div>
                                    </div>
                                  ))}
                                </div>

                                {/* Summary bullets */}
                                {ev.impactSummary && ev.impactSummary.length > 0 && (
                                  <div style={{
                                    marginTop: 14,
                                    paddingTop: 12,
                                    borderTop: '1px solid #1a2d4a',
                                  }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa', marginBottom: 6 }}>สรุป:</div>
                                    <ul style={{ margin: 0, paddingLeft: 20, listStyleType: 'disc' }}>
                                      {ev.impactSummary.map((s, si) => (
                                        <li key={si} style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.7, marginBottom: 2 }}>
                                          {s}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ),
                      ].filter(Boolean);
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
