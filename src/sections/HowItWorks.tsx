const STEPS = [
  {
    n: "01",
    title: "Paste your URL.",
    body: "Enter any public website address. No account, no installation, no code changes.",
  },
  {
    n: "02",
    title: "Get your score.",
    body: "We run 35+ checks and return a score with the three issues that matter most, free.",
  },
  {
    n: "03",
    title: "Fix or monitor.",
    body: "Buy the full report once, or subscribe and watch your score over time.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-b border-line" aria-labelledby="how-heading">
      <div className="mx-auto max-w-[1120px] px-6 py-16 md:py-24">
        <p className="eyebrow text-ink-2">How it works</p>
        <h2
          id="how-heading"
          className="mt-4 font-display text-[32px] font-semibold text-ink sm:text-[40px]"
        >
          Three steps. Two minutes.
        </h2>
        <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((s) => (
            <li key={s.n} className="border-t-2 border-ink pt-6">
              <p className="font-mono text-[15px] text-accent">{s.n}</p>
              <h3 className="mt-3 font-display text-[22px] font-semibold text-ink">
                {s.title}
              </h3>
              <p className="mt-2 max-w-[300px] text-[15px] leading-relaxed text-ink-2">
                {s.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
