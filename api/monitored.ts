/**
 * GET /api/monitored — list user's monitored sites
 * POST /api/monitored — add a site { url }
 * DELETE /api/monitored?id=... — remove a site
 *
 * Requires Firebase ID token. Monitoring plan ($12/mo) required for POST.
 */

import { verifyFirebaseToken, checkPaddleEntitlements } from "./_lib/auth.js";
import {
  listUserMonitored,
  addMonitored,
  removeMonitored,
} from "./_lib/monitoring.js";

type ReqLike = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type ResLike = {
  status: (code: number) => ResLike;
  json: (body: unknown) => void;
};

function bearer(req: ReqLike): string | null {
  const h = req.headers["authorization"] || req.headers["Authorization"];
  const s = Array.isArray(h) ? h[0] : h;
  if (typeof s === "string" && s.startsWith("Bearer ")) return s.slice(7);
  return null;
}

function normalizeUrl(input: string): { url: string; host: string } | null {
  let u = input.trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try {
    const parsed = new URL(u);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return { url: parsed.origin + parsed.pathname, host: parsed.hostname };
  } catch {
    return null;
  }
}

export default async function handler(req: ReqLike, res: ResLike) {
  const token = bearer(req);
  if (!token) return res.status(401).json({ error: "Sign in to continue." });

  let uid: string, email: string;
  try {
    ({ uid, email } = await verifyFirebaseToken(token));
  } catch {
    return res.status(401).json({ error: "Invalid session. Sign in again." });
  }

  if (req.method === "GET") {
    try {
      const sites = await listUserMonitored(uid);
      return res.status(200).json({ sites });
    } catch (e) {
      console.error("[monitored] list failed:", e);
      return res.status(500).json({ error: "Could not load monitored sites." });
    }
  }

  if (req.method === "POST") {
    // Monitoring plan required
    try {
      const ent = await checkPaddleEntitlements(email);
      if (!ent.monitoring && !ent.agency) {
        return res.status(403).json({ error: "Monitoring plan required." });
      }
    } catch {
      return res.status(403).json({ error: "Monitoring plan required." });
    }

    const body = (req.body || {}) as { url?: unknown };
    if (typeof body.url !== "string") {
      return res.status(400).json({ error: "Provide a URL to monitor." });
    }
    const norm = normalizeUrl(body.url);
    if (!norm) return res.status(400).json({ error: "That doesn't look like a valid URL." });

    // Cap at 10 sites per user
    const existing = await listUserMonitored(uid);
    if (existing.length >= 10) {
      return res.status(400).json({ error: "Monitoring is limited to 10 sites." });
    }

    try {
      const id = await addMonitored({ uid, email, url: norm.url, host: norm.host });
      return res.status(200).json({ id, url: norm.url, host: norm.host });
    } catch (e) {
      console.error("[monitored] add failed:", e);
      return res.status(500).json({ error: "Could not add site." });
    }
  }

  if (req.method === "DELETE") {
    const q = req.query || {};
    const idRaw = q.id;
    const id = Array.isArray(idRaw) ? idRaw[0] : idRaw;
    if (!id) return res.status(400).json({ error: "Missing site id." });
    const ok = await removeMonitored(uid, id);
    if (!ok) return res.status(404).json({ error: "Site not found." });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed." });
}
