/**
 * Printable HTML report sheet — the "PDF" users get.
 *
 * Pattern copied from DopaDiary (owner's call, 2026-10-23): the report is
 * a real HTML document with real typography (Fraunces/Inter/Plex Mono),
 * and the browser's print dialog produces the PDF. The previous jsPDF
 * generator drew boxes with code and always looked like a filled form —
 * it was deleted, not patched.
 *
 * How it works: PrintReportMount portals the sheet into document.body.
 * Print CSS (index.css) hides #root and shows only #report-sheet, so the
 * printed pages are exactly this sheet — no app chrome.
 */

import { useEffect } from "react";
import { createPortal } from "react-dom";

export type ReportCheck = {
  id: string;
  title: string;
  severity: "PASS" | "WARN" | "FAIL";
  metric: string;
};

export type ReportIssue = {
  id: string;
  title: string;
  severity: "FAIL" | "WARN";
  metric: string;
  detail: string;
  fix: string;
};

export type ReportData = {
  host: string;
  url: string;
  score: number;
  grade: string;
  checksRun: number;
  scannedAt?: string;
  summary: { pass: number; warn: number; fail: number };
  issues: ReportIssue[];
  allChecks?: ReportCheck[];
  agencyName?: string;
  agencyColor?: string;
};

function verdictFor(score: number): string {
  if (score >= 90) return "Excellent — this site is in strong shape. Only minor polish remains.";
  if (score >= 75) return "Good overall — a handful of issues are worth fixing soon.";
  if (score >= 60) return "Fair — several issues are likely costing you visitors or trust.";
  if (score >= 40) return "Needs work — important problems should be fixed promptly.";
  return "Critical — serious issues need immediate attention.";
}

