import { Wordmark } from "../components/Logo";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
      <nav
        className="mx-auto flex h-[72px] max-w-[1120px] items-center justify-between px-6"
        aria-label="Primary"
      >
        <a href="/#top" className="flex items-center" aria-label="Auditify home">
          <Wordmark className="text-[26px] leading-none" />
        </a>
        <ul className="hidden items-center gap-9 text-[15px] font-medium text-ink-2 md:flex">
          <li>
            <a href="/#features" className="transition-colors hover:text-ink">
              Product
            </a>
          </li>
          <li>
            <a href="/#pricing" className="transition-colors hover:text-ink">
              Pricing
            </a>
          </li>
          <li>
            <a href="/#faq" className="transition-colors hover:text-ink">
              FAQ
            </a>
          </li>
        </ul>
        <a
          href="/#scan"
          className="inline-flex min-h-[44px] items-center rounded-lg bg-ink px-6 text-sm font-medium text-paper transition-colors hover:bg-[#2A251F]"
        >
          Run free audit
        </a>
      </nav>
    </header>
  );
}
