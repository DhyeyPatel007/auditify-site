type Tier = {
  name: string;
  price: string;
  per: string;
  blurb: string;
  bestFor: string;
  features: string[];
  cta: string;
  popular?: boolean;
  phase2?: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Free",
    price: "$0",
    per: "/forever",
    blurb: "For a first look",
    bestFor: "Best for: trying it out on a single site.",
    features: ["1 scan per day", "Score + top 3 issues", "No account needed", "No installation"],
    cta: "Run free audit",
  },
  {
    name: "One-time report",
    price: "$24",
    per: "/once",
    blurb: "For the full picture",
    bestFor: "Best for: owners fixing one site properly, once.",
    features: ["All 35 checks, unlocked", "Prioritized fix list with exact steps", "PDF export", "60-day access to your report"],
    cta: "Buy full report",
    popular: true,
    phase2: true,
  },
  {
    name: "Monitoring",
    price: "$19",
    per: "/month",
    blurb: "For staying fixed",
    bestFor: "Best for: teams that need the score to keep improving.",
    features: ["Weekly re-scans of up to 3 sites", "Email and Slack alerts", "Issue history + trends", "Cancel anytime"],
    cta: "Start monitoring",
    phase2: true,
  },
  {
    name: "Agency white-label",
    price: "$109",
    per: "/month",
    blurb: "For client work",
    bestFor: "Best for: agencies selling audits under their own brand.",
    features: ["Up to 25 client sites", "Branded reports + client share links", "Lead-gen embed form for your site", "Unlimited seats"],
    cta: "Talk to us",
    phase2: true,
  },
];

export function Pricing({ onPhase2 }: { onPhase2: (context: string) => void }) {
  return (
    <section id="pricing" className="border-b border-line" aria-labelledby="pricing-heading">
      <div className="mx-auto max-w-[1120px] px-6 py-16 md:py-24">
        <p className="eyebrow text-ink-2">Pricing</p>
        <h2
          id="pricing-heading"
          className="mt-4 font-display text-[32px] font-semibold text-ink sm:text-[40px]"
        >
          Honest pricing, like the reports.
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((t) => (
            <article
              key={t.name}
              className={`relative flex flex-col rounded-[10px] border bg-surface p-7 shadow-[0_1px_2px_rgba(28,25,21,0.05)] ${
                t.popular ? "border-accent" : "border-line-strong"
              }`}
              aria-label={`${t.name} plan`}
            >
              {t.popular && (
                <span className="stamp absolute -top-3 left-6 rounded border border-accent bg-paper px-2 py-1 text-[11px] font-sans font-semibold uppercase tracking-[0.08em] text-accent">
                  Most popular
                </span>
              )}
              <p className="eyebrow text-ink-2">{t.name}</p>
              <p className="mt-4 flex items-baseline gap-1">
                <span className="font-mono text-[40px] font-semibold text-ink">{t.price}</span>
                <span className="font-mono text-[14px] text-ink-2">{t.per}</span>
              </p>
              <p className="mt-1 text-[15px] font-medium text-ink">{t.blurb}</p>
              <ul className="mt-5 flex-1 space-y-0">
                {t.features.map((f) => (
                  <li
                    key={f}
                    className="border-t border-line py-2.5 text-[14px] text-ink-2"
                  >
                    {f}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[13px] italic text-ink-2">{t.bestFor}</p>
              {t.phase2 ? (
                <button
                  type="button"
                  onClick={() => onPhase2(t.name)}
                  className={`mt-6 min-h-[48px] w-full rounded-lg px-5 text-[15px] font-medium transition-colors ${
                    t.popular
                      ? "bg-accent text-white hover:bg-accent-hover"
                      : "bg-ink text-paper hover:bg-[#2A251F]"
                  }`}
                >
                  {t.cta}
                </button>
              ) : (
                <a
                  href="#scan"
                  className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-ink px-5 text-[15px] font-medium text-paper transition-colors hover:bg-[#2A251F]"
                >
                  {t.cta}
                </a>
              )}
            </article>
          ))}
        </div>
        <p className="mt-8 text-[14px] text-ink-2">
          All plans start with the free scan · no card required · no setup fees, no
          contracts, no per-seat pricing. Cancel any paid plan anytime and keep access
          until the end of your billing period.
        </p>
      </div>
    </section>
  );
}
