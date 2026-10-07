/**
 * GET / POST / DELETE /api/history — Server-side scan history for signed-in users.
 * Supports cross-device report syncing.
 */

import { verifyFirebaseToken } from "./_lib/auth.js";

type ReqLike = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type ResLike = {
  status: (code: number) => ResLike;
  json: (body: unknown) => void;
};

// In-memory server store keyed by user UID (can be backed by Firestore/DB).
// Persists during the serverless function lifecycle.
const serverHistoryStore = new Map<string, Array<any>>();

export default async function handler(req: ReqLike, res: ResLike) {
  const rawAuth = req.headers?.authorization;
  const idToken =
    typeof rawAuth === "string" && rawAuth.startsWith("Bearer ") ? rawAuth.slice(7) : null;
  if (!idToken) {
    return res.status(401).json({ error: "Sign in to access your history." });
  }

  let uid: string;
  try {
    ({ uid } = await verifyFirebaseToken(idToken));
  } catch {
    return res.status(401).json({ error: "Session expired. Sign in again." });
  }

  const existing = serverHistoryStore.get(uid) || [];

  if (req.method === "GET") {
    return res.status(200).json({ reports: existing });
  }

  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const report = body?.report;
      if (!report || !report.url) {
        return res.status(400).json({ error: "Invalid report data." });
      }

      // Filter out duplicate and prepend new report
      const updated = [
        report,
        ...existing.filter((r) => !(r.url === report.url && r.scannedAt === report.scannedAt)),
      ].slice(0, 50);

      serverHistoryStore.set(uid, updated);
      return res.status(200).json({ success: true, reports: updated });
    } catch {
      return res.status(400).json({ error: "Could not parse report." });
    }
  }

  if (req.method === "DELETE") {
    serverHistoryStore.delete(uid);
    return res.status(200).json({ success: true, reports: [] });
  }

  return res.status(405).json({ error: "Method not allowed." });
}
