/**
 * GET /api/entitlements — returns the signed-in user's paid entitlements.
 * Uses shared helper (api/_entitlements.ts).
 */

import { verifyFirebaseToken, getEntitlements } from "./_entitlements";

type ReqLike = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
};

type ResLike = {
  status: (code: number) => ResLike;
  json: (body: unknown) => void;
};

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const rawAuth = req.headers?.authorization;
  const idToken =
    typeof rawAuth === "string" && rawAuth.startsWith("Bearer ") ? rawAuth.slice(7) : null;
  if (!idToken) {
    return res.status(401).json({ error: "Sign in to continue." });
  }

  let email: string;
  try {
    ({ email } = await verifyFirebaseToken(idToken));
  } catch {
    return res.status(401).json({ error: "Session expired. Sign in again." });
  }

  try {
    const ent = await getEntitlements(email);
    return res.status(200).json(ent);
  } catch (err) {
    console.error("[entitlements] Error:", err instanceof Error ? err.message : err);
    return res.status(502).json({ error: "Could not check entitlements. Try again." });
  }
}
