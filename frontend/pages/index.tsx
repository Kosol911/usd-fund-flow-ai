import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { liquidityApi, crossAssetApi, eventApi } from '../lib/api';
import TradingViewCharts from '../components/TradingViewCharts';
import BtcGoldWeeklySummary from '../components/BtcGoldWeeklySummary';
import CdcSignals from '../components/CdcSignals';
import FedRatePath from '../components/FedRatePath';
import PreReleaseSignals from '../components/PreReleaseSignals';
import ForecastSourceGuide from '../components/ForecastSourceGuide';
import EconCalendar from '../components/EconCalendar';
import EventReactionTable from '../components/EventReactionTable';
import {
  translateRegime,
  regimeExplain,
  translateBias,
  formatRelativeDayThai,
  importanceLabel,
  isPastDate,
  thaiMonthName,
  formatThaiTime,
  isFedHighlightEvent,
} from '../lib/i18n';

// Distinct accent color per month band (cycled across the ~8-month window shown)
const MONTH_COLORS = ['#60A5FA', '#34D399', '#FBBF24', '#F472B6', '#A78BFA', '#FB923C', '#2DD4BF', '#F87171'];

interface LiquidityData {
  liquidity_score: number;
  regime: string;
  components: any;
}

interface CrossAsset {
  asset: string;
  regime_bias: string;
}

interface UpcomingEvent {
  id: number;
  event_name: string;
  release_datetime_utc: string;
  importance: number;
  forecast?: number | null;
  previous?: number | null;
  actual?: number | null;
  unit?: string | null;
}

