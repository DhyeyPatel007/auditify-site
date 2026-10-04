export type Grade = "A" | "B" | "C" | "D" | "F";

const GRADE_COLOR: Record<Grade, string> = {
  A: "text-success border-success",
  B: "text-success border-success",
  C: "text-warning border-warning",
  D: "text-accent border-accent",
  F: "text-accent border-accent",
};

/** Rubber-stamp grade: bordered box, slight -2° rotation, stamped on. */
export function GradeStamp({ grade, large = false }: { grade: Grade; large?: boolean }) {
  return (
    <span
      className={`stamp inline-flex items-center justify-center border-2 rounded font-sans font-semibold uppercase ${
        GRADE_COLOR[grade]
      } ${large ? "text-3xl px-3 py-1" : "text-xl px-2.5 py-0.5"}`}
      aria-label={`Grade ${grade}`}
    >
      {grade}
    </span>
  );
}

export type Severity = "FAIL" | "WARN" | "PASS" | "HIDDEN";

const SEV_STYLE: Record<Severity, string> = {
  FAIL: "text-accent border-accent",
  WARN: "text-warning border-warning",
  PASS: "text-success border-success",
  HIDDEN: "text-ink-2 border-line-strong",
};

/** Small severity stamp used at the head of each ledger row. */
export function SeverityStamp({ severity }: { severity: Severity }) {
  return (
    <span
      className={`stamp inline-flex shrink-0 items-center justify-center border rounded px-2 py-1 text-[11px] font-sans font-semibold uppercase tracking-[0.08em] ${SEV_STYLE[severity]}`}
    >
      {severity}
    </span>
  );
}

export type LedgerRowData = {
  severity: Severity;
  title: string;
  metric: string;
};

/** A ruled ledger row: stamp · finding · right-aligned mono metric. */
export function LedgerRow({ row }: { row: LedgerRowData }) {
  return (
    <div className="flex items-center gap-4 border-b border-line py-3.5 last:border-b-0">
      <SeverityStamp severity={row.severity} />
      <p className="min-w-0 flex-1 text-[15px] leading-snug text-ink">{row.title}</p>
      <p className="shrink-0 font-mono text-[13px] text-ink-2">{row.metric}</p>
    </div>
  );
}
