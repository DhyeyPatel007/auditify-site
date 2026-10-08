export function CtaBand() {
  return (
    <section className="bg-ink" aria-labelledby="cta-heading">
      <div className="mx-auto max-w-[1120px] px-6 py-16 text-center md:py-24">
        <p className="eyebrow text-paper/70">Start now</p>
        <h2
          id="cta-heading"
          className="mx-auto mt-4 max-w-[640px] font-display text-[32px] font-semibold leading-tight text-paper sm:text-[44px]"
        >
          Your site has problems. Find them before your customers do.
        </h2>
        <div className="mt-8">
          <a
            href="#scan"
            className="inline-flex min-h-[52px] items-center rounded-lg bg-accent px-8 text-[16px] font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Run free audit
          </a>
        </div>
        <p className="mt-5 text-[13px] text-paper/70">
          Free forever · about 20 seconds · no account needed
        </p>
      </div>
    </section>
  );
}
