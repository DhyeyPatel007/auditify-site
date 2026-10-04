import { GradeStamp, LedgerRow, type LedgerRowData } from "../components/Stamps";

const VISIBLE_ROWS: LedgerRowData[] = [
  { severity: "FAIL", title: "Blocking scripts delay first paint", metric: "1.9 s" },
  { severity: "FAIL", title: "Cumulative Layout Shift", metric: "0.42" },
  { severity: "WARN", title: "Largest Contentful Paint", metric: "3.8 s" },
  { severity: "WARN", title: "Images missing alt text", metric: "14 found" },
  { severity: "PASS", title: "HTTPS enforced", metric: "valid" },
  { severity: "PASS", title: "Meta title within length", metric: "62 ch" },
];

const LOCKED_ROWS = [
  { title: "Server response patterns", metric: "details locked" },
  { title: "Third-party tracker inventory", metric: "details locked" },
];

export function SampleReport({ onUnlock }: { onUnlock: () => void }) {
  return (
    <section
      id="sample-report"
      className="border-b border-line bg-surface"
      aria-labelledby="sample-heading"
    >
      <div className="mx-auto max-w-[1120px] px-6 py-16 md:py-24">
        <p className="eyebrow text-ink-2">Sample report</p>
        <h2
          id="sample-heading"
          className="mt-4 max-w-[640px] font-display text-[32px] font-semibold text-ink sm:text-[40px]"
        >
          Read the whole thing, not just the score.
        </h2>
        <p className="mt-4 max-w-[640px] text-[16px] leading-relaxed text-ink-2">
          Every audit ends in a plain-language ledger. Severity stamped, metric
          measured, fix spelled out — the way an auditor would hand it to you.
        </p>

        <article
          className="mt-10 rounded-[10px] border border-line-strong bg-paper shadow-[0_1px_2px_rgba(28,25,21,0.05)]"
          aria-label="Sample full audit report"
        >
          <div className="border-b border-line px-6 py-4 sm:px-10">
            <div className="flex items-center justify-between gap-4">
              <p className="eyebrow text-ink-2">Full audit</p>
              <p className="truncate font-mono text-[13px] text-ink-2">
                example.com · 2026-10-04 14:22 IST
              </p>
            </div>
          </div>
          <div className="px-6 py-8 sm:px-10">
            <div className="flex items-end gap-4">
              <p className="font-display text-[88px] font-semibold leading-none text-ink">
                72
              </p>
              <div className="pb-2">
                <p className="font-mono text-lg text-muted">/100</p>
                <div className="mt-1">
                  <GradeStamp grade="C" />
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-line pt-2">
              {VISIBLE_ROWS.map((row) => (
                <LedgerRow key={row.title} row={row} />
              ))}
              {LOCKED_ROWS.map((row) => (
                <div
                  key={row.title}
                  className="flex items-center gap-4 border-b border-line py-3.5 last:border-b-0"
                  aria-label={`${row.title}: details locked`}
                >
                  <span className="stamp inline-flex shrink-0 items-center justify-center rounded border border-line-strong px-2 py-1 text-[11px] font-sans font-semibold uppercase tracking-[0.08em] text-ink-2">
                    Hidden
                  </span>
                  <p className="min-w-0 flex-1 text-[15px] text-ink">{row.title}</p>
                  <p className="redacted-detail hidden font-mono text-[13px] sm:block" aria-hidden="true">
                    ▓▓▓▓▓▓▓▓▓▓▓▓
                  </p>
                  <p className="shrink-0 font-mono text-[13px] text-muted">{row.metric}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col items-start gap-2">
              <button
                type="button"
                onClick={onUnlock}
                className="min-h-[44px] rounded-lg bg-accent px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Unlock full report — $24
              </button>
              <p className="text-[13px] text-ink-2">
                One-time · full PDF · all 35 checks
              </p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
