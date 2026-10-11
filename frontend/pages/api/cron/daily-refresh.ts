import type { NextApiRequest, NextApiResponse } from 'next';

const PROD_URL = 'https://usd-fund-flow-ai.vercel.app';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const [dailyRes, weeklyRes, treasuryRes] = await Promise.all([
      fetch(`${PROD_URL}/api/daily-summary?refresh=true`, {
        headers: { 'User-Agent': 'VercelCron/1.0' },
      }),
      fetch(`${PROD_URL}/api/weekly-summary?refresh=true`, {
        headers: { 'User-Agent': 'VercelCron/1.0' },
      }),
      fetch(`${PROD_URL}/api/treasury-yields?refresh=true`, {
        headers: { 'User-Agent': 'VercelCron/1.0' },
      }),
    ]);
    const dailyData = await dailyRes.json();
    const weeklyData = await weeklyRes.json();
    const treasuryData = await treasuryRes.json();

    const now = new Date();
    const ict = new Date(now.getTime() + 7 * 3600 * 1000);
    const timeStr = `${String(ict.getUTCHours()).padStart(2, '0')}:${String(ict.getUTCMinutes()).padStart(2, '0')}`;

    return res.status(200).json({
      ok: true,
      refreshedAt: `${timeStr} ICT`,
      daily: dailyRes.ok ? 'success' : 'failed',
      weekly: weeklyRes.ok ? 'success' : 'failed',
      treasury: treasuryRes.ok ? 'success' : 'failed',
      dailyModel: dailyData._model || 'unknown',
      weeklyModel: weeklyData._model || 'unknown',
      treasuryModel: treasuryData._model || 'unknown',
    });
  } catch (err: any) {
    console.error('Cron daily-refresh error:', err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
