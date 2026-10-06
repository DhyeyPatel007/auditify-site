/**
 * Paddle checkout.
 *
 * Flow: the server (api/paddle-transaction.ts) verifies the buyer's Firebase
 * ID token, creates the transaction with the secret API key, and returns the
 * transaction ID. The buyer is sent to /?checkout=<txnId>, where CheckoutPage
 * embeds Paddle's inline checkout.
 *
 * Callers must gate on sign-in first — and the server re-verifies, so the
 * gate can't be bypassed. Throws when checkout can't start.
 */

const PADDLE_CDN = "https://cdn.paddle.com/paddle/v2/paddle.js";
const PADDLE_ENV = (import.meta.env.VITE_PADDLE_ENV as string) || "sandbox";
const PADDLE_TOKEN = import.meta.env.VITE_PADDLE_TOKEN as string | undefined;

export type PaddleInstance = {
  Environment: { set: (env: string) => void };
  Initialize: (opts: { token: string; eventCallback?: (data: unknown) => void }) => void;
  Checkout: {
    open: (opts: { transactionId: string; settings?: Record<string, unknown> }) => void;
    close: () => void;
  };
};

declare global {
  interface Window {
    Paddle?: PaddleInstance;
  }
}

let paddleReady: Promise<void> | null = null;

function loadPaddle(): Promise<void> {
  if (window.Paddle) return Promise.resolve();
  if (paddleReady) return paddleReady;
  paddleReady = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PADDLE_CDN;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Payment system failed to load."));
    document.head.appendChild(script);
  });
  return paddleReady;
}

export async function initPaddle(
  eventCallback?: (data: unknown) => void
): Promise<PaddleInstance> {
  await loadPaddle();
  if (!PADDLE_TOKEN) throw new Error("Payments are not connected yet.");
  if (PADDLE_ENV === "sandbox") window.Paddle!.Environment.set("sandbox");
  window.Paddle!.Initialize({ token: PADDLE_TOKEN, ...(eventCallback ? { eventCallback } : {}) });
  return window.Paddle!;
}

/** Full flow: create the transaction server-side, then go to the checkout page. */
export async function startCheckout(
  planName: string,
  getIdToken: () => Promise<string>
): Promise<void> {
  const idToken = await getIdToken();
  const res = await fetch("/api/paddle-transaction", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ plan: planName }),
  });
  const data = (await res.json().catch(() => null)) as {
    transactionId?: string;
    error?: string;
  } | null;
  if (!res.ok || !data?.transactionId) {
    throw new Error(data?.error || "Checkout failed to start.");
  }
  window.location.href = `/?checkout=${data.transactionId}&plan=${encodeURIComponent(planName)}`;
}
