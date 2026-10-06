/**
 * Hosted checkout via Paddle.
 *
 * The server (api/paddle-transaction.ts) creates the transaction with the
 * secret API key and returns Paddle's hosted checkout URL; we redirect the
 * buyer there. No Paddle.js overlay — a proper full checkout page.
 *
 * Throws when checkout can't start; callers fall back to the "coming soon"
 * dialog in that case.
 */
export async function startCheckout(planName: string, email?: string | null): Promise<void> {
  const res = await fetch("/api/paddle-transaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan: planName, ...(email ? { email } : {}) }),
  });
  const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!res.ok || !data?.url) {
    throw new Error(data?.error || "Checkout failed to start.");
  }
  window.location.href = data.url;
}
