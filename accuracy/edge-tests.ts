// Edge-case stress tests for /api/scan
const API = "https://auditify-site.vercel.app/api/scan";
const cases: [string, string][] = [
  ["empty", ""],
  ["garbage", "not a url!!!"],
  ["localhost", "http://localhost:3000"],
  ["loopback-ip", "http://127.0.0.1"],
  ["private-10", "http://10.0.0.1"],
  ["private-192", "http://192.168.1.1"],
  ["metadata", "http://169.254.169.254/latest/meta-data/"],
  ["non-http-scheme", "ftp://example.com"],
  ["with-credentials", "https://user:pass@example.com"],
  ["bad-port", "https://example.com:8080"],
  ["redirect-chain", "http://github.com"], // http -> https redirect
  ["www-vs-apex", "krynex.in"], // 308 apex -> www
  ["nonexistent", "https://this-domain-definitely-does-not-exist-12345.com"],
  ["deep-url", "https://github.com/pricing"],
  ["query-url", "https://example.com/?foo=bar"],
];

for (const [name, url] of cases) {
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(45000),
    });
    const body = (await res.json()) as Record<string, unknown>;
    const summary =
      body.error ??
      `score=${body.score} grade=${body.grade} checks=${body.checksRun} url=${body.url}`;
    console.log(`${name}: HTTP ${res.status} -> ${JSON.stringify(summary).slice(0, 160)}`);
  } catch (e) {
    console.log(`${name}: REQUEST FAILED ${(e as Error).message}`);
  }
  await new Promise((r) => setTimeout(r, 800));
}