export default function Home() {
  const [liquidity, setLiquidity] = useState<LiquidityData | null>(null);
  const [crossAssets, setCrossAssets] = useState<CrossAsset[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 4);
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 4);

      const [liquidityData, crossAssetData, eventsData] = await Promise.all([
        liquidityApi.getCurrentLiquidity().catch(() => null),
        crossAssetApi.getCrossAssetSummary().catch(() => []),
        eventApi
          .getEvents({
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            min_importance: 6,
            limit: 200,
          })
          .catch(() => []),
      ]);

      setLiquidity(liquidityData);
      setCrossAssets(crossAssetData);
      setUpcomingEvents(eventsData);
    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      setError(err.message || 'โหลดข้อมูล Dashboard ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const getRegimeColor = (regime: string) => {
    if (regime.includes('EXPANDING')) return 'text-green-400';
    if (regime.includes('CONTRACTING')) return 'text-red-400';
    return 'text-yellow-400';
  };

  const getBiasColor = (bias: string) => {
    if (bias.includes('BULLISH')) return 'text-green-400';
    if (bias.includes('BEARISH')) return 'text-red-400';
    return 'text-gray-400';
  };

  const getImportanceEmoji = (importance: number) => {
    if (importance >= 9) return '🔴';
    if (importance >= 8) return '🟠';
    if (importance >= 6) return '🟡';
    return '🟢';
  };

  const fmtVal = (v: number | null | undefined, unit?: string | null) => {
    if (v === null || v === undefined) return '—';
    return `${v}${unit || ''}`;
  };

  const surpriseColor = (actual?: number | null, forecast?: number | null) => {
    if (actual === null || actual === undefined || forecast === null || forecast === undefined) return 'text-gray-300';
    if (actual > forecast) return 'text-green-400';
    if (actual < forecast) return 'text-red-400';
    return 'text-gray-300';
  };

  const groupEventsByMonth = (events: UpcomingEvent[]) => {
    const groups: { key: string; year: number; month: number; events: UpcomingEvent[] }[] = [];
    events.forEach((event) => {
      const d = new Date(event.release_datetime_utc);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      let group = groups.find((g) => g.key === key);
      if (!group) {
        group = { key, year: d.getFullYear(), month: d.getMonth() + 1, events: [] };
        groups.push(group);
      }
      group.events.push(event);
    });
    return groups;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">กำลังโหลด...</div>
      </div>
    );
  }

  const firstFutureEventId = upcomingEvents.find((e) => !isPastDate(e.release_datetime_utc))?.id;

  return (
    <>
      <Head>
        <title>USD Fund Flow AI - แดชบอร์ด</title>
        <meta name="description" content="ระบบวิจัยและวางแผนเศรษฐกิจมหภาค" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-12 text-center">
            <h1 className="text-5xl font-bold mb-4 text-highlight">
              USD FUND FLOW AI
            </h1>
            <p className="text-xl text-gray-400">
              ระบบวิจัยและวางแผนเศรษฐกิจมหภาค
            </p>
          </header>

          {error && (
            <div className="mb-8 p-4 bg-red-900 bg-opacity-30 border border-red-500 rounded-lg">
              <p className="text-red-300">⚠️ {error}</p>
              <p className="text-sm text-gray-400 mt-2">
                กำลังแสดงข้อมูลตัวอย่าง (demo mode)
              </p>
            </div>
          )}

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Liquidity Panel */}
            <div className="card-liquidity p-6">
              <h2 className="text-2xl font-bold mb-4 text-liquidity">สภาพคล่อง (LIQUIDITY)</h2>
              {liquidity ? (
                <>
                  <div className="text-6xl font-bold mb-2 text-white">
                    {liquidity.liquidity_score.toFixed(0)}
                  </div>
                  <div className={`text-2xl font-semibold mb-3 ${getRegimeColor(liquidity.regime)}`}>
                    {translateRegime(liquidity.regime)}
                  </div>
                  <div className="text-sm text-teal-200 text-opacity-70 mb-3">
                    ช่วงคะแนน: -100 ถึง +100
                  </div>
                  <div className="text-sm text-teal-100 text-opacity-90 border-t border-teal-800 pt-3">
                    {regimeExplain(liquidity.regime)}
                  </div>
                </>
              ) : (
                <div className="rounded-lg bg-amber-900/20 border border-amber-700/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">⏳</span>
                    <span className="text-amber-400 font-semibold">ไม่สามารถเชื่อมต่อ Backend</span>
                  </div>
                  <p className="text-sm text-amber-500/70">
                    Railway อาจยัง cold-start · รีเฟรชหน้าเพื่อลองใหม่
                  </p>
                </div>
              )}
            </div>

            {/* USD Panel */}
            <div className="card-usd p-6">
              <h2 className="text-2xl font-bold mb-4 text-usd">ดัชนีดอลลาร์ (USD)</h2>
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-4xl font-bold text-white">แข็งค่า</span>
                <span className="text-2xl font-bold text-violet-200 font-mono">DXY ~102</span>
              </div>
              <div className="text-sm text-violet-200 text-opacity-70 mt-4">
                หลัง Fed hike 16 ก.ย. · ตลาดคาด hike เพิ่มอีกที่ประชุม 28 ต.ค.
              </div>
              <div className="text-sm text-violet-100 text-opacity-90 border-t border-violet-800 pt-3 mt-3">
                ดอลลาร์แข็ง มักกดดัน Gold และ BTC · ดอลลาร์อ่อน มักหนุนราคาสินทรัพย์เหล่านี้ให้ขึ้น
              </div>
            </div>

            {/* Rates Panel */}
            <div className="card-rates p-6">
              <h2 className="text-2xl font-bold mb-4 text-rates">อัตราดอกเบี้ย (RATES)</h2>
              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-4xl font-bold text-blue-200 font-mono">3.90%</span>
                <span className="text-base text-blue-300/70">IORB</span>
              </div>
              <div className="text-sm text-blue-300/80 mb-3">
                กรอบเป้าหมาย <span className="font-mono font-semibold text-blue-200">3.75–4.00%</span> · ประชุมถัดไป <span className="font-semibold text-white">28 ต.ค. 2026</span>
              </div>
              <div className="text-xs text-blue-400/60 mb-3">
                FOMC 16 ก.ย. 2026 มีมติเป็นเอกฉันท์ขึ้น +0.25pp · มีผล 17 ก.ย.
              </div>
              <div className="text-sm text-blue-100 text-opacity-90 border-t border-blue-800 pt-3">
                ดอกเบี้ยขึ้นมักกดดันหุ้นกลุ่มเทค (NASDAQ) มากกว่ากลุ่มอื่น เพราะไวต่อการคิดลดกระแสเงินสดในอนาคต
              </div>
            </div>
          </div>

          <BtcGoldWeeklySummary />

          <CdcSignals />

          <TradingViewCharts />

          <FedRatePath />

          <PreReleaseSignals />

          <ForecastSourceGuide />

          <EconCalendar />

          <EventReactionTable />

          {/* Cross Asset Panel */}
          <div className="card p-6 mb-8">
            <h2 className="text-2xl font-bold mb-2 text-highlight">
              สินทรัพย์ข้ามกลุ่ม (CROSS ASSET)
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              แนวโน้มของแต่ละสินทรัพย์ตาม regime ปัจจุบัน — ยิ่งสินทรัพย์หลายตัวไปทางเดียวกัน ยิ่งมั่นใจในสัญญาณมากขึ้น
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {crossAssets.length > 0 ? (
                crossAssets.map((asset) => (
                  <div key={asset.asset} className="text-center p-4 bg-accent rounded-lg">
                    <div className="font-bold text-xl mb-2">{asset.asset}</div>
                    <div className={`font-semibold ${getBiasColor(asset.regime_bias)}`}>
                      {translateBias(asset.regime_bias)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full rounded-lg bg-amber-900/20 border border-amber-700/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">⏳</span>
                    <span className="text-amber-400 font-semibold">ไม่มีข้อมูล Cross Asset</span>
                  </div>
                  <p className="text-sm text-amber-500/70">
                    Backend ไม่พร้อม — ข้อมูลจะแสดงเมื่อเชื่อมต่อได้
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/annual">
              <div className="card card-hover p-8 text-center">
                <h3 className="text-2xl font-bold mb-2">📅 ปฏิทินรายปี</h3>
                <p className="text-gray-400">ดูภาพรวมอีเวนต์ทั้งปี</p>
              </div>
            </Link>

            <Link href="/monthly">
              <div className="card card-hover p-8 text-center">
                <h3 className="text-2xl font-bold mb-2">📆 ปฏิทินรายเดือน</h3>
                <p className="text-gray-400">รายละเอียดอีเวนต์แบบวันต่อวัน</p>
              </div>
            </Link>

            <Link href="/liquidity">
              <div className="card card-hover p-8 text-center">
                <h3 className="text-2xl font-bold mb-2">💧 วิเคราะห์สภาพคล่อง</h3>
                <p className="text-gray-400">แกะองค์ประกอบสภาพคล่องเชิงลึก</p>
              </div>
            </Link>
          </div>

          {/* Footer */}
          <footer className="mt-12 text-center text-gray-500 text-sm">
            <p>USD Fund Flow AI — เครื่องมือวิจัยและวางแผนตลาด</p>
            <p className="mt-2">พัฒนาสำหรับการวิเคราะห์เศรษฐกิจมหภาค</p>
          </footer>
        </div>
      </main>
    </>
  );
}
