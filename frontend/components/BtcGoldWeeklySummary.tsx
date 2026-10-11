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
  weekLabel: string;
  updatedISO: string;
  context: string;
  sections: SectionItem[];
  forwardEvents: ForwardEvent[];
  sources: SourceItem[];
}

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
  const [data, setData] = useState<WeeklyData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [model, setModel] = useState('');

  useEffect(() => {
    const CACHE_KEY = 'usd-weekly-brief';
    const CACHE_TTL = 12 * 3600 * 1000; // 12 hours

    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached && cached.ts && Date.now() - cached.ts < CACHE_TTL && cached.data?.weekLabel) {
          setData(cached.data as WeeklyData);
          setModel(cached.model || '');
          setStatus('ok');
          return;
        }
      }
    } catch {}

    let cancelled = false;
    async function load() {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 45000);
        const r = await fetch('/api/weekly-summary', { signal: controller.signal });
        clearTimeout(timer);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = await r.json();
        if (json.error) throw new Error(json.error);
        if (cancelled) return;
        const { _cached, _cachedAt, _model, _generatedAt, ...rest } = json;
        if (rest.weekLabel && rest.sections) {
          setData(rest as WeeklyData);
          setStatus('ok');
          setModel(_model || '');
          try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: rest, model: _model || '', ts: Date.now() })); } catch {}
        } else {
          throw new Error('Invalid data');
        }
      } catch {
        if (cancelled) return;
        setStatus('error');
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (status === 'loading') {
    return (
      <div className="card p-6 mb-8">
        <div className="flex items-center gap-3">
          <span className="text-2xl animate-pulse">⏳</span>
          <div>
            <h2 className="text-xl font-bold text-highlight">₿ BTC & Gold — สรุปสัปดาห์</h2>
            <p className="text-sm text-yellow-400 animate-pulse mt-1">AI กำลังวิเคราะห์ข้อมูลสัปดาห์นี้...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error' || !data) {
    return (
      <div className="card p-6 mb-8">
        <h2 className="text-xl font-bold text-highlight mb-2">₿ BTC & Gold — สรุปสัปดาห์</h2>
        <div className="rounded-lg bg-amber-900/20 border border-amber-700/30 p-4">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span className="text-amber-400 font-semibold text-sm">ไม่สามารถโหลดข้อมูลสัปดาห์ได้</span>
          </div>
          <p className="text-xs text-amber-500/70 mt-1 pl-6">
            ข้อมูลจะถูก generate อัตโนมัติทุก 06:00 น. ICT · ลองใหม่ในภายหลัง
          </p>
        </div>
      </div>
    );
  }

  const updatedDate = new Date(data.updatedISO);
  const thaiMonthsShort = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const updatedLabel = `${updatedDate.getDate()} ${thaiMonthsShort[updatedDate.getMonth()]} ${updatedDate.getFullYear() + 543}`;

  return (
    <div className="card p-6 mb-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2 mb-1">
        <h2 className="text-2xl font-bold text-highlight">
          ₿ BTC & Gold — สรุปสัปดาห์ที่ผ่านมา และคาดการณ์ล่วงหน้า 2 สัปดาห์
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-green-400 font-mono bg-green-900/30 px-2 py-1 rounded">
            🤖 AI ({model})
          </span>
          <span className="text-xs text-gray-500 font-mono bg-gray-800/60 px-2 py-1 rounded">
            อัปเดต {updatedLabel}
          </span>
        </div>
      </div>
      <div className="text-lg text-orange-300 font-semibold mb-1 leading-tight">
        สัปดาห์ที่ผ่านมา: {data.weekLabel}
      </div>
      <p className="text-sm text-gray-300 mb-1 leading-relaxed border-l-2 border-orange-500/50 pl-3">
        {data.context}
      </p>
      <p className="text-xs text-gray-600 mb-6">
        ไม่มีคำแนะนำลงทุน · ไม่มีราคาเป้าหมาย · อ้างอิงข้อมูลที่ตรวจสอบได้เท่านั้น
      </p>

      {/* Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-0 mb-6">
        {data.sections.map((s) => (
          <SectionBlock key={s.id} section={s} />
        ))}
      </div>

      {/* Sources */}
      {data.sources && data.sources.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-bold bg-sky-800/60 text-sky-300 px-2 py-0.5 rounded font-mono">06</span>
            <h3 className="text-sm font-bold text-white">แหล่งข้อมูล</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pl-8">
            {data.sources.map((src, i) => (
              <a
                key={i}
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
      )}

      {/* Forward Events */}
      {data.forwardEvents && data.forwardEvents.length > 0 && (
        <div>
          <div className="flex flex-wrap items-baseline gap-3 mb-3">
            <h3 className="text-lg text-orange-300 font-semibold leading-tight">
              คาดการณ์ปัจจัยสำคัญ 3 สัปดาห์ข้างหน้า
            </h3>
            <span className="text-sm text-gray-500">(ไม่ทำนายราคา)</span>
          </div>
          <div className="space-y-3 pl-2">
            {data.forwardEvents.map((ev, i) => (
              <div key={i} className="rounded-lg bg-amber-900/10 border border-amber-800/25 p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-sm font-mono text-amber-400 shrink-0">{ev.date}</span>
                  {ev.time && (
                    <span className="text-xs font-mono text-gray-500 bg-gray-800/60 px-2 py-0.5 rounded shrink-0">
                      🕐 {ev.time}
                    </span>
                  )}
                  <span className="text-sm font-bold text-white">{ev.event}</span>
                  {ev.consensus && (
                    <span className="text-xs text-gray-400 bg-gray-800/50 px-2 py-0.5 rounded">
                      consensus: {ev.consensus}
                    </span>
                  )}
                </div>
                <div className="space-y-1 pl-1">
                  {ev.watch.split('\n').map((line, li) => (
                    <div
                      key={li}
                      className={`text-sm leading-relaxed ${
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
      )}

      <p className="text-[10px] text-gray-600 mt-4">
        BTC: Binance · Gold/DXY: Yahoo Finance · ETF: Farside · วิเคราะห์โดย {model || 'AI'} · ไม่ใช่คำแนะนำลงทุน
      </p>
    </div>
  );
}
