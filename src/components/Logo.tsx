type MarkProps = {
  size?: number;
  className?: string;
  /** one-color version: tick renders in ink (photocopy test) */
  mono?: boolean;
};

/**
 * The Auditify mark: report-card glyph — square outline + 3 hairline rules
 * + a vermilion auditor's tick struck across it. Pure line-work.
 */
export function Mark({ size = 32, className, mono = false }: MarkProps) {
  const ink = "#1C1915";
  const tick = mono ? ink : "#C93A1B";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role="img"
      aria-label="Auditify mark"
    >
      <rect x="14" y="10" width="36" height="44" stroke={ink} strokeWidth="4" />
      <line x1="22" y1="23" x2="42" y2="23" stroke={ink} strokeWidth="3" />
      <line x1="22" y1="32" x2="42" y2="32" stroke={ink} strokeWidth="3" />
      <line x1="22" y1="41" x2="38" y2="41" stroke={ink} strokeWidth="3" />
      <polyline
        points="21,39 30,47 52,17"
        stroke={tick}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type WordmarkProps = {
  className?: string;
};

/**
 * "Auditify" re-typeset in Fraunces 600, tight tracking, ink —
 * with the dot of the second i replaced by a vermilion auditor's tick.
 * (Uses the dotless ı U+0131, tick positioned where the tittle would sit.)
 */
export function Wordmark({ className = "" }: WordmarkProps) {
  return (
    <span
      className={`font-display font-semibold tracking-[-0.02em] text-ink select-none ${className}`}
      aria-label="Auditify"
      role="img"
    >
      <span aria-hidden="true">
        Audit
        <span className="relative inline-block">
          &#x131;
          <svg
            viewBox="0 0 16 14"
            className="absolute pointer-events-none"
            style={{
              width: "0.52em",
              height: "0.455em",
              left: "0.22em",
              bottom: "0.58em",
            }}
            aria-hidden="true"
          >
            <path
              d="M2.5 7.5 L6.2 11.2 L13.8 2.4"
              stroke="#C93A1B"
              strokeWidth="3.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </span>
        fy
      </span>
    </span>
  );
}
