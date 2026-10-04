const FEATURES = [
  {
    eyebrow: "Coverage",
    title: "Free, instant scan.",
    body: "Paste a URL and get a score plus the three issues that matter most. No account required — one scan per day.",
  },
  {
    eyebrow: "Clarity",
    title: "The full report.",
    body: "Every check, prioritized by impact, with exact steps to fix each issue. Export it as a PDF and reference it for 60 days.",
  },
  {
    eyebrow: "History",
    title: "Watch it weekly.",
    body: "We re-scan up to 3 sites every week and alert you by email or Slack when something changes. Full issue history and trends included.",
  },
  {
    eyebrow: "Agencies",
    title: "Reports under your brand.",
    body: "Run audits for up to 25 client sites with your logo on every report. Share read-only links with clients, embed a lead-generation form on your own site, and add as many teammates as you like.",
  },
];

export function Features() {
  return (
    <section id="features" className="border-b border-line" aria-labelledby="features-heading">
      <div className="mx-auto max-w-[1120px] px-6 py-16 md:py-24">
        <p className="eyebrow text-ink-2">What you get</p>
        <h2
          id="features-heading"
          className="mt-4 font-display text-[32px] font-semibold text-ink sm:text-[40px]"
        >
          An audit that reads like an audit.
        </h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-[10px] border border-line-strong bg-line-strong sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-surface p-7">
              <p className="eyebrow text-accent">{f.eyebrow}</p>
              <h3 className="mt-3 font-display text-[21px] font-semibold leading-snug text-ink">
                {f.title}
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-2">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
