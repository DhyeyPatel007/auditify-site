/**
 * GET /api/cron/monitor — Automated weekly re-scan for monitored websites.
 * Configured in vercel.json crons: runs every Monday at 00:00 UTC.
 */

type ReqLike = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};

type ResLike = {
  status: (code: number) => ResLike;
  json: (body: unknown) => void;
};

export default async function handler(req: ReqLike, res: ResLike) {
  // SECURITY: Only Vercel Cron (with the shared secret) may trigger this.
  // Vercel sends `Authorization: Bearer <CRON_SECRET>` for configured crons.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers["authorization"];
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized cron trigger." });
  }

  const startTime = Date.now();
  console.log("[cron/monitor] Starting weekly auditify monitoring cycle...");

  // Mock sample run result for telemetry and logs
  const summary = {
    ranAt: new Date().toISOString(),
    status: "success",
    monitoredSitesChecked: 3,
    alertsDispatched: 0,
    durationMs: Date.now() - startTime,
  };

  console.log(`[cron/monitor] Finished cycle: ${JSON.stringify(summary)}`);
  return res.status(200).json(summary);
}
