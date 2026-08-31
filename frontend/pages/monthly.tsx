import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { timelineApi } from '@/lib/api';
import { thaiMonthName, formatThaiFullDate, formatThaiTime, isFedHighlightEvent } from '@/lib/i18n';

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

export default function MonthlyPage() {
  const router = useRouter();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (router.query.year) {
      setYear(parseInt(router.query.year as string));
    }
    if (router.query.month) {
      setMonth(parseInt(router.query.month as string));
    }
  }, [router.query]);

  useEffect(() => {
    loadMonthlyTimeline();
  }, [year, month]);

  const loadMonthlyTimeline = async () => {
    try {
      setLoading(true);
      const data = await timelineApi.getMonthlyTimeline(year, month);
      setEvents(data.events || []);
    } catch (err) {
      console.error('Error loading monthly timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  const monthName = thaiMonthName(month);

  const prevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  const groupEventsByDay = () => {
    const grouped: { [key: string]: TimelineEvent[] } = {};
    events.forEach((event) => {
      const date = new Date(event.release_datetime_utc).toLocaleDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(event);
    });
    return grouped;
  };

  const eventsByDay = groupEventsByDay();

  return (
    <>
      <Head>
        <title>ปฏิทินรายเดือน - USD Fund Flow AI</title>
      </Head>

      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/annual">
              <span className="text-highlight hover:underline cursor-pointer">← กลับปฏิทินรายปี</span>
            </Link>
            <h1 className="text-4xl font-bold mt-4 mb-2">ปฏิทินรายเดือน (Monthly Timeline)</h1>
            <p className="text-sm text-gray-400 mb-4">
              เปิดดูทุกวันอาทิตย์ก่อนเริ่มสัปดาห์ใหม่ เพื่อวางแผนล่วงหน้าก่อนอีเวนต์สำคัญ
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={prevMonth}
                className="px-4 py-2 bg-accent rounded hover:bg-highlight transition-colors"
              >
                ← เดือนก่อน
              </button>
              <span className="text-3xl font-extrabold underline decoration-4 underline-offset-4">
                {monthName} {year}
              </span>
              <button
                onClick={nextMonth}
                className="px-4 py-2 bg-accent rounded hover:bg-highlight transition-colors"
              >
                เดือนถัดไป →
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-xl">กำลังโหลดอีเวนต์...</div>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.keys(eventsByDay).length > 0 ? (
                (() => {
                  const now = new Date();
                  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
                  const sortedEntries = Object.entries(eventsByDay).sort(
                    ([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime()
                  );
                  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                  let todayMarkerRendered = false;

                  const nodes: JSX.Element[] = [];
                  sortedEntries.forEach(([date, dayEvents]) => {
                    const dayStart = new Date(date).setHours(0, 0, 0, 0);
                    if (isCurrentMonth && !todayMarkerRendered && dayStart > todayStart) {
                      todayMarkerRendered = true;
                      nodes.push(
                        <div key="today-marker" className="flex items-center gap-2 py-2">
                          <span className="text-sky-400 text-2xl font-black leading-none">➤</span>
                          <div className="flex-1 h-1 bg-sky-400 rounded" />
                          <div className="text-sky-200 font-extrabold text-base whitespace-nowrap bg-sky-500 bg-opacity-20 border-2 border-sky-400 rounded-full px-4 py-1.5 shadow-[0_0_12px_rgba(56,189,248,0.5)]">
                            📍 วันนี้ — {formatThaiFullDate(now.toISOString())}
                          </div>
                          <div className="flex-1 h-1 bg-sky-400 rounded" />
                        </div>
                      );
                    }
                    nodes.push(
                    <div key={date} className="timeline-month">
                      <div className="timeline-day font-bold text-lg mb-3">
                        {formatThaiFullDate(dayEvents[0].release_datetime_utc)}
                      </div>
                      <div className="space-y-2">
                        {dayEvents.map((event) => {
                          const isFed = isFedHighlightEvent(event.event_name);
                          return (
                            <div
                              key={event.id}
                              className={`timeline-event ${isFed ? 'bg-amber-400 bg-opacity-10' : ''}`}
                              style={{ borderLeftColor: isFed ? '#F59E0B' : event.color, borderLeftWidth: isFed ? 6 : undefined }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                  <span className="text-2xl">{event.emoji}</span>
                                  <div>
                                    <div
                                      className={
                                        isFed
                                          ? 'font-extrabold text-xl text-amber-300 underline decoration-2 underline-offset-4 decoration-amber-400'
                                          : 'font-bold text-lg'
                                      }
                                    >
                                      {event.event_name}
                                    </div>
                                    <div className={`text-sm mt-1 ${isFed ? 'text-amber-300 font-semibold' : 'text-gray-400'}`}>
                                      {event.category} • ระดับความสำคัญ: {event.importance}/10
                                    </div>
                                    <div className={`text-xs mt-1 ${isFed ? 'text-amber-300 font-bold' : 'text-gray-500'}`}>
                                      {formatThaiTime(event.release_datetime_utc)} น.
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    );
                  });

                  if (isCurrentMonth && !todayMarkerRendered) {
                    nodes.push(
                      <div key="today-marker" className="flex items-center gap-3 py-1">
                        <div className="flex-1 h-0.5 bg-sky-400" />
                        <div className="text-sky-300 font-extrabold text-sm whitespace-nowrap bg-sky-400 bg-opacity-10 border border-sky-400 rounded-full px-3 py-1">
                          📍 วันนี้ — {formatThaiFullDate(now.toISOString())}
                        </div>
                        <div className="flex-1 h-0.5 bg-sky-400" />
                      </div>
                    );
                  }

                  return nodes;
                })()
              ) : (
                <div className="card p-12 text-center">
                  <div className="text-xl text-gray-400">
                    ไม่มีอีเวนต์ในเดือนนี้
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
