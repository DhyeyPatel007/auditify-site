import { Wordmark } from "../components/Logo";
import { Footer } from "../sections/Footer";

type Check = { name: string; how: string };

const GROUPS: { title: string; blurb: string; checks: Check[] }[] = [
  {
    title: "Security",
    blurb: "Can visitors — and attackers — trust this page?",
    checks: [
      { name: "HTTPS", how: "We require the page to load over TLS; plain HTTP fails outright." },
      { name: "TLS version", how: "We read the negotiated protocol during the handshake. 1.0/1.1 fail; 1.2/1.3 pass." },
      { name: "HTTPS enforced", how: "We request the HTTP version and require a redirect to HTTPS — serving content over HTTP fails." },
      { name: "HSTS", how: "We parse the Strict-Transport-Security header. Missing fails; a max-age under a year warns; preloaded passes with honors." },
      { name: "Content-Security-Policy", how: "We require a CSP header and flag wildcard-permissive policies as warnings." },
      { name: "Clickjacking protection", how: "We require X-Frame-Options or frame-ancestors in the CSP." },
      { name: "MIME sniffing", how: "We require X-Content-Type-Options: nosniff on the document." },
      { name: "Referrer policy", how: "We require a Referrer-Policy header so the site doesn't leak full URLs to third parties." },
      { name: "Permissions policy", how: "We require a Permissions-Policy header limiting camera, microphone, and geolocation." },
      { name: "Mixed content", how: "We scan the HTML for http:// subresources on an https:// page." },
      { name: "Exposed .env", how: "We probe for a publicly reachable /.env file — a leaked one fails hard." },
      { name: "Exposed git metadata", how: "We probe for a publicly reachable /.git/HEAD." },
    ],
  },
  {
    title: "Performance",
    blurb: "How fast does this page reach a visitor?",
    checks: [
      { name: "Server response (TTFB)", how: "We time the first byte. Over ~800ms warns; over ~1.8s fails." },
      { name: "Compression", how: "We request gzip/br and fail when the server answers with identity encoding." },
      { name: "HTML weight", how: "We weigh the document. Over ~100KB warns; over ~200KB fails." },
      { name: "Image payload", how: "We HEAD the page's remote images and total their bytes. Heavy payloads warn or fail by threshold." },
      { name: "Image count", how: "We count images; a very image-heavy page warns regardless of bytes." },
      { name: "HTTP version", how: "We note whether the server speaks HTTP/2 or 3 — multiplexing matters on image-heavy pages." },
    ],
  },
  {
    title: "SEO & sharing",
    blurb: "Can search engines and social platforms understand this page?",
    checks: [
      { name: "Page title present", how: "We require a non-empty <title>." },
      { name: "Title length", how: "We warn outside ~30–60 characters, where Google truncates." },
      { name: "Meta description present", how: "We require a non-empty meta description." },
      { name: "Description length", how: "We warn outside ~120–160 characters." },
      { name: "Single H1", how: "We require exactly one <h1> — zero or several both warn." },
      { name: "Language declared", how: "We require a lang attribute on <html>." },
      { name: "Canonical URL", how: "We require a canonical link so search engines know the master URL." },
      { name: "robots.txt", how: "We fetch /robots.txt and note whether crawlers are guided or blocked." },
      { name: "Sitemap", how: "We look for a sitemap via robots.txt and common paths." },
      { name: "Open Graph tags", how: "We require og:title, og:description, and og:image for rich link previews." },
      { name: "Twitter card", how: "We require twitter:card for proper previews on X." },
    ],
  },
  {
    title: "Reliability & craft",
    blurb: "Does the page behave like someone maintains it?",
    checks: [
      { name: "Broken links", how: "We sample up to 10 internal links and fail on 4xx/5xx responses." },
      { name: "Redirect chain", how: "We follow redirects (max 3) and warn on long chains that cost round-trips." },
      { name: "404 handling", how: "We request a nonsense path and require a real 404 — a soft 200 fails." },
      { name: "Favicon", how: "We require a favicon link or /favicon.ico." },
      { name: "Viewport meta", how: "We require the viewport tag — without it, mobile layouts break." },
      { name: "Charset declared", how: "We require an explicit charset so text never mojibakes." },
      { name: "Server fingerprint", how: "We warn when Server/X-Powered-By headers advertise exact software versions." },
      { name: "Image alt text", how: "We check every image for alt text — missing alt fails accessibility and image SEO." },
    ],
  },
];

