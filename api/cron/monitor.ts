/**
 * GET /api/cron/monitor — Weekly monitoring scan + email alerts.
 * Vercel Cron: every Monday 00:00 UTC. Requires CRON_SECRET Bearer auth.
 *
 * For each monitored site: scan → compare score → email alert on drop/issues.
 */

import { listAllMonitored, updateMonitoredResult } from "../_lib/monitoring.js";
import { sendMonitoringAlert } from "../_lib/email.js";

type ReqLike = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};

type ResLike = {
  status: (code: number) => ResLike;
  json: (body: unknown) => void;
};

const SCAN_URL =
  process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}/api/scan`
    : "https://auditify.krynex.in/api/scan";

export default async function handler(req: ReqLike, res: ResLike) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers["authorization"];
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized cron trigger." });
  }

  const start = Date.now();
  let checked = 0;
  let alerts = 0;
  const errors: string[] = [];

  let sites;
  try {
    sites = await listAllMonitored();
  } catch (e) {
    console.error("[cron/monitor] Firestore read failed:", e);
    return res.status(500).json({ error: "Storage unavailable." });
  }

  for (const site of sites) {
    try {
      // Run a free scan (no auth needed for basic scan)
      const scanRes = await fetch(SCAN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: site.url }),
        signal: AbortSignal.timeout(30000),
      });
      const data = (await scanRes.json().catch(() => null)) as {
        score?: number;
        grade?: string;
        issues?: { title: string; severity: string; metric: string }[];
      } | null;

      if (!scanRes.ok || typeof data?.score !== "number") {
        errors.push(`${site.host}: scan failed`);
        continue;
      }

      checked++;
      const score = data.score;
      const grade = data.grade || "?";
      const prevScore = site.lastScore;
      const dropped = prevScore != null && score < prevScore - 5;
      const hasIssues = (data.issues || []).length > 0;

      const status = score >= 80 ? "healthy" : score >= 60 ? "warning" : "failing";

      // Send alert on meaningful drop or new failing status
      if (dropped || (status === "failing" && site.status !== "failing")) {
        const result = await sendMonitoringAlert({
          to: site.email,
          host: site.host,
          url: site.url,
          score,
          grade,
          prevScore,
          issues: (data.issues || []).map((i) => ({
            title: i.title,
            severity: (i.severity === "FAIL" ? "FAIL" : "WARN") as "FAIL" | "WARN",
            metric: i.metric,
          })),
        });
        if (result.ok) alerts++;
        else errors.push(`${site.host}: email failed`);
      } else if (hasIssues && prevScore == null) {
        // First scan with issues — send welcome report
        const result = await sendMonitoringAlert({
          to: site.email,
          host: site.host,
          url: site.url,
          score,
          grade,
          issues: (data.issues || []).map((i) => ({
            title: i.title,
            severity: (i.severity === "FAIL" ? "FAIL" : "WARN") as "FAIL" | "WARN",
            metric: i.metric,
          })),
        });
        if (result.ok) alerts++;
      }

      // Update stored result (need the doc id — reconstruct it)
      const id = `${site.uid}_${Buffer.from(site.url).toString("base64url")}`;
      await updateMonitoredResult(id, { score, grade, status });
    } catch (e) {
      console.error(`[cron/monitor] ${site.host} failed:`, e);
      errors.push(`${site.host}: error`);
    }
  }

  const summary = {
    ranAt: new Date().toISOString(),
    status: "success",
    monitoredSitesChecked: checked,
    alertsDispatched: alerts,
    errors: errors.slice(0, 10),
    durationMs: Date.now() - start,
  };
  console.log(`[cron/monitor] ${JSON.stringify(summary)}`);
  return res.status(200).json(summary);
}
