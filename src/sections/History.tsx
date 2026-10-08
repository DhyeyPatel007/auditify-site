import { useEffect, useState } from "react";
import { GradeStamp, type Grade } from "../components/Stamps";
import { clearReports, listReports, type PastReport } from "../lib/reports";

/**
 * Scan history — visible only when signed in. Stored in this browser,
 * keyed to the account, until the Phase 2 backend adds server-side history.
 */
export function History({ uid }: { uid: string | null }) {
  const [reports, setReports] = useState<PastReport[]>([]);

  useEffect(() => {
    setReports(uid ? listReports(uid) : []);
  }, [uid]);

  if (!uid) return null;

  const clear = () => {
    clearReports(uid);
    setReports([]);
  };

  const when = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

  return (
    <section id="history" className="border-b border-line" aria-labelledby="history-heading">
      <div className="mx-auto max-w-[1120px] px-6 py-16 md:py-24">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="eyebrow text-ink-2">Your account</p>
            <h2
              id="history-heading"
              className="mt-4 font-display text-[32px] font-semibold sm:text-[40px]"
            >
              Recent scans
            </h2>
          </div>
          {reports.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="text-[14px] font-medium text-ink-2 underline-offset-2 hover:text-ink hover:underline"
            >
              Clear history
            </button>
          )}
        </div>

        {reports.length === 0 ? (
          <p className="mt-6 max-w-[560px] text-[15px] leading-relaxed text-ink-2">
            Nothing here yet. Run the free audit above while signed in and each
            scan lands here automatically — stored in this browser, tied to your
            account.
          </p>
        ) : (
          <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reports.map((r) => (
              <li
                key={`${r.url}-${r.scannedAt}`}
                className="rounded-[10px] border border-line bg-surface p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate font-mono text-[13px] text-ink-2">{r.host}</p>
                  <GradeStamp grade={r.grade as Grade} />
                </div>
                <p className="mt-3 font-display text-[40px] font-semibold leading-none">
                  {r.score}
                  <span className="text-[20px] text-ink-2">/100</span>
                </p>
                <p className="mt-3 text-[13px] text-ink-2">
                  {r.checksRun} checks · {when(r.scannedAt)}
                </p>
                <div className="mt-4 pt-3 border-t border-line">
                  <a
                    href="/dashboard"
                    className="inline-block text-[13px] font-medium text-accent hover:underline"
                  >
                    View on dashboard →
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-6 text-[13px] italic text-ink-2">
          History is synced to your account across devices.
        </p>
      </div>
    </section>
  );
}
