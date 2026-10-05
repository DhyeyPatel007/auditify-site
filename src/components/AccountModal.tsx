import { useEffect, useRef } from "react";
import { Mark } from "./Logo";
import { listReports } from "../lib/reports";

type Props = {
  open: boolean;
  onClose: () => void;
  uid: string;
  email: string;
  name: string | null;
  onSignOut: () => void;
};

/**
 * Account panel for signed-in users: past scan reports (stored on this
 * device until the Phase 2 backend arrives) and monitoring plans.
 */
export function AccountModal({ open, onClose, uid, email, name, onSignOut }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const reports = open ? listReports(uid) : [];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    dialogRef.current?.querySelector("button")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-title"
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-[10px] border border-line-strong bg-surface p-8 shadow-[0_1px_2px_rgba(28,25,21,0.05)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          <Mark size={28} />
          <p className="eyebrow text-ink-2">My account</p>
        </div>
        <h2 id="account-title" className="font-display text-2xl font-semibold text-ink">
          {name ? `Hi, ${name}.` : "Your account."}
        </h2>
        <p className="mt-1 truncate text-[14px] text-ink-2">{email}</p>

        <h3 className="eyebrow mt-8 text-ink-2">Past reports</h3>
        {reports.length === 0 ? (
          <p className="mt-2 text-[14px] text-ink-2">
            No scans yet on this device. Run the free scan above and your
            reports will be listed here.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-line border-y border-line">
            {reports.map((r) => (
              <li key={`${r.url}-${r.scannedAt}`} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-[14px] text-ink">{r.host}</p>
                  <p className="text-[12px] text-muted">
                    {new Date(r.scannedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    · {r.checksRun} checks
                  </p>
                </div>
                <span className="stamp shrink-0 rounded border border-line-strong bg-paper px-2 py-1 font-mono text-[13px] font-semibold text-ink">
                  {r.score}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[12px] text-muted">
          Scan history is kept on this device for now; it moves to your account
          when the paid backend ships.
        </p>

        <h3 className="eyebrow mt-8 text-ink-2">Monitoring plans</h3>
        <p className="mt-2 text-[14px] text-ink-2">
          No active monitoring plans. Monitoring opens with Phase 2 checkout —
          we&rsquo;ll email you when it&rsquo;s live.
        </p>

        <button
          type="button"
          onClick={() => {
            onSignOut();
            onClose();
          }}
          className="mt-8 min-h-[48px] w-full rounded-lg border border-line-strong bg-surface-raised px-5 text-[15px] font-medium text-ink transition-colors hover:border-ink"
        >
          Log out
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full min-h-[44px] text-sm font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
        >
          Back to the site
        </button>
      </div>
    </div>
  );
}
