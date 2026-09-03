import { useMemo } from 'react';

// Illustrative example data modeled on the Fed's Summary of Economic Projections (SEP) —
// NOT a live feed. Each number = one FOMC participant's rate projection (%) for that quarter's
// Dot Plot release. Window is exactly ±4 quarters (±1 year) around today.
interface QuarterColumn {
  date: string; // ISO anchor date for this projection point
  label: string;
  dots: number[];
  isPast?: boolean;
}

// Past 4 quarterly SEP releases — illustrative, gradually easing median converging toward
// today's actual policy rate (~4.00%).
const PAST_COLUMNS: QuarterColumn[] = [
  {
    date: '2025-09-17',
    label: 'ก.ย. 2025*',
    isPast: true,
    dots: [3.75, 4.0, 4.0, 4.125, 4.125, 4.125, 4.25, 4.25, 4.25, 4.375, 4.375, 4.375, 4.375, 4.5, 4.5, 4.5, 4.625, 4.75, 4.75],
  },
  {
    date: '2025-12-10',
    label: 'ธ.ค. 2025*',
    isPast: true,
    dots: [3.5, 3.75, 3.75, 3.875, 3.875, 4.0, 4.0, 4.125, 4.125, 4.125, 4.25, 4.25, 4.25, 4.375, 4.375, 4.5, 4.5, 4.625, 4.625],
  },
  {
    date: '2026-03-19',
    label: 'มี.ค. 2026*',
    isPast: true,
    dots: [3.25, 3.5, 3.5, 3.625, 3.625, 3.75, 3.75, 3.875, 3.875, 3.875, 4.0, 4.0, 4.0, 4.125, 4.125, 4.25, 4.25, 4.375, 4.5],
  },
  {
    date: '2026-06-18',
    label: 'มิ.ย. 2026*',
    isPast: true,
    dots: [3.25, 3.375, 3.5, 3.5, 3.625, 3.625, 3.75, 3.75, 3.75, 3.75, 3.875, 3.875, 4.0, 4.0, 4.0, 4.125, 4.25, 4.25, 4.375],
  },
];

// Future 4 quarterly SEP releases — same quarterly cadence, continuing the easing trend.
const FUTURE_COLUMNS: QuarterColumn[] = [
  {
    date: '2026-09-17',
    label: 'ก.ย. 2026*',
    dots: [3.5, 3.625, 3.625, 3.75, 3.75, 3.75, 3.875, 3.875, 3.875, 3.875, 3.875, 4.0, 4.0, 4.0, 4.125, 4.125, 4.25, 4.25, 4.375],
  },
  {
    date: '2026-12-10',
    label: 'ธ.ค. 2026*',
    dots: [3.25, 3.375, 3.375, 3.5, 3.5, 3.5, 3.625, 3.625, 3.625, 3.625, 3.625, 3.75, 3.75, 3.75, 3.875, 3.875, 4.0, 4.0, 4.125],
  },
  {
    date: '2027-03-18',
    label: 'มี.ค. 2027*',
    dots: [3.0, 3.125, 3.125, 3.25, 3.25, 3.25, 3.375, 3.375, 3.375, 3.375, 3.375, 3.5, 3.5, 3.5, 3.625, 3.625, 3.75, 3.75, 3.875],
  },
  {
    date: '2027-06-10',
    label: 'มิ.ย. 2027*',
    dots: [2.75, 2.875, 2.875, 3.0, 3.0, 3.0, 3.125, 3.125, 3.125, 3.125, 3.125, 3.25, 3.25, 3.25, 3.375, 3.375, 3.5, 3.5, 3.625],
  },
];

