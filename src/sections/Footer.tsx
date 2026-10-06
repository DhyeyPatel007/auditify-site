import { Wordmark } from "../components/Logo";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Sample report", href: "/#sample-report" },
      { label: "Methodology", href: "/methodology" },
      { label: "Teardowns", href: "/teardowns" },
    ],
  },
  {
    title: "Company",
    links: [{ label: "Contact", href: "mailto:contact@auditify.krynex.in" }],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Refunds", href: "/refund" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-paper" aria-label="Footer">
      <div className="mx-auto max-w-[1120px] px-6 py-16">
        <div className="grid gap-12 md:grid-cols-[280px_1fr]">
          <div>
            <Wordmark className="text-[24px] leading-none" />
            <p className="mt-4 max-w-[240px] text-[14px] leading-relaxed text-ink-2">
              Website audits, graded like they matter.
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-8 sm:grid-cols-3" aria-label="Footer">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="eyebrow text-ink-2">{col.title}</p>
                <ul className="mt-4 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        className="inline-flex min-h-[24px] items-center text-[14px] text-ink-2 transition-colors hover:text-ink"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-line pt-6 sm:flex-row sm:items-center">
          <p className="text-[13px] text-ink-2">© 2026 Krynex Studio · Auditify</p>
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-2">
            <svg viewBox="0 0 16 14" className="h-[14px] w-[16px]" aria-hidden="true">
              <path
                d="M2.5 7.5 L6.2 11.2 L13.8 2.4"
                stroke="#C93A1B"
                strokeWidth="3.1"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            Proudly made in India
          </p>
          <p className="text-[13px] text-ink-2">
            <a href="/terms" className="transition-colors hover:text-ink">
              Terms
            </a>
            <span aria-hidden="true" className="mx-2 text-line-strong">
              ·
            </span>
            <a href="/privacy" className="transition-colors hover:text-ink">
              Privacy
            </a>
            <span aria-hidden="true" className="mx-2 text-line-strong">
              ·
            </span>
            <a href="/refund" className="transition-colors hover:text-ink">
              Refunds
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
