import { useMemo } from 'react';
import { formatThaiShortDate } from '../lib/i18n';

const TODAY_LABEL = formatThaiShortDate(new Date().toISOString());

// Real market-implied probability data scraped from Investing.com's "Fed Rate Monitor Tool"
// (https://th.investing.com/central-banks/fed-rate-monitor) on the date noted below.
// Sep 16 2026: Fed HIKED +0.25pp → current range 3.75–4.00% (was 3.50–3.75%)
const SCRAPE_DATE_LABEL = '13 ก.ย. 2569 (ก่อนประชุม Sep 16)';

interface MeetingData {
  date: string; // ISO date
  label: string;
  cut: number; // cumulative probability rate ends BELOW current range
  hold: number; // probability rate stays at current range
  hike: number; // cumulative probability rate ends ABOVE current range
  isPast?: boolean;
  isAssumed?: boolean;
}

// Historical FOMC 2026 meetings — all held at 3.50-3.75% until Sep 16 (hiked to 3.75-4.00%)
const PAST_MEETINGS: MeetingData[] = [
  { date: '2026-01-28', label: '28 ม.ค. 2026', cut: 0, hold: 100, hike: 0, isPast: true },
  { date: '2026-03-18', label: '18 มี.ค. 2026*', cut: 0, hold: 100, hike: 0, isPast: true },
  { date: '2026-04-29', label: '29 เม.ย. 2026', cut: 0, hold: 100, hike: 0, isPast: true },
  { date: '2026-06-17', label: '17 มิ.ย. 2026*', cut: 0, hold: 100, hike: 0, isPast: true },
  { date: '2026-07-29', label: '29 ก.ค. 2026', cut: 0, hold: 100, hike: 0, isPast: true },
  // Sep 16: ขึ้นดอกเบี้ย +0.25pp → 3.75-4.00% (hike=100 เพราะเกิดขึ้นแล้ว)
  { date: '2026-09-16', label: '16 ก.ย. 2026* ✅ Hike', cut: 0, hold: 0, hike: 100, isPast: true },
];

// Forward meetings — probabilities from Sep 12 data (before Sep 16 hike), still directionally useful
// hold = probability outcome stays at 3.75-4.00% (new current range), hike = above 4.00%
const MEETINGS: MeetingData[] = [
  { date: '2026-10-28', label: '28 ต.ค. 2026', cut: 0, hold: 49.6, hike: 43.2, isAssumed: true },
  { date: '2026-12-09', label: '9 ธ.ค. 2026*', cut: 0, hold: 22.7, hike: 74.7, isAssumed: true },
  { date: '2027-01-27', label: '27 ม.ค. 2027', cut: 0, hold: 14.6, hike: 84.0, isAssumed: true },
  { date: '2027-03-17', label: '17 มี.ค. 2027*', cut: 0, hold: 7.1, hike: 92.2, isAssumed: true },
  { date: '2027-06-09', label: '9 มิ.ย. 2027*', cut: 0, hold: 3.8, hike: 95.6, isAssumed: true },
];

const ALL_MEETINGS: MeetingData[] = [...PAST_MEETINGS, ...MEETINGS];

const SERIES = [
  { key: 'cut' as const, name: 'ลดดอกเบี้ย', color: '#4ADE80' },
  { key: 'hold' as const, name: 'คงอัตราดอกเบี้ยที่ 3.75–4.00%', color: '#FBBF24' },
  { key: 'hike' as const, name: 'ขึ้นดอกเบี้ย (สูงกว่า 4.00%)', color: '#F87171' },
];

