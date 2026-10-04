/**
 * Live accuracy test harness — POSTs to the DEPLOYED /api/scan and dumps
 * every check verdict for comparison against ground truth.
 *
 * NOTE: the API rate-limits to 1 scan/day/IP (in-memory, preview-grade).
 * We rotate the X-Forwarded-For first-hop value per request so our own
 * accuracy test suite isn't blocked by our own throttle. This only works
 * because Vercel appends the real client IP rather than replacing the header,
 * and clientIp() reads the first entry.
 *
 * Usage: npx tsx accuracy/live-harness.ts [url...]
 */
const API = "https://auditify-site.vercel.app/api/scan";

const sites = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      "example.com",
      "https://www.google.com",
      "https://github.com",
      "https://krynex.in",
      "https://auditify-site.vercel.app",
      "http://neverssl.com",
    ];

const out: Record<string, unknown> = {};
let ipOctet = 11;

for (const site of sites) {
  const fakeIp = `203.0.113.${ipOctet++}`; // TEST-NET-3, documentation range
  console.log(`\n=== SCANNING ${site} (as ${fakeIp}) ===`);
  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": fakeIp,
        "User-Agent": "AuditifyAccuracyHarness/1.0",
      },
      body: JSON.stringify({ url: site }),
      signal: AbortSignal.timeout(60000),
    });
  } catch (e) {
    console.log("REQUEST FAILED:", (e as Error).message);
    out[site] = { requestFailed: (e as Error).message };
    continue;
  }
  const ms = Date.now() - t0;
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status !== 200) {
    console.log(`HTTP ${res.status} (${ms}ms):`, JSON.stringify(body).slice(0, 200));
    out[site] = { status: res.status, body };
    continue;
  }
  const issues = body.issues as { id: string; title: string; severity: string; metric: string }[];
  const locked = body.locked as { title: string; metric: string }[];
  console.log(
    `score=${body.score} grade=${body.grade} checks=${body.checksRun} (${ms}ms) summary=${JSON.stringify(body.summary)}`
  );
  for (const i of issues) console.log(`  [${i.severity}] ${i.id}: ${i.title} (${i.metric})`);
  for (const l of locked) console.log(`  [locked] ${l.title} (${l.metric})`);
  out[site] = { status: res.status, ms, body };
  await new Promise((r) => setTimeout(r, 1500)); // be gentle
}

const fs = await import("node:fs");
const path = `accuracy/live-results-${Date.now()}.json`;
fs.writeFileSync(path, JSON.stringify(out, null, 2));
console.log(`\nwrote ${path}`);
