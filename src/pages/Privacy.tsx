import { LegalLayout } from "./LegalLayout";

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="October 2026">
      <h2>What we collect</h2>
      <p>We keep this deliberately short. Auditify collects:</p>
      <ul>
        <li>
          <strong>Scan results</strong> — the URLs you scan and the reports we
          generate for them, so you can revisit past audits.
        </li>
        <li>
          <strong>Report email</strong> — only if you ask us to email you a
          report. We use it to send that report, and (once our email service
          is connected) to store it with our email provider. Nothing else.
        </li>
        <li>
          <strong>Account details</strong> — only if you create an account
          (name and email). The free scan doesn't require one.
        </li>
      </ul>
      <p>That's it. Nothing else.</p>

      <h2>What we never do</h2>
      <ul>
        <li>We never sell your data, to anyone, ever.</li>
        <li>
          We never share your scans with third parties. The only exception is
          your email address, which goes to our email provider only if you ask
          us to email you a report.
        </li>
        <li>We never train models on your scans.</li>
      </ul>

      <h2>Analytics and tracking</h2>
      <p>
        We don't run third-party analytics, ad trackers, or tracking pixels.
        The only requests the site makes are the ones needed to load the page
        and run your scan.
      </p>

      <h2>Deletion</h2>
      <p>
        There's no account system yet, so there's nothing to delete — we don't
        keep your personal details. If you believe a scan of your site is
        stored somewhere it shouldn't be, contact us and we'll take it down.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes, we'll update the "last updated" date above. The
        promises in "what we never do" are the whole point of Auditify — they
        won't be watered down quietly.
      </p>
    </LegalLayout>
  );
}
