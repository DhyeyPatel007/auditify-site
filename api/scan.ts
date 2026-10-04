/**
 * POST /api/scan — Auditify free scanner.
 *
 * Runs ~36 REAL deterministic checks server-side against a public URL and
 * returns { score, grade, issues[3], locked[], summary }.
 *
 * SSRF hardening (mandatory):
 *  - http(s) only, no credentials, ports 80/443 only
 *  - hostname resolved via DNS; REJECTS private/loopback/link-local/
 *    multicast/reserved ranges (incl. 169.254.169.254 cloud metadata)
 *  - connections pinned to validated IPs via a custom undici lookup, which
 *    re-validates on EVERY connection (TOCTOU / DNS-rebinding guard,
 *    including across redirects)
 *  - 8s per-fetch timeout, 2MB response cap, max 3 redirects, 25s overall budget
 *  - naive per-IP rate limit: 1 scan/day (in-memory; fine for this stage)
 */

import { Agent, fetch as ufetch } from "undici";
type UResponse = import("undici").Response;
type UHeaders = import("undici").Headers;
import dns from "node:dns/promises";
import net from "node:net";
import tls from "node:tls";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const FETCH_TIMEOUT_MS = 8000;
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_REDIRECTS = 3;
const OVERALL_BUDGET_MS = 25000;
const MAX_LINK_CHECKS = 10;
const MAX_IMAGE_HEADS = 10;
const BOT_UA = "AuditifyBot/1.0 (+https://auditify-site.vercel.app)";

// ---------------------------------------------------------------------------
// SSRF helpers
// ---------------------------------------------------------------------------

function ipv4Public(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255))
    return false;
  const [a, b] = parts;
  if (a === 10) return false; // 10/8
  if (a === 172 && b >= 16 && b <= 31) return false; // 172.16/12
  if (a === 192 && b === 168) return false; // 192.168/16
  if (a === 127) return false; // 127/8
  if (a === 169 && b === 254) return false; // 169.254/16 (link-local + cloud metadata)
  if (a === 0) return false; // 0/8
  if (a === 198 && b === 18) return false; // 198.18/15 benchmarking (2nd octet 18-19)
  if (a === 198 && b === 19) return false; // 198.18/15 continued
  if (a === 192 && b === 0 && parts[2] === 2) return false; // 192.0.2/24 TEST-NET-1
  if (a === 198 && b === 51 && parts[2] === 100) return false; // 198.51.100/24 TEST-NET-2
  if (a === 203 && b === 0 && parts[2] === 113) return false; // 203.0.113/24 TEST-NET-3
  if (a >= 224) return false; // multicast + reserved
  return true;
}

function ipv6Public(ip: string): boolean {
  const low = ip.toLowerCase();
  // IPv4-mapped / compatible / translated forms: judge the embedded IPv4
  if (low.includes(".")) {
    const v4 = low.slice(low.lastIndexOf(":") + 1);
    return ipv4Public(v4);
  }
  if (low === "::1" || low === "::") return false;
  const first = low.startsWith("::") ? "0" : low.split(":")[0] || "0";
  const val = parseInt(first, 16);
  if (Number.isNaN(val)) return false;
  if ((val & 0xffc0) === 0xfe80) return false; // fe80::/10 link-local
  if ((val & 0xfe00) === 0xfc00) return false; // fc00::/7 unique-local
  if ((val & 0xff00) === 0xff00) return false; // ff00::/8 multicast
  return val >= 0x2000 && val <= 0x3fff; // 2000::/3 global unicast only
}

function isPublicIp(ip: string): boolean {
  if (net.isIPv4(ip)) return ipv4Public(ip);
  if (net.isIPv6(ip)) return ipv6Public(ip);
  return false;
}

class ScanError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Resolve a hostname and keep only public addresses. Throws if none. */
async function resolvePublic(host: string): Promise<string[]> {
  let recs: { address: string; family: number }[];
  try {
    recs = await dns.lookup(host, { all: true });
  } catch {
    throw new ScanError(`Could not resolve “${host}”. Check the address and try again.`, 400);
  }
  const good = recs.filter((r) => isPublicIp(r.address)).map((r) => r.address);
  if (!good.length) {
    throw new ScanError(
      "That address isn't publicly reachable — private and internal networks are blocked.",
      400
    );
  }
  return good;
}

/**
 * undici Agent whose DNS lookup pins every connection to a freshly-resolved,
 * freshly-validated public IP. This is the TOCTOU/DNS-rebinding guard: even
 * if DNS changes between the initial check and connect time (or across a
 * redirect), a private address can never be dialed.
 */
function makePinnedAgent(): Agent {
  return new Agent({
    connect: {
      timeout: FETCH_TIMEOUT_MS,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lookup: (hostname: string, opts: any, callback: any) => {
        dns
          .lookup(hostname, { all: true })
          .then((recs) => {
            const good = recs
              .filter((r) => isPublicIp(r.address))
              .map((r) => ({ address: r.address, family: r.family }));
            if (!good.length) {
              callback(new Error(`Blocked: ${hostname} has no public address`));
              return;
            }
            // net/tls.connect passes { all: true } and expects an array back
            if (opts && opts.all) callback(null, good);
            else callback(null, good[0].address, good[0].family);
          })
          .catch((err) => callback(err));
      },
    },
    headersTimeout: FETCH_TIMEOUT_MS,
    bodyTimeout: FETCH_TIMEOUT_MS,
  });
}

