/**
 * POST /api/paddle-transaction — create a Paddle transaction and return the
 * hosted checkout URL. The buyer is redirected to Paddle's full checkout
 * page (no overlay).
 *
 * AUTH: requires a Firebase ID token (Authorization: Bearer <token>).
 * The token is verified server-side with Google's public certs (no SDK —
 * plain node:crypto, zero dependencies). Email/uid come from the verified
 * token, never from client input. No token → 401. This closes the loophole:
 * checkout cannot be started anonymously or for someone else.
 *
 * Sandbox while PADDLE_API_URL points at the sandbox API. Price IDs below
 * are the SANDBOX ids — replace with live ids when Paddle moves to production.
 * PADDLE_API_KEY is the server-side secret key (never exposed to the browser).
 */

import { createPublicKey, verify } from "node:crypto";

const PRICE_IDS: Record<string, string> = {
  // Sandbox price IDs (Paddle dashboard → Catalog → Products)
  "One-time report": "pri_01m47vk1tcvrfe2gagdajzwz43",
  Monitoring: "pri_01m47vmey48r4qctyn3drjq2ts",
  "Agency white-label": "pri_01m47vnw1q4tap949d754c17dm",
};

const PLAN_SLUGS: Record<string, string> = {
  "One-time report": "report",
  Monitoring: "monitoring",
  "Agency white-label": "agency",
};

const PADDLE_API_URL = process.env.PADDLE_API_URL || "https://sandbox-api.paddle.com";
const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  "auditify-74fad";
const GOOGLE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

// Google rotates these certs; cache for under an hour.
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

/** Verify a Firebase ID token. Returns the verified uid + email, or throws. */
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
    iat?: number;
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
  body?: { plan?: string };
};

type ResLike = {
  status: (code: number) => ResLike;
  json: (body: unknown) => void;
};

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  // --- Fail-safe 1: verified sign-in required ---
  const rawAuth = req.headers?.authorization;
  const idToken =
    typeof rawAuth === "string" && rawAuth.startsWith("Bearer ") ? rawAuth.slice(7) : null;
  if (!idToken) {
    return res.status(401).json({ error: "Sign in to continue." });
  }
  let uid: string;
  let email: string;
  try {
    ({ uid, email } = await verifyFirebaseToken(idToken));
  } catch {
    return res.status(401).json({ error: "Session expired. Sign in again." });
  }

  // --- Fail-safe 2: payments configured ---
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Payments are not connected yet." });
  }

  const plan = req.body?.plan;
  const priceId = plan ? PRICE_IDS[plan] : undefined;
  if (!priceId || !plan) {
    return res.status(400).json({ error: "Unknown plan." });
  }

  let apiRes: Response;
  try {
    apiRes = await fetch(`${PADDLE_API_URL}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ price_id: priceId, quantity: 1 }],
        customer: { email },
        // Without this, Paddle creates the transaction with checkout disabled
        // and the hosted checkout page shows "Something went wrong".
        enable_checkout: true,
        // Verified uid travels with the transaction so fulfillment can
        // credit exactly the signed-in buyer — not whoever typed an email.
        custom_data: { plan: PLAN_SLUGS[plan], firebase_uid: uid },
      }),
    });
  } catch {
    return res.status(502).json({ error: "Could not reach Paddle. Try again." });
  }

  const data = (await apiRes.json().catch(() => null)) as {
    data?: { checkout?: { url?: string } };
  } | null;
  const url = data?.data?.checkout?.url;
  if (!apiRes.ok || !url) {
    console.error("[paddle] transaction create failed:", apiRes.status);
    return res.status(502).json({ error: "Could not start checkout. Try again." });
  }
  return res.status(200).json({ url });
}