export default function FedDotPlot() {
  const width = 680;
  const height = 470;
  const padL = 48;
  const padR = 20;
  const padT = 56;
  const padB = 94;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const { xForDate, todayX, points, visibleMeetings } = useMemo(() => {
    const now = new Date();
    // Window: 6 months before today to 6 months after today
    const minT = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).getTime();
    const maxT = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate()).getTime();

    const visibleMeetings = ALL_MEETINGS.filter((m) => {
      const t = new Date(m.date).getTime();
      return t >= minT && t <= maxT;
    });

    const xForDate = (iso: string) => {
      const t = new Date(iso).getTime();
      return padL + ((t - minT) / (maxT - minT)) * plotW;
    };
    const todayX = xForDate(now.toISOString());

    const yForPct = (p: number) => padT + plotH - (p / 100) * plotH;
    const points = SERIES.map((s) => ({
      ...s,
      coords: visibleMeetings.map((m) => ({
        x: xForDate(m.date),
        y: yForPct(m[s.key]),
        value: m[s.key],
        label: m.label,
        isPast: !!m.isPast,
      })),
    }));
    return { xForDate, todayX, points, visibleMeetings };
  }, []);

  const yGrid = [0, 20, 40, 60, 80, 100];
  const yForPct = (p: number) => padT + plotH - (p / 100) * plotH;

  const linePath = (coords: { x: number; y: number }[]) =>
    coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');

  return (
    <div className="card p-6 mb-8">
      <h2 className="text-2xl font-bold mb-2 text-highlight">
        FOMC Rate-Path Probability — โอกาสความน่าจะเป็นการปรับดอกเบี้ยรายรอบประชุม
      </h2>
      <p className="text-sm text-gray-400 mb-1">
        แสดงช่วงเวลา 6 เดือนก่อนหน้า ถึง 6 เดือนข้างหน้า นับจากวันนี้ · แกน X คือวันประชุม/แถลงข่าว FOMC ในช่วงนั้น · แกน Y คือโอกาสความน่าจะเป็น (%) ที่อัตราดอกเบี้ยสิ้นสุดรอบนั้นจะ ลด / คง / ขึ้น เทียบกับปัจจุบัน (3.50–3.75%) ·
        รอบที่มีเครื่องหมาย * คือรอบที่มี Dot Plot ประกอบด้วย
      </p>
      <p className="text-xs text-teal-300 font-semibold mb-1">
        ✅ ข้อมูลจริงจากตลาด ดึงจาก Investing.com Fed Rate Monitor Tool (th.investing.com/central-banks/fed-rate-monitor) เมื่อ {SCRAPE_DATE_LABEL} — เป็นภาพนิ่ง ณ ขณะดึงข้อมูล ตัวเลขจะเปลี่ยนแปลงตามตลาดจริงทุกวัน
      </p>
      <p className="text-xs text-sky-300 font-semibold mb-1">
        📍 ตอนนี้อยู่ที่ {TODAY_LABEL} — ก่อนการประชุมรอบถัดไป (16 ก.ย. 2026) ลูกศรสีฟ้าบนแกน X คือตำแหน่งปัจจุบันบนไทม์ไลน์
      </p>
      <p className="text-xs text-gray-500 mb-6">
        เส้นทึบ/วงกลม = คาดการณ์จากตลาด (ข้อมูลจริง, อนาคต) · เส้นจาง/สี่เหลี่ยม = ช่วงย้อนหลัง — <strong>ข้อมูลจริง</strong> Fed ทุกรอบประชุมปี 2026 คงอัตราที่ 3.50-3.75% หลังลดครั้งสุดท้ายเมื่อ ธ.ค. 2025
      </p>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: 560 }}>
          <rect x={padL} y={padT} width={plotW} height={plotH} fill="#050810" stroke="#3a4a6b" strokeWidth={1} />

          <text x={padL + plotW / 2} y={padT - 16} textAnchor="middle" fontSize="15" fill="#e94560" fontWeight={700}>
            Implied FOMC Rate-Path Probability
          </text>

          {yGrid.map((v) => (
            <g key={v}>
              <line
                x1={padL}
                x2={padL + plotW}
                y1={yForPct(v)}
                y2={yForPct(v)}
                stroke="#3a4a6b"
                strokeWidth={1}
                strokeDasharray="2,3"
              />
              <text x={padL - 8} y={yForPct(v) + 4} textAnchor="end" fontSize="11" fill="#8891a8" fontFamily="monospace">
                {v}%
              </text>
            </g>
          ))}

          {visibleMeetings.map((m) => (
            <line
              key={m.date}
              x1={xForDate(m.date)}
              x2={xForDate(m.date)}
              y1={padT}
              y2={padT + plotH}
              stroke="#3a4a6b"
              strokeWidth={1}
              strokeDasharray="2,3"
            />
          ))}

          {/* Past-6-months context label */}
          {todayX - padL > 60 && (
            <text x={padL + (todayX - padL) / 2} y={padT + 16} textAnchor="middle" fontSize="10" fill="#5b6b8c" fontStyle="italic">
              ← ช่วงย้อนหลัง (Fed คงอัตรา)
            </text>
          )}

          {/* "Today" marker — solid white vertical bar spanning the plot, unmissable */}
          <rect x={todayX - 5} y={padT} width={10} height={plotH} fill="#FFFFFF" />
          {/* Downward-pointing arrowhead sitting right on the x-axis at "today", unmissable */}
          <polygon
            points={`${todayX - 11},${padT + plotH + 4} ${todayX + 11},${padT + plotH + 4} ${todayX},${padT + plotH + 21}`}
            fill="#FFFFFF"
          />
          <text x={todayX} y={padT + plotH + 42} textAnchor="middle" fontSize="22" fill="#FFFFFF" fontWeight={700}>
            วันนี้
          </text>
          <g>
            <line x1={todayX} x2={todayX} y1={24} y2={padT} stroke="#FFFFFF" strokeWidth={1.5} />
            <rect x={todayX - 82} y={0} width={164} height={24} rx={4} fill="#FFFFFF" />
            <text x={todayX} y={17} textAnchor="middle" fontSize="14" fill="#031018" fontWeight={700}>
              📍 วันนี้ {TODAY_LABEL}
            </text>
          </g>

          {/* Inline callout inside the chart's empty upper area, pointing straight at the today-line */}
          <g>
            <line x1={todayX} x2={todayX + 34} y1={padT + 34} y2={padT + 34} stroke="#38BDF8" strokeWidth={1.5} />
            <circle cx={todayX} cy={padT + 34} r={3.5} fill="#38BDF8" />
            <rect x={todayX + 36} y={padT + 22} width={168} height={24} rx={4} fill="#38BDF8" opacity={0.95} />
            <text x={todayX + 44} y={padT + 34} fontSize="10" fill="#031018" fontWeight={700}>
              ◄ ตอนนี้อยู่ตรงนี้
            </text>
            <text x={todayX + 44} y={padT + 44} fontSize="10" fill="#031018" fontWeight={600}>
              {TODAY_LABEL}
            </text>
          </g>

          <g transform={`translate(${padL + plotW - 210}, ${padT + 10})`}>
            <rect x={0} y={0} width={200} height={SERIES.length * 18 + 32} fill="#0a0f1c" stroke="#3a4a6b" strokeWidth={1} opacity={0.92} />
            {SERIES.map((s, i) => (
              <g key={s.key} transform={`translate(8, ${14 + i * 18})`}>
                <circle cx={0} cy={-4} r={4} fill={s.color} />
                <text x={12} y={0} fontSize="11" fill="#d7dceb">
                  {s.name}
                </text>
              </g>
            ))}
            <g transform={`translate(8, ${14 + SERIES.length * 18 + 6})`}>
              <rect x={-3.5} y={-7.5} width={7} height={7} fill="#8891a8" opacity={0.6} />
              <text x={12} y={0} fontSize="10" fill="#8891a8">
                ย้อนหลัง (Fed คงอัตรา)
              </text>
            </g>
          </g>

          {points.map((s) => {
            const pastCoords = s.coords.filter((c) => c.isPast);
            const futureCoords = s.coords.filter((c) => !c.isPast);
            return (
              <g key={s.key}>
                {pastCoords.length > 1 && (
                  <path d={linePath(pastCoords)} fill="none" stroke={s.color} strokeWidth={2} opacity={0.5} />
                )}
                {pastCoords.length > 0 && futureCoords.length > 0 && (
                  <path
                    d={linePath([pastCoords[pastCoords.length - 1], futureCoords[0]])}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2}
                    strokeDasharray="3,3"
                    opacity={0.55}
                  />
                )}
                {futureCoords.length > 1 && (
                  <path d={linePath(futureCoords)} fill="none" stroke={s.color} strokeWidth={2.25} opacity={0.9} />
                )}
                {pastCoords.map((c, i) => (
                  <rect key={`p${i}`} x={c.x - 3.5} y={c.y - 3.5} width={7} height={7} fill={s.color} opacity={0.6} stroke="#050810" strokeWidth={1}>
                    <title>{`${c.label} · ${s.name}: ${c.value}% (ย้อนหลัง — Fed คงอัตราจริง)`}</title>
                  </rect>
                ))}
                {futureCoords.map((c, i) => (
                  <circle key={`f${i}`} cx={c.x} cy={c.y} r={4.5} fill={s.color} stroke="#050810" strokeWidth={1}>
                    <title>{`${c.label} · ${s.name}: ${c.value}%`}</title>
                  </circle>
                ))}
              </g>
            );
          })}

          {visibleMeetings.map((m) => (
            <text
              key={m.date}
              x={xForDate(m.date)}
              y={padT + plotH + 22}
              textAnchor="middle"
              fontSize="11"
              fill="#c7cede"
              fontWeight={m.label.includes('*') ? 700 : 500}
              transform={`rotate(-30 ${xForDate(m.date)} ${padT + plotH + 22})`}
            >
              {m.label}
            </text>
          ))}
          <text x={padL + plotW / 2} y={height - 8} textAnchor="middle" fontSize="11" fill="#8891a8">
            รอบประชุม FOMC (Meeting Date) · * = มี Dot Plot
          </text>
        </svg>
      </div>
    </div>
  );
}
