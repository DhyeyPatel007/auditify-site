/**
 * Shared entitlement checking for API routes.
 * Verifies Firebase ID token and checks Paddle for paid entitlements.
 */

import { createPublicKey, verify } from "node:crypto";

const PADDLE_API_URL = process.env.PADDLE_API_URL || "https://sandbox-api.paddle.com";
const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  "auditify-74fad";
const GOOGLE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

const PRICE_IDS = {
  report: "pri_01m4ada569rqbepcfvyxq98zhx",
  monitoring: "pri_01m4adbe35cgd1m4y2pgbce9q2",
  agency: "pri_01m4adcrvcecg8k83aahvwkmc5",
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

export async function verifyFirebaseToken(idToken: string): Promise<{ uid: string; email: string }> {
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

export type Entitlements = {
  report: boolean;
  monitoring: boolean;
  agency: boolean;
};

export async function getEntitlements(email: string): Promise<Entitlements> {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) throw new Error("Payments not configured.");

  const paddleGet = async (path: string) => {
    const res = await fetch(`${PADDLE_API_URL}${path}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Paddle API ${path} failed: ${res.status}`);
    return res.json();
  };

  const customers = await paddleGet(`/customers?email=${encodeURIComponent(email)}`);
  const customer = customers?.data?.[0];
  if (!customer?.id) {
    return { report: false, monitoring: false, agency: false };
  }

  const customerId = customer.id;
  const transactions = await paddleGet(
    `/transactions?customer_id=${customerId}&status=completed&per_page=50`
  );
  const hasReport = (transactions?.data ?? []).some((txn: any) =>
    (txn.items ?? []).some((item: any) => item.price?.id === PRICE_IDS.report)
  );

  const subscriptions = await paddleGet(
    `/subscriptions?customer_id=${customerId}&status=active&per_page=50`
  );
  const subs = subscriptions?.data ?? [];
  const hasMonitoring = subs.some((sub: any) =>
    (sub.items ?? []).some((item: any) => item.price?.id === PRICE_IDS.monitoring)
  );
  const hasAgency = subs.some((sub: any) =>
    (sub.items ?? []).some((item: any) => item.price?.id === PRICE_IDS.agency)
  );

  return { report: hasReport, monitoring: hasMonitoring, agency: hasAgency };
}

/** Returns true if the user has any paid plan that unlocks full reports. */
export function canViewFullReport(e: Entitlements): boolean {
  return e.report || e.monitoring || e.agency;
}