const NOT_COVERED = [
  {
    title: "Popularity",
    body: "A famous site with no CSP scores the same as an unknown one with no CSP. The audit measures the site, not its reputation.",
  },
  {
    title: "Taste",
    body: "We can't tell beautiful from ugly. Layout, typography, and copy quality are human judgments — the audit sticks to what it can measure.",
  },
  {
    title: "Content quality",
    body: "Thin, wrong, or AI-slop content won't move the score unless it breaks a measurable check. Write for humans; we check the plumbing.",
  },
  {
    title: "Everything beyond the homepage",
    body: "The free scan audits one URL — usually the homepage. Deep pages, checkout flows, and logged-in states need the full report.",
  },
  {
    title: "One moment in time",
    body: "A scan is a snapshot. Servers get reconfigured, plugins update, certificates expire. That's what monitoring is for.",
  },
];

export function MethodologyPage() {
  const total = GROUPS.reduce((n, g) => n + g.checks.length, 0);
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
          <div className="flex items-center gap-3">
            <a
              href="/teardowns"
              className="hidden text-[15px] font-medium text-ink-2 transition-colors hover:text-ink sm:block"
            >
              Teardowns
            </a>
            <a
              href="/#scan"
              className="inline-flex min-h-[44px] items-center rounded-lg bg-ink px-6 text-sm font-medium text-paper transition-colors hover:bg-[#2A251F]"
            >
              Run free audit
            </a>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-[1120px] px-6 py-16 md:py-24">
        <p className="eyebrow text-ink-2">Methodology</p>
        <h1 className="mt-4 max-w-[720px] font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] md:text-[56px]">
          Every check, shown like we'd show a client.
        </h1>
        <p className="mt-6 max-w-[680px] text-[17px] leading-relaxed text-ink-2">
          The free scan runs <strong className="font-semibold text-ink">{total} deterministic
          checks</strong> against your homepage and folds them into a weighted 0–100
          score. Security findings weigh most, because a hacked site makes every
          other optimization irrelevant. Each check below is a real measurement —
          not an AI guess, not a vibe.
        </p>

        <div className="mt-16 space-y-14">
          {GROUPS.map((g) => (
            <section key={g.title} aria-label={g.title}>
              <div className="flex items-baseline justify-between border-b border-line-strong pb-4">
                <h2 className="font-display text-[28px] font-semibold">{g.title}</h2>
                <p className="font-mono text-[13px] text-ink-2">{g.checks.length} checks</p>
              </div>
              <p className="mt-3 text-[15px] italic text-ink-2">{g.blurb}</p>
              <dl className="mt-6 grid gap-px overflow-hidden rounded-[10px] border border-line bg-line md:grid-cols-2">
                {g.checks.map((c) => (
                  <div key={c.name} className="bg-surface p-5">
                    <dt className="text-[15px] font-semibold text-ink">{c.name}</dt>
                    <dd className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{c.how}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        <section aria-label="What the score doesn't cover" className="mt-20">
          <p className="eyebrow text-ink-2">Honest limits</p>
          <h2 className="mt-4 font-display text-[32px] font-semibold md:text-[40px]">
            What the score doesn't cover.
          </h2>
          <p className="mt-4 max-w-[680px] text-[16px] leading-relaxed text-ink-2">
            A number is only useful when you know its edges. Here's what we
            deliberately leave out — and why.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {NOT_COVERED.map((n) => (
              <article
                key={n.title}
                className="rounded-[10px] border border-line-strong bg-surface p-6"
              >
                <h3 className="font-display text-[20px] font-semibold">{n.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{n.body}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-20 rounded-[10px] border border-accent bg-surface p-8 text-center md:p-12">
          <h2 className="font-display text-[28px] font-semibold md:text-[36px]">
            See all {total} checks run on your site.
          </h2>
          <p className="mx-auto mt-3 max-w-[520px] text-[15px] text-ink-2">
            Free, no account, about 20 seconds. You'll get the score plus the
            three issues that matter most.
          </p>
          <a
            href="/#scan"
            className="mt-6 inline-flex min-h-[48px] items-center rounded-lg bg-accent px-8 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Run the free audit
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