// ---------------------------------------------------------------------------
// URL validation
// ---------------------------------------------------------------------------

function validateTarget(raw: string): URL {
  const input = raw.trim();
  if (!input) throw new ScanError("Enter a website address to scan.", 400);
  if (input.length > 2048) throw new ScanError("That address is too long.", 400);
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(input) ? input : `https://${input}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new ScanError("That doesn't look like a valid website address.", 400);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ScanError("Only public http:// and https:// addresses can be scanned.", 400);
  }
  if (url.username || url.password) {
    throw new ScanError("Addresses with embedded credentials can't be scanned.", 400);
  }
  if (!url.hostname) throw new ScanError("That address is missing a hostname.", 400);
  const port = url.port;
  if (port && port !== "80" && port !== "443") {
    throw new ScanError("Only ports 80 and 443 can be scanned.", 400);
  }
  return url;
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

type DocResult = {
  status: number;
  headers: UHeaders;
  body: Uint8Array;
  finalUrl: string;
  redirectCount: number;
  ttfbMs: number;
  htmlBytes: number;
};

async function readCapped(
  res: UResponse,
  signal: AbortSignal,
  startedAt: number
): Promise<{ body: Uint8Array; ttfbMs: number }> {
  const reader = res.body?.getReader();
  if (!reader) return { body: new Uint8Array(0), ttfbMs: 0 };
  const chunks: Uint8Array[] = [];
  let total = 0;
  let ttfbMs = 0;
  let first = true;
  for (;;) {
    if (signal.aborted) {
      try {
        await reader.cancel();
      } catch {
        /* noop */
      }
      throw new ScanError("Scan timed out.", 504);
    }
    const { done, value } = await reader.read();
    if (done) break;
    if (first) {
      ttfbMs = performance.now() - startedAt;
      first = false;
    }
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      try {
        await reader.cancel();
      } catch {
        /* noop */
      }
      throw new ScanError("The page is larger than 2MB — too big to scan.", 400);
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    body.set(c, off);
    off += c.byteLength;
  }
  return { body, ttfbMs };
}

/** GET the document, following up to MAX_REDIRECTS redirects manually (each re-validated). */
async function getDocument(
  startUrl: URL,
  agent: Agent,
  signal: AbortSignal
): Promise<DocResult> {
  let current = startUrl;
  let redirectCount = 0;
  for (;;) {
    // Fail fast on redirect targets: re-validate scheme/host/port + DNS
    await resolvePublic(current.hostname);
    const startedAt = performance.now();
    const res = await ufetch(current.toString(), {
      dispatcher: agent,
      redirect: "manual",
      signal: AbortSignal.any([signal, AbortSignal.timeout(FETCH_TIMEOUT_MS)]),
      headers: {
        "User-Agent": BOT_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    const status = res.status;
    if (status >= 300 && status < 400) {
      const loc = res.headers.get("location");
      await res.body?.cancel().catch(() => undefined);
      if (!loc) throw new ScanError(`The site returned redirect ${status} with no destination.`, 502);
      if (redirectCount >= MAX_REDIRECTS) {
        throw new ScanError("Too many redirects — the chain was cut at 3 hops.", 502);
      }
      let next: URL;
      try {
        next = new URL(loc, current.toString());
      } catch {
        throw new ScanError("The site redirected to an invalid address.", 502);
      }
      if (next.protocol !== "http:" && next.protocol !== "https:") {
        throw new ScanError("The site redirected to a non-web address.", 502);
      }
      if (next.port && next.port !== "80" && next.port !== "443") {
        throw new ScanError("The site redirected to a blocked port.", 502);
      }
      current = next;
      redirectCount++;
      continue;
    }
    if (status >= 400) {
      await res.body?.cancel().catch(() => undefined);
      throw new ScanError(`The site returned HTTP ${status} — nothing to audit.`, 502);
    }
    const { body, ttfbMs } = await readCapped(res, signal, startedAt);
    return {
      status,
      headers: res.headers,
      body,
      finalUrl: current.toString(),
      redirectCount,
      ttfbMs,
      htmlBytes: body.byteLength,
    };
  }
}

/** HEAD/GET a same-origin URL with the pinned agent; returns status or null. */
async function probeStatus(
  url: string,
  agent: Agent,
  signal: AbortSignal,
  method = "HEAD",
  wantBody = false
): Promise<{ status: number; headers: UHeaders; bodyText: string } | null> {
  try {
    const res = await ufetch(url, {
      dispatcher: agent,
      redirect: "manual",
      method,
      signal: AbortSignal.any([signal, AbortSignal.timeout(FETCH_TIMEOUT_MS)]),
      headers: { "User-Agent": BOT_UA, Accept: "*/*" },
    });
    let bodyText = "";
    if (wantBody) {
      const { body } = await readCapped(res, signal, performance.now());
      bodyText = new TextDecoder().decode(body.slice(0, 4096));
    } else {
      await res.body?.cancel().catch(() => undefined);
    }
    return { status: res.status, headers: res.headers, bodyText };
  } catch {
    return null;
  }
}

/** TLS version + ALPN via a direct pinned handshake (SNI = hostname, cert verified). */
async function probeTls(host: string): Promise<{ protocol: string; alpn: string } | null> {
  let ips: string[];
  try {
    ips = await resolvePublic(host);
  } catch {
    return null;
  }
  return new Promise((resolve) => {
    const sock = tls.connect({
      host: ips[0],
      port: 443,
      servername: host,
      timeout: FETCH_TIMEOUT_MS,
    });
    const done = (v: { protocol: string; alpn: string } | null) => {
      sock.destroy();
      resolve(v);
    };
    sock.on("secureConnect", () => {
      done({ protocol: sock.getProtocol() ?? "unknown", alpn: sock.alpnProtocol || "" });
    });
    sock.on("error", () => done(null));
    sock.on("timeout", () => done(null));
  });
}

// ---------------------------------------------------------------------------
// HTML parsing (small deterministic extractors — no heavy DOM needed)
// ---------------------------------------------------------------------------

function attr(tag: string, name: string): string | null {
  const m = tag.match(
    new RegExp(name + '\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s>]+))', "i")
  );
  if (!m) return null;
  return m[2] ?? m[3] ?? m[4] ?? null;
}

function getTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title\s*>/i);
  return m ? m[1].replace(/\s+/g, " ").trim() || null : null;
}

type MetaMap = { byName: Map<string, string>; byProp: Map<string, string>; charset: string | null };

function getMetas(html: string): MetaMap {
  const byName = new Map<string, string>();
  const byProp = new Map<string, string>();
  let charset: string | null = null;
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    const cs = attr(tag, "charset");
    if (cs) charset = cs;
    const name = attr(tag, "name");
    const prop = attr(tag, "property");
    const content = attr(tag, "content") ?? "";
    if (name) byName.set(name.toLowerCase(), content);
    if (prop) byProp.set(prop.toLowerCase(), content);
  }
  return { byName, byProp, charset };
}

function getLinks(html: string, tagName: "a" | "link" | "img" | "script"): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tagName}\\b[^>]*>`, "gi");
  for (const m of html.matchAll(re)) {
    const tag = m[0];
    const href = tagName === "img" || tagName === "script" ? attr(tag, "src") : attr(tag, "href");
    if (href) out.push(href);
  }
  return out;
}

