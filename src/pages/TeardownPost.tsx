import { Wordmark } from "../components/Logo";
import { Footer } from "../sections/Footer";
import { GradeStamp } from "../components/Stamps";
import { teardownBySlug } from "../teardowns/teardowns";

export function TeardownPostPage({ slug }: { slug: string }) {
  const t = teardownBySlug(slug);

  if (!t) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
          <nav className="mx-auto flex h-[72px] max-w-[1120px] items-center px-6" aria-label="Primary">
            <a href="/" className="flex items-center" aria-label="Auditify home">
              <Wordmark className="text-[26px] leading-none" />
            </a>
          </nav>
        </header>
        <main className="mx-auto max-w-[720px] px-6 py-24 text-center">
          <h1 className="font-display text-[36px] font-semibold">Teardown not found.</h1>
          <a href="/teardowns" className="mt-6 inline-block font-medium text-accent hover:underline">
            ← All teardowns
          </a>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
        <nav
          className="mx-auto flex h-[72px] max-w-[1120px] items-center justify-between px-6"
          aria-label="Primary"
        >
          <a href="/" className="flex items-center" aria-label="Auditify home">
            <Wordmark className="text-[26px] leading-none" />
          </a>
          <a
            href="/#scan"
            className="inline-flex min-h-[44px] items-center rounded-lg bg-ink px-6 text-sm font-medium text-paper transition-colors hover:bg-[#2A251F]"
          >
            Run free audit
          </a>
        </nav>
      </header>

      <main className="mx-auto max-w-[760px] px-6 py-16 md:py-20">
        <a href="/teardowns" className="text-[14px] font-medium text-ink-2 hover:text-ink">
          ← All teardowns
        </a>
        <p className="eyebrow mt-6 text-ink-2">
          Teardown · {t.site} · {t.date}
        </p>
        <h1 className="mt-4 font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] md:text-[52px]">
          {t.site}, audited.
        </h1>

        <div className="mt-8 flex items-center gap-6 rounded-[10px] border border-line-strong bg-surface p-7">
          <p className="font-display text-[72px] font-semibold leading-none">
            {t.score}
            <span className="text-[32px] text-ink-2">/100</span>
          </p>
          <div>
            <GradeStamp grade={t.grade} />
            <p className="mt-2 font-mono text-[13px] text-ink-2">
              {t.summary.pass} pass · {t.summary.warn} warn · {t.summary.fail} fail
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-4 text-[16px] leading-relaxed text-ink-2">
          {t.verdict.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <h2 className="mt-12 font-display text-[28px] font-semibold">What's already working</h2>
        <ul className="mt-4 space-y-2.5">
          {t.strengths.map((s) => (
            <li key={s} className="flex gap-2.5 text-[15px] text-ink-2">
              <span aria-hidden="true" className="text-success">✓</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>

        <h2 className="mt-12 font-display text-[28px] font-semibold">The findings</h2>
        <div className="mt-6 space-y-5">
          {t.findings.map((f, i) => (
            <article key={f.title} className="rounded-[10px] border border-line-strong bg-surface p-6 md:p-7">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-ink-2">
                  Finding {i + 1}
                </p>
                <span
                  className={`rounded border px-2 py-0.5 font-mono text-[12px] font-semibold ${
                    f.severity === "FAIL"
                      ? "border-accent-deep bg-accent/10 text-accent-deep"
                      : "border-warning bg-warning/10 text-warning"
                  }`}
                >
                  {f.severity}
                </span>
              </div>
              <h3 className="mt-2 font-display text-[22px] font-semibold">
                {f.title}{" "}
                <span className="font-mono text-[14px] font-normal text-ink-2">· {f.metric}</span>
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{f.why}</p>
              <p className="mt-3 border-l-2 border-accent pl-3 text-[15px] font-medium text-ink">
                The fix: {f.fix}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-14 rounded-[10px] border border-accent bg-surface p-8 text-center">
          <h2 className="font-display text-[26px] font-semibold">Your site has a number too.</h2>
          <p className="mx-auto mt-2 max-w-[480px] text-[15px] text-ink-2">
            Same 36 checks, your URL, about 20 seconds. Free, no account.
          </p>
          <a
            href="/#scan"
            className="mt-5 inline-flex min-h-[48px] items-center rounded-lg bg-accent px-8 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Run the free audit
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
