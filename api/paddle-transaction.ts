/**
 * POST /api/paddle-transaction — create a Paddle transaction and return the
 * hosted checkout URL. The buyer is redirected to Paddle's full checkout
 * page (no overlay).
 *
 * Sandbox while PADDLE_API_URL points at the sandbox API. Price IDs below
 * are the SANDBOX ids — replace with live ids when Paddle moves to production.
 * PADDLE_API_KEY is the server-side secret key (never exposed to the browser).
 */

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

type ReqLike = {
  method?: string;
  body?: { plan?: string; email?: string };
};

type ResLike = {
  status: (code: number) => ResLike;
  json: (body: unknown) => void;
};

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Payments are not connected yet." });
  }

  const plan = req.body?.plan;
  const email = req.body?.email;
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
        ...(email ? { customer: { email } } : {}),
        custom_data: { plan: PLAN_SLUGS[plan] },
      }),
    });
  } catch {
    return res.status(502).json({ error: "Could not reach Paddle. Try again." });
  }

  const data = (await apiRes.json().catch(() => null)) as {
    data?: { checkout?: { url?: string } };
    error?: { detail?: string };
  } | null;
  const url = data?.data?.checkout?.url;
  if (!apiRes.ok || !url) {
    console.error(
      "[paddle] transaction create failed:",
      apiRes.status,
      JSON.stringify(data)?.slice(0, 300)
    );
    return res.status(502).json({ error: "Could not start checkout. Try again." });
  }
  return res.status(200).json({ url });
}
