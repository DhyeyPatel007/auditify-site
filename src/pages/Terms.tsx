import { LegalLayout } from "./LegalLayout";

export function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="October 2026">
      <h2>What Auditify does</h2>
      <p>
        Auditify runs free website scans — 35+ checks across
        speed, SEO, accessibility, and security — and hands you a plain-English
        stamped report of the findings. That's the whole service.
      </p>

      <h2>Fair use</h2>
      <p>
        Free scans are limited to <strong>1 scan per day</strong> per user so
        the scanner stays fast and free for everyone. Please don't work around
        the limit with bots, multiple accounts, or other tricks.
      </p>

      <h2>Public URLs only</h2>
      <p>
        Scans run against publicly accessible URLs. Only submit websites you
        own or have permission to audit — don't point the scanner at sites
        you're not authorized to test.
      </p>

      <h2>No warranty on findings</h2>
      <p>
        Reports are guidance, not a guarantee. Automated checks can't catch
        everything, and a clean report doesn't mean a site is flawless. Use
        your judgment, and verify fixes with your own testing before treating
        them as done.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Don't abuse the scanner: no hammering it with automated requests, no
        attempting to break or probe the infrastructure, and no reselling the
        free tier as your own service. We may rate-limit or block accounts
        that do.
      </p>

      <h2>Paid plans</h2>
      <p>
        Full reports are <strong>$15 one-time</strong>, monitoring is{" "}
        <strong>$12/month</strong>, and agency white-label is{" "}
        <strong>$69/month</strong>. Payments are handled by our checkout
        provider (Paddle) — we never see or store your card details. Cancel any
        monthly plan anytime and keep access until the end of your billing
        period.
      </p>
      <p>
        Paid checkout is live — the buttons on the pricing page process real
        payments through Paddle.
      </p>

      <h2>Discount codes</h2>
      <p>
        We offer <strong>10% off your first purchase</strong> and{" "}
        <strong>5% off your next purchase</strong>, each usable once per
        account. Codes are applied at checkout and can&rsquo;t be combined,
        transferred, or redeemed for cash. We may retire or replace discount
        offers at any time; codes already applied to a completed purchase are
        unaffected.
      </p>
    </LegalLayout>
  );
}
