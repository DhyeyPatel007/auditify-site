import { Wordmark } from "../components/Logo";
import { Footer } from "../sections/Footer";
import { GradeStamp } from "../components/Stamps";
import { TEARDOWNS } from "../teardowns/teardowns";

function PageHeader({ eyebrow }: { eyebrow: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
      <nav
        className="mx-auto flex h-[72px] max-w-[1120px] items-center justify-between px-6"
        aria-label="Primary"
      >
        <a href="/" className="flex items-center" aria-label="Auditify home">
          <Wordmark className="text-[26px] leading-none" />
        </a>
        <div className="flex items-center gap-5">
          <span className="hidden text-[15px] font-medium text-ink sm:block">{eyebrow}</span>
          <a
            href="/#scan"
            className="inline-flex min-h-[44px] items-center rounded-lg bg-ink px-6 text-sm font-medium text-paper transition-colors hover:bg-[#2A251F]"
          >
            Run free audit
          </a>
        </div>
      </nav>
    </header>
  );
}

export { PageHeader };

export function TeardownsPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <PageHeader eyebrow="Teardowns" />
      <main className="mx-auto max-w-[1120px] px-6 py-16 md:py-24">
        <p className="eyebrow text-ink-2">Teardowns</p>
        <h1 className="mt-4 max-w-[720px] font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] md:text-[56px]">
          We audit famous sites in public.
        </h1>
        <p className="mt-6 max-w-[640px] text-[17px] leading-relaxed text-ink-2">
          Same scanner, same 36 checks, real numbers. No permission asked, no
          punches pulled — but no cheap shots either. Every teardown ends with
          the exact fixes.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {TEARDOWNS.map((t) => (
            <a
              key={t.slug}
              href={`/teardowns/${t.slug}`}
              className="group rounded-[10px] border border-line-strong bg-surface p-7 transition-colors hover:border-ink"
            >
              <div className="flex items-center justify-between">
                <p className="font-mono text-[13px] text-ink-2">{t.site}</p>
                <GradeStamp grade={t.grade} />
              </div>
              <p className="mt-4 font-display text-[56px] font-semibold leading-none">
                {t.score}
                <span className="text-[24px] text-ink-2">/100</span>
              </p>
              <p className="mt-3 text-[14px] text-ink-2">
                {t.summary.fail} fails · {t.summary.warn} warnings · {t.date}
              </p>
              <p className="mt-4 text-[15px] font-medium text-accent group-hover:underline group-hover:underline-offset-4">
                Read the teardown →
              </p>
            </a>
          ))}
        </div>

        <div className="mt-16 rounded-[10px] border border-line bg-surface p-8 text-center">
          <h2 className="font-display text-[24px] font-semibold">Want your site torn down?</h2>
          <p className="mx-auto mt-2 max-w-[480px] text-[15px] text-ink-2">
            Run the free audit — it's the same engine, on your URL, in about 20 seconds.
          </p>
          <a
            href="/#scan"
            className="mt-5 inline-flex min-h-[48px] items-center rounded-lg bg-accent px-8 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Audit my site
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
