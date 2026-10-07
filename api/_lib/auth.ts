/**
 * Shared server-side authentication and Paddle entitlements logic.
 * Used by /api/entitlements, /api/scan, and /api/paddle-transaction.
 */

import { createPublicKey, verify } from "node:crypto";

export const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  "auditify-74fad";

export const PADDLE_API_URL =
  process.env.PADDLE_API_URL || "https://sandbox-api.paddle.com";

const GOOGLE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

export const PRICE_IDS = {
  report: process.env.PADDLE_PRICE_REPORT || "pri_01m4ada569rqbepcfvyxq98zhx",
  monitoring:
    process.env.PADDLE_PRICE_MONITORING || "pri_01m4adbe35cgd1m4y2pgbce9q2",
  agency: process.env.PADDLE_PRICE_AGENCY || "pri_01m4adcrvcecg8k83aahvwkmc5",
};

// Known price IDs across both sandbox and live environments
export const KNOWN_PRICE_IDS = {
  report: new Set([
    process.env.PADDLE_PRICE_REPORT,
    "pri_01m4ada569rqbepcfvyxq98zhx", // live
    "pri_01m47vk1tcvrfe2gagdajzwz43", // sandbox
  ].filter(Boolean) as string[]),
  monitoring: new Set([
    process.env.PADDLE_PRICE_MONITORING,
    "pri_01m4adbe35cgd1m4y2pgbce9q2", // live
    "pri_01m47vmey48r4qctyn3drjq2ts", // sandbox
  ].filter(Boolean) as string[]),
  agency: new Set([
    process.env.PADDLE_PRICE_AGENCY,
    "pri_01m4adcrvcecg8k83aahvwkmc5", // live
    "pri_01m47vnw1q4tap949d754c17dm", // sandbox
  ].filter(Boolean) as string[]),
};

export const PLAN_SLUGS: Record<string, string> = {
  "One-time report": "report",
  Monitoring: "monitoring",
  "Agency white-label": "agency",
};

let certCache: { certs: Record<string, string>; expiresAt: number } | null = null;

export async function googleCerts(): Promise<Record<string, string>> {
  if (certCache && Date.now() < certCache.expiresAt) return certCache.certs;
  const res = await fetch(GOOGLE_CERTS_URL);
  if (!res.ok) throw new Error("Could not fetch Google certs.");
  const certs = (await res.json()) as Record<string, string>;
  certCache = { certs, expiresAt: Date.now() + 55 * 60 * 1000 };
  return certs;
}

export function b64url(input: string): Buffer {
  let s = input.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

export async function verifyFirebaseToken(
  idToken: string
): Promise<{ uid: string; email: string }> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Malformed token.");

  const header = JSON.parse(b64url(parts[0]).toString("utf8")) as {
    kid?: string;
    alg?: string;
  };
  const payload = JSON.parse(b64url(parts[1]).toString("utf8")) as {
    aud?: string;
    iss?: string;
    sub?: string;
    email?: string;
    exp?: number;
  };

  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Unexpected token algorithm.");
  }

  const cert = (await googleCerts())[header.kid];
  if (!cert) throw new Error("Unknown signing key.");

  const key = createPublicKey(cert);
  const signed = Buffer.from(`${parts[0]}.${parts[1]}`);
  if (!verify("RSA-SHA256", signed, key, b64url(parts[2]))) {
    throw new Error("Bad token signature.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== FIREBASE_PROJECT_ID) {
    throw new Error("Token not for this project.");
  }
  if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) {
    throw new Error("Bad token issuer.");
  }
  if (typeof payload.exp !== "number" || payload.exp < now) {
    throw new Error("Token expired.");
  }
  if (!payload.sub || typeof payload.email !== "string" || !payload.email) {
    throw new Error("Token has no identity.");
  }

  return { uid: payload.sub, email: payload.email };
}

export type UserEntitlements = {
  report: boolean;
  reportCredits: number;
  monitoring: boolean;
  agency: boolean;
};

// In-memory cache for customer entitlements with 2-minute TTL
type CachedEntitlement = {
  entitlements: UserEntitlements;
  expiresAt: number;
};
const entitlementsCache = new Map<string, CachedEntitlement>();

export async function checkPaddleEntitlements(
  email: string
): Promise<UserEntitlements> {
  const normEmail = email.trim().toLowerCase();
  const cached = entitlementsCache.get(normEmail);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.entitlements;
  }

  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) {
    // If payments not configured, default to free tier
    return { report: false, reportCredits: 0, monitoring: false, agency: false };
  }

  const paddleGet = async (path: string, attempt = 1): Promise<any> => {
    try {
      const r = await fetch(`${PADDLE_API_URL}${path}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!r.ok) {
        if (r.status >= 500 && attempt < 2) {
          // Retry once on server error
          await new Promise((resolve) => setTimeout(resolve, 500));
          return paddleGet(path, attempt + 1);
        }
        throw new Error(`Paddle API failed: ${r.status}`);
      }
      return r.json();
    } catch (e) {
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return paddleGet(path, attempt + 1);
      }
      throw e;
    }
  };

  try {
    const customers = await paddleGet(
      `/customers?email=${encodeURIComponent(normEmail)}`
    );
    const customer = customers?.data?.[0];
    if (!customer?.id) {
      const zero: UserEntitlements = {
        report: false,
        reportCredits: 0,
        monitoring: false,
        agency: false,
      };
      entitlementsCache.set(normEmail, {
        entitlements: zero,
        expiresAt: Date.now() + 60 * 1000,
      });
      return zero;
    }

    const customerId = customer.id;
    const transactions = await paddleGet(
      `/transactions?customer_id=${customerId}&status=completed&per_page=50`
    );
    const txns = transactions?.data ?? [];
    const reportCredits = txns.filter((txn: any) =>
      (txn.items ?? []).some(
        (item: any) =>
          KNOWN_PRICE_IDS.report.has(item.price?.id) ||
          item.price?.id === PRICE_IDS.report ||
          txn.custom_data?.plan === "report"
      )
    ).length;

    const subscriptions = await paddleGet(
      `/subscriptions?customer_id=${customerId}&status=active&per_page=50`
    );
    const subs = subscriptions?.data ?? [];
    const hasMonitoring = subs.some((sub: any) =>
      (sub.items ?? []).some(
        (item: any) =>
          KNOWN_PRICE_IDS.monitoring.has(item.price?.id) ||
          item.price?.id === PRICE_IDS.monitoring ||
          sub.custom_data?.plan === "monitoring"
      )
    );
    const hasAgency = subs.some((sub: any) =>
      (sub.items ?? []).some(
        (item: any) =>
          KNOWN_PRICE_IDS.agency.has(item.price?.id) ||
          item.price?.id === PRICE_IDS.agency ||
          sub.custom_data?.plan === "agency"
      )
    );

    const result: UserEntitlements = {
      report: reportCredits > 0,
      reportCredits,
      monitoring: hasMonitoring,
      agency: hasAgency,
    };

    entitlementsCache.set(normEmail, {
      entitlements: result,
      expiresAt: Date.now() + 2 * 60 * 1000,
    });

    return result;
  } catch (err) {
    // If cached version exists, return it even if expired to prevent downtime
    if (cached) return cached.entitlements;
    throw err;
  }
}
