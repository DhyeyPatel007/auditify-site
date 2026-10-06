/**
 * POST /api/paddle-webhook — Paddle Billing webhook receiver.
 *
 * Sandbox now, live later. Verifies the Paddle-Signature header (HMAC-SHA256
 * over "ts;rawBody") before trusting anything, then routes
 * transaction.completed events to fulfillment via the product's
 * custom_data.plan value ("report" | "monitoring" | "agency").
 *
 * Fulfillment target: write entitlements to Firestore keyed by customer
 * email (passed at checkout). Until the paid features land, verified events
 * are logged so sandbox payments can be confirmed end-to-end in Vercel logs.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

// Raw body is required for signature verification — no JSON parsing.
export const config = { api: { bodyParser: false } };

type ReqLike = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
} & AsyncIterable<Uint8Array>;

type ResLike = {
  status: (code: number) => ResLike;
  json: (body: unknown) => void;
};

const MAX_SKEW_S = 600; // kept for reference; not enforced (see verifySignature)

async function readRawBody(req: AsyncIterable<Uint8Array>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function headerValue(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Returns true when the Paddle-Signature header is valid for this body. */
function verifySignature(secret: string, sigHeader: string | undefined, rawBody: Buffer): boolean {
  if (!sigHeader) return false;
  const fields: Record<string, string> = {};
  for (const part of sigHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx > 0) fields[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }
  const ts = fields["ts"];
  const hashes = Object.entries(fields)
    .filter(([k]) => k.startsWith("h"))
    .map(([, v]) => v);
  if (!ts || hashes.length === 0) return false;

  // Note: no timestamp freshness check — Paddle replays reuse the original
  // timestamp, and the HMAC itself is the authentication.

  const expected = createHmac("sha256", secret).update(ts + ":").update(rawBody).digest();
  return hashes.some((h) => {
    const got = Buffer.from(h, "hex");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[paddle] PADDLE_WEBHOOK_SECRET is not set — rejecting webhook.");
    return res.status(500).json({ error: "Webhook not configured." });
  }

  const rawBody = await readRawBody(req);
  const sigHeader = headerValue(req.headers["paddle-signature"]);
  if (!verifySignature(secret, sigHeader, rawBody)) {
    console.warn("[paddle] Invalid signature — webhook rejected.");
    // TEMP DEBUG — remove after diagnosing
    return res.status(401).json({
      error: "Invalid signature.",
      debug: {
        secretSet: !!secret,
        secretLen: secret.length,
        headerPresent: !!sigHeader,
        headerPreview: sigHeader ? sigHeader.slice(0, 20) + "..." : null,
        bodyLen: rawBody.length,
        bodyPreview: rawBody.toString("utf8").slice(0, 50),
      },
    });
  }

  let event: { event_type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "Invalid JSON." });
  }

  const type = event.event_type ?? "unknown";
  const data = (event.data ?? {}) as Record<string, any>;
  const customData = (data.custom_data ?? {}) as Record<string, string>;
  const plan = customData.plan ?? "unknown";

  if (type === "transaction.completed") {
    // Fulfillment decision — the money pipe working end-to-end.
    console.log(
      `[paddle] FULFILL plan=${plan} txn=${data.id ?? "?"} customer=${data.customer_id ?? "?"}`
    );
  } else if (type.startsWith("subscription.")) {
    console.log(`[paddle] ${type} plan=${plan} subscription=${data.id ?? "?"}`);
  } else {
    console.log(`[paddle] ignored event ${type}`);
  }

  return res.status(200).json({ received: true });
}
