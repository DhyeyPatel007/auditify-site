import { useEffect, useRef, useState } from "react";
import { initPaddle } from "../lib/paddle";
import { PLANS, formatPrice } from "../lib/plans";

/**
 * /?checkout=<txnId> — the buyer-facing checkout page. Embeds Paddle's
 * inline checkout for a server-created transaction. No overlay, no redirects.
 */
export function CheckoutPage({
  transactionId,
  planName,
}: {
  transactionId: string;
  planName: string | null;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const started = useRef(false);

  const plan = PLANS.find((p) => p.name === planName);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    initPaddle((data) => {
      const name = (data as { name?: string } | null)?.name;
      if (name === "checkout.completed") setCompleted(true);
    })
      .then((Paddle) => {
        Paddle.Checkout.open({
          transactionId,
          settings: {
            displayMode: "inline",
            frameTarget: "paddle-inline-checkout",
            frameInitialHeight: "450",
            frameStyle:
              "width:100%;min-width:286px;background-color:transparent;border:none;",
            theme: "light",
          },
        });
      })
      .catch((e) => setFailed(e instanceof Error ? e.message : "Checkout failed to load."));
  }, [transactionId]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-6 py-4">
          <a href="/" className="font-display text-[22px] font-bold tracking-tight">
            Auditify
          </a>
          <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-muted">
            Secure checkout
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-[720px] px-6 py-12 md:py-16">
        {completed ? (
          <div className="rounded-[10px] border border-line bg-surface p-8 text-center">
            <p className="font-display text-[28px] font-semibold">Payment received.</p>
            <p className="mt-3 text-[15px] text-ink-2">
              Your {plan?.name ?? "purchase"} is confirmed. A receipt is on its way to
              your email, and your full report unlocks shortly.
            </p>
            <a
              href="/dashboard"
              className="mt-6 inline-block min-h-[44px] rounded-lg bg-ink px-6 py-3 text-[15px] font-medium text-paper"
            >
              Back to dashboard
            </a>
          </div>
        ) : (
          <>
            <p className="eyebrow text-ink-2">Checkout</p>
            <h1 className="mt-3 font-display text-[32px] font-semibold">
              {plan ? plan.name : "Complete your purchase"}
            </h1>
            <p className="mt-2 text-[15px] text-ink-2">
              {plan ? (
                <>
                  {formatPrice(plan.price)} {plan.per === "/once" ? "one-time" : plan.per} ·
                  secure payment via Paddle
                </>
              ) : (
                "Complete your purchase below."
              )}
            </p>
            <div className="mt-8 rounded-[10px] border border-line bg-surface p-4 sm:p-6">
              {failed ? (
                <p className="text-[15px] font-medium text-accent">
                  Checkout couldn&apos;t load: {failed}{" "}
                  <a href="/#pricing" className="underline">
                    Try again
                  </a>
                </p>
              ) : (
                <div className="paddle-inline-checkout" />
              )}
            </div>
            <p className="mt-4 text-[13px] text-muted">
              Payments are processed securely by Paddle. This is a test checkout — no
              real charge is made.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
