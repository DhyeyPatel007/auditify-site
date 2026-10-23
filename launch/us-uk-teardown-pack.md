# Auditify — US/UK Teardown Pack (ready to post)
Prepared 2026-10-08, ~20:05 IST. All scores from REAL free scans run today on https://auditify.krynex.in (logged out, no login needed). Voice: quiet, confident, precise. Rule: every number below comes from a real scan — re-run the scan before posting if you want fresher numbers.

## Posting notes
- Your accounts right now: Threads is blocked ~24h (no SMS code), X web signup is looping CAPTCHAs (IP flagged) — try the X mobile app instead of web. Post in the IST evening window (US/UK awake roughly 6pm–1am IST).
- Each post ends with the free-scan link. The scan IS the product demo.
- Tone: factual + kind, teach don't shame. These are big brands; nobody gets humiliated, everybody learns.
- Coupons on the pricing page: FIRST10 (10% off first purchase), AGAIN5 (5% off next purchase) — click-to-copy is live.

---

## Post 1 — Monzo (UK fintech, 92/100 A)

Ran monzo.com through my own audit tool. Score: 92/100 (A) — one of the cleanest sites I've scanned.

The one finding I'd flag to their security team: unknown URLs return a 301 redirect instead of a proper 404. For a digital-only bank, that's the riskiest line in the report — mistyped and phishing-adjacent URLs get silently redirected instead of clearly failing.

Also: 941 KB HTML document (heavy for every visit) and a 27-character title tag wasting ranking potential.

Run your own site free: auditify.krynex.in

## Post 2 — John Lewis (UK retail, 86/100 B)

I audited johnlewis.com with my own tool. Score: 86/100 (B).

The expensive one: 12.2 MB of images on the homepage. Their huge mobile audience downloads that on every visit — slow loads quietly eat conversions on every product page. Compress + lazy-load below the fold fixes most of it.

Also missing: a Content-Security-Policy header — without it, any injected script runs with full page privileges.

Free scan for your site: auditify.krynex.in

## Post 3 — Allbirds (US D2C, 87/100 B)

allbirds.com through my audit tool: 87/100 (B).

2.6 MB of images plus a 698 KB HTML document on the homepage. For a brand built on sustainability, that's an ironic footprint — and a real drag on mobile shoppers.

Plus: HSTS is set but expires after ~91 days. Should be a year minimum, or the downgrade-attack window stays open.

Check your own site free: auditify.krynex.in

---

## Dropped from this batch
- **warbyparker.com** — their bot protection returns HTTP 403 to the scanner, so the scan can't complete. Retry in a few days or swap in another US D2C brand. Good swap candidates: everlane.com, bonobos.com, casper.com.

## How the free report reads (so you know what's public)
The free scan shows score, grade, and top 3 issues with plain-English explanations + fixes. The rest is paywalled behind the $15 full report — that's the funnel working as designed.
