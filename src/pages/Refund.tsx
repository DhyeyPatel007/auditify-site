import { LegalLayout } from "./LegalLayout";

export function RefundPage() {
  return (
    <LegalLayout title="Refund & cancellation policy" updated="October 8, 2026">
      <p>
        Auditify is sold by <strong>Krynex Studio</strong>, and payments are
        processed by our merchant of record, Paddle. All sales are final —
        here's what that means for each product.
      </p>

      <h2>Full report — $15 one-time</h2>
      <p>
        The full report is delivered instantly as a PDF download upon payment.
        Because the product is delivered in full at the time of purchase,{" "}
        <strong>all report sales are final and non-refundable</strong>. Please
        review the free scan results carefully before purchasing — the free
        scan shows you the score, the top issues, and exactly what the full
        report contains.
      </p>

      <h2>Monitoring — $12/month</h2>
      <p>
        Cancel anytime from your account — the subscription stays active until
        the end of the current billing period, then stops. No further charges
        will be made. We don't offer refunds for partial months or past
        billing periods.
      </p>

      <h2>Agency — $69/month</h2>
      <p>
        Same as Monitoring: cancel anytime, active until the end of the billing
        period, then stops. No refunds for partial months or past billing
        periods.
      </p>

      <h2>How to cancel a subscription</h2>
      <p>
        Sign in to your Auditify dashboard and cancel from your plan settings,
        or email{" "}
        <a href="mailto:contact@auditify.krynex.in">
          contact@auditify.krynex.in
        </a>{" "}
        with the email address you used at checkout. Cancellations take effect
        at the end of the current billing period.
      </p>

      <h2>Before you charge back</h2>
      <p>
        If something looks wrong on your statement, please email us first.
        Chargebacks are slow and expensive for both sides — we'll almost always
        resolve it faster directly.
      </p>
    </LegalLayout>
  );
}
