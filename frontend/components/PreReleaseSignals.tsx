import { useEffect, useState, ReactNode } from 'react';
import { signalApi } from '../lib/api';

interface ClaimsSignal {
  available: boolean;
  reference_month: string;
  survey_week_ending: string;
  survey_week_claims: number | null;
  prior_survey_week_ending: string;
  prior_survey_week_claims: number | null;
  latest_week_ending: string | null;
  latest_claims: number | null;
  avg_4w: number | null;
  survey_week_change: number | null;
  survey_week_direction: 'better' | 'worse' | null;
  pending_reason?: string;
  note: string;
}

interface TruflationSignal {
  configured: boolean;
  available: boolean;
  latest_date?: string;
  latest_value?: number;
  change_30d?: number | null;
  direction?: 'up' | 'down' | null;
  lead_days?: number;
  note: string;
}

interface SignalResponse {
  claims: ClaimsSignal;
  truflation: TruflationSignal;
}

const fmt = (n: number) => n.toLocaleString('en-US');

function Panel({ title, badge, children }: { title: string; badge: string; children: ReactNode }) {
  return (
    <div style={{ background: '#111c30', border: '1px solid #1e3050', borderRadius: 8, padding: 16 }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-highlight">{title}</h3>
        <span style={{ fontSize: 11, color: '#7a90b4', background: '#0c1626', padding: '3px 9px', borderRadius: 6 }}>
          {badge}
        </span>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' | 'muted' }) {
  const color = tone === 'good' ? '#4ade80' : tone === 'bad' ? '#f87171' : tone === 'muted' ? '#7a90b4' : '#e2e8f0';
  return (
    <div className="flex items-center justify-between" style={{ padding: '6px 0', borderBottom: '1px solid #1a2740', fontSize: 13 }}>
      <span style={{ color: '#7a90b4' }}>{label}</span>
      <span style={{ color, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

export default function PreReleaseSignals() {
  const [data, setData] = useState<SignalResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    signalApi
      .getPreReleaseSignals()
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  if (failed) return null;

  if (!data) {
    return (
      <div className="card p-6 mb-8">
        <h2 className="text-2xl font-bold mb-2 text-highlight">สัญญาณล่วงหน้า 2-4 สัปดาห์</h2>
        <p style={{ color: '#7a90b4', fontSize: 13 }}>กำลังโหลด…</p>
      </div>
    );
  }

  const { claims, truflation } = data;

  return (
    <div className="card p-6 mb-8">
      <h2 className="text-2xl font-bold mb-2 text-highlight">สัญญาณล่วงหน้า 2-4 สัปดาห์</h2>
      <p className="text-sm text-gray-400 mb-5">
        ตัวชี้นำที่ขยับก่อนตัวเลขทางการ ต่างจาก nowcast ที่แม่นเฉพาะ 1-7 วันก่อนประกาศ
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="Initial Claims — สัปดาห์สำรวจ NFP" badge={`อ้างอิง ${claims.reference_month}`}>
          {claims.available ? (
            <>
              <Row label={`สัปดาห์สำรวจ (สิ้นสุด ${claims.survey_week_ending})`}
                   value={claims.survey_week_claims !== null ? fmt(claims.survey_week_claims) : 'รอ DOL'}
                   tone={claims.survey_week_claims === null ? 'muted' : undefined} />
              <Row label={`สัปดาห์สำรวจเดือนก่อน (${claims.prior_survey_week_ending})`}
                   value={claims.prior_survey_week_claims !== null ? fmt(claims.prior_survey_week_claims) : '—'} />
              {claims.survey_week_change !== null && (
                <Row label="เทียบเดือนก่อน"
                     value={`${claims.survey_week_change > 0 ? '+' : ''}${fmt(claims.survey_week_change)}`}
                     tone={claims.survey_week_direction === 'better' ? 'good' : 'bad'} />
              )}
              <Row label={`ล่าสุด (${claims.latest_week_ending})`}
                   value={claims.latest_claims !== null ? fmt(claims.latest_claims) : '—'} />
              <Row label="เฉลี่ย 4 สัปดาห์" value={claims.avg_4w !== null ? fmt(claims.avg_4w) : '—'} />

              {claims.pending_reason && (
                <div style={{ marginTop: 10, padding: '8px 11px', background: '#1a2333', borderRadius: 6, fontSize: 12, color: '#fbbf24', lineHeight: 1.5 }}>
                  {claims.pending_reason}
                </div>
              )}
              <div style={{ marginTop: 8, fontSize: 11, color: '#5a6f94', lineHeight: 1.5 }}>{claims.note}</div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: '#7a90b4' }}>ยังไม่มีข้อมูล — รอรอบ sync ถัดไป</div>
          )}
        </Panel>

        <Panel title="Truflation — เงินเฟ้อรายวัน" badge={truflation.available ? `นำ CPI ${truflation.lead_days} วัน` : 'ยังไม่เปิดใช้'}>
          {truflation.available ? (
            <>
              <Row label={`ค่าล่าสุด (${truflation.latest_date})`} value={`${truflation.latest_value}%`} />
              {truflation.change_30d !== null && truflation.change_30d !== undefined && (
                <Row label="เปลี่ยนแปลง 30 วัน"
                     value={`${truflation.change_30d > 0 ? '+' : ''}${truflation.change_30d}pp`}
                     tone={truflation.direction === 'down' ? 'good' : 'bad'} />
              )}
              <Row label="ทิศทาง"
                   value={truflation.direction === 'down' ? 'เงินเฟ้อชะลอ' : truflation.direction === 'up' ? 'เงินเฟ้อเร่ง' : '—'}
                   tone={truflation.direction === 'down' ? 'good' : truflation.direction === 'up' ? 'bad' : 'muted'} />
              <div style={{ marginTop: 10, padding: '8px 11px', background: '#1a2333', borderRadius: 6, fontSize: 12, color: '#fbbf24', lineHeight: 1.5 }}>
                {truflation.note}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: '#7a90b4', lineHeight: 1.6 }}>
              {truflation.note}
              <a href="https://truflation.com/pricing" target="_blank" rel="noopener noreferrer"
                 style={{ color: '#4a9eff', display: 'block', marginTop: 8 }}>
                ดูแพ็กเกจ Truflation ↗
              </a>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