const ALL_COLUMNS: QuarterColumn[] = [...PAST_COLUMNS, ...FUTURE_COLUMNS];
const CURRENT_RATE_MID = 3.625;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export default function FedDotPlotByYear() {
  const width = 680;
  const height = 452;
  const padL = 56;
  const padR = 24;
  const padT = 56;
  const padB = 96;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const { yMin, yMax, xForDate, todayX, todayLabel, cols } = useMemo(() => {
    const allValues = ALL_COLUMNS.flatMap((c) => c.dots).concat(CURRENT_RATE_MID);
    const yMin = Math.floor(Math.min(...allValues) * 4) / 4 - 0.25;
    const yMax = Math.ceil(Math.max(...allValues) * 4) / 4 + 0.25;

    const now = new Date();
    const anchorStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const times = [...ALL_COLUMNS.map((c) => new Date(c.date).getTime()), anchorStart.getTime()];
    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    const xForDate = (iso: string) => padL + ((new Date(iso).getTime() - minT) / (maxT - minT)) * plotW;
    const todayX = xForDate(anchorStart.toISOString());
    const todayLabel = anchorStart.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

    return { yMin, yMax, xForDate, todayX, todayLabel, cols: ALL_COLUMNS };
  }, []);

  const yToPx = (y: number) => padT + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

  const gridlines: number[] = [];
  for (let v = Math.ceil(yMin / 0.25) * 0.25; v <= yMax; v += 0.25) {
    gridlines.push(Math.round(v * 100) / 100);
  }

  const dotRadius = 2.45;
  const dotGap = dotRadius * 2 + 3;

  const medianPastPath = cols
    .filter((c) => c.isPast)
    .map((col, i) => `${i === 0 ? 'M' : 'L'} ${xForDate(col.date)} ${yToPx(median(col.dots))}`)
    .join(' ');
  const medianFuturePath = cols
    .filter((c) => !c.isPast)
    .map((col, i) => `${i === 0 ? 'M' : 'L'} ${xForDate(col.date)} ${yToPx(median(col.dots))}`)
    .join(' ');
  const lastPast = cols.filter((c) => c.isPast).slice(-1)[0];
  const firstFuture = cols.filter((c) => !c.isPast)[0];
  const bridgePath =
    lastPast && firstFuture
      ? `M ${xForDate(lastPast.date)} ${yToPx(median(lastPast.dots))} L ${xForDate(firstFuture.date)} ${yToPx(median(firstFuture.dots))}`
      : '';

  return (
    <div className="card p-6 mb-8">
      <h2 className="text-2xl font-bold mb-2 text-highlight">
        Fed Dot Plot (SEP) — คาดการณ์อัตราดอกเบี้ยรายไตรมาสของกรรมการ Fed
      </h2>
      <p className="text-sm text-gray-400 mb-1">
        แต่ละจุด = มุมมองของกรรมการ Fed 1 ท่านต่ออัตราดอกเบี้ยของรอบ SEP นั้น ๆ · เส้นสีชมพูคือค่ากลาง (median) · แสดงช่วง <strong>±4 ไตรมาส (±1 ปี)</strong> รอบวันนี้: ย้อนหลัง 4 ไตรมาส + ล่วงหน้า 4 ไตรมาส
      </p>
      <p className="text-xs text-amber-300 font-semibold mb-1">
        ⚠️ ข้อมูลตัวอย่างเพื่อประกอบการอธิบาย ไม่ใช่ข้อมูลจริงจาก Fed — อัปเดตตามรายงาน SEP ฉบับล่าสุดเมื่อมีการเปิดเผยจริงในวันประชุมที่มี Dot Plot
      </p>
      <p className="text-xs text-gray-500 mb-6">
        เส้นทึบ/วงกลม = คาดการณ์ (ปัจจุบัน–อนาคต) · เส้นจาง/สี่เหลี่ยม = ค่าที่เคยประกาศไปแล้วในอดีต
      </p>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: 560 }}>
          <rect x={padL} y={padT} width={plotW} height={plotH} fill="#050810" stroke="#3a4a6b" strokeWidth={1} />
          <text x={padL + plotW / 2} y={padT - 16} textAnchor="middle" fontSize="15" fill="#e94560" fontWeight={700}>
            Summary of Economic Projections — Implied Fed Funds Rate
          </text>

          {gridlines.map((v) => (
            <g key={v}>
              <line
                x1={padL}
                x2={padL + plotW}
                y1={yToPx(v)}
                y2={yToPx(v)}
                stroke="#3a4a6b"
                strokeWidth={1}
                strokeDasharray={v % 0.5 === 0 ? undefined : '2,3'}
              />
              <text x={padL - 10} y={yToPx(v) + 4} textAnchor="end" fontSize="11" fill="#8891a8" fontFamily="monospace">
                {v.toFixed(2)}%
              </text>
            </g>
          ))}

          {/* Current rate reference */}
          <line
            x1={padL}
            x2={padL + plotW}
            y1={yToPx(CURRENT_RATE_MID)}
            y2={yToPx(CURRENT_RATE_MID)}
            stroke="#FF1493"
            strokeWidth={1.5}
            strokeDasharray="6,4"
            opacity={0.85}
          />
          <text x={padL + plotW} y={yToPx(CURRENT_RATE_MID) - 6} textAnchor="end" fontSize="11" fill="#FF1493">
            อัตรานโยบายปัจจุบัน (อ้างอิง) {CURRENT_RATE_MID.toFixed(2)}%
          </text>

          {/* Median lines: past (muted) + bridge (dashed) + future (solid) */}
          <path d={medianPastPath} fill="none" stroke="#e94560" strokeWidth={2} opacity={0.5} />
          <path d={bridgePath} fill="none" stroke="#e94560" strokeWidth={2} strokeDasharray="3,3" opacity={0.55} />
          <path d={medianFuturePath} fill="none" stroke="#e94560" strokeWidth={2.5} opacity={0.9} />

          {cols.map((col) => {
            const x = xForDate(col.date);
            const med = median(col.dots);
            const counts = new Map<number, number>();
            col.dots.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
            const isPast = !!col.isPast;

            return (
              <g key={col.date}>
                {Array.from(counts.entries()).map(([value, count]) => {
                  const y = yToPx(value);
                  const startX = x - ((count - 1) * dotGap) / 2;
                  return Array.from({ length: count }).map((_, idx) =>
                    isPast ? (
                      <rect
                        key={`${value}-${idx}`}
                        x={startX + idx * dotGap - dotRadius}
                        y={y - dotRadius}
                        width={dotRadius * 2}
                        height={dotRadius * 2}
                        fill="#F59E0B"
                        stroke="#050810"
                        strokeWidth={1}
                        opacity={0.55}
                      >
                        <title>{`${col.label}: ${value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}% (ย้อนหลัง)`}</title>
                      </rect>
                    ) : (
                      <circle
                        key={`${value}-${idx}`}
                        cx={startX + idx * dotGap}
                        cy={y}
                        r={dotRadius}
                        fill="#F59E0B"
                        stroke="#050810"
                        strokeWidth={1}
                        opacity={0.9}
                      >
                        <title>{`${col.label}: ${value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}%`}</title>
                      </circle>
                    )
                  );
                })}
                <circle cx={x} cy={yToPx(med)} r={3} fill="#e94560" stroke="#ffffff" strokeWidth={1} opacity={isPast ? 0.6 : 1} />
                <text
                  x={x}
                  y={padT + plotH + 22}
                  textAnchor="middle"
                  fontSize="11"
                  fill={isPast ? '#8891a8' : '#c7cede'}
                  fontWeight={isPast ? 500 : 700}
                  transform={`rotate(-30 ${x} ${padT + plotH + 22})`}
                >
                  {col.label}
                </text>
                <text
                  x={x}
                  y={padT + plotH + 38}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#6b7797"
                  fontFamily="monospace"
                  transform={`rotate(-30 ${x} ${padT + plotH + 38})`}
                >
                  {med.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}%
                </text>
              </g>
            );
          })}

          {/* "Today" — solid white vertical bar spanning the plot, plus arrowhead + label below the axis */}
          <rect x={todayX - 5} y={padT} width={10} height={plotH} fill="#FFFFFF" />
          <polygon
            points={`${todayX - 11},${padT + plotH + 4} ${todayX + 11},${padT + plotH + 4} ${todayX},${padT + plotH + 21}`}
            fill="#FFFFFF"
          />
          <text x={todayX} y={padT + plotH + 74} textAnchor="middle" fontSize="26" fill="#FFFFFF" fontWeight={700}>
            วันนี้
          </text>
          <rect x={todayX - 84} y={2} width={168} height={24} rx={4} fill="#FFFFFF" />
          <text x={todayX} y={19} textAnchor="middle" fontSize="14" fill="#031018" fontWeight={700}>
            📍 วันนี้ {todayLabel}
          </text>
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-6 mt-2 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: '#F59E0B' }} />
          จุด = กรรมการ Fed 1 ท่าน (คาดการณ์)
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3" style={{ background: '#F59E0B', opacity: 0.55 }} />
          จุด = ย้อนหลัง (ประกาศไปแล้ว)
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-1" style={{ background: '#e94560' }} />
          ค่ากลาง (Median)
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-0 border-t-2 border-dashed" style={{ borderColor: '#38BDF8' }} />
          วันนี้
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-0 border-t-2 border-dashed" style={{ borderColor: '#FF1493' }} />
          อัตรานโยบายปัจจุบัน
        </div>
      </div>
    </div>
  );
}
