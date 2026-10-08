import { useEffect, useState } from "react";
import { GradeStamp, SeverityStamp, type Grade } from "./Stamps";
import { saveReport, listReports } from "../lib/reports";
import { downloadReportPDF } from "../lib/pdf";

type Issue = {
  id: string;
  title: string;
  severity: "FAIL" | "WARN";
  metric: string;
  detail: string;
  fix: string;
};

type LockedTeaser = { title: string; metric: string };

type ScanResult = {
  url: string;
  host: string;
  score: number;
  grade: Grade;
  checksRun: number;
  durationMs: number;
  summary: { pass: number; warn: number; fail: number };
  issues: Issue[];
  locked: LockedTeaser[];
  full?: boolean;
};

type Props = {
  onUnlock: () => void;
  /** Firebase UID when signed in — scan results are saved to the account's history. */
  uid: string | null;
  /** Called after a scan completes and its report is saved (lets the dashboard refresh). */
  onScanComplete?: () => void;
  /** When true, the user has a paid plan — fetch the full unlocked report. */
  hasFullAccess?: boolean;
  /** Returns a Firebase ID token for authenticated full-report requests. */
  getIdToken?: () => Promise<string>;
  /** Optional initial/selected report to view */
  initialReport?: ScanResult | null;
};

// The input renders a decorative "https://" prefix span, so the value itself
// must never contain a protocol — otherwise pasting a full URL shows it twice.
function stripProtocol(value: string): string {
  return value.replace(/^https?:\/\//i, "");
}

function ensureProtocol(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

const SCAN_STEPS = [
  "Resolving host…",
  "Checking TLS & security headers…",
  "Reading page structure…",
  "Weighing images & links…",
  "Stamping your report…",
];

export function Scanner({
  onUnlock,
  uid,
  onScanComplete,
  hasFullAccess,
  getIdToken,
  initialReport,
}: Props) {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfDone, setPdfDone] = useState(false);

  useEffect(() => {
    if (initialReport) {
      setResult(initialReport);
      setUrl(stripProtocol(initialReport.url || initialReport.host));
      setState("done");
    }
  }, [initialReport]);

  function downloadPDF() {
    if (!result || pdfBusy) return;
    setPdfBusy(true);
    setPdfDone(false);
    // Let the UI paint the loading state before the (synchronous) PDF build
    window.setTimeout(() => {
      try {
        downloadReportPDF({
          host: result.host,
          url: result.url,
          score: result.score,
          grade: result.grade,
          checksRun: result.checksRun,
          summary: result.summary,
          issues: result.issues,
        });
        setPdfDone(true);
        window.setTimeout(() => setPdfDone(false), 4000);
      } finally {
        setPdfBusy(false);
      }
    }, 50);
  }

  async function runScan(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    const target = ensureProtocol(trimmed);
    setState("loading");
    setError(null);
    setResult(null);
    setStep(0);
    const stepTimer = window.setInterval(
      () => setStep((s) => Math.min(s + 1, SCAN_STEPS.length - 1)),
      1400
    );
    try {
      const body: { url: string; full?: boolean; idToken?: string } = { url: target };
      // Subscription users (monitoring/agency) get full reports on every scan.
      // One-time purchases use "View full" / "Download PDF" buttons (server-verified).
      // The scan box ALWAYS does a free scan — never auto-request full based on
      // client-side flags, which would show a confusing payment error on re-scan.
      if (hasFullAccess && getIdToken) {
        body.full = true;
        body.idToken = await getIdToken();
      }
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          (data && data.error) || `Scan failed (HTTP ${res.status}). Try again.`
        );
      }
      setResult(data as ScanResult);
      setState("done");
      if (uid) {
        const r = data as ScanResult;
        saveReport(
          uid,
          {
            url: r.url,
            host: r.host,
            score: r.score,
            grade: r.grade,
            checksRun: r.checksRun,
            durationMs: r.durationMs,
            summary: r.summary,
            issues: r.issues,
            unlocked: r.full,
            scannedAt: new Date().toISOString(),
          },
          getIdToken
        );
        onScanComplete?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed. Try again.");
      setState("error");
    } finally {
      window.clearInterval(stepTimer);
    }
  }

  return (
    <div id="scan" className="w-full">
      <form onSubmit={runScan} className="w-full" aria-label="Free website audit">
        <label
          htmlFor="scan-url"
          className="eyebrow mb-3 block text-ink-2"
        >
          Website URL
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <div className="flex h-[52px] items-center rounded-lg border border-line-strong bg-surface-raised transition-colors focus-within:border-ink">
              <span
                aria-hidden="true"
                className="pointer-events-none select-none pl-4 font-mono text-[15px] text-ink-2"
              >
                https://
              </span>
              <input
                id="scan-url"
                name="url"
                type="text"
                inputMode="url"
                autoComplete="url"
                placeholder="example.com"
                value={url}
                onChange={(e) => setUrl(stripProtocol(e.target.value))}
                onFocus={(e) => setUrl(stripProtocol(e.target.value))}
                onPaste={(e) => {
                  e.preventDefault();
                  const pasted = stripProtocol(
                    e.clipboardData.getData("text")
                  );
                  const el = e.currentTarget;
                  const start = el.selectionStart ?? url.length;
                  const end = el.selectionEnd ?? url.length;
                  setUrl(
                    stripProtocol(url.slice(0, start) + pasted + url.slice(end))
                  );
                }}
                disabled={state === "loading"}
                className="h-full w-full bg-transparent pr-4 font-mono text-[15px] text-ink placeholder:text-muted focus:outline-none disabled:opacity-60"
                aria-describedby="scan-hint"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={state === "loading" || !url.trim()}
            className="h-[52px] shrink-0 rounded-lg bg-accent px-7 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state === "loading" ? "Scanning…" : "Run free audit"}
          </button>
        </div>
        <p id="scan-hint" className="mt-3 text-[13px] text-ink-2">
          Free forever · about 2 minutes · no account needed
        </p>
      </form>

      {state === "loading" && (
        <div
          className="mt-6 rounded-[10px] border border-line-strong bg-surface p-6"
          role="status"
          aria-live="polite"
        >
          <p className="eyebrow text-ink-2">Auditing</p>
          <p className="mt-2 font-mono text-[15px] text-ink">{SCAN_STEPS[step]}</p>
          <div className="mt-4 h-1 overflow-hidden rounded bg-line">
            <div
              className="h-full bg-accent transition-all duration-1000"
              style={{ width: `${((step + 1) / SCAN_STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {state === "error" && (
        <div
          className="mt-6 rounded-[10px] border border-accent bg-surface p-6"
          role="alert"
        >
          <p className="eyebrow text-accent">Scan didn&rsquo;t complete</p>
          <p className="mt-2 text-[15px] text-ink">{error}</p>
          <button
            type="button"
            onClick={() => setState("idle")}
            className="mt-4 min-h-[44px] rounded-lg border border-line-strong px-5 py-2.5 text-sm font-medium text-ink hover:border-ink"
          >
            Try another URL
          </button>
        </div>
      )}

      {state === "done" && result && (
        <article
          className="mt-6 rounded-[10px] border border-line-strong bg-surface shadow-[0_1px_2px_rgba(28,25,21,0.05)]"
          aria-label={`Audit report for ${result.host}`}
        >
          <div className="border-b border-line px-6 py-4 sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <p className="eyebrow text-ink-2">{result.full ? "Full report" : "Free audit"}</p>
              <p className="truncate font-mono text-[13px] text-ink-2">{result.host}</p>
            </div>
          </div>
          <div className="px-6 py-6 sm:px-8">
            <div className="flex items-end gap-4">
              <p className="font-display text-[88px] font-semibold leading-none text-ink">
                {result.score}
              </p>
              <div className="pb-2">
                <p className="font-mono text-lg text-muted">/100</p>
                <div className="mt-1">
                  <GradeStamp grade={result.grade} />
                </div>
              </div>
              <p className="mb-2 ml-auto hidden font-mono text-[12px] text-muted sm:block">
                {result.checksRun} CHECKS · {(result.durationMs / 1000).toFixed(1)}s
              </p>
            </div>

            {result.full && (
              <div className="mt-6 rounded-[10px] border border-accent/30 bg-accent/[0.06] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-display text-[18px] font-semibold text-ink">
                      Your full report is ready
                    </p>
                    <p className="mt-1 text-[13px] text-ink-2">
                      All {result.issues.length} issues with prioritized fixes — branded PDF, yours to keep.
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={downloadPDF}
                      disabled={pdfBusy}
                      className="inline-flex min-h-[48px] items-center gap-2 rounded-lg bg-accent px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-wait disabled:opacity-70"
                    >
                      {pdfBusy ? (
                        <>
                          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                          Building PDF…
                        </>
                      ) : pdfDone ? (
                        <>Downloaded ✓</>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M8 2v8m0 0l-3-3m3 3l3-3M2.5 12.5h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Download PDF
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="min-h-[48px] rounded-lg border border-line-strong px-5 py-3 text-[14px] font-medium text-ink transition-colors hover:border-ink"
                    >
                      Print
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6">
              <p className="eyebrow mb-1 text-ink-2">
                {result.full ? `All issues — ${result.issues.length} found` : "Top issues — free"}
              </p>
              {result.issues.map((issue) => (
                <details key={issue.id} className="group border-b border-line last:border-b-0">
                  <summary className="flex cursor-pointer list-none items-center gap-4 py-3.5 [&::-webkit-details-marker]:hidden">
                    <SeverityStamp severity={issue.severity} />
                    <span className="min-w-0 flex-1 text-[15px] leading-snug text-ink">
                      {issue.title}
                    </span>
                    <span className="shrink-0 font-mono text-[13px] text-ink-2">
                      {issue.metric}
                    </span>
                  </summary>
                  <div className="pb-5 pl-0 pr-1 sm:pl-[68px]">
                    <p className="text-[14px] leading-relaxed text-ink-2">{issue.detail}</p>
                    <p className="mt-2 text-[14px] leading-relaxed text-ink">
                      <span className="font-semibold">Fix: </span>
                      {issue.fix}
                    </p>
                  </div>
                </details>
              ))}
            </div>

            {result.locked.length > 0 && (
              <div className="mt-6">
                <p className="eyebrow mb-1 text-ink-2">Full findings — locked</p>
                {result.locked.slice(0, 4).map((t, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 border-b border-line py-3.5 last:border-b-0"
                    aria-label={`${t.title}: details locked`}
                  >
                    <SeverityStamp severity="HIDDEN" />
                    <p className="min-w-0 flex-1 text-[15px] text-ink">{t.title}</p>
                    <p className="redacted-detail hidden font-mono text-[13px] sm:block" aria-hidden="true">
                      ▓▓▓▓▓▓▓▓
                    </p>
                    <p className="shrink-0 font-mono text-[13px] text-muted">details locked</p>
                  </div>
                ))}
                <div className="mt-5 flex flex-col items-start gap-2">
                  <button
                    type="button"
                    onClick={onUnlock}
                    className="min-h-[44px] rounded-lg bg-accent px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover"
                  >
                    Unlock full report — $15
                  </button>
                  <p className="text-[13px] text-ink-2">
                    One-time · full PDF · all checks
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => {
                  setState("idle");
                  setResult(null);
                  setUrl("");
                  setPdfDone(false);
                }}
                className="min-h-[44px] text-sm font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
              >
                Audit another site
              </button>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}

// Lazy chunk entry
export default Scanner;
export type { ScanResult, Issue };
