import { useState } from "react";
import { GradeStamp, SeverityStamp, type Grade } from "./Stamps";

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
};

type Props = {
  onUnlock: () => void;
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

export function Scanner({ onUnlock }: Props) {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          (data && data.error) || `Scan failed (HTTP ${res.status}). Try again.`
        );
      }
      setResult(data as ScanResult);
      setState("done");
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
              <p className="eyebrow text-ink-2">Free audit</p>
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

            <div className="mt-6">
              <p className="eyebrow mb-1 text-ink-2">Top issues — free</p>
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
