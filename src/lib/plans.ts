/** Pricing — single source of truth for display. Prices in USD. */

export type Plan = {
  name: string;
  price: number;
  per: string;
  oneTime: boolean;
};

export const PLANS: Plan[] = [
  { name: "Free", price: 0, per: "/forever", oneTime: true },
  { name: "One-time report", price: 15, per: "/once", oneTime: true },
  { name: "Monitoring", price: 12, per: "/month", oneTime: false },
  { name: "Agency white-label", price: 69, per: "/month", oneTime: false },
];

export function formatPrice(n: number): string {
  return n === 0 ? "$0" : `$${n}`;
}

export function planByName(name: string): Plan | undefined {
  return PLANS.find((p) => p.name === name);
}

/**
 * Discount offers — shown on the pricing page and at checkout.
 *
 * The codes below are the ones the site displays. The site owner must create
 * MATCHING coupons in the Paddle dashboard (discounts: 10% first purchase,
 * 5% next purchase, one-time use each) — Paddle validates and applies them at
 * checkout and is the source of truth for percentages and one-time-use
 * enforcement.
 */
export const DISCOUNT_OFFERS = [
  { code: "WELCOME10", headline: "10% off", detail: "your first purchase" },
  { code: "RETURN5", headline: "5% off", detail: "your next purchase" },
] as const;
