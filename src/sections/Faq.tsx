const FAQS = [
  {
    q: "How is this different from free Lighthouse or asking an AI tool?",
    a: "Lighthouse is a one-off snapshot you have to run yourself — it forgets everything the moment you close the tab. An AI chatbot can't scan your site on a schedule, track changes over time, or verify that a fix actually worked; it just guesses from whatever you describe. Auditify runs on its own schedule, remembers your full history, checks deterministically instead of guessing, and alerts you when something changes.",
  },
  {
    q: "What does the score mean?",
    a: "A number from 0–100 based on 35 checks across performance, SEO, accessibility, and security, weighted by real-world impact. It's not a grade for its own sake — it's a summary of what to fix first.",
  },
  {
    q: "Do I need to install anything?",
    a: "No. Auditify scans your public site from our side. Nothing to install, no code changes, no access to your hosting.",
  },
  {
    q: 'What counts as a "site" on monitoring?',
    a: "One domain, including its subdomains and paths — www.example.com and example.com/blog count as one site. Each plan can monitor up to 3 sites.",
  },
  {
    q: "Can agencies resell the reports?",
    a: "Yes. The Agency plan includes white-labeled reports and client share links, so you can deliver Auditify audits under your own brand and charge your clients whatever you like. We don't take a cut.",
  },
  {
    q: "What happens to my data?",
    a: "We store your scan results and account details — nothing else. We never sell data, share it with third parties, or use your scans to train models. Delete your account and we delete your data.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="border-b border-line" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-[720px] px-6 py-16 md:py-24">
        <p className="eyebrow text-ink-2">FAQ</p>
        <h2
          id="faq-heading"
          className="mt-4 font-display text-[32px] font-semibold text-ink sm:text-[40px]"
        >
          Asked, answered.
        </h2>
        <div className="mt-10 border-t border-line-strong">
          {FAQS.map((f, i) => (
            <details
              key={f.q}
              className="group border-b border-line-strong"
              {...(i === 0 ? { open: true } : {})}
            >
              <summary className="flex min-h-[64px] cursor-pointer list-none items-center justify-between gap-6 py-5 text-left [&::-webkit-details-marker]:hidden">
                <span className="text-[16px] font-medium text-ink">{f.q}</span>
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line-strong font-mono text-lg text-ink-2 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="max-w-[600px] pb-6 text-[15px] leading-relaxed text-ink-2">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
