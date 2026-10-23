import type { User } from "firebase/auth";

const INCLUDED = [
  {
    name: "Full reports & PDF",
    blurb: "The whole picture, not a teaser",
    features: [
      "All 36 checks, nothing locked",
      "Prioritized fix list with exact steps",
      "Printable PDF report",
      "Saved to your dashboard",
    ],
  },
  {
    name: "Monitoring",
    blurb: "For staying fixed",
    features: [
      "Weekly re-scans of up to 10 sites",
      "Score-drop alerts by email",
      "Issue history on your dashboard",
      "Pause or remove a site anytime",
    ],
  },
  {
    name: "Agency white-label",
    blurb: "For client work",
    features: [
      "Your name and accent colour on reports",
      "Client-ready PDF exports",
      "Every report saved in one place",
      "No Auditify upsells, ever",
    ],
  },
];

export function Pricing({
  user,
  onSignIn,
}: {
  user: User | null;
  onSignIn: () => void;
}) {
  return (
    <section id="pricing" className="border-b border-line" aria-labelledby="pricing-heading">
      <div className="mx-auto max-w-[1120px] px-6 py-16 md:py-24">
        <p className="eyebrow text-ink-2">Pricing</p>
        <h2
          id="pricing-heading"
          className="mt-4 font-display text-[32px] font-semibold text-ink sm:text-[40px]"
        >
          Everything is free.
        </h2>
        <p className="mt-4 max-w-[620px] text-[16px] leading-relaxed text-ink-2">
          Auditify used to sell reports. It doesn&apos;t anymore. The free scan
          stays free with no account, and a free account unlocks the complete
          report, the PDF, monitoring and white-label branding. No card, no
          trial clock, no locked checks.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {INCLUDED.map((t) => (
            <article
              key={t.name}
              className="relative flex flex-col rounded-[10px] border border-line-strong bg-surface p-7 shadow-[0_1px_2px_rgba(28,25,21,0.05)]"
              aria-label={`${t.name} — included free`}
            >
              <p className="eyebrow text-ink-2">{t.name}</p>
              <p className="mt-4 flex items-baseline gap-1">
                <span className="font-mono text-[40px] font-semibold text-ink">$0</span>
                <span className="font-mono text-[14px] text-ink-2">/forever</span>
              </p>
              <p className="mt-1 text-[15px] font-medium text-ink">{t.blurb}</p>
              <ul className="mt-5 flex-1 space-y-0">
                {t.features.map((f) => (
                  <li key={f} className="border-t border-line py-2.5 text-[14px] text-ink-2">
                    {f}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          {user ? (
            <a
              href="/dashboard"
              className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-accent px-6 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Go to your dashboard
            </a>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-accent px-6 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Create a free account
            </button>
          )}
          <p className="text-[14px] text-ink-2">
            Takes a minute with Google or email. That&apos;s the whole paywall.
          </p>
        </div>
      </div>
    </section>
  );
}
