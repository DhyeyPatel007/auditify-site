/**
 * POST /api/paddle-transaction — create a Paddle transaction and return the
 * hosted checkout URL. The buyer is redirected to Paddle's full checkout
 * page (no overlay).
 *
 * AUTH: requires a Firebase ID token (Authorization: Bearer <token>).
 * The token is verified server-side — the buyer's email/uid come from the
 * verified token, never from client input. No token → 401. This closes the
 * loophole: checkout cannot be started anonymously or for someone else.
 *
 * Sandbox while PADDLE_API_URL points at the sandbox API. Price IDs below
 * are the SANDBOX ids — replace with live ids when Paddle moves to production.
 * PADDLE_API_KEY is the server-side secret key (never exposed to the browser).
 */

import admin from "firebase-admin";

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

function auth() {
  if (!admin.apps.length) {
    // ID-token verification only needs the project ID (Google's public certs).
    admin.initializeApp({ projectId: FIREBASE_PROJECT_ID });
  }
  return admin.auth();
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
  const idToken = typeof rawAuth === "string" && rawAuth.startsWith("Bearer ") ? rawAuth.slice(7) : null;
  if (!idToken) {
    return res.status(401).json({ error: "Sign in to continue." });
  }
  let uid: string;
  let email: string;
  try {
    const decoded = await auth().verifyIdToken(idToken);
    uid = decoded.uid;
    email = typeof decoded.email === "string" ? decoded.email : "";
    if (!email) throw new Error("no email");
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
