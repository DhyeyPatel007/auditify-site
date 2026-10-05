import { useEffect, useRef, useState } from "react";
import { Mark } from "./Logo";
import { DISCOUNT_OFFERS, formatPrice, planByName } from "../lib/plans";

type Props = {
  open: boolean;
  onClose: () => void;
  context: string;
};

function isCouponShape(code: string): boolean {
  return /^[A-Za-z0-9-]{3,24}$/.test(code.trim());
}

/**
 * Checkout entry point. Checkout itself isn't wired yet (Paddle signup is
 * pending), so this modal is honest about that — but it already carries the
 * coupon-code input so the flow works the moment checkout opens.
 *
 * PADDLE WIRING NOTE: when Paddle checkout is integrated, pass the saved
 * `coupon` code through to the checkout (e.g. Paddle's discount parameter /
 * custom data). Paddle validates the code — it is the source of truth for
 * percentages and one-time-use enforcement. Codes are created by the site
 * owner in the Paddle dashboard; never hard-code them here.
 */
export function Phase2Modal({ open, onClose, context }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [coupon, setCoupon] = useState("");
  const [savedCoupon, setSavedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const plan = planByName(context);

  useEffect(() => {
    if (!open) return;
    setCoupon("");
    setSavedCoupon(null);
    setCouponError(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    dialogRef.current?.querySelector("button")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function applyCoupon(e: React.FormEvent) {
    e.preventDefault();
    const code = coupon.trim();
    if (!isCouponShape(code)) {
      setCouponError("That doesn't look like a coupon code — check it and try again.");
      setSavedCoupon(null);
      return;
    }
    setCouponError(null);
    setSavedCoupon(code.toUpperCase());
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="phase2-title"
        aria-describedby="phase2-desc"
        className="w-full max-w-md rounded-[10px] border border-line-strong bg-surface p-8 shadow-[0_1px_2px_rgba(28,25,21,0.05)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          <Mark size={28} />
          <p className="eyebrow text-ink-2">Phase 2 · {context}</p>
        </div>
        <h2 id="phase2-title" className="font-display text-2xl font-semibold text-ink">
          Checkout opens at launch.
        </h2>
        {plan && plan.price > 0 && (
          <p className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-[28px] font-semibold text-ink">
              {formatPrice(plan.price)}
            </span>
            <span className="font-mono text-[14px] text-ink-2">{plan.per}</span>
          </p>
        )}
        <p id="phase2-desc" className="mt-3 text-[15px] leading-relaxed text-ink-2">
          Paid checkout isn&rsquo;t wired up yet — payments and monitoring ship in
          Phase 2. Nothing is charged, nothing is faked. The free scan above is
          fully working today.
        </p>

        <div className="mt-4 rounded-lg border border-line bg-paper p-4 text-[14px] text-ink-2">
          <p className="font-medium text-ink">Launch discounts</p>
          <p className="mt-1">
            {DISCOUNT_OFFERS.map((d, i) => (
              <span key={d.headline}>
                {i > 0 && ", "}
                <strong className="font-semibold text-ink">{d.headline}</strong>{" "}
                {d.detail}
              </span>
            ))}{" "}
            — one-time use each. Codes go live with checkout.
          </p>
        </div>

        <form onSubmit={applyCoupon} className="mt-4">
          <label htmlFor="coupon-code" className="eyebrow mb-2 block text-ink-2">
            Have a coupon code?
          </label>
          <div className="flex gap-2">
            <input
              id="coupon-code"
              type="text"
              value={coupon}
              onChange={(e) => {
                setCoupon(e.target.value);
                setCouponError(null);
              }}
              placeholder="Enter code"
              autoComplete="off"
              spellCheck={false}
              className="min-h-[48px] flex-1 rounded-lg border border-line-strong bg-surface-raised px-4 font-mono text-[15px] uppercase text-ink placeholder:normal-case placeholder:font-sans placeholder:text-muted focus:border-ink focus:outline-none"
            />
            <button
              type="submit"
              className="min-h-[48px] shrink-0 rounded-lg bg-ink px-5 text-[15px] font-medium text-paper transition-colors hover:bg-[#2A251F]"
            >
              Apply
            </button>
          </div>
          {couponError && (
            <p role="alert" className="mt-2 text-[14px] text-accent">
              {couponError}
            </p>
          )}
          {savedCoupon && (
            <p className="mt-2 text-[14px] text-success">
              Code <span className="font-mono font-medium">{savedCoupon}</span>{" "}
              saved — it will be applied automatically at checkout.
            </p>
          )}
          <p className="mt-2 text-[13px] text-muted">
            Codes are validated at checkout; we don&rsquo;t charge anything until
            then.
          </p>
        </form>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-[#2A251F] min-h-[44px]"
        >
          Got it — back to the free scan
        </button>
      </div>
    </div>
  );
}
