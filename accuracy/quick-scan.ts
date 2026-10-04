const res = await fetch("https://auditify-site.vercel.app/api/scan", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: process.argv[2] || "http://example.com" }),
  signal: AbortSignal.timeout(60000),
});
const body = (await res.json()) as Record<string, unknown>;
console.log("status:", res.status);
if (body.error) {
  console.log("error:", body.error);
} else {
  console.log("score:", body.score, "grade:", body.grade, "checks:", body.checksRun);
  console.log("summary:", JSON.stringify(body.summary));
  for (const i of (body.issues as { severity: string; id: string; title: string; metric: string }[])) {
    console.log(` [${i.severity}] ${i.id}: ${i.title} (${i.metric})`);
  }
}
