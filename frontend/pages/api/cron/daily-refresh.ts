import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  try {
    const dailyRes = await fetch(`${baseUrl}/api/daily-summary?refresh=true`);
    const dailyData = await dailyRes.json();

    const now = new Date();
    const ict = new Date(now.getTime() + 7 * 3600 * 1000);
    const timeStr = `${String(ict.getUTCHours()).padStart(2, '0')}:${String(ict.getUTCMinutes()).padStart(2, '0')}`;

    return res.status(200).json({
      ok: true,
      refreshedAt: `${timeStr} ICT`,
      daily: dailyRes.ok ? 'success' : 'failed',
      model: dailyData._model || 'unknown',
    });
  } catch (err: any) {
    console.error('Cron daily-refresh error:', err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
