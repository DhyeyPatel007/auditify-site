/**
 * Paddle checkout (Paddle Billing / paddle.js v2).
 *
 * Sandbox while VITE_PADDLE_ENV !== "production". Price IDs below are the
 * SANDBOX ids — replace with live ids when Paddle moves to production.
 * The client-side token comes from VITE_PADDLE_TOKEN (public by design).
 */

const PRICE_IDS: Record<string, string> = {
  // Sandbox price IDs (Paddle dashboard → Catalog → Products)
  "One-time report": "pri_01m47vk1tcvrfe2gagdajzwz43",
  Monitoring: "pri_01m47vmey48r4qctyn3drjq2ts",
  "Agency white-label": "pri_01m47vnw1q4tap949d754c17dm",
};

type PaddleCheckoutOptions = {
  items: { priceId: string; quantity: number }[];
  customer?: { email?: string };
};

type PaddleInstance = {
  Environment: { set: (env: "sandbox" | "production") => void };
  Initialize: (opts: { token: string }) => void;
  Checkout: { open: (opts: PaddleCheckoutOptions) => void };
};

declare global {
  interface Window {
    Paddle?: PaddleInstance;
  }
}

let paddleReady: Promise<void> | null = null;

function loadPaddle(): Promise<void> {
  if (paddleReady) return paddleReady;
  paddleReady = new Promise<void>((resolve, reject) => {
    if (window.Paddle) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Paddle.js failed to load."));
    document.head.appendChild(s);
  }).then(() => {
    const token = import.meta.env.VITE_PADDLE_TOKEN as string | undefined;
    if (!token) throw new Error("Checkout is not connected yet.");
    const env = import.meta.env.VITE_PADDLE_ENV === "production" ? "production" : "sandbox";
    window.Paddle!.Environment.set(env);
    window.Paddle!.Initialize({ token });
  });
  return paddleReady;
}

/**
 * Open Paddle checkout for a plan ("One-time report" | "Monitoring" |
 * "Agency white-label"). Throws when Paddle isn't configured — callers fall
 * back to the "coming soon" dialog in that case.
 */
export async function openCheckout(planName: string, email?: string | null): Promise<void> {
  const priceId = PRICE_IDS[planName];
  if (!priceId) throw new Error(`No price configured for "${planName}".`);
  await loadPaddle();
  window.Paddle!.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    ...(email ? { customer: { email } } : {}),
  });
}
