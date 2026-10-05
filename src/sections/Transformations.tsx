import { GradeStamp } from "../components/Stamps";

/**
 * Anatomy of a fix — a REAL scan of a real site (our own Nilkanth Resort
 * demo), showing the before state and the exact fixes. No invented
 * after-score: fix these, re-scan, watch it move.
 */
const BEFORE = {
  site: "nilkanthresort.vercel.app",
  score: 81,
  grade: "B" as const,
  scanned: "October 2026",
};

const FIXES = [
  {
    issue: "No compression",
    metric: "identity encoding",
    why: "The document ships uncompressed — often 3–5× larger than needed.",
    fix: "Enable gzip or Brotli on the server/CDN. On Vercel, this is one checkbox.",
    effort: "~5 min",
  },
  {
    issue: "No Content-Security-Policy",
    metric: "header missing",
    why: "Without a CSP, any injected script runs with full page privileges.",
    fix: "Add a Content-Security-Policy header; start with default-src 'self'.",
    effort: "~20 min",
  },
  {
    issue: "No H1 heading",
    metric: "0 h1 tags",
    why: "No H1 in the raw HTML — search engines and screen readers miss the page's main topic.",
    fix: "Add exactly one descriptive <h1> to the server-rendered HTML.",
    effort: "~10 min",
  },
];

export function Transformations() {
  return (
    <section id="transformations" className="border-b border-line" aria-labelledby="transformations-heading">
      <div className="mx-auto max-w-[1120px] px-6 py-16 md:py-24">
        <p className="eyebrow text-ink-2">Anatomy of a fix</p>
        <h2
          id="transformations-heading"
          className="mt-4 max-w-[720px] font-display text-[32px] font-semibold leading-[1.1] sm:text-[40px]"
        >
          A real audit, a real site, three real fixes.
        </h2>
        <p className="mt-4 max-w-[640px] text-[16px] leading-relaxed text-ink-2">
          This is an actual scan of our own demo site — not a mockup. The score
          is decent. The fixes are small. That's the whole point: most sites
          aren't broken, they're just unfinished.
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Before card */}
          <article className="rounded-[10px] border border-line-strong bg-surface p-7">
            <p className="eyebrow text-ink-2">The before</p>
            <p className="mt-3 font-mono text-[14px] text-ink-2">{BEFORE.site}</p>
            <div className="mt-5 flex items-center gap-5">
              <p className="font-display text-[64px] font-semibold leading-none">
                {BEFORE.score}
              </p>
              <GradeStamp grade={BEFORE.grade} />
            </div>
            <p className="mt-4 text-[13px] text-ink-2">Scanned {BEFORE.scanned} · 36 checks</p>
            <div className="mt-6 border-t border-line pt-4">
              <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-2">
                3 fails holding it back
              </p>
              <ul className="mt-3 space-y-2.5">
                {FIXES.map((f) => (
                  <li key={f.issue} className="flex items-start justify-between gap-3 text-[14px]">
                    <span className="font-medium text-ink">{f.issue}</span>
                    <span className="shrink-0 font-mono text-[12px] text-accent-deep">{f.metric}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          {/* Fix list */}
          <div className="flex flex-col gap-4">
            {FIXES.map((f, i) => (
              <article
                key={f.issue}
                className="flex-1 rounded-[10px] border border-line bg-surface p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-ink-2">
                      Fix {i + 1}
                    </p>
                    <h3 className="mt-1 font-display text-[20px] font-semibold">{f.issue}</h3>
                  </div>
                  <span className="shrink-0 rounded-full border border-line-strong bg-paper px-3 py-1 font-mono text-[12px] text-ink-2">
                    {f.effort}
                  </span>
                </div>
                <p className="mt-2 text-[14px] text-ink-2">{f.why}</p>
                <p className="mt-3 border-l-2 border-accent pl-3 text-[14px] font-medium text-ink">
                  {f.fix}
                </p>
              </article>
            ))}
            <p className="text-[14px] italic text-ink-2">
              Total effort: under an hour. Then re-scan and watch the number move —
              that's the loop monitoring automates.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
