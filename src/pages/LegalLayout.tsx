import type { ReactNode } from "react";
import { Wordmark } from "../components/Logo";
import { Footer } from "../sections/Footer";

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
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
      <main className="mx-auto max-w-[720px] px-6 py-16 md:py-20">
        <p className="eyebrow text-ink-2">Legal</p>
        <h1 className="mt-3 font-display text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] md:text-[52px]">
          {title}
        </h1>
        <p className="mt-4 font-mono text-[12px] uppercase tracking-[0.12em] text-ink-2">
          Last updated · {updated}
        </p>
        <div className="legal-body mt-10">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
