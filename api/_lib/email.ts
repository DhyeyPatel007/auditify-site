/**
 * Resend email utility for Auditify monitoring alerts.
 * Requires RESEND_API_KEY env var (server-side only).
 */

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_EMAIL = "Auditify <alerts@auditify.krynex.in>";

type AlertIssue = {
  title: string;
  severity: "FAIL" | "WARN";
  metric: string;
};

export async function sendMonitoringAlert(opts: {
  to: string;
  host: string;
  url: string;
  score: number;
  grade: string;
  issues: AlertIssue[];
  prevScore?: number;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[email] RESEND_API_KEY not configured");
    return { ok: false, error: "Email service not configured." };
  }

  const { to, host, url, score, grade, issues, prevScore } = opts;
  const scoreDrop = prevScore != null ? prevScore - score : 0;
  const failCount = issues.filter((i) => i.severity === "FAIL").length;
  const warnCount = issues.filter((i) => i.severity === "WARN").length;

  const subject =
    scoreDrop > 0
      ? `⚠️ ${host} dropped ${scoreDrop} points (now ${score}/100)`
      : `Auditify weekly report: ${host} scored ${score}/100`;

  const issueRows = issues
    .slice(0, 10)
    .map(
      (i) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #E5DFD0;">` +
        `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;` +
        `background:${i.severity === "FAIL" ? "#C93A1B" : "#946117"};color:#fff;">${i.severity}</span></td>` +
        `<td style="padding:8px 12px;border-bottom:1px solid #E5DFD0;font-size:14px;">${escapeHtml(i.title)}</td>` +
        `<td style="padding:8px 12px;border-bottom:1px solid #E5DFD0;font-size:13px;color:#6B6459;">${escapeHtml(i.metric)}</td></tr>`
    )
    .join("");

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F7F3EA;font-family:Georgia,serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 24px;">
<div style="border-top:3px solid #C93A1B;padding-top:24px;">
<h1 style="font-size:24px;color:#1C1915;margin:0 0 8px;">${escapeHtml(host)} — ${score}/100 <span style="font-size:16px;color:#6B6459;">(Grade ${grade})</span></h1>
<p style="font-size:14px;color:#6B6459;margin:0 0 24px;">Weekly monitoring scan · ${escapeHtml(url)}${prevScore != null ? ` · was ${prevScore}/100` : ""}</p>
<p style="font-size:15px;color:#1C1915;"><strong>${failCount}</strong> critical · <strong>${warnCount}</strong> warnings</p>
<table style="width:100%;border-collapse:collapse;margin-top:16px;background:#fff;border-radius:8px;overflow:hidden;">${issueRows}</table>
<p style="margin-top:24px;"><a href="https://auditify.krynex.in/dashboard" style="display:inline-block;background:#C93A1B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:15px;">View full report</a></p>
<p style="font-size:12px;color:#6B6459;margin-top:32px;">You're receiving this because you monitor ${escapeHtml(host)} on Auditify. <a href="https://auditify.krynex.in/dashboard" style="color:#6B6459;">Manage alerts</a></p>
</div></div></body></html>`;

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error(`[email] Resend failed: ${res.status} ${err.slice(0, 200)}`);
      return { ok: false, error: `Email send failed (${res.status}).` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[email] Resend error:", e);
    return { ok: false, error: "Email send failed." };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
