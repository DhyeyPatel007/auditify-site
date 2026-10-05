/**
 * Honest comparison: Auditify vs the tools people actually use today.
 */
const ROWS: { label: string; auditify: string; lighthouse: string; guru: string; win: 0 | 1 | 2 }[] = [
  {
    label: "Tells you what to fix first",
    auditify: "Prioritized by impact",
    lighthouse: "Score soup — 100 metrics, no order",
    guru: "A 40-page PDF nobody reads",
    win: 0,
  },
  {
    label: "Exact fix steps",
    auditify: "Every issue ships with one",
    lighthouse: "Links to generic docs",
    guru: "“Hire us to implement”",
    win: 0,
  },
  {
    label: "Security checks",
    auditify: "12 real header & TLS checks",
    lighthouse: "A handful",
    guru: "Usually skipped",
    win: 0,
  },
  {
    label: "Readable by a non-developer",
    auditify: "Written in plain language",
    lighthouse: "Built for engineers",
    guru: "Built to impress, not explain",
    win: 0,
  },
  {
    label: "Price",
    auditify: "$15 one-time",
    lighthouse: "Free",
    guru: "$500+",
    win: 1,
  },
  {
    label: "Ongoing monitoring",
    auditify: "$12/mo, alerts included",
    lighthouse: "DIY via CI",
    guru: "A retainer",
    win: 0,
  },
];

export function Compare() {
  return (
    <section id="compare" className="border-b border-line" aria-labelledby="compare-heading">
      <div className="mx-auto max-w-[1120px] px-6 py-16 md:py-24">
        <p className="eyebrow text-ink-2">The honest comparison</p>
        <h2
          id="compare-heading"
          className="mt-4 max-w-[720px] font-display text-[32px] font-semibold leading-[1.1] sm:text-[40px]"
        >
          We like Lighthouse. It's just not a report.
        </h2>
        <p className="mt-4 max-w-[640px] text-[16px] leading-relaxed text-ink-2">
          Lighthouse is excellent and free — run it too. But a developer tool
          and a client-ready audit are different jobs. Here's where each one
          actually wins.
        </p>

        <div className="mt-12 overflow-x-auto rounded-[10px] border border-line-strong">
          <table className="w-full min-w-[680px] border-collapse bg-surface text-left text-[14px]">
            <thead>
              <tr className="border-b border-line-strong">
                <th className="p-5 font-medium text-ink-2" scope="col">
                  <span className="sr-only">Capability</span>
                </th>
                <th className="border-l border-line bg-accent/5 p-5" scope="col">
                  <span className="font-display text-[17px] font-semibold text-ink">Auditify</span>
                </th>
                <th className="border-l border-line p-5" scope="col">
                  <span className="font-semibold text-ink">Lighthouse</span>
                </th>
                <th className="border-l border-line p-5" scope="col">
                  <span className="font-semibold text-ink">SEO-guru PDF</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.label} className="border-b border-line last:border-0">
                  <th className="p-5 font-medium text-ink-2" scope="row">
                    {r.label}
                  </th>
                  <td className="border-l border-line bg-accent/5 p-5 font-medium text-ink">
                    {r.auditify}
                    {r.win === 0 && (
                      <span aria-label="Auditify wins" className="ml-2 text-accent">✓</span>
                    )}
                  </td>
                  <td className="border-l border-line p-5 text-ink-2">
                    {r.lighthouse}
                    {r.win === 1 && (
                      <span aria-label="Lighthouse wins" className="ml-2 text-accent">✓</span>
                    )}
                  </td>
                  <td className="border-l border-line p-5 text-ink-2">
                    {r.guru}
                    {r.win === 2 && (
                      <span aria-label="Consultant wins" className="ml-2 text-accent">✓</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-[13px] italic text-ink-2">
          Yes, we gave the price row to Lighthouse. Free is free — we said this would be honest.
        </p>
      </div>
    </section>
  );
}
