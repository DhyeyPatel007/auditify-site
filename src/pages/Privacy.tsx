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
          <strong>Account details</strong> — only if you create an account
          (name and email). The free scan doesn't require one.
        </li>
        <li>
          <strong>Your scan history</strong> — if you're signed in, the sites
          you've scanned are listed in your account so you can revisit past
          reports. This history is currently stored on your device; it moves
          to your account when the paid backend ships.
        </li>
      </ul>
      <p>That's it. Nothing else.</p>

      <h2>What we never do</h2>
      <ul>
        <li>We never sell your data, to anyone, ever.</li>
        <li>
          We never share your scans or account details with third parties —
          the only exception is our sign-in provider, which processes your
          email (and, for Google sign-in, your Google profile) solely to run
          authentication. Your password is hashed by them and never visible to
          us.
        </li>
        <li>We never train models on your scans.</li>
      </ul>

      <h2>Analytics and tracking</h2>
      <p>
        We don&rsquo;t run third-party analytics, ad trackers, or tracking
        pixels. The only requests the site makes are the ones needed to load
        the page, run your scan, and run sign-in.
      </p>

      <h2>Deletion</h2>
      <p>
        You can log out anytime from the account menu in the navigation bar.
        To delete your account entirely, email us at the contact address below
        and we'll remove your account details. If you believe a scan of your
        site is stored somewhere it shouldn't be, contact us and we'll take it
        down.
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
