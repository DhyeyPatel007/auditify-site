/**
 * POST /api/paddle-transaction — create a Paddle transaction and return the
 * hosted checkout URL. The buyer is redirected to Paddle's full checkout
 * page (no overlay).
 */

import {
  verifyFirebaseToken,
  PRICE_IDS,
  PLAN_SLUGS,
  PADDLE_API_URL,
} from "./_lib/auth.js";

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
  const priceKey = plan ? (PLAN_SLUGS[plan] as keyof typeof PRICE_IDS) : undefined;
  const priceId = priceKey ? PRICE_IDS[priceKey] : undefined;
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
    data?: { id?: string; checkout?: { url?: string } };
  } | null;
  const transactionId = data?.data?.id;
  const url = data?.data?.checkout?.url;
  if (!apiRes.ok || !transactionId) {
    console.error("[paddle] transaction create failed:", apiRes.status);
    return res.status(502).json({ error: "Could not start checkout. Try again." });
  }
  return res.status(200).json({ transactionId, url });
}
