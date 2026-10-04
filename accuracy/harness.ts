/**
 * Local accuracy test harness for the Auditify scanner.
 * Runs the real api/scan.ts handler against test sites and dumps
 * every check verdict for comparison against ground truth.
 *
 * Usage: npx tsx accuracy/harness.ts [url...]
 * Writes: accuracy/results-<ts>.json
 */
import handler from "../api/scan.js";

const targets = process.argv.slice(2);
const sites = targets.length
  ? targets
  : [
      "example.com",
      "https://www.google.com",
      "https://github.com",
      "https://krynex.in",
      "https://auditify-site.vercel.app",
      "http://neverssl.com",
    ];

function mockReq(url: string) {
  return {
    method: "POST",
    headers: {},
    body: { url },
    socket: { remoteAddress: `127.0.0.${Math.floor(Math.random() * 200) + 10}` },
  };
}

function mockRes() {
  let statusCode = 200;
  let payload: unknown = null;
  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(obj: unknown) {
      payload = obj;
    },
    setHeader() {},
  };
  return { res, get: () => ({ statusCode, payload }) };
}

const out: Record<string, unknown> = {};

for (const site of sites) {
  console.log(`\n=== SCANNING ${site} ===`);
  const { res, get } = mockRes();
  const t0 = Date.now();
  try {
    // Bypass the in-memory rate limiter by using a fresh IP per site (done in mockReq).
    await handler(mockReq(site) as never, res as never);
  } catch (e) {
    console.log("HARNESS ERROR:", (e as Error).message);
    out[site] = { harnessError: (e as Error).message };
    continue;
  }
  const { statusCode, payload } = get();
  const ms = Date.now() - t0;
  if (statusCode !== 200) {
    console.log(`HTTP ${statusCode}:`, JSON.stringify(payload));
    out[site] = { statusCode, payload };
    continue;
  }
  const p = payload as {
    score: number;
    grade: string;
    checksRun: number;
    summary: unknown;
    issues: { id: string; title: string; severity: string; metric: string }[];
    locked: { title: string; metric: string }[];
    durationMs: number;
  };
  console.log(`score=${p.score} grade=${p.grade} checks=${p.checksRun} (${ms}ms harness)`);
  console.log("summary:", JSON.stringify(p.summary));
  for (const i of p.issues) console.log(`  [${i.severity}] ${i.id}: ${i.title} (${i.metric})`);
  for (const l of p.locked) console.log(`  [locked] ${l.title} (${l.metric})`);
  out[site] = { statusCode, ms, payload };
}

const fs = await import("node:fs");
const path = `accuracy/results-${Date.now()}.json`;
fs.writeFileSync(path, JSON.stringify(out, null, 2));
console.log(`\nwrote ${path}`);
