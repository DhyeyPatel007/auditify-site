/**
 * Monitoring preview — what the $12/mo plan looks like: a score-over-time
 * chart and a sample alert email. Chart data is a labeled sample; the
 * email is a mock of the real alert format.
 */
const POINTS = [74, 76, 75, 79, 82, 81, 84, 86];
const W = 560;
const H = 180;
const PAD = 28;

function path(): string {
  const min = 60;
  const max = 95;
  return POINTS.map((p, i) => {
    const x = PAD + (i / (POINTS.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((p - min) / (max - min)) * (H - PAD * 2);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

const ALERT = {
  subject: "Auditify: 2 new issues on example-shop.com",
  lines: [
    ["FAIL", "No Content-Security-Policy", "A deploy removed the CSP header."],
    ["WARN", "Image payload heavy", "Homepage images grew 40% after Tuesday's deploy."],
  ] as [string, string, string][],
};

export function MonitoringPreview() {
  return (
    <section id="monitoring" className="border-b border-line" aria-labelledby="monitoring-heading">
      <div className="mx-auto max-w-[1120px] px-6 py-16 md:py-24">
        <p className="eyebrow text-ink-2">Monitoring · $12/mo</p>
        <h2
          id="monitoring-heading"
          className="mt-4 max-w-[720px] font-display text-[32px] font-semibold leading-[1.1] sm:text-[40px]"
        >
          Fix it once. We'll make sure it stays fixed.
        </h2>
        <p className="mt-4 max-w-[640px] text-[16px] leading-relaxed text-ink-2">
          Weekly re-scans of up to 3 sites. When something breaks — a deploy
          strips a header, images balloon, a certificate nears expiry — you get
          an email before your visitors notice.
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {/* Trend chart */}
          <article className="rounded-[10px] border border-line-strong bg-surface p-7">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-[20px] font-semibold">Score over time</h3>
              <p className="font-mono text-[12px] text-ink-2">sample data</p>
            </div>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="mt-4 w-full"
              role="img"
              aria-label="Sample chart showing a site score rising from 74 to 86 over eight weeks"
            >
              {[70, 80, 90].map((g) => {
                const y = H - PAD - ((g - 60) / 35) * (H - PAD * 2);
                return (
                  <g key={g}>
                    <line x1={PAD} x2={W - PAD} y1={y} y2={y} stroke="#e5dfd0" strokeWidth="1" />
                    <text x={W - PAD + 6} y={y + 4} fontSize="11" fill="#8c857a" fontFamily="monospace">
                      {g}
                    </text>
                  </g>
                );
              })}
              <path d={path()} fill="none" stroke="#c93a1b" strokeWidth="2.5" strokeLinecap="round" />
              {POINTS.map((p, i) => {
                const x = PAD + (i / (POINTS.length - 1)) * (W - PAD * 2);
                const y = H - PAD - ((p - 60) / 35) * (H - PAD * 2);
                return <circle key={i} cx={x} cy={y} r="4" fill="#f7f3ea" stroke="#c93a1b" strokeWidth="2" />;
              })}
            </svg>
            <p className="mt-3 text-[13px] text-ink-2">
              Eight weekly scans. Two dips, both caught by alerts, both fixed the same week.
            </p>
          </article>

          {/* Alert email mock */}
          <article className="rounded-[10px] border border-line-strong bg-surface p-7">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-[20px] font-semibold">The alert email</h3>
              <p className="font-mono text-[12px] text-ink-2">mock</p>
            </div>
            <div className="mt-4 rounded-lg border border-line bg-paper p-5">
              <p className="text-[13px] text-ink-2">Subject</p>
              <p className="mt-0.5 text-[15px] font-semibold text-ink">{ALERT.subject}</p>
              <div className="mt-4 space-y-3 border-t border-line pt-4">
                {ALERT.lines.map(([sev, title, body]) => (
                  <div key={title} className="flex gap-3">
                    <span
                      className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
                        sev === "FAIL"
                          ? "border-accent-deep bg-accent/10 text-accent-deep"
                          : "border-warning bg-warning/10 text-warning"
                      }`}
                    >
                      {sev}
                    </span>
                    <div>
                      <p className="text-[14px] font-medium text-ink">{title}</p>
                      <p className="text-[13px] text-ink-2">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 border-t border-line pt-3 text-[13px] text-ink-2">
                Each issue ships with the exact fix step — the same ones from your full report.
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
