/**
 * POST /api/verify-purchase — Client-triggered purchase verification.
 * Called after Paddle checkout completes. Verifies via Paddle API and
 * records to Firestore. Fallback for when webhooks don't fire (e.g. $0 orders).
 */

import { verifyFirebaseToken } from "./_lib/auth.js";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

type ReqLike = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type ResLike = {
  status: (code: number) => ResLike;
  json: (body: unknown) => void;
};

function bearer(req: ReqLike): string | null {
  const h = req.headers["authorization"] || req.headers["Authorization"];
  const s = Array.isArray(h) ? h[0] : h;
  if (typeof s === "string" && s.startsWith("Bearer ")) return s.slice(7);
  return null;
}

function db() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT not configured.");
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return getFirestore();
}

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const token = bearer(req);
  if (!token) return res.status(401).json({ error: "Sign in to continue." });

  let email: string;
  try {
    ({ email } = await verifyFirebaseToken(token));
  } catch {
    return res.status(401).json({ error: "Invalid session." });
  }

  const normEmail = email.trim().toLowerCase();
  const apiKey = process.env.PADDLE_API_KEY;
  const apiUrl = process.env.PADDLE_API_URL || "https://sandbox-api.paddle.com";

  if (!apiKey) {
    return res.status(500).json({ error: "Payment service not configured." });
  }

  try {
    // Find customer by email
    const custRes = await fetch(
      `${apiUrl}/customers?email=${encodeURIComponent(normEmail)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!custRes.ok) {
      return res.status(200).json({ verified: false, reason: "No customer found." });
    }
    const custData = (await custRes.json()) as { data?: { id?: string }[] };
    const customerId = custData.data?.[0]?.id;
    if (!customerId) {
      return res.status(200).json({ verified: false, reason: "No customer found." });
    }

    // Get recent completed transactions (last 10 minutes)
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const txnRes = await fetch(
      `${apiUrl}/transactions?customer_id=${customerId}&status=completed&per_page=10`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!txnRes.ok) {
      return res.status(200).json({ verified: false, reason: "Could not check transactions." });
    }
    const txnData = (await txnRes.json()) as {
      data?: {
        id: string;
        created_at: string;
        custom_data?: { plan?: string };
        items?: { price?: { id?: string } }[];
      }[];
    };

    const recent = (txnData.data || []).filter(
      (t) => t.created_at >= tenMinAgo
    );

    if (!recent.length) {
      return res.status(200).json({ verified: false, reason: "No recent purchase found." });
    }

    // Record each to Firestore
    const firestore = db();
    let recorded = 0;
    for (const txn of recent) {
      const plan = txn.custom_data?.plan || "report";
      await firestore.collection("purchases").doc(txn.id).set(
        {
          email: normEmail,
          plan,
          priceId: txn.items?.[0]?.price?.id || null,
          createdAt: new Date().toISOString(),
          verifiedVia: "client-verify",
        },
        { merge: true }
      );
      recorded++;
    }

    return res.status(200).json({ verified: true, recorded });
  } catch (e) {
    console.error("[verify-purchase] failed:", e);
    return res.status(500).json({ error: "Verification failed." });
  }
}