export function ReportPrint({ report }: { report: ReportData }) {
  const brand = report.agencyName?.trim() || "Auditify";
  const accent = report.agencyColor?.trim() || undefined; // undefined → theme vermilion
  const dateStr = (report.scannedAt ? new Date(report.scannedAt) : new Date()).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const fails = report.issues.filter((i) => i.severity === "FAIL");
  const warns = report.issues.filter((i) => i.severity === "WARN");
  const ordered = [...fails, ...warns];

  return (
    <div id="report-sheet" className="bg-white font-sans text-ink">
      {/* Masthead */}
      <div className="border-t-[3px] pt-5" style={{ borderColor: accent ?? "#c93a1b" }}>
        <p
          className="text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: accent ?? "#c93a1b" }}
        >
          {brand} — Website Inspection Report
        </p>
        <h1 className="mt-2 font-display text-[34px] font-semibold leading-[1.1]">
          Website Inspection Report
        </h1>
        <p className="mt-2 font-mono text-[11px] text-ink-2">
          Target: https://{report.host} &nbsp;|&nbsp; Date: {dateStr} &nbsp;|&nbsp; {report.checksRun} checks
        </p>
      </div>

      {/* Stat band — the DopaDiary rhythm: big serif numerals, ruled tops */}
      <div className="mt-7 grid grid-cols-4 gap-6">
        {[
          {
            value: (
              <>
                {report.score}
                <span className="text-[18px] text-muted">/100</span>
              </>
            ),
            label: "Overall score",
          },
          { value: report.grade, label: "Grade" },
          { value: `${report.summary.pass}`, label: "Checks passing" },
          { value: `${ordered.length}`, label: ordered.length === 1 ? "Issue to fix" : "Issues to fix" },
        ].map((s, i) => (
          <div key={i} className="border-t-2 border-ink pt-2.5">
            <p className="font-display text-[38px] font-semibold leading-none">{s.value}</p>
            <p className="mt-1.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted">
              {s.label}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-5 font-display text-[14.5px] italic leading-snug text-ink">
        {verdictFor(report.score)}
      </p>
      <p className="mt-1.5 text-[11px] text-ink-2">
        {report.summary.pass} passing · {report.summary.warn} warnings · {report.summary.fail} failing
      </p>

      {/* Findings */}
      <h2 className="mt-9 border-b border-line-strong pb-2 font-display text-[19px] font-semibold">
        Findings — fix these first ({ordered.length})
      </h2>
      {ordered.length === 0 && (
        <p className="py-4 text-[12px] text-ink-2">
          No issues found — every check passed.
        </p>
      )}
      {ordered.map((issue, idx) => (
        <article key={issue.id} className="break-inside-avoid border-b border-line py-4">
          <div className="flex items-baseline gap-3">
            <span
              className={`text-[10px] font-bold uppercase tracking-[0.12em] ${
                issue.severity === "FAIL" ? "text-accent" : "text-warning"
              }`}
            >
              {issue.severity}
            </span>
            <h3 className="flex-1 text-[13.5px] font-semibold leading-snug">
              {idx + 1}. {issue.title}
            </h3>
            <span className="font-mono text-[11px] text-ink-2">{issue.metric}</span>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-[1.55] text-ink-2">{issue.detail}</p>
          <p className="mt-1.5 text-[11.5px] leading-[1.55] text-ink">
            <span className="font-semibold">Fix — </span>
            {issue.fix}
          </p>
        </article>
      ))}

      {/* Full checklist */}
      {report.allChecks && report.allChecks.length > 0 && (
        <>
          <h2 className="mt-9 border-b border-line-strong pb-2 font-display text-[19px] font-semibold">
            Full checklist — all {report.allChecks.length} checks
          </h2>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-line-strong text-left">
                <th className="py-2 pr-3 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Check
                </th>
                <th className="py-2 pr-3 text-right text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Measured
                </th>
                <th className="py-2 text-right text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              {report.allChecks.map((check) => (
                <tr key={check.id} className="break-inside-avoid border-b border-line">
                  <td className="py-[5px] pr-3 text-ink">{check.title}</td>
                  <td className="py-[5px] pr-3 text-right font-mono text-[10.5px] text-ink-2">
                    {check.metric}
                  </td>
                  <td
                    className={`py-[5px] text-right font-bold ${
                      check.severity === "PASS"
                        ? "text-success"
                        : check.severity === "WARN"
                          ? "text-warning"
                          : "text-accent"
                    }`}
                  >
                    {check.severity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Closing */}
      <h2 className="mt-9 border-b border-line-strong pb-2 font-display text-[16px] font-semibold">
        How this report works
      </h2>
      <p className="mt-2.5 text-[11px] leading-[1.6] text-ink-2">
        {brand} tested {report.checksRun} things on the public homepage of {report.host} — performance,
        SEO, security headers, accessibility and user experience. The score is weighted: passing checks
        count fully, warnings count half, failures count zero, and more important checks count more. It is
        a snapshot of one page at one moment, not a review of your whole business — use the findings above
        as a fix list, in order.
      </p>
      <p className="mt-3 font-mono text-[10px] text-ink-2">
        Grades — A 90–100 Excellent · B 75–89 Good · C 60–74 Fair · D 40–59 Poor · F 0–39 Critical
      </p>
      <div className="mt-8 flex items-baseline justify-between border-t border-line-strong pt-3 font-mono text-[9.5px] text-muted">
        <span>
          {brand} · Official Web Audit Report · {report.host}
        </span>
        <span>auditify.krynex.in — free with a free account</span>
      </div>
    </div>
  );
}

/**
 * Mounts the sheet (portal to body), opens the print dialog once fonts
 * and layout settle, and calls onDone when the dialog closes.
 */
export function PrintReportMount({
  report,
  onDone,
}: {
  report: ReportData;
  onDone: () => void;
}) {
  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onDone();
    };
    window.addEventListener("afterprint", finish);
    const t = window.setTimeout(() => window.print(), 400);
    // Safety net: if afterprint never fires (some mobile browsers), don't
    // leave the sheet mounted forever.
    const safety = window.setTimeout(finish, 120000);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(safety);
      window.removeEventListener("afterprint", finish);
    };
  }, [onDone]);

  return createPortal(<ReportPrint report={report} />, document.body);
}
