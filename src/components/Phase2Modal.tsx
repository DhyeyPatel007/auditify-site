import { useEffect, useRef } from "react";
import { Mark } from "./Logo";

type Props = {
  open: boolean;
  onClose: () => void;
  context: string;
};

/** Honest Phase-2 stub: checkout is not faked, never simulated. */
export function Phase2Modal({ open, onClose, context }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

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
        aria-labelledby="phase2-title"
        aria-describedby="phase2-desc"
        className="w-full max-w-md rounded-[10px] border border-line-strong bg-surface p-8 shadow-[0_1px_2px_rgba(28,25,21,0.05)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          <Mark size={28} />
          <p className="eyebrow text-ink-2">Phase 2 · {context}</p>
        </div>
        <h2 id="phase2-title" className="font-display text-2xl font-semibold text-ink">
          Checkout opens at launch.
        </h2>
        <p id="phase2-desc" className="mt-3 text-[15px] leading-relaxed text-ink-2">
          Paid checkout isn&rsquo;t wired up yet — accounts, payments, and monitoring ship
          in Phase 2. Nothing is charged, nothing is faked. The free scan above is fully
          working today.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-[#2A251F] min-h-[44px]"
        >
          Got it — back to the free scan
        </button>
      </div>
    </div>
  );
}
