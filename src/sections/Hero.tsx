import { Suspense, lazy } from "react";
import { GradeStamp, LedgerRow, type LedgerRowData } from "../components/Stamps";

const Scanner = lazy(() => import("../components/Scanner"));

const SAMPLE_ROWS: LedgerRowData[] = [
  { severity: "FAIL", title: "Cumulative Layout Shift", metric: "0.42" },
  { severity: "WARN", title: "Largest Contentful Paint", metric: "3.8 s" },
  { severity: "PASS", title: "HTTPS enforced", metric: "valid" },
];

export function Hero({ onUnlock, uid }: { onUnlock: () => void; uid: string | null }) {
  return (
    <section className="border-b border-line" aria-labelledby="hero-heading">
      <div className="mx-auto grid max-w-[1120px] gap-12 px-6 py-16 md:py-24 lg:grid-cols-[1fr_420px] lg:gap-16">
        <div className="max-w-[636px]">
          <p className="eyebrow text-ink-2">Free website audit · No sign-up</p>
          <h1
            id="hero-heading"
            className="mt-6 font-display text-[44px] font-semibold leading-[1.05] tracking-[-0.01em] text-ink sm:text-[56px]"
          >
            A website audit you&rsquo;ll actually read.
          </h1>
          <p className="mt-6 max-w-[560px] text-[17px] leading-relaxed text-ink-2">
            Auditify scans your site against 35+ checks and explains every issue in
            plain English — built for business owners who need answers, agencies who
            need reports, and developers who need specifics.
          </p>
          <div className="mt-8">
            <Suspense
              fallback={
                <div className="rounded-[10px] border border-line-strong bg-surface p-6" aria-hidden="true">
                  <div className="h-[52px] rounded-lg bg-line/60" />
                  <div className="mt-3 h-4 w-2/3 rounded bg-line/60" />
                </div>
              }
            >
              <Scanner onUnlock={onUnlock} uid={uid} />
            </Suspense>
          </div>
          <p className="mt-6">
            <a
              href="#sample-report"
              className="text-[15px] font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
            >
              See a sample report
            </a>
          </p>
        </div>

        {/* Sample report card (static preview, mirrors the free-report UI) */}
        <aside
          className="h-fit rounded-[10px] border border-line-strong bg-surface p-7 shadow-[0_1px_2px_rgba(28,25,21,0.05)]"
          aria-label="Sample audit report preview"
        >
          <div className="flex items-center justify-between">
            <p className="eyebrow text-ink-2">Sample audit</p>
            <p className="font-mono text-[13px] text-ink-2">example.com</p>
          </div>
          <div className="mt-5 flex items-end gap-4 border-t border-line pt-5">
            <p className="font-display text-[88px] font-semibold leading-none text-ink">
              72
            </p>
            <div className="pb-1.5">
              <p className="font-mono text-lg text-muted">/100</p>
              <div className="mt-1">
                <GradeStamp grade="C" />
              </div>
            </div>
          </div>
          <div className="mt-4 border-t border-line pt-2">
            {SAMPLE_ROWS.map((row) => (
              <LedgerRow key={row.title} row={row} />
            ))}
          </div>
          <p className="mt-4 font-mono text-[12px] uppercase tracking-[0.06em] text-muted">
            35+ checks · completed in 2:04
          </p>
        </aside>
      </div>
    </section>
  );
}
