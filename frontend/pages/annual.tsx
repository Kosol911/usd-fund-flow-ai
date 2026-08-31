import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { timelineApi } from '@/lib/api';
import { thaiMonthName, formatThaiShortDate, isFedHighlightEvent } from '@/lib/i18n';

interface TimelineEvent {
  id: number;
  event_name: string;
  event_key: string;
  category: string;
  release_datetime_utc: string;
  importance: number;
  emoji: string;
  color: string;
}

interface MonthData {
  month: number;
  month_name: string;
  event_count: number;
  extreme_events: number;
  high_events: number;
  events: TimelineEvent[];
}

export default function AnnualPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [months, setMonths] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnnualTimeline();
  }, [year]);

  const loadAnnualTimeline = async () => {
    try {
      setLoading(true);
      const data = await timelineApi.getAnnualTimeline(year);
      setMonths(data.months || []);
    } catch (err) {
      console.error('Error loading annual timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>ปฏิทินรายปี - USD Fund Flow AI</title>
      </Head>

      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/">
              <span className="text-highlight hover:underline cursor-pointer">← กลับหน้าหลัก</span>
            </Link>
            <h1 className="text-4xl font-bold mt-4 mb-2">ปฏิทินรายปี (Annual Timeline)</h1>
            <p className="text-sm text-gray-400 mb-4">
              มองหาเดือนที่มีจุดแดงกระจุกตัว = ผันผวนสูง · เดือนที่เงียบ = เหมาะสร้างสถานะระยะยาว
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setYear(year - 1)}
                className="px-4 py-2 bg-accent rounded hover:bg-highlight transition-colors"
              >
                ← {year - 1}
              </button>
              <span className="text-2xl font-bold">{year}</span>
              <button
                onClick={() => setYear(year + 1)}
                className="px-4 py-2 bg-accent rounded hover:bg-highlight transition-colors"
              >
                {year + 1} →
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-xl">กำลังโหลดปฏิทิน...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {months.map((month) => (
                <div key={month.month} className="card p-6">
                  <h2 className="text-3xl font-extrabold mb-4 text-highlight underline decoration-4 underline-offset-4">
                    {thaiMonthName(month.month)}
                  </h2>

                  <div className="mb-4 text-sm text-gray-400">
                    <div>จำนวนอีเวนต์ทั้งหมด: {month.event_count}</div>
                    <div className="flex gap-4 mt-2">
                      <span>🔴 {month.extreme_events}</span>
                      <span>🟡 {month.high_events}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {month.events.length > 0 ? (
                      month.events.map((event) => {
                        const isFed = isFedHighlightEvent(event.event_name);
                        return (
                          <div
                            key={event.id}
                            className={`p-3 rounded transition-colors ${
                              isFed
                                ? 'bg-amber-400 bg-opacity-10 border-l-4 border-amber-500 hover:bg-opacity-20'
                                : 'bg-accent hover:bg-opacity-80'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-lg">{event.emoji}</span>
                              <div className="flex-1">
                                <div
                                  className={
                                    isFed
                                      ? 'font-extrabold text-base text-amber-300 underline decoration-2 underline-offset-4 decoration-amber-400'
                                      : 'font-semibold text-sm'
                                  }
                                >
                                  {event.event_name}
                                </div>
                                <div className={`text-xs mt-1 ${isFed ? 'text-amber-300 font-bold' : 'text-gray-400'}`}>
                                  {formatThaiShortDate(event.release_datetime_utc)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-gray-500 text-sm text-center py-4">
                        ไม่มีอีเวนต์สำคัญ
                      </div>
                    )}
                  </div>

                  <Link href={`/monthly?year=${year}&month=${month.month}`}>
                    <div className="mt-4 text-center text-highlight hover:underline cursor-pointer text-sm">
                      ดูอีเวนต์ทั้งหมด →
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
