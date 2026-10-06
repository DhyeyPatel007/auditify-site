import { LegalLayout } from "./LegalLayout";

export function RefundPage() {
  return (
    <LegalLayout title="Refund policy" updated="October 5, 2026">
      <p>
        Auditify is sold by <strong>Krynex Studio</strong>, and payments are
        processed by our merchant of record, Paddle. If you're unhappy with a
        purchase, here's exactly what happens.
      </p>

      <h2>Full report — $15 one-time</h2>
      <p>
        Covered by a <strong>14-day money-back guarantee</strong>. If the
        report isn't useful to you for any reason, email us within 14 days of
        purchase and we'll refund the full $15. No forms, no interrogation.
      </p>

      <h2>Monitoring — $12/month</h2>
      <p>
        Cancel anytime from your account — the subscription stays active until
        the end of the current billing period, then stops. We don't do
        prorated refunds for partial months. If you cancel within 14 days of
        your <em>first</em> subscription payment, we'll refund that first month
        in full.
      </p>

      <h2>Agency — $69/month</h2>
      <p>
        Same terms as Monitoring: cancel anytime, active until the end of the
        billing period, first month refundable within 14 days of subscribing.
      </p>

      <h2>How to request a refund</h2>
      <p>
        Email{" "}
        <a href="mailto:contact@auditify.krynex.in">
          contact@auditify.krynex.in
        </a>{" "}
        with the email address you used at checkout and, if you have it, your
        Paddle receipt. We process approved refunds through Paddle within 2
        business days; the money typically reaches you within 5–10 business
        days depending on your bank.
      </p>

      <h2>Before you charge back</h2>
      <p>
        If something looks wrong on your statement, please email us first.
        Chargebacks are slow and expensive for both sides — we'll almost always
        resolve it faster directly.
      </p>

      <h2>The fine print</h2>
      <p>
        Refunds go back to the original payment method only. Discounts and
        coupon codes don't change these terms — the refund is for what you
        actually paid. Abuse of the guarantee (for example, repeated
        purchase-then-refund cycles) may lead us to decline future refunds.
      </p>
    </LegalLayout>
  );
}