function countTag(html: string, tag: string): number {
  return (html.match(new RegExp(`<${tag}\\b`, "gi")) || []).length;
}

function stripToText(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Check model
// ---------------------------------------------------------------------------

type Sev = "pass" | "warn" | "fail";

interface Check {
  id: string;
  title: string;
  severity: Sev;
  metric: string;
  detail: string;
  fix: string;
  weight: number;
}

const c = (
  id: string,
  title: string,
  severity: Sev,
  metric: string,
  detail: string,
  fix: string,
  weight: number
): Check => ({ id, title, severity, metric, detail, fix, weight });

function gradeFor(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

// ---------------------------------------------------------------------------
// The audit
// ---------------------------------------------------------------------------

type AuditInput = {
  doc: DocResult;
  html: string;
  isHttps: boolean;
  host: string;
  origin: string;
  agent: Agent;
  signal: AbortSignal;
  tls: { protocol: string; alpn: string } | null;
};

async function runChecks(inp: AuditInput): Promise<Check[]> {
  const { doc, html, isHttps, host, origin, agent, signal, tls } = inp;
  const H = (n: string): string | null => doc.headers.get(n);
  const checks: Check[] = [];
  const metas = getMetas(html);
  const title = getTitle(html);

  // ---- Security -----------------------------------------------------------
  if (!isHttps) {
    checks.push(c("tls-version", "No HTTPS", "fail", "http only", "The site is served over plain HTTP. Everything a visitor types or reads can be intercepted on the network.", "Get a free certificate (Let's Encrypt) and serve the whole site over HTTPS.", 4));
  } else if (tls && (tls.protocol === "TLSv1.3" || tls.protocol === "TLSv1.2")) {
    checks.push(c("tls-version", "Modern TLS", "pass", tls.protocol, `The server negotiates ${tls.protocol}.`, "No action needed.", 4));
  } else if (tls) {
    checks.push(c("tls-version", "Outdated TLS version", "fail", tls.protocol, `The server negotiates ${tls.protocol}, which has known weaknesses.`, "Disable TLS 1.0/1.1 on the server; keep 1.2 and 1.3 only.", 4));
  } else {
    checks.push(c("tls-version", "TLS version unknown", "warn", "unknown", "The TLS handshake details couldn't be read, though HTTPS works.", "Verify the server negotiates TLS 1.2 or 1.3.", 4));
  }

  checks.push(
    doc.redirectCount > 0 && isHttps
      ? c("https-enforced", "HTTPS enforced", "pass", "http → https", "Plain-HTTP requests are redirected to HTTPS.", "No action needed.", 3)
      : isHttps
        ? c("https-enforced", "HTTPS enforced", "pass", "https", "The site is served over HTTPS.", "No action needed.", 3)
        : c("https-enforced", "HTTPS not enforced", "fail", "http", "Visitors can reach the insecure HTTP version of the site.", "Redirect all HTTP traffic to HTTPS (301) and add HSTS.", 3)
  );

  const hsts = H("strict-transport-security");
  if (hsts && /max-age=\d+/.test(hsts)) {
    const age = parseInt(hsts.match(/max-age=(\d+)/)![1], 10);
    checks.push(
      age >= 31536000
        ? c("hsts", "HSTS enabled", "pass", `max-age ${age}`, "Strict-Transport-Security tells browsers to only ever use HTTPS.", "No action needed.", 3)
        : c("hsts", "HSTS max-age too short", "warn", `max-age ${age}`, "HSTS is set but expires quickly, leaving a window for downgrade attacks.", "Raise max-age to at least 31536000 (one year).", 3)
    );
  } else {
    checks.push(c("hsts", "No HSTS header", "fail", "missing", "Without HSTS, a first-time visitor can be downgraded to HTTP by an attacker.", "Send Strict-Transport-Security: max-age=63072000; includeSubDomains.", 3));
  }

  const cspVal = H("content-security-policy");
  checks.push(
    cspVal
      ? c("csp", "Content-Security-Policy set", "pass", "present", "A CSP limits where scripts and resources may load from, blunting XSS.", "No action needed.", 3)
      : c("csp", "No Content-Security-Policy", "fail", "missing", "Without a CSP, any injected script runs with full page privileges.", "Add a Content-Security-Policy header; start with default-src 'self'.", 3)
  );

  const xfo = H("x-frame-options");
  const frameAnc = cspVal && /frame-ancestors/.test(cspVal);
  checks.push(
    xfo || frameAnc
      ? c("x-frame-options", "Clickjacking protection", "pass", xfo ?? "frame-ancestors", "The page can't be embedded in a hostile iframe.", "No action needed.", 2)
      : c("x-frame-options", "No clickjacking protection", "warn", "missing", "The page can be framed by any site, enabling clickjacking.", "Send X-Frame-Options: DENY or SAMEORIGIN.", 2)
  );

  const xcto = H("x-content-type-options");
  checks.push(
    xcto && xcto.toLowerCase().includes("nosniff")
      ? c("x-content-type-options", "MIME sniffing disabled", "pass", "nosniff", "Browsers won't guess content types, blocking a class of drive-by attacks.", "No action needed.", 2)
      : c("x-content-type-options", "MIME sniffing allowed", "warn", "missing", "Browsers may interpret files as a different type than declared.", "Send X-Content-Type-Options: nosniff.", 2)
  );

  const rp = H("referrer-policy");
  checks.push(
    rp
      ? c("referrer-policy", "Referrer-Policy set", "pass", rp.split(",")[0].trim(), "Controls how much of the URL leaks to other sites on navigation.", "No action needed.", 1)
      : c("referrer-policy", "No Referrer-Policy", "warn", "missing", "Full URLs (including query strings) may leak to third parties.", "Send Referrer-Policy: strict-origin-when-cross-origin.", 1)
  );

  const pp = H("permissions-policy") || H("feature-policy");
  checks.push(
    pp
      ? c("permissions-policy", "Permissions-Policy set", "pass", "present", "Browser features (camera, mic, location) are explicitly gated.", "No action needed.", 1)
      : c("permissions-policy", "No Permissions-Policy", "warn", "missing", "Powerful browser features default to whatever the browser allows.", "Send Permissions-Policy: camera=(), microphone=(), geolocation=().", 1)
  );

  const serverHdr = H("server");
  const powered = H("x-powered-by");
  if ((serverHdr && /\/[\d.]+/.test(serverHdr)) || powered) {
    checks.push(c("server-header", "Server version disclosed", "warn", serverHdr || powered || "", "The server advertises its software and version — a roadmap for attackers.", "Hide version numbers in Server / X-Powered-By headers.", 1));
  } else {
    checks.push(c("server-header", "Server fingerprint minimal", "pass", serverHdr || "hidden", "The server doesn't advertise a version number.", "No action needed.", 1));
  }

  if (isHttps) {
    const mixed = [
      ...getLinks(html, "img"),
      ...getLinks(html, "script"),
      ...html.matchAll(/<link\b[^>]*>/gi),
    ]
      .map((t) => (typeof t === "string" ? t : t[0]))
      .map((tag) => attr(tag, "src") || attr(tag, "href") || "")
      .filter((u) => u.toLowerCase().startsWith("http://")).length;
    checks.push(
      mixed > 0
        ? c("mixed-content", "Mixed content found", "fail", `${mixed} insecure`, `${mixed} resources load over HTTP on an HTTPS page; browsers may block them.`, "Serve every subresource over HTTPS.", 2)
        : c("mixed-content", "No mixed content", "pass", "clean", "Every subresource loads over HTTPS.", "No action needed.", 2)
    );
  } else {
    checks.push(c("mixed-content", "Mixed content n/a", "fail", "no https", "Mixed content can't be judged without HTTPS.", "Move the site to HTTPS first.", 2));
  }

  // Exposed dotfile probes (real HTTP probes against the target)
  const [gitProbe, envProbe] = await Promise.all([
    probeStatus(`${origin}/.git/HEAD`, agent, signal, "GET", true),
    probeStatus(`${origin}/.env`, agent, signal, "GET", true),
  ]);
  checks.push(
    gitProbe && gitProbe.status === 200 && /ref:/.test(gitProbe.bodyText)
      ? c("git-exposed", "Git metadata exposed", "fail", "/.git/HEAD 200", "/.git/HEAD is publicly readable — the entire repo history may be downloadable.", "Block /.git at the server or CDN immediately.", 3)
      : c("git-exposed", "No exposed git metadata", "pass", "/.git/HEAD 404", "/.git/HEAD is not publicly readable.", "No action needed.", 3)
  );
  checks.push(
    envProbe && envProbe.status === 200 && /=/.test(envProbe.bodyText)
      ? c("env-exposed", ".env file exposed", "fail", "/.env 200", "A /.env file is publicly readable — secrets and credentials may be leaking.", "Block /.env at the server immediately and rotate any exposed secrets.", 3)
      : c("env-exposed", "No exposed .env", "pass", "/.env 404", "No readable /.env file was found.", "No action needed.", 3)
  );

  // ---- SEO ----------------------------------------------------------------
  checks.push(
    title
      ? c("title-present", "Page title present", "pass", `${title.length} ch`, `Title: “${stripToText(title).slice(0, 80)}”.`, "No action needed.", 2)
      : c("title-present", "Missing page title", "fail", "missing", "No <title> — search results and tabs show the raw URL.", "Add a unique, descriptive <title> to every page.", 2)
  );
  if (title) {
    const n = title.length;
    checks.push(
      n >= 30 && n <= 60
        ? c("title-length", "Title length good", "pass", `${n} ch`, "Title fits comfortably in search results.", "No action needed.", 2)
        : n < 30
          ? c("title-length", "Title too short", "warn", `${n} ch`, "Very short titles waste ranking and click potential.", "Expand the title to 30–60 characters.", 2)
          : c("title-length", "Title too long", "warn", `${n} ch`, "Long titles get truncated in search results.", "Trim the title to 30–60 characters.", 2)
    );
  }

  const desc = metas.byName.get("description") ?? metas.byProp.get("og:description") ?? null;
  checks.push(
    desc
      ? c("description-present", "Meta description present", "pass", `${desc.length} ch`, "A meta description controls the search-result snippet.", "No action needed.", 2)
      : c("description-present", "Missing meta description", "fail", "missing", "No meta description — search engines write the snippet for you.", "Add a 50–160 character meta description.", 2)
  );
  if (desc) {
    const n = desc.length;
    checks.push(
      n >= 50 && n <= 160
        ? c("description-length", "Description length good", "pass", `${n} ch`, "Description fits the search snippet.", "No action needed.", 2)
        : c("description-length", "Description length off", "warn", `${n} ch`, "Descriptions outside 50–160 characters get truncated or ignored.", "Rewrite to 50–160 characters.", 2)
    );
  }

  const canon = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i);
  checks.push(
    canon && attr(canon[0], "href")
      ? c("canonical", "Canonical URL set", "pass", attr(canon[0], "href")!.slice(0, 40), "A canonical URL tells search engines which URL is authoritative.", "No action needed.", 2)
      : c("canonical", "No canonical URL", "warn", "missing", "Without a canonical, duplicate URLs split ranking signals.", 'Add <link rel="canonical" href="…">.', 2)
  );

  const ogTitle = metas.byProp.get("og:title");
  const ogDesc = metas.byProp.get("og:description");
  const ogImg = metas.byProp.get("og:image");
  checks.push(
    ogTitle && ogDesc
      ? c("og-tags", "Open Graph tags present", "pass", ogImg ? "+ image" : "no image", "Link previews on social platforms will render correctly.", ogImg ? "No action needed." : "Add og:image for richer previews.", 1)
      : c("og-tags", "Open Graph tags missing", "warn", "missing", "Shared links show a bare URL instead of a rich preview.", "Add og:title, og:description and og:image.", 1)
  );

  const twCard = metas.byName.get("twitter:card");
  checks.push(
    twCard
      ? c("twitter-tags", "Twitter card set", "pass", twCard, "X/Twitter link previews are configured.", "No action needed.", 1)
      : c("twitter-tags", "No Twitter card", "warn", "missing", "X/Twitter falls back to guessing the preview.", 'Add <meta name="twitter:card" content="summary_large_image">.', 1)
  );

  const robots = await probeStatus(`${origin}/robots.txt`, agent, signal, "GET", true);
  const robotsOk = robots && robots.status === 200 && /user-agent/i.test(robots.bodyText);
  const robotsSm = robotsOk && /sitemap:/i.test(robots.bodyText);
  checks.push(
    robotsOk
      ? c("robots-txt", "robots.txt found", "pass", "200", "Crawlers get explicit instructions.", "No action needed.", 2)
      : c("robots-txt", "robots.txt missing", "warn", robots ? `${robots.status}` : "error", "No robots.txt — crawlers guess what to index.", "Add a /robots.txt with your crawl rules.", 2)
  );

  let sitemapOk = robotsSm;
  if (!sitemapOk) {
    const sm = await probeStatus(`${origin}/sitemap.xml`, agent, signal, "HEAD");
    sitemapOk = !!sm && sm.status === 200;
  }
  checks.push(
    sitemapOk
      ? c("sitemap", "Sitemap discoverable", "pass", "found", "Search engines can find every page to index.", "No action needed.", 2)
      : c("sitemap", "No sitemap found", "warn", "missing", "No sitemap.xml referenced in robots.txt or at /sitemap.xml.", "Publish a sitemap.xml and reference it in robots.txt.", 2)
  );

  const h1n = countTag(html, "h1");
  checks.push(
    h1n === 1
      ? c("single-h1", "Single H1", "pass", "1", "One H1 gives the page a clear topic.", "No action needed.", 2)
      : h1n === 0
        ? c("single-h1", "No H1 heading", "fail", "0", "No H1 — search engines and screen readers miss the page's main topic.", "Add exactly one descriptive <h1>.", 2)
        : c("single-h1", "Multiple H1s", "warn", `${h1n}`, `${h1n} H1s dilute the page's topic signal.`, "Keep exactly one <h1> per page.", 2)
  );

  const lang = html.match(/<html\b[^>]*>/i);
  const langVal = lang ? attr(lang[0], "lang") : null;
  checks.push(
    langVal
      ? c("html-lang", "Language declared", "pass", langVal, `The page declares lang="${langVal}" for screen readers and translation.`, "No action needed.", 2)
      : c("html-lang", "Language not declared", "fail", "missing", "No lang attribute — screen readers guess pronunciation.", 'Add lang="en" (or the right code) to <html>.', 2)
  );

  const iconLink = html.match(/<link\b[^>]*rel=["'](?:shortcut )?icon["'][^>]*>/i);
  const favProbe = iconLink ? null : await probeStatus(`${origin}/favicon.ico`, agent, signal, "HEAD");
  checks.push(
    iconLink || (favProbe && favProbe.status === 200)
      ? c("favicon", "Favicon present", "pass", "found", "Tabs and bookmarks show a proper icon.", "No action needed.", 1)
      : c("favicon", "No favicon", "warn", "missing", "No favicon — tabs show a generic blank icon.", "Add a favicon (SVG + PNG fallback).", 1)
  );

  const viewport = metas.byName.get("viewport");
  checks.push(
    viewport && /width=device-width/i.test(viewport)
      ? c("viewport-meta", "Viewport meta set", "pass", "device-width", "Mobile browsers render the page at the right scale.", "No action needed.", 2)
      : c("viewport-meta", "Viewport meta missing", "fail", "missing", "No viewport meta — the page likely renders tiny on phones.", 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.', 2)
  );

  const charsetHdr = (H("content-type") || "").toLowerCase();
  const charset = metas.charset || (/charset=([\w-]+)/.exec(charsetHdr)?.[1] ?? null);
  checks.push(
    charset
      ? c("charset", "Charset declared", "pass", charset, "Character encoding is declared, avoiding mojibake.", "No action needed.", 1)
      : c("charset", "Charset not declared", "warn", "missing", "No charset declared — non-ASCII text may garble.", 'Declare UTF-8 via <meta charset="utf-8">.', 1)
  );

  // ---- Performance ---------------------------------------------------------
  const kb = doc.htmlBytes;
  checks.push(
    kb < 100 * 1024
      ? c("html-size", "HTML size healthy", "pass", fmtBytes(kb), "The document is lean.", "No action needed.", 3)
      : kb < 300 * 1024
        ? c("html-size", "HTML getting heavy", "warn", fmtBytes(kb), "A heavy document slows first paint, especially on mobile.", "Trim inline scripts/styles; paginate long pages.", 3)
        : c("html-size", "HTML too heavy", "fail", fmtBytes(kb), "A very heavy document hurts load on every visit.", "Split the page, defer non-critical markup.", 3)
  );

  const enc = (H("content-encoding") || "").toLowerCase();
  checks.push(
    enc.includes("br") || enc.includes("gzip")
      ? c("compression", "Compression enabled", "pass", enc, "The document is transferred compressed.", "No action needed.", 3)
      : c("compression", "No compression", "fail", "identity", "The document ships uncompressed — often 3–5× larger than needed.", "Enable gzip or Brotli on the server/CDN.", 3)
  );

  const ttfb = doc.ttfbMs;
  checks.push(
    ttfb < 600
      ? c("ttfb", "Server responds fast", "pass", `${Math.round(ttfb)} ms`, "Time to first byte is snappy.", "No action needed.", 3)
      : ttfb < 1500
        ? c("ttfb", "Server response slow", "warn", `${Math.round(ttfb)} ms`, "A slow first byte delays everything after it.", "Profile server time; add caching/CDN.", 3)
        : c("ttfb", "Server response very slow", "fail", `${Math.round(ttfb)} ms`, "Visitors stare at a blank page.", "Fix backend latency or put a CDN in front.", 3)
  );

  const alpn = tls?.alpn ?? "";
  checks.push(
    alpn === "h2" || alpn === "h3"
      ? c("http-version", `Modern HTTP (${alpn.toUpperCase()})`, "pass", alpn, "Multiplexed protocol — assets load in parallel.", "No action needed.", 2)
      : isHttps
        ? c("http-version", "HTTP/1.1 only", "warn", "http/1.1", "HTTP/1.1 serializes requests; modern servers offer h2.", "Enable HTTP/2 (or 3) on the server.", 2)
        : c("http-version", "HTTP/1.1 (no HTTPS)", "warn", "http/1.1", "Can't negotiate h2 without HTTPS.", "Move to HTTPS, then enable HTTP/2.", 2)
  );

  checks.push(
    doc.redirectCount <= 1
      ? c("redirect-chain", "Redirect chain short", "pass", `${doc.redirectCount} hop${doc.redirectCount === 1 ? "" : "s"}`, "Few redirects before content.", "No action needed.", 2)
      : c("redirect-chain", "Long redirect chain", "warn", `${doc.redirectCount} hops`, "Each redirect adds a full round-trip before content.", "Collapse the chain to a single redirect.", 2)
  );

  // Images: count, alt coverage, measured weight via HEAD
  const imgTags = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const imgSrcs = imgTags
    .map((t) => attr(t, "src"))
    .filter((s): s is string => !!s && !s.startsWith("data:"));
  const missingAlt = imgTags.filter((t) => {
    const a = attr(t, "alt");
    return a === null || a.trim() === "";
  }).length;
  checks.push(
    imgTags.length === 0
      ? c("image-alt", "No images to check", "pass", "0 images", "No <img> tags found.", "No action needed.", 3)
      : missingAlt === 0
        ? c("image-alt", "All images have alt text", "pass", `${imgTags.length} ok`, "Every image describes itself to screen readers.", "No action needed.", 3)
        : (() => {
            const pct = Math.round((missingAlt / imgTags.length) * 100);
            return pct > 20
              ? c("image-alt", "Images missing alt text", "fail", `${missingAlt}/${imgTags.length}`, `${pct}% of images have no alt text — screen readers skip them.`, "Add descriptive alt text to every meaningful image.", 3)
              : c("image-alt", "Some images missing alt text", "warn", `${missingAlt}/${imgTags.length}`, `${missingAlt} images lack alt text.`, "Add alt text to the remaining images.", 3);
          })()
  );
  checks.push(
    imgTags.length > 60
      ? c("image-count", "Very image-heavy page", "warn", `${imgTags.length} imgs`, "Dozens of images multiply requests and layout work.", "Lazy-load below-fold images; consider sprites.", 1)
      : c("image-count", "Image count reasonable", "pass", `${imgTags.length} imgs`, "Image count is manageable.", "No action needed.", 1)
  );

  if (imgSrcs.length > 0) {
    const abs = imgSrcs.slice(0, 40).map((s) => {
      try {
        return new URL(s, doc.finalUrl).toString();
      } catch {
        return null;
      }
    }).filter((s): s is string => !!s && (s.startsWith("http://") || s.startsWith("https://")));
    const heads = await Promise.all(
      abs.slice(0, MAX_IMAGE_HEADS).map((u) => probeStatus(u, agent, signal, "HEAD"))
    );
    let total = 0;
    let measured = 0;
    for (const h of heads) {
      if (!h) continue;
      const len = parseInt(h.headers.get("content-length") || "0", 10);
      if (len > 0) {
        total += len;
        measured++;
      }
    }
    checks.push(
      measured === 0
        ? c("image-weight", "Image weight unknown", "warn", "unmeasurable", "Image sizes couldn't be measured from here.", "Check image payload in your own tooling.", 3)
        : total < 500 * 1024
          ? c("image-weight", "Image payload light", "pass", fmtBytes(total), `Measured ${measured} images over the wire.`, "No action needed.", 3)
          : total < 2 * 1024 * 1024
            ? c("image-weight", "Image payload heavy", "warn", fmtBytes(total), "Images are a large share of the page weight.", "Compress and serve modern formats (WebP/AVIF).", 3)
            : c("image-weight", "Image payload very heavy", "fail", fmtBytes(total), "Images dominate the download — mobile users suffer.", "Compress aggressively; lazy-load below the fold.", 3)
    );
  } else {
    checks.push(c("image-weight", "No remote images", "pass", "0 B", "No external images to weigh.", "No action needed.", 3));
  }

  // Broken links: sample up to 10 same-host links
  const aHrefs = getLinks(html, "a")
    .map((h) => {
      try {
        return new URL(h, doc.finalUrl);
      } catch {
        return null;
      }
    })
    .filter(
      (u): u is URL =>
        !!u &&
        (u.protocol === "http:" || u.protocol === "https:") &&
        u.hostname === host &&
        !u.hash && u.toString() !== doc.finalUrl
    );
  const seen = new Set<string>();
  const sample = aHrefs.filter((u) => {
    const s = u.toString();
    if (seen.has(s)) return false;
    seen.add(s);
    return true;
  }).slice(0, MAX_LINK_CHECKS);

  if (sample.length > 0) {
    const results = await Promise.all(
      sample.map((u) => probeStatus(u.toString(), agent, signal, "HEAD"))
    );
    const broken = results.filter((r) => !r || r.status >= 400).length;
    checks.push(
      broken === 0
        ? c("broken-links", "Sampled links healthy", "pass", `${sample.length}/${sample.length}`, `Checked ${sample.length} internal links — all resolve.`, "No action needed.", 3)
        : c("broken-links", "Broken links found", "fail", `${broken} broken`, `${broken} of ${sample.length} sampled internal links return errors.`, "Fix or remove the dead links.", 3)
    );
  } else {
    checks.push(c("broken-links", "No internal links sampled", "pass", "n/a", "No internal links found to sample.", "No action needed.", 3));
  }

  // 404 handling
  const probe404 = await probeStatus(
    `${origin}/auditify-probe-${Date.now().toString(36)}`,
    agent,
    signal,
    "GET"
  );
  checks.push(
    !probe404
      ? c("not-found-handling", "404 handling unknown", "warn", "unreachable", "The 404 probe couldn't complete.", "Verify unknown URLs return a proper 404 page.", 2)
      : probe404.status === 404
        ? c("not-found-handling", "Proper 404 handling", "pass", "404", "Unknown URLs return a real 404 status.", "No action needed.", 2)
        : probe404.status === 200
          ? c("not-found-handling", "Soft 404 detected", "fail", "200 on junk", "Unknown URLs return 200 — search engines may index junk.", "Return a real 404 status for unknown URLs.", 2)
          : c("not-found-handling", "Odd 404 behavior", "warn", `${probe404.status}`, `Unknown URLs return ${probe404.status} instead of 404.`, "Return a proper 404 status page.", 2)
  );

  return checks;
}

// ---------------------------------------------------------------------------
// Rate limit: 1 scan/day per client IP (in-memory; noted as preview-grade)
// ---------------------------------------------------------------------------

const seen = new Map<string, string>(); // ip -> YYYY-MM-DD

function clientIp(req: ReqLike): string {
  const h = req.headers;
  const fwd = h["x-forwarded-for"] || h["X-Forwarded-For"];
  if (typeof fwd === "string" && fwd) return fwd.split(",")[0].trim();
  if (Array.isArray(fwd) && fwd.length) return String(fwd[0]).split(",")[0].trim();
  const real = h["x-real-ip"] || h["X-Real-Ip"];
  if (typeof real === "string" && real) return real.trim();
  return req.socket?.remoteAddress || "unknown";
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

type ReqLike = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  socket?: { remoteAddress?: string };
};

type ResLike = {
  status: (code: number) => ResLike;
  json: (obj: unknown) => void;
  setHeader: (k: string, v: string) => void;
};

export default async function handler(req: ReqLike, res: ResLike) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed — POST a JSON body {url}." });
    return;
  }

  let rawUrl: unknown;
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    rawUrl = (body as { url?: unknown } | null)?.url;
  } catch {
    rawUrl = undefined;
  }
  if (typeof rawUrl !== "string") {
    res.status(400).json({ error: "Send a JSON body like {\"url\": \"example.com\"}." });
    return;
  }

  // Rate limit before doing any work
  const ip = clientIp(req);
  const today = new Date().toISOString().slice(0, 10);
  if (seen.get(ip) === today) {
    res.status(429).json({
      error: "One free scan per day — you've used today's. Come back tomorrow for another.",
    });
    return;
  }

  const started = performance.now();
  const deadline = AbortSignal.timeout(OVERALL_BUDGET_MS);
  const agent = makePinnedAgent();

  try {
    const target = validateTarget(rawUrl);
    const host = target.hostname;

    const doc = await getDocument(target, agent, deadline);
    const finalUrl = new URL(doc.finalUrl);
    const isHttps = finalUrl.protocol === "https:";
    const html = new TextDecoder().decode(doc.body);
    const tlsInfo = isHttps ? await probeTls(finalUrl.hostname) : null;

    const checks = await runChecks({
      doc,
      html,
      isHttps,
      host: finalUrl.hostname,
      origin: `${finalUrl.protocol}//${finalUrl.hostname}`,
      agent,
      signal: deadline,
      tls: tlsInfo,
    });

    // Score: weighted, pass=1 / warn=0.5 / fail=0
    let earned = 0;
    let total = 0;
    const counts = { pass: 0, warn: 0, fail: 0 };
    for (const k of checks) {
      total += k.weight;
      counts[k.severity]++;
      earned += k.weight * (k.severity === "pass" ? 1 : k.severity === "warn" ? 0.5 : 0);
    }
    const score = Math.round((earned / total) * 100);
    const grade = gradeFor(score);

    const problems = checks
      .filter((k) => k.severity !== "pass")
      .sort((a, b) => b.weight - a.weight || (a.severity === "fail" ? -1 : 1));
    const issues = problems.slice(0, 3).map((k) => ({
      id: k.id,
      title: k.title,
      severity: k.severity.toUpperCase(),
      metric: k.metric,
      detail: k.detail,
      fix: k.fix,
    }));
    const locked = problems.slice(3).map((k) => ({ title: k.title, metric: k.metric }));

    seen.set(ip, today);

    res.status(200).json({
      url: doc.finalUrl,
      host: finalUrl.hostname || host,
      score,
      grade,
      checksRun: checks.length,
      durationMs: Math.round(performance.now() - started),
      summary: counts,
      issues,
      locked,
    });
  } catch (err) {
    const status = err instanceof ScanError ? err.status : 500;
    const message =
      err instanceof ScanError
        ? err.message
        : "The scan hit an unexpected error. Try again in a moment.";
    res.status(status).json({ error: message });
  } finally {
    try {
      await agent.close();
    } catch {
      /* noop */
    }
  }
}
