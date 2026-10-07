/**
 * GET /api/entitlements — returns the signed-in user's paid entitlements.
 *
 * AUTH: requires a Firebase ID token (Authorization: Bearer <token>).
 * Uses the Paddle API as the source of truth — no database needed.
 * Queries Paddle for the customer's completed transactions and active
 * subscriptions, then maps them to plan entitlements.
 *
 * Returns: { report: boolean, monitoring: boolean, agency: boolean }
 */

import { createPublicKey, verify } from "node:crypto";

const PADDLE_API_URL = process.env.PADDLE_API_URL || "https://sandbox-api.paddle.com";
const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  "auditify-74fad";
const GOOGLE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

// Sandbox price IDs — replace with live when migrating.
const PRICE_IDS = {
  report: "pri_01m47vk1tcvrfe2gagdajzwz43",
  monitoring: "pri_01m47vmey48r4qctyn3drjq2ts",
  agency: "pri_01m47vnw1q4tap949d754c17dm",
};

let certCache: { certs: Record<string, string>; expiresAt: number } | null = null;

async function googleCerts(): Promise<Record<string, string>> {
  if (certCache && Date.now() < certCache.expiresAt) return certCache.certs;
  const res = await fetch(GOOGLE_CERTS_URL);
  if (!res.ok) throw new Error("Could not fetch Google certs.");
  const certs = (await res.json()) as Record<string, string>;
  certCache = { certs, expiresAt: Date.now() + 55 * 60 * 1000 };
  return certs;
}

function b64url(input: string): Buffer {
  let s = input.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

async function verifyFirebaseToken(idToken: string): Promise<{ uid: string; email: string }> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Malformed token.");
  const header = JSON.parse(b64url(parts[0]).toString("utf8")) as { kid?: string; alg?: string };
  const payload = JSON.parse(b64url(parts[1]).toString("utf8")) as {
    aud?: string;
    iss?: string;
    sub?: string;
    email?: string;
    exp?: number;
  };
  if (header.alg !== "RS256" || !header.kid) throw new Error("Unexpected token algorithm.");
  const cert = (await googleCerts())[header.kid];
  if (!cert) throw new Error("Unknown signing key.");
  const key = createPublicKey(cert);
  const signed = Buffer.from(`${parts[0]}.${parts[1]}`);
  if (!verify("RSA-SHA256", signed, key, b64url(parts[2]))) {
    throw new Error("Bad token signature.");
  }
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== FIREBASE_PROJECT_ID) throw new Error("Token not for this project.");
  if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) {
    throw new Error("Bad token issuer.");
  }
  if (typeof payload.exp !== "number" || payload.exp < now) throw new Error("Token expired.");
  if (!payload.sub || typeof payload.email !== "string" || !payload.email) {
    throw new Error("Token has no identity.");
  }
  return { uid: payload.sub, email: payload.email };
}

type ReqLike = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
};

type ResLike = {
  status: (code: number) => ResLike;
  json: (body: unknown) => void;
};

async function paddleGet(path: string, apiKey: string): Promise<any> {
  const res = await fetch(`${PADDLE_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Paddle API ${path} failed: ${res.status}`);
  return res.json();
}

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

  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Payments are not connected yet." });
  }

  try {
    // Find customer by email
    const customers = await paddleGet(
      `/customers?email=${encodeURIComponent(email)}`,
      apiKey
    );
    const customer = customers?.data?.[0];
    if (!customer?.id) {
      // No Paddle customer = no purchases
      return res.status(200).json({ report: false, monitoring: false, agency: false });
    }

    const customerId = customer.id;

    // Check for completed one-time report transaction
    const transactions = await paddleGet(
      `/transactions?customer_id=${customerId}&status=completed&per_page=50`,
      apiKey
    );
    const hasReport = (transactions?.data ?? []).some((txn: any) =>
      (txn.items ?? []).some((item: any) => item.price?.id === PRICE_IDS.report)
    );

    // Check for active subscriptions
    const subscriptions = await paddleGet(
      `/subscriptions?customer_id=${customerId}&status=active&per_page=50`,
      apiKey
    );
    const subs = subscriptions?.data ?? [];
    const hasMonitoring = subs.some((sub: any) =>
      (sub.items ?? []).some((item: any) => item.price?.id === PRICE_IDS.monitoring)
    );
    const hasAgency = subs.some((sub: any) =>
      (sub.items ?? []).some((item: any) => item.price?.id === PRICE_IDS.agency)
    );

    return res.status(200).json({
      report: hasReport,
      monitoring: hasMonitoring,
      agency: hasAgency,
    });
  } catch (err) {
    console.error("[entitlements] Paddle API error:", err instanceof Error ? err.message : err);
    return res.status(502).json({ error: "Could not check entitlements. Try again." });
  }
}
