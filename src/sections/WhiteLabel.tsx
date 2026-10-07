/**
 * White-label sample for the agency plan — a report mock wearing a
 * fictional agency's brand. Clearly labeled as a mock.
 */
export function WhiteLabel() {
  return (
    <section id="white-label" className="border-b border-line" aria-labelledby="whitelabel-heading">
      <div className="mx-auto max-w-[1120px] px-6 py-16 md:py-24">
        <p className="eyebrow text-ink-2">Agency white-label · $69/mo</p>
        <h2
          id="whitelabel-heading"
          className="mt-4 max-w-[720px] font-display text-[32px] font-semibold leading-[1.1] sm:text-[40px]"
        >
          Your brand on the cover. Our engine underneath.
        </h2>
        <p className="mt-4 max-w-[640px] text-[16px] leading-relaxed text-ink-2">
          Sell audits under your own name: branded reports, client share links,
          and a lead-gen embed for your site. Up to 25 client sites, unlimited seats.
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Branded report mock */}
          <article className="overflow-hidden rounded-[10px] border border-line-strong bg-surface">
            <div className="flex items-center justify-between border-b border-line bg-[#1c1915] px-7 py-5">
              <p className="font-display text-[22px] font-semibold text-[#f7f3ea]">
                Northwind Digital
              </p>
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#f7f3ea]/60">
                Client report
              </p>
            </div>
            <div className="p-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-ink-2">
                    client-site.com
                  </p>
                  <p className="mt-2 font-display text-[56px] font-semibold leading-none">
                    86<span className="text-[28px] text-ink-2">/100</span>
                  </p>
                </div>
                <span className="rounded border border-[#1c1915] bg-[#1c1915] px-3 py-1.5 font-mono text-[13px] font-semibold text-[#f7f3ea]">
                  B
                </span>
              </div>
              <div className="mt-6 space-y-0 border-t border-line">
                {[
                  ["No Content-Security-Policy", "FAIL"],
                  ["Image payload heavy", "WARN"],
                  ["Missing meta description", "FAIL"],
                ].map(([t, s]) => (
                  <div
                    key={t}
                    className="flex items-center justify-between border-b border-line py-3 text-[14px]"
                  >
                    <span className="font-medium text-ink">{t}</span>
                    <span
                      className={`font-mono text-[12px] font-semibold ${
                        s === "FAIL" ? "text-accent-deep" : "text-warning"
                      }`}
                    >
                      {s}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-[13px] italic text-ink-2">
                …plus 33 more checks, each with the exact fix. Prepared for your
                client by Northwind Digital.
              </p>
            </div>
          </article>

          {/* What's included */}
          <div className="flex flex-col gap-4">
            <div className="rounded-[10px] border border-line bg-surface p-6">
              <h3 className="font-display text-[20px] font-semibold">What's white-labeled</h3>
              <ul className="mt-3 space-y-2.5 text-[14px] text-ink-2">
                {[
                  "Your logo and colors on every report",
                  "Share links on your own domain",
                  "Lead-gen embed: a free mini-audit on your site that sends you the leads",
                  "25 client sites, unlimited team seats",
                ].map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <span aria-hidden="true" className="text-accent">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[10px] border border-line bg-surface p-6">
              <h3 className="font-display text-[20px] font-semibold">Start selling audits</h3>
              <p className="mt-1 text-[13px] text-ink-2">Turn audit reports into ongoing client retainers.</p>
              <a
                href="/#pricing"
                className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-ink px-5 text-sm font-medium text-paper transition-colors hover:bg-accent"
              >
                Start agency plan — $69/mo
              </a>
            </div>
            <p className="rounded-[10px] border border-dashed border-line-strong bg-paper p-5 font-mono text-[12px] text-ink-2">
              Mock shown with a fictional agency. Your brand goes where
              “Northwind Digital” is.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
