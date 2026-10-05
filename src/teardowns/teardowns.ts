/** Teardown post data. Every number below comes from a real scan. */

export type TeardownFinding = {
  severity: "FAIL" | "WARN";
  title: string;
  metric: string;
  why: string;
  fix: string;
};

export type Teardown = {
  slug: string;
  site: string;
  date: string;
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  summary: { pass: number; warn: number; fail: number };
  verdict: string[];
  strengths: string[];
  findings: TeardownFinding[];
};

export const TEARDOWNS: Teardown[] = [
  {
    slug: "zerodha",
    site: "zerodha.com",
    date: "October 2026",
    score: 84,
    grade: "B",
    summary: { pass: 28, warn: 5, fail: 3 },
    verdict: [
      "Zerodha runs one of the tightest operations in Indian fintech, and their homepage shows it: 28 of 36 checks pass, and the failures are all fixable in an afternoon.",
      "This is exactly the kind of site Auditify is for — not a disaster, just unfinished. An 84 with three clear fixes beats a 60 with thirty vague ones.",
    ],
    strengths: [
      "Modern TLS with HTTPS fully enforced — no downgrade path for visitors.",
      "Proper 404 handling, healthy redirect chain, and fast server response.",
      "Title, meta description, and social preview tags all present and well-sized.",
    ],
    findings: [
      {
        severity: "FAIL",
        title: "Images missing alt text",
        metric: "9/23",
        why: "39% of images have no alt text — screen readers skip them entirely, and image search can't index them.",
        fix: "Add descriptive alt text to every meaningful image. Decorative ones get alt=\"\" so assistive tech skips them deliberately.",
      },
      {
        severity: "FAIL",
        title: "No Content-Security-Policy",
        metric: "header missing",
        why: "Without a CSP, any injected script — via a compromised third-party tag, for example — runs with full page privileges. On a fintech homepage, that's the scariest line in this report.",
        fix: "Add a Content-Security-Policy header; start with default-src 'self' and expand deliberately.",
      },
      {
        severity: "WARN",
        title: "HSTS max-age too short",
        metric: "max-age 15552000",
        why: "HSTS is set — good — but at ~6 months it leaves a longer window for downgrade attacks than necessary.",
        fix: "Raise max-age to at least 31536000 (one year) and consider preloading.",
      },
    ],
  },
];

export function teardownBySlug(slug: string): Teardown | undefined {
  return TEARDOWNS.find((t) => t.slug === slug);
}
