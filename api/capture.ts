/**
 * POST /api/capture — email capture for Auditify free scans.
 *
 * Receives { email, url, score, grade } from the scan-results page, validates
 * them, and stores the record through the provider configured in
 * api/lib/emailCapture.ts (stub tonight, real email service once
 * EMAIL_SERVICE_API_KEY + EMAIL_SERVICE_LIST_ID are set).
 *
 * Honesty rules (never fake "email sent"):
 *  - The response reports `saved: true` only when the record was stored.
 *  - `delivery` tells the UI what to promise: tonight it is always
 *    "after-launch" because paid report emails only exist once Paddle
 *    checkout is live — matching the site's existing checkout copy.
 *
 * Lightweight in-memory per-IP rate limit (preview-grade, same approach as
 * /api/scan). No credentials anywhere in this file.
 */

import {
  getProvider,
  isExternalServiceLive,
  type CaptureRecord,
} from "./lib/emailCapture";

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

const MAX_EMAIL_LEN = 254;
const MAX_URL_LEN = 2048;
// RFC 5322-ish sanity check — server-side, plus browser type="email".
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/;

// Rate limit: 10 captures / 10 minutes per client IP (in-memory).
const CAPTURE_WINDOW_MS = 10 * 60 * 1000;
const CAPTURE_MAX_PER_WINDOW = 10;
const attempts = new Map<string, number[]>(); // ip -> timestamps

function clientIp(req: ReqLike): string {
  const h = req.headers;
  const fwd = h["x-forwarded-for"] || h["X-Forwarded-For"];
  if (typeof fwd === "string" && fwd) return fwd.split(",")[0].trim();
  if (Array.isArray(fwd) && fwd.length) return String(fwd[0]).split(",")[0].trim();
  const real = h["x-real-ip"] || h["X-Real-Ip"];
  if (typeof real === "string" && real) return real.trim();
  return req.socket?.remoteAddress || "unknown";
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((t) => now - t < CAPTURE_WINDOW_MS);
  if (recent.length >= CAPTURE_MAX_PER_WINDOW) {
    attempts.set(ip, recent);
    return true;
  }
  recent.push(now);
  attempts.set(ip, recent);
  return false;
}

function cleanUrl(raw: string): { ok: true; url: URL } | { ok: false } {
  let s = raw.trim();
  if (s.length === 0 || s.length > MAX_URL_LEN) return { ok: false };
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return { ok: false };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { ok: false };
  if (u.username || u.password) return { ok: false }; // no credentials in URLs
  if (!u.hostname) return { ok: false };
  return { ok: true, url: u };
}

export default async function handler(req: ReqLike, res: ResLike) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed — POST a JSON body {email, url, score}." });
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : ((req.body as Record<string, unknown>) || {});
  } catch {
    body = {};
  }

  // --- validate email ---
  const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!rawEmail || rawEmail.length > MAX_EMAIL_LEN || !EMAIL_RE.test(rawEmail)) {
    res.status(400).json({ error: "That doesn't look like a valid email address." });
    return;
  }

  // --- validate url (the scanned site) ---
  if (typeof body.url !== "string") {
    res.status(400).json({ error: "The scanned URL looks invalid." });
    return;
  }
  const parsed = cleanUrl(body.url);
  if (!parsed.ok) {
    res.status(400).json({ error: "The scanned URL looks invalid." });
    return;
  }
  const host = parsed.url.hostname.toLowerCase();
  const finalUrl = parsed.url.toString();

  // --- validate score / grade (soft: unknown values are clamped, never fatal) ---
  const scoreNum = Number(body.score);
  const score = Number.isFinite(scoreNum) ? Math.max(0, Math.min(100, Math.round(scoreNum))) : 0;
  const grade = typeof body.grade === "string" && /^[A-F]$/.test(body.grade.trim().toUpperCase())
    ? body.grade.trim().toUpperCase()
    : "?";

  // --- rate limit before doing work ---
  const ip = clientIp(req);
  if (rateLimited(ip)) {
    res.status(429).json({ error: "Too many tries — wait a few minutes and try again." });
    return;
  }

  const record: CaptureRecord = {
    email: rawEmail,
    url: finalUrl,
    host,
    score,
    grade,
    capturedAt: new Date().toISOString(),
    source: "free-scan-results",
  };

  try {
    await getProvider().capture(record);
  } catch (err) {
    // Never leak internals or credentials to the client.
    console.error(`[email-capture] provider failure: ${(err as Error).message}`);
    res.status(502).json({ error: "Couldn't save your email right now. Your results above are unaffected — try again in a moment." });
    return;
  }

  // delivery: what the UI is allowed to promise. Tonight the provider is the
  // stub, and report emails only exist after Paddle checkout launches — so
  // "after-launch" is the only truthful promise either way.
  res.status(200).json({
    ok: true,
    saved: true,
    delivery: "after-launch",
    via: isExternalServiceLive() ? "email-service" : "pending-setup",
  });
}
