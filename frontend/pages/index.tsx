import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { liquidityApi, crossAssetApi, eventApi } from '../lib/api';
import FedDotPlot from '../components/FedDotPlot';
import FedDotPlotByYear from '../components/FedDotPlotByYear';
import FedRateMonitorFull from '../components/FedRateMonitorFull';
import TradingViewCharts from '../components/TradingViewCharts';
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
                <div className="text-gray-400">ไม่มีข้อมูล</div>
              )}
            </div>

            {/* USD Panel */}
            <div className="card-usd p-6">
              <h2 className="text-2xl font-bold mb-4 text-usd">ดัชนีดอลลาร์ (USD)</h2>
              <div className="text-4xl font-bold mb-2 text-white">
                เป็นกลาง
              </div>
              <div className="text-sm text-violet-200 text-opacity-70 mt-4">
                ติดตามดัชนี DXY อย่างต่อเนื่อง
              </div>
              <div className="text-sm text-violet-100 text-opacity-90 border-t border-violet-800 pt-3 mt-3">
                ดอลลาร์แข็ง มักกดดัน Gold และ BTC · ดอลลาร์อ่อน มักหนุนราคาสินทรัพย์เหล่านี้ให้ขึ้น
              </div>
            </div>

            {/* Rates Panel */}
            <div className="card-rates p-6">
              <h2 className="text-2xl font-bold mb-4 text-rates">อัตราดอกเบี้ย (RATES)</h2>
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-4xl font-bold text-white">คงที่</span>
                <span className="text-2xl font-bold text-blue-200 font-mono">3.75–4.00%</span>
              </div>
              <div className="text-sm text-blue-200 text-opacity-70 mt-4">
                ติดตามนโยบายการเงินของ Fed
              </div>
              <div className="text-sm text-blue-100 text-opacity-90 border-t border-blue-800 pt-3 mt-3">
                ดอกเบี้ยขึ้นมักกดดันหุ้นกลุ่มเทค (NASDAQ) มากกว่ากลุ่มอื่น เพราะไวต่อการคิดลดกระแสเงินสดในอนาคต
              </div>
            </div>
          </div>

          <TradingViewCharts />

          <FedRateMonitorFull />
          <FedDotPlot />
          <FedDotPlotByYear />

          {/* Economic Calendar (ForexFactory-style) */}
          <div className="card p-6 mb-8">
            <h2 className="text-2xl font-bold mb-2 text-highlight">
              ปฏิทินเศรษฐกิจ (ย้อนหลัง–ล่วงหน้า 4 เดือน)
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              🔴 สำคัญที่สุด/มาก · 🟠 สำคัญมาก · 🟡 สำคัญ · 🟢 ทั่วไป — แต่ละเดือนมีแถบสีต่างกันเพื่อแยกช่วงเวลา · "เกิดจริง" สีเขียว = ดีกว่าคาด, สีแดง = แย่กว่าคาด (เทียบกับคาดการณ์)
            </p>
            {upcomingEvents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-700">
                      <th className="py-2 pr-3 font-medium">วันที่</th>
                      <th className="py-2 pr-3 font-medium">เวลา</th>
                      <th className="py-2 pr-3 font-medium">อีเวนต์</th>
                      <th className="py-2 pr-3 font-medium text-right">เกิดจริง</th>
                      <th className="py-2 pr-3 font-medium text-right">คาดการณ์</th>
                      <th className="py-2 pr-3 font-medium text-right">ครั้งก่อน</th>
                      <th className="py-2 pl-3 font-medium text-right">กำหนดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupEventsByMonth(upcomingEvents).map((group, gIdx) => {
                      const color = MONTH_COLORS[gIdx % MONTH_COLORS.length];
                      const monthIsPast = group.events.every((e) => isPastDate(e.release_datetime_utc));
                      return (
                        <React.Fragment key={group.key}>
                          <tr key={`${group.key}-hdr`}>
                            <td colSpan={7} className="pt-7 pb-3">
                              <div
                                className="flex items-center gap-3 pl-4"
                                style={{ borderLeft: `6px solid ${color}` }}
                              >
                                <span
                                  className="text-2xl font-extrabold uppercase tracking-wide underline decoration-4 underline-offset-4"
                                  style={{ color, textDecorationColor: color }}
                                >
                                  {thaiMonthName(group.month)} {group.year + 543}
                                </span>
                                {monthIsPast && (
                                  <span className="text-sm text-gray-500 font-normal">· ผ่านมาแล้ว</span>
                                )}
                              </div>
                            </td>
                          </tr>
                          {group.events.map((event) => {
                            const past = isPastDate(event.release_datetime_utc);
                            const isFed = isFedHighlightEvent(event.event_name);
                            return (
                              <React.Fragment key={event.id}>
                                {event.id === firstFutureEventId && (
                                  <tr>
                                    <td colSpan={7} style={{ padding: '6px 0' }}>
                                      <div style={{ background: '#ffffff', borderRadius: '4px', padding: '8px 16px' }}>
                                        <span style={{ fontSize: '2.25rem', fontWeight: '900', color: '#111827', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                                          ➜ วันนี้
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              <tr
                                className={`border-b transition-colors ${
                                  isFed
                                    ? 'border-amber-500 border-b-2 bg-amber-400 bg-opacity-10 hover:bg-opacity-20'
                                    : 'border-gray-800 hover:bg-white hover:bg-opacity-5'
                                } ${past ? 'opacity-60' : ''}`}
                                style={{ borderLeft: `${isFed ? 6 : 4}px solid ${isFed ? '#F59E0B' : color}` }}
                              >
                                <td className={`py-2 pr-3 pl-3 whitespace-nowrap ${isFed ? 'text-amber-300 font-bold' : 'text-gray-400'}`}>
                                  {new Date(event.release_datetime_utc).getDate()} {thaiMonthName(new Date(event.release_datetime_utc).getMonth() + 1).slice(0, 3)}
                                </td>
                                <td className={`py-2 pr-3 whitespace-nowrap ${isFed ? 'text-amber-300 font-semibold' : 'text-gray-500'}`}>
                                  {formatThaiTime(event.release_datetime_utc)} น.
                                </td>
                                <td className="py-2 pr-3">
                                  <span className="mr-2" title={importanceLabel(event.importance)}>
                                    {getImportanceEmoji(event.importance)}
                                  </span>
                                  <span
                                    className={
                                      isFed
                                        ? 'font-extrabold text-lg text-amber-300 underline decoration-2 underline-offset-4 decoration-amber-400'
                                        : 'font-semibold'
                                    }
                                  >
                                    {event.event_name}
                                  </span>
                                </td>
                                <td className={`py-2 pr-3 text-right font-semibold whitespace-nowrap ${surpriseColor(event.actual, event.forecast)}`}>
                                  {fmtVal(event.actual, event.unit)}
                                </td>
                                <td className="py-2 pr-3 text-right text-gray-400 whitespace-nowrap">
                                  {fmtVal(event.forecast, event.unit)}
                                </td>
                                <td className="py-2 pr-3 text-right text-gray-500 whitespace-nowrap">
                                  {fmtVal(event.previous, event.unit)}
                                </td>
                                <td className={`py-2 pl-3 text-right whitespace-nowrap ${isFed ? 'text-amber-300 font-bold' : 'text-gray-400'}`}>
                                  {formatRelativeDayThai(event.release_datetime_utc)}
                                </td>
                              </tr>
                              </React.Fragment>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-gray-400 text-center py-8">
                ไม่มีอีเวนต์ในช่วงเวลานี้
              </div>
            )}
          </div>

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
                <>
                  <div className="text-center p-4 bg-accent rounded-lg">
                    <div className="font-bold text-xl mb-2">BTC</div>
                    <div className="text-green-400 font-semibold">ขาขึ้น</div>
                  </div>
                  <div className="text-center p-4 bg-accent rounded-lg">
                    <div className="font-bold text-xl mb-2">GOLD</div>
                    <div className="text-green-400 font-semibold">ขาขึ้น</div>
                  </div>
                  <div className="text-center p-4 bg-accent rounded-lg">
                    <div className="font-bold text-xl mb-2">SPX</div>
                    <div className="text-yellow-400 font-semibold">เป็นกลาง</div>
                  </div>
                  <div className="text-center p-4 bg-accent rounded-lg">
                    <div className="font-bold text-xl mb-2">NASDAQ</div>
                    <div className="text-green-400 font-semibold">ขาขึ้น</div>
                  </div>
                  <div className="text-center p-4 bg-accent rounded-lg">
                    <div className="font-bold text-xl mb-2">BONDS</div>
                    <div className="text-green-400 font-semibold">ขาขึ้น</div>
                  </div>
                  <div className="text-center p-4 bg-accent rounded-lg">
                    <div className="font-bold text-xl mb-2">DXY</div>
                    <div className="text-red-400 font-semibold">ขาลง</div>
                  </div>
                </>
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
