import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { liquidityApi } from '../lib/api';
import {
  translateRegime,
  translateComponentLabel,
  COMPONENT_EXPLAIN,
  formatThaiShortDate,
} from '../lib/i18n';

interface LiquidityData {
  date: string;
  liquidity_score: number;
  regime: string;
}

export default function LiquidityPage() {
  const [currentLiquidity, setCurrentLiquidity] = useState<any>(null);
  const [history, setHistory] = useState<LiquidityData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLiquidityData();
  }, []);

  const loadLiquidityData = async () => {
    try {
      setLoading(true);
      const [current, historyData] = await Promise.all([
        liquidityApi.getCurrentLiquidity(),
        liquidityApi.getLiquidityHistory(90),
      ]);

      setCurrentLiquidity(current);
      setHistory(historyData.data || []);
    } catch (err) {
      console.error('Error loading liquidity data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRegimeColor = (regime: string) => {
    if (regime.includes('EXPANDING')) return 'text-green-400';
    if (regime.includes('CONTRACTING')) return 'text-red-400';
    return 'text-yellow-400';
  };

  const getRegimeBgColor = (regime: string) => {
    if (regime.includes('EXPANDING')) return 'bg-green-900 bg-opacity-30';
    if (regime.includes('CONTRACTING')) return 'bg-red-900 bg-opacity-30';
    return 'bg-yellow-900 bg-opacity-30';
  };

  return (
    <>
      <Head>
        <title>วิเคราะห์สภาพคล่อง - USD Fund Flow AI</title>
      </Head>

      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/">
              <span className="text-highlight hover:underline cursor-pointer">← กลับหน้าหลัก</span>
            </Link>
            <h1 className="text-4xl font-bold mt-4">วิเคราะห์สภาพคล่องดอลลาร์สหรัฐ (USD Liquidity)</h1>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-xl">กำลังโหลดข้อมูลสภาพคล่อง...</div>
            </div>
          ) : (
            <>
              {/* Current Liquidity */}
              {currentLiquidity && (
                <div className={`card p-8 mb-8 ${getRegimeBgColor(currentLiquidity.regime)}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h2 className="text-2xl font-bold mb-4">สภาพคล่องปัจจุบัน</h2>
                      <div className="text-7xl font-bold mb-4">
                        {currentLiquidity.liquidity_score.toFixed(0)}
                      </div>
                      <div className={`text-3xl font-semibold mb-2 ${getRegimeColor(currentLiquidity.regime)}`}>
                        {translateRegime(currentLiquidity.regime)}
                      </div>
                      <div className="text-sm text-gray-400 mt-4">
                        ช่วงคะแนน: -100 (หดตัวแรง) ถึง +100 (ขยายตัวแรง)
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold mb-4">องค์ประกอบ (Components)</h3>
                      <div className="space-y-3">
                        {Object.entries(currentLiquidity.components).map(([key, value]: [string, any]) => (
                          <div key={key}>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-300" title={COMPONENT_EXPLAIN[key] || ''}>
                                {translateComponentLabel(key)}
                              </span>
                              <span className={`font-bold ${value > 0 ? 'text-green-400' : value < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                {value.toFixed(1)}
                              </span>
                            </div>
                            {COMPONENT_EXPLAIN[key] && (
                              <div className="text-xs text-gray-500 mt-0.5">{COMPONENT_EXPLAIN[key]}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Regime Explanation */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="card p-6">
                  <h3 className="text-xl font-bold mb-3 text-green-400">ขยายตัว (Expanding)</h3>
                  <p className="text-sm text-gray-300 mb-3">คะแนน: +20 ถึง +100</p>
                  <p className="text-sm text-gray-400">
                    งบดุล Fed ขยายตัว, TGA ลด, RRP ลด — เป็นบวกต่อสินทรัพย์เสี่ยง
                  </p>
                </div>

                <div className="card p-6">
                  <h3 className="text-xl font-bold mb-3 text-yellow-400">เป็นกลาง (Neutral)</h3>
                  <p className="text-sm text-gray-300 mb-3">คะแนน: -19 ถึง +19</p>
                  <p className="text-sm text-gray-400">
                    สภาพคล่องสมดุล สัญญาณจากแต่ละองค์ประกอบยังผสมกันอยู่
                  </p>
                </div>

                <div className="card p-6">
                  <h3 className="text-xl font-bold mb-3 text-red-400">หดตัว (Contracting)</h3>
                  <p className="text-sm text-gray-300 mb-3">คะแนน: -100 ถึง -20</p>
                  <p className="text-sm text-gray-400">
                    QT กำลังทำงาน, TGA/RRP เพิ่มขึ้น — กดดันสินทรัพย์เสี่ยง
                  </p>
                </div>
              </div>

              {/* Historical Chart (Simple) */}
              <div className="card p-6">
                <h2 className="text-2xl font-bold mb-2">ประวัติย้อนหลัง 90 วัน</h2>
                <p className="text-sm text-gray-400 mb-6">
                  โฟกัสที่การเปลี่ยนแปลงของแนวโน้ม — จุดที่ regime เปลี่ยนขั้ว (เช่น ขยายตัว → หดตัว) มักเป็นจุดเปลี่ยนทิศของตลาด
                </p>
                {history.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {history.slice().reverse().map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center p-3 bg-accent rounded hover:bg-opacity-80"
                      >
                        <span className="text-sm text-gray-400">
                          {formatThaiShortDate(item.date)}
                        </span>
                        <div className="flex items-center gap-4">
                          <span className={`font-bold ${getRegimeColor(item.regime)}`}>
                            {translateRegime(item.regime)}
                          </span>
                          <span className={`font-mono font-bold text-lg ${item.liquidity_score > 0 ? 'text-green-400' : item.liquidity_score < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            {item.liquidity_score > 0 ? '+' : ''}{item.liquidity_score.toFixed(0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    ไม่มีข้อมูลย้อนหลัง
                  </div>
                )}
              </div>

              {/* Methodology */}
              <div className="card p-6 mt-8">
                <h2 className="text-2xl font-bold mb-4">วิธีการคำนวณ (Methodology)</h2>
                <div className="text-gray-300 space-y-3">
                  <p>
                    คะแนนสภาพคล่องดอลลาร์รวมมาจากตัวชี้วัดของ Fed และกระทรวงการคลังหลายตัว:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>TGA (น้ำหนัก 20%):</strong> บัญชีคลังที่ Fed — คิดกลับด้าน (ลด = อัดฉีดสภาพคล่อง)</li>
                    <li><strong>RRP (น้ำหนัก 25%):</strong> เงินฝากข้ามคืน — คิดกลับด้าน (ลด = อัดฉีดสภาพคล่อง)</li>
                    <li><strong>งบดุล Fed (น้ำหนัก 30%):</strong> คิดตรง (เพิ่ม = อัดฉีดสภาพคล่อง)</li>
                    <li><strong>เงินสำรองธนาคาร (น้ำหนัก 15%):</strong> คิดตรง (เพิ่ม = อัดฉีดสภาพคล่อง)</li>
                    <li><strong>ปริมาณเงิน M2 (น้ำหนัก 10%):</strong> คิดตรง (เติบโต = สภาพคล่องขยายตัว)</li>
                  </ul>
                  <p className="text-sm text-gray-400 mt-4">
                    คะแนนถูกปรับให้เป็นมาตรฐานด้วย z-score แล้ว scale ให้อยู่ในช่วง -100 ถึง +100
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
